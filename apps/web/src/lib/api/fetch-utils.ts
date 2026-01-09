/**
 * Fetch utilities with authentication support
 */
import { useAuthStore } from '@/stores/auth-store';

/**
 * Fetch with authentication token automatically added
 */
export async function fetchWithAuth(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = useAuthStore.getState().accessToken;
    
    const headers = new Headers(options.headers);
    
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (!headers.has('Content-Type') && options.method && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
        headers.set('Content-Type', 'application/json');
    }
    
    return fetch(url, {
        ...options,
        headers,
    });
}

/**
 * Fetch with auth and automatic JSON parsing
 */
export async function fetchJsonWithAuth<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const res = await fetchWithAuth(url, options);
    
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || `HTTP ${res.status}: ${res.statusText}`);
    }
    
    return res.json();
}
