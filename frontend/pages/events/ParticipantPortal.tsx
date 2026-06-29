import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { useAuth } from '../../AuthContext';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Copy, ExternalLink, Filter, Layers, Loader2, Mail, Phone, Search, Share2, Sparkles, Trophy, Users, X } from 'lucide-react';

interface Problem {
    id?: string;
    _id?: string;
    problem_id?: string;
    title: string;
    description?: string;
    domain?: string;
    tech_stack?: string;
    ps_code?: string | null;
    brief?: string;
    max_teams?: number;
    team_count?: number;
    slots_left?: number;
    is_full?: boolean;
}

function Countdown({ target }: { target: string }) {
    const calc = () => {
        const diff = new Date(target).getTime() - Date.now();
        if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
        return {
            d: Math.floor(diff / 86400000),
            h: Math.floor((diff % 86400000) / 3600000),
            m: Math.floor((diff % 3600000) / 60000),
            s: Math.floor((diff % 60000) / 1000),
        };
    };
    const [t, setT] = useState(calc);
    useEffect(() => {
        const id = setInterval(() => setT(calc), 1000);
        return () => clearInterval(id);
    }, [target]);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        <div className="grid grid-cols-4 gap-3 text-center">
            {[
                { label: 'Days', value: t.d },
                { label: 'Hours', value: pad(t.h) },
                { label: 'Minutes', value: pad(t.m) },
                { label: 'Seconds', value: pad(t.s) },
            ].map((x) => (
                <div key={x.label} className="p-3 rounded-2xl bg-white/10 border border-white/10">
                    <p className="text-2xl font-black">{x.value}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 mt-1">{x.label}</p>
                </div>
            ))}
        </div>
    );
}

