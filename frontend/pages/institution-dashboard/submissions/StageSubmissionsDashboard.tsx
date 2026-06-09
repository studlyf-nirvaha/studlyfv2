import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Loader2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE_URL, authHeaders } from '../../../apiConfig';

interface StageSubmissionsDashboardProps {
    eventId: string;
    stageId: string;
}

const StageSubmissionsDashboard: React.FC<StageSubmissionsDashboardProps> = ({ eventId, stageId }) => {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [notifying, setNotifying] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const fetchSubmissions = useCallback(async () => {
        try {
            setLoading(true);
            // In a production scenario, ensure the backend endpoint supports pagination
            const response = await fetch(
                `${API_BASE_URL}/api/submissions/admin/events/${eventId}/stage/${stageId}/submissions`,
                { headers: { ...authHeaders() } }
            );
            
            if (!response.ok) throw new Error('Failed to fetch stage submissions');
            
            const data = await response.json();
            setSubmissions(data.submissions || []);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [eventId, stageId]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    // Optimized filtering and pagination using useMemo
    const filteredAndPaginated = useMemo(() => {
        const filtered = submissions.filter(s => 
            s.participant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.participant_email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        return {
            total: filtered.length,
            items: filtered.slice(startIndex, startIndex + itemsPerPage)
        };
    }, [submissions, searchTerm, currentPage]);

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAndPaginated.items.length && filteredAndPaginated.items.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAndPaginated.items.map(s => s._id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleNotify = async (dryRun: boolean = false) => {
        setNotifying(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/submissions/admin/notify-shortlisted`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ submission_ids: Array.from(selectedIds), dry_run: dryRun })
            });
            const resData = await response.json();
            alert(JSON.stringify(resData.results, null, 2));
            if (!dryRun) setSelectedIds(new Set());
        } catch (err) {
            alert('Notification failed');
        } finally {
            setNotifying(false);
        }
    };

    if (loading) return <div className=\"p-20 text-center\"><Loader2 className=\"animate-spin mx-auto text-[#6C3BFF]\" size={32} /></div>;
    if (error) return <div className=\"p-20 text-center text-rose-500 font-bold\">Error: {error}</div>;

    const totalPages = Math.ceil(filteredAndPaginated.total / itemsPerPage);

    return (
        <div className=\"space-y-6 animate-in fade-in duration-500\">
            <div className=\"flex justify-between items-center\">
                <h2 className=\"text-2xl font-black text-slate-900\">Stage Submissions ({filteredAndPaginated.total})</h2>
                <div className=\"flex items-center gap-4\">
                    {selectedIds.size > 0 && (
                        <>
                            <button 
                                onClick={() => handleNotify(true)}
                                disabled={notifying}
                                className=\"px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors\"
                            >
                                Dry Run
                            </button>
                            <button 
                                onClick={() => handleNotify(false)}
                                disabled={notifying}
                                className=\"px-4 py-2 bg-[#6C3BFF] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#5a32d9] transition-colors\"
                            >
                                {notifying ? <Loader2 className=\"animate-spin\" size={16} /> : <CheckCircle size={16} />}
                                Notify Shortlisted ({selectedIds.size})
                            </button>
                        </>
                    )}
                    <div className=\"relative w-64\">
                        <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400\" size={16} />
                        <input 
                            type=\"text\" 
                            placeholder=\"Search participants...\"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className=\"w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6C3BFF] outline-none\"
                        />
                    </div>
                </div>
            </div>

            <div className=\"bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm\">
                <table className=\"w-full text-left text-sm\">
                    <thead className=\"bg-slate-50 border-b border-slate-200\">
                        <tr>
                            <th className=\"px-6 py-4\">
                                <input 
                                    type=\"checkbox\" 
                                    checked={selectedIds.size === filteredAndPaginated.items.length && filteredAndPaginated.items.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className=\"px-6 py-4 font-bold text-slate-600\">Team / Participant</th>
                            <th className=\"px-6 py-4 font-bold text-slate-600\">Submitted</th>
                            <th className=\"px-6 py-4 font-bold text-slate-600\">Score</th>
                            <th className=\"px-6 py-4 font-bold text-slate-600\">Submission fields</th>
                        </tr>
                    </thead>
                    <tbody className=\"divide-y divide-slate-100\">
                        {filteredAndPaginated.items.map((sub: any) => (
                            <tr key={sub._id} className=\"hover:bg-slate-50\">
                                <td className=\"px-6 py-4\">
                                    <input 
                                        type=\"checkbox\" 
                                        checked={selectedIds.has(sub._id)}
                                        onChange={() => toggleSelect(sub._id)}
                                    />
                                </td>
                                <td className=\"px-6 py-4\">
                                    <div className=\"font-bold\">{sub.team_name || sub.participant_name}</div>
                                    <div className=\"text-xs text-slate-400\">{sub.participant_email}</div>
                                </td>
                                <td className=\"px-6 py-4 text-xs text-slate-500\">
                                    {new Date(sub.submitted_at).toLocaleString()}
                                </td>
                                <td className=\"px-6 py-4 font-bold text-purple-700\">
                                    {sub.evaluation_score || '-'}
                                </td>
                                <td className=\"px-6 py-4\">
                                    <div className=\"text-xs text-slate-600 max-w-md space-y-1\">
                                        {(sub.labeled_data || []).length > 0
                                            ? sub.labeled_data.map((row: any) => (
                                                <div key={row.field_id}>
                                                    <span className=\"font-bold text-slate-700\">{row.label}: </span>
                                                    <span>{String(row.value ?? '—')}</span>
                                                </div>
                                            ))
                                            : Object.entries(sub.data || {}).map(([k, v]) => (
                                                <div key={k}>
                                                    <span className=\"font-bold text-slate-700\">{k}: </span>
                                                    <span className=\"truncate\">{typeof v === 'string' && v.startsWith('data:') ? '[File]' : String(v)}</span>
                                                </div>
                                            ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {/* Pagination Controls */}
                <div className=\"flex justify-between items-center px-6 py-4 bg-slate-50 border-t border-slate-200\">
                    <span className=\"text-xs text-slate-500\">Page {currentPage} of {totalPages}</span>
                    <div className=\"flex gap-2\">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className=\"p-2 rounded bg-white border border-slate-200 disabled:opacity-50\"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className=\"p-2 rounded bg-white border border-slate-200 disabled:opacity-50\"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StageSubmissionsDashboard;

