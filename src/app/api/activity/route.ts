import type {NextRequest} from 'next/server';
import Activity from '@/models/Activity';
import dbConnect from '@/server/infrastructure/db/connection';
import {activityInputSchema, deleteActivitySchema} from '@/server/http/schemas/activity';
import {fail, invalidInput, readJsonBody, serverError} from '@/server/http/apiResponse';

export async function GET() {
    try {
        await dbConnect();

        const activities = await Activity.find({});
        return Response.json({data: activities});
    } catch (error) {
        return serverError('GET /api/activity', error);
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const parsed = activityInputSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
            return invalidInput(parsed.error);
        }

        // Zod a retiré les clés non déclarées : `_id` et `__v` d'un corps forgé
        // n'atteignent pas le constructeur. C'est la correction du mass assignment.
        const activity = await new Activity(parsed.data).save();
        return Response.json({data: activity});
    } catch (error) {
        return serverError('POST /api/activity', error);
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await dbConnect();

        const parsed = deleteActivitySchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
            return invalidInput(parsed.error);
        }

        const activity = await Activity.findByIdAndDelete(parsed.data.index);
        if (!activity) {
            return fail(404, 'Activité introuvable');
        }

        return Response.json({data: activity});
    } catch (error) {
        return serverError('DELETE /api/activity', error);
    }
}
