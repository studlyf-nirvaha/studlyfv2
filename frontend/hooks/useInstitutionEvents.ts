import { useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL, authHeaders } from '../apiConfig';
import { useDashboardCache } from '../contexts/DashboardDataContext';

const CACHE_KEY = 'institutionEventsSummary';
const inflight = new Map<string, Promise<any[]>>();

async function fetchEventsSummary(institutionId: string): Promise<any[]> {
    const existing = inflight.get(institutionId);
    if (existing) return existing;

    const promise = fetch(
        `${API_BASE_URL}/api/v1/institution/events/${institutionId}/summary?limit=100`,
        { headers: { ...authHeaders() } },
    )
        .then(async (res) => {
            if (!res.ok) throw new Error(`Events summary failed: ${res.status}`);
            const body = await res.json();
            return Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
        })
        .finally(() => {
            inflight.delete(institutionId);
        });

    inflight.set(institutionId, promise);
    return promise;
}

export function useInstitutionEvents(institutionId?: string) {
    const { cache, setCacheData, isLoading, setLoading } = useDashboardCache();
    const data = (cache[CACHE_KEY] as any[]) || [];
    const loading = isLoading[CACHE_KEY] ?? !cache[CACHE_KEY];
    const fetchedRef = useRef<string | null>(null);

    const refresh = useCallback(async () => {
        if (!institutionId) return;
        setLoading(CACHE_KEY, true);
        try {
            const items = await fetchEventsSummary(institutionId);
            setCacheData(CACHE_KEY, items);
        } catch (err) {
            try {
                console.error('Failed to load institution events:', err instanceof Error ? err.message : String(err));
            } catch (_) {}
        } finally {
            setLoading(CACHE_KEY, false);
        }
    }, [institutionId, setCacheData, setLoading]);

    useEffect(() => {
        if (!institutionId) return;
        if (cache[CACHE_KEY] && fetchedRef.current === institutionId) {
            setLoading(CACHE_KEY, false);
            return;
        }
        fetchedRef.current = institutionId;
        refresh();
    }, [institutionId, cache, refresh, setLoading]);

    return { events: data, loading, refresh };
}
