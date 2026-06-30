import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, FileText, Video, Lightbulb, X, CheckCircle2, Instagram, Linkedin, Share2, Check } from 'lucide-react';

interface ResourceItem {
    slug: string;
    type: string;
    title: string;
    desc: string;
    image: string;
    icon: React.ReactNode;
    height: string;
    cardBg: string;
    glowColor: string;
    overview: string;
    whyItMatters: string[];
    takeaways: string[];
    impact: string;
}

const resources: ResourceItem[] = [
    {
        slug: 'elm-graduate-program',
        type: 'CASE STUDY',
        title: 'Elm Partners with Studlyf to Build a Graduate Development Program',
        desc: 'How modern graduate development programs are redesigned using rapid feedback systems and experiential learning.',
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1200',
        icon: <BookOpen size={14} />,
        height: 'h-[360px]',
        cardBg: 'bg-gradient-to-br from-[#1E40AF] to-[#3B82F6]',
        glowColor: 'border-sky-400/50 hover:shadow-sky-400/20 text-sky-400 bg-sky-500/10',
        overview: 'Traditional graduate programs rely heavily on passive, slide-based training that delays time-to-value. Elm partnered with Studlyf to fundamentally rethink their graduate onboarding. By implementing an experiential learning platform powered by rapid prototyping and live feedback loops, Elm transitioned their training into a project-driven curriculum. This paradigm shift empowered new hires to deploy robust, production-ready code weeks ahead of schedule.',
        whyItMatters: [
            'Replaces passive consumption with active, project-based learning for higher retention.',
            'Accelerates the time-to-value for new engineering hires by immersing them in real codebases.',
            'Creates continuous, real-time feedback loops via integrated AI mentors, reducing senior developer burden.'
        ],
        takeaways: ['Experiential learning', 'Live feedback', 'Accelerated onboarding'],
        impact: 'Within the first cohort, graduate engineers began committing production-ready code 40% faster. Furthermore, 90-day retention and engagement metrics showed a 25% improvement over previous years.'
    },
    {
        slug: 'generative-ai-playbook',
        type: 'REPORT',
        title: 'Generative AI Leadership Playbook',
        desc: 'Strategic frameworks and tactical steps for product teams adopting AI-powered workflows.',
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200',
        icon: <FileText size={14} />,
        height: 'h-[360px]',
        cardBg: 'bg-[#1A0F0A]',
        glowColor: 'border-emerald-400/50 hover:shadow-emerald-400/20 text-emerald-400 bg-emerald-500/10',
        overview: 'As AI transitions from experimental novelty to business-critical infrastructure, data-driven leaders are forced to rethink their product strategies. This comprehensive playbook distills complex market signals into tactical implementation steps. It provides governance models and execution frameworks for product teams looking to safely and effectively integrate AI-powered workflows into their daily operations.',
        whyItMatters: [
            'Bridges the crucial gap between AI hype and practical, scalable product integration.',
            'Establishes clear, actionable frameworks for measuring tangible Return on Investment (ROI) for AI initiatives.',
            'Provides strict security and compliance guardrails necessary for safe enterprise deployment.'
        ],
        takeaways: ['Strategic integration', 'ROI frameworks', 'Enterprise security'],
        impact: 'Early adopting teams utilizing these frameworks successfully reduced their AI integration timelines by 50%, all while navigating strict enterprise compliance standards without a single breach.'
    },
    {
        slug: 'siemens-data-empowerment',
        type: 'CASE STUDY',
        title: "Studlyf's Data Empowerment Initiative at Siemens",
        desc: 'Transforming how engineering teams make data-driven decisions through contextual collaboration.',
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=1200',
        icon: <BookOpen size={14} />,
        height: 'h-[360px]',
        cardBg: 'bg-[#4C1D95]',
        glowColor: 'border-amber-400/50 hover:shadow-amber-400/20 text-amber-400 bg-amber-500/10',
        overview: 'Siemens Smart Infrastructure sought to democratize data across its highly siloed manufacturing departments. Partnering with Studlyf, they launched a comprehensive Data Empowerment initiative. By combining advanced analytics education with intuitive contextual collaboration tools, Siemens transformed how their engineers interact with data, shifting from centralized reporting to decentralized, real-time decision-making.',
        whyItMatters: [
            'Democratizes critical data access across previously isolated manufacturing and engineering departments.',
            'Equips non-technical field teams with the foundational analytics skills needed to interpret complex data.',
            'Drives decentralized, highly accurate decision-making directly at the edge of operations.'
        ],
        takeaways: ['Data democratization', 'Cross-functional analytics', 'Decentralized decisions'],
        impact: 'Over 500 engineers were upskilled within six months, directly leading to a measurable 15% increase in predictive maintenance efficiency and significantly reduced operational downtime.'
    },
    {
        slug: 'ai-agents-capabilities',
        type: 'WEBINAR',
        title: 'What AI Agents can and can not do',
        desc: 'A definitive guide cutting through the noise surrounding agentic workflows and capabilities.',
        image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1200',
        icon: <Video size={14} />,
        height: 'h-[360px]',
        cardBg: 'bg-[#051937]',
        glowColor: 'border-indigo-400/50 hover:shadow-indigo-400/20 text-indigo-400 bg-indigo-500/10',
        overview: 'The hype surrounding autonomous agents has created significant misalignment between business expectations and technical reality. This definitive guide cuts through the noise to explore the genuine capabilities of agentic workflows today. We unpack current technical limitations, discuss the necessity of human-in-the-loop safeguards, and identify the ideal scenarios where human-AI collaboration truly shines in modern software development.',
        whyItMatters: [
            'Provides product and engineering leaders with realistic expectations for autonomous agent performance.',
            'Highlights critical failure modes and the necessity of designing robust human-in-the-loop safeguards.',
            'Maps out a pragmatic trajectory of agent capabilities and evolution over the next 24 months.'
        ],
        takeaways: ['Realistic capabilities', 'Human-in-the-loop', 'Future trajectories'],
        impact: 'By leveraging this guide, engineering teams can accurately scope and prioritize AI projects, preventing costly architectural mistakes and misalignment between technical delivery and business goals.'
    },
    {
        slug: 'mcp-explained',
        type: 'CASE STUDY',
        title: 'How Agentic AI works: MCP explained',
        desc: 'A deep dive into the underlying architecture of modern agent orchestration.',
        image: 'https://images.unsplash.com/photo-1620712943543-bcc4628c9757?auto=format&fit=crop&q=80&w=1400',
        icon: <BookOpen size={14} />,
        height: 'h-[360px]',
        cardBg: 'bg-[#004DFF]',
        glowColor: 'border-rose-400/50 hover:shadow-rose-400/20 text-rose-400 bg-rose-500/10',
        overview: 'As AI agents become more prevalent, the challenge of connecting them securely to enterprise data has emerged as a major bottleneck. This deep dive explores the Model Context Protocol (MCP)—the underlying architecture of modern agent orchestration. We demonstrate how standardized, secure context sharing simplifies complex business processes and allows agents to reason over proprietary data while keeping human operators firmly in control.',
        whyItMatters: [
            'Standardizes the complex integration patterns of how AI models interact with disparate, secure data sources.',
            'Significantly reduces the engineering integration burden and boilerplate code for enterprise AI deployments.',
            "Ensures consistent, predictable, and secure context sharing across a company's entire application ecosystem."
        ],
        takeaways: ['Model Context Protocol', 'Secure data integration', 'Standardized architecture'],
        impact: 'Developers can now rapidly deploy interconnected, intelligent AI agents that seamlessly and securely access internal company data, drastically reducing integration overhead from weeks to days.'
    },
    {
        slug: '2025-ai-work-report',
        type: 'MEDIA',
        title: '2025 State of AI at work report',
        desc: 'A comprehensive snapshot covering AI adoption, skills demand, and workplace transformation.',
        image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200',
        icon: <FileText size={14} />,
        height: 'h-[360px]',
        cardBg: 'bg-[#C084FC]',
        glowColor: 'border-teal-400/50 hover:shadow-teal-400/20 text-teal-400 bg-teal-500/10',
        overview: 'Drawing on survey data from over 10,000 technology professionals and engineering leaders, this exhaustive report provides a definitive snapshot of the modern workplace. It covers accelerating AI adoption rates, shifting demands for new technical skills, and comprehensive forecasts for workplace transformation. It serves as a vital compass for organizations navigating the unprecedented shift brought on by generative AI.',
        whyItMatters: [
            'Identifies the most valuable and highly sought-after skills for the future engineering and product workforce.',
            'Quantifies the actual, measurable productivity gains achieved by early enterprise AI adopters.',
            'Reveals the most common organizational and technical obstacles to scaling AI across large enterprises.'
        ],
        takeaways: ['Adoption trends', 'Skills forecasting', 'Productivity metrics'],
        impact: 'This report provides actionable intelligence for talent acquisition and organizational development leaders, allowing them to proactively future-proof their workforce strategies and training programs.'
    }
];

