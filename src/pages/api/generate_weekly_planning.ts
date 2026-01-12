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

        console.log('Activities:', activities.map(activity => `${activity.name} - ${activity.days}`));

        // Get all unique days from activities
        const uniqueDays = Array.from(new Set(activities.flatMap(activity => activity.days || [])));

        // Calculate hours per day
        const joursAvecHoraires = uniqueDays.map(day => {
            // Get activities for this specific day
            const activitiesForDay = activities.filter(activity =>
                activity.days && activity.days.includes(day)
            );

            // Find earliest start time for this day
            const startTimes = activitiesForDay
                .filter(activity => activity.startTime)
                .map(activity => activity.startTime)
                .sort();
            const heure_debut = startTimes[0] || '09:00';

            // Find latest end time for this day
            const endTimes = activitiesForDay
                .filter(activity => activity.endTime)
                .map(activity => activity.endTime)
                .sort()
                .reverse();
            let heure_fin = endTimes[0] || '18:00';

            // Calculate time needed for this day
            const timeNeededForDay = activitiesForDay
                .filter(activity => activity.priority === 1)
                .reduce((total, activity) => total + (activity.timeToSpend || 1), 0);

            // Calculate available hours for this day
            const [debutHours, debutMinutes] = heure_debut.split(':').map(Number);
            const [finHours, finMinutes] = heure_fin.split(':').map(Number);
            const availableHours = (finHours + finMinutes / 60) - (debutHours + debutMinutes / 60);

            // If not enough time for this day, extend heure_fin
            if (timeNeededForDay > availableHours) {
                const additionalHoursNeeded = Math.ceil(timeNeededForDay - availableHours);
                const newFinHours = Math.min(finHours + additionalHoursNeeded, 23);
                heure_fin = `${String(newFinHours).padStart(2, '0')}:${String(finMinutes).padStart(2, '0')}`;
            }

            return {
                jour: day,
                heure_debut: heure_debut,
                heure_fin: heure_fin
            };
        });


        const body = {
            "jours": joursAvecHoraires,
            "activites": activities
        };

        console.log('Body:', body);

        const result = await generateWeeklyPlanning(JSON.stringify(body));
        if (result) {

            const planning = JSON.parse(result);

            console.log('Planning generated:', planning);

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
                days: uniqueDays,
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
