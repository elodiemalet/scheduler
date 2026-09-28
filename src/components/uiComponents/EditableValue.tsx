"use client";

import {useState} from "react";

/**
 * Valeur affichée mise en forme (« 1 h 30 », « 7h »), modifiable à la main.
 * Le texte tapé n'est lu qu'à la sortie du champ ou sur Entrée ; Échap ou une
 * saisie illisible remettent la valeur d'avant, sans rien enregistrer.
 */
export default function EditableValue({value, format, parse, onCommit, label, className = ""}: {
    value: number,
    format: (value: number) => string,
    parse: (text: string) => number | null,
    onCommit: (value: number) => void,
    label: string,
    className?: string,
}) {
    // null hors édition : le champ affiche alors la valeur reçue, toujours à jour.
    const [draft, setDraft] = useState<string | null>(null);

    function commit() {
        if (draft === null) return;
        const parsed = parse(draft);
        setDraft(null);
        if (parsed !== null && parsed !== value) onCommit(parsed);
    }

    return (
        <input
            value={draft ?? format(value)}
            onFocus={(e) => {
                setDraft(format(value));
                e.currentTarget.select();
            }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                    // Dans un <dialog>, Échap fermerait la fenêtre : on ne sort que du champ.
                    e.preventDefault();
                    setDraft(null);
                    requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
                }
            }}
            aria-label={label}
            inputMode="text"
            autoComplete="off"
            className={`w-full min-w-0 rounded-[10px] border border-transparent bg-transparent text-center text-ink outline-none hover:border-line focus:border-ink ${className}`}
        />
    );
}
