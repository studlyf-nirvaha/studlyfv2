import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, TrendingUp, Users, Search, RefreshCw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, authHeaders } from '../../apiConfig';

interface LeaderboardEntry {
    rank: number;
    team_id: string;
    team_name: string;
    project_title: string;
    score: number;
    evaluations_count: number;
    status: string;
}

interface LeaderboardProps {
    eventId: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ eventId }) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            let res = await fetch(`${API_BASE_URL}/api/judging/leaderboard/${eventId}`, {
                headers: { ...authHeaders() }
            });
            let data = [];
            if (res.ok) {
                data = await res.json();
            }

            // Fallback to unified integrated leaderboard if empty or failed
            if (!res.ok || !Array.isArray(data) || data.length === 0) {
                const fallbackRes = await fetch(`${API_BASE_URL}/api/v1/institution/leaderboard/${eventId}`, {
                    headers: { ...authHeaders() }
                });
                if (fallbackRes.ok) {
                    res = fallbackRes;
                    data = await fallbackRes.json();
                }
            }

            if (res.ok) {
                const mapped = (Array.isArray(data) ? data : []).map((d: any) => ({
                    rank: d.rank,
                    team_id: d.student_id || d.team_id || d.participant_id || '',
                    team_name: d.team_name || d.teamName || d.student_name || '',
                    project_title: d.project_title || d.project_name || d.projectTitle || d.student_name || 'Individual',
                    score: Number(d.total_score ?? d.totalScore ?? d.score ?? 0),
                    evaluations_count: d.judge_count || 1,
                    status: 'Evaluated'
                }));
                setEntries(mapped);
                setLastUpdated(new Date());
            }
        } catch (error) {
            try { console.error("Failed to fetch leaderboard", error instanceof Error ? error.message : String(error)); } catch (_) {}
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        
        // Connect to WebSocket for real-time updates instead of polling
        const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + `/ws/events/${eventId}`;
        let ws: WebSocket;
        
        const connectWs = () => {
            ws = new WebSocket(wsUrl);
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "LEADERBOARD_UPDATE" || data.type === "JUDGE_EVALUATION") {
                        fetchLeaderboard(); // Refetch or apply granular update
                    }
                } catch (e) {
                    console.error("WebSocket message error:", e);
                }
            };
            
            ws.onclose = () => {
                // Try to reconnect after 5 seconds if connection drops
                setTimeout(connectWs, 5000);
            };
        };
        
        connectWs();
        
        return () => {
            if (ws) {
                ws.onclose = null; // Prevent reconnect loop on unmount
                ws.close();
            }
        };
    }, [eventId]);

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1: return { 
                bg: 'bg-gradient-to-br from-yellow-400 to-amber-600', 
                text: 'text-white', 
                icon: <Crown className="text-yellow-400 fill-yellow-400" size={24} />,
                glow: 'shadow-yellow-500/30'
            };
            case 2: return { 
                bg: 'bg-gradient-to-br from-slate-300 to-slate-500', 
                text: 'text-white', 
                icon: <Medal className="text-slate-300 fill-slate-300" size={24} />,
                glow: 'shadow-slate-400/20'
            };
            case 3: return { 
                bg: 'bg-gradient-to-br from-orange-400 to-orange-700', 
                text: 'text-white', 
                icon: <Medal className="text-orange-400 fill-orange-400" size={24} />,
                glow: 'shadow-orange-500/20'
            };
            default: return { 
                bg: 'bg-slate-800', 
                text: 'text-slate-400', 
                icon: <span className="font-black text-lg">#{rank}</span>,
                glow: ''
            };
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto py-12 px-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 text-purple-400 text-xs font-black uppercase tracking-[0.2em] mb-2">
                        <Trophy size={16} /> Championship Rankings
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Event Leaderboard</h1>
                    <p className="text-slate-500 text-sm font-medium mt-2">Real-time rankings calculated from evaluator protocols.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Synced</p>
                        <p className="text-xs font-bold text-slate-300">{lastUpdated.toLocaleTimeString()}</p>
                    </div>
                    <button 
                        onClick={fetchLeaderboard}
                        className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group"
                    >
                        <RefreshCw size={20} className={`text-slate-400 group-hover:text-white transition-all ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Remaining Rankings */}
            <div className="bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Rank</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contender</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Project</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Score</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {entries.map((entry, idx) => (
                                <motion.tr 
                                    key={entry.team_id || idx}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td className="px-10 py-8">
                                        {(() => {
                                            const style = getRankStyle(entry.rank);
                                            if (entry.rank <= 3) {
                                                return (
                                                    <div className="flex items-center gap-2.5">
                                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shadow-lg ${style.bg} ${style.glow}`}>
                                                            {entry.rank}
                                                        </span>
                                                        {style.icon}
                                                    </div>
                                                );
                                            }
                                            return <span className="text-lg font-black text-slate-600 group-hover:text-white transition-colors">#{entry.rank}</span>;
                                        })()}
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-slate-400 border border-white/5">
                                                {entry.team_name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-white text-sm">{entry.team_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">{entry.project_title}</span>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-sm font-black text-white">{entry.score}</span>
                                            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500" style={{ width: `${(entry.score / 10) * 100}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${entry.status === 'Scored' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                                            {entry.status}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))}
                            {entries.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-10 py-24 text-center">
                                        <Zap size={32} className="text-slate-800 mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Data not yet available in current sector</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;

