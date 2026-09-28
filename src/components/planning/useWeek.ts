"use client";

import {useCallback, useEffect, useState} from "react";
import {toast} from "react-toastify";
import {PlanningInterface} from "@/models/Planning";
import {ActivityInterface} from "@/models/Activity";
import {apiService} from "@/services/ApiService";

/**
 * Il n'y a pas de store : chaque composant garde son état local. Ce signal de
 * fenêtre est le seul lien entre eux — une génération ou une activité modifiée
 * le déclenche, et chaque `useWeek` monté recharge ses données.
 */
const SCHEDULER_CHANGED = "scheduler:changed";

export function notifySchedulerChanged() {
    window.dispatchEvent(new Event(SCHEDULER_CHANGED));
}

/**
 * La semaine affichée ne reflète plus les activités : l'une a été modifiée
 * après la génération (`updatedAt`, absent des documents antérieurs aux
 * timestamps), ajoutée ou supprimée. Les tâches externes (`source`) ne
 * comptent pas : elles ne sont pas des activités.
 */
export function isWeekStale(planning: PlanningInterface | null, activities: ActivityInterface[]): boolean {
    if (!planning?.timestamp) return false;
    const generatedAt = new Date(planning.timestamp).getTime();
    if (activities.some((a) => a.updatedAt && new Date(a.updatedAt).getTime() > generatedAt)) {
        return true;
    }
    const planned = new Set((planning.activities ?? []).filter((a) => !a.source).map((a) => a.name));
    const current = new Set(activities.map((a) => a.name));
    if (planned.size !== current.size) return true;
    return [...current].some((name) => !planned.has(name));
}

interface WeekData {
    planning: PlanningInterface | null;
    activities: ActivityInterface[];
    loaded: boolean;
}

/** Dernier planning et activités, rechargés à chaque `notifySchedulerChanged()`. */
export function useWeek() {
    const [data, setData] = useState<WeekData>({planning: null, activities: [], loaded: false});
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let alive = true;
        // Pas de planning : la route répond 404, ce n'est pas une erreur ici.
        Promise.allSettled([
            apiService.get<PlanningInterface>("/api/generate_weekly_planning"),
            apiService.get<{ data: ActivityInterface[] }>("/api/activity"),
        ]).then(([planning, activities]) => {
            if (!alive) return;
            setData({
                planning: planning.status === "fulfilled" ? planning.value : null,
                activities: activities.status === "fulfilled" ? activities.value.data : [],
                loaded: true,
            });
        });
        return () => {
            alive = false;
        };
    }, [version]);

    useEffect(() => {
        const reload = () => setVersion((v) => v + 1);
        window.addEventListener(SCHEDULER_CHANGED, reload);
        return () => window.removeEventListener(SCHEDULER_CHANGED, reload);
    }, []);

    const setPlanning = useCallback((update: (planning: PlanningInterface) => PlanningInterface) => {
        setData((previous) => previous.planning ? {...previous, planning: update(previous.planning)} : previous);
    }, []);

    return {
        ...data,
        stale: isWeekStale(data.planning, data.activities),
        reload: () => setVersion((v) => v + 1),
        setPlanning,
    };
}

/**
 * Filet de sécurité : le serveur abandonne de lui-même à 2 min (échéance de la
 * route). Au-delà de 2 min 30, c'est que la connexion elle-même est perdue.
 */
const GENERATION_TIMEOUT_MS = 150 * 1000;

/** Lance une génération, prévient l'utilisateur, puis signale le changement. */
export async function generateWeek(): Promise<boolean> {
    try {
        const result = await apiService.post<Record<string, never>, { violations: string[] }>(
            "/api/generate_weekly_planning", {}, undefined, GENERATION_TIMEOUT_MS,
        );
        if (result.violations && result.violations.length > 0) {
            toast.warning("Ta semaine est prête, mais certaines règles ne sont pas respectées.");
        } else {
            toast.success("Ta semaine est prête.");
        }
        notifySchedulerChanged();
        return true;
    } catch (error) {
        toast.error(error instanceof DOMException && error.name === "TimeoutError"
            ? "La génération prend trop de temps. Réessaie dans quelques minutes."
            : "La génération a échoué. Réessaie dans quelques minutes.");
        return false;
    }
}
