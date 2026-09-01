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

const SYSTEM_PROMPT = "Génère un emploi du temps structuré au format JSON en respectant les contraintes suivantes :\n\n### Données en entrée :\nUne liste de jours avec leurs horaires :\n- `jours` : tableau d'objets contenant pour chaque jour :\n  - `jour` : nom du jour (ex: \"lundi\", \"mardi\"...)\n  - `heure_debut` : heure de début pour ce jour (ex: \"08:30\")\n  - `heure_fin` : heure de fin pour ce jour (ex: \"17:30\")\n\nUne liste d'activités avec les paramètres suivants :\n- Nom de l'activité\n- Priorité (1 = très important, 3 = moins important)\n- Temps à passer en heures ou en pourcentage de la journée (optionnel)\n- Heure de début (startTime) et de fin (endTime) définies (optionnel)\n- Liste des jours concernés (days) - spécifique à l'activité\n\n### Contraintes :\n- **IMPORTANT : Chaque jour a ses propres horaires (heure_debut et heure_fin) définis dans le tableau 'jours'. Tu dois IMPÉRATIVEMENT respecter ces horaires pour chaque jour. Ne JAMAIS programmer d'activités en dehors de la plage horaire définie pour un jour donné.**\n- **IMPORTANT : Si une activité a des jours spécifiques définis dans son champ 'days', cette activité ne peut être programmée QUE sur ces jours. Si le champ 'days' est vide ou absent, l'activité peut être programmée sur n'importe quel jour de la liste des jours concernés.**\n- **IMPORTANT : Si une activité possède à la fois startTime ET endTime définis, cette activité doit être considérée comme un bloc FIXE et ININTERROMPU. Ne JAMAIS découper ce bloc ni insérer d'autres activités pendant cette plage horaire. Ces blocs doivent apparaître tels quels dans le planning final.**\n- Pour les autres activités (sans startTime et endTime fixes), les placer dans les créneaux disponibles restants.\n- Diversifier les activités selon le jour\n- S'il reste du temps dans la journée, ajouter du temps aux activités de priorité 1\n- Si aucune heure de début n'est précisée pour une activité, placer les activités de manière optimale en respectant leur priorité et en évitant les chevauchements.\n- Insérer des pauses entre les blocs de travail pour un bon rythme (sauf pour les blocs fixes).\n- **Le format de sortie doit être strictement du JSON et doit respecter cette structure exacte** :\n  - `schedule` : tableau contenant les événements de la journée.\n  - Chaque objet dans `schedule` doit contenir :\n    - `day` (ex: \"jeudi\")\n    - `start_time` (ex: \"09:30\")\n    - `end_time` (ex: \"10:30\")\n    - `activity` (nom de l'activité)\n    - `description` (courte description de l'activité)\n\n### **Exemple de réponse attendue** :\nNe réponds qu'avec un **JSON brut** sans texte ni explication. \n\n```json\n{\n  \"schedule\": [\n    {\n      \"day\": \"lundi\",\n      \"start_time\": \"08:30\",\n      \"end_time\": \"17:30\",\n      \"activity\": \"Travail\",\n      \"description\": \"Journée de travail complète (bloc fixe, ne pas découper)\"\n    },\n    {\n      \"day\": \"jeudi\",\n      \"start_time\": \"09:30\",\n      \"end_time\": \"10:30\",\n      \"activity\": \"Sport\",\n      \"description\": \"Séance de fitness ou cardio pour garder la forme\"\n    },\n    {\n      \"day\": \"jeudi\",\n      \"start_time\": \"10:30\",\n      \"end_time\": \"12:00\",\n      \"activity\": \"Projets concrets\",\n      \"description\": \"Travailler sur un projet freelance ou personnel\"\n    },\n    {\n      \"day\": \"vendredi\",\n      \"start_time\": \"09:00\",\n      \"end_time\": \"10:30\",\n      \"activity\": \"Apprentissage\",\n      \"description\": \"Étudier une nouvelle langue ou apprendre un concept technique\"\n    }\n  ]\n}\n";

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
