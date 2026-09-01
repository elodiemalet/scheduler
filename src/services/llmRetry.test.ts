import {describe, expect, it} from 'vitest';
import {
    BASE_DELAY_MS,
    isRetryableStatus,
    MAX_BACKOFF_MS,
    MAX_RETRY_AFTER_MS,
    retryDelayMs,
} from '@/services/llmRetry';

describe('isRetryableStatus', () => {
    it('retente la congestion, les timeouts et les pannes amont', () => {
        expect([408, 409, 429, 500, 502, 503, 504].every(isRetryableStatus)).toBe(true);
    });

    it('ne retente pas une requête ou une clé refusée', () => {
        expect([400, 401, 403, 404, 422].some(isRetryableStatus)).toBe(false);
    });
});

describe('retryDelayMs', () => {
    it('double le délai à chaque tentative', () => {
        expect(retryDelayMs(1)).toBe(BASE_DELAY_MS);
        expect(retryDelayMs(2)).toBe(BASE_DELAY_MS * 2);
        expect(retryDelayMs(3)).toBe(BASE_DELAY_MS * 4);
    });

    it('plafonne le backoff', () => {
        expect(retryDelayMs(20)).toBe(MAX_BACKOFF_MS);
    });

    it('respecte retry-after-ms', () => {
        expect(retryDelayMs(1, new Headers({'retry-after-ms': '1500'}))).toBe(1500);
    });

    it('respecte retry-after, exprimé en secondes', () => {
        expect(retryDelayMs(1, new Headers({'retry-after': '3'}))).toBe(3_000);
    });

    it('plafonne un retry-after aberrant', () => {
        expect(retryDelayMs(1, new Headers({'retry-after': '86400'}))).toBe(MAX_RETRY_AFTER_MS);
    });

    it('retombe sur le backoff quand retry-after porte une date HTTP', () => {
        const headers = new Headers({'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT'});

        expect(retryDelayMs(2, headers)).toBe(BASE_DELAY_MS * 2);
    });

    it('retombe sur le backoff sans en-têtes', () => {
        expect(retryDelayMs(1, null)).toBe(BASE_DELAY_MS);
    });
});
