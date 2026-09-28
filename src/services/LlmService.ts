import {getEnv} from "@/server/config/env";
import {isRetryableStatus, retryDelayMs} from "@/services/llmRetry";

/** Le SDK openai posait dix minutes ; on garde la même borne. */
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;
/** Un appel plus deux reprises : le `maxRetries` par défaut du SDK retiré. */
const MAX_ATTEMPTS = 3;

/** Échec HTTP du fournisseur, après épuisement des reprises. */
export class LlmRequestError extends Error {
    constructor(readonly status: number, readonly body: string) {
        super(`Le fournisseur a répondu ${status}`);
        this.name = 'LlmRequestError';
    }
}

/** Forme minimale d'une réponse chat-completions : rien d'autre n'est lu. */
interface ChatCompletion {
    choices?: Array<{message?: {content?: string | null}}>;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Le contrat de sortie est validé par parseSchedule ; ce module ne fait
 * qu'appeler le modèle. Températures basses : la tâche est contrainte
 * (blocs fixes, jours autorisés, pas de chevauchement), pas créative.
 */
const TEMPERATURE = 0.3;

/** 14 créneaux tiennent dans ~1200 tokens ; on garde de la marge pour une semaine chargée. */
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `Tu construis un emploi du temps hebdomadaire. Réponds uniquement avec un objet JSON brut, sans texte autour.

## Entrée
- "jours" : les jours à planifier, chacun avec "jour", "heure_debut" et "heure_fin". Ne place jamais rien en dehors de ces horaires.
- "activites" : pour chaque activité :
  - "name", "description"
  - "priority" : 1 = indispensable, 2 = important, 3 = accessoire
  - "sessions" : nombre de séances à placer dans la semaine
  - "sessionMinutes" : durée d'une séance, en minutes
  - "minSessionMinutes" : durée sous laquelle une séance ne descend jamais
  - "days" : les seuls jours où l'activité peut avoir lieu
  - "startTime" et "endTime" : quand les deux sont renseignés, c'est un bloc fixe

## Règles
1. Place "sessions" séances de chaque activité, chacune un jour différent pris dans "days" : jamais deux séances de la même activité le même jour.
2. Chaque séance dure "sessionMinutes".
3. Un bloc fixe se place exactement de "startTime" à "endTime" : ni déplacé, ni raccourci.
4. Aucun chevauchement. Laisse une courte pause entre deux séances qui ne sont pas des blocs fixes.
5. Étale les séances d'une même activité sur la semaine plutôt que sur des jours consécutifs.
6. Le temps qui reste libre reste libre : ne rallonge aucune séance.

## Quand tout ne tient pas
Applique ces étapes dans l'ordre, et seulement autant que nécessaire :
1. supprime des séances de priorité 3, les séances libres avant les blocs fixes ;
2. raccourcis des séances de priorité 2 qui ne sont pas des blocs fixes, sans descendre sous "minSessionMinutes" ;
3. supprime des séances de priorité 2, les séances libres avant les blocs fixes.
Ne supprime et ne raccourcis jamais une séance de priorité 1.

## Sortie
{
  "schedule": [
    {"day": "lundi", "start_time": "09:00", "end_time": "10:00", "activity": "Sport", "description": "Séance de cardio"}
  ],
  "sacrifices": [
    {"activity": "Lecture", "day": "mercredi", "type": "supprimée", "detail": "plus de place après le travail"},
    {"activity": "Anglais", "day": "lundi", "type": "raccourcie", "detail": "60 → 40 min"}
  ]
}
- "activity" reprend exactement le "name" de l'activité.
- "sacrifices" liste chaque séance supprimée ou raccourcie ; tableau vide si rien n'a été sacrifié.
`;

/**
 * Appelle un point d'entrée chat-completions compatible OpenAI. Le contrat de
 * sortie est validé par parseSchedule ; ici on ne gère que le transport et sa
 * reprise — c'est le seul service que rendait le SDK retiré.
 */
export async function generateWeeklyPlanning(userJson: string): Promise<string | null> {
    const env = getEnv();
    const body = JSON.stringify({
        model: env.llmModel,
        messages: [
            {role: "system", content: SYSTEM_PROMPT},
            {role: "user", content: userJson},
        ],
        response_format: {type: "json_object"},
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        top_p: 1,
    });

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const isLastAttempt = attempt === MAX_ATTEMPTS;
        let response: Response;

        try {
            response = await fetch(`${env.llmBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${env.llmApiKey}`,
                },
                body,
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
        } catch (error) {
            // Panne réseau ou délai dépassé : le SDK retentait aussi.
            if (isLastAttempt) {
                throw error;
            }
            await sleep(retryDelayMs(attempt));
            continue;
        }

        if (response.ok) {
            const completion = await response.json() as ChatCompletion;
            return completion.choices?.[0]?.message?.content ?? null;
        }

        const errorBody = await response.text();
        if (isLastAttempt || !isRetryableStatus(response.status)) {
            throw new LlmRequestError(response.status, errorBody);
        }

        console.warn(`Modèle : réponse ${response.status}, reprise ${attempt}/${MAX_ATTEMPTS - 1}`);
        await sleep(retryDelayMs(attempt, response.headers));
    }

    // Inatteignable : la dernière tentative retourne ou lève.
    throw new Error('Génération : boucle de reprise épuisée');
}
