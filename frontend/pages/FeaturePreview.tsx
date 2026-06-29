
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, ArrowRight } from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';

const featuresData: Record<string, {
    title: string;
    description: string;
    icon: string;
    benefits: string[];
    color: string;
}> = {
    'learn-courses': {
        title: 'Interactive Learning',
        description: 'Master new skills with our hands-on, project-based courses designed by industry experts. From coding to data science, learn by doing.',
        icon: '🎓',
        benefits: ['Project-based curriculum', 'Real-world scenarios', 'Expert mentorship', 'Certificate of completion'],
        color: '#7C3AED'
    },
    'learn-modules': {
        title: 'Company Learning Modules',
        description: 'Exclusive training content tailored for corporate teams. Upskill your workforce with our enterprise-grade learning management system.',
        icon: '🏢',
        benefits: ['Custom curriculum', 'Team analytics', 'Role-based paths', 'Enterprise support'],
        color: '#3b82f6'
    },
    'learn-blog': {
        title: 'Engineering Blog',
        description: 'Deep dives into system design, architecture, and coding best practices. Read insights from top engineers and industry leaders.',
        icon: '📰',
        benefits: ['Technical deep dives', 'System design', 'Best practices', 'Industry trends'],
        color: '#f97316'
    },
    'learn-graph': {
        title: 'Knowledge Graph',
        description: 'Visualize your learning journey and identify skill gaps with our advanced Knowledge Graph technology. See exactly what you know and what to learn next.',
        icon: '🕸️',
        benefits: ['Visual skill mapping', 'Personalized path', 'Gap analysis', 'Progress tracking'],
        color: '#ec4899'
    },
    'prep-portfolio': {
        title: 'Portfolio Builder',
        description: 'Showcase your skills with a professional, data-backed portfolio. Highlight your projects and achievements to stand out to recruiters.',
        icon: '💼',
        benefits: ['Project showcase', 'GitHub integration', 'Live demos', 'Skill verification'],
        color: '#14b8a6'
    },
    'prep-resume': {
        title: 'Smart Resume Builder',
        description: 'Create ATS-friendly resumes that stand out. Our builder suggests improvements based on the job description you are targeting.',
        icon: '📄',
        benefits: ['ATS optimization', 'Professional templates', 'Keyword suggestions', 'PDF export'],
        color: '#10b981'
    },
    'prep-assessment': {
        title: 'Skill Assessment',
        description: 'Validate your expertise with our rigorous technical assessments. Earn badges and prove your proficiency to potential employers.',
        icon: '📝',
        benefits: ['Standardized tests', 'Skill badges', 'Detailed report', 'Benchmark scores'],
        color: '#8b5cf6'
    },
    'prep-mock': {
        title: 'AI Mock Interviews',
        description: 'Practice with our AI interviewer that adapts to your responses. Get instant feedback on your tone, content, and body language to ace your real interviews.',
        icon: '🤖',
        benefits: ['Real-time feedback', 'Industry-specific questions', 'Confidence building', 'Performance analytics'],
        color: '#8b5cf6'
    },
    'prep-projects': {
        title: 'Real-world Projects',
        description: 'Build production-grade applications that solve real problems. Deconstruct system designs of tech giants.',
        icon: '🚀',
        benefits: ['Full-stack projects', 'System design', 'Code reviews', 'Deployment guides'],
        color: '#e11d48'
    },
};

const FeaturePreview: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const feature = id ? featuresData[id] : null;

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pt-32 px-6">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="w-64 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                    <div className="w-full h-96 bg-white rounded-3xl border border-gray-100 animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!feature) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Feature not found</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <LandingNavbar />


            <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-12 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-lg"
                            style={{ backgroundColor: `${feature.color}20`, color: feature.color }}
                        >
                            {feature.icon}
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                            {feature.title}
                        </h1>

                        <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                            {feature.description}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                            {feature.benefits.map((benefit, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: feature.color }} />
                                    <span className="font-medium text-gray-700">{benefit}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/login')}
                                className="px-8 py-4 bg-[#7C3AED] text-white rounded-xl font-bold text-lg shadow-xl shadow-purple-500/30 flex items-center justify-center gap-3 w-full sm:w-auto"
                            >
                                <Lock size={20} />
                                Login to Access
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Right: Visual */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-[3rem] transform rotate-6 scale-95" />
                        <div className="relative bg-white rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <div className="relative z-10 flex flex-col gap-6">
                                {/* Mock UI Elements */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse" />
                                    <div className="space-y-2">
                                        <div className="w-32 h-4 bg-gray-100 rounded animate-pulse" />
                                        <div className="w-20 h-3 bg-gray-50 rounded animate-pulse" />
                                    </div>
                                </div>
                                <div className="h-40 bg-gray-50 rounded-2xl w-full animate-pulse" />
                                <div className="space-y-3">
                                    <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                                    <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
                                    <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
                                </div>

                                <div className="mt-8 pt-8 border-t border-gray-100 flex justify-between items-center">
                                    <div className="text-sm font-bold text-[#7C3AED]">PREMIUM FEATURE</div>
                                    <div className="px-4 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                                        LOCKED
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default FeaturePreview;

