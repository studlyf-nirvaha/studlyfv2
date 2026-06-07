import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CARDS = [
    {
        img: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&h=500&fit=crop',
        bg: '#F5F3FF',
        title: 'Cognitive AI<br/>Intelligence',
        desc: 'Master Large Language Models and Generative AI protocols. Build the future of intelligence with clinical precision.'
    },
    {
        img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=500&h=500&fit=crop',
        bg: '#EEF2FF',
        title: 'System Design<br/>Authority',
        desc: 'Architect resilient distributed systems at global scale. Deconstruct complex infrastructures into manageable micro-protocols.'
    },
    {
        img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&h=500&fit=crop',
        bg: '#F0F9FF',
        title: 'Clinical<br/>Verification',
        desc: 'Our AI analyzes your code repository for technical authority. Every commit is a signal of your readiness.'
    },
    {
        img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&h=500&fit=crop',
        bg: '#FDF2F8',
        title: 'Cyber Defense<br/>Protocols',
        desc: 'Defend against advanced persistent threats. Master offensive security and defensive architecture mapping.'
    },
    {
        img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&h=500&fit=crop',
        bg: '#ECFDF5',
        title: 'Cloud Native<br/>Foundry',
        desc: 'Build with Docker, Kubernetes, and Serverless resilience. Deploy your engineering logic to the global edge.'
    },
    {
        img: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?w=500&h=500&fit=crop',
        bg: '#FFF7ED',
        title: 'Product Strategy<br/>Elite',
        desc: 'Bridge the gap between engineering and user-centric strategy. Build products that people actually love to use.'
    },
    {
        img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=500&fit=crop',
        bg: '#F8FAFC',
        title: 'Fullstack Systems<br/>Core',
        desc: 'End-to-end development from low-level systems to polished UIs. The ultimate engineering specialization.'
    },
    {
        img: 'https://images.unsplash.com/photo-1522071823991-b9671f9d7f1f?w=500&h=500&fit=crop',
        bg: '#F1F5F9',
        title: 'Global Hiring<br/>Network',
        desc: 'Direct connections to elite engineering partners worldwide. Your verified skills are the only currency that matters.'
    },
];

const DEFAULT_TITLE = 'Built for<br/>The Next Generation<br/>of Developers';
const DEFAULT_DESC = 'Studlyf bridges the gap between theoretical knowledge and clinical evidence. Deconstruct systems, verify your skills, and unlock 1% engineering roles.';

