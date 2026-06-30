
import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

// Define the content data
const items = [
    {
        id: '01',
        title: 'Company-Specific Learning Paths',
        description: 'Master placement preparation through structured learning modules tailored for top companies like Google, Amazon, and Microsoft.',
        image: '/images/company-paths.png',
        bgColor: 'bg-[#0F0A1F]',
        borderColor: 'border-purple-500/30'
    },
    {
        id: '02',
        title: 'AI Mock Interview Simulator',
        description: 'Experience realistic mock interviews designed for top companies with adaptive questioning, behavioral scenarios, and placement-focused preparation.',
        image: '/images/neural-simulator.png',
        bgColor: 'bg-[#0F0A1F]',
        borderColor: 'border-purple-500/30'
    },
    {
        id: '03',
        title: 'AI Career Dreamer',
        description: 'Discover career paths based on your interests, skills, projects, and strengths with intelligent career recommendations and personalized guidance.',
        image: '/images/career-dreamer.png',
        bgColor: 'bg-[#0F0A1F]',
        borderColor: 'border-purple-500/30'
    },
    {
        id: '04',
        title: 'Complete Placement Ecosystem',
        description: 'Everything you need for placements in one platform - learning, mock interviews, career guidance, and structured preparation.',
        image: '/images/placement-ecosystem.png',
        bgColor: 'bg-[#0F0A1F]',
        borderColor: 'border-purple-500/30'
    }
];

const WhatIsStudlyf: React.FC = () => {
    const targetRef = useRef<HTMLDivElement | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { scrollYProgress } = useScroll({
        target: targetRef,
    });

    const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);
    const translateX = isMobile ? "0%" : x;

    return (
        <section className="bg-white">
            {/* Header Section - Adjusted padding to bring text down */}
            <div className="pt-16 md:pt-24 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="inline-block mb-8"
                >
                    <span className="py-2 px-6 rounded-full bg-purple-50 border border-purple-100 text-[#6C4DFF] font-['Poppins'] font-bold tracking-widest text-sm uppercase shadow-sm">
                        Say hello to latest learning
                    </span>
                </motion.div>

                <div className="overflow-hidden">
                    <motion.h3
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl lg:text-7xl font-['Poppins'] font-extrabold text-black leading-[1.1] tracking-tight"
                    >
                        <motion.span
                            initial={{ x: -20, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="inline-block mr-2 md:mr-4"
                        >
                            wait, what is{" "}
                        </motion.span>
                        <motion.span
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{
                                duration: 0.6,
                                delay: 0.4
                            }}
                            className="inline-block align-middle"
                        >
                            <div className="bg-white p-5 rounded-[2.5rem] inline-block shadow-2xl border border-gray-100">
                                <img src="/images-optimized/studlyf.webp" alt="STUDLYF" loading="lazy" className="h-[60px] md:h-[100px] lg:h-[120px] w-auto inline-block" />
                            </div>
                        </motion.span>
                    </motion.h3>
                </div>
            </div>

            {/* Horizontal Scroll Container - Reduced height for less white space transition */}
            <div ref={targetRef} className={`relative ${isMobile ? 'h-auto py-12' : 'h-[250vh]'} bg-white`}>
                <div className={`${isMobile ? 'relative h-auto' : 'sticky top-0 h-screen'} flex flex-col md:flex-row md:items-center overflow-visible md:overflow-hidden`}>
                    <motion.div style={{ x: translateX }} className={`flex ${isMobile ? 'flex-col gap-10 px-6 w-full' : 'flex px-[10vw]'}`}>
                        {items.map((item) => (
                            <div key={item.id} className={`group relative ${isMobile ? 'h-auto w-full p-0' : 'h-screen w-[90vw] md:w-[85vw] lg:w-[80vw] p-4 md:p-8 lg:p-12'} flex-shrink-0 flex items-center justify-center`}>
                                {/* The Main Card as a Browser Window with Dynamic Colors */}
                                <div className={`relative w-full max-w-4xl ${isMobile ? 'h-auto min-h-[350px] pb-6' : 'h-[400px] md:h-[500px]'} ${item.bgColor} rounded-[2rem] overflow-hidden border-2 ${item.borderColor} shadow-[0_0_50px_-12px_rgba(108,77,255,0.25)] transition-all duration-700 hover:shadow-[0_0_80px_-10px_rgba(108,77,255,0.4)] group/card flex flex-col`}>

                                    {/* Browser Window Header - Covers the whole card */}
                                    <div className="h-10 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center px-6 gap-3 shrink-0">
                                        {/* Traffic Light Controls */}
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]"></div>
                                        </div>
                                        {/* Mock Tab */}
                                        <div className="ml-4 h-7 px-4 bg-[#0A0A0A] rounded-t-lg border-x border-t border-[#2A2A2A] flex items-center gap-2 -mb-[1px]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#6C4DFF]"></div>
                                            <span className="text-[10px] font-['Poppins'] font-semibold text-gray-300">Studlyf Experience</span>
                                        </div>
                                        {/* Plus Icon */}
                                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-gray-600">
                                            <span className="text-sm font-light">+</span>
                                        </div>
                                    </div>

                                    {/* Content Grid Area - Normalized height */}
                                    <div className="flex-1 p-6 md:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center overflow-visible md:overflow-hidden">

                                        {/* Text Content */}
                                        <div className="order-2 lg:order-1 flex flex-col items-start space-y-4 md:space-y-6">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl md:text-4xl font-['Poppins'] font-black text-[#6C4DFF]/40 group-hover/card:text-[#6C4DFF] transition-colors duration-500">
                                                    {item.id}
                                                </span>
                                                <div className="h-0.5 w-10 md:w-16 bg-[#6C4DFF]/25 group-hover/card:w-20 transition-all duration-500"></div>
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="text-2xl md:text-3xl lg:text-4xl font-['Poppins'] font-black text-white tracking-tight leading-tight">
                                                    {item.title}
                                                </h4>
                                                <p className="text-xs md:text-sm lg:text-base text-gray-400 max-w-sm font-['Poppins'] leading-relaxed whitespace-pre-line">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* App Viewport / Image */}
                                        <div className="order-1 lg:order-2 relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-inner bg-[#121212] border-2 border-[#2A2A2A] transition-transform duration-1000 group-hover/card:scale-[1.03]">
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                            {/* Reflection Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/10 pointer-events-none"></div>
                                        </div>
                                    </div>

                                    {/* Vibrant Decorative Backdrop Glow */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#6C4DFF]/15 blur-[120px] rounded-full -z-10 pointer-events-none group-hover/card:bg-[#6C4DFF]/25 transition-colors duration-700"></div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

        </section>
    );
};

export default WhatIsStudlyf;


