import type {NextRequest} from 'next/server';
import {Types} from 'mongoose';
import dbConnect from '@/server/infrastructure/db/connection';
import Planning from '@/models/Planning';
import {scheduleLockSchema} from '@/server/http/schemas/schedule';
import {fail, invalidInput, readJsonBody, serverError} from '@/server/http/apiResponse';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const parsed = scheduleLockSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
            return invalidInput(parsed.error);
        }

        const {planningId, ids, locked} = parsed.data;
        // Les arrayFilters ne sont pas toujours convertis par Mongoose : on passe des ObjectId.
        const objectIds = ids.map((id) => new Types.ObjectId(id));

        // `$all` : si une seule des parties manque, rien n'est écrit et on répond 404.
        const result = await Planning.updateOne(
            {_id: planningId, 'schedule._id': {$all: objectIds}},
            {$set: {'schedule.$[slot].locked': locked}},
            {arrayFilters: [{'slot._id': {$in: objectIds}}]},
        );

        if (result.matchedCount === 0) {
            return fail(404, 'Créneau introuvable');
        }

        return Response.json({locked, ids});
    } catch (error) {
        return serverError('POST /api/schedule/lock', error);
    }
}
