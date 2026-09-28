import {formatMinutesToTime, parseTimeToMinutes} from "@/server/domain/planning/time";
import {WEEKDAYS} from "@/server/domain/planning/days";

/**
 * Bornes des boutons +/− de l'écran Activités. Le design proposait 1 à 14 fois
 * par semaine ; le domaine place au plus une séance par jour, d'où 7 — et pas
 * plus que de jours cochés.
 */
export const DURATION_STEP = 30;
export const MIN_DURATION = 30;
export const MAX_DURATION = 180;
export const TIME_STEP = 30;
/** Dernière minute représentable en "HH:MM" ("24:00" est refusé par TIME_PATTERN). */
const LAST_MINUTE = 23 * 60 + 59;
/** Heure proposée quand on fixe un horaire, comme dans le design. */
export const DEFAULT_FIXED_START = 18 * 60;

export interface Schedulable {
    days: string[];
    timesPerWeek: number | null;
    timeToSpend: number;
    startTime: string;
    endTime: string;
}

function minutes(value: string): number | null {
    try {
        return parseTimeToMinutes(value);
    } catch {
        return null;
    }
}

/** Au plus une séance par jour : le nombre de jours cochés, ou 7 si aucun. */
export function maxTimes(days: readonly string[]): number {
    return days.length || WEEKDAYS.length;
}

/** `null` veut dire « une séance par jour coché ». */
export function effectiveTimes(activity: Pick<Schedulable, "days" | "timesPerWeek">): number {
    return Math.min(activity.timesPerWeek ?? maxTimes(activity.days), maxTimes(activity.days));
}

/** Un bloc fixe a un début et une fin (règle du domaine). */
export function fixedStart(activity: Pick<Schedulable, "startTime" | "endTime">): number | null {
    const start = minutes(activity.startTime);
    const end = minutes(activity.endTime);
    return start !== null && end !== null ? start : null;
}

/** La durée d'un bloc fixe vient de ses horaires ; sinon c'est `timeToSpend`. */
export function durationOf(activity: Schedulable): number {
    const start = minutes(activity.startTime);
    const end = minutes(activity.endTime);
    if (start !== null && end !== null && end > start) return end - start;
    return activity.timeToSpend;
}

/** Pas de 30 min, recalé sur la grille pour une durée saisie autrefois (45 min…). */
export function stepDuration(current: number, direction: 1 | -1): number {
    const next = direction > 0
        ? Math.floor(current / DURATION_STEP) * DURATION_STEP + DURATION_STEP
        : Math.ceil(current / DURATION_STEP) * DURATION_STEP - DURATION_STEP;
    return Math.max(MIN_DURATION, next);
}

/** Horaires d'un bloc qui commence à `start` et dure `duration`, bornés à la journée. */
export function fixedTimes(start: number, duration: number): { startTime: string, endTime: string } {
    const clampedStart = Math.max(0, Math.min(start, LAST_MINUTE - duration));
    return {
        startTime: formatMinutesToTime(clampedStart),
        endTime: formatMinutesToTime(clampedStart + duration),
    };
}

/**
 * Décale le début ou la fin d'un bloc fixe de `delta` minutes. Renvoie `null`
 * si le bloc passerait sous 30 min ou hors de la journée.
 */
export function shiftBound(activity: Schedulable, bound: "start" | "end", delta: number):
    { startTime: string, endTime: string } | null {
    const start = minutes(activity.startTime);
    const end = minutes(activity.endTime);
    if (start === null || end === null) return null;
    const nextStart = bound === "start" ? start + delta : start;
    const nextEnd = bound === "end" ? end + delta : end;
    if (nextStart < 0 || nextEnd > LAST_MINUTE || nextEnd - nextStart < MIN_DURATION) return null;
    return {startTime: formatMinutesToTime(nextStart), endTime: formatMinutesToTime(Math.min(nextEnd, LAST_MINUTE))};
}

/** Garde `timesPerWeek` sous le nombre de jours cochés quand on décoche un jour. */
export function clampTimes(timesPerWeek: number | null, days: readonly string[]): number | null {
    if (timesPerWeek === null) return null;
    return Math.max(1, Math.min(timesPerWeek, maxTimes(days)));
}

/** Jours cochés dans l'ordre de la semaine. */
export function toggleDay(days: readonly string[], day: string): string[] {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    return WEEKDAYS.filter((d) => next.includes(d));
}
