import type {NextRequest} from 'next/server';
import dbConnect from '@/server/infrastructure/db/connection';
import Activity from '@/models/Activity';
import {activityUpdateSchema} from '@/server/http/schemas/activity';
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

        const activity = await Activity.findById(id.data);
        if (!activity) {
            return fail(404, 'Activité introuvable');
        }

        return Response.json(activity);
    } catch (error) {
        return serverError('GET /api/activity/[id]', error);
    }
}

export async function POST(request: NextRequest, {params}: Context) {
    try {
        await dbConnect();

        const id = objectId.safeParse((await params).id);
        if (!id.success) {
            return invalidInput(id.error);
        }

        const parsed = activityUpdateSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
            return invalidInput(parsed.error);
        }

        // `runValidators` : sans lui, une mise à jour contourne l'enum
        // `days` du schéma — Mongoose ne valide pas les updates par défaut.
        const activity = await Activity.findByIdAndUpdate(id.data, parsed.data, {
            returnDocument: 'after',
            runValidators: true,
        });

        if (!activity) {
            return fail(404, 'Activité introuvable');
        }

        return Response.json(activity);
    } catch (error) {
        return serverError('POST /api/activity/[id]', error);
    }
}
