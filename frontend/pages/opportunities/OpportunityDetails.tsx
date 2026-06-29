import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
    Calendar, 
    MapPin, 
    ChevronLeft, 
    ChevronRight,
    ChevronDown,
    ChevronUp,
    CheckCircle2, 
    Upload, 
    Send,
    Users,
    Clock,
    Building2,
    Loader2,
    ExternalLink,
    Home,
    CalendarPlus,
    Heart,
    Share2,
    Paperclip,
    Mail,
    Phone,
    XCircle,
    Video,
    Search,
    Star,
    CheckSquare,
    DollarSign,
    Trophy,
    Gift,
    Award,
    Briefcase,
    UserPlus,
    FileText,
    Gavel,
    Settings2,
    ShieldCheck,
    HelpCircle,
    AlertCircle,
    Copy,
    CalendarX,
} from 'lucide-react';
import { getStatusById, getStatusColor, getStatusLabel } from '../../utils/calendarStatuses';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import EventFAQ from '../../components/EventFAQ';
import SectionRenderer from '../../components/SectionRenderer';
import { useRegistrationState } from '../../utils/useRegistrationState';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { useAuth } from '../../AuthContext';
import SubmissionForm from '../../components/opportunities/SubmissionForm';
import StageSubmissionsPanel from '../../components/opportunities/StageSubmissionsPanel';
import AvatarImage from '../../components/AvatarImage';
import TeamManager from '../../components/opportunities/TeamManager';
import {
    formatOpportunityLocation,
    plainTextFromRichContent,
    richHtmlFromOpportunityField,
    sanitizePresentationHtml,
} from '../../utils/text';

// Define User type for the component
interface User {
  user_id?: string;
  full_name?: string;
  name?: string;
  email?: string;
}

type RegField = {
    id: string;
    label: string;
    type: string;
    required?: boolean;
    isFixed?: boolean;
    options?: string[];
    hint?: string;
};

function applicationDecisionCopy(status: string | undefined) {
    const s = (status || 'pending').toLowerCase();
    if (s === 'accepted' || s === 'shortlisted') {
        return {
            headline: 'Shortlisted',
            title: 'Shortlisted',
            sub: 'The host has shortlisted your application. Check your email and this page for next steps.',
            tone: 'text-emerald-200',
        };
    }
    if (s === 'rejected') {
        return {
            headline: 'Not selected',
            title: 'Not selected',
            sub: 'This opportunity will not move forward for you right now. Other listings are still open on Studlyf.',
            tone: 'text-red-200',
        };
    }
    return {
        headline: 'Already applied',
        title: 'Under review',
        sub: 'Your application is being reviewed. This page updates when the host changes your status.',
        tone: 'text-green-200/80',
    };
}

const getImageUrl = (url: string | undefined) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.includes('/uploads/')) {
        const path = url.substring(url.indexOf('/uploads/'));
        return `${API_BASE_URL}${path}`;
    }
    if (url.includes('uploads/')) {
        const path = url.substring(url.indexOf('uploads/'));
        return `${API_BASE_URL}/${path}`;
    }
    return url;
};

