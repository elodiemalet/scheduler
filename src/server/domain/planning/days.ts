export const WEEKDAYS = [
    'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** Indexé par Date#getDay(), qui place dimanche à 0. */
const WEEKDAY_BY_JS_DAY: readonly Weekday[] = [
    'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

export function isWeekday(value: string): value is Weekday {
    return (WEEKDAYS as readonly string[]).includes(value);
}

export function weekdayFromDate(date: Date): Weekday {
    return WEEKDAY_BY_JS_DAY[date.getDay()];
}

export function sortWeekdays(days: readonly string[]): Weekday[] {
    return days
        .filter(isWeekday)
        .sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}
