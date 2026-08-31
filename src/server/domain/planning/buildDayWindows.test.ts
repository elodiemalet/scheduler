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

    it('ne repousse jamais la fin, même si les activités ne tiennent pas', () => {
        // La fenêtre ne dépend que des horaires fixes. Ce qui ne rentre pas est
        // arbitré par le modèle selon les priorités, pas en dilatant la journée.
        const windows = buildDayWindows([
            activity({priority: 1, timeToSpendHours: 40}),
        ]);
        expect(windows[0].heure_fin).toBe('18:00');
    });

    it('n\'utilise les horaires par défaut que comme plancher', () => {
        // Un bloc fixe matinal élargit le début sans rétrécir la fin : sans ça,
        // une activité 07:00-09:00 réduirait la journée entière à deux heures.
        const windows = buildDayWindows([
            activity({startTime: '07:00', endTime: '09:00'}),
        ]);
        expect(windows[0]).toEqual({jour: 'lundi', heure_debut: '07:00', heure_fin: '18:00'});
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
            {jour: 'lundi', heure_debut: '07:00', heure_fin: '18:00'},
            {jour: 'mardi', heure_debut: '09:00', heure_fin: '18:00'},
        ]);
    });
});
