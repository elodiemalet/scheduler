import {ScheduleSlot} from './parseSchedule';
import {parseTimeToMinutes} from './time';

/** Pause de midi : rien ne s'y place, sauf un bloc fixe que l'utilisateur y a mis lui-même. */
export const LUNCH_START = '12:30';
export const LUNCH_END = '14:00';

/** Durée minimale de chaque partie d'une séance coupée par la pause. */
export const MIN_PART_MINUTES = 30;

/**
 * Une séance coupée encadre la pause : la première partie finit au plus
 * 30 min avant, la seconde reprend au plus 30 min après. Au-delà, ce sont
 * deux séances distinctes, pas une coupure.
 */
export const SPLIT_TOLERANCE_MINUTES = 30;

/** Un créneau qui touche la pause sans y entrer (fin à 12:30, début à 14:00) ne l'empiète pas. */
export function overlapsLunch(startTime: string, endTime: string): boolean {
    return parseTimeToMinutes(startTime) < parseTimeToMinutes(LUNCH_END)
        && parseTimeToMinutes(endTime) > parseTimeToMinutes(LUNCH_START);
}

/** Deux parties d'une même séance : l'une finit juste avant la pause, l'autre reprend juste après. */
export function isSplitAroundLunch(first: ScheduleSlot, second: ScheduleSlot): boolean {
    const [morning, afternoon] = parseTimeToMinutes(first.startTime) <= parseTimeToMinutes(second.startTime)
        ? [first, second]
        : [second, first];
    const morningEnd = parseTimeToMinutes(morning.endTime);
    const afternoonStart = parseTimeToMinutes(afternoon.startTime);
    const lunchStart = parseTimeToMinutes(LUNCH_START);
    const lunchEnd = parseTimeToMinutes(LUNCH_END);
    return morningEnd <= lunchStart && morningEnd >= lunchStart - SPLIT_TOLERANCE_MINUTES
        && afternoonStart >= lunchEnd && afternoonStart <= lunchEnd + SPLIT_TOLERANCE_MINUTES;
}

/**
 * Créneaux regroupés par séance. Une activité n'a qu'une séance par jour : deux
 * créneaux de la même activité le même jour sont les deux parties d'une seule.
 */
export function groupSessions<T extends ScheduleSlot>(slots: readonly T[]): T[][] {
    const groups = new Map<string, T[]>();
    for (const slot of slots) {
        const key = `${slot.activity}\u0000${slot.day}`;
        groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return [...groups.values()];
}

/**
 * Numérote chaque créneau dans sa séance (`part` sur `parts`), dans l'ordre des
 * heures. C'est ce qui relie les deux moitiés d'une séance coupée dans le planning
 * enregistré, sans rien demander au modèle. L'ordre des créneaux est conservé.
 */
export function numberParts<T extends ScheduleSlot>(slots: readonly T[]): Array<T & {part: number; parts: number}> {
    const numbering = new Map<T, {part: number; parts: number}>();
    for (const group of groupSessions(slots)) {
        const sorted = [...group].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
        sorted.forEach((slot, index) => numbering.set(slot, {part: index + 1, parts: sorted.length}));
    }
    return slots.map((slot) => ({...slot, ...numbering.get(slot)!}));
}
