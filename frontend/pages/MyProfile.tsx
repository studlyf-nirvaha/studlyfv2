import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../apiConfig';
import {
  User, FileText, Book, Award, Briefcase, 
  Terminal, Share2, Settings, ShieldCheck, 
  ChevronLeft, Plus, Save, Sparkles, Scan,
  Globe, MapPin, Calendar, Heart, GraduationCap, Download, Copy
} from 'lucide-react';
import AvatarImage from '../components/AvatarImage';

const MyProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);

  // State for all form fields
  const [formData, setFormData] = useState({
    profilePhoto: null as string | null,
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    gender: '',
    dob: '',
    userType: '',
    domain: '',
    location: '',
    preferredWork: '',
    bio: '',
    careerGoal: '',
    interests: [] as string[],
    skills: [] as { name: string; proficiency: string; years: string }[],
    isCurrentStudent: true,
    isCurrentEmployee: false,
    education: {
      institution: '',
      degree: '',
      specialization: '',
      startYear: '2022',
      endYear: '2026',
      cgpa: '',
    },
    educationList: [] as { institution: string; degree: string; specialization: string; startYear: string; endYear: string; cgpa: string }[],
    experience: {
      company: '',
      role: '',
      type: 'Full-time',
      responsibilities: '',
    },

    resume: {
      fileName: 'No resume uploaded',
      uploadDate: '',
      atsScore: 0,
      version: '1.0',
    },
    projects: [] as { title: string; description: string; link: string; isFeatured: boolean; tags: string[] }[],
    certifications: [] as { name: string; issuer: string; date: string; link: string }[],
    achievements: [] as { title: string; organization: string; month: string; year: string; category: string; description: string; link: string; isFeatured: boolean }[],
    experienceList: [] as { company: string; role: string; type: string; responsibilities: string; location?: string }[],
    jobDescription: '',
    linkedin: '',
    github: '',
    twitter: '',
    portfolio: '',
    leetcode: '',
    hackerrank: '',
    oneStrongWord: '',
    githubUsername: '',
    searchStatus: 'active',
    profileVisible: true,
    newsletter: false,
  });

  // Resume upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [resumeParseResult, setResumeParseResult] = useState<any>(null);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [isEditingStrongWord, setIsEditingStrongWord] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [avatars, setAvatars] = useState<{ label: string; image_url: string; crop_x: number; crop_y: number; crop_w: number; crop_h: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const shareTemplateRef = useRef<HTMLDivElement>(null);

  const [sectionStatus, setSectionStatus] = useState<Record<string, 'saving' | 'saved' | 'error' | null>>({});
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubAnalytics, setGithubAnalytics] = useState<any>(null);
  const [shareQrDataUrl, setShareQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/institution/avatars`);
        if (res.ok) {
          const data = await res.json();
          setAvatars(data.avatars || []);
        }
      } catch { /* use fallback below */ }
    })();
  }, []);

  useEffect(() => {
    if (!user?.user_id) {
      setProfileLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/user/${user.user_id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({
            ...prev,
            firstName: data.full_name ? data.full_name.split(' ')[0] : prev.firstName,
            lastName: data.full_name ? data.full_name.split(' ').slice(1).join(' ') : prev.lastName,
            phone: data.phone || prev.phone,
            gender: data.gender || prev.gender,
            dob: data.dob || prev.dob,
            userType: data.userType || prev.userType,
            domain: data.domain || prev.domain,
            location: data.location || prev.location,
            preferredWork: data.preferredWork || prev.preferredWork,
            bio: data.bio || prev.bio,
            careerGoal: data.careerGoal || prev.careerGoal,
            interests: data.interests?.length ? data.interests : prev.interests,
            profilePhoto: data.profilePhoto || prev.profilePhoto,
            skills: data.skills?.length ? data.skills : prev.skills,
            education: data.education || prev.education,
            educationList: data.educationList || prev.educationList,
            experience: data.experience || prev.experience,
            projects: data.projects || prev.projects,
            certifications: data.certifications || prev.certifications,
            achievements: data.achievements || prev.achievements,
            resume: data.resume || prev.resume,
            linkedin: data.linkedin || prev.linkedin,
            github: data.github || prev.github,
            twitter: data.twitter || prev.twitter,
            portfolio: data.portfolio || prev.portfolio,
            leetcode: data.leetcode || prev.leetcode,
            hackerrank: data.hackerrank || prev.hackerrank,
            searchStatus: data.searchStatus || prev.searchStatus,
            profileVisible: data.profileVisible ?? prev.profileVisible,
            newsletter: data.newsletter ?? prev.newsletter,
            isCurrentStudent: data.isCurrentStudent ?? prev.isCurrentStudent,
            isCurrentEmployee: data.isCurrentEmployee ?? prev.isCurrentEmployee,
          }));
        } else {
          const names = user.full_name?.split(' ') || [];
          setFormData(prev => ({
            ...prev,
            firstName: names[0] || '',
            lastName: names.slice(1).join(' ') || '',
          }));
        }
      } catch (err) {
        try { console.error('Profile load error:', err instanceof Error ? err.message : String(err)); } catch (_) {}
        const names = user.full_name?.split(' ') || [];
        setFormData(prev => ({
          ...prev,
          firstName: names[0] || '',
          lastName: names.slice(1).join(' ') || '',
        }));
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // ─── REAL: Save full profile to backend ───
  const handleSave = async (section: string) => {
    if (!user?.user_id) return;
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/${user.user_id}/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Ensure arrays and objects are clean
          skills: formData.skills || [],
          projects: formData.projects || [],
          certifications: formData.certifications || [],
          achievements: formData.achievements || [],
          interests: formData.interests || [],
          educationList: formData.educationList || [],
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Save failed');
      }

      const message = `${section} saved successfully!`;
      setSaveStatus({ type: 'success', message });
      // Sync userType → AuthContext so eligibility checks work immediately
      if (formData.userType) {
        updateUser({ profile_type: formData.userType });
      }
      if (section === 'Education') {
        setSectionStatus({ section, type: 'success', message });
        setTimeout(() => setSectionStatus(current => current?.section === section ? null : current), 3000);
      }
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save. Please try again.';
      setSaveStatus({ type: 'error', message: errorMessage });
      if (section === 'Education') {
        setSectionStatus({ section, type: 'error', message: errorMessage });
        setTimeout(() => setSectionStatus(current => current?.section === section ? null : current), 4000);
      }
      setTimeout(() => setSaveStatus(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── REAL: Delete item from backend + local state ───
  const handleDeleteItem = async (section: string, index: number, stateKey: keyof typeof formData) => {
    if (!user?.user_id) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/user/${user.user_id}/profile/${section}/${index}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        const updated = await res.json();
        setFormData(prev => ({ ...prev, [stateKey]: updated[stateKey as string] || [] }));
        setSaveStatus({ type: 'success', message: 'Deleted successfully!' });
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setSaveStatus({ type: 'error', message: 'Delete failed: ' + errorMessage });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, profilePhoto: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('resume', file);
      const res = await fetch(`${API_BASE_URL}/api/user/${user?.user_id}/upload-resume`, {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, resume: { fileName: file.name, uploadDate: new Date().toISOString(), atsScore: data.atsScore || 0, version: '1.0' } }));
        if (data.skills) setFormData(prev => ({ ...prev, skills: data.skills }));
        if (data.extractedSkills) setExtractedSkills(data.extractedSkills);
        setResumeParseResult(data);
      }
    } catch { /* ignore */ }
    setIsUploading(false);
  };

  const removeInterest = (tag: string) => {
    setFormData(prev => ({ ...prev, interests: prev.interests.filter(t => t !== tag) }));
  };

  const addSkillToList = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    setFormData(prev => ({ ...prev, skills: [...prev.skills, { name: trimmed, proficiency: 'Intermediate', years: '' }] }));
    setNewSkillInput('');
  };

  const removeSkillFromList = (index: number) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
  };

  const updateSkillField = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const updated = [...prev.skills];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, skills: updated };
    });
  };

  const copyImageToClipboard = async (blob: Blob): Promise<boolean> => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch { return false; }
  };

  const handleStrongWordInputBlur = () => {
    setIsEditingStrongWord(false);
  };

  const chooseStrongWord = (word: string) => {
    setFormData(prev => ({ ...prev, oneStrongWord: word }));
    setIsEditingStrongWord(false);
  };

  const calculateStrength = () => {
    let score = 0;
    if (formData.firstName && formData.lastName) score += 10;
    if (formData.phone) score += 5;
    if (formData.gender) score += 5;
    if (formData.dob) score += 5;
    if (formData.location) score += 5;
    if (formData.bio) score += 10;
    if (formData.careerGoal) score += 5;
    if (formData.profilePhoto) score += 10;
    if (formData.skills && formData.skills.length > 0) score += 10;
    if (formData.interests && formData.interests.length > 0) score += 5;
    if (formData.educationList && formData.educationList.length > 0) score += 10;
    if (formData.experienceList && formData.experienceList.length > 0) score += 10;
    if (formData.projects && formData.projects.length > 0) score += 5;
    if (formData.certifications && formData.certifications.length > 0) score += 5;
    if (formData.linkedin) score += 5;
    if (formData.github || formData.githubUsername) score += 5;
    if (formData.portfolio) score += 5;
    return Math.min(100, score);
  };
  const profileCompletion = Math.min(100, calculateStrength());
  const profileDisplayName = [formData.firstName, formData.lastName].filter(Boolean).join(' ') || user?.full_name || 'Your Profile';
  const profileRole = formData.userType || user?.role || 'Contributor';
  const profileHeadline = formData.bio || formData.careerGoal || '';
  const profileInitials = [formData.firstName, formData.lastName]
    .filter(Boolean)
    .map(part => part.trim().charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'SL';
  const toAvatarDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  const createAvatarDataUri = (theme: {
    backgroundA: string;
    backgroundB: string;
    skin: string;
    hair: string;
    shirt: string;
    accent: string;
    accessory: 'none' | 'glasses' | 'headphones' | 'cap' | 'hairclip' | 'hood';
    eyes: 'round' | 'spark' | 'focused' | 'smile';
    mouth: 'smile' | 'calm' | 'grin';
  }) => {
    const accessorySvg = {
      none: '',
      glasses: `
        <g stroke="#111827" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="154" y="198" width="74" height="46" rx="18" />
          <rect x="284" y="198" width="74" height="46" rx="18" />
          <path d="M228 219h56" />
        </g>`,
      headphones: `
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M160 242c0-60 42-100 96-100s96 40 96 100" stroke="#111827" stroke-width="20" />
          <rect x="122" y="232" width="42" height="88" rx="18" fill="#111827" />
          <rect x="348" y="232" width="42" height="88" rx="18" fill="#111827" />
          <rect x="132" y="250" width="22" height="52" rx="11" fill="${theme.accent}" />
          <rect x="358" y="250" width="22" height="52" rx="11" fill="${theme.accent}" />
        </g>`,
      cap: `
        <g>
          <path d="M140 182c10-62 66-102 116-102s106 40 116 102c-38-18-73-26-116-26s-78 8-116 26Z" fill="#111827" />
          <path d="M138 184c38-18 75-28 118-28s80 10 120 30" fill="none" stroke="${theme.accent}" stroke-width="12" stroke-linecap="round" />
        </g>`,
      hairclip: `
        <circle cx="352" cy="165" r="16" fill="${theme.accent}" />
        <circle cx="368" cy="182" r="12" fill="#ffffff" />`,
      hood: `
        <path d="M124 314c18-78 78-126 132-126s114 48 132 126c-28 30-66 48-132 48s-104-18-132-48Z" fill="${theme.accent}" opacity="0.95" />
        <path d="M166 312c14-40 50-72 90-72s76 32 90 72" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="10" stroke-linecap="round" />`,
    }[theme.accessory];

    const eyeSvg = {
      round: `<circle cx="188" cy="230" r="11" fill="#111827" /><circle cx="324" cy="230" r="11" fill="#111827" />`,
      spark: `<path d="M188 219l6 10 11 3-11 3-6 10-6-10-11-3 11-3 6-10Zm136 0 6 10 11 3-11 3-6 10-6-10-11-3 11-3 6-10Z" fill="#111827" />`,
      focused: `<path d="M173 230h30M309 230h30" stroke="#111827" stroke-width="10" stroke-linecap="round" />`,
      smile: `<path d="M174 225c10 16 28 24 42 24s32-8 42-24M310 225c10 16 28 24 42 24s32-8 42-24" fill="none" stroke="#111827" stroke-width="9" stroke-linecap="round" />`,
    }[theme.eyes];

    const mouthSvg = {
      smile: `<path d="M214 306c16 18 40 28 42 28s26-10 42-28" fill="none" stroke="#111827" stroke-width="10" stroke-linecap="round" />`,
      calm: `<path d="M218 310h76" stroke="#111827" stroke-width="10" stroke-linecap="round" />`,
      grin: `<path d="M208 302c16 10 30 16 48 16s32-6 48-16" fill="none" stroke="#111827" stroke-width="12" stroke-linecap="round" />`,
    }[theme.mouth];

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${theme.backgroundA}" />
            <stop offset="100%" stop-color="${theme.backgroundB}" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="26%" r="76%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.36" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="512" height="512" rx="128" fill="url(#bg)" />
        <circle cx="170" cy="148" r="132" fill="url(#glow)" />
        <circle cx="346" cy="352" r="118" fill="#ffffff" opacity="0.12" />
        <ellipse cx="256" cy="346" rx="126" ry="92" fill="${theme.shirt}" opacity="0.98" />
        <path d="M182 292c12-58 42-92 74-108 32 16 62 50 74 108 4 20 1 37-8 52-13 22-34 32-66 32s-53-10-66-32c-9-15-12-32-8-52Z" fill="${theme.skin}" />
        <path d="M176 240c0-54 38-92 80-92s80 38 80 92c0 7-1 14-2 20-9-14-25-27-46-36-20-9-43-13-64-13s-44 4-64 13c-21 9-37 22-46 36-1-6-2-13-2-20Z" fill="${theme.hair}" />
        <path d="M188 186c18-22 42-32 68-32s50 10 68 32" fill="none" stroke="#111827" stroke-opacity="0.04" stroke-width="10" stroke-linecap="round" />
        <ellipse cx="220" cy="284" rx="14" ry="18" fill="#ffffff" opacity="0.14" />
        <ellipse cx="292" cy="284" rx="14" ry="18" fill="#ffffff" opacity="0.14" />
        <ellipse cx="206" cy="286" rx="7" ry="6" fill="#ffffff" opacity="0.18" />
        <ellipse cx="306" cy="286" rx="7" ry="6" fill="#ffffff" opacity="0.18" />
        ${eyeSvg}
        ${mouthSvg}
        <path d="M200 262c10 8 24 12 56 12s46-4 56-12" fill="none" stroke="#111827" stroke-width="6" stroke-linecap="round" opacity="0.12" />
        <circle cx="214" cy="262" r="8" fill="#fda4af" opacity="0.55" />
        <circle cx="298" cy="262" r="8" fill="#fda4af" opacity="0.55" />
        ${accessorySvg}
        <path d="M196 350c18 10 36 14 60 14s42-4 60-14" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="10" stroke-linecap="round" />
        <rect x="170" y="392" width="172" height="18" rx="9" fill="#ffffff" opacity="0.18" />
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };
  const APP_BASE_URL = (import.meta as any).env?.VITE_PUBLIC_URL || window.location.origin;
const publicProfileUrl = user?.user_id && typeof window !== 'undefined'
  ? `${APP_BASE_URL}/profile/${user.user_id}`
  : '';

  const profileShareCaption = `${profileDisplayName} | Studlyf\n${profileRole}\n${profileHeadline}`;
  const whatsappShareText = [
    '*STUDLYF Community*',
    'AI • Tech • Wellness • Execution',
    '_Student Innovation & Community Ecosystem_',
    '',
    `*${profileDisplayName}*`,
    profileRole,
    profileHeadline,
    '',
    publicProfileUrl,
  ].join('\n');

  const profileTemplateFileName = `${profileDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'studlyf-profile'}-template.png`;
  const profileHeadlineText = profileHeadline || 'A mission-driven learner building real-world projects and growth.';

  const captureProfileTemplate = async () => {
    if (!shareTemplateRef.current) {
      throw new Error('Profile template is not ready yet.');
    }
    // Safer approach: build a simplified clone of the template, strip all classes
    // and complex styles, append it visibly offscreen, capture it, then remove.
    const original = shareTemplateRef.current;
    const clone = original.cloneNode(true) as HTMLElement;

    // Remove class names and inline styles from clone elements to avoid complex CSS
    const nodes = [clone, ...Array.from(clone.querySelectorAll('*'))] as HTMLElement[];
    for (const n of nodes) {
      try {
        n.className = '';
        n.id = '';
        // preserve text content but reset styles
        n.style.cssText = 'box-sizing:border-box; color:#111827; background:transparent;';
      } catch (e) {}
    }

    // Wrap clone in a container with explicit clean styles
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '50%';
    container.style.top = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '99999';
    container.style.background = '#ffffff';
    container.style.padding = '24px';
    container.style.borderRadius = '24px';
    container.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
    container.style.maxWidth = '1080px';
    container.style.visibility = 'visible';
    container.appendChild(clone);

    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { backgroundColor: null, scale: 2, useCORS: true });
      return canvas;
    } finally {
      try { document.body.removeChild(container); } catch (e) {}
    }
  };
  const generateProfileCardBlob = async (): Promise<{ blob: Blob; dataUrl: string }> => {
  const issueDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const profileSummaryText = formData.bio || formData.careerGoal || 'A motivated community member building credible project experience, collaborative skills, and a professional public profile.';
  const communityQuote = 'Dreaming something huge in life? Then Studlyf is the best opportunity to build, learn, and lead.';
  const skills = formData.skills.map(skill => skill.name).filter(Boolean).slice(0, 16);
  const certifications = formData.certifications.map(cert => cert.name).filter(Boolean).slice(0, 10);
  const educationList = [...formData.educationList, formData.education]
    .filter(item => item.institution || item.degree || item.specialization)
    .slice(0, 3);
  const experienceList = formData.experienceList.slice(0, 4);
  const projectList = formData.projects.slice(0, 4).map(project => project.title || project.description || 'Project');
  const achievements = formData.achievements.slice(0, 4).map(item => item.title || item.organization || 'Achievement');
  const interests = formData.interests.filter(Boolean).slice(0, 10);
  const qrDataUrl = publicProfileUrl
    ? await QRCode.toDataURL(publicProfileUrl, {
        width: 160,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#f8fafc',
        },
      })
    : null;

  const contactItems = [
    { label: 'Location', value: formData.location || 'Not provided' },
    { label: 'Phone', value: formData.phone || 'Not provided' },
    { label: 'LinkedIn', value: formData.linkedin || 'Not provided' },
    { label: 'Portfolio', value: formData.portfolio || 'Not provided' },
  ];
  if (formData.githubUsername) {
    contactItems.push({ label: 'GitHub', value: `github.com/${formData.githubUsername}` });
  }

  const container = document.createElement('div');
  container.style.width = '900px';
  container.style.margin = '0';
  container.style.padding = '0';
  container.style.boxSizing = 'border-box';
  container.style.background = '#e5e7eb';
  container.style.fontFamily = "'Poppins', sans-serif";
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';

  const card = document.createElement('div');
  card.style.width = '900px';
  card.style.minHeight = '1250px';
  card.style.boxSizing = 'border-box';
  card.style.background = '#ffffff';
  card.style.position = 'relative';
  card.style.overflow = 'hidden';
  card.style.border = '1px solid #d1d5db';
  card.style.boxShadow = '0 24px 80px rgba(15, 23, 42, 0.12)';

  const topAccent = document.createElement('div');
  topAccent.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:260px;background:linear-gradient(135deg,#fde68a 0%,#fbcfe8 100%);clip-path:polygon(0 0,100% 0,100% 62%,0 100%);z-index:1;';
  card.appendChild(topAccent);

  const header = document.createElement('div');
  header.style.cssText = 'position:relative;display:flex;align-items:flex-start;justify-content:space-between;padding:40px 56px 0;gap:24px;z-index:2;';

  const nameBlock = document.createElement('div');
  nameBlock.style.cssText = 'display:flex;flex-direction:column;gap:10px;max-width:620px;';
  const nameTitle = document.createElement('div');
  nameTitle.style.cssText = 'font-size:42px;font-weight:900;color:#0f172a;line-height:1.05;font-family: "Poppins", sans-serif;';
  nameTitle.innerText = profileDisplayName || 'Your Name';
  const roleSubtitle = document.createElement('div');
  roleSubtitle.style.cssText = 'font-size:18px;font-weight:700;color:#334155;letter-spacing:0.01em;';
  roleSubtitle.innerText = profileRole || 'Professional Profile';
  const tagline = document.createElement('div');
  tagline.style.cssText = 'font-size:14px;line-height:1.8;color:#475569;max-width:760px;';
  tagline.innerText = profileHeadlineText;
  const dateText = document.createElement('div');
  dateText.style.cssText = 'font-size:12px;color:#475569;';
  dateText.innerText = `Prepared on ${issueDate}`;
  nameBlock.appendChild(nameTitle);
  nameBlock.appendChild(roleSubtitle);
  nameBlock.appendChild(tagline);
  nameBlock.appendChild(dateText);

  const avatarFrame = document.createElement('div');
  avatarFrame.style.cssText = 'width:140px;height:140px;border-radius:28px;overflow:hidden;background:#fff;border:4px solid rgba(255,255,255,0.88);box-shadow:0 20px 40px rgba(15,23,42,0.14);display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  if (formData.profilePhoto) {
    const avatarImg = document.createElement('img');
    avatarImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    avatarImg.src = formData.profilePhoto;
    avatarImg.alt = 'Profile';
    avatarFrame.appendChild(avatarImg);
  } else {
    const placeholder = document.createElement('div');
    placeholder.style.cssText = 'font-size:36px;font-weight:900;color:#64748b;';
    placeholder.innerText = profileDisplayName
      ? profileDisplayName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
      : 'NA';
    avatarFrame.appendChild(placeholder);
  }

  header.appendChild(nameBlock);
  header.appendChild(avatarFrame);
  card.appendChild(header);

  const profileLabel = document.createElement('div');
  profileLabel.style.cssText = 'position:relative;z-index:2;text-align:center;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;color:#334155;margin:18px 56px 0;';
  profileLabel.innerText = 'Profile';
  card.appendChild(profileLabel);

  const divider = document.createElement('div');
  divider.style.cssText = 'height:1px;background:#e2e8f0;margin:16px 56px 24px;';
  card.appendChild(divider);

  const main = document.createElement('div');
  main.style.cssText = 'display:grid;grid-template-columns:1.15fr 0.85fr;gap:24px;padding:0 56px 44px;';

  const leftColumn = document.createElement('div');
  leftColumn.style.cssText = 'display:flex;flex-direction:column;gap:20px;';

  const section = (title: string, content: HTMLElement[]) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'padding:24px;border-radius:24px;background:#f8fafc;border:1px solid #e2e8f0;';
    const heading = document.createElement('div');
    heading.style.cssText = 'font-size:14px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:16px;';
    heading.innerText = title;
    wrapper.appendChild(heading);
    content.forEach(node => wrapper.appendChild(node));
    return wrapper;
  };

  const summaryBlock = document.createElement('div');
  summaryBlock.style.cssText = 'font-size:14px;line-height:1.8;color:#475569;';
  summaryBlock.innerText = profileSummaryText;
  leftColumn.appendChild(section('Professional Summary', [summaryBlock]));

  const createList = (items: string[]) => {
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
    items.forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:12px;align-items:flex-start;';
      const dot = document.createElement('div');
      dot.style.cssText = 'width:8px;height:8px;margin-top:7px;border-radius:999px;background:#0f172a;flex-shrink:0;';
      const text = document.createElement('div');
      text.style.cssText = 'font-size:13px;line-height:1.75;color:#475569;';
      text.innerText = item;
      row.appendChild(dot);
      row.appendChild(text);
      list.appendChild(row);
    });
    return list;
  };

  const experienceItems = experienceList.length > 0
    ? experienceList.map(exp => `${exp.role || 'Role'} at ${exp.company || 'Company'} (${exp.type || 'Type'})`) 
    : projectList.map((project, index) => `Project ${index + 1}: ${project}`);
  if (experienceItems.length) {
    leftColumn.appendChild(section('Work & Projects', [createList(experienceItems)]));
  }

  const educationNodes = educationList.map(item => {
    const block = document.createElement('div');
    block.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;';
    const titleLine = document.createElement('div');
    titleLine.style.cssText = 'font-size:14px;font-weight:700;color:#0f172a;';
    titleLine.innerText = `${item.degree || item.specialization || 'Education'} • ${item.institution || 'Institution'}`;
    const period = document.createElement('div');
    period.style.cssText = 'font-size:12px;color:#64748b;';
    period.innerText = `${item.startYear || ''} – ${item.endYear || ''}`.trim();
    block.appendChild(titleLine);
    if (period.innerText) block.appendChild(period);
    return block;
  });
  if (educationNodes.length) {
    leftColumn.appendChild(section('Education', educationNodes));
  }

  const rightColumn = document.createElement('div');
  rightColumn.style.cssText = 'display:flex;flex-direction:column;gap:20px;';

  const contactItemsNodes = contactItems.map(item => {
    const itemRow = document.createElement('div');
    itemRow.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    const label = document.createElement('div');
    label.style.cssText = 'font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.18em;';
    label.innerText = item.label;
    const value = document.createElement('div');
    value.style.cssText = 'font-size:13px;color:#0f172a;font-weight:700;word-break:break-word;';
    value.innerText = item.value;
    itemRow.appendChild(label);
    itemRow.appendChild(value);
    return itemRow;
  });
  rightColumn.appendChild(section('Contact', contactItemsNodes));

  if (skills.length) {
    const skillsList = createList(skills);
    rightColumn.appendChild(section('Skills', [skillsList]));
  }

  if (certifications.length) {
    const certList = createList(certifications);
    rightColumn.appendChild(section('Certifications', [certList]));
  }

  if (interests.length) {
    const interestGrid = document.createElement('div');
    interestGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;';
    interests.forEach(interest => {
      const tag = document.createElement('div');
      tag.style.cssText = 'padding:10px 12px;border-radius:999px;background:#f8fafc;color:#0f172a;font-size:12px;font-weight:700;border:1px solid #e2e8f0;';
      tag.innerText = interest;
      interestGrid.appendChild(tag);
    });
    rightColumn.appendChild(section('Interests', [interestGrid]));
  }

  if (achievements.length) {
    rightColumn.appendChild(section('Achievements', [createList(achievements)]));
  }

  if (formData.githubUsername || githubAnalytics) {
    const githubBlock = document.createElement('div');
    githubBlock.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
    const githubLabel = document.createElement('div');
    githubLabel.style.cssText = 'font-size:12px;font-weight:700;color:#0f172a;';
    githubLabel.innerText = 'GitHub Insights';
    const githubLink = document.createElement('div');
    githubLink.style.cssText = 'font-size:13px;font-weight:700;color:#1d4ed8;word-break:break-word;';
    githubLink.innerText = formData.githubUsername ? `github.com/${formData.githubUsername}` : 'No GitHub username provided';
    githubBlock.appendChild(githubLabel);
    githubBlock.appendChild(githubLink);

    if (githubAnalytics) {
      const scoreRow = document.createElement('div');
      scoreRow.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;';
      const addMetric = (label: string, value: string) => {
        const metric = document.createElement('div');
        metric.style.cssText = 'padding:12px;border-radius:18px;background:#eff6ff;';
        const metricLabel = document.createElement('div');
        metricLabel.style.cssText = 'font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;color:#0f172a;margin-bottom:6px;';
        metricLabel.innerText = label;
        const metricValue = document.createElement('div');
        metricValue.style.cssText = 'font-size:18px;font-weight:900;color:#111827;';
        metricValue.innerText = value;
        metric.appendChild(metricLabel);
        metric.appendChild(metricValue);
        return metric;
      };
      scoreRow.appendChild(addMetric('Score', `${githubAnalytics.score}/100`));
      scoreRow.appendChild(addMetric('Repos', String(githubAnalytics.repoCount)));
      scoreRow.appendChild(addMetric('Stars', String(githubAnalytics.totalStars)));
      scoreRow.appendChild(addMetric('Forks', String(githubAnalytics.totalForks)));
      githubBlock.appendChild(scoreRow);
      const languagesRow = document.createElement('div');
      languagesRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
      githubAnalytics.topLanguages.slice(0, 5).forEach(lang => {
        const chip = document.createElement('div');
        chip.style.cssText = 'padding:8px 12px;border-radius:999px;background:#e0e7ff;color:#3730a3;font-size:12px;font-weight:800;';
        chip.innerText = lang;
        languagesRow.appendChild(chip);
      });
      githubBlock.appendChild(languagesRow);
    }

    rightColumn.appendChild(section('GitHub', [githubBlock]));
  }

  const qrSection = document.createElement('div');
  qrSection.style.cssText = 'padding:20px;border-radius:24px;background:#f8fafc;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:14px;align-items:center;';
  const qrTitle = document.createElement('div');
  qrTitle.style.cssText = 'font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.18em;';
  qrTitle.innerText = 'Profile QR Code';
  qrSection.appendChild(qrTitle);
  if (qrDataUrl) {
    const qrImg = document.createElement('img');
    qrImg.src = qrDataUrl;
    qrImg.alt = 'Profile QR code';
    qrImg.style.cssText = 'width:140px;height:140px;border-radius:20px;background:#fff;padding:10px;';
    qrSection.appendChild(qrImg);
  }
  const qrDescription = document.createElement('div');
  qrDescription.style.cssText = 'font-size:12px;color:#475569;text-align:center;line-height:1.6;';
  qrDescription.innerText = publicProfileUrl ? 'Scan to open the public profile instantly.' : 'Save the profile to enable the QR link.';
  qrSection.appendChild(qrDescription);
  rightColumn.appendChild(qrSection);

  main.appendChild(leftColumn);
  main.appendChild(rightColumn);
  card.appendChild(main);

  const footer = document.createElement('div');
  footer.style.cssText = 'padding:24px 56px 28px;display:flex;justify-content:space-between;align-items:center;gap:20px;border-top:1px solid #e2e8f0;background:#f8fafc;';
  const footerLeft = document.createElement('div');
  footerLeft.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
  const footerTitle = document.createElement('div');
  footerTitle.style.cssText = 'font-size:12px;font-weight:800;color:#0f172a;';
  footerTitle.innerText = 'Studlyf Professional Resume';
  const footerNote = document.createElement('div');
  footerNote.style.cssText = 'font-size:12px;color:#64748b;line-height:1.6;';
  footerNote.innerText = 'Organized, readable, and ready to share with recruiters and network connections.';
  footerLeft.appendChild(footerTitle);
  footerLeft.appendChild(footerNote);
  const footerRight = document.createElement('div');
  footerRight.style.cssText = 'font-size:10px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.18em;';
  footerRight.innerText = 'studlyf.com';
  footer.appendChild(footerLeft);
  footer.appendChild(footerRight);
  card.appendChild(footer);

  container.appendChild(card);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#e5e7eb',
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });
    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Blob generation failed')), 'image/png');
    });
    return { blob, dataUrl };
  } finally {
    try { document.body.removeChild(container); } catch (e) {}
  }
};
  const downloadProfileTemplate = async () => {
    if (!publicProfileUrl) return;
    setIsGeneratingTemplate(true);

    try {
      const { blob } = await generateProfileCardBlob();
      const link = document.createElement('a');
      link.download = profileTemplateFileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      setSaveStatus({ type: 'success', message: 'Profile downloaded successfully — your profile is downloaded.' });
      setTimeout(() => setSaveStatus(null), 4500);
    } catch (err) {
      const errorMessage = (err as Error)?.message || 'Unable to download.';
      setSaveStatus({ type: 'error', message: errorMessage });
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsGeneratingTemplate(false);
    }

    return;

    try {
      const canvas = await (async () => {
        const container = document.createElement('div');
        container.style.width = '900px';
        container.style.margin = '0';
        container.style.padding = '0';
        container.style.boxSizing = 'border-box';
        container.style.background = '#0f0f13';
        container.style.fontFamily = "'Poppins', sans-serif";
        container.style.position = 'fixed';
        container.style.left = '-99999px';
        container.style.top = '0';

        const card = document.createElement('div');
        card.style.width = '900px';
        card.style.minHeight = '1100px';
        card.style.boxSizing = 'border-box';
        card.style.background = '#0f0f13';
        card.style.position = 'relative';
        card.style.overflow = 'hidden';

        // ── Background blobs ──
        const blob1 = document.createElement('div');
        blob1.style.cssText = `position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,#7C3AED55,transparent 70%);top:-100px;left:-100px;pointer-events:none;`;
        const blob2 = document.createElement('div');
        blob2.style.cssText = `position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,#06b6d455,transparent 70%);bottom:-80px;right:-80px;pointer-events:none;`;
        const blob3 = document.createElement('div');
        blob3.style.cssText = `position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,#f59e0b33,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;`;
        card.appendChild(blob1);
        card.appendChild(blob2);
        card.appendChild(blob3);

        // ── Top accent bar ──
        const accentBar = document.createElement('div');
        accentBar.style.cssText = `height:5px;background:linear-gradient(90deg,#7C3AED,#06b6d4,#f59e0b);width:100%;`;
        card.appendChild(accentBar);

        // ── Header section ──
        const header = document.createElement('div');
        header.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:48px 56px 32px;position:relative;z-index:2;`;

        // Left: photo only
        const headerLeft = document.createElement('div');
        headerLeft.style.cssText = `display:flex;align-items:center;gap:28px;`;

        // Photo
        const photoRing = document.createElement('div');
        photoRing.style.cssText = `width:110px;height:110px;border-radius:28px;padding:3px;background:linear-gradient(135deg,#7C3AED,#06b6d4);flex-shrink:0;box-shadow:0 0 40px #7C3AED55;`;
        const photoInner = document.createElement('div');
        photoInner.style.cssText = `width:100%;height:100%;border-radius:25px;overflow:hidden;background:#1a1a2e;`;
        if (formData.profilePhoto) {
          const img = document.createElement('img');
          img.src = formData.profilePhoto;
          img.style.cssText = `width:100%;height:100%;object-fit:cover;`;
          img.crossOrigin = 'anonymous';
          photoInner.appendChild(img);
        } else {
          photoInner.style.cssText += `display:flex;align-items:center;justify-content:center;`;
          const userIcon = document.createElement('div');
          userIcon.style.cssText = `width:54px;height:54px;border-radius:50%;border:3px solid #7C3AED;color:#7C3AED;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;`;
          userIcon.innerText = '◎';
          photoInner.appendChild(userIcon);
        }
        photoRing.appendChild(photoInner);

        headerLeft.appendChild(photoRing);

        // Right: score circle
        const scoreCircle = document.createElement('div');
        scoreCircle.style.cssText = `width:100px;height:100px;border-radius:50%;background:conic-gradient(#7C3AED ${profileCompletion * 3.6}deg, #ffffff11 0deg);display:flex;align-items:center;justify-content:center;box-shadow:0 0 30px #7C3AED44;flex-shrink:0;`;
        const scoreInner = document.createElement('div');
        scoreInner.style.cssText = `width:80px;height:80px;border-radius:50%;background:#0f0f13;display:flex;flex-direction:column;align-items:center;justify-content:center;`;
        const scoreNum = document.createElement('div');
        scoreNum.style.cssText = `font-size:22px;font-weight:900;color:#fff;line-height:1;`;
        scoreNum.innerText = `${profileCompletion}%`;
        const scoreLabel = document.createElement('div');
        scoreLabel.style.cssText = `font-size:8px;font-weight:800;color:#7C3AED;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;`;
        scoreLabel.innerText = 'Score';
        scoreInner.appendChild(scoreNum);
        scoreInner.appendChild(scoreLabel);
        scoreCircle.appendChild(scoreInner);

        header.appendChild(headerLeft);
        header.appendChild(scoreCircle);
        card.appendChild(header);

        // ── Bio ──
        if (formData.bio || formData.careerGoal) {
          const bioWrap = document.createElement('div');
          bioWrap.style.cssText = `margin:0 56px 32px;padding:20px 24px;background:#ffffff08;border:1px solid #ffffff11;border-radius:20px;position:relative;z-index:2;border-left:3px solid #7C3AED;`;
          const bioText = document.createElement('div');
          bioText.style.cssText = `font-size:13px;color:#cbd5e1;line-height:1.7;font-weight:500;`;
          bioText.innerText = formData.bio || formData.careerGoal;
          bioWrap.appendChild(bioText);
          card.appendChild(bioWrap);
        }

        // ── Stats row ──
        const statsRow = document.createElement('div');
        statsRow.style.cssText = `display:flex;gap:16px;padding:0 56px 36px;position:relative;z-index:2;`;
        const stats = [
          { label: 'Skills', value: formData.skills.length, color: '#7C3AED' },
          { label: 'Projects', value: formData.projects.length, color: '#06b6d4' },
          { label: 'Experience', value: formData.experienceList.length, color: '#f59e0b' },
          { label: 'Certificates', value: formData.certifications.length, color: '#10b981' },
        ];
        stats.forEach(stat => {
          const s = document.createElement('div');
          s.style.cssText = `flex:1;background:#ffffff08;border:1px solid #ffffff11;border-radius:18px;padding:18px 16px;text-align:center;border-top:2px solid ${stat.color};`;
          const sv = document.createElement('div');
          sv.style.cssText = `font-size:30px;font-weight:900;color:#fff;line-height:1;`;
          sv.innerText = String(stat.value);
          const sl = document.createElement('div');
          sl.style.cssText = `font-size:9px;font-weight:800;color:${stat.color};text-transform:uppercase;letter-spacing:0.15em;margin-top:6px;`;
          sl.innerText = stat.label;
          s.appendChild(sv);
          s.appendChild(sl);
          statsRow.appendChild(s);
        });
        card.appendChild(statsRow);

        const qrDataUrl = await QRCode.toDataURL(publicProfileUrl, {
          margin: 1,
          width: 180,
          color: {
            dark: '#0f0f13',
            light: '#ffffff',
          },
        });

        const qrSection = document.createElement('div');
        qrSection.style.cssText = `margin:0 56px 28px;padding:18px 20px;background:#ffffff08;border:1px solid #ffffff11;border-radius:20px;display:flex;align-items:center;justify-content:space-between;gap:20px;position:relative;z-index:2;`;

        const qrTextWrap = document.createElement('div');
        qrTextWrap.style.cssText = `display:flex;flex-direction:column;gap:6px;`;
        const qrLabel = document.createElement('div');
        qrLabel.style.cssText = `font-size:10px;font-weight:900;color:#06b6d4;text-transform:uppercase;letter-spacing:0.2em;`;
        qrLabel.innerText = 'Scan to open profile';
        const qrTitle = document.createElement('div');
        qrTitle.style.cssText = `font-size:15px;font-weight:800;color:#ffffff;line-height:1.4;`;
        qrTitle.innerText = 'Open the public profile instantly from this card.';
        const qrLink = document.createElement('div');
        qrLink.style.cssText = `font-size:11px;color:#cbd5e1;word-break:break-all;line-height:1.5;`;
        qrLink.innerText = publicProfileUrl;
        qrTextWrap.appendChild(qrLabel);
        qrTextWrap.appendChild(qrTitle);
        qrTextWrap.appendChild(qrLink);

        const qrImageWrap = document.createElement('div');
        qrImageWrap.style.cssText = `width:132px;height:132px;padding:10px;border-radius:18px;background:#ffffff;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);`;
        const qrImage = document.createElement('img');
        qrImage.src = qrDataUrl;
        qrImage.alt = 'Public profile QR code';
        qrImage.style.cssText = `width:100%;height:100%;object-fit:contain;`;
        qrImage.crossOrigin = 'anonymous';
        qrImageWrap.appendChild(qrImage);

        qrSection.appendChild(qrTextWrap);
        qrSection.appendChild(qrImageWrap);
        card.appendChild(qrSection);

        // ── Two column body ──
        const body = document.createElement('div');
        body.style.cssText = `display:flex;gap:20px;padding:0 56px 40px;position:relative;z-index:2;`;

        const leftCol = document.createElement('div');
        leftCol.style.cssText = `flex:1.4;display:flex;flex-direction:column;gap:20px;`;

        const rightCol = document.createElement('div');
        rightCol.style.cssText = `flex:1;display:flex;flex-direction:column;gap:20px;`;

        const makeSection = (title: string, color: string, items: string[], icon: string) => {
          if (!items.length) return null;
          const sec = document.createElement('div');
          sec.style.cssText = `background:#ffffff08;border:1px solid #ffffff11;border-radius:20px;padding:20px 22px;`;
          const titleRow = document.createElement('div');
          titleRow.style.cssText = `display:flex;align-items:center;gap:8px;margin-bottom:14px;`;
          const iconEl = document.createElement('div');
          iconEl.style.cssText = `width:24px;height:24px;border-radius:8px;background:${color}22;display:flex;align-items:center;justify-content:center;font-size:12px;`;
          iconEl.innerText = icon;
          const titleEl = document.createElement('div');
          titleEl.style.cssText = `font-size:10px;font-weight:900;color:${color};text-transform:uppercase;letter-spacing:0.2em;`;
          titleEl.innerText = title;
          titleRow.appendChild(iconEl);
          titleRow.appendChild(titleEl);
          sec.appendChild(titleRow);
          items.forEach((item, idx) => {
            const row = document.createElement('div');
            row.style.cssText = `display:flex;align-items:flex-start;gap:10px;padding:8px 0;${idx < items.length - 1 ? 'border-bottom:1px solid #ffffff08;' : ''}`;
            const dot = document.createElement('div');
            dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${color};margin-top:6px;flex-shrink:0;`;
            const text = document.createElement('div');
            text.style.cssText = `font-size:12px;color:#e2e8f0;font-weight:500;line-height:1.5;`;
            text.innerText = item;
            row.appendChild(dot);
            row.appendChild(text);
            sec.appendChild(row);
          });
          return sec;
        };

        // Skills chips section
        if (formData.skills.length > 0) {
          const skillsSec = document.createElement('div');
          skillsSec.style.cssText = `background:#ffffff08;border:1px solid #ffffff11;border-radius:20px;padding:20px 22px;`;
          const skillTitle = document.createElement('div');
          skillTitle.style.cssText = `font-size:10px;font-weight:900;color:#7C3AED;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:14px;display:flex;align-items:center;gap:8px;`;
          skillTitle.innerText = '⚡ Skills & Expertise';
          skillsSec.appendChild(skillTitle);
          const chipsWrap = document.createElement('div');
          chipsWrap.style.cssText = `display:flex;flex-wrap:wrap;gap:8px;`;
          formData.skills.slice(0, 14).forEach((sk: any) => {
            const chip = document.createElement('div');
            const name = typeof sk === 'string' ? sk : sk.name;
            chip.style.cssText = `padding:5px 12px;border-radius:20px;background:#7C3AED22;border:1px solid #7C3AED44;font-size:11px;font-weight:700;color:#a78bfa;`;
            chip.innerText = name;
            chipsWrap.appendChild(chip);
          });
          skillsSec.appendChild(chipsWrap);
          leftCol.appendChild(skillsSec);
        }

        // Education
        const eduItems = formData.educationList.slice(0,3).map((e: any) =>
          `${e.degree || ''} ${e.specialization ? '· ' + e.specialization : ''}\n${e.institution || ''} ${e.startYear ? '(' + e.startYear + '–' + (e.endYear || 'Present') + ')' : ''}`.trim()
        );
        if (!eduItems.length && formData.education?.institution) {
          eduItems.push(`${formData.education.degree || ''} · ${formData.education.institution}`);
        }
        const eduSec = makeSection('Education', '#06b6d4', eduItems, '🎓');
        if (eduSec) leftCol.appendChild(eduSec);

        // Experience
        const expItems = formData.experienceList.slice(0,3).map((e: any) =>
          `${e.role || ''} @ ${e.company || ''} · ${e.type || ''}${e.location ? ' · ' + e.location : ''}`
        );
        const expSec = makeSection('Experience', '#f59e0b', expItems, '💼');
        if (expSec) leftCol.appendChild(expSec);

        // Projects
        const projItems = formData.projects.slice(0,4).map((p: any) => p.title || '');
        const projSec = makeSection('Projects', '#10b981', projItems, '🚀');
        if (projSec) rightCol.appendChild(projSec);

        // Certifications
        const certItems = formData.certifications.slice(0,4).map((c: any) =>
          `${c.name || ''}${c.issuer ? ' · ' + c.issuer : ''}`
        );
        const certSec = makeSection('Certifications', '#f43f5e', certItems, '🏆');
        if (certSec) rightCol.appendChild(certSec);

        // Achievements
        const achItems = formData.achievements.slice(0,4).map((a: any) =>
          `${a.title || ''}${a.organization ? ' · ' + a.organization : ''}`
        );
        const achSec = makeSection('Achievements', '#8b5cf6', achItems, '⭐');
        if (achSec) rightCol.appendChild(achSec);

        // Contact / links
        const links: string[] = [];
        if (formData.linkedin) links.push(`🔗 LinkedIn: ${formData.linkedin}`);
        if (formData.portfolio) links.push(`🌐 Portfolio: ${formData.portfolio}`);
        const linkSec = makeSection('Links', '#06b6d4', links, '🔗');
        if (linkSec) rightCol.appendChild(linkSec);

        if (leftCol.children.length) body.appendChild(leftCol);
        if (rightCol.children.length) body.appendChild(rightCol);
        card.appendChild(body);

        // ── Footer ──
        const footer = document.createElement('div');
        footer.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:20px 56px 32px;position:relative;z-index:2;border-top:1px solid #ffffff11;`;
        const footerBrand = document.createElement('div');
        footerBrand.style.cssText = `font-size:11px;font-weight:900;color:#7C3AED;letter-spacing:0.1em;text-transform:uppercase;`;
        footerBrand.innerText = 'Studlyf';
        footer.appendChild(footerBrand);
        card.appendChild(footer);

        // ── Bottom accent bar ──
        const bottomBar = document.createElement('div');
        bottomBar.style.cssText = `height:5px;background:linear-gradient(90deg,#f59e0b,#7C3AED,#06b6d4);width:100%;`;
        card.appendChild(bottomBar);

        container.appendChild(card);
        document.body.appendChild(container);
        try {
          const c = await html2canvas(container, {
            backgroundColor: '#0f0f13',
            scale: 2,
            useCORS: true,
            allowTaint: true,
          });
          return c;
        } finally {
          try { document.body.removeChild(container); } catch (e) {}
        }
      })();

      const link = document.createElement('a');
      link.download = profileTemplateFileName;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setSaveStatus({ type: 'success', message: '🎉 Profile downloaded successfully! 🥳 Your profile is ready to shine.' });
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      const errorMessage = (err as Error)?.message || 'Unable to download.';
      setSaveStatus({ type: 'error', message: errorMessage });
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsGeneratingTemplate(false);
    }
  };
  
  const shareToSocial = async (platform: 'linkedin' | 'whatsapp') => {
  if (!publicProfileUrl) return;
  if (platform !== 'whatsapp') {
    setCopiedForPlatform(null);
  }
  setIsGeneratingTemplate(true);
  setSaveStatus({ type: 'success', message: 'Generating profile card...' });

  // Build share URLs pieces
  try {
    // For LinkedIn we need the public HTML preview URL so the scraper can generate a preview.
    if (platform === 'linkedin') {
      try {
        await navigator.clipboard.writeText(publicProfileUrl);
        setSaveStatus({ type: 'success', message: 'Profile URL copied — paste it into LinkedIn.' });
      } catch (e) {
      }
      const linkedinParams = new URLSearchParams({
        startTask: 'CERTIFICATION_NAME',
        organizationName: 'STUDLYF Community',
        certUrl: publicProfileUrl,
        name: `${profileDisplayName} | Studlyf`,
      });
      const linkedinUrl = `https://www.linkedin.com/profile/add?${linkedinParams.toString()}`;
      const w = window.open(linkedinUrl, '_blank');
      try { w?.focus(); } catch {}
      setSaveStatus({ type: 'success', message: 'Opening LinkedIn add-to-profile page.' });
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    // Non-LinkedIn platforms: open immediately and then prepare/upload/copy image so user can paste/attach.
    const tBase = encodeURIComponent(whatsappShareText);

    // Special handling for WhatsApp: try native share (mobile), then clipboard copy, then download fallback.
    if (platform === 'whatsapp') {
      const { blob, dataUrl } = await generateProfileCardBlob();
      const imageFile = new File([blob], profileTemplateFileName, { type: 'image/png' });
      const whatsappUrl = `https://api.whatsapp.com/send?text=${tBase}`;

      // Always make the PNG available locally so the user can attach/share it from the device.
      try {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = profileTemplateFileName;
        link.click();
      } catch (e) {
      }

      // Use the platform share sheet with the generated image file whenever the browser supports it.
      try {
        if ((navigator as any).share && (navigator as any).canShare && (navigator as any).canShare({ files: [imageFile] })) {
          await (navigator as any).share({ files: [imageFile], text: whatsappShareText });
          setSaveStatus({ type: 'success', message: '🎉 Profile downloaded successfully! 🥳 Your profile is ready to shine.' });
          setTimeout(() => setSaveStatus(null), 3000);
          return;
        }
      } catch (e) {
      }

      // Try to copy image to clipboard so user can paste into WhatsApp Web
      const copied = await copyImageToClipboard(blob).catch(() => false);
      if (copied) {
        setSaveStatus({ type: 'success', message: '🎉 Profile downloaded successfully! 🥳 Your profile is ready to shine.' });
        setCopiedForPlatform('whatsapp');
      } else {
        setSaveStatus({ type: 'success', message: '🎉 Profile downloaded successfully! 🥳 Your profile is ready to shine.' });
      }

      setCopiedForPlatform(null);
      const openedWindow = window.open(whatsappUrl, '_blank');
      try { openedWindow?.focus(); } catch {}
      setTimeout(() => setSaveStatus(null), 5000);
      return;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?text=${tBase}`;
    const platformWindow = window.open(whatsappUrl, '_blank');

    const { blob, dataUrl } = await generateProfileCardBlob();
    const imageFile = new File([blob], profileTemplateFileName, { type: 'image/png' });

    // Upload generated image (non-blocking for the user since platform tab is already open)
    let uploadedPreview: string | null = null;
    try {
      const publicBase = (window as any).PUBLIC_BASE || null;
      const form = new FormData();
      form.append('file', imageFile);
      if (publicBase) form.append('public_base', publicBase);
      const upl = await fetch(`${API_BASE_URL}/api/utils/upload-temp-image`, { method: 'POST', body: form });
      if (upl.ok) {
        const json = await upl.json();
        if (json?.url) {
          uploadedPreview = json.url;
          // also copy the hosted URL so user can paste easily
          try { await navigator.clipboard.writeText(json.url); setSaveStatus({ type: 'success', message: 'Image URL copied — paste it in the post.' }); } catch {}

          // auto-download small URL files for convenience
          try {
            const preview = json.url;
            const urlFileContent = `[InternetShortcut]\nURL=${preview}\n`;
            const urlBlob = new Blob([urlFileContent], { type: 'text/plain' });
            const urlLink = document.createElement('a');
            urlLink.href = URL.createObjectURL(urlBlob);
            urlLink.download = `profile-preview.url`;
            urlLink.click();

            const htmlContent = `<html><head><meta http-equiv=\"refresh\" content=\"0;url=${preview}\"/></head><body>If not redirected <a href=\"${preview}\">Open preview</a></body></html>`;
            const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
            const htmlLink = document.createElement('a');
            htmlLink.href = URL.createObjectURL(htmlBlob);
            htmlLink.download = `profile-preview.html`;
            htmlLink.click();
          } catch (e) {
          }
        }
      }
    } catch (e) {
    }

    // Try to copy the image itself to the clipboard (some desktop browsers support this in secure contexts)
    try {
      const clipboardItem = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([clipboardItem]);
      setSaveStatus({ type: 'success', message: 'Image copied — paste (Ctrl+V) into the opened post.' });
    } catch {
      // fallback: if we have an uploaded preview, download URL files; else download the image
      if (uploadedPreview) {
        try {
          const urlFileContent = `[InternetShortcut]\nURL=${uploadedPreview}\n`;
          const urlBlob = new Blob([urlFileContent], { type: 'text/plain' });
          const urlLink = document.createElement('a');
          urlLink.href = URL.createObjectURL(urlBlob);
          urlLink.download = `profile-preview.url`;
          urlLink.click();

          const htmlContent = `<html><head><meta http-equiv=\"refresh\" content=\"0;url=${uploadedPreview}\"/></head><body>If not redirected <a href=\"${uploadedPreview}\">Open preview</a></body></html>`;
          const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
          const htmlLink = document.createElement('a');
          htmlLink.href = URL.createObjectURL(htmlBlob);
          htmlLink.download = `profile-preview.html`;
          htmlLink.click();

          setSaveStatus({ type: 'success', message: 'Preview URL file downloaded — open it to visit the public preview.' });
        } catch (e) {
          const link = document.createElement('a');
          link.download = profileTemplateFileName;
          link.href = dataUrl;
          link.click();
          setSaveStatus({ type: 'success', message: '🎉 Profile downloaded successfully! 🥳 Your profile is ready to shine.' });
        }
      } else {
        const link = document.createElement('a');
        link.download = profileTemplateFileName;
        link.href = dataUrl;
        link.click();
        setSaveStatus({ type: 'success', message: '🎉 Profile downloaded successfully! 🥳 Your profile is ready to shine.' });
      }
    }

    setTimeout(() => setSaveStatus(null), 5000);
    try { platformWindow?.focus(); } catch {}
    return;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Share failed.';
    setSaveStatus({ type: 'error', message: errorMessage });
    setTimeout(() => setSaveStatus(null), 3000);
  } finally {
    setIsGeneratingTemplate(false);
  }
  };

  const copyProfileLink = async (target: 'accountShare' | 'profilePanel' = 'accountShare') => {
    if (!publicProfileUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(publicProfileUrl);
      } else {
        // Fallback for HTTP / non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = publicProfileUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyFeedback({ target, type: 'success', message: 'Profile link copied to clipboard.' });
      setTimeout(() => setCopyFeedback(current => current?.target === target ? null : current), 2500);
    } catch {
      setCopyFeedback({ target, type: 'error', message: 'Unable to copy the profile link.' });
      setTimeout(() => setCopyFeedback(current => current?.target === target ? null : current), 2500);
    }
  };

  const analyzeGithubProfile = async () => {
    const username = formData.githubUsername.trim();
    if (!username) {
      setGithubError('Please enter a GitHub username to analyze.');
      return;
    }

    setGithubError(null);
    setIsFetchingGithub(true);

    try {
      const userResponse = await fetch(`https://api.github.com/users/${username}`);
      if (!userResponse.ok) throw new Error('GitHub profile not found.');
      const userData = await userResponse.json() as any;

      const repoResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner&sort=pushed`);
      if (!repoResponse.ok) throw new Error('Unable to load GitHub repositories.');
      const repos = await repoResponse.json() as any[];
      if (!Array.isArray(repos)) throw new Error('Unexpected GitHub repo response.');

      const stats = repos.reduce<{
        repoCount: number;
        totalStars: number;
        totalForks: number;
        totalWatchers: number;
        languages: Record<string, number>;
      }>((acc, repo: any) => {
        const language = repo.language || 'Other';
        acc.repoCount += 1;
        acc.totalStars += Number(repo.stargazers_count || 0);
        acc.totalForks += Number(repo.forks_count || 0);
        acc.totalWatchers += Number(repo.watchers_count || 0);
        acc.languages[language] = (acc.languages[language] || 0) + 1;
        return acc;
      }, {
        repoCount: 0,
        totalStars: 0,
        totalForks: 0,
        totalWatchers: 0,
        languages: {} as Record<string, number>,
      });

      const topLanguages = Object.entries(stats.languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang, count]) => `${lang} (${count})`);

      const rawScore = Math.min(100,
        Math.round(
          stats.totalStars * 1.8 +
          stats.totalForks * 1.4 +
          stats.totalWatchers * 1.0 +
          stats.repoCount * 3 +
          Object.keys(stats.languages).length * 6 +
          (Number(userData.followers || 0) * 2)
        )
      );

      setGithubAnalytics({
        username: userData.login,
        displayName: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        profileUrl: userData.html_url,
        repoCount: stats.repoCount,
        totalStars: stats.totalStars,
        totalForks: stats.totalForks,
        totalWatchers: stats.totalWatchers,
        followers: Number(userData.followers || 0),
        score: rawScore,
        topLanguages,
        bio: userData.bio || '',
        computedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      });
    } catch (err: any) {
      setGithubError(err?.message || 'GitHub analysis failed.');
    } finally {
      setIsFetchingGithub(false);
    }
  };

  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedForPlatform, setCopiedForPlatform] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!showShareModal || !publicProfileUrl) {
      setShareQrDataUrl(null);
      return () => {
        active = false;
      };
    }

    const loadShareQr = async () => {
      try {
        const qrDataUrl = await QRCode.toDataURL(publicProfileUrl, {
          margin: 1,
          width: 180,
          color: {
            dark: '#111827',
            light: '#ffffff',
          },
        });

        if (active) {
          setShareQrDataUrl(qrDataUrl);
        }
      } catch (error) {
        if (active) {
          setShareQrDataUrl(null);
        }
      }
    };

    void loadShareQr();

    return () => {
      active = false;
    };
  }, [publicProfileUrl, showShareModal]);
 

  const shareProfile = async () => {
    if (!publicProfileUrl) return;
    setCopiedForPlatform(null);
    setShowShareModal(true);
  };

  const activityTimeline = [
    { title: 'Profile sync', detail: profileCompletion >= 80 ? 'Profile is ready for sharing and discovery.' : 'Profile still has a few sections to complete.', tone: profileCompletion >= 80 ? 'emerald' : 'amber' },
    { title: 'Skill footprint', detail: `${formData.skills.length} skills currently curated in the profile workspace.`, tone: 'violet' },
    { title: 'Project activity', detail: `${formData.projects.length} featured projects and ${formData.experienceList.length} work entries captured.`, tone: 'sky' },
    { title: 'Public presence', detail: formData.profileVisible ? 'Profile visibility is enabled for public sharing.' : 'Profile visibility is currently limited.', tone: 'slate' },
  ];

  const achievementBadges = [
    { label: 'Profile Builder', value: `${formData.projects.length + formData.experienceList.length} records` },
    { label: 'Skill Stack', value: `${formData.skills.length} skills` },
    { label: 'Resume Ready', value: formData.resume.fileName !== 'No resume uploaded' ? 'Active' : 'Pending' },
    { label: 'Public Profile', value: publicProfileUrl ? 'Shareable' : 'Pending' },
  ];


  const tabs = [
    { id: 'basic', label: 'Basic Details', icon: User, required: true },
    { id: 'resume', label: 'Resume', icon: FileText, required: false },
    { id: 'about', label: 'About', icon: User, required: true },
    { id: 'skills', label: 'Skills', icon: Terminal, required: true },
    { id: 'education', label: 'Education', icon: GraduationCap, required: true },
    { id: 'experience', label: 'Work Experience', icon: Briefcase, required: false },
    { id: 'projects', label: 'Projects', icon: Book, required: false },
    { id: 'certifications', label: 'Certifications', icon: ShieldCheck, required: false },
    { id: 'achievements', label: 'Accomplishments', icon: Award, required: false },
    { id: 'social', label: 'Social Links', icon: Share2, required: false },
    { id: 'preferences', label: 'Preferences', icon: Settings, required: false },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <motion.div
            key="basic"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">Basic Details</h2>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Profile Photo & Avatar Preset Selection */}
               <div className="md:col-span-2 space-y-6 bg-gray-50/50 p-8 rounded-3xl border border-gray-100 border-dashed">
                 <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-32 h-32 bg-white rounded-[2rem] shadow-xl flex items-center justify-center relative group cursor-pointer overflow-hidden border-2 border-white ring-4 ring-[#7C3AED]/10 shrink-0"
                   >
                      {formData.profilePhoto ? (
                        <AvatarImage src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white">
                          <User className="w-12 h-12 text-gray-200" />
                        </div>
                      )}
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                       <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                       <span className="text-white text-[9px] font-black uppercase tracking-widest">Edit</span>
                     </div>
                   </div>
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     className="hidden" 
                     accept="image/*" 
                     onChange={handlePhotoUpload} 
                   />
                   <div className="space-y-3 min-w-0 flex-1">
                     <h4 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Profile Photo / Avatar</h4>
                     <p className="text-[10px] font-medium text-gray-400 max-w-xl">Upload a custom photo or choose one of the preset avatars below for a cleaner profile identity.</p>
                     <button
                       type="button"
                       onClick={() => fileInputRef.current?.click()}
                       className="rounded-full bg-[#7C3AED] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-sm hover:bg-[#6D28D9] transition-all"
                     >
                       Upload Photo
                     </button>
                   </div>
                 </div>

                 {/* Presets Catalog grid */}
                 <div className="border-t border-gray-100 pt-6">
                   <div className="flex items-center justify-between gap-4 mb-4">
                     <div>
                       <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Choose Avatar</div>
                        <div className="text-sm font-bold text-gray-900">{avatars.length} 3D character avatars</div>
                     </div>
                   </div>
                   <div className="max-h-[22rem] overflow-y-auto pr-1">
                     <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-2.5 pb-2">
                        {avatars.map((option) => {
                          const cropUrl = option.image_url + '#' + option.crop_x + ',' + option.crop_y + ',' + option.crop_w + ',' + option.crop_h;
                          const isSelected = formData.profilePhoto === cropUrl;
                          return (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, profilePhoto: cropUrl }))}
                              className={`rounded-full border-2 overflow-hidden aspect-square transition-all ${
                                isSelected
                                  ? 'border-[#7C3AED] shadow-lg shadow-purple-200 ring-2 ring-[#7C3AED]/30 scale-110'
                                  : 'border-transparent hover:border-[#7C3AED]/40 hover:scale-105'
                              }`}
                            >
                              <AvatarImage src={cropUrl} alt={option.label} className="w-full h-full" />
                            </button>
                          );
                        })}
                     </div>
                   </div>
                 </div>
               </div>

               <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">First Name *</label>
                  <input 
                    type="text" 
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all" 
                    placeholder="Enter first name" 
                  />
               </div>

               <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">Last Name *</label>
                  <input 
                    type="text" 
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all" 
                    placeholder="Enter last name" 
                  />
               </div>

               <div className="md:col-span-2 space-y-2 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">Username *</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                    <input 
                      type="text" 
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full pl-10 pr-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all" 
                      placeholder="handle_name" 
                    />
                  </div>
               </div>

               <div className="md:col-span-2 space-y-2 group relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">Email Address *</label>
                  <input type="email" value={user?.email || ''} disabled className="w-full px-6 py-4 bg-gray-100 border border-transparent rounded-2xl text-sm font-bold text-gray-400 cursor-not-allowed" />
               </div>

               <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">Mobile *</label>
                  <div className="flex gap-2">
                    <div className="w-24 px-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold flex items-center gap-2">
                      <img src="https://flagcdn.com/w20/in.png" className="w-4 h-3" alt="IN" />
                      +91
                    </div>
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="flex-grow px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all" 
                      placeholder="Enter number" 
                    />
                  </div>
               </div>

               <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">Gender</label>
                  <select 
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all appearance-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
               </div>

               <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">Date of Birth</label>
                  <input 
                    type="date" 
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all" 
                  />
               </div>

               <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">User Type</label>
                  <select 
                    name="userType"
                    value={formData.userType}
                    onChange={handleChange}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all appearance-none"
                  >
                    <option value="">Select Type</option>
                    <option value="student">College Students</option>
                    <option value="fresher">Freshers</option>
                    <option value="professional">Professionals</option>
                  </select>
               </div>
            </div>

            <div className="pt-12 flex justify-end">
               <button 
                onClick={() => handleSave('Basic Details')}
                disabled={isSaving}
                className="px-12 py-4 bg-[#7C3AED] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all duration-300 ease-out shadow-xl shadow-[#7C3AED]/20 flex items-center gap-3 disabled:opacity-50 active:scale-95"
               >
                 {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {isSaving ? 'Saving...' : 'Save Changes'}
               </button>
            </div>
          </motion.div>
        );
      case 'about':
        return (
          <motion.div
            key="about"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-[#7C3AED]">
                  <User className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">About Me</h2>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3 group">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-[#7C3AED] transition-colors">Professional Summary</label>
                  <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{formData.bio.length} / 500</span>
                </div>
                <textarea 
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-8 py-6 bg-gray-50 border border-transparent rounded-[2rem] text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all min-h-[200px] leading-relaxed"
                  placeholder="Describe your professional journey, key achievements, and what makes you unique..."
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">Career Goal</label>
                <input 
                  type="text" 
                  name="careerGoal"
                  value={formData.careerGoal}
                  onChange={handleChange}
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all" 
                  placeholder="e.g. Aspiring AI Research Engineer at a top tech firm" 
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Interests & Hobbies</label>
                <div className="flex flex-wrap gap-2 p-6 bg-gray-50/50 border border-gray-100 border-dashed rounded-[2rem]">
                  {formData.interests.map(tag => (
                    <span key={tag} className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-bold text-gray-600 flex items-center gap-2 hover:border-[#7C3AED]/30 transition-all cursor-default">
                      {tag}
                      <button 
                        onClick={() => removeInterest(tag)}
                        className="text-gray-300 hover:text-red-400"
                      >×</button>
                    </span>
                  ))}
                  <button
                    onClick={() => {
                      const tag = prompt('Enter interest/hobby:');
                      if (tag && tag.trim() && !formData.interests.includes(tag.trim())) {
                        setFormData(prev => ({ ...prev, interests: [...prev.interests, tag.trim()] }));
                      }
                    }}
                    className="px-4 py-2 bg-[#F5F3FF] text-[#7C3AED] border border-dashed border-[#7C3AED]/30 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#7C3AED] hover:text-white transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    Add Tag
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-8 flex justify-end">
               <button 
                onClick={() => handleSave('About')}
                disabled={isSaving}
                className="px-12 py-4 bg-[#7C3AED] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 flex items-center gap-3 disabled:opacity-50"
               >
                 {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {isSaving ? 'Saving...' : 'Save About'}
               </button>
            </div>
          </motion.div>
        );

      case 'education':
        return (
          <motion.div
            key="education"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">Academic History</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{formData.educationList.length} entries</p>
                </div>
              </div>
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  educationList: [...prev.educationList, { institution: '', degree: '', specialization: '', startYear: '2022', endYear: '2026', cgpa: '' }]
                }))}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] transition-all shadow-lg shadow-black/10"
              >
                <Plus className="w-4 h-4" /> Add Education
              </button>
            </div>

            {formData.educationList.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-bold uppercase tracking-widest">No education added. Click "Add Education" to begin.</p>
              </div>
            )}

            <div className="space-y-6">
              {formData.educationList.map((edu, i) => (
                <div key={`edu-${i}`} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 relative group hover:border-[#7C3AED]/30 transition-all shadow-sm">
                  <button
                    onClick={() => handleDeleteItem('education', i, 'educationList')}
                    className="absolute top-6 right-6 p-2 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">Institution Name</label>
                      <input type="text" value={edu.institution} onChange={e => { const u = [...formData.educationList]; u[i] = { ...u[i], institution: e.target.value }; setFormData(prev => ({ ...prev, educationList: u })); }} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all" placeholder="Enter college or university name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">Degree</label>
                      <input type="text" value={edu.degree} onChange={e => { const u = [...formData.educationList]; u[i] = { ...u[i], degree: e.target.value }; setFormData(prev => ({ ...prev, educationList: u })); }} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all" placeholder="e.g. Bachelor of Technology" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">Specialization</label>
                      <input type="text" value={edu.specialization} onChange={e => { const u = [...formData.educationList]; u[i] = { ...u[i], specialization: e.target.value }; setFormData(prev => ({ ...prev, educationList: u })); }} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all" placeholder="e.g. Computer Science" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Start Year</label>
                        <select value={edu.startYear} onChange={e => { const u = [...formData.educationList]; u[i] = { ...u[i], startYear: e.target.value }; setFormData(prev => ({ ...prev, educationList: u })); }} className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-xs font-bold focus:outline-none focus:bg-white transition-all appearance-none outline-none">
                          <option>2024</option><option>2023</option><option>2022</option><option>2021</option><option>2020</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">End Year</label>
                        <select value={edu.endYear} onChange={e => { const u = [...formData.educationList]; u[i] = { ...u[i], endYear: e.target.value }; setFormData(prev => ({ ...prev, educationList: u })); }} className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-xs font-bold focus:outline-none focus:bg-white transition-all appearance-none outline-none">
                          <option>2028</option><option>2027</option><option>2026</option><option>2025</option><option>2024</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-[#7C3AED] transition-colors">CGPA / Percentage</label>
                      <input type="text" value={edu.cgpa} onChange={e => { const u = [...formData.educationList]; u[i] = { ...u[i], cgpa: e.target.value }; setFormData(prev => ({ ...prev, educationList: u })); }} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all" placeholder="e.g. 9.4 or 88%" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {formData.educationList.length > 0 && (
              <div className="pt-8 space-y-3">
                <div className="flex justify-end">
                  <button 
                    onClick={() => handleSave('Education')}
                    disabled={isSaving}
                    className="px-12 py-4 bg-[#7C3AED] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 flex items-center gap-3 disabled:opacity-50"
                  >
                    {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Saving...' : 'Save Education'}
                  </button>
                </div>
                {sectionStatus?.section === 'Education' && (
                  <div className={`text-[10px] font-bold ${sectionStatus.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>{sectionStatus.message}</div>
                )}
              </div>
            )}
          </motion.div>
        );

      case 'skills':
        return (
          <motion.div
            key="skills"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">Skills &amp; Expertise</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{formData.skills.length} skills added</p>
                </div>
              </div>
            </div>

            {/* Trending Suggestions */}
            <div className="bg-[#F5F3FF]/50 border border-[#7C3AED]/10 p-8 rounded-[2.5rem]">
              <div className="flex items-center gap-3 mb-5">
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">Trending for ML Engineers — Click to Add</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {['TensorFlow', 'PyTorch', 'Scikit-Learn', 'Deep Learning', 'SQL', 'LangChain', 'Docker', 'AWS'].map(skill => {
                  const alreadyAdded = formData.skills.some(s => s.name.toLowerCase() === skill.toLowerCase());
                  return (
                    <button
                      key={skill}
                      onClick={() => {
                        if (!alreadyAdded) {
                          setFormData(prev => ({
                            ...prev,
                            skills: [...prev.skills, { name: skill, proficiency: 'Intermediate', years: '' }]
                          }));
                        }
                      }}
                      className={`px-5 py-2 rounded-xl text-[10px] font-bold transition-all shadow-sm ${alreadyAdded ? 'bg-[#7C3AED] text-white border border-[#7C3AED] cursor-default' : 'bg-white border border-white hover:border-[#7C3AED] hover:text-[#7C3AED] text-gray-600'}`}
                    >
                      {alreadyAdded ? '✓ ' : '+ '}{skill}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Add Row */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-4 shadow-sm">
              <input
                type="text"
                value={newSkillInput}
                onChange={e => setNewSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkillToList()}
                placeholder="Type a skill name and press Enter or click Add..."
                className="flex-grow px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all"
              />
              <button
                onClick={addSkillToList}
                disabled={!newSkillInput.trim()}
                className="px-8 py-4 bg-[#7C3AED] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6D28D9] transition-all flex items-center gap-2 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" /> Add Skill
              </button>
            </div>

            {/* Live Skills List */}
            <div className="space-y-4">
              <AnimatePresence>
                {formData.skills.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-10 text-gray-300"
                  >
                    <Terminal className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-bold uppercase tracking-widest">No skills yet. Upload your resume or add manually above.</p>
                  </motion.div>
                )}
                {formData.skills.map((sk, i) => (
                  <motion.div
                    key={`skill-row-${i}`}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.02 }}
                    className="bg-white border border-gray-100 rounded-3xl p-5 flex flex-col md:flex-row items-center gap-5 group hover:border-[#7C3AED]/30 transition-all shadow-sm"
                  >
                    {/* Rank badge */}
                    <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 shrink-0">
                      {i + 1}
                    </div>

                    {/* Skill Name */}
                    <div className="flex-grow">
                      <input
                        type="text"
                        value={sk.name}
                        onChange={e => updateSkillField(i, 'name', e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none border-b border-transparent focus:border-[#7C3AED]/30 transition-all pb-1"
                        placeholder="Skill name"
                      />
                    </div>

                    {/* Proficiency */}
                    <select
                      value={sk.proficiency}
                      onChange={e => updateSkillField(i, 'proficiency', e.target.value)}
                      className="w-36 px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-gray-900 appearance-none focus:bg-white outline-none transition-all"
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                      <option>Expert</option>
                    </select>

                    {/* Years */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={sk.years}
                        onChange={e => updateSkillField(i, 'years', e.target.value)}
                        min="0"
                        max="30"
                        className="w-16 px-3 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-center focus:bg-white outline-none transition-all"
                        placeholder="0"
                      />
                      <span className="text-[10px] font-black text-gray-400 uppercase">Yrs</span>
                    </div>

                    {/* Proficiency bar */}
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: sk.proficiency === 'Expert' ? '100%' : sk.proficiency === 'Advanced' ? '75%' : sk.proficiency === 'Intermediate' ? '50%' : '25%',
                          backgroundColor: sk.proficiency === 'Expert' ? '#7C3AED' : sk.proficiency === 'Advanced' ? '#3B82F6' : sk.proficiency === 'Intermediate' ? '#F59E0B' : '#9CA3AF'
                        }}
                      />
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => removeSkillFromList(i)}
                      className="p-2 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {formData.skills.length > 0 && (
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => handleSave('Skills')}
                  disabled={isSaving}
                  className="px-12 py-4 bg-[#7C3AED] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 flex items-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : `Save ${formData.skills.length} Skills`}
                </button>
              </div>
            )}
          </motion.div>
        );

      case 'resume':
        return (
          <motion.div
            key="resume"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">Resume Management</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Upload your resume to auto-extract skills &amp; get an ATS score</p>
                </div>
              </div>
            </div>

            {/* Upload Zone */}
            <input
              type="file"
              ref={resumeInputRef}
              onChange={handleResumeUpload}
              className="hidden"
              accept=".pdf,.docx"
            />
            <div
              onClick={() => !isUploading && resumeInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-[3rem] p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer overflow-hidden
                ${isUploading ? 'border-[#7C3AED]/50 bg-[#F5F3FF]/30 cursor-not-allowed' : 'border-gray-100 bg-gray-50/50 hover:border-[#7C3AED]/30 hover:bg-[#F5F3FF]/20 group'}`}
            >
              {/* Upload progress fill */}
              {isUploading && (
                <div
                  className="absolute inset-0 bg-[#7C3AED]/10 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}

              <div className={`w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 transition-transform relative z-10 ${isUploading ? 'animate-pulse' : 'group-hover:scale-110'}`}>
                {isUploading
                  ? <div className="w-8 h-8 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
                  : <Plus className="w-8 h-8 text-[#7C3AED]" />
                }
              </div>
              <h3 className="text-lg font-black uppercase text-gray-900 mb-2 relative z-10">
                {isUploading ? `Parsing Resume... ${uploadProgress}%` : 'Upload Your Resume'}
              </h3>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest relative z-10">
                {isUploading ? 'Extracting skills and computing ATS score...' : 'PDF or DOCX · Max 10MB · Auto-extracts skills'}
              </p>
              {isUploading && (
                <div className="w-64 h-1.5 bg-gray-100 rounded-full mt-6 overflow-hidden relative z-10">
                  <div
                    className="h-full bg-[#7C3AED] rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* ATS Score + File Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* ATS Score Card */}
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Scan className="w-28 h-28" />
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3 block">ATS Score</span>
                  <h3 className="text-4xl font-black mb-1">
                    {formData.resume.atsScore > 0 ? formData.resume.atsScore : '—'}
                    <span className="text-base opacity-50">/100</span>
                  </h3>
                  {formData.resume.atsScore > 0 && (
                    <div className="w-full h-1 bg-white/10 rounded-full mt-3">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${formData.resume.atsScore}%`,
                          backgroundColor: formData.resume.atsScore >= 80 ? '#22C55E' : formData.resume.atsScore >= 60 ? '#F59E0B' : '#EF4444'
                        }}
                      />
                    </div>
                  )}
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-2">
                    {formData.resume.atsScore >= 80 ? 'Excellent' : formData.resume.atsScore >= 60 ? 'Good' : formData.resume.atsScore > 0 ? 'Needs Work' : 'Awaiting Upload'}
                  </p>
                </div>
              </div>

              {/* File Details Card */}
              <div className="md:col-span-2 bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-5 mb-6">
                  <div className={`w-14 h-18 rounded-2xl flex flex-col items-center justify-center border shadow-sm px-3 py-4 ${formData.resume.fileName.endsWith('.pdf') || formData.resume.fileName.endsWith('.docx') ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                    <FileText className={`w-6 h-6 ${formData.resume.fileName.endsWith('.pdf') || formData.resume.fileName.endsWith('.docx') ? 'text-red-500' : 'text-gray-300'}`} />
                    <span className="text-[8px] font-black mt-1 uppercase text-red-400">
                      {formData.resume.fileName.endsWith('.pdf') ? 'PDF' : formData.resume.fileName.endsWith('.docx') ? 'DOCX' : '—'}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm mb-1 max-w-xs truncate">{formData.resume.fileName}</h5>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">v{formData.resume.version}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formData.resume.uploadDate || 'Not uploaded yet'}
                      </span>
                      {resumeParseResult && (
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                          ✓ {resumeParseResult.word_count} words
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => resumeInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all disabled:opacity-50"
                  >
                    {isUploading ? 'Parsing...' : 'Re-upload Resume'}
                  </button>
                  <button
                    onClick={() => handleSave('Resume')}
                    disabled={isSaving || formData.resume.atsScore === 0}
                    className="px-6 py-3 bg-[#7C3AED] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6D28D9] transition-all flex items-center gap-2 shadow-lg shadow-[#7C3AED]/20 disabled:opacity-40"
                  >
                    {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* Extracted Skills Section — live populated after upload */}
            {formData.skills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#F5F3FF]/50 border border-[#7C3AED]/10 rounded-[2.5rem] p-8"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                    <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">
                      {resumeParseResult ? `${formData.skills.length} Skills Auto-Extracted` : `${formData.skills.length} Skills`}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Click × to remove · Click Skills tab to edit</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((sk, i) => (
                    <motion.span
                      key={`${sk.name}-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-4 py-2 bg-white border border-[#7C3AED]/20 rounded-xl text-[10px] font-bold text-[#7C3AED] flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
                    >
                      {sk.name}
                      <button
                        onClick={() => removeSkillFromList(i)}
                        className="text-[#7C3AED]/40 hover:text-red-400 transition-colors ml-1"
                      >
                        ×
                      </button>
                    </motion.span>
                  ))}
                </div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-4">
                  These skills have been synced to your Skills tab. Save to persist.
                </p>
              </motion.div>
            )}

            {/* Empty state before upload */}
            {formData.skills.length === 0 && !isUploading && (
              <div className="text-center py-8 text-gray-300">
                <Scan className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-xs font-bold uppercase tracking-widest">Upload a resume above to auto-extract your skills and get an ATS score.</p>
              </div>
            )}
          </motion.div>
        );


      case 'experience':
        return (
          <motion.div
            key="experience"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">Professional Experience</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{formData.experienceList.length} entries</p>
                </div>
              </div>
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  experienceList: [...prev.experienceList, { company: '', role: '', type: 'Full-time', responsibilities: '', location: '' }]
                }))}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] transition-all shadow-lg shadow-black/10"
              >
                <Plus className="w-4 h-4" /> Add Experience
              </button>
            </div>

            {formData.experienceList.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-bold uppercase tracking-widest">No experience added. Click "Add Experience" to begin.</p>
              </div>
            )}

            <div className="space-y-6">
              {formData.experienceList.map((exp, i) => (
                <div key={`exp-${i}`} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 relative group hover:border-[#7C3AED]/30 transition-all shadow-sm">
                  <button
                    onClick={() => handleDeleteItem('experience', i, 'experienceList')}
                    className="absolute top-6 right-6 p-2 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Company Name</label>
                      <input type="text" value={exp.company} onChange={e => { const u = [...formData.experienceList]; u[i] = { ...u[i], company: e.target.value }; setFormData(prev => ({ ...prev, experienceList: u })); }} className="w-full px-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all" placeholder="e.g. Google, Infosys" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Job Role</label>
                      <input type="text" value={exp.role} onChange={e => { const u = [...formData.experienceList]; u[i] = { ...u[i], role: e.target.value }; setFormData(prev => ({ ...prev, experienceList: u })); }} className="w-full px-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all" placeholder="e.g. Frontend Engineer" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Employment Type</label>
                      <select value={exp.type} onChange={e => { const u = [...formData.experienceList]; u[i] = { ...u[i], type: e.target.value }; setFormData(prev => ({ ...prev, experienceList: u })); }} className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold appearance-none text-gray-900 focus:bg-white outline-none transition-all">
                        <option>Internship</option><option>Full-time</option><option>Freelance</option><option>Contract</option><option>Part-time</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Location</label>
                      <input type="text" value={exp.location || ''} onChange={e => { const u = [...formData.experienceList]; u[i] = { ...u[i], location: e.target.value }; setFormData(prev => ({ ...prev, experienceList: u })); }} className="w-full px-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all" placeholder="e.g. Remote, Hyderabad" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Responsibilities &amp; Impact</label>
                      <textarea value={exp.responsibilities} onChange={e => { const u = [...formData.experienceList]; u[i] = { ...u[i], responsibilities: e.target.value }; setFormData(prev => ({ ...prev, experienceList: u })); }} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold min-h-[100px] text-gray-900 focus:bg-white outline-none transition-all" placeholder="Mention key deliverables, technologies used..." />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {formData.experienceList.length > 0 && (
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => handleSave('Work Experience')}
                  disabled={isSaving}
                  className="px-12 py-4 bg-[#7C3AED] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 flex items-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : `Save ${formData.experienceList.length} Experiences`}
                </button>
              </div>
            )}
          </motion.div>
        );

      case 'projects':
        return (
          <motion.div
            key="projects"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                  <Book className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">Personal Projects</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{formData.projects.length} projects</p>
                </div>
              </div>
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  projects: [...prev.projects, { title: '', description: '', link: '', isFeatured: false, tags: [] }]
                }))}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] transition-all"
              >
                <Plus className="w-4 h-4" /> New Project
              </button>
            </div>

            {formData.projects.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <Book className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-bold uppercase tracking-widest">No projects yet. Click "New Project" above to add one.</p>
              </div>
            )}

            <div className="space-y-8">
              {formData.projects.map((proj, i) => (
                <div key={`proj-${i}`} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 relative group hover:border-[#7C3AED]/30 transition-all shadow-sm">
                  <button
                    onClick={() => handleDeleteItem('project', i, 'projects')}
                    className="absolute top-6 right-6 p-2 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Project Title</label>
                      <input
                        type="text"
                        value={proj.title}
                        onChange={e => {
                          const updated = [...formData.projects];
                          updated[i] = { ...updated[i], title: e.target.value };
                          setFormData(prev => ({ ...prev, projects: updated }));
                        }}
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all"
                        placeholder="e.g. AI-Powered Portfolio Hub"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Description</label>
                      <textarea
                        value={proj.description}
                        onChange={e => {
                          const updated = [...formData.projects];
                          updated[i] = { ...updated[i], description: e.target.value };
                          setFormData(prev => ({ ...prev, projects: updated }));
                        }}
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold min-h-[100px] text-gray-900 focus:bg-white outline-none transition-all"
                        placeholder="Describe your project..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">GitHub / Link</label>
                      <input
                        type="url"
                        value={proj.link}
                        onChange={e => {
                          const updated = [...formData.projects];
                          updated[i] = { ...updated[i], link: e.target.value };
                          setFormData(prev => ({ ...prev, projects: updated }));
                        }}
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all"
                        placeholder="https://github.com/..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {formData.projects.length > 0 && (
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => handleSave('Projects')}
                  disabled={isSaving}
                  className="px-12 py-4 bg-[#7C3AED] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 flex items-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : `Save ${formData.projects.length} Projects`}
                </button>
              </div>
            )}
          </motion.div>
        );

      case 'certifications':
        return (
          <motion.div
            key="certifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">Licenses &amp; Certifications</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{formData.certifications.length} certificates</p>
                </div>
              </div>
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  certifications: [...prev.certifications, { name: '', issuer: '', date: '', link: '' }]
                }))}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] transition-all"
              >
                <Plus className="w-4 h-4" /> Add Certificate
              </button>
            </div>

            {formData.certifications.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-bold uppercase tracking-widest">No certifications yet. Click "Add Certificate" above.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.certifications.map((cert, i) => (
                <div key={`cert-${i}`} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 group hover:border-[#7C3AED]/30 transition-all shadow-sm relative">
                  <button
                    onClick={() => handleDeleteItem('certification', i, 'certifications')}
                    className="absolute top-5 right-5 p-2 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Certificate Name</label>
                      <input type="text" value={cert.name} onChange={e => { const u = [...formData.certifications]; u[i] = { ...u[i], name: e.target.value }; setFormData(prev => ({ ...prev, certifications: u })); }} className="w-full px-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all" placeholder="AWS Certified Solutions Architect" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Issuer</label>
                        <input type="text" value={cert.issuer} onChange={e => { const u = [...formData.certifications]; u[i] = { ...u[i], issuer: e.target.value }; setFormData(prev => ({ ...prev, certifications: u })); }} className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-gray-900 focus:bg-white outline-none transition-all" placeholder="Google Cloud" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Date</label>
                        <input type="text" value={cert.date} onChange={e => { const u = [...formData.certifications]; u[i] = { ...u[i], date: e.target.value }; setFormData(prev => ({ ...prev, certifications: u })); }} className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-gray-900 focus:bg-white outline-none transition-all" placeholder="2024" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Credential URL</label>
                      <input type="url" value={cert.link} onChange={e => { const u = [...formData.certifications]; u[i] = { ...u[i], link: e.target.value }; setFormData(prev => ({ ...prev, certifications: u })); }} className="w-full px-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all" placeholder="https://..." />
                    </div>
                  </div>
                </div>
              ))}
            </div>


            <div className="pt-8 flex justify-end">
               <button 
                onClick={() => handleSave('Certifications')}
                disabled={isSaving}
                className="px-12 py-4 bg-[#7C3AED] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 flex items-center gap-3 disabled:opacity-50"
               >
                 {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {isSaving ? 'Saving...' : 'Save Certificates'}
               </button>
            </div>
          </motion.div>
        );

      case 'achievements':
        return (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">Accomplishments</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{formData.achievements.length} entries</p>
                </div>
              </div>
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  achievements: [...prev.achievements, { title: '', organization: '', month: 'Jan', year: '2024', category: 'Competition', description: '', link: '', isFeatured: false }]
                }))}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7C3AED] transition-all"
              >
                <Plus className="w-4 h-4" /> Add Achievement
              </button>
            </div>

            {formData.achievements.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-bold uppercase tracking-widest">No achievements yet. Click "Add Achievement" above.</p>
              </div>
            )}

            <div className="space-y-6">
              {formData.achievements.map((ach, i) => (
                <div key={`ach-${i}`} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 relative group hover:border-[#7C3AED]/30 transition-all shadow-sm">
                  <button
                    onClick={() => handleDeleteItem('achievement', i, 'achievements')}
                    className="absolute top-6 right-6 p-2 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Achievement Title</label>
                      <input type="text" value={ach.title} onChange={e => { const u = [...formData.achievements]; u[i] = { ...u[i], title: e.target.value }; setFormData(prev => ({ ...prev, achievements: u })); }} className="w-full px-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all" placeholder="e.g. Winner, AWS Certified" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Organization / Event</label>
                      <input type="text" value={ach.organization} onChange={e => { const u = [...formData.achievements]; u[i] = { ...u[i], organization: e.target.value }; setFormData(prev => ({ ...prev, achievements: u })); }} className="w-full px-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all" placeholder="Smart India Hackathon" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Category</label>
                      <select value={ach.category} onChange={e => { const u = [...formData.achievements]; u[i] = { ...u[i], category: e.target.value }; setFormData(prev => ({ ...prev, achievements: u })); }} className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold appearance-none outline-none focus:bg-white">
                        {['Hackathon', 'Certification', 'Competition', 'Scholarship', 'Leadership', 'Research', 'Open Source', 'Sports', 'Volunteer'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Link</label>
                      <input type="url" value={ach.link} onChange={e => { const u = [...formData.achievements]; u[i] = { ...u[i], link: e.target.value }; setFormData(prev => ({ ...prev, achievements: u })); }} className="w-full px-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white outline-none transition-all" placeholder="https://..." />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Description</label>
                      <textarea value={ach.description} onChange={e => { const u = [...formData.achievements]; u[i] = { ...u[i], description: e.target.value }; setFormData(prev => ({ ...prev, achievements: u })); }} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold min-h-[80px] text-gray-900 focus:bg-white outline-none transition-all" placeholder="Explain what you achieved..." />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 flex justify-end">
               <button 
                onClick={() => handleSave('Achievements')}
                disabled={isSaving}
                className="px-12 py-4 bg-[#7C3AED] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 flex items-center gap-3 disabled:opacity-50"
               >
                 {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {isSaving ? 'Saving...' : 'Save Achievements'}
               </button>
            </div>
          </motion.div>
        );

      case 'social':
        return (
          <motion.div
            key="social"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                  <Share2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">Social Profiles</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {[
                 { id: 'linkedin', label: 'LinkedIn', icon: Share2, color: '#0077B5', placeholder: 'linkedin.com/in/...' },
                 { id: 'portfolio', label: 'Portfolio', icon: Globe, color: '#7C3AED', placeholder: 'yourwebsite.com' },
                 { id: 'hackerrank', label: 'HackerRank', icon: Book, color: '#2EC866', placeholder: 'hackerrank.com/profile/...' },
               ].map(social => (
                 <div key={social.label} className="space-y-3 group">
                   <div className="flex items-center gap-3 ml-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg`} style={{ backgroundColor: social.color }}>
                         <social.icon className="w-4 h-4" />
                      </div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-[#7C3AED] transition-colors">{social.label}</label>
                   </div>
                   <input
                    type="text"
                    name={social.id}
                    value={(formData as any)[social.id] || ''}
                    onChange={handleChange}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/5 focus:border-[#7C3AED]/30 transition-all outline-none"
                    placeholder={social.placeholder}
                   />
                 </div>
               ))}
            </div>

            <div className="pt-8 flex justify-end">
               <button
                onClick={() => handleSave('Social Links')}
                disabled={isSaving}
                className="px-12 py-4 bg-[#7C3AED] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 flex items-center gap-3 disabled:opacity-50"
               >
                 {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {isSaving ? 'Saving...' : 'Save All Profiles'}
               </button>
            </div>
          </motion.div>
        );

      case 'preferences':
        return (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-900">
                  <Settings className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black uppercase text-gray-900 tracking-tight">Account Preferences</h2>
              </div>
            </div>

            <div className="space-y-10">
               <div className="p-8 bg-[#F5F3FF]/60 rounded-[2.5rem] border border-[#7C3AED]/10 space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h4 className="text-[10px] font-black text-[#7C3AED] uppercase tracking-[0.2em]">Public Profile</h4>
                      <p className="text-sm font-medium text-gray-600 mt-2 max-w-2xl">This URL is what you can share publicly. It uses your user ID so your profile can be opened across devices without changing the backend contract.</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full">
                      <Globe className="w-3 h-3" /> Ready
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-medium text-gray-700 break-all shadow-sm">{publicProfileUrl || 'Save your profile to generate a public link.'}</div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button" onClick={() => copyProfileLink('accountShare')} disabled={!publicProfileUrl} className="flex-1 px-5 py-3 rounded-2xl bg-white border border-gray-200 text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 hover:border-[#7C3AED]/30 transition-all disabled:opacity-50 cursor-pointer touch-manipulation">Copy Profile Link</button>
                    <button type="button" onClick={downloadProfileTemplate} disabled={!publicProfileUrl || isGeneratingTemplate} className="flex-1 px-5 py-3 rounded-2xl bg-white border border-gray-200 text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 hover:border-[#7C3AED]/30 transition-all disabled:opacity-50 cursor-pointer touch-manipulation">Download Template</button>
                    <button type="button" onClick={shareProfile} disabled={!publicProfileUrl || isGeneratingTemplate} className="flex-1 px-5 py-3 rounded-2xl bg-[#7C3AED] text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all disabled:opacity-50 cursor-pointer touch-manipulation">Share Template</button>
                  </div>
                  {copyFeedback?.target === 'accountShare' && (
                    <div className={`mt-3 text-[10px] font-bold ${copyFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>{copyFeedback.message}</div>
                  )}
               </div>

               <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 space-y-8">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Job Search Status</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     {[
                       { id: 'active', label: 'Actively Looking', desc: 'Prioritize my profile in searches' },
                       { id: 'open', label: 'Open to Offers', desc: 'Visibility for casual browsing' },
                       { id: 'closed', label: 'Not Looking', desc: 'Hide my profile from recruiters' }
                     ].map(status => (
                       <button 
                        key={status.id} 
                        onClick={() => setFormData(prev => ({ ...prev, searchStatus: status.id }))}
                        className={`p-6 rounded-3xl border text-left transition-all ${formData.searchStatus === status.id ? 'bg-white border-[#7C3AED] shadow-lg shadow-[#7C3AED]/5' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                       >
                          <div className="flex items-center justify-between mb-3">
                             <div className={`w-3 h-3 rounded-full ${formData.searchStatus === status.id ? 'bg-[#7C3AED]' : 'bg-gray-300'}`} />
                             {formData.searchStatus === status.id && <ShieldCheck className="w-4 h-4 text-[#7C3AED]" />}
                          </div>
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-1">{status.label}</h5>
                          <p className="text-[9px] font-bold text-gray-400 leading-tight">{status.desc}</p>
                       </button>
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div 
                   onClick={() => setFormData(prev => ({ ...prev, profileVisible: !prev.profileVisible }))}
                   className="p-8 bg-white border border-gray-100 rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:border-[#7C3AED]/30 transition-all shadow-sm"
                  >
                     <div className="space-y-1">
                        <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-900">Profile Visibility</h5>
                        <p className="text-[10px] font-bold text-gray-400">Control who can see your profile details</p>
                     </div>
                     <div className={`w-12 h-6 rounded-full relative transition-colors ${formData.profileVisible ? 'bg-[#7C3AED]' : 'bg-gray-200'}`}>
                        <motion.div 
                         animate={{ x: formData.profileVisible ? 24 : 4 }}
                         className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                        />
                     </div>
                  </div>

                  <div 
                   onClick={() => setFormData(prev => ({ ...prev, newsletter: !prev.newsletter }))}
                   className="p-8 bg-white border border-gray-100 rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:border-[#7C3AED]/30 transition-all shadow-sm"
                  >
                     <div className="space-y-1">
                        <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-900">Newsletter Alerts</h5>
                        <p className="text-[10px] font-bold text-gray-400">Get weekly job and skill insights</p>
                     </div>
                     <div className={`w-12 h-6 rounded-full relative transition-colors ${formData.newsletter ? 'bg-[#7C3AED]' : 'bg-gray-200'}`}>
                        <motion.div 
                         animate={{ x: formData.newsletter ? 24 : 4 }}
                         className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                        />
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-8 flex justify-end">
               <button 
                onClick={() => handleSave('Preferences')}
                disabled={isSaving}
                className="px-12 py-4 bg-[#7C3AED] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 flex items-center gap-3 disabled:opacity-50"
               >
                 {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {isSaving ? 'Saving...' : 'Save Preferences'}
               </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto min-h-screen bg-white/90 backdrop-blur-sm pt-0 px-4 sm:px-8 lg:px-12 pb-12 font-sans selection:bg-[#7C3AED] selection:text-white">

      {/* ── Global Save Toast ── */}
      <AnimatePresence>
        {saveStatus && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] px-8 py-4 rounded-2xl text-white text-sm font-bold shadow-2xl flex items-center gap-3 backdrop-blur-md pointer-events-none
              ${saveStatus.type === 'success' ? 'bg-emerald-500/90' : 'bg-red-500/90'}`}
          >
            <span>{saveStatus.type === 'success' ? '✓' : '✗'}</span>
            {saveStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Back Button */}
      <div className="flex items-center gap-6 mb-6 pt-0 sm:pt-0 lg:pt-1">
        <button 
          onClick={() => navigate('/dashboard/learner')}
          className="w-12 h-12 bg-white flex items-center justify-center rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600 group-hover:text-[#7C3AED] group-hover:-translate-x-1 transition-all" />
        </button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900 leading-tight">Edit Profile</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Configure your professional identity</p>
        </div>
      </div>

      {profileLoading && (
        <div className="mb-6 inline-flex items-center gap-3 rounded-2xl border border-[#7C3AED]/10 bg-white px-4 py-3 shadow-sm">
          <div className="w-4 h-4 rounded-full border-2 border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Loading profile data</span>
        </div>
      )}

      <div className="mb-12 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[3rem] border border-gray-100 bg-white p-8 sm:p-10 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
        >
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative grid gap-8">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-8">
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-400">Professional Profile</span>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-gray-900">{profileDisplayName}</h2>
                      <p className="mt-3 uppercase tracking-[0.24em] text-sm font-bold text-gray-600">{profileRole}</p>
                      {formData.oneStrongWord && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#7C3AED]/10 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#1D4ED8]">
                          <Sparkles className="w-4 h-4" /> {formData.oneStrongWord}
                        </div>
                      )}
                    </div>
                    <div className="space-y-6">
                      <div className="relative inline-flex items-center justify-center w-36 h-36 rounded-[2.5rem] overflow-hidden border-4 border-white bg-[#F8FAFC] shadow-2xl">
                        {formData.profilePhoto ? (
                          <AvatarImage src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl font-black text-gray-500">{profileInitials}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[2rem] border border-gray-100 bg-white/95 p-6 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Contact</div>
                    <div className="mt-5 space-y-4 text-sm text-gray-700">
                      {formData.location && (
                        <div className="flex items-start gap-3">
                          <span className="mt-1 w-2 h-2 rounded-full bg-[#7C3AED]" />
                          <div>
                            <div className="font-bold text-gray-900">Location</div>
                            <div>{formData.location}</div>
                          </div>
                        </div>
                      )}
                      {formData.phone && (
                        <div className="flex items-start gap-3">
                          <span className="mt-1 w-2 h-2 rounded-full bg-[#7C3AED]" />
                          <div>
                            <div className="font-bold text-gray-900">Phone</div>
                            <div>{formData.phone}</div>
                          </div>
                        </div>
                      )}
                      {(user?.email || formData.linkedin || formData.portfolio) && (
                        <div className="flex items-start gap-3">
                          <span className="mt-1 w-2 h-2 rounded-full bg-[#7C3AED]" />
                          <div>
                            <div className="font-bold text-gray-900">Reach</div>
                            <div className="space-y-1 text-sm text-gray-700">
                              {user?.email && <div>{user.email}</div>}
                              {formData.linkedin && <div>{formData.linkedin}</div>}
                              {formData.portfolio && <div>{formData.portfolio}</div>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[2rem] border border-[#7C3AED]/20 bg-gradient-to-br from-[#eef2ff] via-[#eff6ff] to-[#eef2ff] p-6 shadow-lg shadow-[#7C3AED]/10">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#7C3AED]/20 blur-2xl" />
                    <div className="pointer-events-none absolute left-4 top-12 h-16 w-16 rounded-full bg-[#93c5fd]/30 blur-xl" />
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4338ca]">Describe yourself</div>
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-black text-[#1e40af] uppercase tracking-tight">One strong word</h3>
                        <p className="mt-4 text-sm leading-7 text-[#334155]">Choose a word that defines your ambition and makes your profile stand out.</p>
                      </div>
                      {formData.oneStrongWord && !isEditingStrongWord && (
                        <button
                          type="button"
                          onClick={() => setIsEditingStrongWord(true)}
                          className="self-start rounded-full border border-[#7C3AED]/30 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#1D4ED8] shadow-sm transition hover:bg-[#7C3AED]/5"
                        >
                          Change
                        </button>
                      )}
                    </div>

                    {formData.oneStrongWord && !isEditingStrongWord ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="mt-6 rounded-[1.75rem] bg-white/95 p-6 shadow-xl ring-1 ring-[#7C3AED]/20"
                      >
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4338ca]">Live preview</div>
                        <div className="mt-2 text-sm font-black uppercase tracking-[0.18em] text-[#4338ca]">One strong word which describes me:</div>
                        <p className="mt-4 text-5xl sm:text-6xl font-black italic tracking-tight text-[#1D4ED8]">{formData.oneStrongWord}</p>
                      </motion.div>
                    ) : (
                      <>
                        <input
                          name="oneStrongWord"
                          value={formData.oneStrongWord}
                          onChange={handleChange}
                          onBlur={handleStrongWordInputBlur}
                          placeholder="Aspiring entrepreneur"
                          className="mt-5 w-full rounded-[1.75rem] border border-gray-200 bg-white px-5 py-4 text-lg font-semibold text-gray-900 outline-none transition-all focus:border-[#7C3AED]/50 focus:ring-4 focus:ring-[#7C3AED]/10"
                        />
                        <div className="mt-4 flex flex-wrap gap-2">
                          {['Bold', 'Curious', 'Driven', 'Purposeful'].map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => chooseStrongWord(tag)}
                              className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${tag === 'Purposeful' ? 'border-pink-600 bg-pink-100 text-pink-700 text-[9px]' : 'border-[#7C3AED]/20 bg-[#7C3AED]/10 text-[#1D4ED8] hover:border-[#7C3AED] hover:bg-[#7C3AED]/15'}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
              className="rounded-[2rem] border border-[#7C3AED]/10 bg-gradient-to-br from-[#eef2ff] via-[#eff6ff] to-[#eef2ff] p-6 shadow-xl shadow-[#7C3AED]/10"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4338ca]">GitHub Developer Score</div>
                  <h3 className="mt-3 text-2xl font-black text-[#1e40af] uppercase tracking-tight">Analyze your GitHub impact</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[#334155]">Enter your GitHub username to generate a professional score based on repos, stars, forks, and language coverage.</p>
                </div>
                <button
                  type="button"
                  onClick={analyzeGithubProfile}
                  disabled={isFetchingGithub || !formData.githubUsername.trim()}
                  className="inline-flex items-center justify-center rounded-full bg-[#4338ca] px-6 py-3 text-xs font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-[#4338ca]/20 transition hover:bg-[#3730a3] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetchingGithub ? 'Analyzing…' : 'Analyze GitHub'}
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748b]">GitHub handle</div>
                  <input
                    name="githubUsername"
                    value={formData.githubUsername}
                    onChange={handleChange}
                    placeholder="e.g. githubusername"
                    className="mt-3 w-full rounded-[1.5rem] border border-gray-200 bg-gray-50 px-5 py-4 text-sm font-semibold text-gray-900 outline-none transition-all focus:border-[#7C3AED]/40 focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/10"
                  />
                </div>
                <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748b]">Profile reach</div>
                  <div className="mt-3 text-3xl font-black text-[#1d4ed8]">{githubAnalytics?.score ?? '—'}/100</div>
                  <p className="mt-3 text-sm text-gray-600">A professional measure of your public work on GitHub.</p>
                </div>
              </div>
              {githubError && (
                <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{githubError}</div>
              )}
              {githubAnalytics && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="mt-6 rounded-[2rem] border border-[#c7d2fe] bg-white p-6 shadow-lg"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-[#4338ca]/10 text-2xl text-[#4338ca]">🐙</div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-[0.18em] text-[#4338ca]">{githubAnalytics.displayName}</div>
                        <a href={githubAnalytics.profileUrl} target="_blank" rel="noreferrer" className="text-xs font-bold uppercase tracking-[0.24em] text-[#7c3aed] hover:text-[#4338ca]">View GitHub profile</a>
                      </div>
                    </div>
                    <div className="rounded-full bg-[#eef2ff] px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#4338ca]">Updated {githubAnalytics.computedAt}</div>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.75rem] border border-[#e0e7ff] bg-[#eff6ff] p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1d4ed8]">Repos</div>
                      <div className="mt-3 text-3xl font-black text-[#0f172a]">{githubAnalytics.repoCount}</div>
                    </div>
                    <div className="rounded-[1.75rem] border border-[#e0f2fe] bg-[#f0f9ff] p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0369a1]">Followers</div>
                      <div className="mt-3 text-3xl font-black text-[#0f172a]">{githubAnalytics.followers}</div>
                    </div>
                    <div className="rounded-[1.75rem] border border-[#d1fae5] bg-[#ecfdf5] p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#047857]">Stars</div>
                      <div className="mt-3 text-3xl font-black text-[#0f172a]">{githubAnalytics.totalStars}</div>
                    </div>
                    <div className="rounded-[1.75rem] border border-[#fee2e2] bg-[#fef2f2] p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b91c1c]">Forks</div>
                      <div className="mt-3 text-3xl font-black text-[#0f172a]">{githubAnalytics.totalForks}</div>
                    </div>
                  </div>
                  <div className="mt-6 rounded-[1.75rem] border border-[#e2e8f0] bg-[#f8fafc] p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#334155]">Top languages</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {githubAnalytics.topLanguages.map(lang => (
                        <span key={lang} className="rounded-full bg-[#e0e7ff] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#4338ca]">{lang}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#ec4899] p-8 text-white shadow-[0_28px_80px_rgba(139,92,246,0.22)]">
            <div className="absolute inset-x-0 top-0 h-24 bg-white/10 blur-3xl" />
            <div className="absolute -right-10 top-12 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute left-8 top-16 h-24 w-24 rounded-full bg-[#f9a8d4]/25 blur-2xl" />
            <div className="relative">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/80">Profile snapshot</div>
              <div className="mt-6 grid gap-4">
                {[
                  { label: 'Contributions', value: formData.projects.length + formData.experienceList.length + formData.achievements.length },
                  { label: 'Tests completed', value: Math.max(formData.resume.atsScore > 0 ? 1 : 0, formData.skills.length ? 1 : 0) + formData.certifications.length },
                  { label: 'Skills', value: formData.skills.length },
                  { label: 'Activity score', value: profileCompletion },
                ].map((card, index) => (
                  <motion.div
                    key={card.label}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="rounded-[2rem] border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur-sm"
                    style={{ borderImage: 'linear-gradient(135deg, rgba(255,255,255,0.45), rgba(255,255,255,0.08)) 1' }}
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75">{card.label}</div>
                    <div className="mt-3 text-3xl font-black text-white">{card.value}</div>
                    <div className="mt-3 h-1 rounded-full bg-white/20" style={{ width: `${70 + index * 10}%` }} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/20 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Quick actions</div>
            <div className="mt-6 space-y-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="rounded-[2rem] border border-[#c7d2fe] bg-gradient-to-r from-[#eef2ff] to-[#e0e7ff] p-5"
              >
                <div className="text-sm font-black uppercase tracking-[0.18em] text-[#4338ca]">Profile score</div>
                <div className="mt-3 text-5xl font-black text-[#1f2937]">{profileCompletion}%</div>
                <p className="mt-3 text-sm text-[#475569]">Complete more sections to raise your score.</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="rounded-[2rem] border border-[#c7d2fe] bg-gradient-to-r from-[#fdf2f8] via-[#fce7f3] to-[#fef2f2] p-5"
              >
                <div className="text-sm font-black uppercase tracking-[0.18em] text-[#be185d]">Your nickname</div>
                <div className="mt-3 text-2xl font-black text-[#1f2937]">{formData.oneStrongWord || 'Choose a keyword'}</div>
                <p className="mt-3 text-sm text-[#6b7280]">This word appears in your professional profile preview.</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black">Share Profile</h3>
                <button onClick={() => setShowShareModal(false)} className="text-gray-400">Close</button>
              </div>
              {/* Share description removed as requested */}
              {/* Share Flow panel removed as requested */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => shareToSocial('linkedin')} disabled={isGeneratingTemplate} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-black uppercase disabled:opacity-50">LinkedIn</button>
                <button onClick={() => shareToSocial('whatsapp')} disabled={isGeneratingTemplate} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-black uppercase disabled:opacity-50">WhatsApp</button>
              </div>
              {shareQrDataUrl && (
                <div className="mt-4 rounded-3xl border border-gray-100 bg-gray-50 p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Scan QR for profile</div>
                  <div className="mt-3 inline-flex rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
                    <img src={shareQrDataUrl} alt="Profile QR code" className="h-40 w-40 object-contain" />
                  </div>
                  <p className="mt-3 text-xs font-medium text-gray-500">Scan to open the public profile instantly.</p>
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500">Tip: Use the download button to save the profile image, then attach it where needed.</div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => { downloadProfileTemplate(); }}
                  disabled={!publicProfileUrl || isGeneratingTemplate}
                  className="flex-1 rounded-2xl bg-[#7C3AED] px-4 py-3 text-xs font-black text-white transition-all duration-300 ease-out hover:bg-[#6D28D9] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download Profile
                </button>
              </div>

              {(saveStatus?.type === 'success' && saveStatus.message.toLowerCase().includes('downloaded')) && (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  {saveStatus.message}
                </div>
              )}

              {copiedForPlatform === 'whatsapp' && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-between gap-3">
                  <div className="text-sm text-amber-900">Image copied to clipboard. Open WhatsApp and paste (Ctrl+V) into your chat.</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const openUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;
                        const w = window.open(openUrl, '_blank');
                        try { w?.focus(); } catch {}
                      }}
                      className="px-3 py-2 rounded-lg bg-[#25D366] text-white text-sm font-bold"
                    >
                      Open WhatsApp Web
                    </button>
                    <button onClick={() => setCopiedForPlatform(null)} className="px-3 py-2 rounded-lg bg-white border text-sm">Done</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <div className="mb-12 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
<motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.25 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="rounded-[3rem] border border-gray-100 bg-white p-8 sm:p-10 shadow-[0_20px_60px_rgba(15,23,42,0.04)]"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">Activity Timeline</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Recent signals from your profile workspace</p>
          </div>
          <Calendar className="w-5 h-5 text-gray-300" />
        </div>
        <div className="space-y-4">
          {activityTimeline.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
              whileHover={{ scale: 1.01 }}
              className="flex gap-4 rounded-3xl border border-gray-100 bg-gradient-to-r from-gray-50/80 to-white p-4 hover:shadow-sm transition-all duration-300"
            >
              <div className={`w-3 h-3 rounded-full mt-2 shrink-0 ${item.tone === 'emerald' ? 'bg-emerald-500' : item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'sky' ? 'bg-sky-500' : 'bg-gray-400'}`} />
              <div className="min-w-0">
                <div className="text-sm font-black text-gray-900">{item.title}</div>
                <div className="text-sm text-gray-600 leading-6">{item.detail}</div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">0{index + 1}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="rounded-[3rem] border border-gray-100 bg-white p-8 sm:p-10 shadow-[0_20px_60px_rgba(15,23,42,0.04)]"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">Achievement Badges</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Profile milestones and visibility</p>
            </div>
            <Award className="w-5 h-5 text-[#7C3AED]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {achievementBadges.map((badge, index) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.07, ease: 'easeOut' }}
                whileHover={{ scale: 1.01 }}
                className="rounded-3xl border border-gray-100 bg-[#FAFAFA] p-4 hover:border-[#7C3AED]/20 transition-all duration-300"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{badge.label}</div>
                <div className="mt-2 text-sm font-bold text-gray-900">{badge.value}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 rounded-3xl border border-[#7C3AED]/10 bg-[#F5F3FF]/70 p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7C3AED]">Shareable Public Profile</div>
            <div className="mt-3 text-sm text-gray-700 leading-6">Generate a public URL, copy it instantly, or share it through your device's native share sheet.</div>
                  <div className="mt-3 break-all rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-[10px] font-medium text-gray-700 shadow-sm">{publicProfileUrl || 'Save your profile to generate a public link.'}</div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button onClick={() => copyProfileLink('profilePanel')} disabled={!publicProfileUrl} className="flex-1 rounded-2xl bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-900 border border-gray-200 hover:border-[#7C3AED]/30 transition-all disabled:opacity-50">Copy Profile Link</button>
              <button onClick={shareProfile} disabled={!publicProfileUrl} className="flex-1 rounded-2xl bg-[#7C3AED] px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-[#7C3AED]/20 hover:bg-[#6D28D9] transition-all disabled:opacity-50">Share Profile</button>
            </div>
            {copyFeedback?.target === 'profilePanel' && (
              <div className={`mt-3 text-[10px] font-bold ${copyFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>{copyFeedback.message}</div>
            )}
                  {publicProfileUrl && (
                    <a href={publicProfileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.2em] text-[#7C3AED] hover:text-[#6D28D9]">Open public profile</a>
                  )}
          </div>
        </motion.div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10 items-start">
        {/* Left Sidebar */}
        <div className="space-y-8 sticky top-32">
          {/* Create Resume Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => navigate('/job-prep/resume-builder')}
            className="bg-[#7C3AED] rounded-[2.5rem] p-8 text-white flex flex-col gap-6 shadow-2xl shadow-purple-900/20 relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
               <FileText className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <Plus className="w-6 h-6 opacity-90 text-white" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Create your Resume</h3>
              <p className="text-sm text-purple-100 font-medium leading-relaxed">Generate a professional resume with your profile details and download it as a clean PDF.</p>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden py-6">
            <div className="px-10 pb-4 mb-4 border-b border-gray-50">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Modules</span>
            </div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-10 py-5 transition-all relative group ${activeTab === tab.id ? 'text-[#7C3AED] bg-[#F5F3FF]/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-5">
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-[#7C3AED]' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span className="text-[11px] font-black uppercase tracking-widest">{tab.label}</span>
                </div>
                {tab.required && (
                  <span className={`text-[8px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-lg ${activeTab === tab.id ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : 'bg-red-50 text-red-400'}`}>
                    Required
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="tabHighlightSide"
                    className="absolute right-0 top-0 bottom-0 w-1 bg-[#7C3AED]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] p-10 sm:p-16 min-h-[800px] relative">
          <AnimatePresence mode="wait">
             {renderContent()}
          </AnimatePresence>
        </div>
      </div>

      <div ref={shareTemplateRef} aria-hidden="true" className="fixed -left-[99999px] top-0 w-[1080px] overflow-hidden rounded-[48px] bg-[#F5F3FF] p-8 pointer-events-none">
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#111827] via-[#5B21B6] to-[#8B5CF6] p-10 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_30%)]" />
          <div className="relative flex items-start justify-between gap-8">
            <div className="max-w-[640px]">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/90">
                Studlyf Social Profile
              </div>
              <h1 className="mt-8 text-6xl font-black leading-none tracking-tight">{profileDisplayName}</h1>
              <p className="mt-4 text-2xl font-semibold text-white/85">{profileRole}</p>
              <p className="mt-6 text-xl leading-8 text-white/80 max-w-[56rem]">{profileHeadline}</p>
            </div>

            <div className="flex w-[260px] flex-col items-center rounded-[32px] border border-white/15 bg-white/10 p-6 text-center backdrop-blur-md">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] bg-white/90 text-3xl font-black text-[#5B21B6] shadow-xl">
                {formData.profilePhoto ? (
                  <AvatarImage src={formData.profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span>{profileDisplayName.split(' ').map(part => part[0]).join('').slice(0, 2)}</span>
                )}
              </div>
              <div className="mt-5 text-[10px] font-black uppercase tracking-[0.25em] text-white/60">Profile score</div>
              <div className="mt-2 text-5xl font-black">{profileCompletion}</div>
              <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">Ready to share</div>
            </div>
          </div>

          <div className="relative mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Skills', value: `${formData.skills.length}` },
              { label: 'Projects', value: `${formData.projects.length}` },
              { label: 'Experience', value: `${formData.experienceList.length}` },
            ].map((item) => (
              <div key={item.label} className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/55">{item.label}</div>
                <div className="mt-3 text-4xl font-black">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-10 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[32px] border border-white/15 bg-white p-6 text-gray-900 shadow-2xl">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7C3AED]">About this profile</div>
              <p className="mt-4 text-lg leading-8 text-gray-700">{profileShareCaption}</p>
            </div>
            <div className="rounded-[32px] border border-white/15 bg-black/10 p-6 text-white backdrop-blur-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Share links</div>
              <div className="mt-4 space-y-3 text-sm font-semibold break-all text-white/90">
                <div>{publicProfileUrl}</div>
                {formData.linkedin && <div>LinkedIn: {formData.linkedin}</div>}
                {formData.portfolio && <div>Portfolio: {formData.portfolio}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;

