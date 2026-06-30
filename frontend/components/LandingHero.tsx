
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const words = ['doing', 'building', 'coding', 'solving', 'creating'];

// --- Sub-components for Visuals ---

const GridLine = ({ className = "" }: { className?: string }) => (
    <div className={`absolute left-0 right-0 h-[1.5px] bg-gray-300/60 pointer-events-none z-0 ${className}`}>
        <div className="flex justify-evenly w-full h-full">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="w-[1.2px] h-3 bg-gray-300 -translate-y-[5.5px]" />
            ))}
        </div>
    </div>
);

const HistogramBars = () => (
    <div className="flex items-end gap-1.5 h-16 relative z-10">
        {[0.4, 0.6, 0.8, 0.5, 0.9, 0.7].map((h, i) => (
            <motion.div
                key={i}
                className={`w-3 rounded-t-sm ${i < 3 ? 'bg-purple-200' : 'bg-gray-100'}`}
                initial={{ height: 0 }}
                animate={{ height: `${h * 100}%` }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: i * 0.15,
                    ease: "easeInOut"
                }}
            />
        ))}
    </div>
);



const ScatterDots = () => (
    <div className="relative w-40 h-24 z-10">
        {[...Array(18)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-orange-400/40"
                initial={{
                    x: Math.random() * 20,
                    y: Math.random() * 80,
                    opacity: 0
                }}
                animate={{
                    x: (Math.random() * 80) + 40,
                    y: (Math.random() * 60),
                    opacity: [0, 1, 0]
                }}
                transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                }}
            />
        ))}
    </div>
);

// --- Main Hero ---

