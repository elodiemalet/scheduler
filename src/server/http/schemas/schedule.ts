import {z} from 'zod';
import {objectId} from '@/server/http/schemas/common';

/**
 * Les deux seuls statuts que `ScheduleSchema` accepte (voir src/models/Schedule.ts).
 * Un `$set` sur un sous-document ne passe par aucun validateur Mongoose :
 * cette liste est donc la seule chose qui empêche d'y écrire n'importe quoi.
 */
export const scheduleStatusSchema = z.object({
    status: z.enum(['pending', 'done']),
    id: objectId,
    planningId: objectId,
});

export type ScheduleStatusBody = z.infer<typeof scheduleStatusSchema>;
