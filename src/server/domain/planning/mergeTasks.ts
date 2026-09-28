import {isWeekday, Weekday, weekdayFromDate} from './days';

/** Un quart d'heure. Toutes les durées du domaine sont en minutes. */
export const EXTERNAL_TASK_DEFAULT_MINUTES = 15;
export const EXTERNAL_TASK_DEFAULT_PRIORITY = 2;

/** Une activité enregistrée sans priorité est neutre, pas prioritaire. */
export const DEFAULT_ACTIVITY_PRIORITY = 2;
/** Durée d'une séance quand l'activité n'en déclare pas. */
export const DEFAULT_SESSION_MINUTES = 60;

/**
 * Longueur maximale d'un champ de tâche externe partant dans le prompt.
 * Ce n'est pas une défense contre l'injection — celle-ci est en sortie, dans
 * parseSchedule — mais une borne de coût : une note de 40 000 caractères
 * noierait les consignes et gonflerait la facture.
 */
export const MAX_PROMPT_FIELD_LENGTH = 200;

export function truncateForPrompt(
    value: string,
    maxLength: number = MAX_PROMPT_FIELD_LENGTH,
): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}

/** Forme unique consommée par le calcul des fenêtres et par le prompt. */
export interface PlannableActivity {
    name: string;
    description: string;
    priority: number;
    startTime: string;
    endTime: string;
    /** Durée d'une séance, en minutes. */
    sessionMinutes: number;
    /** Nombre de séances voulues ; null = une par jour possible. */
    timesPerWeek: number | null;
    days: Weekday[];
    source?: string;
    externalId?: string;
    /** Identifiant court d'une tâche ponctuelle, recopié par le modèle dans ses créneaux. */
    ref?: string;
}

/** Activité telle que persistée. `timeToSpend` est la durée d'une séance, en minutes. */
export interface ActivityInput {
    name: string;
    description?: string;
    priority?: number;
    startTime?: string;
    endTime?: string;
    timeToSpend?: number;
    timesPerWeek?: number | null;
    days?: string[];
}

export interface ExternalTaskInput {
    title: string;
    description?: string;
    notes?: string;
    priority?: number;
    dueDate?: Date | string | null;
    source?: string;
    externalId?: string;
}

function keepKnownDays(days: readonly string[] | undefined): Weekday[] {
    return (days ?? []).filter(isWeekday);
}

export function activityToPlannable(activity: ActivityInput): PlannableActivity {
    return {
        name: activity.name,
        description: activity.description ?? '',
        priority: activity.priority ?? DEFAULT_ACTIVITY_PRIORITY,
        startTime: activity.startTime ?? '',
        endTime: activity.endTime ?? '',
        sessionMinutes: activity.timeToSpend ?? DEFAULT_SESSION_MINUTES,
        timesPerWeek: activity.timesPerWeek ?? null,
        days: keepKnownDays(activity.days),
    };
}

export function externalTaskToPlannable(
    task: ExternalTaskInput,
    fallbackDate: Date,
): PlannableActivity {
    const dueDate = task.dueDate ? new Date(task.dueDate) : fallbackDate;

    return {
        name: truncateForPrompt(task.title),
        description: truncateForPrompt(task.description || task.notes || ''),
        priority: task.priority ?? EXTERNAL_TASK_DEFAULT_PRIORITY,
        startTime: '',
        endTime: '',
        sessionMinutes: EXTERNAL_TASK_DEFAULT_MINUTES,
        timesPerWeek: null,
        days: [weekdayFromDate(dueDate)],
        source: task.source,
        externalId: task.externalId,
    };
}

export function mergeActivitiesAndTasks(
    activities: readonly ActivityInput[],
    tasks: readonly ExternalTaskInput[],
    fallbackDate: Date,
): PlannableActivity[] {
    return [
        ...activities.map(activityToPlannable),
        ...tasks.map((task) => externalTaskToPlannable(task, fallbackDate)),
    ];
}
