import {NextApiRequest, NextApiResponse} from "next";
import dbConnect from "@/server/infrastructure/db/connection";
import Planning from "@/models/Planning";

export interface UpdateScheduleBody {
    status: string;
    id: string;
    planningId: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await dbConnect();

    const {slug} = req.query;

    // Change schedule status on route /api/schedule/status
    if (req.method === 'POST' && slug?.[0] === 'status') {
        const body: UpdateScheduleBody = req.body;
        const {status, id, planningId} = body;

        // Mise à jour atomique du sous-document : il n'existe plus de collection
        // `schedules`, la copie embarquée dans Planning est la seule source.
        const planning = await Planning.findOneAndUpdate(
            {_id: planningId, "schedule._id": id},
            {$set: {"schedule.$.status": status}},
            {returnDocument: 'after'},
        );

        if (!planning) {
            res.status(404).json({message: 'Schedule not found'});
            return;
        }

        // `.id()` est l'accesseur de sous-document des DocumentArray Mongoose.
        const schedule = planning.schedule.id(id);

        res.status(200).json({status, schedule});
        return;
    }

    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} ${slug} Not Allowed`);
}