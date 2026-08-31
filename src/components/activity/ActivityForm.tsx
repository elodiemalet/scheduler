'use client';

import {useEffect, useState} from "react";
import {ActivityInterface} from "@/models/Activity";
import {apiService} from "@/services/ApiService";
import {BaseButton} from "@/components/uiComponents/BaseButton";
import {useRouter} from "next/navigation";
import BaseHorizontalListGroup from "@/components/uiComponents/BaseHorizontalListGroup";

export default function ActivityForm({activityId}: { activityId?: string }) {

    const router = useRouter()
    const EMPTY_FORM = {
        name: '',
        description: '',
        priority: 1,
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        timeToSpend: 10,
        days: ['jeudi', 'vendredi'] as string[],
    };

    const [form, setForm] = useState(EMPTY_FORM);

    function updateField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
        setForm((previous) => ({...previous, [key]: value}));
    }

    const daysOptions = [
        {label: 'Lundi', value: 'lundi'},
        {label: 'Mardi', value: 'mardi'},
        {label: 'Mercredi', value: 'mercredi'},
        {label: 'Jeudi', value: 'jeudi'},
        {label: 'Vendredi', value: 'vendredi'},
        {label: 'Samedi', value: 'samedi'},
        {label: 'Dimanche', value: 'dimanche'},
    ];

    const getActivityFromApi = async () => {
        const activity = await apiService.get<ActivityInterface>(`/api/activity/${activityId}`);
        setForm({
            name: activity.name ?? '',
            description: activity.description ?? '',
            priority: activity.priority ?? 1,
            startDate: activity.startDate ? new Date(activity.startDate).toISOString().split('T')[0] : '',
            endDate: activity.endDate ? new Date(activity.endDate).toISOString().split('T')[0] : '',
            startTime: activity.startTime ?? '',
            endTime: activity.endTime ?? '',
            timeToSpend: activity.timeToSpend ?? 10,
            days: activity.days ?? [],
        });
    };

    useEffect(() => {
        if (activityId) {
            getActivityFromApi();
        }
    }, [activityId]);

    const handleSubmit = async () => {
        const url = activityId ? `/api/activity/${activityId}` : '/api/activity';

        await apiService.post(url, {
            _id: activityId,
            name: form.name,
            description: form.description,
            priority: form.priority,
            isCompleted: false,
            isActive: true,
            startDate: form.startDate ? new Date(form.startDate) : undefined,
            endDate: form.endDate ? new Date(form.endDate) : undefined,
            startTime: form.startTime,
            endTime: form.endTime,
            timeToSpend: form.timeToSpend,
            timeAlreadySpent: 0,
            days: form.days,
        });

        reset();
        router.push('/activity');
    };

    const reset = () => setForm(EMPTY_FORM);

    function selectDays(checked: boolean, day: string) {
        updateField('days', checked ? [...form.days, day] : form.days.filter((d) => d !== day));
    }

    return <div className="w-full">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            <div className="sm:col-span-2">
                <label
                    htmlFor="name"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    Name
                </label>
                <input
                    type="text"
                    id="name"
                    className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                />
            </div>
            <div className="sm:col-span-2">
                <BaseHorizontalListGroup
                    selectedOptions={form.days}
                    onInputChange={selectDays}
                    options={daysOptions}/>
            </div>
            <div className="sm:col-span-2">
                <label
                    htmlFor="description"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    Description
                </label>
                <textarea
                    id="description"
                    rows={4}
                    className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    placeholder="Enter description"
                    required
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                />
            </div>
            <div>
                <label
                    htmlFor="startDate"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    Start Date
                </label>
                <input
                    type="date"
                    id="startDate"
                    className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required
                    value={form.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                />
            </div>
            <div>
                <label
                    htmlFor="endDate"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    End Date
                </label>
                <input
                    type="date"
                    id="endDate"
                    className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required
                    value={form.endDate}
                    onChange={(e) => updateField('endDate', e.target.value)}
                />
            </div>
            <div>
                <label
                    htmlFor="startTime"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    Start Time
                </label>
                <input
                    type="time"
                    id="startTime"
                    className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required
                    value={form.startTime}
                    onChange={(e) => updateField('startTime', e.target.value)}
                />
            </div>
            <div>
                <label
                    htmlFor="endTime"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    End Time
                </label>
                <input
                    type="time"
                    id="endTime"
                    className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required
                    value={form.endTime}
                    onChange={(e) => updateField('endTime', e.target.value)}
                />
            </div>
            <div>
                <label
                    htmlFor="priority"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    Priority
                </label>
                <input
                    type="number"
                    id="priority"
                    className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required
                    value={form.priority}
                    onChange={(e) => updateField('priority', Number(e.target.value))}
                />
            </div>
            <div>
                <label
                    htmlFor="timeToSpend"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    Time To Spend
                </label>
                <input
                    type="number"
                    id="timeToSpend"
                    className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required
                    value={form.timeToSpend}
                    onChange={(e) => updateField('timeToSpend', Number(e.target.value))}
                />
            </div>
        </div>
        <BaseButton
            className=" float-right mt-4 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
            onClick={handleSubmit}
        >
            Submit
        </BaseButton>
    </div>
}