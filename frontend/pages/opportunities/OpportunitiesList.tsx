import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Briefcase, Calendar, MapPin, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, X, Globe, Users, DollarSign, Star, Sparkles, Building2, ArrowRight, Clock, TrendingUp, Target, ShieldCheck, Zap, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { useAuth } from '../../AuthContext';
import { plainTextFromRichContent, formatOpportunityLocation } from '../../utils/text';

const clientSideEligible = (opp: any, user: any) => {
    if (!opp) return true;
    const candidateTypes = opp.candidateTypes || opp.candidate_types || [];
    if (!candidateTypes || candidateTypes.length === 0) return true;
    const allowed = (Array.isArray(candidateTypes) ? candidateTypes : [candidateTypes]).map((x: any) => String(x).toLowerCase());
    if (allowed.some((a: string) => a.includes('everyone'))) return true;
    const profileType = (user?.profile_type || user?.profileType || user?.userType || '').toString().toLowerCase();
    const userCollege = (user?.college || user?.institution || user?.college_name || '').toString().toLowerCase();

    // simple heuristics
    if (profileType && allowed.some((a: string) => a.includes(profileType))) return true;
    if (allowed.some((a: string) => a.includes('student')) && (userCollege || profileType === 'student')) return true;
    return false;
}

const typeOptions = ['All', 'Hackathon', 'Competition', 'Challenge', 'Conference', 'Workshop', 'Internship', 'Job'];

const normalizeText = (value: unknown) => String(value ?? '').toLowerCase();

const matchesOpportunityType = (opportunityType: unknown, selectedType: string) => {
    if (selectedType === 'All') return true;

    const type = normalizeText(opportunityType);
    const keywordMap: Record<string, string[]> = {
        hackathon: ['hackathon', 'coding challenge'],
        competition: ['competition', 'case competition'],
        challenge: ['challenge', 'ideathon'],
        conference: ['conference', 'summit', 'expo', 'forum'],
        workshop: ['workshop', 'bootcamp', 'masterclass'],
        internship: ['internship', 'trainee', 'apprenticeship', 'placement'],
        job: ['job', 'role', 'career', 'hiring']
    };

    const selected = selectedType.toLowerCase();
    const keywords = keywordMap[selected] || [selected];
    return keywords.some((keyword) => type.includes(keyword));
};

const matchesLocation = (location: unknown, selectedLocation: string) => {
    if (selectedLocation === 'All') return true;
    const text = normalizeText(location);
    if (!text) return false;
    if (selectedLocation === 'Remote' || selectedLocation === 'Online') return text.includes('remote') || text.includes('online') || text.includes('virtual');
    if (selectedLocation === 'On-site' || selectedLocation === 'Offline') return text.includes('on-site') || text.includes('onsite') || text.includes('in-person') || text.includes('offline');
    if (selectedLocation === 'Hybrid') return text.includes('hybrid');
    return true;
};

