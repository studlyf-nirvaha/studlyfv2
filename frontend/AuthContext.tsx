import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from './apiConfig';

export type UserRole = 'super_admin' | 'admin' | 'mentor' | 'hiring_partner' | 'student' | 'institution' | 'judge';

interface User {
    email: string;
    full_name: string;
    role: UserRole;
    user_id: string;
    uid?: string; // Backwards compatibility for Firebase UID format
    displayName?: string;
    photoURL?: string;
    name?: string;
    _id?: string;
    mobile?: string;
    isProfessional?: boolean;
    institution_id?: string;
    institution_name?: string;
    college_name?: string;
    graduation_year?: string;
    status?: string;
    profile_type?: string;
    profilePhoto?: string | null;
}

interface AuthContextType {
    user: User | null;
    role: UserRole | null;
    loading: boolean;
    login: (token: string, userData: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    role: null, 
    loading: true,
    login: () => {},
    logout: () => {},
    updateUser: () => {}
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

    // SECURITY FIX: Removed console.warn that logged role validation failures
    // No debug information leaked to frontend logs
    return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setLoading(false);
            return;
        }

        // Create a controller to abort the fetch if it takes too long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

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
            } else if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('auth_token');
                setUser(null);
                setRole(null);
            }
        } catch (error: unknown) {
            clearTimeout(timeoutId);
            // SECURITY FIX: Removed all console logging
            // - No timeout messages
            // - No error details logged
            // - No error type information
            // Silent failure with graceful degradation
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
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        setUser(null);
        setRole(null);
        window.location.href = '/';
    };

    const updateUser = (updates: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...updates } : prev);
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
