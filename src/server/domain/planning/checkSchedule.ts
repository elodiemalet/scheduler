import {DayWindow} from './buildDayWindows';
import {ScheduleSlot} from './parseSchedule';
import {SessionRequest} from './sessions';
import {parseTimeToMinutes} from './time';
import {
    groupSessions, isSplitAroundLunch, LunchBreak, MIN_PART_MINUTES, overlapsLunch,
} from './lunchBreak';

/** La seule priorité dont une séance manquante est une faute : 2 et 3 se sacrifient. */
const UNTOUCHABLE_PRIORITY = 1;

function describeSlot(slot: ScheduleSlot, index: number): string {
    return `Créneau ${index + 1} (${slot.activity}, ${slot.day} ${slot.startTime}–${slot.endTime})`;
}

/**
 * `split` : le créneau partage son jour avec d'autres créneaux de la même activité.
 * Sa durée ne se juge alors pas seule — checkSplitSession tranche pour le groupe.
 */
function checkSlot(
    slot: ScheduleSlot,
    index: number,
    request: SessionRequest | undefined,
    window: DayWindow | undefined,
    split: boolean,
    lunch: LunchBreak | null,
): string[] {
    const label = describeSlot(slot, index);
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);

    if (end <= start) {
        return [`${label} : fin avant le début`];
    }

    const violations: string[] = [];
    if (!window) {
        violations.push(`${label} : jour hors de la semaine planifiée`);
    } else if (start < parseTimeToMinutes(window.heure_debut) || end > parseTimeToMinutes(window.heure_fin)) {
        violations.push(`${label} : hors des horaires du jour (${window.heure_debut}–${window.heure_fin})`);
    }

    // Un bloc fixe posé sur la pause est un choix de l'utilisateur : on le respecte.
    const fixed = request !== undefined && request.startTime !== '';
    if (lunch && !fixed && overlapsLunch(slot.startTime, slot.endTime, lunch)) {
        violations.push(`${label} : pendant la pause de midi (${lunch.start}–${lunch.end})`);
    }

    if (!request) {
        // Une référence inconnue est déjà signalée par checkRefs ; ne pas la doubler ici.
        if (slot.ref === undefined) {
            violations.push(`${label} : activité inconnue`);
        }
        return violations;
    }

    if (!request.days.includes(slot.day)) {
        violations.push(`${label} : jour non autorisé pour cette activité`);
    }

    if (request.startTime !== '') {
        if (slot.startTime !== request.startTime || slot.endTime !== request.endTime) {
            violations.push(
                `${label} : bloc fixe déplacé ou raccourci (attendu ${request.startTime}–${request.endTime})`,
            );
        }
    } else if (split) {
        if (end - start < MIN_PART_MINUTES) {
            violations.push(`${label} : partie trop courte (minimum ${MIN_PART_MINUTES} min)`);
        }
    } else if (end - start < request.minSessionMinutes) {
        violations.push(`${label} : séance trop courte (minimum ${request.minSessionMinutes} min)`);
    }

    return violations;
}

function checkOverlaps(slots: readonly ScheduleSlot[]): string[] {
    const violations: string[] = [];
    const valid = slots.filter((slot) => parseTimeToMinutes(slot.endTime) > parseTimeToMinutes(slot.startTime));

    for (const day of new Set(valid.map((slot) => slot.day))) {
        const sorted = valid
            .filter((slot) => slot.day === day)
            .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

        // On compare à celui qui finit le plus tard jusqu'ici, pas seulement au
        // voisin : un long créneau peut en recouvrir plusieurs.
        let latest = sorted[0];
        for (const current of sorted.slice(1)) {
            if (parseTimeToMinutes(current.startTime) < parseTimeToMinutes(latest.endTime)) {
                violations.push(`${day} : ${latest.activity} et ${current.activity} se chevauchent`);
            }
            if (parseTimeToMinutes(current.endTime) > parseTimeToMinutes(latest.endTime)) {
                latest = current;
            }
        }
    }

    return violations;
}

function minutesOf(slot: ScheduleSlot): number {
    return parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime);
}

/**
 * Plusieurs créneaux d'une activité le même jour ne sont admis que comme les deux
 * parties d'une séance coupée par la pause ; la durée se juge alors sur leur total.
 */
