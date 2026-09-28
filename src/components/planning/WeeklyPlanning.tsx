"use client";

import {useEffect, useState} from "react";
import {PlanningInterface} from "@/models/Planning";
import Spinner from "@/components/uiComponents/Spinner";
import DayTimeline from "@/components/planning/DayTimeline";
import {ScheduleInterface} from "@/models/Schedule";
import {apiService} from "@/services/ApiService";
import {BaseButton} from "@/components/uiComponents/BaseButton";
import {toast} from "react-toastify";
import {sortWeekdays} from "@/server/domain/planning/days";

export default function WeeklyPlanning() {


    const [loading, setLoading] = useState(false);
    // get activities from API
    const [planning, setPlanning] = useState<PlanningInterface>({} as PlanningInterface);
    // Fetch activities on component mount
    useEffect(() => {
        getPlanning();
    }, []);

    // function to get activities from API
    async function getPlanning() {
        const response = await apiService.get<PlanningInterface>('/api/generate_weekly_planning');
        setPlanning(response);
    }


    function getPlanningElementsByDay(day: string) {
        return planning.schedule?.filter((schedule: ScheduleInterface) => {
            return schedule.day === day
        });
    }

    function getSortedDays() {
        return sortWeekdays(planning.days ?? []);
    }

    return (
        <div className="w-full overflow-hidden bg-white dark:bg-gray-800 sm:rounded-lg p-10">
            <h2>
                <span className="flex-1">Weekly Planning - <span
                    className="text-lg text-gray-500">{planning.name}</span>
                </span>
                <BaseButton
                    onClick={() => generatePlanning()}
                >
                    {loading ? <Spinner/> :
                        <svg className="inline w-4 h-4 me-3 -mt-0.5 text-white" aria-hidden="true"
                             xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                             viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M21 13v-2a1 1 0 0 0-1-1h-.757l-.707-1.707.535-.536a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 0l-.536.535L14 4.757V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v.757l-1.707.707-.536-.535a1 1 0 0 0-1.414 0L4.929 6.343a1 1 0 0 0 0 1.414l.536.536L4.757 10H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.757l.707 1.707-.535.536a1 1 0 0 0 0 1.414l1.414 1.414a1 1 0 0 0 1.414 0l.536-.535 1.707.707V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-.757l1.707-.708.536.536a1 1 0 0 0 1.414 0l1.414-1.414a1 1 0 0 0 0-1.414l-.535-.536.707-1.707H20a1 1 0 0 0 1-1Z"/>
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                        </svg>
                    }
                    <span>Générer</span>
                </BaseButton>
            </h2>
            {planning.violations && planning.violations.length > 0 &&
                <div
                    role="alert"
                    className="my-4 rounded-lg border border-danger-300 bg-danger-50 p-4 text-sm text-danger-800 dark:border-danger-700 dark:bg-danger-900 dark:text-danger-100"
                >
                    <p className="font-medium">Ce planning ne respecte pas toutes les règles :</p>
                    <ul className="mt-2 list-disc ps-5">
                        {planning.violations.map((violation, index) => <li key={index}>{violation}</li>)}
                    </ul>
                    <BaseButton className="mt-3" onClick={() => generatePlanning()}>
                        {loading ? <Spinner/> : 'Relancer'}
                    </BaseButton>
                </div>
            }
            {planning.sacrifices && planning.sacrifices.length > 0 &&
                <details className="my-4 text-sm text-gray-600 dark:text-gray-300">
                    <summary className="cursor-pointer">
                        Sacrifié cette semaine ({planning.sacrifices.length})
                    </summary>
                    <ul className="mt-2 list-disc ps-5">
                        {planning.sacrifices.map((sacrifice, index) =>
                            <li key={index}>
                                {sacrifice.activity}{sacrifice.day ? `, ${sacrifice.day}` : ''} : {sacrifice.type}
                                {sacrifice.detail ? ` — ${sacrifice.detail}` : ''}
                            </li>
                        )}
                    </ul>
                </details>
            }
            <div className="flex flex-col justify-end w-full">

                <div className="flex gap-4 w-full">
                    {getSortedDays().map((day: string, index: number) =>
                        <div key={index} className="w-1/2">
                            <h3 className="capitalize text-lg font-bold border-b border-gray-200 dark:border-gray-700 mb-0">
                                <svg className="inline w-5 h-5 me-2 text-gray-800 dark:text-white" aria-hidden="true"
                                     xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                                     viewBox="0 0 24 24">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-3 5h3m-6 0h.01M12 16h3m-6 0h.01M10 3v4h4V3h-4Z"/>
                                </svg>
                                {day}
                            </h3>

                            <DayTimeline
                                key={index}
                                scheduleList={getPlanningElementsByDay(day)}
                                planning={planning}
                                onScheduleListUpdatedAction={getPlanning}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    async function generatePlanning() {
        if (loading) return;
        setLoading(true);
        try {
            const result = await apiService.post<Record<string, never>, {violations: string[]}>(
                '/api/generate_weekly_planning', {},
            );
            if (result.violations && result.violations.length > 0) {
                toast.warning('Planning généré, mais certaines règles ne sont pas respectées.');
            } else {
                toast.success('Le planning a été généré avec succès');
            }
            await getPlanning();
        } catch {
            toast.error('La génération a échoué. Réessayez dans quelques minutes.');
        } finally {
            setLoading(false);
        }
    }
}