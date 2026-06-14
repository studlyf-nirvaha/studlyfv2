/**
 * FRONTEND SECURITY FIXES
 * Replace localStorage JWT usage with httpOnly cookies
 * Production-ready authentication context
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  institution_id: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * SECURE AUTH CONTEXT
 * - Uses httpOnly cookies (not accessible to JavaScript)
 * - Tokens sent via cookies, not localStorage
 * - Secure, HttpOnly, SameSite flags set by backend
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.yourdomain.com';

  // ✓ Verify HTTPS in production
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      if (!API_BASE_URL.startsWith('https://')) {
        throw new Error('API_BASE_URL must use HTTPS in production');
      }
    }
  }, []);

  /**
   * LOGIN - Tokens sent via httpOnly cookies
   * Backend sets secure cookies automatically
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // ✓ Validate email format before sending
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // POST to login endpoint
      // httpOnly cookies automatically set by backend
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // ✓ CRITICAL: Send/receive cookies
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      // Set user (but NOT tokens - they're in httpOnly cookies)
      setUser(data.user);

      // ✓ NO localStorage.setItem('token') - cookies handle it!

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  /**
   * LOGOUT - Clear httpOnly cookies
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      // POST to logout endpoint
      // Backend clears cookies
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      setUser(null);
      setError(null);

      // ✓ NO localStorage.removeItem() - cookies auto-cleared!

    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  /**
   * REFRESH TOKEN - Get new access token
   * Called when token expires or on app load
   */
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        credentials: 'include', // ✓ Include refresh token cookie
      });

      if (!response.ok) {
        // Token refresh failed - user needs to login again
        setUser(null);
        throw new Error('Session expired');
      }

      // New access token cookie set automatically by backend

    } catch (err) {
      setUser(null);
      setError('Session expired');
    }
  }, [API_BASE_URL]);

  /**
   * VERIFY SESSION - Check if user still logged in
   * Called on app mount
   */
  useEffect(() => {
    const verifySession = async () => {
      try {
        setIsLoading(true);

        // GET current user (credentials cookie sent automatically)
        const response = await fetch(`${API_BASE_URL}/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [API_BASE_URL]);

  // ✓ NO console.log with sensitive data in production
  if (process.env.NODE_ENV === 'development') {
    // console.log('Auth state:', { user, isAuthenticated: !!user });
  }

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
