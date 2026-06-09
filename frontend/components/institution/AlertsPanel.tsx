
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, Star, Info, ChevronRight, Zap, Clock } from 'lucide-react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { useInstitutionEvents } from '../../hooks/useInstitutionEvents';

interface AlertsPanelProps {
    institutionId?: string;
    onUpgrade?: () => void;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ institutionId, onUpgrade }) => {
    const [activeTab, setActiveTab] = useState('upcoming');
    const [alerts, setAlerts] = useState<any[]>([]);
    const { events: summaryEvents, loading: eventsLoading } = useInstitutionEvents(institutionId);
    const [loading, setLoading] = useState(true);

    const upcomingEvents = React.useMemo(() => {
        const now = new Date();
        return summaryEvents
            .filter((e) => new Date(e.start_date || e.created_at) >= now)
            .sort((a, b) => new Date(a.start_date || a.created_at).getTime() - new Date(b.start_date || b.created_at).getTime())
            .slice(0, 5);
    }, [summaryEvents]);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!institutionId) {
                setAlerts([]);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const notifRes = await fetch(`${API_BASE_URL}/api/v1/institution/notifications/${institutionId}`, { headers: { ...authHeaders() } });
                if (notifRes.ok) {
                    const notifData = await notifRes.json();
                    setAlerts(Array.isArray(notifData) ? notifData : []);
                }
            } catch (err) {
                try { console.error("Failed to load alerts:", err instanceof Error ? err.message : String(err)); } catch (_) {}
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [institutionId]);

    const formatTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "10:00 AM";
        }
    };

    const formatDateLabel = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (date.toDateString() === now.toDateString()) return "Today";
            if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) {
            return "Upcoming";
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/20 border border-slate-100 overflow-hidden h-full flex flex-col font-sans">
            {/* Tab Header */}
            <div className="p-6 pb-0">
                <div className="flex items-center gap-6 border-b border-slate-50">
                    <button 
                        onClick={() => setActiveTab('upcoming')}
                        className={`text-[11px] font-black uppercase tracking-[0.2em] relative pb-4 transition-all ${activeTab === 'upcoming' ? 'text-[#6C3BFF]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Upcoming Activity
                        {activeTab === 'upcoming' && (
                            <motion.div layoutId="panelTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#6C3BFF] rounded-full" />
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('new')}
                        className={`text-[11px] font-black uppercase tracking-[0.2em] relative pb-4 transition-all ${activeTab === 'new' ? 'text-[#6C3BFF]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        What's New
                        {activeTab === 'new' && (
                            <motion.div layoutId="panelTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#6C3BFF] rounded-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
                <AnimatePresence mode="wait">
                    {activeTab === 'upcoming' ? (
                        <motion.div 
                            key="upcoming"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-6"
                        >
                            {upcomingEvents.length > 0 ? upcomingEvents.map((item) => {
                                const timeStr = formatTime(item.start_date || item.created_at);
                                return (
                                    <div key={item._id} className="group flex items-start gap-4 cursor-pointer">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 group-hover:border-[#6C3BFF] transition-colors">
                                            <span className="text-[10px] font-black text-[#6C3BFF] uppercase tracking-tighter">{timeStr.split(' ')[1]}</span>
                                            <span className="text-sm font-black text-slate-900 leading-tight">{timeStr.split(' ')[0]}</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900 group-hover:text-[#6C3BFF] transition-colors">{item.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock size={12} className="text-slate-300" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDateLabel(item.start_date || item.created_at)}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-200 mt-2 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Calendar size={24} className="text-slate-200" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No upcoming activities</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="new"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-6"
                        >
                         {/* Real Notifications List */}
                        <div className="space-y-4">
                            {alerts.length > 0 ? (
                                alerts.map((n, idx) => (
                                    <motion.div 
                                        key={n.id || idx}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="group relative p-4 bg-slate-50/50 hover:bg-[#6C3BFF]/5 rounded-3xl border border-transparent hover:border-[#6C3BFF]/10 transition-all cursor-pointer"
                                    >
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#6C3BFF] transition-all">
                                                <Zap size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 leading-snug group-hover:text-[#6C3BFF] transition-colors">{n.message || 'Notification'}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                    {n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="p-10 text-center opacity-40">
                                    <Bell className="mx-auto mb-4" size={32} />
                                    <p className="text-sm font-medium italic">No new notifications...</p>
                                </div>
                            )}
                        </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Section Removed to match high-fidelity design */}
        </div>
    );
};

export default AlertsPanel;

