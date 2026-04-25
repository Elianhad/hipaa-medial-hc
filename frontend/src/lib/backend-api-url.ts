const DEFAULT_BACKEND_API_BASE_URL = 'http://localhost:4000/v1';

export function getBackendApiBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
    return configured && configured.length > 0
        ? configured
        : DEFAULT_BACKEND_API_BASE_URL;
}
