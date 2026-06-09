
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LoginForm from '../components/LoginForm';
import SignupForm from '../components/SignupForm';

const LoginBranding = lazy(() => import('../components/LoginBranding'));
const SignupBranding = lazy(() => import('../components/SignupBranding'));

const UnifiedAuth: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(location.pathname === '/login');
    const [isMobileView, setIsMobileView] = useState(() => window.innerWidth < 1024);

    useEffect(() => {
        setIsLogin(location.pathname === '/login');
    }, [location.pathname]);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)');
        const onChange = (ev: MediaQueryListEvent) => setIsMobileView(ev.matches);
        setIsMobileView(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const handleToggle = () => {
        const newIsLogin = !isLogin;
        setIsLogin(newIsLogin);
        navigate({
            pathname: newIsLogin ? '/login' : '/signup',
            search: location.search
        });
    };

    return (
        <AuthLayout
            fullWidth={true}
            creatureVariant={isLogin ? 'purple' : 'indigo'}
        >
            <div className="w-full max-w-[1100px] flex items-center justify-center py-4 sm:py-8">
                {/* 
                    The Stage: Fixed Height to fit 100% zoom (Reduced)
                */}
                <div className="w-full min-h-[620px] max-h-[700px] h-[75vh] relative bg-white/5 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl backdrop-blur-3xl flex flex-col lg:flex-row">

                    {/* Background Layers (Fixed Content) */}
                    <div className="flex-1 flex flex-col lg:flex-row w-full h-full relative z-10">
                        <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-6 lg:p-10">
                            {isLogin ? (
                                <Suspense fallback={<div className="w-full h-40" />}>
                                    <LoginBranding />
                                </Suspense>
                            ) : (
                                <div className="w-full h-full opacity-20" />
                            )}
                        </div>
                        <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-6 lg:p-10">
                            {!isLogin ? (
                                <Suspense fallback={<div className="w-full h-40" />}>
                                    <SignupBranding />
                                </Suspense>
                            ) : (
                                <div className="w-full h-full opacity-20" />
                            )}
                        </div>
                    </div>

                    {/* THE SLIDING BOX CONTAINER */}
                    {!isMobileView ? (
                        <motion.div
                            initial={false}
                            animate={{
                                x: isLogin ? '100%' : '0%',
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 90,
                                damping: 20,
                                mass: 0.8
                            }}
                            className="absolute top-0 left-0 w-1/2 h-full z-50 p-4 pointer-events-none items-center justify-center flex"
                        >
                            {/* The High-End Box */}
                            <div className="w-full h-full bg-white rounded-[32px] shadow-[-10px_0_50px_rgba(0,0,0,0.2)] pointer-events-auto flex items-center justify-center p-6 lg:p-10 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={isLogin ? 'login' : 'signup'}
                                        initial={{ opacity: 0, x: isLogin ? -30 : 30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: isLogin ? 30 : -30 }}
                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                        className="w-full"
                                    >
                                        {isLogin ? (
                                            <LoginForm onSwitchToSignup={handleToggle} transparent={true} />
                                        ) : (
                                            <SignupForm onSwitchToLogin={handleToggle} transparent={true} />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="absolute inset-0 z-[60] p-4 flex items-center justify-center bg-transparent">
                            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
                                <AnimatePresence mode="wait">
                                    {isLogin ? (
                                        <LoginForm onSwitchToSignup={handleToggle} />
                                    ) : (
                                        <SignupForm onSwitchToLogin={handleToggle} />
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthLayout>
    );
};

export default UnifiedAuth;

