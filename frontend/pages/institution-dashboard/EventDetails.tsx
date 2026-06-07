import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import EmailTemplatesManager from './components/EmailTemplatesManager';
import { 
    ArrowLeft, 
    Save, 
    X, 
    ChevronLeft, 
    UsersRound, 
    Link as LinkIcon, 
    Loader2, 
    Upload, 
    FileText, 
    CheckCircle2, 
    Clock, 
    Trophy, 
    Share2, 
    Copy, 
    Check, 
    Filter, 
    Plus, 
    AlertCircle, 
    Download, 
    ExternalLink, 
    LayoutDashboard, 
    Bell, 
    TrendingUp, 
    HelpCircle, 
    BarChart3, 
    PieChart, 
    ShieldCheck, 
    Award, 
    Gavel, 
    Calendar, 
    RefreshCw, 
    Eye, EyeOff,
    XCircle, 
    Users, 
    Layers, 
    Info, 
    MapPin, 
    ChevronRight, 
    Settings2, 
    Send, 
    Timer, 
    Search, 
    Mail, 
    Settings, 
    Edit3, 
    Building2, 
    Square, 
    CheckSquare, 
    UserPlus,
    FileCheck,
    Trash2,
    UploadCloud,
    Zap,
    Lightbulb,
    Globe,
    Github,
    GitBranch,
    FileImage,
    FileVideo
} from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs';
import { motion, AnimatePresence as FramerAnimatePresence } from 'framer-motion';
import LeaderboardPage from './LeaderboardPage';
import { useNavigate } from 'react-router-dom';
import StageBuilder from './components/StageBuilder';
import AssessmentReviewModal from './components/AssessmentReviewModal';
import QuizDesignerModal from './components/QuizDesignerModal';
import JudgeInviteModal from './components/JudgeInviteModal';
import EvaluationMatrixView from './components/EvaluationMatrixView';
import PipelineView from './components/PipelineView';
import HackathonEventPackage from './components/HackathonEventPackage';
import { IEvent, IParticipant, ITeam, IStage, ISubmission } from '../../types/event';
import { useAuth } from '../../AuthContext';
import { sanitizePresentationHtml } from '../../utils/text';

interface EventDetailsProps {
    eventId: string | null;
    onBack: () => void;
    institutionId?: string;
    initialSection?: string;
    onEditEvent?: (eventId: string) => void;
}

const BUNDLE_TABS = ['shortlisted', 'approved', 'pending', 'rejected'] as const;
const BUNDLE_TAB_LABEL: Record<string, string> = {
    shortlisted: 'Shortlisted',
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected',
};

const getBundleSourceLabel = (item: any) => {
    if (item?.source === 'stage_deliverable' || item?._sourceType === 'stage') return 'Stage Deliverable';
    if (item?.source === 'hackathon_submission' || item?._sourceType === 'hackathon') return 'Hackathon Submission';
    if (item?.team_id) return 'Team Submission';
    return 'Submission';
};

const getBundleStatusLabel = (status: string) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'accepted') return 'Approved';
    if (normalized === 'shortlisted') return 'Shortlisted';
    if (normalized === 'rejected') return 'Rejected';
    if (normalized === 'pending review' || normalized === 'under review') return 'Pending Review';
    if (normalized === 'evaluated') return 'Evaluated';
    return status || 'Pending';
};

const getBundleActionHint = (item: any) => {
    const sourceLabel = getBundleSourceLabel(item);
    const statusLabel = getBundleStatusLabel(item?.status || 'Pending');
    return `${sourceLabel} • Current: ${statusLabel}`;
};

