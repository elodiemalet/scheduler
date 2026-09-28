import {remainingWeekdays, Weekday} from './days';
import {EXTERNAL_TASK_DEFAULT_MINUTES, PlannableActivity, truncateForPrompt} from './mergeTasks';

export const DEFAULT_TASK_PRIORITY = 2;

/** Une échéance atteinte rend la tâche indispensable, quelle que soit sa priorité saisie. */
const DUE_PRIORITY = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tâche ponctuelle telle que persistée. `minutes` est sa durée. */
export interface TaskInput {
    title: string;
    description?: string;
    minutes?: number;
    priority?: number;
    dueDate?: Date | string | null;
    startTime?: string;
    endTime?: string;
}

function startOfDay(date: Date): Date {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
}

/**
 * Jamais avant aujourd'hui. Une échéance dans la semaine borne la fin ;
 * en retard, lointaine ou absente, la tâche peut aller jusqu'à dimanche.
 */
function allowedDays(due: Date | null, today: Date): Weekday[] {
    const remaining = remainingWeekdays(today);
    if (due === null || due < today) {
        return remaining;
    }
    // Arrondi : un passage à l'heure d'hiver fait une journée de 25 h.
    const daysAhead = Math.round((due.getTime() - today.getTime()) / DAY_MS);
    return daysAhead < remaining.length ? remaining.slice(0, daysAhead + 1) : remaining;
}

export function taskToPlannable(task: TaskInput, now: Date, ref: string): PlannableActivity {
    const today = startOfDay(now);
    const parsed = task.dueDate ? startOfDay(new Date(task.dueDate)) : null;
    // Une date illisible compte comme une tâche sans échéance.
    const due = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
    const dueReached = due !== null && due <= today;

    return {
        name: truncateForPrompt(task.title),
        description: truncateForPrompt(task.description ?? ''),
        priority: dueReached ? DUE_PRIORITY : task.priority ?? DEFAULT_TASK_PRIORITY,
        startTime: task.startTime ?? '',
        endTime: task.endTime ?? '',
        sessionMinutes: task.minutes ?? EXTERNAL_TASK_DEFAULT_MINUTES,
        timesPerWeek: 1,
        days: allowedDays(due, today),
        ref,
    };
}
