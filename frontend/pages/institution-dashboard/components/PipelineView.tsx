import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, authHeaders } from '../../../apiConfig';
import { IStage } from '../../../types/event';
import {
    Users, ChevronRight, TrendingUp, BarChart3, Award,
    CheckCircle2, Clock, AlertTriangle, ArrowRight,
    ChevronDown, ChevronUp, Send, RefreshCw
} from 'lucide-react';

interface PipelineParticipant {
    _id: string;
    name: string;
    email: string;
    current_stage?: string;
    last_stage_submitted?: string;
    status: string;
    team_name?: string;
    team_members?: Array<{ user_id: string; name: string; email: string; is_leader: boolean }>;
    team_leader_id?: string;
    registered_at?: string;
}

interface StageAnalytics {
    stage_id: string;
    stage_name: string;
    stage_type: string;
    total_participants: number;
    submissions: number;
    completion_rate: number;
}

interface PipelineViewProps {
    eventId: string;
    stages: IStage[];
}

const PipelineView: React.FC<PipelineViewProps> = ({ eventId, stages }) => {
    const [participants, setParticipants] = useState<PipelineParticipant[]>([]);
    const [analytics, setAnalytics] = useState<StageAnalytics[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [advancing, setAdvancing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pRes, aRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/participants`,
                    { headers: { ...authHeaders() } }),
                fetch(`${API_BASE_URL}/api/v1/stages/events/${eventId}/stage-analytics`,
                    { headers: { ...authHeaders() } }),
                ]);

            if (pRes.ok) {
                const pData = await pRes.json();
                setParticipants(pData.participants || []);
            }
            if (aRes.ok) {
                const aData = await aRes.json();
                setAnalytics(aData.stage_stats || []);
            }
        } catch (err) {
            console.error('Pipeline fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const stageNames = stages.map(s => s.name);

    const firstStageName = stages.length > 0 ? stages[0].name : null;

    const unassignedParticipants = participants.filter(p =>
        !p.current_stage || p.current_stage.trim() === ''
    );

    const participantsByStage = (stageName: string) =>
        participants.filter(p =>
            p.current_stage === stageName
        );

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllInStage = (stageName: string, select: boolean) => {
        const inStage = participantsByStage(stageName).map(p => p._id);
        setSelectedIds(prev => {
            const next = new Set(prev);
            inStage.forEach(id => select ? next.add(id) : next.delete(id));
            return next;
        });
    };

    const advanceSelected = async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);

        const currentStages = [...new Set(ids.map(id =>
            participants.find(p => p._id === id)?.current_stage
        ).filter(Boolean))];

        if (currentStages.length !== 1) {
            setError('Please select participants from the same stage');
            return;
        }

        const currentIdx = stageNames.indexOf(currentStages[0]);
        if (currentIdx === -1 || currentIdx >= stageNames.length - 1) {
            setError('No next stage available');
            return;
        }

        const nextStage = stageNames[currentIdx + 1];
        setAdvancing(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/institution/events/${eventId}/advance-stage`,
                {
                    method: 'PATCH',
                    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ participant_ids: ids, next_stage: nextStage }),
                }
            );
            if (res.ok) {
                setSuccessMsg(`Advanced ${ids.length} participant(s) to "${nextStage}"`);
                setSelectedIds(new Set());
                await fetchData();
            } else {
                const errData = await res.json();
                setError(errData.detail || 'Failed to advance participants');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setAdvancing(false);
        }
    };

    const toggleCollapse = (name: string) => {
        setCollapsed(prev => ({ ...prev, [name]: !prev[name] }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw size={24} className="animate-spin text-purple-500" />
                <span className="ml-3 text-slate-500 font-bold">Loading pipeline...</span>
            </div>
        );
    }

    const totalParticipants = participants.length;

    return (
        <div className="space-y-8">
            {/* Funnel Header */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900">Participant Pipeline</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {totalParticipants} total participants
                            {unassignedParticipants.length > 0
                                ? ` — ${unassignedParticipants.length} unassigned`
                                : ` flowing through ${stages.length} stages`}
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-3 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>

                {/* Unassigned warning */}
                {unassignedParticipants.length > 0 && (
                    <div className="mb-4 px-5 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                        <span className="text-xs font-bold text-amber-800">
                            {unassignedParticipants.length} participant(s) with no assigned stage — shown in Unassigned column below
                        </span>
                    </div>
                )}

                {/* Funnel visualization */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {stageNames.map((name, idx) => {
                        const count = participantsByStage(name).length;
                        const isLast = idx === stageNames.length - 1;
                        const pct = totalParticipants > 0 ? (count / totalParticipants) * 100 : 0;
                        return (
                            <div
                                key={name}
                                className="relative bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-100"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Stage {idx + 1}
                                    </span>
                                    {count > 0 && (
                                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                            {pct.toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                                <p className="text-3xl font-black text-slate-900">{count}</p>
                                <p className="text-xs font-bold text-slate-500 mt-1 truncate">{name}</p>
                                {!isLast && (
                                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-slate-300">
                                        <ChevronRight size={16} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {unassignedParticipants.length > 0 && (
                        <div className="relative bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 border border-amber-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                                    Unassigned
                                </span>
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                    {(unassignedParticipants.length / totalParticipants * 100).toFixed(0)}%
                                </span>
                            </div>
                            <p className="text-3xl font-black text-slate-900">{unassignedParticipants.length}</p>
                            <p className="text-xs font-bold text-amber-600 mt-1">No stage assigned</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Action bar */}
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-700">
                        {selectedIds.size} selected
                    </span>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs font-bold text-slate-400 hover:text-red-500 px-3 py-1 rounded-lg hover:bg-red-50 transition-all"
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {successMsg && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-2">
                            <CheckCircle2 size={14} /> {successMsg}
                        </span>
                    )}
                    {error && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-4 py-2 rounded-xl flex items-center gap-2">
                            <AlertTriangle size={14} /> {error}
                        </span>
                    )}
                    <button
                        onClick={advanceSelected}
                        disabled={selectedIds.size === 0 || advancing}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                            selectedIds.size > 0 && !advancing
                                ? 'bg-[#6C3BFF] text-white hover:scale-[1.02] shadow-lg shadow-purple-200'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {advancing ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <Send size={14} />
                        )}
                        Advance to Next Stage
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unassignedParticipants.length > 0 && (
                    <div key="unassigned" className="bg-white rounded-[2rem] shadow-sm border-2 border-amber-200 overflow-hidden">
                        <div className="p-5 border-b border-amber-100 bg-amber-50/50">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-black text-amber-700 text-sm flex items-center gap-2">
                                    <AlertTriangle size={14} /> Unassigned
                                </h4>
                                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
                                    {unassignedParticipants.length}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-amber-500">
                                These participants have no current_stage set
                            </p>
                        </div>
                        <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                            {unassignedParticipants.map(p => (
                                <div key={p._id} className="p-4 hover:bg-slate-50 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black text-xs">
                                            {p.name?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">
                                                {p.name || 'Unnamed'}
                                            </p>
                                            {p.team_name && (
                                                <p className="text-[10px] font-bold text-purple-600 truncate">
                                                    {p.team_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {stageNames.map((name) => {
                    const inStage = participantsByStage(name);
                    const isCollapsed = collapsed[name];
                    const stageAnalytics = analytics.find(a => a.stage_name === name);
                    return (
                        <div key={name} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                            {/* Stage header */}
                            <div
                                className="p-5 border-b border-slate-50 cursor-pointer hover:bg-slate-50/50 transition-all"
                                onClick={() => toggleCollapse(name)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-black text-slate-900 text-sm">{name}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                            {inStage.length}
                                        </span>
                                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                    </div>
                                </div>
                                {stageAnalytics && (
                                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <CheckCircle2 size={10} className="text-emerald-500" />
                                            {stageAnalytics.completion_rate}% completed
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <BarChart3 size={10} className="text-purple-500" />
                                            {stageAnalytics.submissions} submissions
                                        </span>
                                    </div>
                                )}
                                {inStage.length > 0 && (
                                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                                            style={{ width: `${(inStage.length / totalParticipants) * 100}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Participant list */}
                            {!isCollapsed && (
                                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                                    {inStage.length > 0 && (
                                        <div className="px-4 py-2 bg-slate-50/50 flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={inStage.every(p => selectedIds.has(p._id))}
                                                onChange={(e) => selectAllInStage(name, e.target.checked)}
                                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                Select all
                                            </span>
                                        </div>
                                    )}
                                    {inStage.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <Users size={24} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-xs font-bold">No participants</p>
                                        </div>
                                    ) : (
                                        inStage.map(p => (
                                            <div
                                                key={p._id}
                                                className={`p-4 flex items-center gap-3 hover:bg-slate-50/50 transition-all ${
                                                    selectedIds.has(p._id) ? 'bg-purple-50/50' : ''
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(p._id)}
                                                    onChange={() => toggleSelect(p._id)}
                                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                                                    {p.name?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                                                    <p className="text-xs text-slate-400 truncate">{p.email}</p>
                                                    {p.team_name && (
                                                        <div className="mt-1 flex items-center gap-1">
                                                            <span className="text-[10px] font-bold text-purple-600">{p.team_name}</span>
                                                            {p.team_members && p.team_members.length > 0 && (
                                                                <span className="text-[9px] text-slate-400">
                                                                    · {p.team_members.length} member{p.team_members.length !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {p.team_members && p.team_members.length > 1 && (
                                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                                            {p.team_members.map((m, i) => (
                                                                <span
                                                                    key={m.user_id || i}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold text-slate-600"
                                                                >
                                                                    {m.name || m.email || ''}
                                                                    {m.is_leader && (
                                                                        <span className="text-[8px] text-purple-500 font-black">★</span>
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    p.status === 'shortlisted' || p.status === 'accepted'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : p.status === 'rejected'
                                                        ? 'bg-red-50 text-red-600'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Analytics section */}
            {analytics.length > 0 && (
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp size={20} className="text-purple-600" />
                        <h3 className="text-xl font-black text-slate-900">Stage Analytics</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Stage</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Participants</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Submissions</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Completion Rate</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {analytics.map((a, idx) => (
                                    <tr key={a.stage_id} className="hover:bg-slate-50/50 transition-all">
                                        <td className="px-4 py-4 font-bold text-slate-900">
                                            <span className="text-[10px] text-slate-400 mr-2">S{idx + 1}</span>
                                            {a.stage_name}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs font-bold text-slate-500 uppercase">{a.stage_type}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right font-black text-slate-900">{a.total_participants}</td>
                                        <td className="px-4 py-4 text-right font-black text-slate-900">{a.submissions}</td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            a.completion_rate >= 80 ? 'bg-emerald-500' :
                                                            a.completion_rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${a.completion_rate}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-black ${
                                                    a.completion_rate >= 80 ? 'text-emerald-600' :
                                                    a.completion_rate >= 50 ? 'text-amber-600' : 'text-red-600'
                                                }`}>
                                                    {a.completion_rate}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {idx < stageNames.length - 1 && (
                                                <span className="text-slate-300"><ArrowRight size={14} /></span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PipelineView;
