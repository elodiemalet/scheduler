import {NextApiRequest, NextApiResponse} from "next";
import dbConnect from "@/server/infrastructure/db/connection";
import Activity from "@/models/Activity";
import {activityUpdateSchema} from "@/server/http/schemas/activity";
import {objectId} from "@/server/http/schemas/common";
import {fail, invalidInput, methodNotAllowed, serverError} from "@/server/http/respond";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await dbConnect();

        // `req.query.id` vaut `string | string[] | undefined` : le schéma
        // refuse les deux derniers cas sans qu'on ait à les distinguer.
        const id = objectId.safeParse(req.query.id);
        if (!id.success) {
            invalidInput(res, id.error);
            return;
        }

        if (req.method === 'GET') {
            const activity = await Activity.findById(id.data);
            if (!activity) {
                fail(res, 404, 'Activité introuvable');
                return;
            }

            res.status(200).json(activity);
            return;
        }

        if (req.method === 'POST') {
            const parsed = activityUpdateSchema.safeParse(req.body);
            if (!parsed.success) {
                invalidInput(res, parsed.error);
                return;
            }

            // `runValidators` : sans lui, une mise à jour contourne l'enum
            // `days` du schéma — Mongoose ne valide pas les updates par défaut.
            const activity = await Activity.findByIdAndUpdate(id.data, parsed.data, {
                returnDocument: 'after',
                runValidators: true,
            });

            if (!activity) {
                fail(res, 404, 'Activité introuvable');
                return;
            }

            res.status(200).json(activity);
            return;
        }

        methodNotAllowed(res, ['GET', 'POST']);
    } catch (error) {
        serverError(res, `${req.method} /api/activity/[id]`, error);
    }
}
