import React from 'react';
import { motion } from 'framer-motion';

interface AuthCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    /** Tailwind max-width class. Defaults to max-w-lg for standard forms.
     *  Pass 'max-w-2xl' or 'max-w-3xl' for institution / wide forms. */
    maxWidth?: string;
    className?: string;
    transparent?: boolean;
    /** Reduces internal padding for tighter layouts */
    compact?: boolean;
}

const AuthCard: React.FC<AuthCardProps> = ({
    title,
    subtitle,
    children,
    maxWidth = 'max-w-lg',
    className = 'w-full',
    transparent = false,
    compact = false,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={[
                'relative rounded-3xl w-full overflow-visible',
                maxWidth,
                transparent
                    ? 'bg-transparent border-none shadow-none p-0'
                    : `shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 ${compact ? 'p-4 sm:p-6' : 'p-6 sm:p-8 lg:p-10'} backdrop-blur-sm bg-white/95`,
                className,
            ].join(' ')}
        >
            <div className="mb-8 text-center">
                <h1 className="text-2xl lg:text-3xl font-black text-purple-600 tracking-tighter uppercase">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
                )}
            </div>
            {children}
        </motion.div>
    );
};

export default AuthCard;

