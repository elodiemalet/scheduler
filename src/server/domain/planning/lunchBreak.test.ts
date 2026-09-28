import {describe, expect, it} from 'vitest';
import {
    DEFAULT_LUNCH_BREAK, isSplitAroundLunch, lunchBreakOf, numberParts, overlapsLunch, validateLunchBreak,
} from '@/server/domain/planning/lunchBreak';
import {ScheduleSlot} from '@/server/domain/planning/parseSchedule';

function slot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
    return {day: 'lundi', startTime: '09:00', endTime: '10:00', activity: 'Sport', description: '', ...overrides};
}

const LATE = {start: '13:00', end: '14:00'};

describe('overlapsLunch', () => {
    it('detects a slot overlapping the break, even by one minute', () => {
        expect(overlapsLunch('12:00', '12:31', DEFAULT_LUNCH_BREAK)).toBe(true);
        expect(overlapsLunch('13:59', '15:00', DEFAULT_LUNCH_BREAK)).toBe(true);
        expect(overlapsLunch('12:45', '13:15', DEFAULT_LUNCH_BREAK)).toBe(true);
    });

    it('lets a slot that touches the break without entering pass', () => {
        expect(overlapsLunch('11:30', '12:30', DEFAULT_LUNCH_BREAK)).toBe(false);
        expect(overlapsLunch('14:00', '15:00', DEFAULT_LUNCH_BREAK)).toBe(false);
    });

    it('follows the configured break, not the default', () => {
        expect(overlapsLunch('12:30', '13:00', LATE)).toBe(false);
        expect(overlapsLunch('12:30', '13:30', LATE)).toBe(true);
    });

    it('sees no overlap without a break', () => {
        expect(overlapsLunch('12:00', '14:00', null)).toBe(false);
    });
});

describe('isSplitAroundLunch', () => {
    it('accepts one part before the break and one after', () => {
        expect(isSplitAroundLunch(slot({startTime: '11:00', endTime: '12:30'}), slot({startTime: '14:00', endTime: '15:30'}), DEFAULT_LUNCH_BREAK))
            .toBe(true);
    });

    it('tolerates a short margin on either side of the break', () => {
        expect(isSplitAroundLunch(slot({startTime: '10:30', endTime: '12:00'}), slot({startTime: '14:30', endTime: '16:00'}), DEFAULT_LUNCH_BREAK))
            .toBe(true);
    });

    it('refuses two parts too far from the break', () => {
        expect(isSplitAroundLunch(slot({startTime: '09:00', endTime: '10:30'}), slot({startTime: '15:00', endTime: '16:30'}), DEFAULT_LUNCH_BREAK))
            .toBe(false);
    });

    it('refuses two parts on the same side of the break', () => {
        expect(isSplitAroundLunch(slot(), slot({startTime: '11:00', endTime: '12:00'}), DEFAULT_LUNCH_BREAK)).toBe(false);
    });

    it('frames the configured break', () => {
        expect(isSplitAroundLunch(slot({startTime: '11:30', endTime: '13:00'}), slot({startTime: '14:00', endTime: '15:00'}), LATE))
            .toBe(true);
    });

    it('recognizes no split without a break', () => {
        expect(isSplitAroundLunch(slot({startTime: '11:00', endTime: '12:30'}), slot({startTime: '14:00', endTime: '15:30'}), null))
            .toBe(false);
    });
});

describe('validateLunchBreak', () => {
    it('accepts the default break', () => {
        expect(validateLunchBreak(DEFAULT_LUNCH_BREAK)).toEqual([]);
    });

    it('refuses a poorly formatted time', () => {
        expect(validateLunchBreak({start: '9:30', end: '14:00'})).toEqual([expect.stringMatching(/heure invalide/i)]);
    });

    it('refuses an end that does not follow the start', () => {
        expect(validateLunchBreak({start: '14:00', end: '14:00'})).toEqual([expect.stringMatching(/après le début/i)]);
    });

    it('refuses a break outside 09:00–18:00', () => {
        expect(validateLunchBreak({start: '08:30', end: '09:30'})).toEqual([expect.stringMatching(/entre 09:00 et 18:00/)]);
        expect(validateLunchBreak({start: '17:30', end: '18:30'})).toEqual([expect.stringMatching(/entre 09:00 et 18:00/)]);
    });
});

describe('lunchBreakOf', () => {
    it('gives the default break when the field is absent', () => {
        expect(lunchBreakOf({})).toEqual(DEFAULT_LUNCH_BREAK);
    });

    it('keeps a disabled break', () => {
        expect(lunchBreakOf({lunchBreak: null})).toBeNull();
    });

    it('returns the recorded break', () => {
        expect(lunchBreakOf({lunchBreak: LATE})).toEqual(LATE);
    });
});

describe('numberParts', () => {
    it('numbers 1/1 a single-piece session', () => {
        expect(numberParts([slot()])).toEqual([{...slot(), part: 1, parts: 1}]);
    });

    it('numbers in time order the two parts of a split session', () => {
        const afternoon = slot({startTime: '14:00', endTime: '15:00'});
        const morning = slot({startTime: '11:30', endTime: '12:30'});
        expect(numberParts([afternoon, morning])).toEqual([
            {...afternoon, part: 2, parts: 2},
            {...morning, part: 1, parts: 2},
        ]);
    });

    it('brings together neither two days nor two activities', () => {
        const parts = numberParts([slot(), slot({day: 'mardi'}), slot({activity: 'Piano', startTime: '14:00', endTime: '15:00'})]);
        expect(parts.map((p) => p.parts)).toEqual([1, 1, 1]);
    });
});
