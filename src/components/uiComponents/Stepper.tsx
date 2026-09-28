import React from "react";
import {MinusIcon, PlusIcon} from "@/components/uiComponents/icons/icons";

/** Bouton rond du design (classe `step`) : +, −, fermer, supprimer. */
export function StepButton({label, onClick, disabled, ghost, children, className = ""}: {
    label: string,
    onClick: () => void,
    disabled?: boolean,
    /** Sans contour : supprimer, retirer l'horaire. */
    ghost?: boolean,
    children: React.ReactNode,
    className?: string,
}) {
    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className={`flex size-[30px] shrink-0 items-center justify-center rounded-full border bg-transparent p-0 text-ink transition-[transform,background-color] duration-100 hover:enabled:border-butter hover:enabled:bg-butter active:enabled:scale-90 disabled:border-dashed disabled:text-muted ${ghost ? "border-transparent" : "border-line"} ${className}`}
        >
            {children}
        </button>
    );
}

/** Valeur encadrée de deux boutons − / +, désactivés aux bornes. */
export default function Stepper({
                                    value, onDecrement, onIncrement, decrementLabel, incrementLabel,
                                    canDecrement = true, canIncrement = true, valueClassName = "text-base font-bold",
                                }: {
    value: React.ReactNode,
    onDecrement: () => void,
    onIncrement: () => void,
    decrementLabel: string,
    incrementLabel: string,
    canDecrement?: boolean,
    canIncrement?: boolean,
    valueClassName?: string,
}) {
    return (
        <div className="flex items-center gap-1">
            <StepButton label={decrementLabel} onClick={onDecrement} disabled={!canDecrement}>
                <MinusIcon size={11}/>
            </StepButton>
            <div className={`min-w-0 grow text-center ${valueClassName}`} aria-live="polite">{value}</div>
            <StepButton label={incrementLabel} onClick={onIncrement} disabled={!canIncrement}>
                <PlusIcon size={11}/>
            </StepButton>
        </div>
    );
}
