import {priorityStyle} from "@/components/uiComponents/priority";

/** Pastille de couleur d'une priorité (1 = haute). La taille passe par `className`. */
export default function PriorityIcon({priority, className = "size-2.5"}: {
    priority?: number | null,
    className?: string,
}) {
    return (
        <span
            aria-hidden="true"
            className={`inline-block shrink-0 rounded-full ${priorityStyle(priority).dotBg} ${className}`}
        />
    );
}
