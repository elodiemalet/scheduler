"use client";

import {useEffect, useRef, useState} from "react";
import {usePathname, useRouter} from "next/navigation";
import {BaseButton} from "@/components/uiComponents/BaseButton";
import Spinner from "@/components/uiComponents/Spinner";
import {SparkIcon} from "@/components/uiComponents/icons/icons";
import {apiService} from "@/services/ApiService";
import {PlanningInterface} from "@/models/Planning";
import {generateWeek} from "@/components/planning/useWeek";

/**
 * Séances déjà cochées dans la semaine en cours : une génération les efface,
 * puisqu'elle crée un planning neuf. Zéro si aucun planning n'existe encore.
 */
async function doneCount(): Promise<number> {
    try {
        const planning = await apiService.get<PlanningInterface>("/api/generate_weekly_planning");
        // Une séance coupée par la pause déjeuner compte pour une : activité + jour.
        const done = (planning.schedule ?? []).filter((slot) => slot.status === "done");
        return new Set(done.map((slot) => `${slot.activity}\u0000${slot.day}`)).size;
    } catch {
        return 0;
    }
}

/**
 * « Générer ma semaine », dans l'en-tête de toutes les pages. Corail quand les
 * activités ont changé depuis la dernière génération. Demande confirmation si
 * des séances sont déjà cochées. Après une génération lancée ailleurs, on
 * revient sur la semaine.
 */
export default function GenerateButton({stale, compact, label, theme}: {
    stale?: boolean,
    compact?: boolean,
    label?: string,
    theme?: "primary" | "secondary",
}) {
    const [loading, setLoading] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    /** Séances cochées qu'une génération effacerait ; 0 = pas de confirmation ouverte. */
    const [confirming, setConfirming] = useState(0);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (confirming && !dialog.open) dialog.showModal();
        if (!confirming && dialog.open) dialog.close();
    }, [confirming]);

    async function onClick() {
        if (loading) return;
        setLoading(true);
        const done = await doneCount();
        if (done > 0) {
            setLoading(false);
            setConfirming(done);
            return;
        }
        await generate();
    }

    async function generate() {
        setConfirming(0);
        setLoading(true);
        const ok = await generateWeek();
        setLoading(false);
        if (ok && pathname !== "/") router.push("/");
    }

    const text = label ?? (compact ? "Générer" : "Générer ma semaine");

    return (
        <>
            <BaseButton
                theme={theme ?? (stale ? "alert" : "primary")}
                size={compact ? "small" : "base"}
                onClick={onClick}
                disabled={loading}
                ariaBusy={loading}
                className={compact ? "pl-3" : "pl-[18px] pr-[22px]"}
            >
                {loading ? <Spinner/> : <SparkIcon size={compact ? 16 : 18}/>}
                {loading ? "Génération…" : text}
            </BaseButton>
            <dialog
                ref={dialogRef}
                aria-labelledby="regenerate-title"
                onCancel={(e) => {
                    e.preventDefault();
                    setConfirming(0);
                }}
                onClick={(e) => {
                    // Un clic sur le fond (le <dialog> lui-même, hors du contenu) ferme.
                    if (e.target === e.currentTarget) setConfirming(0);
                }}
                className="m-auto w-[calc(100%-32px)] max-w-[440px] rounded-[28px] bg-cream p-0 text-ink"
            >
                <div className="flex flex-col gap-3 px-6 pt-6 pb-5 md:px-7 md:pt-7">
                    <h2 id="regenerate-title" className="serif m-0 text-[26px] leading-[30px]">Repartir de zéro ?</h2>
                    <p className="m-0 text-[15px] text-muted">
                        Tu as déjà coché <span className="font-bold text-ink">{confirming} séance{confirming > 1 ? "s" : ""}</span> cette
                        semaine. Une nouvelle génération crée une semaine neuve, sans ces coches.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                        <BaseButton theme="link" onClick={() => setConfirming(0)} className="font-semibold">Garder ma semaine</BaseButton>
                        <BaseButton theme="alert" onClick={generate}>
                            <SparkIcon size={16}/> Regénérer
                        </BaseButton>
                    </div>
                </div>
            </dialog>
        </>
    );
}