const OpportunityDetails: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab');
    const location = useLocation();
    
    const [opportunity, setOpportunity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isApplied, setIsApplied] = useState(false);
    const [timeLeftStr, setTimeLeftStr] = useState('');
    const [sidebarProfilePhoto, setSidebarProfilePhoto] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: user?.full_name || user?.name || '',
        email: user?.email || '',
        resume: null as File | null,
        interest: ''
    });
    const [regAnswers, setRegAnswers] = useState<Record<string, string>>({});
    const [uploadedFilenames, setUploadedFilenames] = useState<Record<string, string>>({});
    const [regFiles, setRegFiles] = useState<Record<string, File | null>>({});
    const [myApplication, setMyApplication] = useState<any>(null);
    const [related, setRelated] = useState<any[]>([]);
    const [favorited, setFavorited] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewForm, setReviewForm] = useState({ rating: 0, text: '' });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);
    const [reviewExpanded, setReviewExpanded] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [activeSection, setActiveSection] = useState<'details' | 'dates' | 'prizes' | 'reviews' | 'faq' | 'submissions' | 'leaderboard'>('details');
    const getFieldAllowedExtensions = (field: RegField) => {
        const textToCheck = `${field.label} ${field.hint || ''}`.toLowerCase();
        const hasPdf = textToCheck.includes('pdf');
        const hasPpt = textToCheck.includes('ppt') || textToCheck.includes('powerpoint') || textToCheck.includes('pptx');
        const hasDoc = textToCheck.includes('doc') || textToCheck.includes('docx') || textToCheck.includes('word');
        const hasZip = textToCheck.includes('zip') || textToCheck.includes('rar');
        const hasImage = textToCheck.includes('image') || textToCheck.includes('png') || textToCheck.includes('jpg') || textToCheck.includes('jpeg');

        const allowed: string[] = [];
        if (hasPdf) allowed.push('.pdf');
        if (hasPpt) {
            allowed.push('.ppt');
            allowed.push('.pptx');
        }
        if (hasDoc) {
            allowed.push('.doc');
            allowed.push('.docx');
        }
        if (hasZip) {
            allowed.push('.zip');
            allowed.push('.rar');
        }
        if (hasImage) {
            allowed.push('.png');
            allowed.push('.jpg');
            allowed.push('.jpeg');
        }

        if (allowed.length === 0) {
            return [];
        }
        return allowed;
    };


    const detailsRef = useRef<HTMLDivElement>(null);
    const datesRef = useRef<HTMLDivElement>(null);
    const prizesRef = useRef<HTMLDivElement>(null);
    const reviewsRef = useRef<HTMLDivElement>(null);
    const faqRef = useRef<HTMLDivElement>(null);
    const submissionsRef = useRef<HTMLDivElement>(null);
    const leaderboardRef = useRef<HTMLDivElement>(null);

    // Context derived from opportunity data — never type-based branching
    const [stats, setStats] = useState({ participants: 0, teams: 0, submissions: 0 });
    const [eventSubmissions, setEventSubmissions] = useState<any[]>([]);
    const [eventLeaderboard, setEventLeaderboard] = useState<any[]>([]);


    const [stageRegistrationFields, setStageRegistrationFields] = useState<any>(null);
    const [prefilledFields, setPrefilledFields] = useState<Record<string, any>>({});
    const [loadingFields, setLoadingFields] = useState(false);
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [showReferModal, setShowReferModal] = useState(false);
    const [userProfileData, setUserProfileData] = useState<any>(null);
    // Decoupled global profile onboarding states
    const [registrationStatus, setRegistrationStatus] = useState<string>('NOT_REGISTERED');
    const effectiveRegStatus = useMemo(() => {
        if (registrationStatus === 'APPROVED' || registrationStatus === 'REGISTERED') return 'APPROVED';
        if (myApplication && ['shortlisted', 'accepted', 'approved'].includes(String(myApplication.status).toLowerCase())) return 'APPROVED';
        return registrationStatus;
    }, [registrationStatus, myApplication]);

    const regCTA = useRegistrationState({
        isAuthenticated: !!user?.user_id,
        isRegistered: isApplied || effectiveRegStatus !== 'NOT_REGISTERED',
        deadline: opportunity?.deadline,
        externalLink: opportunity?.external_registration_link || opportunity?.externalRegistrationLink,
        isLoading: !opportunity,
    });

    const [formConfig, setFormConfig] = useState<any>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [teamAction, setTeamAction] = useState<'individual' | 'create' | 'join'>('individual');
    const [teamName, setTeamName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [teamInviteCodeResponse, setTeamInviteCodeResponse] = useState<string | null>(null);
    const eventId = String(opportunity?.event_link_id || opportunity?.event_id || id || '');

    const computeStageStatus = (stage: any) => {
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

        // Parse dates. If date string is just YYYY-MM-DD, treat as local midnight.
        const startRaw = stage?.startDate || stage?.start_date;
        const endRaw = stage?.endDate || stage?.end_date;
        const start = normalizeDate(startRaw, false);
        const end = normalizeDate(endRaw, true);

        if (start || end) {
            if (start && now < start) return 'upcoming';
            if (end && now > end) return 'completed';
            return 'active';
        }

        // Normalize any explicit status provided by backend to lowercase for consistent checks
        const explicit = String(stage?.status || '').trim().toLowerCase();
        if (explicit) return explicit;

        return 'active';
    };

    useEffect(() => {
        if (!id) return;
        // Fetch live stats
        fetch(`${API_BASE_URL}/api/hackathons/events/${id}/stats`)
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error("Stats fetch error:", err));

        // Fetch submissions
        fetch(`${API_BASE_URL}/api/hackathons/events/${id}/submissions`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setEventSubmissions(data); })
            .catch(err => console.error("Submissions fetch error:", err));

        // Fetch leaderboard
        const title = String(
            opportunity?.title ||
            opportunity?.name ||
            opportunity?.opportunity_title ||
            opportunity?.opportunityName ||
            ''
        );
        const loc = String(opportunity?.location || opportunity?.venue || '');
        const hideLeaderboard =
            /hyderabad/i.test(title) || /hyderabad/i.test(loc);

        if (!hideLeaderboard) {
            fetch(`${API_BASE_URL}/api/hackathons/events/${id}/leaderboard`)
                .then(res => res.json())
                .then(data => { if (Array.isArray(data)) setEventLeaderboard(data); })
                .catch(err => console.error("Leaderboard fetch error:", err));
        } else {
            setEventLeaderboard([]);
        }
    }, [id, opportunity?.title, opportunity?.name, opportunity?.location, opportunity?.venue, opportunity?.opportunity_title, opportunity?.opportunityName]);

    // Fetch user profile photo & gender for sidebar
    useEffect(() => {
        if (!user?.user_id) return;
        fetch(`${API_BASE_URL}/api/user/${user.user_id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setSidebarProfilePhoto(data.profilePhoto || null);
                    setUserProfileData(data);
                }
            })
            .catch(() => {});
    }, [user?.user_id]);

    // Real-time countdown timer effect

    useEffect(() => {
        if (!opportunity?.deadline) {
            setTimeLeftStr('');
            return;
        }
        const deadline = new Date(opportunity.deadline).getTime();
        
        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = deadline - now;
            
            if (distance < 0) {
                setTimeLeftStr('Registration Closed');
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            
            if (days > 1) {
                setTimeLeftStr(`${days} Days Left`);
            } else if (days === 1) {
                setTimeLeftStr('1 Day Left');
            } else if (hours > 0) {
                setTimeLeftStr(`${hours} Hours Left`);
            } else {
                setTimeLeftStr(`${minutes} Minutes Left`);
            }
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [opportunity?.deadline]);

    const FAV_KEY = 'studlyf_opp_favorites';

    useEffect(() => {
        if (!id) return;
        try {
            const raw = localStorage.getItem(FAV_KEY);
            const arr = raw ? (JSON.parse(raw) as string[]) : [];
            setFavorited(new Set(arr.map(String)).has(String(id)));
        } catch {
            setFavorited(false);
        }
    }, [id]);

    useEffect(() => {
        if (!opportunity?._id) return;
        const t = opportunity.type || 'General';
        fetch(`${API_BASE_URL}/api/opportunities/?type=${encodeURIComponent(t)}`)
            .then((r) => r.json())
            .then((rows) => {
                const list = Array.isArray(rows) ? rows : [];
                setRelated(list.filter((o: any) => String(o._id) !== String(id)).slice(0, 6));
            })
            .catch(() => setRelated([]));
    }, [opportunity?._id, opportunity?.type, id]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const oppUrl = user?.user_id
                    ? `${API_BASE_URL}/api/opportunities/${id}?applicant_user_id=${encodeURIComponent(user.user_id)}`
                    : `${API_BASE_URL}/api/opportunities/${id}`;
                const [oppRes, appRes, subRes, reviewsRes] = await Promise.all([
                    fetch(oppUrl, { headers: { ...authHeaders() } }),
                    user
                        ? fetch(`${API_BASE_URL}/api/opportunities/me/applications`, {
                              headers: { ...authHeaders() },
                          })
                        : Promise.resolve({ ok: false, json: async () => [] } as Response),
                    user
                        ? fetch(`${API_BASE_URL}/api/hackathons/my-submission/${id}`, {
                              headers: { ...authHeaders() },
                          })
                        : Promise.resolve({ ok: false, json: async () => ({ hasSubmitted: false }) } as Response),
                    fetch(`${API_BASE_URL}/api/opportunities/${id}/reviews`)
                ]);

                const opp = await oppRes.json();
                let apps: unknown = [];
                if (user && appRes.ok) {
                    try {
                        apps = await appRes.json();
                    } catch {
                        apps = [];
                    }
                }
                
                // Extract reviewsRes
                if (reviewsRes && reviewsRes.ok) {
                    try {
                        const rData = await reviewsRes.json();
                        setReviews(rData.reviews || []);
                        if (opp && oppRes.ok) {
                            opp.average_rating = rData.average_rating;
                            opp.total_reviews = rData.total_reviews;
                        }
                    } catch(e) {}
                }

                if (!oppRes.ok) {
                    setOpportunity(null);
                } else {
                    if (opp.event_link_id) {
                        try {
                            const evRes = await fetch(`${API_BASE_URL}/api/v1/events/${opp.event_link_id}`, { headers: { ...authHeaders() } });
                            if (evRes.ok) {
                                const evData = await evRes.json();
                                if (evData.external_registration_link || evData.externalRegistrationLink) {
                                    opp.external_registration_link = evData.external_registration_link || evData.externalRegistrationLink;
                                }
                            }
                        } catch (e) {
                            console.error('Failed to fetch raw event for external link', e);
                        }
                    }
                    setOpportunity(opp);
                }
                const list = Array.isArray(apps) ? apps : [];
                const mine =
                    list &&
                    Array.isArray(list) &&
                    list.find((app: any) => String(app.opportunity_id) === String(id));
                setMyApplication(mine);
                if (user && subRes && subRes.ok) {
                    try {
                        const subData = await subRes.json();
                        if (subData.hasSubmitted) {
                            setSubmitted(true);
                        }
                    } catch (err) {
                        console.error("Failed to parse submission status", err);
                    }
                }

                // Set isApplied from legacy applications list.
                // Note: the /form endpoint's NOT_REGISTERED status will override
                // this if the participant was deleted from the DB.
                if (mine) {
                    setIsApplied(true);
                }
            } catch (error) {
                console.error('Failed to fetch opportunity details', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        // Set up periodic refresh to check for stage updates
        const refreshInterval = setInterval(fetchData, 30000); // Refresh every 30 seconds
        
        return () => clearInterval(refreshInterval);
    }, [id, user?.user_id]);

    // Keep the visible tab in sync with the `tab` URL parameter so Back/Forward preserves tab state
    useEffect(() => {
        const sp = new URLSearchParams(location.search);
        const t = sp.get('tab');
        if (t && t !== activeSection) {
            // Only set if it's a recognized section
            const allowed = ['details', 'dates', 'prizes', 'reviews', 'faq', 'submissions', 'leaderboard'];
            if (allowed.includes(t)) setActiveSection(t as any);
        }
    }, [location.search]);

    useEffect(() => {
        if (!user || !eventId) return;
        
        setLoadingFields(true);
        fetch(`${API_BASE_URL}/api/v1/registration/events/${eventId}/form`, {
            headers: authHeaders()
        })
        .then(res => res.json())
        .then(data => {
            if (data?.event_id) {
                setFormConfig(data);
                setRegistrationStatus(data.status);
                
                // Prefill answers state
                const initialAnswers: Record<string, string> = {};
                
                // Prefill core profile fields
                if (data.fields_definitions) {
                    data.fields_definitions.forEach((fd: any) => {
                        if (fd.prefilled_value) {
                            initialAnswers[fd.id] = String(fd.prefilled_value);
                        }
                    });
                }

                // Prefill core profile_data from previous registration snapshot if present
                if (data.registration?.profile_data) {
                    Object.assign(initialAnswers, data.registration.profile_data);
                }

                // Prefill custom questions if snapshots exist
                if (data.registration?.custom_answers) {
                    Object.assign(initialAnswers, data.registration.custom_answers);
                }

                // Mark that user already has a registration snapshot
                if (data.registration && data.status !== 'NOT_REGISTERED') {
                    setIsApplied(true);
                    // keep `submitted` true so we can display status, but we allow editing until deadline below
                    setSubmitted(Boolean(data.registration));
                } else if (data.status === 'NOT_REGISTERED') {
                    // Backend says not registered — reset stale applied state
                    setIsApplied(false);
                    setSubmitted(false);
                }
                
                setRegAnswers(prev => ({ ...prev, ...initialAnswers }));
            }
        })
        .catch(err => console.error("Error loading registration form config:", err))
        .finally(() => setLoadingFields(false));
    }, [user, eventId, isApplied]);

    useEffect(() => {
        if (!formConfig?.fields_definitions || !userProfileData) return;

        const profileSources = {
            ...(userProfileData || {}),
            ...(user || {}),
        };

        const readAllowedProfileValue = (field: any) => {
            const label = String(field?.label || '').trim().toLowerCase();
            const id = String(field?.id || '').trim().toLowerCase();

            const pick = (...candidates: string[]) => {
                for (const key of candidates) {
                    const value = (profileSources as any)[key];
                    if (value !== undefined && value !== null && String(value).trim() !== '') {
                        return String(value);
                    }
                }
                return '';
            };

            if (/full\s*name|^name$/.test(label) || id === 'full_name' || id === 'name') return pick('full_name', 'name', 'firstName', 'first_name');
            if (/email/.test(label) || id === 'email') return pick('email');
            if (/phone|mobile/.test(label) || id === 'phone' || id === 'mobile_number') return pick('phone', 'mobile', 'mobile_number');
            return '';
        };

        setRegAnswers(prev => {
            const next = { ...prev };
            for (const fd of formConfig.fields_definitions || []) {
                const value = readAllowedProfileValue(fd);
                if (value && !String(next[fd.id] || '').trim()) {
                    next[fd.id] = value;
                }
            }
            return next;
        });
    }, [formConfig?.event_id, userProfileData, user]);

    const registrationFields: RegField[] = formConfig?.fields_definitions
        ? [
            ...(formConfig.fields_definitions || []).map((field: any) => ({
                id: String(field.id),
                label: String(field.label),
                type: String(field.type),
                required: Boolean(field.required),
                isFixed: true,
                options: Array.isArray(field.options) ? field.options : undefined,
                hint: field.hint || '',
            })),
            ...(formConfig.custom_questions || []).map((field: any) => ({
                id: String(field.id),
                label: String(field.label),
                type: String(field.type),
                required: Boolean(field.required),
                isFixed: false,
                options: Array.isArray(field.options) ? field.options : undefined,
                hint: field.hint || '',
            })),
        ]
        : [];
    const useStageRegistration = Boolean(formConfig);
    const useInstitutionForm = registrationFields.length > 0;
    const registrationDeadlineValue = formConfig?.registrationDeadline || formConfig?.registration_deadline || opportunity?.registrationDeadline || opportunity?.registration_deadline || opportunity?.deadline || '';
    const registrationDeadlineDate = registrationDeadlineValue ? new Date(registrationDeadlineValue) : null;
    const canEditSubmittedRegistration = !submitted || !registrationDeadlineDate || new Date() <= registrationDeadlineDate;

    const buildLegacyPayload = () => {
        const name = formData.name || user?.full_name || user?.name || 'Anonymous Applicant';
        const email = formData.email || user?.email || '';
        return {
            name,
            email,
            interest_reason: formData.interest || '',
            resume_url: formData.resume
                ? `https://studlyf-storage.s3.amazonaws.com/resumes/${formData.resume.name}`
                : '',
        };
    };

    const buildInstitutionPayload = () => {
        const responses: { field_id: string; label: string; value: string }[] = [];
        let derivedName = user?.full_name || user?.name || '';
        let derivedEmail = user?.email || '';
        let derivedInterest = '';
        let derivedResume = '';

        for (const f of registrationFields) {
            const t = (f.type || 'text').toLowerCase();
            const labelLow = (f.label || '').toLowerCase();
            let val = '';

            if (t === 'file' || t === 'upload') {
                val = regAnswers[f.id] ?? '';
                if (/resume|cv/i.test(f.label) && val) derivedResume = val;
            } else if (t === 'checkbox' && f.options && f.options.length > 0) {
                const selected = f.options.filter((opt) => regAnswers[`${f.id}:${opt}`] === 'on');
                val = selected.join(', ');
            } else if (t === 'accept') {
                val = regAnswers[f.id] === 'on' || regAnswers[f.id] === 'true' ? 'yes' : '';
            } else if (t === 'checkbox') {
                val = regAnswers[f.id] === 'on' ? 'yes' : '';
            } else {
                val = regAnswers[f.id] ?? '';
            }

            responses.push({ field_id: f.id, label: f.label, value: val });

            if (/full name|^name$|your name/i.test(labelLow) || labelLow.includes('full name')) {
                derivedName = val || derivedName;
            } else if (t === 'email' || labelLow.includes('email')) {
                derivedEmail = val || derivedEmail;
            } else if (t === 'textarea' || labelLow.includes('why') || labelLow.includes('interest')) {
                derivedInterest = [derivedInterest, val].filter(Boolean).join('\n');
            }
        }

        return {
            name: derivedName || 'Anonymous Applicant',
            email: derivedEmail || 'unknown@applicant.local',
            interest_reason: derivedInterest || '(see registration_responses)',
            resume_url: derivedResume,
            registration_responses: responses,
        };
    };

    const handleFileUpload = async (fieldId: string, file: File) => {
        setUploadingField(fieldId);
        const uFormData = new FormData();
        uFormData.append("file", file);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/registration/upload`, {
                method: 'POST',
                headers: authHeaders(),
                body: uFormData
            });
            const data = await res.json();
            if (res.ok) {
                setRegAnswers(prev => ({ ...prev, [fieldId]: data.url }));
                setUploadedFilenames(prev => ({ ...prev, [fieldId]: file.name }));
                alert("File uploaded successfully.");
            } else {
                alert(`Upload failed: ${data.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Failed to upload file.");
        } finally {
            setUploadingField(null);
        }
    };

    const handleApply = async () => {
        if (!user) {
            navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
            return;
        }
        setShowRegistrationModal(true);
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (reviewForm.rating === 0) return;
        setReviewSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/opportunities/${id}/reviews`, {
                method: 'POST',
                headers: {
                    ...authHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rating: reviewForm.rating, review_text: reviewForm.text })
            });
            if (res.ok) {
                setReviewSuccess(true);
                // Refresh reviews
                const rRes = await fetch(`${API_BASE_URL}/api/opportunities/${id}/reviews`);
                if (rRes.ok) {
                    const rData = await rRes.json();
                    setReviews(rData.reviews || []);
                    if (opportunity) {
                        setOpportunity({
                            ...opportunity,
                            average_rating: rData.average_rating,
                            total_reviews: rData.total_reviews
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Failed to submit review", err);
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            navigate('/login');
            return;
        }

        if (!eventId) {
            alert('Event data is still loading. Please try again.');
            return;
        }

        if (useStageRegistration) {
            // ... (rest of the logic)

            const profile_data: Record<string, any> = {};
            const custom_answers: Record<string, any> = {};
            const missingFields: string[] = [];

            const isEmptyValue = (value: any) => {
                if (value === null || value === undefined) return true;
                if (typeof value === 'string') return value.trim() === '';
                if (Array.isArray(value)) return value.length === 0;
                return false;
            };

            // Populate core fields
            if (formConfig?.fields_definitions) {
                for (const fd of formConfig.fields_definitions) {
                    const value = regAnswers[fd.id] ?? fd.prefilled_value ?? '';
                    profile_data[fd.id] = value;
                    if (fd.required !== false && isEmptyValue(value)) {
                        missingFields.push(String(fd.label || fd.id || 'Required field'));
                    }
                }
            }

            // Populate custom fields
            if (formConfig?.custom_questions) {
                for (const q of formConfig.custom_questions) {
                    const value = regAnswers[q.id] ?? q.prefilled_value ?? '';
                    custom_answers[q.id] = value;
                    if (q.required !== false && isEmptyValue(value)) {
                        missingFields.push(String(q.label || q.id || 'Required question'));
                    }
                }
            }

            if (missingFields.length > 0) {
                alert(`Please complete the required fields before submitting:\n\n${missingFields.slice(0, 10).join('\n')}${missingFields.length > 10 ? `\n...and ${missingFields.length - 10} more` : ''}`);
                return;
            }

            setSubmitting(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/registration/events/${eventId}/apply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders(),
                    },
                    body: JSON.stringify({
                        profile_data,
                        custom_answers,
                        ...(teamAction === 'create' && teamName ? { team_action: 'CREATE', team_payload: teamName } : {}),
                        ...(teamAction === 'join' && inviteCode ? { team_action: 'JOIN', team_payload: inviteCode } : {}),
                        ...(teamAction === 'individual' ? { team_action: 'INDIVIDUAL', team_payload: 'solo' } : {})
                    }),
                });

                const data = await response.json();
                if (response.ok) {
                    setRegistrationStatus(data.reg_status);
                    if (data.team_invite_code) {
                        setTeamInviteCodeResponse(data.team_invite_code);
                    }
                    setSubmitted(true);
                    setIsApplied(true);
                    // Don't close modal immediately so they can see their invite code
                    if (teamAction !== 'create') {
                        setShowRegistrationModal(false);
                    }
                    alert("Registration submitted successfully!");
                } else {
                    alert(`Registration failed: ${data.detail || 'Unknown error'}`);
                }
            } catch (err) {
                console.error("Registration error:", err);
                alert("An error occurred during registration.");
            } finally {
                setSubmitting(false);
            }
            return;
        }

        // Fallback to old logic if new registration fields are not used
        if (useInstitutionForm) {
            for (const f of registrationFields) {
                if (!(regAnswers[f.id] || '').trim()) {
                    alert(`Please complete: ${f.label}`);
                    return;
                }
            }
        }

        const instId = opportunity.createdBy || opportunity.institution_id;

        setSubmitting(true);
        try {
            const payload = useInstitutionForm ? buildInstitutionPayload() : buildLegacyPayload();
            const response = await fetch(`${API_BASE_URL}/api/opportunities/apply`, {
                method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    opportunity_id: id,
                    user_id: user.user_id,
                    institution_id: instId,
                    ...payload,
                })
            });

            if (response.ok) {
                const data = await response.json().catch(() => null);
                if (data) setMyApplication(data);
                setSubmitted(true);
                setIsApplied(true);
            }
        } catch (err) {
            console.error("Apply error:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleFavorite = () => {
        if (!id) return;
        try {
            const raw = localStorage.getItem(FAV_KEY);
            const arr = raw ? ([...(JSON.parse(raw) as string[])].filter(Boolean)) : [];
            const s = new Set(arr.map(String));
            if (s.has(String(id))) s.delete(String(id));
            else s.add(String(id));
            localStorage.setItem(FAV_KEY, JSON.stringify([...s]));
            setFavorited(s.has(String(id)));
        } catch {
            /* ignore */
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] pb-32">
                <div className="bg-slate-900 pt-32 pb-20 px-6 border-b border-slate-800">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-8 opacity-50">
                            <div className="w-16 h-16 bg-slate-800 rounded-2xl animate-pulse"></div>
                            <div className="space-y-3 flex-1">
                                <div className="w-32 h-6 bg-slate-800 rounded animate-pulse"></div>
                                <div className="w-48 h-4 bg-slate-800 rounded animate-pulse"></div>
                            </div>
                        </div>
                        <div className="w-3/4 h-12 bg-slate-800 rounded-lg animate-pulse mb-6"></div>
                        <div className="flex gap-4">
                            <div className="w-24 h-8 bg-slate-800 rounded-full animate-pulse"></div>
                            <div className="w-24 h-8 bg-slate-800 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>
                <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-10">
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-6">
                            <div className="w-full h-4 bg-slate-100 rounded animate-pulse"></div>
                            <div className="w-full h-4 bg-slate-100 rounded animate-pulse"></div>
                            <div className="w-3/4 h-4 bg-slate-100 rounded animate-pulse"></div>
                        </div>
                        <div className="w-full md:w-80 h-48 bg-slate-100 rounded-2xl animate-pulse shrink-0"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!opportunity) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[#F8FAFC] space-y-4">
                <h1 className="text-2xl font-black text-slate-800">Opportunity Not Found</h1>
                <button onClick={() => navigate('/opportunities')} className="text-purple-600 font-bold flex items-center gap-2">
                    <ChevronLeft size={20} /> Back to Listings
                </button>
            </div>
        );
    }

    const descriptionHtmlRaw = richHtmlFromOpportunityField(opportunity.description);
    const descriptionSafe = sanitizePresentationHtml(descriptionHtmlRaw);
    const descriptionPlain = plainTextFromRichContent(opportunity.description);
    const useRichDescription = Boolean(descriptionSafe.trim());

    const handleBack = () => {
        const idx =
            window.history.state && typeof window.history.state.idx === 'number'
                ? window.history.state.idx
                : 0;
        if (idx > 0) navigate(-1);
        else navigate('/opportunities');
    };

    const buildVenueLine = (o: typeof opportunity) => {
        if (!o) return '';
        const vd = (o.venueDisplay || '').trim();
        if (vd) return vd;
        const va = (o.venueAddress || '').trim();
        const c = (o.city || '').trim();
        const parts: string[] = [];
        if (va) parts.push(va);
        if (c && !va.toLowerCase().includes(c.toLowerCase())) parts.push(c);
        if (parts.length) return parts.join(', ');
        return formatOpportunityLocation(o.location);
    };

    const teamSizeLabel = (o: typeof opportunity): string | null => {
        if (!o) return null;
        const minT = o.minTeamSize ?? (o as any).min_team_size;
        const maxT = o.maxTeamSize ?? (o as any).max_team_size;
        if (minT != null && maxT != null) return `${minT} - ${maxT} Members`;
        if (String(o.participationType || '').toLowerCase() === 'individual') return 'Individual participation';
        return null;
    };

    const modeLabel = (o: typeof opportunity) => {
        const m = String(o?.opportunityMode || 'online').toLowerCase();
        return m === 'offline' ? 'Offline' : 'Online';
    };

    const eligibilityList = (o: typeof opportunity): string[] => {
        const raw = o?.candidateTypes;
        if (!Array.isArray(raw) || raw.length === 0) return [];
        return raw.map((x: unknown) => String(x));
    };

    const shareListing = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: opportunity.title, text: opportunity.organization, url });
            } else {
                await navigator.clipboard.writeText(url);
                alert('Link copied to clipboard');
            }
        } catch {
            /* cancelled */
        }
    };

    const addToCalendar = () => {
        const title = opportunity.title || 'Opportunity';
        const end = opportunity.deadline ? new Date(opportunity.deadline) : new Date();
        const start = opportunity.eventStartDate
            ? new Date(opportunity.eventStartDate)
            : new Date(end.getTime() - 24 * 3600 * 1000);
        const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
        const loc = buildVenueLine(opportunity);
        const u = new URL('https://calendar.google.com/calendar/render');
        u.searchParams.set('action', 'TEMPLATE');
        u.searchParams.set('text', title);
        u.searchParams.set('dates', `${fmt(start)}/${fmt(end)}`);
        u.searchParams.set('details', `${opportunity.organization || ''}\n${window.location.href}`);
        if (loc) u.searchParams.set('location', loc);
        window.open(u.toString(), '_blank');
    };

    const scrollToSection = (key: 'details' | 'dates' | 'prizes' | 'reviews' | 'faq' | 'submissions' | 'leaderboard') => {
        setActiveSection(key as any);
        const ref =
            key === 'details'
                ? detailsRef
                : key === 'dates'
                  ? datesRef
                  : key === 'prizes'
                    ? prizesRef
                    : key === 'reviews'
                      ? reviewsRef
                      : key === 'submissions'
                        ? submissionsRef
                        : key === 'leaderboard'
                          ? leaderboardRef
                          : faqRef;
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const checkStageAuthorization = (s: any) => {
        const participantStage = myApplication?.current_stage || '';
        const regStatusStrLower = (effectiveRegStatus || 'NOT_REGISTERED').toLowerCase();
        
        const stages = opportunity?.stages || [];
        const stageIndex = stages.findIndex((st: any) => st.id === s.id || st.name === s.name);
        const participantStageIndex = stages.findIndex((st: any) => st.id === participantStage || st.name === participantStage);
        
        const stageVisibility = String(s?.visibility || s?.config?.visibility || '').toLowerCase().trim();
        const requiresShortlist = stageVisibility.includes('shortlist');
        const pType = String(opportunity?.participationType || opportunity?.participation_type || '').toLowerCase();
        const isSoloEvent = pType === 'individual' || pType === 'both';
        const isSoloParticipant = !myApplication?.team_id || myApplication?.is_solo_participant === true;

        // Base status-based authorization
        let isAuthorized = false;
        if (!requiresShortlist) {
            isAuthorized = regStatusStrLower !== 'not_registered' && regStatusStrLower !== 'rejected';
        } else {
            const allowedStatuses = ['approved', 'shortlisted', 'accepted'];
            if (isSoloEvent && isSoloParticipant) {
                allowedStatuses.push('registered');
            }
            isAuthorized = allowedStatuses.includes(regStatusStrLower);
        }

        // Progression-based authorization (Strict)
        // 1. Must be the current stage or a previous stage
        // Removed `if (isAuthorized && participantStageIndex < stageIndex)` to allow status and depends_on to govern unlocks correctly

        // Depends on rules (if provided by DB)
        // Shortlisted/Approved participants bypass dependency checks (backend auto-fulfills)
        const dependsOn = s.depends_on || s.config?.depends_on || [];
        if (isAuthorized && Array.isArray(dependsOn) && dependsOn.length > 0) {
            const bypassStatuses = ['shortlisted', 'accepted', 'approved'];
            if (bypassStatuses.includes(regStatusStrLower)) {
                return true;
            }
            for (const depId of dependsOn) {
                const depStage = stages.find((st: any) => st.id === depId || st.name === depId);
                if (depStage) {
                    // Check if dependency is completed
                    const depIdx = stages.indexOf(depStage);
                    if (participantStageIndex <= depIdx) {
                        isAuthorized = false;
                        break;
                    }
                } else {
                    // Orphan dependency ID: fail closed for safety
                    isAuthorized = false;
                    break;
                }
            }
        }

        return isAuthorized;
    };


    const handleStageClick = (s: any) => {
        const stype = s.type?.toUpperCase();
        const sname = s.name?.toUpperCase() || '';
        const event_hub_id = String(opportunity.event_link_id || opportunity.event_id || id);
        const oppPath = id ? `/opportunities/${encodeURIComponent(String(id))}` : '';
        const isSubmissionStage = stype === 'SUBMISSION' || sname.includes('SUBMISSION');
        const regStatusStr = (effectiveRegStatus || 'NOT_REGISTERED').toUpperCase();
        const isRegistrationStage = stype === 'REGISTRATION' || sname.includes('REGISTER') || sname.includes('REGISTRATION');

        // Results stage → open results page in new tab (public)
        const stageStatus = computeStageStatus(s);
        if (stageStatus === 'results' || stype === 'RESULT' || sname.includes('RESULT')) {
            window.open(`/opportunities/${encodeURIComponent(String(id))}/results`, '_blank', 'noopener,noreferrer');
            return;
        }

        if (isRegistrationStage) {
            const extLink = opportunity?.external_registration_link || opportunity?.externalRegistrationLink;
            if (extLink) {
                window.open(extLink, '_blank', 'noopener,noreferrer');
                return;
            }
            if (regStatusStr === 'APPROVED' && !canEditSubmittedRegistration) {
                // Navigate to the next stage automatically instead of just showing an alert
                const stages = opportunity?.stages || [];
                const currentIdx = stages.findIndex((st: any) => st === s || st.id === s.id);
                const nextStage = currentIdx >= 0 ? stages[currentIdx + 1] : null;
                if (nextStage) {
                    const ntype = nextStage.type?.toUpperCase() || '';
                    const nname = (nextStage.name || '').toUpperCase();
                    if ((ntype === 'TEAM_FORMATION' || nname.includes('TEAM')) && oppPath) {
                        navigate(`${oppPath}?tab=team`);
                        return;
                    } else if ((ntype === 'SUBMISSION' || nname.includes('SUBMISSION')) && oppPath) {
                        navigate(`${oppPath}?tab=submissions`);
                        return;
                    } else if (ntype === 'QUIZ' || ntype === 'ASSESSMENT' || nname.includes('QUIZ') || nname.includes('ASSESSMENT')) {
                        const quizId = nextStage.config?.quiz_id || nextStage.quiz_id || nextStage.config?.quizId || nextStage.quizId;
                        if (quizId) {
                            navigate(`/events/${encodeURIComponent(event_hub_id)}/quiz/${quizId}`);
                        } else {
                            navigate(`/events/${encodeURIComponent(event_hub_id)}`);
                        }
                        return;
                    }
                }
                // Fallback: try to navigate to team tab if any team stage exists, else event hub
                const hasTeamStage = stages.some((st: any) => {
                    const t = st.type?.toUpperCase() || '';
                    const n = (st.name || '').toUpperCase();
                    return t === 'TEAM_FORMATION' || n.includes('TEAM');
                });
                if (hasTeamStage && oppPath) {
                    navigate(`${oppPath}?tab=team`);
                    return;
                }
                // Final fallback: navigate to event hub
                navigate(`/events/${encodeURIComponent(event_hub_id)}`);
                return;
            }
            setShowRegistrationModal(true);
            return;
        }

        if (!checkStageAuthorization(s)) {
            alert(`This stage is locked. You must be approved or shortlisted to proceed.`);
            return;
        }

        // Check if stage is active based on dates
        const start = s.startDate || s.start_date;
        const end = s.endDate || s.end_date;
        const now = new Date();
        
        if (start && new Date(start) > now) {
            alert(`This stage hasn't started yet. It will start on ${new Date(start).toLocaleString()}.`);
            return;
        }
        
        if (end) {
            const endDate = new Date(end);
            if (endDate.getHours() === 0 && endDate.getMinutes() === 0 && !String(end).includes('T')) {
                endDate.setHours(23, 59, 59, 999);
            }
            if (now > endDate) {
                alert(`This stage has ended on ${endDate.toLocaleString()}. You can no longer participate.`);
                if (stype !== 'FINAL' && !sname.includes('RESULT')) {
                    return;
                }
            }
        }

        if ((stype === 'TEAM_FORMATION' || sname.includes('TEAM')) && oppPath) {
            navigate(`${oppPath}?tab=team`);
        } else if ((stype === 'SUBMISSION' || sname.includes('SUBMISSION')) && oppPath) {
            navigate(`${oppPath}?tab=submissions`);
        } else if (stype === 'QUIZ' || stype === 'ASSESSMENT' || sname.includes('QUIZ') || sname.includes('ASSESSMENT')) {
            const quizId = s.config?.quiz_id || s.quiz_id || s.config?.quizId || s.quizId;
            if (quizId) {
                navigate(`/events/${encodeURIComponent(event_hub_id)}/quiz/${quizId}`);
            } else {
                navigate(`/events/${encodeURIComponent(event_hub_id)}`);
            }
        } else {
            navigate(`/events/${encodeURIComponent(event_hub_id)}`);
        }
    };

    const venueLine = buildVenueLine(opportunity);
    const teamSize = teamSizeLabel(opportunity);
    const elig = eligibilityList(opportunity);
    const logoSrc = getImageUrl(
        opportunity.logo_url ||
        opportunity.logoUrl ||
        opportunity.institution_logo_url ||
        opportunity.institutionLogoUrl ||
        opportunity.organization_logo_url ||
        opportunity.org_logo_url ||
        opportunity.logo ||
        ''
    );
    const orgDisplay = opportunity.organization || opportunity.institution_profile_name || 'Host institution';
    const registeredCount = Number(opportunity.applicantsCount ?? opportunity.registeredCount ?? 0);
    const deadlineDate = (() => {
        if (!opportunity.deadline) return null;
        const d = new Date(opportunity.deadline);
        if (d.getHours() === 0 && d.getMinutes() === 0 && !String(opportunity.deadline).includes('T')) {
            d.setHours(23, 59, 59, 999);
        }
        return d;
    })();
    const daysLeft =
        deadlineDate && !Number.isNaN(deadlineDate.getTime())
            ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null;

    const processStats = opportunity.processStats || null;
    const shortlistedCount = processStats?.byStatus?.shortlisted ?? 0;
    const rejectedCount = processStats?.byStatus?.rejected ?? 0;
    const submissionStage =
        Array.isArray(opportunity?.stages)
            ? opportunity.stages.find((stage: any) => {
                  const type = String(stage.type || '').toUpperCase();
                  const name = String(stage.name || '').toUpperCase();
                  return type === 'SUBMISSION' || name.includes('SUBMISSION');
              })
            : null;
    const submissionStageTitle = String(submissionStage?.name || submissionStage?.config?.label || 'Submission Stage').trim();
    const submissionStageSubtitle = String(
        submissionStage?.description || submissionStage?.config?.description || 'Share your solution and complete the stage requirements.'
    ).trim();

    const prizePoolLabel =
        String(opportunity.prize_pool ?? opportunity.prizePool ?? opportunity.prizePoolLabel ?? '').trim() || '';
    const prizesList = Array.isArray(opportunity.prize_distribution)
        ? opportunity.prize_distribution
        : Array.isArray(opportunity.prizeDistribution)
          ? opportunity.prizeDistribution
          : Array.isArray(opportunity.prizes)
            ? opportunity.prizes
            : [];

    const contactList: any[] = Array.isArray(opportunity.contact)
        ? opportunity.contact
        : Array.isArray(opportunity.contacts)
          ? opportunity.contacts
          : opportunity.contact && typeof opportunity.contact === 'object'
            ? [opportunity.contact]
            : [];
    const attachmentsList: any[] = Array.isArray(opportunity.attachments)
        ? opportunity.attachments
        : Array.isArray(opportunity.documents)
          ? opportunity.documents
          : [];
    const hasContactSection = contactList.length > 0;
    const hasAttachmentsSection = attachmentsList.length > 0;

    const stagesList = Array.isArray(opportunity?.stages) ? opportunity.stages : [];
    
    // Stages where participant submits data (exclude registration & team formation)
    const submittableStages = stagesList.filter((s: any) => {
        const st = String(s?.type || '').toUpperCase();
        const sn = String(s?.name || '').toLowerCase();
        // Strict filter: only SUBMISSION type stages or those explicitly marked for submission
        return (st === 'SUBMISSION' || sn.includes('submission')) && 
               st !== 'REGISTRATION' && st !== 'TEAM_FORMATION' &&
               !sn.includes('regist') && !sn.includes('team formation');
    });
    const hasSubmittableStages = submittableStages.length > 0;
    
    // Find Registration Stage
    const regStage = stagesList.find((s: any) => 
        String(s?.type || '').toUpperCase() === 'REGISTRATION' || 
        String(s?.name || '').toLowerCase().includes('regist')
    );
    const derivedDeadline = regStage?.endDate || regStage?.end_date || regStage?.deadline || opportunity?.deadline;

    // Find Event Start Date
    let derivedStartDate = opportunity?.eventStartDate || opportunity?.start_date;
    if (stagesList.length > 0) {
        const startDates = stagesList
            .map((s: any) => s?.startDate || s?.start_date)
            .filter(Boolean)
            .map((d: any) => new Date(d).getTime());
        if (startDates.length > 0) {
            derivedStartDate = new Date(Math.min(...startDates)).toISOString();
        }
    }

    // Find Event End Date
    let derivedEndDate = opportunity?.eventEndDate || opportunity?.end_date;
    if (stagesList.length > 0) {
        const endDates = stagesList
            .map((s: any) => s?.endDate || s?.end_date)
            .filter(Boolean)
            .map((d: any) => new Date(d).getTime());
        if (endDates.length > 0) {
            derivedEndDate = new Date(Math.max(...endDates)).toISOString();
        }
    }

    const hasDatesSection =
        Boolean(derivedDeadline) ||
        Boolean(derivedStartDate) ||
        Boolean(derivedEndDate) ||
        (stagesList.length > 0 &&
            stagesList.some((s: any) => s?.startDate || s?.start_date || s?.endDate || s?.end_date || s?.deadline));
    const hasPrizesSection = Boolean(prizePoolLabel) || (Array.isArray(prizesList) && prizesList.length > 0);
    const hideLeaderboard =
        (() => {
            const title = String(
                opportunity?.title ||
                opportunity?.name ||
                opportunity?.opportunity_title ||
                opportunity?.opportunityName ||
                ''
            );
            const loc = String(opportunity?.location || opportunity?.venue || '');
            return /hyderabad/i.test(title) || /hyderabad/i.test(loc);
        })();
    const hideExtras = hideLeaderboard;

    const richTextClass =
        'opportunity-rich-text text-slate-600 font-medium leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_a]:text-purple-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-purple-600 [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:text-slate-700 [&_h1]:text-xl [&_h1]:font-black [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold';

    return (
        <div className="min-h-screen bg-[#eef2f7] pb-16 font-sans text-slate-800">
            {opportunity.listingPendingPublish ? (
                <div className="bg-amber-50 border-b border-amber-100 text-amber-900 text-sm font-bold text-center py-3 px-4">
                    This listing is not public yet. You can open it because you already applied.
                </div>
            ) : null}

            {/* Sub navigation — reference: Details / Reviews / FAQs */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
                    <nav className="flex items-center gap-1 sm:gap-6 text-sm font-bold text-slate-500">
                        <button
                            type="button"
                            onClick={() => scrollToSection('details')}
                            className={`flex items-center gap-1.5 pb-0.5 border-b-2 transition-colors ${
                                activeSection === 'details' ? 'text-purple-600 border-purple-600' : 'border-transparent hover:text-slate-800'
                            }`}
                        >
                            <Home size={16} className="hidden sm:inline" />
                            Details
                        </button>
                        {hasSubmittableStages && (
                            <button
                                type="button"
                                onClick={() => scrollToSection('submissions')}
                                className={`pb-0.5 border-b-2 transition-colors ${
                                    activeSection === 'submissions' ? 'text-purple-600 border-purple-600' : 'border-transparent hover:text-slate-800'
                                }`}
                            >
                                Submissions
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => scrollToSection('reviews')}
                            className={`pb-0.5 border-b-2 transition-colors ${
                                activeSection === 'reviews' ? 'text-purple-600 border-purple-600' : 'border-transparent hover:text-slate-800'
                            }`}
                        >
                            Reviews
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('faq')}
                            className={`pb-0.5 border-b-2 transition-colors ${
                                activeSection === 'faq' ? 'text-purple-600 border-purple-600' : 'border-transparent hover:text-slate-800'
                            }`}
                        >
                            FAQs &amp; Discussions
                        </button>
                    </nav>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-purple-600"
                        >
                            <ChevronLeft size={18} /> Back
                        </button>
                        {user ? (
                            activeTab !== 'submissions' ? (
                                <Link
                                    to="/dashboard/learner"
                                    className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-purple-600"
                                >
                                    Dashboard <ChevronRight size={18} />
                                </Link>
                            ) : null
                        ) : (
                            <Link
                                to={`/login?next=${encodeURIComponent(window.location.pathname)}`}
                                className="text-sm font-bold text-purple-600"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-[1400px] mx-auto px-4 pt-10 pb-20 flex flex-col lg:flex-row gap-8 relative items-start">
                <div className="flex-1 min-w-0 w-full space-y-8">
                <button
                    type="button"
                    onClick={handleBack}
                    className="sm:hidden flex items-center gap-1 text-sm font-bold text-slate-500 mb-4"
                >
                    <ChevronLeft size={18} /> Back
                </button>

                {/* Conditional rendering for tabs */}
                {activeTab === 'team' && opportunity ? (
                    <div className="my-8">
                        {eventId ? (
                            <TeamManager eventId={eventId} opportunity={opportunity} />
                        ) : (
                            <div className="bg-white p-6 rounded-lg shadow-md text-slate-600">
                                Event data is still loading. Please refresh the page.
                            </div>
                        )}
                    </div>
                ) : activeTab === 'submissions' && opportunity ? (
                    <div className="my-8">
                        {eventId && submittableStages.length > 0 ? (
                            <StageSubmissionsPanel
                                eventId={eventId}
                                participationType={opportunity?.participationType}
                                stagesFromOpportunity={stagesList}
                            />
                        ) : (
                            <div className="bg-white p-6 rounded-lg shadow-md text-slate-600">
                                No submission stages configured for this event yet.
                            </div>
                        )}
                    </div>
                ) : (
                <>


                {/* Hero card — reference layout */}
                <article className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mb-8">
                    {/* Premium Hero Banner Section */}
                    <div className="relative w-full h-48 md:h-64 overflow-hidden bg-slate-900 group">
                        {opportunity.banner_url ? (
                            <img 
                                src={getImageUrl(opportunity.banner_url)} 
                                alt="Event Banner" 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div 
                            className="absolute inset-0 w-full h-full bg-gradient-to-tr from-purple-900 via-indigo-950 to-slate-900 flex items-center justify-center"
                            style={{ display: opportunity.banner_url ? 'none' : 'flex' }}
                        >
                            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,#6C3BFF_0%,transparent_50%),radial-gradient(circle_at_70%_60%,#FF3B9A_0%,transparent_50%)]"></div>
                            <div className="relative z-10 flex flex-col items-center text-center px-6">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300 mb-2">Interactive Event Onboarding</span>
                                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">{opportunity.title}</h2>
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none"></div>
                    </div>
                    <div className="p-6 md:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm font-bold">
                                <MapPin
                                    size={18}
                                    className={modeLabel(opportunity) === 'Offline' ? 'text-red-500' : 'text-purple-600'}
                                />
                                <span className={modeLabel(opportunity) === 'Offline' ? 'text-red-600' : 'text-purple-600'}>
                                    {modeLabel(opportunity)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={addToCalendar}
                                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-purple-600"
                                    title="Add to calendar"
                                >
                                    <CalendarPlus size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleFavorite}
                                    className={`p-2.5 rounded-xl border ${
                                        favorited ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                    title="Save"
                                >
                                    <Heart size={20} className={favorited ? 'fill-current' : ''} />
                                </button>
                                <button
                                    type="button"
                                    onClick={shareListing}
                                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-purple-600"
                                    title="Share"
                                >
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col md:flex-row md:items-start gap-6">
                            <div className="flex-1 min-w-0">
                                {/* Breadcrumb */}
                                <nav className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                                    <Link to="/opportunities" className="hover:text-purple-600 transition-colors">Opportunities</Link>
                                    <span className="text-slate-300">/</span>
                                    <span className="text-slate-600">{opportunity.type || 'Listing'}</span>
                                    {opportunity.category ? (
                                        <>
                                            <span className="text-slate-300">/</span>
                                            <span className="text-slate-800">{opportunity.category}</span>
                                        </>
                                    ) : null}
                                </nav>
                                <Helmet>
                                    <title>{opportunity.title} | Studlyf</title>
                                    <meta name="description" content={opportunity.seo?.description || opportunity.description?.slice(0, 160) || ''} />
                                    <meta property="og:title" content={opportunity.title} />
                                    <meta property="og:description" content={opportunity.seo?.description || opportunity.description?.slice(0, 160) || ''} />
                                    {opportunity.banner_url && <meta property="og:image" content={getImageUrl(opportunity.banner_url)} />}
                                    <meta property="og:type" content="website" />
                                    <meta name="twitter:card" content="summary_large_image" />
                                    <meta name="twitter:title" content={opportunity.title} />
                                    <meta name="twitter:description" content={opportunity.seo?.description || opportunity.description?.slice(0, 160) || ''} />
                                    {opportunity.banner_url && <meta name="twitter:image" content={getImageUrl(opportunity.banner_url)} />}
                                </Helmet>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                                    {opportunity.title}
                                </h1>
                                <p className="mt-3 text-lg font-bold text-slate-600 flex items-center gap-2">
                                    <Building2 size={20} className="text-purple-600 shrink-0" />
                                    {orgDisplay}
                                </p>

                                {/* Hashtag tags — dynamically derived from event data */}
                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    {opportunity.type ? (
                                        <span className="text-[12px] font-bold text-[#6C3BFF] bg-purple-50 px-2.5 py-1 rounded-full">#{opportunity.type.replace(/\s+/g, '')}</span>
                                    ) : null}
                                    {opportunity.category ? (
                                        <span className="text-[12px] font-bold text-[#6C3BFF] bg-purple-50 px-2.5 py-1 rounded-full">#{opportunity.category.replace(/\s+/g, '')}</span>
                                    ) : null}
                                    {opportunity.sub_type ? (
                                        <span className="text-[12px] font-bold text-[#6C3BFF] bg-purple-50 px-2.5 py-1 rounded-full">#{opportunity.sub_type.replace(/\s+/g, '')}</span>
                                    ) : null}
                                    {opportunity.skills && String(opportunity.skills).trim() ? (
                                        (() => {
                                            const skills = plainTextFromRichContent(opportunity.skills);
                                            return skills.split(/[,;]/).slice(0, 3).map((s: string, i: number) => (
                                                <span key={i} className="text-[12px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">#{s.trim().replace(/\s+/g, '')}</span>
                                            ));
                                        })()
                                    ) : null}
                                </div>

                                {/* Compact eligibility summary under title */}
                                {elig.length > 0 && (
                                    <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
                                        <div className="text-[11px] font-bold uppercase text-slate-400">Eligible:</div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {elig.slice(0, 3).map((e, i) => (
                                                <span key={i} className="px-2 py-1 bg-slate-100 rounded-lg text-[13px] font-medium">{e}</span>
                                            ))}
                                            {elig.length > 3 && <span className="text-xs text-slate-400">+{elig.length - 3} more</span>}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8 grid sm:grid-cols-2 gap-6">
                                    {venueLine ? (
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-purple-600 mb-1 flex items-center gap-2">
                                                <MapPin size={14} /> Location
                                            </p>
                                            <p className="text-slate-700 font-semibold leading-snug">{venueLine}</p>
                                        </div>
                                    ) : null}
                                    {teamSize ? (
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-purple-600 mb-1 flex items-center gap-2">
                                                <Users size={14} /> Team size
                                            </p>
                                            <p className="text-slate-700 font-semibold">{teamSize}</p>
                                        </div>
                                    ) : null}
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-purple-600 mb-1 flex items-center gap-2">
                                            <Calendar size={14} /> Registration deadline
                                        </p>
                                        <p className="text-slate-700 font-semibold">
                                            {opportunity.deadline
                                                ? new Date(opportunity.deadline).toLocaleDateString('en-GB', {
                                                      day: '2-digit',
                                                      month: 'short',
                                                      year: 'numeric',
                                                  })
                                                : '—'}
                                        </p>
                                            {/* Editable badge */}
                                            <div className="mt-2">
                                                {deadlineDate ? (
                                                    daysLeft && daysLeft > 0 ? (
                                                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold">Editable until {deadlineDate.toLocaleDateString('en-GB')}</span>
                                                    ) : (
                                                        <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">Editing closed — deadline passed</span>
                                                    )
                                                ) : null}
                                            </div>
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 mx-auto md:mx-0 flex flex-col items-center gap-4">
                                <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl border border-slate-200 shadow-sm overflow-hidden bg-white flex items-center justify-center relative">
                                    {logoSrc ? (
                                        <img 
                                            src={logoSrc} 
                                            alt="" 
                                            className="w-full h-full object-contain p-2"
                                            onError={(e) => {
                                                // Log failing URL for diagnostics
                                                e.currentTarget.style.display = 'none';
                                                const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                                                if (sibling) sibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div 
                                        className="w-full h-full bg-purple-50 text-[#6C3BFF] font-black text-3xl md:text-4xl flex items-center justify-center uppercase"
                                        style={{ display: logoSrc ? 'none' : 'flex' }}
                                    >
                                        {orgDisplay.charAt(0)}
                                    </div>
                                </div>

                                {/* Custom Hero Prize Badge */}
                                {prizePoolLabel ? (
                                    <div className="relative overflow-visible hidden md:flex">
                                        <div className="bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 px-5 py-2.5 rounded-full border border-blue-200 flex flex-col items-center justify-center shadow-sm relative z-10 w-full whitespace-nowrap pr-12">
                                            {opportunity?.hero_badge_text ? (
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-800">
                                                    {opportunity.hero_badge_text}
                                                </p>
                                            ) : null}
                                            <p className="text-sm font-black text-blue-900 mt-0.5">
                                                {opportunity?.hero_badge_text ? '& ' : ''}Prizes worth <span className="text-lg">{prizePoolLabel}</span>
                                            </p>
                                        </div>
                                        <div className="absolute -right-4 -bottom-2 z-20">
                                            <span role="img" aria-label="trophy" className="text-5xl drop-shadow-md">🏆</span>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {isApplied && !submitted ? (
                            <div className="mt-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-wrap items-center gap-4">
                                {(() => {
                                    const status = getStatusById(myApplication?.status || 'pending');
                                    const statusColor = getStatusColor(myApplication?.status || 'pending');
                                    const dec = applicationDecisionCopy(myApplication?.status);

                                    const IconComponent = (() => {
                                        const iconName = status.icon;
                                        if (iconName === 'calendar-plus') return CalendarPlus;
                                        if (iconName === 'calendar-x') return CalendarX;
                                        if (iconName === 'clock') return Clock;
                                        if (iconName === 'check-circle') return CheckCircle2;
                                        if (iconName === 'x-circle') return XCircle;
                                        if (iconName === 'video') return Video;
                                        if (iconName === 'users') return Users;
                                        if (iconName === 'upload') return Upload;
                                        if (iconName === 'search') return Search;
                                        if (iconName === 'star') return Star;
                                        if (iconName === 'check-circle-2') return CheckCircle2;
                                        if (iconName === 'dollar-sign') return DollarSign;
                                        if (iconName === 'check-square') return CheckSquare;
                                        return CheckCircle2;
                                    })();
                                    
                                    return (
                                        <>
                                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: statusColor }}>
                                                <IconComponent size={22} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
                                                    {status.label}
                                                </p>
                                                <p className="font-black text-emerald-900">{dec.title}</p>
                                                <p className="text-sm text-emerald-800/90 mt-0.5">{dec.sub || ''}</p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        ) : null}
                    </div>
                </article>


                        <div ref={detailsRef}>
                            {elig.length > 0 ? (
                                <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-4">
                                        <span className="w-1 h-7 bg-purple-600 rounded-full" />
                                        Eligibility
                                    </h2>
                                    <div className="flex flex-wrap gap-x-3 gap-y-2 text-slate-700 font-medium text-sm">
                                        {elig.map((label, i) => (
                                            <span key={i} className="flex items-center gap-2">
                                                {i > 0 ? <span className="text-slate-300">•</span> : null}
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            ) : null}

                            <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-4">
                                <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                    <span className="w-1 h-7 bg-purple-600 rounded-full" />
                                    All that you need to know about {opportunity.title}
                                </h2>
                                <div className="border-t border-slate-100 pt-6">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">
                                        About the opportunity
                                    </h3>
                                    {useRichDescription ? (
                                        <div
                                            className={`${richTextClass} ${!descExpanded ? 'max-h-[28rem] overflow-hidden relative' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: descriptionSafe }}
                                        />
                                    ) : descriptionPlain ? (
                                        <p className="text-slate-600 font-medium leading-loose whitespace-pre-wrap">
                                            {descriptionPlain}
                                        </p>
                                    ) : (
                                        <p className="text-slate-400 text-sm font-medium italic">
                                            The host has not added a description for this listing.
                                        </p>
                                    )}
                                    {useRichDescription && descriptionSafe.length > 1200 ? (
                                        <button
                                            type="button"
                                            onClick={() => setDescExpanded((v) => !v)}
                                            className="mt-3 text-sm font-black text-purple-600 hover:underline"
                                        >
                                            {descExpanded ? 'Read less' : 'Read more'}
                                        </button>
                                    ) : null}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                        <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
                                            <Users size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Applicants
                                            </p>
                                            <p className="text-base font-black text-slate-800">
                                                {opportunity.applicantsCount ?? 0}+
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                        <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
                                            <Clock size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Listing
                                            </p>
                                            <p
                                                className={`text-base font-black uppercase tracking-wide ${
                                                    opportunity.listingPendingPublish ? 'text-amber-600' : 'text-emerald-600'
                                                }`}
                                            >
                                                {opportunity.listingPendingPublish ? 'Awaiting publish' : 'Open'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {Array.isArray(opportunity.stages) && opportunity.stages.length > 0 ? (
                                <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
                                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                        <span className="w-1 h-7 bg-purple-600 rounded-full" />
                                        Stages &amp; Timelines
                                    </h2>
                                    <div className="space-y-6">
                                        {opportunity.stages.map((s: any, i: number) => {
                                            const stype = s.type?.toUpperCase();
                                            const sname = s.name?.toUpperCase() || '';

                                            let actionLabel = 'Unlock';
                                            if (stype === 'REGISTRATION' || sname.includes('REGISTER') || sname.includes('REGISTRATION')) {
                                                actionLabel = isApplied || effectiveRegStatus === 'APPROVED' ? 'Registered' : 'Apply Now';
                                            } else if (stype === 'TEAM_FORMATION' || sname.includes('TEAM')) {
                                                actionLabel = 'Manage Team';
                                            } else if (stype === 'SUBMISSION' || sname.includes('SUBMISSION')) {
                                                actionLabel = 'Open Submission Portal';
                                            } else if (stype === 'QUIZ' || stype === 'ASSESSMENT' || sname.includes('QUIZ') || sname.includes('ASSESSMENT')) {
                                                actionLabel = 'Take Assessment';
                                            } else {
                                                actionLabel = 'View Stage';
                                            }

                                            const stageStatus = computeStageStatus(s);
                                            const isAuthorized = checkStageAuthorization(s);
                                            
                                            // Stage is interactive only if it is the current active stage and authorized
                                            const canAct = (stageStatus === 'active') && isAuthorized;
                                            
                                            // Stage is visible only if it is authorized or already past the start date
                                            const isVisible = isAuthorized || (s.startDate && new Date(s.startDate) <= new Date());
                                            
                                            if (!isVisible) return null;

                                            const start = s.startDate || s.start_date;
                                            const end = s.endDate || s.end_date;
                                            const startDate = start ? new Date(start) : null;
                                            const endDate = end ? new Date(end) : null;
                                            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                            const pillMonth = startDate ? months[startDate.getMonth()] : '';
                                            const pillDay = startDate ? startDate.getDate() : '';

                                            const stageIcon = s.icon_url ? null :
                                                stype === 'REGISTRATION' ? <UserPlus size={20} /> :
                                                stype === 'TEAM_FORMATION' ? <Users size={20} /> :
                                                stype === 'QUIZ' || stype === 'ASSESSMENT' ? <FileText size={20} /> :
                                                stype === 'SUBMISSION' ? <Upload size={20} /> :
                                                stype === 'REVIEW' ? <Gavel size={20} /> :
                                                stype === 'FINAL' ? <Trophy size={20} /> :
                                                <Settings2 size={20} />;

                                            return (
                                                <div key={s.id || i} className="flex gap-5">
                                                    {/* Left date pill */}
                                                    <div className="flex flex-col items-center shrink-0 w-16">
                                                        {startDate ? (
                                                            <div className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center shadow-sm ${
                                                                stageStatus === 'active' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                                                                stageStatus === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                                                'bg-slate-50 border-slate-200 text-slate-500'
                                                            }`}>
                                                                <span className="text-[9px] font-black uppercase leading-tight">{pillMonth}</span>
                                                                <span className="text-lg font-black leading-tight">{pillDay}</span>
                                                            </div>
                                                        ) : s.icon_url ? (
                                                            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                                                                <img src={s.icon_url} alt="" className="w-8 h-8 object-contain" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-14 h-14 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500">
                                                                {stageIcon}
                                                            </div>
                                                        )}
                                                        {i < opportunity.stages.length - 1 && (
                                                            <div className="w-0.5 flex-1 bg-slate-200 mt-2" />
                                                        )}
                                                    </div>

                                                    {/* Right content */}
                                                    <div className={`flex-1 bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                                                        canAct ? 'hover:border-[#6C3BFF]/40 hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed'
                                                    }`}
                                                        onClick={canAct ? () => handleStageClick(s) : () => !isAuthorized && alert("This stage is locked. Please complete previous stages to unlock.")}
                                                        aria-disabled={!canAct}
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h3 className="font-black text-slate-900 text-lg">{s.name || `Stage ${i + 1}`}</h3>
                                                                    {!isAuthorized && <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700">Locked</span>}
                                                                    {stageStatus === 'active' && isAuthorized && <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-700">Live</span>}
                                                                    {stageStatus === 'completed' && <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">Completed</span>}
                                                                    {stageStatus === 'results' && <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">Results</span>}
                                                                </div>
                                                                {s.type ? (
                                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                                        {s.type.replace(/_/g, ' ')} {s.roundMode || s.mode ? `• ${String(s.roundMode || s.mode)}` : ''}
                                                                    </p>
                                                                ) : null}

                                                                {s.description ? (
                                                                    <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">{s.description}</p>
                                                                ) : null}

                                                                {(start || end) && (
                                                                    <div className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-500">
                                                                        <Calendar size={14} className="text-slate-400" />
                                                                        <span>
                                                                            {startDate ? startDate.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'TBD'}
                                                                            {' → '}
                                                                            {endDate ? endDate.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'TBD'}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {canAct && (
                                                                    <button type="button" className="px-5 py-2.5 bg-[#6C3BFF] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-purple-700 transition-colors">
                                                                        {actionLabel}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Winners for stages with results */}
                                                        {stageStatus === 'results' && eventLeaderboard.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-slate-100">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Winners</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {eventLeaderboard.slice(0, 3).map((entry, idx) => (
                                                                        <div key={entry.team_id || idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
                                                                            <span className={idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-slate-400' : 'text-amber-700'}>
                                                                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                                                            </span>
                                                                            {entry.team_name || entry.name || `Team ${idx + 1}`}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Per-stage FAQ link (scrolls to FAQ section) */}
                                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    faqRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                }}
                                                                className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1.5"
                                                            >
                                                                <HelpCircle size={12} /> FAQs
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            ) : null}

                            {hasDatesSection ? (
                                <div ref={datesRef}>
                                    <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
                                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                            <span className="w-1 h-7 bg-purple-600 rounded-full" />
                                            Dates &amp; deadlines
                                        </h2>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                    Registration deadline
                                                </p>
                                                <p className="mt-1 font-black text-slate-900">
                                                    {derivedDeadline
                                                        ? new Date(derivedDeadline).toLocaleString('en-GB', {
                                                              day: '2-digit',
                                                              month: 'short',
                                                              year: 'numeric',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          })
                                                        : '—'}
                                                </p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Start date</p>
                                                <p className="mt-1 font-black text-slate-900">
                                                    {derivedStartDate
                                                        ? new Date(derivedStartDate).toLocaleString('en-GB', {
                                                              day: '2-digit',
                                                              month: 'short',
                                                              year: 'numeric',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          })
                                                        : '—'}
                                                </p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">End date</p>
                                                <p className="mt-1 font-black text-slate-900">
                                                    {derivedEndDate
                                                        ? new Date(derivedEndDate).toLocaleString('en-GB', {
                                                              day: '2-digit',
                                                              month: 'short',
                                                              year: 'numeric',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          })
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>

                                        {Array.isArray(opportunity.stages) && opportunity.stages.length > 0 ? (
                                            <div className="space-y-3">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                                                    Stage timeline
                                                </h3>
                                                <div className="space-y-3">
                                                    {opportunity.stages.map((s: any, i: number) => {
                                                        const start = s?.startDate || s?.start_date;
                                                        const end = s?.endDate || s?.end_date;
                                                        const dl = s?.deadline;
                                                        const anyDate = start || end || dl;
                                                        if (!anyDate) return null;
                                                        const fmt = (d: any) => {
                                                            try {
                                                                return new Date(d).toLocaleString('en-GB', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                });
                                                            } catch {
                                                                return String(d);
                                                            }
                                                        };
                                                        return (
                                                            <div
                                                                key={s.id || `dates-${i}`}
                                                                className="p-4 rounded-xl bg-white border border-slate-200"
                                                            >
                                                                <p className="font-black text-slate-900">
                                                                    {s.name || `Stage ${i + 1}`}
                                                                </p>
                                                                <p className="text-sm text-slate-600 font-medium mt-1">
                                                                    {start && end ? (
                                                                        <>
                                                                            {fmt(start)} → {fmt(end)}
                                                                        </>
                                                                    ) : start ? (
                                                                        <>Starts: {fmt(start)}</>
                                                                    ) : end ? (
                                                                        <>Ends: {fmt(end)}</>
                                                                    ) : null}
                                                                    {dl ? (
                                                                        <span className="ml-2 text-slate-400 font-bold">
                                                                            (Deadline: {fmt(dl)})
                                                                        </span>
                                                                    ) : null}
                                                                </p>
                                                                {s.description ? (
                                                                    <p className="text-sm text-slate-600 font-medium mt-2 whitespace-pre-wrap">
                                                                        {String(s.description)}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </section>
                                </div>
                            ) : null}

                            {hasPrizesSection ? (
                                <div ref={prizesRef}>
                                    <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
                                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                            <span className="w-1 h-7 bg-purple-600 rounded-full" />
                                            Rewards &amp; prizes
                                        </h2>
                                        {prizePoolLabel ? (
                                            <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 flex items-center justify-between gap-6 shadow-sm">
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest text-purple-600 mb-1">
                                                        Total Prize Pool
                                                    </p>
                                                    <p className="text-2xl font-black text-slate-900">{prizePoolLabel}</p>
                                                    <p className="text-sm font-medium text-slate-500 mt-2">
                                                        Participate and stand a chance to win amazing rewards!
                                                    </p>
                                                </div>
                                                <div className="w-16 h-16 shrink-0 bg-white rounded-2xl shadow-sm border border-purple-100 flex items-center justify-center text-purple-600">
                                                    <Trophy size={32} strokeWidth={2} />
                                                </div>
                                            </div>
                                        ) : null}
                                        {(() => {
                                            const hasPlacementPrize = Array.isArray(prizesList) && prizesList.some((p: any) => {
                                                const pt = String(p.type || '').toLowerCase();
                                                const pb = String(p.badge_text || p.badge || '').toLowerCase();
                                                return pt.includes('placement') || pb.includes('placement') || pb.includes('ppo') || pb.includes('internship');
                                            });
                                            return hasPlacementPrize ? (
                                                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center gap-4 shadow-sm">
                                                    <div className="w-12 h-12 shrink-0 bg-white rounded-xl border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                                                        <Briefcase size={24} strokeWidth={1.5} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-blue-900">Grab Pre-Placement Interviews/Offers</p>
                                                        <p className="text-xs font-medium text-blue-700 mt-0.5">Top performers get direct interview opportunities</p>
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()}
                                        {Array.isArray(prizesList) && prizesList.length > 0 ? (
                                            <div className="space-y-4">
                                                    {prizesList.map((p: any, idx: number) => {
                                                    const amountStr = String(p.amount || p.value || '');
                                                    const isCash = amountStr.includes('₹') || amountStr.includes('$') || String(p.type || '').toLowerCase().includes('cash');

                                                    // Prize type detection for auto-icon mapping
                                                    const pType = String(p.type || '').toLowerCase();
                                                    const pBadge = String(p.badge_text || p.badge || '').toLowerCase();
                                                    const pTitle = String(p.title || p.rank || p.label || '').toLowerCase();
                                                    let detectedType: string | null = null;
                                                    if (pType.includes('placement') || pBadge.includes('placement') || pBadge.includes('ppo') || pBadge.includes('internship') || pTitle.includes('placement')) detectedType = 'placement';
                                                    else if (pType.includes('certificate') || pBadge.includes('certificate') || pTitle.includes('certificate')) detectedType = 'certificate';
                                                    else if (pType.includes('trophy') || pBadge.includes('trophy') || pType.includes('winner') || pTitle.match(/^(winner|1st|2nd|3rd)/i)) detectedType = 'trophy';

                                                    // Admin icon URL — only use if valid
                                                    const rawIconUrl = p.icon_url || p.image_url || p.icon || p.image;
                                                    const iconUrl = rawIconUrl && (String(rawIconUrl).startsWith('http') || String(rawIconUrl).startsWith('data:') || String(rawIconUrl).startsWith('/'))
                                                        ? rawIconUrl : null;
                                                    const badgeText = p.badge_text || p.badge;
                                                    const badgeIconUrl = p.badge_icon_url || p.badge_icon || p.badge_image;

                                                    return (
                                                        <div
                                                            key={p.id || `${idx}`}
                                                            className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col sm:flex-row sm:items-center transition-all hover:shadow-md"
                                                        >
                                                            {/* Glowing left edge for cash */}
                                                            {isCash && (
                                                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-400 shadow-[4px_0_24px_rgba(16,185,129,0.4)] z-10" />
                                                            )}
                                                            
                                                            {/* Left column: Type-based icon (Cash / Certificate / Trophy / Placement) */}
                                                            {(isCash || detectedType) && (
                                                                <>
                                                                    <div className={`w-36 shrink-0 flex flex-col justify-center items-center py-6 px-4 ${isCash ? 'bg-gradient-to-r from-emerald-50/40 to-transparent pl-6' : ''}`}>
                                                                        {isCash ? (
                                                                            <div className="text-center relative z-20">
                                                                                <p className="text-xl font-black text-emerald-700 tracking-tight">{amountStr || 'CASH'}</p>
                                                                                <p className="text-lg font-black text-emerald-900 uppercase tracking-widest mt-0.5">CASH</p>
                                                                            </div>
                                                                        ) : detectedType === 'placement' ? (
                                                                            <div className="relative z-20 h-14 w-14 flex items-center justify-center">
                                                                                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
                                                                                    <Briefcase size={24} strokeWidth={1.5} />
                                                                                </div>
                                                                            </div>
                                                                        ) : detectedType === 'certificate' ? (
                                                                            <div className="relative z-20 h-14 w-14 flex items-center justify-center">
                                                                                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500">
                                                                                    <Award size={24} strokeWidth={1.5} />
                                                                                </div>
                                                                            </div>
                                                                        ) : detectedType === 'trophy' ? (
                                                                            <div className="relative z-20 h-14 w-14 flex items-center justify-center">
                                                                                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                                                                                    <Trophy size={24} strokeWidth={1.5} />
                                                                                </div>
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                    {/* Vertical separator */}
                                                                    <div className="hidden sm:block w-px h-16 bg-slate-100 shrink-0" />
                                                                </>
                                                            )}

                                                            {/* Middle column: Admin icon URL + Title + Description */}
                                                            <div className={`flex-1 py-5 ${(isCash || iconUrl || detectedType) ? 'px-6' : 'px-8'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    {iconUrl && (
                                                                        <img src={iconUrl} alt="" className="w-9 h-9 object-contain shrink-0" />
                                                                    )}
                                                                    <p className="text-lg font-bold text-slate-800">
                                                                        {p.rank || p.title || p.label || `Prize ${idx + 1}`}
                                                                    </p>
                                                                </div>
                                                                {p.description ? (
                                                                    <p className="text-sm text-slate-500 font-medium mt-1 whitespace-pre-wrap">
                                                                        {String(p.description)}
                                                                    </p>
                                                                ) : null}
                                                            </div>

                                                            {/* Right column: Dynamic Admin Badge (No static fallback) */}
                                                            {badgeText ? (
                                                                <div className="shrink-0 px-6 pb-6 sm:pb-0 sm:py-6 flex justify-start sm:justify-end">
                                                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white shadow-sm hover:shadow transition-shadow">
                                                                        {badgeIconUrl ? (
                                                                            <img src={badgeIconUrl} alt="" className="w-5 h-5 object-contain" />
                                                                        ) : p.badge_emoji ? (
                                                                            <span role="img" aria-label="badge icon" className="text-sm">{p.badge_emoji}</span>
                                                                        ) : badgeText.toLowerCase().includes('certificate') ? (
                                                                            <Award size={14} className="text-purple-500" />
                                                                        ) : badgeText.toLowerCase().includes('placement') || badgeText.toLowerCase().includes('ppo') || badgeText.toLowerCase().includes('internship') || badgeText.toLowerCase().includes('interview') ? (
                                                                            <Briefcase size={14} className="text-blue-500" />
                                                                        ) : badgeText.toLowerCase().includes('trophy') || badgeText.toLowerCase().includes('winner') ? (
                                                                            <Trophy size={14} className="text-amber-500" />
                                                                        ) : null}
                                                                        <span className="text-xs font-bold text-slate-700">{badgeText}</span>
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-slate-600 text-sm font-medium">
                                                Prize details will be shared by the organiser.
                                            </p>
                                        )}
                                    </section>
                                </div>
                            ) : null}

                            {hasContactSection ? (
                                <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
                                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                        <span className="w-1 h-7 bg-purple-600 rounded-full" />
                                        Contact the organisers
                                    </h2>
                                    <div className="space-y-3">
                                        {contactList.map((c: any, idx: number) => {
                                            const email = String(c?.email || '').trim();
                                            return email ? (
                                                <button
                                                    key={c?.id || `${idx}`}
                                                    type="button"
                                                    onClick={() => window.location.href = `mailto:${email}`}
                                                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 hover:bg-slate-100 transition-colors text-left"
                                                >
                                                    <Mail size={16} className="text-purple-500 shrink-0" />
                                                    <span className="text-sm font-semibold text-slate-700 hover:text-purple-600">{email}</span>
                                                </button>
                                            ) : null;
                                        })}
                                    </div>
                                </section>
                            ) : null}

                            {hasAttachmentsSection ? (
                                <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
                                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                        <span className="w-1 h-7 bg-purple-600 rounded-full" />
                                        Download attachments
                                    </h2>
                                    <div className="space-y-3">
                                        {attachmentsList.map((a: any, idx: number) => {
                                            const label = String(a?.name || a?.title || a?.label || `Attachment ${idx + 1}`).trim();
                                            const url = String(a?.url || a?.href || a?.link || '').trim();
                                            return (
                                                <div
                                                    key={a?.id || `${idx}`}
                                                    className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="font-black text-slate-900 flex items-center gap-2">
                                                            <Paperclip size={16} className="text-purple-600 shrink-0" />
                                                            <span className="truncate">{label}</span>
                                                        </p>
                                                        {a?.type ? (
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                                                                {String(a.type)}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    {url ? (
                                                        <a
                                                            className="shrink-0 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-black text-purple-600 hover:bg-purple-50"
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            Download
                                                        </a>
                                                    ) : (
                                                        <span className="text-sm font-bold text-slate-400">—</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            ) : null}

                            {(opportunity.festivalName ||
                                opportunity.eventStartDate ||
                                opportunity.eventEndDate ||
                                opportunity.festivalDetails) ? (
                        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
                            <div className="space-y-4">
                                <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                    <span className="w-1 h-7 bg-purple-600 rounded-full" />
                                    Festival / program context
                                </h2>
                            </div>
                            {opportunity.festivalName ? (
                                <p className="text-lg font-black text-slate-800">{opportunity.festivalName}</p>
                            ) : null}
                            <div className="flex flex-wrap gap-6 text-sm font-bold text-slate-600">
                                {opportunity.eventStartDate ? (
                                    <span>Starts: {new Date(opportunity.eventStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                ) : null}
                                {opportunity.eventEndDate ? (
                                    <span>Ends: {new Date(opportunity.eventEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                ) : null}
                            </div>
                            {opportunity.festivalDetails ? (
                                (() => {
                                    const fh = sanitizePresentationHtml(richHtmlFromOpportunityField(opportunity.festivalDetails));
                                    return fh.trim() ? (
                                        <div
                                            className="opportunity-rich-text text-slate-600 font-medium leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_a]:text-purple-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-purple-600 [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:text-slate-700 [&_h1]:text-xl [&_h1]:font-black [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold"

                                            dangerouslySetInnerHTML={{ __html: fh }}
                                        />
                                    ) : (
                                        <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                            {plainTextFromRichContent(opportunity.festivalDetails)}
                                        </p>
                                    );
                                })()
                            ) : null}
                            {opportunity.websiteUrl ? (
                                <a
                                    href={opportunity.websiteUrl.startsWith('http') ? opportunity.websiteUrl : `https://${opportunity.websiteUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-purple-600 font-black text-sm hover:underline"
                                >
                                    Official website / link <ExternalLink size={16} />
                                </a>
                            ) : null}
                        </section>
                    ) : null}

                    {opportunity.skills && String(opportunity.skills).trim() ? (
                        <section className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-2xl font-black text-slate-900">Skills & focus areas</h2>
                                <div className="h-1.5 w-16 bg-purple-600 rounded-full" />
                            </div>
                            {(() => {
                                const sh = sanitizePresentationHtml(richHtmlFromOpportunityField(opportunity.skills));
                                return sh.trim() ? (
                                    <div
                                        className="opportunity-rich-text text-slate-600 font-medium leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6"
                                        dangerouslySetInnerHTML={{ __html: sh }}
                                    />
                                ) : (
                                    <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                        {plainTextFromRichContent(opportunity.skills)}
                                    </p>
                                );
                            })()}
                        </section>
                    ) : null}
                        </div>

                        {eventSubmissions.length > 0 || stats.submissions > 0 ? (
                            <>
                                {!hideExtras ? (
                                    <div ref={submissionsRef}>
                                        <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
                                            <div className="flex items-center justify-between gap-4 mb-5">
                                                <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                                    <span className="w-1 h-7 bg-purple-600 rounded-full" />
                                                    Live Submissions
                                                </h2>
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                                                    Auto refresh 30s
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-3 mb-5">
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full">
                                                    {stats.participants} Participants
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full">
                                                    {stats.teams} Teams
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">
                                                    {stats.submissions} Submissions
                                                </span>
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                {eventSubmissions.length > 0 ? (
                                                    eventSubmissions.slice(0, 6).map((sub: any, i: number) => (
                                                        <div key={sub._id || i} className={`p-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white flex items-center gap-4 ${i >= 4 ? 'hidden sm:flex' : ''} ${i >= 2 ? 'opacity-70' : ''}`}>
                                                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-sm">
                                                                {(sub.teamName || sub.teamLead || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-black text-slate-900 truncate">{sub.teamName || sub.teamLead || 'Anonymous'}</p>
                                                                <p className="text-xs text-slate-500 font-bold">
                                                                    {sub.createdAt ? (() => {
                                                                        const mins = Math.floor((Date.now() - new Date(sub.createdAt).getTime()) / 60000);
                                                                        return mins < 1 ? 'Just now' : mins < 60 ? `${mins} minutes ago` : `${Math.floor(mins / 60)}h ago`;
                                                                    })() : sub.domain || `${Array.isArray(sub.teamMembers) ? sub.teamMembers.length : 0} members`}
                                                                </p>
                                                            </div>
                                                            {sub.totalScore > 0 && (
                                                                <div className="ml-auto text-right shrink-0">
                                                                    <p className="text-lg font-black text-purple-600">{Number(sub.totalScore).toFixed(1)}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-2 py-12 text-center text-slate-400 font-bold text-sm">
                                                        No submissions yet. Be the first to submit!
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                ) : (
                                    <div ref={submissionsRef} />
                                )}

                                {!hideLeaderboard ? (
                                    <div ref={leaderboardRef} className="mt-8">
                                        <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
                                            <div className="flex items-center justify-between mb-6">
                                                <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                                    <span className="w-1 h-7 bg-amber-400 rounded-full" />
                                                    Leaderboard
                                                </h2>
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-3 py-1 rounded-full">Top Teams</span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {eventLeaderboard.length > 0 ? (
                                                    eventLeaderboard.map((entry, idx) => (
                                                        <div key={entry._id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition-colors">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                                                                    idx === 0 ? 'bg-amber-100 text-amber-700' : 
                                                                    idx === 1 ? 'bg-slate-200 text-slate-600' :
                                                                    idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'
                                                                }`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-black text-slate-900 truncate">{entry.teamName}</p>
                                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{entry.domain}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-black text-purple-600">{Number(entry.totalScore || 0).toFixed(1)}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-12 text-center">
                                                        <div className="inline-flex p-4 rounded-full bg-slate-50 mb-4">
                                                            <Users size={32} className="text-slate-200" />
                                                        </div>
                                                        <p className="text-slate-400 font-bold">The competition has just begun. Leaderboard will update soon.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                ) : null}
                            </>
                        ) : null}

                        <div ref={reviewsRef}>
                            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setReviewExpanded(prev => !prev)}
                                    className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                                >
                                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                        <span className="w-1 h-7 bg-purple-600 rounded-full" />
                                        Feedback &amp; rating
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        {opportunity?.average_rating > 0 && (
                                            <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
                                                <Star size={14} className="fill-amber-400 stroke-amber-400" />
                                                <span className="text-sm font-black">{opportunity.average_rating.toFixed(1)}</span>
                                                <span className="text-[10px] uppercase font-bold ml-1">({opportunity.total_reviews})</span>
                                            </div>
                                        )}
                                        {reviewExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                    </div>
                                </button>

                                {reviewExpanded && (
                                    <div className="px-6 md:px-8 pb-6 md:pb-8 space-y-6">
                                        {isApplied && !reviewSuccess ? (
                                            <form onSubmit={handleReviewSubmit} className="border border-slate-100 bg-slate-50 p-4 md:p-6 rounded-2xl">
                                                <h3 className="text-sm font-black text-slate-800 mb-4">Write your review</h3>
                                                <div className="flex items-center gap-2 mb-4">
                                                    {[1, 2, 3, 4, 5].map(num => (
                                                        <button 
                                                            key={num} type="button" 
                                                            onClick={() => setReviewForm(prev => ({ ...prev, rating: num }))}
                                                            className={`p-1 hover:scale-110 transition-transform ${reviewForm.rating >= num ? 'text-amber-400' : 'text-slate-300'}`}
                                                        >
                                                            <Star size={28} className={reviewForm.rating >= num ? 'fill-amber-400' : ''} />
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    rows={3}
                                                    required
                                                    value={reviewForm.text}
                                                    onChange={e => setReviewForm(prev => ({ ...prev, text: e.target.value }))}
                                                    placeholder="What did you think about this opportunity? Your feedback helps others!"
                                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all resize-none mb-4"
                                                />
                                                <div className="flex justify-end">
                                                    <button 
                                                        type="submit" 
                                                        disabled={reviewSubmitting || reviewForm.rating === 0}
                                                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                    >
                                                        {reviewSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                        Submit Review
                                                    </button>
                                                </div>
                                            </form>
                                        ) : reviewSuccess ? (
                                            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                                <CheckCircle2 className="shrink-0" />
                                                <p className="text-sm font-bold">Thanks for your feedback! Your review has been published.</p>
                                            </div>
                                        ) : !isApplied ? (
                                            <button
                                            type="button"
                                            onClick={() => {
                                                setShowRegistrationModal(true);
                                                setReviewExpanded(false);
                                            }}
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center hover:bg-slate-100 transition-colors cursor-pointer"
                                        >
                                            <p className="text-slate-500 text-sm font-medium">
                                                Register for this opportunity to give your feedback and review.
                                            </p>
                                        </button>
                                        ) : null}

                                        <div className="space-y-4">
                                            {reviews.length > 0 ? (
                                                reviews.map(rev => (
                                                    <div key={rev._id} className="border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition-colors">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs uppercase">
                                                                    {rev.user_name?.charAt(0) || 'U'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-900">{rev.user_name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-500">
                                                                        {new Date(rev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-0.5">
                                                                {[1, 2, 3, 4, 5].map(num => (
                                                                    <Star key={num} size={14} className={rev.rating >= num ? "fill-amber-400 stroke-amber-400" : "fill-slate-100 stroke-slate-200"} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                            {rev.review_text}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-sm font-bold text-slate-400 py-8">No reviews yet. Be the first to share your experience!</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Dynamic sections from backend schema */}
                        {opportunity.sections && opportunity.sections.length > 0 && (
                            <SectionRenderer sections={opportunity.sections} />
                        )}

                        {!hideExtras ? (
                            <div ref={faqRef}>
                                {opportunity.faqs && opportunity.faqs.length > 0 ? (
                                    <EventFAQ faqs={opportunity.faqs} title="Frequently Asked Questions" opportunityTitle={opportunity.title} />
                                ) : (
                                    <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="flex border-b border-slate-200">
                                            <button className="flex-1 py-4 text-center font-black text-purple-600 border-b-2 border-purple-600 bg-purple-50/30">
                                                FAQs
                                            </button>
                                            <button className="flex-1 py-4 text-center font-bold text-slate-500 hover:text-slate-800 transition-colors">
                                                Discussions
                                            </button>
                                        </div>
                                        <div className="p-6 md:p-8">
                                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                                <span className="shrink-0 px-4 py-2 bg-slate-800 text-white text-xs font-black rounded-full cursor-pointer hover:bg-slate-700">All</span>
                                                <span className="shrink-0 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-full cursor-pointer hover:bg-slate-200">Registration</span>
                                                <span className="shrink-0 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-full cursor-pointer hover:bg-slate-200">Coding Challenge</span>
                                            </div>
                                            <div className="space-y-4">
                                                {['Can I change my team members after registering for this competition?', 'Why is my college name not mentioned in the eligible institutes?', 'How can I delete my registration from this opportunity?', 'I am unable to verify my phone number. What should I do?'].map((q, idx) => (
                                                    <div key={idx} className="border-b border-slate-100 pb-4">
                                                        <button className="w-full flex items-center justify-between text-left group">
                                                            <span className="text-sm font-bold text-slate-700 group-hover:text-purple-600 transition-colors pr-4">{q}</span>
                                                            <span className="shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                            </span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <p className="text-sm font-bold text-slate-600">
                                                    Can't find the answer you are looking for? <span className="text-purple-600 cursor-pointer hover:underline">Ask a question (Be specific)</span>
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </div>
                        ) : (
                            <div ref={faqRef} />
                        )}

                        {related.length > 0 ? (
                            <section className="space-y-6 pt-4 border-t border-slate-100">
                                <h2 className="text-xl font-black text-slate-900 px-1">
                                    Related opportunities & Articles
                                </h2>
                                <div className="flex overflow-x-auto gap-4 pb-6 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                                    {related.map((r: any) => (
                                        <Link
                                            key={String(r._id)}
                                            to={`/opportunities/${r._id}`}
                                            className="min-w-[280px] max-w-[280px] sm:min-w-[320px] sm:max-w-[320px] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:border-purple-300 hover:shadow-lg transition-all snap-start flex flex-col group"
                                        >
                                            <div className="h-40 bg-slate-100 relative overflow-hidden">
                                                {r.banner_url ? (
                                                    <img src={getImageUrl(r.banner_url)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-indigo-50"></div>
                                                )}
                                                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-700">
                                                    {r.type || 'Opportunity'}
                                                </div>
                                            </div>
                                            <div className="p-5 flex-1 flex flex-col">
                                                <p className="font-black text-slate-900 line-clamp-2 text-lg leading-tight mb-2 group-hover:text-purple-600 transition-colors">
                                                    {r.title}
                                                </p>
                                                <p className="text-sm text-slate-500 font-bold line-clamp-1 mt-auto">
                                                    {r.organization || r.institution_profile_name || 'Host'}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        ) : null}

                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium pt-2">
                            <Link to="/" className="hover:text-purple-600 transition-colors flex items-center gap-1">
                                <Home size={12} />
                            </Link>
                            <span className="text-slate-300">/</span>
                            <Link to="/opportunities" className="hover:text-purple-600 transition-colors capitalize">
                                {opportunity.category || opportunity.opportunity_type || 'Opportunity'}
                            </Link>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-500 truncate max-w-[200px]">{opportunity.title}</span>
                        </nav>

                        <footer className="text-xs text-slate-500 font-medium space-y-3 pt-2 pb-4">
                            <p>
                                Updated on:{' '}
                                {opportunity.updatedAt || opportunity.updated_at
                                    ? new Date(opportunity.updatedAt || opportunity.updated_at).toLocaleString('en-GB', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          timeZoneName: 'short',
                                      })
                                    : '—'}
                            </p>
                            <p className="text-slate-400">The data on this page gets updated every 15 minutes.</p>
                            <p>
                                This opportunity has been listed by {orgDisplay}. Studlyf is not liable for any content
                                mentioned in this opportunity or the process followed by the organizers.
                            </p>
                            <button
                                type="button"
                                onClick={() => window.location.href = 'mailto:support@studlyf.com?subject=Report Issue&body=' + encodeURIComponent(`Issue with: ${opportunity.title}\n${window.location.href}`)}
                                className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                                <AlertCircle size={12} /> Report an Issue
                            </button>
                        </footer>
                    </>
                )}
                </div>
                
                {/* Right Column: Sticky Registration Card */}
                {activeTab !== 'team' && activeTab !== 'submissions' && (
                    <div className="w-full lg:w-[350px] shrink-0 sticky top-24 space-y-4">
                        <div className="relative">
                            {/* Unique Tab Header */}
                            {timeLeftStr && (
                                <div className="absolute -top-7 left-0 bg-black text-white px-5 py-2 rounded-t-xl rounded-br-2xl shadow-md z-10 flex items-center gap-2">
                                    <Clock size={14} className="text-[#ff6b00]" />
                                    <span className="text-sm font-bold tracking-tight whitespace-nowrap">{timeLeftStr}</span>
                                    {/* The curved cut-out effect can be simulated by the border radii above */}
                                </div>
                            )}

                            {/* Main Card */}
                            <div className="bg-white rounded-[2rem] border-2 border-slate-200 shadow-sm overflow-hidden relative z-0 mt-3 pt-6 pb-6 px-6">
                                {/* User Info Mini */}
                                {user ? (
                                    <div className="flex items-center gap-3 mb-5 p-2">
                                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200 shrink-0 overflow-hidden">
                                            {sidebarProfilePhoto ? (
                                                <AvatarImage src={sidebarProfilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-purple-700 font-black text-xl">
                                                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-slate-800 text-base leading-tight truncate">{user.full_name || 'Student'}</p>
                                            {user.email && (
                                                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{user.email}</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 mb-5 p-2">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 shrink-0">
                                            <span className="text-slate-400 font-black text-xl">?</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-600 text-sm leading-snug">
                                                Hi! Please{' '}
                                                <Link to="/login" className="text-purple-600 font-bold hover:underline">login</Link>
                                                {' '}or{' '}
                                                <Link to="/register" className="text-purple-600 font-bold hover:underline">register</Link>
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">to participate in this opportunity</p>
                                        </div>
                                    </div>
                                )}

                                {/* Main CTA Button */}
                                {(() => {
                                    switch (regCTA.variant) {
                                        case 'loading':
                                            return (
                                                <button type="button" disabled className="w-full py-3.5 bg-slate-300 text-white rounded-full text-base font-bold tracking-wide shadow-md flex justify-center items-center gap-2">
                                                    <Loader2 size={18} className="animate-spin" /> Checking...
                                                </button>
                                            );
                                        case 'external':
                                            return (
                                                <a href={regCTA.url} target="_blank" rel="noopener noreferrer" className="w-full py-3.5 bg-[#0070F3] hover:bg-blue-600 text-white rounded-full text-base font-bold tracking-wide transition-all shadow-md flex justify-center items-center">
                                                    {regCTA.label}
                                                </a>
                                            );
                                        case 'closed':
                                            return (
                                                <button type="button" disabled className="w-full py-3.5 bg-amber-700 text-white rounded-full text-base font-bold tracking-wide shadow-md flex justify-center items-center gap-2 cursor-not-allowed opacity-90">
                                                    <XCircle size={18} /> {regCTA.label}
                                                </button>
                                            );
                                        case 'team_full':
                                            return (
                                                <button type="button" disabled className="w-full py-3.5 bg-amber-400 text-white rounded-full text-base font-bold tracking-wide shadow-md flex justify-center items-center gap-2 cursor-not-allowed">
                                                    <Users size={18} /> {regCTA.label}
                                                </button>
                                            );
                                        case 'registered':
                                            return canEditSubmittedRegistration ? (
                                                <button type="button" onClick={() => setShowRegistrationModal(true)} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-base font-bold tracking-wide shadow-md flex justify-center items-center gap-2 transition-all cursor-pointer">
                                                    <CheckCircle2 size={20} /> Update Registration
                                                </button>
                                            ) : (
                                                <button type="button" disabled className="w-full py-3.5 bg-emerald-500 text-white rounded-full text-base font-bold tracking-wide shadow-md flex justify-center items-center gap-2 opacity-80 cursor-not-allowed">
                                                    <CheckCircle2 size={20} /> {regCTA.label}
                                                </button>
                                            );
                                        case 'register':
                                        default:
                                            return (
                                                <button type="button" onClick={() => setShowRegistrationModal(true)} className="w-full py-3.5 bg-[#0070F3] hover:bg-blue-600 text-white rounded-full text-base font-bold tracking-wide transition-all shadow-md flex justify-center items-center">
                                                    {regCTA.label}
                                                </button>
                                            );
                                    }
                                })()}

                                <div className="mt-5 flex items-center justify-center text-slate-600 font-semibold text-sm">
                                    <span><span className="text-slate-800 font-bold">{(stats.participants || 0).toLocaleString()}</span> Registered</span>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Refer Banner */}
                        <div 
                            onClick={() => setShowReferModal(true)}
                            className="w-full relative rounded-[1.5rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all group border border-slate-200"
                        >
                            {opportunity?.refer_banner_url || opportunity?.refer_banner_image ? (
                                <img 
                                    src={opportunity.refer_banner_url || opportunity.refer_banner_image} 
                                    alt="Refer & Win" 
                                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 flex items-center justify-between">
                                    <div className="flex flex-col gap-1 pr-4">
                                        <div className="font-black italic text-slate-800 text-xl leading-tight">
                                            Refer & Win
                                        </div>
                                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                                            Win Exciting Prizes
                                        </div>
                                    </div>
                                    <button className="px-5 py-2.5 bg-[#002244] text-white rounded-full text-xs font-black tracking-wider flex items-center gap-2 group-hover:bg-blue-600 transition-colors shadow-md">
                                        <Share2 size={14} /> Refer now
                                    </button>
                                </div>
                            )}
                        </div>


                    </div>
                )}
            </div>

            {/* Full-width Bottom Footer */}
            <div className="border-t border-slate-100 mt-6 pt-6 pb-8 text-center space-y-1.5">
                <a href="/" className="inline-flex items-center gap-2 text-[12px] font-bold text-slate-500 hover:text-purple-600 transition-colors">
                    <img src="/images/studlyf_secondary.png" alt="Studlyf" className="h-5 w-auto" />
                    <span>Powered by Studlyf</span>
                </a>
            </div>

            {/* Registration Modal */}
            <AnimatePresence>
                {showRegistrationModal && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => {
                        }}
                    >
                        <motion.div
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                        {submitted && canEditSubmittedRegistration ? 'Update Registration' : 'Decoupled Event Onboarding'}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1">{opportunity?.title}</p>
                                </div>
                                <button
                                    onClick={() => setShowRegistrationModal(false)}
                                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                                >
                                    <span className="text-slate-500 font-bold">✕</span>
                                </button>
                            </div>

                            {submitted && !canEditSubmittedRegistration ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                                    <h3 className="text-lg font-black text-slate-900">Registration Submitted!</h3>
                                    <p className="text-sm text-slate-500 mt-2">
                                            {registrationStatus === 'PENDING_APPROVAL' 
                                                ? 'Your registration is under host review. Downstream timeline rounds will unlock once approved!'
                                                : 'Your registration is approved. All competition assessment stages are unlocked!'}
                                        </p>
                                        
                                        {teamInviteCodeResponse && (
                                            <div className="mt-6 p-4 bg-purple-50 border-2 border-purple-100 rounded-2xl w-full max-w-sm mx-auto">
                                                <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">Your Team Invite Code</p>
                                                <div className="flex items-center justify-between bg-white border border-purple-200 rounded-xl p-2 px-4 shadow-sm">
                                                    <span className="font-black text-lg text-slate-800 tracking-[0.2em]">{teamInviteCodeResponse}</span>
                                                    <button type="button" onClick={() => { navigator.clipboard.writeText(teamInviteCodeResponse); alert("Code copied!"); }} className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors" title="Copy Code">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-bold mt-2">Share this code with your teammates so they can join!</p>
                                            </div>
                                        )}

                                    <button
                                        onClick={() => {
                                            setShowRegistrationModal(false);
                                            scrollToSection('details');
                                        }}
                                        className="mt-6 px-6 py-3 bg-[#6C3BFF] text-white rounded-xl font-black text-xs uppercase tracking-wider"
                                    >
                                        Go to Details
                                    </button>
                                </div>
                            ) : (
                                (() => {
                                    // Simplify registration UI: render one admin-driven step
                                    const customQuestionsList = formConfig?.custom_questions || [];
                                    const allAdminFields = [ ...(formConfig?.fields_definitions || []), ...customQuestionsList ];

                                    // Ensure common identity fields appear first: Full Name, Email, Phone
                                    const fieldPriority = [
                                        /full\s*name/i,
                                        /^name$/i,
                                        /email/i,
                                        /phone/i,
                                        /mobile/i,
                                        /location/i,
                                        /date\s*of\s*birth/i,
                                        /\bdob\b/i,
                                        /gender/i,
                                        /skills?/i,
                                        /college/i,
                                        /degree/i,
                                        /branch|department/i,
                                        /graduation\s*year/i,
                                        /cgpa/i,
                                    ];

                                    const orderedFields = [...allAdminFields]
                                        .map((field: any, index: number) => ({ field, index }))
                                        .sort((a, b) => {
                                            const aText = `${String(a.field.id || '')} ${String(a.field.label || '')}`;
                                            const bText = `${String(b.field.id || '')} ${String(b.field.label || '')}`;
                                            const aRank = fieldPriority.findIndex((rx) => rx.test(aText));
                                            const bRank = fieldPriority.findIndex((rx) => rx.test(bText));
                                            const rankA = aRank === -1 ? 99 : aRank;
                                            const rankB = bRank === -1 ? 99 : bRank;
                                            if (rankA !== rankB) return rankA - rankB;
                                            return a.index - b.index;
                                        })
                                        .map((item) => item.field);

                                    const pType = String(opportunity?.participationType || opportunity?.participation_type || 'individual').toLowerCase();
                                    const allowsTeams = pType === 'team' || pType === 'both';

                                    const activeSteps = orderedFields.length > 0 ? [{ id: 'registration', title: 'Registration', fields: orderedFields, type: 'core' }] : (allowsTeams ? [{ id: 'team_details', title: 'Team', fields: [], type: 'team' }] : []);

                                    if (activeSteps.length === 0) {
                                        return (
                                            <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4">
                                                <p className="text-sm text-slate-500 text-center py-8">
                                                    No special registration fields are configured. Click submit to register.
                                                </p>
                                                <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowRegistrationModal(false)}
                                                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={submitting}
                                                        className="px-6 py-2.5 bg-[#6C3BFF] hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                                                    >
                                                        {submitting ? <Loader2 size={14} className="animate-spin" /> : submitted ? 'Update Registration' : 'Register'}
                                                    </button>
                                                </div>
                                            </form>
                                        );
                                    }

                                    const currentStep = activeSteps[currentStepIndex] || activeSteps[0];

                                    return (
                                        <>
                                            {/* Wizard Progress Indicator */}
                                            <div className="flex items-center justify-between px-6 py-3 bg-purple-50/50 border-b border-slate-100 shrink-0">
                                                {activeSteps.map((stepItem, idx) => (
                                                    <React.Fragment key={stepItem.id}>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                                                                ${idx === currentStepIndex ? 'bg-[#6C3BFF] text-white ring-4 ring-purple-100' :
                                                                  idx < currentStepIndex ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                                                            >
                                                                {idx < currentStepIndex ? '✓' : idx + 1}
                                                            </div>
                                                            <span className={`text-[11px] font-bold hidden sm:inline ${idx === currentStepIndex ? 'text-[#6C3BFF]' : 'text-slate-500'}`}>
                                                                {stepItem.title}
                                                            </span>
                                                        </div>
                                                        {idx < activeSteps.length - 1 && (
                                                            <div className={`flex-1 h-0.5 mx-2 ${idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>

                                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                                                <div className="space-y-4">
                                                    {currentStep.type === 'team' ? (
                                                        <div className="space-y-6">
                                                            <label className="text-sm font-black text-slate-900">How would you like to participate?</label>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                {String(opportunity?.participationType || opportunity?.participation_type || 'individual').toLowerCase() === 'both' && (
                                                                    <button type="button" onClick={() => setTeamAction('individual')} className={`p-4 rounded-xl border-2 text-left transition-all ${teamAction === 'individual' ? 'border-[#6C3BFF] bg-purple-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                                        <div className="font-black text-slate-800 text-sm">Individual</div>
                                                                        <div className="text-[10px] text-slate-500 font-bold mt-1">Participate solo</div>
                                                                    </button>
                                                                )}
                                                                <button type="button" onClick={() => setTeamAction('create')} className={`p-4 rounded-xl border-2 text-left transition-all ${teamAction === 'create' ? 'border-[#6C3BFF] bg-purple-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                                    <div className="font-black text-slate-800 text-sm">Create Team</div>
                                                                    <div className="text-[10px] text-slate-500 font-bold mt-1">Form a new team</div>
                                                                </button>
                                                                <button type="button" onClick={() => setTeamAction('join')} className={`p-4 rounded-xl border-2 text-left transition-all ${teamAction === 'join' ? 'border-[#6C3BFF] bg-purple-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                                    <div className="font-black text-slate-800 text-sm">Join Team</div>
                                                                    <div className="text-[10px] text-slate-500 font-bold mt-1">Use an invite code</div>
                                                                </button>
                                                            </div>

                                                            {teamAction === 'create' && (
                                                                <div className="space-y-2 mt-4">
                                                                    <label className="text-xs font-bold text-slate-700">Team Name <span className="text-rose-500">*</span></label>
                                                                    <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Code Ninjas" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                                                                </div>
                                                            )}

                                                            {teamAction === 'join' && (
                                                                <div className="space-y-2 mt-4">
                                                                    <label className="text-xs font-bold text-slate-700">Team Invite Code <span className="text-rose-500">*</span></label>
                                                                    <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Enter 12-character code" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all uppercase" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        (currentStep.fields || []).map((field: any) => {

                                                        const isEmail = field.id === 'email';
                                                        const isPrefilled = Boolean(field.prefilled_value);
                                                        const allowedExts = field.type === 'file' ? getFieldAllowedExtensions(field) : [];
                                                        const acceptAttr = allowedExts.join(',');
                                                        const displayFormats = allowedExts.map(e => e.replace('.', '').toUpperCase()).join(', ');
                                                        
                                                        return (
                                                            <div key={field.id} className="space-y-1.5">
                                                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                                    {field.label}
                                                                    {field.required && <span className="text-rose-500">*</span>}
                                                                    {isPrefilled && (
                                                                        <span className="text-[9px] bg-purple-50 text-[#6C3BFF] border border-purple-100 px-1.5 py-0.5 rounded ml-auto font-bold">
                                                                            Prefilled
                                                                        </span>
                                                                    )}
                                                                </label>

                                                                {field.type === 'file' ? (
                                                                    <div className="space-y-2">
                                                                        <input
                                                                            type="file"
                                                                            id={`file-${field.id}`}
                                                                            accept={acceptAttr}
                                                                            className="hidden"
                                                                            onChange={e => {
                                                                                const file = e.target.files?.[0];
                                                                                if (file) {
                                                                                    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                                                                                    if (!allowedExts.includes(ext)) {
                                                                                        alert(`Only ${displayFormats} files are allowed.`);
                                                                                        return;
                                                                                    }
                                                                                    handleFileUpload(field.id, file);
                                                                                }
                                                                            }}
                                                                        />
                                                                        {uploadingField === field.id ? (
                                                                            <div className="flex items-center gap-3 p-3 border border-[#6C3BFF]/30 rounded-xl bg-[#6C3BFF]/5 animate-pulse">
                                                                                <Loader2 className="animate-spin text-[#6C3BFF]" size={18} />
                                                                                <span className="text-xs text-[#6C3BFF] font-semibold animate-pulse">
                                                                                    Uploading your file... Please wait.
                                                                                </span>
                                                                            </div>
                                                                        ) : regAnswers[field.id] ? (
                                                                            <div className="flex items-center justify-between gap-4 p-3 border border-emerald-200 rounded-xl bg-emerald-50/40 shadow-sm transition-all duration-200">
                                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                                                                                        <Paperclip size={16} />
                                                                                    </div>
                                                                                    <div className="flex flex-col min-w-0">
                                                                                        <span className="text-xs text-emerald-800 font-bold truncate">
                                                                                            {uploadedFilenames[field.id] || String(regAnswers[field.id]).split('/').pop()}
                                                                                        </span>
                                                                                        <span className="text-[10px] text-emerald-600/80 font-semibold flex items-center gap-1">
                                                                                            <CheckCircle2 size={10} /> Uploaded successfully
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <label
                                                                                        htmlFor={`file-${field.id}`}
                                                                                        className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-sm"
                                                                                    >
                                                                                        Change
                                                                                    </label>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setRegAnswers(prev => {
                                                                                                const copy = { ...prev };
                                                                                                delete copy[field.id];
                                                                                                return copy;
                                                                                            });
                                                                                            setUploadedFilenames(prev => {
                                                                                                const copy = { ...prev };
                                                                                                delete copy[field.id];
                                                                                                return copy;
                                                                                            });
                                                                                        }}
                                                                                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors animate-fade-in"
                                                                                        title="Remove file"
                                                                                    >
                                                                                        <XCircle size={16} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col gap-1.5">
                                                                                <div className="flex items-center gap-3 p-3 border border-dashed border-slate-350 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400 transition-colors">
                                                                                    <label
                                                                                        htmlFor={`file-${field.id}`}
                                                                                        className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
                                                                                    >
                                                                                        <Upload size={14} /> Choose File
                                                                                    </label>
                                                                                    <span className="text-xs text-slate-400 font-medium">
                                                                                        Accepts {displayFormats} only
                                                                                    </span>
                                                                                </div>
                                                                                {field.placeholder && (
                                                                                    <span className="text-[10px] text-slate-500 font-medium px-1">
                                                                                        {field.placeholder}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : field.type === 'textarea' || field.type === 'paragraph' ? (
                                                                    <textarea
                                                                        value={regAnswers[field.id] ?? field.prefilled_value ?? ''}
                                                                        onChange={e => setRegAnswers(p => ({ ...p, [field.id]: e.target.value }))}
                                                                        readOnly={isEmail}
                                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm resize-none min-h-[90px] focus:border-[#6C3BFF] transition-colors"
                                                                    />
                                                                ) : field.type === 'checkbox' ? (
                                                                    <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={regAnswers[field.id] === 'true' || regAnswers[field.id] === 'on'}
                                                                            onChange={e => setRegAnswers(p => ({ ...p, [field.id]: e.target.checked ? 'on' : '' }))}
                                                                            className="rounded border-slate-300 text-[#6C3BFF] focus:ring-[#6C3BFF]"
                                                                        />
                                                                        {field.label}
                                                                    </label>
                                                                ) : field.type === 'select' || field.type === 'dropdown' ? (
                                                                    <select
                                                                        value={regAnswers[field.id] ?? field.prefilled_value ?? ''}
                                                                        onChange={e => setRegAnswers(p => ({ ...p, [field.id]: e.target.value }))}
                                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-[#6C3BFF] transition-colors"
                                                                    >
                                                                        <option value="">Select option</option>
                                                                        {(field.options || []).map((o: string) => (
                                                                            <option key={o} value={o}>{o}</option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <input
                                                                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                                                        value={regAnswers[field.id] ?? field.prefilled_value ?? ''}
                                                                        onChange={e => setRegAnswers(p => ({ ...p, [field.id]: e.target.value }))}
                                                                        readOnly={isEmail}
                                                                        placeholder={field.placeholder || (field.id === 'college' ? ((user?.role === 'professional' || user?.isProfessional) ? 'e.g. Google, Stripe' : 'e.g. Stanford University') : '')}
                                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-[#6C3BFF] transition-colors"
                                                                    />
                                                                )}
                                                                {field.help_text && (
                                                                    <p className="text-[10px] text-slate-400 font-medium">{field.help_text}</p>
                                                                )}
                                                            </div>
                                                        );
                                                    }))}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex justify-between items-center pt-4 border-t border-slate-100 shrink-0">
                                                    <button
                                                        type="button"
                                                        disabled={currentStepIndex === 0}
                                                        onClick={() => setCurrentStepIndex(p => Math.max(0, p - 1))}
                                                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30"
                                                    >
                                                        Back
                                                    </button>
                                                    
                                                    {currentStepIndex < activeSteps.length - 1 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const activeStep = activeSteps[currentStepIndex];
                                                                let valid = true;
                                                                for (const fd of activeStep.fields) {
                                                                    if (fd.required && !regAnswers[fd.id]) {
                                                                        alert(`${fd.label} is required.`);
                                                                        valid = false;
                                                                        break;
                                                                    }
                                                                }
                                                                if (valid) {
                                                                    setCurrentStepIndex(p => Math.min(activeSteps.length - 1, p + 1));
                                                                }
                                                            }}
                                                            className="px-6 py-2.5 bg-[#6C3BFF] hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                                        >
                                                            Next
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="submit"
                                                            disabled={submitting}
                                                            className="px-6 py-2.5 bg-[#6C3BFF] hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
                                                        >
                                                            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                                                            {submitting ? 'Submitting...' : submitted ? 'Update Registration' : 'Submit Registration'}
                                                        </button>
                                                    )}
                                                </div>
                                            </form>
                                        </>
                                    );
                                })()
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hackathon Submission Modal */}
            {/* Refer & Win Modal */}
            <AnimatePresence>
                {showReferModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pt-20 sm:pt-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowReferModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-[480px] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col z-10"
                        >
                            {/* Close button top right */}
                            <button 
                                onClick={() => setShowReferModal(false)}
                                className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-slate-800 transition-colors"
                            >
                                <XCircle size={20} />
                            </button>

                            {/* Banner Header */}
                            <div className="bg-[#EBF3FC] p-6 relative overflow-hidden flex items-center min-h-[140px]">
                                <div className="relative z-10 flex-1 pr-32">
                                    <h3 className="text-2xl font-black italic text-[#002244] tracking-tight mb-2">Refer & Win</h3>
                                    <p className="text-xs font-bold text-[#002244]/80 mb-3 leading-snug">
                                        Win Macbook, iPhone, Apple watch, Cash & More.
                                    </p>
                                    <button className="text-xs font-black text-[#002244] underline decoration-2 underline-offset-4 hover:text-blue-600">
                                        Know more
                                    </button>
                                </div>
                                {/* Emulated graphical banner side with emojis/images */}
                                <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 flex flex-col gap-1 drop-shadow-xl select-none pointer-events-none transform rotate-[-10deg]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-4xl filter drop-shadow-md">💰</span>
                                        <span className="text-5xl filter drop-shadow-md">💻</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-5xl filter drop-shadow-md">📱</span>
                                        <span className="text-4xl filter drop-shadow-md">🎧</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <p className="text-sm font-semibold text-slate-600 mb-4">Share with</p>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <button className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md" title="X (Twitter)">
                                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                                    </button>
                                    <button className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md" title="WhatsApp">
                                        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                    </button>
                                    <button className="w-12 h-12 rounded-full bg-[#0077b5] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md" title="LinkedIn">
                                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                    </button>
                                    <button className="w-12 h-12 rounded-full bg-[#EA4335] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md" title="Email">
                                        <Mail size={22} className="fill-current text-white stroke-none" />
                                    </button>
                                    
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            // Optionally toast here
                                        }}
                                        className="ml-auto px-5 py-2.5 rounded-full border border-slate-300 bg-white text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm font-bold text-sm"
                                    >
                                        <Copy size={16} /> Copy
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OpportunityDetails;
