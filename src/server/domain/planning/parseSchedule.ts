import {isWeekday, Weekday} from './days';
import {isValidTime} from './time';

export class InvalidModelResponseError extends Error {
    constructor(message: string, readonly cause?: unknown) {
        super(message);
        this.name = 'InvalidModelResponseError';
    }
}

export interface ScheduleSlot {
    day: Weekday;
    startTime: string;
    endTime: string;
    activity: string;
    description: string;
}

function asRecord(value: unknown, position: number): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new InvalidModelResponseError(`Créneau ${position} : objet attendu`);
    }
    return value as Record<string, unknown>;
}

function readTime(
    slot: Record<string, unknown>,
    key: string,
    position: number,
): string {
    const value = slot[key];
    if (typeof value !== 'string' || !isValidTime(value)) {
        throw new InvalidModelResponseError(
            `Créneau ${position} : heure invalide pour "${key}" (${String(value)})`,
        );
    }
    return value;
}

function toSlot(value: unknown, index: number): ScheduleSlot {
    const position = index + 1;
    const slot = asRecord(value, position);

    const day = slot.day;
    if (typeof day !== 'string' || !isWeekday(day)) {
        throw new InvalidModelResponseError(
            `Créneau ${position} : jour inconnu (${String(day)})`,
        );
    }

    const activity = slot.activity;
    if (typeof activity !== 'string' || activity.trim() === '') {
        throw new InvalidModelResponseError(
            `Créneau ${position} : nom d'activité manquant`,
        );
    }

    return {
        day,
        startTime: readTime(slot, 'start_time', position),
        endTime: readTime(slot, 'end_time', position),
        activity: activity.trim(),
        description: typeof slot.description === 'string' ? slot.description : '',
    };
}

export function parseSchedule(raw: string): ScheduleSlot[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (cause) {
        throw new InvalidModelResponseError(
            'Réponse du modèle illisible : JSON invalide',
            cause,
        );
    }

    const schedule = (parsed as {schedule?: unknown} | null)?.schedule;
    if (!Array.isArray(schedule)) {
        throw new InvalidModelResponseError(
            'Réponse du modèle invalide : champ "schedule" absent ou non tableau',
        );
    }

    return schedule.map(toSlot);
}
