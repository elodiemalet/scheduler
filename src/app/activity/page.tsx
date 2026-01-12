import ActivityList from "@/components/activity/ActivityList";
import Link from "next/link";
import {BaseButton} from "@/components/uiComponents/BaseButton";

export default function ActivityListPage() {
    return (
        <>
            <h2 className="text-xl font-bold flex w-full">
                <span className="flex-1">Liste des activités</span>
                <Link href="/activity/add">
                    <BaseButton>
                        <svg className="h-3.5 w-3.5 mr-2" fill="currentColor" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path clipRule="evenodd" fillRule="evenodd"
                                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
                        </svg>
                        Ajouter une activité
                    </BaseButton>
                </Link>

            </h2>
            <ActivityList/>
        </>
    )
}