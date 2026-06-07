import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const GetHiredSection: React.FC = () => {
    const navigate = useNavigate();
    return (
        <section className="w-full relative py-12 lg:py-24 overflow-hidden flex items-center min-h-[400px] lg:min-h-[500px]">
            {/* Background Image Setup */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80&auto=format&fit=crop')",
                }}
            />

            {/* Dark overlay in case image needs to be darkened slightly for better text contrast */}
            <div className="absolute inset-0 z-0 bg-black/20" />

            {/* Main Layout Container */}
            <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-12 lg:px-20 relative z-10 flex flex-col lg:flex-row items-center justify-between">

                {/* Left Side: Title and Button (55% width approx) */}
                <div className="flex flex-col items-start w-full lg:w-[55%]">
                    <h2
                        className="text-white font-bold text-4xl sm:text-6xl lg:text-[4.5rem] leading-[1.1] mb-10 tracking-tight font-poppins"
                    >
                        GET HIRED!<br />
                        IN STARTUP'S
                    </h2>

                    {/* GET STARTED — same shimmer + orb effect as Try Now */}
                    <style>{`
                        @keyframes gs-shimmer {
                            0%   { transform: translateX(-180%) skewX(-20deg); }
                            100% { transform: translateX(300%) skewX(-20deg); }
                        }
                        @keyframes gs-orb1 {
                            0%,100% { transform: translate(0px,0px) scale(1);    opacity: 0.55; }
                            40%     { transform: translate(8px,-6px) scale(1.3);  opacity: 0.9; }
                            70%     { transform: translate(-4px,4px) scale(0.8);  opacity: 0.4; }
                        }
                        @keyframes gs-orb2 {
                            0%,100% { transform: translate(0px,0px) scale(1);     opacity: 0.4; }
                            35%     { transform: translate(-10px,-8px) scale(1.4); opacity: 0.85; }
                            65%     { transform: translate(6px,5px) scale(0.75);   opacity: 0.35; }
                        }
                        @keyframes gs-orb3 {
                            0%,100% { transform: translate(0px,0px) scale(1);    opacity: 0.5; }
                            50%     { transform: translate(6px,8px) scale(1.25);  opacity: 0.9; }
                        }
                        .gs-btn {
                            position: relative;
                            background: #2F6FD6;
                            color: #fff;
                            font-weight: 600;
                            font-size: 17px;
                            letter-spacing: 0.06em;
                            padding: 18px 40px;
                            border-radius: 40px;
                            border: none;
                            cursor: pointer;
                            overflow: hidden;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                            transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
                            box-shadow: 0 8px 24px rgba(47,111,214,0.45), 0 1px 0 rgba(255,255,255,0.12) inset;
                        }
                        .gs-btn::before {
                            content: '';
                            position: absolute;
                            inset: 0;
                            border-radius: 40px;
                            background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 55%);
                            pointer-events: none;
                            z-index: 1;
                        }
                        .gs-btn::after {
                            content: '';
                            position: absolute;
                            top: 0; left: 0;
                            width: 40%; height: 100%;
                            background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.25) 50%, transparent 80%);
                            animation: gs-shimmer 2.8s ease-in-out infinite;
                            pointer-events: none;
                            z-index: 2;
                        }
                        .gs-btn:hover {
                            transform: translateY(-3px) scale(1.03);
                            box-shadow: 0 0 0 5px rgba(47,111,214,0.18), 0 0 32px 10px rgba(47,111,214,0.45), 0 12px 30px rgba(30,80,180,0.5);
                        }
                        .gs-btn:active { transform: scale(0.97); }
                        .gs-orb {
                            position: absolute;
                            border-radius: 50%;
                            pointer-events: none;
                            filter: blur(7px);
                            z-index: 1;
                        }
                        .gs-orb1 { width:28px; height:28px; background: radial-gradient(circle, rgba(160,200,255,0.95), transparent 70%); top:-4px; left:18px; animation: gs-orb1 3.2s ease-in-out infinite; }
                        .gs-orb2 { width:22px; height:22px; background: radial-gradient(circle, rgba(255,255,255,0.8),  transparent 70%); bottom:-2px; right:36px; animation: gs-orb2 4s ease-in-out infinite; }
                        .gs-orb3 { width:18px; height:18px; background: radial-gradient(circle, rgba(100,170,255,0.9),  transparent 70%); top:4px; right:20px;  animation: gs-orb3 2.6s ease-in-out infinite; }
                        .gs-label { position: relative; z-index: 5; }
                    `}</style>

                    <button className="gs-btn" onClick={() => navigate('/opportunities')}>
                        <span className="gs-orb gs-orb1" />
                        <span className="gs-orb gs-orb2" />
                        <span className="gs-orb gs-orb3" />
                        <span className="gs-label">GET STARTED</span>
                    </button>

                </div>

                {/* Fallback for mobile so the glass box stacks naturally instead of overlapping */}
                <div className="block lg:hidden w-full mt-16 pt-0 relative z-20">
                    <GlassCard isMobile />
                </div>

                {/* Right Side: Comparison Glass Box (Floating absolutely per instructions) */}
                <div className="hidden lg:block absolute right-[8%] top-1/2 -translate-y-1/2 w-[45%] max-w-[650px] z-20">
                    <GlassCard />
                </div>
            </div>

            {/* Bottom bar for stipend, startup hirings, and success rate */}
            <div className="hidden lg:grid w-full absolute left-1/2 -translate-x-1/2 bottom-12 z-30 pointer-events-none grid-cols-3 items-center max-w-[1400px] px-6 sm:px-12 lg:px-20">
                <div className="text-white text-xl font-bold pointer-events-auto text-left tracking-wide">
                    <span className="text-blue-400">#</span> Tech
                </div>
                <div className="text-white text-xl font-bold pointer-events-auto text-center tracking-wide" style={{fontFamily: "'Poppins', sans-serif"}}>
                    <span className="text-pink-400">#</span> Business
                </div>
                <div className="text-white text-xl font-bold pointer-events-auto text-right tracking-wide" style={{fontFamily: "'Poppins', sans-serif"}}>
                    <span className="text-amber-400">#</span> Creative
                </div>
            </div>
        </section>
    );
};

