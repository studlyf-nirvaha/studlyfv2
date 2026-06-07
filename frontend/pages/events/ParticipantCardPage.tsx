import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { useAuth } from '../../AuthContext';
import html2canvas from 'html2canvas';
import { ArrowLeft, CheckCircle2, Copy, Download, Loader2, Linkedin, Sparkles, Save, Shield, Users } from 'lucide-react';

const ParticipantCardPage: React.FC = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [card, setCard] = useState<any>(null);
    const [portal, setPortal] = useState<any>(null);
    const [regId, setRegId] = useState('');
    const [bulletOne, setBulletOne] = useState('');
    const [bulletTwo, setBulletTwo] = useState('');
    const [bulletThree, setBulletThree] = useState('');
    const [linkedinPost, setLinkedinPost] = useState('');
    const [copied, setCopied] = useState(false);
    const [photo, setPhoto] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const posterRef = useRef<HTMLDivElement>(null);

    const participantId = user?.user_id || user?._id || '';

    const load = async () => {
        if (!eventId || !participantId) return;
        setLoading(true);
        setError('');
        try {
            const [cardRes, portalRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/participant-card?event_id=${encodeURIComponent(eventId)}&participant_id=${encodeURIComponent(participantId)}`, { headers: { ...authHeaders() } }),
                fetch(`${API_BASE_URL}/api/v1/hackathons/events/${eventId}/portal`, { headers: { ...authHeaders() } }),
            ]);
            if (cardRes.ok) {
                const c = await cardRes.json();
                setCard(c);
                setRegId(c.regId || '');
                const bullets = Array.isArray(c.bulletPoints) ? c.bulletPoints : [];
                setBulletOne(bullets[0] || '');
                setBulletTwo(bullets[1] || '');
                setBulletThree(bullets[2] || '');
                setLinkedinPost(c.linkedinPost || '');
            } else {
                const data = await cardRes.json().catch(() => ({}));
                throw new Error(data.detail || 'Could not load participant card');
            }
            if (portalRes.ok) {
                setPortal(await portalRes.json());
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load participant card');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [eventId, participantId]);

    const sponsorNames = useMemo(() => {
        const list = portal?.config?.sponsors;
        return Array.isArray(list) ? list : [];
    }, [portal]);

    const generateLinkedIn = () => {
        const bullets = [bulletOne, bulletTwo, bulletThree].filter(Boolean);
        const lines = [
            `Proud to represent ${card?.eventName || 'this event'} with ${card?.teamName || 'my team'}!`,
            '',
            `Highlights:`,
            ...bullets.map((b: string) => `• ${b}`),
            '',
            `Excited for the journey ahead. #Hackathon #Innovation #Studlyf`,
        ];
        setLinkedinPost(lines.join('\n'));
    };

    const save = async () => {
        if (!eventId || !participantId) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/participant-card`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    event_id: eventId,
                    participant_id: participantId,
                    reg_id: regId,
                    bullet_points: [bulletOne, bulletTwo, bulletThree].filter(Boolean),
                    linkedin_post: linkedinPost,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to save card');
            }
            await load();
        } catch (e: any) {
            setError(e.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setPhoto(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const downloadPoster = async () => {
        if (!posterRef.current) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(posterRef.current, { scale: 2, backgroundColor: '#fdfae7', useCORS: true });
            const link = document.createElement('a');
            link.download = `${card?.eventName?.replace(/\s+/g, '_') || 'poster'}_${card?.participantName?.replace(/\s+/g, '_') || 'card'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch { /* silent */ } finally {
            setDownloading(false);
        }
    };

    const copyPost = async () => {
        await navigator.clipboard.writeText(linkedinPost || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pt-32 px-6">
                <div className="max-w-2xl mx-auto space-y-8">
                    <div className="w-64 h-10 bg-slate-200 rounded-xl animate-pulse"></div>
                    <div className="w-full h-96 bg-white rounded-[3rem] border border-slate-100 animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!card) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
                <div className="max-w-md space-y-4">
                    <Shield size={48} className="mx-auto text-slate-300" />
                    <h1 className="text-3xl font-black text-slate-900">Participant card unavailable</h1>
                    <p className="text-slate-500 font-medium">Please register for the event first, then open your participant card again.</p>
                    <button onClick={() => navigate(`/events/${eventId}/package`)} className="px-6 py-3 rounded-full bg-[#6C3BFF] text-white font-bold">Back to Portal</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(`/events/${eventId}/package`)} className="p-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#6C3BFF]">Participant Card</p>
                            <h1 className="text-3xl font-black tracking-tight">{card.eventName}</h1>
                            <p className="text-slate-500 font-medium mt-1">Edit your Reg ID, bullet points, and LinkedIn draft for this event.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={copyPost} className="px-4 py-3 rounded-full bg-white border border-slate-200 font-bold text-sm flex items-center gap-2">
                            {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                            {copied ? 'Copied' : 'Copy post'}
                        </button>
                        <button onClick={save} disabled={saving} className="px-4 py-3 rounded-full bg-[#6C3BFF] text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save
                        </button>
                    </div>
                </div>

                {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 font-medium">{error}</div>}

                <section className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
                    <div className="p-6 rounded-[2rem] bg-gradient-to-br from-[#2A1758] to-[#7c154b] text-white shadow-2xl space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-[0.25em]">
                            <Users size={14} /> {card.role || 'Participant'}
                        </div>
                        <div>
                            <p className="text-white/70 text-sm">{card.participantName}</p>
                            <h2 className="text-3xl font-black tracking-tight mt-1">{card.eventName}</h2>
                            <p className="text-white/80 mt-2">{card.college}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.25em]">Team</p>
                                <p className="font-bold mt-1">{card.teamName || 'Independent'}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.25em]">Reg ID</p>
                                <p className="font-bold mt-1">{regId || 'Not set'}</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.25em] mb-2">Sponsors</p>
                            <div className="flex flex-wrap gap-2">
                                {sponsorNames.length > 0 ? sponsorNames.map((s: any, idx: number) => (
                                    <span key={idx} className="px-3 py-1 rounded-full bg-white text-slate-900 text-xs font-bold">{s.name || s.label || 'Sponsor'}</span>
                                )) : <span className="text-white/70 text-sm">No sponsor list configured.</span>}
                            </div>
                        </div>
                    </div>

                        <div className="space-y-6">
                            <div className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Reg ID</p>
                                    <input value={regId} onChange={e => setRegId(e.target.value)} placeholder="Last 4-6 digits or event reg ID" className="mt-2 w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Profile photo</p>
                                    <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-orange-300 transition-all bg-slate-50">
                                        {photo ? <img src={photo} alt="" className="h-full object-contain rounded-2xl" /> : <span className="text-slate-400 font-medium text-sm">Click to upload photo</span>}
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                                    </label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input value={bulletOne} onChange={e => setBulletOne(e.target.value)} placeholder="Bullet point 1" className="p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none" />
                                    <input value={bulletTwo} onChange={e => setBulletTwo(e.target.value)} placeholder="Bullet point 2" className="p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none" />
                                    <input value={bulletThree} onChange={e => setBulletThree(e.target.value)} placeholder="Bullet point 3" className="p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none" />
                                </div>
                                <button onClick={generateLinkedIn} className="px-4 py-3 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center gap-2">
                                    <Sparkles size={16} /> Generate LinkedIn post
                                </button>
                            </div>

                        <div className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm space-y-3">
                            <div className="flex items-center gap-2">
                                <Linkedin size={18} className="text-[#6C3BFF]" />
                                <h3 className="text-lg font-black">LinkedIn post draft</h3>
                            </div>
                            <textarea value={linkedinPost} onChange={e => setLinkedinPost(e.target.value)} rows={10} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none font-mono text-sm leading-relaxed" placeholder="Generate or paste your LinkedIn post..." />
                        </div>
                    </div>
                </section>

                <section className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#6C3BFF]">Poster preview</p>
                        <button onClick={downloadPoster} disabled={downloading} className="px-4 py-3 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60">
                            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            {downloading ? 'Rendering…' : 'Download Poster'}
                        </button>
                    </div>
                    <div ref={posterRef} className="bg-[#fdfae7] rounded-2xl overflow-hidden border border-slate-200 p-4 space-y-3 text-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        <div className="text-[10px] font-black uppercase tracking-widest text-orange-600">India's Largest Summer AI Hackathon</div>
                        <div className="text-2xl font-black tracking-tighter">{card.eventName}</div>
                        <div className="flex items-center justify-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden shrink-0 border-2 border-white">
                                {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200" />}
                            </div>
                            <div className="text-left">
                                <div className="font-black text-orange-600">{card.participantName}</div>
                                <div className="text-xs font-semibold text-slate-600">{card.college}</div>
                                <div className="text-xs font-bold text-slate-500">{card.role}</div>
                                {regId && <div className="text-[10px] font-mono font-bold text-slate-400">REG: {regId}</div>}
                            </div>
                        </div>
                        {[bulletOne, bulletTwo, bulletThree].filter(Boolean).length > 0 && (
                            <div className="text-left space-y-1 text-sm text-slate-700">
                                {[bulletOne, bulletTwo, bulletThree].filter(Boolean).map((b, i) => (
                                    <div key={i} className="flex items-start gap-2"><span className="text-orange-500">•</span><span>{b}</span></div>
                                ))}
                            </div>
                        )}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">#Innovation #Hackathon #Studlyf</div>
                        {sponsorNames.length > 0 && (
                            <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {sponsorNames.map((s: any, idx: number) => (
                                    <span key={idx}>{s.name || s.label}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#6C3BFF] mb-3">Event metadata</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><span className="block text-slate-400 text-[10px] uppercase tracking-[0.25em]">Dates</span><strong>{card.eventDates || 'TBA'}</strong></div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><span className="block text-slate-400 text-[10px] uppercase tracking-[0.25em]">Venue</span><strong>{card.eventVenue || 'TBA'}</strong></div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><span className="block text-slate-400 text-[10px] uppercase tracking-[0.25em]">Email</span><strong className="truncate">{card.email}</strong></div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ParticipantCardPage;
