import {isValidTime, parseTimeToMinutes} from './time';

const DONE = 'done';

/** Ce qu'il faut d'un créneau pour savoir combien de temps il a compté. */
export interface SlotProgress {
    activity: string;
    startTime: string;
    endTime: string;
    status: string;
}

function durationInMinutes(slot: SlotProgress): number {
    if (!isValidTime(slot.startTime) || !isValidTime(slot.endTime)) {
        return 0;
    }
    return Math.max(0, parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime));
}

/**
 * Minutes passées par activité, d'après les créneaux marqués faits. La clé est
 * le nom de l'activité : un créneau ne porte que ce nom, pas l'identifiant.
 * Minutes, comme `timeToSpend` tel qu'il est stocké, pour que les deux se comparent.
 */
export function minutesDoneByActivity(slots: readonly SlotProgress[]): Map<string, number> {
    const done = new Map<string, number>();

    for (const slot of slots) {
        const minutes = slot.status === DONE ? durationInMinutes(slot) : 0;
        if (minutes > 0) {
            done.set(slot.activity, (done.get(slot.activity) ?? 0) + minutes);
        }
    }

    return done;
}
