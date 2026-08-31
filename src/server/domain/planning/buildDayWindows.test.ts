import {describe, expect, it} from 'vitest';
import {buildDayWindows} from '@/server/domain/planning/buildDayWindows';
import {PlannableActivity} from '@/server/domain/planning/mergeTasks';

function activity(overrides: Partial<PlannableActivity> = {}): PlannableActivity {
    return {
        name: 'Activité',
        description: '',
        priority: 2,
        startTime: '',
        endTime: '',
        timeToSpendHours: 1,
        days: ['lundi'],
        ...overrides,
    };
}

describe('buildDayWindows', () => {
    it('applique les horaires par défaut sans créneau fixe', () => {
        expect(buildDayWindows([activity()])).toEqual([
            {jour: 'lundi', heure_debut: '09:00', heure_fin: '18:00'},
        ]);
    });

    it('rend un tableau vide sans activité', () => {
        expect(buildDayWindows([])).toEqual([]);
    });

    it('retient le début le plus tôt et la fin la plus tardive', () => {
        const windows = buildDayWindows([
            activity({startTime: '10:00', endTime: '12:00'}),
            activity({startTime: '08:00', endTime: '19:30'}),
        ]);
        expect(windows[0].heure_debut).toBe('08:00');
        expect(windows[0].heure_fin).toBe('19:30');
    });

    it('ordonne les jours selon la semaine, pas selon l\'ordre d\'arrivée', () => {
        const windows = buildDayWindows([
            activity({days: ['vendredi']}),
            activity({days: ['lundi']}),
            activity({days: ['mercredi']}),
        ]);
        expect(windows.map((w) => w.jour)).toEqual(['lundi', 'mercredi', 'vendredi']);
    });

    it('ne produit qu\'une fenêtre par jour même avec plusieurs activités', () => {
        const windows = buildDayWindows([
            activity({days: ['lundi']}),
            activity({days: ['lundi']}),
        ]);
        expect(windows).toHaveLength(1);
    });

    it('repousse la fin quand les activités de priorité 1 débordent', () => {
        // Fenêtre par défaut 09:00-18:00 = 9 h ; 12 h nécessaires → +3 h.
        const windows = buildDayWindows([
            activity({priority: 1, timeToSpendHours: 12}),
        ]);
        expect(windows[0].heure_fin).toBe('21:00');
    });

    it('ne repousse pas la fin pour des activités de priorité autre que 1', () => {
        // Régression : c'est ce filtre qui empêche les tâches externes,
        // toutes en priorité 2, de dilater la journée.
        const windows = buildDayWindows([
            activity({priority: 2, timeToSpendHours: 20}),
        ]);
        expect(windows[0].heure_fin).toBe('18:00');
    });

    it('plafonne la fin repoussée à l\'heure maximale', () => {
        const windows = buildDayWindows([
            activity({priority: 1, timeToSpendHours: 40}),
        ]);
        expect(windows[0].heure_fin).toBe('23:00');
    });

    it('conserve les minutes de la fin d\'origine lors du plafonnement', () => {
        const windows = buildDayWindows([
            activity({priority: 1, timeToSpendHours: 40, startTime: '09:00', endTime: '18:30'}),
        ]);
        expect(windows[0].heure_fin).toBe('23:30');
    });

    it('cumule le temps de plusieurs activités de priorité 1', () => {
        // 5 h + 6 h = 11 h pour 9 h disponibles → +2 h.
        const windows = buildDayWindows([
            activity({priority: 1, timeToSpendHours: 5}),
            activity({priority: 1, timeToSpendHours: 6}),
        ]);
        expect(windows[0].heure_fin).toBe('20:00');
    });

    it('ignore les heures mal formées au lieu de planter', () => {
        const windows = buildDayWindows([activity({startTime: '9h00', endTime: ''})]);
        expect(windows[0].heure_debut).toBe('09:00');
    });

    it('traite chaque jour indépendamment', () => {
        const windows = buildDayWindows([
            activity({days: ['lundi'], startTime: '07:00', endTime: '12:00'}),
            activity({days: ['mardi']}),
        ]);
        expect(windows).toEqual([
            {jour: 'lundi', heure_debut: '07:00', heure_fin: '12:00'},
            {jour: 'mardi', heure_debut: '09:00', heure_fin: '18:00'},
        ]);
    });
});
