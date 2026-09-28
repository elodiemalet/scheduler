/**
 * Message renvoyé au modèle quand checkSchedule a trouvé des violations : il
 * reprend sa propre réponse et la corrige, plutôt que de repartir de zéro.
 */
export function buildCorrectionRequest(violations: string[]): string {
    return [
        'Ton planning ne respecte pas ces règles :',
        violations.map((violation) => `- ${violation}`).join('\n'),
        'Corrige-le en appliquant les règles et l’ordre d’arbitrage du prompt, puis renvoie le JSON complet '
        + '(schedule, sacrifices, note), au même format.',
    ].join('\n\n');
}

/** Une correction n'est gardée que si elle réduit strictement le nombre de violations. */
export function isBetterCorrection(before: string[], after: string[]): boolean {
    return after.length < before.length;
}
