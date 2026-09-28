/** Icônes au trait, reprises du design. Elles héritent de `currentColor`. */

type IconProps = { size?: number, strokeWidth?: number, className?: string };

function Svg({size = 16, strokeWidth = 2, className, children}: IconProps & { children: React.ReactNode }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
             className={className} aria-hidden="true">
            {children}
        </svg>
    );
}

export function PlusIcon(props: IconProps) {
    return <Svg strokeWidth={2.5} {...props}><path d="M5 12h14"/><path d="M12 5v14"/></Svg>;
}

export function MinusIcon(props: IconProps) {
    return <Svg strokeWidth={2.5} {...props}><path d="M5 12h14"/></Svg>;
}

export function CloseIcon(props: IconProps) {
    return <Svg {...props}><path d="M6 6l12 12"/><path d="M18 6L6 18"/></Svg>;
}

export function TrashIcon(props: IconProps) {
    return <Svg {...props}><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></Svg>;
}

export function CheckIcon(props: IconProps) {
    return <Svg strokeWidth={4} {...props}><path d="M5 12l5 5L20 7"/></Svg>;
}

export function SparkIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/>
            <path d="M6 6l2.5 2.5"/><path d="M15.5 15.5L18 18"/><path d="M18 6l-2.5 2.5"/><path d="M8.5 15.5L6 18"/>
        </Svg>
    );
}

export function AlertIcon(props: IconProps) {
    return <Svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5v.01"/></Svg>;
}

export function CalendarIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>
        </Svg>
    );
}

export function ListIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/>
            <circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>
        </Svg>
    );
}

/** Onglet « Tâches » et état vide de la page. */
export function CircleCheckIcon(props: IconProps) {
    return <Svg {...props}><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></Svg>;
}
