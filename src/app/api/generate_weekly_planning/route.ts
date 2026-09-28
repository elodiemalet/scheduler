import type {Types} from 'mongoose';
import Activity from '@/models/Activity';
import Task from '@/models/Task';
import dbConnect from '@/server/infrastructure/db/connection';
import Planning from '@/models/Planning';
import {generateWeeklyPlanning, LlmRequestError} from '@/services/LlmService';
import {ActivityInput, activityToPlannable} from '@/server/domain/planning/mergeTasks';
import {TaskInput, taskToPlannable} from '@/server/domain/planning/tasks';
import {buildDayWindows} from '@/server/domain/planning/buildDayWindows';
import {
    InvalidModelResponseError,
    parseNote,
    parseSacrifices,
    parseSchedule,
    Sacrifice,
    ScheduleSlot,
} from '@/server/domain/planning/parseSchedule';
import {toSessionRequests} from '@/server/domain/planning/sessions';
import {checkSchedule} from '@/server/domain/planning/checkSchedule';
import {buildCorrectionRequest, isBetterCorrection} from '@/server/domain/planning/correction';
import Settings, {SettingsInterface} from '@/models/Settings';
import {
    DEFAULT_LUNCH_BREAK, lunchBreakOf, numberParts, validateLunchBreak,
} from '@/server/domain/planning/lunchBreak';
import {createRateLimiter} from '@/server/http/rateLimit';
import {fail, serverError} from '@/server/http/apiResponse';

/** Nombre d'appels au modèle avant d'abandonner sur une réponse inexploitable. */
const GENERATION_ATTEMPTS = 2;

/**
 * Échéance de toute la génération, reprises et correction comprises. Sans
 * elle, 9 requêtes de 10 minutes chacune pouvaient s'enchaîner. Le client
 * attend un peu plus longtemps (voir useWeek), pour toujours recevoir la
 * réponse du serveur plutôt que d'abandonner avant lui.
 */
const GENERATION_DEADLINE_MS = 2 * 60 * 1000;

/**
 * Cinq générations par quart d'heure : très au-dessus de l'usage réel — on
 * régénère une semaine, pas une minute — et assez bas pour qu'un clic bloqué
 * ou une boucle côté client ne coûte que cinq appels au modèle.
 */
const GENERATION_LIMIT = 5;
const GENERATION_WINDOW_MS = 15 * 60 * 1000;

// Instancié au chargement du module : l'état vit aussi longtemps que le processus.
const generationLimiter = createRateLimiter(GENERATION_LIMIT, GENERATION_WINDOW_MS);

export async function GET() {
    try {
        await dbConnect();

        const planning = await Planning.findOne().sort({timestamp: -1});
        if (planning) {
            return Response.json(planning);
        }

        return fail(404, 'Planning introuvable');
    } catch (error) {
        return serverError('GET /api/generate_weekly_planning', error);
    }
}

