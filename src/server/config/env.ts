export interface AppEnv {
    mongodbUri: string;
    llmApiKey: string;
    llmBaseUrl: string;
    llmModel: string;
}

/**
 * Groq : fournisseur d'inférence compatible OpenAI, choisi pour ne pas
 * exposer les données du planning à l'entraînement d'un modèle.
 * Changer de fournisseur ne demande que de redéfinir ces deux variables.
 */
const DEFAULT_LLM_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_LLM_MODEL = 'qwen/qwen3.8-27b';

function required(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback;
    if (!value) {
        throw new Error(
            `Variable d'environnement manquante : ${name}. Voir .env.example.`,
        );
    }
    return value;
}

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
    if (!cached) {
        cached = {
            mongodbUri: required('MONGODB_URI', 'mongodb://localhost:27017/scheduler'),
            llmApiKey: required('LLM_API_KEY'),
            llmBaseUrl: required('LLM_BASE_URL', DEFAULT_LLM_BASE_URL),
            llmModel: required('LLM_MODEL', DEFAULT_LLM_MODEL),
        };
    }
    return cached;
}
