import {describe, expect, it} from 'vitest';
import {createRateLimiter} from '@/server/http/rateLimit';

const WINDOW_MS = 60_000;

describe('createRateLimiter', () => {
    it('autorise jusqu\'à la limite', () => {
        const check = createRateLimiter(3, WINDOW_MS);

        expect(check(0).allowed).toBe(true);
        expect(check(1_000).allowed).toBe(true);
        expect(check(2_000).allowed).toBe(true);
    });

    it('refuse au-delà et dit combien de temps attendre', () => {
        const check = createRateLimiter(2, WINDOW_MS);
        check(0);
        check(1_000);

        const decision = check(10_000);

        expect(decision.allowed).toBe(false);
        expect(decision.retryAfterSeconds).toBe(50);
    });

    it('autorise à nouveau une fois la fenêtre écoulée', () => {
        const check = createRateLimiter(1, WINDOW_MS);
        check(0);

        expect(check(30_000).allowed).toBe(false);
        expect(check(WINDOW_MS).allowed).toBe(true);
    });

    it('ne consomme rien quand il refuse', () => {
        const check = createRateLimiter(1, WINDOW_MS);
        check(0);
        check(10_000);
        check(20_000);

        // La fenêtre reste ancrée sur le seul appel autorisé, à t=0.
        expect(check(WINDOW_MS).allowed).toBe(true);
    });
});
