import React from "react";

type ButtonTheme = "primary" | "secondary" | "soft" | "link" | "alert";
type ButtonSize = "base" | "small" | "large";

/**
 * Bouton pilule du design. `primary` : prune sur jaune ; `secondary` : contour ;
 * `soft` : fond jaune ; `link` : texte souligné ; `alert` : corail, quand la
 * semaine est à régénérer. États de la planche « États des composants » :
 * halo au survol, 0,97 à l'appui, fond sable quand désactivé.
 */
const THEMES: Record<ButtonTheme, string> = {
    primary: "bg-ink text-butter hover:enabled:shadow-[0_0_0_4px_var(--color-line)]",
    secondary: "border-[1.5px] border-ink bg-transparent text-ink hover:enabled:shadow-[0_0_0_4px_var(--color-line)]",
    soft: "bg-butter text-ink hover:enabled:shadow-[0_0_0_4px_var(--color-line)]",
    link: "bg-transparent text-ink underline underline-offset-[3px] hover:enabled:bg-line",
    alert: "bg-prio-high text-ink hover:enabled:shadow-[0_0_0_4px_var(--color-line)]",
};

const SIZES: Record<ButtonSize, string> = {
    small: "h-11 px-4 text-sm gap-2",
    base: "h-12 px-5 text-[15px] gap-2.5",
    large: "h-[52px] px-6 text-base gap-2.5",
};

export const BaseButton = ({
                               children, className = "", theme = "primary", size = "base",
                               onClick, type = "button", disabled, ariaLabel, ariaBusy,
                           }: {
    children: React.ReactNode,
    className?: string,
    theme?: ButtonTheme,
    size?: ButtonSize,
    onClick?: () => void | Promise<void>,
    type?: "button" | "submit" | "reset",
    disabled?: boolean,
    ariaLabel?: string,
    ariaBusy?: boolean,
}) => {
    return (
        <button
            type={type}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-busy={ariaBusy}
            onClick={onClick}
            className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold transition-[transform,box-shadow] duration-100 active:enabled:scale-[.97] disabled:bg-line disabled:text-muted disabled:shadow-none ${SIZES[size]} ${THEMES[theme]} ${className}`}
        >
            {children}
        </button>
    );
};
