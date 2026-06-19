import React from 'react';
import { ExternalLink, Github, FileText, FileIcon } from 'lucide-react';
import { API_BASE_URL, getAuthToken } from '../../apiConfig';

function getLinkIcon(value: string) {
  if (value.includes('github.com')) return <Github size={16} />;
  if (value.includes('youtube.com') || value.includes('vimeo.com') || value.includes('drive.google.com')) return <ExternalLink size={16} />;
  return <ExternalLink size={16} />;
}

function getLinkLabel(value: string) {
  if (value.includes('github.com')) return 'GitHub';
  if (value.includes('youtube.com') || value.includes('vimeo.com')) return 'Video';
  return 'Link';
}

function getFileIconFromMime(mime?: string, filename?: string) {
  const m = (mime || '').toLowerCase();
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  if (m.includes('pdf') || ext === 'pdf') return <FileText size={16} />;
  if (m.includes('presentation') || ext === 'ppt' || ext === 'pptx') return <FileText size={16} />;
  return <FileIcon size={16} />;
}

function getFileLabel(mime?: string, filename?: string) {
  const m = (mime || '').toLowerCase();
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  if (m.includes('pdf') || ext === 'pdf') return 'PDF';
  if (m.includes('presentation') || ext === 'ppt' || ext === 'pptx') return 'PPT';
  return 'File';
}

function isUrlString(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('www.');
}

export const DynamicTableCell: React.FC<{
  value: any;
  fieldType: string;
  eventId?: string;
  submissionId?: string;
  fieldId?: string;
}> = ({ value, fieldType, eventId, submissionId, fieldId }) => {
  if (value === undefined || value === null || value === '') return <span className="text-slate-400 text-xs italic">N/A</span>;

  // Handle object values (e.g., _stored_file metadata)
  if (typeof value === 'object') {
    const obj = value as any;
    if (obj._stored_file || obj.mime || obj.filename) {
      const mime = obj.mime || '';
      const filename = obj.filename || 'file';
      const downloadUrl = (eventId && submissionId && fieldId)
        ? `${API_BASE_URL}/api/v1/institution/events/${eventId}/stage-submissions/${submissionId}/file/${fieldId}`
        : null;
      const canOpen = !!(obj.data_uri || downloadUrl);
      const handleOpen = () => {
        if (obj.data_uri) { window.location.href = obj.data_uri; return; }
        if (!downloadUrl) return;
        const token = getAuthToken();
        if (!token) return;
        window.location.href = `${downloadUrl}?token=${encodeURIComponent(token)}`;
      };
      return (
        <button
          onClick={handleOpen}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-xs font-semibold transition-colors ${canOpen ? 'hover:bg-amber-100 cursor-pointer' : 'cursor-default'}`}
          title={filename}
        >
          {getFileIconFromMime(mime, filename)}
          {getFileLabel(mime, filename)}
        </button>
      );
    }
    return null;
  }

  if (fieldType === 'url' || fieldType === 'link') {
    const href = typeof value === 'string' && (value.startsWith('http') || value.startsWith('www')) ? value : '';
    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-200 text-xs font-semibold transition-colors"
          title={value}
        >
          {getLinkIcon(href)}
          {getLinkLabel(href)}
        </a>
      );
    }
  }

  if (fieldType === 'file') {
    if (typeof value === 'string') {
      const isDataUri = value.startsWith('data:');
      const isHttp = value.startsWith('http://') || value.startsWith('https://');
      const isApi = value.startsWith('/api/');
      const mime = isDataUri ? value.split(';')[0].split(':')[1] || '' : '';
      const filename = value.split('/').pop() || 'file';
      const fileUrl = isApi ? `${API_BASE_URL}${value}` : value;
      return (
        <button
          onClick={() => window.open(fileUrl, '_blank')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 text-xs font-semibold transition-colors"
          title={value}
        >
          {getFileIconFromMime(mime, filename)}
          {getFileLabel(mime, filename)}
        </button>
      );
    }
  }

  if (fieldType === 'checkbox') {
    return <span className={value ? 'text-emerald-600 font-medium' : 'text-slate-400'}>{value ? 'Yes' : 'No'}</span>;
  }

  // Detect URLs in text fields and render as icon buttons
  if (typeof value === 'string' && isUrlString(value)) {
    const href = value.startsWith('www') ? `https://${value}` : value;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-200 text-xs font-semibold transition-colors"
        title={value}
      >
        {getLinkIcon(href)}
        {getLinkLabel(href)}
      </a>
    );
  }

  const str = typeof value === 'object' ? '' : String(value);
  if (!str) return <span className="text-slate-400 text-xs italic">N/A</span>;
  if (str.length > 120) return <span className="text-slate-700 text-xs" title={str}>{str.slice(0, 120)}&hellip;</span>;
  return <span className="text-slate-700">{str}</span>;
};

export const SubmissionDetailsRenderer: React.FC<{
  data: Record<string, any>;
  fields: { field_id: string; label: string; field_type: string }[];
  eventId?: string;
  submissionId?: string;
}> = ({ data, fields, eventId, submissionId }) => {
  const nonEmptyFields = fields.filter(f => {
    const v = data[f.field_id];
    return v !== undefined && v !== null && v !== '';
  });

  if (nonEmptyFields.length === 0) {
    return <p className="text-sm text-slate-400 italic">No submission data available</p>;
  }

  return (
    <div className="space-y-3">
      {nonEmptyFields.map((field) => {
        const value = data[field.field_id];
        return (
          <div key={field.field_id}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{field.label}</p>
            <div className="mt-0.5 text-sm text-slate-700">
              <DynamicTableCell
                value={value}
                fieldType={field.field_type}
                eventId={eventId}
                submissionId={submissionId}
                fieldId={field.field_id}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