function checkSplitSession(group: readonly ScheduleSlot[], request: SessionRequest | undefined, lunch: LunchBreak | null): string[] {
    const {activity, day} = group[0];
    if (group.length > 2) {
        return [`${activity} : plus de deux parties le ${day}`];
    }
    if (!isSplitAroundLunch(group[0], group[1], lunch)) {
        return [`${activity} : plusieurs séances le ${day}`];
    }
    const total = group.reduce((sum, slot) => sum + minutesOf(slot), 0);
    if (request && request.startTime === '' && total < request.minSessionMinutes) {
        return [`${activity} : séance du ${day} trop courte en deux parties (minimum ${request.minSessionMinutes} min)`];
    }
    return [];
}

/**
 * Un créneau avec `ref` appartient à la tâche de cette référence ; sans `ref`, il
 * ne peut appartenir qu'à une activité elle-même sans référence — ce qui évite de
 * confondre une activité et une tâche (ou deux tâches) de même nom.
 */
function matchesRequest(slot: ScheduleSlot, request: SessionRequest): boolean {
    return request.ref !== undefined ? slot.ref === request.ref : slot.ref === undefined && slot.activity === request.name;
}

function checkCounts(slots: readonly ScheduleSlot[], request: SessionRequest): string[] {
    const violations: string[] = [];
    // Une séance par jour : deux parties le même jour n'en font qu'une.
    const days = [...new Set(slots.filter((slot) => matchesRequest(slot, request)).map((slot) => slot.day))];

    if (days.length > request.sessions) {
        violations.push(`${request.name} : ${days.length} séances pour ${request.sessions} demandée(s)`);
    }

    if (request.priority === UNTOUCHABLE_PRIORITY && days.length < request.sessions) {
        violations.push(
            `${request.name} : ${days.length} séance(s) sur ${request.sessions} (priorité 1, aucune ne doit manquer)`,
        );
    }

    return violations;
}

function checkRefs(slots: readonly ScheduleSlot[], requests: readonly SessionRequest[]): string[] {
    const known = new Set(requests.flatMap((request) => request.ref ? [request.ref] : []));
    return slots.flatMap((slot, index) =>
        slot.ref !== undefined && !known.has(slot.ref)
            ? [`${describeSlot(slot, index)} : référence inconnue (${slot.ref})`]
            : []);
}

/**
 * Vérifie ce qui se contrôle mécaniquement dans la réponse du modèle. Ne juge
 * pas l'arbitrage : quelles séances il a sacrifiées reste son choix.
 */
export function checkSchedule(
    slots: readonly ScheduleSlot[],
    requests: readonly SessionRequest[],
    windows: readonly DayWindow[],
    lunch: LunchBreak | null,
): string[] {
    // Un créneau se résout par `ref` s'il en porte une (parmi les requêtes de cette
    // référence), sinon par nom, mais seulement parmi les requêtes sans référence :
    // une tâche ne doit jamais absorber le créneau d'une activité de même nom.
    const requestsByRef = new Map(requests.flatMap((request) => request.ref ? [[request.ref, request] as const] : []));
    const requestsByName = new Map(
        requests.filter((request) => request.ref === undefined).map((request) => [request.name, request]));
    const resolveRequest = (slot: ScheduleSlot): SessionRequest | undefined =>
        slot.ref !== undefined ? requestsByRef.get(slot.ref) : requestsByName.get(slot.activity);
    const windowByDay = new Map(windows.map((window) => [window.jour, window]));
    const valid = slots.filter((slot) => minutesOf(slot) > 0);
    const groups = groupSessions(valid).filter((group) => group.length > 1);
    const split = new Set(groups.flat());

    return [
        ...slots.flatMap((slot, index) =>
            checkSlot(slot, index, resolveRequest(slot), windowByDay.get(slot.day), split.has(slot), lunch)),
        ...checkOverlaps(slots),
        ...groups.flatMap((group) => checkSplitSession(group, resolveRequest(group[0]), lunch)),
        ...requests.flatMap((request) => checkCounts(slots, request)),
        ...checkRefs(slots, requests),
    ];
}
