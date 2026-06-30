import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL, authHeaders } from '../apiConfig';
import { useAuth } from '../AuthContext';

// Define the shape of data in the provider
interface InstitutionData {
    profile: any | null;
    notifications: any[];
    events: any[];
    stats: any | null;
    loading: boolean;
}

interface InstitutionDataContextType extends InstitutionData {
    refresh: () => Promise<void>;
}

const InstitutionDataContext = createContext<InstitutionDataContextType | undefined>(undefined);

// ... existing provider logic
export const InstitutionDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const institutionId = user?.institution_id;
    // State is now maintained here, surviving component unmounts
    const [data, setData] = useState<InstitutionData>({ profile: null, notifications: [], events: [], stats: null, loading: true });

    const fetchData = async () => {
        if (!institutionId) return;
        setData(prev => ({ ...prev, loading: true }));
        
        const fetchWithTimeout = async (url: string, timeout = 5000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(url, { ...{ headers: authHeaders() }, signal: controller.signal });
                clearTimeout(id);
                return response;
            } catch (err) {
                clearTimeout(id);
                try { console.error(`[DataProv] Request failed: ${url}`, err instanceof Error ? err.message : String(err)); } catch (_) {}
                return { ok: false, json: async () => null };
            }
        };

        try {
            const [profileRes, notificationsRes, eventsRes, statsRes] = await Promise.all([
                fetchWithTimeout(`${API_BASE_URL}/api/v1/institution/profile/${institutionId}`),
                fetchWithTimeout(`${API_BASE_URL}/api/v1/institution/notifications/${institutionId}`),
                fetchWithTimeout(`${API_BASE_URL}/api/v1/institution/events/${institutionId}`),
                fetchWithTimeout(`${API_BASE_URL}/api/institution/dashboard/stats?institution_id=${institutionId}`),
            ]);

            const profile = profileRes.ok ? await profileRes.json() : null;
            const notifications = notificationsRes.ok ? await notificationsRes.json() : [];
            const events = eventsRes.ok ? await eventsRes.json() : [];
            const stats = statsRes.ok ? await statsRes.json() : null;

            setData({ profile, notifications, events, stats, loading: false });
        } catch (error) {
            try { console.error("Failed to fetch shared institution data:", error instanceof Error ? error.message : String(error)); } catch (_) {}
            setData(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchData();
    }, [institutionId]);

    return (
        <InstitutionDataContext.Provider value={{ ...data, refresh: fetchData }}>
            {children}
        </InstitutionDataContext.Provider>
    );
};

export const useInstitutionData = () => {
    const context = useContext(InstitutionDataContext);
    if (!context) throw new Error('useInstitutionData must be used within InstitutionDataProvider');
    return context;
};

