import {z} from 'zod';
import {WEEKDAYS} from '@/server/domain/planning/days';
import {TIME_PATTERN} from '@/server/domain/planning/time';
import {objectId} from '@/server/http/schemas/common';

/** Le formulaire envoie "" quand l'heure n'est pas renseignée. */
const timeField = z.union([z.literal(''), z.string().regex(TIME_PATTERN)]);

/** Bornes hautes : elles ne servent qu'à refuser l'absurde. */
const MAX_NAME = 200;
const MAX_TEXT = 2000;
/** L'unité stockée est la minute (voir le piège documenté dans CLAUDE.md). */
const MAX_TIME_TO_SPEND = 10_000;

/**
 * Liste blanche. Zod retire par défaut toute clé non déclarée : c'est ce qui
 * ferme le mass assignment, `_id` et `__v` compris. Ne pas ajouter `.strict()`
 * — `ActivityForm` envoie `_id` à chaque soumission et doit continuer à passer.
 */
export const activityInputSchema = z.object({
    name: z.string().min(1).max(MAX_NAME),
    description: z.string().max(MAX_TEXT).optional(),
    priority: z.number().int().min(1).max(3).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    startTime: timeField.optional(),
    endTime: timeField.optional(),
    isCompleted: z.boolean().optional(),
    isActive: z.boolean().optional(),
    timeToSpend: z.number().min(0).max(MAX_TIME_TO_SPEND).optional(),
    days: z.array(z.enum(WEEKDAYS)).optional(),
});

/** Mise à jour : tout devient optionnel, `name` compris. */
export const activityUpdateSchema = activityInputSchema.partial();

/**
 * `index` est le nom que `ActivityList.deleteActivity` donne à l'identifiant
 * de l'activité à supprimer. Nom trompeur, mais c'est le contrat du client :
 * le renommer demanderait de toucher l'UI, hors périmètre de cette phase.
 */
export const deleteActivitySchema = z.object({index: objectId});