const EventDetails: React.FC<EventDetailsProps> = ({ eventId, onBack, institutionId: institutionIdProp, initialSection, onEditEvent }) => {
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const [activeTab, setActiveTab] = useState(initialSection || 'dashboard');
    const [event, setEvent] = useState<IEvent | null>(null);
    const [logoError, setLogoError] = useState(false);
    const [bannerError, setBannerError] = useState(false);
    const prevLogoUrl = useRef<string | undefined>(undefined);
    const prevBannerUrl = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (event?.logo_url && event.logo_url !== prevLogoUrl.current) {
            prevLogoUrl.current = event.logo_url;
            setLogoError(false);
        }
        if (event?.banner_url && event.banner_url !== prevBannerUrl.current) {
            prevBannerUrl.current = event.banner_url;
            setBannerError(false);
        }
    }, [event?.logo_url, event?.banner_url]);
    const [institution, setInstitution] = useState<any>(null);
    const [participants, setParticipants] = useState<IParticipant[]>([]);
    const [stages, setStages] = useState<IStage[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [criteria, setCriteria] = useState<any[]>([]);
    const [bundleData, setBundleData] = useState<any>(null);
    const [prizeDistribution, setPrizeDistribution] = useState<any[]>([]);
    const [threshold, setThreshold] = useState(0);
    const [debouncedThreshold, setDebouncedThreshold] = useState(0);
    const [bundleTab, setBundleTab] = useState<string>('shortlisted');
    const [teams, setTeams] = useState<ITeam[]>([]);
    const [submissions, setSubmissions] = useState<ISubmission[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (initialSection) setActiveTab(initialSection);
    }, [initialSection, eventId]);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [previewAsset, setPreviewAsset] = useState<{ url: string; filename: string; type: string } | null>(null);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
    const [quizStageId, setQuizStageId] = useState<string | null>(null);
    const [reviewQuiz, setReviewQuiz] = useState<{ quizId: string; quizTitle: string; stageName: string } | null>(null);
    const [codingAttempts, setCodingAttempts] = useState<Record<string, any[]>>({});
    const [editDescription, setEditDescription] = useState(false);
    const [reviewingParticipantId, setReviewingParticipantId] = useState<string | null>(null);
    const [portalReviewNotice, setPortalReviewNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const [stageSubmissions, setStageSubmissions] = useState<ISubmission[]>([]);
    const [submissionSubTab, setSubmissionSubTab] = useState<'projects' | 'assets' | 'assessments'>('projects');
    const [selectedSubTabQuizStageId, setSelectedSubTabQuizStageId] = useState<string>('');
    const [quizResults, setQuizResults] = useState<any[]>([]);
    const [quizResultsLoading, setQuizResultsLoading] = useState(false);
    const [quizResultsError, setQuizResultsError] = useState('');
    const [quizResultsSearch, setQuizResultsSearch] = useState('');
    const [quizSelectedIds, setQuizSelectedIds] = useState<Set<string>>(new Set());
    const [quizShortlisting, setQuizShortlisting] = useState(false);
    const [quizNotifying, setQuizNotifying] = useState(false);
    const [quizShortlistDone, setQuizShortlistDone] = useState(false);
    const [quizNotifyDone, setQuizNotifyDone] = useState(false);
    const [judgeAssignmentModal, setJudgeAssignmentModal] = useState<{ isOpen: boolean; submissionId: string | null }>({ isOpen: false, submissionId: null });
    const [availableJudges, setAvailableJudges] = useState<any[]>([]);
    const [isJudgeInviteOpen, setIsJudgeInviteOpen] = useState(false);
    const [isInvitingJudge, setIsInvitingJudge] = useState(false);
    const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [faqSearch, setFaqSearch] = useState('');
    const [showFaqBulkImport, setShowFaqBulkImport] = useState(false);
    const [faqBulkImportText, setFaqBulkImportText] = useState('');
    const [faqBulkImportLoading, setFaqBulkImportLoading] = useState(false);

    const [hackathonPackageEnabled, setHackathonPackageEnabled] = useState(false);
    const [hackathonSubmissions, setHackathonSubmissions] = useState<any[]>([]);
    const [domainFilter, setDomainFilter] = useState('All Domains');
    const [judgeFilter, setJudgeFilter] = useState('All Judges');
    const [institutionJudges, setInstitutionJudges] = useState<any[]>([]);
    const [isBulkNotifyModalOpen, setIsBulkNotifyModalOpen] = useState(false);
    const [bulkNotifyMessage, setBulkNotifyMessage] = useState('');
    const [bulkNotifySubject, setBulkNotifySubject] = useState('');
    const [bulkNotifyNextStage, setBulkNotifyNextStage] = useState('');
    const [bulkNotifyTemplates, setBulkNotifyTemplates] = useState<any[]>([]);
    const [bulkNotifySelectedTemplate, setBulkNotifySelectedTemplate] = useState<string>('default');
    const [bulkNotifyMinScore, setBulkNotifyMinScore] = useState<string>('');
    const [showBulkPreview, setShowBulkPreview] = useState(false);

    // ─── DECOUPLED REGISTRATION SYSTEM STATES ──────────────────────────────────────
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [rosterSolos, setRosterSolos] = useState<any[]>([]);
    const [rosterTeams, setRosterTeams] = useState<any[]>([]);
    const [regStats, setRegStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0, waitlisted: 0, notified_approved: 0, pending_notification: 0 });
    const [regPage, setRegPage] = useState(1);
    const [regTotalPages, setRegTotalPages] = useState(1);
    const [regSearch, setRegSearch] = useState('');
    const [regStatusFilter, setRegStatusFilter] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [regActionBusy, setRegActionBusy] = useState<string | null>(null);
    const [expandedRegId, setExpandedRegId] = useState<string | null>(null);
    const [notifyingApproved, setNotifyingApproved] = useState(false);
    const [issuingCertificates, setIssuingCertificates] = useState(false);
    
    // Server-driven registration form & eligibility (propagate profile_type prefill/lock)
    const [registrationFormDef, setRegistrationFormDef] = useState<any | null>(null);
    const [registrationUiFields, setRegistrationUiFields] = useState<any[]>([]);
    const [registrationPrefillMap, setRegistrationPrefillMap] = useState<Record<string, any>>({});
    const [registrationEligibility, setRegistrationEligibility] = useState<any>(null);
    const [registrationEligible, setRegistrationEligible] = useState<boolean | null>(null);
    const [registrationEligibilityReason, setRegistrationEligibilityReason] = useState<string | null>(null);
    const [profileTypeLockedForPrefill, setProfileTypeLockedForPrefill] = useState(false);

    const fetchRegistrations = async () => {
        if (!eventId || activeTab !== 'registrations') return;
        setRegLoading(true);
        try {
            const queryParams = new URLSearchParams({
                search: regSearch,
                status: regStatusFilter
            });
            const res = await fetch(`${API_BASE_URL}/api/v1/registration/events/${eventId}/roster?${queryParams.toString()}`, {
                headers: authHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setRosterSolos(data.roster?.solos || []);
                setRosterTeams(data.roster?.teams || []);
                setRegistrations(data.roster?.solos || []); // fallback
                setRegStats(data.stats || { total: 0, approved: 0, pending: 0, rejected: 0, waitlisted: 0, notified_approved: 0, pending_notification: 0 });
                setRegTotalPages(1);
            }
        } catch (err) {
            console.error('Failed to fetch registrations:', err);
        } finally {
            setRegLoading(false);
        }
    };
    useEffect(() => {
        fetchRegistrations();
    }, [eventId, activeTab, regPage, regStatusFilter, refreshCounter]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (activeTab === 'registrations') {
                setRegPage(1);
                fetchRegistrations();
            }
        }, 350);
        return () => clearTimeout(handler);
    }, [regSearch]);

    const handleUpdateTeamStatus = async (teamId: string, newStatus: string) => {
        if (!eventId) return;
        setRegActionBusy(teamId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/registration/events/${eventId}/teams/${teamId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders()
                },
                body: JSON.stringify({ status_update: newStatus })
            });
            if (res.ok) {
                setRefreshCounter(prev => prev + 1);
                setShowSaveSuccess(true);
                setTimeout(() => setShowSaveSuccess(false), 2000);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Failed to update team status: ${err.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Error updating team status:', err);
            alert('Network error while updating team status.');
        } finally {
            setRegActionBusy(null);
        }
    };

    const handleUpdateRegistrationStatus = async (registrationId: string, newStatus: string) => {
        if (!eventId) return;
        setRegActionBusy(registrationId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/registration/events/${eventId}/participants/${registrationId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders()
                },
                body: JSON.stringify({ status_update: newStatus })
            });
            if (res.ok) {
                setRefreshCounter(prev => prev + 1);
                setShowSaveSuccess(true);
                setTimeout(() => setShowSaveSuccess(false), 2000);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Failed to update status: ${err.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Error updating registration status:', err);
            alert('Network error while updating registration status.');
        } finally {
            setRegActionBusy(null);
        }
    };

    const handleNotifyApproved = async () => {
        if (!eventId) return;
        const count = (regStats as any).pending_notification ?? regStats.approved;
        if (count === 0 && regStats.approved > 0) {
            alert('All approved participants have already been notified.');
            return;
        }
        if (!confirm(`Send notification email to ${count} newly approved participant${count === 1 ? '' : 's'}?`)) return;
        setNotifyingApproved(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/registration/events/${eventId}/notify-approved`, {
                method: 'POST',
                headers: { ...authHeaders() },
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Notification sent to ${data.sent} approved participants.`);
            } else {
                alert('Failed: ' + (data.detail || 'Unknown error'));
            }
        } catch (err) {
            alert('Network error.');
        } finally {
            setNotifyingApproved(false);
        }
    };

    const handleIssueCertificates = async () => {
        if (!eventId || !event) return;

        const approvedRows = Array.isArray(bundleData?.approved) ? bundleData.approved : [];
        const userIds = Array.from(new Set(
            approvedRows.flatMap((item: any) => {
                if (Array.isArray(item?.member_user_ids) && item.member_user_ids.length > 0) {
                    return item.member_user_ids;
                }
                if (item?.user_id) {
                    return [item.user_id];
                }
                return [];
            }).map((value: any) => String(value).trim()).filter(Boolean)
        ));

        if (userIds.length === 0) {
            alert('No approved recipients were resolved for certificate issuance.');
            return;
        }

        if (!confirm(`Issue certificates to ${userIds.length} approved recipient${userIds.length === 1 ? '' : 's'}?`)) return;

        setIssuingCertificates(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/events/${eventId}/certificates/issue`, {
                method: 'POST',
                headers: {
                    ...authHeaders(),
                    'Content-Type': 'application/json',
                    'X-Admin-Email': user?.email || ''
                },
                body: JSON.stringify({
                    user_ids: userIds,
                    template_id: event?.certificate_template_id || event?.template_id || ''
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.detail || data?.error || 'Failed to issue certificates');
            }

            const issuedCount = data?.issued ?? 0;
            alert(`Issued ${issuedCount} certificate${issuedCount === 1 ? '' : 's'} to ${userIds.length} recipient${userIds.length === 1 ? '' : 's'}.`);
        } catch (error: any) {
            alert(error?.message || 'Failed to issue certificates');
        } finally {
            setIssuingCertificates(false);
        }
    };

    const handleExportRegistrationsCsv = async () => {
        if (!eventId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/registration/events/${eventId}/export-csv`, {
                headers: authHeaders()
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `registrations_${eventId}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Failed to export CSV. Please try again.');
            }
        } catch (err) {
            console.error('Export CSV error:', err);
            alert('Network error during export.');
        }
    };

    const normalizeStageType = (rawType?: string) => {
        const cleaned = String(rawType || '').trim();
        if (!cleaned) return 'CUSTOM';
        const normalized = cleaned.replace(/\s+/g, '_').toUpperCase();
        switch (normalized) {
            case 'REGISTRATION':
            case 'TEAM_FORMATION':
            case 'QUIZ':
            case 'SUBMISSION':
            case 'REVIEW':
            case 'FINAL':
            case 'CUSTOM':
                return normalized;
            default:
                return 'CUSTOM';
        }
    };

    const buildUiFieldsFromBackend = (fields: any[]) =>
        fields.map((field: any, idx: number) => ({
            id: String(field.field_id || field.id || field.label || `field-${idx}`),
            label: String(field.label || field.field_id || 'Field'),
            type: String(field.field_type || field.type || 'text'),
            required: field.required !== false,
            placeholder: field.placeholder || field.help_text || '',
        }));

    const buildBackendFieldsFromConfig = (stage: IStage) => {
        const configFields = Array.isArray(stage.config?.fields) ? stage.config.fields : [];
        if (configFields.length === 0) {
            const existing = (stage as any).fields;
            return Array.isArray(existing) ? existing : [];
        }
        return configFields.map((field: any) => ({
            field_id: field.id,
            label: field.label,
            field_type: field.type,
            required: field.required !== false,
            placeholder: field.placeholder || '',
            help_text: field.helpText || field.description || '',
            options: field.options,
            max_length: field.maxLength,
        }));
    };

    const DEFAULT_SHORTLIST_MESSAGE = '';

    /** Fetch judges for this institution from the judges collection */
    const fetchJudges = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/judges/`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                // Filter by institution_id matching current institution
                const instId = institutionIdProp || user?.institution_id;
                const filtered = instId ? data.filter((j: any) => j.institution_id === instId) : data;
                setInstitutionJudges(filtered);
            }
        } catch (e) {
            console.error('Failed to fetch judges:', e);
        }
    };

    useEffect(() => {
        const fetchPackageStatus = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/hackathon/package-status`, { headers: authHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setHackathonPackageEnabled(!!data.enabled);
                }
            } catch { /* silent */ }
        };
        fetchPackageStatus();
    }, []);

    // Fetch judges whenever refreshCounter changes or on mount
    useEffect(() => {
        fetchJudges();
    }, [refreshCounter, institutionIdProp, user?.institution_id]);

    const [notifying, setNotifying] = useState(false);
    const [evaluatingSubmission, setEvaluatingSubmission] = useState<any>(null);
    const [evaluationScores, setEvaluationScores] = useState<Record<string, number>>({});
    const [evaluationComment, setEvaluationComment] = useState('');
    
    // Track unsaved changes to lifecycle or criteria
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        if (!event) return;
        const stagesChanged = JSON.stringify(stages) !== JSON.stringify(event.stages);
        const criteriaChanged = JSON.stringify(criteria) !== JSON.stringify(event.judging_criteria);
        setHasUnsavedChanges(stagesChanged || criteriaChanged);
    }, [stages, criteria, event]);
    
    // Auto-save logic
    useEffect(() => {
        if (!hasUnsavedChanges || saving) return;
        
        const autoSaveTimer = setTimeout(() => {
            console.log('AUTO-SAVE: Triggering synchronization...');
            handleSaveEvent();
        }, 3000); // 3 seconds debounce for auto-save

        return () => clearTimeout(autoSaveTimer);
    }, [hasUnsavedChanges, stages, criteria]);

    useEffect(() => {
        if (eventId) {
            const fetchHackathonSubs = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/hackathons/events/${eventId}/submissions`, {
                        headers: { ...authHeaders() }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setHackathonSubmissions(Array.isArray(data) ? data : []);
                    }
                } catch (err) {
                    // Not all events have hackathon submissions — that's fine
                }
            };
            fetchHackathonSubs();
        }
    }, [eventId, refreshCounter]);
    const portalRegistrationStatusLabel = (raw: string | undefined) => {
        const s = (raw || 'pending').toLowerCase();
        if (s === 'accepted' || s === 'shortlisted') return 'SHORTLISTED';
        if (s === 'rejected') return 'REJECTED';
        return s.replace(/_/g, ' ').toUpperCase();
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!eventId) return;
            try {
                // Fetch basic event details first as we need institution_id for other calls
                const eventRes = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/details`, { headers: { ...authHeaders() } });
                const eventData = await eventRes.json();
                
                if (eventData && typeof eventData.description === 'string') {
                    eventData.description = eventData.description
                        .replace(/data-start="[^"]*"/g, '')
                        .replace(/data-end="[^"]*"/g, '')
                        .replace(/data-section-id="[^"]*"/g, '')
                        .replace(/&amp;/g, '&')
                        .replace(/\s\s+/g, ' ')
                        .trim();
                }
                
                setEvent(eventData);
                setPrizeDistribution(
                    Array.isArray(eventData.prize_distribution) ? eventData.prize_distribution :
                    Array.isArray(eventData.prizeDistribution) ? eventData.prizeDistribution :
                    Array.isArray(eventData.prizes) ? eventData.prizes : []
                );
                setStages(
                    (Array.isArray(eventData.stages) ? eventData.stages : []).map((s: any, idx: number) => ({
                        ...s,
                        id: s?.id || `${eventId}-${idx}-${Math.random().toString(36).slice(2, 9)}`,
                        roundMode: s?.roundMode || s?.mode || s?.round_mode || '',
                    }))
                );
                setCriteria(eventData.judging_criteria || []);

                const instId = eventData.institution_id;
                
                // Parallelize all other data fetches
                const fetchPromises = [
                    fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/participants`, { headers: { ...authHeaders() } }).then(r => r.json()).catch(() => []),
                    fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/quizzes`, { headers: { ...authHeaders() } }).then(r => r.json()).catch(() => []),
                    fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/teams`, { headers: { ...authHeaders() } }).then(r => r.json()).catch(() => []),
                    fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/submissions`, { headers: { ...authHeaders() } }).then(r => r.json()).catch(() => []),
                    instId ? fetch(`${API_BASE_URL}/api/v1/institution/profile/${instId}`, { headers: { ...authHeaders() } }).then(r => r.json()).catch(() => null) : Promise.resolve(null),
                ];

                const [partData, quizData, teamsData, subData, instData] = await Promise.all(fetchPromises);

                setParticipants(Array.isArray(partData) ? partData : []);
                setQuizzes(quizData || []);
                setTeams(Array.isArray(teamsData) ? teamsData : []);
                setSubmissions(Array.isArray(subData) ? subData : []);
                setInstitution(instData);

                // Secondary parallel fetch for admin-specific data if needed
                if (role === 'super_admin' || role === 'admin') {
                    try {
                        const adminRes = await fetch(`${API_BASE_URL}/api/admin/events/${eventId}/submissions`, {
                            headers: {
                                ...authHeaders(),
                                'X-Admin-Email': user?.email || ''
                            }
                        });

                        if (adminRes.ok) {
                            const adminData = await adminRes.json();
                            if (adminData.stages && Array.isArray(adminData.stages)) {
                                setStages(adminData.stages);
                                const flatSubs = adminData.stages.flatMap((s: any) => (Array.isArray(s.submissions) ? s.submissions : []));
                                setSubmissions(flatSubs);
                                const aggregatedParts = adminData.stages.flatMap((s: any) => (Array.isArray(s.participants) ? s.participants : []));
                                setParticipants(aggregatedParts);
                            }
                        }
                    } catch (e) { /* non-fatal */ }
                }
            } catch (err) {
                console.error("Failed to load event data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [eventId, refreshCounter]);

    // Fetch server-driven registration form and eligibility when admin views registrations
    useEffect(() => {
        if (!eventId || activeTab !== 'registrations') return;
        let cancelled = false;
        (async () => {

    const buildPrefillForRegistration = (reg: any) => {
        const base = { ...(registrationPrefillMap || {}) };
        // overlay registration's custom answers
        if (reg && reg.custom_answers && typeof reg.custom_answers === 'object') {
            for (const [k, v] of Object.entries(reg.custom_answers)) {
                base[String(k)] = v;
            }
        }
        // overlay registration profile snapshot values
        if (reg && reg.profile_snapshot && typeof reg.profile_snapshot === 'object') {
            const snap = reg.profile_snapshot;
            if (snap.email) base['email'] = base['email'] ?? snap.email;
            if (snap.full_name) base['full_name'] = base['full_name'] ?? snap.full_name;
        }
        return base;
    };
            try {
                // fetch form definition
                const formRes = await fetch(`${API_BASE_URL}/api/v1/registration/events/${eventId}/form`, { headers: { ...authHeaders() } });
                if (formRes.ok) {
                    const formJson = await formRes.json();
                    if (cancelled) return;
                    setRegistrationFormDef(formJson || null);
                    const defs = Array.isArray(formJson?.fields_definitions) ? formJson.fields_definitions : (Array.isArray(formJson?.fields) ? formJson.fields : []);
                    setRegistrationUiFields(buildUiFieldsFromBackend(defs));

                    // build prefill map from server-provided prefilled values
                    const prefill: Record<string, any> = {};
                    for (const f of defs) {
                        const key = String(f.field_id || f.id || f.label || '').trim();
                        if (!key) continue;
                        if (f.prefilled_value !== undefined && f.prefilled_value !== null && String(f.prefilled_value).trim() !== '') {
                            prefill[key] = f.prefilled_value;
                        }
                    }
                    setProfileTypeLockedForPrefill(false);
                    setRegistrationPrefillMap(prefill);
                }

                // fetch eligibility
                try {
                    const elRes = await fetch(`${API_BASE_URL}/api/v1/registration/events/${eventId}/eligibility`, { headers: { ...authHeaders() } });
                    if (elRes.ok) {
                        const elJson = await elRes.json();
                        if (cancelled) return;
                        setRegistrationEligibility(elJson || null);
                        if (typeof elJson?.eligible === 'boolean') {
                            setRegistrationEligible(elJson.eligible);
                            setRegistrationEligibilityReason(elJson.reason || null);
                        } else {
                            setRegistrationEligible(null);
                        }
                    } else {
                        setRegistrationEligibility(null);
                        setRegistrationEligible(null);
                    }
                } catch (e) {
                    setRegistrationEligibility(null);
                    setRegistrationEligible(null);
                }
            } catch (e) {
                // non-fatal
            }
        })();
        return () => { cancelled = true; };
    }, [eventId, activeTab, user]);

    const fetchBundle = async (tVal: number) => {
        console.log('[BUNDLE] fetchBundle called', { eventId, activeTab, tVal });
        if (!eventId || activeTab !== 'submissions') { console.log('[BUNDLE] Skipped:', { eventId, activeTab }); return; }
        try {
            const url = `${API_BASE_URL}/api/v1/institution/events/${eventId}/qualified-bundle?threshold=${tVal}`;
            console.log('[BUNDLE] Fetching:', url);
            const res = await fetch(url, {
                headers: { ...authHeaders() }
            });
            console.log('[BUNDLE] Response status:', res.status);
            if (res.ok) {
                const data = await res.json();
                console.log('[BUNDLE] Data received:', JSON.stringify(data));
                setBundleData(data);
            } else {
                console.log('[BUNDLE] Response not OK:', res.status, await res.text().catch(() => ''));
            }
        } catch (e) {
            console.error('[BUNDLE] Failed to fetch evaluation bundle:', e);
        }
    };

    const fetchSubTabQuizResults = async (qStageId: string) => {
        const stage = stages.find(s => s.id === qStageId);
        const quizId = stage?.config?.quiz_id;
        if (!quizId || !eventId) return;
        setQuizResultsLoading(true);
        setQuizResultsError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/quizzes/${quizId}/results`, {
                headers: { ...authHeaders() }
            });
            if (!res.ok) throw new Error('Failed to load quiz results');
            const data = await res.json();
            setQuizResults(data.results || []);
        } catch (e: any) {
            setQuizResultsError(e.message);
        } finally {
            setQuizResultsLoading(false);
        }
    };

    const toggleQuizSelect = (uid: string) => {
        setQuizSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    };

    const toggleQuizSelectAll = (filteredItems: any[]) => {
        if (quizSelectedIds.size === filteredItems.length) {
            setQuizSelectedIds(new Set());
        } else {
            setQuizSelectedIds(new Set(filteredItems.map(r => r.user_id)));
        }
    };

    const handleQuizShortlist = async () => {
        const ids = Array.from(quizSelectedIds);
        if (!ids.length || !eventId || !selectedSubTabQuizStageId) return;
        const stage = stages.find(s => s.id === selectedSubTabQuizStageId);
        const quizId = stage?.config?.quiz_id;
        if (!quizId) return;
        setQuizShortlisting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/quizzes/${quizId}/shortlist`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_ids: ids }),
            });
            if (!res.ok) throw new Error('Shortlist failed');
            setQuizShortlistDone(true);
            fetchSubTabQuizResults(selectedSubTabQuizStageId);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setQuizShortlisting(false);
        }
    };

    const handleQuizNotifyShortlisted = async () => {
        if (!eventId || !selectedSubTabQuizStageId) return;
        const stage = stages.find(s => s.id === selectedSubTabQuizStageId);
        const quizId = stage?.config?.quiz_id;
        if (!quizId) return;
        setQuizNotifying(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/quizzes/${quizId}/notify-shortlisted`, {
                method: 'POST',
                headers: { ...authHeaders() },
            });
            if (!res.ok) throw new Error('Notification dispatch failed');
            setQuizNotifyDone(true);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setQuizNotifying(false);
        }
    };

    useEffect(() => {
        const quizStages = stages.filter(s => s.type === 'QUIZ' && s.config?.quiz_id);
        if (quizStages.length > 0 && !selectedSubTabQuizStageId) {
            setSelectedSubTabQuizStageId(quizStages[0].id);
        }
    }, [stages, selectedSubTabQuizStageId]);

    useEffect(() => {
        if (activeTab === 'submissions' && submissionSubTab === 'assessments' && selectedSubTabQuizStageId) {
            fetchSubTabQuizResults(selectedSubTabQuizStageId);
            setQuizSelectedIds(new Set());
            setQuizShortlistDone(false);
            setQuizNotifyDone(false);
        }
    }, [activeTab, submissionSubTab, selectedSubTabQuizStageId, eventId, refreshCounter]);

    useEffect(() => {
        if (eventId && activeTab === 'submissions') {
            fetchBundle(debouncedThreshold);
        }
    }, [eventId, activeTab, debouncedThreshold, refreshCounter]);

    useEffect(() => {
        if (activeTab !== 'assessments' || !eventId || quizzes.length === 0) return;
        let cancelled = false;
        (async () => {
            const map: Record<string, any[]> = {};
            for (const q of quizzes) {
                const qid = String(q?._id || '');
                if (!qid) continue;
                try {
                    const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/quizzes/${qid}/coding-attempts`, {
                        headers: { ...authHeaders() },
                    });
                    const body = await res.json().catch(() => ({}));
                    map[qid] = Array.isArray(body?.items) ? body.items : [];
                } catch {
                    map[qid] = [];
                }
            }
            if (!cancelled) setCodingAttempts(map);
        })();
        return () => {
            cancelled = true;
        };
    }, [activeTab, eventId, quizzes]);

    const evaluateCodingAttempt = async (quizId: string, participantUserId: string) => {
        const scoreRaw = window.prompt('Manual score (%)');
        if (scoreRaw === null) return;
        const score = Number(scoreRaw);
        if (Number.isNaN(score) || score < 0 || score > 100) {
            alert('Enter a valid score between 0 and 100.');
            return;
        }
        const passed = window.confirm('Mark this coding attempt as qualified/shortlisted?');
        setReviewingParticipantId(participantUserId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/quizzes/${quizId}/coding-attempts/${participantUserId}/evaluate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ score, passed }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.detail || 'Failed to evaluate');
            setPortalReviewNotice({ kind: 'success', text: 'Coding attempt evaluated successfully.' });
            setCodingAttempts((prev) => ({
                ...prev,
                [quizId]: (prev[quizId] || []).filter((x: any) => String(x.user_id) !== String(participantUserId)),
            }));
        } catch (e: any) {
            setPortalReviewNotice({ kind: 'error', text: e?.message || 'Evaluation failed.' });
        } finally {
            setReviewingParticipantId(null);
        }
    };

    const handleSaveRubrics = async () => {
        if (!eventId) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/criteria`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(criteria)
            });
            if (res.ok) {
                setEvent(prev => prev ? { ...prev, judging_criteria: criteria } : prev);
                setHasUnsavedChanges(false);
                setShowSaveSuccess(true);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Failed to save rubrics: ${err.detail || 'Unknown error'}`);
            }
        } catch {
            alert('Network error while saving rubrics');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEvent = async () => {
        if (!eventId || !event) return;
        setSaving(true);
        
        // Validate stage dates — only for stages whose dates actually changed
        const originalStages: IStage[] = Array.isArray(event?.stages) ? event.stages : [];
        const origStageMap = new Map(originalStages.map((s: any) => [s.id, s]));
        const today = new Date();
        for (const s of stages) {
            if (!s.start_date || !s.end_date) continue;
            const orig = origStageMap.get(s.id);
            const isNew = !orig;
            const startChanged = !orig || orig.start_date !== s.start_date;
            const endChanged = !orig || orig.end_date !== s.end_date;
            if (!isNew && !startChanged && !endChanged) continue;
            // Only validate start date is not in the past when start date actually changed
            if (startChanged && new Date(s.start_date) < today) {
                alert(`Stage "${s.name}" start date (${s.start_date}) cannot be in the past.`);
                setSaving(false);
                return;
            }
            if (new Date(s.end_date) < new Date(s.start_date)) {
                alert(`Stage "${s.name}" end date (${s.end_date}) cannot be before start date (${s.start_date}).`);
                setSaving(false);
                return;
            }
        }

        // Synchronize registration stage custom questions directly to event.custom_questions
        const regStage = stages.find(s => normalizeStageType(s.type) === 'REGISTRATION');
        let finalEvent = { ...event };
        if (regStage) {
            const configFields = Array.isArray(regStage.config?.fields) ? regStage.config.fields : [];
            finalEvent.custom_questions = configFields.map((field: any, idx: number) => ({
                id: field.id || `custom-${idx}`,
                label: field.label || 'Question',
                type: field.type || 'text',
                required: field.required !== false,
                placeholder: field.placeholder || '',
                description: field.helpText || field.description || '',
                options: field.options || []
            }));
        }

        try {
        // Strip large binary fields and read-only fields before sending to reduce payload
        const { logo_url, banner_url, _id, created_at, updated_at, institution_id, participant_count, ...cleanEvent } = finalEvent;

        const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ ...cleanEvent, stages, judging_criteria: criteria })
        });
            if (res.ok) {
                const updatedEvent = { ...finalEvent, stages, judging_criteria: criteria };
                setEvent(updatedEvent);
                setHasUnsavedChanges(false);
                setShowSaveSuccess(true);
                
                // Background sync - update all opportunities without blocking UI
                console.log('DIRECT SYNC: Triggering background synchronization for event:', eventId);
                fetch(`${API_BASE_URL}/api/direct-sync/force-update/${eventId}`, {
                    method: 'POST',
                    headers: { ...authHeaders() }
                }).then(syncRes => {
                    if (syncRes.ok) {
                        console.log('DIRECT SYNC: Background sync successful');
                    } else {
                        console.error('DIRECT SYNC: Background sync failed');
                    }
                }).catch(syncErr => {
                    console.error('DIRECT SYNC: Background network error:', syncErr);
                });
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Failed to save event: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            alert('Network error while saving event');
        } finally {
            setSaving(false);
        }
    };

    // Helper to resolve dynamic or absolute image URLs to the correct backend host
    const getImageUrl = (url: string | undefined) => {
        if (!url) return '';
        if (/^https?:\/\//i.test(url)) return url;
        if (url.includes('/uploads/')) {
            const path = url.substring(url.indexOf('/uploads/'));
            return `${API_BASE_URL}${path}`;
        }
        return url;
    };

    // Logo / banner upload handler (used in Basic Info tab)
    const handleMediaUpload = async (file: File, field: 'logo_url' | 'banner_url') => {
        if (!eventId) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('field', field);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/upload-media`, {
                method: 'POST',
                headers: { ...authHeaders() },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                alert('Upload failed: ' + (data.detail || 'Unknown error'));
                return;
            }
            console.log('[MediaUpload] response OK', { field, url: data.url, data });
            setEvent((prev: any) => {
                const updated = prev ? { ...prev, [field]: data.url } : prev;
                console.log('[MediaUpload] updated event state', { field, url: data.url, updated });
                return updated;
            });
            if (field === 'logo_url') setLogoError(false);
            else setBannerError(false);
            setShowSaveSuccess(true);
        } catch (err) {
            console.error('[MediaUpload] network error', err);
            alert('Network error during upload.');
        }
    };

    const handleBack = () => {
        if (onBack && typeof onBack === 'function') {
            onBack();
            return;
        }
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/institution-dashboard/events');
        }
    };

    const openQuizForStage = (stageId: string) => {
        setQuizStageId(stageId);
        setIsQuizModalOpen(true);
    };

    const attachQuizToStage = async (quizData: any) => {
        if (!eventId || !quizStageId) return;
        setIsCreatingQuiz(true);
        try {
            const stage = stages.find((s) => s.id === quizStageId);
            const bodyPayload: Record<string, any> = { 
                ...quizData, 
                stage_id: quizStageId,
                quiz_id: stage?.config?.quiz_id || undefined
            };
            if (stage?.config?.pass_mark != null) {
                bodyPayload.pass_mark = Number(stage.config.pass_mark);
            }
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/quizzes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(bodyPayload),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(j?.detail || 'Failed to create quiz');
                return;
            }
            const qid = String(j.quiz_id);
            setStages((prev) =>
                prev.map((s) =>
                    s.id === quizStageId ? { ...s, config: { ...(s.config || {}), quiz_id: qid, pass_mark: bodyPayload.pass_mark || stage?.config?.pass_mark || 70 } } : s
                )
            );
            setIsQuizModalOpen(false);
        } finally {
            setIsCreatingQuiz(false);
        }
    };

    const handleDispatchProtocol = async () => {
        const currentBundle = bundleData?.[bundleTab] || [];
        if (currentBundle.length === 0) return;

        const stageInfo = getCurrentStageInfo();
        if (!stageInfo.next_stage_name) {
            alert('No next stage available for this event. Define stages first.');
            return;
        }
        const nextStageName = stageInfo.next_stage_name;
        
        setBulkNotifyNextStage(nextStageName);
        setBulkNotifySubject(`Congratulations! You've been shortlisted for ${event?.title || ''}`);
        setBulkNotifyMessage(DEFAULT_SHORTLIST_MESSAGE.replace(/{next_stage}/g, nextStageName));
        setBulkNotifySelectedTemplate('default');
        setBulkNotifyMinScore('');
        // Fetch available templates
        try {
            const tmplRes = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/email-templates`, {
                headers: { ...authHeaders() }
            });
            if (tmplRes.ok) {
                const tmplData = await tmplRes.json();
                setBulkNotifyTemplates(tmplData.filter((t: any) => ['stage_advancement', 'announcement'].includes(t.type)));
            }
        } catch (e) {}
        setIsBulkNotifyModalOpen(true);
    };

    const confirmBulkDispatch = async () => {
        const currentBundle = bundleData?.[bundleTab] || [];
        const teamIds = currentBundle.map((item: any) => item.team_id);
        
        setNotifying(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/bulk-notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ 
                    team_ids: teamIds, 
                    next_stage: bulkNotifyNextStage,
                    custom_message: bulkNotifyMessage,
                    subject: bulkNotifySubject,
                    min_score: bulkNotifyMinScore ? Number(bulkNotifyMinScore) : undefined
                })
            });

            if (res.ok) {
                const result = await res.json();
                alert(`Successfully dispatched notifications to ${result.sent_to} candidates/teams!`);
                setIsBulkNotifyModalOpen(false);
            } else {
                alert('Failed to dispatch notifications');
            }
        } catch (error) {
            console.error('Dispatch failed:', error);
            alert('Network error during dispatch');
        } finally {
            setNotifying(false);
        }
    };

    const handlePublishEvent = async () => {
        if (!eventId || !window.confirm('Publish this event? It will go Live for learners (portal listings) and allow standard event registration if you use that flow.')) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ status: 'LIVE' })
            });
            if (res.ok) {
                const eventRes = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/details`, { headers: { ...authHeaders() } });
                const eventData = await eventRes.json();
                if (eventData && typeof eventData.description === 'string') {
                    eventData.description = eventData.description
                        .replace(/data-start="[^"]*"/g, '')
                        .replace(/data-end="[^"]*"/g, '')
                        .replace(/data-section-id="[^"]*"/g, '')
                        .replace(/&amp;/g, '&')
                        .replace(/\s\s+/g, ' ')
                        .trim();
                }
                setEvent(eventData);
                setShowSaveSuccess(true);
                setTimeout(() => setShowSaveSuccess(false), 3000);
            }
        } catch (err) {
            console.error('Publish failed');
        } finally {
            setSaving(false);
        }
    };

    const handleReviewPortalApplication = async (p: any, status: string) => {
        const instId = event?.institution_id;
        if (!instId || !eventId) {
            setPortalReviewNotice({ kind: 'error', text: 'Missing institution or event.' });
            return;
        }
        const src = p.source || '';
        const appId =
            p.opportunity_application_id ||
            (['opportunity_application', 'opportunity_portal', 'opportunity_portal_backfill'].includes(src) ? p._id : null);
        const body: Record<string, string> = { institution_id: instId, status };
        if (appId) body.application_id = String(appId);
        else if (p.user_id && p.opportunity_id) {
            body.user_id = String(p.user_id);
            body.opportunity_id = String(p.opportunity_id);
        } else {
            setPortalReviewNotice({ kind: 'error', text: 'This row is not linked to a portal application.' });
            return;
        }
        const rowId = String(p._id ?? p.user_id ?? appId ?? '');
        setReviewingParticipantId(rowId);
        setPortalReviewNotice(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/opportunity-applications/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setPortalReviewNotice({ kind: 'error', text: String((err as any).detail || 'Update failed') });
                return;
            }
            const partRes = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/participants`, { headers: { ...authHeaders() } });
            const data = await partRes.json();
            setParticipants(Array.isArray(data) ? data : []);
            const label = status === 'shortlisted' || status === 'accepted' ? 'shortlisted' : status === 'rejected' ? 'rejected' : 'marked pending';
            setPortalReviewNotice({ kind: 'success', text: `Saved — applicant ${label}.` });
            window.setTimeout(() => setPortalReviewNotice((n) => (n?.kind === 'success' ? null : n)), 3200);
        } catch {
            setPortalReviewNotice({ kind: 'error', text: 'Network error — could not update status.' });
        } finally {
            setReviewingParticipantId(null);
        }
    };

    const handleSendReminders = async () => {
        if (!window.confirm('Send deadline reminder emails to all registered participants?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/send-reminders`, {
                method: 'POST',
                headers: { ...authHeaders() },
            });
            if (res.ok) {
                const data = await res.json();
                alert(`Successfully sent ${data.count} reminders for ${data.stage}.`);
            } else {
                alert('Failed to send reminders.');
            }
        } catch (err) {
            alert('Network error.');
        }
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div></div>;
    if (!event) return <div>Event not found</div>;

    const getStageStatus = (stage: any) => {
        const explicit = String(stage?.status || '').trim().toLowerCase();
        if (explicit) return explicit;

        const normalizeDate = (value: any, endOfDay = false) => {
            if (!value) return null;
            const raw = String(value).trim();
            if (!raw) return null;
            const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
            if (dateOnly) {
                const [year, month, day] = dateOnly[1].split('-').map(Number);
                return endOfDay
                    ? new Date(year, month - 1, day, 23, 59, 59, 999)
                    : new Date(year, month - 1, day, 0, 0, 0, 0);
            }
            const parsed = new Date(raw);
            if (Number.isNaN(parsed.getTime())) return null;
            if (endOfDay && parsed.getHours() === 0 && parsed.getMinutes() === 0 && parsed.getSeconds() === 0 && parsed.getMilliseconds() === 0) {
                parsed.setHours(23, 59, 59, 999);
            }
            return parsed;
        };

        const now = new Date();
        const start = normalizeDate(stage?.start_date || stage?.startDate, false);
        const end = normalizeDate(stage?.end_date || stage?.endDate, true);
        if (start && now < start) return 'upcoming';
        if (end && now > end) return 'completed';
        return 'active';
    };

    const getCurrentStageInfo = () => {
        const sortedStages = [...stages].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        const totalStages = sortedStages.length;
        
        const activeStageIndex = sortedStages.findIndex((stage) => getStageStatus(stage) === 'active');
        const selectedStageIndex = activeStageIndex !== -1
            ? activeStageIndex
            : Math.max(0, sortedStages.findLastIndex ? sortedStages.findLastIndex((stage) => getStageStatus(stage) !== 'upcoming') : (() => {
                for (let i = sortedStages.length - 1; i >= 0; i--) {
                    if (getStageStatus(sortedStages[i]) !== 'upcoming') return i;
                }
                return 0;
            })());
        
        const stageNumber = selectedStageIndex + 1; // 1-based
        const stageName = sortedStages[selectedStageIndex]?.name || '';
        const isFinalStage = stageNumber === totalStages && totalStages > 0;
        
        // Get next stage name if available (for "advance to" messages)
        const nextStageIndex = selectedStageIndex + 1;
        const nextStageName = nextStageIndex < totalStages 
            ? sortedStages[nextStageIndex]?.name || ''
            : "";
        
        return {
            stage_number: stageNumber,
            total_stages: totalStages,
            stage_name: stageName,
            next_stage_name: nextStageName,
            is_final_stage: isFinalStage
        };
    };

    const handleUpdateStatus = async (teamId: string, newStatus: string, item?: any) => {
        const instId = institutionIdProp || event?.institution_id;
        const sourceType = item?.source || item?._sourceType || '';
        const submissionId = item?.submission_id || teamId;

        if (teamId.startsWith('portal_app:')) {
            const appId = teamId.replace(/^portal_app:/, '');
            if (!appId) return;
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/portal-applications/${appId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ status: newStatus })
                });
                if (res.ok) {
                    setBundleData(prev => ({
                        ...prev,
                        [bundleTab]: prev?.[bundleTab]?.map((item: any) => 
                            item.team_id === teamId ? { ...item, status: newStatus } : item
                        )
                    }));
                    setShowSaveSuccess(true);
                    setTimeout(() => setShowSaveSuccess(false), 2000);
                }
            } catch (err) {
                console.error('Failed to update application status:', err);
            }
        } else if (sourceType === 'stage_deliverable') {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/submission-data/${submissionId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ status: newStatus })
                });
                if (res.ok) {
                    setBundleData(prev => ({
                        ...prev,
                        [bundleTab]: prev?.[bundleTab]?.map((row: any) => 
                            row.submission_id === submissionId ? { ...row, status: newStatus } : row
                        )
                    }));
                    setShowSaveSuccess(true);
                    setTimeout(() => setShowSaveSuccess(false), 2000);
                }
            } catch (err) {
                console.error('Failed to update stage submission status:', err);
            }
        } else if (item?.team_id || teamId) {
            const resolvedTeamId = item?.team_id || teamId;
            // Update team status in participants collection
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/teams/${resolvedTeamId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ status: newStatus })
                });
                if (res.ok) {
                    setBundleData(prev => ({
                        ...prev,
                        [bundleTab]: prev?.[bundleTab]?.map((item: any) => 
                            item.team_id === resolvedTeamId ? { ...item, status: newStatus } : item
                        )
                    }));
                    setShowSaveSuccess(true);
                    setTimeout(() => setShowSaveSuccess(false), 2000);
                    
                    // Send email notification with stage context
                    if (item) {
                        try {
                            const stageInfo = getCurrentStageInfo();
                            await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/send-status-email`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                                body: JSON.stringify({
                                    team_id: resolvedTeamId,
                                    status: newStatus,
                                    team_name: item.team_name,
                                    emails: item.member_emails || [],
                                    stage_context: stageInfo
                                })
                            });
                        } catch (emailErr) {
                            console.error('Failed to send email:', emailErr);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to update team status:', err);
            }
        } else if (submissionId) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/submissions/${submissionId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ status: newStatus })
                });
                if (res.ok) {
                    setBundleData(prev => ({
                        ...prev,
                        [bundleTab]: prev?.[bundleTab]?.map((row: any) => 
                            row.submission_id === submissionId ? { ...row, status: newStatus } : row
                        )
                    }));
                    setShowSaveSuccess(true);
                    setTimeout(() => setShowSaveSuccess(false), 2000);
                }
            } catch (err) {
                console.error('Failed to update submission status:', err);
            }
        }
    };

    
    const handleCreateQuiz = async (quizData: any) => {
        await attachQuizToStage(quizData);
        try {
            const updatedQuizRes = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/quizzes`, { headers: { ...authHeaders() } });
            const updatedQuizzes = await updatedQuizRes.json();
            setQuizzes(updatedQuizzes || []);
        } catch {
            /* non-fatal */
        }
    };

    const handleOpenJudgeAssignment = async (submissionId: string) => {
        // Fetch available judges
        try {
            console.log('DEBUG: Fetching judges for submission:', submissionId);
            const res = await fetch(`${API_BASE_URL}/api/judges`, { headers: { ...authHeaders() } });
            console.log('DEBUG: Judges API response status:', res.status);
            if (res.ok) {
                const judges = await res.json();
                console.log('DEBUG: Judges data received:', judges);
                setAvailableJudges(judges);
                setJudgeAssignmentModal({ isOpen: true, submissionId });
            } else {
                console.log('DEBUG: Failed to fetch judges, status:', res.status);
                const errorData = await res.json().catch(() => ({}));
                console.log('DEBUG: Judges API error:', errorData);
                alert(`Failed to load judges: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to fetch judges:', error);
            alert('Failed to load available judges');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy link: ', err);
        });
    };

    const handleAssignJudge = async (judgeId: string, judgeEmail: string) => {
        const isBulk = selectedSubmissions.length > 0 && judgeAssignmentModal.submissionId === 'bulk';
        
        try {
            const targetIds = isBulk ? selectedSubmissions : [String(judgeAssignmentModal.submissionId || '')].filter(Boolean);
            const hackathonIdSet = new Set((hackathonSubmissions || []).map((s: any) => String(s?._id || s?.id || s?.submissionId)));
            const isHackathonSubmission = targetIds.length > 0 && targetIds.every((id) => hackathonIdSet.has(String(id)));

            // Hackathon submissions live in hackathon_submissions -> use hackathon assignment endpoint
            // Legacy submissions use /api/judges/assign (submission_data_col pipeline)
            const res = isHackathonSubmission
                ? await fetch(`${API_BASE_URL}/api/hackathons/submissions/assign-judge`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', ...authHeaders() },
                      body: JSON.stringify({ submission_ids: targetIds, judge_id: judgeId }),
                  })
                : await fetch(`${API_BASE_URL}/api/judges/assign`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...authHeaders() },
                      body: JSON.stringify(
                          isBulk
                              ? { judge_id: judgeId, submission_ids: selectedSubmissions }
                              : { judge_id: judgeId, submission_id: judgeAssignmentModal.submissionId }
                      ),
                  });

            if (res.ok) {
                const result = await res.json();
                
                let msg = isBulk ? `Successfully assigned judge to ${selectedSubmissions.length} projects!` : 'Judge assigned successfully!';
                
                // NEW: Handle email delivery feedback
                if (result?.email_sent === false) {
                    msg += "\n\n⚠️ NOTE: Invitation email could not be sent. Please share the evaluation link manually.";
                }
                
                alert(msg);
                
                setJudgeAssignmentModal({ isOpen: false, submissionId: null });
                setSelectedSubmissions([]);
                setIsBulkMode(false);
                // Refresh submissions
                setRefreshCounter(prev => prev + 1);
                fetchBundle(debouncedThreshold);
            } else {
                const error = await res.json();
                alert(error.detail || 'Failed to assign judge');
            }
        } catch (error) {
            console.error('Error assigning judge:', error);
            alert('Network error while assigning judge');
        }
    };

    const handleDeleteJudge = async (judgeId: string) => {
        if (!window.confirm('Remove this judge?')) return;
        try {
            await fetch(`${API_BASE_URL}/api/judges/${judgeId}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            setRefreshCounter(prev => prev + 1);
        } catch (e) {
            console.error('Delete judge error:', e);
        }
    };

    const handleInviteJudge = async (judgeData: any) => {
        setIsInvitingJudge(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/judges/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    name: judgeData.name,
                    domain: judgeData.expertise,
                    institution_id: institutionIdProp || user?.institution_id,
                    is_test: false
                })
            });
            if (res.ok) {
                setIsJudgeInviteOpen(false);
                setRefreshCounter(prev => prev + 1); // triggers fetchJudges
            } else {
                const error = await res.json();
                alert(error.detail || 'Failed to add judge');
            }
        } catch (error) {
            console.error('Error adding judge:', error);
            alert('Network error while adding judge');
        } finally {
            setIsInvitingJudge(false);
        }
    };

    const handleEvaluateSubmission = async () => {
        if (!evaluatingSubmission || !user) return;
        try {
            const hackathonIdSet = new Set((hackathonSubmissions || []).map((s: any) => String(s?._id || s?.id || s?.submissionId)));
            const isHackathon = hackathonIdSet.has(String(evaluatingSubmission._id));
            const res = isHackathon
                ? await fetch(`${API_BASE_URL}/api/hackathons/submissions/${evaluatingSubmission._id}/evaluate`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({
                        judgeId: user.user_id,
                        rubricScores: evaluationScores,
                        feedback: evaluationComment
                    })
                  })
                : await fetch(`${API_BASE_URL}/api/judges/score`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({
                        submission_id: evaluatingSubmission._id,
                        judge_id: user.user_id,
                        scores: evaluationScores,
                        comments: evaluationComment,
                        event_id: eventId,
                        team_id: evaluatingSubmission.team_id || evaluatingSubmission.teamId || ''
                    })
                  });
            if (res.ok) {
                setEvaluatingSubmission(null);
                setRefreshCounter(prev => prev + 1);
                alert("Evaluation submitted!");
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to submit evaluation");
            }
        } catch (err) {
            console.error("Evaluation error:", err);
            alert("Network error while submitting evaluation");
        }
    };

    const handleBulkAssign = async (judgeId: string, specificIds?: string[]) => {
        const targetIds = specificIds || selectedSubmissions;
        if (targetIds.length === 0) {
            alert("Please select at least one submission");
            return;
        }
        try {
            const hackathonIdSet = new Set((hackathonSubmissions || []).map((s: any) => String(s?._id || s?.id || s?.submissionId)));
            const isHackathon = targetIds.every((id: string) => hackathonIdSet.has(String(id)));
            const endpoint = isHackathon
                ? `${API_BASE_URL}/api/hackathons/submissions/assign-judge`
                : `${API_BASE_URL}/api/judges/assign`;
            const res = await fetch(endpoint, {
                method: isHackathon ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    submission_ids: targetIds,
                    judge_id: judgeId
                })
            });
            if (res.ok) {
                setSelectedSubmissions([]);
                setRefreshCounter(prev => prev + 1);
                alert(`Judge assigned to ${targetIds.length} submission(s)`);
                setIsBulkMode(false);
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to assign judge");
            }
        } catch (err) {
            console.error("Bulk assign error:", err);
            alert("Network error while assigning judge");
        }
    };


    const tabs = [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'basic', label: 'Basic Info', icon: Info },
        { id: 'stages', label: 'Stages & Timeline', icon: Clock },
        { id: 'registrations', label: 'Registrations', icon: UserPlus },
        { id: 'teams', label: 'Teams', icon: Layers },
        { id: 'submissions', label: 'Submissions', icon: FileText },
        { id: 'criteria', label: 'Scoring Rubrics', icon: ShieldCheck },
        { id: 'evaluation-matrix', label: 'Evaluation Matrix', icon: TrendingUp },
        { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
        { id: 'prizes', label: 'Prizes', icon: Award },
        { id: 'faqs', label: 'FAQ', icon: HelpCircle },
        { id: 'pipeline', label: 'Pipeline', icon: Zap },
        ...(hackathonPackageEnabled ? [{ id: 'package', label: 'Event Package', icon: Lightbulb }] : []),
        { id: 'judges', label: 'Judges', icon: Gavel },
        { id: 'email-templates', label: 'Communications', icon: Mail },
    ];

    
    const renderTabContent_SubmissionManagement = () => {
        // Merge hackathon + regular submissions for ALL event types
        const allSubmissions = [
            ...(hackathonSubmissions || []).map((s: any) => ({
                ...s,
                _sourceType: 'hackathon',
                project_title: s.project_title || s.teamName || s.team_name || '',
                team_name: s.team_name || s.teamLead || s.teamLeadName || '',
                event_title: s.event_title || s.eventName || '',
                status: s.status || '',
            })),
            ...(submissions || []).map((s: any) => {
                const isStage = s.source === 'stage_deliverable';
                const data = s.data || {};
                // For stage deliverables, the actual content is in the data field
                const stageFileField = isStage ? Object.keys(data).find(k => typeof data[k] === 'string' && data[k].startsWith('data:')) : null;
                const stageUrlField = isStage ? Object.keys(data).find(k => typeof data[k] === 'string' && (data[k].startsWith('http://') || data[k].startsWith('https://'))) : null;
                const stageDesc = isStage ? (data.description || data.problem_statement || data.solution || '') : '';
                return {
                    ...s,
                    _sourceType: isStage ? 'stage' : 'regular',
                    teamName: s.teamName || s.team_name || s.user_name || s.name || '',
                    teamLead: s.teamLead || s.team_lead || s.team_name || s.user_name || s.name || '',
                    problemStatement: isStage
                        ? (stageDesc || (stageUrlField ? 'Submitted link' : stageFileField ? 'Submitted file' : '') || s.stage_name || '')
                        : (s.problemStatement || s.problem_statement || s.stage_name || s.stage_type || ''),
                    pptLink: isStage
                        ? (stageFileField ? data[stageFileField] : stageUrlField ? data[stageUrlField] : '')
                        : (s.pptLink || s.ppt_link || ''),
                    githubLink: s.githubLink || s.github_link || '',
                    assignedJudgeId: s.assignedJudgeId || s.assigned_judge_id || (Array.isArray(s.assigned_judges) && s.assigned_judges.length > 0 ? s.assigned_judges[0].judge_id : ''),
                    totalScore: s.totalScore ?? s.total_score ?? 0,
                    project_title: isStage
                        ? (s.stage_name || s.stage_type || '')
                        : (s.project_title || s.title || s.team_name || ''),
                    team_name: s.team_name || s.user_name || s.name || '',
                    event_title: s.event_title || event?.title || s.stage_name || '',
                    status: s.status || '',
                };
            }),
        ];
        // Dedup by _id or composite key
        const seenKeys = new Set<string>();
        const dedupedSubmissions = allSubmissions.filter(s => {
            const key = s._id || `${s.team_id || s.teamId}_${s.stage_id || ''}`;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
        });
        const allDomains = [...new Set(dedupedSubmissions.map(s => s.domain).filter(Boolean))];
        const domains = ['All Domains', ...allDomains];
        const filtered = dedupedSubmissions.filter(s => {
            const name = s.teamName || s.team_name || s.user_name || '';
            const lead = s.teamLead || s.team_lead || '';
            const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || lead.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDomain = domainFilter === 'All Domains' || s.domain === domainFilter;
            const matchesJudge = judgeFilter === 'All Judges' || s.assignedJudgeId === judgeFilter;
            return matchesSearch && matchesDomain && matchesJudge;
        });

        if (submissionSubTab === 'assessments') {
            const quizStages = stages.filter(s => s.type === 'QUIZ' && s.config?.quiz_id);
            const passedCount = quizResults.filter(r => r.passed).length;
            const filteredQuizzes = quizResults.filter(r =>
                !quizResultsSearch || 
                r.name.toLowerCase().includes(quizResultsSearch.toLowerCase()) || 
                r.email.toLowerCase().includes(quizResultsSearch.toLowerCase())
            );

            return (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-12 bg-slate-900 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl border border-white/5">
                        <div className="relative z-10">
                            <h3 className="text-4xl font-black tracking-tight mb-4">Submission Management</h3>
                            <p className="text-slate-400 font-bold max-w-xl leading-relaxed">Review submissions, assign judges, and evaluate in real-time.</p>
                        </div>
                        <div className="absolute -right-20 -top-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px]"></div>
                    </div>

                    <div className="flex bg-slate-100 p-1.5 rounded-[2.2rem] shadow-inner border border-slate-200/50 w-fit mx-4">
                        <button 
                            type="button"
                            onClick={() => setSubmissionSubTab('projects')}
                            className={`px-8 py-3 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${submissionSubTab === 'projects' ? 'bg-white text-[#6C3BFF] shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Projects & Deliverables
                        </button>
                        <button 
                            type="button"
                            onClick={() => setSubmissionSubTab('assessments')}
                            className={`px-8 py-3 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${submissionSubTab === 'assessments' ? 'bg-white text-[#6C3BFF] shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Quizzes & Assessments
                        </button>
                    </div>

                    {quizStages.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[3rem] p-10 mx-4">
                            <div className="w-16 h-16 bg-purple-50 text-[#6C3BFF] rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <HelpCircle size={32} />
                            </div>
                            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">No Quiz Rounds Configured</h4>
                            <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">Configure a Quiz or Assessment round in the "Stages & Timeline" builder to start reviewing attempts.</p>
                        </div>
                    ) : (
                        <div className="space-y-8 px-4">
                            <div className="flex flex-wrap items-center justify-between gap-6">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Select Quiz Stage</label>
                                        <select 
                                            value={selectedSubTabQuizStageId}
                                            onChange={(e) => setSelectedSubTabQuizStageId(e.target.value)}
                                            className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-purple-50 transition-all min-w-[240px]"
                                        >
                                            {quizStages.map(qs => (
                                                <option key={qs.id} value={qs.id}>{qs.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Search Participants</label>
                                        <div className="relative">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                type="text" 
                                                placeholder="Search by name or email..." 
                                                value={quizResultsSearch}
                                                onChange={(e) => setQuizResultsSearch(e.target.value)}
                                                className="pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all w-80"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-end">
                                    {quizNotifyDone && (
                                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100 animate-in fade-in">
                                            <CheckCircle2 size={14} /> Notification sent
                                        </span>
                                    )}
                                    <button 
                                        type="button"
                                        onClick={handleQuizNotifyShortlisted}
                                        disabled={quizNotifying || !quizResults.some(r => r.participant_status === 'shortlisted' || r.participant_status === 'accepted')}
                                        className="px-6 py-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                        title="Send email to all currently shortlisted participants"
                                    >
                                        {quizNotifying ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        Notify All
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleQuizShortlist}
                                        disabled={quizSelectedIds.size === 0 || quizShortlisting}
                                        className="px-8 py-4 bg-[#6C3BFF] hover:bg-purple-700 disabled:opacity-40 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-purple-200"
                                    >
                                        {quizShortlisting && <Loader2 size={14} className="animate-spin" />}
                                        Shortlist ({quizSelectedIds.size})
                                    </button>
                                </div>
                            </div>

                            {/* Summary bar */}
                            <div className="flex flex-wrap items-center gap-6 px-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-500 animate-in fade-in">
                                <span>Total Attempts: <strong className="text-slate-800">{quizResults.length}</strong></span>
                                <span>Passed Cutoff: <strong className="text-emerald-600">{passedCount}</strong></span>
                                <span>Failed: <strong className="text-red-500">{quizResults.length - passedCount}</strong></span>
                                {quizShortlistDone && (
                                    <span className="flex items-center gap-1 text-emerald-600 font-bold ml-auto">
                                        <CheckCircle2 size={14} /> Shortlisted
                                    </span>
                                )}
                            </div>

                            <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/20">
                                {quizResultsLoading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 size={32} className="animate-spin text-[#6C3BFF]" />
                                    </div>
                                ) : quizResultsError ? (
                                    <div className="p-10 text-center text-red-500 font-bold flex items-center justify-center gap-2">
                                        <AlertCircle size={20} />
                                        {quizResultsError}
                                    </div>
                                ) : quizResults.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400 font-bold">
                                        No quiz attempts submitted yet for this stage.
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-10 py-6 w-10">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={filteredQuizzes.length > 0 && quizSelectedIds.size === filteredQuizzes.length}
                                                        onChange={() => toggleQuizSelectAll(filteredQuizzes)}
                                                        className="w-5 h-5 rounded border-2 border-slate-200 text-purple-600 focus:ring-purple-500"
                                                    />
                                                </th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Participant</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score / Cutoff</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Result</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted At</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredQuizzes.map((r) => {
                                                const isShortlisted = r.participant_status === 'shortlisted' || r.participant_status === 'accepted';
                                                return (
                                                    <tr key={r.user_id} className={`hover:bg-slate-50/30 transition-colors group ${isShortlisted ? 'bg-emerald-50/20' : ''}`}>
                                                        <td className="px-10 py-8">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={quizSelectedIds.has(r.user_id)}
                                                                onChange={() => toggleQuizSelect(r.user_id)}
                                                                disabled={isShortlisted}
                                                                className="w-5 h-5 rounded border-2 border-slate-200 text-[#6C3BFF] focus:ring-[#6C3BFF] disabled:opacity-30"
                                                            />
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-slate-900 text-lg tracking-tight">{r.name}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 mt-1">{r.email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <div className="flex flex-col">
                                                                <span className={`text-lg font-black ${r.passed ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                    {r.correct !== undefined && r.total !== undefined ? `${r.correct}/${r.total}` : `${r.score}%`}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 mt-1">({r.score}%) • Cutoff {r.pass_mark}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            {r.passed ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                                                    <CheckCircle2 size={12} /> Pass
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-100">
                                                                    <XCircle size={12} /> Fail
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-10 py-8 text-sm font-bold text-slate-500">
                                                            {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '-'}
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            {isShortlisted ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                                    <CheckCircle2 size={12} /> Shortlisted
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">{r.participant_status}</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-12 bg-slate-900 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl border border-white/5">
                    <div className="relative z-10">
                        <h3 className="text-4xl font-black tracking-tight mb-4">Submission Management</h3>
                        <p className="text-slate-400 font-bold max-w-xl leading-relaxed">Review submissions, assign judges, and evaluate in real-time.</p>
                    </div>
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px]"></div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-[2.2rem] shadow-inner border border-slate-200/50 w-fit mx-4">
                    <button 
                        type="button"
                        onClick={() => setSubmissionSubTab('projects')}
                        className={`px-8 py-3 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${submissionSubTab === 'projects' ? 'bg-white text-[#6C3BFF] shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Projects & Deliverables
                    </button>
                    <button 
                        type="button"
                        onClick={() => setSubmissionSubTab('assessments')}
                        className={`px-8 py-3 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${submissionSubTab === 'assessments' ? 'bg-white text-[#6C3BFF] shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Quizzes & Assessments
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-6 px-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search teams or leads..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all w-80"
                            />
                        </div>
                        <select 
                            value={domainFilter}
                            onChange={(e) => setDomainFilter(e.target.value)}
                            className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-purple-50 transition-all"
                        >
                            {domains.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select 
                            value={judgeFilter}
                            onChange={(e) => setJudgeFilter(e.target.value)}
                            className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-purple-50 transition-all max-w-[200px] truncate"
                        >
                            <option value="All Judges">All Judges</option>
                            <option value="">Unassigned</option>
                            {institutionJudges.map(j => <option key={j._id} value={j._id}>{j.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsBulkMode(!isBulkMode)}
                            className={`px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isBulkMode ? 'bg-purple-600 text-white shadow-xl shadow-purple-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            Bulk Assignment
                        </button>
                        {isBulkMode && selectedSubmissions.length > 0 && (
                            <select 
                                onChange={(e) => handleBulkAssign(e.target.value)}
                                className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest outline-none shadow-xl cursor-pointer"
                            >
                                <option value="">Assign Judge to ({selectedSubmissions.length})</option>
                                {(institutionJudges || []).map((j: any) => (
                                    <option key={j._id} value={j._id}>{j.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/20">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                {isBulkMode && <th className="px-10 py-6 w-10"></th>}
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Detail</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Idea & Solution</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Judge</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length > 0 ? (
                                filtered.map((sub, idx) => (
                                    <tr key={sub._id} className="hover:bg-slate-50/30 transition-colors group">
                                        {isBulkMode && (
                                            <td className="px-10 py-8">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedSubmissions.includes(sub._id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedSubmissions([...selectedSubmissions, sub._id]);
                                                        else setSelectedSubmissions(selectedSubmissions.filter(id => id !== sub._id));
                                                    }}
                                                    className="w-5 h-5 rounded border-2 border-slate-200 text-purple-600 focus:ring-purple-500"
                                                />
                                            </td>
                                        )}
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 text-lg tracking-tight">{sub.teamName || sub.team_name || sub.teamLead || sub.team_lead || sub.user_name || sub.name}</span>
                                                {sub.teamLead || sub.team_lead || sub.team_name ? (
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lead: {sub.teamLead || sub.team_lead || sub.team_name}</span>
                                                ) : null}
                                                {sub.domain && <span className="text-[9px] font-black text-purple-600 uppercase tracking-[0.2em] mt-2">{sub.domain}</span>}
                                                {sub._sourceType === 'stage' && sub.stage_name ? (
                                                    <span className="mt-2 inline-flex w-fit px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase tracking-widest">
                                                        {sub.stage_name}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 max-w-md">
                                            <div className="space-y-2">
                                                {(() => {
                                                    const stageData = sub._sourceType === 'stage' ? sub.data : null;
                                                    const descText = stageData
                                                        ? (stageData.description || stageData.problem_statement || stageData.solution || '')
                                                        : (sub.problemStatement && sub.problemStatement !== 'Submitted link' && sub.problemStatement !== 'Submitted file' ? sub.problemStatement : '');
                                                    interface FileAsset { type: 'file'; url: string; mime: string }
                                                    interface LinkAsset { type: 'link'; url: string; domain: string }
                                                    const assets: (FileAsset | LinkAsset)[] = [];
                                                    if (stageData && typeof stageData === 'object') {
                                                        for (const [key, value] of Object.entries(stageData)) {
                                                            if (typeof value !== 'string') continue;
                                                            if (['description', 'problem_statement', 'solution'].includes(key)) continue;
                                                            if (value.startsWith('data:')) {
                                                                const mime = value.split(';')[0].split(':')[1] || '';
                                                                assets.push({ type: 'file', url: value, mime });
                                                            } else if (value.startsWith('http://') || value.startsWith('https://')) {
                                                                let domain = '';
                                                                try { domain = new URL(value).hostname; } catch {}
                                                                assets.push({ type: 'link', url: value, domain });
                                                            }
                                                        }
                                                    } else {
                                                        if (sub.pptLink) {
                                                            if (sub.pptLink.startsWith('data:')) {
                                                                const mime = sub.pptLink.split(';')[0].split(':')[1] || '';
                                                                assets.push({ type: 'file', url: sub.pptLink, mime });
                                                            } else {
                                                                let domain = '';
                                                                try { domain = new URL(sub.pptLink).hostname; } catch {}
                                                                assets.push({ type: 'link', url: sub.pptLink, domain });
                                                            }
                                                        }
                                                        if (sub.githubLink) {
                                                            let domain = '';
                                                            try { domain = new URL(sub.githubLink).hostname; } catch {}
                                                            assets.push({ type: 'link', url: sub.githubLink, domain });
                                                        }
                                                    }
                                                    const assetFilename = (url: string, mime: string) => {
                                                        if (url.startsWith('data:')) {
                                                            const ext = mime.split('/')[1] || 'bin';
                                                            return `Attachment.${ext}`;
                                                        }
                                                        try {
                                                            const u = new URL(url);
                                                            return u.pathname.split('/').pop() || 'Attachment';
                                                        } catch {
                                                            return 'Attachment';
                                                        }
                                                    };
                                                    const renderIcon = (asset: FileAsset | LinkAsset) => {
                                                        if (asset.type === 'file') {
                                                            const { mime } = asset;
                                                            if (mime.includes('pdf')) return <FileText size={16} />;
                                                            if (mime.includes('presentation') || mime.includes('pptx') || mime.includes('ppt')) return <FileCheck size={16} />;
                                                            if (mime.startsWith('image/')) return <FileImage size={16} />;
                                                            if (mime.startsWith('video/')) return <FileVideo size={16} />;
                                                            return <FileText size={16} />;
                                                        }
                                                        if (asset.domain.includes('github.com')) return <Github size={16} />;
                                                        return <Globe size={16} />;
                                                    };
                                                    return (
                                                        <>
                                                            {descText && <p className="text-sm font-bold text-slate-800 line-clamp-2">{descText}</p>}
                                                            {assets.length > 0 && (
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    {assets.map((asset, ai) => (
                                                                        asset.type === 'file' ? (
                                                                            <button key={ai}
                                                                                onClick={() => setPreviewAsset({ url: asset.url, filename: assetFilename(asset.url, asset.mime), type: 'file' })}
                                                                                title={`View ${asset.mime.includes('pdf') ? 'PDF' : asset.mime.includes('presentation') ? 'PPT' : 'file'}`}
                                                                                className="flex items-center justify-center w-9 h-9 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer">
                                                                                {renderIcon(asset)}
                                                                            </button>
                                                                        ) : (
                                                                            <a key={ai}
                                                                                href={asset.url}
                                                                                target="_blank" rel="noreferrer"
                                                                                title={`Open ${asset.domain.includes('github.com') ? 'GitHub' : 'link'}`}
                                                                                className="flex items-center justify-center w-9 h-9 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors">
                                                                                {renderIcon(asset)}
                                                                            </a>
                                                                        )
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-4">
                                                <select 
                                                    value={sub.assignedJudgeId || ""}
                                                    onChange={(e) => {
                                                        handleBulkAssign(e.target.value, [sub._id]);
                                                    }}
                                                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-purple-500"
                                                >
                                                    <option value="">No Judge Assigned</option>
                                                    {(institutionJudges || []).map((j: any) => (
                                                        <option key={j._id} value={j._id}>{j.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-black text-purple-600">{(sub.totalScore || 0).toFixed(1)}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase">Avg Pts</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={async () => {
                                                        setEvaluatingSubmission(sub);
                                                        try {
                                                            const scoreRes = await fetch(`${API_BASE_URL}/api/judges/scores/${sub._id}`, { headers: { ...authHeaders() } });
                                                            if (scoreRes.ok) {
                                                                const scoresData = await scoreRes.json();
                                                                const myScore = Array.isArray(scoresData) ? scoresData.find((s: any) => s.judge_id === user?.user_id) : null;
                                                                if (myScore) {
                                                                    setEvaluationScores(myScore.scores || {});
                                                                    setEvaluationComment(myScore.comments || myScore.feedback || '');
                                                                } else {
                                                                    setEvaluationScores({});
                                                                    setEvaluationComment('');
                                                                }
                                                            } else {
                                                                setEvaluationScores({});
                                                                setEvaluationComment('');
                                                            }
                                                        } catch {
                                                            setEvaluationScores({});
                                                            setEvaluationComment('');
                                                        }
                                                    }}
                                                    className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all shadow-sm"
                                                >
                                                    Evaluate
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isBulkMode ? 6 : 5} className="px-10 py-32 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.4em]">No submissions match your filters</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            {/* Bundle Categorization Section */}
            <div className="mt-16 space-y-8">
                <div className="flex items-center gap-10 border-b border-slate-100 px-6">
                    {BUNDLE_TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setBundleTab(tab)}
                            className={`text-[10px] font-black uppercase tracking-[0.2em] pb-5 relative transition-all ${bundleTab === tab ? 'text-[#6C3BFF]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {BUNDLE_TAB_LABEL[tab]} ({bundleData?.summary?.[tab] || 0})
                            {bundleTab === tab && (
                                <motion.div layoutId="bundleSubTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#6C3BFF] rounded-full shadow-[0_2px_10px_rgba(108,59,255,0.4)]" />
                            )}
                        </button>
                    ))}
                    {getCurrentStageInfo().is_final_stage && (bundleData?.approved?.length || 0) > 0 && (
                        <button
                            onClick={handleIssueCertificates}
                            disabled={issuingCertificates}
                            className="ml-auto mb-5 px-4 py-2 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-[0.2em]"
                        >
                            {issuingCertificates ? 'Issuing Certificates...' : 'Issue Certificates'}
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/20">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate Identity</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Judge Status</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score Aggregate</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(bundleData?.[bundleTab] || []).length > 0 ? (
                                (bundleData[bundleTab] || []).map((item: any, idx: number) => (
                                    <motion.tr
                                        key={item.team_id || item.user_id || idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="hover:bg-slate-50/30 transition-colors group"
                                    >
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 text-lg tracking-tight group-hover:text-[#6C3BFF] transition-colors">
                                                    {item.team_name}
                                                </span>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                        {getBundleSourceLabel(item)}
                                                    </span>
                                                    <span className="px-2.5 py-1 rounded-full border border-purple-100 bg-purple-50 text-[9px] font-black uppercase tracking-[0.2em] text-purple-600">
                                                        {getBundleStatusLabel(item.status || 'Pending')}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col gap-2">
                                                {item.total_judges > 0 || item.score > 0 ? (
                                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider w-fit ${item.judges_completed >= item.total_judges ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                                        <CheckCircle2 size={12} />
                                                        {item.judges_completed}/{item.total_judges} Judges Verified
                                                    </div>
                                                ) : null}
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">
                                                    {getBundleActionHint(item)}
                                                </p>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">
                                                    {Array.isArray(item.member_emails) && item.member_emails.length > 0
                                                        ? `Mail will go to ${item.member_emails.length} recipient${item.member_emails.length === 1 ? '' : 's'}`
                                                        : 'No recipients resolved yet'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <span className={`text-base font-black ${item.score > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {item.score ? item.score.toFixed(1) : '0.0'}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex gap-2 justify-end">
                                                {(() => {
                                                    const status = (item.status || '').toLowerCase();
                                                    if (status === 'approved' || status === 'accepted') {
                                                        return <div className="px-4 py-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-emerald-50 rounded-xl border border-emerald-100">Approved</div>;
                                                    }
                                                    if (status === 'rejected') {
                                                        return <div className="px-4 py-2 text-rose-600 text-[10px] font-black uppercase tracking-widest bg-rose-50 rounded-xl border border-rose-100">Rejected</div>;
                                                    }
                                                    return (
                                                        <>
                                                            {status !== 'shortlisted' ? (
                                                                <button
                                                                    onClick={() => handleUpdateStatus(item.team_id || item.submission_id, 'Shortlisted', item)}
                                                                    className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm text-xs font-bold"
                                                                    title={Array.isArray(item.member_emails) && item.member_emails.length > 0 ? `Shortlist and mail ${item.member_emails.length} recipient${item.member_emails.length === 1 ? '' : 's'}` : 'Shortlist for the next review round'}
                                                                >
                                                                    Shortlist
                                                                </button>
                                                            ) : null}
                                                            <button
                                                                onClick={() => handleUpdateStatus(item.team_id || item.submission_id, 'Accepted', item)}
                                                                className="p-3 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm text-xs font-bold"
                                                                title={Array.isArray(item.member_emails) && item.member_emails.length > 0 ? `Approve and notify ${item.member_emails.length} recipient${item.member_emails.length === 1 ? '' : 's'}` : 'Accept / approve this entry'}
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(item.team_id || item.submission_id, 'Rejected', item)}
                                                                className="p-3 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm text-xs font-bold"
                                                                title="Reject / remove from consideration"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-10 py-24 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <Filter size={64} className="mb-6" />
                                            <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No {BUNDLE_TAB_LABEL[bundleTab]?.toLowerCase() || ''} candidates</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        );
    };

    const renderTabContent_HackathonParticipants = () => {
        // Build a flat list of all participants derived from hackathon submissions
        const allParticipants: { name: string; team: string; role: 'Team Lead' | 'Member' | 'Solo' }[] = [];
        hackathonSubmissions.forEach(sub => {
            const isTeam = sub.teamType === 'Team' || (sub.teamMembers && String(sub.teamMembers).trim().length > 0);
            if (sub.teamLead) {
                allParticipants.push({ name: sub.teamLead, team: sub.teamName, role: isTeam ? 'Team Lead' : 'Solo' });
            }
            if (sub.teamMembers) {
                const members: string[] = typeof sub.teamMembers === 'string'
                    ? sub.teamMembers.split(',').map((m: string) => m.trim()).filter(Boolean)
                    : (Array.isArray(sub.teamMembers) ? sub.teamMembers : []);
                members.forEach(name => {
                    if (name && name.toLowerCase() !== sub.teamLead?.toLowerCase()) {
                        allParticipants.push({ name, team: sub.teamName, role: 'Member' });
                    }
                });
            }
        });

        const filtered = allParticipants.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.team.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-12 bg-blue-900 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl border border-white/5">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-4xl font-black tracking-tight mb-4">Event Participants</h3>
                            <p className="text-blue-200 font-bold max-w-xl leading-relaxed">All individuals from submitted projects — team leads and members.</p>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="text-center">
                                <span className="text-5xl font-black">{allParticipants.length}</span>
                                <p className="text-blue-300 text-xs font-black uppercase tracking-widest mt-1">Total People</p>
                            </div>
                            <div className="text-center">
                                <span className="text-5xl font-black">{hackathonSubmissions.length}</span>
                                <p className="text-blue-300 text-xs font-black uppercase tracking-widest mt-1">Teams</p>
                            </div>
                        </div>
                    </div>
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px]"></div>
                </div>

                <div className="px-4">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or team..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all w-full md:w-96"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/20">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length > 0 ? (
                                filtered.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-10 py-6 text-sm font-black text-slate-300">{idx + 1}</td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100">
                                                    {p.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-black text-slate-900">{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-sm font-bold text-slate-500">{p.team}</td>
                                        <td className="px-10 py-6">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                p.role === 'Team Lead' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                p.role === 'Solo' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                'bg-blue-50 text-blue-600 border border-blue-100'
                                            }`}>{p.role}</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-10 py-32 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.4em]">No participants found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderTabContent_HackathonTeams = () => {
        // Parse each submission into a team row
        const teamRows = hackathonSubmissions.map(sub => {
            const memberNames: string[] = typeof sub.teamMembers === 'string'
                ? sub.teamMembers.split(',').map((m: string) => m.trim()).filter(Boolean)
                : (Array.isArray(sub.teamMembers) ? sub.teamMembers : []);
            // Deduplicate lead from members list
            const members = memberNames.filter(n => n.toLowerCase() !== (sub.teamLead || '').toLowerCase());
            const totalCount = (sub.teamLead ? 1 : 0) + members.length;
            return { ...sub, parsedMembers: members, totalCount };
        });

        const totalParticipants = teamRows.reduce((acc, t) => acc + t.totalCount, 0);

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-12 bg-purple-900 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl border border-white/5">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-4xl font-black tracking-tight mb-3">Registered Teams</h3>
                            <p className="text-purple-200 font-bold">All teams and their members across this hackathon.</p>
                        </div>
                        <div className="flex items-center gap-10">
                            <div className="text-center">
                                <span className="text-5xl font-black">{teamRows.length}</span>
                                <p className="text-purple-300 text-xs font-black uppercase tracking-widest mt-1">Teams</p>
                            </div>
                            <div className="text-center">
                                <span className="text-5xl font-black">{totalParticipants}</span>
                                <p className="text-purple-300 text-xs font-black uppercase tracking-widest mt-1">Participants</p>
                            </div>
                        </div>
                    </div>
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px]"></div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/20">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100">
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Name</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Lead</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Members</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Domain</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Submitted</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {teamRows.length > 0 ? teamRows.map((team, idx) => (
                                <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                                    <td className="px-10 py-6 text-sm font-black text-slate-300">{idx + 1}</td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm border border-purple-100">
                                                {(team.teamName || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-black text-slate-900">{team.teamName}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-black border border-purple-100">
                                            {team.teamLead || '—'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-sm font-bold text-slate-600 max-w-[220px]">
                                        {team.parsedMembers.length > 0
                                            ? team.parsedMembers.join(', ')
                                            : <span className="text-slate-300 italic">Solo</span>
                                        }
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest">
                                            {team.domain || '—'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <span className="w-8 h-8 bg-[#6C3BFF]/10 text-[#6C3BFF] rounded-xl flex items-center justify-center font-black text-sm mx-auto">
                                            {team.totalCount}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-right text-xs font-bold text-slate-400">
                                        {team.submittedAt ? new Date(team.submittedAt).toLocaleDateString() : '—'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="px-10 py-32 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.4em]">
                                        No teams yet — they'll appear as submissions arrive
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderTabContent_Judges = () => (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-12 bg-amber-900 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="space-y-4">
                        <h3 className="text-4xl font-black tracking-tight">Event Judges</h3>
                        <p className="text-amber-200 font-bold max-w-xl leading-relaxed">{institutionJudges.length} judge{institutionJudges.length !== 1 ? 's' : ''} registered for this institution.</p>
                    </div>
                    <button
                        onClick={() => setIsJudgeInviteOpen(true)}
                        className="px-10 py-5 bg-white text-amber-900 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-3"
                    >
                        <UserPlus size={20} /> Add Judge
                    </button>
                </div>
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-600/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 px-4">
                {institutionJudges.map((j: any, i: number) => (
                    <div key={j._id || i} className="p-10 bg-white border border-slate-100 rounded-[3.5rem] shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center font-black text-2xl group-hover:bg-amber-600 group-hover:text-white transition-all shadow-inner border border-amber-100">
                                {(j.name || '?').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{j.name}</h4>
                        <p className="text-sm font-bold text-purple-600 uppercase tracking-widest mb-8">{j.domain}</p>

                        <div className="pt-8 border-t border-slate-50 flex items-center justify-between mt-auto">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Added {j.created_at ? new Date(j.created_at).toLocaleDateString() : '—'}
                            </span>
                            <button
                                onClick={() => handleDeleteJudge(j._id)}
                                className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
                {institutionJudges.length === 0 && (
                    <div className="col-span-full py-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center text-center">
                        <Gavel size={64} className="text-slate-200 mb-6" />
                        <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Judges Added Yet</h4>
                        <p className="text-sm font-bold text-slate-300 mt-2">Click "Add Judge" to add your first evaluator.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderTabContent_Registrations = () => {
        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
                {/* 1. Header Command Card */}
                <div className="p-12 bg-slate-900 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl border border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="relative z-10 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="px-4 py-1.5 bg-[#6C3BFF] text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(108,59,255,0.4)]">
                                Onboarding Panel
                            </span>
                            <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md text-[#6C3BFF] rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-[#6C3BFF]/20">
                                Active Registrations Engine
                            </span>
                        </div>
                        <h3 className="text-4xl lg:text-5xl font-black tracking-tighter leading-tight">Registration Pipeline</h3>
                        <p className="text-slate-400 font-bold max-w-xl leading-relaxed">
                            Review core credentials, evaluate additional answers, and coordinate shortlisted profiles.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 shrink-0 relative z-10">
                        <button 
                            onClick={handleExportRegistrationsCsv}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 group"
                        >
                            <Download size={18} className="text-[#6C3BFF] group-hover:scale-110 transition-transform" /> 
                            Export CSV Roster
                        </button>
                    </div>
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#6C3BFF]/10 rounded-full blur-[100px]"></div>
                </div>

                {/* 1b. Registration Form Preview */}
                {registrationUiFields.length > 0 && (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm p-6 lg:p-8 space-y-5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500">Admin Preview</p>
                                <h4 className="text-lg font-black text-slate-900 mt-1">Registration fields in order</h4>
                            </div>
                            <span className="px-3 py-1.5 rounded-full bg-purple-50 text-[#6C3BFF] border border-purple-100 text-[10px] font-black uppercase tracking-widest">
                                {registrationUiFields.length} fields
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {registrationUiFields.map((field: any, idx: number) => {
                                const sourceField = Array.isArray(registrationFormDef?.fields_definitions)
                                    ? registrationFormDef.fields_definitions.find((f: any) => String(f.id || f.field_id || f.label || '') === String(field.id || field.label || ''))
                                    : null;
                                const hasPrefill = Boolean(sourceField?.prefilled_value);
                                return (
                                    <div key={`${field.id}-${idx}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Field {idx + 1}</div>
                                                <div className="font-bold text-slate-900 text-sm truncate mt-1">{field.label}</div>
                                                <div className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-wider">{field.type}</div>
                                            </div>
                                            {hasPrefill && (
                                                <span className="shrink-0 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest">
                                                    Prefilled
                                                </span>
                                            )}
                                        </div>
                                        {sourceField?.prefilled_value ? (
                                            <p className="mt-3 text-xs font-semibold text-slate-600 truncate">
                                                {String(sourceField.prefilled_value)}
                                            </p>
                                        ) : (
                                            <p className="mt-3 text-xs font-semibold text-slate-400 italic">Admin kept blank, user will enter manually</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 2. Metrics Roster Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    {[
                        { label: 'Total Applicants', val: regStats.total, icon: Users, color: 'text-[#6C3BFF]', bg: 'bg-purple-50 border-purple-100/50' },
                        { label: 'Approved', val: regStats.approved, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100/50' },
                        { label: 'Pending Approval', val: regStats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100/50' },
                        { label: 'Waitlisted', val: regStats.waitlisted, icon: Timer, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-100/50' },
                        { label: 'Rejected', val: regStats.rejected, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-100/50' }
                    ].map((m, i) => (
                        <div key={i} className={`p-8 bg-white border ${m.bg} rounded-[2.5rem] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 rounded-2xl bg-white/80 ${m.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-all`}>
                                    <m.icon size={22} />
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{m.label}</p>
                                <p className="text-3xl font-black text-slate-900 leading-none">{m.val}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3. Search and Action Filters Command Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by name, email, or college..." 
                                value={regSearch}
                                onChange={(e) => setRegSearch(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all"
                            />
                        </div>
                        <select 
                            value={regStatusFilter}
                            onChange={(e) => {
                                setRegStatusFilter(e.target.value);
                                setRegPage(1);
                            }}
                            className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-purple-50 transition-all min-w-[200px]"
                        >
                            <option value="">All Verification States</option>
                            <option value="APPROVED">Approved Only</option>
                            <option value="PENDING_APPROVAL">Pending Verification</option>
                            <option value="WAITLISTED">Waitlisted</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                                <button
                                    onClick={handleNotifyApproved}
                                    disabled={notifyingApproved || ((regStats as any).pending_notification === 0)}
                                    className="px-5 py-4 bg-purple-50 hover:bg-[#6C3BFF] hover:text-white border border-purple-100 text-[#6C3BFF] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-40"
                                >
                                    {notifyingApproved ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Send size={14} />
                                    )}
                                    Notify {(regStats as any).pending_notification ?? regStats.approved} Approved
                                </button>
                    </div>
                </div>

                {/* 4. Applications Table Panel */}
                <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/20 relative">
                    {regLoading && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-[#6C3BFF] animate-spin mb-4" />
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">Syncing application data...</p>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-6"></th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Applicant</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Education & Contact</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* --- TEAM BUNDLES --- */}
                                    {rosterTeams.length > 0 && rosterTeams.map((team: any) => {
                                        const isTeamExpanded = expandedRegId === team.team_id;
                                        const isActionBusy = regActionBusy === team.team_id;
                                        return (
                                            <React.Fragment key={team.team_id}>
                                                <tr className="hover:bg-purple-50/40 transition-colors group bg-slate-50/30">
                                                    <td className="px-8 py-5">
                                                        <button 
                                                            onClick={() => setExpandedRegId(isTeamExpanded ? null : team.team_id)}
                                                            className="p-1.5 hover:bg-purple-100 rounded-lg text-purple-400 hover:text-[#6C3BFF] transition-all shadow-sm"
                                                            title={isTeamExpanded ? "Collapse Team" : "Expand Team Details"}
                                                        >
                                                            <ChevronRight 
                                                                size={14} 
                                                                className={`transform transition-transform duration-300 ${isTeamExpanded ? 'rotate-90 text-[#6C3BFF]' : ''}`} 
                                                            />
                                                        </button>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-[#6C3BFF] text-white rounded-xl flex items-center justify-center font-black text-sm shadow-inner shrink-0 uppercase tracking-widest">
                                                                {(team.team_name || 'T').substring(0, 2)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-black text-slate-900 text-sm leading-tight mb-0.5 truncate max-w-[200px]">{team.team_name}</p>
                                                                <p className="text-[11px] font-bold text-purple-600 truncate uppercase tracking-widest">{team.members?.length || 0} Members</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                                                            Bundled Application
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                                                            team.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50 shadow-sm' :
                                                            team.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100/50' :
                                                            team.status === 'WAITLISTED' ? 'bg-indigo-50 text-indigo-600 border-indigo-100/50' :
                                                            'bg-amber-50 text-amber-600 border-amber-100/50 animate-pulse'
                                                        }`}>
                                                            {team.status === 'PENDING_APPROVAL' ? 'Pending' : team.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <div className="flex justify-end gap-2 items-center">
                                                            {team.status !== 'APPROVED' && (
                                                                <button
                                                                    onClick={() => handleUpdateTeamStatus(team.team_id, 'APPROVED')}
                                                                    disabled={isActionBusy}
                                                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border border-emerald-100"
                                                                >
                                                                    {isActionBusy ? <Loader2 size={12} className="animate-spin" /> : 'Approve'}
                                                                </button>
                                                            )}
                                                            {team.status !== 'REJECTED' && (
                                                                <button
                                                                    onClick={() => handleUpdateTeamStatus(team.team_id, 'REJECTED')}
                                                                    disabled={isActionBusy}
                                                                    className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border border-rose-100"
                                                                >
                                                                    {isActionBusy ? <Loader2 size={12} className="animate-spin" /> : 'Reject'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* Expanded Members */}
                                                {isTeamExpanded && team.members?.map((reg: any, idx: number) => {
                                                    const isExpanded = expandedRegId === reg._id;
                                                    const customAnswers = reg.custom_answers || {};
                                                    const prof = reg.profile_snapshot || {};
                                                    return (
                                                        <React.Fragment key={reg._id}>
                                                        <tr className="bg-slate-50/10 hover:bg-slate-50 transition-colors group">
                                                            <td className="px-8 py-4 border-l-2 border-purple-200 flex items-center gap-3">
                                                                <button 
                                                                    onClick={() => setExpandedRegId(isExpanded ? null : reg._id)}
                                                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#6C3BFF] transition-all"
                                                                    title={isExpanded ? "Collapse Details" : "Expand Custom Answers & Profile"}
                                                                >
                                                                    <ChevronRight 
                                                                        size={14} 
                                                                        className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-90 text-[#6C3BFF]' : ''}`} 
                                                                    />
                                                                </button>
                                                                <span className="text-[9px] font-black text-slate-300"># {idx + 1}</span>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <div className="flex flex-col min-w-0">
                                                                    <p className="font-bold text-slate-700 text-xs leading-tight mb-0.5 truncate">{prof.full_name || 'Anonymous User'}</p>
                                                                    <p className="text-[10px] font-medium text-slate-400 truncate">{prof.email || '—'}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <div className="text-xs">
                                                                    <p className="font-semibold text-slate-600 leading-tight truncate">{prof.college || 'No college'}</p>
                                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                                        {prof.degree || ''}{prof.degree && prof.branch ? ' • ' : ''}{prof.branch || ''}
                                                                        {prof.graduation_year ? ` • ${prof.graduation_year}` : ''}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inherits Team Status</span>
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-1.5 items-center">
                                                                    {prof.resume_url && (
                                                                        <a href={prof.resume_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-slate-400 hover:text-[#6C3BFF] rounded-lg border border-slate-200 transition-all shadow-sm" title="Resume">
                                                                            <FileText size={12} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan={5} className="px-10 py-10 bg-slate-50 border-t border-b border-slate-100 shadow-inner">
                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                                        {/* Full Global Profile info */}
                                                                        <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm space-y-6">
                                                                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                                                                <div className="w-2 h-6 bg-[#6C3BFF] rounded-full"></div>
                                                                                <h4 className="text-base font-black text-slate-800 uppercase tracking-wider">Candidate Profile Snapshot</h4>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-6 text-sm">
                                                                                <div className="space-y-1">
                                                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Graduation Year</span>
                                                                                    <p className="font-bold text-slate-800">{prof.graduation_year || '—'}</p>
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Phone Number</span>
                                                                                    <p className="font-bold text-slate-800">{prof.phone || '—'}</p>
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Gender</span>
                                                                                    <p className="font-bold text-slate-800 uppercase tracking-wider text-xs">{prof.gender || '—'}</p>
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">CGPA</span>
                                                                                    <p className="font-bold text-slate-800">{prof.cgpa || '—'}</p>
                                                                                </div>
                                                                                <div className="space-y-1 col-span-2">
                                                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Academics</span>
                                                                                    <p className="font-bold text-slate-800">
                                                                                        {prof.degree || 'Degree unspecified'} {prof.branch ? `(${prof.branch})` : ''}
                                                                                    </p>
                                                                                </div>
                                                                                {prof.skills && prof.skills.length > 0 && (
                                                                                    <div className="col-span-2 space-y-2">
                                                                                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Candidate Skills</span>
                                                                                        <div className="flex flex-wrap gap-1.5">
                                                                                            {(Array.isArray(prof.skills) ? prof.skills : String(prof.skills).split(',')).map((s: string, sIdx: number) => (
                                                                                                <span key={sIdx} className="px-3 py-1 bg-purple-50 text-[#6C3BFF] border border-purple-100/30 rounded-lg text-[10px] font-bold">
                                                                                                    {String(s).trim()}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Custom stage questions and answers */}
                                                                        <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm space-y-6">
                                                                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                                                                <div className="w-2 h-6 bg-[#6C3BFF] rounded-full"></div>
                                                                                <h4 className="text-base font-black text-slate-800 uppercase tracking-wider font-sans">Dynamic Challenge Responses</h4>
                                                                            </div>
                                                                            <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                                                                {event.custom_questions && event.custom_questions.length > 0 ? (
                                                                                    event.custom_questions.map((q: any, qIdx: number) => {
                                                                                        const ans = customAnswers[q.id];
                                                                                        const isFile = String(ans || '').startsWith('http');
                                                                                        return (
                                                                                            <div key={qIdx} className="space-y-1.5">
                                                                                                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{q.label}</p>
                                                                                                {isFile ? (
                                                                                                    <a 
                                                                                                        href={ans} 
                                                                                                        target="_blank" 
                                                                                                        rel="noopener noreferrer" 
                                                                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[#6C3BFF] border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner transition-all"
                                                                                                    >
                                                                                                        <Download size={14} /> View File Attachment
                                                                                                    </a>
                                                                                                ) : (
                                                                                                    <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                                                                        {ans ? String(ans) : <span className="text-slate-300 italic">No answer supplied</span>}
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })
                                                                                ) : Object.keys(customAnswers).length > 0 ? (
                                                                                    Object.entries(customAnswers).map(([k, v]: any, qIdx: number) => {
                                                                                        const isFile = String(v || '').startsWith('http');
                                                                                        return (
                                                                                            <div key={qIdx} className="space-y-1.5">
                                                                                                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{k}</p>
                                                                                                {isFile ? (
                                                                                                    <a 
                                                                                                        href={v} 
                                                                                                        target="_blank" 
                                                                                                        rel="noopener noreferrer" 
                                                                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[#6C3BFF] border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner transition-all"
                                                                                                    >
                                                                                                        <Download size={14} /> View Attachment
                                                                                                    </a>
                                                                                                ) : (
                                                                                                    <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                                                                        {v ? String(v) : <span className="text-slate-300 italic">No answer</span>}
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })
                                                                                ) : (
                                                                                    <div className="py-12 text-center text-slate-300 font-black text-xs uppercase tracking-widest opacity-60">
                                                                                        No custom questions answered.
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                    
                                    {/* --- SOLO APPLICANTS --- */}
                                    {registrations.length > 0 ? (
                                        registrations.map((reg) => {
                                            const prof = reg.profile_snapshot || {};
                                            const customAnswers = reg.custom_answers || {};
                                            const isExpanded = expandedRegId === reg._id;
                                            const isActionBusy = regActionBusy === reg._id;

                                            return (
                                                <React.Fragment key={reg._id}>
                                                    <tr className="hover:bg-slate-50/30 transition-colors group">
                                                        <td className="px-8 py-5">
                                                            <button 
                                                                onClick={() => setExpandedRegId(isExpanded ? null : reg._id)}
                                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#6C3BFF] transition-all"
                                                                title={isExpanded ? "Collapse Details" : "Expand Custom Answers & Profile"}
                                                            >
                                                                <ChevronRight 
                                                                    size={14} 
                                                                    className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-90 text-[#6C3BFF]' : ''}`} 
                                                                />
                                                            </button>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-purple-50 text-[#6C3BFF] border border-purple-100 rounded-xl flex items-center justify-center font-black text-sm shadow-inner shrink-0 uppercase">
                                                                    {(prof.full_name || 'U').charAt(0)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-slate-900 text-sm leading-tight mb-0.5 truncate max-w-[200px]">{prof.full_name || 'Anonymous User'}</p>
                                                                    <p className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]">{prof.email || '—'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className="text-sm">
                                                                <p className="font-semibold text-slate-700 leading-tight">
                                                                    {prof.college || 'No college'}
                                                                </p>
                                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                                    {prof.degree || ''}{prof.degree && prof.branch ? ' • ' : ''}{prof.branch || ''}
                                                                    {prof.graduation_year ? ` • ${prof.graduation_year}` : ''}
                                                                    {prof.cgpa ? ` • CGPA: ${prof.cgpa}` : ''}
                                                                </p>
                                                                {prof.location && (
                                                                    <p className="text-[11px] text-slate-400 mt-0.5">{prof.location}</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <span className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                                                                reg.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50 shadow-sm' :
                                                                reg.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100/50' :
                                                                reg.status === 'WAITLISTED' ? 'bg-indigo-50 text-indigo-600 border-indigo-100/50' :
                                                                'bg-amber-50 text-amber-600 border-amber-100/50 animate-pulse'
                                                            }`}>
                                                                {reg.status === 'PENDING_APPROVAL' ? 'Pending' : reg.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right">
                                                            <div className="flex justify-end gap-1.5 items-center">
                                                                {prof.resume_url && (
                                                                    <a href={prof.resume_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 text-slate-400 hover:text-[#6C3BFF] rounded-lg border border-slate-100 hover:border-[#6C3BFF]/20 transition-all" title="Resume">
                                                                        <FileText size={12} />
                                                                    </a>
                                                                )}
                                                                {prof.linkedin_url && (
                                                                    <a href={prof.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 text-slate-400 hover:text-[#6C3BFF] rounded-lg border border-slate-100 hover:border-[#6C3BFF]/20 transition-all" title="LinkedIn">
                                                                        <LinkIcon size={12} />
                                                                    </a>
                                                                )}
                                                                {prof.github_url && (
                                                                    <a href={prof.github_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-lg border border-slate-100 transition-all" title="GitHub">
                                                                        <Share2 size={12} />
                                                                    </a>
                                                                )}
                                                                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                                                <button
                                                                    disabled={isActionBusy}
                                                                    onClick={() => handleUpdateRegistrationStatus(reg._id, 'APPROVED')}
                                                                    className={`px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                                                        reg.status === 'APPROVED' ? 'opacity-30 pointer-events-none' : ''
                                                                    }`}
                                                                >
                                                                    {isActionBusy && regActionBusy === reg._id ? <Loader2 size={9} className="animate-spin inline mr-1" /> : null}
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    disabled={isActionBusy}
                                                                    onClick={() => handleUpdateRegistrationStatus(reg._id, 'REJECTED')}
                                                                    className={`px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white border border-red-100 text-red-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                                                        reg.status === 'REJECTED' ? 'opacity-30 pointer-events-none' : ''
                                                                    }`}
                                                                >
                                                                    Reject
                                                                </button>
                                                                <button
                                                                    disabled={isActionBusy}
                                                                    onClick={() => handleUpdateRegistrationStatus(reg._id, 'WAITLISTED')}
                                                                    className={`px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                                                        reg.status === 'WAITLISTED' ? 'opacity-30 pointer-events-none' : ''
                                                                    }`}
                                                                >
                                                                    Waitlist
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                
                                                {/* 5. Custom Answers & Detailed Profile Expansion Panel */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={5} className="px-10 py-10 bg-slate-50 border-t border-b border-slate-100 shadow-inner">
                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                                {/* Full Global Profile info */}
                                                                <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm space-y-6">
                                                                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                                                        <div className="w-2 h-6 bg-[#6C3BFF] rounded-full"></div>
                                                                        <h4 className="text-base font-black text-slate-800 uppercase tracking-wider">Candidate Profile Snapshot</h4>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-6 text-sm">
                                                                        <div className="space-y-1">
                                                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Graduation Year</span>
                                                                            <p className="font-bold text-slate-800">{prof.graduation_year || '—'}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Phone Number</span>
                                                                            <p className="font-bold text-slate-800">{prof.phone || '—'}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Gender</span>
                                                                            <p className="font-bold text-slate-800 uppercase tracking-wider text-xs">{prof.gender || '—'}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">CGPA</span>
                                                                            <p className="font-bold text-slate-800">{prof.cgpa || '—'}</p>
                                                                        </div>
                                                                        <div className="space-y-1 col-span-2">
                                                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Academics</span>
                                                                            <p className="font-bold text-slate-800">
                                                                                {prof.degree || 'Degree unspecified'} {prof.branch ? `(${prof.branch})` : ''}
                                                                            </p>
                                                                        </div>
                                                                        {prof.skills && prof.skills.length > 0 && (
                                                                            <div className="col-span-2 space-y-2">
                                                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Candidate Skills</span>
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {(Array.isArray(prof.skills) ? prof.skills : String(prof.skills).split(',')).map((s: string, sIdx: number) => (
                                                                                        <span key={sIdx} className="px-3 py-1 bg-purple-50 text-[#6C3BFF] border border-purple-100/30 rounded-lg text-[10px] font-bold">
                                                                                            {String(s).trim()}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Custom stage questions and answers */}
                                                                <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm space-y-6">
                                                                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                                                        <div className="w-2 h-6 bg-[#6C3BFF] rounded-full"></div>
                                                                        <h4 className="text-base font-black text-slate-800 uppercase tracking-wider font-sans">Dynamic Challenge Responses</h4>
                                                                    </div>
                                                                    <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                                                        {event.custom_questions && event.custom_questions.length > 0 ? (
                                                                            event.custom_questions.map((q: any, qIdx: number) => {
                                                                                const ans = customAnswers[q.id];
                                                                                const isFile = String(ans || '').startsWith('http');
                                                                                return (
                                                                                    <div key={qIdx} className="space-y-1.5">
                                                                                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{q.label}</p>
                                                                                        {isFile ? (
                                                                                            <a 
                                                                                                href={ans} 
                                                                                                target="_blank" 
                                                                                                rel="noopener noreferrer" 
                                                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[#6C3BFF] border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner transition-all"
                                                                                            >
                                                                                                <Download size={14} /> View File Attachment
                                                                                            </a>
                                                                                        ) : (
                                                                                            <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                                                                {ans ? String(ans) : <span className="text-slate-300 italic">No answer supplied</span>}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : Object.keys(customAnswers).length > 0 ? (
                                                                            Object.entries(customAnswers).map(([k, v]: any, qIdx: number) => {
                                                                                const isFile = String(v || '').startsWith('http');
                                                                                return (
                                                                                    <div key={qIdx} className="space-y-1.5">
                                                                                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{k}</p>
                                                                                        {isFile ? (
                                                                                            <a 
                                                                                                href={v} 
                                                                                                target="_blank" 
                                                                                                rel="noopener noreferrer" 
                                                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[#6C3BFF] border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner transition-all"
                                                                                            >
                                                                                                <Download size={14} /> View Attachment
                                                                                            </a>
                                                                                        ) : (
                                                                                            <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                                                                {v ? String(v) : <span className="text-slate-300 italic">No answer</span>}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <div className="py-12 text-center text-slate-300 font-black text-xs uppercase tracking-widest opacity-60">
                                                                                No custom questions answered.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center opacity-30">
                                                <Users size={64} className="text-slate-300 mb-6" />
                                                <h4 className="text-lg font-black text-slate-400 uppercase tracking-widest leading-none mb-2">No Applications Found</h4>
                                                <p className="text-sm font-medium text-slate-400">Adjust your search parameters or verification state criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                        )}
                                    </tbody>
                        </table>
                    </div>

                    {/* 6. Pagination Footer Controls */}
                    {regTotalPages > 1 && (
                        <div className="px-10 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Page {regPage} of {regTotalPages}
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    disabled={regPage === 1 || regLoading}
                                    onClick={() => setRegPage(prev => Math.max(1, prev - 1))}
                                    className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 disabled:opacity-40 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={regPage === regTotalPages || regLoading}
                                    onClick={() => setRegPage(prev => Math.min(regTotalPages, prev + 1))}
                                    className="px-5 py-2.5 bg-[#6C3BFF] hover:bg-[#5a2ee6] text-white disabled:opacity-40 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-purple-500/10"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {String(event.status || '').toUpperCase() === 'DRAFT' && (
                            <div className="p-6 rounded-3xl border border-amber-200 bg-amber-50 text-amber-950 text-sm font-bold leading-relaxed space-y-4">
                                <p>
                                    This event is still <span className="uppercase">draft</span>
                                    {(participants?.length || 0) > 0 && (
                                        <>, but <strong>{participants.length}</strong> student(s) already registered through the portal.</>
                                    )}
                                    . Publish when you want it to appear in learner opportunity listings.
                                </p>
                                <button
                                    type="button"
                                    onClick={handlePublishEvent}
                                    disabled={saving}
                                    className="px-6 py-3 rounded-2xl bg-amber-600 text-white text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-colors disabled:opacity-50"
                                >
                                    Publish event (go Live)
                                </button>
                            </div>
                        )}
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Registered Teams', val: hackathonSubmissions.length > 0 ? hackathonSubmissions.length : (teams?.length || 0), icon: Layers, color: 'text-[#6C3BFF]', bg: 'bg-purple-50', tab: 'teams' },
                                { label: 'Total Participants', val: hackathonSubmissions.length > 0 ? hackathonSubmissions.reduce((acc: number, sub: any) => {
                                    // Count unique members across all submissions
                                    const members = sub.teamMembers || sub.team_members || [];
                                    return acc + (members.length > 0 ? members.length : 1);
                                }, 0) : (participants?.length || 0), icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50', tab: 'participants' },
                                { label: 'Submissions', val: Math.max(hackathonSubmissions?.length || 0, submissions?.length || 0), icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'submissions' },
                                { label: 'Judges Active', val: institutionJudges.length, icon: Gavel, color: 'text-amber-600', bg: 'bg-amber-50', tab: 'judges' }
                            ].map((m, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setActiveTab(m.tab)}
                                    className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group"
                                >
                                    <div className={`w-12 h-12 ${m.bg} ${m.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all shadow-inner`}>
                                        <m.icon size={24} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-3xl font-black text-slate-900">{m.val}</p>
                                        <ChevronRight size={18} className="text-slate-200 group-hover:text-[#6C3BFF] group-hover:translate-x-1 transition-all" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Recent Activity Mock */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="p-10 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black mb-6">Recent Stage Progress</h3>
                                    <div className="space-y-8">
                                        {stages.map((s, i) => {
                                            const calculateProgressHeight = (start: string, endStr: string) => {
                                                const now = new Date();
                                                const startDate = new Date(start);
                                                const endDate = new Date(endStr);
                                                endDate.setUTCHours(23, 59, 59, 999);
                                                
                                                if (now < startDate) return '0%';
                                                if (now > endDate) return '100%';
                                                
                                                const total = endDate.getTime() - startDate.getTime();
                                                const elapsed = now.getTime() - startDate.getTime();
                                                return `${Math.min(100, Math.max(0, (elapsed / total) * 100))}%`;
                                            };

                                            return (
                                                <div key={i} className="flex items-center gap-6 group">
                                                    <div className="relative">
                                                        <div className="w-2 h-14 bg-white/10 rounded-full relative overflow-hidden">
                                                            <div 
                                                                className="absolute top-0 left-0 right-0 bg-[#6C3BFF] transition-all duration-1000" 
                                                                style={{ height: calculateProgressHeight(s.start_date, s.end_date) }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm tracking-tight">{s.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.type}</span>
                                                            <span className="text-slate-700">•</span>
                                                            <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                                                new Date() > new Date(new Date(s.end_date).setUTCHours(23, 59, 59, 999)) 
                                                                    ? 'text-slate-500' 
                                                                    : new Date() < new Date(s.start_date)
                                                                        ? 'text-blue-400'
                                                                        : 'text-emerald-400'
                                                            }`}>
                                                                {new Date() > new Date(new Date(s.end_date).setUTCHours(23, 59, 59, 999)) ? 'Completed' : new Date() < new Date(s.start_date) ? 'Upcoming' : 'Active'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all">
                                                        <ChevronRight size={16} className="text-slate-500" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#6C3BFF]/10 rounded-full blur-3xl"></div>
                            </div>
                            <div className="p-10 bg-white border border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                                    <PieChart size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Analytics Engine</h3>
                                <p className="text-slate-500 text-sm mt-3 max-w-xs leading-relaxed font-medium">Real-time demographic and performance reports are now available for download.</p>
                                <button className="mt-10 px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-[#6C3BFF] transition-all shadow-xl shadow-black/10">Generate Full Report</button>
                            </div>
                        </div>
                    </div>
                );
            case 'stages':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {hasUnsavedChanges && (
                            <div className="p-6 bg-amber-50 border border-amber-200 rounded-[2rem] flex items-center justify-between gap-6">
                                <div className="flex items-center gap-4 text-amber-900">
                                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shadow-inner">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold leading-tight">Unsaved Lifecycle Changes Detected</p>
                                        <p className="text-[10px] font-medium opacity-70 mt-0.5">Automated synchronization will trigger in 3 seconds, or click Sync Now.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSaveEvent}
                                    className="px-6 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-colors shadow-lg shadow-amber-900/10"
                                >
                                    Sync Now
                                </button>
                            </div>
                        )}
                        <StageBuilder stages={stages} onUpdate={setStages} onConfigureQuiz={openQuizForStage} onReviewQuiz={(quizId, quizTitle, stageName) => setReviewQuiz({ quizId, quizTitle, stageName })} availableJudges={institutionJudges} eventId={eventId || undefined} quizzes={quizzes} event={event} onUpdateEvent={(updatedEvent) => {
                            setEvent(updatedEvent);
                            setHasUnsavedChanges(true);
                        }} />
                    </div>
                );
            case 'teams':
                if (hackathonSubmissions.length > 0) return renderTabContent_HackathonTeams();
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Team Management</h3>
                                <p className="text-slate-500 text-sm font-medium mt-1">Direct control over participant grouping and identities.</p>
                            </div>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6C3BFF] transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search team or lead..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#6C3BFF]/5 focus:border-[#6C3BFF] transition-all w-80 font-medium"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(Array.isArray(teams) ? teams : []).filter(t => t.team_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((team, i) => (
                                <div key={i} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 bg-purple-50 text-[#6C3BFF] rounded-2xl flex items-center justify-center font-black text-lg group-hover:bg-[#6C3BFF] group-hover:text-white transition-all shadow-inner">
                                            {team.team_name?.charAt(0)}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                {team.members?.length || 0} Members
                                            </span>
                                            <span className="text-[9px] font-black text-[#6C3BFF] uppercase tracking-widest">Verified</span>
                                        </div>
                                    </div>
                                    <h4 className="text-xl font-black text-slate-900 mb-6 tracking-tight">{team.team_name}</h4>
                                    <div className="space-y-4 mb-8">
                                        {(team.members || []).map((m: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between group/mem">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#6C3BFF]"></div>
                                                    <span className="text-sm text-slate-600 font-bold">{m.name}</span>
                                                </div>
                                                {m.is_leader && <span className="text-[8px] font-black text-[#6C3BFF] bg-purple-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Leader</span>}
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full py-4 bg-slate-50 text-slate-500 hover:text-white hover:bg-[#6C3BFF] rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm">Inspect Full Dossier</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'basic':
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
                        {/* Header Action Card */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                                    <Info size={28} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Opportunity Information</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-1">This opportunity's details are fully managed through the creation wizard.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onEditEvent?.(event._id)}
                                className="flex items-center gap-2.5 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-purple-200"
                            >
                                <Edit3 size={14} /> Edit Opportunity
                            </button>
                        </div>

                        {/* Detailed Grid Card */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-10 space-y-10">
                            {/* Images Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Logo</span>
                                    <label className="group relative w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center overflow-hidden p-4 cursor-pointer hover:border-purple-400 transition-all">
                                        {event.logo_url && !logoError ? (
                                            <img src={getImageUrl(event.logo_url)} alt="Logo" className="max-w-full max-h-full object-contain" onError={() => setLogoError(true)} />
                                        ) : (
                                            <div className="text-slate-300 font-bold text-xs uppercase tracking-wider group-hover:text-purple-500 transition-colors">Click to upload Logo</div>
                                        )}
                                        <input type="file" className="hidden" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await handleMediaUpload(f, 'logo_url'); e.target.value = ''; } }} />
                                    </label>
                                </div>
                                <div className="md:col-span-2 space-y-3">
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Banner</span>
                                    <label className="group relative w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-400 transition-all">
                                        {event.banner_url && !bannerError ? (
                                            <img src={getImageUrl(event.banner_url)} alt="Banner" className="w-full h-full object-cover" onError={() => setBannerError(true)} />
                                        ) : (
                                            <div className="text-slate-300 font-bold text-xs uppercase tracking-wider group-hover:text-purple-500 transition-colors">Click to upload Banner</div>
                                        )}
                                        <input type="file" className="hidden" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await handleMediaUpload(f, 'banner_url'); e.target.value = ''; } }} />
                                    </label>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-50">
                                <div className="space-y-2">
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Opportunity Title</span>
                                    <p className="text-[15px] font-black text-slate-800 leading-tight">{event.title || '—'}</p>
                                </div>

                                <div className="space-y-2">
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</span>
                                    <p className="text-[15px] font-black text-slate-800 leading-tight">{event.category || '—'}</p>
                                </div>

                                <div className="space-y-2">
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Opportunity Mode</span>
                                    <p className="text-[15px] font-black text-slate-800 leading-tight capitalize">{event.opportunityMode || '—'}</p>
                                </div>

                                {event.skills && (
                                    <div className="space-y-2">
                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessed Skills</span>
                                        <p className="text-[15px] font-black text-slate-800 leading-tight">{event.skills}</p>
                                    </div>
                                )}

                                {event.prize_pool && (
                                    <div className="space-y-2">
                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Prize Pool</span>
                                        <p className="text-[15px] font-black text-slate-800 leading-tight">{event.prize_pool}</p>
                                    </div>
                                )}
                            </div>

                            {/* Description / Strategic Overview */}
                            <div className="space-y-4 pt-8 border-t border-slate-50">
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategic Overview</span>
                                <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem]">
                                    <div 
                                        className="opportunity-rich-text text-slate-600 font-medium leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_strong]:font-bold [&_em]:italic [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_a]:text-purple-600 [&_a]:underline outline-none"
                                        dangerouslySetInnerHTML={{ __html: sanitizePresentationHtml(event.description || '') }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'registrations':
                return renderTabContent_Registrations();
            case 'participants':
                if (hackathonSubmissions.length > 0) return renderTabContent_HackathonParticipants();
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-10 pt-10 pb-4 border-b border-slate-50">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registrations</h2>
                                <p className="text-sm text-slate-500 font-medium mt-2 max-w-2xl">
                                    Everyone who applied through the opportunity portal or was added as a participant for this event ({participants.length} total).
                                    Judge scoring buckets below are separate — they only list teams that have submission scores.
                                </p>
                                {portalReviewNotice ? (
                                    <div
                                        className={`mt-4 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 ${
                                            portalReviewNotice.kind === 'success'
                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                                : 'bg-red-50 text-red-800 border border-red-100'
                                        }`}
                                    >
                                        {portalReviewNotice.kind === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                        {portalReviewNotice.text}
                                    </div>
                                ) : null}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/80">
                                        <tr>
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                                            {/* Dynamically render custom fields headers */}
                                            {(event.registration_settings?.profile_fields_config ? Object.keys(event.registration_settings.profile_fields_config) : []).slice(0, 3).map((field) => (
                                                <th key={field} className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.replace('_', ' ')}</th>
                                            ))}
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered</th>
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Review</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {participants.length > 0 ? (
                                            participants.map((p: any) => {
                                                const src = p.source || '';
                                                const registrationData = p.registration_data || p.profile_snapshot || {};
                                                const canReview =
                                                    Boolean(p.opportunity_application_id) ||
                                                    ['opportunity_application', 'opportunity_portal', 'opportunity_portal_backfill'].includes(src) ||
                                                    Boolean(p.user_id && p.opportunity_id);
                                                const rowBusyId = String(p._id ?? p.user_id ?? p.opportunity_application_id ?? '');
                                                const rowBusy = reviewingParticipantId !== null && reviewingParticipantId === rowBusyId;
                                                return (
                                                <tr key={p._id} className="hover:bg-slate-50/50">
                                                    <td className="px-10 py-6 font-black text-slate-900">{p.full_name || p.name || p.registration_data?.full_name || p.profile_snapshot?.full_name || '—'}</td>
                                                    <td className="px-10 py-6 text-sm font-bold text-slate-600">{p.email || p.registration_data?.email || p.profile_snapshot?.email || '—'}</td>
                                                    {/* Dynamically render custom fields values */}
                                                    {(event.registration_settings?.profile_fields_config ? Object.keys(event.registration_settings.profile_fields_config) : []).slice(0, 3).map((field) => (
                                                        <td key={field} className="px-10 py-6 text-sm font-bold text-slate-600">{registrationData[field] || p.registration_data?.[field] || p.profile_snapshot?.[field] || '—'}</td>
                                                    ))}
                                                    <td className="px-10 py-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                        {src === 'opportunity_application' || src === 'opportunity_portal' || src === 'opportunity_portal_backfill'
                                                            ? 'Portal apply'
                                                            : 'Participant'}
                                                    </td>
                                                    <td className="px-10 py-6">
                                                        <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                                                            {portalRegistrationStatusLabel(p.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6 text-sm font-bold text-slate-500">
                                                        {p.registered_at ? new Date(p.registered_at).toLocaleString() : '—'}
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        {canReview ? (
                                                            <div className="flex flex-wrap justify-end gap-2 items-center">
                                                                <button
                                                                    type="button"
                                                                    disabled={rowBusy}
                                                                    onClick={() => handleReviewPortalApplication(p, 'shortlisted')}
                                                                    className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-600 hover:text-white disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-1.5"
                                                                >
                                                                    {rowBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                                                    Shortlist
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={rowBusy}
                                                                    onClick={() => handleReviewPortalApplication(p, 'rejected')}
                                                                    className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-100 hover:bg-red-600 hover:text-white disabled:opacity-50 disabled:pointer-events-none"
                                                                >
                                                                    Reject
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={rowBusy}
                                                                    onClick={() => handleReviewPortalApplication(p, 'pending')}
                                                                    className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 disabled:opacity-50 disabled:pointer-events-none"
                                                                >
                                                                    Pending
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-10 py-16 text-center text-slate-400 font-bold text-sm">
                                                    No registrations yet for this event.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            case 'judges':
                return renderTabContent_Judges();
            case 'submissions':
                return renderTabContent_SubmissionManagement();
            case '_submissions_legacy':
                return renderTabContent_SubmissionManagement();
            case 'submission-management':
                return renderTabContent_SubmissionManagement();

























            case 'criteria':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-12 bg-slate-900 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl border border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-4xl font-black tracking-tight mb-3">Scoring Rubrics</h3>
                                <p className="text-slate-400 font-bold">Define evaluation dimensions. Judges will score each team against these criteria.</p>
                            </div>
                            <button
                                onClick={() => {
                                    const newCriteria = [...criteria, { name: '', max_points: 10 }];
                                    setCriteria(newCriteria);
                                }}
                                className="px-8 py-4 bg-[#6C3BFF] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-purple-900/30 flex items-center gap-3 shrink-0"
                            >
                                <Plus size={18} /> Add Rubric
                            </button>
                        </div>

                        {criteria.length === 0 && (
                            <div className="py-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center">
                                <ShieldCheck size={56} className="text-slate-200 mb-4" />
                                <h4 className="text-lg font-black text-slate-400 uppercase tracking-widest">No Rubrics Yet</h4>
                                <p className="text-sm font-bold text-slate-300 mt-1">Click "Add Rubric" to define your first evaluation dimension.</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {criteria.map((criterion: any, idx: number) => (
                                <div key={idx} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex items-center gap-8 group hover:border-[#6C3BFF]/30 transition-all">
                                    <div className="w-14 h-14 bg-purple-50 text-[#6C3BFF] rounded-[1.2rem] flex items-center justify-center font-black text-lg shadow-inner shrink-0">{idx + 1}</div>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dimension Name</label>
                                            <input
                                                value={criterion.name}
                                                onChange={(e) => {
                                                    const nc = [...criteria];
                                                    nc[idx] = { ...nc[idx], name: e.target.value };
                                                    setCriteria(nc);
                                                }}
                                                placeholder="e.g. Innovation, Technical Depth"
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max Points</label>
                                            <input
                                                type="number"
                                                min={1} max={100}
                                                value={criterion.max_points}
                                                onChange={(e) => {
                                                    const nc = [...criteria];
                                                    nc[idx] = { ...nc[idx], max_points: parseInt(e.target.value) || 0 };
                                                    setCriteria(nc);
                                                }}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setCriteria(criteria.filter((_: any, i: number) => i !== idx))}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-400 hover:bg-red-600 hover:text-white transition-all shrink-0"
                                        title="Remove"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {criteria.length > 0 && (
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveRubrics}
                                    disabled={saving}
                                    className="px-10 py-5 bg-[#6C3BFF] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-purple-600/20 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save Rubrics'}
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'evaluation-matrix':
                return eventId ? <EvaluationMatrixView eventId={eventId} criteria={criteria} refreshCounter={refreshCounter} /> : null;
            case 'prizes':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Prize Distribution</h2>
                                <p className="text-sm font-medium text-slate-500 mt-1">Manage individual prizes, icons, and badge labels</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const updated = [...(prizeDistribution || []), {}];
                                        setPrizeDistribution(updated);
                                    }}
                                    className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#6C3BFF] transition-all"
                                >
                                    <Plus size={14} />
                                    Add Prize
                                </button>
                                {(prizeDistribution || []).length > 0 && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const formDataToSend = new FormData();
                                                formDataToSend.append('prizes', JSON.stringify(prizeDistribution));
                                                formDataToSend.append('prize_pool', event.prize_pool || '');
                                                const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/professional`, {
                                                    method: 'PATCH',
                                                    headers: { ...authHeaders() },
                                                    body: formDataToSend,
                                                });
                                                if (!res.ok) throw new Error('Failed to save');
                                                alert('Prizes saved successfully!');
                                                setRefreshCounter(prev => prev + 1);
                                            } catch (e: any) {
                                                alert(e?.message || 'Failed to save prizes');
                                            }
                                        }}
                                        className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                                    >
                                        <Save size={14} />
                                        Save Prizes
                                    </button>
                                )}
                            </div>
                        </div>

                        {(prizeDistribution || []).length === 0 ? (
                            <div className="p-16 bg-white border border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-sm">
                                <div className="w-16 h-16 bg-purple-50 text-purple-400 rounded-[1.25rem] flex items-center justify-center mb-6">
                                    <Trophy size={32} strokeWidth={1.5} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900">No prizes configured yet</h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-md font-medium">Add individual prizes with custom icons, badge labels, and descriptions to display on the event portal.</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const updated = [...(prizeDistribution || []), {}];
                                        setPrizeDistribution(updated);
                                    }}
                                    className="mt-6 flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#6C3BFF] transition-all"
                                >
                                    <Plus size={14} />
                                    Add First Prize
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {prizeDistribution.map((prize: any, i: number) => (
                                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500 text-[11px] font-black">
                                                    {i + 1}
                                                </div>
                                                <span className="text-sm font-bold text-slate-800">{prize.title || prize.rank || `Prize ${i + 1}`}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = prizeDistribution.filter((_: any, j: number) => j !== i);
                                                    setPrizeDistribution(updated);
                                                }}
                                                className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Title / Rank</label>
                                                <input
                                                    type="text"
                                                    value={prize.title || prize.rank || ''}
                                                    onChange={(e) => {
                                                        const updated = [...prizeDistribution];
                                                        updated[i] = {...updated[i], title: e.target.value, rank: e.target.value};
                                                        setPrizeDistribution(updated);
                                                    }}
                                                    placeholder="e.g. Winner"
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount</label>
                                                <input
                                                    type="text"
                                                    value={prize.amount || ''}
                                                    onChange={(e) => {
                                                        const updated = [...prizeDistribution];
                                                        updated[i] = {...updated[i], amount: e.target.value};
                                                        setPrizeDistribution(updated);
                                                    }}
                                                    placeholder="e.g. ₹10,000"
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Type</label>
                                                <select
                                                    value={prize.type || ''}
                                                    onChange={(e) => {
                                                        const updated = [...prizeDistribution];
                                                        updated[i] = {...updated[i], type: e.target.value};
                                                        setPrizeDistribution(updated);
                                                    }}
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium appearance-none"
                                                >
                                                    <option value="">Auto-detect</option>
                                                    <option value="trophy">🏆 Trophy</option>
                                                    <option value="cash">💰 Cash Prize</option>
                                                    <option value="placement">💼 Placement / PPO</option>
                                                    <option value="internship">📋 Internship</option>
                                                    <option value="certificate">📜 Certificate</option>
                                                    <option value="swag">🎁 Swag</option>
                                                    <option value="mentorship">🤝 Mentorship</option>
                                                    <option value="merch">👕 Merch</option>
                                                    <option value="gift">🎀 Gift</option>
                                                    <option value="recognition">🏅 Recognition</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Badge Text</label>
                                                <input
                                                    type="text"
                                                    value={prize.badge_text || prize.badge || ''}
                                                    onChange={(e) => {
                                                        const updated = [...prizeDistribution];
                                                        updated[i] = {...updated[i], badge_text: e.target.value};
                                                        setPrizeDistribution(updated);
                                                    }}
                                                    placeholder="e.g. Certificate"
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Icon URL (optional)</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={prize.icon_url || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val && val.startsWith('data:')) return;
                                                            const updated = [...prizeDistribution];
                                                            updated[i] = {...updated[i], icon_url: val};
                                                            setPrizeDistribution(updated);
                                                        }}
                                                        placeholder="https://example.com/icon.png"
                                                        className={`flex-1 px-3 py-2.5 bg-slate-50 border ${(prize.icon_url || '').startsWith('data:') ? 'border-red-400 bg-red-50' : 'border-slate-100'} rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium`}
                                                    />
                                                    {(prize.icon_url || '').startsWith('data:') && <p className="text-[10px] text-red-500 font-bold mt-1">Only https:// URLs allowed</p>}
                                                    {prize.icon_url && (
                                                        <div className="w-9 h-9 shrink-0 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                                                            <img src={prize.icon_url} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description (optional)</label>
                                                <input
                                                    type="text"
                                                    value={prize.description || ''}
                                                    onChange={(e) => {
                                                        const updated = [...prizeDistribution];
                                                        updated[i] = {...updated[i], description: e.target.value};
                                                        setPrizeDistribution(updated);
                                                    }}
                                                    placeholder="Brief description"
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'faqs':
                return (
                    <><div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
                                <p className="text-sm font-medium text-slate-500 mt-1">Manage FAQs displayed on the event page.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const updated = [...(event?.faqs || []), { question: '', answer: '', category: 'General', order: (event?.faqs || []).length }];
                                        setEvent({ ...event, faqs: updated });
                                    }}
                                    className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#6C3BFF] transition-all"
                                >
                                    <Plus size={14} />
                                    Add FAQ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowFaqBulkImport(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-white border border-dashed border-slate-300 rounded-xl text-[11px] font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-all"
                                >
                                    <UploadCloud size={14} />
                                    Bulk Import
                                </button>
                                {(event?.faqs || []).length > 0 && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/professional`, {
                                                    method: 'PATCH',
                                                    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ faqs: event.faqs }),
                                                });
                                                if (!res.ok) throw new Error('Failed to save');
                                                alert('FAQs saved successfully!');
                                                setRefreshCounter(prev => prev + 1);
                                            } catch (e: any) {
                                                alert(e?.message || 'Failed to save FAQs');
                                            }
                                        }}
                                        className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                                    >
                                        <Save size={14} />
                                        Save FAQs
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* FAQ Search */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={faqSearch}
                                onChange={e => setFaqSearch(e.target.value)}
                                placeholder="Search FAQs..."
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-400 transition-colors"
                            />
                        </div>

                        {(event?.faqs || []).length === 0 ? (
                            <div className="p-16 bg-white border border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-sm">
                                <div className="w-16 h-16 bg-purple-50 text-purple-400 rounded-[1.25rem] flex items-center justify-center mb-6">
                                    <HelpCircle size={32} strokeWidth={1.5} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900">No FAQs configured yet</h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-md font-medium">Add frequently asked questions with answers that will be displayed on the public event page.</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const updated = [...(event?.faqs || []), { question: '', answer: '', category: 'General', order: (event?.faqs || []).length }];
                                        setEvent({ ...event, faqs: updated });
                                    }}
                                    className="mt-6 flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#6C3BFF] transition-all"
                                >
                                    <Plus size={14} />
                                    Add First FAQ
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(event?.faqs || [])
                                    .filter((faq: any) => !faqSearch || faq.question?.toLowerCase().includes(faqSearch.toLowerCase()) || faq.answer?.toLowerCase().includes(faqSearch.toLowerCase()))
                                    .map((faq: any, i: number) => (
                                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 text-[11px] font-black">
                                                    Q
                                                </div>
                                                <span className="text-sm font-bold text-slate-800 truncate max-w-md">{faq.question || `FAQ ${i + 1}`}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = (event?.faqs || []).filter((_: any, j: number) => j !== i);
                                                    setEvent({ ...event, faqs: updated });
                                                }}
                                                className="p-2 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Question</label>
                                                <input
                                                    type="text"
                                                    value={faq.question || ''}
                                                    onChange={e => {
                                                        const updated = [...(event?.faqs || [])];
                                                        updated[i] = { ...updated[i], question: e.target.value };
                                                        setEvent({ ...event, faqs: updated });
                                                    }}
                                                    placeholder="What is the question?"
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Answer</label>
                                                <textarea
                                                    value={faq.answer || ''}
                                                    onChange={e => {
                                                        const updated = [...(event?.faqs || [])];
                                                        updated[i] = { ...updated[i], answer: e.target.value };
                                                        setEvent({ ...event, faqs: updated });
                                                    }}
                                                    placeholder="Provide a detailed answer..."
                                                    rows={3}
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-400 resize-y"
                                                />
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                                                    <select
                                                        value={faq.category || 'General'}
                                                        onChange={e => {
                                                            const updated = [...(event?.faqs || [])];
                                                            updated[i] = { ...updated[i], category: e.target.value };
                                                            setEvent({ ...event, faqs: updated });
                                                        }}
                                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-400 bg-white"
                                                    >
                                                        <option value="General">📋 General</option>
                                                        <option value="Registration">📝 Registration</option>
                                                        <option value="Eligibility">✅ Eligibility</option>
                                                        <option value="Participation">👥 Participation</option>
                                                        <option value="Submission">📤 Submission</option>
                                                        <option value="Technical">💻 Technical</option>
                                                        <option value="Evaluation">📊 Evaluation</option>
                                                        <option value="Prizes">🏆 Prizes</option>
                                                        <option value="Certificates">📜 Certificates</option>
                                                        <option value="Mentorship">🤝 Mentorship</option>
                                                        <option value="Results">🏁 Results</option>
                                                        <option value="Timeline">📅 Timeline</option>
                                                        <option value="Rules">⚖️ Rules</option>
                                                        <option value="Support">🆘 Support</option>
                                                        <option value="Opportunities">🚀 Opportunities</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Order</label>
                                                    <input
                                                        type="number"
                                                        value={faq.order ?? i}
                                                        onChange={e => {
                                                            const updated = [...(event?.faqs || [])];
                                                            updated[i] = { ...updated[i], order: parseInt(e.target.value) || 0 };
                                                            setEvent({ ...event, faqs: updated });
                                                        }}
                                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Featured</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(event?.faqs || [])];
                                                            updated[i] = { ...updated[i], is_featured: !(faq.is_featured ?? faq.featured) };
                                                            setEvent({ ...event, faqs: updated });
                                                        }}
                                                        className={`w-full px-3 py-2.5 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-2 ${
                                                            (faq.is_featured ?? faq.featured) ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {(faq.is_featured ?? faq.featured) ? '📌 Pinned' : 'Pin'}
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">🔓 Auto-Pin</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(event?.faqs || [])];
                                                            updated[i] = { ...updated[i], auto_pin_enabled: !(faq.auto_pin_enabled ?? true) };
                                                            setEvent({ ...event, faqs: updated });
                                                        }}
                                                        className={`w-full px-3 py-2.5 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-2 ${
                                                            (faq.auto_pin_enabled ?? true) ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {(faq.auto_pin_enabled ?? true) ? 'Auto' : 'Manual'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Priority Score</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={faq.priority_score ?? ''}
                                                        onChange={e => {
                                                            const updated = [...(event?.faqs || [])];
                                                            updated[i] = { ...updated[i], priority_score: parseInt(e.target.value) || 0 };
                                                            setEvent({ ...event, faqs: updated });
                                                        }}
                                                        placeholder="Auto-computed"
                                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">👍 Helpful Count</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={faq.helpful_count ?? ''}
                                                        onChange={e => {
                                                            const updated = [...(event?.faqs || [])];
                                                            updated[i] = { ...updated[i], helpful_count: parseInt(e.target.value) || 0 };
                                                            setEvent({ ...event, faqs: updated });
                                                        }}
                                                        placeholder="0"
                                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">👁️ Views</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={faq.views ?? ''}
                                                        onChange={e => {
                                                            const updated = [...(event?.faqs || [])];
                                                            updated[i] = { ...updated[i], views: parseInt(e.target.value) || 0 };
                                                            setEvent({ ...event, faqs: updated });
                                                        }}
                                                        placeholder="0"
                                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {showFaqBulkImport && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFaqBulkImport(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">Bulk Import FAQs</h3>
                                        <p className="text-sm text-slate-500 font-medium mt-1">Paste text or upload a PDF. One Q&A per entry.</p>
                                    </div>
                                    <button onClick={() => setShowFaqBulkImport(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={18} /></button>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 text-[11px] font-mono text-slate-500 border border-slate-100 leading-relaxed">
                                    Q: What is the eligibility?<br />
                                    A: All students can participate.<br />
                                    Category: General<br />
                                    Order: 1<br />
                                    <br />
                                    Q: What is the team size?<br />
                                    A: 1-5 members per team.<br />
                                    Category: Registration<br />
                                    Order: 2
                                </div>

                                {/* Tab: Paste or Upload */}
                                <div className="flex items-center gap-3 pb-2">
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-[11px] font-bold transition-all ${faqBulkImportText && !faqBulkImportLoading ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-white'}`}>
                                        <Upload size={14} />
                                        Upload PDF
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="hidden"
                                            disabled={faqBulkImportLoading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setFaqBulkImportLoading(true);
                                                try {
                                                    const buf = await file.arrayBuffer();
                                                    const pdf = await getDocument(buf).promise;
                                                    let text = '';
                                                    for (let i = 1; i <= pdf.numPages; i++) {
                                                        const page = await pdf.getPage(i);
                                                        const content = await page.getTextContent();
                                                        text += content.items.map((item: any) => item.str).join(' ') + '\n';
                                                    }
                                                    setFaqBulkImportText(text);
                                                } catch {
                                                    alert('Failed to read PDF. Make sure it contains selectable text.');
                                                }
                                                setFaqBulkImportLoading(false);
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                    {faqBulkImportLoading && <span className="text-xs text-slate-400 font-medium animate-pulse">Reading PDF...</span>}
                                    {!faqBulkImportLoading && faqBulkImportText && (
                                        <button onClick={() => setFaqBulkImportText('')} className="text-[11px] text-red-500 font-bold hover:underline">Clear</button>
                                    )}
                                </div>

                                <textarea
                                    value={faqBulkImportText}
                                    onChange={e => setFaqBulkImportText(e.target.value)}
                                    rows={12}
                                    placeholder="Paste your FAQs here, or upload a PDF above..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium resize-none focus:bg-white focus:border-emerald-300 transition-all"
                                />
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowFaqBulkImport(false); setFaqBulkImportText(''); }}
                                        className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-full transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const AUTO_PIN_KEYWORDS = ['registration', 'last date', 'deadline', 'apply before', 'eligible', 'who can participate', 'allowed', 'criteria', 'team size', 'individual', 'team participation', 'cross-college', 'fee', 'paid', 'free', 'registration cost', 'certificate', 'participation certificate', 'winner certificate', 'online', 'offline', 'hybrid', 'location', 'prize', 'reward', 'cash', 'winning amount', 'submission', 'final submit', 'upload deadline', 'evaluation', 'judging', 'scoring', 'plagiarism', 'cheating', 'disqualification', 'rules', 'internship', 'PPO', 'placement', 'hiring', 'support', 'contact', 'help', 'issue'];
                                            const MAX_AUTO_PIN = 8;
                                            const analyzeFaq = (q: string, a: string) => {
                                                const text = (q + ' ' + a).toLowerCase();
                                                const score = AUTO_PIN_KEYWORDS.reduce((s, kw) => text.includes(kw) ? s + 10 : s, 0);
                                                return { priority_score: score };
                                            };

                                            const text = faqBulkImportText.trim();
                                            const parsed: any[] = [];

                                            // Try FAQ N  Question  ...  Answer  ...  Category  ...  Order  ... format
                                            const hasFaqFormat = /\bFAQ\s+\d+/i.test(text);
                                            if (hasFaqFormat) {
                                                const entries = text.split(/\bFAQ\s+\d+\s*/i).filter(Boolean);
                                                for (const entry of entries) {
                                                    const norm = entry.replace(/\s+/g, ' ').trim();
                                                    const qMatch = norm.match(/\bQuestion\s+(.+?)(?=\s+Answer\s|\s+Category\s|\s+Order\s|$)/i);
                                                    const aMatch = norm.match(/\bAnswer\s+(.+?)(?=\s+Category\s|\s+Order\s|$)/i);
                                                    const cMatch = norm.match(/\bCategory\s+(.+?)(?=\s+Order\s|$)/i);
                                                    const oMatch = norm.match(/\bOrder\s+(\d+)/i);
                                                    if (qMatch || aMatch) {
                                                        const question = qMatch ? qMatch[1].trim() : '';
                                                        const answer = aMatch ? aMatch[1].trim() : '';
                                                        parsed.push({
                                                            question,
                                                            answer,
                                                            category: cMatch ? cMatch[1].trim().replace(/^FAQ\s+\d+\s*/i, '') : 'General',
                                                            order: oMatch ? parseInt(oMatch[1], 10) || 0 : 0,
                                                            ...analyzeFaq(question, answer),
                                                        });
                                                    }
                                                }
                                            } else {
                                                // Per-line format: Q:/Question:/A:/Answer:/Category:/Order:
                                                const lines = text.split('\n');
                                                let current: any = {};
                                                for (const line of lines) {
                                                    const trimmed = line.trim();
                                                    if (!trimmed) {
                                                        if (current.question || current.answer) {
                                                            parsed.push({ category: 'General', order: (event?.faqs || []).length + parsed.length, ...current, ...analyzeFaq(current.question || '', current.answer || '') });
                                                            current = {};
                                                        }
                                                        continue;
                                                    }
                                                    if (trimmed.toUpperCase().startsWith('Q:') || trimmed.toUpperCase().startsWith('QUESTION:')) {
                                                        if (current.question || current.answer) {
                                                            parsed.push({ category: 'General', order: (event?.faqs || []).length + parsed.length, ...current, ...analyzeFaq(current.question || '', current.answer || '') });
                                                            current = {};
                                                        }
                                                        current.question = trimmed.replace(/^(Q:|Question:)\s*/i, '').trim();
                                                    } else if (trimmed.toUpperCase().startsWith('A:') || trimmed.toUpperCase().startsWith('ANSWER:')) {
                                                        current.answer = trimmed.replace(/^(A:|Answer:)\s*/i, '').trim();
                                                    } else if (trimmed.toUpperCase().startsWith('CATEGORY:')) {
                                                        current.category = trimmed.slice(9).trim();
                                                    } else if (trimmed.toUpperCase().startsWith('ORDER:')) {
                                                        current.order = parseInt(trimmed.slice(6).trim()) || 0;
                                                    }
                                                }
                                                if (current.question || current.answer) {
                                                    parsed.push({ category: 'General', order: (event?.faqs || []).length + parsed.length, ...current, ...analyzeFaq(current.question || '', current.answer || '') });
                                                }
                                            }
                                            // Pin top N by priority score
                                            const scored = parsed.map((f: any) => ({ ...f }));
                                            scored.sort((a: any, b: any) => (b.priority_score || 0) - (a.priority_score || 0));
                                            scored.forEach((f: any, idx: number) => {
                                                f.is_featured = idx < MAX_AUTO_PIN && (f.priority_score || 0) > 0;
                                                f.auto_pin_enabled = f.is_featured;
                                            });
                                            if (scored.length > 0) {
                                                setEvent(prev => ({ ...prev, faqs: [...(prev?.faqs || []), ...scored] }));
                                            }
                                            setFaqBulkImportText('');
                                            setShowFaqBulkImport(false);
                                        }}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-bold hover:bg-emerald-600 transition-all"
                                    >
                                        <UploadCloud size={14} />
                                        Import ({(() => { const t = faqBulkImportText.trim(); if (/\bFAQ\s+\d+/i.test(t)) { return (t.match(/\bFAQ\s+\d+/gi) || []).length; } return t.split('\n').filter(l => { const u = l.trim().toUpperCase(); return u.startsWith('Q:') || u.startsWith('QUESTION:'); }).length; })()} FAQs)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
                );

            case 'leaderboard':
                return <LeaderboardPage eventId={eventId} refreshCounter={refreshCounter} />;
            case 'pipeline':
                return <PipelineView eventId={eventId} stages={stages} />;
            case 'package':
            case 'problems':
                return <HackathonEventPackage institutionId={institutionIdProp} eventId={eventId} />;
            case 'email-templates':
                return <EmailTemplatesManager eventId={eventId} institutionId={institutionIdProp || ''} />;
            default:
                return <div className="py-32 text-center text-slate-300 font-black text-xs uppercase tracking-[0.3em] opacity-40">Section Initializing...</div>;
        }
    };

    return (
        <div className="space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    {role !== 'judge' && (
                        <button onClick={onBack} className="p-4 bg-white border border-slate-100 rounded-3xl text-slate-400 hover:text-[#6C3BFF] hover:shadow-xl transition-all active:scale-95">
                            <ArrowLeft size={28} />
                        </button>
                    )}
                    <div>
                         <div className="flex items-center gap-3 mb-1">
                             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{event.title}</h1>
                             <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">Live Portal</div>
                         </div>
                         <p className="text-slate-500 text-sm font-bold flex items-center gap-6"><span className="flex items-center gap-2 text-[#6C3BFF]"><MapPin size={16} /> Hybrid Environment</span><span className="flex items-center gap-2"><Users size={16} /> {event.participant_count || 0} Authenticated Participants</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {role !== 'judge' && (
                        <button 
                            onClick={handleSaveEvent} 
                            disabled={saving} 
                            className={`px-10 py-5 ${showSaveSuccess ? 'bg-emerald-500' : hasUnsavedChanges ? 'bg-[#6C3BFF] animate-pulse' : 'bg-slate-900'} text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest hover:scale-[1.05] active:scale-95 transition-all shadow-2xl shadow-black/10 flex items-center gap-3 relative`}
                        >
                            {hasUnsavedChanges && !saving && !showSaveSuccess && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[8px] border-2 border-white animate-bounce shadow-lg">!</div>
                            )}
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : showSaveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
                            {saving ? 'Syncing...' : showSaveSuccess ? 'Saved' : hasUnsavedChanges ? 'Sync Changes' : 'All Changes Saved'}
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Action Bar */}
            <FramerAnimatePresence>
                {selectedSubmissions.length > 0 && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-6"
                    >
                        <div className="bg-slate-900 text-white rounded-[2.5rem] p-4 shadow-2xl flex items-center justify-between gap-6 border border-white/10 backdrop-blur-xl bg-opacity-95">
                            <div className="flex items-center gap-6 pl-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selection Active</span>
                                    <span className="text-xl font-black">{selectedSubmissions.length} <span className="text-slate-500">Teams Selected</span></span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 pr-2">
                                <button 
                                    onClick={() => handleOpenJudgeAssignment('bulk')}
                                    className="px-8 py-4 bg-[#6C3BFF] hover:bg-[#5a2ee6] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg shadow-purple-500/20"
                                >
                                    <Gavel size={16} />
                                    Assign Judge to Group
                                </button>
                                <button 
                                    onClick={() => setSelectedSubmissions([])}
                                    className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </FramerAnimatePresence>

            {!hackathonPackageEnabled && role !== 'judge' && (
                <div className="p-4 rounded-[2.5rem] bg-amber-50 border border-amber-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Lightbulb size={18} className="text-amber-600 shrink-0" />
                        <p className="text-sm font-bold text-amber-800">Enable the <span className="underline decoration-amber-400">Hackathon Event Package</span> in Settings → Plans &amp; Subscription to unlock Problem Statements, Team Selections, and Participant Portal features.</p>
                    </div>
                    <button onClick={() => navigate('/institution-dashboard/settings?section=plan')} className="shrink-0 px-5 py-3 rounded-full bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all">
                        Enable
                    </button>
                </div>
            )}

            {role !== 'judge' && (
                <div className="flex items-center gap-1.5 bg-slate-100/40 p-2 rounded-[2.5rem] overflow-x-auto no-scrollbar shadow-inner backdrop-blur-md">
                    {tabs.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-[#6C3BFF] shadow-2xl shadow-purple-200' : 'text-slate-400 hover:text-slate-600'}`}>
                            <tab.icon size={20} className={activeTab === tab.id ? 'text-[#6C3BFF]' : 'text-slate-300'} /> {tab.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="bg-white/40 backdrop-blur-xl border border-white/20 p-2.5 rounded-[4rem] shadow-2xl shadow-slate-200/50">
                <div className="bg-white p-12 rounded-[3.5rem] shadow-inner min-h-[600px] border border-slate-50">
                                        <FramerAnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderTabContent()}
                        </motion.div>
                    </FramerAnimatePresence>
                </div>
            </div>

            <QuizDesignerModal 
                isOpen={isQuizModalOpen} 
                onClose={() => setIsQuizModalOpen(false)} 
                onSave={handleCreateQuiz}
                loading={isCreatingQuiz}
                initialQuizData={
                    quizStageId 
                        ? quizzes.find((q) => String(q._id || q.id) === String(stages.find((s) => s.id === quizStageId)?.config?.quiz_id))
                        : null
                }
            />

            <AssessmentReviewModal
                isOpen={!!reviewQuiz}
                onClose={() => setReviewQuiz(null)}
                eventId={eventId || ''}
                quizId={reviewQuiz?.quizId || ''}
                quizTitle={reviewQuiz?.quizTitle || ''}
                stageName={reviewQuiz?.stageName || ''}
            />

            {/* Asset Preview Modal */}
            <FramerAnimatePresence>
                {previewAsset && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">{previewAsset.filename}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Institutional Asset Intelligence Protocol • Secure Preview</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <a 
                                        href={previewAsset.url} 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6C3BFF] hover:text-white transition-all"
                                    >
                                        <ExternalLink size={14} /> Open Original
                                    </a>
                                    <a 
                                        href={previewAsset.url} 
                                        download 
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-xl transition-all"
                                    >
                                        <Download size={14} /> Download
                                    </a>
                                    <button 
                                        onClick={() => setPreviewAsset(null)}
                                        className="p-4 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-100 p-8 relative">
                                <div className="w-full h-full rounded-[2rem] overflow-hidden shadow-2xl bg-white relative">
                                    {/* File Preview by type */}
                                    {previewAsset.filename.toLowerCase().match(/\.(pdf)$/) ? (
                                        <iframe 
                                            src={previewAsset.url}
                                            className="w-full h-full border-none"
                                            title="PDF Preview"
                                        />
                                    ) : previewAsset.filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/) ? (
                                        <img 
                                            src={previewAsset.url}
                                            className="w-full h-full object-contain"
                                            alt={previewAsset.filename}
                                        />
                                    ) : previewAsset.filename.toLowerCase().match(/\.(mp4|webm|mov)$/) ? (
                                        <video 
                                            src={previewAsset.url}
                                            controls
                                            className="w-full h-full"
                                        />
                                    ) : previewAsset.filename.toLowerCase().match(/\.(pptx|ppt|docx|doc|xlsx|xls)$/) ? (
                                        <div className="w-full h-full flex flex-col bg-slate-50 relative">
                                            <div className="absolute inset-0 flex items-center justify-center -z-0">
                                                <div className="w-12 h-12 border-4 border-slate-200 border-t-[#6C3BFF] rounded-full animate-spin"></div>
                                            </div>
                                            <iframe 
                                                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewAsset.url)}&embedded=true`}
                                                className="flex-1 w-full border-none bg-white relative z-10"
                                                title="Office Preview"
                                            />
                                            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 font-black text-xs">PPT</div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Intelligence Protocol Active</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <a 
                                                        href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewAsset.url)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                                                    >
                                                        Alternative Viewer (MS Office)
                                                    </a>
                                                </div>
                                            </div>
                                            {/* Localhost / Offline Fallback */}
                                            {previewAsset.url.includes('localhost') && (
                                                <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex items-center justify-center p-12 text-center">
                                                    <div className="max-w-md space-y-6">
                                                        <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-inner">🚧</div>
                                                        <div className="space-y-2">
                                                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Localhost Preview Blocked</h4>
                                                            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                                                Cloud viewers (Google/Microsoft) cannot access files stored on your local machine (localhost).
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col gap-3">
                                                            <a 
                                                                href={previewAsset.url} 
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-full py-4 bg-[#6C3BFF] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-purple-500/20"
                                                            >
                                                                Open File Directly
                                                            </a>
                                                            <a 
                                                                href={previewAsset.url} 
                                                                download
                                                                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest"
                                                            >
                                                                Download & View
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
                                            <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-5xl">📎</div>
                                            <div className="text-center space-y-2">
                                                <p className="text-xl font-black text-slate-900">{previewAsset.filename}</p>
                                                <p className="text-sm text-slate-500 font-medium">Preview not available for this file type</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <a 
                                                    href={previewAsset.url} 
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg"
                                                >
                                                    <ExternalLink size={18} /> Open File
                                                </a>
                                                <a 
                                                    href={previewAsset.url} 
                                                    download 
                                                    className="flex items-center gap-2 px-8 py-4 bg-slate-100 text-slate-700 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                >
                                                    <Download size={18} /> Download
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </FramerAnimatePresence>
            
            {/* Judge Assignment Modal */}
            {judgeAssignmentModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]">
                    <div className="bg-white rounded-[3rem] p-10 max-w-md w-full mx-4 shadow-2xl border border-slate-100">
                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                {judgeAssignmentModal.submissionId === 'bulk' ? 'Bulk Assignment' : 'Assign Judge'}
                            </h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {judgeAssignmentModal.submissionId === 'bulk' ? `Assigning to ${selectedSubmissions.length} projects` : 'Single Project Evaluation'}
                            </p>
                        </div>
                        <div className="space-y-4 max-h-64 overflow-y-auto">
                            {availableJudges.length > 0 ? (
                                availableJudges.map((judge: any) => (
                                    <div key={judge._id} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{judge.name || 'Unknown Judge'}</h4>
                                                <p className="text-sm text-slate-600">{judge.email}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleAssignJudge(judge._id, judge.email)}
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                                                >
                                                    Assign
                                                </button>
                                                {judgeAssignmentModal.submissionId !== 'bulk' && (
                                                    <button 
                                                        onClick={() => copyToClipboard(`${window.location.origin}/evaluate/${judgeAssignmentModal.submissionId}`)}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                                        title="Copy Evaluation Link"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <UserPlus size={24} />
                                    </div>
                                    <p className="text-slate-600 font-bold">No judges available</p>
                                    <p className="text-xs text-slate-400 mt-2 max-w-[200px] mx-auto">Invite professional evaluators to review this submission.</p>
                                    <button 
                                        onClick={() => setIsJudgeInviteOpen(true)}
                                        className="mt-6 px-6 py-3 bg-[#6C3BFF] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-purple-500/20"
                                    >
                                        Invite New Judge
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button 
                                onClick={() => setIsJudgeInviteOpen(true)}
                                className="flex-1 py-3 border border-slate-100 text-[#6C3BFF] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                                Add Another
                            </button>
                            <button 
                                onClick={() => setJudgeAssignmentModal({ isOpen: false, submissionId: null })}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <JudgeInviteModal 
                isOpen={isJudgeInviteOpen}
                onClose={() => setIsJudgeInviteOpen(false)}
                onInvite={handleInviteJudge}
                loading={isInvitingJudge}
            />

            {/* Bulk Notification Modal */}
            <FramerAnimatePresence>
                {isBulkNotifyModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Bulk Communication Hub</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Targeted: Shortlisted Members • Elite Protocol</p>
                                </div>
                                <button 
                                    onClick={() => setIsBulkNotifyModalOpen(false)}
                                    className="p-4 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                                {/* Template selector */}
                                {bulkNotifyTemplates.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Template</label>
                                        <select
                                            value={bulkNotifySelectedTemplate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setBulkNotifySelectedTemplate(val);
                                                if (val !== 'default') {
                                                    const t = bulkNotifyTemplates.find((tm: any) => tm._id === val);
                                                    if (t) {
                                                        setBulkNotifySubject(t.subject);
                                                        setBulkNotifyMessage(t.body_html);
                                                    }
                                                }
                                            }}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all outline-none"
                                        >
                                            <option value="default">Default Template (System)</option>
                                            {bulkNotifyTemplates.map((t: any) => (
                                                <option key={t._id} value={t._id}>
                                                    {t.name}{t.is_active ? ' (Active)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Subject</label>
                                    <input 
                                        value={bulkNotifySubject}
                                        onChange={(e) => setBulkNotifySubject(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all outline-none"
                                        placeholder="Enter email subject..."
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex justify-between">
                                        <span>Message Content</span>
                                        <span className="text-[#6C3BFF]">Personalization Active</span>
                                    </label>
                                    <textarea 
                                        value={bulkNotifyMessage}
                                        onChange={(e) => setBulkNotifyMessage(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all h-64 resize-none outline-none font-mono text-xs"
                                        placeholder="Compose your custom message..."
                                    />
                                                    <div className="flex flex-wrap gap-2 px-2">
                                                        {['{team_name}', '{event_name}', '{stage_name}', '{participant_name}'].map(tag => (
                                                            <button 
                                                                key={tag}
                                                                onClick={() => setBulkNotifyMessage(prev => prev + ' ' + tag)}
                                                                className="px-3 py-1.5 bg-purple-50 text-[#6C3BFF] rounded-lg text-[10px] font-black tracking-wider border border-purple-100 hover:bg-purple-600 hover:text-white transition-all"
                                                            >
                                                                + {tag}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Email Preview Toggle */}
                                                <div className="flex items-center gap-3 px-2">
                                                    <button
                                                        onClick={() => setShowBulkPreview(!showBulkPreview)}
                                                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                                            showBulkPreview ? 'bg-[#6C3BFF] text-white' : 'bg-slate-100 text-slate-600'
                                                        }`}
                                                    >
                                                        {showBulkPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        {showBulkPreview ? 'Hide Preview' : 'Preview Email'}
                                                    </button>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        Placeholders shown with sample data
                                                    </span>
                                                </div>

                                                {/* Live Preview */}
                                                {showBulkPreview && (
                                                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                                                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                                                            <Mail size={16} className="text-slate-400" />
                                                            <span className="text-xs font-bold text-slate-600">
                                                                To: <span className="text-slate-400">[recipient email]</span>
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-500 ml-auto">
                                                                Subject:{' '}
                                                                <span className="text-slate-900">
                                                                    {bulkNotifySubject
                                                                        .replace(/\{team_name\}/g, '[Team Name]')
                                                                        .replace(/\{event_name\}/g, event?.title || '[Event Name]')
                                                                        .replace(/\{stage_name\}/g, bulkNotifyNextStage || '[Stage Name]')
                                                                        .replace(/\{participant_name\}/g, '[Participant Name]')
                                                                        .replace(/\{custom_message\}/g, '[Custom Message]')
                                                                    }
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <div
                                                            className="p-6 max-h-[400px] overflow-y-auto"
                                                            dangerouslySetInnerHTML={{
                                                                __html: bulkNotifyMessage
                                                                    .replace(/\{team_name\}/g, '[Team Name]')
                                                                    .replace(/\{event_name\}/g, event?.title || '[Event Name]')
                                                                    .replace(/\{stage_name\}/g, bulkNotifyNextStage || '[Stage Name]')
                                                                    .replace(/\{participant_name\}/g, '[Participant Name]')
                                                                    .replace(/\{custom_message\}/g, '[Custom Message]')
                                                                    .replace(/\{deadline\}/g, '[Deadline Date]')
                                                                    .replace(/\{new_deadline\}/g, '[Extended Deadline]')
                                                                    .replace(/\{score\}/g, '[Score]')
                                                                    .replace(/\{frontend_url\}/g, '[App URL]')
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Score threshold */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                        Minimum Score Filter <span className="text-slate-300 font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={bulkNotifyMinScore}
                                        onChange={(e) => setBulkNotifyMinScore(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all outline-none"
                                        placeholder="e.g. 80 — only send to teams with score >= this value"
                                    />
                                </div>

                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                            <Zap size={20} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Professional Dispatch Protocol</p>
                                            <p className="text-[10px] font-bold text-slate-400 leading-relaxed mt-1">
                                                This message will be wrapped in the selected template automatically.
                                                The round will be set to: <strong className="text-[#6C3BFF]">{bulkNotifyNextStage}</strong>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between">
                                <button 
                                    onClick={() => setIsBulkNotifyModalOpen(false)}
                                    className="px-8 py-4 text-sm font-black text-slate-400 hover:text-slate-600 transition-all"
                                >
                                    Discard Draft
                                </button>
                                <button 
                                    onClick={confirmBulkDispatch}
                                    disabled={notifying}
                                    className="px-10 py-4 bg-[#6C3BFF] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 hover:shadow-2xl hover:shadow-purple-200 transition-all shadow-xl shadow-purple-600/10 flex items-center gap-3"
                                >
                                    {notifying ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Send size={18} />
                                    )}
                                    {notifying ? 'Dispatching...' : 'Dispatch Notifications'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </FramerAnimatePresence>
        {/* Hackathon Evaluation Modal */}
        <FramerAnimatePresence>
            {evaluatingSubmission && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
                >
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
                    >
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Evaluate: {evaluatingSubmission.teamName}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Submission Analysis Protocol</p>
                            </div>
                            <button 
                                onClick={() => setEvaluatingSubmission(null)}
                                className="p-4 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Submission Details</h4>
                                <div className="text-sm font-medium text-slate-600 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    {(() => {
                                        const subData = evaluatingSubmission.data || {};
                                        const desc = evaluatingSubmission.solution || subData.description || subData.problem_statement || '';
                                        const fileField = Object.keys(subData).find(k => typeof subData[k] === 'string' && subData[k].startsWith('data:'));
                                        const urlField = Object.keys(subData).find(k => typeof subData[k] === 'string' && (subData[k].startsWith('http://') || subData[k].startsWith('https://')));
                                        return (
                                            <>
                                                {desc ? <p className="whitespace-pre-wrap mb-4">{desc}</p> : <p className="text-slate-400 italic">No description provided</p>}
                                                {(fileField || urlField) && (
                                                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-200">
                                                        {fileField && (
                                                            <button onClick={() => {
                                                                const raw = subData[fileField];
                                                                const mime = raw.startsWith('data:') ? raw.split(';')[0].split(':')[1] : '';
                                                                const ext = mime.includes('pdf') ? '.pdf' : mime.includes('presentation') ? '.pptx' : mime.includes('image') ? '.png' : '.file';
                                                                setPreviewAsset({ url: raw, filename: 'Asset' + ext });
                                                            }}
                                                                className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-200 hover:bg-amber-100 cursor-pointer">
                                                                <FileText size={12} className="inline mr-1.5" /> View File
                                                            </button>
                                                        )}
                                                        {urlField && (
                                                            <a href={subData[urlField].startsWith('http') ? subData[urlField] : `${API_BASE_URL}${subData[urlField]}`}
                                                                target="_blank" rel="noreferrer"
                                                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all">
                                                                <ExternalLink size={12} className="inline mr-1.5" /> Open Link
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scoring Rubric</h4>
                                {criteria.length > 0 ? (
                                    criteria.map((c: any) => (
                                        <div key={c._id || c.name} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black text-slate-800">{c.name}</span>
                                                <span className="text-sm font-black text-purple-600">{evaluationScores[c.name] || 0} / {c.max_points}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max={c.max_points}
                                                value={evaluationScores[c.name] || 0}
                                                onChange={(e) => setEvaluationScores({...evaluationScores, [c.name]: parseInt(e.target.value)})}
                                                className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-purple-600"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                                        <p className="text-xs font-bold text-amber-700">No scoring rubrics defined. Please add criteria in the "Scoring Rubrics" tab first.</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Feedback & Comments</label>
                                <textarea 
                                    value={evaluationComment}
                                    onChange={(e) => setEvaluationComment(e.target.value)}
                                    placeholder="Share detailed feedback with the team..."
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all h-32 resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-4">
                            <button 
                                onClick={() => setEvaluatingSubmission(null)}
                                className="px-8 py-4 text-sm font-black text-slate-400 hover:text-slate-600"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleEvaluateSubmission}
                                className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-purple-600 transition-all shadow-xl shadow-black/10"
                            >
                                Submit Evaluation
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </FramerAnimatePresence>
        </div>
    );
};

export default EventDetails;
