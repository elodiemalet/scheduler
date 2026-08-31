'use client';
import WeeklyPlanning from "@/components/planning/WeeklyPlanning";

export default function Home() {
    return (
        <div className="grid grid-cols-4 gap-4 w-full h-full">
            <div className="col-span-3">
                <WeeklyPlanning/>
            </div>
        </div>
    );
}
