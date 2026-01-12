export interface ActivityInterface {
    name: string;
    description: string;
    priority: number;
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
    isCompleted: boolean;
    isActive: boolean;
    timeToSpend: number;
    timeAlreadySpent: number;
    days: Array<string>;
    _id: string | null | undefined;
}

import mongoose from 'mongoose';

export const ActivitySchema = new mongoose.Schema({
    index: String,
    name: {
        type: String,
        required: true,
    },
    description: String,
    priority: Number,
    startDate: Date,
    endDate: Date,
    startTime: String,
    endTime: String,
    isCompleted: Boolean,
    isActive: Boolean,
    timeToSpend: Number,
    timeAlreadySpent: Number,
    days: Array<string>,
});

export default mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);