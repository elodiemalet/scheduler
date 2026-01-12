import {NextApiRequest, NextApiResponse} from "next";
import Activity, {ActivityInterface} from "@/models/Activity";
import dbConnect from "@/middleware/database";
import Planning from "@/models/Planning";
import {generateWeeklyPlanning} from "@/services/OpenAiService";
import Schedule from "@/models/Schedule";

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
        const activities: ActivityInterface[] = await Activity.find({})

        const days = Array.from(new Set(activities.flatMap(activity => activity.days || [])));
        const heure_debut = activities
            .filter(activity => activity.startTime)
            .map(activity => activity.startTime)
            .sort()[0] || '09:00';
        const heure_fin = activities
            .filter(activity => activity.endTime)
            .map(activity => activity.endTime)
            .sort()
            .reverse()[0] || '18:00';
        const body = {
            "heure_debut": heure_debut,
            "heure_fin": heure_fin,
            "jours_concernes": days,
            "activites": activities
        };

        const result = await generateWeeklyPlanning(JSON.stringify(body));
        if (result) {

            const planning = JSON.parse(result);

            const weeklySchedule = planning.schedule?.map(async (schedule: any) => {

                const scheduleModel = new Schedule({
                    day: schedule.day,
                    startTime: schedule.start_time,
                    endTime: schedule.end_time,
                    activity: schedule.activity,
                    description: schedule.description,
                });

                await scheduleModel.save();

                return scheduleModel;
            });
            const schedules = await Promise.all(weeklySchedule);

            // get dates for the week
            const weekStartDate = new Date();
            weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1);
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekEndDate.getDate() + 6);

            const dates = `${weekStartDate.toLocaleDateString('fr')} - ${weekEndDate.toLocaleDateString('fr')}`;

            // save planning to database
            const planningModel = new Planning({
                name: `Planning du ${dates}`,
                days: days,
                activities: activities,
                schedule: schedules,
            });
            await planningModel.save();

            res.status(200).json(JSON.parse(result));
            return;
        }

        res.status(500).json({error: 'Erreur génération du planning'});

        return;
    }

    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
