import React, { useState } from 'react';
import { IStage } from '../../../types/event';
import { 
    Plus, 
    Trash2, 
    GripVertical, 
    Settings2, 
    Clock, 
    ChevronDown, 
    ChevronUp,
    FileText,
    Gavel,
    Trophy,
    UserCheck,
    CheckCircle2,
    Users,
    Mail,
    Sparkles,
    Info,
    Send,
    Check,
    AlertCircle,
    Code2,
    Video,
    Award,
    BadgeCheck,
    MonitorPlay
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, authHeaders } from '../../../apiConfig';
import FieldBuilder from './FieldBuilder';
import JudgeAssignment from './JudgeAssignment';
const EmailSandboxPreview: React.FC<{
    subject: string;
    markdown: string;
    stageName: string;
}> = ({ subject, markdown, stageName }) => {
    const defaultSubject = `Congratulations {{team_name}}! You've advanced to {{stage_name}}`;
    const defaultMarkdown = `Hello **{{participant_name}}**,

Congratulations! Team **"{{team_name}}"** has successfully qualified for **{{stage_name}}** in the event **{{event_name}}**.

Please log in to your StudLyf Event Hub to check details and updated deadlines.

Good luck in the next round!`;

    const activeSubject = subject || defaultSubject;
    const activeMarkdown = markdown || defaultMarkdown;

    const replacePlaceholders = (text: string) => {
        if (!text) return '';
        return text
            .replace(/\{\{team_name\}\}|\{team_name\}/g, 'Apex Coders')
            .replace(/\{\{stage_name\}\}|\{stage_name\}/g, stageName)
            .replace(/\{\{event_name\}\}|\{event_name\}/g, 'StudLyf Hackathon')
            .replace(/\{\{participant_name\}\}|\{participant_name\}/g, 'Alex Mercer')
            .replace(/\{\{deadline\}\}|\{deadline\}/g, '2026-05-29')
            .replace(/\{\{event_link\}\}|\{event_link\}/g, 'https://studlyf.in/dashboard/learner');
    };

    const cleanSubject = replacePlaceholders(activeSubject);
    const cleanMarkdown = replacePlaceholders(activeMarkdown);

    const renderMarkdownToElements = (md: string) => {
        if (!md) return <p className="text-slate-400 italic">Email message body is empty...</p>;
        
        const lines = md.split('\n');
        const elements: React.ReactNode[] = [];
        let listItems: string[] = [];

        const flushList = (key: number) => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${key}`} className="list-disc pl-5 mb-4 space-y-1.5 text-slate-600 text-sm">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">{renderTextWithPlaceholderBadges(item)}</li>
                        ))}
                    </ul>
                );
                listItems = [];
            }
        };

        const renderTextWithPlaceholderBadges = (text: string) => {
            const parts = text.split(/(\{\{.*?\}\}|\{.*?\})/);
            return parts.map((part, index) => {
                if ((part.startsWith('{{') && part.endsWith('}}')) || (part.startsWith('{') && part.endsWith('}'))) {
                    const name = part.startsWith('{{') ? part.slice(2, -2) : part.slice(1, -1);
                    const mockValue = replacePlaceholders(part);
                    return (
                        <span 
                            key={index} 
                            className="inline-flex items-center px-2 py-0.5 mx-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 rounded-md border border-purple-200/50 shadow-sm"
                            title={`Variable: ${part} (Resolves to: "${mockValue}")`}
                        >
                            {name}
                        </span>
                    );
                }
                return part;
            });
        };

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('- ')) {
                listItems.push(trimmed.slice(2));
            } else {
                flushList(index);
                
                if (trimmed.startsWith('### ')) {
                    elements.push(
                        <h4 key={index} className="text-sm font-black text-slate-800 tracking-tight mt-4 mb-2 uppercase">
                            {renderTextWithPlaceholderBadges(trimmed.slice(4))}
                        </h4>
                    );
                } else if (trimmed.startsWith('## ')) {
                    elements.push(
                        <h3 key={index} className="text-base font-black text-purple-600 tracking-tight mt-6 mb-3">
                            {renderTextWithPlaceholderBadges(trimmed.slice(3))}
                        </h3>
                    );
                } else if (trimmed.startsWith('# ')) {
                    elements.push(
                        <h2 key={index} className="text-lg font-black text-slate-900 tracking-tight text-center border-b border-slate-100 pb-3 mt-2 mb-4">
                            {renderTextWithPlaceholderBadges(trimmed.slice(2))}
                        </h2>
                    );
                } else if (trimmed) {
                    elements.push(
                        <p key={index} className="text-sm text-slate-600 leading-relaxed mb-4">
                            {renderTextWithPlaceholderBadges(line)}
                        </p>
                    );
                } else {
                    elements.push(<div key={index} className="h-2" />);
                }
            }
        });

        flushList(lines.length);
        return elements;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 border border-slate-200/60 rounded-[2rem] shadow-md overflow-hidden min-h-[30rem]">
            {/* Mock Inbox Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                    <span className="text-[9px] text-slate-400 font-bold ml-2 tracking-widest uppercase">Inbox Preview</span>
                </div>
                <div className="text-xs space-y-1 mt-2">
                    <p className="text-slate-400 font-medium">From: <span className="text-slate-800 font-bold">StudLyf Notifications &lt;no-reply@studlyf.com&gt;</span></p>
                    <p className="text-slate-400 font-medium">To: <span className="text-slate-800 font-bold">Alex Mercer &lt;alex@apex-coders.com&gt;</span></p>
                    <p className="text-slate-400 font-medium">Subject: <span className="text-[#6C3BFF] font-black">{cleanSubject || <span className="text-slate-300 italic">No subject</span>}</span></p>
                </div>
            </div>

            {/* Email Body Container (Branded Style Isolation) */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[32rem]">
                <div className="max-w-[440px] mx-auto p-6 rounded-2xl border border-slate-200/50 bg-white shadow-sm flex flex-col">
                    {/* Branded Template Header */}
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-[#6C3BFF] mx-auto mb-3 shadow-inner">
                            🎉
                        </div>
                        <h1 className="text-xl font-black text-center text-purple-600 tracking-tight">CONGRATULATIONS!</h1>
                        <p className="text-[9px] text-slate-400 font-black tracking-widest uppercase mt-0.5">Stage Unlocked</p>
                    </div>

                    {/* Standardized White Content Box (where custom Markdown renders) */}
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl mb-6 shadow-inner text-left">
                        {renderMarkdownToElements(cleanMarkdown)}
                    </div>

                    {/* Branded Template Footer & Button */}
                    <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed mb-6">
                        This is an official milestone notification. Deadlines and submissions for the new stage are updated on your dashboard.
                    </p>
                    
                    <a 
                        href="#dashboard" 
                        onClick={(e) => e.preventDefault()}
                        className="w-full text-center py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider block hover:bg-black transition-colors shadow-lg shadow-slate-950/10"
                    >
                        Go to Event Hub
                    </a>
                </div>
            </div>
        </div>
    );
};

interface StageBuilderProps {
    stages: IStage[];
    onUpdate: (stages: IStage[]) => void;
    onConfigureQuiz?: (stageId: string) => void;
    onReviewQuiz?: (quizId: string, quizTitle: string, stageName: string) => void;
    availableJudges?: any[];
    eventId?: string;
    quizzes?: any[];
    event?: any;
    onUpdateEvent?: (event: any) => void;
}

const STAGE_TYPES = [
    { id: 'REGISTRATION', label: 'Registration', icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'TEAM_FORMATION', label: 'Team Formation', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'QUIZ', label: 'Assessment / Quiz', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'SUBMISSION', label: 'Submission', icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'HACKATHON', label: 'Hackathon', icon: Code2, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'MENTORSHIP', label: 'Mentorship', icon: Users, color: 'text-pink-500', bg: 'bg-pink-50' },
    { id: 'REVIEW', label: 'Review / Evaluation', icon: Gavel, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'INTERVIEW', label: 'Interview', icon: Video, color: 'text-teal-500', bg: 'bg-teal-50' },
    { id: 'FINALE', label: 'Finale', icon: Trophy, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'RESULTS', label: 'Results', icon: Award, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'CERTIFICATION', label: 'Certification', icon: BadgeCheck, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { id: 'WORKSHOP', label: 'Workshop / Webinar', icon: MonitorPlay, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
    { id: 'CUSTOM', label: 'Custom', icon: Settings2, color: 'text-slate-500', bg: 'bg-slate-50' },
];

const REGISTRATION_PROFILE_FIELDS = [
    { key: 'profile_type', label: 'Profile Type', category: 'Identity', defaultState: 'REQUIRED' as const },
    { key: 'full_name', label: 'Full Name', category: 'Identity', defaultState: 'REQUIRED' as const },
    { key: 'email', label: 'Email Address', category: 'Identity', defaultState: 'REQUIRED' as const },
    { key: 'phone', label: 'Phone Number', category: 'Identity', defaultState: 'REQUIRED' as const },
    { key: 'location', label: 'Location', category: 'Identity', defaultState: 'OPTIONAL' as const },
    { key: 'gender', label: 'Gender', category: 'Identity', defaultState: 'OPTIONAL' as const },
    { key: 'dob', label: 'Date of Birth', category: 'Identity', defaultState: 'HIDDEN' as const },

    { key: 'college', label: 'College Name', category: 'Education', defaultState: 'REQUIRED' as const },
    { key: 'degree', label: 'Degree / Program', category: 'Education', defaultState: 'OPTIONAL' as const },
    { key: 'branch', label: 'Branch / Department', category: 'Education', defaultState: 'OPTIONAL' as const },
    { key: 'graduation_year', label: 'Graduation Year', category: 'Education', defaultState: 'OPTIONAL' as const },
    { key: 'cgpa', label: 'CGPA / Marks', category: 'Education', defaultState: 'OPTIONAL' as const },

    { key: 'company', label: 'Company', category: 'Professional', defaultState: 'OPTIONAL' as const },
    { key: 'job_title', label: 'Job Title', category: 'Professional', defaultState: 'OPTIONAL' as const },
    { key: 'years_of_experience', label: 'Years of Experience', category: 'Professional', defaultState: 'OPTIONAL' as const },
    { key: 'industry', label: 'Industry', category: 'Professional', defaultState: 'OPTIONAL' as const },
    { key: 'organization_name', label: 'Organization Name', category: 'Professional', defaultState: 'OPTIONAL' as const },
    { key: 'website_url', label: 'Website URL', category: 'Professional', defaultState: 'OPTIONAL' as const },
    { key: 'resume_url', label: 'Resume File', category: 'Professional', defaultState: 'OPTIONAL' as const },
    { key: 'linkedin_url', label: 'LinkedIn Profile', category: 'Professional', defaultState: 'OPTIONAL' as const },
    { key: 'github_url', label: 'GitHub Profile', category: 'Professional', defaultState: 'OPTIONAL' as const },
    { key: 'portfolio_url', label: 'Portfolio URL', category: 'Professional', defaultState: 'HIDDEN' as const },
    { key: 'skills', label: 'Skills / Expertise', category: 'Professional', defaultState: 'OPTIONAL' as const }
];

const normalizeStageTypeId = (rawType: string | undefined) => {
    const cleaned = String(rawType || '').trim();
    if (!cleaned) return 'CUSTOM';
    const normalized = cleaned.replace(/\s+/g, '_').toUpperCase();
    const known = new Set(STAGE_TYPES.map((t) => t.id));
    return known.has(normalized) ? normalized : 'CUSTOM';
};

const getDefaultDependsOn = (nextTypeId: string, stages: IStage[]) => {
    const registrationIds = stages.filter((stage) => normalizeStageTypeId(stage.type) === 'REGISTRATION').map((stage) => stage.id);
    const teamFormationIds = stages.filter((stage) => normalizeStageTypeId(stage.type) === 'TEAM_FORMATION').map((stage) => stage.id);

    if (nextTypeId === 'REGISTRATION') return [];
    if (nextTypeId === 'TEAM_FORMATION') return registrationIds;

    return Array.from(new Set([...registrationIds, ...teamFormationIds]));
};

const getStageMeta = (rawType: string | undefined) => {
    const normalized = normalizeStageTypeId(rawType);
    return STAGE_TYPES.find((t) => t.id === normalized) || STAGE_TYPES[STAGE_TYPES.length - 1];
};

const StageBuilder: React.FC<StageBuilderProps> = ({ stages, onUpdate, onConfigureQuiz, onReviewQuiz, availableJudges = [], eventId, quizzes = [], event, onUpdateEvent }) => {
    const [expandedStage, setExpandedStage] = useState<string | null>(null);

    const [focusedField, setFocusedField] = useState<{
        stageId: string;
        fieldName: 'subject' | 'body';
        selectionStart: number;
        selectionEnd: number;
    } | null>(null);

    const [testEmailRecipient, setTestEmailRecipient] = useState<string>('');
    const [sendingTestStageId, setSendingTestStageId] = useState<string | null>(null);
    const [testSuccessStageId, setTestSuccessStageId] = useState<string | null>(null);
    const [testErrorStageId, setTestErrorStageId] = useState<string | null>(null);
    const [testErrorText, setTestErrorText] = useState<string>('');

    const updateFocusState = (stageId: string, fieldName: 'subject' | 'body', e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const el = e.currentTarget;
        setFocusedField({
            stageId,
            fieldName,
            selectionStart: el.selectionStart || 0,
            selectionEnd: el.selectionEnd || 0
        });
    };

    const handleInsertVariable = (stageId: string, token: string) => {
        const fieldName = (focusedField && focusedField.stageId === stageId) ? focusedField.fieldName : 'body';
        const currentComm = stages.find(s => s.id === stageId)?.communication || {};
        
        const currentValue = fieldName === 'subject' 
            ? (currentComm.draft_email_subject_override !== undefined ? currentComm.draft_email_subject_override : (currentComm.email_subject_override || ''))
            : (currentComm.draft_email_body_markdown !== undefined ? currentComm.draft_email_body_markdown : (currentComm.email_body_markdown || ''));
            
        let start = currentValue.length;
        let end = currentValue.length;
        
        if (focusedField && focusedField.stageId === stageId && focusedField.fieldName === fieldName) {
            start = focusedField.selectionStart;
            end = focusedField.selectionEnd;
        }
        
        const newValue = currentValue.substring(0, start) + token + currentValue.substring(end);
        
        if (fieldName === 'subject') {
            updateStage(stageId, {
                communication: {
                    ...currentComm,
                    draft_email_subject_override: newValue,
                    has_unpublished_changes: true
                }
            });
        } else {
            updateStage(stageId, {
                communication: {
                    ...currentComm,
                    draft_email_body_markdown: newValue,
                    has_unpublished_changes: true
                }
            });
        }
        
        const newCursorPos = start + token.length;
        setFocusedField({
            stageId,
            fieldName,
            selectionStart: newCursorPos,
            selectionEnd: newCursorPos
        });
        
        setTimeout(() => {
            const el = document.getElementById(`${stageId}-${fieldName}`);
            if (el) {
                (el as any).focus();
                (el as any).setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 50);
    };

    const handleSendTestEmail = async (stageId: string) => {
        const stage = stages.find(s => s.id === stageId);
        if (!stage) return;
        
        setSendingTestStageId(stageId);
        setTestSuccessStageId(null);
        setTestErrorStageId(null);
        
        const currentComm = stage.communication || {};
        const draftSubject = currentComm.draft_email_subject_override !== undefined 
            ? currentComm.draft_email_subject_override 
            : (currentComm.email_subject_override || '');
        const draftBody = currentComm.draft_email_body_markdown !== undefined 
            ? currentComm.draft_email_body_markdown 
            : (currentComm.email_body_markdown || '');
        
        try {
            const response = await fetch(`${API_BASE_URL}/events/${eventId}/stages/${stageId}/send-test-email`, {
                method: 'POST',
                headers: {
                    ...authHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    test_email: testEmailRecipient || undefined,
                    email_subject_override: draftSubject || undefined,
                    email_body_markdown: draftBody || undefined
                })
            });
            
            const data = await response.json();
            if (response.ok && data.status === 'success') {
                setTestSuccessStageId(stageId);
                setTimeout(() => setTestSuccessStageId(null), 5000);
            } else {
                setTestErrorStageId(stageId);
                setTestErrorText(data.detail || data.message || 'Failed to send test email');
            }
        } catch (err: any) {
            setTestErrorStageId(stageId);
            setTestErrorText(err.message || 'Network error occurred while sending test email');
        } finally {
            setSendingTestStageId(null);
        }
    };

    const computeStatus = (startDate?: string, endDate?: string): IStage['status'] => {
        const now = new Date();
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && now < start) return 'Upcoming';
        if (end && now > end) return 'Completed';
        return 'Active';
    };

    const calculateStatus = (startDate: string, endDate: string): IStage['status'] => {
        return computeStatus(startDate, endDate);
    };

    const addStage = () => {
        const now = new Date();
        const startDate = now.toISOString().slice(0, 16);
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        const defaultType = 'SUBMISSION';
        
        const newStage: IStage = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
            name: 'New Stage',
            type: defaultType,
            start_date: startDate,
            end_date: endDate,
            status: computeStatus(startDate, endDate),
            visibility: 'Public',
            roundMode: 'Online',
            description: 'Submit your project / abstract',
            depends_on: getDefaultDependsOn(normalizeStageTypeId(defaultType), stages),
            stored_status: undefined,
        };
        onUpdate([...stages, newStage]);
        setExpandedStage(newStage.id);
    };

    const removeStage = (id: string) => {
        onUpdate(stages.filter(s => s.id !== id));
    };

    const updateStage = (id: string, updates: Partial<IStage>) => {
        onUpdate(stages.map(s => {
            if (s.id === id) {
                const updated = { ...s, ...updates };
                // Recalculate status if dates changed
                if (updates.start_date || updates.end_date) {
                    updated.status = calculateStatus(
                        updates.start_date || s.start_date,
                        updates.end_date || s.end_date
                    );
                }
                // If type changed away from REVIEW, clear stale judgeIds
                if (updates.type && updates.type !== s.type && updates.type !== 'REVIEW') {
                    updated.config = { ...(updated.config || {}) };
                    delete updated.config.judgeIds;
                }
                return updated;
            }
            return s;
        }));
    };

    const moveStage = (index: number, direction: 'up' | 'down') => {
        const newStages = [...stages];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < stages.length) {
            [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
            onUpdate(newStages);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Event Stage Engine</h3>
                    <p className="text-sm text-slate-500">Configure your competition lifecycle and rules per stage</p>
                </div>
                <button 
                    onClick={addStage}
                    className="flex items-center gap-2 bg-[#6C3BFF] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-100 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Plus size={18} />
                    Add Stage
                </button>
            </div>

            <div className="space-y-4">
                {stages.length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                        <Settings2 size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">No stages configured yet</p>
                        <p className="text-xs mt-1">Start by adding a Registration or Submission stage</p>
                    </div>
                ) : (
                    stages.map((stage, index) => {
                        const stageTypeId = normalizeStageTypeId(stage.type);
                        const stageMeta = getStageMeta(stage.type);
                        const showStageBrief = true;
                        const showFieldBuilder = !['QUIZ', 'REVIEW'].includes(stageTypeId);
                        return (
                        <div 
                            key={stage.id}
                            className={`bg-white border rounded-3xl transition-all ${expandedStage === stage.id ? 'border-[#6C3BFF] shadow-xl shadow-purple-50 ring-1 ring-purple-100' : 'border-slate-100 shadow-sm'}`}
                        >
                            {/* Header */}
                            <div 
                                className="p-5 flex items-center gap-4 cursor-pointer"
                                onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                            >
                                <div className="p-2 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                                    <GripVertical size={20} />
                                </div>

                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stageMeta?.bg || 'bg-slate-50'}`}>
                                    {React.createElement(stageMeta?.icon || Settings2, {
                                        size: 20,
                                        className: stageMeta?.color || 'text-slate-500'
                                    })}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-900">{stage.name}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            computeStatus(stage.start_date, stage.end_date) === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {computeStatus(stage.start_date, stage.end_date)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                            <Clock size={12} />
                                            {stage.start_date} — {stage.end_date}
                                        </span>
                                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                            <CheckCircle2 size={12} />
                                            {stageMeta?.label || stage.type}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); moveStage(index, 'up'); }}
                                            disabled={index === 0}
                                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                                        >
                                            <ChevronUp size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); moveStage(index, 'down'); }}
                                            disabled={index === stages.length - 1}
                                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeStage(stage.id); }}
                                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Details Panel */}
                            <AnimatePresence>
                                {expandedStage === stage.id && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-8 border-t border-slate-50 bg-slate-50/30 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stage Name</label>
                                                <input 
                                                    type="text" 
                                                    value={stage.name}
                                                    onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                                                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 outline-none font-bold text-slate-900"
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stage Type</label>
                                                <select 
                                                value={stageTypeId}
                                                onChange={(e) => {
                                                    const nextType = e.target.value as any;

                                                    // [FIX] Validate stage separation
                                                    if (['REGISTRATION', 'TEAM_FORMATION'].includes(nextType)) {
                                                        const exists = stages.some(s => s.id !== stage.id && normalizeStageTypeId(s.type) === nextType);
                                                        if (exists) {
                                                            alert(`An event can only have one ${nextType.replace('_', ' ')} stage.`);
                                                            return;
                                                        }
                                                    }

                                                    const hasDepends = Array.isArray(stage.depends_on) && stage.depends_on.length > 0;
                                                    updateStage(stage.id, {
                                                        type: nextType,
                                                        depends_on: hasDepends ? stage.depends_on : getDefaultDependsOn(normalizeStageTypeId(nextType), stages)
                                                    });
                                                }}
                                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 outline-none font-bold text-slate-900"
                                                >
                                                    {STAGE_TYPES.map(t => (
                                                        <option key={t.id} value={t.id}>{t.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Round Mode</label>
                                                <select
                                                    value={stage.roundMode || 'Online'}
                                                    onChange={(e) => updateStage(stage.id, { roundMode: e.target.value as any })}
                                                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 outline-none font-bold text-slate-900"
                                                >
                                                    <option value="Online">Online</option>
                                                    <option value="Offline">Offline</option>
                                                    <option value="Hybrid">Hybrid</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date & Time</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        value={stage.start_date || ''}
                                                        min={new Date().toISOString().slice(0, 16)}
                                                        max="2099-12-31T23:59"
                                                        onChange={(e) => updateStage(stage.id, { start_date: e.target.value })}
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date & Time</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        value={stage.end_date || ''}
                                                        min={stage.start_date || new Date().toISOString().slice(0, 16)}
                                                        max="2099-12-31T23:59"
                                                        onChange={(e) => updateStage(stage.id, { end_date: e.target.value })}
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Visibility</label>
                                                <div className="flex gap-2">
                                                    {['Public', 'Private', 'Shortlisted Only'].map((v) => (
                                                        <button 
                                                            key={v}
                                                            onClick={() => updateStage(stage.id, { visibility: v as any })}
                                                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                                                                stage.visibility === v ? 'bg-[#6C3BFF] text-white border-[#6C3BFF]' : 'bg-white text-slate-400 border-slate-200'
                                                            }`}
                                                        >
                                                            {v}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Result Time</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={stage.result_time || ''}
                                                        max="2099-12-31T23:59"
                                                        onChange={(e) => updateStage(stage.id, { result_time: e.target.value || undefined })}
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                                    />
                                                    <p className="text-[9px] text-slate-400 ml-1">When results/pass marks are published</p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stage Status</label>
                                                    <select
                                                        value={stage.stored_status || ''}
                                                        onChange={(e) => updateStage(stage.id, { stored_status: (e.target.value as any) || undefined })}
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-900"
                                                    >
                                                        <option value="">Auto (from dates)</option>
                                                        <option value="draft">Draft</option>
                                                        <option value="scheduled">Scheduled</option>
                                                        <option value="active">Active</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Depends On (unlock rules)</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {stages.filter(s => s.id !== stage.id).map((s) => {
                                                            const isSelected = (stage.depends_on || []).includes(s.id);
                                                            return (
                                                                <button
                                                                    key={s.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = stage.depends_on || [];
                                                                        const updated = isSelected
                                                                            ? current.filter((id: string) => id !== s.id)
                                                                            : [...current, s.id];
                                                                        updateStage(stage.id, { depends_on: updated });
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                                        isSelected
                                                                            ? 'bg-[#6C3BFF] text-white border-[#6C3BFF]'
                                                                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    {s.name}
                                                                </button>
                                                            );
                                                        })}
                                                        {stages.filter(s => s.id !== stage.id).length === 0 && (
                                                            <span className="text-[10px] text-slate-400 italic">No other stages to depend on</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 ml-1">Participant must complete selected stages first</p>
                                                </div>
                                            </div>

                                            {showStageBrief && (
                                                stageTypeId === 'REGISTRATION' ? (
                                                    <div className="md:col-span-2 p-8 bg-purple-50/30 rounded-[2rem] border border-purple-100/50 space-y-8">
                                                        {/* Header */}
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-[#6C3BFF]">
                                                                <UserCheck size={20} />
                                                            </div>
                                                            <div>
                                                                <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Registration Stage Config</h5>
                                                                <p className="text-[10px] text-slate-500 font-medium">Configure registration fields, instructions, approval flow, and custom questions</p>
                                                            </div>
                                                        </div>

                                                        {/* Stage Instructions Textarea */}
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stage instructions</label>
                                                            <textarea
                                                                value={stage.description || ''}
                                                                onChange={(e) => updateStage(stage.id, { description: e.target.value })}
                                                                placeholder="Tell participants what they need to know, do, or follow to successfully complete their registration."
                                                                className="w-full min-h-28 px-5 py-4 bg-white border border-purple-100 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-medium text-slate-700"
                                                            />
                                                        </div>

                                                        {/* Registration Approval Mode Selector */}
                                                        {(() => {
                                                            const approvalMode = event?.registration_settings?.approval_mode || 'AUTO_APPROVE';
                                                            
                                                            const updateRegistrationSettings = (updates: any) => {
                                                                if (!onUpdateEvent || !event) return;
                                                                onUpdateEvent({
                                                                    ...event,
                                                                    registration_settings: {
                                                                        ...(event.registration_settings || {}),
                                                                        ...updates
                                                                    }
                                                                });
                                                            };

                                                            return (
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration Approval Mode</label>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateRegistrationSettings({ approval_mode: 'AUTO_APPROVE' })}
                                                                            className={`p-5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-4 ${
                                                                                approvalMode === 'AUTO_APPROVE'
                                                                                    ? 'bg-white border-[#6C3BFF] ring-2 ring-purple-100 shadow-md'
                                                                                    : 'bg-white/40 border-slate-200 hover:border-slate-300 shadow-sm'
                                                                            }`}
                                                                        >
                                                                            <div className={`p-2.5 rounded-xl ${approvalMode === 'AUTO_APPROVE' ? 'bg-[#6C3BFF] text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                                                                                <CheckCircle2 size={18} />
                                                                            </div>
                                                                            <div>
                                                                                <h6 className="text-xs font-black text-slate-900 uppercase tracking-wide">Instant Auto-Approve</h6>
                                                                                <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">
                                                                                    Participants are automatically approved upon registration.
                                                                                </p>
                                                                            </div>
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateRegistrationSettings({ approval_mode: 'MANUAL_APPROVAL' })}
                                                                            className={`p-5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-4 ${
                                                                                approvalMode === 'MANUAL_APPROVAL'
                                                                                    ? 'bg-white border-[#6C3BFF] ring-2 ring-purple-100 shadow-md'
                                                                                    : 'bg-white/40 border-slate-200 hover:border-slate-300 shadow-sm'
                                                                            }`}
                                                                        >
                                                                            <div className={`p-2.5 rounded-xl ${approvalMode === 'MANUAL_APPROVAL' ? 'bg-[#6C3BFF] text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                                                                                <Gavel size={18} />
                                                                            </div>
                                                                            <div>
                                                                                <h6 className="text-xs font-black text-slate-900 uppercase tracking-wide">Manual Host Review</h6>
                                                                                <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">
                                                                                    Every registration requires your manual review in the dashboard.
                                                                                </p>
                                                                            </div>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* External Registration Link */}
                                                        {onUpdateEvent && event && (
                                                            <div className="space-y-3">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">External Registration Link (Optional)</label>
                                                                <div className="flex flex-col gap-2">
                                                                    <input 
                                                                        type="url"
                                                                        value={event.external_registration_link || event.externalRegistrationLink || ''}
                                                                        onChange={(e) => onUpdateEvent({
                                                                            ...event,
                                                                            external_registration_link: e.target.value
                                                                        })}
                                                                        placeholder="e.g., https://hackprix-2026.devfolio.co/overview"
                                                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 outline-none font-medium text-slate-900 shadow-sm"
                                                                    />
                                                                    <p className="text-[10px] text-slate-500 font-medium ml-1">
                                                                        If provided, clicking "Register" will redirect users to this external URL instead of opening the built-in Studlyf registration form.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Default Profile Fields Config Table */}
                                                        {(() => {
                                                            const config = event?.registration_settings?.profile_fields_config || {};
                                                            
                                                            const updateRegistrationSettings = (updates: any) => {
                                                                if (!onUpdateEvent || !event) return;
                                                                onUpdateEvent({
                                                                    ...event,
                                                                    registration_settings: {
                                                                        ...(event.registration_settings || {}),
                                                                        ...updates
                                                                    }
                                                                });
                                                            };

                                                            const handleFieldConfigChange = (fieldKey: string, option: 'REQUIRED' | 'OPTIONAL' | 'HIDDEN') => {
                                                                const currentConfig = { ...config };
                                                                currentConfig[fieldKey] = option;
                                                                updateRegistrationSettings({
                                                                    profile_fields_config: currentConfig
                                                                });
                                                            };

                                                            return (
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Profile Fields Config</label>
                                                                        <p className="text-[10px] text-slate-500 font-medium ml-1">Configure which reusable profile fields are required, optional, or completely hidden from the registration form.</p>
                                                                    </div>
                                                                    <div className="overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-sm">
                                                                        <table className="w-full text-left border-collapse">
                                                                            <thead>
                                                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                                                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Field Name</th>
                                                                                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Category</th>
                                                                                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Visibility & Rules</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100/70 text-xs">
                                                                                {REGISTRATION_PROFILE_FIELDS.map((field) => {
                                                                                    const value = config[field.key] || field.defaultState || 'OPTIONAL';
                                                                                    
                                                                                    return (
                                                                                        <tr key={field.key} className="hover:bg-slate-50/40 transition-colors">
                                                                                            <td className="px-5 py-4 font-bold text-slate-800 flex items-center gap-2">
                                                                                                {field.label}
                                                                                            </td>
                                                                                            <td className="px-5 py-4">
                                                                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                                                                    field.category === 'Identity'
                                                                                                        ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                                                                                                        : field.category === 'Education'
                                                                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100/30'
                                                                                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100/30'
                                                                                                }`}>
                                                                                                    {field.category}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="px-5 py-4 text-right">
                                                                                                <div className="inline-flex p-0.5 bg-slate-100/80 rounded-xl border border-slate-200/40 shadow-inner">
                                                                                                    {(['REQUIRED', 'OPTIONAL', 'HIDDEN'] as const).map((opt) => {
                                                                                                        const isSelected = value === opt;
                                                                                                        return (
                                                                                                            <button
                                                                                                                key={opt}
                                                                                                                type="button"
                                                                                                                onClick={() => handleFieldConfigChange(field.key, opt)}
                                                                                                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                                                                                                                    isSelected
                                                                                                                        ? 'bg-[#6C3BFF] text-white shadow-sm'
                                                                                                                        : 'text-slate-400 hover:text-slate-700 hover:bg-white/40'
                                                                                                                }`}
                                                                                                            >
                                                                                                                {opt}
                                                                                                            </button>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Custom Questions Section */}
                                                        <div className="space-y-4 pt-6 border-t border-slate-100">
                                                            <div className="flex items-center gap-2">
                                                                <Sparkles size={16} className="text-[#6C3BFF]" />
                                                                <h6 className="text-xs font-black text-slate-900 uppercase tracking-tight">Custom Registration Questions</h6>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 font-medium">Add dynamic fields or multi-choice questions unique to this event.</p>
                                                            
                                                            <FieldBuilder 
                                                                fields={stage.config?.fields || []} 
                                                                onUpdate={(newFields) => updateStage(stage.id, { 
                                                                    config: { ...(stage.config || {}), fields: newFields } 
                                                                })} 
                                                            />
                                                        </div>

                                                        {/* Team Formation Section */}
                                                        <div className="space-y-4 pt-6 border-t border-slate-100">
                                                            <div className="flex items-center gap-2">
                                                                <Users size={16} className="text-indigo-500" />
                                                                <h6 className="text-xs font-black text-slate-900 uppercase tracking-tight">Team Formation</h6>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 font-medium">Configure team settings for this registration stage.</p>
                                                            
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Min Team Size</label>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        value={stage.config?.team_min_size ?? ''}
                                                                        onChange={(e) => updateStage(stage.id, {
                                                                            config: { ...(stage.config || {}), team_min_size: e.target.value ? parseInt(e.target.value, 10) : undefined }
                                                                        })}
                                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Team Size</label>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        value={stage.config?.team_max_size ?? ''}
                                                                        onChange={(e) => updateStage(stage.id, {
                                                                            config: { ...(stage.config || {}), team_max_size: e.target.value ? parseInt(e.target.value, 10) : undefined }
                                                                        })}
                                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-sm"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={stage.config?.allow_individual_registration ?? true}
                                                                        onChange={(e) => updateStage(stage.id, {
                                                                            config: { ...(stage.config || {}), allow_individual_registration: e.target.checked }
                                                                        })}
                                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <div>
                                                                        <span className="text-sm font-bold text-slate-800">Allow Individual Registration</span>
                                                                        <p className="text-[10px] text-slate-500 font-medium">Participants can register solo without a team.</p>
                                                                    </div>
                                                                </label>
                                                                <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={stage.config?.allow_cross_college_teams ?? true}
                                                                        onChange={(e) => updateStage(stage.id, {
                                                                            config: { ...(stage.config || {}), allow_cross_college_teams: e.target.checked }
                                                                        })}
                                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <div>
                                                                        <span className="text-sm font-bold text-slate-800">Allow Cross-College Teams</span>
                                                                        <p className="text-[10px] text-slate-500 font-medium">Participants from different colleges can team up.</p>
                                                                    </div>
                                                                </label>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Formation Instructions</label>
                                                                <textarea
                                                                    value={stage.config?.team_formation_instructions || ''}
                                                                    onChange={(e) => updateStage(stage.id, {
                                                                        config: { ...(stage.config || {}), team_formation_instructions: e.target.value }
                                                                    })}
                                                                    placeholder="e.g., Form a team of up to 4 members. You can invite teammates using their email or share your team invite code."
                                                                    className="w-full min-h-20 px-5 py-4 bg-white border border-indigo-100 rounded-2xl focus:ring-2 focus:ring-indigo-200 outline-none font-medium text-slate-700"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : stageTypeId === 'TEAM_FORMATION' ? (
                                                    <div className="md:col-span-2 p-8 bg-indigo-50/30 rounded-[2rem] border border-indigo-100/50 space-y-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                                                <Users size={20} />
                                                            </div>
                                                            <div>
                                                                <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Team Formation Stage Config</h5>
                                                                <p className="text-[10px] text-slate-500 font-medium">Configure team size rules, participation mode, and team instructions.</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2 mb-6">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stage instructions</label>
                                                            <textarea
                                                                value={stage.description || ''}
                                                                onChange={(e) => updateStage(stage.id, { description: e.target.value })}
                                                                placeholder="Tell participants how teams should be formed and what they should do next."
                                                                className="w-full min-h-28 px-5 py-4 bg-white border border-indigo-100 rounded-2xl focus:ring-2 focus:ring-indigo-200 outline-none font-medium text-slate-700"
                                                            />
                                                        </div>

                                                        <div className="space-y-4 pt-6 border-t border-slate-100">
                                                            <div className="flex items-center gap-2">
                                                                <Users size={16} className="text-indigo-500" />
                                                                <h6 className="text-xs font-black text-slate-900 uppercase tracking-tight">Team Formation</h6>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 font-medium">Configure team settings for this stage.</p>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Min Team Size</label>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        value={stage.config?.team_min_size ?? ''}
                                                                        onChange={(e) => updateStage(stage.id, {
                                                                            config: { ...(stage.config || {}), team_min_size: e.target.value ? parseInt(e.target.value, 10) : undefined }
                                                                        })}
                                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Team Size</label>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        value={stage.config?.team_max_size ?? ''}
                                                                        onChange={(e) => updateStage(stage.id, {
                                                                            config: { ...(stage.config || {}), team_max_size: e.target.value ? parseInt(e.target.value, 10) : undefined }
                                                                        })}
                                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-sm"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={stage.config?.allow_individual_registration ?? true}
                                                                        onChange={(e) => updateStage(stage.id, {
                                                                            config: { ...(stage.config || {}), allow_individual_registration: e.target.checked }
                                                                        })}
                                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <div>
                                                                        <span className="text-sm font-bold text-slate-800">Allow Individual Registration</span>
                                                                        <p className="text-[10px] text-slate-500 font-medium">Participants can register solo without a team.</p>
                                                                    </div>
                                                                </label>
                                                                <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={stage.config?.allow_cross_college_teams ?? true}
                                                                        onChange={(e) => updateStage(stage.id, {
                                                                            config: { ...(stage.config || {}), allow_cross_college_teams: e.target.checked }
                                                                        })}
                                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <div>
                                                                        <span className="text-sm font-bold text-slate-800">Allow Cross-College Teams</span>
                                                                        <p className="text-[10px] text-slate-500 font-medium">Participants from different colleges can team up.</p>
                                                                    </div>
                                                                </label>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Formation Instructions</label>
                                                                <textarea
                                                                    value={stage.config?.team_formation_instructions || ''}
                                                                    onChange={(e) => updateStage(stage.id, {
                                                                        config: { ...(stage.config || {}), team_formation_instructions: e.target.value }
                                                                    })}
                                                                    placeholder="e.g., Form a team of up to 4 members. You can invite teammates using their email or share your team invite code."
                                                                    className="w-full min-h-20 px-5 py-4 bg-white border border-indigo-100 rounded-2xl focus:ring-2 focus:ring-indigo-200 outline-none font-medium text-slate-700"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="md:col-span-2 p-8 bg-emerald-50/30 rounded-[2rem] border border-emerald-100/50">
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                                                <Plus size={20} />
                                                            </div>
                                                            <div>
                                                                <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Stage Instructions</h5>
                                                                <p className="text-[10px] text-slate-500 font-medium">Add clear instructions that participants will see in the UI for this stage</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2 mb-6">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stage instructions</label>
                                                            <textarea
                                                                value={stage.description || ''}
                                                                onChange={(e) => updateStage(stage.id, { description: e.target.value })}
                                                                placeholder={
                                                                    stageTypeId === 'SUBMISSION'
                                                                        ? 'Tell participants exactly what to submit, expected format, and any rules.'
                                                                        : 'Tell participants what they should know, do, or follow for this stage.'
                                                                }
                                                                className="w-full min-h-28 px-5 py-4 bg-white border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-200 outline-none font-medium text-slate-700"
                                                            />
                                                        </div>

                                                        {showFieldBuilder ? (
                                                            <FieldBuilder 
                                                                fields={stage.config?.fields || []} 
                                                                onUpdate={(newFields) => updateStage(stage.id, { 
                                                                    config: { ...(stage.config || {}), fields: newFields } 
                                                                })} 
                                                            />
                                                        ) : (
                                                            <div className="p-4 bg-white border border-emerald-100 rounded-2xl text-xs text-slate-500 font-medium">
                                                                This stage uses the instruction box only. Student-input fields are available for submission stages.
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}

                                            {stageTypeId === 'REVIEW' && (
                                                <div className="md:col-span-2 p-8 bg-purple-50/30 rounded-[2rem] border border-purple-100/50">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                                                            <Gavel size={20} />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Judge Assignment & Rubric</h5>
                                                            <p className="text-[10px] text-slate-500 font-medium">Select experts to evaluate submissions for this stage</p>
                                                        </div>
                                                    </div>

                                                    <JudgeAssignment 
                                                        assignedJudgeIds={stage.config?.judgeIds || []}
                                                        onUpdate={(newJudgeIds) => updateStage(stage.id, {
                                                            config: { ...(stage.config || {}), judgeIds: newJudgeIds }
                                                        })}
                                                        availableJudges={availableJudges}
                                                    />
                                                </div>
                                            )}

                                            {stageTypeId === 'QUIZ' ? (
                                                <div className="md:col-span-2 p-8 bg-amber-50/30 rounded-[2rem] border border-amber-100/50 space-y-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                                                Assessment settings
                                                            </h5>
                                                            <p className="text-[10px] text-slate-500 font-medium">
                                                                Attach a single-choice/coding assessment and set pass mark.
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {stage.config?.quiz_id && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onReviewQuiz?.(
                                                                        stage.config!.quiz_id,
                                                                        (quizzes.find((q: any) => String(q._id || q.id) === String(stage.config!.quiz_id)) || {}).title || 'Quiz',
                                                                        stage.name
                                                                    )}
                                                                    className="px-4 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-200/50"
                                                                >
                                                                    Review Results
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => onConfigureQuiz?.(stage.id)}
                                                                className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#6C3BFF] transition-all"
                                                            >
                                                                Configure questions
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pass mark (%)</label>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                value={stage.config?.pass_mark ?? 70}
                                                                onChange={(e) =>
                                                                    updateStage(stage.id, {
                                                                        config: { ...(stage.config || {}), pass_mark: Number(e.target.value) },
                                                                    })
                                                                }
                                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Linked quiz</label>
                                                            <div className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold truncate">
                                                                {(() => {
                                                                    const qid = stage.config?.quiz_id;
                                                                    if (!qid) return 'Not configured';
                                                                    const match = quizzes.find((q: any) => String(q._id || q.id) === String(qid));
                                                                    return match ? match.title || String(qid) : String(qid);
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>

                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                    })
                )}
            </div>
        </div>
    );
};

export default StageBuilder;

