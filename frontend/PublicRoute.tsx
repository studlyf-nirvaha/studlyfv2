import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, role, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return null;
    }

    if (user) {
        console.log("[PublicRoute] User already logged in. Role:", role);
        
        // Allow reset-password page even for authenticated users
        if (location.pathname === '/reset-password') {
            return <>{children}</>;
        }
        
        if (role === 'super_admin' || role === 'admin') {
            return <Navigate to="/admin" replace />;
        }
        if (role === 'hiring_partner') {
            return <Navigate to="/dashboard/partner" replace />;
        }
        if (role === 'institution') {
            return <Navigate to="/institution-dashboard" replace />;
        }
        return <Navigate to="/dashboard/learner" replace />;
    }

    return <>{children}</>;
};

export default PublicRoute;

