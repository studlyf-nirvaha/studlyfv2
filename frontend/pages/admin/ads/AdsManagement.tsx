import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Trash2, Eye, EyeOff, Edit3, Upload, X, GripVertical, ImageIcon, Film, Check } from 'lucide-react';
import { API_BASE_URL } from '../../../apiConfig';

export type AdCardType = 'video' | 'image' | 'video_image';

export interface AdItem {
    _id?: string;
    card_type: AdCardType;
    eyebrow: string;
    title: string;
    description: string;
    media_url: string;
    media_type: 'video' | 'image';
    secondary_media_url: string;
    secondary_media_type: 'video' | 'image';
    tag: string;
    badge: string;
    cta_text: string;
    cta_link: string;
    cta_style: string;
    pills: string[];
    color_scheme: string;
    bg_color: string;
    duration: string;
    wide_side: string;
    promo_tag: string;
    promo_stats: any[];
    order: number;
    active: boolean;
    show_cta?: boolean;
}

export const useFont = () => {};
export const useCSS = () => {};

export const renderCard = (ad: AdItem, idx: number) => {
    return (
        <div style={{ width: 400, padding: 24, background: '#1a1a1a', color: 'white', borderRadius: 20, fontFamily: 'sans-serif' }}>
            {ad.media_url && <img src={ad.media_url} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} alt="Preview" />}
            <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 }}>{ad.eyebrow}</div>
            <h3 style={{ fontSize: 24, fontWeight: 'bold', margin: '0 0 12px 0' }}>{ad.title}</h3>
            <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 20px 0', lineHeight: 1.5 }}>{ad.description}</p>
            <button style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>{ad.cta_text}</button>
        </div>
    );
};

const API = `${API_BASE_URL}/api/ads`;

const CARD_TYPES: { value: AdCardType; label: string; desc: string }[] = [
    { value: 'video', label: 'Video + Text', desc: 'Video file + Title & Description' },
    { value: 'image', label: 'Image + Text', desc: 'Image file + Title & Description' },
    { value: 'video_image', label: 'Video + Image', desc: 'Both Video and Image in one card' },
];

const CTA_STYLES = ['primary', 'dark', 'gold', 'sage', 'outline-light', 'white'];
const BG_COLORS = ['blue', 'green', 'amber', 'purple', 'teal', 'rose', 'soft-blue', 'soft-green', 'soft-amber'];
const COLOR_SCHEMES = ['dark', 'light'];

const EMPTY: Partial<AdItem> = {
    card_type: 'image', eyebrow: '', title: '', description: '', 
    media_url: '', media_type: 'image',
    secondary_media_url: '', secondary_media_type: 'image',
    tag: '', badge: '', cta_text: 'Enroll →', cta_link: '', cta_style: 'primary', pills: [],
    color_scheme: 'dark', bg_color: 'blue', duration: '', wide_side: 'dark',
    promo_tag: '', promo_stats: [], order: 0, active: true,
};

function getYoutubeEmbed(url: string) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

/* ─── Shared components ─────────────────────────── */
function MediaDropper({ preview, mediaType, onFile, onClear }: 
    { preview: string | null; mediaType: 'image' | 'video'; onFile: (f: File) => void; onClear: () => void }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handle = (f: File) => {
        if (!f) return;
        onFile(f);
    };

    return (
        <div 
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
            onClick={() => inputRef.current?.click()}
            style={{
                width: '100%', height: 200, border: `2px dashed ${dragging ? '#6366f1' : '#e5e7eb'}`,
                borderRadius: 12, background: dragging ? '#f5f3ff' : '#f9fafb',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all .2s', overflow: 'hidden', position: 'relative'
            }}>
            {preview ? (
                <>
                    {mediaType === 'video' ? (
                        getYoutubeEmbed(preview) ? (
                            <img src={`https://img.youtube.com/vi/${getYoutubeEmbed(preview)}/hqdefault.jpg`} className="w-full h-full object-contain bg-black" />
                        ) : (
                            <video src={preview} className="w-full h-full object-contain bg-black" />
                        )
                    ) : (
                        <img src={preview} className="w-full h-full object-contain bg-slate-50" />
                    )}
                    <button 
                        onClick={e => { e.stopPropagation(); onClear(); }}
                        style={{
                            position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.5)',
                            color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                        }}>
                        <X size={14} />
                    </button>
                </>
            ) : (
                <>
                    <Upload size={32} color="#9ca3af" style={{ marginBottom: 12 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>Click or Drop Media</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Image or Video</div>
                </>
            )}
            <input ref={inputRef} type="file" accept="image/*,video/*" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }} />
        </div>
    );
}

