"use client";

import {ScheduleInterface} from "@/models/Schedule";
import {CheckIcon} from "@/components/uiComponents/icons/icons";
import {priorityStyle} from "@/components/uiComponents/priority";
import {formatClock} from "@/components/uiComponents/format";
import {parseTimeToMinutes} from "@/server/domain/planning/time";
import {LunchBreak} from "@/server/domain/planning/lunchBreak";
import {timelineOf} from "@/components/planning/timeline";

/** « 7h – 8h » ; un horaire illisible est affiché tel quel. */
export function formatSlotTime(slot: ScheduleInterface): string {
    try {
        return `${formatClock(parseTimeToMinutes(slot.startTime))} – ${formatClock(parseTimeToMinutes(slot.endTime))}`;
    } catch {
        return `${slot.startTime} – ${slot.endTime}`;
    }
}

/**
 * La pause de midi, en faux créneau : pointillés, pas de fond ni de case à
 * cocher — rien à faire, juste un repère. Le modèle n'y place rien.
 */
export function LunchMarker({lunch, large, onDark}: { lunch: LunchBreak, large?: boolean, onDark?: boolean }) {
    const time = `${formatClock(parseTimeToMinutes(lunch.start))} – ${formatClock(parseTimeToMinutes(lunch.end))}`;
    return (
        <div
            aria-label={`Pause déjeuner, ${time}`}
            className={`flex flex-col gap-px border border-dashed ${onDark ? "border-line text-line" : "border-muted text-muted"} ${large ? "min-h-16 justify-center rounded-[20px] px-4 py-3" : "rounded-2xl px-2.5 py-1.5"}`}
        >
            <span className={`ital ${large ? "text-[17px] leading-[21px]" : "text-[13px] leading-4"}`}>Pause déjeuner</span>
            <span className={large ? "text-[13px] leading-[17px]" : "text-xs leading-4"}>{time}</span>
        </div>
    );
}

/** Un trou d'au moins 30 min entre deux créneaux, avec une idée pour l'occuper. */
function FreeTime({start, end, idea, large, onDark}: {
    start: string, end: string, idea: string, large?: boolean, onDark?: boolean,
}) {
    const time = `${formatClock(parseTimeToMinutes(start))} – ${formatClock(parseTimeToMinutes(end))}`;
    return (
        <div
            aria-label={`Temps libre, ${time} : ${idea}`}
            className={`flex flex-col gap-0.5 border-l-2 ${onDark ? "border-line text-line" : "border-butter text-muted"} ${large ? "px-4 py-2" : "px-2.5 py-1"}`}
        >
            {large ?
                <>
                    <span className={`eyebrow ${onDark ? "text-line" : "text-muted"}`}>Temps libre</span>
                    <span className="text-[13px] leading-[17px]">{time}</span>
                </>
                :
                // Sur bureau, une ligne de moins : l'étiquette et l'horaire côte à côte.
                <span className="text-xs leading-4"><span className="eyebrow">Libre</span> · {time}</span>
            }
            <span className={`ital ${onDark ? "" : "text-ink"} ${large ? "mt-0.5 text-[17px] leading-[21px]" : "line-clamp-2 text-[13px] leading-4"}`}>{idea}</span>
        </div>
    );
}

/**
 * Une journée dans l'ordre des heures : créneaux, pause de midi, et temps
 * libre dans les trous. Rien du tout pour une journée sans créneau.
 */
export function DayItems({slots, day, seed, lunch, priorityOf, onToggle, large, onDark}: {
    slots: ScheduleInterface[],
    day: string,
    /** Le planning : le tirage des idées en dépend, pour varier d'une semaine à l'autre. */
    seed: string,
    /** La pause du planning affiché, pas le réglage actuel. */
    lunch: LunchBreak | null,
    priorityOf: (activity: string) => number,
    onToggle: (slot: ScheduleInterface) => void,
    large?: boolean,
    onDark?: boolean,
}) {
    return timelineOf(slots, day, seed, lunch).map((item) => {
        if (item.kind === "slot") {
            return <SlotButton key={item.slot._id} slot={item.slot} day={day} priority={priorityOf(item.slot.activity)}
                               onToggle={onToggle} large={large}/>;
        }
        if (item.kind === "lunch") {
            return lunch && <LunchMarker key="lunch" lunch={lunch} large={large} onDark={onDark}/>;
        }
        return <FreeTime key={`free-${item.start}`} start={item.start} end={item.end} idea={item.idea}
                         large={large} onDark={onDark}/>;
    });
}

