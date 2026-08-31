import {describe, expect, it} from 'vitest';
import {
    InvalidModelResponseError,
    parseSchedule,
} from '@/server/domain/planning/parseSchedule';
import fixture from '@/server/domain/planning/__fixtures__/openai-response.json';

function response(slots: unknown[]): string {
    return JSON.stringify({schedule: slots});
}

const VALID_SLOT = {
    day: 'jeudi',
    start_time: '09:30',
    end_time: '10:30',
    activity: 'Sport',
    description: 'Séance de cardio',
};

describe('parseSchedule', () => {
    it('convertit les clés snake_case en camelCase', () => {
        expect(parseSchedule(response([VALID_SLOT]))).toEqual([
            {
                day: 'jeudi',
                startTime: '09:30',
                endTime: '10:30',
                activity: 'Sport',
                description: 'Séance de cardio',
            },
        ]);
    });

    it('accepte un planning vide', () => {
        expect(parseSchedule(response([]))).toEqual([]);
    });

    it('remplace une description absente par une chaîne vide', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- on retire la clé par déstructuration
        const {description, ...withoutDescription} = VALID_SLOT;
        expect(parseSchedule(response([withoutDescription]))[0].description).toBe('');
    });

    it('analyse la réponse réelle du modèle conservée en fixture', () => {
        const slots = parseSchedule(JSON.stringify(fixture));
        expect(slots).toHaveLength(14);
        expect(new Set(slots.map((s) => s.day))).toEqual(new Set(['jeudi', 'vendredi']));
    });

    it('rejette un JSON malformé', () => {
        expect(() => parseSchedule('{ pas du json')).toThrow(InvalidModelResponseError);
    });

    it('rejette une réponse sans champ schedule', () => {
        expect(() => parseSchedule('{"autre": []}')).toThrow(InvalidModelResponseError);
    });

    it('rejette un champ schedule qui n\'est pas un tableau', () => {
        expect(() => parseSchedule('{"schedule": "rien"}')).toThrow(InvalidModelResponseError);
    });

    it('rejette un jour inconnu', () => {
        expect(() => parseSchedule(response([{...VALID_SLOT, day: 'funday'}])))
            .toThrow(/jour inconnu/i);
    });

    it('rejette une heure mal formée', () => {
        expect(() => parseSchedule(response([{...VALID_SLOT, start_time: '9h30'}])))
            .toThrow(/heure invalide/i);
    });

    it('rejette une heure hors bornes', () => {
        expect(() => parseSchedule(response([{...VALID_SLOT, end_time: '25:00'}])))
            .toThrow(/heure invalide/i);
    });

    it('rejette un nom d\'activité vide', () => {
        expect(() => parseSchedule(response([{...VALID_SLOT, activity: '   '}])))
            .toThrow(/activité/i);
    });

    it('indique le rang du créneau fautif', () => {
        expect(() => parseSchedule(response([VALID_SLOT, {...VALID_SLOT, day: 'funday'}])))
            .toThrow(/créneau 2/i);
    });
});
