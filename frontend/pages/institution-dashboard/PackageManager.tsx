import React, { useEffect, useState } from 'react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';

interface PackageManagerProps {
    institutionId: string;
}

const PackageManager: React.FC<PackageManagerProps> = ({ institutionId }) => {
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<any>({ title: '', url: '', description: '', cta_label: '' });
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchPackages = async () => {
        if (!institutionId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/packages`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setPackages(data.packages || []);
            } else {
            }
        } catch (e) {
            console.error('Packages fetch error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPackages();
    }, [institutionId]);

    const handleChange = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

    const handleCreate = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setForm({ title: '', url: '', description: '', cta_label: '' });
                fetchPackages();
                alert('Package created');
            } else {
                const err = await res.json().catch(() => ({}));
                alert('Create failed: ' + (err.detail || res.status));
            }
        } catch (e) {
            console.error(e);
            alert('Network error');
        }
    };

    const handleSave = async () => {
        if (!editingId) return handleCreate();
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/packages/${editingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setEditingId(null);
                setForm({ title: '', url: '', description: '', cta_label: '' });
                fetchPackages();
                alert('Updated');
            } else {
                alert('Update failed');
            }
        } catch (e) {
            console.error(e);
            alert('Network error');
        }
    };

    const handleEdit = (p: any) => {
        setEditingId(p.id);
        setForm({ title: p.title || '', url: p.url || '', description: p.description || '', cta_label: p.cta_label || '' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this package?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/packages/${id}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            if (res.ok) {
                fetchPackages();
                alert('Deleted');
            } else alert('Delete failed');
        } catch (e) {
            console.error(e);
            alert('Network error');
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h4 className="text-lg font-black text-slate-800 mb-3">Event Packages</h4>
            <p className="text-sm text-slate-400 mb-4">Create promotional or partner packages and assign them to events.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <input value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Title" className="p-3 border rounded-lg" />
                <input value={form.url} onChange={e => handleChange('url', e.target.value)} placeholder="URL" className="p-3 border rounded-lg" />
                <input value={form.cta_label} onChange={e => handleChange('cta_label', e.target.value)} placeholder="CTA label" className="p-3 border rounded-lg" />
            </div>
            <div className="mb-4">
                <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Short description" className="w-full p-3 border rounded-lg" />
            </div>
            <div className="flex gap-3 mb-6">
                <button onClick={handleSave} className="px-6 py-3 bg-[#6C3BFF] text-white rounded-xl font-bold">{editingId ? 'Save' : 'Create'}</button>
                {editingId && <button onClick={() => { setEditingId(null); setForm({ title: '', url: '', description: '', cta_label: '' }); }} className="px-6 py-3 bg-slate-100 rounded-xl font-bold">Cancel</button>}
            </div>

            <div>
                {loading ? (
                    <div>Loading...</div>
                ) : packages.length === 0 ? (
                    <div className="text-sm text-slate-400">No packages yet.</div>
                ) : (
                    <div className="space-y-3">
                        {packages.map(p => (
                            <div key={p.id} className="p-4 border rounded-xl flex items-start justify-between">
                                <div>
                                    <div className="font-bold text-slate-800">{p.title}</div>
                                    <div className="text-xs text-slate-400">{p.url}</div>
                                    <div className="text-sm text-slate-500 mt-2">{p.description}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(p)} className="px-3 py-2 bg-white border rounded-lg">Edit</button>
                                    <button onClick={() => handleDelete(p.id)} className="px-3 py-2 bg-white border rounded-lg text-rose-600">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PackageManager;

