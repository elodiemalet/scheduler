'use client';

import {useEffect, useState} from "react";
import {ActivityInterface} from "@/models/Activity";
import {ApiService} from "@/services/ApiService";
import {BaseButton} from "@/components/uiComponents/BaseButton";
import {useRouter} from "next/navigation";
import BaseHorizontalListGroup from "@/components/uiComponents/BaseHorizontalListGroup";

export default function ActivityForm({activityId}: { activityId?: string }) {

    const apiService = new ApiService();
    const router = useRouter()
    const [activity, setActivity] = useState<ActivityInterface>({} as ActivityInterface);

    useEffect(() => {
        if (activityId) {
            getActivityFromApi()
        }
    }, [activityId]);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [timeToSpend, setTimeToSpend] = useState(10);
    const [days, setDays] = useState(['jeudi', 'vendredi']);
    const daysOptions = [
        {label: 'Lundi', value: 'lundi'},
        {label: 'Mardi', value: 'mardi'},
        {label: 'Mercredi', value: 'mercredi'},
        {label: 'Jeudi', value: 'jeudi'},
        {label: 'Vendredi', value: 'vendredi'},
        {label: 'Samedi', value: 'samedi'},
        {label: 'Dimanche', value: 'dimanche'},
    ];

    useEffect(() => {
        setActivity({
            _id: activityId,
            name,
            description,
            priority,
            isCompleted: false,
            isActive: true,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            startTime,
            endTime,
            timeToSpend,
            timeAlreadySpent: 0,
            days: days,
        })
    }, [name, description, priority, startDate, endDate, startTime, endTime, timeToSpend, days]);

    const getActivityFromApi = async () => {
        const activity = await apiService.get<ActivityInterface>(`/api/activity/${activityId}`);
        //date to ISO string
        const startDate = activity.startDate ? new Date(activity.startDate)?.toISOString().split('T')[0] : '';
        const endDate = activity.endDate ? new Date(activity.endDate)?.toISOString().split('T')[0] : '';
        setActivity(activity);
        setName(activity.name);
        setDescription(activity.description);
        setPriority(activity.priority);
        setStartDate(startDate);
        setEndDate(endDate);
        setStartTime(activity.startTime || '');
        setEndTime(activity.endTime || '');
        setTimeToSpend(activity.timeToSpend);
        setDays(activity.days);
    };

    const handleSubmit = async () => {
        const url = activityId ? `/api/activity/${activityId}` : '/api/activity';

        await apiService.post(url, activity)
            .then(() => {
                reset();
                router.push('/activity');
            });
    };

    const reset = () => {
        setName('');
        setDescription('');
        setPriority(1);
        setStartDate('');
        setEndDate('');
        setStartTime('');
        setEndTime('');
        setTimeToSpend(10);
        setDays(['jeudi', 'vendredi']);
    };

    function selectDays(checked: boolean, day: string) {
        if (checked) {
            setDays([...days, day]);
        } else {
            setDays(days.filter((d) => d !== day));
        }
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="sm:col-span-2">
                <BaseHorizontalListGroup
                    selectedOptions={days}
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
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
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
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
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
                    value={priority}
                    onChange={(e) => setPriority(e.target.valueAsNumber)}
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
                    value={timeToSpend}
                    onChange={(e) => setTimeToSpend(e.target.valueAsNumber)}
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