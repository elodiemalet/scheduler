import type {NextRequest} from 'next/server';
import dbConnect from '@/server/infrastructure/db/connection';
import Task from '@/models/Task';
import {taskInputSchema} from '@/server/http/schemas/task';
import {invalidInput, readJsonBody, serverError} from '@/server/http/apiResponse';

export async function GET() {
    try {
        await dbConnect();

        // L'ordre d'affichage est une affaire d'UI (taskRules.sortTasks).
        const data = await Task.find({}).lean();
        return Response.json({data});
    } catch (error) {
        return serverError('GET /api/task', error);
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const parsed = taskInputSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
            return invalidInput(parsed.error);
        }

        const task = await new Task(parsed.data).save();
        return Response.json({data: task});
    } catch (error) {
        return serverError('POST /api/task', error);
    }
}
