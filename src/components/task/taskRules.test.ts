import {describe, expect, it} from 'vitest';
import {formatDue, isOverdue, sortTasks, toDateInput} from '@/components/task/taskRules';

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
        expect(toDateInput('2026-10-02T00:00:00.000Z')).toBe('2026-10-02');
    });

    it('rendent une chaîne vide sans échéance', () => {
        expect(formatDue(null)).toBe('');
        expect(toDateInput(null)).toBe('');
    });
});
