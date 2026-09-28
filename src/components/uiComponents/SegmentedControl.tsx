/**
 * Rangée de pastilles sur fond sable, une seule enfoncée (`aria-pressed`).
 * `selectedClass` colore l'option choisie : par défaut prune sur jaune, ou la
 * couleur d'une priorité pour l'importance.
 */
export default function SegmentedControl<T extends string | number>({
                                                                        options, value, onChange, label, size = "base",
                                                                    }: {
    options: { value: T, label: string, selectedClass?: string }[],
    value: T,
    onChange: (value: T) => void,
    label: string,
    size?: "base" | "large",
}) {
    return (
        <div role="group" aria-label={label} className="flex gap-1 rounded-[17px] bg-line p-[3px]">
            {options.map((option) => {
                const on = option.value === value;
                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onChange(option.value)}
                        className={`grow basis-0 rounded-[14px] border-0 text-[13px] font-semibold text-ink transition-[transform,background-color] duration-100 active:scale-95 ${size === "large" ? "h-9" : "h-9 md:h-[30px]"} ${on ? (option.selectedClass ?? "bg-ink text-butter") : "bg-transparent hover:bg-cream"}`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
