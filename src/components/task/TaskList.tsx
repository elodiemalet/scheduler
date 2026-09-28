"use client";

import {useEffect, useState} from "react";
import {toast} from "react-toastify";
import {apiService} from "@/services/ApiService";
import type {TaskInterface} from "@/models/Task";
import {CheckIcon, TrashIcon} from "@/components/uiComponents/icons/icons";
import TaskDialog from "@/components/task/TaskDialog";
import {formatDue, isOverdue, sortTasks} from "@/components/task/taskRules";

/** Onglet « Tâches » : ajout rapide par le titre, le reste dans TaskDialog. */
export default function TaskList() {
    const [tasks, setTasks] = useState<TaskInterface[] | null>(null);
    const [quickTitle, setQuickTitle] = useState("");
    const [dialog, setDialog] = useState<{open: boolean, task: TaskInterface | null}>({open: false, task: null});

    async function load() {
        try {
            const {data} = await apiService.get<{data: TaskInterface[]}>("/api/task");
            setTasks(sortTasks(data));
        } catch {
            toast.error("Les tâches n’ont pas pu être chargées.");
        }
    }

    useEffect(() => {
        void load();
    }, []);

    async function quickAdd() {
        const title = quickTitle.trim();
        if (!title) return;
        try {
            await apiService.post("/api/task", {title});
            setQuickTitle("");
            await load();
        } catch {
            toast.error("La tâche n’a pas pu être ajoutée.");
        }
    }

    async function toggle(task: TaskInterface) {
        try {
            await apiService.post(`/api/task/${task._id}`, {done: !task.done});
            await load();
        } catch {
            toast.error("La tâche n’a pas pu être mise à jour.");
        }
    }

    async function remove(task: TaskInterface) {
        try {
            await apiService.delete(`/api/task/${task._id}`, {});
            toast.success(`« ${task.title} » est supprimée.`);
            await load();
        } catch {
            toast.error("La tâche n’a pas pu être supprimée.");
        }
    }

    const now = new Date();

    return (
        <main className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-5 pb-28 md:px-10">
            <form
                className="flex gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    void quickAdd();
                }}
            >
                <input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} maxLength={200}
                       placeholder="Une chose à faire cette semaine…" aria-label="Nouvelle tâche"
                       className="grow rounded-2xl border border-line bg-white px-4 py-3"/>
                <button type="submit" disabled={!quickTitle.trim()}
                        className="rounded-[24px] bg-ink px-5 font-bold text-butter disabled:opacity-40">
                    Ajouter
                </button>
                <button type="button" onClick={() => setDialog({open: true, task: null})}
                        className="rounded-[24px] border border-line px-4 font-bold">
                    Plus d’options
                </button>
            </form>

            {tasks === null && <p>Chargement…</p>}
            {tasks?.length === 0 && <p>Aucune tâche. Note ici ce qui ne revient pas chaque semaine.</p>}

            <ul className="flex flex-col gap-2">
                {tasks?.map((task) => (
                    <li key={task._id}
                        className={`flex items-center gap-3 rounded-2xl border border-line bg-cream px-4 py-3 ${task.done ? "opacity-50" : ""}`}>
                        <button type="button" aria-pressed={task.done} onClick={() => toggle(task)}
                                aria-label={`${task.title}, ${task.done ? "faite" : "à faire"}`}
                                className={`flex size-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink ${task.done ? "bg-ink text-butter" : ""}`}>
                            {task.done && <CheckIcon size={13}/>}
                        </button>
                        <button type="button" onClick={() => setDialog({open: true, task})}
                                className="flex min-w-0 grow flex-col text-left">
                            <span className={`font-bold ${task.done ? "line-through" : ""}`}>{task.title}</span>
                            <span className="text-sm">
                                {task.minutes} min
                                {task.dueDate && <> · pour {formatDue(task.dueDate)}</>}
                                {task.startTime && <> · {task.startTime}–{task.endTime}</>}
                            </span>
                        </button>
                        {isOverdue(task, now) && (
                            <span className="rounded-full bg-coral px-2.5 py-0.5 text-xs font-bold">en retard</span>
                        )}
                        <button type="button" onClick={() => remove(task)} aria-label={`Supprimer ${task.title}`}>
                            <TrashIcon size={18}/>
                        </button>
                    </li>
                ))}
            </ul>

            <TaskDialog
                open={dialog.open}
                task={dialog.task}
                initialTitle={quickTitle}
                onClose={() => setDialog({open: false, task: null})}
                onSaved={() => {
                    setDialog({open: false, task: null});
                    setQuickTitle("");
                    void load();
                }}
            />
        </main>
    );
}
