import {ActivityInterface, ActivitySchema} from "@/models/Activity";
import mongoose from 'mongoose';
import {ScheduleInterface, ScheduleSchema} from "@/models/Schedule";

export interface PlanningInterface {
    _id: string;
    name: string;
    days: string[];
    activities: ActivityInterface[];
    schedule: ScheduleInterface[];
    timestamp: Date;
}

const PlanningSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    days: [String],
    activities: [ActivitySchema],
    schedule: [ScheduleSchema],
    timestamp: {type: Date, default: Date.now},
});

export default mongoose.models.Planning || mongoose.model('Planning', PlanningSchema);