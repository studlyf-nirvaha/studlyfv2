import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Save, RefreshCw, Eye, EyeOff, CheckCircle2,
  Plus, Trash2, AlertCircle, Copy, Check, X
} from 'lucide-react';
import { API_BASE_URL, authHeaders } from '../../../apiConfig';

interface EmailTemplate {
  _id: string;
  name: string;
  type: string;
  subject: string;
  body_html: string;
  placeholders: string[];
  is_default: boolean;
  is_active: boolean;
  event_id?: string;
  institution_id?: string;
}

const PLACEHOLDER_BUTTONS = [
  { key: 'team_name', label: 'Team Name' },
  { key: 'event_name', label: 'Event Name' },
  { key: 'stage_name', label: 'Stage Name' },
  { key: 'participant_name', label: 'Participant Name' },
  { key: 'custom_message', label: 'Custom Message' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'new_deadline', label: 'New Deadline' },
  { key: 'score', label: 'Score' },
];

const TEMPLATE_TYPES: { type: string; label: string; desc: string }[] = [
  { type: 'stage_advancement', label: 'Stage Advancement', desc: 'Sent when participants advance to a new stage' },
  { type: 'announcement', label: 'Custom Announcement', desc: 'Send custom messages to participants' },
  { type: 'deadline_reminder', label: 'Deadline Reminder', desc: 'Automated reminders before stage deadlines' },
  { type: 'deadline_extension', label: 'Deadline Extension', desc: 'Notification when deadlines are extended' },
  { type: 'registration_confirmation', label: 'Registration Confirmation', desc: 'Sent when a participant registers' },
];

