type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: RequestBody<Record<string, string> | string>;
}

export type RequestBody<T> = {
    body: T;
};


export interface ApiServiceInterface {
    get<Res>(endpoint: string, headers?: Record<string, string> | undefined): Promise<Res>;

    post<Req, Res>(endpoint: string, data: Req, headers?: Record<string, string> | undefined): Promise<Res>;

    put<Req, Res>(endpoint: string, data: Req, headers?: Record<string, string> | undefined): Promise<Res>;

    patch<Req, Res>(endpoint: string, data: Req, headers?: Record<string, string> | undefined): Promise<Res>;

    delete<Req, Res>(endpoint: string, data: Req, headers?: Record<string, string> | undefined): Promise<Res>;
}

export class ApiService {
    private baseUrl: string;

    constructor(baseUrl: string | undefined = undefined) {
        this.baseUrl = baseUrl || process.env.API_URL || 'http://localhost:3000';
    }

    private buildUrl(endpoint: string) {
        return `${this.baseUrl}${endpoint}`;
    }

    async request<Res>(endpoint: string, options: RequestOptions = {}): Promise<Res> {
        const url = this.buildUrl(endpoint);
        const {method = 'GET', headers = {}, body} = options;
        const requestBody: RequestBody<Record<string, string> | string> | undefined = body ? body : undefined;
        let contentBody: string | undefined = undefined;

        const contentType = options?.headers?.['Content-Type'] || 'application/json';
        if (typeof body !== 'undefined' && body !== null) {
            if (contentType === 'application/x-www-form-urlencoded') {
                contentBody = new URLSearchParams(requestBody as Record<string, string>).toString();
            } else if (contentType === 'application/json') {
                contentBody = JSON.stringify(body);
            }
        }

        const defaultHeaders = {
            'Content-Type': contentType,
            ...headers,
        };

        try {
            const response = await fetch(url, {
                method,
                headers: defaultHeaders,
                body: contentBody,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }

            return (await response.json()) as Res;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    public async get<Res>(endpoint: string, headers?: Record<string, string>): Promise<Res> {
        return this.request<Res>(endpoint, {
            method: 'GET',
            headers: headers
        });
    }

    public async put<Req, Res>(endpoint: string, data: Req, headers?: Record<string, string>): Promise<Res> {

        return this.request<Res>(endpoint, {
            method: 'POST',
            body: data as RequestBody<Record<string, string> | string>,
            headers: headers,
        });
    }

    public async post<Req, Res>(endpoint: string, data: Req, headers?: Record<string, string>): Promise<Res> {

        return this.request<Res>(endpoint, {
            method: 'POST',
            body: data as RequestBody<Record<string, string> | string>,
            headers: headers,
        });
    }

    public async patch<Req, Res>(endpoint: string, data: Req, headers?: Record<string, string>): Promise<Res> {
        return this.request<Res>(endpoint, {
            method: 'PATCH',
            body: data as RequestBody<Record<string, string> | string>,
            headers: headers,
        });
    }

    public async delete<Req, Res>(endpoint: string, data: Req, headers?: Record<string, string>): Promise<Res> {
        return this.request<Res>(endpoint, {
            method: 'DELETE',
            body: data as RequestBody<Record<string, string> | string>,
            headers: headers,
        });
    }
}

export const apiService = new ApiService();
