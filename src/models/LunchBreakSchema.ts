import mongoose from 'mongoose';

/**
 * Sous-document `{start, end}` d'une pause de midi. Sans `default` là où il est
 * utilisé : un champ absent (défaut) doit rester distinct de `null` (pas de pause).
 */
export const LunchBreakSchema = new mongoose.Schema({
    start: {type: String, required: true},
    end: {type: String, required: true},
}, {_id: false});
