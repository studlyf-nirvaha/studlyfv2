import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from './apiConfig';

export type UserRole = 'super_admin' | 'admin' | 'mentor' | 'hiring_partner' | 'student' | 'institution' | 'judge';

interface User {
    email: string;
    full_name: string;
    name?: string;
    displayName?: string;
    photoURL?: string | null;
    role: UserRole;
    user_id: string;
    _id?: string;
    uid?: string; // Backwards compatibility for Firebase UID format
    institution_id?: string;
    institution_name?: string;
    college_name?: string;
    graduation_year?: string;
    status?: string;
    profile_type?: string;
    profilePhoto?: string | null;
    isProfessional?: boolean;
}

interface AuthContextType {
    user: User | null;
    role: UserRole | null;
    loading: boolean;
    authError: string | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
    retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    role: null, 
    loading: true,
    authError: null,
    login: () => {},
    logout: () => {},
    updateUser: () => {},
    retryAuth: () => {}
});

const USER_ROLES: readonly UserRole[] = [
    'super_admin',
    'admin',
    'mentor',
    'hiring_partner',
    'student',
    'institution',
    'judge'
];

const validateRole = (role: unknown): UserRole | null => {
    if (typeof role === 'string' && USER_ROLES.includes(role as UserRole)) {
        return role as UserRole;
    }

    return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const checkAuth = async (isRetry = false) => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setLoading(false);
            return;
        }

        setAuthError(null);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const userData = await response.json();
                if (userData && userData.user_id) {
                    userData.uid = userData.user_id;
                }
                setUser(userData);
                setRole(validateRole(userData.role));
                setAuthError(null);
            } else if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('auth_token');
                setUser(null);
                setRole(null);
                setAuthError(null);
            } else {
                // Server error (e.g. 500, 502, 404) - do not clear token immediately
                setAuthError("Session verification server issue. Retrying may fix.");
            }
        } catch (error: unknown) {
            clearTimeout(timeoutId);
            if (!isRetry) {
                // Wait 1 second and retry once before concluding network error
                await new Promise(res => setTimeout(res, 1000));
                return checkAuth(true);
            }
            setAuthError("Network connectivity issue. Could not verify session.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('auth_token', token);
        if (userData && userData.user_id) {
            userData.uid = userData.user_id;
        }
        setUser(userData);
        setRole(validateRole(userData.role));
        setAuthError(null);
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        setUser(null);
        setRole(null);
        setAuthError(null);
        window.location.href = '/';
    };

    const updateUser = (updates: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...updates } : prev);
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, authError, login, logout, updateUser, retryAuth: () => checkAuth(false) }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
