"use client";

import {useState} from "react";
import {ActivityInterface} from "@/models/Activity";
import Stepper, {StepButton} from "@/components/uiComponents/Stepper";
import SegmentedControl from "@/components/uiComponents/SegmentedControl";
import DayPicker from "@/components/uiComponents/DayPicker";
import PriorityIcon from "@/components/uiComponents/icons/PriorityIcon";
import {BaseButton} from "@/components/uiComponents/BaseButton";
import {CloseIcon, TrashIcon} from "@/components/uiComponents/icons/icons";
import {PRIORITIES, priorityStyle} from "@/components/uiComponents/priority";
import {formatClock, formatDuration, formatTimes} from "@/components/uiComponents/format";
import {
    clampTimes, DEFAULT_FIXED_START, durationOf, effectiveTimes, fixedStart, fixedTimes, MAX_DURATION,
    MIN_DURATION, maxTimes, stepDuration, TIME_STEP, toggleDay,
} from "@/components/activity/activityRules";

export type ActivityPatch = Partial<Pick<ActivityInterface,
    "name" | "priority" | "timesPerWeek" | "timeToSpend" | "days" | "startTime" | "endTime">>;

/**
 * Carte d'activité éditable sur place : chaque contrôle enregistre aussitôt
 * (`onSave`), le nom à la sortie du champ. La carte n'est pas cliquable ; son
 * contour passe au prune pendant qu'on modifie un champ.
 */
