/** Petites marques de la maquette « Tâches », partagées par la liste et la fenêtre. */

/** Pastille corail « en retard » : l'échéance est passée. */
export function LateBadge({className = ""}: { className?: string }) {
    return (
        <span
            className={`inline-flex h-[22px] shrink-0 items-center gap-[5px] self-start rounded-full border border-coral bg-cream px-[9px] text-xs font-bold whitespace-nowrap text-ink ${className}`}>
            <span className="size-[7px] shrink-0 rounded-full bg-coral" aria-hidden="true"/>
            en retard
        </span>
    );
}

/** Étiquette « Tâche » qui distingue, dans le planning, le créneau d'une tâche de celui d'une activité. */
export function TaskMark({className = ""}: { className?: string }) {
    return (
        <span
            className={`inline-flex h-[18px] shrink-0 items-center gap-1 self-start rounded-md border border-ink bg-cream px-1.5 text-[10px] font-extrabold tracking-[.8px] text-ink uppercase ${className}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="4"/>
                <path d="M8 12.5l2.5 2.5L16 9.5"/>
            </svg>
            Tâche
        </span>
    );
}
