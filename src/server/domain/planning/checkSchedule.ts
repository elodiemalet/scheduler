import {DayWindow} from './buildDayWindows';
import {ScheduleSlot} from './parseSchedule';
import {SessionRequest} from './sessions';
import {parseTimeToMinutes} from './time';

/** La seule priorité dont une séance manquante est une faute : 2 et 3 se sacrifient. */
const UNTOUCHABLE_PRIORITY = 1;

function describeSlot(slot: ScheduleSlot, index: number): string {
    return `Créneau ${index + 1} (${slot.activity}, ${slot.day} ${slot.startTime}–${slot.endTime})`;
}

function checkSlot(
    slot: ScheduleSlot,
    index: number,
    request: SessionRequest | undefined,
    window: DayWindow | undefined,
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

    if (!request) {
        violations.push(`${label} : activité inconnue`);
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

function checkCounts(slots: readonly ScheduleSlot[], request: SessionRequest): string[] {
    const violations: string[] = [];
    const days = slots.filter((slot) => slot.activity === request.name).map((slot) => slot.day);

    for (const day of new Set(days)) {
        if (days.filter((d) => d === day).length > 1) {
            violations.push(`${request.name} : plusieurs séances le ${day}`);
        }
    }

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

/**
 * Vérifie ce qui se contrôle mécaniquement dans la réponse du modèle. Ne juge
 * pas l'arbitrage : quelles séances il a sacrifiées reste son choix.
 */
export function checkSchedule(
    slots: readonly ScheduleSlot[],
    requests: readonly SessionRequest[],
    windows: readonly DayWindow[],
): string[] {
    const requestByName = new Map(requests.map((request) => [request.name, request]));
    const windowByDay = new Map(windows.map((window) => [window.jour, window]));

    return [
        ...slots.flatMap((slot, index) =>
            checkSlot(slot, index, requestByName.get(slot.activity), windowByDay.get(slot.day))),
        ...checkOverlaps(slots),
        ...requests.flatMap((request) => checkCounts(slots, request)),
    ];
}
