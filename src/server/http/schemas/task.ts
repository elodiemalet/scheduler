import {z} from 'zod';
import {parseTimeToMinutes, TIME_PATTERN} from '@/server/domain/planning/time';

/** Le formulaire envoie "" quand l'heure n'est pas renseignée. */
const timeField = z.union([z.literal(''), z.string().regex(TIME_PATTERN)]);

const MAX_TITLE = 200;
const MAX_TEXT = 2000;
const MAX_MINUTES = 24 * 60;

/** Liste blanche : Zod retire `_id` et toute clé non déclarée. Pas de `.strict()`. */
const taskFields = z.object({
    title: z.string().trim().min(1).max(MAX_TITLE),
    description: z.string().max(MAX_TEXT).optional(),
    minutes: z.number().int().min(5).max(MAX_MINUTES).optional(),
    priority: z.number().int().min(1).max(3).optional(),
    // nullable : effacer l'échéance en édition doit pouvoir écrire null.
    dueDate: z.coerce.date().nullable().optional(),
    startTime: timeField.optional(),
    endTime: timeField.optional(),
    done: z.boolean().optional(),
});

/** Un créneau fixe a un début et une fin, dans cet ordre — ou rien du tout. */
function fixedSlotIsValid({startTime, endTime}: {startTime?: string; endTime?: string}): boolean {
    if (!startTime && !endTime) {
        return true;
    }
    if (!startTime || !endTime) {
        return false;
    }
    return parseTimeToMinutes(endTime) > parseTimeToMinutes(startTime);
}

const FIXED_SLOT_ISSUE = {message: 'Créneau incomplet ou fin avant le début', path: ['endTime']};

export const taskInputSchema = taskFields.refine(fixedSlotIsValid, FIXED_SLOT_ISSUE);

/** Mise à jour : tout devient optionnel ; début et fin s'envoient ensemble. */
export const taskUpdateSchema = taskFields.partial().refine(fixedSlotIsValid, FIXED_SLOT_ISSUE);