const ResourceCenter: React.FC = () => {
    const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);

    // Deep linking logic on component mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const resourceSlug = params.get('resource');
        if (resourceSlug) {
            const found = resources.find(r => r.slug === resourceSlug);
            if (found) {
                setSelectedResource(found);
                // Wait slightly for DOM to settle before scrolling
                setTimeout(() => {
                    const section = document.getElementById('resource-center');
                    if (section) {
                        section.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 500);
            }
        }
    }, []);

    // Prevent body scroll and update URL dynamically when modal state changes
    useEffect(() => {
        if (selectedResource) {
            document.body.style.overflow = 'hidden';
            const url = new URL(window.location.href);
            url.searchParams.set('resource', selectedResource.slug);
            window.history.replaceState({}, '', url.toString());
        } else {
            document.body.style.overflow = 'unset';
            const url = new URL(window.location.href);
            if (url.searchParams.has('resource')) {
                url.searchParams.delete('resource');
                window.history.replaceState({}, '', url.toString());
            }
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedResource]);

    const handleShare = (slug: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set('resource', slug);
        navigator.clipboard.writeText(url.toString());
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const containerVariants: any = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: any = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.6,
                ease: "easeOut"
            }
        }
    };

    return (
        <section id="resource-center" className="relative w-full bg-white overflow-hidden font-poppins text-[#111827]">
            {/* 🌑 Deep Purple/Navy Header Area */}
            <div className="max-w-[1600px] mx-auto sm:px-8 relative">
                <div className="bg-[#2D0B5A] pt-12 pb-32 px-6 sm:px-8 text-center relative overflow-hidden rounded-[2.5rem] sm:rounded-[5rem]">
                    {/* Subtle Brand Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#2563EB]/15 rounded-full blur-[120px] pointer-events-none" />

                    <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                        {/* Center Label with Exact Blue Lines */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="flex items-center justify-center gap-4 sm:gap-6"
                        >
                            <div className="h-[1px] flex-grow max-w-[150px] bg-gradient-to-r from-transparent via-[#2563EB]/50 to-[#2563EB]" />
                            <div className="flex flex-col items-center gap-2 shrink-0">
                                <motion.div
                                    animate={{
                                        opacity: [0.7, 1, 0.7],
                                        scale: [1, 1.1, 1],
                                        filter: [
                                            "drop-shadow(0 0 0px rgba(56,189,248,0))",
                                            "drop-shadow(0 0 15px rgba(56,189,248,0.9))",
                                            "drop-shadow(0 0 0px rgba(56,189,248,0))"
                                        ]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                >
                                    <Lightbulb size={28} className="text-[#38BDF8]" strokeWidth={1.2} />
                                </motion.div>
                                <span className="text-[#38BDF8] text-[12px] md:text-sm font-bold tracking-[0.4em] uppercase">Resource centre</span>
                            </div>
                            <div className="h-[1px] flex-grow max-w-[150px] bg-gradient-to-l from-transparent via-[#2563EB]/50 to-[#2563EB]" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, scale: 0.98 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-2xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.1]"
                        >
                            Stay ahead of what's Next.
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-gray-400/80 text-xs md:text-base max-w-2xl mx-auto font-medium leading-relaxed italic"
                        >
                            Research and insights from tech experts and thought leaders so you're always on top of tech's latest trends
                        </motion.p>
                    </div>
                </div>
            </div>

            {/* ⚪ Premium Light Body Area */}
            <div className="pb-8 -mt-24 pt-0 px-4 md:px-12 relative z-20">
                <div className="max-w-[1300px] mx-auto">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {resources.map((res, idx) => (
                            <motion.div
                                key={idx}
                                variants={itemVariants}
                                whileHover={{ y: -12, transition: { duration: 0.4, ease: "easeOut" } }}
                                onClick={() => setSelectedResource(res)}
                                className={`group relative ${res.cardBg} rounded-[3rem] overflow-hidden transition-all duration-500 shadow-2xl flex flex-col border-x border-b cursor-pointer ${res.glowColor.split(' ')[0]} ${res.height}`}
                            >
                                {/* Permanent Background Glow Layer */}
                                <div className="absolute inset-0 z-0 opacity-40">
                                    <div className={`absolute inset-0 blur-[80px] -m-10 ${res.glowColor.split(' ').pop()}`} />
                                </div>

                                <div className="absolute inset-0 z-0">
                                    <img
                                        src={res.image}
                                        alt=""
                                        className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110 opacity-20 grayscale"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent" />
                                </div>

                                <div className="relative z-10 p-7 h-full flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl bg-white/5 border transition-all duration-500 ${res.glowColor.split(' ').slice(-2, -1)[0]} border-current`}>
                                                {res.icon}
                                            </div>
                                            <span className={`text-[9px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-white/5 border transition-all duration-500 ${res.glowColor.split(' ').slice(-2, -1)[0]} border-current`}>
                                                {res.type}
                                            </span>
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-bold text-white leading-tight transition-colors duration-500 group-hover:text-white">
                                            {res.title}
                                        </h3>
                                        <p className="text-white text-xs md:text-sm leading-relaxed opacity-90 transition-colors duration-500">
                                            {res.desc}
                                        </p>
                                    </div>

                                    <div className="mt-6">
                                        <button className="flex items-center gap-2 text-white/70 text-[10px] font-bold tracking-widest uppercase transition-all duration-500 border-b border-transparent pb-1 group-hover:text-white group-hover:border-current">
                                            READ MORE <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <AnimatePresence>
                        {selectedResource && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm" 
                                onClick={() => setSelectedResource(null)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.96 }}
                                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                    onClick={(event) => event.stopPropagation()}
                                    className="w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-2xl md:rounded-[2rem] overflow-hidden bg-white shadow-2xl flex flex-col relative"
                                >
                                    {/* Close Button */}
                                    <button
                                        onClick={() => setSelectedResource(null)}
                                        className="absolute top-4 right-4 z-50 rounded-full bg-black/20 backdrop-blur-md p-2 text-white/90 hover:text-white transition-all hover:bg-black/40 hover:scale-105"
                                    >
                                        <X size={20} />
                                    </button>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {/* SECTION 1 - HERO */}
                                        <div className="relative w-full h-[280px] md:h-[360px] flex-shrink-0">
                                            <img src={selectedResource.image} alt={selectedResource.title} className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/60 to-[#0B0B0F]/10" />
                                            
                                            <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end">
                                                <span className="inline-block px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-5 w-fit shadow-sm">
                                                    {selectedResource.type}
                                                </span>
                                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.1] mb-4 max-w-3xl drop-shadow-lg">
                                                    {selectedResource.title}
                                                </h2>
                                                <p className="text-slate-200 text-sm md:text-base max-w-2xl leading-relaxed font-medium">
                                                    {selectedResource.desc}
                                                </p>
                                            </div>
                                        </div>

                                        {/* SECTION 2 - CONTENT OVERVIEW */}
                                        <div className="p-6 md:p-12 bg-white text-[#111827]">
                                            <div className="max-w-3xl mx-auto space-y-12">
                                                
                                                {/* Overview */}
                                                <section>
                                                    <h3 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-4">Overview</h3>
                                                    <p className="text-slate-800 text-lg md:text-xl leading-relaxed font-medium">
                                                        {selectedResource.overview}
                                                    </p>
                                                </section>

                                                <hr className="border-slate-100" />

                                                {/* Why this matters */}
                                                <section>
                                                    <h3 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-5">Why this matters</h3>
                                                    <ul className="space-y-4">
                                                        {selectedResource.whyItMatters.map((point, idx) => (
                                                            <li key={idx} className="flex items-start gap-4 text-slate-600">
                                                                <div className="mt-1 w-5 h-5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center flex-shrink-0">
                                                                    <CheckCircle2 size={12} strokeWidth={3} />
                                                                </div>
                                                                <span className="text-[15px] leading-relaxed font-medium">{point}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </section>

                                                <div className="grid md:grid-cols-2 gap-8 pt-4">
                                                    {/* Key Takeaways */}
                                                    <section>
                                                        <h3 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-4">Key takeaways</h3>
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedResource.takeaways.map((takeaway, idx) => (
                                                                <span key={idx} className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-sm">
                                                                    {takeaway}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </section>

                                                    {/* Real-world impact */}
                                                    <section>
                                                        <h3 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-4">Real-world impact</h3>
                                                        <div className="p-5 bg-gradient-to-br from-[#7C3AED]/[0.03] to-transparent border border-[#7C3AED]/10 rounded-2xl shadow-sm">
                                                            <p className="text-slate-700 text-sm leading-relaxed font-medium">
                                                                {selectedResource.impact}
                                                            </p>
                                                        </div>
                                                    </section>
                                                </div>
                                                
                                                {/* Footer: Socials & Share */}
                                                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100">
                                                    {/* Socials */}
                                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Follow Studlyf</span>
                                                        <div className="flex items-center gap-2">
                                                            <a href="https://www.instagram.com/stuudent.lyf/" target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-slate-50 text-slate-400 hover:text-[#E1306C] hover:bg-[#E1306C]/10 transition-all shadow-sm border border-slate-100">
                                                                <Instagram size={16} />
                                                            </a>
                                                            <a href="https://www.linkedin.com/company/studlyf/posts/?feedView=all" target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-slate-50 text-slate-400 hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-all shadow-sm border border-slate-100">
                                                                <Linkedin size={16} />
                                                            </a>
                                                        </div>
                                                    </div>

                                                    {/* Share Button */}
                                                    <button 
                                                        onClick={() => handleShare(selectedResource.slug)}
                                                        className="flex items-center justify-center gap-2 px-6 py-2.5 w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-full transition-all shadow-sm hover:shadow-md"
                                                    >
                                                        {copiedLink ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
                                                        {copiedLink ? "Link Copied!" : "Share Resource"}
                                                    </button>
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ✨ Premium Animated Footer Button */}
                    <div className="mt-10 flex justify-center">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.open('https://example.com/case-studies', '_blank')}
                            className="relative group p-[2px] rounded-full overflow-hidden bg-[#2563EB]/20 shadow-xl transition-all duration-500 border border-white/10"
                        >
                            {/* ✨ Rotating Border Shine */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent,transparent,#2563EB,transparent,transparent)] opacity-0 group-hover:opacity-100 transition-opacity"
                            />

                            {/* 🌬️ Pulsating Outer Glow */}
                            <motion.div
                                animate={{
                                    boxShadow: [
                                        "0 0 20px rgba(37,99,235,0.2)",
                                        "0 0 40px rgba(37,99,235,0.6)",
                                        "0 0 20px rgba(37,99,235,0.2)"
                                    ]
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute inset-0 rounded-full"
                            />

                            <div className="relative px-16 py-5 rounded-full bg-[#2D0B5A] flex items-center gap-3 text-white font-bold tracking-[0.3em] transition-all z-10 uppercase text-sm border-2 border-[#2563EB]/50 group-hover:border-[#2563EB]">
                                {/* Internal Shimmer/Scan */}
                                <motion.div
                                    animate={{ x: ["-100%", "200%"] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-1/2 skew-x-[-20deg] pointer-events-none"
                                />
                                <span className="relative z-20">EXPLORE</span>
                            </div>
                        </motion.button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ResourceCenter;

