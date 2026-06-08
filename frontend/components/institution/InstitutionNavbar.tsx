
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../AuthContext';
import { Bell, Search, LogOut, Settings as SettingsIcon, Zap, Info, Clock, Building2, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { institutionIdFromUser } from '../../utils/institutionScope';

const InstitutionNavbar: React.FC<{ refreshKey?: number, onNavigate?: (tab: string) => void, onNavigateToSettings?: () => void }> = ({ refreshKey, onNavigate, onNavigateToSettings }) => {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();
    const displayName = user?.institution_name || user?.full_name || 'Institutional Portal';
    const institutionId = institutionIdFromUser(user);
    
    const [notifCount, setNotifCount] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [imgError, setImgError] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    
    // New Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [currentPlanName, setCurrentPlanName] = useState<string>('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Click Outside to Close Notifs
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard Shortcut (Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const query = searchQuery.toLowerCase().trim();
            
            // 1. Direct Page Navigation Map (Updated to use onNavigate callback)
            const navMap: {[key: string]: string} = {
                'settings': 'settings',
                'analytics': 'analytics',
                'reports': 'analytics',
                'teams': 'teams',
                'leaderboard': 'leaderboard',
                'events': 'events',
                'dashboard': 'dashboard',
                'participants': 'participants',
                'submissions': 'submissions',
                'judges': 'judges',
                'judge': 'judges',
                'judge management': 'judges',
                'downloads': 'downloads',
                'certificates': 'certificates',
            };

            if (navMap[query]) {
                // If we are already on the dashboard, just switch the tab
                if (onNavigate) {
                    onNavigate(navMap[query]);
                }
                
                // Also update the URL to the base dashboard to keep it clean
                navigate('/institution-dashboard');
                
                setSearchQuery('');
                return;
            }

            // 2. Fallback to first search result
            if (searchResults.length > 0) {
                navigate(searchResults[0].link);
                setSearchQuery('');
                setSearchResults([]);
            }
        }
    };

    // Dynamic Notifications Logic
    useEffect(() => {
        const controller = new AbortController();
        const fetchNotifications = async () => {
            if (role !== 'institution') return;
            try {
                const endpoint = institutionId
                    ? `${API_BASE_URL}/api/v1/institution/notifications/${institutionId}`
                    : `${API_BASE_URL}/api/v1/institution/notifications/me`;

                const res = await fetch(endpoint, {
                    headers: { ...authHeaders() },
                    signal: controller.signal
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                    setNotifCount(data.length);
                }
            } catch (err: any) { 
                if (err.name !== 'AbortError') {
                    console.error("[NOTIF] Failed", err);
                    setNotifications([]);
                    setNotifCount(0);
                }
            }
        };
        fetchNotifications();
        
        // Increase polling interval to 2 minutes to reduce server load
        const interval = setInterval(fetchNotifications, 120000);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [institutionId, role]);

    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Dynamic Search Logic
    useEffect(() => {
        const performSearch = async () => {
            // Define all pages
            const pages = [
                { id: 'dashboard', title: 'Main Dashboard', type: 'Page', link: '#' },
                { id: 'events', title: 'Events Management', type: 'Page', link: '#' },
                { id: 'participants', title: 'Participants', type: 'Page', link: '#' },
                { id: 'submissions', title: 'Submissions', type: 'Page', link: '#' },
                { id: 'judges', title: 'Judge Management', type: 'Page', link: '#' },
                { id: 'analytics', title: 'Reports & Analytics', type: 'Page', link: '#' },
                { id: 'downloads', title: 'Data Downloads', type: 'Page', link: '#' },
                { id: 'settings', title: 'Account Settings', type: 'Page', link: '#' },
            ];

            if (searchQuery.length < 2) {
                // When query is small/empty, show all default pages
                setSearchResults(pages);
                return;
            }

            setIsSearching(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/search?q=${searchQuery}&institution_id=${institutionId}`, {
                    headers: { ...authHeaders() },
                });
                let data = [];
                if (res.ok) {
                    data = await res.json();
                }

                const matchedPages = pages.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
                setSearchResults([...matchedPages, ...data]);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        };
        const timer = setTimeout(performSearch, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, institutionId]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!institutionId || role !== 'institution') return;
            try {
                // Cache bust: Force fresh data from server
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/profile/${institutionId}?t=${Date.now()}`, {
                    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', ...authHeaders() },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                    setImgError(false); // Reset error state on fresh fetch
                } else {
                    console.error("[PROFILE] Error:", res.status);
                }
            } catch (err: any) { 
                if (err.name !== 'AbortError') {
                    console.error("[PROFILE] Failed", err);
                    setProfile(null);
                }
            }
        };
        fetchProfile();
    }, [institutionId, refreshKey]);

    useEffect(() => {
        const fetchPlan = async () => {
            if (!institutionId || role !== 'institution') return;
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/plans`, {
                    headers: { ...authHeaders() },
                });
                if (!res.ok) return;
                const data = await res.json();
                const activeId = data?.currentPlanId;
                const active = Array.isArray(data?.plans)
                    ? data.plans.find((p: any) => p.id === activeId)
                    : null;
                setCurrentPlanName(active?.name || 'Basic Plan');
            } catch {
                // Best-effort badge only.
            }
        };
        fetchPlan();
    }, [institutionId, role, refreshKey]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleMarkAllAsRead = async () => {
        try {
            // Optimistic Update
            setNotifications([]);
            setNotifCount(0);
            
            const endpoint = institutionId
                ? `${API_BASE_URL}/api/v1/institution/notifications/${institutionId}/mark-read`
                : `${API_BASE_URL}/api/v1/institution/notifications/me/mark-read`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { ...authHeaders() },
            });
            
            if (!res.ok) {
                // If it fails, we could optionally re-fetch, but for now we'll keep it clean
                console.error("Failed to clear notifications on backend");
            }
        } catch (err) {
            console.error("Mark all as read failed", err);
        }
    };

    return (
        <div className="w-full font-sans px-6 pt-4">
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full bg-[#6C3BFF] h-16 rounded-[1.5rem] shadow-2xl shadow-purple-200 flex items-center px-6 relative group"
            >
                {/* 1. Left (Empty to match old layout) */}
                <div className="w-12 shrink-0 hidden lg:block" />

                {/* 2. Search (Centered & Visible) */}
                <div className="flex-1 max-w-xl mx-auto relative z-10 hidden md:block">
                    {role !== 'judge' && (
                        <div className="relative group/search">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60 group-focus-within/search:text-white transition-colors" size={18} />
                            <input 
                                ref={searchInputRef}
                                type="text" 
                                value={searchQuery}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search events, students, or reports..." 
                                className="w-full pl-14 pr-6 py-2.5 bg-white/25 backdrop-blur-3xl border border-white/40 rounded-full text-white placeholder:text-white/60 outline-none focus:bg-white/30 focus:border-white/60 transition-all font-sans font-medium text-xs shadow-xl"
                            />
                            {/* CTRL K Badge Removed */}
     
                            {/* Search Results Dropdown */}
                            <AnimatePresence>
                                {isSearchFocused && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[2rem] shadow-2xl overflow-hidden p-3 border border-slate-100 z-20"
                                    >
                                        {searchResults.length > 0 ? (
                                            <div className="space-y-1">
                                                {searchResults.map((result, idx) => (
                                                    <button 
                                                        key={`${result.id}-${idx}`}
                                                        onClick={() => {
                                                            if (result.id === 'settings' && onNavigateToSettings) {
                                                                onNavigateToSettings();
                                                            } else if (result.type === 'Page' && onNavigate) {
                                                                onNavigate(result.id);
                                                            } else if (result.type === 'Event' || result.type === 'Student') {
                                                                // Logic for deep links
                                                                navigate(result.link);
                                                            } else {
                                                                navigate(result.link);
                                                            }
                                                            setSearchQuery('');
                                                            setSearchResults([]);
                                                        }}
                                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all text-left group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-[#6C3BFF]">
                                                                <Zap size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm">{result.title}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{result.type}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronDown className="-rotate-90 text-slate-300 group-hover:text-[#6C3BFF] transition-colors" size={16} />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-10 text-center text-slate-400 italic text-sm">
                                                No matching results found...
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* 3. Right Side: Notifs & Profile (Far Right) */}
                <div className="flex items-center gap-4 relative z-10 shrink-0">
                    {role !== 'judge' && currentPlanName && (
                        <div className="hidden xl:flex items-center px-3.5 py-2 rounded-xl bg-white/15 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest">
                            Plan: {currentPlanName}
                        </div>
                    )}
                    {/* Notifications */}
                    {/* Notifications with Dynamic Dropdown */}
                    {role !== 'judge' && (
                        <div className="relative" ref={notifRef}>
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    console.log("Notification Bell Clicked! Current State:", !isNotifOpen);
                                    setIsNotifOpen(!isNotifOpen);
                                }}
                                className="relative p-3.5 bg-white/10 border border-white/10 rounded-2xl text-white hover:bg-white/20 transition-all group overflow-visible"
                            >
                                <Bell size={20} className={`${isNotifOpen ? 'fill-white' : ''} transition-all`} />
                                {notifCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-[#6C3BFF] rounded-full flex items-center justify-center text-[9px] font-black text-white animate-pulse">
                                        {notifCount}
                                    </span>
                                )}
                            </motion.button>

                            <AnimatePresence>
                                {isNotifOpen && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
                                        className="absolute right-0 mt-5 w-80 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(108,59,255,0.3)] border border-white overflow-hidden z-50"
                                    >
                                        <div className="p-7 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-transparent">
                                            <div>
                                                <p className="font-black text-slate-900 uppercase tracking-[0.2em] text-[10px]">Command Center</p>
                                                <p className="text-[10px] text-[#6C3BFF] font-bold mt-0.5">Real-time Activity</p>
                                            </div>
                                            <div className="px-3 py-1.5 bg-[#6C3BFF] text-white rounded-full text-[10px] font-black shadow-lg shadow-purple-200">
                                                {notifCount} LIVE
                                            </div>
                                        </div>

                                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-3">
                                            {notifications.length > 0 ? (
                                                <div className="space-y-2">
                                                    {notifications.map((n, idx) => (
                                                        <motion.div 
                                                            key={n.id || idx}
                                                            initial={{ x: -20, opacity: 0 }}
                                                            animate={{ x: 0, opacity: 1 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="p-4 hover:bg-purple-50/50 rounded-3xl transition-all cursor-pointer group/item border border-transparent hover:border-purple-100"
                                                        >
                                                            <div className="flex gap-4">
                                                                <div className="w-11 h-11 bg-white rounded-2xl shadow-sm border border-slate-50 flex items-center justify-center text-slate-400 group-hover/item:bg-[#6C3BFF] group-hover/item:text-white group-hover/item:scale-110 transition-all duration-300">
                                                                    <Zap size={18} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-bold text-slate-900 leading-tight group-hover/item:text-[#6C3BFF] transition-colors">
                                                                        {n.message || 'New system update available'}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <Clock size={10} className="text-slate-300" />
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{n.time || 'Just now'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-16 text-center">
                                                    <motion.div 
                                                        animate={{ 
                                                            y: [0, -10, 0],
                                                            rotate: [0, 5, -5, 0]
                                                        }}
                                                        transition={{ repeat: Infinity, duration: 4 }}
                                                        className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 text-[#6C3BFF]/20"
                                                    >
                                                        <Bell size={40} />
                                                    </motion.div>
                                                    <p className="text-slate-900 font-black text-sm uppercase tracking-widest">Protocol Clear</p>
                                                    <p className="text-slate-400 text-[11px] mt-2 font-medium px-10">No pending institutional alerts at this timestamp.</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {notifications.length > 0 && (
                                            <button 
                                                onClick={handleMarkAllAsRead}
                                                className="w-full p-5 bg-slate-50 hover:bg-slate-100 text-[10px] font-black text-[#6C3BFF] uppercase tracking-[0.3em] transition-all border-t border-slate-100"
                                            >
                                                Mark all as read
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Profile Section with Logo */}
                    <div 
                        onClick={onNavigateToSettings}
                        className="flex items-center gap-2.5 p-1 bg-white/10 border border-white/10 rounded-full hover:bg-white/20 transition-all cursor-pointer group"
                    >
                        {/* Logo replaces the 'N' */}
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#6C3BFF] font-black shadow-lg overflow-hidden shrink-0 border border-white/20 text-xs">
                             {profile?.logo_url && !imgError ? (
                                <img src={profile.logo_url} className="w-full h-full object-cover" onError={() => setImgError(true)} />
                             ) : (
                                displayName.charAt(0).toUpperCase()
                             )}
                        </div>
                        {/* Removed text name for cleaner UI as requested */}
                        <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLogout();
                            }}
                            className="p-1.5 text-purple-200 hover:text-white transition-colors"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default InstitutionNavbar;
