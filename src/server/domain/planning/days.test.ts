import {describe, expect, it} from 'vitest';
import {isWeekday, sortWeekdays, WEEKDAYS, weekdayFromDate} from '@/server/domain/planning/days';

describe('WEEKDAYS', () => {
    it('liste les sept jours dans l\'ordre de la semaine', () => {
        expect(WEEKDAYS).toEqual([
            'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
        ]);
    });
});

describe('isWeekday', () => {
    it('accepte un jour connu', () => {
        expect(isWeekday('mercredi')).toBe(true);
    });

    it('refuse un libellé inconnu', () => {
        expect(isWeekday('funday')).toBe(false);
    });

    it('est sensible à la casse : les jours sont stockés en minuscules', () => {
        expect(isWeekday('Lundi')).toBe(false);
    });
});

describe('weekdayFromDate', () => {
    // Dates construites avec le constructeur local, jamais par chaîne :
    // new Date('2026-08-31') serait interprété en UTC et basculerait de jour
    // selon le fuseau de la machine qui exécute les tests.
    it('convertit un lundi', () => {
        expect(weekdayFromDate(new Date(2026, 7, 31))).toBe('lundi');
    });

    it('convertit un mercredi', () => {
        expect(weekdayFromDate(new Date(2026, 8, 2))).toBe('mercredi');
    });

    it('convertit un samedi', () => {
        expect(weekdayFromDate(new Date(2026, 8, 5))).toBe('samedi');
    });

    it('convertit un dimanche, que getDay() place à l\'index 0', () => {
        expect(weekdayFromDate(new Date(2026, 0, 4))).toBe('dimanche');
    });
});

describe('sortWeekdays', () => {
    it('trie selon l\'ordre de la semaine, pas alphabétiquement', () => {
        expect(sortWeekdays(['vendredi', 'lundi', 'mercredi'])).toEqual([
            'lundi', 'mercredi', 'vendredi',
        ]);
    });

    it('écarte les jours inconnus', () => {
        expect(sortWeekdays(['lundi', 'funday', 'jeudi'])).toEqual(['lundi', 'jeudi']);
    });

    it('ne mute pas le tableau reçu', () => {
        const input = ['vendredi', 'lundi'];
        sortWeekdays(input);
        expect(input).toEqual(['vendredi', 'lundi']);
    });

    it('rend un tableau vide pour une entrée vide', () => {
        expect(sortWeekdays([])).toEqual([]);
    });
});
