import {describe, expect, it} from 'vitest';
import {
    activityToPlannable,
    EXTERNAL_TASK_DEFAULT_MINUTES,
    EXTERNAL_TASK_DEFAULT_PRIORITY,
    externalTaskToPlannable,
    MAX_PROMPT_FIELD_LENGTH,
    mergeActivitiesAndTasks,
    truncateForPrompt,
} from '@/server/domain/planning/mergeTasks';

const MONDAY = new Date(2026, 7, 31);

describe('activityToPlannable', () => {
    it('reporte les champs, la durée d\'une séance en minutes et la fréquence', () => {
        expect(activityToPlannable({
            name: 'Sport',
            description: 'Cardio',
            priority: 1,
            startTime: '09:00',
            endTime: '10:00',
            timeToSpend: 90,
            timesPerWeek: 2,
            days: ['lundi', 'jeudi'],
        })).toEqual({
            name: 'Sport',
            description: 'Cardio',
            priority: 1,
            startTime: '09:00',
            endTime: '10:00',
            sessionMinutes: 90,
            timesPerWeek: 2,
            days: ['lundi', 'jeudi'],
        });
    });

    it('applique des valeurs par défaut aux champs absents', () => {
        expect(activityToPlannable({name: 'Lecture'})).toEqual({
            name: 'Lecture',
            description: '',
            priority: 2,
            startTime: '',
            endTime: '',
            sessionMinutes: 60,
            timesPerWeek: null,
            days: [],
        });
    });

    it('ne rend pas prioritaire une activité enregistrée sans priorité', () => {
        // Régression : le défaut était 1, la priorité la plus haute.
        expect(activityToPlannable({name: 'X'}).priority).toBe(2);
    });

    it('traite un timesPerWeek null comme absent', () => {
        expect(activityToPlannable({name: 'X', timesPerWeek: null}).timesPerWeek).toBeNull();
    });
});

describe('externalTaskToPlannable', () => {
    it('place la tâche sur le jour de son échéance', () => {
        const result = externalTaskToPlannable(
            {title: 'Payer la facture', dueDate: new Date(2026, 8, 2)},
            MONDAY,
        );
        expect(result.days).toEqual(['mercredi']);
    });

    it('retombe sur la date fournie quand l\'échéance est absente', () => {
        const result = externalTaskToPlannable({title: 'Sans échéance'}, MONDAY);
        expect(result.days).toEqual(['lundi']);
    });

    it('accepte une échéance sous forme de chaîne ISO', () => {
        const result = externalTaskToPlannable(
            {title: 'ISO', dueDate: new Date(2026, 8, 5).toISOString()},
            MONDAY,
        );
        expect(result.days).toEqual(['samedi']);
    });

    it('vaut un quart d\'heure, exprimé en minutes comme tout le domaine', () => {
        expect(EXTERNAL_TASK_DEFAULT_MINUTES).toBe(15);
        expect(externalTaskToPlannable({title: 'T'}, MONDAY).sessionMinutes).toBe(15);
    });

    it('applique la priorité par défaut', () => {
        expect(externalTaskToPlannable({title: 'T'}, MONDAY).priority)
            .toBe(EXTERNAL_TASK_DEFAULT_PRIORITY);
    });

    it('respecte une priorité explicite', () => {
        expect(externalTaskToPlannable({title: 'T', priority: 1}, MONDAY).priority).toBe(1);
    });

    it('utilise les notes quand la description est absente', () => {
        expect(externalTaskToPlannable({title: 'T', notes: 'Depuis les notes'}, MONDAY).description)
            .toBe('Depuis les notes');
    });

    it('conserve la provenance', () => {
        const result = externalTaskToPlannable(
            {title: 'T', source: 'google-tasks', externalId: 'abc'},
            MONDAY,
        );
        expect(result.source).toBe('google-tasks');
        expect(result.externalId).toBe('abc');
    });

    it('ne fixe aucun créneau horaire', () => {
        const result = externalTaskToPlannable({title: 'T'}, MONDAY);
        expect(result.startTime).toBe('');
        expect(result.endTime).toBe('');
    });
});

describe('mergeActivitiesAndTasks', () => {
    it('concatène activités puis tâches, dans cet ordre', () => {
        const result = mergeActivitiesAndTasks(
            [{name: 'Sport', days: ['lundi']}],
            [{title: 'Facture', dueDate: new Date(2026, 8, 2)}],
            MONDAY,
        );
        expect(result.map((a) => a.name)).toEqual(['Sport', 'Facture']);
    });

    it('rend un tableau vide sans entrée', () => {
        expect(mergeActivitiesAndTasks([], [], MONDAY)).toEqual([]);
    });
});

describe('truncateForPrompt', () => {
    it('laisse passer une valeur plus courte que la borne', () => {
        expect(truncateForPrompt('Courir')).toBe('Courir');
    });

    it('coupe et marque une valeur trop longue', () => {
        const long = 'a'.repeat(MAX_PROMPT_FIELD_LENGTH + 50);

        const result = truncateForPrompt(long);

        expect(result).toHaveLength(MAX_PROMPT_FIELD_LENGTH + 1);
        expect(result.endsWith('…')).toBe(true);
    });
});

describe('externalTaskToPlannable, champs hors normes', () => {
    it('borne le titre et la description partant dans le prompt', () => {
        const plannable = externalTaskToPlannable({
            title: 'T'.repeat(500),
            notes: 'N'.repeat(500),
        }, MONDAY);

        expect(plannable.name).toHaveLength(MAX_PROMPT_FIELD_LENGTH + 1);
        expect(plannable.description).toHaveLength(MAX_PROMPT_FIELD_LENGTH + 1);
    });
});
