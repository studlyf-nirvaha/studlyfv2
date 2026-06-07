import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronRight, Star, Users, Clock, Award, CheckCircle2, ArrowRight, PlayCircle,
    Briefcase, Zap, Shield, Layout, Cpu, Database, Search, MessageSquare
} from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';

const TrackDetail: React.FC = () => {
    const { trackId } = useParams<{ trackId: string }>();
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrack = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/student/tracks/${trackId}`);
                if (res.ok) setDetail(await res.json());
            } catch {}
            setLoading(false);
        };
        fetchTrack();
    }, [trackId]);

    useEffect(() => { window.scrollTo(0, 0); }, [trackId]);

    const handleStartLearning = (plan?: string) => {
        navigate(`/learn/enroll/${trackId}${plan ? `?plan=${plan}` : ''}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] pt-32 px-6">
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="w-64 h-12 bg-slate-200 rounded-2xl animate-pulse"></div>
                    <div className="w-full h-64 bg-slate-100 rounded-[3rem] animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-black text-gray-900 mb-4">Track Not Found</h2>
                    <button onClick={() => navigate('/learn/courses-overview')} className="text-[#7C3AED] font-bold underline">Back to Overview</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pt-32">
            <section className="relative h-[80vh] min-h-[600px] flex items-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src={detail.heroImage || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200'} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                </div>
                <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.3em]">{detail.subtitle || 'Professional Track'}</span>
                            <div className="flex items-center gap-1.5">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-white font-bold text-sm">{detail.rating || detail.stats?.rating} Score</span>
                            </div>
                        </div>
                        <h1 className="text-6xl sm:text-8xl font-black text-white leading-[0.9] tracking-tighter uppercase mb-6">
                            {(detail.title || '').split(' ').map((word: string, i: number) => (
                                <span key={i} className={i % 2 !== 0 ? 'text-white/40' : ''}>{word} <br /></span>
                            ))}
                        </h1>
                        <p className="text-white/70 text-lg sm:text-xl font-medium leading-relaxed mb-10 max-w-xl">{detail.description}</p>
                        <div className="flex flex-wrap items-center gap-6">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => handleStartLearning()}
                                className="px-10 py-5 bg-white text-black font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-2xl flex items-center gap-3">
                                Start Learning <ArrowRight className="w-4 h-4" />
                            </motion.button>
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map(i => (
                                    <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${detail.title}${i}`} className="w-10 h-10 rounded-full border-2 border-black" alt="" />
                                ))}
                                <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-900 flex items-center justify-center text-[10px] text-white font-bold">+{detail.enrolled || detail.stats?.students || '0'}</div>
                            </div>
                            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Enrolled Learners</p>
                        </div>
                    </motion.div>
                </div>
            </section>

            <div className="bg-gray-50 border-y border-gray-100 py-10">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { icon: Users, label: 'Alumni Network', value: `${detail.enrolled || detail.stats?.students || '0'}` },
                        { icon: Star, label: 'Course Rating', value: `${detail.rating || detail.stats?.rating || '0'}/5.0` },
                        { icon: PlayCircle, label: 'Modules', value: detail.stats?.courses || detail.outcomes?.length || '0' },
                        { icon: Award, label: 'Certification', value: 'Verified' },
                    ].map((s, i) => (
                        <div key={i} className="flex flex-col items-center text-center">
                            <s.icon className="w-5 h-5 mb-3 text-[#7C3AED]" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className="text-2xl font-black text-gray-900">{s.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20">
                    <div className="max-w-xl">
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 block text-[#7C3AED]">Curriculum Roadmap</span>
                        <h2 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tighter leading-tight uppercase">The Path to <br /><span className="text-[#7C3AED]">Engineering Authority</span>.</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">16-Week Intensive Track</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-16 items-start">
                    <div className="lg:col-span-4 space-y-4">
                        {(detail.roadmap || []).map((step: any, i: number) => (
                            <motion.div key={i} onMouseEnter={() => setActiveStep(i)}
                                className={`p-6 rounded-2xl cursor-pointer transition-all border ${activeStep === i ? 'bg-white shadow-2xl scale-105 border-gray-100' : 'bg-transparent border-transparent opacity-50 grayscale'}`}
                            >
                                <span className="text-2xl font-black mb-2 block text-[#7C3AED]" style={activeStep === i ? { color: detail.accent || '#7C3AED' } : {}}>{step.step || `0${i + 1}`}</span>
                                <h3 className="text-lg font-black text-gray-900 mb-1">{step.title}</h3>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="lg:col-span-8 relative">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="bg-gray-900 rounded-[3rem] p-12 overflow-hidden relative min-h-[500px] flex flex-col justify-center"
                            >
                                <div className="relative z-10">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] mb-4 block">Currently Viewing</span>
                                    <h2 className="text-5xl font-black text-white tracking-tighter mb-8 leading-tight">{(detail.roadmap || [])[activeStep]?.title}</h2>
                                    <p className="text-white/60 text-lg leading-relaxed max-w-xl">In this phase, you will deep dive into {(detail.roadmap || [])[activeStep]?.desc}.</p>
                                </div>
                                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                                    <div className="absolute inset-0 bg-grid-white/[0.05]" />
                                </div>
                                <div className="absolute bottom-[-100px] right-[-100px] w-80 h-80 rounded-full blur-[120px] opacity-30 bg-[#7C3AED]" />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            <section className="bg-gray-50 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mb-4 block">Real Projects</span>
                        <h2 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tighter uppercase">Build Your <span className="text-[#7C3AED]">Evidence</span>.</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-10">
                        {(detail.projects || []).map((proj: any, i: number) => (
                            <motion.div key={i} whileHover={{ y: -10 }} className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl transition-all">
                                <div className="h-72 overflow-hidden">
                                    <img src={proj.img || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                                </div>
                                <div className="p-10">
                                    <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tighter">{proj.name}</h3>
                                    <p className="text-gray-500 leading-relaxed mb-8">{proj.desc}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#7C3AED] bg-[#F5F3FF] px-4 py-2 rounded-xl">Portfolio Ready</span>
                                        <button className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all"><ArrowRight className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mb-4 block">Industry Authority</span>
                        <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tighter uppercase mb-8 leading-tight">Guided by <br /><span className="text-[#7C3AED]">Elite Architects</span>.</h2>
                        <div className="space-y-8">
                            {(detail.mentors || []).map((m: any, i: number) => (
                                <div key={i} className="flex items-center gap-6">
                                    <img src={m.img || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-100" alt="" />
                                    <div>
                                        <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{m.name}</h4>
                                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{m.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-16 bg-[#111827] rounded-3xl p-10 relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-white text-2xl font-black uppercase tracking-tighter mb-4">Outcome Roles</h3>
                                <div className="flex flex-wrap gap-3">
                                    {(detail.outcomes || []).map((role: string) => (
                                        <span key={role} className="px-4 py-2 border border-white/20 rounded-xl text-white/70 text-[10px] font-bold uppercase tracking-widest">{role}</span>
                                    ))}
                                </div>
                            </div>
                            <Briefcase className="absolute -bottom-10 -right-10 w-40 h-40 text-white/5 rotate-12" />
                        </div>
                    </div>

                    <div className="relative">
                        <div className="bg-white rounded-[3rem] p-4 shadow-2xl border border-gray-100 relative group">
                            <div className="rounded-[2.5rem] border-[10px] border-gray-50 p-10 flex flex-col items-center text-center">
                                <div className="mb-12">
                                    <Award className="w-24 h-24 mx-auto mb-6 text-[#7C3AED]" />
                                    <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Certificate of Excellence</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Proprietary Verification Protocol</p>
                                </div>
                                <div className="w-full border-y border-gray-100 py-10 space-y-6 mb-12">
                                    <p className="text-sm font-medium text-gray-500 italic">This certifies that</p>
                                    <p className="text-4xl font-poppins font-black text-gray-900">Johnathan Doe</p>
                                    <p className="text-sm font-medium text-gray-500">has successfully completed the 16-week intensive track in</p>
                                    <p className="text-2xl font-black uppercase tracking-tight text-[#7C3AED]">{detail.title}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-gray-50 py-32 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mb-4 block">Access & Enrollment</span>
                    <h2 className="text-5xl sm:text-7xl font-black text-gray-900 tracking-tighter uppercase mb-6 leading-[0.9]">Invest in Your <br /><span className="text-[#7C3AED]">Engineering Future</span>.</h2>
                    <p className="text-gray-500 text-lg font-medium mb-16">No hidden fees. Full access to all modules, mentors, and the hiring pipeline.</p>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-sm text-left">
                            <h4 className="text-xl font-black uppercase tracking-tighter mb-2">Monthly Sprint</h4>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-10">Flexible Learning</p>
                            <div className="flex items-baseline gap-2 mb-10">
                                <span className="text-6xl font-black text-gray-900">${detail.pricing?.monthly || detail.price ? `${Math.round((detail.price || 3999) / 12)}` : '29'}</span>
                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">/ Month</span>
                            </div>
                            <ul className="space-y-4 mb-10">
                                {['Access to all Courses', 'Project Reviews', 'Community Support', 'Monthly Mentorship'].map(f => (
                                    <li key={f} className="flex items-center gap-3 text-sm font-bold text-gray-600"><CheckCircle2 className="w-5 h-5 text-[#7C3AED]" /> {f}</li>
                                ))}
                            </ul>
                            <button onClick={() => handleStartLearning('monthly')} className="w-full py-5 rounded-2xl bg-gray-50 text-gray-900 font-black text-xs uppercase tracking-[0.2em] border border-gray-100 hover:bg-gray-100 transition-all">Choose Plan</button>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-12 border border-[#7C3AED]/20 shadow-2xl relative overflow-hidden text-left">
                            <div className="absolute top-8 right-8 bg-[#7C3AED] text-white px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em]">Save 15%</div>
                            <h4 className="text-xl font-black uppercase tracking-tighter mb-2">Yearly Mastery</h4>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-10">Full Authority Track</p>
                            <div className="flex items-baseline gap-2 mb-10">
                                <span className="text-6xl font-black text-gray-900">${detail.pricing?.yearly || detail.price || '299'}</span>
                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">/ Year</span>
                            </div>
                            <ul className="space-y-4 mb-10">
                                {['Access to all Courses', 'Project Reviews', 'Community Support', 'Hiring Pipeline Access', 'Certificate Included'].map(f => (
                                    <li key={f} className="flex items-center gap-3 text-sm font-bold text-gray-600"><CheckCircle2 className="w-5 h-5 text-[#7C3AED]" /> {f}</li>
                                ))}
                            </ul>
                            <button onClick={() => handleStartLearning('yearly')}
                                className="w-full py-5 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all"
                                style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
                            >Choose Mastery</button>
                        </div>
                    </div>
                </div>
            </section>

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[50] w-[90%] max-w-4xl bg-white/80 backdrop-blur-2xl border border-gray-200 rounded-3xl p-4 shadow-2xl flex items-center justify-between">
                <div className="flex items-center gap-4 pl-4">
                    <div className="hidden sm:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Current selection</p>
                        <p className="text-lg font-black text-gray-900 tracking-tighter uppercase leading-none">{detail.title} Track</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <p className="hidden md:block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Next cohort starts in <span className="text-[#7C3AED]">3 days</span></p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleStartLearning()}
                        className="px-10 py-4 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all"
                        style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
                    >Start Learning</motion.button>
                </div>
            </div>
        </div>
    );
};

export default TrackDetail;
