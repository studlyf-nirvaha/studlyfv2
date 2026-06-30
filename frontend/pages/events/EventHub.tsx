import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL, authHeaders, FRONTEND_URL } from '../../apiConfig';
import { useAuth } from '../../AuthContext';
import { ChevronLeft, UsersRound, Link as LinkIcon, Loader2, Upload, FileText, CheckCircle2, Clock, Trophy, Share2, Copy, Check, LayoutGrid, IdCard, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IEvent, IParticipant, ITeam } from '../../types/event';


type HubResp = { participant?: IParticipant; team?: ITeam };

const EventHub: React.FC = () => {
    const { eventId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<IEvent | null>(null);
    const [participant, setParticipant] = useState<IParticipant | null>(null);
    const [team, setTeam] = useState<ITeam | null>(null);
    const [activeTab, setActiveTab] = useState('timeline');
    const [isEvaluated, setIsEvaluated] = useState(false);
    const [evaluation, setEvaluation] = useState<any>(null);
    
    // Team management state
    const [teamName, setTeamName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [working, setWorking] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [showInviteLink, setShowInviteLink] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);

    // Submission state
    const [submitting, setSubmitting] = useState<string | null>(null); // stage_id
    const [submissionData, setSubmissionData] = useState<Record<string, string | boolean>>({});
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [evRes, hubRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/events/${eventId}`, { headers: { ...authHeaders() } }),
                fetch(`${API_BASE_URL}/api/v1/events/${eventId}/hub`, { headers: { ...authHeaders() } })
            ]);

            if (evRes.ok) setEvent(await evRes.json());
            if (hubRes.ok) {
                const data: any = await hubRes.json();
                setParticipant(data.participant);
                setTeam(data.team);
                setIsEvaluated(!!data.is_evaluated);
                setEvaluation(data.evaluation);
                // Auto-surface permanent invite code so leader doesn't have to click "Generate"
                const permanentCode = (data.team as any)?.invite_code;
                if (permanentCode) {
                    setGeneratedCode(permanentCode);
                } else {
                    const invites: any[] = (data.team as any)?.invites || [];
                    const now = Date.now();
                    const active = [...invites].reverse().find(
                        (inv: any) => !inv.revoked && (!inv.expires_at || new Date(inv.expires_at).getTime() > now)
                    );
                    if (active) setGeneratedCode(active.code);
                }
            }
        } catch (error) {
            try { console.error("Failed to fetch hub data", error instanceof Error ? error.message : String(error)); } catch (_) {}
        } finally {
            setLoading(false);
        }
    };

    const handleJoinByUrl = async (code: string) => {
        setWorking(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/join-by-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ code })
            });
            if (res.ok) {
                alert("Successfully joined team via invite link!");
                await fetchData();
                setActiveTab('team');
            }
        } catch (e) {
            console.error("Auto-join failed", e);
        } finally {
            setWorking(false);
        }
    };

    useEffect(() => {
        fetchData().then(() => {
            // Check for join code in URL
            const params = new URLSearchParams(location.search);
            const code = params.get('join');
            if (code && !team) {
                handleJoinByUrl(code);
            }
        });
        
        // Real-time polling for team/submission updates
        const interval = setInterval(async () => {
            try {
                const hubRes = await fetch(`${API_BASE_URL}/api/v1/events/${eventId}/hub`, { headers: { ...authHeaders() } });
                if (hubRes.ok) {
                    const data: HubResp = await hubRes.json();
                    setParticipant(data.participant || null);
                    setTeam(data.team || null);
                }
            } catch (e) {
                /* non-fatal */
            }
        }, 15000); // Poll every 15s

        return () => clearInterval(interval);
    }, [eventId]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tabParam = params.get('tab');
        if (tabParam) {
            setActiveTab(tabParam);
        }
    }, [location.search]);

    const createTeam = async () => {
        if (!teamName.trim()) return;
        setWorking(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/create-secure`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ event_id: eventId, team_name: teamName })
            });
            if (res.ok) {
                await fetchData();
                setTeamName('');
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to create team");
            }
        } finally {
            setWorking(false);
        }
    };

    const joinByCode = async () => {
        if (!inviteCode.trim()) return;
        setWorking(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/join-by-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ code: inviteCode })
            });
            if (res.ok) {
                await fetchData();
                setInviteCode('');
            } else {
                const err = await res.json();
                alert(err.detail || "Invalid invite code");
            }
        } finally {
            setWorking(false);
        }
    };

    const generateInvite = async () => {
        setWorking(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/${team?._id}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ ttl_hours: 720 })
            });
            if (res.ok) {
                const data = await res.json();
                const code = data.invite_code || data.code;
                if (code) setGeneratedCode(code);
            }
        } finally {
            setWorking(false);
        }
    };

    const handleFileUpload = async (stageId: string, file: File, fieldId: string, field: any) => {
        setSubmitting(stageId);
        setSubmissionError(null);
        
        // Check file size (50MB limit)
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            setSubmissionError(`File too large. Maximum size is 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
            setSubmitting(null);
            return;
        }

        // Check file extension dynamically based on question context
        let allowedExtensions = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.zip', '.rar', '.txt', '.jpg', '.jpeg', '.png', '.gif'];
        if (field) {
            const textToCheck = `${field.label || ''} ${field.description || ''} ${field.placeholder || ''}`.toLowerCase();
            const hasPdf = textToCheck.includes('pdf');
            const hasPpt = textToCheck.includes('ppt') || textToCheck.includes('powerpoint') || textToCheck.includes('pptx');
            const hasDoc = textToCheck.includes('doc') || textToCheck.includes('docx') || textToCheck.includes('word');
            const hasZip = textToCheck.includes('zip') || textToCheck.includes('rar');
            const hasImage = textToCheck.includes('image') || textToCheck.includes('png') || textToCheck.includes('jpg') || textToCheck.includes('jpeg');

            const customAllowed: string[] = [];
            if (hasPdf) customAllowed.push('.pdf');
            if (hasPpt) {
                customAllowed.push('.ppt');
                customAllowed.push('.pptx');
            }
            if (hasDoc) {
                customAllowed.push('.doc');
                customAllowed.push('.docx');
            }
            if (hasZip) {
                customAllowed.push('.zip');
                customAllowed.push('.rar');
            }
            if (hasImage) {
                customAllowed.push('.png');
                customAllowed.push('.jpg');
                customAllowed.push('.jpeg');
            }

            if (customAllowed.length > 0) {
                allowedExtensions = customAllowed;
            }
        }

        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
            const displayFormats = allowedExtensions.map(e => e.replace('.', '').toUpperCase()).join(', ');
            setSubmissionError(`File type ${fileExt} is not allowed. Only ${displayFormats} files are accepted.`);
            setSubmitting(null);
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('stage_id', stageId);
        formData.append('user_email', user?.email || '');
        formData.append('user_name', user?.full_name || '');

        try {
            const res = await fetch(`${API_BASE_URL}/api/opportunities/events/${eventId}/stages/${stageId}/upload`, {
                method: 'POST',
                headers: { ...authHeaders() },
                body: formData
            });
            
            if (res.ok) {
                const data = await res.json();
                alert("File uploaded successfully!");
                // Update local state so that the filename is immediately displayed on the screen
                const fileUrl = data.file_url || data.url || file.name;
                setSubmissionData(prev => ({ ...prev, [`${stageId}-${fieldId}`]: fileUrl }));
                await fetchData();
            } else {
                const err = await res.json();
                setSubmissionError(err.detail || "Upload failed. Please check your file and try again.");
            }
        } catch (e) {
            setSubmissionError("Network error during upload. Please check your connection and try again.");
        } finally {
            setSubmitting(null);
        }
    };

    const handleSubmission = async (stageId: string) => {
        const stage = event?.stages?.find((s: any) => s.id === stageId);
        const fields = stage?.config?.fields || [];
        
        // Collect all field data for this stage
        const fieldData: any = {};
        let hasData = false;
        
        for (const field of fields) {
            const key = `${stageId}-${field.id}`;
            const value = submissionData[key];
            
            if (field.required && !value) {
                setSubmissionError(`${field.label} is required`);
                return;
            }
            
            if (value) {
                fieldData[field.id] = value;
                hasData = true;
            }
        }
        
        if (!hasData) {
            setSubmissionError("Please fill in at least one field");
            return;
        }
        
        setSubmitting(stageId);
        setSubmissionError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/opportunities/events/${eventId}/stages/${stageId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ 
                    data: {
                        ...fieldData,
                        user_email: user?.email || '',
                        user_name: user?.full_name || ''
                    } 
                })
            });
            if (res.ok) {
                alert("Submitted successfully!");
                await fetchData();
                // Clear submission data for this stage
                const newData = { ...submissionData };
                for (const field of fields) {
                    delete newData[`${stageId}-${field.id}`];
                }
                setSubmissionData(newData);
            } else {
                const err = await res.json();
                setSubmissionError(err.detail || "Submission failed. Please try again.");
            }
        } catch (e) {
            setSubmissionError("Network error during submission. Please check your connection and try again.");
        } finally {
            setSubmitting(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] pb-32">
                <div className="bg-slate-900 pt-32 pb-20 px-6 border-b border-slate-800">
                    <div className="max-w-6xl mx-auto">
                        <div className="w-48 h-6 bg-slate-800 rounded animate-pulse mb-6"></div>
                        <div className="w-3/4 h-16 bg-slate-800 rounded-lg animate-pulse mb-8"></div>
                        <div className="flex flex-wrap gap-4">
                            <div className="w-32 h-10 bg-slate-800 rounded-2xl animate-pulse"></div>
                            <div className="w-32 h-10 bg-slate-800 rounded-2xl animate-pulse"></div>
                            <div className="w-32 h-10 bg-slate-800 rounded-2xl animate-pulse"></div>
                        </div>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
                    <div className="w-full h-32 bg-slate-100 rounded-3xl animate-pulse"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="w-full h-64 bg-slate-100 rounded-3xl animate-pulse"></div>
                            <div className="w-full h-64 bg-slate-100 rounded-3xl animate-pulse"></div>
                        </div>
                        <div className="space-y-6">
                            <div className="w-full h-48 bg-slate-100 rounded-3xl animate-pulse"></div>
                            <div className="w-full h-48 bg-slate-100 rounded-3xl animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!participant) {
        const params = new URLSearchParams(location.search);
        const joinCode = params.get('join');
        
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-purple-500/10 flex items-center justify-center mb-8 border border-slate-100">
                    {joinCode ? <UsersRound size={40} className="text-purple-600" /> : <LinkIcon size={40} className="text-purple-600" />}
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                    {joinCode ? "You're Invited!" : "Application Required"}
                </h1>
                <p className="text-slate-600 max-w-md mb-8 font-medium">
                    {joinCode 
                        ? "A teammate has invited you to join their unit! To accept this invitation and access the project hub, you must first register for the event."
                        : "You are not registered for this event. Please apply through the opportunities portal to access this hub and begin your collaborative phase."}
                </p>
                <Link 
                    to={`/opportunities/${eventId}${joinCode ? `?join=${joinCode}` : ''}`} 
                    className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-purple-700 transition-all shadow-2xl shadow-slate-900/20"
                >
                    {joinCode ? "Register to Join Team" : "View Opportunity Details"}
                </Link>
            </div>
        );
    }

    const event_id_as_opp = event?.opportunity_id || eventId;
    const isLeader = team && (String(team.leader_id || team.team_leader_id) === String(user?.user_id));

    const tabs = [
        { id: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
        { id: 'submissions', label: 'Submissions', icon: <FileText size={14} /> },
        { id: 'team', label: 'My Team', icon: <UsersRound size={14} /> },
        { id: 'results', label: 'Results', icon: <Trophy size={14} /> }
    ];

    return (
        <div className="min-h-screen bg-slate-50 pt-32 pb-20 font-sans">
            {/* Navigation Header */}
            <header className="bg-white border-b border-slate-100 sticky top-32 z-30">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to="/opportunities/my-applications" className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
                            <ChevronLeft size={24} />
                        </Link>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">{event?.title || 'Event Hub'}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Participation Protocol Alpha</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(`/events/${eventId}/package`)} className="px-4 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <LayoutGrid size={14} /> Problem Board
                        </button>
                        <button onClick={() => navigate(`/events/${eventId}/package/card`)} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <IdCard size={14} /> Participant Card
                        </button>
                        <div className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-100">
                            {participant.status || 'Active'}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="space-y-12">
                    {/* Tab Navigation */}
                    <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-100 rounded-[2rem] w-fit shadow-sm">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab.id 
                                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-12">
                        {activeTab === 'timeline' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-8 space-y-8">
                                    <h2 className="text-2xl font-black text-slate-900">Event Timeline</h2>
                                    <div className="relative pl-8 space-y-12 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-slate-100 before:rounded-full">
                                        {(event.stages || []).filter(s => s.can_access || s.is_completed || s.is_current).map((stage: any, idx: number) => {
                                            // Check access flags provided by the new backend logic
                                            const canAccess = stage.can_access;
                                            const isCompleted = stage.is_completed;
                                            const isCurrent = stage.is_current;
                                            const stype = stage.type?.toUpperCase();

                                            return (
                                                <div key={idx} className={`relative ${!canAccess ? 'opacity-50' : ''}`}>
                                                    <div className={`absolute left-[-40px] top-0 w-6 h-6 rounded-full border-4 border-slate-50 flex items-center justify-center ${isCompleted ? 'bg-emerald-500' : isCurrent ? 'bg-purple-600' : 'bg-slate-200 shadow-inner'}`}>
                                                        {isCompleted && <CheckCircle2 size={12} className="text-white" />}
                                                        {isCurrent && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h3 className={`text-lg font-black ${isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>{stage.name}</h3>
                                                                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xl">{stage.description}</p>
                                                            </div>

                                                            {/* Contextual Action Button - Only show if current or accessible */}
                                                            {canAccess && (isCurrent || !isCompleted) && (
                                                                <div className="shrink-0">
                                                                    {stype === 'TEAM FORMATION' || stype === 'TEAM_FORMATION' || stage.name?.toUpperCase().includes('TEAM') ? (
                                                                        <button 
                                                                            onClick={() => setActiveTab('team')}
                                                                            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                                                                        >
                                                                            Manage My Team
                                                                        </button>
                                                                    ) : stype === 'SUBMISSION' ? (
                                                                        <button 
                                                                            onClick={() => setActiveTab('submissions')}
                                                                            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                                                                        >
                                                                            Enter Submission Portal
                                                                        </button>
                                                                    ) : stype === 'QUIZ' ? (
                                                                        <Link 
                                                                            to={`/events/${eventId}/quiz/${stage.config?.quiz_id}`}
                                                                            className="px-6 py-3 bg-purple-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-purple-700 transition-all shadow-xl shadow-purple-900/20"
                                                                        >
                                                                            Start Assessment
                                                                        </Link>
                                                                    ) : null}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* ... (Stage meta-info rendering) ... */}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="lg:col-span-4">
                                    <div className="p-8 bg-gradient-to-br from-slate-900 to-purple-900 rounded-[2.5rem] text-white shadow-2xl shadow-purple-900/20 sticky top-32">
                                        <Trophy size={40} className="text-yellow-400 mb-6" />
                                        <h3 className="text-2xl font-black tracking-tight mb-4">Your Progress</h3>
                                        <p className="text-purple-200 text-sm font-medium leading-relaxed mb-8 opacity-80">
                                            Keep track of your milestones. Every stage completed brings you closer to the championship.
                                        </p>
                                        {(() => {
                                            const totalStages = event?.stages?.length || 1;
                                            const lastSubmitted = participant?.last_stage_submitted;
                                            const completedIdx = lastSubmitted 
                                                ? (event?.stages || []).findIndex((s: any) => s.id === lastSubmitted) + 1
                                                : (participant ? 1 : 0); // registered = at least 1
                                            const pct = Math.round((completedIdx / totalStages) * 100);
                                            return (
                                                <div className="space-y-4">
                                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                                        {completedIdx} of {totalStages} Stages Cleared
                                                    </p>
                                                    {team && (
                                                        <div className="mt-4 pt-4 border-t border-white/10">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Your Team</p>
                                                            <p className="text-lg font-black">{team.team_name}</p>
                                                            <p className="text-xs text-purple-300 font-bold">{team.members?.length || 0} member{(team.members?.length || 0) !== 1 ? 's' : ''}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'submissions' && (() => {
                             // ... (existing team size calculation logic)

                             // Determine active stage using backend access flags
                             const activeStage = (event?.stages || []).find(
                                 (s: any) => s.is_current === true && s.can_access === true
                             ) || (event?.stages || []).find(
                                 (s: any) => s.can_access === true && !s.is_completed
                             );

                             const submissionStage = activeStage;
                             const isSubmissionType = submissionStage?.type?.toUpperCase() === 'SUBMISSION';

                             if (!submissionStage) {
                                return <div className="text-center p-10 font-bold text-slate-500">No active submission stage found.</div>;
                             }

                             const minTeam = submissionStage?.config?.team_min_size || event?.min_team_size || 1;
                             const maxTeam = submissionStage?.config?.team_max_size || event?.max_team_size || 1;
                             const needsTeam = minTeam > 1;
                             const teamSizeConfigured = minTeam !== undefined;
                             const memberCount = team?.members?.length || 0;
                             const teamMeetsSize = !needsTeam || (memberCount >= minTeam && memberCount <= maxTeam);

                             const dynamicFields = submissionStage?.config?.fields || [];
                             const hasDynamicFields = Array.isArray(dynamicFields) && dynamicFields.length > 0;

                             if (!isSubmissionType) {
                                return (
                                    <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-sm text-center">
                                        <FileText size={40} className="mx-auto mb-4 text-slate-300" />
                                        <h3 className="text-lg font-black text-slate-900">Submission not required</h3>
                                        <p className="text-sm font-medium text-slate-500 mt-2">
                                            The stage "{submissionStage.name}" is not a submission-based stage.
                                        </p>
                                    </div>
                                );
                             }

                             // ... (proceed to render submission form only if isSubmissionType is true and stage is authorized)


                            return (
                            <div className="space-y-10 max-w-3xl">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                        {submissionStage?.name || 'Submission'}
                                    </h2>
                                    <p className="text-slate-500 font-medium mt-2">
                                        {submissionStage?.description || 'Submit your work for this stage.'}
                                    </p>
                                </div>

                                {submissionStage && (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">Stage brief</p>
                                        <h3 className="mt-2 text-xl font-black text-slate-900">{submissionStage.name || 'Submission'}</h3>
                                        <p className="mt-2 text-sm font-medium text-slate-600 whitespace-pre-wrap">
                                            {submissionStage.description || submissionStage?.config?.description || 'Follow the host instructions carefully before submitting.'}
                                        </p>
                                        {Array.isArray(submissionStage?.config?.fields) && submissionStage.config.fields.length > 0 ? (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {submissionStage.config.fields.map((field: any) => (
                                                    <span key={field.id || field.field_id || field.label} className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-widest">
                                                        {field.label}
                                                        {field.required ? ' *' : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                {/* Team Size Enforcement Block */}
                                {needsTeam && !teamMeetsSize ? (
                                    <div className="p-10 bg-white border-2 border-amber-200 rounded-[3rem] shadow-xl shadow-amber-900/5 space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                                                <UsersRound size={28} className="text-amber-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900">Team Required</h3>
                                                <p className="text-slate-600 font-medium mt-1 leading-relaxed">
                                                    {teamSizeConfigured ? (
                                                        <>This event requires a team of <strong className="text-amber-700">{minTeam}–{maxTeam} members</strong> to submit. {!team ? (<> You haven't formed a team yet. Please go to the <strong>Team</strong> tab to create or join one.</>) : (<> Your team <strong>"{team.team_name}"</strong> currently has <strong className="text-red-600">{memberCount} member{memberCount !== 1 ? 's' : ''}</strong>. You need at least <strong>{minTeam}</strong> to submit.</>)}</>
                                                    ) : (
                                                        <>Team size is not configured for this event yet. Ask the organizer to set the team range before publishing.</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-amber-500 rounded-full transition-all" 
                                                    style={{ width: `${Math.min(100, (memberCount / minTeam) * 100)}%` }} 
                                                />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 shrink-0">
                                                {memberCount}/{minTeam} min
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setActiveTab('team')}
                                            className="w-full py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-slate-900/10"
                                        >
                                            Go to Team Tab →
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Team info banner (if team exists and meets requirement) */}
                                        {team && needsTeam && (
                                            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                                                <p className="text-sm font-bold text-emerald-800">
                                                    Team "{team.team_name}" ({memberCount} members) — ready to submit
                                                </p>
                                            </div>
                                        )}

                                        <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-900/5">
                                            {hasDynamicFields ? (
                                                /* Dynamic form from admin-defined stage config */
                                                <form onSubmit={async (e) => {
                                                    e.preventDefault();
                                                    if (!submissionStage) return;
                                                    setSubmissionError(null);

                                                    // Validate required fields
                                                    for (const field of dynamicFields) {
                                                        const key = `${submissionStage.id}-${field.id}`;
                                                        const val = submissionData[key];
                                                        if (field.required && !val) {
                                                            setSubmissionError(`"${field.label}" is required`);
                                                            return;
                                                        }
                                                    }

                                                    await handleSubmission(submissionStage.id);
                                                }} className="space-y-8">
                                                    <AnimatePresence>
                                                        {submissionError && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -8 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -8 }}
                                                                className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl"
                                                            >
                                                                <p className="text-sm font-bold text-red-600">{submissionError}</p>
                                                                <button type="button" onClick={() => setSubmissionError(null)} className="ml-auto text-red-300 hover:text-red-600">✕</button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    {dynamicFields.map((field: any) => {
                                                        const key = `${submissionStage!.id}-${field.id}`;
                                                        const fieldType = (field.type || 'text').toLowerCase();
                                                        const inputClass = "w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-purple-50 focus:border-[#6C3BFF]/30 transition-all";

                                                        return (
                                                            <div key={field.id} className="space-y-3">
                                                                <label className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                                                    {field.label}
                                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                                </label>
                                                                {fieldType === 'textarea' ? (
                                                                    <textarea
                                                                        rows={4}
                                                                        placeholder={field.placeholder || ''}
                                                                        className={`${inputClass} resize-none`}
                                                                        value={String(submissionData[key] || '')}
                                                                        onChange={(e) => setSubmissionData(prev => ({ ...prev, [key]: e.target.value }))}
                                                                    />
                                                                ) : fieldType === 'url' ? (
                                                                    <input
                                                                        type="url"
                                                                        placeholder={field.placeholder || 'https://...'}
                                                                        className={inputClass}
                                                                        value={String(submissionData[key] || '')}
                                                                        onChange={(e) => setSubmissionData(prev => ({ ...prev, [key]: e.target.value }))}
                                                                    />
                                                                ) : fieldType === 'number' ? (
                                                                    <input
                                                                        type="number"
                                                                        placeholder={field.placeholder || ''}
                                                                        className={inputClass}
                                                                        value={String(submissionData[key] || '')}
                                                                        onChange={(e) => setSubmissionData(prev => ({ ...prev, [key]: e.target.value }))}
                                                                    />
                                                                ) : fieldType === 'file' ? (() => {
                                                                    const textToCheck = `${field.label || ''} ${field.description || ''} ${field.placeholder || ''}`.toLowerCase();
                                                                    const hasPdf = textToCheck.includes('pdf');
                                                                    const hasPpt = textToCheck.includes('ppt') || textToCheck.includes('powerpoint') || textToCheck.includes('pptx');
                                                                    const hasDoc = textToCheck.includes('doc') || textToCheck.includes('docx') || textToCheck.includes('word');
                                                                    const hasZip = textToCheck.includes('zip') || textToCheck.includes('rar');
                                                                    const hasImage = textToCheck.includes('image') || textToCheck.includes('png') || textToCheck.includes('jpg') || textToCheck.includes('jpeg');

                                                                    const allowed: string[] = [];
                                                                    if (hasPdf) allowed.push('.pdf');
                                                                    if (hasPpt) {
                                                                        allowed.push('.ppt');
                                                                        allowed.push('.pptx');
                                                                    }
                                                                    if (hasDoc) {
                                                                        allowed.push('.doc');
                                                                        allowed.push('.docx');
                                                                    }
                                                                    if (hasZip) {
                                                                        allowed.push('.zip');
                                                                        allowed.push('.rar');
                                                                    }
                                                                    if (hasImage) {
                                                                        allowed.push('.png');
                                                                        allowed.push('.jpg');
                                                                        allowed.push('.jpeg');
                                                                    }

                                                                    const allowedExts = allowed.length > 0 ? allowed : ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.zip', '.rar', '.txt', '.jpg', '.jpeg', '.png', '.gif'];
                                                                    const acceptAttr = allowedExts.join(',');
                                                                    const displayFormats = allowedExts.map(e => e.replace('.', '').toUpperCase()).join(', ');

                                                                    return (
                                                                        <div className="space-y-2">
                                                                            <input
                                                                                id={`dyn-file-${field.id}`}
                                                                                type="file"
                                                                                accept={acceptAttr}
                                                                                className="hidden"
                                                                                onChange={(e) => {
                                                                                    const f = e.target.files?.[0];
                                                                                    if (f && submissionStage) {
                                                                                        const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
                                                                                        if (!allowedExts.includes(ext)) {
                                                                                            setSubmissionError(`Only ${displayFormats} files are allowed.`);
                                                                                            return;
                                                                                        }
                                                                                        handleFileUpload(submissionStage.id, f, field.id, field);
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {submitting === submissionStage!.id ? (
                                                                                <div className="flex items-center gap-3 p-4 border border-purple-200 rounded-2xl bg-purple-50/20 animate-pulse">
                                                                                    <Loader2 className="animate-spin text-purple-600" size={18} />
                                                                                    <span className="text-xs text-purple-600 font-semibold">
                                                                                        Uploading your asset... Please wait.
                                                                                    </span>
                                                                                </div>
                                                                            ) : submissionData[key] ? (
                                                                                <div className="flex items-center justify-between gap-4 p-4 border border-emerald-250 rounded-2xl bg-emerald-50/30 transition-all duration-200 shadow-sm">
                                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                                                                                            <FileText size={16} />
                                                                                        </div>
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="text-xs text-emerald-800 font-bold truncate">
                                                                                                {typeof submissionData[key] === 'string' ? String(submissionData[key]).split('/').pop() : 'Attached File'}
                                                                                            </span>
                                                                                            <span className="text-[10px] text-emerald-600/80 font-semibold flex items-center gap-1 mt-0.5">
                                                                                                <CheckCircle2 size={10} /> Uploaded successfully
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => document.getElementById(`dyn-file-${field.id}`)?.click()}
                                                                                        className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold cursor-pointer transition-colors shadow-sm shrink-0"
                                                                                    >
                                                                                        Change File
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <div 
                                                                                    className="relative border-2 border-dashed rounded-2xl p-6 text-center bg-purple-50/10 border-purple-100 hover:border-purple-300 hover:bg-purple-50/20 cursor-pointer transition-all"
                                                                                    onClick={() => document.getElementById(`dyn-file-${field.id}`)?.click()}
                                                                                >
                                                                                    <Upload size={24} className="mx-auto mb-2 text-purple-400" />
                                                                                    <p className="text-xs font-black uppercase tracking-widest text-purple-600">
                                                                                        Choose file
                                                                                    </p>
                                                                                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                                                                                        Accepts {displayFormats} only
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })() : fieldType === 'checkbox' ? (
                                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="w-5 h-5 rounded accent-purple-600"
                                                                            checked={submissionData[key] === true || submissionData[key] === 'true'}
                                                                            onChange={(e) => setSubmissionData(prev => ({ ...prev, [key]: e.target.checked }))}
                                                                        />
                                                                        <span className="text-sm text-slate-700 font-medium">{field.placeholder || field.label}</span>
                                                                    </label>
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        placeholder={field.placeholder || ''}
                                                                        className={inputClass}
                                                                        value={String(submissionData[key] || '')}
                                                                        onChange={(e) => setSubmissionData(prev => ({ ...prev, [key]: e.target.value }))}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })}

                                                    <button
                                                        type="submit"
                                                        disabled={submitting === submissionStage?.id}
                                                        className="w-full py-5 bg-gradient-to-r from-[#6C3BFF] to-purple-700 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                                    >
                                                        {submitting === submissionStage?.id ? (
                                                            <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                                                        ) : (
                                                            <><FileText size={16} /> Submit</>
                                                        )}
                                                    </button>
                                                </form>
                                            ) : (
                                                <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-900/5 text-center space-y-4">
                                                    <FileText size={40} className="mx-auto text-slate-300" />
                                                    <p className="text-lg font-bold text-slate-500">No submission fields have been configured for this stage yet.</p>
                                                    <p className="text-sm text-slate-400 font-medium">The institution admin needs to set up the submission form fields.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* General Guidelines */}
                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-3">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Submission Guidelines</p>
                                            <ul className="space-y-2 text-sm text-slate-600 font-medium">
                                                <li className="flex items-start gap-2"><span className="text-[#6C3BFF] font-black mt-0.5">→</span> Fill all required fields marked with *.</li>
                                                <li className="flex items-start gap-2"><span className="text-[#6C3BFF] font-black mt-0.5">→</span> You can re-submit before the deadline to update your project.</li>
                                                <li className="flex items-start gap-2"><span className="text-[#6C3BFF] font-black mt-0.5">→</span> Scores and rubrics are confidential — managed by institution judges.</li>
                                                {needsTeam && (
                                                    <li className="flex items-start gap-2"><span className="text-amber-500 font-black mt-0.5">⚠</span> Only the team leader can submit on behalf of the team.</li>
                                                )}
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </div>
                            );
                        })()}

                        {activeTab === 'team' && (
                            <div className="space-y-10 max-w-3xl">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">My Team</h2>
                                    <p className="text-slate-500 font-medium mt-2">
                                        {event?.participationType === 'individual'
                                            ? 'Set your display name for this event.'
                                            : team
                                                ? `You're part of "${team.team_name}"`
                                                : 'Create a new team or join an existing one using an invite code.'}
                                    </p>
                                </div>

                                {event?.participationType === 'individual' ? (
                                    <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-900/5 space-y-6">
                                        <h3 className="text-xl font-black text-slate-900">Your Display Name</h3>
                                        <p className="text-slate-500 text-sm font-medium">Choose a team name to appear on the leaderboard and certificate.</p>
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                placeholder="Enter your team name"
                                                value={teamName}
                                                onChange={(e) => setTeamName(e.target.value)}
                                                className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-purple-50 focus:border-purple-200"
                                            />
                                        </div>
                                    </div>
                                ) : !team ? (
                                    <>
                                        {/* Create Team */}
                                        <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-900/5 space-y-6">
                                            <h3 className="text-xl font-black text-slate-900">Create a Team</h3>
                                            <p className="text-slate-500 text-sm font-medium">Start a new team and invite your classmates to join.</p>
                                            <div className="flex gap-4">
                                                <input
                                                    type="text"
                                                    placeholder="Enter your team name"
                                                    value={teamName}
                                                    onChange={(e) => setTeamName(e.target.value)}
                                                    className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-purple-50 focus:border-purple-200"
                                                />
                                                <button
                                                    onClick={createTeam}
                                                    disabled={working || !teamName.trim()}
                                                    className="px-8 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl disabled:opacity-50"
                                                >
                                                    {working ? 'Creating...' : 'Create'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Join Team */}
                                        <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-900/5 space-y-6">
                                            <h3 className="text-xl font-black text-slate-900">Join a Team</h3>
                                            <p className="text-slate-500 text-sm font-medium">Ask your team lead for the invite code.</p>
                                            <div className="flex gap-4">
                                                <input
                                                    type="text"
                                                    placeholder="Enter invite code"
                                                    value={inviteCode}
                                                    onChange={(e) => setInviteCode(e.target.value)}
                                                    className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-purple-50 focus:border-purple-200"
                                                />
                                                <button
                                                    onClick={joinByCode}
                                                    disabled={working || !inviteCode.trim()}
                                                    className="px-8 py-4 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-900/10 disabled:opacity-50"
                                                >
                                                    Join
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Team Info Card */}
                                        <div className="p-10 bg-gradient-to-br from-slate-900 to-purple-900 rounded-[3rem] text-white shadow-2xl shadow-purple-900/20 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">Your Team</p>
                                                    <h3 className="text-3xl font-black mt-2">{team.team_name}</h3>
                                                </div>
                                                <div className="px-4 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    {team.members?.length ?? 0} member{(team.members?.length ?? 0) !== 1 ? 's' : ''}
                                                </div>
                                            </div>

                                            {/* Members List */}
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">Members</p>
                                                {team.members?.map((m: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl backdrop-blur-sm">
                                                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-sm font-black overflow-hidden">
                                                            {m.profile_image ? (
                                                                <img src={m.profile_image} alt={m.name || 'Member'} className="w-full h-full object-cover" />
                                                            ) : (
                                                                (m.name || m.full_name || m.email || '?').charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-black text-sm">{m.name || m.full_name || m.email || 'Unknown'}</p>
                                                            <p className="text-xs text-purple-300 font-medium">{m.email}</p>
                                                        </div>
                                                        {m.is_leader && (
                                                            <span className="px-3 py-1 bg-yellow-400 text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                                Leader
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Invite Section (Leader only) */}
                                        {isLeader && (
                                            <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-900/5 space-y-6">
                                                <h3 className="text-xl font-black text-slate-900">Invite Teammates</h3>
                                                <p className="text-slate-500 text-sm font-medium">Generate an invite code for others to join your team.</p>
                                                
                                                {!generatedCode ? (
                                                    <button
                                                        onClick={generateInvite}
                                                        disabled={working}
                                                        className="px-8 py-4 rounded-2xl bg-[#6C3BFF] text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-900/10"
                                                    >
                                                        {working ? 'Generating...' : 'Generate Invite Code'}
                                                    </button>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                                            <code className="flex-1 text-lg font-black text-purple-700 tracking-wider">{generatedCode}</code>
                                                            <button
                                                                onClick={() => { navigator.clipboard.writeText(generatedCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                                                                className="p-3 bg-white rounded-xl text-purple-600 hover:bg-purple-100 transition-all"
                                                            >
                                                                {codeCopied ? <Check size={18} /> : <Copy size={18} />}
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const link = `${window.location.origin}${window.location.pathname}?join=${generatedCode}`;
                                                                navigator.clipboard.writeText(link);
                                                                setLinkCopied(true);
                                                                setTimeout(() => setLinkCopied(false), 2000);
                                                            }}
                                                            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl"
                                                        >
                                                            <Share2 size={14} />
                                                            {linkCopied ? 'Copied!' : 'Copy Invite Link'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Not leader — show join code input */}
                                        {!isLeader && (
                                            <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-900/5 space-y-6">
                                                <h3 className="text-xl font-black text-slate-900">Sync with Team</h3>
                                                <p className="text-slate-500 text-sm font-medium">Enter the invite code shared by your team lead to sync.</p>
                                                <div className="flex gap-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Invite Code"
                                                        value={inviteCode}
                                                        onChange={(e) => setInviteCode(e.target.value)}
                                                        className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-purple-50 focus:border-purple-200"
                                                    />
                                                    <button
                                                        onClick={joinByCode}
                                                        disabled={working || !inviteCode.trim() || Boolean(team)}
                                                        className="w-full py-4 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-900/10 disabled:opacity-50"
                                                    >
                                                        Sync with Team
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'results' && (
                            <div className="p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <Trophy size={24} className="text-yellow-500" />
                                    <h3 className="text-xl font-black text-slate-900">Results & Feedback</h3>
                                </div>

                                {isEvaluated && evaluation ? (
                                    <div className="space-y-6">
                                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-[2rem] p-8 border border-yellow-100">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Award size={20} className="text-yellow-600" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600">Your Score</p>
                                            </div>
                                            {evaluation.stage_name && (
                                                <p className="text-xs font-bold text-amber-600 mb-1">
                                                    Stage: {evaluation.stage_name}
                                                </p>
                                            )}
                                            <p className="text-5xl font-black text-slate-900 mb-2">
                                                {evaluation.score}<span className="text-2xl text-slate-400">/100</span>
                                            </p>
                                            {evaluation.evaluated_at && (
                                                <p className="text-xs font-bold text-slate-400">
                                                    Evaluated {new Date(evaluation.evaluated_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>

                                        {evaluation.feedback && (
                                            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <FileText size={18} className="text-purple-600" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Judge Feedback</p>
                                                </div>
                                                <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                    {evaluation.feedback}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-[2rem] p-12 border border-slate-100 shadow-sm text-center">
                                        <Trophy size={48} className="mx-auto mb-4 text-slate-200" />
                                        <p className="text-lg font-black text-slate-400">No results yet</p>
                                        <p className="text-sm font-bold text-slate-400 mt-2">
                                            Results will appear here once the judges complete their evaluation.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EventHub;

