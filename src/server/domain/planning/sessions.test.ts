import {describe, expect, it} from 'vitest';
import {DayWindow} from '@/server/domain/planning/buildDayWindows';
import {PlannableActivity} from '@/server/domain/planning/mergeTasks';
import {isFixed, toSessionRequests} from '@/server/domain/planning/sessions';

function activity(overrides: Partial<PlannableActivity> = {}): PlannableActivity {
    return {
        name: 'Sport',
        description: '',
        priority: 2,
        startTime: '',
        endTime: '',
        sessionMinutes: 60,
        timesPerWeek: null,
        days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
        ...overrides,
    };
}

function windows(...days: DayWindow['jour'][]): DayWindow[] {
    return days.map((jour) => ({jour, heure_debut: '09:00', heure_fin: '18:00'}));
}

const WEEK = windows('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi');

function single(overrides: Partial<PlannableActivity> = {}) {
    return toSessionRequests([activity(overrides)], WEEK)[0];
}

describe('toSessionRequests, nombre de séances', () => {
    it('prévoit une séance par jour coché sans fréquence', () => {
        expect(single().sessions).toBe(5);
    });

    it('respecte la fréquence parmi les jours cochés', () => {
        expect(single({timesPerWeek: 3}).sessions).toBe(3);
    });

    it('ramène une fréquence trop haute au nombre de jours cochés', () => {
        expect(single({timesPerWeek: 7, days: ['lundi', 'mardi']}).sessions).toBe(2);
    });

    it('ouvre tous les jours de la semaine quand aucun jour n\'est coché', () => {
        const request = single({days: []});
        expect(request.days).toEqual(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']);
        expect(request.sessions).toBe(6);
    });

    it('applique la fréquence aux jours ouverts quand aucun jour n\'est coché', () => {
        expect(single({days: [], timesPerWeek: 2}).sessions).toBe(2);
    });
});

describe('toSessionRequests, durée minimale', () => {
    it('autorise une priorité 2 à descendre à la moitié', () => {
        expect(single({sessionMinutes: 90}).minSessionMinutes).toBe(45);
    });

    it('ne descend jamais sous 30 minutes', () => {
        expect(single({sessionMinutes: 45}).minSessionMinutes).toBe(30);
    });

    it('ne dépasse jamais la durée prévue', () => {
        expect(single({sessionMinutes: 20}).minSessionMinutes).toBe(20);
    });

    it('arrondit la moitié à la minute supérieure', () => {
        expect(single({sessionMinutes: 75}).minSessionMinutes).toBe(38);
    });

    it('interdit de raccourcir une priorité 1', () => {
        expect(single({priority: 1, sessionMinutes: 90}).minSessionMinutes).toBe(90);
    });

    it('interdit de raccourcir une priorité 3, qui se supprime', () => {
        expect(single({priority: 3, sessionMinutes: 90}).minSessionMinutes).toBe(90);
    });
});

describe('toSessionRequests, blocs fixes', () => {
    it('tire la durée des horaires et interdit de raccourcir', () => {
        const request = single({startTime: '07:00', endTime: '08:30', sessionMinutes: 10});
        expect(request.sessionMinutes).toBe(90);
        expect(request.minSessionMinutes).toBe(90);
        expect(request.startTime).toBe('07:00');
        expect(request.endTime).toBe('08:30');
    });

    it('applique la fréquence à un bloc fixe', () => {
        expect(single({startTime: '07:00', endTime: '08:30', timesPerWeek: 3}).sessions).toBe(3);
    });

    it('efface une heure isolée, qui ne fait pas un bloc fixe', () => {
        const request = single({startTime: '07:00'});
        expect(request.startTime).toBe('');
        expect(request.endTime).toBe('');
        expect(request.sessionMinutes).toBe(60);
    });
});

describe('toSessionRequests, provenance', () => {
    it('conserve source et externalId quand ils existent', () => {
        const request = single({source: 'google-tasks', externalId: 'abc'});
        expect(request.source).toBe('google-tasks');
        expect(request.externalId).toBe('abc');
    });

    it('n\'ajoute pas de clés de provenance vides', () => {
        expect(single()).not.toHaveProperty('source');
    });
});

describe('isFixed', () => {
    it('exige deux heures valides dans le bon ordre', () => {
        expect(isFixed({startTime: '09:00', endTime: '10:00'})).toBe(true);
        expect(isFixed({startTime: '09:00', endTime: ''})).toBe(false);
        expect(isFixed({startTime: '10:00', endTime: '09:00'})).toBe(false);
    });
});
