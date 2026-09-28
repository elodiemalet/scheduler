import type {NextRequest} from 'next/server';
import dbConnect from '@/server/infrastructure/db/connection';
import Task from '@/models/Task';
import {taskUpdateSchema} from '@/server/http/schemas/task';
import {objectId} from '@/server/http/schemas/common';
import {fail, invalidInput, readJsonBody, serverError} from '@/server/http/apiResponse';

/** `params` est une promesse depuis Next 15 : oublier l'`await` donne un 400 déroutant. */
type Context = {params: Promise<{id: string}>};

export async function GET(_request: NextRequest, {params}: Context) {
    try {
        await dbConnect();

        const id = objectId.safeParse((await params).id);
        if (!id.success) {
            return invalidInput(id.error);
        }

        const task = await Task.findById(id.data);
        if (!task) {
            return fail(404, 'Tâche introuvable');
        }

        return Response.json(task);
    } catch (error) {
        return serverError('GET /api/task/[id]', error);
    }
}

export async function POST(request: NextRequest, {params}: Context) {
    try {
        await dbConnect();

        const id = objectId.safeParse((await params).id);
        if (!id.success) {
            return invalidInput(id.error);
        }

        const parsed = taskUpdateSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
            return invalidInput(parsed.error);
        }

        const task = await Task.findByIdAndUpdate(id.data, parsed.data, {
            returnDocument: 'after',
            runValidators: true,
        });
        if (!task) {
            return fail(404, 'Tâche introuvable');
        }

        return Response.json(task);
    } catch (error) {
        return serverError('POST /api/task/[id]', error);
    }
}

export async function DELETE(_request: NextRequest, {params}: Context) {
    try {
        await dbConnect();

        const id = objectId.safeParse((await params).id);
        if (!id.success) {
            return invalidInput(id.error);
        }

        const task = await Task.findByIdAndDelete(id.data);
        if (!task) {
            return fail(404, 'Tâche introuvable');
        }

        return Response.json(task);
    } catch (error) {
        return serverError('DELETE /api/task/[id]', error);
    }
}
