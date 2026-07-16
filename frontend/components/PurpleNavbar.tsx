
import React, { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import InteractiveCreature from './InteractiveCreature';

// --- Shared Bento Components ---

interface BentoCardProps {
    title: string;
    desc: string;
    children?: React.ReactNode;
    className?: string;
    to?: string;
    onClick?: () => void;
}

const BentoCard = ({ title, desc, children, className = "", to = "#", onClick }: BentoCardProps) => (
    <Link
        to={to}
        onClick={onClick}
        className={`bg-white/80 backdrop-blur-sm rounded-[1.5rem] p-5 relative overflow-hidden group border border-transparent hover:border-[#7C3AED]/20 hover:shadow-xl transition-all block w-full text-left ${className}`}
    >
        <div className="relative z-10">
            <h3 className="text-base font-bold text-[#111827] mb-1.5 tracking-tight group-hover:text-[#7C3AED] transition-colors">{title}</h3>
            <p className="text-[11px] text-[#6B7280] leading-relaxed max-w-[180px] mb-3">{desc}</p>
        </div>
        {children}
    </Link>
);

const LearnDropdown = ({ onItemClick }: { onItemClick: () => void }) => (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-w-[300px] md:min-w-[1000px]">
        <BentoCard onClick={onItemClick} to="/learn/courses-overview" title="Courses" desc="Role-focused tracks for elite engineering readiness." className="md:col-span-2 md:row-span-2 min-h-[180px] md:min-h-[260px] bg-white shadow-sm overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full overflow-hidden">
                <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Courses" />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent"></div>
            </div>
        </BentoCard>
        <BentoCard onClick={onItemClick} to="/learn/company-modules" title="Company Learning Modules" desc="Institutional training for corporate internal teams." className="md:col-span-2 md:row-span-2 min-h-[180px] md:min-h-[260px] bg-white shadow-sm overflow-hidden">
            <div className="absolute top-0 right-0 w-1/3 h-full overflow-hidden">
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Corporate" />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent"></div>
            </div>
        </BentoCard>
        <BentoCard onClick={onItemClick} to="/learn/career-onboarding" title="Career Dreamer" desc="AI career recommendation engine based on user interests." className="md:col-span-1 md:row-span-2 min-h-[180px] md:min-h-[260px] bg-[#7C3AED]/5 border border-[#7C3AED]/10 hover:border-[#7C3AED]/30 shadow-sm overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-[#7C3AED]/10 to-transparent flex items-end p-6 justify-end rounded-b-[1.5rem] group-hover:from-[#7C3AED]/20 transition-colors">
                <span className="text-4xl">🚀</span>
            </div>
        </BentoCard>
    </div>
);

const JobPrepDropdown = ({ onItemClick }: { onItemClick: () => void }) => (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 min-w-[300px] md:min-w-[1000px]">
        <BentoCard onClick={onItemClick} to="/job-prep/portfolio" title="Build Portfolio" desc="Showcase evidence of your engineering prowess." className="md:col-span-2 md:row-span-2 min-h-[180px] md:min-h-[260px] bg-[#F8FAFC]">
            <div className="mt-4 bg-[#0F172A] rounded-xl p-4 shadow-2xl border border-white/10 group-hover:scale-[1.05] transition-transform duration-500 h-28 relative overflow-hidden">
                <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-2 w-2/3 bg-white/10 rounded"></div>
                    <div className="h-10 w-full bg-gradient-to-tr from-[#7C3AED]/40 to-transparent rounded-lg border border-white/5 flex items-center px-3">
                        <div className="h-1.5 w-1/2 bg-white/20 rounded"></div>
                    </div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-[#7C3AED]/20 blur-3xl rounded-full"></div>
            </div>
        </BentoCard>
        <BentoCard onClick={onItemClick} to="/job-prep/resume-builder" title="Resume Builder" desc="Create instant, ATS-friendly resumes." className="md:col-span-2 md:row-span-2 min-h-[180px] md:min-h-[260px] bg-[#F8FAFC]">
            <div className="mt-4 mx-auto w-full h-28 bg-white border border-gray-200 rounded-xl shadow-lg group-hover:shadow-xl transition-all group-hover:scale-[1.05] group-hover:-translate-y-1 relative overflow-hidden p-3 pt-4">
                <div className="flex gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-gray-200"></div>
                    </div>
                    <div className="space-y-1.5 w-full">
                        <div className="h-2 w-3/4 bg-gray-800/80 rounded-full"></div>
                        <div className="h-1.5 w-1/2 bg-gray-300 rounded-full"></div>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="h-0.5 w-full bg-gray-100"></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="h-1.5 bg-gray-100 rounded"></div>
                        <div className="h-1.5 bg-gray-50 rounded"></div>
                    </div>
                    <div className="h-1.5 w-2/3 bg-gray-50 rounded"></div>
                </div>
                <div className="absolute bottom-0 right-0 w-10 h-10 bg-[#7C3AED]/10 rounded-tl-2xl flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]"></div>
                </div>
            </div>
        </BentoCard>
        <BentoCard onClick={onItemClick} to="/job-prep/mock-interview" title="Mock tests & interviews" desc="Practice clinical logic defense." className="md:col-span-2 h-[120px] bg-white" />
        <BentoCard onClick={onItemClick} to="/job-prep/projects" title="Build A Project" desc="Scale industry projects." className="md:col-span-2 h-[120px] bg-white" />
    </div>
);


const PurpleNavbar: React.FC = () => {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const navigate = useNavigate();

    const navItems = [
        {
            label: 'LEARN',
            component: <LearnDropdown onItemClick={() => setActiveDropdown(null)} />
        },
        {
            label: 'JOBS',
            component: <JobPrepDropdown onItemClick={() => setActiveDropdown(null)} />
        },
    ];

    const toggleDropdown = (label: string) => {
        setActiveDropdown(activeDropdown === label ? null : label);
    };

    return (
        <div className="w-full px-0 sm:px-0 absolute bottom-0 left-0 right-0 z-50 pointer-events-none">
            {/* Click-away listener when dropdown is open */}
            {activeDropdown && (
                <div 
                    className="fixed inset-0 z-0 pointer-events-auto" 
                    onClick={() => setActiveDropdown(null)}
                />
            )}

            <div className="relative flex justify-center w-full items-end h-6">
                {/* Interactive Creature - Z-Index 0 (Behind Navbar) */}
                <div className="absolute inset-x-0 bottom-16 z-0 flex justify-center pointer-events-none">
                    <InteractiveCreature />
                </div>

                {/* Navbar Content - Z-Index 10 (In Front) - Enable pointer events */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    onMouseLeave={() => setActiveDropdown(null)}
                    className="w-[95%] sm:w-full max-w-4xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#7C3AED] rounded-t-[1rem] sm:rounded-t-[1.2rem] px-4 sm:px-10 py-1 sm:py-1.5 flex items-center justify-center shadow-[0_-10px_40px_-15px_rgba(124,58,237,0.5)] z-10 pointer-events-auto"
                >
                    {/* Navigation Items - Centered */}
                    <div className="flex items-center gap-8 sm:gap-12 relative w-full justify-center">
                        {navItems.map((item) => (
                            <div
                                key={item.label}
                                className="relative py-2"
                            >
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleDropdown(item.label);
                                    }}
                                    className="flex items-center gap-1 sm:gap-2 text-white text-[11px] sm:text-xs font-bold uppercase tracking-widest hover:text-white/80 transition-colors py-1"
                                >
                                    {item.label}
                                    <ChevronUp
                                        size={14}
                                        className={`transition-transform duration-300 ${activeDropdown === item.label ? 'rotate-180' : ''}`}
                                    />
                                </button>
                            </div>
                        ))}

                        {/* Centered Dropdown Menu (Upwards) - Relative to Navbar Container */}
                        <AnimatePresence>
                            {activeDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 w-[92vw] sm:w-[95vw] max-w-6xl z-[100] cursor-auto pb-4"
                                >
                                    {/* Bridge to prevent closing when moving mouse between bar and dropdown */}
                                    <div className="bg-white/95 backdrop-blur-md border border-[#7C3AED]/10 p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(124,58,237,0.25)] overflow-y-auto max-h-[80vh] no-scrollbar">
                                        <div className="w-full flex justify-center">
                                            {navItems.find(i => i.label === activeDropdown)?.component}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default PurpleNavbar;

