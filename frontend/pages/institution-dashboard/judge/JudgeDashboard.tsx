import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Filter, Eye, CheckCircle, XCircle, ExternalLink, Github, 
    Play, FileText, MessageSquare, TrendingUp, Clock, Trophy, 
    Zap, Users, Target, Award, ArrowUpRight, Gavel, Star, LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, authHeaders } from '../../../apiConfig';
import { useAuth } from '../../../AuthContext';

const JudgeDashboard: React.FC = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [stats, setStats] = useState({
        pending: 0,
        completed: 0,
        avgScore: 0,
        activeEvents: 0
    });
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Invitation & Filtering State
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [inviteBusy, setInviteBusy] = useState(false);
    const [eventFilter, setEventFilter] = useState('');
    
    // Scoring Modal State (Bringing back original functionality)
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [scoringCriteria, setScoringCriteria] = useState<any[]>([]);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [comments, setComments] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const q = eventFilter ? `?event_id=${encodeURIComponent(eventFilter)}` : '';
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/judge/my-assignments${q}`, {
                headers: { ...authHeaders() }
            });
            if (res.ok) {
                const data = await res.json();
                setAssignments(data);
                
                // Calculate Stats
                const completed = data.filter((a: any) => a.existing_scores).length;
                const pending = data.length - completed;
                
                let totalScoreSum = 0;
                let scoredAssignmentsCount = 0;
                data.forEach((a: any) => {
                    if (a.existing_scores && a.existing_scores.scores) {
                        const scoresObj = a.existing_scores.scores;
                        const scoreValues = Object.values(scoresObj) as number[];
                        if (scoreValues.length > 0) {
                            const avgAssignmentScore = scoreValues.reduce((sum, val) => sum + val, 0) / scoreValues.length;
                            totalScoreSum += avgAssignmentScore;
                            scoredAssignmentsCount++;
                        }
                    }
                });
                const avgScore = scoredAssignmentsCount > 0 ? Number((totalScoreSum / scoredAssignmentsCount).toFixed(1)) : 0;

                setStats({
                    pending,
                    completed,
                    avgScore,
                    activeEvents: new Set(data.map((a: any) => a.event_id)).size
                });
            }
        } catch (error) {
            try { console.error("Failed to fetch assignments", error instanceof Error ? error.message : String(error)); } catch (_) {}
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingInvites = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/judge/my-invitations`, {
                headers: { ...authHeaders() },
            });
            if (res.ok) {
                setPendingInvites(await res.json());
            }
        } catch {
            /* non-fatal */
        }
    };

    useEffect(() => {
        fetchData();
        fetchPendingInvites();
    }, [eventFilter]);

    const respondInvitation = async (accept: boolean, invite: { event_id?: string; invitation_token?: string }) => {
        setInviteBusy(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/judge/respond-invitation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    accept,
                    event_id: invite.event_id,
                    token: invite.invitation_token,
                }),
            });
            if (res.ok) {
                alert(accept ? 'Invitation accepted. The institution admin has been notified.' : 'Invitation declined.');
                fetchPendingInvites();
                fetchData();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || 'No invitation found for your account email.');
            }
        } catch {
            alert('Network error.');
        } finally {
            setInviteBusy(false);
        }
    };

    const handleOpenScoring = async (assignment: any) => {
        setSelectedAssignment(assignment);
        setComments(assignment.existing_scores?.comments || '');
        setScores(assignment.existing_scores?.scores || {});
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/judge/criteria/${assignment.event_id}`, {
                headers: { ...authHeaders() }
            });
            if (res.ok) {
                const data = await res.json();
                setScoringCriteria(data);
                // Initialize scores if not exists
                if (!assignment.existing_scores) {
                    const initial: Record<string, number> = {};
                    data.forEach((c: any) => { initial[c.name] = 5; });
                    setScores(initial);
                }
            }
        } catch (error) {
            try { console.error("Failed to fetch criteria", error instanceof Error ? error.message : String(error)); } catch (_) {}
        }
    };

    const handleSaveScore = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/judge/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    submission_id: selectedAssignment._id,
                    event_id: selectedAssignment.event_id,
                    team_id: selectedAssignment.team_id || selectedAssignment.teamId || '',
                    scores,
                    comments
                }),
            });
            if (res.ok) {
                alert('Score synchronized to blockchain.');
                setSelectedAssignment(null);
                fetchData();
            } else {
                const err = await res.json().catch(() => ({}));
                try { console.error('Score submission failed:', err instanceof Error ? err.message : String(err)); } catch (_) {}
            }
        } catch (error) {
            alert('Sync failed.');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const matchesStatus = filterStatus === 'All' || 
                (filterStatus === 'Completed' && a.existing_scores) || 
                (filterStatus === 'Pending' && !a.existing_scores);
            const matchesSearch = a.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                a.team_name?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [assignments, filterStatus, searchQuery]);

    const statCards = [
        { label: 'Pending Assessment', value: stats.pending, icon: <Clock size={20} />, color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/20', text: 'text-purple-600', valueText: 'text-slate-800' },
        { label: 'Evaluations Completed', value: stats.completed, icon: <CheckCircle size={20} />, color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/20', text: 'text-purple-600', valueText: 'text-slate-800' },
        { label: 'Average Score Given', value: stats.avgScore, icon: <TrendingUp size={20} />, color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/20', text: 'text-purple-600', valueText: 'text-slate-800' },
        { label: 'Active Hackathons', value: stats.activeEvents, icon: <Trophy size={20} />, color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/20', text: 'text-purple-600', valueText: 'text-slate-800' },
    ];

    if (loading && assignments.length === 0) return (
        <div className="h-96 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-12 pb-12 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Evaluator Command Center</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        Network Status: Synchronized • Welcome back, {user?.name || 'Judge'}
                    </p>
                </div>
                
            </div>

            {pendingInvites.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-sm font-black text-amber-400 uppercase tracking-widest">Pending Invitations</h2>
                    {pendingInvites.map((inv) => (
                        <div key={inv._id} className="p-6 rounded-[2rem] border border-amber-500/30 bg-amber-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="text-lg font-black text-white">{inv.event_name || 'Event invitation'}</p>
                                <p className="text-xs text-amber-200/80 font-bold mt-1">
                                    Invited {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'recently'}
                                    {inv.expertise ? ` • ${inv.expertise}` : ''}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    disabled={inviteBusy}
                                    onClick={() => respondInvitation(true, inv)}
                                    className="px-5 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 disabled:opacity-50"
                                >
                                    Accept
                                </button>
                                <button
                                    disabled={inviteBusy}
                                    onClick={() => respondInvitation(false, inv)}
                                    className="px-5 py-3 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 disabled:opacity-50"
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {statCards.map((s, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`p-8 bg-gradient-to-br ${s.color} border ${s.border} rounded-[2.5rem] relative overflow-hidden group hover:scale-[1.02] transition-all cursor-default shadow-xl`}
                    >
                        <div className={`absolute top-[-20px] right-[-20px] opacity-10 group-hover:scale-150 transition-transform duration-700 ${s.text}`}>
                            {s.icon}
                        </div>
                        <div className={`w-12 h-12 bg-gradient-to-br ${s.color} rounded-2xl flex items-center justify-center ${s.text} border ${s.border} mb-6 shadow-inner`}>
                            {s.icon}
                        </div>
                        <h3 className={`text-3xl font-black mb-1 tracking-tighter ${s.valueText}`}>{s.value}</h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${s.text}`}>{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Assignments List Area */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-black text-white flex items-center gap-3">
                            <Zap size={20} className="text-purple-500" />
                            Assigned Projects
                        </h2>
                        <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
                            {['All', 'Pending', 'Completed'].map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setFilterStatus(t)}
                                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterStatus === t ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Filter by Team or Project..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredAssignments.length > 0 ? filteredAssignments.map((sub, idx) => (
                        <motion.div 
                            key={sub._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group p-8 bg-white/5 border border-white/5 rounded-[2.5rem] hover:bg-white/10 transition-all hover:border-white/10 shadow-lg relative overflow-hidden"
                        >
                            {/* Background Glow */}
                            <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity ${sub.existing_scores ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                            
                            <div className="flex justify-between items-start relative z-10">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-black text-white group-hover:text-purple-400 transition-colors leading-tight">{sub.project_title}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-black text-slate-400">
                                                <Users size={10} />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sub.team_name}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {sub.github_link && (
                                            <a href={sub.github_link} target="_blank" rel="noreferrer" className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                <Github size={14} />
                                            </a>
                                        )}
                                        {sub.demo_link && (
                                            <a href={sub.demo_link} target="_blank" rel="noreferrer" className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                <Play size={14} />
                                            </a>
                                        )}
                                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${sub.existing_scores ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                            {sub.existing_scores ? 'Evaluated' : 'Awaiting Review'}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right flex flex-col items-end gap-6">
                                    {sub.existing_scores ? (
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Score</p>
                                            <div className="text-3xl font-black text-emerald-400 tracking-tighter">
                                                {(Object.values(sub.existing_scores.scores || {}).reduce((a:any,b:any)=>a+b, 0) / Object.keys(sub.existing_scores.scores || {}).length).toFixed(1)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-slate-700">
                                            <TrendingUp size={20} />
                                        </div>
                                    )}
                                    
                                    <button 
                                        onClick={() => handleOpenScoring(sub)}
                                        className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${sub.existing_scores ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-purple-600 text-white hover:bg-purple-500 shadow-xl shadow-purple-900/20'}`}
                                    >
                                        {sub.existing_scores ? 'Edit Score' : 'Begin Evaluation'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )) : (
                        <div className="col-span-full py-32 text-center space-y-4">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-800">
                                <Target size={40} />
                            </div>
                            <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em]">No project data found in current sector</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Scoring Modal (Re-integrating 320 lines worth of logic/UI) */}
            <AnimatePresence>
                {selectedAssignment && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl overflow-y-auto py-12">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="bg-[#020617] border border-white/10 rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2">
                                {/* Left Side: Project Context */}
                                <div className="p-12 space-y-10 border-r border-white/5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-purple-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Protocol Active</p>
                                            <h2 className="text-3xl font-black text-white tracking-tight">{selectedAssignment.project_title}</h2>
                                            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Unit: {selectedAssignment.team_name}</p>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedAssignment(null)}
                                            className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-500 hover:text-white"
                                        >
                                            <XCircle size={24} />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Abstract</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                            {selectedAssignment.description || "The team has not provided a detailed abstract for this protocol yet."}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-3">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resources</p>
                                            <div className="space-y-2">
                                                {selectedAssignment.github_link && (
                                                    <a href={selectedAssignment.github_link} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-xs font-bold text-slate-300 hover:text-purple-400 transition-colors">
                                                        <Github size={16} /> Repository URL
                                                    </a>
                                                )}
                                                {selectedAssignment.demo_link && (
                                                    <a href={selectedAssignment.demo_link} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-xs font-bold text-slate-300 hover:text-purple-400 transition-colors">
                                                        <Play size={16} /> Live Prototype
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {/* Deliverable Files */}
                                        {(() => {
                                            const subData = selectedAssignment.data || {};
                                            const fileEntries = Object.entries(subData).filter(([_, v]) =>
                                                (typeof v === 'object' && v && (v as any)._stored_file) ||
                                                (typeof v === 'string' && (v.startsWith('data:') || v.startsWith('http://') || v.startsWith('https://')) && !(v.includes('github.com') || v.includes('youtube.com') || v.includes('vimeo.com') || v.includes('drive.google.com')))
                                            );
                                            if (fileEntries.length === 0) return null;
                                            return (
                                                <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-3">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deliverable Files</p>
                                                    <div className="space-y-2">
                                                        {fileEntries.map(([key, value]) => {
                                                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                                                            if (typeof value === 'object' && value && (value as any)._stored_file) {
                                                                const f = value as any;
                                                                const ext = (f.filename || '').split('.').pop()?.toUpperCase() || 'FILE';
                                                                const isPdf = (f.mime || '').includes('pdf') || ext === 'PDF';
                                                                const isPpt = (f.mime || '').includes('presentation') || ext === 'PPT' || ext === 'PPTX';
                                                                return (
                                                                    <a key={key} href={f.url || '#'}
                                                                        target={f.url ? '_blank' : undefined}
                                                                        rel="noreferrer"
                                                                        className="flex items-center gap-3 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors">
                                                                        <FileText size={16} />
                                                                        {isPdf ? 'View PDF' : isPpt ? 'View PPT' : f.filename || 'View File'}
                                                                    </a>
                                                                );
                                                            }
                                                            if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                                                                return (
                                                                    <a key={key} href={value} target="_blank" rel="noreferrer"
                                                                        className="flex items-center gap-3 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors">
                                                                        <ExternalLink size={16} /> {label}
                                                                    </a>
                                                                );
                                                            }
                                                            if (typeof value === 'string' && value.startsWith('data:')) {
                                                                const mime = value.split(';')[0].split(':')[1] || '';
                                                                const isPdf = mime.includes('pdf');
                                                                const isPpt = mime.includes('presentation');
                                                                return (
                                                                    <button key={key} onClick={() => window.open(value, '_blank')}
                                                                        className="flex items-center gap-3 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors">
                                                                        <FileText size={16} />
                                                                        {isPdf ? 'View PDF' : isPpt ? 'View PPT' : 'View File'}
                                                                    </button>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-3">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phase</p>
                                            <div className="flex items-center gap-2 text-white font-black text-sm">
                                                <Clock size={16} className="text-purple-500" /> Stage 01
                                            </div>
                                        </div>
                                    </div>

                                    {/* Score Visualization */}
                                    <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aggregate Assessment</p>
                                            <p className="text-4xl font-black text-white tracking-tighter">
                                                {(Object.values(scores).reduce((a,b)=>a+b, 0) / (scoringCriteria.length || 1)).toFixed(1)}
                                                <span className="text-lg text-slate-700 ml-1">/10</span>
                                            </p>
                                        </div>
                                        <div className="w-20 h-20 relative">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                                <circle 
                                                    cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                                    strokeDasharray={226.2}
                                                    strokeDashoffset={226.2 - (226.2 * (Object.values(scores).reduce((a,b)=>a+b, 0) / (scoringCriteria.length || 1) / 10))}
                                                    className="text-purple-500 transition-all duration-500"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-purple-400">Score</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Scoring Engine */}
                                <div className="p-12 bg-white/5 space-y-10">
                                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                                        <Gavel size={20} className="text-purple-500" />
                                        Evaluation Matrix
                                    </h2>

                                    <div className="space-y-8 max-h-[400px] overflow-y-auto pr-4 no-scrollbar">
                                        {scoringCriteria.map((criterion, idx) => (
                                            <div key={idx} className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-black text-white uppercase tracking-widest">{criterion.name}</label>
                                                    <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] font-black border border-purple-500/20">{scores[criterion.name] || 0}</span>
                                                </div>
                                                <input 
                                                    type="range" min="0" max="10" step="0.5"
                                                    value={scores[criterion.name] || 0}
                                                    onChange={(e) => setScores({ ...scores, [criterion.name]: parseFloat(e.target.value) })}
                                                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-purple-500"
                                                />
                                                <p className="text-[10px] text-slate-500 font-medium italic">Weight: {criterion.weight || 1}x</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <MessageSquare size={14} /> Evaluator Notes
                                        </h3>
                                        <textarea 
                                            value={comments}
                                            onChange={(e) => setComments(e.target.value)}
                                            placeholder="Provide technical feedback for the team..."
                                            className="w-full h-32 p-6 bg-[#020617] border border-white/5 rounded-[2rem] text-sm font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all placeholder:text-slate-700 resize-none"
                                        />
                                    </div>

                                    <button 
                                        onClick={handleSaveScore}
                                        disabled={isSaving}
                                        className="w-full py-6 bg-white text-[#020617] rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-purple-400 transition-all shadow-2xl shadow-purple-500/20 disabled:opacity-50"
                                    >
                                        {isSaving ? 'Synchronizing...' : 'Finalize Assessment'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JudgeDashboard;