const safeDateValue = (value: unknown) => {
    const date = new Date(String(value ?? ''));
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const FILTER_STORAGE_KEY = 'studlyf:opportunities:filters';

const getStoredFilters = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const OpportunitiesList: React.FC = () => {
    const storedFilters = getStoredFilters();
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(() => typeof storedFilters?.searchQuery === 'string' ? storedFilters.searchQuery : '');
    const [selectedType, setSelectedType] = useState(() => typeof storedFilters?.selectedType === 'string' ? storedFilters.selectedType : 'All');
    const [selectedLocation, setSelectedLocation] = useState(() => typeof storedFilters?.selectedLocation === 'string' ? storedFilters.selectedLocation : 'All');
    const [selectedStatus, setSelectedStatus] = useState(() => typeof storedFilters?.selectedStatus === 'string' ? storedFilters.selectedStatus : 'All');
    const [selectedParticipation, setSelectedParticipation] = useState(() => typeof storedFilters?.selectedParticipation === 'string' ? storedFilters.selectedParticipation : 'All');
    const [selectedTeamSize, setSelectedTeamSize] = useState(() => typeof storedFilters?.selectedTeamSize === 'string' ? storedFilters.selectedTeamSize : 'All');
    const [selectedPayment, setSelectedPayment] = useState(() => typeof storedFilters?.selectedPayment === 'string' ? storedFilters.selectedPayment : 'All');
    const [selectedSkills, setSelectedSkills] = useState<string[]>(() => Array.isArray(storedFilters?.selectedSkills) ? storedFilters.selectedSkills.filter((item: unknown): item is string => typeof item === 'string') : []);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        location: false, category: false, status: false, teamSize: false, participation: false, skills: false,
    });
    const [appliedIds, setAppliedIds] = useState<string[]>([]);
    const [eligibilityMap, setEligibilityMap] = useState<Record<string, { eligible: boolean; reason?: string }>>({});
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ineligibleModal, setIneligibleModal] = useState<{ visible: boolean; reason?: string; eventId?: string; opp?: any }>({ visible: false });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
                searchQuery,
                selectedType,
                selectedLocation,
                selectedStatus,
                selectedParticipation,
                selectedTeamSize,
                selectedPayment,
                selectedSkills,
            }));
        } catch {
            // Ignore storage failures and keep the page functional.
        }
    }, [searchQuery, selectedType, selectedLocation, selectedStatus, selectedParticipation, selectedTeamSize, selectedPayment, selectedSkills]);

    const checkEligibilityThenNavigate = (opp: any) => {
        navigate(`/opportunities/${opp._id}`);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const oppRes = await fetch(`${API_BASE_URL}/api/opportunities`);
                const opps = oppRes.ok ? await oppRes.json() : [];

                setOpportunities(Array.isArray(opps) ? opps : []);

                if (user?.user_id) {
                    fetch(`${API_BASE_URL}/api/opportunities/user/${user.user_id}/applications`, {
                        headers: { ...authHeaders() }
                    })
                        .then((res) => (res.ok ? res.json() : []))
                        .then((apps) => {
                            setAppliedIds(Array.isArray(apps) ? apps.map((a: any) => a.opportunity_id) : []);
                        })
                        .catch(() => setAppliedIds([]));
                } else {
                    setAppliedIds([]);
                }
            } catch (err) {
                try { console.error("Fetch error:", err instanceof Error ? err.message : String(err)); } catch (_) { }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const filteredOpportunities = useMemo(() => {
        const query = normalizeText(searchQuery).trim();

        const filtered = opportunities.filter((opp) => {
            const title = normalizeText(opp.title);
            const organization = normalizeText(opp.organization);
            const description = normalizeText(plainTextFromRichContent(opp.description));
            const locationLabel = normalizeText(formatOpportunityLocation(opp.location));
            const matchesSearch = !query || title.includes(query) || organization.includes(query) || description.includes(query) || locationLabel.includes(query);
            const matchesType = matchesOpportunityType(opp.type, selectedType);
            const matchesSelectedLocation = matchesLocation(opp.location, selectedLocation);
            const matchesStatus = selectedStatus === 'All' || normalizeText(opp.status ?? '').includes(normalizeText(selectedStatus));
            const matchesParticipation = selectedParticipation === 'All' || normalizeText(opp.participation_type ?? '').includes(normalizeText(selectedParticipation));
            const matchesTeamSize = selectedTeamSize === 'All' || (() => { try { const max = Number(opp.max_team_size); return selectedTeamSize === 'Solo' ? max <= 1 : selectedTeamSize === 'Small (2-5)' ? max >= 2 && max <= 5 : selectedTeamSize === 'Medium (6-10)' ? max >= 6 && max <= 10 : selectedTeamSize === 'Large (10+)' ? max > 10 : true; } catch { return true; } })();
            const matchesPayment = selectedPayment === 'All' || normalizeText(opp.prize_type ?? opp.compensation_type ?? '').includes(normalizeText(selectedPayment));
            const matchesSkills = selectedSkills.length === 0 || (opp.skills && opp.skills.some((s: string) => selectedSkills.some(sk => normalizeText(s).includes(normalizeText(sk)))));

            return matchesSearch && matchesType && matchesSelectedLocation && matchesStatus && matchesParticipation && matchesTeamSize && matchesPayment && matchesSkills;
        });

        const sorted = [...filtered].sort((a, b) => {
            const dateA = safeDateValue(a.deadline).getTime();
            const dateB = safeDateValue(b.deadline).getTime();
            return dateB - dateA;
        });

        return sorted;
    }, [appliedIds, opportunities, searchQuery, selectedLocation, selectedType, selectedStatus, selectedParticipation, selectedTeamSize, selectedPayment, selectedSkills]);

    const getTypeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'hackathon': return 'text-purple-600 bg-purple-50 border-purple-100';
            case 'internship': return 'text-blue-600 bg-blue-50 border-blue-100';
            case 'job': return 'text-green-600 bg-green-50 border-green-100';
            case 'competition': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'conference': return 'text-cyan-600 bg-cyan-50 border-cyan-100';
            case 'workshop': return 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };

    const resetFilters = () => {
        setSelectedType('All');
        setSelectedLocation('All');
        setSelectedStatus('All');
        setSelectedParticipation('All');
        setSelectedTeamSize('All');
        setSelectedPayment('All');
        setSelectedSkills([]);
        setSearchQuery('');
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.removeItem(FILTER_STORAGE_KEY);
            } catch {
                // Ignore storage failures.
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
            {/* Ineligible Modal */}
            <AnimatePresence>
                {ineligibleModal.visible && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIneligibleModal({ visible: false })}>
                        <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6" initial={{ scale: 0.98, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 8 }} onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-black text-slate-900">Not eligible to apply</h3>
                            <p className="text-sm text-slate-600 mt-2">{ineligibleModal.reason || 'You do not meet the eligibility criteria for this event.'}</p>

                            <div className="mt-6 flex gap-3 justify-end">
                                <button type="button" onClick={() => { setIneligibleModal({ visible: false }); navigate(`/opportunities/${ineligibleModal.opp?._id}`); }} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold hover:bg-slate-50">View details</button>
                                {user ? (
                                    <button type="button" onClick={() => { setIneligibleModal({ visible: false }); navigate('/my-profile'); }} className="px-4 py-2 rounded-xl bg-[#6C3BFF] text-white text-sm font-black">Update profile</button>
                                ) : (
                                    <button type="button" onClick={() => { setIneligibleModal({ visible: false }); navigate(`/login?next=/profile`); }} className="px-4 py-2 rounded-xl bg-[#6C3BFF] text-white text-sm font-black">Login to update</button>
                                )}
                                {(ineligibleModal.opp && (ineligibleModal.opp.contact_email || ineligibleModal.opp.contactEmail)) ? (
                                    <a href={`mailto:${ineligibleModal.opp.contact_email || ineligibleModal.opp.contactEmail}`} className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-sm font-bold">Contact host</a>
                                ) : null}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Header Section */}
            <div className="relative pt-40 pb-36 px-6 overflow-hidden bg-white isolate">
                {/* Image Background */}
                <div
                    className="absolute inset-0 z-[-1] opacity-10 mix-blend-multiply transition-opacity duration-1000"
                    style={{ backgroundImage: 'url("/images/hero_bg_light.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-300/30 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-300/30 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <button
                        onClick={() => navigate('/dashboard/learner')}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-all font-bold text-xs mb-8 group backdrop-blur-md shadow-sm"
                    >
                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                        {/* Left Column: Messaging & Search */}
                        <div className="col-span-1 lg:col-span-7 space-y-8">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 font-black text-[10px] uppercase tracking-[0.2em] border border-purple-100 mb-6 shadow-sm">
                                    Discovery Engine
                                </div>
                                <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.05]">
                                    Find Opportunities. <br className="hidden sm:block" />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Build Your Future.</span>
                                </h1>
                                <p className="text-slate-600 text-lg sm:text-xl font-medium max-w-2xl mt-6 leading-relaxed">
                                    Connect with top-tier organizations, showcase your expertise, and discover high-value roles that propel your career forward.
                                </p>
                            </div>

                            {/* Premium Glassmorphic Search */}
                            <div className="relative group max-w-2xl">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-indigo-200 rounded-2xl blur-md opacity-40 group-focus-within:opacity-70 transition duration-500"></div>
                                <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-xl flex items-center overflow-hidden transition-all focus-within:border-purple-300">
                                    <div className="pl-6 text-slate-400">
                                        <Search size={22} className="group-focus-within:text-purple-600 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search roles, companies, keywords..."
                                        className="w-full px-5 py-5 bg-transparent outline-none text-slate-900 text-base font-bold placeholder-slate-400"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="pr-6 text-slate-400 hover:text-slate-600 transition-colors">
                                            <X size={20} />
                                        </button>
                                    )}
                                    <button className="hidden sm:flex mr-2 px-6 py-3 bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors shadow-md">
                                        Search
                                    </button>
                                </div>
                            </div>

                            {/* Stats/Trust Bar */}
                            <div className="flex flex-wrap items-center gap-4 sm:gap-8 pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center border border-purple-100">
                                        <Zap size={18} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <div className="text-slate-900 font-black text-lg leading-none">500+</div>
                                        <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Active Roles</div>
                                    </div>
                                </div>
                                <div className="hidden sm:block w-px h-10 bg-slate-200"></div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                        <Building2 size={18} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <div className="text-slate-900 font-black text-lg leading-none">Top 1%</div>
                                        <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Organizations</div>
                                    </div>
                                </div>
                                <div className="hidden sm:block w-px h-10 bg-slate-200"></div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                        <TrendingUp size={18} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <div className="text-slate-900 font-black text-lg leading-none">New</div>
                                        <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Added Daily</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Visual Storytelling */}
                        <div className="col-span-1 lg:col-span-5 relative hidden md:block">
                            <div className="relative w-full aspect-square max-w-[500px] mx-auto">
                                {/* Glowing backdrop for visual */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-purple-400/20 to-indigo-400/20 rounded-full blur-3xl mix-blend-multiply" />

                                {/* Floating 3D-like premium cards populated with realtime data */}
                                {opportunities.slice(0, 3).map((opp: any, idx: number) => {
                                    const yAnims = [[0, -15, 0], [0, 15, 0], [0, -10, 0]];
                                    const delays = [0, 1, 2];
                                    const durations = [6, 7, 5];
                                    const classes = [
                                        "absolute top-[10%] right-[10%] w-64 p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl z-20 cursor-pointer hover:scale-105 transition-transform",
                                        "absolute bottom-[20%] left-[0%] w-64 p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl z-30 cursor-pointer hover:scale-105 transition-transform",
                                        "absolute top-[40%] left-[15%] w-32 h-32 rounded-full bg-white/60 backdrop-blur-md border border-slate-200 flex items-center justify-center z-10 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                                    ];

                                    if (idx === 2) {
                                        return (
                                            <motion.div
                                                key={opp._id}
                                                animate={{ y: yAnims[idx] }}
                                                transition={{ duration: durations[idx], repeat: Infinity, ease: "easeInOut", delay: delays[idx] }}
                                                className={classes[idx]}
                                                onClick={() => navigate(`/opportunities/${opp._id}`)}
                                            >
                                                <Briefcase size={32} className="text-purple-400/50" />
                                            </motion.div>
                                        );
                                    }

                                    return (
                                        <motion.div
                                            key={opp._id}
                                            animate={{ y: yAnims[idx] }}
                                            transition={{ duration: durations[idx], repeat: Infinity, ease: "easeInOut", delay: delays[idx] }}
                                            className={classes[idx]}
                                            onClick={() => navigate(`/opportunities/${opp._id}`)}
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-purple-200 flex shrink-0 items-center justify-center overflow-hidden">
                                                    {opp.logo_url || opp.institution_logo_url || opp.image_url ? (
                                                        <img src={opp.logo_url || opp.institution_logo_url || opp.image_url} alt={opp.organization} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs">
                                                            {opp.organization?.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-xs font-black text-slate-900 truncate">{opp.title}</div>
                                                    <div className="text-[10px] font-bold text-slate-500 truncate">{opp.organization}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className={`px-2 py-1 rounded border text-[9px] font-bold uppercase truncate ${getTypeColor(opp.type)}`}>
                                                    {opp.type}
                                                </span>
                                                {opp.location && opp.location.toLowerCase() !== 'remote' && (
                                                    <span className="px-2 py-1 rounded border border-slate-200 text-[9px] font-bold uppercase text-slate-600 bg-slate-50 truncate">
                                                        {formatOpportunityLocation(opp.location)}
                                                    </span>
                                                )}
                                                {(!opp.location || opp.location.toLowerCase() === 'remote') && (
                                                    <span className="px-2 py-1 rounded border border-slate-200 text-[9px] font-bold uppercase text-slate-600 bg-slate-50 truncate">
                                                        Remote
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category filters bridging dark/light */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0">Discover:</span>
                        {typeOptions.map((type) => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${selectedType === type
                                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                                    : 'bg-slate-100 text-slate-600 border border-transparent hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center shrink-0 gap-2">
                        <button
                            onClick={() => setIsFilterDropdownOpen((v) => !v)}
                            className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${isFilterDropdownOpen
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                }`}
                        >
                            <Filter size={14} /> Advanced Filters
                            <motion.div animate={{ rotate: isFilterDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown size={14} />
                            </motion.div>
                        </button>
                        
                        <button
                            onClick={() => navigate('/dashboard/institution?post=true')}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 transition-all"
                        >
                            <Plus size={14} /> Post Opportunity
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Dropdown Mega Menu */}
            <AnimatePresence>
                {isFilterDropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="px-6 pt-4 relative z-20"
                    >
                        <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[24px] shadow-2xl shadow-slate-900/5 p-8 space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/10 rounded-full blur-[80px] pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-[80px] pointer-events-none" />

                            <div className="relative z-10">
                                <AdvancedFilterPanel
                                    selectedType={selectedType}
                                    setSelectedType={setSelectedType}
                                    selectedLocation={selectedLocation}
                                    setSelectedLocation={setSelectedLocation}
                                    selectedStatus={selectedStatus}
                                    setSelectedStatus={setSelectedStatus}
                                    selectedParticipation={selectedParticipation}
                                    setSelectedParticipation={setSelectedParticipation}
                                    selectedTeamSize={selectedTeamSize}
                                    setSelectedTeamSize={setSelectedTeamSize}
                                    selectedPayment={selectedPayment}
                                    setSelectedPayment={setSelectedPayment}
                                    selectedSkills={selectedSkills}
                                    setSelectedSkills={setSelectedSkills}
                                    collapsedSections={collapsedSections}
                                    setCollapsedSections={setCollapsedSections}
                                    resetFilters={resetFilters}
                                    getTypeColor={getTypeColor}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto px-6 mt-8">
                {loading ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 6 }).map((_, idx) => (
                                <div key={idx} className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm overflow-hidden relative">
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-50/50 to-transparent z-10" />
                                    <div className="flex items-start justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 animate-pulse shrink-0" />
                                            <div className="space-y-3 flex-1">
                                                <div className="h-4 w-3/4 rounded-full bg-slate-100 animate-pulse" />
                                                <div className="h-3 w-1/2 rounded-full bg-slate-100 animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        <div className="h-7 w-20 rounded-lg bg-slate-100 animate-pulse" />
                                        <div className="h-7 w-24 rounded-lg bg-slate-100 animate-pulse" />
                                    </div>
                                    <div className="space-y-3 mb-8">
                                        <div className="h-3 rounded-full bg-slate-100 animate-pulse" />
                                        <div className="h-3 rounded-full bg-slate-100 animate-pulse w-5/6" />
                                    </div>
                                    <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                                        <div className="h-4 w-24 rounded-full bg-slate-100 animate-pulse" />
                                        <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : filteredOpportunities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredOpportunities.map((opp, idx) => {
                            const isApplied = appliedIds.includes(opp._id);
                            const eventId = String(opp.event_link_id || opp.event_id || opp._id || '');
                            const serverEligibility = eligibilityMap[eventId];
                            const locationText = formatOpportunityLocation(opp.location);
                            const isRemote = locationText.toLowerCase().includes('remote') || locationText.toLowerCase().includes('online');
                            const isEvent = ['Hackathon', 'Competition', 'Conference', 'Workshop', 'Challenge'].includes(opp.type);
                            const likelyEligible = clientSideEligible(opp, user);

                            // Improved colors for types
                            const getPremiumTypeStyle = (type: string) => {
                                switch (type.toLowerCase()) {
                                    case 'hackathon': return 'text-purple-700 bg-purple-50 ring-1 ring-purple-200/60';
                                    case 'internship': return 'text-blue-700 bg-blue-50 ring-1 ring-blue-200/60';
                                    case 'job': return 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/60';
                                    case 'competition': return 'text-orange-700 bg-orange-50 ring-1 ring-orange-200/60';
                                    case 'conference': return 'text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200/60';
                                    case 'workshop': return 'text-pink-700 bg-pink-50 ring-1 ring-pink-200/60';
                                    default: return 'text-slate-700 bg-slate-50 ring-1 ring-slate-200/60';
                                }
                            };

                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05, duration: 0.4, ease: 'easeOut' }}
                                    key={opp._id}
                                    onClick={() => { checkEligibilityThenNavigate(opp); }}
                                    className={`group flex flex-col bg-white rounded-[24px] border border-slate-200/80 transition-all duration-300 relative overflow-hidden ${likelyEligible ? 'hover:shadow-xl hover:shadow-purple-900/5 hover:-translate-y-1 hover:border-purple-300/60 cursor-pointer' : 'opacity-80 cursor-not-allowed'}`}
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="p-6 flex flex-col flex-grow relative z-10">
                                        <div className="flex items-start justify-between mb-5 gap-4">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm shrink-0 overflow-hidden group-hover:shadow-md transition-shadow">
                                                    {opp.logo_url || opp.image_url || opp.institution_logo_url ? (
                                                        <img src={opp.logo_url || opp.image_url || opp.institution_logo_url} alt={opp.organization} className="w-full h-full object-cover" />
                                                    ) : opp.organization ? (
                                                        <span className="text-xl font-black text-slate-300">{opp.organization.charAt(0).toUpperCase()}</span>
                                                    ) : (
                                                        <Building2 size={24} strokeWidth={1.5} />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <h4 className="text-lg font-black text-slate-900 truncate leading-tight group-hover:text-purple-700 transition-colors">{opp.title}</h4>
                                                    <span className="text-sm font-bold text-slate-500 truncate mt-1 flex items-center gap-1.5">
                                                        <Building2 size={14} className="text-slate-400" />
                                                        {opp.organization}
                                                    </span>
                                                </div>
                                            </div>
                                            {isApplied && (
                                                <span className="shrink-0 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white shadow-sm flex items-center gap-1">
                                                    Applied
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 mb-5">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${getPremiumTypeStyle(opp.type)}`}>
                                                {opp.type}
                                            </span>

                                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-sky-50 text-sky-700 ring-1 ring-sky-200/60 flex items-center gap-1.5">
                                                <Globe size={12} /> {opp.opportunityMode || 'Online'}
                                            </span>

                                            {opp.applicantCount !== undefined && (
                                                <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-700 ring-1 ring-purple-200/60">
                                                    {opp.applicantCount > 0 ? `+${opp.applicantCount}` : '0'}
                                                </span>
                                            )}

                                            {serverEligibility ? (
                                                serverEligibility.eligible ? (
                                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
                                                        Can apply
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIneligibleModal({ visible: true, reason: serverEligibility?.reason || 'You are not eligible for this event.', eventId, opp }); }}
                                                        className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 ring-1 ring-rose-200/60 hover:bg-rose-100 transition-colors"
                                                    >
                                                        Not eligible
                                                    </button>
                                                )
                                            ) : null}

                                            {!likelyEligible && (
                                                <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 ring-1 ring-rose-200/60">
                                                    Not eligible
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed mb-6 flex-grow">
                                            {plainTextFromRichContent(opp.description)}
                                        </p>

                                        {Array.isArray(opp.candidateTypes) && opp.candidateTypes.length > 0 && !opp.candidateTypes.includes('Everyone can apply') && (
                                            <div className="mb-4 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                                <span className="text-slate-400 uppercase tracking-widest text-[9px] mr-2">Eligibility:</span>
                                                {opp.candidateTypes.join(', ')}
                                            </div>
                                        )}

                                        <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">
                                                    <Clock size={12} />
                                                    Deadline
                                                </div>
                                                <div className="text-sm font-black text-slate-900">
                                                    {new Date(opp.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {opp.applicantsCount > 0 && (
                                                    <div className="flex -space-x-2">
                                                        <div className="w-8 h-8 rounded-full bg-purple-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-purple-700 z-10 shadow-sm">
                                                            +{opp.applicantsCount > 99 ? '99' : opp.applicantsCount}
                                                        </div>
                                                    </div>
                                                )}
                                                <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-purple-600 group-hover:border-purple-600 group-hover:text-white transition-all shadow-sm">
                                                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[32px] p-16 text-center border border-slate-200/80 shadow-sm flex flex-col items-center justify-center min-h-[400px]"
                    >
                        <div className="relative mb-8 group">
                            <div className="absolute inset-0 bg-purple-200 blur-2xl rounded-full opacity-50 group-hover:opacity-70 transition duration-500"></div>
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl flex items-center justify-center relative border border-purple-100 shadow-sm transform group-hover:rotate-3 transition duration-500">
                                <Search size={40} className="text-purple-600 drop-shadow-sm" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">No matching opportunities</h2>
                        <p className="text-slate-500 text-lg font-medium max-w-md mb-8">
                            We couldn't find any opportunities matching your current filters. Try adjusting your search criteria.
                        </p>
                        <button
                            onClick={resetFilters}
                            className="px-6 py-3 rounded-xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all hover:-translate-y-0.5"
                        >
                            Clear All Filters
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

const toggleSection = (section: string, setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>) => {
    setter(prev => ({ ...prev, [section]: !prev[section] }));
};

interface AdvancedFilterPanelProps {
    selectedType: string;
    setSelectedType: React.Dispatch<React.SetStateAction<string>>;
    selectedLocation: string;
    setSelectedLocation: React.Dispatch<React.SetStateAction<string>>;
    selectedStatus: string;
    setSelectedStatus: React.Dispatch<React.SetStateAction<string>>;
    selectedParticipation: string;
    setSelectedParticipation: React.Dispatch<React.SetStateAction<string>>;
    selectedTeamSize: string;
    setSelectedTeamSize: React.Dispatch<React.SetStateAction<string>>;
    selectedPayment: string;
    setSelectedPayment: React.Dispatch<React.SetStateAction<string>>;
    selectedSkills: string[];
    setSelectedSkills: React.Dispatch<React.SetStateAction<string[]>>;
    collapsedSections: Record<string, boolean>;
    setCollapsedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    resetFilters: () => void;
    getTypeColor: (type: string) => string;
}

const CollapsibleSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    sectionKey: string;
    collapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, icon, sectionKey, collapsed, onToggle, children }) => (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">{title}</span>
            </div>
            {collapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
        </button>
        {!collapsed && <div className="p-4">{children}</div>}
    </div>
);

const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
    selectedType, setSelectedType,
    selectedLocation, setSelectedLocation,
    selectedStatus, setSelectedStatus,
    selectedParticipation, setSelectedParticipation,
    selectedTeamSize, setSelectedTeamSize,
    selectedPayment, setSelectedPayment,
    selectedSkills, setSelectedSkills,
    collapsedSections, setCollapsedSections,
    resetFilters, getTypeColor,
}) => {
    const isEventCategory = ['Hackathon', 'Competition', 'Conference', 'Workshop', 'Challenge'].includes(selectedType);
    const dynamicLocationOptions = isEventCategory
        ? ['All', 'Online', 'Offline', 'Hybrid']
        : ['All', 'Remote', 'On-site', 'Hybrid'];

    const statusOptions = ['All', 'Live', 'Upcoming', 'Completed'];
    const participationOptions = ['All', 'Individual', 'Team', 'Both'];
    const teamSizeOptions = ['All', 'Solo', 'Small (2-5)', 'Medium (6-10)', 'Large (10+)'];
    const paymentOptions = ['All', 'Paid', 'Free'];
    const skillSuggestions = ['Python', 'JavaScript', 'React', 'Node.js', 'AI/ML', 'Data Science', 'UI/UX', 'Blockchain', 'Cloud', 'DevOps', 'Mobile', 'Web'];

    return (
        <>
            <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500">Filters</p>
                    <h2 className="text-lg font-black text-slate-900 mt-1">Narrow results</h2>
                </div>
                <button
                    onClick={resetFilters}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
                >
                    Reset
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <CollapsibleSection
                    title="Location" icon={<MapPin size={16} className="text-purple-500" />}
                    sectionKey="location" collapsed={collapsedSections.location}
                    onToggle={() => toggleSection('location', setCollapsedSections)}
                >
                    <div className="grid grid-cols-2 gap-2">
                        {dynamicLocationOptions.map((loc) => (
                            <button key={loc} onClick={() => setSelectedLocation(loc)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedLocation === loc ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                            >{loc}</button>
                        ))}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Category" icon={<Briefcase size={16} className="text-purple-500" />}
                    sectionKey="category" collapsed={collapsedSections.category}
                    onToggle={() => toggleSection('category', setCollapsedSections)}
                >
                    <div className="grid grid-cols-2 gap-2">
                        {typeOptions.map((type) => (
                            <button key={type} onClick={() => setSelectedType(type)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedType === type ? 'bg-slate-900 text-white border-slate-900' : `bg-white border-slate-200 hover:border-slate-300 ${getTypeColor(type)}`}`}
                            >{type}</button>
                        ))}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Status" icon={<Star size={16} className="text-purple-500" />}
                    sectionKey="status" collapsed={collapsedSections.status}
                    onToggle={() => toggleSection('status', setCollapsedSections)}
                >
                    <div className="grid grid-cols-2 gap-2">
                        {statusOptions.map((s) => (
                            <button key={s} onClick={() => setSelectedStatus(s)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedStatus === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                            >{s}</button>
                        ))}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Team Size" icon={<Users size={16} className="text-purple-500" />}
                    sectionKey="teamSize" collapsed={collapsedSections.teamSize}
                    onToggle={() => toggleSection('teamSize', setCollapsedSections)}
                >
                    <div className="grid grid-cols-2 gap-2">
                        {teamSizeOptions.map((t) => (
                            <button key={t} onClick={() => setSelectedTeamSize(t)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedTeamSize === t ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                            >{t}</button>
                        ))}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Participation" icon={<Users size={16} className="text-purple-500" />}
                    sectionKey="participation" collapsed={collapsedSections.participation}
                    onToggle={() => toggleSection('participation', setCollapsedSections)}
                >
                    <div className="grid grid-cols-2 gap-2">
                        {participationOptions.map((p) => (
                            <button key={p} onClick={() => setSelectedParticipation(p)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedParticipation === p ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                            >{p}</button>
                        ))}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Skills" icon={<Star size={16} className="text-purple-500" />}
                    sectionKey="skills" collapsed={collapsedSections.skills}
                    onToggle={() => toggleSection('skills', setCollapsedSections)}
                >
                    <div className="flex flex-wrap gap-2">
                        {skillSuggestions.map((skill) => {
                            const isSelected = selectedSkills.includes(skill);
                            return (
                                <button key={skill} onClick={() => setSelectedSkills(prev => isSelected ? prev.filter(s => s !== skill) : [...prev, skill])}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isSelected ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                >{skill}</button>
                            );
                        })}
                    </div>
                    {selectedSkills.length > 0 && (
                        <button onClick={() => setSelectedSkills([])} className="mt-2 text-[10px] font-black uppercase tracking-widest text-purple-500 hover:text-purple-700 transition-colors">
                            Clear all ({selectedSkills.length})
                        </button>
                    )}
                </CollapsibleSection>
            </div>
        </>
    );
};

export default OpportunitiesList;

