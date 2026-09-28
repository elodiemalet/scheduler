import {Weekday} from './days';
import {DayWindow} from './buildDayWindows';
import {PlannableActivity} from './mergeTasks';
import {isValidTime, parseTimeToMinutes} from './time';

/** Plancher d'une séance raccourcie, en minutes. */
export const MIN_SHORTENED_SESSION_MINUTES = 30;

/** Seule la priorité 2 se raccourcit : 1 est intouchable, 3 se supprime. */
const SHORTENABLE_PRIORITY = 2;

/**
 * Ce que le modèle doit placer pour une activité, et ce que checkSchedule
 * vérifie. Clés en anglais : le prompt les décrit une à une.
 */
export interface SessionRequest {
    name: string;
    description: string;
    priority: number;
    /** Séances attendues dans la semaine, au plus une par jour. */
    sessions: number;
    sessionMinutes: number;
    /** Durée sous laquelle une séance ne descend jamais. */
    minSessionMinutes: number;
    /** Jours possibles, déjà résolus : « aucun jour coché » devient tous les jours ouverts. */
    days: Weekday[];
    /** Renseignés tous les deux pour un bloc fixe, vides sinon. */
    startTime: string;
    endTime: string;
    source?: string;
    externalId?: string;
}

export function isFixed(activity: {startTime: string; endTime: string}): boolean {
    return isValidTime(activity.startTime)
        && isValidTime(activity.endTime)
        && parseTimeToMinutes(activity.endTime) > parseTimeToMinutes(activity.startTime);
}

function minimumFor(priority: number, minutes: number, fixed: boolean): number {
    if (fixed || priority !== SHORTENABLE_PRIORITY) {
        return minutes;
    }
    return Math.min(minutes, Math.max(Math.ceil(minutes / 2), MIN_SHORTENED_SESSION_MINUTES));
}

function toSessionRequest(activity: PlannableActivity, openDays: readonly Weekday[]): SessionRequest {
    const fixed = isFixed(activity);
    const days = activity.days.length > 0
        ? activity.days.filter((day) => openDays.includes(day))
        : [...openDays];
    const minutes = fixed
        ? parseTimeToMinutes(activity.endTime) - parseTimeToMinutes(activity.startTime)
        : activity.sessionMinutes;

    return {
        name: activity.name,
        description: activity.description,
        priority: activity.priority,
        sessions: Math.min(activity.timesPerWeek ?? days.length, days.length),
        sessionMinutes: minutes,
        minSessionMinutes: minimumFor(activity.priority, minutes, fixed),
        days,
        startTime: fixed ? activity.startTime : '',
        endTime: fixed ? activity.endTime : '',
        ...(activity.source ? {source: activity.source} : {}),
        ...(activity.externalId ? {externalId: activity.externalId} : {}),
    };
}

export function toSessionRequests(
    activities: readonly PlannableActivity[],
    windows: readonly DayWindow[],
): SessionRequest[] {
    const openDays = windows.map((window) => window.jour);
    return activities.map((activity) => toSessionRequest(activity, openDays));
}
