"use client";

import {ActivityInterface} from "@/models/Activity";
import {StepButton} from "@/components/uiComponents/Stepper";
import {MinusIcon, PlusIcon} from "@/components/uiComponents/icons/icons";
import {formatClock, formatDays} from "@/components/uiComponents/format";
import {parseTimeToMinutes} from "@/server/domain/planning/time";
import {fixedStart, shiftBound, TIME_STEP} from "@/components/activity/activityRules";
import {ActivityPatch} from "@/components/activity/ActivityCard";

function Bound({label, value, onEarlier, onLater}: {
    label: string,
    value: string,
    onEarlier: (() => void) | null,
    onLater: (() => void) | null,
}) {
    return (
        <>
            <StepButton label={`${label} plus tôt`} onClick={() => onEarlier?.()} disabled={!onEarlier}>
                <MinusIcon size={10} strokeWidth={3}/>
            </StepButton>
            <div className="grow text-center text-sm font-bold">{value}</div>
            <StepButton label={`${label} plus tard`} onClick={() => onLater?.()} disabled={!onLater}>
                <PlusIcon size={10} strokeWidth={3}/>
            </StepButton>
        </>
    );
}

/**
 * « Horaires fixes » : les activités qui ont un début et une fin. Ce sont les
 * blocs que scheduler ne déplace pas ; on règle ici début et fin séparément.
 */
export default function FixedTimesPanel({activities, onSave}: {
    activities: ActivityInterface[],
    onSave: (id: string, patch: ActivityPatch) => void,
}) {
    const fixed = activities
        .filter((a) => typeof a._id === "string" && fixedStart({startTime: a.startTime ?? "", endTime: a.endTime ?? ""}) !== null)
        .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    return (
        <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[330px]">
            <h2 className="serif m-0 mt-2 text-[28px] leading-8">Horaires fixes</h2>
            <div className="ital -mt-2 text-lg leading-[22px] text-muted">
                Les moments déjà pris. Scheduler ne les déplace pas.
            </div>
            <div className="flex flex-col rounded-3xl border border-line px-[18px] py-1">
                {fixed.length === 0 &&
                    <div className="py-3.5 text-sm text-muted">
                        Aucun pour l’instant. Fixe une heure depuis une activité pour la voir ici.
                    </div>
                }
                {fixed.map((activity, index) => {
                    const id = activity._id as string;
                    const schedulable = {
                        days: activity.days ?? [],
                        timesPerWeek: activity.timesPerWeek ?? null,
                        timeToSpend: activity.timeToSpend ?? 60,
                        startTime: activity.startTime,
                        endTime: activity.endTime,
                    };
                    const shift = (bound: "start" | "end", delta: number) => {
                        const next = shiftBound(schedulable, bound, delta);
                        if (!next) return null;
                        const length = parseTimeToMinutes(next.endTime) - parseTimeToMinutes(next.startTime);
                        return () => onSave(id, {...next, timeToSpend: length});
                    };
                    return (
                        <div key={id} className={`flex flex-col gap-2 py-3.5 ${index ? "border-t border-line" : ""}`}>
                            <div className="flex items-baseline justify-between gap-2">
                                <div className="truncate text-base font-bold">{activity.name}</div>
                                <div className="shrink-0 text-xs text-muted">{formatDays(activity.days ?? [])}</div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Bound label={`Début de ${activity.name}`}
                                       value={formatClock(parseTimeToMinutes(activity.startTime))}
                                       onEarlier={shift("start", -TIME_STEP)} onLater={shift("start", TIME_STEP)}/>
                                <div className="px-1 text-sm text-muted" aria-hidden="true">→</div>
                                <Bound label={`Fin de ${activity.name}`}
                                       value={formatClock(parseTimeToMinutes(activity.endTime))}
                                       onEarlier={shift("end", -TIME_STEP)} onLater={shift("end", TIME_STEP)}/>
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