export async function POST() {
    try {
        await dbConnect();

        const decision = generationLimiter();
        if (!decision.allowed) {
            return fail(
                429,
                'Trop de générations demandées. Réessayez dans quelques minutes.',
                {'Retry-After': String(decision.retryAfterSeconds)},
            );
        }

        const [activities, tasks, settings] = await Promise.all([
            Activity.find({}).lean<ActivityInput[]>(),
            Task.find({done: false}).lean<Array<TaskInput & {_id: Types.ObjectId}>>(),
            Settings.findOne().lean<SettingsInterface>(),
        ]);

        // Un réglage invalide (édité à la main en base) ne doit jamais faire échouer une génération.
        let lunch = lunchBreakOf(settings ?? {});
        if (lunch && validateLunchBreak(lunch).length > 0) {
            console.warn(`Génération : pause réglée invalide (${lunch.start}–${lunch.end}), pause par défaut utilisée`);
            lunch = DEFAULT_LUNCH_BREAK;
        }

        // Le modèle ne voit que ces références courtes ; on retrouve la tâche
        // de chaque créneau par elles, jamais par un titre qu'il aurait reformulé.
        const now = new Date();
        const refs = tasks.map((_, index) => `t${index + 1}`);
        const taskIdByRef = new Map(tasks.map((task, index) => [refs[index], task._id]));
        const plannable = [
            ...activities.map(activityToPlannable),
            ...tasks.map((task, index) => taskToPlannable(task, now, refs[index])),
        ];
        const dayWindows = buildDayWindows(plannable);
        const requests = toSessionRequests(plannable, dayWindows);

        const payload = JSON.stringify({
            jours: dayWindows,
            // Sans pause, la clé est absente : le prompt ne coupe alors aucune séance.
            ...(lunch ? {pause: {debut: lunch.start, fin: lunch.end}} : {}),
            activites: requests,
        });

        let slots: ScheduleSlot[] | null = null;
        let sacrifices: Sacrifice[] = [];
        let note = '';
        let lastRejection = '';
        let accepted = '';
        const deadline = AbortSignal.timeout(GENERATION_DEADLINE_MS);

        // Un modèle ouvert échoue plus souvent à respecter le contrat de sortie
        // qu'un modèle propriétaire ; une seconde tentative suffit en pratique.
        for (let attempt = 1; attempt <= GENERATION_ATTEMPTS && slots === null && !deadline.aborted; attempt++) {
            let raw: string | null;
            try {
                raw = await generateWeeklyPlanning(payload, {signal: deadline});
            } catch (error) {
                // 401/403 : la clé est absente ou refusée. Retenter ne changera
                // rien, et ce n'est pas le modèle qui est en faute — on sort.
                if (error instanceof LlmRequestError && (error.status === 401 || error.status === 403)) {
                    return serverError('Génération : authentification refusée par le fournisseur', error);
                }

                // Panne réseau, quota, réponse illisible : un échec d'appel se
                // traite comme une réponse inexploitable, pas comme un bug du serveur.
                lastRejection = error instanceof Error ? error.message : 'appel au modèle échoué';
                console.error(`Génération, tentative ${attempt}/${GENERATION_ATTEMPTS} : ${lastRejection}`);
                continue;
            }

            if (!raw) {
                lastRejection = 'réponse vide';
                console.error(`Génération, tentative ${attempt}/${GENERATION_ATTEMPTS} : ${lastRejection}`);
                continue;
            }

            try {
                slots = parseSchedule(raw);
                sacrifices = parseSacrifices(raw);
                note = parseNote(raw);
                accepted = raw;
            } catch (error) {
                if (!(error instanceof InvalidModelResponseError)) {
                    throw error;
                }
                lastRejection = error.message;
                console.error(`Génération, tentative ${attempt}/${GENERATION_ATTEMPTS} : ${lastRejection}`);
            }
        }

        if (slots === null) {
            console.error(deadline.aborted
                ? `Génération abandonnée : échéance de ${GENERATION_DEADLINE_MS / 1000} s dépassée`
                : `Génération abandonnée après ${GENERATION_ATTEMPTS} tentatives. Dernier rejet : ${lastRejection}`);
            return fail(502, 'Le modèle a renvoyé un planning invalide');
        }

        const weekStartDate = new Date(now);
        weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const dates = `${weekStartDate.toLocaleDateString('fr')} - ${weekEndDate.toLocaleDateString('fr')}`;

        let violations = checkSchedule(slots, requests, dayWindows, lunch);

        // Retry ciblé : une seule tentative, où le modèle corrige sa propre
        // réponse à partir des violations. On ne garde la correction que si
        // elle fait mieux ; un échec ici ne coûte jamais le premier planning.
        if (violations.length > 0 && !deadline.aborted) {
            try {
                const corrected = await generateWeeklyPlanning(payload, {
                    correction: {previous: accepted, request: buildCorrectionRequest(violations)},
                    signal: deadline,
                });
                if (corrected) {
                    const correctedSlots = parseSchedule(corrected);
                    const correctedViolations = checkSchedule(correctedSlots, requests, dayWindows, lunch);
                    console.warn(`Génération, correction : ${violations.length} → ${correctedViolations.length} violation(s)`);
                    if (isBetterCorrection(violations, correctedViolations)) {
                        slots = correctedSlots;
                        sacrifices = parseSacrifices(corrected);
                        note = parseNote(corrected);
                        violations = correctedViolations;
                    }
                }
            } catch (error) {
                console.error('Génération, correction abandonnée :', error instanceof Error ? error.message : error);
            }
        }

        // Un planning qui viole encore des règles est gardé et affiché avec ses
        // violations : c'est à l'utilisateur de décider s'il relance.
        // Les deux moitiés d'une séance coupée par la pause portent 1/2 et 2/2.
        const schedule = numberParts(slots, lunch).map((slot) => {
            // Une référence inconnue est déjà signalée par checkSchedule : le créneau reste, sans lien.
            const taskId = slot.ref ? taskIdByRef.get(slot.ref) : undefined;
            return taskId ? {...slot, taskId} : slot;
        });
        if (violations.length > 0) {
            console.warn(`Génération : ${violations.length} règle(s) non respectée(s)`);
        }

        await new Planning({
            name: `Planning du ${dates}`,
            days: dayWindows.map((window) => window.jour),
            activities: requests,
            schedule,
            violations,
            sacrifices,
            note,
            lunchBreak: lunch,
        }).save();

        return Response.json({schedule, violations, sacrifices, note});
    } catch (error) {
        return serverError('POST /api/generate_weekly_planning', error);
    }
}
