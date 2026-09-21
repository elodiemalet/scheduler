import {describe, expect, it} from 'vitest';
import {minutesDoneByActivity, SlotProgress} from '@/server/domain/planning/timeSpent';

function slot(overrides: Partial<SlotProgress> = {}): SlotProgress {
    return {
        activity: 'Sport',
        startTime: '07:00',
        endTime: '09:00',
        status: 'done',
        ...overrides,
    };
}

describe('minutesDoneByActivity', () => {
    it('compte la durée d\'un créneau fait, en minutes', () => {
        expect(minutesDoneByActivity([slot()])).toEqual(new Map([['Sport', 120]]));
    });

    it('ignore les créneaux encore à faire', () => {
        expect(minutesDoneByActivity([slot({status: 'pending'})])).toEqual(new Map());
    });

    it('additionne les créneaux faits d\'une même activité', () => {
        const done = minutesDoneByActivity([
            slot({startTime: '07:00', endTime: '09:00'}),
            slot({startTime: '14:00', endTime: '14:45'}),
            slot({activity: 'Lecture', startTime: '18:00', endTime: '18:30'}),
        ]);
        expect(done).toEqual(new Map([['Sport', 165], ['Lecture', 30]]));
    });

    it('compte zéro pour un créneau dont la fin précède le début', () => {
        // parseSchedule vérifie le format des heures, pas leur ordre : un créneau
        // inversé peut exister en base et ne doit pas faire baisser le cumul.
        const done = minutesDoneByActivity([
            slot({startTime: '07:00', endTime: '08:00'}),
            slot({startTime: '10:00', endTime: '09:00'}),
        ]);
        expect(done).toEqual(new Map([['Sport', 60]]));
    });

    it('ignore un créneau aux heures illisibles plutôt que de lever', () => {
        // Un créneau corrompu ne doit pas faire échouer toute la liste des activités.
        const done = minutesDoneByActivity([
            slot({startTime: '7h', endTime: '09:00'}),
            slot({activity: 'Lecture', startTime: '18:00', endTime: '18:30'}),
        ]);
        expect(done).toEqual(new Map([['Lecture', 30]]));
    });

    it('rend une table vide sans créneau', () => {
        expect(minutesDoneByActivity([])).toEqual(new Map());
    });
});
