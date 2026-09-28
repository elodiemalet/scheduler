/**
 * Présentation des priorités. Le domaine est inversé (1 = la plus importante),
 * d'où l'ordre ci-dessous : Haute, Moyenne, Basse. Les classes sont écrites en
 * entier pour que Tailwind les détecte.
 */
export interface PriorityStyle {
    value: 1 | 2 | 3;
    label: string;
    /** Phrase courte sous l'option, dans la fenêtre d'ajout. */
    desc: string;
    /** Fin de la phrase de résumé : « …, placées en priorité. » */
    summary: string;
    /** Fond soutenu : créneaux, option sélectionnée. */
    softBg: string;
    /** Couleur vive : pastilles, barres de progression. */
    dotBg: string;
    /** Contour vif. */
    dotBorder: string;
    /** Remplissage d'une barre `<progress>` (pas d'attribut `style` : la CSP le refuse). */
    progressFill: string;
}

export const PRIORITIES: PriorityStyle[] = [
    {
        value: 1, label: "Haute", desc: "Passe en premier", summary: "placées en priorité",
        softBg: "bg-prio-high", dotBg: "bg-prio-high-dot", dotBorder: "border-prio-high-dot",
        progressFill: "[&::-webkit-progress-value]:bg-prio-high-dot [&::-moz-progress-bar]:bg-prio-high-dot",
    },
    {
        value: 2, label: "Moyenne", desc: "Trouve sa place", summary: "placées après les priorités",
        softBg: "bg-prio-medium", dotBg: "bg-prio-medium-dot", dotBorder: "border-prio-medium-dot",
        progressFill: "[&::-webkit-progress-value]:bg-prio-medium-dot [&::-moz-progress-bar]:bg-prio-medium-dot",
    },
    {
        value: 3, label: "Basse", desc: "S’il reste du temps", summary: "placées s’il reste de la place",
        softBg: "bg-prio-low", dotBg: "bg-prio-low-dot", dotBorder: "border-prio-low-dot",
        progressFill: "[&::-webkit-progress-value]:bg-prio-low-dot [&::-moz-progress-bar]:bg-prio-low-dot",
    },
];

/** Une priorité absente ou hors bornes vaut 2, comme `DEFAULT_ACTIVITY_PRIORITY`. */
export function priorityStyle(priority: number | null | undefined): PriorityStyle {
    return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1];
}
