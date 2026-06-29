
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Phone, Mail, User, Building, MessageSquare } from 'lucide-react';

interface ContactConsultationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    user?: any;
    institutionId?: string;
}

const ContactConsultationDrawer: React.FC<ContactConsultationDrawerProps> = ({ isOpen, onClose, user }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        mobile: '',
        organisation: '',
        interest: ''
    });

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            onClose();
            alert("Thank you! Our team will contact you shortly.");
        }, 1500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999]"
                    />
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-[500px] bg-white z-[1000] shadow-2xl overflow-y-auto font-sans"
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold text-slate-800">Schedule a 1:1 consultation</h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            required
                                            type="text" 
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm font-medium"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        Email ID <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            required
                                            type="email" 
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm font-medium"
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        Mobile No. <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 shrink-0">
                                            <img src="https://flagcdn.com/in.svg" className="w-5 h-3.5 rounded-sm object-cover" alt="India" />
                                            <span className="text-sm font-bold text-slate-700">+91</span>
                                        </div>
                                        <div className="relative flex-1">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                required
                                                type="tel" 
                                                value={formData.mobile}
                                                onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm font-medium"
                                                placeholder="Enter mobile number"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        Organisation <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            required
                                            type="text" 
                                            value={formData.organisation}
                                            onChange={(e) => setFormData({...formData, organisation: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm font-medium"
                                            placeholder="Enter organisation name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        What's On Your Mind? <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <select 
                                            required
                                            value={formData.interest}
                                            onChange={(e) => setFormData({...formData, interest: e.target.value})}
                                            className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm font-medium appearance-none cursor-pointer"
                                        >
                                            <option value="">Please select interest</option>
                                            <option value="brand_engage">Brand & Engage (Employer Branding Activities)</option>
                                            <option value="hiring_automation">Hiring Automation Solutions (ATS, AI Screening, Candidate Tracking etc.)</option>
                                            <option value="organize_events">Organize Hackathons, Ideathons, Case-Competitions, etc.</option>
                                            <option value="sourcing">Sourcing Candidates</option>
                                            <option value="assessments">Assessments with Next Gen Proctoring (Skill & Domain Specific)</option>
                                            <option value="ai_interviews">AI Interviews & Virtual Interview Platform</option>
                                            <option value="others">Others / Any specific query</option>
                                        </select>
                                        <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Submit Your Details'}
                                    {!loading && <ChevronRight size={18} />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ContactConsultationDrawer;

