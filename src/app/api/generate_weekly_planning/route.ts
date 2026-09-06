import Activity from '@/models/Activity';
import dbConnect from '@/server/infrastructure/db/connection';
import Planning from '@/models/Planning';
import {generateWeeklyPlanning, LlmRequestError} from '@/services/LlmService';
import {ActivityInput, activityToPlannable} from '@/server/domain/planning/mergeTasks';
import {buildDayWindows} from '@/server/domain/planning/buildDayWindows';
import {
    InvalidModelResponseError,
    parseSchedule,
    ScheduleSlot,
} from '@/server/domain/planning/parseSchedule';
import {createRateLimiter} from '@/server/http/rateLimit';
import {fail, serverError} from '@/server/http/apiResponse';

/** Nombre d'appels au modèle avant d'abandonner sur une réponse inexploitable. */
const GENERATION_ATTEMPTS = 2;

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

        const activities = await Activity.find({}).lean<ActivityInput[]>();
        const plannable = activities.map(activityToPlannable);
        const dayWindows = buildDayWindows(plannable);

        const payload = JSON.stringify({
            jours: dayWindows,
            activites: plannable,
        });

        let slots: ScheduleSlot[] | null = null;
        let lastRejection = '';

        // Un modèle ouvert échoue plus souvent à respecter le contrat de sortie
        // qu'un modèle propriétaire ; une seconde tentative suffit en pratique.
        for (let attempt = 1; attempt <= GENERATION_ATTEMPTS && slots === null; attempt++) {
            let raw: string | null;
            try {
                raw = await generateWeeklyPlanning(payload);
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
            } catch (error) {
                if (!(error instanceof InvalidModelResponseError)) {
                    throw error;
                }
                lastRejection = error.message;
                console.error(`Génération, tentative ${attempt}/${GENERATION_ATTEMPTS} : ${lastRejection}`);
            }
        }

        if (slots === null) {
            console.error(
                `Génération abandonnée après ${GENERATION_ATTEMPTS} tentatives. Dernier rejet : ${lastRejection}`,
            );
            return fail(502, 'Le modèle a renvoyé un planning invalide');
        }

        const weekStartDate = new Date();
        weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const dates = `${weekStartDate.toLocaleDateString('fr')} - ${weekEndDate.toLocaleDateString('fr')}`;

        await new Planning({
            name: `Planning du ${dates}`,
            days: dayWindows.map((window) => window.jour),
            activities: plannable,
            schedule: slots,
        }).save();

        return Response.json({schedule: slots});
    } catch (error) {
        return serverError('POST /api/generate_weekly_planning', error);
    }
}
