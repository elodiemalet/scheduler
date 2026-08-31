export interface AppEnv {
    mongodbUri: string;
    openaiApiKey: string;
}

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
            openaiApiKey: required('OPENAI_API_KEY'),
        };
    }
    return cached;
}
