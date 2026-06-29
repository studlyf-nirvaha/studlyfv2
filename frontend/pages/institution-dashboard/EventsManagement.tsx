import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { 
    Search, 
    Filter, 
    Plus, 
    MoreVertical, 
    Edit2, 
    Trash2, 
    Calendar, 
    Users, 
    ChevronRight,
    Trophy,
    ArrowUpRight,
    ChevronDown,
    X,
    Globe,
    Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Event {
    id: string;
    name: string;
    status: string;
    type: string;
    startDate: string;
    participants: number;
    image: string;
    visibility: 'Public' | 'Private';
    registrationStatus: 'Open' | 'Close';
}

interface EventsManagementProps {
    institutionId?: string;
    onViewEvent: (id: string, status?: string, tab?: string) => void;
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
                className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all flex items-center gap-3 ${
                    value ? 'border-blue-500 bg-blue-50/30 text-blue-600' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
            >
                {label} {value && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />} <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                            <span className="text-xs font-bold text-slate-900">{label}</span>
                            <button onClick={() => { onClear(); setIsOpen(false); }} className="text-xs font-bold text-orange-500 hover:text-orange-600">Clear</button>
                        </div>
                        <div className="p-2">
                            {options.map((opt: string) => (
                                <button 
                                    key={opt}
                                    onClick={() => { onChange(opt); setIsOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-all group"
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${value === opt ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                                        {value === opt && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                    <span className={`text-sm font-medium ${value === opt ? 'text-blue-600' : 'text-slate-600'}`}>{opt}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const EventsManagement: React.FC<EventsManagementProps> = ({ institutionId, onViewEvent, onCreateEvent }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState('');
    const [registrationFilter, setRegistrationFilter] = useState('');
    const [typeTab, setTypeTab] = useState('All');

    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);

    const handleDeleteClick = (id: string) => {
        setEventToDelete(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        if (!eventToDelete) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventToDelete}`, {
                method: 'DELETE',
                headers: { ...authHeaders() },
            });
            if (response.ok) {
                setEvents(prev => prev.filter(e => e.id !== eventToDelete));
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
            } else {
                alert("Failed to delete listing.");
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
            if (!institutionId) {
                setEvents([]);
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/institution/events/${institutionId}`, { headers: { ...authHeaders() } });
                if (!response.ok) throw new Error("Fetch failed");
                const data = await response.json();

                const filteredData = data.filter((e: any) => 
                    e.category === 'Job' || e.category === 'Internship'
                );

                setEvents(filteredData.map((e: any) => {
                    const fd = e.festivalData || {};
                    const form = e.formData || {};
                    const stages = e.stages || [];
                    const firstStage = stages[0] || {};

                    let startRaw = e.start_date || e.startDate || e.eventStartDate || e.registrationStartDate || fd.startDate || form.startDate || firstStage.start_date || firstStage.startDate;

                    // If stages exist, try to find absolute min start
                    if (stages.length > 0) {
                        const allStarts = stages.map((s: any) => s.start_date || s.startDate).filter(Boolean).map((d: any) => new Date(d).getTime());
                        if (allStarts.length > 0) {
                            const minStart = new Date(Math.min(...allStarts));
                            if (!startRaw || minStart < new Date(startRaw)) startRaw = minStart.toISOString();
                        }
                    }

                    const formatTableDate = (d: any) => {
                        if (!d) return 'N/A';
                        const dateObj = new Date(d);
                        if (isNaN(dateObj.getTime())) return 'N/A';
                        
                        const datePart = dateObj.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
                        const timePart = dateObj.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                        return `${datePart}\n${timePart} IST`;
                    };

                    return {
                        id: e._id,
                        name: e.title,
                        status: e.status || 'Unknown',
                        type: e.category || 'Unknown',
                        startDate: formatTableDate(startRaw),
                        participants: e.participant_count ?? 0,
                        image: e.image_url || '',
                        visibility: e.visibility || 'Unknown',
                        registrationStatus: e.registration_status || 'Unknown'
                    };
                }));
            } catch (err) {
                try { console.error("Dynamic events fetch error:", err instanceof Error ? err.message : String(err)); } catch (_) {}
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || event.status === statusFilter;
        const matchesVisibility = !visibilityFilter || event.visibility === visibilityFilter;
        const matchesRegistration = !registrationFilter || event.registrationStatus === registrationFilter;
        const matchesTab = typeTab === 'All' || event.type === typeTab.slice(0, -1);
        return matchesSearch && matchesStatus && matchesVisibility && matchesRegistration && matchesTab;
    });

    return (
        <>
            <div className="space-y-6 animate-in fade-in duration-700 font-sans">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-black text-slate-900">My Jobs & Internships</h1>
                </div>

                <div className="flex flex-wrap gap-3">
                    {['All', 'Jobs', 'Internships'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => { setTypeTab(tab); setSearchQuery(''); }}
                            className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
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
                            placeholder="Search Job/Internship"
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-full focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm font-medium"
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
                            options={['Live', 'Draft', 'Completed', 'Cancelled', 'Upcoming']} 
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
                                        <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Deadline / Start Date</th>
                                        <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Applications</th>
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
                                                    <div className="flex items-center gap-3 pt-1">
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded uppercase tracking-wider">{event.type}</span>
                                                        {event.visibility && (event.visibility as string) !== 'Unknown' && (
                                                            <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                                <Globe size={10} /> {event.visibility}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-8 text-center">
                                                <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                    event.status === 'Live' || event.status === 'Active' ? 'bg-green-100 text-green-600 border border-green-200' :
                                                    event.status === 'Draft' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                                    'bg-blue-100 text-blue-600 border border-blue-200'
                                                }`}>
                                                    {event.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-8 text-center">
                                                <div className="space-y-0.5">
                                                    {event.startDate.split('\n').map((line, i) => (
                                                        <p key={i} className={i === 0 ? "text-[13px] font-black text-slate-700" : "text-[10px] font-bold text-slate-400 uppercase tracking-tight"}>
                                                            {line}
                                                        </p>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-8 text-center text-sm font-black text-slate-700">{event.participants}</td>
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
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onViewEvent(event.id, event.status, 'package');
                                                        }}
                                                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-[#6C3BFF] hover:border-purple-200 transition-all shadow-sm"
                                                        title="Open Event Package"
                                                    >
                                                        <Lightbulb size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(event.id);
                                                        }}
                                                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="min-h-[500px] flex flex-col items-center justify-center text-center">
                        <div className="relative w-80 h-80 mb-8 opacity-80">
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent rounded-full blur-3xl" />
                            <img 
                                src="https://img.freepik.com/free-vector/no-data-concept-illustration_114360-536.jpg" 
                                alt="No results" 
                                className="w-full h-full object-contain relative z-10 mix-blend-multiply"
                            />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">No results found for the applied filter or search terms!</h2>
                        <p className="text-sm text-slate-400 font-medium max-w-sm">Try adjusting your search terms or filters and try again</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showConfirm && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowConfirm(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 text-center font-sans overflow-hidden border border-slate-100"
                        >
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Trash2 size={28} />
                            </div>
                            
                            <h3 className="text-xl font-black text-slate-900 mb-2">Are you sure?</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                                This action is permanent and cannot be undone. All data and applications for this listing will be deleted.
                            </p>
                            
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    className="flex-1 py-3.5 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all text-sm shadow-lg shadow-red-200"
                                >
                                    Delete Listing
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default EventsManagement;

