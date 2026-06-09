import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useInstitutionEvents } from '../../hooks/useInstitutionEvents';

interface RecentListingsProps {
    institutionId: string;
    onViewEvent?: (eventId: string, status?: string) => void;
    onViewAll?: () => void;
}

const RecentListings: React.FC<RecentListingsProps> = ({ institutionId, onViewEvent, onViewAll }) => {
    const { events, loading } = useInstitutionEvents(institutionId);
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[450px] flex flex-col font-sans">
            <div className="p-6">
                <h3 className="text-lg font-bold text-slate-700">Recent Listing</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6">
                {events.length > 0 ? (
                    <div className="space-y-4">
                        {events.slice(0, 5).map((event, idx) => (
                            <motion.div 
                                key={event._id || idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => onViewEvent?.(event._id, event.status)}
                                className="group p-4 bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-purple-100/50 rounded-2xl border border-transparent hover:border-purple-100 transition-all cursor-pointer flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-500 font-bold group-hover:scale-110 transition-transform overflow-hidden">
                                        {(() => {
                                            const logoSrc = event.logo_url || event.logo || event.institution_logo_url || event.institution_logo || event.image_url || event.image || '';
                                            const eid = event._id || '';
                                            if (logoSrc && !imgErrors[eid]) {
                                                return <img src={logoSrc} className="w-full h-full object-cover" alt={event.title || 'Logo'} onError={() => setImgErrors(prev => ({...prev, [eid]: true}))} />;
                                            }
                                            return event.category?.charAt(0) || 'E';
                                        })()}
                                    </div>
                                    <div>
                                        <div className="flex items-center flex-wrap gap-2">
                                            <p className="text-sm font-bold text-slate-900 group-hover:text-[#6C3BFF] transition-colors line-clamp-1">{event.title}</p>
                                            {event.status?.toUpperCase() === 'DRAFT' ? (
                                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                    Draft
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                    Live
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{event.category}</p>
                                    </div>
                                </div>
                                <div className="p-2 bg-white rounded-lg text-slate-300 group-hover:text-[#6C3BFF] group-hover:bg-purple-50 transition-all">
                                    <ChevronRight size={16} />
                                </div>
                            </motion.div>
                        ))}
                        <button 
                            onClick={onViewAll}
                            className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-[#6C3BFF] transition-all"
                        >
                            View All Opportunities
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative w-64 h-64 mb-6"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent rounded-full blur-3xl" />
                            <img 
                                src="https://img.freepik.com/free-vector/no-data-concept-illustration_114360-536.jpg" 
                                alt="No results" 
                                className="w-full h-full object-contain relative z-10 mix-blend-multiply"
                            />
                        </motion.div>
                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                            No matching opportunities found
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentListings;

