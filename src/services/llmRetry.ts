/** Statuts que le SDK openai retentait : congestion, timeout, conflit, panne amont. */
const RETRYABLE_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
    return RETRYABLE_STATUSES.has(status);
}

/** Premier délai, doublé à chaque tentative. */
export const BASE_DELAY_MS = 500;
/** Plafond du backoff calculé. */
export const MAX_BACKOFF_MS = 8_000;
/** Plafond d'un `retry-after` amont : un en-tête aberrant ne doit pas figer la requête. */
export const MAX_RETRY_AFTER_MS = 60_000;

/**
 * Délai avant la tentative suivante. Le fournisseur a le dernier mot quand il
 * l'exprime — Groq renvoie `retry-after-ms` sur ses 429 — sinon backoff
 * exponentiel. Pas de jitter : une seule utilisatrice, donc aucun troupeau à
 * disperser, et un délai déterministe se teste.
 */
export function retryDelayMs(attempt: number, headers?: Headers | null): number {
    const fromHeaders = delayFromHeaders(headers);
    if (fromHeaders !== null) {
        return Math.min(fromHeaders, MAX_RETRY_AFTER_MS);
    }

    return Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}

function delayFromHeaders(headers?: Headers | null): number | null {
    if (!headers) {
        return null;
    }

    const retryAfterMs = headers.get('retry-after-ms');
    if (retryAfterMs !== null) {
        const milliseconds = Number(retryAfterMs);
        if (Number.isFinite(milliseconds) && milliseconds >= 0) {
            return milliseconds;
        }
    }

    const retryAfter = headers.get('retry-after');
    if (retryAfter !== null) {
        // `retry-after` accepte aussi une date HTTP : non numérique, on
        // retombe alors sur le backoff exponentiel.
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds) && seconds >= 0) {
            return seconds * 1000;
        }
    }

    return null;
}
