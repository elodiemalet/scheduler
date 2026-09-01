import type {NextApiResponse} from 'next';
import type {ZodError} from 'zod';

/**
 * Forme unique des erreurs de l'API : {error: "…"}. Le détail d'une exception
 * — message Mongo, réponse d'un service tiers, trace — reste côté serveur : il renseigne
 * un attaquant bien plus qu'il n'aide l'utilisatrice.
 */
export function fail(res: NextApiResponse, status: number, message: string): void {
    res.status(status).json({error: message});
}

/** 405 avec l'en-tête `Allow`, qu'exige la RFC 9110 §15.5.6. */
export function methodNotAllowed(res: NextApiResponse, allowed: string[]): void {
    // Une seule ligne d'en-tête, valeurs séparées par des virgules : passer le
    // tableau tel quel émettrait un `Allow:` par méthode.
    res.setHeader('Allow', allowed.join(', '));
    fail(res, 405, `Méthode non autorisée. Méthodes acceptées : ${allowed.join(', ')}.`);
}

/**
 * 400 sur échec de validation. Les chemins et messages Zod décrivent *notre*
 * contrat d'entrée, pas l'état interne du serveur : les renvoyer aide au
 * débogage sans rien divulguer. C'est la seule exception assumée à la règle
 * du message générique.
 */
export function invalidInput(res: NextApiResponse, error: ZodError): void {
    const details = error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path} : ${issue.message}` : issue.message;
    });

    res.status(400).json({error: 'Requête invalide', details});
}

/**
 * 500 : journalise le détail, ne renvoie qu'un message générique. `context`
 * situe l'erreur dans les logs, seul endroit où elle sera lisible.
 */
export function serverError(res: NextApiResponse, context: string, error: unknown): void {
    console.error(`${context} :`, error);
    fail(res, 500, 'Erreur interne du serveur');
}
