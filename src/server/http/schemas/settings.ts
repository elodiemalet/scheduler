import {z} from 'zod';
import {validateLunchBreak} from '@/server/domain/planning/lunchBreak';

/** `null` désactive la pause. Zod retire toute clé non déclarée. Pas de `.strict()`. */
export const settingsInputSchema = z.object({
    lunchBreak: z.object({start: z.string(), end: z.string()}).nullable(),
}).superRefine(({lunchBreak}, ctx) => {
    if (!lunchBreak) {
        return;
    }
    for (const message of validateLunchBreak(lunchBreak)) {
        ctx.addIssue({code: 'custom', message, path: ['lunchBreak']});
    }
});
