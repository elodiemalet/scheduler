import {sortWeekdays, Weekday} from './days';
import {PlannableActivity} from './mergeTasks';
import {formatMinutesToTime, isValidTime, parseTimeToMinutes} from './time';

export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_END_TIME = '18:00';
export const MAX_END_HOUR = 23;

/**
 * Clés en français : cet objet est sérialisé tel quel dans le prompt,
 * dont le contrat attend `jour`, `heure_debut` et `heure_fin`.
 */
export interface DayWindow {
    jour: Weekday;
    heure_debut: string;
    heure_fin: string;
}

function minutesOf(times: readonly string[]): number[] {
    return times.filter(isValidTime).map(parseTimeToMinutes);
}

export function buildDayWindows(
    activities: readonly PlannableActivity[],
): DayWindow[] {
    const days = sortWeekdays([
        ...new Set(activities.flatMap((activity) => activity.days)),
    ]);

    return days.map((day) => {
        const forDay = activities.filter((activity) => activity.days.includes(day));

        const starts = minutesOf(forDay.map((activity) => activity.startTime));
        const ends = minutesOf(forDay.map((activity) => activity.endTime));

        const startMinutes = starts.length
            ? Math.min(...starts)
            : parseTimeToMinutes(DEFAULT_START_TIME);
        let endMinutes = ends.length
            ? Math.max(...ends)
            : parseTimeToMinutes(DEFAULT_END_TIME);

        const neededHours = forDay
            .filter((activity) => activity.priority === 1)
            .reduce((total, activity) => total + (activity.timeToSpendHours || 1), 0);
        const availableHours = (endMinutes - startMinutes) / 60;

        if (neededHours > availableHours) {
            const extraHours = Math.ceil(neededHours - availableHours);
            const cap = MAX_END_HOUR * 60 + (endMinutes % 60);
            endMinutes = Math.min(endMinutes + extraHours * 60, cap);
        }

        return {
            jour: day,
            heure_debut: formatMinutesToTime(startMinutes),
            heure_fin: formatMinutesToTime(endMinutes),
        };
    });
}
