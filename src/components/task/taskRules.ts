import type {TaskInterface} from "@/models/Task";

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

export function formatDue(dueDate: string | null): string {
    if (dueDate === null) return "";
    return new Date(dueDate).toLocaleDateString("fr", {weekday: "long", day: "numeric", month: "long", timeZone: "UTC"});
}

export function toDateInput(dueDate: string | null): string {
    return dueDate === null ? "" : dueDay(dueDate);
}
