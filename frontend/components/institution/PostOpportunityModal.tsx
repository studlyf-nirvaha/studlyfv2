import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Info, ChevronRight, Save, Plus, Trash2, Calendar, Trophy, Users, FileText, ArrowLeft, HeadphonesIcon, ChevronDown, ChevronUp, Lock, RefreshCw, UploadCloud } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs';
import { API_BASE_URL, authHeaders } from '../../apiConfig';

interface PostOpportunityModalProps {
    isOpen: boolean;
    onClose: () => void;
    institutionId?: string;
    eventId?: string;
}

const PostOpportunityModal: React.FC<PostOpportunityModalProps> = ({ isOpen, onClose, institutionId, eventId }) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const faqRef = React.useRef<any[]>([]);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [bulkImportText, setBulkImportText] = useState('');
    const [bulkImportLoading, setBulkImportLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [festivalLogoPreview, setFestivalLogoPreview] = useState<string | null>(null);
    const [festivalBannerPreview, setFestivalBannerPreview] = useState<string | null>(null);
    const [opportunityBannerPreview, setOpportunityBannerPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        organisation: '', 
        opportunityType: 'Hackathons & Coding Challenges',
        opportunitySubType: 'Online Coding Challenge',
        festivalName: '',
        websiteUrl: '',
        externalRegistrationLink: '',
        description: '',
        skills: '',
        participationType: 'both', 
        minTeamSize: undefined as number | undefined,
        maxTeamSize: undefined as number | undefined,
        opportunityMode: 'online', 
        venueAddress: '',
        city: '',
        // Perks and Benefits
        stipend: '',
        salaryRange: '',
        perks: [],
        prizePool: '',
        prizes: [],
        faqs: [],
        benefits: '',
        compensation: '',
        candidateTypes: ['Everyone can apply'], 
        collegeRestriction: 'Everyone can apply',
        genderRestriction: 'Everyone can apply',
        eligibleGenders: ['Allow All'],
        eligibleOrganizations: ['Allow All'],
        sameOrgTeam: false,
        registrationLevel: 'both', // 'festival', 'both', 'competition'
        // Dates & Deadlines
        registrationStartDate: '',
        registrationDeadline: '',
        eventStartDate: '',
        eventEndDate: '',
        stages: [],
        contacts: [],
        // Festival Creation Fields
        festivalData: {
            name: '',
            mode: 'online',
            url: '',
            startDate: '',
            endDate: '',
            themeColor: '#6C3BFF',
            details: '',
            logo: null,
            mobileBanner: null,
            desktopBanner: null,
            seoImage: null,
            gallery: []
        },
        registrationFields: [
            { id: '1', label: 'Full Name', type: 'text', required: true, isFixed: true },
            { id: '2', label: 'Email ID', type: 'email', required: true, isFixed: true },
            { id: '3', label: 'College Name', type: 'text', required: true, isFixed: false },
            { id: '4', label: 'Mobile Number', type: 'tel', required: true, isFixed: false }
        ]
    });

    const [isCreatingFestival, setIsCreatingFestival] = useState(false);
    const [showCollegeFilter, setShowCollegeFilter] = useState(false);
    const [showGenderFilter, setShowGenderFilter] = useState(false);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [isSupportDrawerOpen, setIsSupportDrawerOpen] = useState(false);
    const [isEliminatory, setIsEliminatory] = useState(false);
    const [showMoreBasic, setShowMoreBasic] = useState(false);
    const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
    const [newFieldConfig, setNewFieldConfig] = useState({
        label: '',
        hint: '',
        errorMessage: '',
        options: [''],
        maxSize: 50,
        checkboxText: ''
    });
    const [orgInput, setOrgInput] = useState('');

    const candidateOptions = ['Everyone can apply', 'College Students', 'Freshers', 'Professionals', 'School Students'];
    const genderOptions = ['Female', 'Male', 'Others'];

    const subTypeMapping: { [key: string]: string[] } = {
        'General & Case Competitions': ['General Competition', 'Innovation Challenges', 'Case Competition'],
        'Quizzes': ['Online Quiz', 'Offline Quiz'],
        'Hackathons & Coding Challenges': ['Online Coding Challenge', 'On-site Hackathon'],
        'Scholarships': ['National (Scholarship)', 'International (Scholarship)'],
        'Workshops & Webinar': ['Technical Workshop', 'Non-technical Workshop', 'Webinar'],
        'Conferences': ['Academic Conference', 'Industry Conference'],
        'Creative & Cultural Events': ['Music', 'Dance', 'Art', 'Drama', 'Others']
    };

    const toggleCandidateType = (type: string) => {
        if (type === 'Everyone can apply') {
            setFormData({...formData, candidateTypes: ['Everyone can apply']});
        } else {
            const filtered = formData.candidateTypes.filter(t => t !== 'Everyone can apply');
            if (filtered.includes(type)) {
                const updated = filtered.filter(t => t !== type);
                setFormData({...formData, candidateTypes: updated.length === 0 ? ['Everyone can apply'] : updated});
            } else {
                setFormData({...formData, candidateTypes: [...filtered, type]});
            }
        }
    };

    const toggleOrganizationRestriction = (mode: 'all' | 'specific') => {
        if (mode === 'all') {
            setFormData({ ...formData, eligibleOrganizations: ['Allow All'] });
        } else {
            setFormData({ ...formData, eligibleOrganizations: [] });
        }
    };

    const addOrganization = (org: string) => {
        if (!org || formData.eligibleOrganizations.includes(org) || org === 'Allow All') return;
        setFormData({
            ...formData,
            eligibleOrganizations: [...formData.eligibleOrganizations.filter(o => o !== 'Allow All'), org]
        });
    };

    const toggleGenderRestriction = (mode: 'all' | 'specific') => {
        if (mode === 'all') {
            setFormData({ ...formData, eligibleGenders: ['Allow All'] });
        } else {
            setFormData({ ...formData, eligibleGenders: [] });
        }
    };

    const toggleGender = (gender: string) => {
        const current = formData.eligibleGenders.filter(g => g !== 'Allow All');
        if (current.includes(gender)) {
            const updated = current.filter(g => g !== gender);
            setFormData({ ...formData, eligibleGenders: updated.length === 0 ? ['Allow All'] : updated });
        } else {
            setFormData({ ...formData, eligibleGenders: [...current, gender] });
        }
    };

    // SYNC OR RESET STATE BASED ON OPENING MODE
    useEffect(() => {
        if (isOpen) {
            if (!eventId) {
                // CREATE MODE -> Reset to pristine default state
                setFormData({
                    title: '',
                    organisation: 'Loading...', 
                    opportunityType: 'Hackathons & Coding Challenges',
                    opportunitySubType: 'Online Coding Challenge',
                    festivalName: '',
                    websiteUrl: '',
                    externalRegistrationLink: '',
                    description: '',
                    skills: '',
                    participationType: 'both', 
                    minTeamSize: undefined as number | undefined,
                    maxTeamSize: undefined as number | undefined,
                    opportunityMode: 'online', 
                    venueAddress: '',
                    city: '',
                    stipend: '',
                    salaryRange: '',
                    perks: [],
                    prizePool: '',
                    prizes: [],
                    faqs: [],
                    benefits: '',
                    compensation: '',
                    candidateTypes: ['Everyone can apply'], 
                    collegeRestriction: 'Everyone can apply',
                    genderRestriction: 'Everyone can apply',
                    eligibleGenders: ['Allow All'],
                    eligibleOrganizations: ['Allow All'],
                    sameOrgTeam: false,
                    registrationLevel: 'both',
                    registrationStartDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                    registrationDeadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
                    festivalData: {
                        name: '',
                        mode: 'online',
                        url: '',
                        startDate: '',
                        endDate: '',
                        themeColor: '#6C3BFF',
                        details: '',
                        logo: null,
                        mobileBanner: null,
                        desktopBanner: null,
                        seoImage: null,
                        gallery: []
                    },
                    registrationFields: [
                        { id: '1', label: 'Full Name', type: 'text', required: true, isFixed: true },
                        { id: '2', label: 'Email ID', type: 'email', required: true, isFixed: true },
                        { id: '3', label: 'College Name', type: 'text', required: true, isFixed: false },
                        { id: '4', label: 'Mobile Number', type: 'tel', required: true, isFixed: false }
                    ],
                    eventStartDate: '',
                    eventEndDate: '',
                    stages: [],
                    contacts: []
                });
                setLogoPreview(null);
                setOpportunityBannerPreview(null);
                setFestivalLogoPreview(null);
                setFestivalBannerPreview(null);
                setIsCreatingFestival(false);
                setStep(1);
                
                const fetchProfile = async () => {
                    if (!institutionId) return;
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/v1/institution/profile/${institutionId}`, {
                            headers: { ...authHeaders() },
                        });
                        if (res.ok) {
                            const data = await res.json();
                            setFormData(prev => ({
                                ...prev,
                                organisation: data.name || 'Your Institution'
                            }));
                            // If institution has saved logo/banner, use them as previews
                            if (data.logo_url || data.logoUrl) {
                                setLogoPreview(data.logo_url || data.logoUrl);
                            }
                            if (data.banner_url || data.bannerUrl) {
                                setOpportunityBannerPreview(data.banner_url || data.bannerUrl);
                            }
                            if (data.festivalData) {
                                if (data.festivalData.logo_url) setFestivalLogoPreview(data.festivalData.logo_url);
                                if (data.festivalData.banner_url) setFestivalBannerPreview(data.festivalData.banner_url);
                            }
                        }
                    } catch (err) {
                        try { console.error("Failed to fetch institution profile", err instanceof Error ? err.message : String(err)); } catch (_) {}
                    }
                };
                fetchProfile();
            } else {
                // EDIT MODE -> Start at step 1, data will be prefilled by fetchEventDetails effect
                setStep(1);
            }
        } else {
            // CLOSED -> Clean previews to avoid memory leak or stale state
            setLogoPreview(null);
            setOpportunityBannerPreview(null);
            setFestivalLogoPreview(null);
            setFestivalBannerPreview(null);
            setStep(1);
        }
    }, [isOpen, eventId, institutionId]);

    // PREFILL EVENT FOR EDITING
    useEffect(() => {
        const fetchEventDetails = async () => {
            if (!isOpen || !eventId) return;
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${eventId}/details`, {
                    headers: { ...authHeaders() },
                });
                if (res.ok) {
                    const data = await res.json();
                    
                    if (data.logo_url) setLogoPreview(data.logo_url);
                    if (data.banner_url) setOpportunityBannerPreview(data.banner_url);
                    
                    if (data.festivalData) {
                        if (data.festivalData.logo_url) setFestivalLogoPreview(data.festivalData.logo_url);
                        if (data.festivalData.banner_url) setFestivalBannerPreview(data.festivalData.banner_url);
                        setIsCreatingFestival(true);
                    }

                    // Format dates to ISO format accepted by datetime-local (YYYY-MM-DDTHH:mm)
                    const formatToDatetimeLocal = (dStr?: string) => {
                        if (!dStr) return '';
                        try {
                            const d = new Date(dStr);
                            const pad = (num: number) => String(num).padStart(2, '0');
                            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        } catch {
                            return '';
                        }
                    };

                    setFormData(prev => ({
                        ...prev,
                        title: data.title || '',
                        organisation: data.organisation || data.organization || prev.organisation,
                        opportunityType: data.opportunityType || prev.opportunityType,
                        opportunitySubType: data.opportunitySubType || prev.opportunitySubType,
                        festivalName: data.festivalName || '',
                        websiteUrl: data.websiteUrl || '',
                        externalRegistrationLink: data.external_registration_link || data.externalRegistrationLink || '',
                        description: data.description || '',
                        skills: data.skills || '',
                        participationType: data.participationType || 'both',
                        minTeamSize: data.minTeamSize ?? undefined,
                        maxTeamSize: data.maxTeamSize ?? undefined,
                        opportunityMode: data.opportunityMode || 'online',
                        venueAddress: data.venueAddress || '',
                        city: data.city || '',
                        stipend: data.stipend || '',
                        salaryRange: data.salaryRange || '',
                        perks: data.perks || [],
                        prizePool: data.prizePool || data.prize_pool || '',
                        prizes: data.prizes || [],
                        faqs: data.faqs || [],
                        benefits: data.benefits || '',
                        compensation: data.compensation || '',
                        candidateTypes: data.candidateTypes || ['Everyone can apply'],
                        collegeRestriction: data.collegeRestriction || 'Everyone can apply',
                        genderRestriction: data.genderRestriction || 'Everyone can apply',
                        eligibleGenders: data.eligibleGenders || ['Allow All'],
                        eligibleOrganizations: data.eligibleOrganizations || ['Allow All'],
                        sameOrgTeam: data.sameOrgTeam || false,
                        registrationLevel: data.registrationLevel || 'both',
                        registrationStartDate: formatToDatetimeLocal(data.eventStartDate || data.start_date || data.startDate) || '',
                        registrationDeadline: formatToDatetimeLocal(data.registrationDeadline || data.deadline) || '',
                        eventStartDate: formatToDatetimeLocal(data.eventStartDate || data.start_date || data.startDate) || '',
                        eventEndDate: formatToDatetimeLocal(data.eventEndDate || data.end_date || data.endDate) || '',
                        stages: Array.isArray(data.stages) ? data.stages.map((s: any) => ({
                            ...s,
                            startDate: formatToDatetimeLocal(s.startDate || s.start_date) || '',
                            endDate: formatToDatetimeLocal(s.endDate || s.end_date) || '',
                            deadline: formatToDatetimeLocal(s.deadline) || '',
                        })) : [],
                        contacts: Array.isArray(data.contact || data.contacts) ? (data.contact || data.contacts) : [],
                        festivalData: data.festivalData ? {
                            name: data.festivalData.name || '',
                            mode: data.festivalData.mode || 'online',
                            url: data.festivalData.url || '',
                            startDate: data.festivalData.startDate || '',
                            endDate: data.festivalData.endDate || '',
                            themeColor: data.festivalData.themeColor || '#6C3BFF',
                            details: data.festivalData.details || '',
                            logo: null,
                            mobileBanner: null,
                            desktopBanner: null,
                            seoImage: null,
                            gallery: data.festivalData.gallery || []
                        } : prev.festivalData
                    }));
                }
            } catch (err) {
                try { console.error("Failed to fetch event details", err instanceof Error ? err.message : String(err)); } catch (_) {}
            }
        };
        fetchEventDetails();
    }, [isOpen, eventId]);
    
    // Sync editor content when stepping back into step 1
    useEffect(() => {
        if (step === 1 && editorRef.current) {
            const saved = formData.description || '';
            if (editorRef.current.innerHTML !== saved) {
                editorRef.current.innerHTML = saved;
            }
        }
    }, [step, formData.description]);

    // Persist FAQs in a ref across step navigation
    useEffect(() => {
        if (step === 2) {
            if (faqRef.current.length === 0 && (formData.faqs || []).length > 0) {
                faqRef.current = [...formData.faqs];
            } else if (faqRef.current.length > 0) {
                setFormData(prev => ({ ...prev, faqs: [...faqRef.current] }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const steps = [
        { id: 1, label: 'Opportunity details' },
        { id: 2, label: 'FAQs' },
    ];

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'mobileBanner') => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ 
                ...prev, 
                festivalData: { ...prev.festivalData, [field]: file } 
            }));
            const reader = new FileReader();
            reader.onloadend = () => {
                if (field === 'logo') setLogoPreview(reader.result as string);
                else setOpportunityBannerPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFestivalFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'mobileBanner') => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                festivalData: { ...prev.festivalData, [field]: file }
            }));
            const reader = new FileReader();
            reader.onloadend = () => {
                if (field === 'logo') setFestivalLogoPreview(reader.result as string);
                else setFestivalBannerPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNext = async () => {
        if (step < steps.length) {
            // Save editor content before navigating
            if (editorRef.current) {
                setFormData(prev => ({ ...prev, description: editorRef.current?.innerHTML || '' }));
            }
            setStep(step + 1);
        } else {
            // Validate team size
            if (formData.minTeamSize == null || formData.maxTeamSize == null) {
                alert('Please set both minimum and maximum team size for team-based events');
                return;
            }
            if (Number(formData.minTeamSize) > Number(formData.maxTeamSize)) {
                alert('Minimum team size cannot be greater than maximum team size');
                return;
            }

            setLoading(true);
            try {
                
                // Use FormData for multipart/form-data support
                const submitData = new FormData();
                
                const submitFormData = { ...formData };
                // Derive dates from stages
                const stages = submitFormData.stages || [];
                const regStage = stages.find((s: any) => (s.type || '').toUpperCase() === 'REGISTRATION');
                if (regStage) {
                    if (!submitFormData.registrationStartDate) submitFormData.registrationStartDate = regStage.startDate;
                    if (!submitFormData.registrationDeadline) submitFormData.registrationDeadline = regStage.endDate;
                }
                if (stages.length > 0) {
                    const allStarts = stages.map((s: any) => s.startDate).filter(Boolean);
                    const allEnds = stages.map((s: any) => s.endDate).filter(Boolean);
                    if (!submitFormData.eventStartDate && allStarts.length > 0) {
                        submitFormData.eventStartDate = allStarts.sort()[0];
                    }
                    if (!submitFormData.eventEndDate && allEnds.length > 0) {
                        submitFormData.eventEndDate = allEnds.sort().reverse()[0];
                    }
                }
                
                // Append all regular fields (exclude description — appended live below)
                Object.entries(submitFormData).forEach(([key, value]) => {
                    if (key !== 'festivalData' && key !== 'registrationFields' && key !== 'description') {
                        submitData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
                    }
                });

                // Append live editor content directly from the DOM (avoids stale React closure)
                submitData.append('description', editorRef.current?.innerHTML || formData.description || '');

                submitData.append('registrationLevel', formData.registrationLevel);

                submitData.append('registrationFields', JSON.stringify(formData.registrationFields));
                submitData.append('institution_id', institutionId || '');
                submitData.append('status', 'LIVE');

                // Append Opportunity Assets if exists
                if (formData.festivalData.logo instanceof File) {
                    submitData.append('logo_file', formData.festivalData.logo);
                }
                if (formData.festivalData.mobileBanner instanceof File) {
                    submitData.append('banner_file', formData.festivalData.mobileBanner);
                }

                // Append Festival Data if active
                if (isCreatingFestival) {
                    const festClean = { ...formData.festivalData };
                    delete festClean.logo;
                    delete festClean.mobileBanner;
                    submitData.append('festivalData', JSON.stringify(festClean));
                    
                    if (formData.festivalData.logo instanceof File) {
                        submitData.append('festival_logo_file', formData.festivalData.logo);
                    }
                    if (formData.festivalData.mobileBanner instanceof File) {
                        submitData.append('festival_banner_file', formData.festivalData.mobileBanner);
                    }
                }

                const url = eventId 
                    ? `${API_BASE_URL}/api/v1/institution/events/${eventId}/professional`
                    : `${API_BASE_URL}/api/v1/institution/events/create-professional`;
                const method = eventId ? 'PATCH' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: { ...authHeaders() },
                    body: submitData
                });

                if (response.ok) {
                    alert(eventId ? "Opportunity Updated Successfully!" : "Opportunity Created Successfully!");
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('opportunity-list-refresh'));
                    }
                    onClose();
                } else {
                    const errorData = await response.json();
                    alert(`Failed to save opportunity: ${errorData.detail || response.statusText || 'Unknown Error'}`);
                }
            } catch (err) {
                try { console.error("Submission failed", err instanceof Error ? err.message : String(err)); } catch (_) {}
                alert("Network error: Failed to connect to the server.");
            } finally {
                setLoading(false);
            }
        }
    };

    const handlePrevious = () => {
        // Save editor content before navigating back
        if (editorRef.current) {
            setFormData(prev => ({ ...prev, description: editorRef.current?.innerHTML || '' }));
        }
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const addField = (label: string, type: string) => {
        const newField = {
            id: Math.random().toString(36).substr(2, 9),
            label,
            type,
            required: true,
            isFixed: false
        };
        setFormData({
            ...formData,
            registrationFields: [...formData.registrationFields, newField]
        });
    };

    const handleSaveDraft = async () => {
        if (!formData.title.trim()) {
            alert("Please enter at least an Opportunity Title to save a draft.");
            return;
        }
        // Validate team size before saving
        if (formData.minTeamSize == null || formData.maxTeamSize == null) {
            alert('Please set both minimum and maximum team size for team-based events');
            return;
        }
        if (Number(formData.minTeamSize) > Number(formData.maxTeamSize)) {
            alert('Minimum team size cannot be greater than maximum team size');
            return;
        }
        setLoading(true);
        try {
            // Use FormData for multipart/form-data support
            const submitData = new FormData();
            
            const submitFormData = { ...formData };
            // Derive dates from stages
            const draftStages = submitFormData.stages || [];
            const draftRegStage = draftStages.find((s: any) => (s.type || '').toUpperCase() === 'REGISTRATION');
            if (draftRegStage) {
                if (!submitFormData.registrationStartDate) submitFormData.registrationStartDate = draftRegStage.startDate;
                if (!submitFormData.registrationDeadline) submitFormData.registrationDeadline = draftRegStage.endDate;
            }
            if (draftStages.length > 0) {
                const allStarts = draftStages.map((s: any) => s.startDate).filter(Boolean);
                const allEnds = draftStages.map((s: any) => s.endDate).filter(Boolean);
                if (!submitFormData.eventStartDate && allStarts.length > 0) {
                    submitFormData.eventStartDate = allStarts.sort()[0];
                }
                if (!submitFormData.eventEndDate && allEnds.length > 0) {
                    submitFormData.eventEndDate = allEnds.sort().reverse()[0];
                }
            }
            
            // Append all regular fields (exclude description — appended live below)
            Object.entries(submitFormData).forEach(([key, value]) => {
                if (key !== 'festivalData' && key !== 'registrationFields' && key !== 'description') {
                    submitData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
                }
            });

            // Append live editor content directly from the DOM (avoids stale React closure)
            submitData.append('description', editorRef.current?.innerHTML || formData.description || '');

            submitData.append('registrationLevel', formData.registrationLevel);
            submitData.append('registrationFields', JSON.stringify(formData.registrationFields));
            submitData.append('institution_id', institutionId || '');
            submitData.append('status', 'DRAFT');

            // Append Opportunity Assets if exists
            if (formData.festivalData.logo instanceof File) {
                submitData.append('logo_file', formData.festivalData.logo);
            }
            if (formData.festivalData.mobileBanner instanceof File) {
                submitData.append('banner_file', formData.festivalData.mobileBanner);
            }

            // Append Festival Data if active
            if (isCreatingFestival) {
                const festClean = { ...formData.festivalData };
                delete festClean.logo;
                delete festClean.mobileBanner;
                submitData.append('festivalData', JSON.stringify(festClean));
                
                if (formData.festivalData.logo instanceof File) {
                    submitData.append('festival_logo_file', formData.festivalData.logo);
                }
                if (formData.festivalData.mobileBanner instanceof File) {
                    submitData.append('festival_banner_file', formData.festivalData.mobileBanner);
                }
            }

            const url = eventId 
                ? `${API_BASE_URL}/api/v1/institution/events/${eventId}/professional`
                : `${API_BASE_URL}/api/v1/institution/events/create-professional`;
            const method = eventId ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { ...authHeaders() },
                body: submitData
            });

            if (response.ok) {
                alert("Draft Saved Successfully!");
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('opportunity-list-refresh'));
                }
                onClose();
                window.location.reload();
            } else {
                const errorData = await response.json();
                alert(`Failed to save draft: ${errorData.detail || response.statusText || 'Unknown Error'}`);
            }
        } catch (err) {
            try { console.error("Save draft failed", err instanceof Error ? err.message : String(err)); } catch (_) {}
            alert("Network error: Failed to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    const applyFormat = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setFormData(prev => ({ ...prev, description: editorRef.current?.innerHTML || '' }));
        }
    };

    return (
        <>
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
                initial={{ scale: 0.98, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.98, opacity: 0, y: 10 }}
                className="relative w-full max-w-6xl bg-[#F8FAFC] rounded-[1rem] shadow-2xl overflow-hidden flex h-[90vh] font-sans"
            >
                {/* 1. Left Sidebar */}
                <div className="w-72 bg-white border-r border-slate-200 p-8 flex flex-col shrink-0">
                    <div className="mb-10">
                        <h3 className="text-xl font-bold text-slate-800">Post an Opportunity</h3>
                    </div>

                    <div className="space-y-0 relative flex-1">
                        {steps.map((s, idx) => (
                            <div key={s.id} className="flex items-start gap-4 mb-8 relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all ${
                                    step === s.id ? 'bg-[#6C3BFF] text-white shadow-lg shadow-purple-100' : 
                                    step > s.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {step > s.id ? '✓' : s.id}
                                </div>
                                <div className="flex flex-col pt-1">
                                    <span className={`text-[13px] font-bold ${step === s.id ? 'text-[#6C3BFF]' : 'text-slate-500'}`}>Step {s.id}</span>
                                    <span className={`text-[13px] font-medium mt-0.5 ${step === s.id ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`absolute left-4 top-8 w-[1px] h-8 ${step > s.id ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Support Box */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-slate-400">
                                <HeadphonesIcon size={16} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed mb-3 font-medium">
                            Facing any issues or need any help?
                        </p>
                        <p className="text-[11px] font-bold text-slate-900 mb-1">Reach us at support@studlyf.com</p>
                        <button onClick={() => setIsSupportDrawerOpen(true)} className="text-[11px] font-black text-[#6C3BFF] tracking-widest hover:underline">Get in touch with us here</button>
                    </div>
                </div>

                {/* 2. Main Form Content */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    <button onClick={onClose} className="absolute right-6 top-6 z-20 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={20} /></button>
                    <div className="h-16 bg-gradient-to-r from-[#6C3BFF] to-[#8E66FF] w-full shrink-0" />

                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                        <div className="max-w-3xl mx-auto">
                            {step === 1 ? (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                    {/* Logo Upload */}
                                    <div className="flex items-center gap-8 mb-12">
                                        <label className="group relative w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-[#6C3BFF] transition-all overflow-hidden">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="w-10 h-10 bg-[#6C3BFF]/10 text-[#6C3BFF] rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                        <Upload size={18} />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Add Logo</span>
                                                </>
                                            )}
                                            <input type="file" className="hidden" onChange={(e) => handleFileChange(e, 'logo')} accept="image/*" />
                                        </label>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-400 leading-relaxed">Supported logo image JPG, JPEG, or PNG. Max 1 MB.</p>
                                            <p className="text-xs text-red-500 font-bold mt-1">Logo required</p>
                                        </div>
                                    </div>

                                    {/* Inputs */}
                                    <div className="space-y-8">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Opportunity Title *</label>
                                            <input 
                                                type="text" 
                                                value={formData.title}
                                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                                placeholder="Enter Opportunity Title"
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#6C3BFF]/20 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-300"
                                            />
                                            <p className="text-[10px] text-slate-300 mt-2 font-bold uppercase tracking-widest">{formData.title.length}/100 characters</p>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Organisation Name *</label>
                                            <input 
                                                type="text" 
                                                value={formData.organisation}
                                                onChange={(e) => setFormData({...formData, organisation: e.target.value})}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#6C3BFF]/20 outline-none transition-all text-slate-900 font-medium"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Opportunity Type *</label>
                                                <select 
                                                    value={formData.opportunityType}
                                                    onChange={(e) => {
                                                        const newType = e.target.value;
                                                        setFormData({
                                                            ...formData, 
                                                            opportunityType: newType,
                                                            opportunitySubType: subTypeMapping[newType][0]
                                                        });
                                                    }}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none transition-all text-slate-900 font-medium appearance-none"
                                                >
                                                    {Object.keys(subTypeMapping).map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Opportunity Sub-type *</label>
                                                <select 
                                                    value={formData.opportunitySubType}
                                                    onChange={(e) => setFormData({...formData, opportunitySubType: e.target.value})}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none transition-all text-slate-900 font-medium appearance-none"
                                                >
                                                    {subTypeMapping[formData.opportunityType].map(sub => (
                                                        <option key={sub} value={sub}>{sub}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1">
                                            <div>
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Add Banner (700x400)</label>
                                                <label className="group relative h-48 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center bg-white cursor-pointer hover:border-[#6C3BFF] transition-all overflow-hidden">
                                                    {opportunityBannerPreview ? (
                                                        <img src={opportunityBannerPreview} alt="Banner" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <>
                                                            <div className="mb-4 text-slate-200"><UploadCloud size={40} /></div>
                                                            <div className="px-6 py-2.5 bg-[#007BFF] text-white rounded-lg text-[11px] font-black uppercase mb-3 pointer-events-none">Click here to upload a banner</div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Recommended resolution is 700x400</p>
                                                        </>
                                                    )}
                                                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e, 'mobileBanner')} accept="image/*" />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Link Festival/Campaign (Optional)</label>
                                                    <button 
                                                        onClick={() => setIsCreatingFestival(true)}
                                                        className="text-[10px] font-black text-[#6C3BFF] uppercase tracking-widest hover:underline"
                                                    >
                                                        Can't find festival? Create New
                                                    </button>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={formData.festivalName}
                                                    onChange={(e) => setFormData({...formData, festivalName: e.target.value})}
                                                    placeholder="Enter festival name"
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none transition-all text-slate-900 font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Company Website URL (Optional)</label>
                                                <input 
                                                    type="url" 
                                                    value={formData.websiteUrl}
                                                    onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})}
                                                    placeholder="https://company.com"
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none transition-all text-slate-900 font-medium"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">About the Opportunity *</label>
                                                <button className="text-[10px] font-black text-[#6C3BFF] uppercase tracking-widest bg-[#6C3BFF]/5 px-3 py-1.5 rounded-lg hover:bg-[#6C3BFF]/10 transition-all flex items-center gap-2">
                                                    ✨ Generate with AI
                                                </button>
                                            </div>
                                            
                                            {/* Rich Text Toolbar */}
                                            <div className="bg-white border border-slate-100 rounded-t-2xl p-2 flex items-center gap-1 border-b-0 overflow-x-auto">
                                                <button onClick={() => applyFormat('bold')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-700 font-bold transition-all" title="Bold">B</button>
                                                <button onClick={() => applyFormat('italic')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-700 italic transition-all" title="Italic">I</button>
                                                <button onClick={() => applyFormat('underline')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-700 underline transition-all" title="Underline">U</button>
                                                <button onClick={() => applyFormat('strikeThrough')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-700 line-through transition-all" title="Strikethrough">S</button>
                                                <div className="w-[1px] h-4 bg-slate-100 mx-1" />
                                                <button onClick={() => applyFormat('justifyLeft')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all">≡</button>
                                                <button onClick={() => applyFormat('justifyCenter')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all">≡</button>
                                                <button onClick={() => applyFormat('justifyRight')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all">≡</button>
                                                <div className="w-[1px] h-4 bg-slate-100 mx-1" />
                                                <button onClick={() => applyFormat('insertUnorderedList')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all">•</button>
                                                <button onClick={() => applyFormat('insertOrderedList')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all">1.</button>
                                                <button onClick={() => applyFormat('cut')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all">✂️</button>
                                                <button onClick={() => applyFormat('formatBlock', 'p')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all">📋</button>
                                                <button onClick={() => applyFormat('superscript')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all">x²</button>
                                                <button onClick={() => applyFormat('subscript')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all">x₂</button>
                                            </div>
                                            
                                            <div 
                                                ref={editorRef}
                                                contentEditable
                                                onInput={(e) => setFormData({...formData, description: e.currentTarget.innerHTML})}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-b-2xl outline-none transition-all text-slate-900 font-medium min-h-[150px] focus:border-[#6C3BFF]/30 overflow-y-auto"
                                            />
                                        </div>

                                        {isCreatingFestival && (
                                            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-8 animate-in zoom-in-95 duration-500 relative">
                                                <button 
                                                    onClick={() => setIsCreatingFestival(false)}
                                                    className="absolute right-6 top-6 p-2 hover:bg-white rounded-full text-slate-400"
                                                >
                                                    <X size={16} />
                                                </button>
                                                
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Festival Name *</label>
                                                        <input type="text" placeholder="e.g. Innovation Summit" className="w-full px-6 py-4 bg-white border border-slate-200 rounded-xl outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Mode of Event</label>
                                                        <div className="flex gap-3">
                                                            <button className="flex-1 py-3 bg-white border border-[#6C3BFF] text-[#6C3BFF] rounded-xl font-bold text-xs">Online</button>
                                                            <button className="flex-1 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl font-bold text-xs">Offline</button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-8">
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Festival Start Date *</label>
                                                        <input type="datetime-local" className="w-full px-6 py-4 bg-white border border-slate-200 rounded-xl outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Festival End Date *</label>
                                                        <input type="datetime-local" className="w-full px-6 py-4 bg-white border border-slate-200 rounded-xl outline-none" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Theme Colour</label>
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {['#3B82F6', '#60A5FA', '#1E40AF', '#1D4ED8', '#1E3A8A', '#92400E', '#F97316', '#EA580C', '#991B1B', '#10B981', '#059669', '#8B5CF6', '#4C1D95', '#5B21B6', '#6366F1', '#D81B60', '#374151'].map(color => (
                                                            <button 
                                                                key={color} 
                                                                onClick={() => setFormData({...formData, festivalData: {...formData.festivalData, themeColor: color}})}
                                                                className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${formData.festivalData.themeColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Organisation *</label>
                                                    <input 
                                                        type="text" 
                                                        value={formData.organisation} 
                                                        onChange={(e) => setFormData({...formData, organisation: e.target.value})}
                                                        placeholder="Enter organisation name"
                                                        className="w-full px-6 py-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF] transition-all" 
                                                    />
                                                    <p className="text-[9px] text-orange-600 font-bold mt-1.5 uppercase text-right">Mandatory Field</p>
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Details *</label>
                                                        <Info size={14} className="text-slate-300" />
                                                    </div>
                                                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden focus-within:border-[#6C3BFF] transition-all">
                                                        <div className="p-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                                            {['B', 'I', 'U', '≡', '≡', '≡', '≡', '✂️', '📋', '•', '1.', '↺', '↻', '🖼️'].map((btn, i) => (
                                                                <button key={i} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-slate-500 font-bold transition-all">{btn}</button>
                                                            ))}
                                                        </div>
                                                        <textarea 
                                                            rows={8} 
                                                            value={formData.description}
                                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                                            className="w-full p-6 outline-none text-sm resize-none" 
                                                            placeholder="Enter festival details..."
                                                        ></textarea>
                                                    </div>
                                                    <p className="text-[9px] text-orange-600 font-bold mt-1.5 uppercase text-right">Mandatory Field</p>
                                                </div>

                                                {/* Assets with Real Uploads */}
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Upload Festival Logo</label>
                                                        <label className="group relative h-48 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center bg-white cursor-pointer hover:border-[#6C3BFF] transition-all overflow-hidden">
                                                            {festivalLogoPreview ? (
                                                                <img src={festivalLogoPreview} alt="Fest Logo" className="w-full h-full object-contain p-4" />
                                                            ) : (
                                                                <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform">🏆</div>
                                                            )}
                                                            <input type="file" className="hidden" onChange={(e) => handleFestivalFileChange(e, 'logo')} accept="image/*" />
                                                        </label>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Upload Festival Mobile Banner (700x400)</label>
                                                        <label className="group relative h-48 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center bg-white cursor-pointer hover:border-[#6C3BFF] transition-all overflow-hidden">
                                                            {festivalBannerPreview ? (
                                                                <img src={festivalBannerPreview} alt="Fest Banner" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <>
                                                                    <div className="mb-4 text-slate-200"><UploadCloud size={40} /></div>
                                                                    <div className="px-6 py-2.5 bg-[#007BFF] text-white rounded-lg text-[11px] font-black uppercase mb-3 pointer-events-none">Click here to upload a mobile Banner</div>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Recommended image resolution is 700x400</p>
                                                                </>
                                                            )}
                                                            <input type="file" className="hidden" onChange={(e) => handleFestivalFileChange(e, 'mobileBanner')} accept="image/*" />
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Registration open in festival</p>
                                                    
                                                    <div 
                                                        onClick={() => setFormData({...formData, registrationLevel: 'festival'})}
                                                        className={`p-6 border-2 rounded-[1.5rem] cursor-pointer transition-all ${formData.registrationLevel === 'festival' ? 'border-[#6C3BFF] bg-[#6C3BFF]/5 shadow-sm' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
                                                    >
                                                        <p className={`text-[12px] font-bold ${formData.registrationLevel === 'festival' ? 'text-[#6C3BFF]' : 'text-slate-600'}`}>Yes: Registrations will be open only at festival level.</p>
                                                    </div>

                                                    <div 
                                                        onClick={() => setFormData({...formData, registrationLevel: 'both'})}
                                                        className={`p-6 border-2 rounded-[1.5rem] cursor-pointer transition-all ${formData.registrationLevel === 'both' ? 'border-[#6C3BFF] bg-[#6C3BFF]/5 shadow-sm' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
                                                    >
                                                        <p className={`text-[12px] font-bold ${formData.registrationLevel === 'both' ? 'text-[#6C3BFF]' : 'text-slate-600'}`}>Both: Registration will be open on both festival and Competitions.</p>
                                                    </div>

                                                    <div 
                                                        onClick={() => setFormData({...formData, registrationLevel: 'competition'})}
                                                        className={`p-6 border-2 rounded-[1.5rem] cursor-pointer transition-all ${formData.registrationLevel === 'competition' ? 'border-[#6C3BFF] bg-[#6C3BFF]/5 shadow-sm' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
                                                    >
                                                        <p className={`text-[12px] font-bold ${formData.registrationLevel === 'competition' ? 'text-[#6C3BFF]' : 'text-slate-600'}`}>No: Registration will be open only at competition level.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Skills to be assessed (Optional)</label>
                                            <input 
                                                type="text" 
                                                value={formData.skills}
                                                onChange={(e) => setFormData({...formData, skills: e.target.value})}
                                                placeholder="e.g. Photoshop, React, Python (Comma separated)"
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none transition-all text-slate-900 font-medium"
                                            />
                                        </div>

                                        {/* Stages & Timelines Section */}
                                        <div className="pt-8 border-t border-slate-50">
                                            <div className="flex items-center gap-3 mb-8">
                                                <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Stages &amp; Timelines</h4>
                                                <Calendar size={14} className="text-slate-300" />
                                            </div>
                                            <div className="space-y-6">
                                                <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                                                    <p className="text-[11px] font-medium text-amber-800">
                                                        Important dates &amp; deadlines are automatically derived from stage dates below. No need to set them separately.
                                                    </p>
                                                </div>

                                                {/* Stages / Timeline */}
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                                        Stage Timeline <span className="text-slate-300 font-normal normal-case">(Optional)</span>
                                                    </label>
                                                    <div className="space-y-3">
                                                        {(formData.stages || []).map((stage: any, i: number) => (
                                                            <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stage {i + 1}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = [...formData.stages];
                                                                            updated.splice(i, 1);
                                                                            setFormData({...formData, stages: updated});
                                                                        }}
                                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Stage Name</label>
                                                                        <input
                                                                            type="text"
                                                                            value={stage.name || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...formData.stages];
                                                                                updated[i] = {...updated[i], name: e.target.value};
                                                                                setFormData({...formData, stages: updated});
                                                                            }}
                                                                            placeholder="e.g. Coding Challenge"
                                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Type</label>
                                                                        <select
                                                                            value={stage.type || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...formData.stages];
                                                                                updated[i] = {...updated[i], type: e.target.value};
                                                                                setFormData({...formData, stages: updated});
                                                                            }}
                                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium appearance-none"
                                                                        >
                                                                            <option value="">Select type</option>
                                                                            <option value="REGISTRATION">Registration</option>
                                                                            <option value="SUBMISSION">Submission</option>
                                                                            <option value="EVALUATION">Evaluation</option>
                                                                            <option value="RESULT">Result</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                                                                    <textarea
                                                                        rows={3}
                                                                        value={stage.description || ''}
                                                                        onChange={(e) => {
                                                                            const updated = [...formData.stages];
                                                                            updated[i] = {...updated[i], description: e.target.value};
                                                                            setFormData({...formData, stages: updated});
                                                                        }}
                                                                        placeholder="Describe what happens in this stage..."
                                                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium resize-none"
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-4 gap-3">
                                                                    <div>
                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                                                                        <input
                                                                            type="datetime-local"
                                                                            value={stage.startDate || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...formData.stages];
                                                                                updated[i] = {...updated[i], startDate: e.target.value};
                                                                                setFormData({...formData, stages: updated});
                                                                            }}
                                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                                                                        <input
                                                                            type="datetime-local"
                                                                            value={stage.endDate || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...formData.stages];
                                                                                updated[i] = {...updated[i], endDate: e.target.value};
                                                                                setFormData({...formData, stages: updated});
                                                                            }}
                                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mode</label>
                                                                        <select
                                                                            value={stage.mode || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...formData.stages];
                                                                                updated[i] = {...updated[i], mode: e.target.value};
                                                                                setFormData({...formData, stages: updated});
                                                                            }}
                                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium appearance-none"
                                                                        >
                                                                            <option value="">Select mode</option>
                                                                            <option value="Online">Online</option>
                                                                            <option value="Offline">Offline</option>
                                                                            <option value="Hybrid">Hybrid</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                                                                        <select
                                                                            value={stage.status || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...formData.stages];
                                                                                updated[i] = {...updated[i], status: e.target.value};
                                                                                setFormData({...formData, stages: updated});
                                                                            }}
                                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium appearance-none"
                                                                        >
                                                                            <option value="">Auto (from dates)</option>
                                                                            <option value="upcoming">Upcoming</option>
                                                                            <option value="active">Live</option>
                                                                            <option value="completed">Completed</option>
                                                                            <option value="results">Results</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(formData.stages || []), { name: '', type: '', startDate: '', endDate: '', description: '', mode: '', status: '' }];
                                                            setFormData({...formData, stages: updated});
                                                        }}
                                                        className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-[11px] font-bold text-slate-500 hover:border-[#6C3BFF] hover:text-[#6C3BFF] transition-all"
                                                    >
                                                        <Plus size={14} />
                                                        Add Stage
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Perks and Benefits Section */}
                                        <div className="pt-8 border-t border-slate-50">
                                            <div className="flex items-center gap-3 mb-8">
                                                <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Perks & Benefits</h4>
                                                <Trophy size={14} className="text-slate-300" />
                                            </div>
                                            
                                            <div className="space-y-6">
                                                {/* Prize Pool */}
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Total Prize Pool (Optional)</label>
                                                    <input 
                                                        type="text" 
                                                        value={formData.prizePool}
                                                        onChange={(e) => setFormData({...formData, prizePool: e.target.value})}
                                                        placeholder="e.g. ₹1,00,000, $5000, Worth ₹50,000"
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none transition-all text-slate-900 font-medium"
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-2">Total value of all prizes and rewards</p>
                                                </div>

                                                {/* Prize Distribution Entries */}
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                                        Individual Prizes <span className="text-slate-300 font-normal normal-case">(Optional)</span>
                                                    </label>
                                                    <div className="space-y-4">
                                                        {(formData.prizes || []).map((prize: any, i: number) => (
                                                            <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prize {i + 1}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = [...formData.prizes];
                                                                            updated.splice(i, 1);
                                                                            setFormData({...formData, prizes: updated});
                                                                        }}
                                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-3">
                                                                    <div>
                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Title / Rank</label>
                                                                        <input
                                                                            type="text"
                                                                            value={prize.title || prize.rank || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...formData.prizes];
                                                                                updated[i] = {...updated[i], title: e.target.value, rank: e.target.value};
                                                                                setFormData({...formData, prizes: updated});
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
                                                                                const updated = [...formData.prizes];
                                                                                updated[i] = {...updated[i], amount: e.target.value};
                                                                                setFormData({...formData, prizes: updated});
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
                                                                                const updated = [...formData.prizes];
                                                                                updated[i] = {...updated[i], type: e.target.value};
                                                                                setFormData({...formData, prizes: updated});
                                                                            }}
                                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium appearance-none"
                                                                        >
                                                                             <option value="">Select type</option>
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
                                                                 </div>
                                                                 <div className="grid grid-cols-2 gap-3">
                                                                     <div>
                                                                         <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Icon URL (optional)</label>
                                                                         <input
                                                                             type="text"
                                                                             value={prize.icon_url || ''}
                                                                             onChange={(e) => {
                                                                                 const val = e.target.value;
                                                                                 if (val && val.startsWith('data:')) return;
                                                                                 const updated = [...formData.prizes];
                                                                                 updated[i] = {...updated[i], icon_url: val};
                                                                                 setFormData({...formData, prizes: updated});
                                                                             }}
                                                                             placeholder="https://example.com/icon.png"
                                                                             className={`w-full px-3 py-2.5 bg-slate-50 border ${(prize.icon_url || '').startsWith('data:') ? 'border-red-400 bg-red-50' : 'border-slate-100'} rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium`}
                                                                         />
                                                                         {(prize.icon_url || '').startsWith('data:') && <p className="text-[10px] text-red-500 font-bold mt-1">Only https:// URLs allowed</p>}
                                                                     </div>
                                                                    <div>
                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Badge Text (optional)</label>
                                                                        <input
                                                                            type="text"
                                                                            value={prize.badge_text || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...formData.prizes];
                                                                                updated[i] = {...updated[i], badge_text: e.target.value};
                                                                                setFormData({...formData, prizes: updated});
                                                                            }}
                                                                            placeholder="e.g. Certificate"
                                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description (optional)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={prize.description || ''}
                                                                        onChange={(e) => {
                                                                            const updated = [...formData.prizes];
                                                                            updated[i] = {...updated[i], description: e.target.value};
                                                                            setFormData({...formData, prizes: updated});
                                                                        }}
                                                                        placeholder="Brief description of this prize"
                                                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(formData.prizes || []), {}];
                                                            setFormData({...formData, prizes: updated});
                                                        }}
                                                        className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-[11px] font-bold text-slate-500 hover:border-[#6C3BFF] hover:text-[#6C3BFF] transition-all"
                                                    >
                                                        <Plus size={14} />
                                                        Add Prize
                                                    </button>
                                                </div>

                                                {/* Stipend/Compensation */}
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Stipend (Optional)</label>
                                                        <input 
                                                            type="text" 
                                                            value={formData.stipend}
                                                            onChange={(e) => setFormData({...formData, stipend: e.target.value})}
                                                            placeholder="e.g. ₹10,000/month"
                                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none transition-all text-slate-900 font-medium"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Salary Range (Optional)</label>
                                                        <input 
                                                            type="text" 
                                                            value={formData.salaryRange}
                                                            onChange={(e) => setFormData({...formData, salaryRange: e.target.value})}
                                                            placeholder="e.g. ₹8L - ₹15L PA"
                                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none transition-all text-slate-900 font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Benefits Description */}
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Benefits & Perks (Optional)</label>
                                                    <textarea 
                                                        rows={4}
                                                        value={formData.benefits}
                                                        onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                                                        placeholder="List all benefits, perks, and additional rewards..."
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none transition-all text-slate-900 font-medium resize-none"
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-2">Certificates, internship opportunities, job offers, swag, mentorship, etc.</p>
                                                </div>

                                                {/* Common Perks Tags */}
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Common Perks (Click to add)</label>
                                                    <div className="flex flex-wrap gap-3">
                                                        {[
                                                            'Certificate of Participation',
                                                            'Internship Opportunity',
                                                            'Job Interview',
                                                            'Swag/Merchandise',
                                                            'Mentorship',
                                                            'Workshop Access',
                                                            'Free Tools/Software',
                                                            'Networking Opportunities',
                                                            'Publication/Recognition',
                                                            'Travel Reimbursement'
                                                        ].map(perk => (
                                                            <button 
                                                                key={perk}
                                                                onClick={() => {
                                                                    const currentBenefits = formData.benefits || '';
                                                                    const newBenefits = currentBenefits ? `${currentBenefits}, ${perk}` : perk;
                                                                    setFormData({...formData, benefits: newBenefits});
                                                                }}
                                                                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-medium text-slate-600 hover:border-[#6C3BFF] hover:bg-[#6C3BFF]/5 hover:text-[#6C3BFF] transition-all"
                                                            >
                                                                + {perk}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-slate-50">
                                            <div className="flex items-center gap-3 mb-8">
                                                <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Opportunity Mode & Participation Type</h4>
                                                <Info size={14} className="text-slate-300" />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-12">
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Participation Type</label>
                                                    <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
                                                        <button 
                                                            onClick={() => setFormData({...formData, participationType: 'individual'})}
                                                            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${formData.participationType === 'individual' ? 'bg-white text-[#6C3BFF] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            👤 Individual
                                                        </button>
                                                        <button 
                                                            onClick={() => setFormData({...formData, participationType: 'team'})}
                                                            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${formData.participationType === 'team' ? 'bg-white text-[#6C3BFF] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            👥 Team Participation
                                                        </button>
                                                        <button 
                                                            onClick={() => setFormData({...formData, participationType: 'both'})}
                                                            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${formData.participationType === 'both' ? 'bg-white text-[#6C3BFF] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            🤝 Both
                                                        </button>
                                                    </div>

                                                    {(formData.participationType === 'team' || formData.participationType === 'both') && (
                                                        <div className="mt-8 flex items-center gap-6 animate-in slide-in-from-top-2 duration-300">
                                                            <div className="flex-1">
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Set team size</label>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="relative flex-1">
                                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">Min:</span>
                                                                        <input 
                                                                            type="number" 
                                                                            value={formData.minTeamSize ?? ''}
                                                                            onChange={(e) => setFormData({...formData, minTeamSize: e.target.value ? parseInt(e.target.value, 10) : undefined})}
                                                                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF] font-bold text-sm"
                                                                        />
                                                                    </div>
                                                                    <div className="relative flex-1">
                                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">Max:</span>
                                                                        <input 
                                                                            type="number" 
                                                                            value={formData.maxTeamSize ?? ''}
                                                                            onChange={(e) => setFormData({...formData, maxTeamSize: e.target.value ? parseInt(e.target.value, 10) : undefined})}
                                                                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF] font-bold text-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Mode of Opportunity</label>
                                                        <Info size={14} className="text-slate-300" />
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <button 
                                                            onClick={() => setFormData({...formData, opportunityMode: 'online'})}
                                                            className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${formData.opportunityMode === 'online' ? 'bg-white border-[#6C3BFF] text-[#6C3BFF]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 border-dashed'}`}
                                                        >
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${formData.opportunityMode === 'online' ? 'bg-[#6C3BFF] text-white' : 'bg-slate-100'}`}>🌐</div>
                                                            <span className="text-[11px] font-black uppercase tracking-widest">Online</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => setFormData({...formData, opportunityMode: 'offline'})}
                                                            className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${formData.opportunityMode === 'offline' ? 'bg-white border-[#6C3BFF] text-[#6C3BFF]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 border-dashed'}`}
                                                        >
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${formData.opportunityMode === 'offline' ? 'bg-[#6C3BFF] text-white' : 'bg-slate-100'}`}>📍</div>
                                                            <span className="text-[11px] font-black uppercase tracking-widest">Offline</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {formData.opportunityMode === 'offline' && (
                                                <div className="mt-10 space-y-8 animate-in zoom-in-95 duration-300">
                                                    <div>
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Venue of the Event *</label>
                                                        <input 
                                                            type="text" 
                                                            value={formData.venueAddress}
                                                            onChange={(e) => setFormData({...formData, venueAddress: e.target.value})}
                                                            placeholder="Enter address of the location where opportunity will be held"
                                                            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF] font-medium text-sm"
                                                        />
                                                        <p className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-widest">Address is required.</p>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Event Location *</label>
                                                            <button className="text-[10px] font-black text-[#6C3BFF] flex items-center gap-2">
                                                                🎯 Current location
                                                            </button>
                                                        </div>
                                                        <input 
                                                            type="text" 
                                                            value={formData.city}
                                                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                                                            placeholder="Select Location / City"
                                                            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF] font-medium text-sm"
                                                        />
                                                        <p className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-widest">Event Location is required</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-10 border-t border-slate-50">
                                            
                                            <div className="space-y-10">
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Who can register?</label>
                                                    <p className="text-[10px] text-slate-400 mb-4 font-medium">Select the candidate type(s) eligible to register</p>
                                                    <div className="flex flex-wrap gap-3">
                                                        {candidateOptions.map(opt => (
                                                            <button 
                                                                key={opt}
                                                                onClick={() => toggleCandidateType(opt)}
                                                                className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase transition-all border ${
                                                                    formData.candidateTypes.includes(opt) 
                                                                    ? 'bg-[#6C3BFF] border-[#6C3BFF] text-white shadow-lg shadow-purple-100' 
                                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    {/* College Restriction */}
                                                    <div className={`p-8 bg-slate-50 rounded-[1.5rem] border transition-all ${showCollegeFilter ? "border-[#6C3BFF] bg-white shadow-xl shadow-purple-50" : "border-slate-100"}`}>
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#6C3BFF]">🏢</div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">College/Organization</p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">Restrict applicants by college/organization</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <button className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"><RefreshCw size={14} /></button>
                                                                {showCollegeFilter ? (
                                                                    <button onClick={() => setShowCollegeFilter(false)} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">✕ Cancel</button>
                                                                ) : (
                                                                    <button onClick={() => setShowCollegeFilter(true)} className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-[#6C3BFF] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">🖊️ Change</button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {showCollegeFilter && (
                                                            <div className="animate-in slide-in-from-top-4 duration-300">
                                                                <div className="flex gap-3 mb-6">
                                                                    <button 
                                                                        onClick={() => toggleOrganizationRestriction("all")}
                                                                        className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase transition-all ${
                                                                            formData.eligibleOrganizations.includes("Allow All") 
                                                                            ? "bg-white border-2 border-[#6C3BFF] text-[#6C3BFF]" 
                                                                            : "bg-white border-2 border-dashed border-slate-200 text-slate-400"
                                                                        }`}
                                                                    >
                                                                        Allow All
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => toggleOrganizationRestriction("specific")}
                                                                        className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase transition-all ${
                                                                            !formData.eligibleOrganizations.includes("Allow All") 
                                                                            ? "bg-white border-2 border-[#6C3BFF] text-[#6C3BFF]" 
                                                                            : "bg-white border-2 border-dashed border-slate-200 text-slate-400"
                                                                        }`}
                                                                    >
                                                                        Eligible College/Organization(s)
                                                                    </button>
                                                                </div>

                                                                {!formData.eligibleOrganizations.includes("Allow All") && (
                                                                    <div className="mb-6 space-y-4 animate-in fade-in duration-300">
                                                                        <div className="flex gap-3">
                                                                            <input 
                                                                                type="text" 
                                                                                placeholder="Type college/organization name and press enter"
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter") {
                                                                                        e.preventDefault();
                                                                                        addOrganization(e.currentTarget.value);
                                                                                        e.currentTarget.value = "";
                                                                                    }
                                                                                }}
                                                                                className="flex-1 px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#6C3BFF]/20 outline-none text-sm font-medium"
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {formData.eligibleOrganizations.map(org => (
                                                                                <span key={org} className="px-4 py-2 bg-[#6C3BFF]/10 text-[#6C3BFF] rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                                                    {org}
                                                                                    <button onClick={() => setFormData({...formData, eligibleOrganizations: formData.eligibleOrganizations.filter(o => o !== org)})} className="hover:text-red-500">✕</button>
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div className="pt-6 border-t border-slate-50">
                                                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4">Team composition by organization</p>
                                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={formData.sameOrgTeam}
                                                                            onChange={(e) => setFormData({...formData, sameOrgTeam: e.target.checked})}
                                                                            className="w-5 h-5 rounded-md border-slate-300 text-[#6C3BFF] focus:ring-[#6C3BFF]" 
                                                                        />
                                                                        <span className="text-sm text-slate-600 font-medium group-hover:text-slate-900 transition-all">Member of a team should be from same organizations.</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Gender Restriction */}
                                                    <div className={`p-8 bg-slate-50 rounded-[1.5rem] border transition-all ${showGenderFilter ? 'border-[#6C3BFF] bg-white shadow-xl shadow-purple-50' : 'border-slate-100'}`}>
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-pink-500">🚻</div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">Gender</p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">Restrict applicants based on their gender</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <button className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"><RefreshCw size={14} /></button>
                                                                {showGenderFilter ? (
                                                                    <button onClick={() => setShowGenderFilter(false)} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">✕ Cancel</button>
                                                                ) : (
                                                                    <button onClick={() => setShowGenderFilter(true)} className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-[#6C3BFF] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">🖊️ Change</button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {showGenderFilter && (
                                                            <div className="animate-in slide-in-from-top-4 duration-300">
                                                                <div className="flex flex-wrap gap-3">
                                                                    <button 
                                                                        onClick={() => toggleGenderRestriction('all')}
                                                                        className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase transition-all border-2 ${
                                                                            formData.eligibleGenders.includes('Allow All') 
                                                                            ? 'bg-white border-[#6C3BFF] text-[#6C3BFF]' 
                                                                            : 'border-dashed border-slate-200 text-slate-400'
                                                                        }`}
                                                                    >
                                                                        Allow All
                                                                    </button>
                                                                    {genderOptions.map(g => (
                                                                        <button 
                                                                            key={g} 
                                                                            onClick={() => toggleGender(g)}
                                                                            className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase transition-all border-2 ${
                                                                                formData.eligibleGenders.includes(g) 
                                                                                ? 'bg-white border-[#6C3BFF] text-[#6C3BFF]' 
                                                                                : 'border-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500'
                                                                            }`}
                                                                        >
                                                                            {g}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact the organisers */}
                                        <div className="pt-8 border-t border-slate-50">
                                            <div className="flex items-center gap-3 mb-8">
                                                <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Contact the Organisers</h4>
                                                <HeadphonesIcon size={14} className="text-slate-300" />
                                            </div>
                                            <div className="space-y-4">
                                                {(formData.contacts || []).map((contact: any, i: number) => (
                                                    <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact {i + 1}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = [...formData.contacts];
                                                                    updated.splice(i, 1);
                                                                    setFormData({...formData, contacts: updated});
                                                                }}
                                                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                                                            <input
                                                                type="email"
                                                                value={contact.email || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...formData.contacts];
                                                                    updated[i] = {...updated[i], email: e.target.value};
                                                                    setFormData({...formData, contacts: updated});
                                                                }}
                                                                placeholder="support@example.com"
                                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...(formData.contacts || []), { email: '' }];
                                                        setFormData({...formData, contacts: updated});
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-[11px] font-bold text-slate-500 hover:border-[#6C3BFF] hover:text-[#6C3BFF] transition-all"
                                                >
                                                    <Plus size={14} />
                                                    Add Contact
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 mb-2">FAQs</h3>
                                        <p className="text-sm text-slate-500 font-medium">Add frequently asked questions</p>
                                    </div>

                                    <div className="space-y-4">
                                        {(faqRef.current.length > 0 ? faqRef.current : (formData.faqs || [])).map((faq: any, i: number) => (
                                            <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FAQ {i + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...faqRef.current];
                                                            updated.splice(i, 1);
                                                            faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Question</label>
                                                    <input
                                                        type="text"
                                                        value={faq.question || ''}
                                                        onChange={(e) => {
                                                            const updated = [...faqRef.current];
                                                            updated[i] = {...updated[i], question: e.target.value};
                                                            faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                                        }}
                                                        placeholder="e.g. What is the eligibility criteria?"
                                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Answer</label>
                                                    <textarea
                                                        rows={3}
                                                        value={faq.answer || ''}
                                                        onChange={(e) => {
                                                            const updated = [...faqRef.current];
                                                            updated[i] = {...updated[i], answer: e.target.value};
                                                            faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                                        }}
                                                        placeholder="Enter the answer..."
                                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium resize-none"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 gap-3">
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                                                        <select
                                                            value={faq.category || ''}
                                                            onChange={(e) => {
                                                                const updated = [...faqRef.current];
                                                                updated[i] = {...updated[i], category: e.target.value};
                                                                faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                                            }}
                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium appearance-none"
                                                        >
                                                            <option value="">Select category</option>
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
                                                            min={0}
                                                            value={faq.order ?? ''}
                                                            onChange={(e) => {
                                                                const updated = [...faqRef.current];
                                                                updated[i] = {...updated[i], order: parseInt(e.target.value) || 0};
                                                                faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                                            }}
                                                            placeholder="Display order"
                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Featured</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = [...faqRef.current];
                                                                updated[i] = {...updated[i], is_featured: !(faq.is_featured ?? faq.featured)};
                                                                faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                                            }}
                                                            className={`w-full px-3 py-2.5 rounded-lg border text-[11px] font-bold transition-all flex items-center justify-center gap-2 ${
                                                                (faq.is_featured ?? faq.featured) ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
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
                                                                const updated = [...faqRef.current];
                                                                updated[i] = {...updated[i], auto_pin_enabled: !(faq.auto_pin_enabled ?? true)};
                                                                faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                                            }}
                                                            className={`w-full px-3 py-2.5 rounded-lg border text-[11px] font-bold transition-all flex items-center justify-center gap-2 ${
                                                                (faq.auto_pin_enabled ?? true) ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
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
                                                            onChange={(e) => {
                                                                const updated = [...faqRef.current];
                                                                updated[i] = {...updated[i], priority_score: parseInt(e.target.value) || 0};
                                                                faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                                            }}
                                                            placeholder="Auto-computed"
                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">👍 Helpful Count</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={faq.helpful_count ?? ''}
                                                            onChange={(e) => {
                                                                const updated = [...faqRef.current];
                                                                updated[i] = {...updated[i], helpful_count: parseInt(e.target.value) || 0};
                                                                faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                                            }}
                                                            placeholder="0"
                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">👁️ Views</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={faq.views ?? ''}
                                                            onChange={(e) => {
                                                                const updated = [...faqRef.current];
                                                                updated[i] = {...updated[i], views: parseInt(e.target.value) || 0};
                                                                faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                                            }}
                                                            placeholder="0"
                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg outline-none transition-all text-slate-900 text-[12px] font-medium"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = [...(faqRef.current || []), {}];
                                                faqRef.current = updated; setFormData(prev => ({ ...prev, faqs: updated }));
                                            }}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-[11px] font-bold text-slate-500 hover:border-[#6C3BFF] hover:text-[#6C3BFF] transition-all"
                                        >
                                            <Plus size={14} />
                                            Add FAQ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowBulkImport(true)}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-[11px] font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-all"
                                        >
                                            <UploadCloud size={14} />
                                            Bulk Import
                                        </button>
                                    </div>
                                </div>
                            )}

                            {showBulkImport && (
                                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBulkImport(false)}>
                                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900">Bulk Import FAQs</h3>
                                                <p className="text-sm text-slate-500 font-medium mt-1">Paste text or upload a PDF. One Q&A per entry.</p>
                                            </div>
                                            <button onClick={() => setShowBulkImport(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={18} /></button>
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
                                            <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-[11px] font-bold transition-all ${bulkImportText && !bulkImportLoading ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-white'}`}>
                                                <Upload size={14} />
                                                Upload PDF
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    className="hidden"
                                                    disabled={bulkImportLoading}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setBulkImportLoading(true);
                                                        try {
                                                            const buf = await file.arrayBuffer();
                                                            const pdf = await getDocument(buf).promise;
                                                            let text = '';
                                                            for (let i = 1; i <= pdf.numPages; i++) {
                                                                const page = await pdf.getPage(i);
                                                                const content = await page.getTextContent();
                                                                text += content.items.map((item: any) => item.str).join(' ') + '\n';
                                                            }
                                                            setBulkImportText(text);
                                                        } catch {
                                                            alert('Failed to read PDF. Make sure it contains selectable text.');
                                                        }
                                                        setBulkImportLoading(false);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                            {bulkImportLoading && <span className="text-xs text-slate-400 font-medium animate-pulse">Reading PDF...</span>}
                                            {!bulkImportLoading && bulkImportText && (
                                                <button onClick={() => setBulkImportText('')} className="text-[11px] text-red-500 font-bold hover:underline">Clear</button>
                                            )}
                                        </div>

                                        <textarea
                                            value={bulkImportText}
                                            onChange={e => setBulkImportText(e.target.value)}
                                            rows={12}
                                            placeholder="Paste your FAQs here, or upload a PDF above..."
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium resize-none focus:bg-white focus:border-emerald-300 transition-all"
                                        />
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => { setShowBulkImport(false); setBulkImportText(''); }}
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

                                                    const text = bulkImportText.trim();
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
                                                                    parsed.push({ category: 'General', ...current, ...analyzeFaq(current.question || '', current.answer || '') });
                                                                    current = {};
                                                                }
                                                                continue;
                                                            }
                                                            if (trimmed.toUpperCase().startsWith('Q:') || trimmed.toUpperCase().startsWith('QUESTION:')) {
                                                                if (current.question || current.answer) {
                                                                    parsed.push({ category: 'General', ...current, ...analyzeFaq(current.question || '', current.answer || '') });
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
                                                            parsed.push({ category: 'General', ...current, ...analyzeFaq(current.question || '', current.answer || '') });
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
                                                        faqRef.current = [...(faqRef.current || []), ...scored];
                                                        setFormData(prev => ({ ...prev, faqs: [...faqRef.current] }));
                                                    }
                                                    setBulkImportText('');
                                                    setShowBulkImport(false);
                                                }}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-bold hover:bg-emerald-600 transition-all"
                                            >
                                                <UploadCloud size={14} />
                                                Import ({(() => { const t = bulkImportText.trim(); if (/\bFAQ\s+\d+/i.test(t)) { return (t.match(/\bFAQ\s+\d+/gi) || []).length; } return t.split('\n').filter(l => { const u = l.trim().toUpperCase(); return u.startsWith('Q:') || u.startsWith('QUESTION:'); }).length; })()} FAQs)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={handleSaveDraft} className="px-8 py-3.5 bg-slate-50 text-slate-500 rounded-full font-bold text-sm hover:bg-slate-100 transition-all border border-slate-100">Save as Draft</button>
                        </div>
                        <div className="flex items-center gap-4">
                            {step > 1 && (
                                <button 
                                    onClick={handlePrevious}
                                    className="px-8 py-3.5 bg-white text-slate-600 rounded-full font-bold text-sm hover:bg-slate-50 transition-all border border-slate-200 flex items-center gap-3"
                                >
                                    <ArrowLeft size={18} />
                                    <span>Previous</span>
                                </button>
                            )}
                            <button 
                                disabled={loading}
                                onClick={handleNext} 
                                className={`px-10 py-4 bg-[#6C3BFF] text-white rounded-full font-bold text-sm transition-all flex items-center gap-3 shadow-lg ${loading ? "opacity-50 cursor-not-allowed" : "hover:shadow-xl hover:shadow-purple-200 hover:scale-[1.02]"}`}
                            >
                                <span>{loading ? "Processing..." : (step === steps.length ? "🚀 Post Opportunity" : "Save and next")}</span>
                                {step === steps.length ? <Upload size={18} /> : <ChevronRight size={18} />}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>

        {/* Sub-modals */}
        <AnimatePresence>
            {isAddingQuestion && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { setIsAddingQuestion(false); setSelectedFieldType(null); }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-xl bg-white rounded-[1.5rem] shadow-2xl overflow-hidden font-sans"
                    >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Add Questions</h3>
                                <p className="text-xs text-slate-400 font-medium mt-1">Ask candidates custom questions when they register.</p>
                            </div>
                            <button onClick={() => { setIsAddingQuestion(false); setSelectedFieldType(null); }} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {!selectedFieldType ? (
                                <div className="space-y-6">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Custom</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { id: "few_words", label: "Few Words (Text Box)", icon: "✏️" },
                                            { id: "paragraph", label: "Paragraph (Text Area)", icon: "📝" },
                                            { id: "radio", label: "Radio Button", icon: "🔘" },
                                            { id: "checkbox", label: "Check Box", icon: "☑️" },
                                            { id: "dropdown", label: "Dropdown", icon: "🔽" },
                                            { id: "file", label: "File", icon: "📤" },
                                            { id: "accept", label: "Accept Box (E.g. Accept Terms)", icon: "👍" }
                                        ].map(type => (
                                            <button 
                                                key={type.id}
                                                onClick={() => setSelectedFieldType(type.id)}
                                                className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-[#6C3BFF] hover:bg-white hover:shadow-lg hover:shadow-purple-50 transition-all text-left"
                                            >
                                                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white text-lg shadow-sm">
                                                    {type.icon}
                                                </div>
                                                <span className="text-[13px] font-bold text-slate-700 leading-tight">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 px-4 py-2 bg-orange-100 text-orange-600 rounded-xl">
                                            <span className="text-lg">⚙️</span>
                                            <span className="text-xs font-black uppercase tracking-widest">{selectedFieldType.replace("_", " ")}</span>
                                        </div>
                                        <div className="w-10 h-10 border-2 border-[#6C3BFF] rounded-xl flex items-center justify-center text-[#6C3BFF]">
                                            <Lock size={18} />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Field Label *</label>
                                            <input 
                                                type="text" 
                                                value={newFieldConfig.label}
                                                onChange={(e) => setNewFieldConfig({ ...newFieldConfig, label: e.target.value })}
                                                placeholder="Enter question label" 
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#6C3BFF]/20 outline-none font-medium text-sm" 
                                            />
                                        </div>
                                        {(selectedFieldType === "radio" || selectedFieldType === "checkbox" || selectedFieldType === "dropdown") && (
                                            <div className="space-y-4">
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Options</label>
                                                {newFieldConfig.options.map((opt, i) => (
                                                    <div key={i} className="flex gap-3">
                                                        <input 
                                                            type="text" 
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const updatedOptions = [...newFieldConfig.options];
                                                                updatedOptions[i] = e.target.value;
                                                                setNewFieldConfig({ ...newFieldConfig, options: updatedOptions });
                                                            }}
                                                            placeholder={`Option ${i+1}`} 
                                                            className="flex-1 px-5 py-3 bg-white border border-slate-100 rounded-xl focus:border-[#6C3BFF] outline-none text-sm" 
                                                        />
                                                        {i > 0 && (
                                                            <button 
                                                                onClick={() => {
                                                                    const updatedOptions = newFieldConfig.options.filter((_, idx) => idx !== i);
                                                                    setNewFieldConfig({ ...newFieldConfig, options: updatedOptions });
                                                                }}
                                                                className="text-slate-300 hover:text-red-500 transition-all"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button onClick={() => setNewFieldConfig({...newFieldConfig, options: [...newFieldConfig.options, ""]})} className="text-[11px] font-black text-[#6C3BFF] uppercase tracking-widest flex items-center gap-2">
                                                    <Plus size={14} /> Add another Options
                                                </button>
                                            </div>
                                        )}
                                        {selectedFieldType === "file" && (
                                            <div>
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Max. file size (MB) *</label>
                                                <input type="number" defaultValue={50} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-sm" />
                                            </div>
                                        )}
                                        {selectedFieldType === "accept" && (
                                            <div>
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Check Box Text *</label>
                                                <input type="text" placeholder="I accept the terms and conditions" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium text-sm" />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Remark/Hint</label>
                                            <input type="text" placeholder="Enter hint/remarks" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium text-sm" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <button onClick={() => { setSelectedFieldType(null); if(!selectedFieldType) setIsAddingQuestion(false); }} className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                            {selectedFieldType && (
                                <button 
                                    onClick={() => { 
                                        addField(newFieldConfig.label || selectedFieldType, selectedFieldType);
                                        setIsAddingQuestion(false); 
                                        setSelectedFieldType(null); 
                                        setNewFieldConfig({ label: '', hint: '', errorMessage: '', options: [''], maxSize: 50, checkboxText: '' });
                                    }} 
                                    className="px-8 py-2.5 bg-[#6C3BFF] text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-200 transition-all"
                                >
                                    Save
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isSupportDrawerOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSupportDrawerOpen(false)} className="fixed inset-0 z-[400] bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 w-[450px] bg-white z-[450] shadow-2xl flex flex-col font-sans">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900">Get in touch</h3>
                            <button onClick={() => setIsSupportDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Name *</label>
                                    <input type="text" placeholder="Name" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Email ID *</label>
                                    <input type="email" placeholder="Email" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Mobile No. *</label>
                                    <div className="flex gap-2">
                                        <div className="px-4 py-4 bg-slate-100 border rounded-xl text-sm font-black text-slate-500">+91</div>
                                        <input type="text" placeholder="Mobile Number" className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Organisation *</label>
                                    <input type="text" placeholder="Organisation" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Issue Type *</label>
                                    <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium appearance-none mb-4">
                                        <option>Please select interest</option>
                                        <option>Technical support</option>
                                        <option>Request a feature</option>
                                        <option>Found a bug</option>
                                        <option>Others</option>
                                    </select>
                                    <textarea rows={4} placeholder="Description..." className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium resize-none" />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100">
                            <button className="w-full py-4 bg-[#6C3BFF] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-purple-200 transition-all">Submit your details</button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
        </>
    );
};

export default PostOpportunityModal;

