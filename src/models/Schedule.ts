import mongoose from "mongoose";

const SCHEDULE_STATUS = {
    pending: "pending",
    done: "done",
}

export interface ScheduleInterface {
    _id: string;
    day: string;
    startTime: string;
    endTime: string;
    activity: string;
    description: string;
    priority: number;
    status: string;
}

export const ScheduleSchema = new mongoose.Schema({
    day: {type: String, required: true},
    startTime: {type: String, required: true},
    endTime: {type: String, required: true},
    activity: {type: String, required: true},
    description: {type: String, default: ""},
    priority: {type: Number, default: 1},
    status: {type: String, default: SCHEDULE_STATUS.pending},
});
