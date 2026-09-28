import mongoose from 'mongoose';
import {EXTERNAL_TASK_DEFAULT_MINUTES} from '@/server/domain/planning/mergeTasks';
import {DEFAULT_TASK_PRIORITY} from '@/server/domain/planning/tasks';

export interface TaskInterface {
    _id: string;
    title: string;
    description: string;
    /** Durée de la tâche, en minutes. */
    minutes: number;
    priority: number;
    /** Sérialisée en chaîne ISO par Response.json ; null = sans échéance. */
    dueDate: string | null;
    /** Renseignés tous les deux pour un créneau fixe, vides sinon. */
    startTime: string;
    endTime: string;
    done: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export const TaskSchema = new mongoose.Schema({
    title: {type: String, required: true},
    description: {type: String, default: ''},
    minutes: {type: Number, default: EXTERNAL_TASK_DEFAULT_MINUTES},
    priority: {type: Number, default: DEFAULT_TASK_PRIORITY},
    dueDate: {type: Date, default: null},
    startTime: {type: String, default: ''},
    endTime: {type: String, default: ''},
    done: {type: Boolean, default: false},
}, {timestamps: true});

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
