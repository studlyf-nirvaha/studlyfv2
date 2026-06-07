import React, { useState, useEffect } from "react";
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
    Search,
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
    Upload
} from "lucide-react";
import Navigation from "../components/Navigation";

// --- Types ---
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
}

const DEFAULT_RESUME_DATA: ResumeData = {
    name: "UNTITLED RESUME",
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

// --- Styles ---
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
    height: 64px;
    border-bottom: 1px solid var(--v-border);
    background: white;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
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
`;

// ─── AccordionItem ────────────────────────────────────────────────────────────
const AccordionItem = ({ title, icon: Icon, children, isOpen, onClick }: any) => (
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

// ─── PDF HTML Generator (unchanged logic) ────────────────────────────────────
export function generatePdfHtml(data: ResumeData, template: string = 'classic') {
    if (!data) return "";
    const p = data.personalInfo || { firstName: "", lastName: "", email: "", phone: "", address: "", links: [] };
    const edu = data.education || [];
    const exp = data.experience || [];
    const skills = data.skills || { languages: [], frameworks: [], tools: [], databases: [] };
    const projs = data.projects || [];
    const certs = data.certifications || [];
    const add = data.additional || { honorsAndAwards: [] };
    const name = ((p.firstName || "") + " " + (p.lastName || "")).trim() || data.name || "YOUR NAME";

    if (template === 'modern') {
        const pHtml = `
            <div style="text-align:center;margin-bottom:30px">
                <h1 style="font-family:'Poppins',sans-serif;font-size:32pt;font-weight:300;letter-spacing:2px;margin-bottom:10px;text-transform:uppercase;color:#1e293b">
                    ${p.firstName || "FIRST"} <span style="font-weight:600">${p.lastName || "LAST"}</span>
                </h1>
                <div style="font-family:'Poppins',sans-serif;font-size:10pt;color:#64748b;letter-spacing:1px;margin-bottom:15px">
                    ${p.email || ""} ${p.phone ? ` • ${p.phone}` : ""} ${p.address ? ` • ${p.address}` : ""}
                </div>
                <div style="border-bottom:1px solid #e2e8f0;width:100%"></div>
            </div>`;
        const sectionHeader = (title: string) => `
            <div style="display:flex;align-items:center;margin:20px 0 12px 0">
                <h2 style="font-family:'Poppins',sans-serif;font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#0f172a;margin-right:15px;white-space:nowrap">${title}</h2>
                <div style="height:1px;background:#f1f5f9;width:100%"></div>
            </div>`;
        const eduHtml = edu.map((e: any) => `
            <div style="margin-bottom:12px;font-family:'Poppins',sans-serif">
                <div style="display:flex;justify-content:space-between;align-items:baseline">
                    <span style="font-weight:700;font-size:11pt;color:#1e293b">${e.institution || ""}</span>
                    <span style="font-size:9pt;color:#64748b;font-weight:500">${e.year || ""}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:2px">
                    <span style="font-size:10pt;color:#475569">${e.degree || ""}</span>
                    <span style="font-size:9pt;font-weight:600;color:#059669">${e.gpa ? `GPA: ${e.gpa}` : ""}</span>
                </div>
            </div>`).join("");
        const expHtml = exp.map((ex: any) => `
            <div style="margin-bottom:18px;font-family:'Poppins',sans-serif">
                <div style="display:flex;justify-content:space-between;align-items:baseline">
                    <span style="font-weight:700;font-size:11pt;color:#1e293b">${ex.company || ""}</span>
                    <span style="font-size:9pt;color:#64748b;font-weight:500">${ex.range || ""}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:2px;margin-bottom:6px">
                    <span style="font-size:10pt;font-weight:600;color:#475569">${ex.role || ""}</span>
                    <span style="font-size:9pt;color:#64748b">${ex.location || ""}</span>
                </div>
                <ul style="padding-left:14px;margin:0">
                    ${ex.points.split('\n').filter((pt: string) => pt.trim()).map((pt: string) => `<li style="font-size:9.5pt;color:#334155;margin-bottom:4px;line-height:1.4">${pt}</li>`).join("")}
                </ul>
            </div>`).join("");
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.5; color: #1e293b; margin: 0; padding: 45px; }
            * { box-sizing: border-box; }
            @page { size: A4; margin: 0; }
        </style></head><body>
            ${pHtml}
            ${edu.length ? sectionHeader("Education") + eduHtml : ""}
            ${exp.length ? sectionHeader("Experience") + expHtml : ""}
        </body></html>`;
    }

    const linksHtml = p.links?.length > 0
        ? `<div style="font-size:9pt;text-align:center;margin-top:-8pt;margin-bottom:12pt;color:#475569;">
            ${p.links.map((l, i) => `${i > 0 ? " | " : ""}<span style="font-weight:700;">${l.label}:</span> ${l.url}`).join("")}
          </div>` : "";
    const eduHtml = edu.length > 0
        ? `<div><h2 style="font-size:10pt;font-weight:bold;border-bottom:1px solid black;margin:12pt 0 6pt 0;text-transform:uppercase;">Education</h2>
            ${edu.map(e => `
                <div style="margin-bottom:8pt">
                    <div style="display:flex;justify-content:space-between;font-weight:700;font-size:10pt;"><span>${e.institution || "University"}</span><span>${e.year || ""}</span></div>
                    <div style="display:flex;justify-content:space-between;font-style:italic;font-size:9pt;margin-top:2pt"><span>${e.degree || ""}</span><span>${e.gpa ? `GPA: ${e.gpa}` : ""}</span></div>
                </div>`).join("")}</div>` : "";
    const expHtml = exp.length > 0
        ? `<div><h2 style="font-size:10pt;font-weight:bold;border-bottom:1px solid black;margin:12pt 0 6pt 0;text-transform:uppercase;">Experience</h2>
            ${exp.map(ex => `
                <div style="margin-bottom:10pt">
                    <div style="display:flex;justify-content:space-between;font-weight:700;font-size:10pt;"><span>${ex.company || "Company"}</span><span>${ex.range || ""}</span></div>
                    <div style="display:flex;justify-content:space-between;font-style:italic;font-size:9pt;margin-top:2pt;margin-bottom:2pt"><span>${ex.role || ""}</span><span>${ex.location || ""}</span></div>
                    <ul style="padding-left:14pt;margin:0;">${ex.points.split('\n').filter(pt => pt.trim()).map(pt => `<li style="font-size:9pt;margin-bottom:2pt">${pt}</li>`).join("")}</ul>
                </div>`).join("")}</div>` : "";
    const skillsHtml = (skills.languages?.length > 0 || skills.frameworks?.length > 0 || skills.tools?.length > 0 || skills.databases?.length > 0)
        ? `<div><h2 style="font-size:10pt;font-weight:bold;border-bottom:1px solid black;margin:12pt 0 6pt 0;text-transform:uppercase;">Skills</h2>
            ${skills.languages?.length > 0 ? `<div style="font-size:9pt;margin-bottom:4pt"><span style="font-weight:bold">Programming Languages: </span>${skills.languages.join(", ")}</div>` : ""}
            ${skills.frameworks?.length > 0 ? `<div style="font-size:9pt;margin-bottom:4pt"><span style="font-weight:bold">Libraries/Frameworks: </span>${skills.frameworks.join(", ")}</div>` : ""}
            ${skills.tools?.length > 0 ? `<div style="font-size:9pt;margin-bottom:4pt"><span style="font-weight:bold">Tools/Platforms: </span>${skills.tools.join(", ")}</div>` : ""}
            ${skills.databases?.length > 0 ? `<div style="font-size:9pt;margin-bottom:4pt"><span style="font-weight:bold">Databases: </span>${skills.databases.join(", ")}</div>` : ""}
          </div>` : "";
    const projHtml = projs.length > 0
        ? `<div><h2 style="font-size:10pt;font-weight:bold;border-bottom:1px solid black;margin:12pt 0 6pt 0;text-transform:uppercase;">Projects / Open Source</h2>
            ${projs.map(pr => `
                <div style="margin-bottom:8pt">
                    <div style="display:flex;justify-content:space-between;font-weight:700;font-size:10pt;">
                        <span>${pr.name.toUpperCase()} ${pr.link ? `<span style="font-weight:400;font-size:9pt">| ${pr.link}</span>` : ""}</span>
                        <span style="font-weight:400;font-size:9pt;font-style:italic">${pr.tech}</span>
                    </div>
                    <div style="font-size:9pt;color:#334155;margin-top:2pt;line-height:1.3">${pr.desc}</div>
                </div>`).join("")}</div>` : "";
    const certHtml = certs.length > 0
        ? `<div><h2 style="font-size:10pt;font-weight:bold;border-bottom:1px solid black;margin:12pt 0 6pt 0;text-transform:uppercase;">Certifications</h2>
            <ul style="padding-left:14pt;margin:0;">${certs.map(c => `<li style="font-size:9pt;margin-bottom:2pt">${c}</li>`).join("")}</ul></div>` : "";
    const honorsHtml = add.honorsAndAwards?.length > 0
        ? `<div><h2 style="font-size:10pt;font-weight:bold;border-bottom:1px solid black;margin:12pt 0 6pt 0;text-transform:uppercase;">Honors & Awards</h2>
            <ul style="padding-left:14pt;margin:0;">${add.honorsAndAwards.map(h => `<li style="font-size:9pt;margin-bottom:2pt">${h}</li>`).join("")}</ul></div>` : "";

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
        body { font-family: 'Poppins', sans-serif; line-height: 1.5; color: black; margin: 0; padding: 40px; }
        * { box-sizing: border-box; }
        @page { size: A4; margin: 0; }
        h1, h2, div, p, span, ul, li { margin: 0; padding: 0; }
    </style></head><body>
        <h1 style="font-size:24pt;font-weight:400;text-align:center;margin-bottom:4pt;text-transform:uppercase;">${name}</h1>
        <div style="font-size:9pt;text-align:center;margin-bottom:12pt;">
            ${p.email ? `<span>${p.email}</span>` : ""}
            ${p.phone ? `<span> | ${p.phone}</span>` : ""}
            ${p.address ? `<span> | ${p.address}</span>` : ""}
        </div>
        ${linksHtml}${eduHtml}${expHtml}${skillsHtml}${projHtml}${certHtml}${honorsHtml}
    </body></html>`;
}

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
    const [saveStatus, setSaveStatus] = useState("idle");
    const [isEditingName, setIsEditingName] = useState(false);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [publicAccess, setPublicAccess] = useState(true);

    useEffect(() => {
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
                    }
                }
            } catch (err) { console.error("Migration error:", err); }
        }
        fetchConfig();
    }, [user?.uid]);

    const handleSave = async (silent = false) => {
        if (!user?.uid) return;
        if (!silent) setIsSaving(true);
        try {
            await fetch(`${API_BASE_URL}/api/resume/${user.uid}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ config: resumeData })
            });
            if (!silent) { setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); }
        } finally { setIsSaving(false); }
    };

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

    // ─── DASHBOARD ────────────────────────────────────────────────────────────
    if (step === 'dashboard') {
        const displayName = resumeData.personalInfo.firstName || user?.displayName?.split(' ')[0] || "User";
        return (
            <div className="min-h-screen flex flex-col" style={{ background: '#f9fafb' }}>
                <style>{styles}</style>
                <Navigation />
                <div className="flex-1 v-scroll overflow-y-auto pt-28 pb-20 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="mb-10">
                            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">My Workspace</p>
                            <h1 className="text-2xl font-bold text-gray-900">{displayName}'s Resumes</h1>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5">
                            {/* Existing resume */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -3 }}
                                onClick={() => setStep('editor')}
                                className="cursor-pointer group"
                            >
                                <div className="aspect-[3/4] bg-white border border-gray-200 rounded-xl overflow-hidden relative shadow-sm hover:shadow-md hover:border-violet-300 transition-all duration-200">
                                    <div className="absolute inset-0 p-5 space-y-2.5 opacity-40 group-hover:opacity-70 transition-opacity">
                                        <div className="h-2 w-1/3 bg-gray-200 rounded mx-auto"></div>
                                        <div className="h-1 w-1/2 bg-gray-100 rounded mx-auto"></div>
                                        <div className="mt-3 space-y-1.5">
                                            {[1,0.9,0.75,0.85,0.6].map((w,i) => <div key={i} className="h-1 bg-gray-100 rounded" style={{width:`${w*100}%`}} />)}
                                        </div>
                                        <div className="mt-3 pt-2 border-t border-gray-100 space-y-1.5">
                                            {[1,0.8,0.9].map((w,i) => <div key={i} className="h-1 bg-gray-100 rounded" style={{width:`${w*100}%`}} />)}
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-violet-50/60 backdrop-blur-[2px]">
                                        <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-violet-100 flex items-center gap-2 text-sm font-semibold text-violet-700">
                                            <Edit3 size={14} /> Edit
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2.5 text-xs font-semibold text-gray-600 truncate">{displayName}'s Resume</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">Updated recently</p>
                            </motion.div>

                            {/* Create new */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
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
                    </div>
                </div>
            </div>
        );
    }

    // ─── LANDING (create_new) ─────────────────────────────────────────────────
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
                    <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
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
                                className="text-5xl md:text-6xl font-bold text-gray-950 leading-[1.1] tracking-tight mb-6"
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
                                className="flex items-center gap-6 mt-10"
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
                <section className="border-y border-gray-100 py-8 bg-white">
                    <div className="max-w-5xl mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
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
                                    <p className="text-3xl font-bold text-gray-900 tracking-tight">{val}</p>
                                    <p className="text-sm text-gray-400 mt-1">{label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section className="py-24 bg-white">
                    <div className="max-w-5xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <motion.p
                                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                                className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3"
                            >Features</motion.p>
                            <motion.h2
                                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                className="text-4xl font-bold text-gray-950 tracking-tight"
                            >Everything you need to land the job</motion.h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                <section className="py-24 bg-gray-50 border-y border-gray-100">
                    <div className="max-w-3xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <motion.p
                                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                                className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3"
                            >How it works</motion.p>
                            <motion.h2
                                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                className="text-4xl font-bold text-gray-950 tracking-tight"
                            >Three steps to your dream role</motion.h2>
                        </div>

                        <div className="relative">
                            {/* vertical line */}
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
                <section className="py-24 bg-white">
                    <div className="max-w-5xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <motion.p
                                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                                className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3"
                            >Templates</motion.p>
                            <motion.h2
                                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                className="text-4xl font-bold text-gray-950 tracking-tight"
                            >Two templates, endless possibilities</motion.h2>
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
                                    <div className="aspect-[4/3] bg-gray-50 p-8 flex items-center justify-center border-b border-gray-100">
                                        <div className="w-full max-w-[200px] bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-2 group-hover:shadow-md transition-shadow">
                                            <div className="h-2.5 w-1/3 bg-gray-800 rounded mx-auto"></div>
                                            <div className="h-1.5 w-1/2 bg-gray-200 rounded mx-auto"></div>
                                            <div className="h-px bg-gray-100 mt-2 mb-2"></div>
                                            {[1,0.85,0.7,0.9,0.6].map((w,j) => <div key={j} className="h-1 bg-gray-100 rounded" style={{width:`${w*100}%`}} />)}
                                            <div className="h-px bg-gray-100 mt-1 mb-2"></div>
                                            {[1,0.8,0.65].map((w,j) => <div key={j} className="h-1 bg-gray-100 rounded" style={{width:`${w*100}%`}} />)}
                                        </div>
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
                <section className="py-24 bg-gray-950 relative overflow-hidden">
                    <div className="absolute inset-0 grid-bg opacity-20" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 bg-violet-800/20 rounded-full blur-3xl" />
                    <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
                        <motion.h2
                            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-5"
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

    // ─── TEMPLATE SELECTION ───────────────────────────────────────────────────
    if (step === 'template_selection') {
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <style>{styles}</style>
                <Navigation />
                <div className="flex-1 flex flex-col items-center pt-36 pb-20 px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-14"
                    >
                        <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Step 1 of 1</p>
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-950 tracking-tight mb-3">Choose your template</h1>
                        <p className="text-gray-500 text-lg max-w-md mx-auto">Both templates are ATS-optimized. You can switch anytime from the editor.</p>
                    </motion.div>

                    <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">
                        {[
                            { id: 'classic', name: 'Classic', sub: 'Clean & Professional', tag: 'Most popular' },
                            { id: 'modern', name: 'Modern', sub: 'Structured & Visual', tag: 'Trending' }
                        ].map(({ id, name, sub, tag }, i) => (
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
                                {/* Preview */}
                                <div className="aspect-[4/3] bg-gray-50 p-8 flex items-center justify-center border-b border-gray-100">
                                    <div className="w-full max-w-[180px] bg-white rounded-lg shadow border border-gray-100 p-4 space-y-2 group-hover:shadow-md transition-shadow">
                                        <div className="h-2.5 w-1/3 bg-gray-700 rounded mx-auto"></div>
                                        <div className="h-1.5 w-1/2 bg-gray-200 rounded mx-auto"></div>
                                        <div className="h-px bg-gray-100 my-2"></div>
                                        {[1,0.85,0.7,0.9].map((w,j) => <div key={j} className="h-1 bg-gray-100 rounded" style={{width:`${w*100}%`}} />)}
                                        <div className="h-px bg-gray-100 my-2"></div>
                                        {[1,0.8].map((w,j) => <div key={j} className="h-1 bg-gray-100 rounded" style={{width:`${w*100}%`}} />)}
                                    </div>
                                </div>
                                {/* Label */}
                                <div className="p-5 bg-white">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h3 className="font-semibold text-gray-900">{name}</h3>
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
                                    </div>
                                    <p className="text-sm text-gray-500">{sub}</p>
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
                <h1>{(p.firstName + " " + p.lastName).toUpperCase() || "YOUR NAME"}</h1>
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
        const { personalInfo: p, education: edu, experience: exp, skills } = resumeData;
        return (
            <div className="modern-resume w-full">
                <style>{`
                    .modern-resume { font-family: 'Poppins', sans-serif; color: #1e293b; }
                    .modern-header { text-align: center; margin-bottom: 30px; }
                    .modern-name { font-family: 'Poppins', sans-serif; font-size: 32pt; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; color: #1e293b; }
                    .modern-name span { font-weight: 600; }
                    .modern-contact { font-size: 10pt; color: #64748b; letter-spacing: 1px; margin-bottom: 20px; }
                    .modern-divider { border-bottom: 1px solid #e2e8f0; width: 100%; margin-bottom: 30px; }
                    .modern-section { margin-bottom: 25px; }
                    .modern-section-title { display: flex; align-items: center; margin-bottom: 12px; }
                    .modern-section-title h2 { font-family: 'Poppins', sans-serif; font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; margin-right: 15px; white-space: nowrap; }
                    .modern-section-line { height: 1px; background: #f1f5f9; flex-grow: 1; }
                    .modern-entry { margin-bottom: 12px; }
                    .modern-entry-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 11pt; color: #1e293b; }
                    .modern-entry-sub { display: flex; justify-content: space-between; font-size: 10pt; color: #475569; margin-top: 2px; font-weight: 500; }
                    .modern-bullets { padding-left: 14px; margin-top: 6px; }
                    .modern-bullets li { font-size: 9.5pt; color: #334155; margin-bottom: 4px; line-height: 1.5; }
                    .modern-skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                    .modern-skill-item { font-size: 9.5pt; color: #334155; }
                    .modern-skill-label { font-weight: 700; color: #1e293b; }
                `}</style>
                <div className="modern-header">
                    <h1 className="modern-name">{p?.firstName || "FIRST"} <span>{p?.lastName || "LAST"}</span></h1>
                    <div className="modern-contact">{p?.email || "email@example.com"}{p?.phone && <span> • {p.phone}</span>}{p?.address && <span> • {p.address}</span>}</div>
                    <div className="modern-divider" />
                </div>
                {edu.length > 0 && (
                    <div className="modern-section">
                        <div className="modern-section-title"><h2>Education</h2><div className="modern-section-line" /></div>
                        {edu.map((e, i) => (
                            <div key={i} className="modern-entry">
                                <div className="modern-entry-header"><span>{e.institution}</span><span className="text-slate-400 font-medium">{e.year}</span></div>
                                <div className="modern-entry-sub"><span>{e.degree}</span><span className="text-purple-600 font-bold">{e.gpa ? `GPA: ${e.gpa}` : ""}</span></div>
                            </div>
                        ))}
                    </div>
                )}
                {exp.length > 0 && (
                    <div className="modern-section">
                        <div className="modern-section-title"><h2>Experience</h2><div className="modern-section-line" /></div>
                        {exp.map((ex, i) => (
                            <div key={i} className="modern-entry">
                                <div className="modern-entry-header"><span>{ex.company}</span><span className="text-slate-400 font-medium">{ex.range}</span></div>
                                <div className="modern-entry-sub"><span>{ex.role}</span><span className="text-slate-400">{ex.location}</span></div>
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
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#f9fafb' }}>
            <style>{styles}</style>

            {/* ── Editor top bar (kept exactly as original nav logic) ── */}
            <nav className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setStep(hasExistingData ? 'dashboard' : 'create_new')}>
                        <img src="/images/studlyf_secondary.png" alt="STUDLYF Logo" className="h-7 sm:h-8 w-auto object-contain" />
                    </div>
                    <div className="h-4 border-l border-slate-200 mx-2"></div>
                    <button onClick={() => setStep(hasExistingData ? 'dashboard' : 'create_new')} className="text-slate-500 font-bold text-sm hover:text-slate-900 transition-colors">
                        Home
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsShareModalOpen(true)} className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-sm">
                        <Share2 size={16} />
                        Share
                    </button>
                    <div className="h-9 w-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-200">
                        <User size={18} />
                    </div>
                </div>
            </nav>

            {/* ── Editor sub-header ── */}
            <header className="editor-header bg-white">
                <div className="flex items-center gap-3">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mr-2">
                        <button onClick={() => setStep(hasExistingData ? 'dashboard' : 'create_new')} className="hover:text-violet-600 transition-colors font-medium">Home</button>
                        <ChevronRight size={11} />
                        <span className="text-gray-500 font-medium">Editor</span>
                    </div>
                    <div className="h-4 w-px bg-gray-200" />
                    {isEditingName ? (
                        <input
                            autoFocus
                            value={resumeData.name}
                            onBlur={() => setIsEditingName(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                            onChange={(e) => setResumeData({ ...resumeData, name: e.target.value })}
                            className="text-sm font-semibold text-gray-900 outline-none bg-transparent border-b border-violet-400 w-48"
                        />
                    ) : (
                        <button onClick={() => setIsEditingName(true)} className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 hover:text-violet-600 transition-colors">
                            {resumeData.name}
                            <Edit3 size={13} className="text-gray-400" />
                        </button>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Saved
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAiPanel(true)}
                        className="v-btn-primary !py-2 !px-4 !text-sm"
                    >
                        <Sparkles size={14} />
                        AI Review
                    </button>
                </div>
            </header>

            {/* ── Main editor layout ── */}
            <main className="flex-1 flex overflow-hidden">

                {/* Left panel */}
                <div className="w-[380px] shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden shadow-[1px_0_0_0_#f0f0f0]">
                    <div className="flex-1 overflow-y-auto v-scroll">
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
                                    <label className="v-label">Job title</label>
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
                                                <input placeholder="Label" className="v-input !w-28 !shrink-0 !text-xs" value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)} />
                                                <input placeholder="https://..." className="v-input flex-1 !text-xs" value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} />
                                                <button onClick={() => removeLink(i)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </AccordionItem>

                        <AccordionItem title="Education" icon={GraduationCap} isOpen={openSections.education} onClick={() => toggleSection('education')}>
                            <div className="space-y-3">
                                {resumeData.education.map((edu, i) => (
                                    <div key={i} className="v-entry-card group">
                                        <button onClick={() => removeEducation(i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 size={13} />
                                        </button>
                                        <div className="space-y-2.5">
                                            <div>
                                                <label className="v-label">Institution</label>
                                                <input className="v-input" value={edu.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)} placeholder="University of California" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="v-label">Degree</label>
                                                    <input className="v-input" value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)} placeholder="B.S. Computer Science" />
                                                </div>
                                                <div>
                                                    <label className="v-label">Year</label>
                                                    <input className="v-input" value={edu.year} onChange={(e) => updateEducation(i, 'year', e.target.value)} placeholder="2020 – 2024" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="v-label">GPA (optional)</label>
                                                <input className="v-input" value={edu.gpa} onChange={(e) => updateEducation(i, 'gpa', e.target.value)} placeholder="3.8" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addEducation} className="w-full py-2.5 border border-dashed border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30 transition-all flex items-center justify-center gap-1.5">
                                    <Plus size={14} /> Add Education
                                </button>
                            </div>
                        </AccordionItem>

                        <AccordionItem title="Experience" icon={Briefcase} isOpen={openSections.experience} onClick={() => toggleSection('experience')}>
                            <div className="space-y-3">
                                {resumeData.experience.map((exp, i) => (
                                    <div key={i} className="v-entry-card group">
                                        <button onClick={() => removeExperience(i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 size={13} />
                                        </button>
                                        <div className="space-y-2.5">
                                            <div>
                                                <label className="v-label">Company</label>
                                                <input className="v-input" value={exp.company} onChange={(e) => updateExperience(i, 'company', e.target.value)} placeholder="Acme Corp" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="v-label">Role</label>
                                                    <input className="v-input" value={exp.role} onChange={(e) => updateExperience(i, 'role', e.target.value)} placeholder="Software Engineer" />
                                                </div>
                                                <div>
                                                    <label className="v-label">Date range</label>
                                                    <input className="v-input" value={exp.range} onChange={(e) => updateExperience(i, 'range', e.target.value)} placeholder="Jan 2022 – Present" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="v-label">Location</label>
                                                <input className="v-input" value={exp.location} onChange={(e) => updateExperience(i, 'location', e.target.value)} placeholder="Remote" />
                                            </div>
                                            <div>
                                                <label className="v-label">Achievements (one per line)</label>
                                                <textarea
                                                    className="v-input min-h-[90px] resize-none"
                                                    value={exp.points}
                                                    onChange={(e) => updateExperience(i, 'points', e.target.value)}
                                                    placeholder="• Built a feature that reduced latency by 40%&#10;• Mentored 2 junior engineers"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addExperience} className="w-full py-2.5 border border-dashed border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30 transition-all flex items-center justify-center gap-1.5">
                                    <Plus size={14} /> Add Experience
                                </button>
                            </div>
                        </AccordionItem>

                        <AccordionItem title="Skillsets" icon={Code2} isOpen={openSections.skills} onClick={() => toggleSection('skills')}>
                            <div className="space-y-5">
                                {[
                                    { key: 'languages', label: 'Programming Languages', placeholder: 'Python, TypeScript' },
                                    { key: 'frameworks', label: 'Libraries / Frameworks', placeholder: 'React, FastAPI' },
                                    { key: 'tools', label: 'Tools & Platforms', placeholder: 'Git, Docker' },
                                    { key: 'databases', label: 'Databases', placeholder: 'PostgreSQL, Redis' },
                                ].map((group) => (
                                    <div key={group.key}>
                                        <label className="v-label">{group.label}</label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                id={`input-${group.key}`}
                                                className="v-input"
                                                placeholder={group.placeholder}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        addSkill(group.key as any, (e.target as HTMLInputElement).value);
                                                        (e.target as HTMLInputElement).value = '';
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const el = document.getElementById(`input-${group.key}`) as HTMLInputElement;
                                                    addSkill(group.key as any, el.value);
                                                    el.value = '';
                                                }}
                                                className="shrink-0 h-9 w-9 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all"
                                            >
                                                <Plus size={15} />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {resumeData.skills[group.key as keyof ResumeData['skills']].map((s, i) => (
                                                <div key={i} className="v-chip">
                                                    {s}
                                                    <button onClick={() => removeSkill(group.key as any, i)}><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionItem>

                        <AccordionItem title="Projects" icon={FileText} isOpen={openSections.projects} onClick={() => toggleSection('projects')}>
                            <div className="space-y-3">
                                {resumeData.projects.map((p, i) => (
                                    <div key={i} className="v-entry-card group">
                                        <button onClick={() => removeProject(i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 size={13} />
                                        </button>
                                        <div className="space-y-2.5">
                                            <div>
                                                <label className="v-label">Project name</label>
                                                <input className="v-input" value={p.name} onChange={(e) => updateProject(i, 'name', e.target.value)} placeholder="MyProject" />
                                            </div>
                                            <div>
                                                <label className="v-label">Technologies</label>
                                                <input className="v-input" value={p.tech} onChange={(e) => updateProject(i, 'tech', e.target.value)} placeholder="React, Node.js, PostgreSQL" />
                                            </div>
                                            <div>
                                                <label className="v-label">Description</label>
                                                <textarea className="v-input min-h-[72px] resize-none" value={p.desc} onChange={(e) => updateProject(i, 'desc', e.target.value)} placeholder="Brief impact-focused description..." />
                                            </div>
                                            <div>
                                                <label className="v-label">Link (optional)</label>
                                                <input className="v-input" value={p.link} onChange={(e) => updateProject(i, 'link', e.target.value)} placeholder="https://github.com/..." />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <button onClick={addProject} className="flex-1 py-2.5 border border-dashed border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30 transition-all flex items-center justify-center gap-1.5">
                                        <Plus size={14} /> Add Project
                                    </button>
                                    <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                                        <Github size={13} /> Import
                                    </button>
                                </div>
                            </div>
                        </AccordionItem>

                        <AccordionItem title="Certifications" icon={CertificationIcon} isOpen={openSections.certifications} onClick={() => toggleSection('certifications')}>
                            <div className="flex gap-2 mb-3">
                                <input
                                    id="input-cert"
                                    className="v-input"
                                    placeholder="AWS Certified Developer..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addCertification((e.target as HTMLInputElement).value);
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }}
                                />
                                <button onClick={() => { const el = document.getElementById('input-cert') as HTMLInputElement; addCertification(el.value); el.value = ''; }}
                                    className="shrink-0 h-9 w-9 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all">
                                    <Plus size={15} />
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                {resumeData.certifications.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700">
                                        <span>{c}</span>
                                        <button onClick={() => removeCertification(i)} className="text-gray-300 hover:text-red-400 transition-colors ml-2"><Trash2 size={13} /></button>
                                    </div>
                                ))}
                            </div>
                        </AccordionItem>

                        <AccordionItem title="Honors & Awards" icon={Award} isOpen={openSections.additional} onClick={() => toggleSection('additional')}>
                            <div className="flex gap-2 mb-3">
                                <input
                                    id="input-honor"
                                    className="v-input"
                                    placeholder="Dean's List 2023..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addHonor((e.target as HTMLInputElement).value);
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }}
                                />
                                <button onClick={() => { const el = document.getElementById('input-honor') as HTMLInputElement; addHonor(el.value); el.value = ''; }}
                                    className="shrink-0 h-9 w-9 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all">
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
                        </AccordionItem>
                    </div>
                </div>

                {/* Right preview panel */}
                <div className="flex-1 overflow-y-auto v-scroll flex flex-col items-center" style={{ background: '#f1f3f5' }}>
                    <div className="resume-paper">
                        {selectedTemplate === 'classic' ? renderClassicPreview() : renderModernPreview()}
                    </div>
                </div>
            </main>

            {/* Save button */}
            <div className="fixed bottom-5 right-5 z-50">
                <button
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all ${
                        saveStatus === 'saved'
                            ? 'bg-emerald-600 text-white shadow-emerald-200'
                            : 'bg-gray-900 text-white hover:bg-violet-700 shadow-gray-300'
                    }`}
                >
                    {isSaving ? <Loader2 size={15} className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle size={15} /> : <Save size={15} />}
                    {isSaving ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                </button>
            </div>

            {/* AI Review Panel */}
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
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center">
                                        <Sparkles size={15} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">AI Resume Review</p>
                                        <p className="text-xs text-gray-400">Instant feedback</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAiPanel(false)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto v-scroll p-6">
                                {reviewResult ? (
                                    <div>
                                        <div className="flex items-center gap-2 mb-5">
                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                            <p className="text-sm font-semibold text-gray-800">AI Suggestions</p>
                                        </div>
                                        <div className="space-y-3">
                                            {Array.isArray(reviewResult) ? reviewResult.map((res, i) => (
                                                <div key={i} className="flex gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-600 leading-relaxed">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                                                    {res}
                                                </div>
                                            )) : <p className="text-sm text-gray-600">{String(reviewResult)}</p>}
                                        </div>
                                        <button onClick={() => setReviewResult(null)} className="mt-6 w-full py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                                            Run again
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        {/* Visual */}
                                        <div className="aspect-video bg-gray-50 rounded-xl mb-6 flex items-center justify-center border border-gray-100 relative overflow-hidden">
                                            <div className="absolute inset-0 grid-bg opacity-50" />
                                            <div className="relative flex flex-col items-center gap-2">
                                                <div className="h-12 w-10 bg-white rounded-lg shadow-sm border border-gray-200" />
                                                <div className="h-1.5 w-20 bg-gray-200 rounded-full" />
                                                <div className="h-1 w-14 bg-gray-100 rounded-full" />
                                            </div>
                                            <div className="absolute top-3 right-3 h-6 w-6 bg-violet-100 rounded-lg flex items-center justify-center">
                                                <Sparkles size={12} className="text-violet-600" />
                                            </div>
                                        </div>

                                        <h3 className="text-base font-semibold text-gray-900 mb-2">Instant resume analysis</h3>
                                        <div className="space-y-3 mb-8">
                                            {['ATS keyword optimization tips', 'Content and formatting improvements', 'Role-specific recommendations'].map(item => (
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
                                                        setReviewResult([
                                                            "Consider adding more technical keywords to your skills section.",
                                                            "Ensure your contact information is up to date.",
                                                            "Review the layout for better readability."
                                                        ]);
                                                    }
                                                } catch (err) {
                                                    setReviewResult(["Connection error: Ensure the Python server is running."]);
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

            {/* Share Modal */}
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
                                        <label className="v-label">Resume link</label>
                                        <div className="flex items-center gap-2 v-input !p-0 overflow-hidden">
                                            <input
                                                readOnly
                                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/resume/${Math.random().toString(36).substring(7)}`}
                                                className="flex-1 px-3 py-2.5 text-sm text-gray-600 bg-transparent outline-none font-mono"
                                            />
                                            <button className="shrink-0 px-3 py-2.5 text-gray-400 hover:text-violet-600 border-l border-gray-100 transition-colors">
                                                <Share2 size={15} />
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
                                            className={`w-12 h-6.5 rounded-full p-0.5 transition-all duration-200 ${publicAccess ? 'bg-violet-600' : 'bg-gray-200'}`}
                                            style={{ height: '26px' }}
                                        >
                                            <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${publicAccess ? 'translate-x-5.5' : 'translate-x-0'}`} style={{ transform: publicAccess ? 'translateX(22px)' : 'translateX(0)' }} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setIsShareModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={() => setIsShareModalOpen(false)} className="flex-1 v-btn-primary !py-2.5 !rounded-xl !text-sm justify-center">
                                        Copy link
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