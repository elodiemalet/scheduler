import {NextApiRequest, NextApiResponse} from "next";
import dbConnect from "@/server/infrastructure/db/connection";
import Activity from "@/models/Activity";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await dbConnect();

    const {id} = req.query;

    if (!id) {
        res.status(400).json({message: 'Activity id is required'});
        return;
    }

    if (req.method === 'GET') {
        const activity = await Activity.findOne({_id: id});
        if (!activity) {
            res.status(404).json({message: 'Activity not found'});
            return;
        }

        res.status(200).json(activity);
        return;
    }

    // Change schedule status on route /api/schedule/status
    if (req.method === 'POST') {
        const data = req.body;

        const activity = await Activity.findOne({_id: id});
        if (!activity) {
            res.status(404).json({message: 'Activity not found'});
            return;
        }

        // Update schedule status
        Object.assign(activity, {
            ...data
        });

        await activity.save();

        res.status(200).json(activity);
        return;
    }

    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method}Not Allowed`);
}