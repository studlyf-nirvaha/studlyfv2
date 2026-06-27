import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Save, ChevronLeft, Upload, Edit3 } from 'lucide-react';
import { CERT_TEMPLATES, CertData } from './CertTemplates';
import { API_BASE_URL, authHeaders } from '../../../apiConfig';

// Helper for file upload – converts to base64 data URI client-side
const uploadFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Validated Date Field for DD-MM-YYYY
const ValidatedDateField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Invalid date (Use DD-MM-YYYY)");

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, ''); // Numeric only
    
    // Basic split
    const d = raw.substring(0, 2);
    const m = raw.substring(2, 4);
    const y = raw.substring(4, 8);

    // Build formatted string
    let formatted = d;
    if (m.length > 0) formatted += '-' + m;
    if (y.length > 0) formatted += '-' + y;

    onChange(formatted);

    // Real-time Validation
    let isValid = true;
    let msg = "Invalid date (Use DD-MM-YYYY)";
    
    if (d && (parseInt(d) < 1 || parseInt(d) > 31)) {
        isValid = false;
        msg = "Day must be 01-31";
    } else if (m && (parseInt(m) < 1 || parseInt(m) > 12)) {
        isValid = false;
        msg = "Month must be 01-12";
    } else if (raw.length === 8) {
        const fullRegex = /^(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])\d{4}$/;
        if (!fullRegex.test(raw)) {
            isValid = false;
            msg = "Invalid date format";
        }
    }
    
    setError(!isValid && raw.length > 0);
    setErrorMessage(msg);
  };

  return (
      <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
          <input 
            value={value} 
            onChange={handleInput} 
            placeholder="DD-MM-YYYY"
            maxLength={10}
            className={`w-full px-3 py-2.5 bg-slate-50 border ${error ? 'border-red-300' : 'border-slate-100'} rounded-xl text-sm font-medium focus:outline-none focus:border-[#6C3BFF] transition-all`} />
          {error && <p className="text-[9px] text-red-500 font-bold">{errorMessage}</p>}
      </div>
  );
};

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

const Field = ({ label, value, onChange, placeholder, onFileChange }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; onFileChange?: (f: File) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        {onFileChange && (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] text-[#6C3BFF] flex items-center gap-1 hover:underline">
            <Upload size={10} /> Upload
          </button>
        )}
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-[#6C3BFF] transition-all" />
      {onFileChange && <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && onFileChange(e.target.files[0])} />}
    </div>
  );
};
// ... rest of the file ...

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
      ${data.institutionLogo
        ? `<img src="${data.institutionLogo}" alt="Institution Logo" style="width:96px;height:96px;object-fit:contain;border-radius:16px;" />`
        : `<div style="width:96px;height:96px;border:2px dashed #CBD5E1;border-radius:16px;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;font-size:10px;font-weight:800;color:#94A3B8;">INST</div>`
      }
      <div class="title">
        <div class="institution">${data.institutionName || 'Institution Name'}</div>
        <div class="template">${templateLabel || data.certType || 'Certificate Template'}</div>
      </div>
      ${data.eventLogo
        ? `<img src="${data.eventLogo}" alt="Event Logo" style="width:96px;height:96px;object-fit:contain;border-radius:16px;" />`
        : `<div style="width:96px;height:96px;border:2px dashed #CBD5E1;border-radius:16px;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;font-size:10px;font-weight:800;color:#94A3B8;">EVENT</div>`
      }
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

interface SavedTemplate {
  template_id: string;
  name: string;
  description?: string;
  html_content?: string;
  cert_data?: CertData;
  created_at?: string;
}

