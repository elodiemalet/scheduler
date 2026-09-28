import type {TaskInterface} from "@/models/Task";
import {formatDuration} from "@/components/uiComponents/format";
import {parseTimeToMinutes} from "@/server/domain/planning/time";

/** Bornes et pas du stepper de durée, comme sur la maquette. */
export const TASK_MIN_MINUTES = 15;
export const TASK_MAX_MINUTES = 8 * 60;
export const TASK_STEP_MINUTES = 15;

/**
 * Une échéance est un jour, stocké à minuit UTC (`"2026-10-02"` → `2026-10-02T00:00:00Z`).
 * On la lit donc en UTC, pour qu'elle ne recule pas d'un jour à l'ouest de Greenwich.
 */
function dueDay(dueDate: string): string {
    return dueDate.slice(0, 10);
}

function localDay(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

export function isOverdue(task: Pick<TaskInterface, "dueDate" | "done">, now: Date): boolean {
    return !task.done && task.dueDate !== null && dueDay(task.dueDate) < localDay(now);
}

type Sortable = Pick<TaskInterface, "dueDate" | "done" | "createdAt">;

export function sortTasks<T extends Sortable>(tasks: readonly T[]): T[] {
    return [...tasks].sort((a, b) =>
        Number(a.done) - Number(b.done)
        || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")
        || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/** « vendredi 2 octobre », « jeudi 1er octobre ». */
export function formatDue(dueDate: string | null): string {
    if (dueDate === null) return "";
    const date = new Date(dueDate);
    const weekday = date.toLocaleDateString("fr", {weekday: "long", timeZone: "UTC"});
    const month = date.toLocaleDateString("fr", {month: "long", timeZone: "UTC"});
    const day = date.getUTCDate();
    return `${weekday} ${day === 1 ? "1er" : day} ${month}`;
}

export function toDateInput(dueDate: string | null): string {
    return dueDate === null ? "" : dueDay(dueDate);
}

/** Deuxième ligne d'une tâche : « 45 min · pour jeudi 1er octobre · 10:00–10:45 ». */
export function taskMeta(task: Pick<TaskInterface, "minutes" | "dueDate" | "startTime" | "endTime">): string {
    const parts = [formatDuration(task.minutes)];
    if (task.dueDate) parts.push(`pour ${formatDue(task.dueDate)}`);
    if (task.startTime && task.endTime) parts.push(`${task.startTime}–${task.endTime}`);
    return parts.join(" · ");
}

/** En-tête de la page : « 3 à faire · 1 en retard · 2 faites ». */
export function taskSummary(tasks: readonly Pick<TaskInterface, "dueDate" | "done">[], now: Date): string {
    const todo = tasks.filter((task) => !task.done);
    const overdue = todo.filter((task) => isOverdue(task, now)).length;
    const done = tasks.length - todo.length;
    const parts = [`${todo.length} à faire`];
    if (overdue) parts.push(`${overdue} en retard`);
    if (done) parts.push(`${done} faite${done > 1 ? "s" : ""}`);
    return parts.join(" · ");
}

/** Un cran de stepper, recalé sur le pas : 20 min monte à 30, descend à 15. */
export function stepTaskMinutes(minutes: number, direction: 1 | -1): number {
    const snapped = direction > 0
        ? Math.floor(minutes / TASK_STEP_MINUTES) * TASK_STEP_MINUTES + TASK_STEP_MINUTES
        : Math.ceil(minutes / TASK_STEP_MINUTES) * TASK_STEP_MINUTES - TASK_STEP_MINUTES;
    return Math.max(TASK_MIN_MINUTES, Math.min(TASK_MAX_MINUTES, snapped));
}

/**
 * Ce qui cloche dans le créneau fixe, en français, ou "" s'il est valide
 * (vide ou complet et dans l'ordre). Même règle que `taskInputSchema`.
 */
export function slotProblem(startTime: string, endTime: string): string {
    if (!startTime && !endTime) return "";
    if (!startTime || !endTime) return "Indique l’heure de début et l’heure de fin, ou aucune des deux.";
    if (parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
        return "L’heure de fin doit venir après l’heure de début.";
    }
    return "";
}