/**
 * Hauteur minimale d'un créneau sur bureau, par paliers de durée : la forme de
 * la journée se lit d'un coup d'œil, sans qu'une séance de 15 min devienne
 * illisible. Classes écrites en entier pour que Tailwind les détecte.
 */
function heightFor(slot: ScheduleInterface): string {
    let length: number;
    try {
        length = parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime);
    } catch {
        return "";
    }
    if (length > 150) return "min-h-24";
    if (length > 90) return "min-h-[4.5rem]";
    if (length > 45) return "min-h-14";
    return "";
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
    // Moitié d'une séance coupée par la pause de midi.
    const part = (slot.parts ?? 1) > 1 ? `${slot.part}/${slot.parts}` : "";

    return (
        <button
            type="button"
            aria-pressed={done}
            aria-label={`${slot.activity}${part ? `, partie ${part}` : ""}, priorité ${style.label.toLowerCase()}, ${day} ${time}, ${done ? "fait" : "à faire"}`}
            title={slot.description || undefined}
            onClick={() => onToggle(slot)}
            className={`group flex w-full border text-left text-ink transition-[transform,box-shadow,opacity] duration-100 hover:-translate-y-px hover:shadow-[0_0_0_3px_var(--color-line)] ${style.softBg} ${style.dotBorder} ${done ? "opacity-60" : ""} ${large ? "min-h-16 items-center gap-3.5 rounded-[20px] px-4 py-3" : `items-start gap-2 rounded-2xl px-2.5 py-2 ${heightFor(slot)}`}`}
        >
            <span
                className={`flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink ${large ? "size-[26px]" : "mt-px size-4"} ${done ? "bg-ink text-butter" : "bg-transparent"}`}>
                {/* Au survol, une coche en filigrane : on voit qu'un clic la pose. */}
                <span className={done ? "" : "opacity-0 transition-opacity group-hover:opacity-40"}>
                    <CheckIcon size={large ? 13 : 10}/>
                </span>
            </span>
            <span className="flex min-w-0 flex-col gap-px">
                <span className={`font-bold break-words hyphens-auto ${done ? "line-through" : ""} ${large ? "text-[17px] leading-[21px]" : "text-sm leading-[18px]"}`}>
                    {slot.activity}{part && <span className="font-normal"> · {part}</span>}
                </span>
                <span className={large ? "text-[13px] leading-[17px]" : "text-xs leading-4"}>{time}</span>
            </span>
        </button>
    );
}

/** Colonne d'un jour, sur bureau. Le jour même est prune. */
export default function DayTimeline({day, label, date, isToday, slots, seed, lunch, priorityOf, onToggle}: {
    day: string,
    label: string,
    date: string,
    isToday: boolean,
    slots: ScheduleInterface[],
    seed: string,
    lunch: LunchBreak | null,
    priorityOf: (activity: string) => number,
    onToggle: (slot: ScheduleInterface) => void,
}) {
    return (
        <section
            aria-label={`${day} ${date}`}
            className={`flex min-w-0 flex-col gap-2 rounded-[20px] border px-2.5 pt-3 pb-2.5 ${isToday ? "border-ink bg-ink text-butter" : "border-line bg-cream text-ink"}`}
        >
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 px-1">
                <div className="flex items-baseline gap-1.5">
                    <div className={`eyebrow ${isToday ? "text-butter" : "text-ink"}`}>{label}</div>
                    <div className="serif text-[30px] leading-8">{date}</div>
                </div>
                {isToday && <div className="ital text-base">aujourd’hui</div>}
            </div>
            <DayItems slots={slots} day={day} seed={seed} lunch={lunch} priorityOf={priorityOf} onToggle={onToggle}
                      onDark={isToday}/>
            {slots.length === 0 &&
                <div className={`ital px-1 text-[15px] ${isToday ? "text-line" : "text-muted"}`}>Journée libre.</div>
            }
        </section>
    );
}
