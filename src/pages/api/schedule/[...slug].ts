import {NextApiRequest, NextApiResponse} from "next";
import dbConnect from "@/server/infrastructure/db/connection";
import Planning from "@/models/Planning";
import {scheduleStatusSchema} from "@/server/http/schemas/schedule";
import {fail, invalidInput, methodNotAllowed, serverError} from "@/server/http/respond";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await dbConnect();

        const {slug} = req.query;

        // Bascule du statut d'un créneau, sur /api/schedule/status
        if (req.method === 'POST' && slug?.[0] === 'status') {
            const parsed = scheduleStatusSchema.safeParse(req.body);
            if (!parsed.success) {
                invalidInput(res, parsed.error);
                return;
            }

            const {status, id, planningId} = parsed.data;

            // Mise à jour atomique du sous-document : il n'existe plus de collection
            // `schedules`, la copie embarquée dans Planning est la seule source.
            const planning = await Planning.findOneAndUpdate(
                {_id: planningId, "schedule._id": id},
                {$set: {"schedule.$.status": status}},
                {returnDocument: 'after'},
            );

            if (!planning) {
                fail(res, 404, 'Créneau introuvable');
                return;
            }

            // `.id()` est l'accesseur de sous-document des DocumentArray Mongoose.
            const schedule = planning.schedule.id(id);

            res.status(200).json({status, schedule});
            return;
        }

        methodNotAllowed(res, ['POST']);
    } catch (error) {
        serverError(res, `${req.method} /api/schedule/${slugLabel(req)}`, error);
    }
}

/** Le slug n'apparaît que dans les logs serveur, jamais dans une réponse. */
function slugLabel(req: NextApiRequest): string {
    const {slug} = req.query;
    return Array.isArray(slug) ? slug.join('/') : String(slug ?? '');
}
