import {describe, expect, it} from 'vitest';
import {FREE_TIME_IDEAS, timelineOf} from '@/components/planning/timeline';

function slot(startTime: string, endTime: string, activity = 'Sport') {
    return {_id: `${activity}-${startTime}`, day: 'lundi', startTime, endTime, activity};
}

/** Le squelette d'une journée : type d'encart et horaires, sans l'idée tirée. */
function shape(items: ReturnType<typeof timelineOf>) {
    return items.map((item) => item.kind === 'slot'
        ? `slot ${item.slot.startTime}`
        : item.kind === 'lunch' ? 'lunch' : `free ${item.start}–${item.end}`);
}

describe('timelineOf', () => {
    it('rend une journée vide sans pause ni temps libre', () => {
        expect(timelineOf([], 'lundi', 'seed')).toEqual([]);
    });

    it('glisse la pause de midi à sa place parmi les créneaux', () => {
        expect(shape(timelineOf([slot('14:00', '15:00'), slot('09:00', '12:30')], 'lundi', 'seed')))
            .toEqual(['slot 09:00', 'lunch', 'slot 14:00']);
    });

    it('signale un trou d’au moins 30 min entre deux créneaux', () => {
        expect(shape(timelineOf([slot('09:00', '10:30'), slot('11:00', '12:00')], 'lundi', 'seed')))
            .toEqual(['slot 09:00', 'free 10:30–11:00', 'slot 11:00', 'lunch']);
    });

    it('ignore une simple transition de moins de 30 min', () => {
        expect(shape(timelineOf([slot('09:00', '10:00'), slot('10:15', '11:00')], 'lundi', 'seed')))
            .toEqual(['slot 09:00', 'slot 10:15', 'lunch']);
    });

    it('découpe un trou autour de la pause de midi', () => {
        expect(shape(timelineOf([slot('09:00', '11:00'), slot('15:00', '16:00')], 'lundi', 'seed')))
            .toEqual(['slot 09:00', 'free 11:00–12:30', 'lunch', 'free 14:00–15:00', 'slot 15:00']);
    });

    it('ne compte pas le temps avant la première séance ni après la dernière', () => {
        expect(shape(timelineOf([slot('10:00', '11:00')], 'lundi', 'seed'))).toEqual(['slot 10:00', 'lunch']);
    });

    it('tire des idées différentes dans une même journée, et toujours les mêmes pour un même planning', () => {
        const slots = [slot('08:00', '09:00'), slot('10:00', '11:00'), slot('15:00', '16:00'), slot('17:00', '18:00')];
        const ideas = timelineOf(slots, 'lundi', 'seed').flatMap((item) => item.kind === 'free' ? [item.idea] : []);
        expect(ideas).toHaveLength(4);
        expect(new Set(ideas).size).toBe(4);
        expect(ideas.every((idea) => FREE_TIME_IDEAS.includes(idea))).toBe(true);
        expect(timelineOf(slots, 'lundi', 'seed')).toEqual(timelineOf(slots, 'lundi', 'seed'));
    });

    it('garde un créneau aux horaires illisibles, sans calculer de trou autour', () => {
        expect(shape(timelineOf([slot('09:00', '10:00'), slot('9h', '11:00')], 'lundi', 'seed')))
            .toEqual(['slot 09:00', 'lunch', 'slot 9h']);
    });
});
