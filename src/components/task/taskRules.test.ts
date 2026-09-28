import {describe, expect, it} from 'vitest';
import {
    formatDue, isOverdue, slotProblem, sortTasks, stepTaskMinutes, taskMeta, taskSummary, toDateInput,
} from '@/components/task/taskRules';

const NOW = new Date(2026, 8, 30, 15, 0);

function task(dueDate: string | null, done = false, createdAt = '2026-09-01T00:00:00.000Z') {
    return {dueDate, done, createdAt};
}

describe('isOverdue', () => {
    it('est vrai pour une échéance passée non faite', () => {
        expect(isOverdue(task('2026-09-28T00:00:00.000Z'), NOW)).toBe(true);
    });

    it('est faux le jour même, sans échéance, ou une fois faite', () => {
        expect(isOverdue(task('2026-09-30T00:00:00.000Z'), NOW)).toBe(false);
        expect(isOverdue(task(null), NOW)).toBe(false);
        expect(isOverdue(task('2026-09-28T00:00:00.000Z', true), NOW)).toBe(false);
    });
});

describe('sortTasks', () => {
    it('met les faites en dernier, puis trie par échéance, sans échéance à la fin', () => {
        const later = task('2026-10-10T00:00:00.000Z');
        const soon = task('2026-10-01T00:00:00.000Z');
        const none = task(null);
        const done = task('2026-09-29T00:00:00.000Z', true);
        expect(sortTasks([done, none, later, soon])).toEqual([soon, later, none, done]);
    });

    it('départage par création, la plus récente d\'abord, sans muter l\'entrée', () => {
        const old = task(null, false, '2026-09-01T00:00:00.000Z');
        const recent = task(null, false, '2026-09-20T00:00:00.000Z');
        const input = [old, recent];
        expect(sortTasks(input)).toEqual([recent, old]);
        expect(input).toEqual([old, recent]);
    });
});

describe('formatDue et toDateInput', () => {
    it('formatent une échéance', () => {
        expect(formatDue('2026-10-02T00:00:00.000Z')).toBe('vendredi 2 octobre');
        expect(formatDue('2026-10-01T00:00:00.000Z')).toBe('jeudi 1er octobre');
        expect(toDateInput('2026-10-02T00:00:00.000Z')).toBe('2026-10-02');
    });

    it('rendent une chaîne vide sans échéance', () => {
        expect(formatDue(null)).toBe('');
        expect(toDateInput(null)).toBe('');
    });
});

describe('taskMeta', () => {
    it('assemble durée, échéance et créneau', () => {
        expect(taskMeta({minutes: 45, dueDate: '2026-10-01T00:00:00.000Z', startTime: '10:00', endTime: '10:45'}))
            .toBe('45 min · pour jeudi 1er octobre · 10:00–10:45');
    });

    it('se réduit à la durée sans échéance ni créneau', () => {
        expect(taskMeta({minutes: 90, dueDate: null, startTime: '', endTime: ''})).toBe('1 h 30');
    });
});

describe('taskSummary', () => {
    it('compte les tâches à faire, en retard et faites', () => {
        const tasks = [
            task('2026-09-28T00:00:00.000Z'),
            task(null),
            task('2026-09-25T00:00:00.000Z', true),
            task(null, true),
        ];
        expect(taskSummary(tasks, NOW)).toBe('2 à faire · 1 en retard · 2 faites');
    });

    it('omet ce qui vaut zéro', () => {
        expect(taskSummary([task(null)], NOW)).toBe('1 à faire');
        expect(taskSummary([task(null), task(null, true)], NOW)).toBe('1 à faire · 1 faite');
    });
});

describe('stepTaskMinutes', () => {
    it('avance par pas de 15 min, recalé sur le pas', () => {
        expect(stepTaskMinutes(15, 1)).toBe(30);
        expect(stepTaskMinutes(20, 1)).toBe(30);
        expect(stepTaskMinutes(20, -1)).toBe(15);
    });

    it('reste entre 15 min et 8 h', () => {
        expect(stepTaskMinutes(15, -1)).toBe(15);
        expect(stepTaskMinutes(480, 1)).toBe(480);
    });
});

describe('slotProblem', () => {
    it('accepte un créneau vide ou complet dans l\'ordre', () => {
        expect(slotProblem('', '')).toBe('');
        expect(slotProblem('10:00', '10:45')).toBe('');
    });

    it('signale un créneau incomplet ou à l\'envers', () => {
        expect(slotProblem('10:00', '')).toMatch(/début et l’heure de fin/);
        expect(slotProblem('', '10:00')).toMatch(/début et l’heure de fin/);
        expect(slotProblem('10:00', '09:30')).toMatch(/après l’heure de début/);
        expect(slotProblem('10:00', '10:00')).toMatch(/après l’heure de début/);
    });
});
