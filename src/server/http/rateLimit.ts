export interface RateLimitDecision {
    allowed: boolean;
    /** Secondes à attendre avant une nouvelle tentative. 0 si autorisée. */
    retryAfterSeconds: number;
}

/**
 * Fenêtre glissante en mémoire. Suffisant pour une instance mono-utilisatrice
 * auto-hébergée, où le but est de borner le coût d'un clic répété — pas de
 * résister à un attaquant distribué. Deux limites assumées : l'état est par
 * processus (il disparaît au redémarrage et n'est pas partagé entre instances),
 * et le compteur est global à la route, pas par appelant — il n'y a qu'une
 * utilisatrice, et un compteur par IP se contournerait par un en-tête forgé.
 *
 * `now` est un paramètre pour que la fonction reste testable sans horloge simulée.
 */
export function createRateLimiter(limit: number, windowMs: number) {
    const hits: number[] = [];

    return function check(now: number = Date.now()): RateLimitDecision {
        while (hits.length > 0 && now - hits[0] >= windowMs) {
            hits.shift();
        }

        if (hits.length >= limit) {
            const waitMs = windowMs - (now - hits[0]);
            return {allowed: false, retryAfterSeconds: Math.ceil(waitMs / 1000)};
        }

        hits.push(now);
        return {allowed: true, retryAfterSeconds: 0};
    };
}
