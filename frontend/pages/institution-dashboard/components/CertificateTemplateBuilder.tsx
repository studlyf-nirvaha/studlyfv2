import React, { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Save, ChevronLeft } from 'lucide-react';
import { CERT_TEMPLATES, CertData } from './CertTemplates';
import { API_BASE_URL, authHeaders } from '../../../apiConfig';

const DEFAULT: CertData = {
  certType: 'Certificate of Participation',
  institutionName: '',
  eventName: '',
  bodyText: 'for participating in the National Hackathon',
  duration: '',
  venue: '',
  teamIdLabel: '',
  themeLabel: '',
  institutionLogo: '',
  eventLogo: '',
  sponsorLogos: [''],
  showSponsorSection: true,
  signatories: [{ name: '', title: '', org: '' }],
};

const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#6C3BFF] transition-all" />
  </div>
);

const buildHtmlContent = (data: CertData, templateLabel?: string) => {
  const signatoryHtml = data.signatories.length > 0
    ? data.signatories.map((s, index) => `
        <div class="signatory">
          <div class="line"></div>
          <div class="name">${s.name || `Signatory ${index + 1}`}</div>
          <div class="title">${s.title || ''}</div>
          <div class="org">${s.org || ''}</div>
        </div>
      `).join('')
    : '';

  const sponsorHtml = data.showSponsorSection && data.sponsorLogos.filter(Boolean).length > 0
    ? `<div class="sponsors">${data.sponsorLogos.filter(Boolean).map((logo) => `<img src="${logo}" alt="Sponsor" />`).join('')}</div>`
    : '';

  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; font-family: 'Poppins', sans-serif; background: #f8fafc; }
    .certificate { max-width: 1100px; margin: 0 auto; background: #fff; border: 8px solid #6C3BFF; border-radius: 24px; padding: 36px 44px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .title { text-align: center; flex: 1; }
    .institution { text-transform: uppercase; letter-spacing: 2px; font-family: 'Poppins', sans-serif; font-size: 14px; color: #6C3BFF; font-weight: 800; }
    .template { text-transform: uppercase; letter-spacing: 4px; font-family: 'Poppins', sans-serif; font-size: 11px; color: #94A3B8; margin-top: 4px; }
    .heading { margin-top: 26px; text-align: center; font-size: 44px; font-weight: 900; letter-spacing: 4px; color: #0f172a; }
    .cert-type { text-align: center; font-size: 18px; font-family: 'Poppins', sans-serif; font-weight: 800; color: #6C3BFF; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px; }
    .recipient { margin: 24px auto 12px; width: fit-content; padding: 0 36px; border-bottom: 2px solid #0f172a; font-size: 32px; font-weight: 700; font-style: italic; color: #0f172a; text-align: center; }
    .body { text-align: center; font-family: 'Poppins', sans-serif; font-size: 15px; line-height: 1.8; color: #334155; max-width: 760px; margin: 18px auto 0; }
    .meta { display: flex; justify-content: center; gap: 28px; margin-top: 16px; font-family: 'Poppins', sans-serif; font-size: 13px; color: #475569; }
    .signatures { display: flex; justify-content: space-around; gap: 24px; margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .signatory { text-align: center; font-family: 'Poppins', sans-serif; min-width: 180px; }
    .line { height: 26px; border-bottom: 1.5px solid #6C3BFF; margin: 0 auto 6px; width: 120px; }
    .name { font-size: 13px; font-weight: 800; color: #0f172a; }
    .title, .org { font-size: 11px; color: #64748b; }
    .sponsors { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
    .sponsors img { height: 28px; object-fit: contain; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="top">
      <div style="width:96px;height:96px;border:2px dashed #CBD5E1;border-radius:16px;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;font-size:10px;font-weight:800;color:#94A3B8;">INST</div>
      <div class="title">
        <div class="institution">${data.institutionName || 'Institution Name'}</div>
        <div class="template">${templateLabel || data.certType || 'Certificate Template'}</div>
      </div>
      <div style="width:96px;height:96px;border:2px dashed #CBD5E1;border-radius:16px;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;font-size:10px;font-weight:800;color:#94A3B8;">EVENT</div>
    </div>
    <div class="heading">CERTIFICATE</div>
    <div class="cert-type">${data.certType || 'Certificate of Participation'}</div>
    <div class="recipient">{student_name}</div>
    <div class="body">
      ${data.bodyText || 'for participating in'} <strong>{course_title}</strong>
      ${data.duration ? ` during <strong>${data.duration}</strong>` : ''}
      ${data.venue ? ` at <strong>${data.venue}</strong>` : ''}.
    </div>
    ${(data.teamIdLabel || data.themeLabel) ? `<div class="meta">${data.teamIdLabel ? `<span><b>Team ID:</b> ${data.teamIdLabel}</span>` : ''}${data.themeLabel ? `<span><b>Theme:</b> ${data.themeLabel}</span>` : ''}</div>` : ''}
    <div class="signatures">${signatoryHtml}</div>
    ${sponsorHtml}
  </div>
</body>
</html>`;
};

const CertificateTemplateBuilder: React.FC<{ institutionId: string; onSave?: (data: CertData, templateId: string) => void }> = ({ institutionId, onSave }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<CertData>(DEFAULT);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<CertData>) => setData(d => ({ ...d, ...patch }));
  const addSig = () => set({ signatories: [...data.signatories, { name: '', title: '', org: '' }] });
  const removeSig = (i: number) => set({ signatories: data.signatories.filter((_, x) => x !== i) });
  const setSig = (i: number, patch: Partial<CertData['signatories'][0]>) =>
    set({ signatories: data.signatories.map((s, x) => x === i ? { ...s, ...patch } : s) });

  const handleSave = async () => {
    setSaving(true);
    try {
      const selected = CERT_TEMPLATES.find(t => t.id === selectedId);
      const response = await fetch(`${API_BASE_URL}/api/admin/cert-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          name: selected?.label || data.certType || 'Certificate Template',
          description: `${selected?.tag || 'Custom institution certificate template'}`,
          html_content: buildHtmlContent(data, selected?.label),
        }),
      });
      const saved = await response.json().catch(() => ({}));
      onSave?.(data, String(saved?.template_id || selectedId || ''));
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const selected = CERT_TEMPLATES.find(t => t.id === selectedId);
  const PreviewComp = selected?.component;

  // ── Step 1: Template Gallery ─────────────────────────────────────
  if (!selectedId) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Choose a Certificate Style</h2>
          <p className="text-slate-500 text-sm mt-1">Pick a template — you'll customize it with your logo, name, and details next.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {CERT_TEMPLATES.map(t => {
            const Preview = t.component;
            return (
              <button key={t.id} onClick={() => setSelectedId(t.id)}
                className="group text-left bg-white rounded-[2rem] border-2 border-slate-100 hover:border-[#6C3BFF] shadow-sm hover:shadow-xl transition-all overflow-hidden">
                {/* Scaled thumbnail */}
                <div className="relative bg-slate-50 overflow-hidden" style={{ height: 220 }}>
                  <div className="absolute inset-0 p-4" style={{ transform: 'scale(0.52)', transformOrigin: 'top left', width: '192%', height: '192%', pointerEvents: 'none' }}>
                    <Preview data={{ ...DEFAULT, certType: t.label, eventName: 'Sample Hackathon', institutionName: 'Your Institution', duration: '1st-2nd Jan 2025', signatories: [{ name: 'Dr. A. Kumar', title: 'Principal', org: 'Institution' }, { name: 'Prof. B. Singh', title: 'Director', org: 'Dept.' }] }} />
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-[#6C3BFF]/0 group-hover:bg-[#6C3BFF]/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-[#6C3BFF] text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-full shadow-lg">Use This Template</span>
                  </div>
                </div>
                {/* Label */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-900 text-sm">{t.label}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t.tag}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-100 group-hover:border-[#6C3BFF] group-hover:bg-[#6C3BFF] flex items-center justify-center transition-all">
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-white transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step 2: Customise ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-[#6C3BFF] uppercase tracking-widest transition-all">
            <ChevronLeft size={16} /> All Templates
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h2 className="text-xl font-black text-slate-900">{selected?.label}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selected?.tag}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-[#6C3BFF] transition-all">
            {showPreview ? <><EyeOff size={14} /> Edit</> : <><Eye size={14} /> Preview</>}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6C3BFF] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#5B2EE0] transition-all disabled:opacity-50">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>

      {showPreview && PreviewComp ? (
        <div className="max-w-3xl mx-auto"><PreviewComp data={data} /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-5 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
            <Field label="Institution Name" value={data.institutionName} onChange={v => set({ institutionName: v })} placeholder="e.g. Rajkiya Engineering College" />
            <Field label="Certificate Type" value={data.certType} onChange={v => set({ certType: v })} placeholder="Certificate of Participation" />
            <Field label="Event / Hackathon Name" value={data.eventName} onChange={v => set({ eventName: v })} placeholder="e.g. Tekno'19 Hackathon" />
            <Field label="Body Text" value={data.bodyText} onChange={v => set({ bodyText: v })} placeholder="for participating in..." />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration / Dates" value={data.duration} onChange={v => set({ duration: v })} placeholder="4th–5th Dec 2019" />
              <Field label="Venue / Location" value={data.venue} onChange={v => set({ venue: v })} placeholder="College Name, City" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Team ID (optional)" value={data.teamIdLabel} onChange={v => set({ teamIdLabel: v })} placeholder="e.g. T19A148C47" />
              <Field label="Theme (optional)" value={data.themeLabel} onChange={v => set({ themeLabel: v })} placeholder="e.g. Smart Campus" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Institution Logo URL" value={data.institutionLogo} onChange={v => set({ institutionLogo: v })} placeholder="https://..." />
              <Field label="Event Logo URL" value={data.eventLogo} onChange={v => set({ eventLogo: v })} placeholder="https://..." />
            </div>

            {/* Sponsor logos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sponsor Logos</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 cursor-pointer">
                    <input type="checkbox" checked={data.showSponsorSection} onChange={e => set({ showSponsorSection: e.target.checked })} /> Show
                  </label>
                  {data.sponsorLogos.length < 5 && (
                    <button onClick={() => set({ sponsorLogos: [...data.sponsorLogos, ''] })} className="flex items-center gap-1 text-[10px] font-black text-[#6C3BFF] hover:underline">
                      <Plus size={10} /> Add
                    </button>
                  )}
                </div>
              </div>
              {data.sponsorLogos.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input value={url} onChange={e => set({ sponsorLogos: data.sponsorLogos.map((s, x) => x === i ? e.target.value : s) })}
                    placeholder={`Sponsor ${i + 1} logo URL`}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#6C3BFF]" />
                  {data.sponsorLogos.length > 1 && (
                    <button onClick={() => set({ sponsorLogos: data.sponsorLogos.filter((_, x) => x !== i) })} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
            </div>

            {/* Signatories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signatories</label>
                {data.signatories.length < 3 && (
                  <button onClick={addSig} className="flex items-center gap-1 text-[10px] font-black text-[#6C3BFF] hover:underline"><Plus size={10} /> Add</button>
                )}
              </div>
              {data.signatories.map((s, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl space-y-2 relative">
                  {data.signatories.length > 1 && (
                    <button onClick={() => removeSig(i)} className="absolute top-3 right-3 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                  )}
                  <input value={s.name} onChange={e => setSig(i, { name: e.target.value })} placeholder="Full Name"
                    className="w-full px-3 py-2 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#6C3BFF]" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={s.title} onChange={e => setSig(i, { title: e.target.value })} placeholder="Title (e.g. Principal)"
                      className="px-3 py-2 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#6C3BFF]" />
                    <input value={s.org} onChange={e => setSig(i, { org: e.target.value })} placeholder="Organization"
                      className="px-3 py-2 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#6C3BFF]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live preview */}
          {PreviewComp && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Preview</p>
              <div style={{ transform: 'scale(0.65)', transformOrigin: 'top left', width: '153%', height: 'auto' }}>
                <PreviewComp data={data} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CertificateTemplateBuilder;
