import React from 'react';
import { Calendar, MapPin, Briefcase, ChevronRight, Building2, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { plainTextFromRichContent, formatOpportunityLocation, getOpportunityDeadline } from '../../utils/text';

interface OpportunityCardProps {
    opportunity: {
        _id: string;
        title: string;
        organization: string;
        type: string;
        description: string;
        location?: string;
        deadline: string;
        applicantsCount: number;
    };
    isApplied?: boolean;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, isApplied }) => {
    const navigate = useNavigate();

    const getTypeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'hackathon': return 'bg-purple-100 text-purple-600 border-purple-200';
            case 'internship': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'job': return 'bg-green-100 text-green-600 border-green-200';
            case 'competition': return 'bg-orange-100 text-orange-600 border-orange-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const locationText = formatOpportunityLocation(opportunity.location);
    const isRemote = locationText.toLowerCase().includes('remote') || locationText.toLowerCase().includes('online');

    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="min-w-[320px] max-w-[320px] group bg-white rounded-[32px] p-[2px] shadow-sm hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-500 cursor-pointer relative overflow-hidden"
            onClick={() => navigate(`/opportunities/${opportunity._id}`)}
        >
            {/* Hover Gradient Border Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-200 via-indigo-200 to-purple-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="bg-white rounded-[30px] p-6 h-full flex flex-col relative z-10 overflow-hidden">
                {/* Subtle corner glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-purple-100 to-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="flex-1 flex flex-col relative z-10">
                    {/* Header Mobile Org */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/60 shadow-inner flex items-center justify-center text-slate-400 group-hover:border-purple-200 group-hover:text-purple-500 group-hover:bg-purple-50 transition-all">
                            <Building2 size={20} strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-bold text-slate-500">{opportunity.organization}</span>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] shadow-sm ${getTypeColor(opportunity.type)}`}>
                            {opportunity.type}
                        </span>
                        {isRemote && (
                            <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1 shadow-sm">
                                <Globe size={10} /> Remote
                            </span>
                        )}
                        {isApplied && (
                            <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] bg-slate-900 text-white flex items-center gap-1 shadow-md shadow-slate-900/20">
                                Applied
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <div className="mb-3">
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-700 group-hover:to-indigo-700 transition-colors tracking-tight leading-[1.2] line-clamp-2">
                            {opportunity.title}
                        </h3>
                    </div>

                    <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed max-w-2xl mb-6">
                        {plainTextFromRichContent(opportunity.description)}
                    </p>

                    {/* Footer Metadata */}
                    <div className="mt-auto pt-5 border-t border-slate-100 flex flex-col gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
                                <Calendar size={12} className="text-slate-400" />
                                {new Date(getOpportunityDeadline(opportunity)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </div>
                            {locationText && !isRemote ? (
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg max-w-[120px] truncate">
                                    <MapPin size={12} className="text-slate-400 shrink-0" />
                                    <span className="truncate">{locationText}</span>
                                </div>
                            ) : null}
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2 shrink-0">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${opportunity._id + i}`} alt="user" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">+{opportunity.applicantsCount}</span>
                            </div>

                            <button 
                                disabled={isApplied}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                                    isApplied
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-inner'
                                    : 'bg-slate-900 text-white group-hover:bg-purple-600 shadow-xl shadow-slate-900/10 group-hover:shadow-purple-600/30 group-hover:-translate-y-0.5'
                                }`}
                            >
                                {isApplied ? 'Applied' : 'Apply Now'}
                                {!isApplied && <ChevronRight size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default OpportunityCard;