const LandingHero: React.FC = () => {
    const navigate = useNavigate();
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % words.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-[90vh] flex flex-col items-center justify-center bg-white px-6 relative overflow-hidden">

            {/* Headline Group */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-7xl gap-4 md:gap-6">

                {/* Row 1: Learn + Decor */}
                <div className="flex items-center justify-center w-full relative">
                    <div className="relative flex items-center gap-6 md:gap-10 px-8 group">
                        {/* Grid Line - Attached to the text container width */}
                        <div className="absolute left-0 right-0 bottom-[20px] h-[1.5px] bg-gray-400/80 z-0 opacity-80">
                            <div className="flex justify-evenly w-full h-full px-2">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="w-[1.2px] h-2.5 bg-gray-400 -translate-y-[4.5px]" />
                                ))}
                            </div>
                        </div>

                        {/* Left Decor: Histogram */}
                        <div className="hidden lg:flex items-end mb-4 relative z-20">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute -top-14 left-6 bg-purple-500 text-white text-[11px] px-2.5 py-1 rounded-md shadow-lg z-20 font-bold"
                            >
                                71%
                            </motion.div>
                            <div className="border-l-[1.5px] border-dashed border-gray-300 h-24 absolute left-4 -top-8 z-0" />
                            <HistogramBars />
                            <motion.div
                                animate={{ y: [-5, 40, -5] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute left-[9px] top-6 w-5 h-5 bg-white border-[1.5px] border-black rounded-full flex items-center justify-center shadow-xl z-30"
                            >
                                <div className="flex gap-[1.5px] items-center">
                                    <div className="w-[1.5px] h-2 bg-black" />
                                    <div className="w-[1.5px] h-2 bg-black" />
                                </div>
                            </motion.div>
                        </div>

                        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[110px] xl:text-[140px] font-['Poppins'] font-bold text-black leading-none tracking-tight relative z-20">
                            Learn
                        </h1>

                        {/* Right Decor: Scatter */}
                        <div className="hidden lg:block mb-4 relative z-20">
                            <ScatterDots />
                            <motion.div
                                className="absolute top-8 left-0 w-4 h-4 bg-orange-500 rounded-full shadow-lg z-30"
                                animate={{ x: [0, 80, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div
                                className="absolute top-8 left-32 w-4 h-4 bg-orange-500 rounded-full shadow-lg z-30"
                                animate={{ scale: [1, 1.25, 1] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            />
                            <div className="absolute top-[41px] left-4 w-32 h-[1.5px] bg-orange-100 z-10" />
                        </div>
                    </div>
                </div>

                {/* Row 2: by + doing + Decor */}
                <div className="flex items-center justify-center w-full relative">
                    <div className="relative flex items-center px-6 sm:px-12 group">
                        {/* Grid Line - Attached to the text container width */}
                        <div className="absolute left-0 right-0 bottom-[30px] sm:bottom-[43px] h-[1.5px] bg-gray-400/80 z-0 opacity-80">
                            <div className="flex justify-evenly w-full h-full px-2">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="w-[1.2px] h-2.5 bg-gray-400 -translate-y-[4.5px]" />
                                ))}
                            </div>
                        </div>

                        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[110px] xl:text-[140px] font-['Poppins'] font-bold text-black leading-[1.1] tracking-tight flex items-center relative z-20 pb-4">
                            <span>by&nbsp;</span>
                            <span className="relative inline-block min-w-[140px] sm:min-w-[220px] md:min-w-[300px] lg:min-w-[350px] xl:min-w-[580px]">
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={words[index]}
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -40 }}
                                        transition={{
                                            duration: 0.6,
                                            ease: [0.16, 1, 0.3, 1]
                                        }}
                                        className="absolute inset-0 text-black appearance-none z-30"
                                    >
                                        {words[index]}
                                    </motion.span>
                                </AnimatePresence>
                                <span className="invisible">{words[index]}</span>
                            </span>
                        </h1>

                        {/* Blue Curve Decor */}
                        <div className="absolute right-[-15%] bottom-[-20px] hidden xl:block z-20">
                            <div className="relative">
                                <svg width="160" height="100" viewBox="0 0 160 100" className="opacity-40">
                                    <path d="M0 80 Q 40 0, 80 80 T 160 80" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 6" />
                                </svg>
                                <motion.div
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        boxShadow: ["0 0 0px rgba(59,130,246,0.3)", "0 0 30px rgba(59,130,246,0.6)", "0 0 0px rgba(59,130,246,0.3)"]
                                    }}
                                    transition={{ duration: 2.5, repeat: Infinity }}
                                    className="absolute bottom-[25px] right-2 w-7 h-7 bg-blue-500 rounded-full border-[3px] border-white shadow-2xl z-30"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 3: CTA Button */}
                <div className="relative flex flex-col items-center pt-2 md:pt-4 mb-32 z-20">

                    <style>{`
                        @keyframes btn-shimmer {
                            0%   { transform: translateX(-180%) skewX(-20deg); }
                            100% { transform: translateX(300%) skewX(-20deg); }
                        }
                        @keyframes orb1-float {
                            0%,100% { transform: translate(0px, 0px) scale(1);   opacity: 0.55; }
                            40%     { transform: translate(8px, -6px) scale(1.3); opacity: 0.9; }
                            70%     { transform: translate(-4px, 4px) scale(0.8); opacity: 0.4; }
                        }
                        @keyframes orb2-float {
                            0%,100% { transform: translate(0px, 0px) scale(1);    opacity: 0.4; }
                            35%     { transform: translate(-10px, -8px) scale(1.4); opacity: 0.85; }
                            65%     { transform: translate(6px, 5px) scale(0.75);  opacity: 0.35; }
                        }
                        @keyframes orb3-float {
                            0%,100% { transform: translate(0px, 0px) scale(1);   opacity: 0.5; }
                            50%     { transform: translate(6px, 8px) scale(1.25); opacity: 0.9; }
                        }

                        .trynow-btn {
                            position: relative;
                            display: inline-flex;
                            align-items: center;
                            gap: 10px;
                            padding: 18px 52px;
                            font-size: 17px;
                            font-family: 'Poppins', sans-serif;
                            font-weight: 700;
                            letter-spacing: 0.04em;
                            color: #fff;
                            background: #7c3aed;
                            border: none;
                            border-radius: 9999px;
                            cursor: pointer;
                            outline: none;
                            overflow: hidden;
                            transition:
                                transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                                box-shadow 0.3s ease,
                                background 0.3s ease;
                            box-shadow:
                                0 4px 20px rgba(124,58,237,0.35),
                                0 1px 0 rgba(255,255,255,0.12) inset;
                            z-index: 30;
                        }

                        /* Top glass sheen */
                        .trynow-btn::before {
                            content: '';
                            position: absolute;
                            inset: 0;
                            border-radius: 9999px;
                            background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 55%);
                            pointer-events: none;
                            z-index: 1;
                        }

                        /* Continuous shimmer sweep */
                        .trynow-btn::after {
                            content: '';
                            position: absolute;
                            top: 0; left: 0;
                            width: 40%;
                            height: 100%;
                            background: linear-gradient(
                                110deg,
                                transparent 20%,
                                rgba(255,255,255,0.22) 50%,
                                transparent 80%
                            );
                            animation: btn-shimmer 2.8s ease-in-out infinite;
                            pointer-events: none;
                            z-index: 2;
                        }

                        /* Floating inner orbs */
                        .trynow-orb {
                            position: absolute;
                            border-radius: 50%;
                            pointer-events: none;
                            filter: blur(7px);
                            z-index: 1;
                        }
                        .trynow-orb1 {
                            width: 28px; height: 28px;
                            background: radial-gradient(circle, rgba(196,168,255,0.95), transparent 70%);
                            top: -4px; left: 18px;
                            animation: orb1-float 3.2s ease-in-out infinite;
                        }
                        .trynow-orb2 {
                            width: 22px; height: 22px;
                            background: radial-gradient(circle, rgba(255,255,255,0.8), transparent 70%);
                            bottom: -2px; right: 52px;
                            animation: orb2-float 4s ease-in-out infinite;
                        }
                        .trynow-orb3 {
                            width: 18px; height: 18px;
                            background: radial-gradient(circle, rgba(167,139,250,0.9), transparent 70%);
                            top: 4px; right: 24px;
                            animation: orb3-float 2.6s ease-in-out infinite;
                        }

                        .trynow-btn:hover {
                            background: #6d28d9;
                            transform: translateY(-3px) scale(1.035);
                            box-shadow:
                                0 0 0 6px rgba(139,92,246,0.15),
                                0 0 40px 12px rgba(139,92,246,0.45),
                                0 16px 40px rgba(109,40,217,0.5),
                                0 1px 0 rgba(255,255,255,0.15) inset;
                        }
                        .trynow-btn:active {
                            transform: translateY(0px) scale(0.97);
                        }
                        .trynow-btn .arrow-icon {
                            display: flex;
                            align-items: center;
                            transition: transform 0.25s ease;
                            position: relative;
                            z-index: 5;
                        }
                        .trynow-btn:hover .arrow-icon {
                            transform: translateX(5px);
                        }
                        .trynow-label {
                            position: relative;
                            z-index: 5;
                        }
                        .trynow-glow {
                            position: absolute;
                            width: 240px; height: 60px;
                            border-radius: 50%;
                            background: radial-gradient(ellipse, rgba(139,92,246,0.0) 0%, transparent 80%);
                            filter: blur(20px);
                            bottom: -16px; left: 50%;
                            transform: translateX(-50%);
                            pointer-events: none;
                            transition: background 0.35s ease;
                            z-index: 0;
                        }
                        .trynow-wrap:hover .trynow-glow {
                            background: radial-gradient(ellipse, rgba(139,92,246,0.65) 0%, transparent 80%);
                        }
                    `}</style>

                    <div className="trynow-wrap relative flex flex-col sm:flex-row gap-6">
                        <div className="trynow-glow" />
                        <button
                            className="trynow-btn"
                            onClick={() => navigate('/signup?role=student')}
                        >
                            <span className="trynow-orb trynow-orb1" />
                            <span className="trynow-orb trynow-orb2" />
                            <span className="trynow-orb trynow-orb3" />

                            <span className="trynow-label">For Students</span>
                            <span className="arrow-icon">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M4 10h12M11 5l5 5-5 5"
                                        stroke="white" strokeWidth="2.2"
                                        strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </button>

                        <button
                            className="trynow-btn !bg-white !text-[#7c3aed] border-2 border-[#7c3aed] shadow-xl hover:!bg-[#f5f3ff]"
                            onClick={() => navigate('/signup?role=institution')}
                        >
                            <span className="trynow-label">For Institutions</span>
                            <span className="arrow-icon">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M4 10h12M11 5l5 5-5 5"
                                        stroke="#7c3aed" strokeWidth="2.2"
                                        strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LandingHero;

