import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
    Gavel, 
    LayoutDashboard, 
    LogOut, 
    Settings,
    Trophy,
    User,
    ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../AuthContext';

interface JudgeSidebarProps {
    onLogout?: () => void;
}

const JudgeSidebar: React.FC<JudgeSidebarProps> = ({ onLogout }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        if (onLogout) onLogout();
        logout();
        navigate('/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/judge-portal' },
        { icon: Gavel, label: 'Assignments', path: '/judge-portal/assignments' },
        { icon: Trophy, label: 'Leaderboards', path: '/judge-portal/leaderboards' },
        { icon: Settings, label: 'Profile Settings', path: '/judge-portal/settings' },
    ];

    return (
        <aside className="w-72 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 shrink-0">
            {/* Logo Area */}
            <div className="p-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
                        <Gavel size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Judge Portal</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Studlyf Network</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1 mt-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/judge-portal'}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all
                            ${isActive 
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 translate-x-1' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'}
                        `}
                    >
                        <item.icon size={18} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile / Bottom Actions */}
            <div className="p-6 mt-auto border-t border-slate-50">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 font-bold">
                        {user?.full_name?.charAt(0) || 'J'}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{user?.full_name || 'Judge'}</p>
                        <p className="text-[10px] font-bold text-slate-400 truncate">{user?.email}</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
};

export default JudgeSidebar;

