import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { 
    Search, 
    Plus, 
    ChevronDown,
    Globe,
    Edit2,
    MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardCache } from '../../contexts/DashboardDataContext';

interface Event {
    id: string;
    name: string;
    status: string;
    type: string;
    startDate: string;
    endDate: string;
    participants: number;
    registrations: string;
    candidate: string;
    image: string;
    visibility: 'Public' | 'Private';
    registrationStatus: 'Open' | 'Close';
    lastSaved: string;
    organisation?: string;
    category?: string;
}

interface OpportunitiesManagementProps {
    institutionId?: string;
    onViewEvent: (id: string, status?: string) => void;
    onCreateEvent: () => void;
}

const FilterDropdown = ({ label, options, value, onChange, onClear }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`px-5 py-2 rounded-full border text-[13px] font-bold transition-all flex items-center gap-3 ${
                    value ? 'border-blue-500 bg-blue-50/30 text-blue-600' : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
                }`}
            >
                {label} <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                {value && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{label}</span>
                            <button onClick={() => { onClear(); setIsOpen(false); }} className="text-xs font-bold text-blue-600 hover:text-blue-700">Reset</button>
                        </div>
                        <div className="p-2 max-h-64 overflow-y-auto no-scrollbar">
                            {options.map((opt: string) => (
                                <button 
                                    key={opt}
                                    onClick={() => { onChange(opt); setIsOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-all group"
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${value === opt ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                                        {value === opt && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                    <span className={`text-sm font-bold ${value === opt ? 'text-blue-600' : 'text-slate-600'}`}>{opt}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const OpportunitiesManagement: React.FC<OpportunitiesManagementProps> = ({ institutionId, onViewEvent, onCreateEvent }) => {
    const { cache, setCacheData, isLoading, setLoading } = useDashboardCache();
    const events = cache['institutionOpportunities'] || [];
    const loading = isLoading['institutionOpportunities'] ?? true;
    const [searchQuery, setSearchQuery] = useState('');
    const [typeTab, setTypeTab] = useState('All');
    const [statusFilter, setStatusFilter] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState('');
    const [registrationFilter, setRegistrationFilter] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);

    const categories = ['All', ...new Set(events.map(e => e.category || e.type || '').filter(Boolean))];

    const handleDeleteClick = (id: string) => {
        setEventToDelete(id);
        setShowConfirm(true);
    };

    const syncPortalToParticipants = async () => {
        if (!institutionId) return;
        if (!window.confirm('Link older portal applications to participant records for this institution? Use this once if counts looked wrong before the latest fix.')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/tools/backfill-portal-participants/${institutionId}`, { method: 'POST', headers: { ...authHeaders() } });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                alert(`Sync complete. New participant rows: ${data.participants_inserted ?? 0}.`);
                window.location.reload();
            } else {
                alert('Sync failed. Check that the API is running.');
            }
        } catch {
            alert('Sync failed.');
        }
    };

    const confirmDelete = async () => {
        if (!eventToDelete) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventToDelete}`, {
                method: 'DELETE',
                headers: { ...authHeaders() },
            });
            if (response.ok) {
                setCacheData('institutionOpportunities', events.filter(e => e.id !== eventToDelete));
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
            }
        } catch (err) {
            try { console.error("Delete error:", err instanceof Error ? err.message : String(err)); } catch (_) {}
        } finally {
            setShowConfirm(false);
            setEventToDelete(null);
        }
    };

    useEffect(() => {
        const fetchEvents = async () => {
            if (!institutionId || cache['institutionOpportunities']) {
                if (loading) setLoading('institutionOpportunities', false);
                return;
            }
            try {
                setLoading('institutionOpportunities', true);
                console.log(`DEBUG: Fetching events for institution: ${institutionId}`);
                const response = await fetch(`${API_BASE_URL}/api/v1/institution/events/${institutionId}/summary?limit=100`, { headers: { ...authHeaders() } });
                
                if (!response.ok) {
                    throw new Error(`API Error - Status: ${response.status}`);
                }
                
                const body = await response.json();
                const data = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
                
                const filteredData = data.filter((e: any) => 
                    e.category !== 'Job' && e.category !== 'Internship'
                );

                const mappedEvents = filteredData.map((e: any) => {
                    const rawStatus = (e.status || 'Draft').toLowerCase();
                    let displayStatus = 'Draft';
                    if (rawStatus === 'live' || rawStatus === 'published' || rawStatus === 'active') displayStatus = 'Live';
                    else if (rawStatus === 'completed') displayStatus = 'Completed';
                    else if (rawStatus === 'upcoming') displayStatus = 'Upcoming';

                    // Dynamic relative time from created_at
                    const createdAt = e.created_at || e.createdAt;
                    let lastSaved = 'Unknown';
                    if (createdAt) {
                        const diff = Date.now() - new Date(createdAt).getTime();
                        const mins = Math.floor(diff / 60000);
                        const hrs = Math.floor(diff / 3600000);
                        const days = Math.floor(diff / 86400000);
                        if (days > 0) lastSaved = `${days} day${days > 1 ? 's' : ''} ago`;
                        else if (hrs > 0) lastSaved = `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
                        else if (mins > 0) lastSaved = `${mins} minute${mins > 1 ? 's' : ''} ago`;
                        else lastSaved = 'Just now';
                    }

                    const rawCat = (e.category || e.type || '') as string;
                    const typeLabel = /hackathon/i.test(rawCat) ? 'Hackathons' : rawCat;
                    const startRaw = e.start_date || e.startDate || e.festivalData?.startDate || e.registrationDeadline;
                    const endRaw = e.end_date || e.endDate || e.festivalData?.endDate;

                    return {
                        id: e._id,
                        name: e.title,
                        organisation: e.organisation || e.organization || e.organisation_name || '',
                        status: displayStatus,
                        type: typeLabel,
                        startDate: startRaw ? new Date(startRaw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'N/A',
                        endDate: endRaw ? new Date(endRaw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'N/A',
                        participants: e.participant_count || 0,
                        registrations: e.participant_count || 0,
                        candidate: (e.participant_count || 0) > 0 ? `${e.participant_count} registered` : '—',
                        image: e.image_url || '',
                        visibility: e.visibility || 'Unknown',
                        registrationStatus: e.registration_status || 'Unknown',
                        lastSaved,
                        category: rawCat
                    };
                });
                
                setCacheData('institutionOpportunities', mappedEvents);
            } catch (err) {
                try { console.error("Dynamic opportunities fetch error:", err instanceof Error ? err.message : String(err)); } catch (_) {}
            } finally {
                setLoading('institutionOpportunities', false);
            }
        };
        fetchEvents();
    }, [institutionId, cache, loading, setCacheData, setLoading]);

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || event.status === statusFilter;
        const matchesVisibility = !visibilityFilter || event.visibility === visibilityFilter;
        const matchesRegistration = !registrationFilter || event.registrationStatus === registrationFilter;
        
        let matchesTab = true;
        if (typeTab !== 'All') {
            matchesTab = event.type.toLowerCase().includes(typeTab.toLowerCase().replace('s', ''));
        }

        return matchesSearch && matchesStatus && matchesVisibility && matchesRegistration && matchesTab;
    });

    return (
        <>
            <div className="space-y-6 animate-in fade-in duration-700 font-sans">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-black text-slate-900">Opportunities</h1>
                </div>

                <div className="flex flex-wrap gap-2">
                    {categories.map(tab => (
                        <button 
                            key={tab}
                            onClick={() => { setTypeTab(tab); setSearchQuery(''); }}
                            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                                typeTab === tab ? 'bg-[#0A2E5C] text-white shadow-lg shadow-blue-900/20' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search all"
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm font-medium shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <FilterDropdown 
                            label="Visibility" 
                            options={['Public', 'Private']} 
                            value={visibilityFilter} 
                            onChange={setVisibilityFilter} 
                            onClear={() => setVisibilityFilter('')}
                        />
                        <FilterDropdown 
                            label="Registration" 
                            options={['Open', 'Close']} 
                            value={registrationFilter} 
                            onChange={setRegistrationFilter} 
                            onClear={() => setRegistrationFilter('')}
                        />
                        <FilterDropdown 
                            label="Status" 
                            options={['Live', 'Draft', 'Completed', 'Upcoming']} 
                            value={statusFilter} 
                            onChange={setStatusFilter} 
                            onClear={() => setStatusFilter('')}
                        />
                    </div>
                </div>

                <AnimatePresence>
                    {showToast && (
                        <motion.div 
                            initial={{ opacity: 0, x: 20, y: -20 }}
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="fixed top-8 right-8 z-[1000] flex items-center bg-white border border-green-100 rounded-lg shadow-2xl shadow-green-900/10 overflow-hidden font-sans"
                        >
                            <div className="bg-green-500 p-4 text-white">
                                <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                                    <div className="w-2 h-4 border-r-2 border-b-2 border-white rotate-45 mb-1 ml-0.5" />
                                </div>
                            </div>
                            <div className="px-6 py-4 pr-12 relative">
                                <p className="text-[15px] font-bold text-green-600">Listing Deleted Successfully</p>
                                <button onClick={() => setShowToast(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-300 hover:text-green-500 transition-all">
                                    <Plus size={18} className="rotate-45" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {loading ? (
                    <div className="py-16 flex flex-col items-center justify-center space-y-3">
                        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Opportunities...</p>
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#F4F9FF] border-b border-slate-100">
                                        <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-16">S.No.</th>
                                        <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Name</th>
                                        <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Start Date</th>
                                        <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">End Date</th>
                                        <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Candidate</th>
                                        <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Registrations</th>
                                        <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredEvents.map((event, idx) => (
                                        <tr 
                                            key={event.id} 
                                            onClick={() => onViewEvent(event.id, event.status)}
                                            className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                                        >
                                            <td className="px-6 py-8 text-sm font-bold text-slate-400 text-center">{idx + 1}</td>
                                            <td className="px-6 py-8">
                                                <div className="space-y-1">
                                                    <h4 className="text-[15px] font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-all">{event.name}</h4>
                                                    {event.organisation && <p className="text-[11px] font-bold text-slate-400">{event.organisation}</p>}
                                                    <div className="flex items-center gap-3 pt-1">
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded uppercase tracking-wider">{event.type}</span>
                                                        {event.visibility && event.visibility !== 'Unknown' && (
                                                            <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                                <Globe size={10} /> {event.visibility}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-300 font-bold pt-1">Last Saved {event.lastSaved}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-8 text-center">
                                                <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                    event.status === 'Live' ? 'bg-green-100 text-green-600 border border-green-200' :
                                                    event.status === 'Draft' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                                    'bg-blue-100 text-blue-600 border border-blue-200'
                                                }`}>
                                                    {event.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-8 text-center">
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-black text-slate-700">{event.startDate}</p>
                                                    <p className="text-[9px] font-bold text-slate-400">12:00 AM IST</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-8 text-center">
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-black text-slate-700">{event.endDate}</p>
                                                    <p className="text-[9px] font-bold text-slate-400">12:00 AM IST</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-8 text-center text-sm font-bold text-slate-400">{event.candidate}</td>
                                            <td className="px-6 py-8 text-center text-sm font-black text-slate-700">{event.registrations}</td>
                                            <td className="px-6 py-8">
                                                <div className="flex items-center justify-center gap-2 relative">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onViewEvent(event.id, event.status);
                                                        }}
                                                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <div className="relative group/menu">
                                                        <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-900 transition-all shadow-sm">
                                                            <MoreVertical size={14} />
                                                        </button>
                                                        <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-2xl border border-slate-100 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-[50] py-2">
                                                            <button 
                                                                onClick={() => handleDeleteClick(event.id)}
                                                                className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 transition-all flex items-center gap-2"
                                                            >
                                                                <div className="w-4 h-4 rounded bg-red-50 flex items-center justify-center text-red-500">
                                                                    <span className="text-[10px]">🗑</span>
                                                                </div>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="min-h-[600px] flex flex-col items-center justify-center text-center">
                        <div className="relative w-[500px] h-64 mb-12">
                            <img 
                                src="https://img.freepik.com/free-vector/no-data-concept-illustration_114360-536.jpg" 
                                alt="No results" 
                                className="w-full h-full object-contain mix-blend-multiply opacity-40"
                            />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black text-slate-800">No results found!</h2>
                            <p className="text-sm text-slate-400 font-bold tracking-tight">Try adjusting your search terms or filters.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 text-center space-y-4">
                                <p className="text-[17px] font-bold text-slate-700">unstop.com says</p>
                                <p className="text-sm font-medium text-slate-500">Are you sure ?</p>
                                <div className="flex items-center justify-center gap-3 pt-4">
                                    <button 
                                        onClick={confirmDelete}
                                        className="px-8 py-2.5 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                                    >
                                        OK
                                    </button>
                                    <button 
                                        onClick={() => setShowConfirm(false)}
                                        className="px-8 py-2.5 bg-slate-100 text-slate-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default OpportunitiesManagement;

