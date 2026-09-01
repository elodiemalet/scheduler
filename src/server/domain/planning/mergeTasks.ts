import {isWeekday, Weekday, weekdayFromDate} from './days';

/** Un quart d'heure. L'unité de timeToSpend est l'heure dans tout le domaine. */
export const EXTERNAL_TASK_DEFAULT_HOURS = 0.25;
export const EXTERNAL_TASK_DEFAULT_PRIORITY = 2;

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
    timeToSpendHours: number;
    days: Weekday[];
    source?: string;
    externalId?: string;
}

/** Activité telle que persistée. Le champ Mongoose reste `timeToSpend`. */
export interface ActivityInput {
    name: string;
    description?: string;
    priority?: number;
    startTime?: string;
    endTime?: string;
    timeToSpend?: number;
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
        priority: activity.priority ?? 1,
        startTime: activity.startTime ?? '',
        endTime: activity.endTime ?? '',
        timeToSpendHours: activity.timeToSpend ?? 1,
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
        timeToSpendHours: EXTERNAL_TASK_DEFAULT_HOURS,
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
