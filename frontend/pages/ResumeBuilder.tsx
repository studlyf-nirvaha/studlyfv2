import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../AuthContext";
import { API_BASE_URL } from "../apiConfig";
import {
    ChevronLeft,
    Download,
    Plus,
    Trash2,
    User,
    Briefcase,
    GraduationCap,
    Layout,
    Code2,
    CheckCircle2,
    Loader2,
    Eye,
    Save,
    Sparkles,
    CheckCircle,
    ChevronRight,
    Share2,
    Edit3,
    FileText,
    Globe,
    MapPin,
    Mail,
    Phone,
    Github,
    Linkedin,
    ExternalLink,
    Award,
    Award as CertificationIcon,
    Terminal,
    Database,
    Cpu,
    X,
    ChevronDown,
    ChevronUp,
    Upload,
    Copy,
    Check,
    RefreshCw,
    BarChart2,
    Layers
} from "lucide-react";
import Navigation from "../components/Navigation";
import { generatePdfHtml } from "../utils/resumePdf";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PersonalInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    jobTitle: string;
    links: { label: string; url: string }[];
}

interface Education {
    institution: string;
    degree: string;
    year: string;
    gpa: string;
}

interface Experience {
    company: string;
    role: string;
    range: string;
    location: string;
    points: string;
}

interface Additional {
    honorsAndAwards: string[];
}

interface ResumeData {
    name: string;
    personalInfo: PersonalInfo;
    education: Education[];
    experience: Experience[];
    skills: {
        languages: string[];
        frameworks: string[];
        tools: string[];
        databases: string[];
    };
    projects: { name: string; tech: string; desc: string; link?: string }[];
    certifications: string[];
    additional: Additional;
    lastSaved?: number;
    template?: string;
}

