"use client";

import {ScheduleInterface} from "@/models/Schedule";
import {CheckIcon} from "@/components/uiComponents/icons/icons";
import {priorityStyle} from "@/components/uiComponents/priority";
import {formatClock} from "@/components/uiComponents/format";
import {parseTimeToMinutes} from "@/server/domain/planning/time";

/** « 7h – 8h » ; un horaire illisible est affiché tel quel. */
export function formatSlotTime(slot: ScheduleInterface): string {
    try {
        return `${formatClock(parseTimeToMinutes(slot.startTime))} – ${formatClock(parseTimeToMinutes(slot.endTime))}`;
    } catch {
        return `${slot.startTime} – ${slot.endTime}`;
    }
}

/**
 * Un créneau. Fond = couleur soutenue de la priorité, toujours ; fait = une
 * coche, rien d'autre ; contour = couleur vive. Un clic bascule fait / à faire.
 */
export function SlotButton({slot, day, priority, onToggle, large}: {
    slot: ScheduleInterface,
    day: string,
    priority: number,
    onToggle: (slot: ScheduleInterface) => void,
    large?: boolean,
}) {
    const style = priorityStyle(priority);
    const done = slot.status === "done";
    const time = formatSlotTime(slot);

    return (
        <button
            type="button"
            aria-pressed={done}
            aria-label={`${slot.activity}, priorité ${style.label.toLowerCase()}, ${day} ${time}, ${done ? "fait" : "à faire"}`}
            title={slot.description || undefined}
            onClick={() => onToggle(slot)}
            className={`flex w-full border text-left text-ink transition-[transform,box-shadow] duration-100 hover:-translate-y-px hover:shadow-[0_0_0_3px_var(--color-line)] ${style.softBg} ${style.dotBorder} ${large ? "min-h-16 items-center gap-3.5 rounded-[20px] px-4 py-3" : "items-start gap-[9px] rounded-2xl px-2.5 pt-2.5 pb-[11px]"}`}
        >
            <span
                className={`flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink ${large ? "size-[26px]" : "mt-px size-[18px]"} ${done ? "bg-ink text-butter" : "bg-transparent"}`}>
                {done && <CheckIcon size={large ? 13 : 10}/>}
            </span>
            <span className="flex min-w-0 flex-col gap-px">
                <span className={`font-bold ${large ? "text-[17px] leading-[21px]" : "text-sm leading-[18px]"}`}>{slot.activity}</span>
                <span className={large ? "text-[13px] leading-[17px]" : "text-xs leading-4"}>{time}</span>
            </span>
        </button>
    );
}

/** Colonne d'un jour, sur bureau. Le jour même est prune. */
export default function DayTimeline({day, label, date, isToday, slots, priorityOf, onToggle}: {
    day: string,
    label: string,
    date: string,
    isToday: boolean,
    slots: ScheduleInterface[],
    priorityOf: (activity: string) => number,
    onToggle: (slot: ScheduleInterface) => void,
}) {
    return (
        <section
            aria-label={`${day} ${date}`}
            className={`flex min-w-0 flex-col gap-2.5 rounded-3xl border px-3 pt-4 pb-3 ${isToday ? "border-ink bg-ink text-butter" : "border-line bg-cream text-ink"}`}
        >
            <div className="flex items-baseline justify-between px-1 pb-1">
                <div className="flex flex-col">
                    <div className={`eyebrow ${isToday ? "text-butter" : "text-ink"}`}>{label}</div>
                    <div className="serif text-4xl leading-[38px]">{date}</div>
                </div>
                {isToday && <div className="ital text-[17px]">aujourd’hui</div>}
            </div>
            {slots.map((slot) =>
                <SlotButton key={slot._id} slot={slot} day={day} priority={priorityOf(slot.activity)}
                            onToggle={onToggle}/>
            )}
            {slots.length === 0 &&
                <div className={`ital p-1 text-lg ${isToday ? "text-line" : "text-muted"}`}>Journée libre.</div>
            }
        </section>
    );
}