const GlassCard: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
    return (
        <div
            className={`w-full ${isMobile ? 'p-8 rounded-[20px]' : 'p-[40px] rounded-[20px]'}`}
            style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                backdropFilter: 'blur(2px)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
        >
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-[40px] sm:gap-[0px] relative">

                {/* MNC Column */}
                <div className="flex flex-col sm:pr-[40px]">
                    <h3 className="text-white font-bold text-2xl tracking-wide uppercase mb-[24px]">MNC</h3>
                    <ul className="flex flex-col gap-4">
                        {[
                            'Structured Growth',
                            'Global Exposure',
                            'Tiered Authority'
                        ].map((item, idx) => (
                            <li key={idx} className="flex items-center gap-3 text-white font-medium text-[16px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* STARTUPS Column */}
                <div className="flex flex-col sm:pl-[40px] sm:border-l-2 border-[#8B5CF6]/40 relative pt-[24px] sm:pt-0 border-t-2 sm:border-t-0">
                    <h3 className="text-[#D4BFFF] font-bold text-2xl tracking-wide uppercase mb-[24px] relative z-10">STARTUPS</h3>
                    <ul className="flex flex-col gap-4">
                        {[
                            'Rapid Execution',
                            'Dynamic Roles',
                            'High Ownership'
                        ].map((item, idx) => (
                            <li key={idx} className="flex items-center gap-3 text-white font-medium text-[16px] relative z-10">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#A88CFF] flex-shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>

                    {/* Subtle glow effect behind the startups text */}
                    <div className="absolute top-10 right-10 w-32 h-32 bg-[#A88CFF]/10 rounded-full blur-3xl pointer-events-none" />
                </div>
            </div>
        </div>
    );
};

export default GetHiredSection;
