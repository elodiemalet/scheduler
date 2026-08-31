import {NextApiRequest, NextApiResponse} from "next";
import dbConnect from "@/server/infrastructure/db/connection";
import Schedule from "@/models/Schedule";
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

        const schedule = await Schedule.findOne({_id: id});
        if (!schedule) {
            res.status(404).json({message: 'Schedule not found'});
            return;
        }

        // Update schedule status
        schedule.status = status;

        await Planning.findOneAndUpdate(
            {_id: planningId, "schedule._id": id},
            {$set: {"schedule.$": schedule}},
            {returnDocument: 'after'}
        );

        res.status(200).json({status, schedule});
        return;
    }

    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} ${slug} Not Allowed`);
}