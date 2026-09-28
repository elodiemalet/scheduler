import {describe, expect, it} from 'vitest';
import {isSplitAroundLunch, numberParts, overlapsLunch} from '@/server/domain/planning/lunchBreak';
import {ScheduleSlot} from '@/server/domain/planning/parseSchedule';

function slot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
    return {day: 'lundi', startTime: '09:00', endTime: '10:00', activity: 'Sport', description: '', ...overrides};
}

describe('overlapsLunch', () => {
    it('détecte un créneau qui empiète sur la pause, même d’une minute', () => {
        expect(overlapsLunch('12:00', '12:31')).toBe(true);
        expect(overlapsLunch('13:59', '15:00')).toBe(true);
        expect(overlapsLunch('12:45', '13:15')).toBe(true);
    });

    it('laisse passer un créneau qui touche la pause sans y entrer', () => {
        expect(overlapsLunch('11:30', '12:30')).toBe(false);
        expect(overlapsLunch('14:00', '15:00')).toBe(false);
    });
});

describe('isSplitAroundLunch', () => {
    it('accepte une partie avant la pause et une après', () => {
        expect(isSplitAroundLunch(slot({startTime: '11:00', endTime: '12:30'}), slot({startTime: '14:00', endTime: '15:30'})))
            .toBe(true);
    });

    it('tolère une courte marge de part et d’autre de la pause', () => {
        expect(isSplitAroundLunch(slot({startTime: '10:30', endTime: '12:00'}), slot({startTime: '14:30', endTime: '16:00'})))
            .toBe(true);
    });

    it('refuse deux parties trop éloignées de la pause', () => {
        expect(isSplitAroundLunch(slot({startTime: '09:00', endTime: '10:30'}), slot({startTime: '15:00', endTime: '16:30'})))
            .toBe(false);
    });

    it('refuse deux parties du même côté de la pause', () => {
        expect(isSplitAroundLunch(slot(), slot({startTime: '11:00', endTime: '12:00'}))).toBe(false);
    });
});

describe('numberParts', () => {
    it('numérote 1/1 une séance d’un seul tenant', () => {
        expect(numberParts([slot()])).toEqual([{...slot(), part: 1, parts: 1}]);
    });

    it('numérote dans l’ordre des heures les deux parties d’une séance coupée', () => {
        const afternoon = slot({startTime: '14:00', endTime: '15:00'});
        const morning = slot({startTime: '11:30', endTime: '12:30'});
        expect(numberParts([afternoon, morning])).toEqual([
            {...afternoon, part: 2, parts: 2},
            {...morning, part: 1, parts: 2},
        ]);
    });

    it('ne rapproche ni deux jours, ni deux activités', () => {
        const parts = numberParts([slot(), slot({day: 'mardi'}), slot({activity: 'Piano', startTime: '14:00', endTime: '15:00'})]);
        expect(parts.map((p) => p.parts)).toEqual([1, 1, 1]);
    });
});
