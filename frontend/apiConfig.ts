/// <reference types="vite/client" />

const viteEnv = import.meta.env as Record<string, string | undefined>;

function resolveDefaultApiBaseUrl(): string {
    // Return empty string for local dev so requests like /api/... use the Vite proxy
    return ''; 
}

let resolvedUrl = viteEnv.VITE_API_BASE_URL ??
    viteEnv.VITE_RENDER_EXTERNAL_URL ??
    viteEnv.RENDER_EXTERNAL_URL ??
    viteEnv.API_BASE_URL ??
    resolveDefaultApiBaseUrl();

if (import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) {
    resolvedUrl = resolveDefaultApiBaseUrl();
}

// Request deduplication cache
const inFlightRequests: Record<string, Promise<Response>> = {};

export const deduplicatedFetch = async (url: string, options: RequestInit = {}) => {
    const key = `${options.method || 'GET'}:${url}`;
    
    if (inFlightRequests[key]) {
        return inFlightRequests[key];
    }

    const fetchPromise = fetch(url, options).finally(() => {
        delete inFlightRequests[key];
    });

    inFlightRequests[key] = fetchPromise;
    return fetchPromise;
};

export const API_BASE_URL = resolvedUrl;

export const FRONTEND_URL =
    viteEnv.VITE_FRONTEND_URL ??
    viteEnv.FRONTEND_URL ??
    window.location.origin;

/** Merge with fetch headers so institution / learner JWT routes work after server hardening. */
export function authHeaders(): Record<string, string> {
    const t = localStorage.getItem('auth_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Get raw JWT token for use in query parameters (file download URLs etc). */
export function getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
}

// SECURITY FIX: Removed all console.log and console.warn statements
// Console logs are visible in production and leak sensitive infrastructure information
// Console output removed to prevent information disclosure
