import {z} from 'zod';

/**
 * Identifiant Mongo sérialisé : 24 caractères hexadécimaux, rien d'autre.
 * Volontairement plus strict que `mongoose.Types.ObjectId.isValid`, qui
 * accepte aussi n'importe quelle chaîne de 12 caractères.
 */
export const objectId = z.string().regex(/^[0-9a-f]{24}$/i);
