import type {NextRequest} from 'next/server';
import dbConnect from '@/server/infrastructure/db/connection';
import Settings, {SettingsInterface} from '@/models/Settings';
import {lunchBreakOf} from '@/server/domain/planning/lunchBreak';
import {settingsInputSchema} from '@/server/http/schemas/settings';
import {invalidInput, readJsonBody, serverError} from '@/server/http/apiResponse';

export async function GET() {
    try {
        await dbConnect();

        const settings = await Settings.findOne().lean<SettingsInterface>();
        return Response.json({lunchBreak: lunchBreakOf(settings ?? {})});
    } catch (error) {
        return serverError('GET /api/settings', error);
    }
}

export async function PUT(request: NextRequest) {
    try {
        await dbConnect();

        const parsed = settingsInputSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
            return invalidInput(parsed.error);
        }

        // Document unique : on met à jour celui qui existe, ou on le crée.
        const settings = await Settings.findOneAndUpdate(
            {},
            {lunchBreak: parsed.data.lunchBreak},
            {upsert: true, returnDocument: 'after'},
        ).lean<SettingsInterface>();
        return Response.json({lunchBreak: lunchBreakOf(settings ?? {})});
    } catch (error) {
        return serverError('PUT /api/settings', error);
    }
}