export default function ActivityCard({activity, onSave, onDelete}: {
    activity: ActivityInterface,
    onSave: (patch: ActivityPatch) => void,
    onDelete: () => void,
}) {
    const [name, setName] = useState(activity.name);
    const [editedName, setEditedName] = useState(activity.name);
    const [confirming, setConfirming] = useState(false);

    // Le nom affiché suit la valeur enregistrée quand elle change ailleurs
    // (rechargement après une erreur) — sans effet ni double rendu.
    if (activity.name !== editedName) {
        setEditedName(activity.name);
        setName(activity.name);
    }

    const schedulable = {
        days: activity.days ?? [],
        timesPerWeek: activity.timesPerWeek ?? null,
        timeToSpend: activity.timeToSpend ?? 60,
        startTime: activity.startTime ?? "",
        endTime: activity.endTime ?? "",
    };
    const style = priorityStyle(activity.priority);
    const times = effectiveTimes(schedulable);
    const duration = durationOf(schedulable);
    const start = fixedStart(schedulable);

    function commitName() {
        const trimmed = name.trim();
        if (!trimmed) {
            setName(activity.name);
            return;
        }
        if (trimmed !== activity.name) {
            setEditedName(trimmed);
            onSave({name: trimmed});
        }
    }

    function setDuration(next: number) {
        onSave(start === null
            ? {timeToSpend: next}
            : {timeToSpend: next, ...fixedTimes(start, next)});
    }

    const meta = `${formatTimes(times)} · ${formatDuration(duration)} · ${style.label}`;

    return (
        <article
            className="flex flex-col gap-3.5 rounded-[22px] border border-line bg-cream p-4 focus-within:border-ink md:rounded-3xl md:px-5 md:pt-[18px] md:pb-5">
            {confirming ?
                <div className="flex min-h-9 flex-wrap items-center gap-2" role="alert">
                    <div className="grow text-[15px] font-bold">Supprimer « {activity.name} » ?</div>
                    <BaseButton theme="link" size="small" onClick={() => setConfirming(false)}>Annuler</BaseButton>
                    <BaseButton size="small" onClick={onDelete}>Supprimer</BaseButton>
                </div>
                :
                <div className="flex items-center gap-2">
                    <PriorityIcon priority={activity.priority} className="size-3 self-start mt-[11px] md:self-center md:mt-0"/>
                    <div className="min-w-0 grow">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={commitName}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                                if (e.key === "Escape") {
                                    setName(activity.name);
                                    e.currentTarget.blur();
                                }
                            }}
                            aria-label="Nom de l’activité"
                            className="-ml-1.5 h-[34px] w-full rounded-[10px] border border-transparent bg-transparent px-1.5 text-xl font-bold tracking-[-0.3px] text-ink outline-none hover:border-line focus:border-ink md:h-9 md:text-[22px] md:tracking-[-0.4px]"
                        />
                        <div className="text-[13px] text-muted md:hidden">{meta}</div>
                    </div>
                    <StepButton ghost label={`Supprimer ${activity.name}`} onClick={() => setConfirming(true)}
                                className="size-11 md:size-[30px]">
                        <TrashIcon size={16} className="text-muted"/>
                    </StepButton>
                </div>
            }

            <div className="flex flex-col gap-1.5">
                <div className="eyebrow hidden md:block">Importance</div>
                <SegmentedControl
                    label={`Importance de ${activity.name}`}
                    value={style.value}
                    onChange={(priority) => onSave({priority})}
                    options={PRIORITIES.map((p) => ({value: p.value, label: p.label, selectedClass: `${p.softBg} text-ink`}))}
                />
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-3.5">
                <div className="flex flex-col gap-1 md:gap-1.5">
                    <div className="eyebrow">Par semaine</div>
                    <Stepper
                        value={formatTimes(times)}
                        valueClassName="text-[15px] font-bold md:text-base"
                        decrementLabel={`Moins de fois pour ${activity.name}`}
                        incrementLabel={`Plus de fois pour ${activity.name}`}
                        canDecrement={times > 1}
                        canIncrement={times < maxTimes(schedulable.days)}
                        onDecrement={() => onSave({timesPerWeek: times - 1})}
                        onIncrement={() => onSave({timesPerWeek: times + 1})}
                    />
                </div>
                <div className="flex flex-col gap-1 md:gap-1.5">
                    <div className="eyebrow">Durée</div>
                    <Stepper
                        value={formatDuration(duration)}
                        valueClassName="text-[15px] font-bold md:text-base"
                        decrementLabel={`Séances plus courtes pour ${activity.name}`}
                        incrementLabel={`Séances plus longues pour ${activity.name}`}
                        canDecrement={duration > MIN_DURATION}
                        canIncrement={duration < MAX_DURATION}
                        onDecrement={() => setDuration(stepDuration(duration, -1))}
                        onIncrement={() => setDuration(stepDuration(duration, 1))}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <div className="eyebrow hidden md:block">Jours possibles</div>
                <DayPicker
                    selected={schedulable.days}
                    onToggle={(day) => {
                        const days = toggleDay(schedulable.days, day);
                        onSave({days, timesPerWeek: clampTimes(schedulable.timesPerWeek, days)});
                    }}
                />
            </div>

            <div className="flex min-h-9 items-center gap-1.5 border-t border-line pt-3 md:min-h-8 md:gap-2">
                <div className="eyebrow w-20 shrink-0 md:w-[92px]">Horaire fixe</div>
                {start !== null ?
                    <div className="flex grow items-center gap-1">
                        <div className="grow">
                            <Stepper
                                value={`à ${formatClock(start)}`}
                                valueClassName="text-[15px] font-bold md:text-base"
                                decrementLabel={`Horaire de ${activity.name} plus tôt`}
                                incrementLabel={`Horaire de ${activity.name} plus tard`}
                                canDecrement={start > 0}
                                onDecrement={() => onSave(fixedTimes(start - TIME_STEP, duration))}
                                onIncrement={() => onSave(fixedTimes(start + TIME_STEP, duration))}
                            />
                        </div>
                        <StepButton ghost label={`Retirer l’horaire fixe de ${activity.name}`}
                                    onClick={() => onSave({startTime: "", endTime: ""})}>
                            <CloseIcon size={13} className="text-muted"/>
                        </StepButton>
                    </div>
                    :
                    <button
                        type="button"
                        onClick={() => onSave(fixedTimes(DEFAULT_FIXED_START, duration))}
                        className="h-8 rounded-2xl border border-dashed border-muted bg-transparent px-3.5 text-[13px] font-semibold text-ink transition-[transform,background-color] duration-100 hover:bg-line active:scale-95"
                    >
                        Libre · fixer une heure
                    </button>
                }
            </div>
        </article>
    );
}
