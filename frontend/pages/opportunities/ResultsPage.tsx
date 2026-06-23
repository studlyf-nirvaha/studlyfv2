import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../../apiConfig';
import Navigation from '../../components/Navigation';
import { Search, ChevronDown, ChevronUp, Users } from 'lucide-react';

interface Member {
    user_id: string;
    name: string;
    email: string;
    college: string;
    is_leader: boolean;
}

interface ResultEntry {
    rank: number;
    team_id: string;
    team_name: string;
    lead_name: string;
    organization: string;
    total_score: number;
    project_name: string;
    members: Member[];
    participation_type: string;
}

interface ResultsData {
    event: {
        title: string;
        logo_url: string;
        banner_url: string;
    };
    results: ResultEntry[];
}

const ResultsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<ResultsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!id) return;
        fetch(`${API_BASE_URL}/api/results/${id}`)
            .then(res => res.json())
            .then(json => { setData(json); setLoading(false); })
            .catch(() => setLoading(false));
    }, [id]);

    const toggleExpand = (teamId: string) => {
        setExpandedTeams(prev => {
            const next = new Set(prev);
            if (next.has(teamId)) next.delete(teamId);
            else next.add(teamId);
            return next;
        });
    };

    const filteredResults = data?.results
        ?.filter(r =>
            !searchQuery ||
            r.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.organization.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => a.team_name.toLowerCase().localeCompare(b.team_name.toLowerCase()));

    if (loading) {
        return (
            <div className="min-h-screen bg-[#eef2f7]">
                <Navigation />
                <div className="max-w-4xl mx-auto px-4 py-20">
                    <div className="animate-pulse space-y-6">
                        <div className="h-48 bg-slate-200 rounded-2xl" />
                        <div className="h-8 bg-slate-200 rounded w-1/3" />
                        <div className="h-4 bg-slate-200 rounded w-2/3" />
                        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[#eef2f7]">
                <Navigation />
                <div className="max-w-4xl mx-auto px-4 py-20 text-center">
                    <p className="text-slate-500 font-medium">Results not available.</p>
                </div>
            </div>
        );
    }

    const { event } = data;

    return (
        <div className="min-h-screen bg-[#eef2f7] font-sans">
            <Navigation />

            {/* Banner */}
            <div className="relative h-48 md:h-64 bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 overflow-hidden">
                {event.banner_url && (
                    <img
                        src={event.banner_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                )}
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative h-full max-w-4xl mx-auto px-4 flex items-center gap-6">
                    {event.logo_url && (
                        <img
                            src={event.logo_url}
                            alt=""
                            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 border-white/30 shadow-lg object-cover"
                        />
                    )}
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white">{event.title}</h1>
                        <p className="text-purple-200 font-medium mt-1">Results & Winners</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10">
                {/* Search */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex items-center gap-3">
                    <Search size={18} className="text-slate-400 shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by team name, lead name, or organization..."
                        className="w-full outline-none text-sm font-medium text-slate-700 placeholder:text-slate-300"
                    />
                </div>

                {/* Results count */}
                <p className="text-xs font-medium text-slate-500 mb-4 px-1">
                    Results are displayed in alphabetical order of team names
                    {filteredResults && <span> &middot; {filteredResults.length} team(s)</span>}
                </p>

                {/* Overall Result heading */}
                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-purple-600 rounded-full" />
                    Overall Result
                </h2>

                {/* Results list */}
                <div className="space-y-3">
                    {filteredResults?.map((entry) => {
                        const isExpanded = expandedTeams.has(entry.team_id);
                        const memberCount = entry.members.length;
                        const extraPlayers = memberCount > 1 ? memberCount - 1 : 0;

                        return (
                            <div
                                key={entry.team_id}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-purple-200"
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-slate-900 text-lg">
                                                {entry.team_name}
                                            </h3>
                                            <p className="text-sm font-semibold text-slate-600 mt-0.5">
                                                {entry.lead_name}
                                            </p>
                                            {entry.organization && (
                                                <p className="text-xs font-medium text-slate-400 mt-0.5">
                                                    {entry.organization}
                                                </p>
                                            )}
                                            {extraPlayers > 0 && (
                                                <button
                                                    onClick={() => toggleExpand(entry.team_id)}
                                                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-600 hover:text-purple-800 transition-colors"
                                                >
                                                    <Users size={13} />
                                                    +{extraPlayers} Player{extraPlayers > 1 ? 's' : ''}
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-2xl font-black text-purple-600">
                                                #{entry.rank}
                                            </div>
                                            {entry.total_score > 0 && (
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                    {entry.total_score} pts
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded team members */}
                                    {isExpanded && entry.members.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                            {entry.members.filter(m => !m.is_leader).map((m, idx) => (
                                                <div key={m.user_id || idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
                                                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-black">
                                                        {m.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{m.name}</p>
                                                        {m.college && (
                                                            <p className="text-[10px] font-medium text-slate-400">{m.college}</p>
                                                        )}
                                                        {m.email && (
                                                            <p className="text-[10px] text-slate-400">{m.email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {(!filteredResults || filteredResults.length === 0) && (
                        <div className="text-center py-12">
                            <p className="text-slate-400 font-medium">No results to display.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResultsPage;

