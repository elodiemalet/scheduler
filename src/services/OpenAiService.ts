import OpenAI from "openai";

const openAiService = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// function to generate a weekly planning
export async function generateWeeklyPlanning(userJson: string) {

    const response = await openAiService.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": "Génère un emploi du temps structuré au format JSON en respectant les contraintes suivantes :\n\n### Données en entrée :\nUne liste de jours avec leurs horaires :\n- `jours` : tableau d'objets contenant pour chaque jour :\n  - `jour` : nom du jour (ex: \"lundi\", \"mardi\"...)\n  - `heure_debut` : heure de début pour ce jour (ex: \"08:30\")\n  - `heure_fin` : heure de fin pour ce jour (ex: \"17:30\")\n\nUne liste d'activités avec les paramètres suivants :\n- Nom de l'activité\n- Priorité (1 = très important, 3 = moins important)\n- Temps à passer en heures ou en pourcentage de la journée (optionnel)\n- Heure de début (startTime) et de fin (endTime) définies (optionnel)\n- Liste des jours concernés (days) - spécifique à l'activité\n\n### Contraintes :\n- **IMPORTANT : Chaque jour a ses propres horaires (heure_debut et heure_fin) définis dans le tableau 'jours'. Tu dois IMPÉRATIVEMENT respecter ces horaires pour chaque jour. Ne JAMAIS programmer d'activités en dehors de la plage horaire définie pour un jour donné.**\n- **IMPORTANT : Si une activité a des jours spécifiques définis dans son champ 'days', cette activité ne peut être programmée QUE sur ces jours. Si le champ 'days' est vide ou absent, l'activité peut être programmée sur n'importe quel jour de la liste des jours concernés.**\n- **IMPORTANT : Si une activité possède à la fois startTime ET endTime définis, cette activité doit être considérée comme un bloc FIXE et ININTERROMPU. Ne JAMAIS découper ce bloc ni insérer d'autres activités pendant cette plage horaire. Ces blocs doivent apparaître tels quels dans le planning final.**\n- Pour les autres activités (sans startTime et endTime fixes), les placer dans les créneaux disponibles restants.\n- Diversifier les activités selon le jour\n- S'il reste du temps dans la journée, ajouter du temps aux activités de priorité 1\n- Si aucune heure de début n'est précisée pour une activité, placer les activités de manière optimale en respectant leur priorité et en évitant les chevauchements.\n- Insérer des pauses entre les blocs de travail pour un bon rythme (sauf pour les blocs fixes).\n- **Le format de sortie doit être strictement du JSON et doit respecter cette structure exacte** :\n  - `schedule` : tableau contenant les événements de la journée.\n  - Chaque objet dans `schedule` doit contenir :\n    - `day` (ex: \"jeudi\")\n    - `start_time` (ex: \"09:30\")\n    - `end_time` (ex: \"10:30\")\n    - `activity` (nom de l'activité)\n    - `description` (courte description de l'activité)\n\n### **Exemple de réponse attendue** :\nNe réponds qu'avec un **JSON brut** sans texte ni explication. \n\n```json\n{\n  \"schedule\": [\n    {\n      \"day\": \"lundi\",\n      \"start_time\": \"08:30\",\n      \"end_time\": \"17:30\",\n      \"activity\": \"Travail\",\n      \"description\": \"Journée de travail complète (bloc fixe, ne pas découper)\"\n    },\n    {\n      \"day\": \"jeudi\",\n      \"start_time\": \"09:30\",\n      \"end_time\": \"10:30\",\n      \"activity\": \"Sport\",\n      \"description\": \"Séance de fitness ou cardio pour garder la forme\"\n    },\n    {\n      \"day\": \"jeudi\",\n      \"start_time\": \"10:30\",\n      \"end_time\": \"12:00\",\n      \"activity\": \"Projets concrets\",\n      \"description\": \"Travailler sur un projet freelance ou personnel\"\n    },\n    {\n      \"day\": \"vendredi\",\n      \"start_time\": \"09:00\",\n      \"end_time\": \"10:30\",\n      \"activity\": \"Apprentissage\",\n      \"description\": \"Étudier une nouvelle langue ou apprendre un concept technique\"\n    }\n  ]\n}\n"
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "text": userJson,
                        "type": "text"
                    }
                ]
            },
        ],
        response_format: {
            "type": "json_object"
        },
        temperature: 1,
        max_completion_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    });

    return response.choices[0].message.content;
}