const EmailTemplatesManager: React.FC<{ eventId: string; institutionId: string }> = ({ eventId, institutionId }) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('stage_advancement');
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const baseUrl = `${API_BASE_URL}/api/v1/institution/events/${eventId}`;
  const headers = authHeaders();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/email-templates`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        const active = data.find((t: EmailTemplate) => t.is_active);
        if (active) {
          setSelectedType(active.type);
        }
      }
    } catch (e) {
      console.error('Failed to fetch templates', e);
    }
    setLoading(false);
  }, [baseUrl, headers]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const currentTemplate = templates.find(t => t.type === selectedType);
  const activeTemplate = templates.find(t => t.type === selectedType && t.is_active);

  const startEditing = () => {
    const t = currentTemplate || {
      _id: 'new',
      name: selectedType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type: selectedType,
      subject: '',
      body_html: '',
      placeholders: PLACEHOLDER_BUTTONS.map(p => p.key),
      is_default: false,
      is_active: false,
    };
    setEditing(t);
    setSubject(t.subject);
    setBodyHtml(t.body_html);
    setShowPreview(false);
    setError(null);
  };

  const insertPlaceholder = (key: string) => {
    const ta = document.getElementById('template-body-editor') as HTMLTextAreaElement;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = bodyHtml.substring(0, start);
      const after = bodyHtml.substring(end);
      setBodyHtml(before + '{' + key + '}' + after);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + key.length + 2;
        ta.focus();
      }, 0);
    }
  };

  const handleSave = async () => {
    if (!subject.trim() || !bodyHtml.trim()) {
      setError('Subject and body are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        _id: editing?._id && editing._id !== 'new' ? editing._id : undefined,
        name: editing?.name || selectedType,
        type: selectedType,
        subject,
        body_html: bodyHtml,
        placeholders: PLACEHOLDER_BUTTONS.map(p => p.key),
        is_active: editing?.is_active ?? false,
      };
      const res = await fetch(`${baseUrl}/email-templates`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaveSuccess('Template saved!');
        setEditing(null);
        await fetchTemplates();
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to save template');
      }
    } catch (e) {
      setError('Network error saving template');
    }
    setSaving(false);
  };

  const handleActivate = async (templateId: string) => {
    try {
      const res = await fetch(`${baseUrl}/email-templates/${templateId}/activate`, {
        method: 'PATCH',
        headers,
      });
      if (res.ok) {
        setSaveSuccess('Template activated!');
        await fetchTemplates();
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (e) {
      console.error('Failed to activate template', e);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const res = await fetch(`${baseUrl}/email-templates/${templateId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setSaveSuccess('Template deleted');
        await fetchTemplates();
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (e) {
      console.error('Failed to delete template', e);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all email templates to defaults? Any custom templates will be lost.')) return;
    setResetting(true);
    try {
      const res = await fetch(`${baseUrl}/email-templates/reset-defaults`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        setSaveSuccess('Templates reset to defaults!');
        await fetchTemplates();
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (e) {
      console.error('Failed to reset templates', e);
    }
    setResetting(false);
  };

  const renderPreview = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const deadline1 = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const deadline2 = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);
    let preview = bodyHtml;
    preview = preview.replace(/\{(\w+)\}/g, (_, key) => {
      const sample: Record<string, string> = {
        team_name: 'Team Alpha',
        event_name: `National Hackathon ${yr}`,
        stage_name: 'Final Round',
        participant_name: 'John Doe',
        custom_message: 'Your team has been selected for the next phase!',
        deadline: `${deadline1} 23:59 UTC`,
        new_deadline: `${deadline2} 23:59 UTC`,
        score: '94',
        frontend_url: 'https://app.studlyf.com',
      };
      return sample[key] || `{${key}}`;
    });
    return { __html: preview };
  };

  const isCustomized = currentTemplate && !currentTemplate.is_default;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Mail size={24} className="text-[#6C3BFF]" />
            Email Templates
          </h3>
          <p className="text-slate-500 text-sm font-bold mt-1">
            Customize automated emails sent to participants. Unsupported placeholders will appear as-is in the final email.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            disabled={resetting}
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <RefreshCw size={14} className={resetting ? 'animate-spin' : ''} />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Success/Error toasts */}
      {saveSuccess && (
        <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-bold">
          <CheckCircle2 size={18} />
          {saveSuccess}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-6 py-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-bold">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      {/* Template type selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {TEMPLATE_TYPES.map(tt => {
          const t = templates.find(tm => tm.type === tt.type);
          const isActive = t?.is_active;
          const isSelected = selectedType === tt.type;
          return (
            <button
              key={tt.type}
              onClick={() => { setSelectedType(tt.type); setEditing(null); setError(null); }}
              className={`text-left p-5 rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-[#6C3BFF] bg-purple-50 shadow-lg shadow-purple-100'
                  : isActive
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-slate-900">{tt.label}</span>
                {isActive && <CheckCircle2 size={16} className="text-emerald-500" />}
              </div>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{tt.desc}</p>
              {t && (
                <div className={`mt-3 text-[9px] font-black uppercase tracking-widest ${
                  isCustomized ? 'text-amber-500' : 'text-slate-400'
                }`}>
                  {isCustomized ? 'Customized' : 'Default'}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active template info */}
      {activeTemplate && !editing && (
        <div className="px-6 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Template</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{activeTemplate.name}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Subject: <span className="font-bold">{activeTemplate.subject}</span>
              </p>
            </div>
            <button onClick={startEditing} className="px-5 py-3 bg-[#6C3BFF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#5a2ee6] transition-all">
              Customize
            </button>
          </div>
        </div>
      )}

      {!activeTemplate && !editing && (
        <div className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No active template</span>
              <p className="text-sm text-slate-600 mt-0.5">The default system template will be used until you activate a custom one.</p>
            </div>
            <button onClick={startEditing} className="px-5 py-3 bg-[#6C3BFF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#5a2ee6] transition-all flex items-center gap-2">
              <Plus size={14} /> Create Custom
            </button>
          </div>
        </div>
      )}

      {/* All saved templates for this type */}
      {!editing && templates.filter(t => t.type === selectedType).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
            All {TEMPLATE_TYPES.find(tt => tt.type === selectedType)?.label} Templates
          </h4>
          {templates.filter(t => t.type === selectedType).map(t => (
            <div key={t._id} className={`p-5 rounded-2xl border-2 transition-all ${
              t.is_active ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-100 bg-white'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{t.name}</span>
                    {t.is_active && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                    )}
                    {t.is_default && !t.event_id && !t.institution_id && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[8px] font-black uppercase tracking-widest">System Default</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 truncate">{t.subject}</p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {!t.is_active && (
                    <button
                      onClick={() => handleActivate(t._id)}
                      className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditing(t);
                      setSubject(t.subject);
                      setBodyHtml(t.body_html);
                      setShowPreview(false);
                      setError(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Edit
                  </button>
                  {!t.is_active && (
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="p-2.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="space-y-6 p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-black text-slate-900">
              {editing._id === 'new' ? 'Create Template' : 'Edit Template'}
              <span className="text-slate-400 font-bold text-sm ml-3">
                {TEMPLATE_TYPES.find(tt => tt.type === selectedType)?.label}
              </span>
            </h4>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  showPreview ? 'bg-[#6C3BFF] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPreview ? 'Hide Preview' : 'Preview'}
              </button>
              <button
                onClick={() => { setEditing(null); setError(null); }}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-[#6C3BFF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#5a2ee6] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save Template
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Congratulations {team_name}! You've advanced to {stage_name}"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-purple-50 focus:border-[#6C3BFF] transition-all"
            />
          </div>

          {/* Placeholder buttons */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insert Placeholder</label>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDER_BUTTONS.map(pb => (
                <button
                  key={pb.key}
                  onClick={() => insertPlaceholder(pb.key)}
                  className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  {pb.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body HTML editor */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Body (HTML)</label>
            <textarea
              id="template-body-editor"
              value={bodyHtml}
              onChange={e => setBodyHtml(e.target.value)}
              rows={16}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-4 focus:ring-purple-50 focus:border-[#6C3BFF] transition-all resize-y"
              placeholder="<html><body><!-- Your email HTML here --></body></html>"
            />
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview</label>
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500">
                    Subject: <span className="text-slate-900">{subject.replace(/\{(\w+)\}/g, (_, k) => {
                      const s: Record<string, string> = { team_name: 'Team A', event_name: 'Sample Event', stage_name: 'Round 1', participant_name: 'Jane Doe', custom_message: '...', deadline: '2026-06-15', new_deadline: '2026-06-20', score: '85' };
                      return s[k] || `{${k}}`;
                    })}</span>
                  </p>
                </div>
                <div className="p-6 max-h-[500px] overflow-y-auto" dangerouslySetInnerHTML={renderPreview()} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesManager;