const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 16 }}>
        <label style={{
            display: 'block', fontSize: 12, fontWeight: 600, color: '#374151',
            marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em'
        }}>{label}</label>
        {children}
    </div>
);

/* ── Form panel ── */
function AdForm({ initial, onSave, onCancel, saving }:
    {
        initial: Partial<AdItem>; onSave: (fd: FormData, existing: Partial<AdItem>) => void;
        onCancel: () => void; saving: boolean
    }) {
    const [form, setForm] = useState<Partial<AdItem>>({ ...EMPTY, ...initial });
    
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(initial.media_url || null);
    
    const [secFile, setSecFile] = useState<File | null>(null);
    const [secPreview, setSecPreview] = useState<string | null>(initial.secondary_media_url || null);

    const [pillInput, setPillInput] = useState('');

    const set = (k: keyof AdItem, v: any) => setForm(f => {
        const next = { ...f, [k]: v };
        if (k === 'media_url' && v) {
            const isVid = getYoutubeEmbed(v) || v.match(/\.(mp4|webm|mov|ogg)$/i);
            if (isVid) next.media_type = 'video';
            else next.media_type = 'image';
        }
        return next;
    });

    const handleFile = (f: File) => {
        setFile(f);
        setPreview(URL.createObjectURL(f));
        set('media_type', f.type.startsWith('video') ? 'video' : 'image');
    };

    const handleSecFile = (f: File) => {
        setSecFile(f);
        setSecPreview(URL.createObjectURL(f));
        set('secondary_media_type', f.type.startsWith('video') ? 'video' : 'image');
    };

    const addPill = () => {
        if (!pillInput.trim()) return;
        set('pills', [...(form.pills || []), pillInput.trim()]);
        setPillInput('');
    };

    const removePill = (i: number) => set('pills', (form.pills || []).filter((_, idx) => idx !== i));

    const handleSubmit = () => {
        const fd = new FormData();
        const str = (v: any) => (v === undefined || v === null) ? '' : String(v);
        fd.append('card_type', str(form.card_type));
        fd.append('eyebrow', str(form.eyebrow));
        fd.append('title', str(form.title));
        fd.append('description', str(form.description));
        fd.append('media_type', str(form.media_type));
        fd.append('media_url', str(form.media_url || ''));
        fd.append('secondary_media_type', str(form.secondary_media_type));
        fd.append('secondary_media_url', str(form.secondary_media_url || ''));
        fd.append('tag', str(form.tag));
        fd.append('badge', str(form.badge));
        fd.append('cta_text', str(form.cta_text));
        fd.append('cta_link', str(form.cta_link));
        fd.append('cta_style', str(form.cta_style));
        fd.append('pills', JSON.stringify(form.pills || []));
        fd.append('color_scheme', str(form.color_scheme));
        fd.append('bg_color', str(form.bg_color));
        fd.append('duration', str(form.duration));
        fd.append('wide_side', str(form.wide_side));
        fd.append('order', str(form.order));
        fd.append('active', String(form.active !== false));
        fd.append('show_cta', String(form.show_cta !== false));
        
        if (file) fd.append('media_file', file);
        if (secFile) fd.append('secondary_media_file', secFile);
        
        onSave(fd, form);
    };

    const input = (k: keyof AdItem, ph = '', type = 'text') => (
        <input type={type} placeholder={ph} value={String(form[k] ?? '')}
            onChange={e => set(k, type === 'number' ? Number(e.target.value) : e.target.value)}
            style={{
                width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box'
            }} />
    );

    const select = (k: keyof AdItem, options: string[]) => (
        <select value={String(form[k] ?? '')} onChange={e => set(k, e.target.value)}
            style={{
                width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff'
            }}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
            {/* LEFT: Media upload */}
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 16, color: '#111' }}>Media Assets</h3>
                
                <div style={{ marginBottom: 24 }}>
                    <F label="Select Your Style">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {CARD_TYPES.map(ct => (
                                <button key={ct.value}
                                    onClick={() => set('card_type', ct.value)}
                                    style={{
                                        padding: '8px 16px', background: form.card_type === ct.value ? '#6366f1' : '#fff',
                                        color: form.card_type === ct.value ? '#fff' : '#111',
                                        border: `1px solid ${form.card_type === ct.value ? '#6366f1' : '#d1d5db'}`,
                                        borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s'
                                    }}>
                                    {ct.label}
                                </button>
                            ))}
                        </div>
                    </F>
                </div>

                {/* Main Media Uploader */}
                <div style={{ marginBottom: 24 }}>
                    <F label={form.card_type === 'image' ? "Main Image" : "Main Video"}>
                        <MediaDropper preview={preview || form.media_url} mediaType={form.card_type === 'video' ? 'video' : 'image'}
                            onFile={handleFile} onClear={() => { setFile(null); setPreview(null); set('media_url', ''); }} />
                        <div style={{ marginTop: 10 }}>
                            <input placeholder="Or absolute URL (optional)..." value={String(form.media_url ?? '')} onChange={e => set('media_url', e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }} />
                        </div>
                    </F>
                </div>

                {/* Secondary Media (only for Video + Image) */}
                {form.card_type === 'video_image' && (
                    <div style={{ marginBottom: 24 }}>
                        <F label="Secondary Image">
                            <MediaDropper preview={secPreview || form.secondary_media_url} mediaType="image"
                                onFile={handleSecFile} onClear={() => { setSecFile(null); setSecPreview(null); set('secondary_media_url', ''); }} />
                            <div style={{ marginTop: 10 }}>
                                <input placeholder="Or secondary URL (optional)..." value={String(form.secondary_media_url ?? '')} onChange={e => set('secondary_media_url', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }} />
                            </div>
                        </F>
                    </div>
                )}
            </div>

            {/* RIGHT: Form fields */}
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 16, color: '#111' }}>Content Details</h3>

                {form.card_type !== 'video_image' && (
                    <F label="Category / Eyebrow">{input('eyebrow', 'e.g. DATA SCIENCE')}</F>
                )}
                
                <F label="Title *">{input('title', 'e.g. Master Neural Networks')}</F>
                
                <F label="Description">
                    <textarea value={String(form.description ?? '')} placeholder="Compelling copy starts here..."
                        onChange={e => set('description', e.target.value)} rows={3}
                        style={{
                            width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                            borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box'
                        }} />
                </F>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {form.card_type === 'image' && <F label="Overlay Badge">{input('badge', 'e.g. Best Seller')}</F>}
                    {form.card_type === 'video' && <F label="Overlay Tag">{input('tag', 'e.g. 🎓 New')}</F>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 16 }}>
                    <F label="CTA Button Text">{input('cta_text', 'e.g. Enroll Now →')}</F>
                    <F label="CTA URL (Optional Redirect)">{input('cta_link', 'https://...')}</F>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <F label="CTA Style">{select('cta_style', CTA_STYLES)}</F>
                    <F label="BG Color">{select('bg_color', BG_COLORS)}</F>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <F label="Order">{input('order', '0', 'number')}</F>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 16 }}>
                        <button onClick={() => set('active', !form.active)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                                border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                                background: form.active ? '#d1fae5' : '#fee2e2', color: form.active ? '#065f46' : '#991b1b'
                            }}>
                            {form.active ? <><Check size={14} /> Live</> : <><EyeOff size={14} /> Hidden</>}
                        </button>
                    </div>
                </div>

                {/* Pills (only for Video + Text) */}
                {form.card_type === 'video' && (
                    <F label="Keywords / Skills">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {(form.pills || []).map((p, i) => (
                                <span key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                                    background: '#f3f4f6', borderRadius: 20, fontSize: 12
                                }}>
                                    {p}
                                    <X size={10} style={{ cursor: 'pointer' }} onClick={() => removePill(i)} />
                                </span>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input placeholder="Add skill tag..." value={pillInput} onChange={e => setPillInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addPill()}
                                style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }} />
                            <button onClick={addPill} style={{
                                padding: '6px 14px', background: '#374151', color: '#fff',
                                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13
                            }}>+</button>
                        </div>
                    </F>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button onClick={handleSubmit} disabled={!form.title || saving}
                        style={{
                            flex: 1, padding: '12px 24px', background: '#6366f1', color: '#fff',
                            border: 'none', borderRadius: 8, cursor: saving || !form.title ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: 14, opacity: saving ? .7 : 1
                        }}>
                        {saving ? 'Synchronizing…' : '✓ Publish Advertisement'}
                    </button>
                    <button onClick={onCancel}
                        style={{
                            padding: '12px 20px', background: '#f3f4f6', color: '#374151',
                            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14
                        }}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Ad row in table ── */
function AdRow({ ad, onEdit, onDelete, onToggle, onPreview }:
    { ad: AdItem; onEdit: () => void; onDelete: () => void; onToggle: () => void; onPreview: () => void }) {
    const TYPE_COLORS: Record<string, string> = {
        video: '#fef3c7', image: '#dbeafe', video_image: '#f3e8ff',
    };
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '40px 100px 1fr 100px 80px 100px',
            alignItems: 'center', gap: 12, padding: '14px 20px',
            borderBottom: '1px solid #f3f4f6', background: '#fff',
            transition: 'background .15s'
        }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafafa'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
            <GripVertical size={16} color="#d1d5db" />
            <div style={{
                padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center',
                background: TYPE_COLORS[ad.card_type] || '#f3f4f6'
            }}>{ad.card_type}</div>
            <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111', marginBottom: 2 }}>{ad.title}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{ad.eyebrow}</div>
            </div>
            <button 
                onClick={onToggle}
                title="Click to toggle status"
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                    color: ad.active ? '#16a34a' : '#9ca3af', fontWeight: 600,
                    background: ad.active ? '#d1fae5' : '#f3f4f6',
                    border: 'none', padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                    transition: 'all .2s'
                }}>
                {ad.active ? <Check size={13} /> : <EyeOff size={13} />}
                {ad.active ? 'Live' : 'Hidden'}
            </button>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>#{ad.order}</div>
            <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={onPreview} title="Instant Preview"
                    style={{
                        padding: '5px 8px', background: '#f5f3ff', border: '1px solid #ddd6fe',
                        borderRadius: 6, cursor: 'pointer', color: '#6366f1'
                    }}>
                    <Eye size={13} />
                </button>
                <button onClick={onEdit} title="Edit"
                    style={{
                        padding: '5px 8px', background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: 6, cursor: 'pointer', color: '#2563eb'
                    }}>
                    <Edit3 size={13} />
                </button>
                <button onClick={onDelete} title="Delete"
                    style={{
                        padding: '5px 8px', background: '#fef2f2', border: '1px solid #fecaca',
                        borderRadius: 6, cursor: 'pointer', color: '#dc2626'
                    }}>
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

