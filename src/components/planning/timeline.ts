import {formatMinutesToTime, parseTimeToMinutes} from "@/server/domain/planning/time";
import {LUNCH_END, LUNCH_START} from "@/server/domain/planning/lunchBreak";

/** En dessous, c'est une transition entre deux séances, pas du temps libre. */
export const MIN_FREE_MINUTES = 30;

/**
 * De quoi remplir un trou de la journée. Une trentaine : assez pour ne presque
 * jamais revoir la même dans la semaine, assez peu pour rester soignées.
 */
export const FREE_TIME_IDEAS: readonly string[] = [
    "Un café, les pieds en éventail.",
    "Dix pompes. Ou deux, c'est déjà ça.",
    "Arrose une plante, elle t'attend.",
    "Une chanson à fond, danse comprise.",
    "Sieste flash : 15 min, pas une de plus.",
    "Le tour du pâté de maisons.",
    "Range un seul tiroir. Un seul.",
    "Appelle quelqu'un que tu aimes bien.",
    "Regarde par la fenêtre, pour de vrai.",
    "Un carré de chocolat. Ou deux.",
    "Étire-toi comme un chat au soleil.",
    "Note trois choses qui vont bien.",
    "Un grand verre d'eau. Oui, maintenant.",
    "Apprends un mot dans une langue au hasard.",
    "Dessine un truc moche, c'est permis.",
    "Une grille de mots croisés.",
    "Prépare un thé et regarde-le infuser.",
    "Fais le ménage dans tes captures d'écran.",
    "Lis une page d'un livre ouvert au hasard.",
    "Envoie un mème à quelqu'un.",
    "Respire : 4 secondes, 4, 4, 4.",
    "Un fruit, croqué lentement.",
    "Ferme les yeux, écoute les bruits autour.",
    "Une musique d'un pays où tu n'es jamais allé·e.",
    "Planifie ton week-end idéal.",
    "Siffle un air sans te tromper.",
    "Commence une liste de films à voir.",
    "Une partie d'échecs éclair.",
    "Change un objet de place chez toi.",
    "Rien. Absolument rien. C'est très bien.",
];

export type TimelineItem<T> =
    | { kind: "slot", slot: T }
    | { kind: "lunch" }
    | { kind: "free", start: string, end: string, idea: string };

function minutes(value: string): number | null {
    try {
        return parseTimeToMinutes(value);
    } catch {
        return null;
    }
}

/** Petit hachage stable : la même graine donne toujours les mêmes idées. */
function hash(text: string): number {
    let h = 0;
    for (const char of text) {
        h = (h * 31 + char.charCodeAt(0)) >>> 0;
    }
    return h;
}

/**
 * La journée telle qu'elle s'affiche : créneaux, pause de midi et trous d'au
 * moins 30 min entre deux créneaux, avec une idée pour chacun. Le tirage dépend
 * de `seed` (le planning) et du jour : stable d'un rendu à l'autre, jamais deux
 * fois la même idée dans une journée. Un créneau aux horaires illisibles est
 * gardé en fin de journée, sans trou calculé autour.
 */
export function timelineOf<T extends { startTime: string, endTime: string }>(
    slots: readonly T[],
    day: string,
    seed: string,
): TimelineItem<T>[] {
    if (slots.length === 0) return [];

    const readable = slots
        .filter((slot) => minutes(slot.startTime) !== null && minutes(slot.endTime) !== null)
        .sort((a, b) => minutes(a.startTime)! - minutes(b.startTime)!);
    const unreadable = slots.filter((slot) => !readable.includes(slot));

    const lunchStart = parseTimeToMinutes(LUNCH_START);
    const lunchEnd = parseTimeToMinutes(LUNCH_END);
    const timed: Array<{ at: number, item: TimelineItem<T> }> = [
        ...readable.map((slot) => ({at: minutes(slot.startTime)!, item: {kind: "slot", slot} as TimelineItem<T>})),
        {at: lunchStart, item: {kind: "lunch"}},
    ];

    // Les trous entre deux créneaux, amputés de la pause de midi.
    const gaps: Array<[number, number]> = [];
    let latestEnd = readable.length ? minutes(readable[0].endTime)! : 0;
    for (const slot of readable.slice(1)) {
        const start = minutes(slot.startTime)!;
        const pieces: Array<[number, number]> = start <= lunchStart || latestEnd >= lunchEnd
            ? [[latestEnd, start]]
            : [[latestEnd, Math.min(start, lunchStart)], [Math.max(latestEnd, lunchEnd), start]];
        gaps.push(...pieces.filter(([from, to]) => to - from >= MIN_FREE_MINUTES));
        latestEnd = Math.max(latestEnd, minutes(slot.endTime)!);
    }

    const first = hash(`${seed}\u0000${day}`);
    gaps.forEach(([from, to], index) => timed.push({
        at: from,
        item: {
            kind: "free",
            start: formatMinutesToTime(from),
            end: formatMinutesToTime(to),
            idea: FREE_TIME_IDEAS[(first + index) % FREE_TIME_IDEAS.length],
        },
    }));

    // À heure égale, un créneau passe avant la pause et le temps libre.
    const rank = {slot: 0, lunch: 1, free: 2};
    return [
        ...timed.sort((a, b) => a.at - b.at || rank[a.item.kind] - rank[b.item.kind]).map((entry) => entry.item),
        ...unreadable.map((slot) => ({kind: "slot", slot}) as TimelineItem<T>),
    ];
}
