import type {NextRequest} from 'next/server';
import dbConnect from '@/server/infrastructure/db/connection';
import Planning from '@/models/Planning';
import Task from '@/models/Task';
import {scheduleStatusSchema} from '@/server/http/schemas/schedule';
import {fail, invalidInput, readJsonBody, serverError} from '@/server/http/apiResponse';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const parsed = scheduleStatusSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
            return invalidInput(parsed.error);
        }

        const {status, id, planningId} = parsed.data;

        // Mise à jour atomique du sous-document : il n'existe plus de collection
        // `schedules`, la copie embarquée dans Planning est la seule source.
        const planning = await Planning.findOneAndUpdate(
            {_id: planningId, 'schedule._id': id},
            {$set: {'schedule.$.status': status}},
            {returnDocument: 'after'},
        );

        if (!planning) {
            return fail(404, 'Créneau introuvable');
        }

        // `.id()` est l'accesseur de sous-document des DocumentArray Mongoose.
        const schedule = planning.schedule.id(id);

        // Une tâche ponctuelle suit son créneau : cochée, elle ne revient plus à
        // la génération suivante ; décochée, elle y revient.
        if (schedule?.taskId) {
            await Task.findByIdAndUpdate(schedule.taskId, {done: status === 'done'});
        }

        return Response.json({status, schedule});
    } catch (error) {
        return serverError('POST /api/schedule/status', error);
    }
}
