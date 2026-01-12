import ActivityForm from "@/components/activity/ActivityForm";

export default async function ActivityAddPage({params,}: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id

    return <div className="flex flex-col items-center justify-center p-10">
        <h2 className="text-xl font-bold flex w-full">Modifier l&#39;activité</h2>
        <ActivityForm activityId={id}/>
    </div>
}