"use client";

import ActivityForm from "@/components/activity/ActivityForm";

export default function ActivityAddPage() {

    return <div className="flex flex-col items-center justify-center p-10">
        <h2 className="text-xl font-bold flex w-full">Ajouter une activité</h2>
        <ActivityForm/>
    </div>
}