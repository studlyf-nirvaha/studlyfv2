import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { fileMatchesAcceptTypes, inferAcceptTypes } from '../../utils/fileValidation';

type StageField = {
    id: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    helpText?: string;
    options?: string[];
    maxLength?: number;
    acceptTypes?: string[];
};

type SubmissionFormProps = {
    eventId: string;
    stage: any;
    participationType?: string;
    onSubmitted?: () => void;
    /** Skip redundant progress API when parent already resolved access */
    teamIdHint?: string | null;
    teamNameHint?: string | null;
    skipAccessCheck?: boolean;
};

const normalizeFields = (rawFields: any[]): StageField[] => {
    if (!Array.isArray(rawFields)) return [];
    return rawFields.map((field) => ({
        id: String(field.field_id || field.id || field.name || field.label || ''),
        label: String(field.label || field.name || field.field_id || 'Field'),
        type: String(field.field_type || field.type || 'text').toLowerCase(),
        required: field.required !== false,
        placeholder: field.placeholder || field.help_text || '',
        helpText: field.help_text || '',
        options: Array.isArray(field.options) ? field.options.map(String) : undefined,
        maxLength: typeof field.max_length === 'number' ? field.max_length : undefined,
        acceptTypes: Array.isArray(field.accept_types) ? field.accept_types.map(String)
            : Array.isArray(field.acceptTypes) ? field.acceptTypes.map(String)
            : inferAcceptTypes(String(field.label || field.name || ''), String(field.field_type || field.type || 'text').toLowerCase()),
    }));
};

const renderStoredFile = (field: StageField, value: any) => {
    if (!value) return null;
    if (typeof value === 'object' && value._stored_file) {
        const sizeKb = Math.max(1, Math.round((value.size || 0) / 1024));
        return (
            <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <span className="font-semibold">{value.filename || field.label}</span>
                <span className="text-emerald-600 ml-2">({sizeKb} KB)</span>
            </div>
        );
    }
    if (typeof value === 'string' && value.startsWith('data:')) {
        const mime = value.slice(5, value.indexOf(';')) || 'application/octet-stream';
        const ext = mime.includes('pdf') ? 'pdf' : mime.includes('presentation') ? 'pptx' : 'file';
        return (
            <a
                href={value}
                download={`${field.label.replace(/\s+/g, '_')}.${ext}`}
                className="mt-2 inline-flex text-sm font-semibold text-purple-700 underline"
            >
                Download uploaded {field.label}
            </a>
        );
    }
    return null;
};

