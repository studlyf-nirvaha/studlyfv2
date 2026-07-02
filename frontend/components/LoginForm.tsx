
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthCard from './AuthCard';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../apiConfig';
import TermsOverlay from './TermsOverlay';

interface LoginFormProps {
    onSwitchToSignup: () => void;
    transparent?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup, transparent = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const selectedRole = queryParams.get('role') || 'student';
    const next = queryParams.get('next');
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [verificationEmail, setVerificationEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const emailClean = email.trim().toLowerCase();
        const passwordClean = password.trim();
        if (!emailClean) {
            setError('Email is required.');
            return;
        }
        if (!passwordClean) {
            setError('Password is required.');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailClean, password: passwordClean })
            });

            const data = await response.json();

            if (response.ok) {
                login(data.access_token, data.user);

                // If we were deep-linked into a page, return there after auth.
                if (next && next.startsWith('/')) {
                    // Ignore opportunity deep-links for post-login landing and prefer dashboard
                    if (next.startsWith('/opportunities')) {
                        navigate('/dashboard/learner', { replace: true });
                    } else {
                        navigate(next, { replace: true });
                    }
                    return;
                }

                // Default redirect based on role
                if (data.user.role === 'super_admin' || data.user.role === 'admin') navigate('/admin', { replace: true });
                else if (data.user.role === 'institution') navigate('/institution-dashboard?post=true', { replace: true });
                else if (data.user.role === 'judge') navigate('/judge-portal', { replace: true });
                else navigate('/dashboard/learner', { replace: true });
            } else {
                const detail = data.detail || 'Login failed. Please check your credentials.';
                setError(detail);
                if (detail.toLowerCase().includes('verify your email')) {
                    setVerificationEmail(emailClean);
                }
            }
        } catch (err: any) {
            setError('Connection error. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        const targetEmail = (verificationEmail || email).trim().toLowerCase();
        if (!targetEmail) {
            setError('Enter your email first to resend the verification link.');
            return;
        }

        setResendLoading(true);
        setResendMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail }),
            });

            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                setResendMessage(data.message || 'Verification link sent. Check your inbox.');
            } else {
                setError(data.detail || 'Unable to resend verification link.');
            }
        } catch {
            setError('Connection error while resending the verification link.');
        } finally {
            setResendLoading(false);
        }
    };

    const inputClasses = "w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-200 outline-none text-gray-900 placeholder-gray-400 text-sm mb-1";
    const labelClasses = "block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

    return (
        <AuthCard title="Welcome Back" maxWidth="max-w-[450px]" transparent={transparent}>
            <div className="relative overflow-visible">
                <AnimatePresence>
                    {showTerms && <TermsOverlay onClose={() => setShowTerms(false)} />}
                </AnimatePresence>
                <form onSubmit={handleLogin} className="space-y-2.5">
                {error && (
                    <div className="p-3 bg-red-50 text-red-500 text-xs rounded-lg border border-red-100 space-y-3">
                        {error}
                        {error.toLowerCase().includes('verify your email') && (
                            <div className="pt-2 border-t border-red-100 flex flex-col gap-2">
                                <p className="text-[10px] text-red-400 font-semibold uppercase tracking-widest">
                                    Didn’t get the email?
                                </p>
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={resendLoading}
                                    className="self-start px-3 py-2 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-60"
                                >
                                    {resendLoading ? 'Sending...' : 'Resend Verification Link'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {resendMessage && (
                    <div className="p-3 bg-green-50 text-green-600 text-xs rounded-lg border border-green-100">
                        {resendMessage}
                    </div>
                )}

                <div>
                     <label className={labelClasses}>Email Address</label>
                     <input
                         type="email"
                         name="email"
                         autoComplete="email"
                         placeholder={selectedRole === 'institution' ? "admin@institution.com" : "shiva@gmail.com"}
                         className={inputClasses}
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         required
                     />
                 </div>

                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className={labelClasses}>Password</label>
                    </div>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className={inputClasses}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-purple-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => navigate('/forgot-password')}
                            className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-purple-600 transition-colors"
                        >
                            Forgot Password?
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes login-shimmer {
                        0%   { transform: translateX(-180%) skewX(-20deg); }
                        100% { transform: translateX(300%) skewX(-20deg); }
                    }
                    .login-btn {
                        position: relative;
                        width: 100%;
                        padding: 14px 0;
                        background: linear-gradient(to right, #7C3AED, #6D28D9);
                        color: #fff;
                        border: none;
                        border-radius: 16px;
                        font-weight: 800;
                        font-size: 11px;
                        letter-spacing: 0.2em;
                        text-transform: uppercase;
                        cursor: pointer;
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease;
                        box-shadow: 0 10px 20px -10px rgba(124,58,237,0.5);
                    }
                    .login-btn::after {
                        content: '';
                        position: absolute;
                        top: 0; left: 0;
                        width: 40%; height: 100%;
                        background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.2) 50%, transparent 80%);
                        animation: login-shimmer 2.5s infinite;
                    }
                    .login-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 15px 30px -10px rgba(124,58,237,0.6);
                    }
                    .login-btn:active { transform: scale(0.98); }
                `}</style>

                <button
                    type="submit"
                    disabled={loading}
                    className="login-btn mt-4"
                >
                    <span className="relative z-10">{loading ? 'Verifying...' : 'Access Dashboard'}</span>
                </button>

                <div className="mt-2 text-center">
                    <p className="text-[11px] text-gray-500">
                        Didn’t receive a verification email?
                        <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resendLoading}
                            className="ml-2 text-purple-600 font-black uppercase tracking-widest text-[10px] hover:underline disabled:opacity-60"
                        >
                            {resendLoading ? 'Sending...' : 'Resend Verification Link'}
                        </button>
                    </p>
                </div>
                </form>
            </div>

            <div className="mt-8 text-center pt-6 border-t border-gray-50">
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                    New to Studlyf?{' '}
                    <button
                        onClick={onSwitchToSignup}
                        className="text-purple-600 hover:text-purple-700 transition-colors ml-1"
                    >
                        Create Account
                    </button>
                </p>
            </div>
        </AuthCard>
    );
};

export default LoginForm;

