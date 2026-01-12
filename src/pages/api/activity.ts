import {NextApiRequest, NextApiResponse} from 'next';
import Activity from "@/models/Activity";
import dbConnect from "@/middleware/database";

// Define the handler function
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await dbConnect();
    if (req.method === 'GET') {

        const activities = await Activity.find({});
        res.status(200).json({data: activities});
        return;
    }

    if (req.method === 'POST') {
        const activity = new Activity(req.body);
        await activity.save();
        res.status(200).json({data: activity});
        return;
    }

    if (req.method === 'DELETE') {
        const activity = await Activity.findByIdAndDelete(req.body.index);
        res.status(200).json({data: activity});
        return;
    }

    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
