import {NextApiRequest, NextApiResponse} from 'next';
import Activity from "@/models/Activity";
import dbConnect from "@/server/infrastructure/db/connection";
import {activityInputSchema, deleteActivitySchema} from "@/server/http/schemas/activity";
import {fail, invalidInput, methodNotAllowed, serverError} from "@/server/http/respond";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await dbConnect();

        if (req.method === 'GET') {
            const activities = await Activity.find({});
            res.status(200).json({data: activities});
            return;
        }

        if (req.method === 'POST') {
            const parsed = activityInputSchema.safeParse(req.body);
            if (!parsed.success) {
                invalidInput(res, parsed.error);
                return;
            }

            const activity = await new Activity(parsed.data).save();
            res.status(200).json({data: activity});
            return;
        }

        if (req.method === 'DELETE') {
            const parsed = deleteActivitySchema.safeParse(req.body);
            if (!parsed.success) {
                invalidInput(res, parsed.error);
                return;
            }

            const activity = await Activity.findByIdAndDelete(parsed.data.index);
            if (!activity) {
                fail(res, 404, 'Activité introuvable');
                return;
            }

            res.status(200).json({data: activity});
            return;
        }

        methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
    } catch (error) {
        serverError(res, `${req.method} /api/activity`, error);
    }
}
