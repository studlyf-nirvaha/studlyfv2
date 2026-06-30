'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const companyLogos = [
    // --- FAR LEFT COLUMN (x: 2% | y: 10, 30, 50, 70, 90) ---
    { name: 'Google', fileName: 'google.webp', position: { top: '10%', left: '2%' }, size: 'large', delay: 0 },
    { name: 'Uber', fileName: 'uber.webp', position: { top: '30%', left: '2%' }, size: 'medium', delay: 0.6 },
    { name: 'Adobe', fileName: 'adobe.webp', position: { top: '50%', left: '2%' }, size: 'small', delay: 0.8 },
    { name: 'Airbnb', fileName: 'airbnb.webp', position: { top: '70%', left: '2%' }, size: 'medium', delay: 1.2 },
    { name: 'Intel', fileName: 'intel.webp', position: { top: '90%', left: '2%' }, size: 'small', delay: 1.4 },

    // --- INNER LEFT COLUMN (x: 9% | y: 20, 40, 60, 80) ---
    { name: 'Microsoft', fileName: 'microsoft.webp', position: { top: '20%', left: '9%' }, size: 'medium', delay: 0.2 },
    { name: 'IBM', fileName: 'ibm.webp', position: { top: '40%', left: '9%' }, size: 'large', delay: 1.0 },
    { name: 'Oracle', fileName: 'oracle.webp', position: { top: '60%', left: '9%' }, size: 'medium', delay: 1.6 },
    { name: 'Amazon', fileName: 'amazon.webp', position: { top: '80%', left: '9%' }, size: 'small', delay: 0.4 },

    // --- FAR RIGHT COLUMN (x: 2% | y: 10, 30, 50, 70, 90) ---
    { name: 'Apple', fileName: 'apple.webp', position: { top: '10%', right: '2%' }, size: 'large', delay: 0.1 },
    { name: 'Infosys', fileName: 'infosys.webp', position: { top: '30%', right: '2%' }, size: 'medium', delay: 0.7 },
    { name: 'Tesla', fileName: 'tesla.webp', position: { top: '50%', right: '2%' }, size: 'small', delay: 0.9 },
    { name: 'LinkedIn', fileName: 'linkedin.webp', position: { top: '70%', right: '2%' }, size: 'medium', delay: 1.3 },
    { name: 'NVIDIA', fileName: 'nvidia.webp', position: { top: '90%', right: '2%' }, size: 'small', delay: 1.5 },

    // --- INNER RIGHT COLUMN (x: 9% | y: 20, 40, 60, 80) ---
    { name: 'Meta', fileName: 'meta.webp', position: { top: '20%', right: '9%' }, size: 'medium', delay: 0.3 },
    { name: 'Wipro', fileName: 'wipro.webp', position: { top: '40%', right: '9%' }, size: 'large', delay: 1.1 },
    { name: 'Salesforce', fileName: 'salesforce.webp', position: { top: '60%', right: '9%' }, size: 'medium', delay: 1.7 },
    { name: 'Netflix', fileName: 'netflix.webp', position: { top: '80%', right: '9%' }, size: 'small', delay: 0.5 },

    // --- TOP SHELF (Stay near the ceiling) ---
    { name: 'Stripe', fileName: 'stripe.webp', position: { top: '4%', left: '25%' }, size: 'small', delay: 1.9 },
    { name: 'Flipkart', fileName: 'flipkart.webp', position: { top: '4%', left: '50%' }, size: 'small', delay: 2.3 },
    { name: 'PayPal', fileName: 'paypal.webp', position: { top: '4%', right: '25%' }, size: 'small', delay: 2.1 },

    // --- BOTTOM SHELF (Stay near the floor) ---
    { name: 'TCS', fileName: 'tcs.webp', position: { bottom: '4%', left: '25%' }, size: 'medium', delay: 2.5 },
    { name: 'Accenture', fileName: 'accenture.webp', position: { bottom: '4%', left: '42%' }, size: 'small', delay: 2.7 },
    { name: 'JPMorgan', fileName: 'jpmorgan.webp', position: { bottom: '4%', right: '42%' }, size: 'small', delay: 2.9 },
    { name: 'Goldman Sachs', fileName: 'goldman-sachs.webp', position: { bottom: '4%', right: '25%' }, size: 'small', delay: 3.1 },
];




const getSizeClasses = (size: string) => {
    switch (size) {
        case 'large':
            return 'w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32';
        case 'medium':
            return 'w-20 h-20 md:w-24 md:h-24 lg:w-26 lg:h-26';
        case 'small':
            return 'w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20';
        default:
            return 'w-20 h-20 md:w-24 md:h-24 lg:w-26 lg:h-26';
    }
};