/* ─── Main admin page ─────────────────────────── */
export default function AdsManagement() {
    const [ads, setAds] = useState<AdItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [panel, setPanel] = useState<'closed' | 'create' | 'edit'>('closed');
    const [editing, setEditing] = useState<AdItem | null>(null);
    const [previewing, setPreviewing] = useState<AdItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    useFont();
    useCSS();

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const loadAds = useCallback(async () => {
        try {
            setLoading(true);
            const r = await fetch(`${API}/all`);
            const data = await r.json();
            setAds(Array.isArray(data) ? data.sort((a, b) => a.order - b.order) : []);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadAds(); }, [loadAds]);

    const handleSave = async (fd: FormData, form: Partial<AdItem>) => {
        setSaving(true);
        try {
            const url = editing ? `${API}/${editing._id}` : API;
            const meth = editing ? 'PUT' : 'POST';
            const r = await fetch(url, { method: meth, body: fd });
            if (!r.ok) throw new Error(await r.text());
            showToast(editing ? '✓ Advertisement updated.' : '✓ Advertisement created.');
            setPanel('closed'); setEditing(null);
            loadAds();
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this advertisement?')) return;
        await fetch(`${API}/${id}`, { method: 'DELETE' });
        showToast('🗑 Deleted.'); loadAds();
    };

    const handleToggle = async (id: string) => {
        await fetch(`${API}/${id}/toggle`, { method: 'PATCH' });
        loadAds();
    };

    return (
        <div style={{
            fontFamily: 'Poppins, sans-serif', minHeight: '100vh',
            background: '#f9fafb', color: '#111'
        }}>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, background: '#111', color: '#fff',
                    padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 9999,
                    boxShadow: '0 8px 24px rgba(0,0,0,.2)', animation: 'fadeIn .3s ease'
                }}>
                    {toast}
                </div>
            )}

            {/* Header */}
            <div style={{
                background: '#fff', borderBottom: '1px solid #e5e7eb',
                padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>Advertisement Manager</h1>
                    <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>
                        Manage the Spotlight carousel content
                    </p>
                </div>
                <button
                    onClick={() => { setEditing(null); setPanel('create'); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                        background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
                        cursor: 'pointer', fontWeight: 600, fontSize: 14
                    }}>
                    <Plus size={16} /> New Advertisement
                </button>
            </div>

            {/* Create/Edit form panel */}
            {panel !== 'closed' && (
                <div style={{
                    margin: '24px 32px', background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: 12, padding: '28px 32px', boxShadow: '0 1px 8px rgba(0,0,0,.06)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h2 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
                            {panel === 'create' ? '+ New Advertisement' : '✏ Edit Advertisement'}
                        </h2>
                        <button onClick={() => { setPanel('closed'); setEditing(null); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <AdForm
                        initial={editing ?? EMPTY}
                        onSave={handleSave}
                        onCancel={() => { setPanel('closed'); setEditing(null); }}
                        saving={saving}
                    />
                </div>
            )}

            {/* Preview Modal */}
            {previewing && (
                <div 
                    onClick={() => setPreviewing(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, backdropFilter: 'blur(4px)'
                    }}
                >
                    <div 
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: 16, padding: '48px',
                            boxShadow: '0 24px 64px rgba(0,0,0,.3)', position: 'relative'
                        }}
                    >
                        <button 
                            onClick={() => setPreviewing(null)}
                            style={{
                                position: 'absolute', top: 16, right: 16, border: 'none',
                                background: 'none', cursor: 'pointer', color: '#9ca3af'
                            }}
                        >
                            <X size={24} />
                        </button>
                        <div style={{ transform: 'scale(1.1)', transformOrigin: 'center' }}>
                            {renderCard(previewing, 0)}
                        </div>
                    </div>
                </div>
            )}

            {/* Ads table */}
            <div style={{
                margin: '32px', background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)'
            }}>
                {/* Table header */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '40px 100px 1fr 100px 80px 100px',
                    gap: 12, padding: '12px 20px', background: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb', fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '.06em', color: '#6b7280'
                }}>
                    <div></div><div>Type</div><div>Title</div>
                    <div>Status</div><div>Order</div><div>Actions</div>
                </div>

                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
                ) : ads.length === 0 ? (
                    <div style={{ padding: '64px 32px', textAlign: 'center', color: '#9ca3af' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>No advertisements yet</div>
                        <div style={{ fontSize: 13 }}>Click "New Advertisement" to create your first ad card.</div>
                    </div>
                ) : (
                    ads.map(ad => (
                        <AdRow key={ad._id} ad={ad}
                            onEdit={() => { setEditing(ad); setPanel('edit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            onDelete={() => handleDelete(ad._id!)}
                            onToggle={() => handleToggle(ad._id!)}
                            onPreview={() => setPreviewing(ad)} />
                    ))
                )}
            </div>
        </div>
    );
}
