
import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Filter, 
    Eye, 
    CheckCircle2, 
    X, 
    ExternalLink, 
    Github, 
    Play, 
    FileText, 
    TrendingUp, 
    Loader2, 
    ArrowRight, 
    Calendar, 
    User, 
    Trophy, 
    LayoutDashboard, 
    Bell, 
    Download, 
    ShieldCheck, 
    BarChart3,
    Plus,
    Gavel,
    Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, authHeaders } from '../../../apiConfig';

interface SubmissionListProps {
    institutionId?: string;
}

const SubmissionList: React.FC<SubmissionListProps> = ({ institutionId }) => {
    const [submissions, setSubmissions] = useState<any>({ shortlisted: [], accepted: [], pending: [], rejected: [], summary: {}, all: [] });
    const [stageSubmissions, setStageSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('shortlisted');
    const [submissionSubTab, setSubmissionSubTab] = useState<'projects' | 'assets'>('projects');
    const [availableJudges, setAvailableJudges] = useState<any[]>([]);
    const [judgeAssignmentModal, setJudgeAssignmentModal] = useState<{isOpen: boolean, submissionId: string | null, sourceType?: 'legacy' | 'hackathon'}>({ isOpen: false, submissionId: null });
    const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [hackathonSubmissions, setHackathonSubmissions] = useState<any[]>([]);
    const [judgeFilter, setJudgeFilter] = useState('All Judges');
    const [institutionJudges, setInstitutionJudges] = useState<any[]>([]);
    const [evaluatingSubmission, setEvaluatingSubmission] = useState<any>(null);
    const [evaluationScores, setEvaluationScores] = useState<any>({});
    const [evaluationComment, setEvaluationComment] = useState('');
    const [criteria, setCriteria] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [eventPackages, setEventPackages] = useState<any[] | null>(null);
    const [previewAsset, setPreviewAsset] = useState<{ url: string; filename: string } | null>(null);
    const [page, setPage] = useState(1);
    const [assetPage, setAssetPage] = useState(1);
    const limit = 25;

    const [eventCriteria, setEventCriteria] = useState<any[]>([]);

    const currentBundle: any[] = (() => {
        const bucket = (submissions as any)?.[activeTab];
        if (Array.isArray(bucket)) return bucket;
        const all = (submissions as any)?.all;
        if (Array.isArray(all)) return all;
        return [];
    })();

    const filteredSubmissions = [
        ...currentBundle.map(s => ({
            ...s,
            sourceType: s.source === 'stage_deliverable' || s.type === 'stage' ? 'stage' : 'legacy',
            id: s.submission_id || s.team_id || s._id
        })),
        ...hackathonSubmissions.map(s => ({
            _id: s._id,
            id: s._id,
            submission_id: s._id,
            project_title: s.teamName,
            team_name: s.teamLead || 'Hackathon Team',
            event_title: s.eventName || s.hackathonId || 'Hackathon Submission',
            total_judges: s.assignedJudgeId ? 1 : 0,
            judges_completed: (s.evaluation_status === 'Evaluated' || s.status === 'Evaluated' || s.status === 'Pending Review') ? 1 : 0,
            score: s.totalScore || 0,
            status: s.status || 'Pending',
            assignedJudgeId: s.assignedJudgeId,
            hackathonId: s.hackathonId,
            sourceType: 'hackathon',
            solution: s.solution,
            domain: s.domain
        }))
    ].filter(s => {
        const matchesSearch = (s.project_title || s.stage_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (s.team_name || s.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (s.event_title || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesJudge = judgeFilter === 'All Judges' || s.assignedJudgeId === judgeFilter;
        return matchesSearch && matchesJudge;
    });

    useEffect(() => {
        const fetchCriteriaForSubmissions = async () => {
            if (filteredSubmissions.length > 0) {
                const firstSub = filteredSubmissions[0];
                if (firstSub.hackathonId) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/events/${firstSub.hackathonId}`, { headers: authHeaders() });
                        if (res.ok) {
                            const data = await res.json();
                            setEventCriteria(data.judging_criteria || []);
                        }
                    } catch (e) {
                        console.error('Failed to fetch criteria', e);
                    }
                }
            }
        };
        fetchCriteriaForSubmissions();
    }, [filteredSubmissions[0]?.hackathonId]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
    }, []);

    const fetchAll = async () => {
        if (!institutionId) return;
        try {
            setLoading(true);
            // Legacy Submissions
            const bundleRes = await fetch(
                `${API_BASE_URL}/api/v1/institution/submissions/${encodeURIComponent(institutionId)}`,
                { headers: { ...authHeaders() } }
            );
            const bundleData = await bundleRes.json();
            setSubmissions(bundleData);

            // Hackathon Submissions (New)
            const hackathonRes = await fetch(
                `${API_BASE_URL}/api/hackathons/institution/${institutionId}/submissions`,
                { headers: { ...authHeaders() } }
            );
            if (hackathonRes.ok) {
                const hData = await hackathonRes.json();
                setHackathonSubmissions(hData);
            }

            // Asset/Deliverables
            const assetRes = await fetch(
                `${API_BASE_URL}/api/v1/institution/submissions/all-deliverables?institution_id=${institutionId}`,
                { headers: { ...authHeaders() } }
            );
            if (assetRes.ok) {
                const assetData = await assetRes.json();
                setStageSubmissions(Array.isArray(assetData) ? assetData : []);
            }

            // Fetch Judges
            const judgesRes = await fetch(`${API_BASE_URL}/api/judges/`, { headers: authHeaders() });
            if (judgesRes.ok) {
                const jData = await judgesRes.json();
                // Filter by institution if needed, but the endpoint usually handles context or returns all for now
                setInstitutionJudges(jData);
            }

        } catch (error) {
            try { console.error('Error fetching submissions:', error instanceof Error ? error.message : String(error)); } catch (_) {}
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // fetch event packages for quick access
        const fetchEventConfig = async () => {
            if (!institutionId) return;
            try {
                const r = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/event-config`, { headers: authHeaders() });
                if (r.ok) {
                    const cfg = await r.json();
                    const raw = cfg?.event_packages;
                    if (raw) {
                        try {
                            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            if (Array.isArray(parsed)) setEventPackages(parsed);
                        } catch (e) {
                        }
                    }
                }
            } catch (e) {
                console.debug('No event-config for submissions', e);
            }
        };
        fetchEventConfig();
    }, [institutionId, refreshCounter]);

    const handleOpenJudgeAssignment = async (submissionId: string, sourceType?: 'legacy' | 'hackathon') => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/judges/`, { headers: { ...authHeaders() } });
            if (res.ok) {
                const judges = await res.json();
                setAvailableJudges(judges);
                setJudgeAssignmentModal({ isOpen: true, submissionId, sourceType });
            } else {
                alert('Failed to load available judges');
            }
        } catch (error) {
            try { console.error('Failed to fetch judges:', error instanceof Error ? error.message : String(error)); } catch (_) {}
            alert('Failed to load available judges');
        }
    };

    const handleAssignJudge = async (judgeId: string) => {
        const isBulk = selectedSubmissions.length > 0 && judgeAssignmentModal.submissionId === 'bulk';
        try {
            const idToType = new Map<string, 'legacy' | 'hackathon'>(
                filteredSubmissions.map((s: any) => [String(s.id || s.submission_id || s._id), s.sourceType || 'legacy'])
            );

            const targetIds = isBulk
                ? selectedSubmissions.map(String)
                : [String(judgeAssignmentModal.submissionId || '')].filter(Boolean);

            const hackathonIds = targetIds.filter((id) => (idToType.get(String(id)) || judgeAssignmentModal.sourceType) === 'hackathon');
            const legacyIds = targetIds.filter((id) => !hackathonIds.includes(id));

            // 1) Assign hackathon submissions
            if (hackathonIds.length > 0) {
                const hr = await fetch(`${API_BASE_URL}/api/hackathons/submissions/assign-judge`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ submission_ids: hackathonIds, judge_id: judgeId })
                });
                if (!hr.ok) {
                    const err = await hr.json().catch(() => ({}));
                    throw new Error(err?.detail || 'Failed to assign judge to hackathon submissions');
                }
            }

            // 2) Assign legacy submissions
            if (legacyIds.length > 0) {
                const body: any = { judge_id: judgeId };
                if (isBulk) body.submission_ids = legacyIds;
                else body.submission_id = legacyIds[0];

                const lr = await fetch(`${API_BASE_URL}/api/judges/assign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify(body)
                });
                if (!lr.ok) {
                    const err = await lr.json().catch(() => ({}));
                    throw new Error(err?.detail || 'Failed to assign judge');
                }
            }

            let msg = isBulk ? `Successfully assigned judge to ${targetIds.length} projects!` : 'Judge assigned successfully!';
            // Legacy endpoint may send email status; hackathon endpoint doesn't.
            if (legacyIds.length > 0) {
                msg += "\n\n(For hackathon submissions, email dispatch is not enabled yet.)";
            }
            alert(msg);
            setJudgeAssignmentModal({ isOpen: false, submissionId: null, sourceType: undefined });
            setSelectedSubmissions([]);
            setRefreshCounter(prev => prev + 1);
        } catch (error) {
            try { console.error('Error assigning judge:', error instanceof Error ? error.message : String(error)); } catch (_) {}
            alert((error as any)?.message || 'Network error while assigning judge');
        }
    };

    const handleStartEvaluate = async (sub: any) => {
        setEvaluatingSubmission(sub);
        setEvaluationScores({});
        setEvaluationComment('');
        
        try {
            // Fetch criteria for this specific hackathon
            const res = await fetch(`${API_BASE_URL}/api/events/${sub.hackathonId}`, { headers: authHeaders() });
            if (res.ok) {
                const eventData = await res.json();
                setCriteria(eventData.judging_criteria || []);
            }
        } catch (err) {
            try { console.error("Failed to fetch criteria", err instanceof Error ? err.message : String(err)); } catch (_) {}
        }
    };

    const handleEvaluateSubmission = async () => {
        if (!evaluatingSubmission || !user) return;
        try {
            const payload = {
                judgeId: user.user_id,
                rubricScores: evaluationScores,
                feedback: evaluationComment
            };
            const res = await fetch(`${API_BASE_URL}/api/hackathons/submissions/${evaluatingSubmission._id}/evaluate`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setEvaluatingSubmission(null);
                setRefreshCounter(prev => prev + 1);
                alert("Evaluation submitted!");
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to submit evaluation");
            }
        } catch (err) {
            try { console.error("Evaluation error:", err instanceof Error ? err.message : String(err)); } catch (_) {}
            alert("Network error while submitting evaluation");
        }
    };

    const handleUpdateStatus = async (submissionId: string, status: string) => {
        try {
            if (!submissionId) {
                console.error('Submission ID is undefined');
                alert('Invalid submission ID');
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/submissions/${submissionId}/status?t=${Date.now()}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setRefreshCounter(prev => prev + 1);
                setSelectedSubmission(null);
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            try { console.error('Error updating status:', error instanceof Error ? error.message : String(error)); } catch (_) {}
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Link copied to clipboard!');
        }).catch(err => {
            try { console.error('Failed to copy link: ', err instanceof Error ? err.message : String(err)); } catch (_) {}
        });
    };

    const getStatusColor = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'approved' || s === 'accepted') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (s === 'shortlisted') return 'bg-blue-50 text-blue-600 border-blue-100';
        if (s === 'pending review' || s === 'pending_review' || s === 'evaluated') return 'bg-amber-50 text-amber-600 border-amber-100';
        if (s === 'rejected') return 'bg-rose-50 text-rose-600 border-rose-100';
        return 'bg-slate-50 text-slate-500 border-slate-100';
    };

    const mimeMap: Record<string, string> = {
        'application/pdf': '.pdf',
        'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg',
        'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg',
        'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
    };

    const getAssetFilename = (dataUrl: string): string => {
        const mime = dataUrl.split(';')[0].split(':')[1] || '';
        const ext = mimeMap[mime] || '';
        return 'Deliverable' + ext;
    };

    const filteredTotalPages = Math.max(1, Math.ceil(filteredSubmissions.length / limit));
    const safeFilteredPage = Math.min(page, filteredTotalPages);
    const paginatedSubmissions = filteredSubmissions.slice((safeFilteredPage - 1) * limit, safeFilteredPage * limit);
    const assetTotalPages = Math.max(1, Math.ceil(stageSubmissions.length / limit));
    const safeAssetPage = Math.min(assetPage, assetTotalPages);
    const paginatedAssets = stageSubmissions.slice((safeAssetPage - 1) * limit, safeAssetPage * limit);

    if (loading) return (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-100 border-t-[#6C3BFF] rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Intelligence...</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            {/* Unified Command Center Banner */}
            <div className="p-12 bg-slate-950 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="space-y-6 max-w-2xl text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="px-5 py-2 bg-[#6C3BFF] text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(108,59,255,0.4)]">
                                Global Command
                            </div>
                            <div className="px-5 py-2 bg-white/10 backdrop-blur-md text-slate-300 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                                {submissions?.summary?.total || 0} Active Protocols
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-5xl font-black tracking-tighter leading-tight">Submissions Command Center</h3>
                            <p className="text-slate-400 text-lg font-medium leading-relaxed opacity-90">
                                Dynamically aggregate and approve candidate bundles across all institutional opportunities. View deliverables or dispatch final authorizations.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                            <button 
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`${API_BASE_URL}/api/v1/institution/trigger-global-reminders?institution_id=${institutionId}`, {
                                            method: 'POST',
                                            headers: { ...authHeaders() }
                                        });
                                        if (res.ok) alert("Global deadline alerts broadcasted successfully.");
                                        else alert("Failed to broadcast alerts.");
                                    } catch (e) {
                                        console.error(e);
                                        alert("Error broadcasting alerts.");
                                    }
                                }}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 group"
                            >
                                <Bell size={18} className="text-[#6C3BFF] group-hover:scale-110 transition-transform" /> 
                                Broadcast Deadline Alerts
                            </button>
                            <button className="px-8 py-4 bg-slate-900 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3">
                                <Download size={18} /> Export Protocol Data
                            </button>
                        </div>
                    </div>
                    <div className="relative hidden xl:block">
                        <div className="w-64 h-64 bg-[#6C3BFF]/20 rounded-full blur-[100px] absolute -top-10 -right-10"></div>
                        <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl relative z-10 space-y-6 min-w-[280px]">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Progress</span>
                                <TrendingUp size={16} className="text-[#6C3BFF]" />
                            </div>
                            <div className="space-y-4">
                                {[
                                    { label: 'Shortlisted', val: submissions?.summary?.shortlisted || 0, color: 'bg-blue-500' },
                                    { label: 'Accepted', val: submissions?.summary?.accepted || 0, color: 'bg-emerald-500' }
                                ].map((m, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-slate-400">{m.label}</span>
                                            <span className="text-white">{m.val}</span>
                                        </div>
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div className={`h-full ${m.color}`} style={{ width: `${(m.val / (submissions?.summary?.total || 1)) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {eventPackages && eventPackages.length > 0 && (
                                <div className="mt-6 space-y-2">
                                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Event Packages</h5>
                                    <div className="flex flex-col gap-2">
                                        {eventPackages.map((p: any, i: number) => (
                                            <a key={i} href={p.url || p.link} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#6C3BFF] truncate">{p.title || p.name || p.url}</a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <LayoutDashboard size={280} className="absolute -right-20 -bottom-20 text-white/[0.03] -rotate-12 pointer-events-none" />
            </div>

            {/* View Selection Toggle */}
            <div className="flex justify-center">
                <div className="flex bg-slate-100 p-2 rounded-[2rem] shadow-inner border border-slate-200/50">
                    <button 
                        onClick={() => setSubmissionSubTab('projects')}
                        className={`px-10 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${submissionSubTab === 'projects' ? 'bg-slate-900 text-white shadow-2xl shadow-black/20' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Candidate Selection Bundles
                    </button>
                    <button 
                        onClick={() => setSubmissionSubTab('assets')}
                        className={`px-10 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${submissionSubTab === 'assets' ? 'bg-slate-900 text-white shadow-2xl shadow-black/20' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Phase Deliverables (PPT/PDF)
                    </button>
                </div>
            </div>

            {submissionSubTab === 'projects' ? (
                <>
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="flex items-center gap-10 border-b border-slate-100 px-6 w-full lg:w-auto">
                            {['shortlisted', 'accepted', 'pending', 'rejected'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`text-[10px] font-black uppercase tracking-[0.2em] pb-5 relative transition-all ${activeTab === tab ? 'text-[#6C3BFF]' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tab} ({submissions?.summary?.[tab] || 0})
                                    {activeTab === tab && (
                                        <motion.div layoutId="subTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#6C3BFF] rounded-full shadow-[0_2px_10px_rgba(108,59,255,0.4)]" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            {selectedSubmissions.length > 0 && (
                                <button
                                    onClick={async () => {
                                        // TODO: Implement bulk notification logic
                                        alert(`Sending evaluation notification to judges for ${selectedSubmissions.length} submissions.`);
                                        // Trigger backend API call to notify judges
                                    }}
                                    className="px-6 py-3.5 bg-[#6C3BFF] text-white border border-[#6C3BFF] rounded-2xl text-sm font-bold hover:bg-[#5a2ed9] transition-all shadow-lg shadow-[#6C3BFF]/20 flex items-center gap-2"
                                >
                                    <Bell size={18} /> Send Bulk Notification
                                </button>
                            )}
                            <div className="relative w-full lg:w-80 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#6C3BFF] transition-all" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Filter selection..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-purple-50 focus:border-[#6C3BFF] transition-all shadow-sm"
                                />
                            </div>
                            <select 
                                value={judgeFilter}
                                onChange={(e) => setJudgeFilter(e.target.value)}
                                className="px-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-purple-50 transition-all max-w-[200px] truncate"
                            >
                                <option value="All Judges">All Judges</option>
                                <option value="">Unassigned</option>
                                {institutionJudges.map(j => <option key={j._id} value={j._id}>{j.name || j.email}</option>)}
                            </select>
                        </div>
                    </div>



                                        <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/20">
                                            <table className="w-full text-left table-fixed border-collapse">
                                                <colgroup>
                                                    <col className="w-[30%]" /> {/* Team Detail */}
                                                    {eventCriteria.filter(c => c.name !== "Idea Submission & Screening").map((c: any) => (
                                                        <col key={c.id} className="w-[15%]" /> /* Criteria */
                                                    ))}
                                                    <col className="w-[10%]" /> {/* Files */}
                                                    <col className="w-[10%]" /> {/* Judge */}
                                                    <col className="w-[10%]" /> {/* Score */}
                                                    <col className="w-[15%]" /> {/* Actions */}
                                                </colgroup>
                                                <thead>
                                                    <tr className="bg-slate-50/50">
                                                        <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">TEAM DETAIL</th>
                                                        {eventCriteria.filter(c => c.name !== "Idea Submission & Screening").map((c: any) => (
                                                            <th key={c.id} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest truncate" title={c.name}>{c.name}</th>
                                                        ))}
                                                        <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center truncate">FILES</th>
                                                        <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center truncate">JUDGE</th>
                                                        <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center truncate">SCORE</th>
                                                        <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right truncate">ACTIONS</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {paginatedSubmissions.length > 0 ? paginatedSubmissions.map((item, idx) => {
                                                        const isSelected = selectedSubmissions.includes(String(item.id));
                                                        return (
                                                            <motion.tr 
                                                                key={item._id || item.submission_id || idx}
                                                                className="hover:bg-slate-50/30 transition-colors group"
                                                            >
                                                                <td className="px-4 py-4 truncate">
                                                                    <div className="flex items-center gap-2">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={isSelected}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setSelectedSubmissions([...selectedSubmissions, String(item.id)]);
                                                                                else setSelectedSubmissions(selectedSubmissions.filter(id => id !== String(item.id)));
                                                                            }}
                                                                            className="w-3 h-3 rounded border-slate-300 text-[#6C3BFF] focus:ring-[#6C3BFF]"
                                                                        />
                                                                        <div className="flex flex-col truncate">
                                                                            <span className="font-black text-slate-900 text-xs truncate" title={item.project_title || item.team_name}>{item.project_title || item.team_name}</span>
                                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate" title={`Lead: ${item.team_lead || item.team_name}`}>Lead: {item.team_lead || item.team_name}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                {/* Dynamic criteria cells */}
                                                                {eventCriteria.filter(c => c.name !== "Idea Submission & Screening").map((c: any) => (
                                                                    <td key={c.id} className="px-4 py-4 text-[10px] text-slate-600 truncate" title={item.rubricScores?.[c.id] || 'N/A'}>
                                                                        {item.rubricScores?.[c.id] || 'N/A'}
                                                                    </td>
                                                                ))}

                                                                <td className="px-4 py-4 text-center truncate">
                                                                    <div className="flex justify-center gap-1">
                                                                        {(() => {
                                                                            const uniqueFiles: any[] = [];
                                                                            if (Array.isArray(item.files)) {
                                                                                item.files.forEach((f: any) => {
                                                                                    if (f && f.url && !uniqueFiles.find(existing => existing.url === f.url)) {
                                                                                        uniqueFiles.push(f);
                                                                                    }
                                                                                });
                                                                            }
                                                                            return uniqueFiles.map((f: any, i: number) => (
                                                                                <a key={i} href={f.url} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-100 rounded-lg hover:bg-[#6C3BFF] hover:text-white transition-all text-slate-500" title={f.name || 'File'}>
                                                                                    {f.type === 'pdf' ? <FileText size={12} /> : <span className="text-[8px] font-black uppercase">PPT</span>}
                                                                                </a>
                                                                            ));
                                                                        })()}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-600 truncate" title={item.assigned_judge_name || 'Unassigned'}>
                                                                    {item.assigned_judge_name || 'Unassigned'}
                                                                </td>
                                                                <td className="px-4 py-4 text-center font-black text-slate-900 truncate" title={item.score ? item.score.toFixed(1) : '0.0'}>
                                                                    {item.score ? item.score.toFixed(1) : '0.0'}
                                                                </td>
                                                                <td className="px-4 py-4 text-right truncate">
                                                                    {/* Action buttons */}
                                                                </td>
                                                            </motion.tr>
                                                        );
                                                    }) : (
                                                        <tr>
                                                            <td colSpan={6 + eventCriteria.filter(c => c.name !== "Idea Submission & Screening").length} className="px-10 py-24 text-center">
                                                                <div className="flex flex-col items-center opacity-20">
                                                                    <Filter size={64} className="mb-6" />
                                                                    <p className="font-black text-[11px] uppercase tracking-[0.3em]">No items found in {activeTab} protocol</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                </>
            ) : (
                /* Global Phase Deliverables View */
                <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/20">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity & Opportunity</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Details</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Submitted At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stageSubmissions.length > 0 ? stageSubmissions.map((sub: any, idx: number) => (
                                <tr key={sub._id || idx} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-10 py-8">
                                        <div className="font-black text-slate-900 text-lg tracking-tight">
                                            {sub.team_name || sub.user_name || 'Anonymous Participant'}
                                        </div>
                                        <div className="text-[10px] font-bold text-[#6C3BFF] uppercase tracking-widest mt-1">
                                            {sub.event_title || 'General Event'}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const data = sub.data || {};
                                                const fileField = Object.keys(data).find(k => typeof data[k] === 'string' && data[k].startsWith('data:'));
                                                const urlField = Object.keys(data).find(k => typeof data[k] === 'string' && (data[k].startsWith('http://') || data[k].startsWith('https://')));
                                                if (fileField && data[fileField]) {
                                                    return (
                                                        <button onClick={() => setPreviewAsset({ url: data[fileField], filename: getAssetFilename(data[fileField]) })}
                                                            className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                                        >
                                                            <Eye size={14} /> Preview Asset
                                                        </button>
                                                    );
                                                }
                                                if (urlField && data[urlField]) {
                                                    return (
                                                        <a href={data[urlField]} target="_blank" rel="noreferrer" className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-[#6C3BFF] transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                            <ExternalLink size={14} /> View Submission
                                                        </a>
                                                    );
                                                }
                                                return <span className="text-slate-300 italic text-xs font-bold">No assets found</span>;
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <div className={`inline-flex items-center px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusColor(sub.status)}`}>
                                            {sub.status || 'Received'}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="text-xs font-bold text-slate-500">{new Date(sub.submitted_at).toLocaleString()}</div>
                                        <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Global Sync Active</div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-10 py-24 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <FileText size={64} className="mb-6" />
                                            <p className="font-black text-[11px] uppercase tracking-[0.3em]">No phase deliverables detected globally</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <AnimatePresence>
                {selectedSubmission && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setSelectedSubmission(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-4xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-12 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="px-4 py-1 bg-purple-50 text-[#6C3BFF] rounded-full text-[9px] font-black uppercase tracking-widest">Submission Bundle</div>
                                            <span className="text-slate-300">•</span>
                                        </div>
                                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedSubmission.project_title || selectedSubmission.team_name}</h2>
                                        <p className="text-slate-500 font-bold text-lg">{selectedSubmission.team_name} • {selectedSubmission.event_title}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedSubmission(null)}
                                        className="p-4 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Metrics</p>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <span className="text-sm font-bold text-slate-600">Aggregate Score</span>
                                                <span className="text-2xl font-black text-slate-900">{selectedSubmission.score ? selectedSubmission.score.toFixed(1) : '0.0'}</span>
                                            </div>
                                            <div className="h-2 bg-white rounded-full overflow-hidden">
                                                <div className="h-full bg-[#6C3BFF]" style={{ width: `${(selectedSubmission.score || 0) * 10}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="col-span-2 p-8 bg-white border border-slate-100 rounded-[2.5rem] space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Narrative</p>
                                        <p className="text-slate-600 leading-relaxed font-medium line-clamp-4">{selectedSubmission.project_description || "No description provided for this deliverable."}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                                    <div className="flex gap-4">
                                        {selectedSubmission.github_url && (
                                            <a href={selectedSubmission.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-xl transition-all">
                                                <Github size={16} /> Repository
                                            </a>
                                        )}
                                        {selectedSubmission.demo_url && (
                                            <a href={selectedSubmission.demo_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-3 bg-[#6C3BFF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-xl transition-all">
                                                <Play size={16} /> Live Demo
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => handleUpdateStatus(selectedSubmission.submission_id || selectedSubmission.team_id, 'Accepted')}
                                            className="px-8 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                                        >
                                            Accept Bundle
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateStatus(selectedSubmission.submission_id || selectedSubmission.team_id, 'Rejected')}
                                            className="px-8 py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"
                                        >
                                            Reject Bundle
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Asset Preview Modal */}
            <AnimatePresence>
                {previewAsset && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setPreviewAsset(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                                <h3 className="text-lg font-black text-slate-900 truncate">{previewAsset.filename}</h3>
                                <div className="flex items-center gap-3">
                                    <a href={previewAsset.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6C3BFF] hover:text-white transition-all"
                                    >
                                        <ExternalLink size={14} /> Open Original
                                    </a>
                                    <button onClick={() => setPreviewAsset(null)}
                                        className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-100 p-4 relative">
                                <div className="w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center">
                                    {previewAsset.url.startsWith('data:') ? (
                                        previewAsset.filename.endsWith('.pdf') ? (
                                            <embed src={previewAsset.url} type="application/pdf" className="w-full h-full" />
                                        ) : previewAsset.filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                                            <img src={previewAsset.url} className="max-w-full max-h-full object-contain" alt={previewAsset.filename} />
                                        ) : previewAsset.filename.match(/\.(mp4|webm|mov)$/i) ? (
                                            <video src={previewAsset.url} controls className="max-w-full max-h-full" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 p-8">
                                                <FileText size={64} className="text-slate-300" />
                                                <p className="text-sm font-bold text-slate-500">Preview not available — <a href={previewAsset.url} download className="text-[#6C3BFF] underline">Download</a></p>
                                            </div>
                                        )
                                    ) : previewAsset.filename.endsWith('.pdf') ? (
                                        <iframe src={previewAsset.url} className="w-full h-full border-none" title="PDF Preview" />
                                    ) : previewAsset.filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                                        <img src={previewAsset.url} className="max-w-full max-h-full object-contain" alt={previewAsset.filename} />
                                    ) : (
                                        <iframe src={previewAsset.url} className="w-full h-full border-none" title="File Preview" />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Judge Assignment Modal */}
            <AnimatePresence>
                {judgeAssignmentModal.isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100"
                        >
                            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Assign Evaluator</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Select a verified expert to review this bundle</p>
                                </div>
                                <button onClick={() => setJudgeAssignmentModal({ isOpen: false, submissionId: null })} className="p-4 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="p-10 space-y-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                {availableJudges.length > 0 ? [...availableJudges]
                                    .sort((a: any, b: any) => (a.assignment_count ?? 0) - (b.assignment_count ?? 0))
                                    .map((judge) => {
                                    // Robust evaluation link generation for manual sharing
                                    const currentSub = submissions.all?.find((s: any) => 
                                        (String(s.submission_id) === String(judgeAssignmentModal.submissionId) || 
                                         String(s.team_id) === String(judgeAssignmentModal.submissionId))
                                    );
                                    const existingAssignment = currentSub?.assigned_judges?.find((aj: any) => String(aj.judge_id) === String(judge._id));
                                    
                                    return (
                                        <div key={judge._id} className="p-6 bg-slate-50 border border-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-white hover:border-purple-100 transition-all shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">🎓</div>
                                                <div>
                                                    <p className="font-black text-slate-900">{judge.full_name || judge.name}</p>
                                                    <p className="text-xs font-bold text-slate-400">{judge.email}</p>
                                                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mt-1">
                                                        {judge.assignment_count ?? 0} assigned
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {existingAssignment?.evaluation_url && (
                                                    <button 
                                                        onClick={() => copyToClipboard(existingAssignment.evaluation_url)}
                                                        className="p-3 bg-white text-slate-400 hover:text-[#6C3BFF] border border-slate-100 rounded-xl transition-all"
                                                        title="Copy Evaluation Link"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleAssignJudge(judge._id)}
                                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6C3BFF] transition-all"
                                                >
                                                    Assign
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="py-20 text-center space-y-4 opacity-40">
                                        <User size={48} className="mx-auto" />
                                        <p className="font-black text-[10px] uppercase tracking-widest">No verified evaluators found</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SubmissionList;