export const DevHeroSection: React.FC = () => {
    const [title, setTitle] = useState(DEFAULT_TITLE);
    const [desc, setDesc] = useState(DEFAULT_DESC);
    const [hoveredCol, setHoveredCol] = useState<number | null>(null);
    const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

    const colARef = useRef<HTMLDivElement>(null);
    const colBRef = useRef<HTMLDivElement>(null);

    const scrollState = useRef({
        colA: { scrollY: 0, paused: false, direction: 1 }, // Up
        colB: { scrollY: 300, paused: false, direction: -1 }, // Down
    });

    useEffect(() => {
        const SPEED = 0.6;
        let frameId: number;

        const tick = () => {
            const state = scrollState.current;

            [
                { key: 'colA' as const, ref: colARef },
                { key: 'colB' as const, ref: colBRef }
            ].forEach(({ key, ref }) => {
                if (!state[key].paused && ref.current) {
                    const set = ref.current.querySelector('.col-set') as HTMLDivElement;
                    if (set) {
                        const h = set.offsetHeight + 12;

                        state[key].scrollY += (SPEED * state[key].direction);

                        // Handle Loop for both directions
                        if (state[key].direction === 1) {
                            if (state[key].scrollY >= h) state[key].scrollY -= h;
                        } else {
                            if (state[key].scrollY <= 0) state[key].scrollY += h;
                        }

                        ref.current.style.transform = `translateY(-${state[key].scrollY}px)`;
                    }
                }
            });

            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, []);

    const handleMouseOver = (idx: number, colIdx: number) => {
        const key = colIdx === 0 ? 'colA' : 'colB';
        const otherKey = colIdx === 0 ? 'colB' : 'colA';

        scrollState.current[key].paused = true;
        scrollState.current[otherKey].paused = false;

        setHoveredCol(colIdx);
        setFocusedIdx(idx);

        setTitle(CARDS[idx].title);
        setDesc(CARDS[idx].desc);
    };

    const handleMouseOut = () => {
        scrollState.current.colA.paused = false;
        scrollState.current.colB.paused = false;

        setHoveredCol(null);
        setFocusedIdx(null);
        setTitle(DEFAULT_TITLE);
        setDesc(DEFAULT_DESC);
    };

    const colAData = CARDS.filter((_, i) => i % 2 === 0);
    const colBData = CARDS.filter((_, i) => i % 2 === 1);

    return (
        <section className="relative w-full max-w-[1040px] h-[540px] bg-[#f2f2f2] rounded-[24px] overflow-hidden shadow-[0_2px_0_rgba(255,255,255,0.8)_inset,0_20px_60px_rgba(0,0,0,0.14),0_4px_16px_rgba(0,0,0,0.06)] mx-auto my-20 grid grid-cols-1 lg:grid-cols-[52%_48%] font-['Poppins']">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700;900&display=swap');
                
                .card-blur-heavy {
                    filter: blur(8px) brightness(0.82);
                    transform: scale(0.97);
                }
                .card-blur-light {
                    filter: blur(3px) brightness(0.88);
                    transform: scale(0.985);
                }
                .card-focused {
                    filter: none !important;
                    transform: scale(1.03) !important;
                }
                .right-vignette::before,
                .right-vignette::after {
                    content: '';
                    position: absolute;
                    left: 0; right: 0;
                    z-index: 5;
                    pointer-events: none;
                }
                .right-vignette::before {
                    top: 0; height: 80px;
                    background: linear-gradient(to bottom, #f2f2f2 30%, transparent);
                }
                .right-vignette::after {
                    bottom: 0; height: 80px;
                    background: linear-gradient(to top, #f2f2f2 30%, transparent);
                }
                `}
            </style>

            <div className="p-10 sm:p-12 flex flex-col justify-center gap-6">
                <div className="flex flex-col gap-4 min-h-[220px]">
                    <AnimatePresence mode="wait">
                        <motion.h1
                            key={title}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22 }}
                            className="text-[2rem] sm:text-[2.8rem] font-[900] leading-[1.08] text-[#0a0a0a] tracking-[-0.04em]"
                            dangerouslySetInnerHTML={{ __html: title }}
                        />
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={desc}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22, delay: 0.05 }}
                            className="text-[14px] color-[#b0b0b0] leading-[1.6] max-w-[340px] font-normal"
                        >
                            {desc}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>

            <div className="right-vignette relative overflow-hidden" onMouseLeave={handleMouseOut}>
                <div className="flex gap-3 p-3 h-full">
                    {/* Column 1 */}
                    <div ref={colARef} className="flex-1 flex flex-col gap-3 will-change-transform">
                        {[0, 1].map((setIdx) => (
                            <div key={setIdx} className="col-set flex flex-col gap-3">
                                {colAData.map((card, i) => {
                                    const globalIdx = i * 2;
                                    const isFocused = focusedIdx === globalIdx;
                                    const isBlurLight = hoveredCol === 0 && !isFocused;
                                    const isBlurHeavy = hoveredCol === 1;

                                    return (
                                        <div
                                            key={i}
                                            className={`rounded-[16px] overflow-hidden aspect-square cursor-pointer transition-all duration-300 will-change-[filter,transform] flex-shrink-0 ${isFocused ? 'card-focused z-10' :
                                                isBlurHeavy ? 'card-blur-heavy' :
                                                    isBlurLight ? 'card-blur-light' : ''
                                                }`}
                                            style={{ background: card.bg }}
                                            onMouseOver={() => handleMouseOver(globalIdx, 0)}
                                        >
                                            <img src={card.img} alt="" className="w-full h-full object-cover pointer-events-none select-none" />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Column 2 */}
                    <div ref={colBRef} className="flex-1 flex flex-col gap-3 will-change-transform">
                        {[0, 1].map((setIdx) => (
                            <div key={setIdx} className="col-set flex flex-col gap-3">
                                {colBData.map((card, i) => {
                                    const globalIdx = i * 2 + 1;
                                    const isFocused = focusedIdx === globalIdx;
                                    const isBlurLight = hoveredCol === 1 && !isFocused;
                                    const isBlurHeavy = hoveredCol === 0;

                                    return (
                                        <div
                                            key={i}
                                            className={`rounded-[16px] overflow-hidden aspect-square cursor-pointer transition-all duration-300 will-change-[filter,transform] flex-shrink-0 ${isFocused ? 'card-focused z-10' :
                                                isBlurHeavy ? 'card-blur-heavy' :
                                                    isBlurLight ? 'card-blur-light' : ''
                                                }`}
                                            style={{ background: card.bg }}
                                            onMouseOver={() => handleMouseOver(globalIdx, 1)}
                                        >
                                            <img src={card.img} alt="" className="w-full h-full object-cover pointer-events-none select-none" />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
