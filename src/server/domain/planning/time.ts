/** Heure du jour au format HH:MM, complétée par des zéros. */
export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
    return TIME_PATTERN.test(value);
}

export function parseTimeToMinutes(value: string): number {
    const match = TIME_PATTERN.exec(value);
    if (!match) {
        throw new Error(`Heure invalide : "${value}" (format attendu HH:MM)`);
    }
    return Number(match[1]) * 60 + Number(match[2]);
}

export function formatMinutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}
