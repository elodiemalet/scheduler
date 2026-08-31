"use client";

import {ScheduleInterface} from "@/models/Schedule";
import {PlanningInterface} from "@/models/Planning";
import {apiService} from "@/services/ApiService";

export default function DayTimeline({scheduleList, planning, onScheduleListUpdatedAction}: {
    planning: PlanningInterface,
    scheduleList: ScheduleInterface[],
    onScheduleListUpdatedAction: () => void
}) {


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
        return schedule.status === "done" ? "bg-green-500" : "bg-indigo-500";
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
