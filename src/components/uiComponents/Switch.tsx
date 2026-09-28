/** Interrupteur du design (`role="switch"`). */
export default function Switch({checked, onChange, label}: {
    checked: boolean,
    onChange: (checked: boolean) => void,
    label: string,
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`flex h-7 w-12 shrink-0 rounded-full border p-0.5 transition-shadow hover:shadow-[0_0_0_4px_var(--color-line)] ${checked ? "justify-end border-ink bg-ink" : "justify-start border-muted bg-cream"}`}
        >
            <span className={`size-[22px] rounded-full ${checked ? "bg-cream" : "bg-muted"}`}/>
        </button>
    );
}
