import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Briefcase, 
    GraduationCap, 
    Trophy, 
    LayoutDashboard, 
    X, 
    ChevronRight, 
    ArrowLeft,
    Lightbulb,
    FileText,
    Terminal,
    Video
} from 'lucide-react';

interface PostSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: string) => void;
}

interface OptionItem {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    hasSub?: boolean;
}

const PostSelectionModal: React.FC<PostSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [view, setView] = useState<'main' | 'opportunity'>('main');

    const mainOptions: OptionItem[] = [
        {
            id: 'job',
            title: 'Post a Job',
            desc: 'Fill permanent positions with qualified professionals',
            icon: <Briefcase size={20} />,
            color: 'bg-blue-50 text-blue-600'
        },
        {
            id: 'internship',
            title: 'Post an Internship',
            desc: 'Build your talent pipeline with emerging prospects',
            icon: <GraduationCap size={20} />,
            color: 'bg-emerald-50 text-emerald-600'
        },
        {
            id: 'opportunity',
            title: 'Opportunity',
            desc: 'Engage your target audience with competitions',
            icon: <Trophy size={20} />,
            color: 'bg-amber-50 text-amber-600',
            hasSub: true
        }
    ];

    const opportunityOptions: OptionItem[] = [
        {
            id: 'competition',
            title: 'General & Case Competitions',
            desc: 'Identify analytical talent and problem-solvers',
            icon: <Lightbulb size={20} />,
            color: 'bg-purple-50 text-[#6C3BFF]'
        },
        {
            id: 'quiz',
            title: 'Quizzes',
            desc: 'Assess domain knowledge efficiently',
            icon: <FileText size={20} />,
            color: 'bg-blue-50 text-blue-600'
        },
        {
            id: 'hackathon',
            title: 'Hackathons & Coding Challenges',
            desc: 'Evaluate technical skills and abilities in action',
            icon: <Terminal size={20} />,
            color: 'bg-emerald-50 text-emerald-600'
        },
        {
            id: 'webinar',
            title: 'Webinars, Conferences & Workshops',
            desc: 'Engage with potential candidates through sessions',
            icon: <Video size={20} />,
            color: 'bg-orange-50 text-orange-600'
        }
    ];

    const handleSelect = (id: string) => {
        if (id === 'opportunity') {
            setView('opportunity');
        } else {
            // This now correctly tells the parent (Dashboard) to open the form
            onSelect(id);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { setView('main'); onClose(); }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden font-sans"
                    >
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                {view === 'opportunity' && (
                                    <button 
                                        onClick={() => setView('main')}
                                        className="mr-2 p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                )}
                                <span className="w-1.5 h-6 bg-[#6C3BFF] rounded-full" />
                                {view === 'main' ? 'Post' : 'Select Opportunity'}
                            </h2>
                            <button 
                                onClick={() => { setView('main'); onClose(); }}
                                className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-2">
                            {(view === 'main' ? mainOptions : opportunityOptions).map((opt) => (
                                <button 
                                    key={opt.id}
                                    onClick={() => handleSelect(opt.id)}
                                    className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 rounded-3xl transition-all group text-left border border-transparent hover:border-slate-100"
                                >
                                    <div className={`w-12 h-12 ${opt.color} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                        {opt.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 text-sm">{opt.title}</h4>
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">{opt.desc}</p>
                                    </div>
                                    {opt.hasSub && (
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-[#6C3BFF] group-hover:translate-x-1 transition-all" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="p-8 pt-4 bg-slate-50/50">
                            <p className="text-[10px] text-center font-black text-slate-300 uppercase tracking-widest">
                                Studlyf Institutional Protocol v4.0
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PostSelectionModal;