const ParticipantPortal: React.FC = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');
    const [event, setEvent] = useState<any>(null);
    const [config, setConfig] = useState<any>({});
    const [problems, setProblems] = useState<Problem[]>([]);
    const [stats, setStats] = useState({ activeStatements: 0, totalPicks: 0 });
    const [mySelection, setMySelection] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [availability, setAvailability] = useState<'all' | 'open' | 'full'>('all');
    const [domain, setDomain] = useState('All');
    const [teamName, setTeamName] = useState('');
    const [teamSize, setTeamSize] = useState('1');
    const [copied, setCopied] = useState(false);

    const [modalProblem, setModalProblem] = useState<Problem | null>(null);
    const [modalEmail, setModalEmail] = useState(user?.email || '');
    const [modalMobile, setModalMobile] = useState((user as any)?.mobile || (user as any)?.phone || '');

    const fetchPortal = async () => {
        if (!eventId) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/hackathons/events/${eventId}/portal`, { headers: { ...authHeaders() } });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to load event portal');
            }
            const data = await res.json();
            setEvent(data.event || null);
            setConfig(data.config || {});
            setProblems(Array.isArray(data.problems) ? data.problems : []);
            setStats(data.stats || { activeStatements: 0, totalPicks: 0 });
            setMySelection(data.mySelection || null);
        } catch (e: any) {
            setError(e.message || 'Failed to load portal');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortal();
    }, [eventId]);

    const domains = useMemo(() => ['All', ...Array.from(new Set(problems.map(p => p.domain).filter(Boolean) as string[]))], [problems]);

    const filtered = useMemo(() => {
        return problems.filter(p => {
            if (domain !== 'All' && p.domain !== domain) return false;
            if (availability === 'open' && p.is_full) return false;
            if (availability === 'full' && !p.is_full) return false;
            if (search) {
                const hay = [p.title, p.description, p.brief, p.domain, p.tech_stack, p.ps_code].filter(Boolean).join(' ').toLowerCase();
                if (!hay.includes(search.toLowerCase())) return false;
            }
            return true;
        });
    }, [problems, search, availability, domain]);

    const grouped = useMemo(() => {
        const out: Record<string, Problem[]> = {};
        filtered.forEach(p => {
            const key = p.domain || 'General';
            if (!out[key]) out[key] = [];
            out[key].push(p);
        });
        return out;
    }, [filtered]);

    const confirmSelection = async () => {
        if (!modalProblem) return;
        if (!teamName.trim()) {
            setError('Enter a team name before selecting a problem');
            setModalProblem(null);
            return;
        }
        setJoining(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/hackathons/events/${eventId}/select`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    problem_id: modalProblem.problem_id || modalProblem.id || modalProblem._id,
                    team_name: teamName,
                    team_size: teamSize ? Number(teamSize) : undefined,
                    email: modalEmail,
                    mobile: modalMobile,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Selection failed');
            }
            setModalProblem(null);
            await fetchPortal();
        } catch (e: any) {
            setError(e.message || 'Selection failed');
        } finally {
            setJoining(false);
        }
    };

    const copyLink = async () => {
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pt-32 px-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="w-64 h-10 bg-slate-200 rounded-xl animate-pulse"></div>
                    <div className="w-full h-48 bg-white rounded-3xl border border-slate-100 animate-pulse"></div>
                    <div className="w-full h-64 bg-white rounded-3xl border border-slate-100 animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
                <div className="max-w-lg space-y-4">
                    <AlertTriangle className="mx-auto text-amber-500" size={48} />
                    <h1 className="text-3xl font-black text-slate-900">Event portal not found</h1>
                    <p className="text-slate-500 font-medium">The event ID could not be resolved or the portal is not configured yet.</p>
                    <button onClick={() => navigate('/opportunities/my-applications')} className="px-6 py-3 rounded-full bg-slate-900 text-white font-bold">Back</button>
                </div>
            </div>
        );
    }

    const sponsors = Array.isArray(config.sponsors) ? config.sponsors : [];
    const packages = Array.isArray(config.event_packages) ? config.event_packages : [];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(`/events/${eventId}`)} className="p-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#6C3BFF]">Participant Portal</p>
                            <h1 className="text-3xl font-black tracking-tight">{event.title}</h1>
                            <p className="text-slate-500 font-medium mt-1">Browse problem statements, make a selection, and use the package links posted by the institution.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={copyLink} className="px-4 py-3 rounded-full bg-white border border-slate-200 font-bold text-sm flex items-center gap-2">
                            {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                            {copied ? 'Copied' : 'Copy Link'}
                        </button>
                        <button onClick={() => navigate(`/events/${eventId}/package/card`)} className="px-4 py-3 rounded-full bg-[#6C3BFF] text-white font-bold text-sm flex items-center gap-2">
                            <Share2 size={16} /> Participant Card
                        </button>
                    </div>
                </div>

                <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-[#2A1758] to-[#7c154b] text-white shadow-2xl">
                        <div className="flex flex-wrap gap-3 items-center mb-4">
                            <span className="px-4 py-2 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-[0.25em]">{config.event_name || event.title}</span>
                            <span className="px-4 py-2 rounded-full bg-[#E32879] text-[10px] font-black uppercase tracking-[0.25em]">{config.event_round || 'Hackathon'}</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tight leading-tight max-w-[14ch]">Choose the problem your team will own.</h2>
                        <p className="text-white/80 mt-4 max-w-2xl">The institution can publish sponsors, packages, and evaluation context here. Students see the same live data inside this portal.</p>
                        <div className="grid grid-cols-3 gap-3 mt-6">
                            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Active statements</p>
                                <p className="text-2xl font-black mt-1">{stats.activeStatements}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Total picks</p>
                                <p className="text-2xl font-black mt-1">{stats.totalPicks}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">User</p>
                                <p className="text-sm font-bold mt-2 truncate">{user?.full_name || user?.email || 'Participant'}</p>
                            </div>
                        </div>
                        {config.countdown_target && (
                            <div className="mt-6">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 mb-2">Countdown to launch day</p>
                                <Countdown target={config.countdown_target} />
                            </div>
                        )}
                        <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-white/80">
                            {event.category && <span>{event.category}</span>}
                            {event.min_team_size ? <span>Min {event.min_team_size} members</span> : null}
                            {event.max_team_size ? <span>Max {event.max_team_size} members</span> : null}
                        </div>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Team name</label>
                            <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Your team name" className="mt-2 w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Team size</label>
                            <input value={teamSize} onChange={e => setTeamSize(e.target.value)} type="number" min={1} className="mt-2 w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none" />
                        </div>
                        {mySelection ? (
                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">Your selection</p>
                                <p className="mt-1 font-bold text-emerald-900">{mySelection.problem_title}</p>
                                <p className="text-sm text-emerald-700 mt-1">Team: {mySelection.team_name}</p>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-500">Select a problem from the board below after setting your team name.</div>
                        )}
                        {packages.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Event packages</p>
                                <div className="space-y-2">
                                    {packages.map((pkg: any, idx: number) => (
                                        <button key={idx} onClick={() => navigate(`/events/${eventId}/package/card`)} className="w-full text-left px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#6C3BFF]/30 transition-colors">
                                            <div className="text-sm font-bold text-[#6C3BFF]">{pkg.title || pkg.name || 'Package'}</div>
                                            <div className="text-xs text-slate-400 mt-1 truncate">{pkg.description || pkg.url || 'Open in participant card'}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 font-medium flex items-start gap-3">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <section className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#6C3BFF]">Problem Board</p>
                            <h3 className="text-2xl font-black">Browse available problem statements</h3>
                        </div>
                        <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                            <div className="relative min-w-[260px]">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search statements" className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 outline-none" />
                            </div>
                            <select value={availability} onChange={e => setAvailability(e.target.value as any)} className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 outline-none">
                                <option value="all">All</option>
                                <option value="open">Available only</option>
                                <option value="full">Full only</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {domains.map((d) => (
                            <button key={d} onClick={() => setDomain(d)} className={`px-4 py-2 rounded-full text-sm font-bold ${domain === d ? 'bg-[#E32879] text-white' : 'bg-slate-100 text-slate-600'}`}>
                                {d}
                            </button>
                        ))}
                    </div>
                </section>

                <div className="space-y-4">
                    {Object.keys(grouped).length === 0 ? (
                        <div className="p-10 text-center rounded-[2rem] bg-white border border-slate-200 text-slate-400">No problem statements match your filters.</div>
                    ) : Object.entries(grouped).map(([dom, items]) => (
                        <section key={dom} className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Domain</p>
                                    <h4 className="text-xl font-black text-slate-900">{dom}</h4>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-500">{items.length} problems</span>
                            </div>
                            <div className="space-y-4">
                                {items.map((p) => {
                                    const pid = p.problem_id || p.id || p._id;
                                    return (
                                        <div key={pid} className={`grid grid-cols-1 lg:grid-cols-[1.6fr_0.9fr] gap-6 p-5 rounded-[1.75rem] border ${p.is_full ? 'border-rose-100 bg-rose-50/30' : 'border-slate-200 bg-slate-50/40'}`}>
                                            <div>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600">{p.ps_code || 'NO-CODE'}</span>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.is_full ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {p.is_full ? 'Unavailable' : 'Open'}
                                                    </span>
                                                </div>
                                                <h5 className="text-2xl font-black text-slate-900 leading-tight">{p.title}</h5>
                                                <p className="text-slate-600 mt-2 leading-relaxed">{p.brief || p.description || 'No description provided.'}</p>
                                                {p.tech_stack && <p className="text-sm text-slate-500 mt-3"><span className="font-bold">Tech:</span> {p.tech_stack}</p>}
                                            </div>
                                            <div className="space-y-3">
                                                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                                                    <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                                                        <span>{p.team_count ?? 0}/{p.max_teams ?? '—'} teams</span>
                                                        <span className="text-slate-400">{p.slots_left || 0} left</span>
                                                    </div>
                                                    <div className="h-2 mt-3 rounded-full bg-slate-100 overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-[#E32879] to-[#931F6B]" style={{ width: `${p.max_teams ? Math.min(100, ((p.team_count ?? 0) / p.max_teams) * 100) : 0}%` }} />
                                                    </div>
                                                </div>
                                                <button disabled={joining || !!mySelection || p.is_full} onClick={() => setModalProblem(p)} className="w-full py-3 rounded-full font-black text-white bg-[#6C3BFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                                    {joining ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                                    {mySelection ? 'Already Selected' : p.is_full ? 'Slots Filled' : 'Select This Problem'}
                                                </button>
                                                {!mySelection && <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 text-center">One selection per participant</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>

                <section className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Users size={18} className="text-[#6C3BFF]" />
                        <h3 className="text-xl font-black">Sponsors & Partners</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {sponsors.length > 0 ? sponsors.map((s: any, idx: number) => (
                            <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 text-center font-bold text-slate-700">
                                {s.name || s.label || 'Sponsor'}
                            </div>
                        )) : (
                            <div className="col-span-full text-slate-400 text-sm">No sponsors configured yet.</div>
                        )}
                    </div>
                </section>
            </div>

            {modalProblem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg p-8 rounded-[2rem] bg-white shadow-2xl space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#6C3BFF]">Confirm selection</p>
                                <h3 className="text-xl font-black mt-1">{modalProblem.title}</h3>
                                <p className="text-sm text-slate-500 mt-1">{modalProblem.brief || modalProblem.description || ''}</p>
                            </div>
                            <button onClick={() => setModalProblem(null)} className="p-2 rounded-xl hover:bg-slate-100"><X size={20} /></button>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-slate-400 text-[10px] uppercase tracking-[0.25em] font-black">Domain</span><p className="font-bold mt-1">{modalProblem.domain || 'General'}</p></div>
                            <div><span className="text-slate-400 text-[10px] uppercase tracking-[0.25em] font-black">Code</span><p className="font-bold mt-1">{modalProblem.ps_code || '—'}</p></div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400"><Mail size={12} className="inline mr-1" />Team lead email</label>
                                <input value={modalEmail} onChange={e => setModalEmail(e.target.value)} type="email" className="mt-2 w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400"><Phone size={12} className="inline mr-1" />Mobile number</label>
                                <input value={modalMobile} onChange={e => setModalMobile(e.target.value)} type="tel" placeholder="+91 9876543210" className="mt-2 w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none" />
                            </div>
                        </div>
                        <button disabled={joining} onClick={confirmSelection} className="w-full py-4 rounded-full font-black text-white bg-[#6C3BFF] disabled:opacity-50 flex items-center justify-center gap-2">
                            {joining ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            Confirm & Lock Selection
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParticipantPortal;

