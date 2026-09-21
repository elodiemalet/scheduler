"use client";

import {ActivityInterface} from "@/models/Activity";
import {useEffect, useState} from "react";
import {apiService} from "@/services/ApiService";
import {BaseButton} from "@/components/uiComponents/BaseButton";
import {toast} from "react-toastify";
import Link from "next/link";

export default function ActivityList() {


    // get activities from API
    const [activities, setActivities] = useState<ActivityInterface[]>([]);
    // function to get activities from API
    async function getActivities() {
        const response = await apiService.get<{ data: ActivityInterface[] }>('/api/activity');
        setActivities(response.data);
    }

    // Fetch activities on component mount
    useEffect(() => {
        getActivities();
    }, []);

    // function to delete an activity
    async function deleteActivity(index: string | null | undefined) {
        if (typeof index !== 'string') return;
        if (!confirm('Are you sure you want to delete this activity?')) return;

        await apiService.delete<{ index: string }, void>(`/api/activity`, {index})
            .then(() => {
                toast.success('L\'activité a été supprimée avec succès');
                getActivities();
            });
    }

    return <div className="w-full shrink-0 overflow-x-auto bg-white shadow-md dark:bg-gray-800 sm:rounded-lg">
        <div className="flex flex-col justify-end w-full">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase whitespace-nowrap bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" className="p-4 font-medium text-left">
                        Nom
                    </th>
                    <th scope="col" className="p-4 font-medium text-left">
                        Description
                    </th>
                    <th scope="col" className="p-4 font-medium text-left">
                        Jours
                    </th>
                    <th scope="col" className="p-4 font-medium text-left">
                        Priorité
                    </th>
                    <th scope="col" className="p-4 font-medium text-left">
                        Dates
                    </th>
                    <th scope="col" className="p-4 font-medium text-left">
                        Heures
                    </th>
                    <th scope="col" className="p-4 font-medium text-left">
                        Terminée
                    </th>
                    <th scope="col" className="p-4 font-medium text-left">
                        Active
                    </th>
                    <th scope="col" className="p-4 font-medium text-left">
                        Temps à passer (min)
                    </th>
                    <th scope="col" className="p-4 font-medium text-left">
                        Déjà passé (min)
                    </th>
                    <th></th>
                </tr>
                </thead>
                <tbody className="text-sm text-left font-medium text-gray-900 dark:text-gray-400">
                {activities.map((activity, index) =>
                    <tr key={index}>
                        <td className="p-4 font-bold text-left">
                            {activity.name}
                        </td>
                        <td className="p-4 font-medium text-left">
                            {activity.description}
                        </td>
                        <td className="p-4 font-medium text-left">
                            {activity.days?.join(', ')}
                        </td>
                        <td className="p-4 font-medium text-left">
                            {activity.priority}
                        </td>
                        <td className="p-4 font-medium text-left">
                            {activity.startDate && `s: ${activity.startDate?.toLocaleDateString()}`}
                            {activity.startDate && activity.endDate && '/'}
                            {activity.endDate && `e: ${activity.endDate?.toLocaleDateString()}`}
                        </td>
                        <td className="p-4 font-medium text-left">
                            {activity.startTime && `s: ${activity.startTime}`}
                            {activity.startTime && activity.endTime && '/'}
                            {activity.endTime && `e: ${activity.endTime}`}
                        </td>
                        <td className="p-4 font-medium text-left">
                            {activity.isCompleted ? 'Oui' : 'Non'}
                        </td>
                        <td className="p-4 font-medium text-left">
                            {activity.isActive ? 'Oui' : 'Non'}
                        </td>
                        <td className="p-4 font-medium text-left">
                            {activity.timeToSpend}
                        </td>
                        <td className="p-4 font-medium text-left">
                            {activity.timeAlreadySpent}
                        </td>
                        <td className="flex gap-2 p-4 font-medium text-left">
                            <Link href={`/activity/edit/${activity._id}`}>
                                <BaseButton
                                    theme="secondary"
                                    size="small"
                                >
                                    <svg className="w-4 h-4 text-white" aria-hidden="true"
                                         xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                                         viewBox="0 0 24 24">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z"/>
                                    </svg>

                                </BaseButton>
                            </Link>
                            <BaseButton
                                theme="danger"
                                size="small"
                                onClick={() => deleteActivity(activity?._id)}
                            >
                                <svg className="w-4 h-4 text-white" aria-hidden="true"
                                     xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                                     viewBox="0 0 24 24">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
                                </svg>

                            </BaseButton>

                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    </div>;
}