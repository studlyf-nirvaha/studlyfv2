
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../AuthContext';
import {
    User, 
    Bell, 
    Shield, 
    Globe, 
    Mail, 
    Phone,
    Building2,
    Save,
    Upload,
    ChevronRight,
    CheckCircle2,
    Loader2,
    CreditCard,
    Zap,
    Star,
    Crown,
    ArrowRight,
    Users,
    MessageSquare,
    Plus,
    Trash2,
    ShieldCheck,
    Gavel,
    CreditCard as BillingIcon,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
    Award,
    Trophy,
    Medal,
    FileText,
    AlertCircle,
    Edit3,
    X,
    CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL, authHeaders } from '../../apiConfig';

interface SettingsPageProps {
    institutionId: string;
    onProfileUpdate?: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ institutionId, onProfileUpdate }) => {
    const location = useLocation();
    const [activeSection, setActiveSection] = useState(() => {
        const params = new URLSearchParams(location.search);
        return params.get('section') || 'profile';
    });
    const sections = [
        { id: 'profile', label: 'My Account', icon: Building2 },
        { id: 'team', label: 'Your Team', icon: Users },
        { id: 'blocked', label: 'Blocked Candidates & Org.', icon: ShieldAlert },
        { id: 'notifications', label: 'Email Notifications', icon: Mail },
        { id: 'communications', label: 'Custom Communications', icon: MessageSquare },
        { id: 'onboarding', label: 'Member Onboarding', icon: Plus },
        { id: 'plan', label: 'Plans & Subscription', icon: CreditCard },
        { id: 'rules', label: 'Certificate Rules', icon: Award },
    ];

    const [plansData, setPlansData] = useState<{ plans: any[]; faqs: any[]; currentPlanId: string; pendingPlan?: { plan_id: string; plan_name: string; queued_at?: string | null; is_upgrade?: boolean; is_downgrade?: boolean }; expiry?: { expires_at: string | null; days_remaining: number | null; is_expired: boolean } } | null>(null);
    const [plansLoading, setPlansLoading] = useState(false);
    const [selectingPlanId, setSelectingPlanId] = useState<string | null>(null);
    const [planModalOpen, setPlanModalOpen] = useState(false);
    const [planModalLoading, setPlanModalLoading] = useState(false);
    const [planModalAction, setPlanModalAction] = useState<'upgrade' | 'downgrade' | 'switch' | 'unknown'>('unknown');
    const [planModalError, setPlanModalError] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [eventPackages, setEventPackages] = useState<any[] | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const section = params.get('section');
        if (section) setActiveSection(section);
    }, [location.search]);
    const [hackathonPackageEnabled, setHackathonPackageEnabled] = useState(false);
    const [togglingPackage, setTogglingPackage] = useState(false);
    const [packageStatus, setPackageStatus] = useState<any | null>(null);
    const [packageStatusLoading, setPackageStatusLoading] = useState(false);
    const [imgErrors, setImgErrors] = useState<{logo: boolean; banner: boolean}>({ logo: false, banner: false });

    const prevLogoRef = useRef('');
    const prevBannerRef = useRef('');

    const [profile, setProfile] = useState<any>({
        name: '',
        website: '',
        email: '',
        phone: '',
        bio: '',
        logo_url: '',
        banner_url: '',
        email_custom_message: '',
        team: [],
        social: {
            linkedin: '',
            twitter: '',
            instagram: ''
        },
        notifications: {
            registrations: false,
            submissions: true,
            evaluations: true,
            updates: false
        }
    });

    useEffect(() => {
        if (profile.logo_url !== prevLogoRef.current) {
            setImgErrors(prev => ({ ...prev, logo: false }));
            prevLogoRef.current = profile.logo_url;
        }
    }, [profile.logo_url]);
    useEffect(() => {
        if (profile.banner_url !== prevBannerRef.current) {
            setImgErrors(prev => ({ ...prev, banner: false }));
            prevBannerRef.current = profile.banner_url;
        }
    }, [profile.banner_url]);

    const [bulkList, setBulkList] = useState<{name: string, email: string, phone: string}[]>([]);
    const [onboardingRole, setOnboardingRole] = useState('student');
    const [isOnboarding, setIsOnboarding] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshPlans = async () => {
        const refetch = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/plans`, { headers: authHeaders() });
        if (refetch.ok) {
            const data = await refetch.json();
            setPlansData(data);
            return data;
        }
        return null;
    };

    const { user } = useAuth();

    useEffect(() => {
        let isMounted = true;
        
        // Safety Timeout: Force stop loading after 5 seconds
        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 5000);

        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/profile/${institutionId}?t=${Date.now()}`, {
                    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', ...authHeaders() }
                }); 
                if (res.ok && isMounted) {
                    const data = await res.json();
                    const resolveMedia = (url?: string) => {
                        if (!url) return '';
                        if (url.startsWith('/api/')) return `${API_BASE_URL}${url}`;
                        return url;
                    };
                    setProfile(prev => ({
                        ...prev,
                        ...data,
                        name: data.name || data.institution_name || (user as any)?.institution_name || prev.name || '',
                        logo_url: resolveMedia(data.logo_url || data.logoUrl) || prev.logo_url,
                        banner_url: resolveMedia(data.banner_url || data.bannerUrl) || prev.banner_url,
                        notifications: data.notifications || prev.notifications
                    }));
                } else if (isMounted) {
                    // If backend profile doesn't exist yet, prefill from authenticated user where possible
                    setProfile(prev => ({
                        ...prev,
                        name: prev.name || (user as any)?.institution_name || '',
                        email: prev.email || user?.email || '',
                        logo_url: prev.logo_url || (user as any)?.logo_url || prev.logo_url,
                    }));
                }
            } catch (err) {
                console.error("Failed to load settings.");
            } finally {
                if (isMounted) {
                    setLoading(false);
                    clearTimeout(safetyTimer);
                }
            }
        };
        fetchProfile();
        return () => { 
            isMounted = false; 
            clearTimeout(safetyTimer);
        };
    }, [institutionId]);

    useEffect(() => {
        if (activeSection !== 'plan' || plansData) return;
        const fetchPlans = async () => {
            setPlansLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/plans`, { headers: authHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setPlansData(data);
                }
            } catch (err) {
                console.error("Failed to load plans");
            } finally {
                setPlansLoading(false);
            }
        };
        fetchPlans();
        // Also fetch event packages (institution-level links)
        const fetchEventConfig = async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/event-config`, { headers: authHeaders() });
                if (r.ok) {
                    const cfg = await r.json();
                    const raw = cfg?.event_packages;
                    if (raw) {
                        try {
                            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            if (Array.isArray(parsed)) setEventPackages(parsed);
                        } catch (e) {
                        }
                    }
                }
            } catch (e) {
                console.debug('No event-config available', e);
            }
        };
        fetchEventConfig();

        const fetchHackathonPackage = async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/package-status`, { headers: authHeaders() });
                if (r.ok) {
                    const data = await r.json();
                    setHackathonPackageEnabled(!!data.enabled);
                    setPackageStatus(data || null);
                }
            } catch { /* silent */ }
        };
        fetchHackathonPackage();
    }, [activeSection, plansData]);

    // Fetch package status for badge (run on mount and when toggling)
    useEffect(() => {
        let mounted = true;
        const fetchPackageStatus = async () => {
            try {
                setPackageStatusLoading(true);
                const r = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/package-status`, { headers: authHeaders() });
                if (!mounted) return;
                if (r.ok) {
                    const data = await r.json();
                    setPackageStatus(data || null);
                    setHackathonPackageEnabled(!!data?.enabled);
                }
            } catch (e) {
                // ignore
            } finally {
                if (mounted) setPackageStatusLoading(false);
            }
        };
        fetchPackageStatus();
        return () => { mounted = false; };
    }, [togglingPackage]);

    const handleSubscribe = async () => {
        try {
            setTogglingPackage(true);
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
            });
            if (res.ok) {
                const data = await res.json();
                setHackathonPackageEnabled(true);
                setPackageStatus(prev => ({ ...(prev || {}), enabled: true, subscription_status: 'active', payment_status: 'free', last_payment: { amount: 0, currency: '₹', provider: 'manual', status: 'free' } }));
                alert(data.message || 'Hackathon Event Package activated!');
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || 'Subscription failed. Please try again.');
            }
        } catch {
            alert('Network error. Is the backend running?');
        } finally {
            setTogglingPackage(false);
        }
    };

    const handleSelectPlan = async (plan: any) => {
        if (!plansData || plan.id === plansData.currentPlanId) return;
        try {
            setSelectingPlanId(plan.id);
            setPlanModalError(null);
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/plans/select`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ plan_id: plan.id }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.detail || 'Failed to queue subscription plan');
            }

            const payload = await res.json().catch(() => ({}));
            setSelectedPlan(plan);
            setPlanModalAction(payload?.pending?.is_downgrade ? 'downgrade' : payload?.pending?.is_upgrade ? 'upgrade' : 'switch');
            setPlanModalOpen(true);
            await refreshPlans();
        } catch (err: any) {
            alert(err?.message || 'Failed to update subscription plan');
        } finally {
            setSelectingPlanId(null);
        }
    };

    const handleCancelPendingPlan = async () => {
        try {
            setPlanModalLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/plans/cancel-pending`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({}),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.detail || 'Failed to cancel pending plan');
            }
            await refreshPlans();
            setPlanModalOpen(false);
            setSelectedPlan(null);
        } catch (err: any) {
            setPlanModalError(err?.message || 'Failed to cancel pending plan');
        } finally {
            setPlanModalLoading(false);
        }
    };

    const handleConfirmPlanChange = async () => {
        try {
            setPlanModalLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/plans/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({}),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.detail || 'Failed to confirm plan change');
            }
            await refreshPlans();
            setPackageStatus(prev => ({ ...(prev || {}), subscription_status: 'active', payment_status: 'free' }));
            setPlanModalOpen(false);
            setSelectedPlan(null);
        } catch (err: any) {
            setPlanModalError(err?.message || 'Failed to confirm plan change');
        } finally {
            setPlanModalLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setProfile(prev => ({ ...prev, [id]: value }));
    };

    const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setProfile(prev => ({
            ...prev,
            social: {
                ...prev.social,
                [id]: value
            }
        }));
    };

    const handleMediaUpload = async (file: File, field: 'logo_url' | 'banner_url') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('field', field);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/upload-media`, {
                method: 'POST',
                headers: { ...authHeaders() },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                alert('Upload failed: ' + (data.detail || 'Unknown error'));
                return;
            }
            const uploadedUrl = data.url?.startsWith('/api/')
                ? `${API_BASE_URL}${data.url}`
                : data.url;
            setProfile(prev => ({ ...prev, [field]: uploadedUrl }));
            setImgErrors(prev => ({ ...prev, logo: field === 'logo_url' ? false : prev.logo, banner: field === 'banner_url' ? false : prev.banner }));
        } catch (err) {
            try { console.error('[MediaUpload] network error', err instanceof Error ? err.message : String(err)); } catch (_) {}
            alert('Network error during upload.');
        }
    };

    const handleBannerClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
                handleMediaUpload(file, 'banner_url');
            }
        };
        input.click();
    };

    const handleToggle = (category: string, key: string) => {
        setProfile(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [category]: {
                    ...prev.notifications?.[category],
                    [key]: !prev.notifications?.[category]?.[key]
                }
            }
        }));
    };

    const addTeamMember = () => {
        setProfile(prev => ({
            ...prev,
            team: [...(prev.team || []), { name: '', email: '', role: 'Coordinator' }]
        }));
    };

    const updateMember = (index: number, field: string, value: string) => {
        const newTeam = [...profile.team];
        newTeam[index] = { ...newTeam[index], [field]: value };
        setProfile(prev => ({ ...prev, team: newTeam }));
    };

    const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const lines = content.split('\n');
            const newMembers: any[] = [];
            
            const startIdx = (lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('email')) ? 1 : 0;

            for (let i = startIdx; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    newMembers.push({
                        name: parts[0],
                        email: parts[1],
                        role: parts[2] || 'Coordinator'
                    });
                }
            }
            
            if (newMembers.length > 0) {
                setProfile(prev => ({
                    ...prev,
                    team: [...(prev.team || []), ...newMembers]
                }));
            }
        };
        reader.readAsText(file);
    };


    const removeTeamMember = (index: number) => {
        const newTeam = [...profile.team];
        newTeam.splice(index, 1);
        setProfile(prev => ({ ...prev, team: newTeam }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const { _id, ...cleanProfile } = profile;
            const payload = {
                ...cleanProfile,
                institution_id: institutionId,
                name: cleanProfile.name || (user as any)?.institution_name || '',
            };
            
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => {
                    if (onProfileUpdate) onProfileUpdate();
                }, 500);
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(errorData.detail || `Save failed (${res.status})`);
            }
        } catch (err) {
            alert("Network error. Is the backend running?");
        } finally {
            setSaving(false);
        }
    };

    const handleLogoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleMediaUpload(file, 'logo_url');
        }
    };

    if (loading) return (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#6C3BFF]" size={40} />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Settings...</p>
        </div>
    );

    const renderSectionContent = () => {
        switch (activeSection) {
            case 'profile':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="relative mb-20">
                            <div 
                                onClick={handleBannerClick}
                                className="w-full h-48 rounded-[3rem] bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden group relative"
                            >
                                {profile.banner_url && !imgErrors.banner ? (
                                    <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" onError={() => setImgErrors(prev => ({ ...prev, banner: true }))} />
                                ) : (
                                    <div className="text-center">
                                        <Plus className="mx-auto text-slate-300" size={32} />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Upload Institutional Banner</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/40">
                                        <Upload className="text-white" size={20} />
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -bottom-12 left-10 group" onClick={handleLogoClick}>
                                <div className="w-32 h-32 rounded-[2rem] bg-white border-8 border-white shadow-2xl flex items-center justify-center overflow-hidden relative cursor-pointer group-hover:scale-105 transition-transform">
                                    {profile.logo_url && !imgErrors.logo ? (
                                        <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" onError={() => setImgErrors(prev => ({ ...prev, logo: true }))} />
                                    ) : (
                                        <Building2 size={32} className="text-slate-200" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Upload className="text-white" size={20} />
                                    </div>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                            {[
                                { id: 'name', label: 'Institution Name', icon: Building2, placeholder: 'e.g., Stanford University' },
                                { id: 'website', label: 'Official Website', icon: Globe, placeholder: 'https://www.university.edu' },
                                { id: 'email', label: 'Administrative Email', icon: Mail, placeholder: 'admin@university.edu' },
                                { id: 'phone', label: 'Contact Number', icon: Phone, placeholder: '+1 (555) 000-0000' },
                            ].map((field) => (
                                <div key={field.id} className="space-y-3">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <field.icon size={14} className="text-[#6C3BFF]" /> {field.label}
                                    </label>
                                    <input 
                                        id={field.id}
                                        type="text" 
                                        placeholder={field.placeholder}
                                        value={profile[field.id]} 
                                        onChange={handleInputChange}
                                        className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-purple-50 focus:border-[#6C3BFF] outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300" 
                                    />
                                </div>
                            ))}

                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-50 mt-4">
                                {[
                                    { id: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/school/...' },
                                    { id: 'twitter', label: 'Twitter / X', placeholder: 'twitter.com/...' },
                                    { id: 'instagram', label: 'Instagram', placeholder: 'instagram.com/...' },
                                ].map((s) => (
                                    <div key={s.id} className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</label>
                                        <input 
                                            id={s.id}
                                            type="text" 
                                            placeholder={s.placeholder}
                                            value={profile.social?.[s.id] || ''} 
                                            onChange={handleSocialChange}
                                            className="w-full px-5 py-4 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-purple-100 outline-none transition-all text-xs font-bold"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="md:col-span-2 space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Bio</label>
                                <textarea 
                                    id="bio"
                                    rows={5} 
                                    placeholder="Write a brief description of your institution..."
                                    value={profile.bio}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-purple-50 focus:border-[#6C3BFF] outline-none transition-all resize-none font-bold text-slate-800 placeholder:text-slate-300" 
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-inner">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-2xl text-amber-500 shadow-md">
                                        <Bell size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Internal Operational Alerts</h3>
                                        <p className="text-sm text-slate-400 mt-0.5">Control which notifications are sent to the institution staff.</p>
                                    </div>
                                </div>
                            </div>
                            
                            {[
                                { cat: 'admin_alerts', id: 'new_submissions', title: 'New Submission Alerts', desc: 'Notify admins when a team finalizes their project' },
                                { cat: 'admin_alerts', id: 'judge_acceptances', title: 'Judge Activity', desc: 'Alert when a judge accepts an invite' },
                                { cat: 'admin_alerts', id: 'judge_evaluations', title: 'Judge Evaluations', desc: 'Notify admins when a judge finishes scoring a project' },
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between py-6 border-b border-slate-200/50 last:border-0">
                                    <div>
                                        <p className="font-bold text-slate-800 text-lg">{item.title}</p>
                                        <p className="text-sm text-slate-400 mt-0.5">{item.desc}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleToggle(item.cat, item.id)}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all cursor-pointer ${profile.notifications?.[item.cat]?.[item.id] ? 'bg-[#6C3BFF] shadow-lg shadow-purple-200' : 'bg-slate-200'}`}
                                    >
                                        <div className={`h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${profile.notifications?.[item.cat]?.[item.id] ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-inner">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-2xl text-emerald-500 shadow-md">
                                        <Gavel size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Judging Panel Logic</h3>
                                        <p className="text-sm text-slate-400 mt-0.5">Control correspondence for your evaluators.</p>
                                    </div>
                                </div>
                            </div>
                            
                            {[
                                { cat: 'judge_comms', id: 'invitations', title: 'Judge Invitations', desc: 'Sent when you add a judge to an event' },
                                { cat: 'judge_comms', id: 'evaluation_reminders', title: 'Evaluation Reminders', desc: 'Automatic pings to finish scoring before the deadline' },
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between py-6 border-b border-slate-200/50 last:border-0">
                                    <div>
                                        <p className="font-bold text-slate-800 text-lg">{item.title}</p>
                                        <p className="text-sm text-slate-400 mt-0.5">{item.desc}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleToggle(item.cat, item.id)}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all cursor-pointer ${profile.notifications?.[item.cat]?.[item.id] ? 'bg-[#6C3BFF] shadow-lg shadow-purple-200' : 'bg-slate-200'}`}
                                    >
                                        <div className={`h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${profile.notifications?.[item.cat]?.[item.id] ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'team':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Institutional Team</h3>
                                <p className="text-sm text-slate-500 mt-1">Manage staff members and their administrative roles.</p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => document.getElementById('bulk-member-upload')?.click()}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all"
                                >
                                    <Upload size={16} /> Bulk Upload
                                </button>
                                <input 
                                    id="bulk-member-upload"
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden"
                                    onChange={handleBulkUpload}
                                />
                                <button 
                                    onClick={addTeamMember}
                                    className="flex items-center gap-2 px-6 py-3 bg-[#6C3BFF] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#5A2EE5] transition-all shadow-lg shadow-purple-100"
                                >
                                    <Plus size={16} /> Add Member
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {profile.team && profile.team.length > 0 ? profile.team.map((member, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={idx} 
                                    className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center gap-6"
                                >
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                            <input 
                                                value={member.name}
                                                onChange={(e) => updateMember(idx, 'name', e.target.value)}
                                                placeholder="e.g. Dr. Jane Smith"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                                            <input 
                                                value={member.email}
                                                onChange={(e) => updateMember(idx, 'email', e.target.value)}
                                                placeholder="jane.smith@univ.edu"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</label>
                                            <select 
                                                value={member.role}
                                                onChange={(e) => updateMember(idx, 'role', e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm font-bold appearance-none"
                                            >
                                                <option value="Admin">Admin</option>
                                                <option value="Coordinator">Coordinator</option>
                                                <option value="Evaluator">Evaluator</option>
                                                <option value="Editor">Editor</option>
                                                <option value="Viewer">Viewer</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeTeamMember(idx)}
                                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </motion.div>
                            )) : (
                                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                                    <Users className="mx-auto text-slate-200 mb-4" size={48} />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No team members added yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'communications':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900">Custom Communications</h2>
                        </div>
                        <div className="p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                            <MessageSquare className="mx-auto text-slate-300 mb-4" size={48} />
                            <h3 className="text-lg font-bold text-slate-900 font-sans">Premium Feature</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">
                                Custom email templates and SMS notifications are available for Premium institutions.
                            </p>
                        </div>
                    </div>
                );
            case 'onboarding':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 font-sans">Member Onboarding</h2>
                                <p className="text-slate-500 text-sm mt-1">Bulk invite judges or students via CSV upload</p>
                            </div>
                            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                                {['student', 'judge'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setOnboardingRole(r)}
                                        className={`px-6 py-2.5 rounded-xl text-xs font-black capitalize tracking-widest transition-all ${onboardingRole === r ? 'bg-white text-[#6C3BFF] shadow-sm' : 'text-slate-400'}`}
                                    >
                                        {r}s
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Upload Area */}
                        <div className="p-12 bg-purple-50/50 rounded-[3rem] border-2 border-dashed border-purple-200 text-center relative group transition-all hover:bg-purple-50">
                            <input 
                                type="file" 
                                accept=".csv" 
                                className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            const text = event.target?.result as string;
                                            const rows = text.split('\n').slice(1);
                                            const parsed = rows.map(row => {
                                                const parts = row.split(',');
                                                return { name: parts[0]?.trim(), email: parts[1]?.trim(), phone: parts[2]?.trim() };
                                            }).filter(p => p.email && p.email.includes('@'));
                                            setBulkList(prev => [...prev, ...parsed]);
                                        };
                                        reader.readAsText(file);
                                    }
                                }}
                            />
                            <div className="space-y-4 relative z-10">
                                <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl shadow-purple-200 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500">
                                    <Upload className="text-[#6C3BFF]" size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 font-sans">Drop CSV File Here</h3>
                                    <p className="text-slate-400 text-xs mt-2 font-medium">
                                        Columns required: <span className="text-[#6C3BFF] font-bold">Name, Email, Phone</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* List Preview */}

                        {/* List Preview */}
                        {bulkList.length > 0 && (
                            <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/20 animate-in zoom-in-95 duration-500">
                                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#6C3BFF] rounded-full flex items-center justify-center text-white text-xs font-black">
                                            {bulkList.length}
                                        </div>
                                        <h3 className="font-bold text-slate-900 font-sans">Detected Members</h3>
                                    </div>
                                    <button 
                                        onClick={() => setBulkList([])}
                                        className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest px-4 py-2 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        Clear List
                                    </button>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50">
                                                <th className="px-8 py-4">Full Name</th>
                                                <th className="px-8 py-4">Email Address</th>
                                                <th className="px-8 py-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {bulkList.map((m, i) => (
                                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-5 text-sm font-bold text-slate-900">{m.name || 'N/A'}</td>
                                                    <td className="px-8 py-5 text-sm font-medium text-slate-500">{m.email}</td>
                                                    <td className="px-8 py-5 text-right">
                                                        <button 
                                                            onClick={() => setBulkList(prev => prev.filter((_, idx) => idx !== i))}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-white hover:shadow-md rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-8 bg-slate-50/50 border-t border-slate-50">
                                    <button 
                                        disabled={isOnboarding}
                                        onClick={async () => {
                                            try {
                                                setIsOnboarding(true);
                                                const res = await fetch(`${API_BASE_URL}/api/v1/institution/members/bulk`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        institution_id: institutionId,
                                                        role: onboardingRole,
                                                        members: bulkList
                                                    })
                                                });
                                                if (res.ok) {
                                                    const result = await res.json();
                                                    alert(`Successfully onboarded ${result.added} ${onboardingRole}s!`);
                                                    setBulkList([]);
                                                }
                                            } catch (err) {
                                                alert("Bulk onboarding failed");
                                            } finally {
                                                setIsOnboarding(false);
                                            }
                                        }}
                                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#6C3BFF] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-purple-100"
                                    >
                                        {isOnboarding ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} className="fill-white" />}
                                        {isOnboarding ? 'Processing...' : `Onboard All ${onboardingRole}s Now`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'blocked':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Blocked Candidates & Organizations</h2>
                            <p className="text-sm text-slate-500">Manage entities that are restricted from your events.</p>
                        </div>
                        <div className="p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                            <ShieldAlert size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No blocked entities found</p>
                        </div>
                    </div>
                );
            case 'plan':
                return (
                    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500 font-sans">
                        <div className="space-y-1 border-b border-slate-100 pb-8">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Plans & Subscription</h2>
                            <p className="text-sm text-slate-400 font-medium">All plans are currently free — pick what fits your needs.</p>
                        </div>

                        {plansLoading && !plansData && (
                            <div className="flex justify-center py-24">
                                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            </div>
                        )}

                        {plansData && (
                            <>
                                {eventPackages && eventPackages.length > 0 && (
                                    <div className="max-w-4xl mx-auto mb-6 px-4">
                                        <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">Event Packages</h4>
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {eventPackages.map((p: any, i: number) => (
                                                <a key={i} href={p.url || p.link} target="_blank" rel="noreferrer" className="p-4 bg-white rounded-xl border border-slate-100 hover:shadow-md transition-all">
                                                    <div className="text-sm font-bold text-[#6C3BFF]">{p.title || p.name || p.label || p.url}</div>
                                                    <div className="text-xs text-slate-400 mt-1 truncate">{p.url || p.link}</div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="max-w-4xl mx-auto px-4 mb-8">
                                    <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200">Event Package</p>
                                            <h4 className="text-2xl font-black">Hackathon Event Package</h4>
                                            <p className="text-indigo-100 text-sm max-w-lg">Enables Problem Statements management, Team Selections, Participant Portal, and Participant Card for your events.</p>
                                            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                                                <span className="px-3 py-1 rounded-full bg-white/10">Problem Statements</span>
                                                <span className="px-3 py-1 rounded-full bg-white/10">Team Selections</span>
                                                <span className="px-3 py-1 rounded-full bg-white/10">Participant Portal</span>
                                                <span className="px-3 py-1 rounded-full bg-white/10">Participant Card</span>
                                            </div>
                                        </div>
                                        <div className="text-center shrink-0">
                                            <p className="text-3xl font-black">₹0</p>
                                            <p className="text-indigo-200 text-xs font-bold mt-1">Free — Subscribe now</p>
                                            <button
                                                onClick={handleSubscribe}
                                                disabled={togglingPackage || hackathonPackageEnabled}
                                                className={`mt-4 px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all disabled:opacity-60 ${hackathonPackageEnabled ? 'bg-white/20 text-white cursor-default' : 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-xl shadow-indigo-900/20'}`}
                                            >
                                                {togglingPackage ? <Loader2 size={16} className="animate-spin" /> : hackathonPackageEnabled ? 'Subscribed' : 'Subscribe Now'}
                                            </button>
                                            {hackathonPackageEnabled && (
                                                <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center justify-center gap-1"><CheckCircle2 size={12} /> Active — Payment recorded</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center space-y-2 py-8">
                                    <h3 className="text-4xl font-black text-slate-800">Available Plans</h3>
                                    <p className="text-sm text-slate-400 font-medium tracking-wide">All at no cost — choose the plan that works best for you</p>
                                    <p className="text-xs font-black uppercase tracking-widest text-[#6C3BFF]">
                                        Active Subscription: {plansData.plans.find((p: any) => p.id === plansData.currentPlanId)?.name || plansData.currentPlanId}
                                    </p>
                                    {plansData.pendingPlan && (
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-amber-100 text-amber-700 mt-2">
                                            Pending change: {plansData.pendingPlan.plan_name}
                                            <span className="text-amber-500">•</span>
                                            Demo Mode — payment confirmation is simulated.
                                        </div>
                                    )}
                                    {plansData.expiry && plansData.expiry.expires_at && (
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${plansData.expiry.is_expired ? 'bg-red-100 text-red-700' : plansData.expiry.days_remaining <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                            {plansData.expiry.is_expired ? (
                                                <>Expired on {new Date(plansData.expiry.expires_at).toLocaleDateString()}</>
                                            ) : (
                                                <>Valid until {new Date(plansData.expiry.expires_at).toLocaleDateString()} ({plansData.expiry.days_remaining} days remaining)</>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 px-4">
                                    {plansData.plans.map((plan: any) => {
                                        const isCurrent = plan.id === plansData.currentPlanId;
                                        const isPending = plansData.pendingPlan?.plan_id === plan.id;
                                        return (
                                            <div key={plan.id} className={`p-8 bg-white border rounded-[2.5rem] flex flex-col hover:shadow-xl transition-all ${plan.isRecommended ? 'border-2 border-blue-500 shadow-2xl shadow-blue-50 scale-[1.03] z-10' : 'border-slate-100'}`}>
                                                {plan.isRecommended && (
                                                    <div className="absolute top-6 right-6 px-3 py-1 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-md">Recommended</div>
                                                )}
                                                <div className="relative mb-6 space-y-2">
                                                    <h4 className="text-xl font-black text-slate-700">{plan.name}</h4>
                                                    <p className="text-4xl font-black text-slate-800">{plan.priceLabel === 'Free' ? 'Free' : `${plan.currency}${plan.price}`}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">{plan.duration}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleSelectPlan(plan)}
                                                    disabled={isCurrent || isPending || selectingPlanId === plan.id}
                                                    className={`w-full py-4 rounded-full font-black text-sm uppercase tracking-widest mb-10 transition-all ${isCurrent || isPending ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-[#2563EB] text-white hover:bg-[#1E40AF] shadow-lg shadow-blue-100 cursor-pointer'} ${selectingPlanId === plan.id ? 'opacity-90 cursor-wait' : ''}`}
                                                >
                                                    {isCurrent ? (
                                                        'Current Plan'
                                                    ) : isPending ? (
                                                        'Pending Confirmation'
                                                    ) : selectingPlanId === plan.id ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Loader2 size={16} className="animate-spin" />
                                                            <span>Preparing...</span>
                                                        </div>
                                                    ) : (
                                                        plan.cta
                                                    )}
                                                </button>
                                                <div className="space-y-6 flex-1">
                                                    <p className="text-sm font-black text-slate-700">Includes:</p>
                                                    <ul className="space-y-4">
                                                        {plan.features.map((f: string, i: number) => (
                                                            <li key={i} className="flex items-start gap-3 text-xs font-bold text-slate-500 leading-relaxed relative pl-4">
                                                                <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                                                {f}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <AnimatePresence>
                                    {planModalOpen && selectedPlan && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4"
                                        >
                                            <motion.div
                                                initial={{ y: 24, scale: 0.98 }}
                                                animate={{ y: 0, scale: 1 }}
                                                exit={{ y: 24, scale: 0.98 }}
                                                className="w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
                                            >
                                                <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Subscription Confirmation</p>
                                                            <h3 className="mt-2 text-2xl font-black text-slate-900">Review {selectedPlan.name}</h3>
                                                            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
                                                                Demo Mode — payment flow is simulated for development purposes. In production, this is where the checkout gateway would open.
                                                            </p>
                                                        </div>
                                                        <div className={`px-3 py-2 rounded-full text-xs font-black uppercase tracking-widest ${planModalAction === 'downgrade' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {planModalAction === 'downgrade' ? 'Scheduled downgrade' : 'Ready to activate'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-6 md:p-8 space-y-6">
                                                    {planModalError && (
                                                        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                                                            {planModalError}
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="rounded-3xl border border-slate-100 p-5 bg-slate-50/70">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Current Plan</p>
                                                            <p className="mt-2 text-xl font-black text-slate-900">{plansData.plans.find((p: any) => p.id === plansData.currentPlanId)?.name || plansData.currentPlanId}</p>
                                                            <p className="mt-2 text-sm text-slate-500">You keep this plan until the next billing event when downgrading.</p>
                                                        </div>
                                                        <div className="rounded-3xl border border-indigo-100 p-5 bg-indigo-50/60">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Selected Plan</p>
                                                            <p className="mt-2 text-xl font-black text-slate-900">{selectedPlan.name}</p>
                                                            <p className="mt-2 text-sm text-slate-600">{selectedPlan.priceLabel === 'Free' ? '₹0 demo pricing' : `${selectedPlan.currency}${selectedPlan.price}`}</p>
                                                            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-indigo-500">{selectedPlan.duration}</p>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Included Features</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {selectedPlan.features?.map((feature: string, index: number) => (
                                                                <div key={index} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600">
                                                                    <CheckCircle2 size={16} className="mt-0.5 text-emerald-500 shrink-0" />
                                                                    <span>{feature}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-3xl bg-slate-50 p-5 border border-slate-100 text-sm text-slate-600">
                                                        <p className="font-black text-slate-800 mb-2">Billing behavior</p>
                                                        <ul className="space-y-2 leading-relaxed">
                                                            <li>• Upgrades activate immediately after confirmation in demo mode.</li>
                                                            <li>• Downgrades are queued for the next cycle when an expiry date exists.</li>
                                                            <li>• Plan state is stored as pending until you confirm or cancel.</li>
                                                        </ul>
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelPendingPlan}
                                                            disabled={planModalLoading}
                                                            className="px-5 py-3 rounded-full border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-50 disabled:opacity-60"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleConfirmPlanChange}
                                                            disabled={planModalLoading}
                                                            className="px-5 py-3 rounded-full bg-[#2563EB] text-white font-black uppercase tracking-widest text-xs hover:bg-[#1E40AF] disabled:opacity-60 flex items-center justify-center gap-2"
                                                        >
                                                            {planModalLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                                            <span>Continue to Payment</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="pt-24 space-y-12 pb-12">
                                    <h3 className="text-4xl font-black text-slate-800 text-center font-sans">Frequently asked questions</h3>
                                    <div className="max-w-4xl mx-auto space-y-3">
                                        {plansData.faqs.map((faq: any, i: number) => (
                                            <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-700 text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                                                >
                                                    {faq.q}
                                                    {expandedFaq === i ? <ChevronUp size={18} className="shrink-0 text-slate-400" /> : <ChevronDown size={18} className="shrink-0 text-slate-400" />}
                                                </button>
                                                <AnimatePresence>
                                                    {expandedFaq === i && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <p className="px-6 pb-5 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {!plansLoading && !plansData && (
                            <div className="py-24 text-center text-slate-400 font-medium text-sm">
                                Unable to load plans. Please try again later.
                            </div>
                        )}
                    </div>
                );

            case 'rules':
                return (
                    <CertificateRulesSection institutionId={institutionId} />
                );

            default:
                return null;
        }
    };

    const CertificateRulesSection: React.FC<{ institutionId: string }> = ({ institutionId }) => {
        const [events, setEvents] = useState<any[]>([]);
        const [selectedEventId, setSelectedEventId] = useState<string>('');
        const [rules, setRules] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);
        const [saving, setSaving] = useState(false);
        const [editingRule, setEditingRule] = useState<any | null>(null);
        const [showForm, setShowForm] = useState(false);
        const [formData, setFormData] = useState({
            rule_name: '', rule_description: '', certificate_type: 'winner', rule_type: 'top_n', rule_config: { top_n: 1 }, status: 'active',
        });
        const [ruleIdCounter, setRuleIdCounter] = useState(1);

        useEffect(() => { fetchEvents(); }, []);
        useEffect(() => { if (selectedEventId) fetchRules(); }, [selectedEventId]);

        const fetchEvents = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${institutionId}`, { headers: { ...authHeaders() } });
                if (res.ok) {
                    const data = await res.json();
                    const list = Array.isArray(data) ? data : data?.events || data?.data || [];
                    setEvents(list);
                    if (list.length > 0 && !selectedEventId) setSelectedEventId(list[0]._id || list[0].event_id);
                }
            } catch { } finally { setLoading(false); }
        };

        const fetchRules = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/certificates/rules/?event_id=${selectedEventId}`, { headers: { ...authHeaders() } });
                if (res.ok) { const data = await res.json(); setRules(Array.isArray(data) ? data : []); }
                else setRules([]);
            } catch { setRules([]); }
        };

        const certificateTypes = [
            { value: 'winner', label: 'Winner', icon: <Trophy className="w-4 h-4 text-yellow-500" />, defaultCriteria: 'Top 1 Team', defaultRuleType: 'top_n', defaultConfig: { top_n: 1 } },
            { value: 'runner_up', label: 'Runner Up', icon: <Medal className="w-4 h-4 text-gray-400" />, defaultCriteria: 'Rank 2 - 3', defaultRuleType: 'rank_range', defaultConfig: { rank_start: 2, rank_end: 3 } },
            { value: 'finalist', label: 'Finalist', icon: <Award className="w-4 h-4 text-orange-500" />, defaultCriteria: 'Rank 4 - 20', defaultRuleType: 'rank_range', defaultConfig: { rank_start: 4, rank_end: 20 } },
            { value: 'participation', label: 'Participation', icon: <CheckCircle className="w-4 h-4 text-blue-500" />, defaultCriteria: 'All registered participants', defaultRuleType: 'registration_completed', defaultConfig: {} },
            { value: 'non_qualifier', label: 'Non-Qualifier', icon: <AlertCircle className="w-4 h-4 text-slate-500" />, defaultCriteria: 'Registered, no qualifying score', defaultRuleType: 'submission_completed', defaultConfig: { required_stage: 'final' } },
        ];

        const statusColors: Record<string, string> = { draft: 'bg-slate-100 text-slate-600', active: 'bg-emerald-100 text-emerald-700', archived: 'bg-amber-100 text-amber-700' };

        const getDefaultConfig = (ruleType: string): any => {
            switch (ruleType) {
                case 'top_n': return { top_n: 1 };
                case 'rank_range': return { rank_start: 1, rank_end: 10 };
                case 'rank': return { rank: 1 };
                case 'score_threshold': return { minimum_score: 0 };
                case 'submission_completed': return { required_stage: '' };
                case 'stage_completed': return { stage_id: '' };
                default: return {};
            }
        };

        const handleAddRule = () => {
            setEditingRule(null);
            setFormData({ rule_name: '', rule_description: '', certificate_type: 'winner', rule_type: 'top_n', rule_config: { top_n: 1 }, status: 'active' });
            setShowForm(true);
        };

        const handleEditRule = (rule: any) => {
            setEditingRule(rule);
            const ct = certificateTypes.find(t => t.value === rule.certificate_type);
            const ruleConfig = rule.rule_configuration || ct?.defaultConfig || {};
            setFormData({
                rule_name: rule.rule_name || '', rule_description: rule.rule_description || '',
                certificate_type: rule.certificate_type || 'winner', rule_type: rule.rule_type || ct?.defaultRuleType || 'custom',
                rule_config: ruleConfig, status: rule.status || 'active',
            });
            setShowForm(true);
        };

        const handleDeleteRule = async (ruleId: string) => {
            if (!confirm('Delete this rule?')) return;
            try { const res = await fetch(`${API_BASE_URL}/api/v1/certificates/rules/${ruleId}`, { method: 'DELETE', headers: { ...authHeaders() } }); if (res.ok) fetchRules(); } catch { }
        };

        const handleSaveRule = async () => {
            setSaving(true);
            try {
                const ct = certificateTypes.find(t => t.value === formData.certificate_type) || certificateTypes[0];
                const ruleId = editingRule?.rule_id || `rule_${Date.now()}_${ruleIdCounter}`;
                if (!editingRule) setRuleIdCounter(c => c + 1);
                const payload = {
                    rule_id: ruleId, rule_name: formData.rule_name || ct.label,
                    rule_description: formData.rule_description || '',
                    rule_category: ['winner', 'runner_up', 'finalist'].includes(formData.certificate_type) ? 'achievement' : 'participation',
                    rule_type: formData.rule_type, event_id: selectedEventId, certificate_type: formData.certificate_type,
                    template_id: `default_${formData.certificate_type}`, template_version: 1, status: formData.status, priority: 0,
                    rule_configuration: typeof formData.rule_config === 'object' ? formData.rule_config : {}, snapshot_required: false, created_by: '', updated_by: '',
                };
                const url = editingRule ? `${API_BASE_URL}/api/v1/certificates/rules/${ruleId}` : `${API_BASE_URL}/api/v1/certificates/rules/`;
                const res = await fetch(url, { method: editingRule ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(payload) });
                if (res.ok) { setShowForm(false); setEditingRule(null); fetchRules(); }
                else { const err = await res.json(); alert(err.detail || 'Failed to save rule'); }
            } catch { alert('Failed to save rule'); } finally { setSaving(false); }
        };

        const selectedEvent = events.find((e: any) => (e._id || e.event_id) === selectedEventId);

        if (loading) {
            return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#6C3BFF]" size={32} /></div>;
        }

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-1 border-b border-slate-100 pb-8">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Certificate Rules Management</h2>
                    <p className="text-sm text-slate-400 font-medium">Manage eligibility rules for all events — past, present, and future.</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Event</label>
                        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}
                            className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none min-w-[240px]">
                            {events.length === 0 && <option value="">No events available</option>}
                            {events.map((ev: any) => (
                                <option key={ev._id || ev.event_id} value={ev._id || ev.event_id}>{ev.title || ev.name || ev.event_name}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={handleAddRule} className="flex items-center gap-2 px-6 py-3 bg-[#6C3BFF] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#5A2EE5] transition-all shadow-lg shadow-purple-100">
                        <Plus size={16} /> Add Rule
                    </button>
                </div>

                {selectedEvent && events.length > 0 && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <div className="flex items-center gap-3">
                            <Award className="text-indigo-500" size={20} />
                            <span className="font-bold text-sm text-indigo-700">Rules for: {selectedEvent.title || selectedEvent.name || selectedEvent.event_name}</span>
                            <span className="text-xs text-indigo-400 ml-auto">{rules.length} rule{rules.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                )}

                {showForm && (
                    <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">{editingRule ? 'Edit Rule' : 'New Rule'}</h3>
                            <button onClick={() => { setShowForm(false); setEditingRule(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={18} className="text-slate-400" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rule Name</label>
                                <input type="text" value={formData.rule_name} onChange={(e) => setFormData(f => ({ ...f, rule_name: e.target.value }))}
                                    placeholder="e.g., Winner" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificate Type</label>
                                <select value={formData.certificate_type} onChange={(e) => {
                                    const ct = certificateTypes.find(t => t.value === e.target.value);
                                    setFormData(f => ({
                                        ...f, certificate_type: e.target.value,
                                        rule_type: ct?.defaultRuleType || 'custom',
                                        rule_config: ct?.defaultConfig || getDefaultConfig(ct?.defaultRuleType || 'custom'),
                                    }));
                                }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none">
                                    {certificateTypes.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rule Logic</label>
                                <select value={formData.rule_type} onChange={(e) => {
                                    const newType = e.target.value;
                                    setFormData(f => ({
                                        ...f, rule_type: newType,
                                        rule_config: ['top_n', 'rank_range', 'rank', 'score_threshold', 'submission_completed', 'stage_completed'].includes(newType)
                                            ? { ...getDefaultConfig(newType) } : {},
                                    }));
                                }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none">
                                    <option value="top_n">Top N</option>
                                    <option value="rank_range">Rank Range</option>
                                    <option value="rank">Exact Rank</option>
                                    <option value="score_threshold">Score Threshold</option>
                                    <option value="submission_completed">Submission Completed</option>
                                    <option value="stage_completed">Stage Completed</option>
                                    <option value="registration_completed">Registration Completed</option>
                                    <option value="attendance_completed">Attendance Completed</option>
                                    <option value="custom">Custom (JSON)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                                <select value={formData.status} onChange={(e) => setFormData(f => ({ ...f, status: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none">
                                    <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>
                        {formData.rule_type === 'top_n' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Number of Top Positions</label>
                                <input type="number" min={1} defaultValue={formData.rule_config.top_n ?? 1} key={editingRule?.rule_id || 'new-topn'}
                                  onBlur={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setFormData(f => ({ ...f, rule_config: { ...f.rule_config, top_n: v } })); }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                            </div>
                        )}
                        {formData.rule_type === 'rank_range' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rank Start</label>
                                    <input type="number" min={1} value={formData.rule_config.rank_start ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, rank_start: parseInt(e.target.value) || 1 } }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rank End</label>
                                    <input type="number" min={1} value={formData.rule_config.rank_end ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, rank_end: parseInt(e.target.value) || 1 } }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                                </div>
                            </div>
                        )}
                        {formData.rule_type === 'rank' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exact Rank</label>
                                <input type="number" min={1} value={formData.rule_config.rank ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, rank: parseInt(e.target.value) || 1 } }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                            </div>
                        )}
                        {formData.rule_type === 'score_threshold' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Minimum Score</label>
                                <input type="number" min={0} value={formData.rule_config.minimum_score ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, minimum_score: parseInt(e.target.value) || 0 } }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                            </div>
                        )}
                        {formData.rule_type === 'submission_completed' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Required Stage</label>
                                <input type="text" value={formData.rule_config.required_stage ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, required_stage: e.target.value } }))}
                                    placeholder="e.g., final" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                            </div>
                        )}
                        {formData.rule_type === 'stage_completed' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage ID</label>
                                <input type="text" value={formData.rule_config.stage_id ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, stage_id: e.target.value } }))}
                                    placeholder="Stage identifier" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                            </div>
                        )}
                        {formData.rule_type === 'custom' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configuration (JSON)</label>
                                <textarea value={typeof formData.rule_config === 'object' ? JSON.stringify(formData.rule_config, null, 2) : formData.rule_config}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        try { setFormData(f => ({ ...f, rule_config: JSON.parse(val) })); }
                                        catch { setFormData(f => ({ ...f, rule_config: val })); }
                                    }}
                                    rows={4} placeholder='{"key": "value"}' className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-mono focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description (optional)</label>
                            <textarea value={formData.rule_description} onChange={(e) => setFormData(f => ({ ...f, rule_description: e.target.value }))} rows={2}
                                placeholder="Internal notes about this rule..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button onClick={() => { setShowForm(false); setEditingRule(null); }}
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                            <button onClick={handleSaveRule} disabled={saving}
                                className="flex items-center gap-2 px-8 py-3 bg-[#6C3BFF] text-white text-sm font-semibold rounded-xl hover:bg-[#5A2EE5] transition-all shadow-lg shadow-purple-100 disabled:opacity-50">
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {editingRule ? 'Update Rule' : 'Create Rule'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    {events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Award size={48} className="mb-4 opacity-30" />
                            <p className="font-bold text-sm">No events found</p>
                            <p className="text-xs mt-1">Create an event first to manage certificate rules.</p>
                        </div>
                    ) : rules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Award size={48} className="mb-4 opacity-30" />
                            <p className="font-bold text-sm">No rules defined for this event</p>
                            <p className="text-xs mt-1">Click "Add Rule" to create certificate eligibility rules.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rule Name</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificate Type</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Criteria</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rules.map((rule: any) => {
                                        const ct = certificateTypes.find(t => t.value === rule.certificate_type);
                                        return (
                                            <tr key={rule.rule_id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                                                <td className="px-6 py-4"><div className="font-semibold text-slate-800">{rule.rule_name}</div></td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {ct?.icon}
                                                        <span className="text-sm font-medium text-slate-700">{ct?.label || rule.certificate_type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500">
                                                  {rule.rule_type === 'top_n' ? `Top ${rule.rule_configuration?.top_n ?? '?'}` :
                                                   rule.rule_type === 'rank_range' ? `Rank ${rule.rule_configuration?.rank_start ?? '?'} - ${rule.rule_configuration?.rank_end ?? '?'}` :
                                                   rule.rule_type === 'rank' ? `Rank ${rule.rule_configuration?.rank ?? '?'}` :
                                                   rule.rule_type === 'score_threshold' ? `Score ≥ ${rule.rule_configuration?.minimum_score ?? '?'}` :
                                                   rule.rule_type === 'submission_completed' ? `On ${rule.rule_configuration?.required_stage ?? '?'} submit` :
                                                   rule.rule_type === 'stage_completed' ? `Stage ${rule.rule_configuration?.stage_id ?? '?'} done` :
                                                   rule.rule_type === 'registration_completed' ? 'Registered' :
                                                   rule.rule_type === 'attendance_completed' ? 'Attended' :
                                                   rule.rule_description || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColors[rule.status] || 'bg-slate-100 text-slate-600'}`}>{rule.status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleEditRule(rule)} className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-indigo-600"><Edit3 size={16} /></button>
                                                        <button onClick={() => handleDeleteRule(rule.rule_id)} className="p-2 hover:bg-red-50 rounded-lg transition-all text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000 pb-20 font-sans">
            <div className="flex items-end justify-between px-2">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Institutional Settings</h1>
                    <p className="text-slate-500 mt-3 text-xl font-medium">Control your digital presence and operational preferences.</p>
                </div>
                <div className="flex items-center gap-4">
                    <AnimatePresence>
                        {saveSuccess && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-lg shadow-emerald-50"
                            >
                                <CheckCircle2 size={20} />
                                <span className="text-sm font-black uppercase tracking-[0.1em]">Identity Synchronized</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Package status badge */}
                    <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        {packageStatusLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin text-[#6C3BFF]" size={18} />
                                <span className="text-xs font-black text-slate-500 uppercase">Checking package</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${packageStatus?.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {packageStatus?.enabled ? <CheckCircle2 size={18} /> : <Shield size={18} />}
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-black uppercase tracking-widest">
                                        {packageStatus?.enabled ? 'Package Unlocked' : 'Package Locked'}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        {packageStatus?.subscription_status ? `${packageStatus.subscription_status}` : 'no subscription'} · {packageStatus?.last_payment ? `${packageStatus.last_payment.currency}${packageStatus.last_payment.amount}` : (packageStatus?.payment_status === 'free' ? '₹0' : (packageStatus?.payment_status || packageStatus?.payment_provider || 'free'))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-80 space-y-3">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center justify-between group px-8 py-5 rounded-[2rem] transition-all ${
                                activeSection === section.id 
                                    ? 'bg-white text-[#6C3BFF] shadow-2xl shadow-purple-100/50 border-r-4 border-[#6C3BFF]' 
                                    : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'
                            }`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`p-3 rounded-2xl transition-all ${
                                    activeSection === section.id ? 'bg-purple-50 scale-110 shadow-lg shadow-purple-50' : 'bg-slate-50 group-hover:bg-white group-hover:shadow-sm'
                                }`}>
                                    <section.icon size={22} />
                                </div>
                                <span className="font-black text-sm uppercase tracking-widest">{section.label}</span>
                            </div>
                            <ChevronRight size={18} className={`transition-transform duration-500 ${activeSection === section.id ? 'translate-x-1 opacity-100' : 'opacity-0'}`} />
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="bg-white/40 backdrop-blur-3xl p-3 rounded-[4rem] border border-white/40 shadow-2xl shadow-slate-200/20">
                        <div className="bg-white p-12 lg:p-16 rounded-[3.5rem] shadow-sm relative overflow-hidden">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50/50 rounded-full blur-[120px] -z-10" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50/30 rounded-full blur-[100px] -z-10" />
                            
                            {renderSectionContent()}

                            <div className="mt-16 pt-10 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {saving && (
                                        <>
                                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                                                Transmitting Data...
                                            </p>
                                        </>
                                    )}
                                </div>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-3 px-12 py-5 bg-[#6C3BFF] text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-[#5A2EE5] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-purple-200 disabled:opacity-50 disabled:scale-100"
                                >
                                    {saving ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Save size={20} />
                                    )}
                                    {saving ? 'Saving...' : 'Confirm Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;