const CertificateTemplateBuilder: React.FC<{ institutionId: string; onSave?: (data: CertData, templateId: string) => void }> = ({ institutionId, onSave }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<CertData>(DEFAULT);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(true);

  useEffect(() => {
    fetchSavedTemplates();
  }, []);

  const fetchSavedTemplates = async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/institution/certificates/templates`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const list: SavedTemplate[] = await res.json();
        setSavedTemplates(list.filter(t => t.cert_data));
      } else {
        const err = await res.json().catch(() => ({ detail: 'Failed to load templates' }));
        alert('Could not load saved templates: ' + (err.detail || 'Server error'));
      }
    } catch (e) { alert('Could not load saved templates. Check your connection.'); }
    setLoadingSaved(false);
  };

  const set = (patch: Partial<CertData>) => setData(d => ({ ...d, ...patch }));
  const addSig = () => set({ signatories: [...data.signatories, { name: '', title: '', org: '' }] });
  const removeSig = (i: number) => set({ signatories: data.signatories.filter((_, x) => x !== i) });
  const setSig = (i: number, patch: Partial<CertData['signatories'][0]>) =>
    set({ signatories: data.signatories.map((s, x) => x === i ? { ...s, ...patch } : s) });

  const handleSave = async () => {
    setSaving(true);
    try {
      const selected = CERT_TEMPLATES.find(t => t.id === selectedId);
      const body = {
        name: data.eventName || selected?.label || data.certType || 'Certificate Template',
        description: `${selected?.tag || 'Custom institution certificate template'}`,
        html_content: buildHtmlContent(data, selected?.label),
        cert_data: data,
      };
      const isUpdate = !!savedTemplateId;
      const url = isUpdate
        ? `${API_BASE_URL}/api/v1/institution/certificates/templates/${savedTemplateId}`
        : `${API_BASE_URL}/api/v1/institution/certificates/templates`;
      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Failed to save template' }));
        alert(err.detail || 'Failed to save template');
        setSaving(false);
        return;
      }
      const saved = await response.json();
      const tid = String(saved?.template_id || savedTemplateId || '');
      if (tid) setSavedTemplateId(tid);
      await fetchSavedTemplates();
    } catch (e) { alert('Failed to save template. Check your connection and try again.'); }
    setSaving(false);
  };

  const openSavedTemplate = (st: SavedTemplate) => {
    if (st.cert_data) {
      setData(st.cert_data);
      setSavedTemplateId(st.template_id);
      // Find matching preset template from CERT_TEMPLATES
      const match = CERT_TEMPLATES.find(t => t.label === st.cert_data?.certType);
      setSelectedId(match?.id || null);
    }
  };

  const createNewTemplate = () => {
    setData(DEFAULT);
    setSavedTemplateId(null);
    setSelectedId(null);
  };

  const selected = CERT_TEMPLATES.find(t => t.id === selectedId);
  const PreviewComp = selected?.component;
  const savedTemplateName = savedTemplateId
    ? savedTemplates.find(st => st.template_id === savedTemplateId)?.name
    : null;

  // ── Step 1: Template Gallery ─────────────────────────────────────
  if (!selectedId && !savedTemplateId) {
    const savedWithData = savedTemplates.filter(st => st.cert_data);
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Choose a Certificate Style</h2>
          <p className="text-slate-500 text-sm mt-1">Pick a preset template or open a previously saved one to continue editing.</p>
        </div>

        {/* Saved Templates */}
        {savedWithData.length > 0 && (
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">My Saved Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {savedWithData.map(st => {
                const eventName = st.cert_data?.eventName || st.name;
                const instName = st.cert_data?.institutionName || '';
                return (
                  <button key={st.template_id} onClick={() => openSavedTemplate(st)}
                    className="group text-left bg-white rounded-[1.5rem] border-2 border-slate-100 hover:border-[#6C3BFF] shadow-sm hover:shadow-lg transition-all overflow-hidden">
                    <div className="px-5 py-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#6C3BFF]/10 flex items-center justify-center flex-shrink-0">
                        <Edit3 size={18} className="text-[#6C3BFF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate">{eventName || 'Untitled Template'}</p>
                        <p className="text-[10px] text-slate-400 font-bold truncate">{instName || st.description || 'Saved template'}</p>
                      </div>
                      <div className="w-7 h-7 rounded-full border-2 border-slate-100 group-hover:border-[#6C3BFF] group-hover:bg-[#6C3BFF] flex items-center justify-center transition-all flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-white transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Preset Templates */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Preset Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {CERT_TEMPLATES.map(t => {
              const Preview = t.component;
              return (
                <button key={t.id} onClick={() => { setSelectedId(t.id); setSavedTemplateId(null); }}
                  className="group text-left bg-white rounded-[2rem] border-2 border-slate-100 hover:border-[#6C3BFF] shadow-sm hover:shadow-xl transition-all overflow-hidden">
                  <div className="relative bg-slate-50 overflow-hidden" style={{ height: 220 }}>
                    <div className="absolute inset-0 p-4" style={{ transform: 'scale(0.52)', transformOrigin: 'top left', width: '192%', height: '192%', pointerEvents: 'none' }}>
                      <Preview data={{ ...DEFAULT, certType: t.label, eventName: 'Sample Hackathon', institutionName: 'Your Institution', duration: '1st-2nd Jan 2025', signatories: [{ name: 'Dr. A. Kumar', title: 'Principal', org: 'Institution' }, { name: 'Prof. B. Singh', title: 'Director', org: 'Dept.' }] }} />
                    </div>
                    <div className="absolute inset-0 bg-[#6C3BFF]/0 group-hover:bg-[#6C3BFF]/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-[#6C3BFF] text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-full shadow-lg">Use This Template</span>
                    </div>
                  </div>
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
      </div>
    );
  }

  // ── Step 2: Customise ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={createNewTemplate} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-[#6C3BFF] uppercase tracking-widest transition-all">
            <ChevronLeft size={16} /> All Templates
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h2 className="text-xl font-black text-slate-900">{selected?.label || savedTemplateName || 'Custom Template'}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{savedTemplateId ? 'Editing saved template' : (selected?.tag || '')}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-[#6C3BFF] transition-all">
            {showPreview ? <><EyeOff size={14} /> Edit</> : <><Eye size={14} /> Preview</>}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6C3BFF] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#5B2EE0] transition-all disabled:opacity-50">
            <Save size={14} /> {saving ? 'Saving…' : (savedTemplateId ? 'Update Template' : 'Save Template')}
          </button>
        </div>
      </div>

      {showPreview ? (
        PreviewComp ? (
          <div className="max-w-3xl mx-auto"><PreviewComp data={data} /></div>
        ) : (
          <div className="max-w-3xl mx-auto bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="w-full overflow-hidden rounded-xl" style={{ height: 380 }}>
              <div style={{ transform: 'scale(0.65)', transformOrigin: 'top left', width: '153%' }}>
                <div dangerouslySetInnerHTML={{
                  __html: buildHtmlContent(data, selected?.label)
                    .replace(/\{student_name\}/g, 'Recipient Name')
                    .replace(/\{course_title\}/g, data.eventName || 'Event')
                }} />
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-5 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
            <Field label="Institution Name" value={data.institutionName} onChange={v => set({ institutionName: v })} placeholder="e.g. Rajkiya Engineering College" />
            <Field label="Event / Hackathon Name" value={data.eventName} onChange={v => set({ eventName: v })} placeholder="e.g. Tekno'19 Hackathon" />
            <Field label="Body Text" value={data.bodyText} onChange={v => set({ bodyText: v })} placeholder="for participating in..." />
            <div className="grid grid-cols-2 gap-3">
              <ValidatedDateField label="Duration / Dates" value={data.duration} onChange={v => set({ duration: v })} />
              <Field label="Venue / Location" value={data.venue} onChange={v => set({ venue: v })} placeholder="e.g. College Name, City" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Institution Logo" value={data.institutionLogo} onChange={v => set({ institutionLogo: v })} placeholder="https://..." onFileChange={f => uploadFile(f).then(u => set({ institutionLogo: u }))} />
              <Field label="Event Logo" value={data.eventLogo} onChange={v => set({ eventLogo: v })} placeholder="https://..." onFileChange={f => uploadFile(f).then(u => set({ eventLogo: u }))} />
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
                  <button type="button" onClick={async () => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async (e: any) => {
                          const f = e.target.files[0];
                          if (f) { const url = await uploadFile(f); set({ sponsorLogos: data.sponsorLogos.map((s, x) => x === i ? url : s) }); }
                      };
                      input.click();
                  }} className="text-[#6C3BFF]"><Upload size={16}/></button>
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

