import mongoose from 'mongoose';
import {LunchBreak} from '@/server/domain/planning/lunchBreak';
import {LunchBreakSchema} from '@/models/LunchBreakSchema';

/** Réglages de l'application : un seul document, créé au premier enregistrement. */
export interface SettingsInterface {
    /** Absent : pause par défaut. `null` : pas de pause. */
    lunchBreak?: LunchBreak | null;
}

const SettingsSchema = new mongoose.Schema({
    // Pas de default : voir LunchBreakSchema.
    lunchBreak: {type: LunchBreakSchema},
});

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
