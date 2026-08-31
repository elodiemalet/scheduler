import {describe, expect, it} from 'vitest';
import {
    formatMinutesToTime,
    isValidTime,
    parseTimeToMinutes,
} from '@/server/domain/planning/time';

describe('isValidTime', () => {
    it('accepte une heure valide', () => {
        expect(isValidTime('09:30')).toBe(true);
    });

    it('accepte minuit et la dernière minute du jour', () => {
        expect(isValidTime('00:00')).toBe(true);
        expect(isValidTime('23:59')).toBe(true);
    });

    it('refuse une heure hors bornes', () => {
        expect(isValidTime('24:00')).toBe(false);
        expect(isValidTime('12:60')).toBe(false);
    });

    it('refuse un format non complété par des zéros', () => {
        expect(isValidTime('9:30')).toBe(false);
    });

    it('refuse une chaîne vide', () => {
        expect(isValidTime('')).toBe(false);
    });
});

describe('parseTimeToMinutes', () => {
    it('convertit une heure en minutes depuis minuit', () => {
        expect(parseTimeToMinutes('09:30')).toBe(570);
        expect(parseTimeToMinutes('00:00')).toBe(0);
        expect(parseTimeToMinutes('23:59')).toBe(1439);
    });

    it('lève une erreur sur un format invalide', () => {
        expect(() => parseTimeToMinutes('9h30')).toThrow(/heure invalide/i);
    });
});

describe('formatMinutesToTime', () => {
    it('formate des minutes en HH:MM', () => {
        expect(formatMinutesToTime(570)).toBe('09:30');
        expect(formatMinutesToTime(0)).toBe('00:00');
        expect(formatMinutesToTime(1439)).toBe('23:59');
    });

    it('fait l\'aller-retour sans perte', () => {
        expect(formatMinutesToTime(parseTimeToMinutes('18:45'))).toBe('18:45');
    });
});
