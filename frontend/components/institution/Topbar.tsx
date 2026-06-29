
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../AuthContext';
import { Bell, Search, User, CreditCard, LogOut, Settings as SettingsIcon, Menu, Info, Zap, Clock, X, Filter, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { institutionIdFromUser } from '../../utils/institutionScope';

const Topbar: React.FC<{ onNavigateToSettings?: () => void }> = ({ onNavigateToSettings }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const displayName = user?.full_name || 'User';
    const institutionId = institutionIdFromUser(user);
    
    const [notifCount, setNotifCount] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [imgError, setImgError] = useState(false);
    const [cacheBuster, setCacheBuster] = useState(Date.now());
    const notifRef = useRef<HTMLDivElement>(null);

    const fetchProfile = async () => {
        if (!institutionId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/profile/${institutionId}`, { headers: { ...authHeaders() } });
            if (res.ok) {
                const data = await res.json();
                if (data.logo_url) {
                    setImgError(false);
                    setCacheBuster(Date.now()); 
                }
                setProfile(data);
            }
        } catch (err) {
            try { console.error("[Topbar] Profile fetch error:", err instanceof Error ? err.message : String(err)); } catch (_) {}
        }
    };

    const fetchNotifications = async () => {
        if (!institutionId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/notifications/${institutionId}`, { headers: { ...authHeaders() } });
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : [];
                setNotifications(list);
                setNotifCount(list.length);
            }
        } catch (err) {
            console.error("[Topbar] Notification fetch error");
        }
    };

    const handleMarkAsRead = async () => {
        if (!institutionId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/notifications/${institutionId}/mark-read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
            });
            if (res.ok) {
                setNotifications([]);
                setNotifCount(0);
            }
        } catch (err) {
            try { console.error("[Topbar] Mark as read failed:", err instanceof Error ? err.message : String(err)); } catch (_) {}
            // Fallback: Clear locally if API fails to keep UI responsive
            setNotifications([]);
            setNotifCount(0);
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [institutionId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            try { console.error('Error signing out:', error instanceof Error ? error.message : String(error)); } catch (_) {}
        }
    };

    // Construct the logo URL with cache buster if it's not a base64 string
    const getLogoUrl = () => {
        if (!profile?.logo_url) return null;
        if (profile.logo_url.startsWith('data:')) return profile.logo_url;
        return `${profile.logo_url}${profile.logo_url.includes('?') ? '&' : '?'}v=${cacheBuster}`;
    };

    return (
        <div className="w-full flex items-center justify-between mb-10 animate-in slide-in-from-top duration-1000 relative z-[100]">
            {/* Left Side: Greeting */}
            <div className="hidden lg:block">
                <h1 className="text-2xl font-sans font-bold text-slate-900 flex items-center gap-3">
                    Welcome Back, <span className="text-[#6C3BFF]">{displayName}</span> 👋
                </h1>
                <p className="text-slate-400 text-sm font-medium mt-1">Here's your institutional overview for today.</p>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-xl mx-8 hidden md:block">
                <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6C3BFF] transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search events, students, or reports..." 
                        className="w-full pl-14 pr-6 py-4 bg-white/70 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-xl shadow-slate-200/40 focus:ring-4 focus:ring-purple-50 focus:border-[#6C3BFF] outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-50 text-[10px] font-bold text-slate-400 rounded-lg border border-slate-100">
                        ⌘ K
                    </div>
                </div>
            </div>

            {/* Right Side: Actions & Profile */}
            <div className="flex items-center gap-4">

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button 
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className={`relative p-3.5 border rounded-2xl transition-all group ${
                            isNotifOpen ? 'bg-purple-50 border-purple-200 text-[#6C3BFF]' : 'bg-white border-slate-100 text-slate-600 hover:text-[#6C3BFF] hover:border-purple-100'
                        }`}
                    >
                        <Bell size={20} className={isNotifOpen ? '' : 'group-hover:rotate-12 transition-transform'} />
                        {notifCount > 0 && (
                            <span className="absolute top-3 right-3 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                                {notifCount > 9 ? '9+' : notifCount}
                            </span>
                        )}
                    </button>

                    <AnimatePresence>
                        {isNotifOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-4 w-80 bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-300/50 overflow-hidden"
                            >
                                <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Notifications</h3>
                                    <span className="px-2 py-0.5 bg-purple-50 text-[#6C3BFF] text-[10px] font-bold rounded-lg">{notifCount} New</span>
                                </div>
                                
                                <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                                    {notifications.length > 0 ? notifications.map((notif, idx) => (
                                        <div key={idx} className="p-5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer">
                                            <div className="flex gap-4">
                                                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                                                    notif.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                                                }`}>
                                                    {notif.type === 'success' ? <Zap size={18} /> : <Info size={18} />}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Clock size={12} className="text-slate-300" />
                                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{notif.time_ago || 'Just now'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-20 text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Bell size={24} className="text-slate-200" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No new notifications</p>
                                        </div>
                                    )}
                                </div>

                                {notifications.length > 0 && (
                                    <button 
                                        onClick={handleMarkAsRead}
                                        className="w-full py-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#6C3BFF] transition-colors"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Profile Section (Navigate to Settings) */}
                <div 
                    onClick={onNavigateToSettings}
                    className="flex items-center gap-3 p-1.5 pr-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group relative"
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6C3BFF] to-[#9F6BFF] flex items-center justify-center text-white font-bold shadow-lg shadow-purple-100 overflow-hidden">
                        {getLogoUrl() && !imgError ? (
                            <img 
                                src={getLogoUrl()!} 
                                alt="Logo" 
                                className="w-full h-full object-cover" 
                                onError={() => {
                                    console.error("[Topbar] Logo failed to load");
                                    setImgError(true);
                                }}
                            />
                        ) : (
                            profile ? <Building2 size={20} /> : displayName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="hidden sm:block max-w-[140px] overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 leading-tight group-hover:text-[#6C3BFF] transition-colors truncate">
                            {(profile?.name || displayName).split(' ')[0]}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin</p>
                    </div>
                    
                    <div className="h-8 w-px bg-slate-100 mx-2 hidden sm:block" />
                    
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleLogout();
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Topbar;

