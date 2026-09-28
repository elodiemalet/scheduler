import {describe, expect, it} from 'vitest';
import {parseClock, parseDuration, withEnd} from '@/components/activity/activityRules';

describe('parseClock', () => {
    it('lit les écritures courantes d’une heure', () => {
        expect(parseClock('7')).toBe(7 * 60);
        expect(parseClock('7h')).toBe(7 * 60);
        expect(parseClock('7h30')).toBe(7 * 60 + 30);
        expect(parseClock('07:30')).toBe(7 * 60 + 30);
        expect(parseClock(' 18 h 45 ')).toBe(18 * 60 + 45);
        expect(parseClock('0h')).toBe(0);
    });

    it('refuse une heure impossible ou illisible', () => {
        expect(parseClock('')).toBeNull();
        expect(parseClock('24h')).toBeNull();
        expect(parseClock('7h75')).toBeNull();
        expect(parseClock('7h3')).toBeNull();
        expect(parseClock('midi')).toBeNull();
    });
});

describe('parseDuration', () => {
    it('lit un nombre nu comme des minutes', () => {
        expect(parseDuration('45')).toBe(45);
        expect(parseDuration('90 min')).toBe(90);
    });

    it('lit les heures, avec ou sans minutes', () => {
        expect(parseDuration('1h')).toBe(60);
        expect(parseDuration('1h30')).toBe(90);
        expect(parseDuration('1 h 30')).toBe(90);
        expect(parseDuration('1:30')).toBe(90);
    });

    it('refuse une durée nulle, trop courte, trop longue ou illisible', () => {
        expect(parseDuration('0')).toBeNull();
        expect(parseDuration('2')).toBeNull();
        expect(parseDuration('25h')).toBeNull();
        expect(parseDuration('1h75')).toBeNull();
        expect(parseDuration('beaucoup')).toBeNull();
    });
});

describe('withEnd', () => {
    it('recalcule la durée quand la fin bouge', () => {
        expect(withEnd(7 * 60, 9 * 60 + 30)).toEqual({startTime: '07:00', endTime: '09:30', timeToSpend: 150});
    });

    it('refuse une fin avant ou égale au début', () => {
        expect(withEnd(9 * 60, 9 * 60)).toBeNull();
        expect(withEnd(9 * 60, 8 * 60)).toBeNull();
    });
});