const DEFAULT_RESUME_DATA: ResumeData = {
    name: "My Resume",
    personalInfo: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        jobTitle: "",
        links: []
    },
    education: [],
    experience: [],
    skills: {
        languages: [],
        frameworks: [],
        tools: [],
        databases: []
    },
    projects: [],
    certifications: [],
    additional: {
        honorsAndAwards: []
    }
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

  :root {
    --v-purple: #6d28d9;
    --v-purple-mid: #7c3aed;
    --v-purple-soft: #8b5cf6;
    --v-purple-pale: #ede9fe;
    --v-border: #e4e7ec;
    --v-border-strong: #c8cdd6;
    --v-text: #0f172a;
    --v-text-mid: #374151;
    --v-text-muted: #6b7280;
    --v-text-faint: #9ca3af;
    --v-bg: #f9fafb;
    --v-surface: #ffffff;
    --v-surface-raised: #f3f4f6;
  }

  * { box-sizing: border-box; }

  body {
    background: var(--v-bg);
    font-family: 'Poppins', sans-serif;
    color: var(--v-text);
    -webkit-font-smoothing: antialiased;
  }

  /* ── Scrollbar ── */
  .v-scroll::-webkit-scrollbar { width: 4px; }
  .v-scroll::-webkit-scrollbar-track { background: transparent; }
  .v-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 8px; }

  /* ── Form Elements ── */
  .v-input {
    width: 100%;
    background: var(--v-surface);
    border: 1px solid var(--v-border);
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 13.5px;
    font-family: 'Poppins', sans-serif;
    color: var(--v-text);
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
    line-height: 1.5;
  }
  .v-input:focus {
    border-color: var(--v-purple-mid);
    box-shadow: 0 0 0 3px rgba(124,58,237,0.08);
  }
  .v-input::placeholder { color: var(--v-text-faint); }

  .v-label {
    display: block;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--v-text-muted);
    margin-bottom: 5px;
    letter-spacing: 0.3px;
  }

  /* ── Resume paper ── */
  .resume-paper {
    background: white;
    width: 210mm;
    min-height: 297mm;
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.05),
      0 8px 24px rgba(0,0,0,0.07),
      0 32px 64px rgba(0,0,0,0.06);
    padding: 40px 50px;
    margin: 32px 0;
  }

  /* ── Classic resume typography ── */
  .classic-resume { font-family: 'Poppins', sans-serif; color: #111; }
  .classic-resume h1 { font-size: 22pt; font-weight: 400; text-align: center; margin-bottom: 4pt; }
  .classic-resume .contact { font-size: 9pt; text-align: center; margin-bottom: 10pt; color: #333; }
  .classic-resume h2 { font-size: 9.5pt; font-weight: bold; border-bottom: 1px solid #111; margin: 10pt 0 5pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .classic-resume .entry-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 10pt; }
  .classic-resume .entry-subtile { display: flex; justify-content: space-between; font-style: italic; font-size: 9pt; margin-bottom: 2pt; }
  .classic-resume ul { padding-left: 14pt; margin: 0; }
  .classic-resume li { font-size: 9pt; margin-bottom: 2pt; line-height: 1.4; }
  .classic-resume .skill-group { font-size: 9pt; margin-bottom: 3pt; }
  .classic-resume .skill-label { font-weight: bold; }

  /* ── Animations ── */
  @keyframes shimmer {
    0% { transform: translateX(-200%) skewX(-15deg); }
    100% { transform: translateX(400%) skewX(-15deg); }
  }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.15); }
  }

  /* ── Premium CTA Button ── */
  .v-btn-primary {
    position: relative;
    padding: 11px 24px;
    background: var(--v-purple);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    font-family: 'Poppins', sans-serif;
    cursor: pointer;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.12), 0 4px 16px rgba(109,40,217,0.25);
    white-space: nowrap;
  }
  .v-btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 35%;
    background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.18) 50%, transparent 80%);
    animation: shimmer 3s ease-in-out infinite;
    pointer-events: none;
  }
  .v-btn-primary:hover {
    background: var(--v-purple-mid);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 8px 24px rgba(109,40,217,0.35);
  }
  .v-btn-primary:active { transform: scale(0.99); }
  .v-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .v-btn-ghost {
    padding: 9px 18px;
    background: transparent;
    color: var(--v-text-mid);
    border: 1px solid var(--v-border);
    border-radius: 8px;
    font-weight: 500;
    font-size: 13.5px;
    font-family: 'Poppins', sans-serif;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }
  .v-btn-ghost:hover {
    background: var(--v-surface-raised);
    border-color: var(--v-border-strong);
    color: var(--v-text);
  }

  /* ── Tag chip ── */
  .v-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background: var(--v-surface-raised);
    border: 1px solid var(--v-border);
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--v-text-mid);
    transition: all 0.15s;
  }
  .v-chip:hover { border-color: #f87171; }
  .v-chip button { color: var(--v-text-faint); display: flex; align-items: center; }
  .v-chip button:hover { color: #ef4444; }

  /* ── Section card (for entries) ── */
  .v-entry-card {
    background: var(--v-bg);
    border: 1px solid var(--v-border);
    border-radius: 10px;
    padding: 16px;
    position: relative;
  }

  /* ── Editor header ── */
  .editor-header {
    border-bottom: 1px solid var(--v-border);
    background: white;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    min-height: 52px;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  /* ── Landing grid bg ── */
  .grid-bg {
    background-image:
      linear-gradient(rgba(109,40,217,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(109,40,217,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  .float-anim { animation: float 5s ease-in-out infinite; }
  .float-anim-2 { animation: float 6s ease-in-out infinite 1.5s; }

  .hero-glow {
    background: radial-gradient(ellipse 70% 50% at 50% -5%, rgba(109,40,217,0.12) 0%, transparent 70%);
  }

  /* ── Progress bar ── */
  .progress-bar-fill {
    transition: width 0.4s ease;
    background: linear-gradient(90deg, #7c3aed, #a78bfa);
    border-radius: 999px;
  }
`;

// ─── AccordionItem ─────────────────────────────────────────────────────────────
const AccordionItem = ({ title, icon: Icon, children, isOpen, onClick, badge }: any) => (
    <div className="border-b border-gray-100 last:border-0">
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between py-3.5 px-5 hover:bg-gray-50/70 transition-colors text-left"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                    <Icon size={14} />
                </div>
                <span className="text-[13.5px] font-semibold text-gray-700">{title}</span>
                {badge != null && badge > 0 && (
                    <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{badge}</span>
                )}
            </div>
            <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={15} className="text-gray-400" />
            </div>
        </button>
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                >
                    <div className="px-5 pb-5 pt-1">{children}</div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

// ─── Skill Chip Row ────────────────────────────────────────────────────────────
const SkillChipRow = ({ label, items, onAdd, onRemove, placeholder, icon: Icon, color }: any) => {
    const [inputVal, setInputVal] = useState("");
    const handleAdd = () => {
        if (inputVal.trim()) { onAdd(inputVal.trim()); setInputVal(""); }
    };
    return (
        <div className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-2">
                <div className={`h-5 w-5 rounded flex items-center justify-center ${color}`}>
                    <Icon size={11} />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                {items.map((item: string, i: number) => (
                    <motion.span
                        key={i}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg text-xs font-medium"
                    >
                        {item}
                        <button onClick={() => onRemove(i)} className="ml-0.5 text-violet-400 hover:text-red-500 transition-colors">
                            <X size={10} />
                        </button>
                    </motion.span>
                ))}
                {items.length === 0 && (
                    <span className="text-[11px] text-gray-300 italic">No {label.toLowerCase()} added yet</span>
                )}
            </div>
            <div className="flex gap-2">
                <input
                    className="v-input !py-1.5 !text-xs flex-1"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                    placeholder={placeholder}
                />
                <button
                    onClick={handleAdd}
                    className="shrink-0 h-8 w-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 hover:bg-violet-100 transition-colors"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};

// ─── Completeness Calculator ───────────────────────────────────────────────────
function calcCompleteness(data: ResumeData): number {
    let score = 0;
    const p = data.personalInfo;
    if (p.firstName) score += 10;
    if (p.lastName) score += 5;
    if (p.email) score += 10;
    if (p.phone) score += 5;
    if (p.address) score += 5;
    if (p.jobTitle) score += 5;
    if (p.links.length > 0) score += 5;
    if (data.education.length > 0) score += 15;
    if (data.experience.length > 0) score += 15;
    if (data.skills.languages.length > 0 || data.skills.frameworks.length > 0 || data.skills.tools.length > 0) score += 10;
    if (data.projects.length > 0) score += 10;
    if (data.certifications.length > 0) score += 5;
    return Math.min(score, 100);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ResumeBuilder() {
    const { user } = useAuth();
    const [step, setStep] = useState<'dashboard' | 'create_new' | 'template_selection' | 'editor'>('create_new');
    const [hasExistingData, setHasExistingData] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<'classic' | 'modern'>('classic');
    const [resumeData, setResumeData] = useState<ResumeData>(DEFAULT_RESUME_DATA);
    const [isReviewing, setIsReviewing] = useState(false);
    const [reviewResult, setReviewResult] = useState<null | string[]>(null);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        personalInfo: true,
        links: true,
        education: false,
        experience: false,
        skills: false,
        projects: false,
        certifications: false,
        additional: false
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
    const [isEditingName, setIsEditingName] = useState(false);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [publicAccess, setPublicAccess] = useState(true);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [lastSavedTs, setLastSavedTs] = useState<number | null>(null);
    const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
    const autoSaveTimerRef = useRef<any>(null);

    // ─── Load Data ────────────────────────────────────────────────────────────
    useEffect(() => {
        // Load from localStorage first (instant recovery)
        try {
            const localSaved = localStorage.getItem('studlyf_saved_resume');
            if (localSaved) {
                const parsed = JSON.parse(localSaved);
                if (parsed && typeof parsed === 'object' && parsed.personalInfo) {
                    setResumeData(prev => ({
                        ...DEFAULT_RESUME_DATA,
                        ...parsed,
                        personalInfo: { ...DEFAULT_RESUME_DATA.personalInfo, ...(parsed.personalInfo || {}) },
                        skills: { ...DEFAULT_RESUME_DATA.skills, ...(parsed.skills || {}) },
                        additional: { ...DEFAULT_RESUME_DATA.additional, ...(parsed.additional || {}) }
                    }));
                    setHasExistingData(true);
                    setLastSavedTs(parsed.lastSaved || null);
                    if (parsed.template) setSelectedTemplate(parsed.template as any);
                }
            }
        } catch (e) {
            console.error("LocalStorage read error:", e);
        }

        // Then fetch from cloud
        async function fetchConfig() {
            if (!user?.uid) return;
            try {
                const res = await fetch(`${API_BASE_URL}/api/resume/${user.uid}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        const config = data.config;
                        let migratedData: ResumeData = { ...DEFAULT_RESUME_DATA };
                        if (config.personalInfo) {
                            migratedData = {
                                ...DEFAULT_RESUME_DATA, ...config,
                                personalInfo: { ...DEFAULT_RESUME_DATA.personalInfo, ...config.personalInfo },
                                skills: { ...DEFAULT_RESUME_DATA.skills, ...config.skills },
                                additional: { ...DEFAULT_RESUME_DATA.additional, ...config.additional }
                            };
                        } else if (config.p) {
                            const nameParts = (config.p.name || "").split(" ");
                            migratedData.personalInfo = {
                                firstName: nameParts[0] || "", lastName: nameParts.slice(1).join(" ") || "",
                                email: config.p.email || "", phone: config.p.phone || "",
                                address: config.p.loc || "", jobTitle: "",
                                links: config.p.li ? [{ label: "LinkedIn", url: config.p.li }] : []
                            };
                            if (config.exp) migratedData.experience = config.exp.map((ex: any) => ({ company: ex.org || "", role: ex.role || "", range: ex.range || "", location: ex.loc || "", points: ex.pts || "" }));
                            if (config.edu) migratedData.education = config.edu.map((ed: any) => ({ institution: ed.inst || "", degree: ed.deg || "", year: ed.year || "", gpa: ed.gpa || "" }));
                            if (config.proj) migratedData.projects = config.proj.map((pr: any) => ({ name: pr.name || "", tech: pr.tech || "", desc: pr.desc || "" }));
                            if (config.skills && Array.isArray(config.skills)) migratedData.skills.languages = config.skills;
                        }
                        setResumeData(migratedData);
                        setHasExistingData(true);
                        setLastSavedTs(migratedData.lastSaved || null);
                        if (migratedData.template) setSelectedTemplate(migratedData.template as any);
                        localStorage.setItem('studlyf_saved_resume', JSON.stringify(migratedData));
                    }
                }
            } catch (err) { console.error("Cloud fetch error:", err); }
        }
        fetchConfig();
    }, [user?.uid]);

    // ─── Debounced Auto-Save ───────────────────────────────────────────────────
    useEffect(() => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        const hasContent = resumeData.personalInfo.firstName || resumeData.personalInfo.email || resumeData.experience.length > 0 || resumeData.education.length > 0;
        if (hasContent) {
            autoSaveTimerRef.current = setTimeout(() => { performSave(true); }, 2000);
        }
        return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
    }, [resumeData]);

    // ─── Save ─────────────────────────────────────────────────────────────────
    const performSave = async (silent = false) => {
        if (!silent) setIsSaving(true);
        try {
            const now = Date.now();
            const dataToSave = { ...resumeData, lastSaved: now, template: selectedTemplate };
            localStorage.setItem('studlyf_saved_resume', JSON.stringify(dataToSave));
            setHasExistingData(true);
            setLastSavedTs(now);

            if (user?.uid) {
                await fetch(`${API_BASE_URL}/api/resume/${user.uid}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ config: dataToSave })
                });
            }
            if (!silent) { setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 3000); }
        } catch (e) {
            console.error("Save error:", e);
            if (!silent) setSaveStatus("error");
        } finally {
            if (!silent) setIsSaving(false);
        }
    };

    // ─── Download PDF ─────────────────────────────────────────────────────────
    const handleDownload = () => {
        setIsDownloading(true);
        try {
            const html = generatePdfHtml(resumeData, selectedTemplate);
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
                setTimeout(() => {
                    win.focus();
                    win.print();
                }, 800);
            }
        } catch (e) {
            console.error("PDF generation error:", e);
        } finally {
            setTimeout(() => setIsDownloading(false), 1200);
        }
    };

    // ─── Share Link ───────────────────────────────────────────────────────────
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/resume/public/${user?.uid || 'preview'}`;
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2500);
        } catch {
            // Fallback
            const el = document.createElement('input');
            el.value = shareUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2500);
        }
    };

    // ─── Data Handlers ────────────────────────────────────────────────────────
    const toggleSection = (section: string) => setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    const updatePersonalInfo = (field: string, value: string) => setResumeData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }));
    const addLink = () => setResumeData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, links: [...prev.personalInfo.links, { label: "", url: "" }] } }));
    const updateLink = (index: number, field: 'label' | 'url', value: string) => setResumeData(prev => { const nl = [...prev.personalInfo.links]; nl[index] = { ...nl[index], [field]: value }; return { ...prev, personalInfo: { ...prev.personalInfo, links: nl } }; });
    const removeLink = (index: number) => setResumeData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, links: prev.personalInfo.links.filter((_, i) => i !== index) } }));
    const addEducation = () => setResumeData(prev => ({ ...prev, education: [...prev.education, { institution: "", degree: "", year: "", gpa: "" }] }));
    const updateEducation = (index: number, field: keyof Education, value: string) => setResumeData(prev => { const ne = [...prev.education]; ne[index] = { ...ne[index], [field]: value }; return { ...prev, education: ne }; });
    const removeEducation = (index: number) => setResumeData(prev => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }));
    const addExperience = () => setResumeData(prev => ({ ...prev, experience: [...prev.experience, { company: "", role: "", range: "", location: "", points: "" }] }));
    const updateExperience = (index: number, field: keyof Experience, value: string) => setResumeData(prev => { const ne = [...prev.experience]; ne[index] = { ...ne[index], [field]: value }; return { ...prev, experience: ne }; });
    const removeExperience = (index: number) => setResumeData(prev => ({ ...prev, experience: prev.experience.filter((_, i) => i !== index) }));
    const addSkill = (type: keyof ResumeData['skills'], val: string) => { if (!val.trim()) return; setResumeData(prev => ({ ...prev, skills: { ...prev.skills, [type]: [...prev.skills[type], val] } })); };
    const removeSkill = (type: keyof ResumeData['skills'], index: number) => setResumeData(prev => ({ ...prev, skills: { ...prev.skills, [type]: prev.skills[type].filter((_, i) => i !== index) } }));
    const addProject = () => setResumeData(prev => ({ ...prev, projects: [...prev.projects, { name: "", tech: "", desc: "", link: "" }] }));
    const updateProject = (index: number, field: string, value: string) => setResumeData(prev => { const np = [...prev.projects]; np[index] = { ...np[index], [field]: value }; return { ...prev, projects: np }; });
    const removeProject = (index: number) => setResumeData(prev => ({ ...prev, projects: prev.projects.filter((_, i) => i !== index) }));
    const addCertification = (val: string) => { if (!val.trim()) return; setResumeData(prev => ({ ...prev, certifications: [...prev.certifications, val] })); };
    const removeCertification = (index: number) => setResumeData(prev => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== index) }));
    const addHonor = (val: string) => { if (!val.trim()) return; setResumeData(prev => ({ ...prev, additional: { ...prev.additional, honorsAndAwards: [...prev.additional.honorsAndAwards, val] } })); };
    const removeHonor = (index: number) => setResumeData(prev => ({ ...prev, additional: { ...prev.additional, honorsAndAwards: prev.additional.honorsAndAwards.filter((_, i) => i !== index) } }));

    // ─── Completeness ─────────────────────────────────────────────────────────
    const completeness = calcCompleteness(resumeData);

    // ─── Helper: format timestamp ─────────────────────────────────────────────
    const formatSavedTime = (ts: number | null): string => {
        if (!ts) return "Never";
        const diff = Date.now() - ts;
        if (diff < 60000) return "Just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(ts).toLocaleDateString();
    };

    // ─── DASHBOARD ────────────────────────────────────────────────────────────
    if (step === 'dashboard') {
        const displayName = resumeData.personalInfo.firstName || user?.displayName?.split(' ')[0] || "User";
        const fullName = [resumeData.personalInfo.firstName, resumeData.personalInfo.lastName].filter(Boolean).join(' ') || "My Resume";
        return (
            <div className="min-h-screen flex flex-col" style={{ background: '#f9fafb' }}>
                <style>{styles}</style>
                <Navigation />
                <div className="flex-1 v-scroll overflow-y-auto pt-28 pb-20 px-3 sm:px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
                            <div>
                                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">My Workspace</p>
                                <h1 className="text-2xl font-bold text-gray-900">{displayName}'s Resumes</h1>
                            </div>
                            <button
                                onClick={() => setStep('template_selection')}
                                className="v-btn-primary !px-5 !py-2.5 !text-sm"
                            >
                                <Plus size={15} /> New Resume
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                            {/* Existing resume card */}
                            {hasExistingData && (
                                <motion.div
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ y: -3 }}
                                    className="cursor-pointer group"
                                >
                                    <div
                                        className="aspect-[3/4] bg-white border border-gray-200 rounded-xl overflow-hidden relative shadow-sm hover:shadow-md hover:border-violet-300 transition-all duration-200"
                                        onClick={() => setStep('editor')}
                                    >
                                        {/* Mini resume preview */}
                                        <div className="absolute inset-0 p-4 overflow-hidden">
                                            <div className="text-center mb-2">
                                                <div className="h-2 bg-gray-800 rounded-full mx-auto mb-1" style={{ width: '60%' }} />
                                                <div className="h-1 bg-gray-200 rounded-full mx-auto" style={{ width: '80%' }} />
                                            </div>
                                            <div className="border-t border-gray-200 my-2 pt-2">
                                                <div className="h-1 bg-gray-600 rounded-full mb-1.5" style={{ width: '40%' }} />
                                                {[1, 0.9, 0.75].map((w, i) => <div key={i} className="h-0.5 bg-gray-100 rounded-full mb-1" style={{ width: `${w * 100}%` }} />)}
                                            </div>
                                            <div className="border-t border-gray-200 my-2 pt-2">
                                                <div className="h-1 bg-gray-600 rounded-full mb-1.5" style={{ width: '50%' }} />
                                                {[0.85, 0.9, 0.8, 0.7].map((w, i) => <div key={i} className="h-0.5 bg-gray-100 rounded-full mb-1" style={{ width: `${w * 100}%` }} />)}
                                            </div>
                                            <div className="border-t border-gray-200 my-2 pt-2">
                                                <div className="h-1 bg-gray-600 rounded-full mb-1.5" style={{ width: '30%' }} />
                                                <div className="flex flex-wrap gap-1">
                                                    {[...resumeData.skills.languages.slice(0, 3), ...resumeData.skills.frameworks.slice(0, 2)].map((s, i) => (
                                                        <div key={i} className="h-2 bg-violet-100 rounded" style={{ width: `${Math.max(20, s.length * 4)}px` }} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-violet-50/80 backdrop-blur-[2px]">
                                            <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-violet-100 flex items-center gap-2 text-sm font-semibold text-violet-700">
                                                <Edit3 size={14} /> Edit Resume
                                            </div>
                                        </div>
                                        {/* Template badge */}
                                        <div className="absolute top-2 right-2">
                                            <span className="text-[9px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                                {selectedTemplate}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="mt-2.5 text-xs font-semibold text-gray-700 truncate">{fullName}</p>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className="text-[11px] text-gray-400">Saved {formatSavedTime(lastSavedTs)}</p>
                                        <div className="flex items-center gap-1">
                                            <div className="h-1 bg-gray-100 rounded-full w-12 overflow-hidden">
                                                <div className="h-full bg-violet-400 rounded-full" style={{ width: `${completeness}%` }} />
                                            </div>
                                            <span className="text-[10px] text-gray-400">{completeness}%</span>
                                        </div>
                                    </div>
                                    {/* Action buttons */}
                                    <div className="flex gap-1.5 mt-2">
                                        <button
                                            onClick={() => setStep('editor')}
                                            className="flex-1 py-1.5 text-[11px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Edit3 size={11} /> Edit
                                        </button>
                                        <button
                                            onClick={handleDownload}
                                            className="flex-1 py-1.5 text-[11px] font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Download size={11} /> PDF
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Create new card */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: hasExistingData ? 0.05 : 0 }}
                                whileHover={{ y: -3 }}
                                onClick={() => setStep('template_selection')}
                                className="cursor-pointer group"
                            >
                                <div className="aspect-[3/4] border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center hover:border-violet-400 hover:bg-violet-50/30 transition-all duration-200">
                                    <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-violet-500 transition-colors">
                                        <div className="h-10 w-10 rounded-xl border-2 border-current flex items-center justify-center">
                                            <Plus size={20} />
                                        </div>
                                        <span className="text-xs font-semibold">New Resume</span>
                                    </div>
                                </div>
                                <p className="mt-2.5 text-xs font-semibold text-gray-400">Create new</p>
                            </motion.div>
                        </div>

                        {/* Stats row */}
                        {hasExistingData && (
                            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { label: 'Completeness', value: `${completeness}%`, sub: completeness >= 80 ? 'Great job!' : 'Keep filling sections', color: completeness >= 80 ? 'text-emerald-600' : 'text-amber-600' },
                                    { label: 'Sections Filled', value: `${[resumeData.education.length > 0, resumeData.experience.length > 0, resumeData.skills.languages.length > 0 || resumeData.skills.frameworks.length > 0, resumeData.projects.length > 0, resumeData.certifications.length > 0].filter(Boolean).length}/5`, sub: 'Content sections', color: 'text-violet-600' },
                                    { label: 'Last Saved', value: formatSavedTime(lastSavedTs), sub: 'Auto-saved to cloud', color: 'text-gray-700' },
                                ].map(({ label, value, sub, color }) => (
                                    <div key={label} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                                        <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── LANDING (create_new) ──────────────────────────────────────────────────
    if (step === 'create_new') {
        const fadeUp = {
            hidden: { opacity: 0, y: 24 },
            visible: (i = 0) => ({
                opacity: 1, y: 0,
                transition: { delay: i * 0.09, duration: 0.5, ease: [0.4, 0, 0.2, 1] }
            })
        };

        return (
            <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">
                <style>{styles}</style>
                <Navigation />

                {/* ── HERO ── */}
                <section className="relative overflow-hidden grid-bg hero-glow pt-28 pb-20 md:pt-36 md:pb-28">
                    <div className="max-w-6xl mx-auto px-3 sm:px-6 flex flex-col md:flex-row items-center gap-10 md:gap-16">
                        {/* Left */}
                        <div className="flex-1 max-w-xl">
                            <motion.div
                                variants={fadeUp} initial="hidden" animate="visible" custom={0}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-xs font-semibold mb-6"
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                                ATS-Optimized · Used by 10k+ students
                            </motion.div>

                            <motion.h1
                                variants={fadeUp} initial="hidden" animate="visible" custom={1}
                                className="text-4xl md:text-6xl font-bold text-gray-950 leading-[1.1] tracking-tight mb-6"
                                style={{ fontFamily: "'Poppins', sans-serif" }}
                            >
                                Build a resume<br />
                                <span style={{ color: 'var(--v-purple)' }}>that gets noticed.</span>
                            </motion.h1>

                            <motion.p
                                variants={fadeUp} initial="hidden" animate="visible" custom={2}
                                className="text-lg text-gray-500 leading-relaxed mb-10 max-w-md"
                            >
                                Professional templates, AI-powered suggestions, and one-click PDF export — everything you need in one place.
                            </motion.p>

                            <motion.div
                                variants={fadeUp} initial="hidden" animate="visible" custom={3}
                                className="flex flex-wrap items-center gap-3"
                            >
                                <button onClick={() => setStep('template_selection')} className="v-btn-primary !px-6 !py-3 !text-base">
                                    Get started free
                                    <ChevronRight size={16} />
                                </button>
                                {hasExistingData && (
                                    <button onClick={() => setStep('dashboard')} className="v-btn-ghost !px-6 !py-3 !text-base">
                                        My dashboard
                                    </button>
                                )}
                            </motion.div>

                            <motion.div
                                variants={fadeUp} initial="hidden" animate="visible" custom={4}
                                className="flex items-center gap-4 sm:gap-6 mt-10 flex-wrap"
                            >
                                {[['98%', 'Success rate'], ['2 min', 'Avg. build time'], ['Free', 'No credit card']].map(([val, label]) => (
                                    <div key={label}>
                                        <p className="text-xl font-bold text-gray-900">{val}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                                    </div>
                                ))}
                            </motion.div>
                        </div>

                        {/* Right – floating resume mockup */}
                        <motion.div
                            initial={{ opacity: 0, x: 32 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25, duration: 0.6 }}
                            className="hidden md:flex flex-1 justify-center items-center relative"
                        >
                            <div className="relative">
                                {/* Main card */}
                                <div className="float-anim w-[260px] bg-white rounded-xl shadow-2xl border border-gray-100 p-6 relative z-10">
                                    <div className="h-3 w-1/3 bg-gray-900 rounded-full mb-1"></div>
                                    <div className="h-2 w-2/5 bg-gray-300 rounded-full mb-5"></div>
                                    <div className="h-px bg-gray-100 mb-4"></div>
                                    <div className="space-y-1.5 mb-5">
                                        <div className="h-1.5 w-16 bg-gray-800 rounded text-[8px]"></div>
                                        <div className="h-1 w-full bg-gray-100 rounded"></div>
                                        <div className="h-1 w-5/6 bg-gray-100 rounded"></div>
                                        <div className="h-1 w-4/6 bg-gray-100 rounded"></div>
                                    </div>
                                    <div className="h-px bg-gray-100 mb-4"></div>
                                    <div className="space-y-1.5 mb-5">
                                        <div className="h-1.5 w-20 bg-gray-800 rounded"></div>
                                        {[1,0.85,0.9,0.7].map((w,i) => <div key={i} className="h-1 bg-gray-100 rounded" style={{width:`${w*100}%`}} />)}
                                    </div>
                                    <div className="h-px bg-gray-100 mb-4"></div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[0.8,0.65,0.75,0.55].map((w,i) => <div key={i} className="h-1 bg-gray-100 rounded" style={{width:`${w*100}%`}} />)}
                                    </div>
                                </div>

                                {/* AI badge */}
                                <motion.div
                                    className="float-anim-2 absolute -top-4 -right-10 bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 z-20"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center">
                                        <Sparkles size={13} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-800">AI Review</p>
                                        <p className="text-[9px] text-green-500 font-semibold">3 suggestions</p>
                                    </div>
                                </motion.div>

                                {/* ATS badge */}
                                <motion.div
                                    className="float-anim absolute -bottom-4 -left-10 bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 z-20"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.75 }}
                                >
                                    <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                                        <CheckCircle size={14} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-800">ATS Score</p>
                                        <p className="text-[9px] text-emerald-600 font-semibold">94 / 100</p>
                                    </div>
                                </motion.div>

                                {/* Bg shadow card */}
                                <div className="absolute inset-0 translate-x-4 translate-y-4 bg-violet-100/60 rounded-xl -z-10"></div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ── STATS STRIP ── */}
                <section className="border-y border-gray-100 py-6 sm:py-8 bg-white">
                    <div className="max-w-5xl mx-auto px-3 sm:px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
                            {[
                                ['10,000+', 'Students helped'],
                                ['98%', 'ATS pass rate'],
                                ['2', 'Professional templates'],
                                ['60s', 'AI review time'],
                            ].map(([val, label], i) => (
                                <motion.div
                                    key={label}
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.07 }}
                                >
                                    <p className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight">{val}</p>
                                    <p className="text-sm text-gray-400 mt-1">{label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section className="py-16 sm:py-24 bg-white">
                    <div className="max-w-5xl mx-auto px-3 sm:px-6">
                        <div className="text-center mb-10 sm:mb-16">
                            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Features</motion.p>
                            <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-2xl sm:text-4xl font-bold text-gray-950 tracking-tight">Everything you need to land the job</motion.h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                            {[
                                { icon: Sparkles, title: 'AI-Powered Review', desc: 'Get real-time suggestions to improve your content, keywords, and ATS score in under 60 seconds.', color: 'bg-violet-50 text-violet-600' },
                                { icon: Layout, title: 'Clean Templates', desc: 'Choose from ATS-optimized templates designed by hiring professionals and career coaches.', color: 'bg-sky-50 text-sky-600' },
                                { icon: Share2, title: 'Instant Sharing', desc: 'Share via a public link or export as a pixel-perfect PDF — ready for any job portal.', color: 'bg-emerald-50 text-emerald-600' },
                                { icon: FileText, title: 'Multiple Sections', desc: 'Projects, certifications, honors, and custom links — structure your story your way.', color: 'bg-amber-50 text-amber-600' },
                                { icon: Save, title: 'Auto-Save', desc: 'Your work is saved to the cloud continuously. Pick up right where you left off, any time.', color: 'bg-rose-50 text-rose-600' },
                                { icon: Eye, title: 'Live Preview', desc: 'See your resume update in real time as you type. What you see is exactly what you export.', color: 'bg-indigo-50 text-indigo-600' },
                            ].map(({ icon: Icon, title, desc, color }, i) => (
                                <motion.div
                                    key={title}
                                    initial={{ opacity: 0, y: 16 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.06 }}
                                    whileHover={{ y: -3 }}
                                    className="bg-white border border-gray-100 rounded-xl p-6 hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-default"
                                >
                                    <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center mb-4`}>
                                        <Icon size={18} />
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── HOW IT WORKS ── */}
                <section className="py-16 sm:py-24 bg-gray-50 border-y border-gray-100">
                    <div className="max-w-3xl mx-auto px-3 sm:px-6">
                        <div className="text-center mb-10 sm:mb-16">
                            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">How it works</motion.p>
                            <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-2xl sm:text-4xl font-bold text-gray-950 tracking-tight">Three steps to your dream role</motion.h2>
                        </div>

                        <div className="relative">
                            <div className="absolute left-5 top-6 bottom-6 w-px bg-gray-200" />
                            <div className="space-y-10">
                                {[
                                    { n: '1', title: 'Pick a template', desc: 'Choose Classic or Modern — both are ATS-friendly and recruiter-approved.' },
                                    { n: '2', title: 'Fill in your details', desc: 'Add your experience, education, skills, and projects using our structured forms.' },
                                    { n: '3', title: 'Review & export', desc: 'Run the AI review, tweak as needed, then download as PDF or share your public link.' },
                                ].map(({ n, title, desc }, i) => (
                                    <motion.div
                                        key={n}
                                        initial={{ opacity: 0, x: -16 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-start gap-6 relative"
                                    >
                                        <div className="h-10 w-10 rounded-xl bg-white border-2 border-violet-200 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0 relative z-10 shadow-sm">
                                            {n}
                                        </div>
                                        <div className="pt-1.5">
                                            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
                                            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── TEMPLATE SHOWCASE ── */}
                <section className="py-16 sm:py-24 bg-white">
                    <div className="max-w-5xl mx-auto px-3 sm:px-6">
                        <div className="text-center mb-10 sm:mb-16">
                            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Templates</motion.p>
                            <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-2xl sm:text-4xl font-bold text-gray-950 tracking-tight">Two templates, endless possibilities</motion.h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[
                                { id: 'classic', name: 'Classic', tag: 'Most popular', sub: 'Clean, serif-based layout trusted by Fortune 500 recruiters.' },
                                { id: 'modern', name: 'Modern', tag: 'Trending', sub: 'Structured, two-column design for tech and creative roles.' },
                            ].map(({ id, name, tag, sub }, i) => (
                                <motion.div
                                    key={id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ y: -4 }}
                                    className="group border border-gray-200 rounded-2xl overflow-hidden hover:border-violet-300 hover:shadow-lg hover:shadow-violet-50 transition-all duration-300 cursor-pointer bg-white"
                                    onClick={() => { setSelectedTemplate(id as any); setStep('editor'); }}
                                >
                                    <div className="aspect-[4/3] overflow-hidden border-b border-gray-100 bg-gray-50">
                                        <img
                                            src={`/template-previews/${id}-resume.png`}
                                            alt={`${name} Resume Template`}
                                            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                            onError={(e) => {
                                                // Render a simple placeholder instead
                                                e.currentTarget.style.display = 'none';
                                                const parent = e.currentTarget.parentElement;
                                                if (parent && !parent.querySelector('.template-placeholder')) {
                                                    const el = document.createElement('div');
                                                    el.className = 'template-placeholder w-full h-full flex items-center justify-center';
                                                    el.innerHTML = `<div style="background:white;width:80%;height:90%;border-radius:8px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="height:12px;width:50%;background:#111;border-radius:4px;margin:0 auto 8px"></div><div style="height:6px;width:70%;background:#ddd;border-radius:4px;margin:0 auto 16px"></div><div style="height:1px;background:#eee;margin-bottom:10px"></div>${['40%','90%','75%','85%'].map(w => `<div style="height:5px;width:${w};background:#f0f0f0;border-radius:4px;margin-bottom:5px"></div>`).join('')}</div>`;
                                                    parent.appendChild(el);
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-semibold text-gray-900">{name}</h3>
                                            <span className="text-xs px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full font-medium">{tag}</span>
                                        </div>
                                        <p className="text-sm text-gray-500">{sub}</p>
                                        <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-violet-600 group-hover:gap-3 transition-all">
                                            Use this template <ChevronRight size={14} />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── FINAL CTA ── */}
                <section className="py-16 sm:py-24 bg-gray-950 relative overflow-hidden">
                    <div className="absolute inset-0 grid-bg opacity-20" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 bg-violet-800/20 rounded-full blur-3xl" />
                    <div className="max-w-2xl mx-auto px-3 sm:px-6 text-center relative z-10">
                        <motion.h2
                            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-5"
                        >
                            Your next opportunity<br />starts here.
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-gray-400 text-lg mb-10"
                        >
                            Free to use. No credit card required. Ready in under 5 minutes.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            <button
                                onClick={() => setStep('template_selection')}
                                className="v-btn-primary !px-8 !py-3.5 !text-base !rounded-xl"
                            >
                                Build my resume <ChevronRight size={16} />
                            </button>
                        </motion.div>
                    </div>
                </section>
            </div>
        );
    }

    // ─── TEMPLATE SELECTION ────────────────────────────────────────────────────
    if (step === 'template_selection') {
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <style>{styles}</style>
                <Navigation />
                <div className="flex-1 flex flex-col items-center pt-28 sm:pt-36 pb-16 sm:pb-20 px-3 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-10 sm:mb-14"
                    >
                        <div className="flex items-center justify-center gap-2 mb-4">
                            {hasExistingData && (
                                <button
                                    onClick={() => setStep('dashboard')}
                                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 transition-colors"
                                >
                                    <ChevronLeft size={16} /> Back to my resumes
                                </button>
                            )}
                        </div>
                        <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Step 1 of 1</p>
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-950 tracking-tight mb-3">Choose your template</h1>
                        <p className="text-gray-500 text-lg max-w-md mx-auto">Both templates are ATS-optimized. You can switch anytime from the editor.</p>
                    </motion.div>

                    <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full max-w-3xl">
                        {[
                            { id: 'classic', name: 'Classic', sub: 'Clean & Professional', tag: 'Most popular', desc: 'Traditional layout with clear sections and strong typography. Best for finance, law, and corporate roles.' },
                            { id: 'modern', name: 'Modern', sub: 'Structured & Visual', tag: 'Trending', desc: 'Contemporary design with a professional feel. Ideal for tech, design, and startup roles.' }
                        ].map(({ id, name, sub, tag, desc }, i) => (
                            <motion.div
                                key={id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                whileHover={{ y: -4 }}
                                onClick={() => { setSelectedTemplate(id as any); setStep('editor'); }}
                                className={`flex-1 border-2 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 group ${
                                    selectedTemplate === id
                                        ? 'border-violet-500 shadow-lg shadow-violet-100'
                                        : 'border-gray-200 hover:border-violet-300 hover:shadow-md hover:shadow-violet-50'
                                }`}
                            >
                                <div className="aspect-[4/3] overflow-hidden border-b border-gray-100 bg-gray-50">
                                    <img
                                        src={`/template-previews/${id}-resume.png`}
                                        alt={`${name} Resume Template`}
                                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                </div>
                                <div className="p-5 bg-white">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-bold text-gray-900 text-lg">{name}</h3>
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
                                    </div>
                                    <p className="text-sm font-medium text-violet-600 mb-2">{sub}</p>
                                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-violet-700">
                                        <span>Use this template</span>
                                        <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─── EDITOR ───────────────────────────────────────────────────────────────

    const renderClassicPreview = () => {
        const { personalInfo: p, education: edu, experience: exp, skills, projects: projs, certifications, additional } = resumeData;
        return (
            <div className="classic-resume">
                <h1>{(p.firstName + " " + p.lastName).trim().toUpperCase() || "YOUR NAME"}</h1>
                {p.jobTitle && <div className="contact" style={{ fontStyle: 'italic', marginBottom: '4pt' }}>{p.jobTitle}</div>}
                <div className="contact">
                    {p.email && <span>{p.email}</span>}
                    {p.phone && <span> | {p.phone}</span>}
                    {p.address && <span> | {p.address}</span>}
                </div>
                {p.links.length > 0 && (
                    <div className="contact" style={{ marginTop: '-8pt' }}>
                        {p.links.map((link, i) => (<span key={i}>{i > 0 && " | "}<span className="font-bold">{link.label}:</span> {link.url}</span>))}
                    </div>
                )}
                {edu.length > 0 && (<>
                    <h2>Education</h2>
                    {edu.map((e, i) => (
                        <div key={i} className="mb-2">
                            <div className="entry-header"><span>{e.institution || "University"}</span><span>{e.year || "Date"}</span></div>
                            <div className="entry-subtile"><span>{e.degree || "Degree"}</span><span>{e.gpa && `GPA: ${e.gpa}`}</span></div>
                        </div>
                    ))}
                </>)}
                {exp.length > 0 && (<>
                    <h2>Experience</h2>
                    {exp.map((ex, i) => (
                        <div key={i} className="mb-3">
                            <div className="entry-header"><span>{ex.company || "Company"}</span><span>{ex.range || "Date Range"}</span></div>
                            <div className="entry-subtile"><span>{ex.role || "Role"}</span><span>{ex.location || "Location"}</span></div>
                            <ul>{ex.points.split('\n').filter(p => p.trim()).map((point, k) => <li key={k}>{point}</li>)}</ul>
                        </div>
                    ))}
                </>)}
                {(skills.languages.length > 0 || skills.frameworks.length > 0 || skills.tools.length > 0 || skills.databases.length > 0) && (<>
                    <h2>Skills</h2>
                    {skills.languages.length > 0 && <div className="skill-group"><span className="skill-label">Programming Languages: </span><span>{skills.languages.join(", ")}</span></div>}
                    {skills.frameworks.length > 0 && <div className="skill-group"><span className="skill-label">Libraries/Frameworks: </span><span>{skills.frameworks.join(", ")}</span></div>}
                    {skills.tools.length > 0 && <div className="skill-group"><span className="skill-label">Tools/Platforms: </span><span>{skills.tools.join(", ")}</span></div>}
                    {skills.databases.length > 0 && <div className="skill-group"><span className="skill-label">Databases: </span><span>{skills.databases.join(", ")}</span></div>}
                </>)}
                {projs.length > 0 && (<>
                    <h2>Projects / Open Source</h2>
                    {projs.map((pr, i) => (
                        <div key={i} className="mb-2">
                            <div className="entry-header">
                                <span>{pr.name.toUpperCase()} {pr.link && <span className="font-normal">| {pr.link}</span>}</span>
                                <span className="font-normal italic">{pr.tech}</span>
                            </div>
                            <div className="text-[9pt] leading-tight text-slate-700 mt-0.5">{pr.desc}</div>
                        </div>
                    ))}
                </>)}
                {certifications.length > 0 && (<>
                    <h2>Certifications</h2>
                    <ul className="list-disc pl-4">{certifications.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </>)}
                {additional.honorsAndAwards.length > 0 && (<>
                    <h2>Honors & Awards</h2>
                    <ul className="list-disc pl-4">{additional.honorsAndAwards.map((h, i) => <li key={i}>{h}</li>)}</ul>
                </>)}
            </div>
        );
    };

    const renderModernPreview = () => {
        const { personalInfo: p, education: edu, experience: exp, skills, projects: projs, certifications, additional } = resumeData;
        return (
            <div className="w-full" style={{ fontFamily: "'Poppins', sans-serif", color: '#1e293b' }}>
                <style>{`
                    .modern-header { text-align: center; margin-bottom: 24px; }
                    .modern-name { font-family: 'Poppins', sans-serif; font-size: 28pt; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; color: #1e293b; }
                    .modern-name span { font-weight: 600; }
                    .modern-jobtitle { font-size: 11pt; color: #7c3aed; letter-spacing: 1px; font-weight: 500; margin-bottom: 6px; }
                    .modern-contact { font-size: 9.5pt; color: #64748b; letter-spacing: 0.5px; }
                    .modern-divider { border-bottom: 1px solid #e2e8f0; width: 100%; margin: 16px 0; }
                    .modern-section { margin-bottom: 20px; }
                    .modern-section-title { display: flex; align-items: center; margin-bottom: 10px; }
                    .modern-section-title h2 { font-family: 'Poppins', sans-serif; font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; margin-right: 12px; white-space: nowrap; }
                    .modern-section-line { height: 1px; background: #f1f5f9; flex-grow: 1; }
                    .modern-entry { margin-bottom: 12px; }
                    .modern-entry-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 10.5pt; color: #1e293b; }
                    .modern-entry-sub { display: flex; justify-content: space-between; font-size: 9.5pt; color: #475569; margin-top: 2px; font-weight: 500; }
                    .modern-bullets { padding-left: 14px; margin-top: 5px; }
                    .modern-bullets li { font-size: 9pt; color: #334155; margin-bottom: 3px; line-height: 1.5; }
                    .modern-skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
                    .modern-skill-item { font-size: 9pt; color: #334155; }
                    .modern-skill-label { font-weight: 700; color: #1e293b; }
                `}</style>
                <div className="modern-header">
                    <h1 className="modern-name">{p?.firstName || "FIRST"} <span>{p?.lastName || "LAST"}</span></h1>
                    {p?.jobTitle && <div className="modern-jobtitle">{p.jobTitle}</div>}
                    <div className="modern-contact">
                        {p?.email || "email@example.com"}
                        {p?.phone && <span> • {p.phone}</span>}
                        {p?.address && <span> • {p.address}</span>}
                        {p?.links?.map((l, i) => <span key={i}> • {l.label}: {l.url}</span>)}
                    </div>
                    <div className="modern-divider" />
                </div>
                {edu.length > 0 && (
                    <div className="modern-section">
                        <div className="modern-section-title"><h2>Education</h2><div className="modern-section-line" /></div>
                        {edu.map((e, i) => (
                            <div key={i} className="modern-entry">
                                <div className="modern-entry-header"><span>{e.institution}</span><span style={{ color: '#94a3b8', fontWeight: 500 }}>{e.year}</span></div>
                                <div className="modern-entry-sub"><span>{e.degree}</span><span style={{ color: '#7c3aed', fontWeight: 700 }}>{e.gpa ? `GPA: ${e.gpa}` : ""}</span></div>
                            </div>
                        ))}
                    </div>
                )}
                {exp.length > 0 && (
                    <div className="modern-section">
                        <div className="modern-section-title"><h2>Experience</h2><div className="modern-section-line" /></div>
                        {exp.map((ex, i) => (
                            <div key={i} className="modern-entry">
                                <div className="modern-entry-header"><span>{ex.company}</span><span style={{ color: '#94a3b8', fontWeight: 500 }}>{ex.range}</span></div>
                                <div className="modern-entry-sub"><span>{ex.role}</span><span style={{ color: '#94a3b8' }}>{ex.location}</span></div>
                                <ul className="modern-bullets">{ex.points?.split('\n').filter(pt => pt.trim()).map((pt, k) => <li key={k}>{pt}</li>)}</ul>
                            </div>
                        ))}
                    </div>
                )}
                {(skills.languages?.length || skills.frameworks?.length || skills.tools?.length || skills.databases?.length) ? (
                    <div className="modern-section">
                        <div className="modern-section-title"><h2>Skills</h2><div className="modern-section-line" /></div>
                        <div className="modern-skills-grid">
                            {skills.languages?.length > 0 && <div className="modern-skill-item"><span className="modern-skill-label">Languages: </span>{skills.languages.join(", ")}</div>}
                            {skills.frameworks?.length > 0 && <div className="modern-skill-item"><span className="modern-skill-label">Frameworks: </span>{skills.frameworks.join(", ")}</div>}
                            {skills.tools?.length > 0 && <div className="modern-skill-item"><span className="modern-skill-label">Tools: </span>{skills.tools.join(", ")}</div>}
                            {skills.databases?.length > 0 && <div className="modern-skill-item"><span className="modern-skill-label">Databases: </span>{skills.databases.join(", ")}</div>}
                        </div>
                    </div>
                ) : null}
                {projs.length > 0 && (
                    <div className="modern-section">
                        <div className="modern-section-title"><h2>Projects</h2><div className="modern-section-line" /></div>
                        {projs.map((pr, i) => (
                            <div key={i} className="modern-entry">
                                <div className="modern-entry-header">
                                    <span>{pr.name} {pr.link && <span style={{ fontWeight: 400, fontSize: '9pt', color: '#7c3aed' }}>— {pr.link}</span>}</span>
                                    <span style={{ fontWeight: 400, fontStyle: 'italic', fontSize: '9pt', color: '#64748b' }}>{pr.tech}</span>
                                </div>
                                <div style={{ fontSize: '9pt', color: '#475569', marginTop: '3px', lineHeight: 1.5 }}>{pr.desc}</div>
                            </div>
                        ))}
                    </div>
                )}
                {certifications.length > 0 && (
                    <div className="modern-section">
                        <div className="modern-section-title"><h2>Certifications</h2><div className="modern-section-line" /></div>
                        <ul className="modern-bullets">{certifications.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                )}
                {additional.honorsAndAwards.length > 0 && (
                    <div className="modern-section">
                        <div className="modern-section-title"><h2>Honors & Awards</h2><div className="modern-section-line" /></div>
                        <ul className="modern-bullets">{additional.honorsAndAwards.map((h, i) => <li key={i}>{h}</li>)}</ul>
                    </div>
                )}
            </div>
        );
    };

    // ─── EDITOR RENDER ────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#f9fafb' }}>
            <style>{styles}</style>

            {/* ── Editor top bar ── */}
            <nav className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setStep(hasExistingData ? 'dashboard' : 'create_new')}>
                        <img src="/images/studlyf_secondary.png" alt="STUDLYF Logo" className="h-7 w-auto object-contain" />
                    </div>
                    <div className="h-4 border-l border-slate-200" />
                    <button onClick={() => setStep(hasExistingData ? 'dashboard' : 'create_new')} className="text-slate-500 font-semibold text-sm hover:text-slate-900 transition-colors flex items-center gap-1">
                        <ChevronLeft size={14} /> My Resumes
                    </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Template switcher */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
                        {(['classic', 'modern'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setSelectedTemplate(t)}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${selectedTemplate === t ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Download button */}
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
                    >
                        {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                        <span className="hidden sm:inline">{isDownloading ? 'Preparing…' : 'Download PDF'}</span>
                    </button>

                    {/* Share button */}
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
                    >
                        <Share2 size={13} />
                        <span className="hidden sm:inline">Share</span>
                    </button>

                    <div className="h-7 w-7 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-200 text-xs font-bold">
                        {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                    </div>
                </div>
            </nav>

            {/* ── Editor sub-header ── */}
            <header className="editor-header bg-white">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <button onClick={() => setStep(hasExistingData ? 'dashboard' : 'create_new')} className="hover:text-violet-600 transition-colors font-medium">Home</button>
                        <ChevronRight size={11} />
                        <span className="text-gray-600 font-medium">Editor</span>
                    </div>
                    <div className="h-4 w-px bg-gray-200" />
                    {/* Resume name editable */}
                    {isEditingName ? (
                        <input
                            autoFocus
                            value={resumeData.name}
                            onBlur={() => setIsEditingName(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                            onChange={(e) => setResumeData({ ...resumeData, name: e.target.value })}
                            className="text-sm font-semibold text-gray-900 outline-none bg-transparent border-b border-violet-400 w-40"
                        />
                    ) : (
                        <button onClick={() => setIsEditingName(true)} className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 hover:text-violet-600 transition-colors">
                            {resumeData.name}
                            <Edit3 size={12} className="text-gray-400" />
                        </button>
                    )}
                    {/* Save status badge — only shows after save */}
                    {hasExistingData && (
                        <button
                            onClick={() => setStep('dashboard')}
                            title="Click to view your saved resumes"
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 transition-colors"
                        >
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Saved to Cloud
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Completeness badge */}
                    <div className="hidden sm:flex items-center gap-2 mr-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="progress-bar-fill h-full" style={{ width: `${completeness}%` }} />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500">{completeness}%</span>
                    </div>

                    {/* Save button */}
                    <button
                        onClick={() => performSave()}
                        disabled={isSaving}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                            saveStatus === 'saved'
                                ? 'bg-emerald-600 text-white'
                                : saveStatus === 'error'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-900 text-white hover:bg-violet-700'
                        }`}
                    >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle size={12} /> : <Save size={12} />}
                        {isSaving ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Error' : 'Save'}
                    </button>

                    {/* AI Review */}
                    <button
                        onClick={() => setShowAiPanel(true)}
                        className="v-btn-primary !py-1.5 !px-3 !text-xs !rounded-lg"
                    >
                        <Sparkles size={12} />
                        AI Review
                    </button>
                </div>
            </header>

            {/* ── Mobile Tab Switcher (< md screens) ── */}
            <div className="md:hidden flex border-b border-gray-200 bg-white shrink-0">
                <button
                    onClick={() => setMobileView('form')}
                    className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                        mobileView === 'form'
                            ? 'border-violet-600 text-violet-600 bg-violet-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Edit3 size={13} />
                    Edit Details
                </button>
                <button
                    onClick={() => setMobileView('preview')}
                    className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                        mobileView === 'preview'
                            ? 'border-violet-600 text-violet-600 bg-violet-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Eye size={13} />
                    Paper Preview
                </button>
            </div>

            {/* ── Main editor layout ── */}
            <main className="flex-1 flex overflow-hidden">

                {/* Left panel */}
                <div className={`w-full md:w-[360px] shrink-0 bg-white border-r border-gray-100 flex-col overflow-hidden ${mobileView === 'form' ? 'flex' : 'hidden md:flex'}`}>
                    {/* Completeness bar */}
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-semibold text-gray-500">Resume Completeness</span>
                            <span className={`text-[11px] font-bold ${completeness >= 80 ? 'text-emerald-600' : completeness >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{completeness}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="progress-bar-fill h-full" style={{ width: `${completeness}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {completeness < 50 ? 'Add more sections to improve your resume' : completeness < 80 ? 'Good progress! Add skills & projects' : 'Excellent! Your resume is comprehensive'}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto v-scroll">
                        {/* Personal Information */}
                        <AccordionItem title="Personal Information" icon={User} isOpen={openSections.personalInfo} onClick={() => toggleSection('personalInfo')}>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="v-label">First name</label>
                                        <input className="v-input" value={resumeData.personalInfo.firstName} onChange={(e) => updatePersonalInfo('firstName', e.target.value)} placeholder="Jane" />
                                    </div>
                                    <div>
                                        <label className="v-label">Last name</label>
                                        <input className="v-input" value={resumeData.personalInfo.lastName} onChange={(e) => updatePersonalInfo('lastName', e.target.value)} placeholder="Smith" />
                                    </div>
                                </div>
                                <div>
                                    <label className="v-label">Job title / Target role</label>
                                    <input className="v-input" value={resumeData.personalInfo.jobTitle} onChange={(e) => updatePersonalInfo('jobTitle', e.target.value)} placeholder="Software Engineer" />
                                </div>
                                <div>
                                    <label className="v-label">Email</label>
                                    <input className="v-input" value={resumeData.personalInfo.email} onChange={(e) => updatePersonalInfo('email', e.target.value)} placeholder="jane@example.com" />
                                </div>
                                <div>
                                    <label className="v-label">Phone</label>
                                    <input className="v-input" value={resumeData.personalInfo.phone} onChange={(e) => updatePersonalInfo('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
                                </div>
                                <div>
                                    <label className="v-label">Location</label>
                                    <input className="v-input" value={resumeData.personalInfo.address} onChange={(e) => updatePersonalInfo('address', e.target.value)} placeholder="San Francisco, CA" />
                                </div>

                                {/* Links */}
                                <div className="pt-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="v-label !mb-0">Links & Social</label>
                                        <button onClick={addLink} className="text-violet-600 hover:text-violet-700 text-xs font-semibold flex items-center gap-1">
                                            <Plus size={12} /> Add link
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {resumeData.personalInfo.links.map((link, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <input className="v-input !text-xs w-24 shrink-0" value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)} placeholder="LinkedIn" />
                                                <input className="v-input !text-xs flex-1" value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} placeholder="https://..." />
                                                <button onClick={() => removeLink(i)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0"><Trash2 size={13} /></button>
                                            </div>
                                        ))}
                                        {resumeData.personalInfo.links.length === 0 && (
                                            <p className="text-xs text-gray-400 italic">No links added — add LinkedIn, GitHub, portfolio etc.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </AccordionItem>

                        {/* Education */}
                        <AccordionItem title="Education" icon={GraduationCap} isOpen={openSections.education} onClick={() => toggleSection('education')} badge={resumeData.education.length}>
                            <div className="space-y-3">
                                {resumeData.education.map((e, i) => (
                                    <div key={i} className="v-entry-card">
                                        <button onClick={() => removeEducation(i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                                        <div className="space-y-2 pr-6">
                                            <div>
                                                <label className="v-label">Institution</label>
                                                <input className="v-input !text-sm" value={e.institution} onChange={(ev) => updateEducation(i, 'institution', ev.target.value)} placeholder="MIT, Stanford, IIT..." />
                                            </div>
                                            <div>
                                                <label className="v-label">Degree</label>
                                                <input className="v-input !text-sm" value={e.degree} onChange={(ev) => updateEducation(i, 'degree', ev.target.value)} placeholder="B.Tech Computer Science" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="v-label">Year / Duration</label>
                                                    <input className="v-input !text-sm" value={e.year} onChange={(ev) => updateEducation(i, 'year', ev.target.value)} placeholder="2020 – 2024" />
                                                </div>
                                                <div>
                                                    <label className="v-label">GPA (optional)</label>
                                                    <input className="v-input !text-sm" value={e.gpa} onChange={(ev) => updateEducation(i, 'gpa', ev.target.value)} placeholder="9.2/10" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addEducation} className="w-full py-2.5 border border-dashed border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30 transition-all flex items-center justify-center gap-1.5">
                                    <Plus size={14} /> Add Education
                                </button>
                            </div>
                        </AccordionItem>

                        {/* Experience */}
                        <AccordionItem title="Work Experience" icon={Briefcase} isOpen={openSections.experience} onClick={() => toggleSection('experience')} badge={resumeData.experience.length}>
                            <div className="space-y-3">
                                {resumeData.experience.map((ex, i) => (
                                    <div key={i} className="v-entry-card">
                                        <button onClick={() => removeExperience(i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                                        <div className="space-y-2 pr-6">
                                            <div>
                                                <label className="v-label">Company</label>
                                                <input className="v-input !text-sm" value={ex.company} onChange={(e) => updateExperience(i, 'company', e.target.value)} placeholder="Google, Infosys, Startup..." />
                                            </div>
                                            <div>
                                                <label className="v-label">Role / Title</label>
                                                <input className="v-input !text-sm" value={ex.role} onChange={(e) => updateExperience(i, 'role', e.target.value)} placeholder="Software Engineer Intern" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="v-label">Duration</label>
                                                    <input className="v-input !text-sm" value={ex.range} onChange={(e) => updateExperience(i, 'range', e.target.value)} placeholder="Jun 2023 – Aug 2023" />
                                                </div>
                                                <div>
                                                    <label className="v-label">Location</label>
                                                    <input className="v-input !text-sm" value={ex.location} onChange={(e) => updateExperience(i, 'location', e.target.value)} placeholder="Remote / Bangalore" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="v-label">Key achievements (one per line)</label>
                                                <textarea
                                                    className="v-input !text-xs min-h-[90px] resize-none leading-relaxed"
                                                    value={ex.points}
                                                    onChange={(e) => updateExperience(i, 'points', e.target.value)}
                                                    placeholder={"Built REST APIs serving 100k+ req/day\nReduced load time by 40% through caching\nCollaborated with cross-functional team of 8"}
                                                />
                                                <p className="text-[10px] text-gray-400 mt-1">💡 Tip: Start with action verbs (Built, Improved, Led, Reduced…)</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addExperience} className="w-full py-2.5 border border-dashed border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30 transition-all flex items-center justify-center gap-1.5">
                                    <Plus size={14} /> Add Experience
                                </button>
                            </div>
                        </AccordionItem>

                        {/* Skills */}
                        <AccordionItem title="Skills" icon={Code2} isOpen={openSections.skills} onClick={() => toggleSection('skills')} badge={resumeData.skills.languages.length + resumeData.skills.frameworks.length + resumeData.skills.tools.length + resumeData.skills.databases.length || undefined}>
                            <div>
                                <SkillChipRow
                                    label="Programming Languages"
                                    items={resumeData.skills.languages}
                                    onAdd={(v: string) => addSkill('languages', v)}
                                    onRemove={(i: number) => removeSkill('languages', i)}
                                    placeholder="Python, JavaScript, Java…"
                                    icon={Terminal}
                                    color="bg-blue-50 text-blue-600"
                                />
                                <SkillChipRow
                                    label="Libraries / Frameworks"
                                    items={resumeData.skills.frameworks}
                                    onAdd={(v: string) => addSkill('frameworks', v)}
                                    onRemove={(i: number) => removeSkill('frameworks', i)}
                                    placeholder="React, FastAPI, Spring Boot…"
                                    icon={Layers}
                                    color="bg-violet-50 text-violet-600"
                                />
                                <SkillChipRow
                                    label="Tools & Platforms"
                                    items={resumeData.skills.tools}
                                    onAdd={(v: string) => addSkill('tools', v)}
                                    onRemove={(i: number) => removeSkill('tools', i)}
                                    placeholder="Docker, Git, AWS, Figma…"
                                    icon={Cpu}
                                    color="bg-amber-50 text-amber-600"
                                />
                                <SkillChipRow
                                    label="Databases"
                                    items={resumeData.skills.databases}
                                    onAdd={(v: string) => addSkill('databases', v)}
                                    onRemove={(i: number) => removeSkill('databases', i)}
                                    placeholder="PostgreSQL, MongoDB, Redis…"
                                    icon={Database}
                                    color="bg-emerald-50 text-emerald-600"
                                />
                            </div>
                        </AccordionItem>

                        {/* Projects */}
                        <AccordionItem title="Projects" icon={FileText} isOpen={openSections.projects} onClick={() => toggleSection('projects')} badge={resumeData.projects.length}>
                            <div className="space-y-3">
                                {resumeData.projects.map((p, i) => (
                                    <div key={i} className="v-entry-card">
                                        <button onClick={() => removeProject(i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                                        <div className="space-y-2 pr-6">
                                            <div>
                                                <label className="v-label">Project Name</label>
                                                <input className="v-input !text-sm" value={p.name} onChange={(e) => updateProject(i, 'name', e.target.value)} placeholder="StudyBot — AI Learning Assistant" />
                                            </div>
                                            <div>
                                                <label className="v-label">Tech Stack</label>
                                                <input className="v-input !text-sm" value={p.tech} onChange={(e) => updateProject(i, 'tech', e.target.value)} placeholder="React, Node.js, PostgreSQL" />
                                            </div>
                                            <div>
                                                <label className="v-label">Description</label>
                                                <textarea className="v-input !text-xs min-h-[72px] resize-none" value={p.desc} onChange={(e) => updateProject(i, 'desc', e.target.value)} placeholder="Brief impact-focused description of what it does and the results it achieved..." />
                                            </div>
                                            <div>
                                                <label className="v-label">GitHub / Live Link (optional)</label>
                                                <input className="v-input !text-sm" value={p.link || ""} onChange={(e) => updateProject(i, 'link', e.target.value)} placeholder="https://github.com/..." />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addProject} className="w-full py-2.5 border border-dashed border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30 transition-all flex items-center justify-center gap-1.5">
                                    <Plus size={14} /> Add Project
                                </button>
                            </div>
                        </AccordionItem>

                        {/* Certifications */}
                        <AccordionItem title="Certifications" icon={CertificationIcon} isOpen={openSections.certifications} onClick={() => toggleSection('certifications')} badge={resumeData.certifications.length}>
                            <div>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        id="input-cert"
                                        className="v-input !text-sm"
                                        placeholder="AWS Certified Solutions Architect..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                addCertification((e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const el = document.getElementById('input-cert') as HTMLInputElement;
                                            addCertification(el.value);
                                            el.value = '';
                                        }}
                                        className="shrink-0 h-9 w-9 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all"
                                    >
                                        <Plus size={15} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mb-3">Press Enter or click + to add</p>
                                <div className="space-y-1.5">
                                    {resumeData.certifications.map((c, i) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700">
                                            <span>{c}</span>
                                            <button onClick={() => removeCertification(i)} className="text-gray-300 hover:text-red-400 transition-colors ml-2"><Trash2 size={13} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AccordionItem>

                        {/* Honors & Awards */}
                        <AccordionItem title="Honors & Awards" icon={Award} isOpen={openSections.additional} onClick={() => toggleSection('additional')} badge={resumeData.additional.honorsAndAwards.length}>
                            <div>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        id="input-honor"
                                        className="v-input !text-sm"
                                        placeholder="Dean's List 2023..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                addHonor((e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const el = document.getElementById('input-honor') as HTMLInputElement;
                                            addHonor(el.value);
                                            el.value = '';
                                        }}
                                        className="shrink-0 h-9 w-9 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all"
                                    >
                                        <Plus size={15} />
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {resumeData.additional.honorsAndAwards.map((h, i) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700">
                                            <span>{h}</span>
                                            <button onClick={() => removeHonor(i)} className="text-gray-300 hover:text-red-400 transition-colors ml-2"><Trash2 size={13} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AccordionItem>
                    </div>
                </div>

                {/* Right preview panel */}
                <div className={`flex-1 overflow-y-auto v-scroll flex-col items-center p-2 sm:p-4 overflow-x-auto ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'}`} style={{ background: '#f1f3f5' }}>
                    <div className="resume-paper transform origin-top scale-[0.65] xs:scale-[0.75] sm:scale-90 md:scale-100 my-2 md:my-8 shrink-0">
                        {selectedTemplate === 'classic' ? renderClassicPreview() : renderModernPreview()}
                    </div>
                </div>
            </main>

            {/* ── AI Review Panel ── */}
            <AnimatePresence>
                {showAiPanel && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-end">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowAiPanel(false)}
                            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                            className="relative w-full max-w-[400px] h-full bg-white shadow-2xl flex flex-col border-l border-gray-100"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center">
                                        <Sparkles size={15} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">AI Resume Review</p>
                                        <p className="text-xs text-gray-400">Instant feedback powered by AI</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAiPanel(false)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto v-scroll p-6">
                                {/* Live completeness within AI panel */}
                                <div className="mb-6 p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-semibold text-violet-800">Resume Score</p>
                                        <span className={`text-xl font-bold ${completeness >= 80 ? 'text-emerald-600' : completeness >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{completeness}/100</span>
                                    </div>
                                    <div className="h-2 bg-violet-100 rounded-full overflow-hidden mb-2">
                                        <div className="progress-bar-fill h-full" style={{ width: `${completeness}%` }} />
                                    </div>
                                    <p className="text-xs text-violet-600">
                                        {completeness < 50 ? '🔴 Needs more content to be competitive' : completeness < 80 ? '🟡 Good start — add more details' : '🟢 Strong resume! AI review recommended'}
                                    </p>
                                </div>

                                {reviewResult ? (
                                    <div>
                                        <div className="flex items-center gap-2 mb-5">
                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                            <p className="text-sm font-semibold text-gray-800">AI Suggestions ({reviewResult.length})</p>
                                        </div>
                                        <div className="space-y-3">
                                            {Array.isArray(reviewResult) ? reviewResult.map((res, i) => (
                                                <div key={i} className="flex gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-600 leading-relaxed">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                                                    {res}
                                                </div>
                                            )) : <p className="text-sm text-gray-600">{String(reviewResult)}</p>}
                                        </div>
                                        <button onClick={() => setReviewResult(null)} className="mt-6 w-full py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                                            <RefreshCw size={14} /> Run again
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 mb-2">Instant resume analysis</h3>
                                        <div className="space-y-3 mb-8">
                                            {['ATS keyword optimization tips', 'Content and formatting improvements', 'Role-specific recommendations', 'Missing sections detection'].map(item => (
                                                <div key={item} className="flex items-center gap-2.5 text-sm text-gray-500">
                                                    <CheckCircle2 size={14} className="text-violet-500 shrink-0" />
                                                    {item}
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            disabled={isReviewing}
                                            onClick={async () => {
                                                setIsReviewing(true);
                                                setReviewResult(null);
                                                try {
                                                    const response = await fetch(`${API_BASE_URL}/api/resume/review`, {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ resumeData })
                                                    });
                                                    if (!response.ok) throw new Error("Backend failed");
                                                    const data = await response.json();
                                                    if (data && data.suggestions && Array.isArray(data.suggestions)) {
                                                        setReviewResult(data.suggestions);
                                                    } else if (Array.isArray(data)) {
                                                        setReviewResult(data);
                                                    } else {
                                                        // Fallback with realistic suggestions based on resume content
                                                        const suggestions = [];
                                                        if (!resumeData.personalInfo.jobTitle) suggestions.push("Add a target job title to your profile — recruiters scan for role alignment in the first 6 seconds.");
                                                        if (resumeData.experience.length === 0) suggestions.push("Add at least one work experience entry. Even internships or part-time roles significantly improve your ATS score.");
                                                        if (resumeData.skills.languages.length === 0) suggestions.push("Add your programming languages and technical skills — these are the #1 ATS filter for tech roles.");
                                                        if (resumeData.projects.length === 0) suggestions.push("Add 2-3 projects with tech stack and measurable outcomes to show practical experience.");
                                                        if (!resumeData.personalInfo.links.some(l => l.label.toLowerCase().includes('linkedin'))) suggestions.push("Include your LinkedIn profile URL — 87% of recruiters use LinkedIn for candidate research.");
                                                        if (resumeData.experience.some(e => e.points.split('\n').filter(p => p.trim()).length < 2)) suggestions.push("Expand your experience bullet points — aim for 3-5 achievement-focused bullets per role.");
                                                        if (suggestions.length === 0) suggestions.push("Your resume structure looks great! Consider quantifying your achievements with numbers and percentages.", "Tailor keywords to match the specific job description you're applying to.", "Ensure your resume is saved as a PDF before submitting to maintain formatting.");
                                                        setReviewResult(suggestions);
                                                    }
                                                } catch (err) {
                                                    // Smart offline suggestions
                                                    const suggestions = ["Ensure your contact information is complete and professional.", "Use strong action verbs (Built, Designed, Optimized, Led) to start each bullet point.", "Quantify your achievements with metrics (e.g., 'Reduced load time by 40%')."];
                                                    setReviewResult(suggestions);
                                                } finally {
                                                    setIsReviewing(false);
                                                }
                                            }}
                                            className="w-full v-btn-primary !py-3 !rounded-xl !text-sm justify-center"
                                        >
                                            {isReviewing ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</> : <><Sparkles size={14} /> Start AI Review</>}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Share Modal ── */}
            <AnimatePresence>
                {isShareModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsShareModalOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.97, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.97, opacity: 0, y: 12 }}
                            transition={{ duration: 0.18 }}
                            className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className="px-7 pt-7 pb-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900">Share Resume</h2>
                                    <button onClick={() => setIsShareModalOpen(false)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="v-label">Your resume link</label>
                                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg overflow-hidden">
                                            <input
                                                readOnly
                                                value={shareUrl}
                                                className="flex-1 px-3 py-2.5 text-sm text-gray-600 bg-transparent outline-none font-mono truncate"
                                            />
                                            <button
                                                onClick={handleCopyLink}
                                                className={`shrink-0 px-3 py-2.5 border-l border-gray-200 transition-all flex items-center gap-1.5 text-xs font-semibold ${linkCopied ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'}`}
                                            >
                                                {linkCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                                                <Globe size={16} className="text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">Public access</p>
                                                <p className="text-xs text-gray-400">Anyone with the link can view</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setPublicAccess(!publicAccess)}
                                            className={`w-11 rounded-full p-0.5 transition-all duration-200 ${publicAccess ? 'bg-violet-600' : 'bg-gray-200'}`}
                                            style={{ height: '24px' }}
                                        >
                                            <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200`} style={{ transform: publicAccess ? 'translateX(19px)' : 'translateX(0)' }} />
                                        </button>
                                    </div>

                                    {/* Download in modal too */}
                                    <button
                                        onClick={() => { setIsShareModalOpen(false); handleDownload(); }}
                                        className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                                    >
                                        <Download size={15} />
                                        Download as PDF instead
                                    </button>

                                    <div className="flex gap-3">
                                        <button onClick={() => setIsShareModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all">
                                            Cancel
                                        </button>
                                        <button onClick={handleCopyLink} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${linkCopied ? 'bg-emerald-600 text-white' : 'v-btn-primary'}`}>
                                            {linkCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}