const MentorCredibility: React.FC = () => {
    const [hoveredLogo, setHoveredLogo] = useState<string | null>(null);
    const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 768) {
                setViewport('mobile');
            } else if (width >= 768 && width < 1024) {
                setViewport('tablet');
            } else {
                setViewport('desktop');
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <section className="relative w-full min-h-screen flex flex-col items-center justify-center py-24 overflow-hidden bg-white">
            {/* Ambient Background Gradient Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-100/30 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-100/20 blur-[120px] rounded-full" />
            </div>

            {/* Desktop: Premium Floating Bubbles */}
            {viewport === 'desktop' && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="relative w-full h-full max-w-7xl mx-auto">
                        {companyLogos.map((logo, index) => (
                            <motion.div
                                key={logo.name}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    y: [0, -15, 0],
                                    x: [0, 10, 0]
                                }}
                                transition={{
                                    opacity: { duration: 1, delay: logo.delay },
                                    scale: { duration: 1, delay: logo.delay },
                                    y: {
                                        duration: 5 + Math.random() * 5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: Math.random() * 2
                                    },
                                    x: {
                                        duration: 4 + Math.random() * 4,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: Math.random() * 2
                                    }
                                }}
                                className="absolute pointer-events-auto"
                                style={logo.position}
                                onMouseEnter={() => setHoveredLogo(logo.name)}
                                onMouseLeave={() => setHoveredLogo(null)}
                            >
                                <div
                                    className={`
                                        ${getSizeClasses(logo.size)}
                                        bg-white/40 backdrop-blur-lg rounded-full 
                                        shadow-[0_8px_32px_rgba(0,0,0,0.06)] 
                                        border border-white/80
                                        flex items-center justify-center
                                        transition-all duration-500 ease-out
                                        ${hoveredLogo === logo.name ? 'scale-115 shadow-2xl border-purple-200 z-50' : 'z-10'}
                                        cursor-pointer p-4 group
                                    `}
                                    onClick={() => document.getElementById('enquiry-form')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <img
                                        src={`/images-optimized/${logo.fileName}`}
                                        alt={`${logo.name} logo`}
                                        className="w-full h-full object-contain relative z-10 transition-all duration-500 group-hover:drop-shadow-md"
                                        decoding="async"
                                        loading={index < 8 ? "eager" : "lazy"}
                                        fetchpriority={index < 8 ? "high" : "low"}
                                        style={{
                                            filter: 'grayscale(0%) brightness(1) opacity(1)'
                                        }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Central Content */}
            <div className="relative z-30 max-w-4xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                >
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-block"
                    >
                        <h2 className="text-5xl md:text-7xl font-['Poppins'] font-extrabold text-black mb-6 tracking-tight uppercase leading-[1.1]">
                            OUR MENTORS<br />
                            ARE FROM<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B]">50+ MNCS</span>
                        </h2>
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-['Poppins'] font-medium"
                    >
                        Guided by professionals shaping the world's leading organizations.
                    </motion.p>
                </motion.div>

                {/* Tablet: Bubble Grid */}
                {viewport === 'tablet' && (
                    <div className="mt-20 max-w-5xl mx-auto">
                        <div className="grid grid-cols-4 gap-8">
                            {companyLogos.slice(0, 16).map((logo) => (
                                <motion.div
                                    key={logo.name}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.5 }}
                                    className="flex justify-center"
                                >
                                    <div
                                        className="w-24 h-24 bg-white/60 backdrop-blur-md rounded-full shadow-lg border border-white flex items-center justify-center p-4 cursor-pointer hover:scale-110 transition-transform duration-300"
                                        onClick={() => document.getElementById('enquiry-form')?.scrollIntoView({ behavior: 'smooth' })}
                                    >
                                        <img
                                            src={`/images-optimized/${logo.fileName}`}
                                            alt={logo.name}
                                            className="w-full h-full object-contain"
                                            decoding="async"
                                            loading="lazy"
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mobile: Bubble Grid */}
                {viewport === 'mobile' && (
                    <div className="mt-16 max-w-sm mx-auto px-4">
                        <div className="grid grid-cols-3 gap-6">
                            {companyLogos.slice(0, 12).map((logo) => (
                                <div key={logo.name} className="flex flex-col items-center gap-2">
                                    <div
                                        className="w-20 h-20 bg-white/60 backdrop-blur-md rounded-full shadow-md border border-white flex items-center justify-center p-3 cursor-pointer hover:scale-110 transition-transform duration-300"
                                        onClick={() => document.getElementById('enquiry-form')?.scrollIntoView({ behavior: 'smooth' })}
                                    >
                                        <img
                                            src={`/images-optimized/${logo.fileName}`}
                                            alt={logo.name}
                                            className="w-full h-full object-contain"
                                            decoding="async"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes orbit {
                    from { transform: rotate(0deg) translateX(10px) rotate(0deg); }
                    to { transform: rotate(360deg) translateX(10px) rotate(-360deg); }
                }
                .orbiting {
                    animation: orbit 10s linear infinite;
                }
            ` }} />
        </section>
    );
};

export default MentorCredibility;

