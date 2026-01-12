import {ActivityInterface} from "@/models/Activity";

export default class WeeklyCalendarManager {

    private static instance: WeeklyCalendarManager;
    private activityList: ActivityInterface[] = [];

    public static getInstance(): WeeklyCalendarManager {
        if (!WeeklyCalendarManager.instance) {
            WeeklyCalendarManager.instance = new WeeklyCalendarManager();
        }
        return WeeklyCalendarManager.instance;
    }

    public addActivity(activity: ActivityInterface): void {
        this.activityList.push(activity);
    }

    public getActivities(): ActivityInterface[] {
        return this.activityList;
    }

}