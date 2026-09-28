"use client";

import {useEffect, useRef, useState} from "react";
import {toast} from "react-toastify";
import {apiService} from "@/services/ApiService";
import type {TaskInterface} from "@/models/Task";
import {PRIORITIES} from "@/components/uiComponents/priority";
import {CloseIcon} from "@/components/uiComponents/icons/icons";
import {toDateInput} from "@/components/task/taskRules";

const EMPTY_DRAFT = {
    title: "",
    description: "",
    minutes: 15,
    priority: 2,
    /** "YYYY-MM-DD" ; "" = sans échéance. */
    dueDate: "",
    startTime: "",
    endTime: "",
};

type Draft = typeof EMPTY_DRAFT;

function draftOf(task: TaskInterface | null, initialTitle: string): Draft {
    if (!task) return {...EMPTY_DRAFT, title: initialTitle};
    return {
        title: task.title,
        description: task.description,
        minutes: task.minutes,
        priority: task.priority,
        dueDate: toDateInput(task.dueDate),
        startTime: task.startTime,
        endTime: task.endTime,
    };
}

/** Création détaillée ou édition d'une tâche. Un seul objet d'état. */
export default function TaskDialog({open, task, initialTitle, onClose, onSaved}: {
    open: boolean,
    task: TaskInterface | null,
    initialTitle: string,
    onClose: () => void,
    onSaved: () => void,
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            setDraft(draftOf(task, initialTitle));
            dialog.showModal();
        }
        if (!open && dialog.open) dialog.close();
    }, [open, task, initialTitle]);

    function update<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((previous) => ({...previous, [key]: value}));
    }

    const halfSlot = (draft.startTime === "") !== (draft.endTime === "");
    const invalid = !draft.title.trim() || halfSlot;

    async function save() {
        if (invalid || saving) return;
        setSaving(true);
        const body = {
            title: draft.title.trim(),
            description: draft.description,
            minutes: draft.minutes,
            priority: draft.priority,
            // null, pas undefined : Zod retire les clés undefined, et une échéance effacée doit l'être en base.
            dueDate: draft.dueDate === "" ? null : draft.dueDate,
            startTime: draft.startTime,
            endTime: draft.endTime,
        };
        try {
            if (task) {
                await apiService.post(`/api/task/${task._id}`, body);
            } else {
                await apiService.post("/api/task", body);
            }
            toast.success(`« ${body.title} » est enregistrée.`);
            onSaved();
        } catch {
            toast.error("La tâche n’a pas pu être enregistrée.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="task-title"
            onCancel={(e) => {
                e.preventDefault();
                onClose();
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="sheet mx-0 mt-auto mb-0 max-h-none w-full max-w-none rounded-t-[28px] bg-cream p-0 text-ink md:m-auto md:w-[520px] md:rounded-[28px]"
        >
            <form
                className="flex flex-col gap-4 p-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    void save();
                }}
            >
                <div className="flex items-center justify-between">
                    <h2 id="task-title" className="text-2xl font-extrabold">
                        {task ? "Modifier la tâche" : "Nouvelle tâche"}
                    </h2>
                    <button type="button" onClick={onClose} aria-label="Fermer"><CloseIcon size={20}/></button>
                </div>

                <label className="flex flex-col gap-1 font-bold">
                    Titre
                    <input required maxLength={200} value={draft.title}
                           onChange={(e) => update("title", e.target.value)}
                           className="rounded-2xl border border-line bg-white px-4 py-3 font-normal"/>
                </label>

                <label className="flex flex-col gap-1 font-bold">
                    Description
                    <textarea maxLength={2000} value={draft.description}
                              onChange={(e) => update("description", e.target.value)}
                              className="rounded-2xl border border-line bg-white px-4 py-3 font-normal"/>
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 font-bold">
                        Durée (min)
                        <input type="number" min={5} max={1440} step={5} value={draft.minutes}
                               onChange={(e) => update("minutes", Number(e.target.value))}
                               className="rounded-2xl border border-line bg-white px-4 py-3 font-normal"/>
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                        Priorité
                        <select value={draft.priority} onChange={(e) => update("priority", Number(e.target.value))}
                                className="rounded-2xl border border-line bg-white px-4 py-3 font-normal">
                            {PRIORITIES.map((priority) => (
                                <option key={priority.value} value={priority.value}>{priority.label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <label className="flex flex-col gap-1 font-bold">
                    Échéance
                    <input type="date" value={draft.dueDate} onChange={(e) => update("dueDate", e.target.value)}
                           className="rounded-2xl border border-line bg-white px-4 py-3 font-normal"/>
                </label>

                <fieldset className="grid grid-cols-2 gap-3">
                    <legend className="mb-1 font-bold">Créneau fixe (facultatif)</legend>
                    <input type="time" aria-label="Début" value={draft.startTime}
                           onChange={(e) => update("startTime", e.target.value)}
                           className="rounded-2xl border border-line bg-white px-4 py-3"/>
                    <input type="time" aria-label="Fin" value={draft.endTime}
                           onChange={(e) => update("endTime", e.target.value)}
                           className="rounded-2xl border border-line bg-white px-4 py-3"/>
                    {halfSlot && <p className="col-span-2 text-sm">Renseigne le début et la fin, ou aucun des deux.</p>}
                </fieldset>

                <button type="submit" disabled={invalid || saving}
                        className="h-12 rounded-[24px] bg-ink font-bold text-butter disabled:opacity-40">
                    {task ? "Enregistrer" : "Ajouter"}
                </button>
            </form>
        </dialog>
    );
}
