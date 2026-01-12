"use client";

import {ScheduleInterface} from "@/models/Schedule";
import {PlanningInterface} from "@/models/Planning";
import {ApiService} from "@/services/ApiService";

export default function DayTimeline({scheduleList, planning, onScheduleListUpdatedAction}: {
    planning: PlanningInterface,
    scheduleList: ScheduleInterface[],
    onScheduleListUpdatedAction: () => void
}) {

    const apiService = new ApiService();

    function changeStatus(schedule: ScheduleInterface) {
        const newStatus = schedule.status === "pending" ? "done" : "pending";

        apiService.post(`/api/schedule/status`, {
            status: newStatus,
            id: schedule._id,
            planningId: planning._id,
        }).then(() => {
            onScheduleListUpdatedAction();
        })
    }

    function getBgColor(schedule: ScheduleInterface) {
        const {status, startTime} = schedule;

        switch (status) {
            case "done":
                return "bg-green-500";
            case "pending":
                return "bg-indigo-500";
        }

        const date = new Date(startTime);
        const today = new Date();

        if (date.getTime() === today.getTime()) {
            return "bg-indigo-500";
        } else if (date.getTime() > today.getTime()) {
            return "bg-green-500";
        }

        return "bg-red-500";
    }

    return (
        <ol className="relative border-s border-gray-200 dark:border-gray-700 pt-2">
            {scheduleList.map((schedule: ScheduleInterface, index: number) =>
                <li
                    key={index}
                    className="mb-4 ms-4">
                    <div
                        onDoubleClick={() => changeStatus(schedule)}
                        className={`cursor-pointer absolute w-4 h-4 ${getBgColor(schedule)} rounded-full mt-1 -start-2`}
                    >
                        <span
                            className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-white text-xs font-bold">

                        </span>
                    </div>
                    <time className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                        {schedule.startTime} - {schedule.endTime}
                    </time>
                    <h4 className="text font-semibold text-gray-900 dark:text-white">
                        {schedule.activity}
                    </h4>
                    <p className="mb-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                        {schedule.description}
                    </p>
                </li>
            )}
        </ol>
    )

}
