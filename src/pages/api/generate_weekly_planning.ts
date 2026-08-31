import {NextApiRequest, NextApiResponse} from "next";
import Activity from "@/models/Activity";
import dbConnect from "@/server/infrastructure/db/connection";
import Planning from "@/models/Planning";
import {generateWeeklyPlanning} from "@/services/LlmService";
import {ActivityInput, activityToPlannable} from "@/server/domain/planning/mergeTasks";
import {buildDayWindows} from "@/server/domain/planning/buildDayWindows";
import {
    InvalidModelResponseError,
    parseSchedule,
    ScheduleSlot,
} from "@/server/domain/planning/parseSchedule";

/** Nombre d'appels au modèle avant d'abandonner sur une réponse inexploitable. */
const GENERATION_ATTEMPTS = 2;

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

        const payload = JSON.stringify({
            jours: dayWindows,
            activites: plannable,
        });

        let slots: ScheduleSlot[] | null = null;
        let lastRejection = '';

        // Un modèle ouvert échoue plus souvent à respecter le contrat de sortie
        // qu'un modèle propriétaire ; une seconde tentative suffit en pratique.
        for (let attempt = 1; attempt <= GENERATION_ATTEMPTS && slots === null; attempt++) {
            const raw = await generateWeeklyPlanning(payload);

            if (!raw) {
                lastRejection = 'réponse vide';
                console.error(`Génération, tentative ${attempt}/${GENERATION_ATTEMPTS} : ${lastRejection}`);
                continue;
            }

            try {
                slots = parseSchedule(raw);
            } catch (error) {
                if (!(error instanceof InvalidModelResponseError)) {
                    throw error;
                }
                lastRejection = error.message;
                console.error(`Génération, tentative ${attempt}/${GENERATION_ATTEMPTS} : ${lastRejection}`);
            }
        }

        if (slots === null) {
            console.error(
                `Génération abandonnée après ${GENERATION_ATTEMPTS} tentatives. Dernier rejet : ${lastRejection}`,
            );
            res.status(502).json({error: 'Le modèle a renvoyé un planning invalide'});
            return;
        }

        const weekStartDate = new Date();
        weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const dates = `${weekStartDate.toLocaleDateString('fr')} - ${weekEndDate.toLocaleDateString('fr')}`;

        await new Planning({
            name: `Planning du ${dates}`,
            days: dayWindows.map((window) => window.jour),
            activities: plannable,
            schedule: slots,
        }).save();

        res.status(200).json({schedule: slots});
        return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
