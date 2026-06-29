import React, { useState, useEffect } from 'react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { Users, UserPlus, Key, Copy, Check, Loader2, RefreshCw } from 'lucide-react';

interface TeamManagerProps {
    eventId: string;
}

const TeamManager: React.FC<TeamManagerProps> = ({ eventId }) => {
    const [teamData, setTeamData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [teamName, setTeamName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [showInviteForm, setShowInviteForm] = useState(false);

    const fetchTeam = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/me?event_id=${eventId}`, {
                headers: { ...authHeaders() },
            });
            if (res.ok) {
                const data = await res.json();
                setTeamData(data.team);
            }
        } catch (err) {
            setError('Failed to load team data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId) {
            fetchTeam();
        }
    }, [eventId]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName.trim()) {
            setError('Please enter a team name');
            return;
        }
        setActionLoading(true);
        setError('');
        setSuccess('');

        try {
            
            const url = `${API_BASE_URL}/api/teams/create-secure`;
            
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ event_id: eventId, team_name: teamName }),
            });
            
            
            const data = await res.json();
            
            if (res.ok) {
                setSuccess('Team created successfully!');
                setTeamName('');
                fetchTeam();
            } else {
                setError(data.detail || `Failed to create team (${res.status})`);
            }
        } catch (err) {
            setError('Network error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const handleJoinTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setActionLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/join-by-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ code: joinCode }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess('Joined team successfully!');
                fetchTeam();
            } else {
                setError(data.detail || 'Failed to join team');
            }
        } catch (err) {
            setError('Network error joining team');
        } finally {
            setActionLoading(false);
        }
    };

    const handleGenerateInvite = async () => {
        if (!teamData?._id) return;
        setActionLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/${teamData._id}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ ttl_hours: 72 }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess('Invite code generated!');
                fetchTeam();
            } else {
                setError(data.detail || 'Failed to generate code');
            }
        } catch (err) {
            setError('Error generating code');
        } finally {
            setActionLoading(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendInvite = async () => {
        if (!inviteEmail.trim() || !teamData?._id) return;
        setActionLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/teams/send-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    team_id: teamData._id,
                    invite_email: inviteEmail,
                    event_id: eventId
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess('Invite sent successfully!');
                setInviteEmail('');
                setShowInviteForm(false);
            } else {
                setError(data.detail || 'Failed to send invite');
            }
        } catch (err) {
            setError('Error sending invite');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 border border-slate-200 bg-white rounded-2xl flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            </div>
        );
    }

    if (teamData) {
        return (
            <div className="border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-purple-50/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-600" />
                            My Team: {teamData.team_name}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            {teamData.members?.length || 0} Members
                        </p>
                    </div>
                    <button onClick={fetchTeam} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors">
                        <RefreshCw size={16} />
                    </button>
                </div>
                
                <div className="p-5 space-y-5">
                    {/* Active Invites */}
                    {teamData.invites && teamData.invites.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Invite Codes</h4>
                            {teamData.invites.filter((inv: any) => !inv.revoked).map((inv: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <code className="text-sm font-black text-purple-700 tracking-wider bg-purple-100 px-3 py-1 rounded-lg">
                                        {inv.code}
                                    </code>
                                    <button
                                        onClick={() => copyCode(inv.code)}
                                        className="text-slate-400 hover:text-purple-600 transition-colors p-2"
                                    >
                                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleGenerateInvite}
                            disabled={actionLoading}
                            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                        >
                            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                            Generate Invite
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border border-slate-200 bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Team Formation
                </h3>
                <p className="text-xs text-slate-500 mt-1">You can participate as an individual, or form/join a team.</p>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">{error}</div>}
            {success && <div className="p-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Team */}
                <form onSubmit={handleCreateTeam} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Create a New Team</label>
                    <input
                        type="text"
                        placeholder="Enter team name"
                        value={teamName}
                        onChange={e => setTeamName(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={actionLoading || !teamName}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors flex justify-center disabled:opacity-50"
                    >
                        {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Create Team'}
                    </button>
                </form>

                {/* Join Team */}
                <form onSubmit={handleJoinTeam} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Join Existing Team</label>
                    <input
                        type="text"
                        placeholder="Paste invite code"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none font-mono"
                    />
                    <button
                        type="submit"
                        disabled={actionLoading || !joinCode}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors flex justify-center disabled:opacity-50"
                    >
                        {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Join Team'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TeamManager;

