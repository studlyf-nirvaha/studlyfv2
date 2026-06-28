import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { Trash2, Users, Search, RefreshCw, X, Info } from 'lucide-react';
import { useDashboardCache, useDashboardData } from '../../contexts/DashboardDataContext';

type TeamMember = {
    user_id?: string;
    name?: string;
    email?: string;
    role?: string;
    is_leader?: boolean;
    registration_status?: string;
    submission_status?: string;
};

type Team = {
    _id: string;
    team_name?: string;
    team_leader_id?: string;
    leader_name?: string;
    members?: TeamMember[];
    status?: string;
    event_id?: string;
    created_at?: string;
};

type Event = {
    _id: string;
    title?: string;
    name?: string;
};

interface TeamsManagementProps {
    institutionId: string;
}

const TeamsManagement: React.FC<TeamsManagementProps> = ({ institutionId }) => {
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [filterStatus, setFilterStatus] = useState('All');
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const eventsCacheKey = `events_list_${institutionId}`;

    const { setCacheData } = useDashboardCache();

    const fetchEvents = useCallback(async () => {
        const res = await fetch(`${API_BASE_URL}/api/v1/institution/events-db-only/${institutionId}?_=${Date.now()}`, {
            headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error('Failed to fetch events');
        const data = await res.json();
        return data || [];
    }, [institutionId]);

    const { data: events = [] } = useDashboardData<Event[]>(eventsCacheKey, fetchEvents);

    const fetchTeams = useCallback(async (opts?: { silent?: boolean }) => {
        if (!selectedEventId) {
            setTeams([]);
            return;
        }
        if (!opts?.silent) setLoading(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/institution/events/${selectedEventId}/teams?_=${Date.now()}`,
                { headers: { ...authHeaders() }, cache: 'no-store' },
            );
            if (res.ok) {
                const data = await res.json();
                setTeams(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        } finally {
            if (!opts?.silent) setLoading(false);
        }
    }, [selectedEventId]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const freshEvents = await fetchEvents();
            setCacheData(eventsCacheKey, freshEvents);
            await fetchTeams({ silent: true });
        } catch (err) {
            console.error('Failed to refresh teams data:', err);
        } finally {
            setRefreshing(false);
        }
    }, [fetchEvents, fetchTeams, setCacheData, eventsCacheKey]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const handleUpdateStatus = async (teamId: string, status: string) => {
        if (!selectedEventId) return;
        
        // Optimistic UI update
        const previousTeams = [...teams];
        setTeams(prevTeams => prevTeams.map(t => t._id === teamId ? { ...t, status } : t));
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${selectedEventId}/teams/${teamId}/status`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json', 
                    ...authHeaders() 
                },
                body: JSON.stringify({ status })
            });
            if (!res.ok) {
                setTeams(previousTeams);
                const err = await res.json().catch(() => ({}));
                alert(`Failed to update status: ${err.detail || 'Unknown error'}`);
            }
        } catch (err) {
            setTeams(previousTeams);
            alert('Network error while updating status.');
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!window.confirm('Are you sure you want to delete this team?')) return;
        setDeleting(teamId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
                method: 'DELETE',
                headers: { ...authHeaders() }
            });
            if (res.ok) {
                setTeams(prev => prev.filter(t => t._id !== teamId));
            } else {
                alert('Failed to delete team');
            }
        } catch (err) {
            alert('Network error while deleting team');
        } finally {
            setDeleting(null);
        }
    };

    const handleNotifyTeam = async (teamId: string) => {
        if (!selectedEventId) return;
        const msg = window.prompt("Enter message to send to the team members:", "An update regarding your team status has been posted.");
        if (msg === null) return; // user cancelled

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${selectedEventId}/teams/${teamId}/notify`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...authHeaders() 
                },
                body: JSON.stringify({ message: msg })
            });
            if (res.ok) {
                alert('Notification emails sent to all team members successfully.');
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Failed to send notifications: ${err.detail || 'Unknown error'}`);
            }
        } catch (err) {
            alert('Network error while notifying team.');
        }
    };

    const filteredTeams = teams.filter(t => {
        const matchesSearch = t.team_name?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'All' || t.status === filterStatus.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Teams Management</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage event teams and approvals</p>
                </div>
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                    title="Refresh events and teams"
                    className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-[#6C3BFF] hover:border-[#6C3BFF] rounded-2xl transition-all shadow-sm disabled:opacity-60"
                >
                    <RefreshCw size={20} className={refreshing || loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Event</label>
                    <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#6C3BFF]/20 focus:border-[#6C3BFF] transition-all outline-none font-bold text-slate-700 appearance-none"
                    >
                        <option value="">Choose an event</option>
                        {events.map(ev => (
                            <option key={ev._id} value={ev._id}>{ev.title || ev.name || 'Unnamed Event'}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search & Filter</label>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search teams..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#6C3BFF]/20 focus:border-[#6C3BFF] transition-all outline-none font-bold text-slate-700"
                            />
                        </div>
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#6C3BFF]/20"
                        >
                            <option value="All">All</option>
                            <option value="Approved">Approved</option>
                            <option value="Waitlisted">Waitlisted</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {!selectedEventId ? (
                <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6">
                        <Users size={40} />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">No Event Selected</h2>
                    <p className="text-slate-500 font-medium">Please select an event from the dropdown to manage its teams.</p>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center p-20">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-[#6C3BFF] rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Teams...</p>
                </div>
            ) : filteredTeams.length === 0 ? (
                <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6">
                        <Search size={40} />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">No Teams Found</h2>
                    <p className="text-slate-500 font-medium">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Name</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Leader</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Members</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredTeams.map(team => {
                                    const leader = team.members?.find(m => m.is_leader || String(m.user_id) === String(team.team_leader_id));
                                    return (
                                        <tr key={team._id} className="group hover:bg-slate-50/30 transition-colors">
                                            <td className="px-8 py-5">
                                                <button 
                                                    onClick={() => setSelectedTeam(team)}
                                                    className="text-sm font-black text-slate-900 hover:text-[#6C3BFF] transition-colors"
                                                >
                                                    {team.team_name || 'Unnamed Team'}
                                                </button>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="text-sm font-bold text-slate-700">{leader?.name || 'N/A'}</div>
                                                <div className="text-[10px] text-slate-400 font-bold tracking-tight">{leader?.email || ''}</div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                                                    {team.members?.length || 0}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                    team.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    team.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    team.status === 'waitlisted' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                    'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}>
                                                    {team.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleUpdateStatus(team._id, 'approved')}
                                                        className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                                                        disabled={team.status === 'approved'}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(team._id, 'rejected')}
                                                        className="px-4 py-2 bg-red-50 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                                                        disabled={team.status === 'rejected'}
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleNotifyTeam(team._id)}
                                                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                                        title="Notify Team"
                                                    >
                                                        <Users size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTeam(team._id)}
                                                        disabled={deleting === team._id}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedTeam && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-in fade-in duration-300" onClick={() => setSelectedTeam(null)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 border-b bg-slate-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedTeam.team_name || 'Unnamed Team'}</h2>
                                        <span className={`px-3 py-1 inline-flex text-[10px] font-black uppercase tracking-widest rounded-full border ${
                                            selectedTeam.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            selectedTeam.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                            'bg-slate-50 text-slate-600 border-slate-100'
                                        }`}>
                                            {selectedTeam.status || 'Pending'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5"><Users size={14} /> {selectedTeam.members?.length || 0} Members</span>
                                        <span>•</span>
                                        <span>Team ID: {selectedTeam._id}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedTeam(null)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all shadow-sm"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Team Roster</h3>
                                    <div className="bg-slate-50 rounded-[1.5rem] border border-slate-100 overflow-hidden">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-100/50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Member</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                                                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Registration</th>
                                                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Submission</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {selectedTeam.members?.map((member, index) => (
                                                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-900 text-sm">{member.name || 'N/A'}</div>
                                                            <div className="text-xs text-slate-400 font-medium">{member.email || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {member.is_leader ? (
                                                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                                                    Leader
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] font-bold text-slate-400">Member</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                                member.registration_status === 'shortlisted' ? 'bg-emerald-50 text-emerald-600' :
                                                                member.registration_status === 'rejected' ? 'bg-red-50 text-red-600' :
                                                                'bg-slate-50 text-slate-500'
                                                            }`}>
                                                                {member.registration_status || 'Registered'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                                member.submission_status === 'submitted' ? 'bg-indigo-50 text-indigo-600' :
                                                                'bg-slate-50 text-slate-500'
                                                            }`}>
                                                                {member.submission_status === 'submitted' ? 'Submitted' : 'Pending'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-8 border-t bg-slate-50/50 flex justify-end gap-3">
                            <button 
                                onClick={() => setSelectedTeam(null)}
                                className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                            >
                                Close
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        handleUpdateStatus(selectedTeam._id, 'approved');
                                        setSelectedTeam(null);
                                    }}
                                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
                                >
                                    Approve Team
                                </button>
                                <button
                                    onClick={() => {
                                        handleUpdateStatus(selectedTeam._id, 'rejected');
                                        setSelectedTeam(null);
                                    }}
                                    className="px-6 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
                                >
                                    Reject Team
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamsManagement;
