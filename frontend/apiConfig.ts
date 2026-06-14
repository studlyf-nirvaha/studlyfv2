/// <reference types="vite/client" />

const viteEnv = import.meta.env as Record<string, string | undefined>;

/**
 * Resolve the API base URL:
 *  - Development (localhost): return '' so requests like /api/... use the Vite proxy → localhost:8000
 *  - Production (Hostinger):  return the Render URL baked in at build time via VITE_API_BASE_URL
 */
function resolveApiBaseUrl(): string {
  // Dev: always use proxy (empty base = relative URL)
  if (
    import.meta.env.DEV ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'))
  ) {
    return '';
  }

  // Production: use the Render URL baked in during `vite build`
  return (
    viteEnv.VITE_API_BASE_URL ??
    viteEnv.RENDER_EXTERNAL_URL ??
    ''
  );
}

export const API_BASE_URL = resolveApiBaseUrl();

export const FRONTEND_URL =
  viteEnv.VITE_FRONTEND_URL ??
  viteEnv.FRONTEND_URL ??
  (typeof window !== 'undefined' ? window.location.origin : 'https://www.studlyf.in');

// ── Request deduplication ────────────────────────────────────────────────────
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

/** Merge with fetch headers so institution / learner JWT routes work after server hardening. */
export function authHeaders(): Record<string, string> {
  const t = localStorage.getItem('auth_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}
