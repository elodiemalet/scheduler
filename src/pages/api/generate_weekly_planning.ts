import {NextApiRequest, NextApiResponse} from "next";
import Activity from "@/models/Activity";
import dbConnect from "@/server/infrastructure/db/connection";
import Planning from "@/models/Planning";
import {generateWeeklyPlanning} from "@/services/OpenAiService";
import Schedule from "@/models/Schedule";
import {ActivityInput, activityToPlannable} from "@/server/domain/planning/mergeTasks";
import {buildDayWindows} from "@/server/domain/planning/buildDayWindows";
import {
    InvalidModelResponseError,
    parseSchedule,
} from "@/server/domain/planning/parseSchedule";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await dbConnect();

    if (req.method === 'GET') {
        const planning = await Planning.findOne().sort({timestamp: -1});
        if (planning) {
            res.status(200).json(planning);
            return;
        }
        res.status(404).json({error: 'Planning introuvable'});
        return;
    }

    if (req.method === 'POST') {
        const activities = await Activity.find({}).lean<ActivityInput[]>();
        const plannable = activities.map(activityToPlannable);
        const dayWindows = buildDayWindows(plannable);

        const raw = await generateWeeklyPlanning(JSON.stringify({
            jours: dayWindows,
            activites: plannable,
        }));

        if (!raw) {
            res.status(502).json({error: 'Le modèle n\'a renvoyé aucune réponse'});
            return;
        }

        let slots;
        try {
            slots = parseSchedule(raw);
        } catch (error) {
            if (error instanceof InvalidModelResponseError) {
                console.error('Réponse du modèle rejetée:', error.message);
                res.status(502).json({error: 'Le modèle a renvoyé un planning invalide'});
                return;
            }
            throw error;
        }

        const schedules = await Promise.all(
            slots.map((slot) => new Schedule(slot).save()),
        );

        const weekStartDate = new Date();
        weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const dates = `${weekStartDate.toLocaleDateString('fr')} - ${weekEndDate.toLocaleDateString('fr')}`;

        await new Planning({
            name: `Planning du ${dates}`,
            days: dayWindows.map((window) => window.jour),
            activities: activities,
            schedule: schedules,
        }).save();

        res.status(200).json({schedule: slots});
        return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
