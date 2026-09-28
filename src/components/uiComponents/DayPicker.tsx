import {WEEKDAYS} from "@/server/domain/planning/days";
import {DAY_INITIALS} from "@/components/uiComponents/format";

/** Pastilles L M M J V S D. Une pastille cochée est prune sur jaune. */
export default function DayPicker({selected, onToggle, size = "base"}: {
    selected: readonly string[],
    onToggle: (day: string) => void,
    size?: "base" | "large",
}) {
    const height = size === "large" ? "h-11 text-sm" : "h-10 text-[13px] md:h-9";
    return (
        <div className={`grid grid-cols-7 ${size === "large" ? "gap-2" : "gap-1.5"}`}>
            {WEEKDAYS.map((day, index) => {
                const on = selected.includes(day);
                return (
                    <button
                        key={day}
                        type="button"
                        aria-pressed={on}
                        aria-label={day}
                        onClick={() => onToggle(day)}
                        className={`${height} rounded-full border p-0 font-bold transition-[transform,background-color] duration-100 active:scale-95 ${on ? "border-ink bg-ink text-butter" : "border-line bg-transparent text-muted hover:bg-line"}`}
                    >
                        {DAY_INITIALS[index]}
                    </button>
                );
            })}
        </div>
    );
}