const SubmissionForm: React.FC<SubmissionFormProps> = ({ eventId, stage, participationType, onSubmitted, teamIdHint, teamNameHint, skipAccessCheck }) => {
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [fileNames, setFileNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [canEditSubmission, setCanEditSubmission] = useState(true);
    const [mirrorNotice, setMirrorNotice] = useState<string | null>(null);
    const [teamId, setTeamId] = useState<string | null>(null);
    const [registered, setRegistered] = useState(true);
    const [resolvedStage, setResolvedStage] = useState<any>(stage);

    const stageId = resolvedStage?.id || stage?.id;
    const stageTitle = String(resolvedStage?.name || stage?.name || 'Submission Stage').trim();
    const fields = useMemo(
        () => normalizeFields(resolvedStage?.fields || resolvedStage?.config?.fields || []),
        [resolvedStage]
    );
    const isSolo = participationType === 'individual' || (participationType === 'both' && !teamId);
    const isTeamOnly = participationType === 'team';
    const teamRequired = isTeamOnly || Boolean(resolvedStage?.team_required || resolvedStage?.teamRequired || stage?.team_required || stage?.teamRequired);
    const [teamDisplayName, setTeamDisplayName] = useState('');
    const stageDescription = String(resolvedStage?.description || resolvedStage?.config?.description || stage?.description || stage?.config?.description || '').trim();
    const stageVisibility = String(resolvedStage?.visibility || stage?.visibility || '').toLowerCase();
    const isPublicStage = stageVisibility === 'public';
    const stageStartRaw = resolvedStage?.start_date || resolvedStage?.startDate;
    const stageEndRaw = resolvedStage?.end_date || resolvedStage?.endDate || resolvedStage?.deadline;
    const stageDeadlineRaw = stageEndRaw;
    const now = Date.now();
    const stageStartTs = stageStartRaw ? new Date(stageStartRaw).getTime() : 0;
    const stageEndTs = stageEndRaw ? new Date(stageEndRaw).getTime() : 0;
    const stageStatus = (() => {
        if (stageStartTs && now < stageStartTs) return 'upcoming';
        if (stageEndTs && now > stageEndTs) return 'closed';
        if (stageStartTs && stageEndTs && now >= stageStartTs && now <= stageEndTs) return 'active';
        return '';
    })();
    const isStageActive = stageStatus === 'active';
    const [deadlineLabel, setDeadlineLabel] = useState<string | null>(null);

    useEffect(() => {
        if (!stageDeadlineRaw) return;

        const parseDeadline = () => {
            if (stageDeadlineRaw instanceof Date) return stageDeadlineRaw;
            if (typeof stageDeadlineRaw === 'string') {
                const parsed = new Date(stageDeadlineRaw);
                return Number.isNaN(parsed.getTime()) ? null : parsed;
            }
            return null;
        };

        const updateLockState = () => {
            const deadline = parseDeadline();
            if (!deadline) return;
            const isLocked = Date.now() > deadline.getTime();
            setCanEditSubmission((prev) => (prev === !isLocked ? prev : !isLocked));
        };

        updateLockState();
        // Update human-readable deadline label
        const dl = parseDeadline();
        if (dl) {
            setDeadlineLabel(dl.toLocaleString());
        }
        const timer = window.setInterval(updateLockState, 30000);
        return () => window.clearInterval(timer);
    }, [stageDeadlineRaw]);

    useEffect(() => {
        setResolvedStage(stage);
    }, [stage]);

    useEffect(() => {
        if (teamNameHint) setTeamDisplayName(teamNameHint);
    }, [teamNameHint]);

    useEffect(() => {
        const fetchSubmission = async () => {
            if (!eventId || !stageId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                if (teamIdHint) {
                    setTeamId(teamIdHint);
                    setRegistered(true);
                }

                const accessQuery = skipAccessCheck ? '?access_verified=true' : '';
                const submissionRes = await fetch(
                    `${API_BASE_URL}/api/v1/stages/events/${eventId}/stages/${stageId}/submission${accessQuery}`,
                    { headers: { ...authHeaders() } },
                );

                if (!teamIdHint && !skipAccessCheck) {
                    const progressRes = await fetch(`${API_BASE_URL}/api/v1/stages/events/${eventId}/progress`, {
                        headers: { ...authHeaders() },
                    });
                    if (progressRes.ok) {
                        const progress = await progressRes.json();
                        if (progress.status === 'not_registered') {
                            setRegistered(false);
                            setTeamId(null);
                        } else {
                            setRegistered(true);
                            setTeamId(progress.team?._id || null);
                        }
                    }
                } else if (skipAccessCheck) {
                    setRegistered(true);
                }

                if (submissionRes.ok) {
                    const data = await submissionRes.json();
                    if (data?.data) {
                        setFormValues(data.data);
                        if (data.status === 'found') {
                            setSubmitted(true);
                        }
                    }
                    if (typeof data?.can_edit === 'boolean') {
                        setCanEditSubmission(data.can_edit);
                    }
                } else {
                    const errData = await submissionRes.json().catch(() => ({}));
                    const errMsg = errData.detail || errData.error || 'Access denied or failed to load submission details.';
                    setError(errMsg);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load submission details.');
            } finally {
                setLoading(false);
            }
        };

        fetchSubmission();
    }, [eventId, stageId, teamIdHint, skipAccessCheck]);

    const updateValue = (fieldId: string, value: any) => {
        setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventId || !stageId) return;

        for (const field of fields) {
            const value = formValues[field.id];
            if (field.type === 'file' && value) {
                const allowed = field.acceptTypes?.length ? field.acceptTypes : inferAcceptTypes(field.label, 'file');
                if (allowed?.length && typeof value === 'string' && value.startsWith('data:')) {
                    const mime = value.slice(5, value.indexOf(';'));
                    const fakeFile = { name: `upload.${allowed[0].replace('.', '')}`, type: mime } as File;
                    if (!fileMatchesAcceptTypes(fakeFile, allowed)) {
                        setError(`${field.label}: file type not allowed. Allowed: ${allowed.join(', ')}`);
                        return;
                    }
                }
            }
            if (field.required) {
                if (field.type === 'checkbox' && value !== true) {
                    setError(`${field.label} is required`);
                    return;
                }
                if (field.type !== 'checkbox' && (value === undefined || value === null || value === '')) {
                    setError(`${field.label} is required`);
                    return;
                }
            }
            if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
                setError(`${field.label} cannot exceed ${field.maxLength} characters`);
                return;
            }
        }

        setSaving(true);
        setError(null);

        try {
            const submitData = isSolo ? { ...formValues, team_display_name: teamDisplayName } : formValues;
            const response = await fetch(`${API_BASE_URL}/api/v1/stages/events/${eventId}/stages/${stageId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    data: submitData,
                    team_id: teamId || undefined,
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || err.error || 'Failed to save submission.');
            }

            const saved = await response.json();
            if (saved?.data) {
                setFormValues(saved.data);
            }
            setSubmitted(true);
            if (saved?.mirrored_application) {
                setMirrorNotice('Saved and added to My applications.');
            } else if (saved?.mirrored_application_id) {
                setMirrorNotice('Saved and linked to My applications.');
            } else {
                setMirrorNotice('Saved successfully.');
            }
            onSubmitted?.();
        } catch (err: any) {
            setError(err.message || 'Failed to save submission.');
        } finally {
            setSaving(false);
        }
    };

    if (!eventId || !stageId) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-2">{stageTitle}</h2>
                <p className="text-slate-600">This stage is not configured yet.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="text-center p-8">Loading submission details...</div>;
    }

    const isAccessDeniedError = error && (
        error.toLowerCase().includes('cannot submit') ||
        error.toLowerCase().includes('only shortlisted') ||
        error.toLowerCase().includes('locked') ||
        error.toLowerCase().includes('register before') ||
        error.toLowerCase().includes('not found') ||
        error.toLowerCase().includes('access denied') ||
        error.toLowerCase().includes('rejected') ||
        error.toLowerCase().includes('not shortlisted') ||
        error.toLowerCase().includes('not approved')
    );

    if (isAccessDeniedError) {
        return (
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 p-10 rounded-2xl border border-slate-800 shadow-2xl text-center max-w-2xl mx-auto my-6 transform hover:scale-[1.01] transition-all duration-300">
                {/* Visual Glassmorphic Accent */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                
                {/* Premium Lock Icon Container with subtle animation */}
                <div className="relative w-20 h-20 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-inner group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 to-purple-500/10 rounded-2xl opacity-50 blur-sm group-hover:opacity-100 transition-opacity" />
                    <svg className="w-10 h-10 animate-pulse relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <h2 className="text-2xl font-black text-slate-100 mb-3 tracking-tight">{stageTitle} Locked</h2>
                <div className="h-0.5 w-16 bg-gradient-to-r from-rose-500 to-purple-600 mx-auto mb-4 rounded-full" />
                
                <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-md mx-auto mb-6">
                    {error}
                </p>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 max-w-md mx-auto">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">How to progress</p>
                    <p className="text-xs text-slate-400">
                        Admin approval or shortlisting is required to unlock this stage. Ensure your previous submissions are complete and approved.
                    </p>
                </div>
            </div>
        );
    }

    if (!registered && !isPublicStage) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-2">{stageTitle}</h2>
                <p className="text-slate-600">Please register for this event before submitting to {stageTitle.toLowerCase()}.</p>
            </div>
        );
    }

    if (!isSolo && teamRequired && !teamId) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-2">{stageTitle}</h2>
                <p className="text-slate-600">Create or join a team to submit for {stageTitle.toLowerCase()}.</p>
            </div>
        );
    }

    const readOnly = submitted && !canEditSubmission;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold mb-2">{stageTitle}</h2>
                <div>
                    {submitted && !canEditSubmission ? (
                        <span className="inline-block text-sm font-black text-red-700 bg-red-50 border border-red-100 px-3 py-1 rounded-lg">
                            Editing closed — deadline passed
                        </span>
                    ) : canEditSubmission && deadlineLabel ? (
                        <span className="inline-block text-sm font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg">
                            Editable until {deadlineLabel}
                        </span>
                    ) : null}
                </div>
            </div>
            {readOnly ? (
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Your submission is saved. Editing is closed for this stage.
                    {mirrorNotice ? <div className="mt-1 font-medium text-slate-600">{mirrorNotice}</div> : null}
                </div>
            ) : submitted && canEditSubmission ? (
                <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Your submission is saved. You can still edit it until the deadline.
                    {mirrorNotice ? <div className="mt-1 font-medium text-emerald-700">{mirrorNotice}</div> : null}
                </div>
            ) : null}
            {stageDescription ? (
                <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{stageDescription}</p>
            ) : null}
            {isPublicStage && !registered ? (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">
                    Public stage: you can submit directly without prior registration.
                </div>
            ) : null}
            {/* Stage status messaging */}
            {stageStatus && stageStatus !== 'active' && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 text-sm text-yellow-800">
                    {stageStatus === 'upcoming' ? (
                        <div>This stage has not started yet. You will be able to submit when it opens.</div>
                    ) : (
                        <div>This stage is closed. Submissions are no longer accepted for this stage.</div>
                    )}
                </div>
            )}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={readOnly ? (e) => e.preventDefault() : handleSubmit} className="space-y-4">
                {(teamDisplayName || teamNameHint) && (
                    <div className="rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-sm">
                        <span className="font-semibold text-purple-900">Team: </span>
                        <span className="text-purple-800">{teamDisplayName || teamNameHint}</span>
                    </div>
                )}
                {fields.map((field) => {
                    const value = formValues[field.id];
                    const inputClass =
                        'mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm';

                    return (
                        <div key={field.id}>
                            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    id={field.id}
                                    rows={4}
                                    value={value || ''}
                                    onChange={(e) => updateValue(field.id, e.target.value)}
                                    className={inputClass}
                                    placeholder={field.placeholder || ''}
                                    disabled={readOnly}
                                    readOnly={readOnly}
                                />
                            ) : field.type === 'select' ? (
                                <select
                                    id={field.id}
                                    value={value || ''}
                                    onChange={(e) => updateValue(field.id, e.target.value)}
                                    className={inputClass}
                                    disabled={readOnly}
                                >
                                    <option value="">Select an option</option>
                                    {(field.options || []).map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            ) : field.type === 'checkbox' ? (
                                <label className="flex items-center gap-2 mt-2">
                                    <input
                                        id={field.id}
                                        type="checkbox"
                                        checked={value === true}
                                        onChange={(e) => updateValue(field.id, e.target.checked)}
                                        className="h-4 w-4"
                                        disabled={readOnly}
                                    />
                                    <span className="text-sm text-gray-700">{field.placeholder || 'Yes'}</span>
                                </label>
                            ) : field.type === 'file' ? (
                                <div className="mt-2">
                                    {renderStoredFile(field, value)}
                                    <input
                                        id={field.id}
                                        type="file"
                                        accept={field.acceptTypes?.join(',')}
                                        disabled={readOnly}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            // Explicit validation against acceptTypes
                                            const allowed = field.acceptTypes && field.acceptTypes.length > 0
                                                ? field.acceptTypes
                                                : inferAcceptTypes(field.label, 'file');
                                            if (allowed && allowed.length > 0 && !fileMatchesAcceptTypes(file, allowed)) {
                                                setError(`Invalid file type for ${field.label}. Allowed: ${allowed.join(', ')}`);
                                                e.target.value = '';
                                                return;
                                            }

                                            setFileNames((prev) => ({ ...prev, [field.id]: file.name }));
                                            const reader = new FileReader();
                                            reader.onload = () => updateValue(field.id, reader.result || '');
                                            reader.readAsDataURL(file);
                                        }}
                                        className={inputClass}
                                    />
                                    {fileNames[field.id] && (
                                        <p className="text-xs text-gray-500 mt-1">Selected: {fileNames[field.id]}</p>
                                    )}
                                </div>
                            ) : (
                                <input
                                    id={field.id}
                                    type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                                    value={value || ''}
                                    onChange={(e) => updateValue(field.id, e.target.value)}
                                    className={inputClass}
                                    placeholder={field.placeholder || ''}
                                    disabled={readOnly}
                                    readOnly={readOnly}
                                />
                            )}
                            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
                        </div>
                    );
                })}

                {!readOnly ? (
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving || (!isStageActive && !submitted) || (!canEditSubmission && submitted)}
                            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${isStageActive ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500' : 'bg-gray-300 cursor-not-allowed'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-80`}
                        >
                            {saving ? 'Saving...' : submitted ? 'Update submission' : (isStageActive ? 'Submit' : 'Stage Closed')}
                        </button>
                    </div>
                ) : null}
            </form>
        </div>
    );
};

export default SubmissionForm;

