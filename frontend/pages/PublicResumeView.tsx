import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Lock, Globe, Download, Copy, Check, ArrowLeft, Mail, Phone, MapPin, 
  Linkedin, Github, ExternalLink, Award, Briefcase, GraduationCap, Code2, FolderGit2, AlertCircle 
} from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';

interface ResumeData {
  title?: string;
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    jobTitle?: string;
    links?: Array<{ label: string; url: string }>;
  };
  summary?: string;
  education?: Array<{
    institution?: string;
    degree?: string;
    year?: string;
    gpa?: string;
  }>;
  experience?: Array<{
    company?: string;
    role?: string;
    range?: string;
    location?: string;
    points?: string;
  }>;
  skills?: {
    languages?: string[];
    frameworks?: string[];
    tools?: string[];
  };
  projects?: Array<{
    name?: string;
    tech?: string;
    desc?: string;
    link?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    year?: string;
  }>;
  additional?: {
    languagesSpoken?: string;
    interests?: string;
  };
}

export const PublicResumeView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!shareId) {
      setErrorStatus(404);
      setErrorMessage("No share ID provided in URL.");
      setLoading(false);
      return;
    }

    const fetchPublicResume = async () => {
      setLoading(true);
      setErrorStatus(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/resume/public/${shareId}`);
        const data = await response.json();

        if (response.ok) {
          setResumeData(data.config || {});
        } else if (response.status === 403) {
          setErrorStatus(403);
          setErrorMessage(data.detail || "This resume is private. Access is restricted by the owner.");
        } else {
          setErrorStatus(response.status || 404);
          setErrorMessage(data.detail || "Resume not found.");
        }
      } catch (err: any) {
        console.error("Public resume fetch error:", err);
        setErrorStatus(500);
        setErrorMessage("Network error while connecting to server.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicResume();
  }, [shareId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <div className="w-12 h-12 border-4 border-[#6C2BFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-gray-700">Loading Resume...</p>
        </div>
      </div>
    );
  }

  // Access Restricted / Private State (403)
  if (errorStatus === 403) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 text-center"
        >
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-2">Private Resume</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            {errorMessage || "The owner of this resume has disabled public link access. Only authorized users can view it."}
          </p>

          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-6 text-left flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              If this is your resume, please log in and enable <strong>Public Access</strong> in the Resume Share settings.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-[#6C2BFF] hover:bg-[#5b22dc] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-[#6C2BFF]/20"
            >
              Log In to StudLyf
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Go to Homepage
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Not Found or Server Error State (404/500)
  if (errorStatus || !resumeData) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 text-center"
        >
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-2">Resume Not Found</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            {errorMessage || "The resume link you followed does not exist or may have been deleted."}
          </p>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-[#6C2BFF] text-white font-bold rounded-xl text-sm hover:bg-[#5b22dc] transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to StudLyf
          </button>
        </motion.div>
      </div>
    );
  }

  const { personalInfo, summary, experience, education, skills, projects, certifications, additional } = resumeData;
  const fullName = `${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}`.trim() || 'Candidate Resume';

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-gray-800 font-sans pb-16 print:bg-white print:pb-0">
      
      {/* Top Floating Control Bar (Hidden on Print) */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base font-black text-gray-900 truncate max-w-[200px] sm:max-w-xs leading-tight">
                {fullName}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Globe className="w-3 h-3" /> Public Verified Resume
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#6C2BFF] hover:bg-[#5b22dc] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#6C2BFF]/20"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>

        </div>
      </div>

      {/* Resume Container */}
      <div className="max-w-4xl mx-auto mt-6 px-4 print:mt-0 print:px-0">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 sm:p-12 print:shadow-none print:border-none print:rounded-none print:p-0"
        >
          {/* Header Block */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-1">
              {fullName}
            </h1>
            {personalInfo?.jobTitle && (
              <p className="text-lg font-bold text-[#6C2BFF] mb-4">
                {personalInfo.jobTitle}
              </p>
            )}

            {/* Contact Details */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-600 font-medium">
              {personalInfo?.email && (
                <a href={`mailto:${personalInfo.email}`} className="flex items-center gap-1.5 hover:text-[#6C2BFF] transition-colors">
                  <Mail className="w-4 h-4 text-gray-400" /> {personalInfo.email}
                </a>
              )}
              {personalInfo?.phone && (
                <a href={`tel:${personalInfo.phone}`} className="flex items-center gap-1.5 hover:text-[#6C2BFF] transition-colors">
                  <Phone className="w-4 h-4 text-gray-400" /> {personalInfo.phone}
                </a>
              )}
              {personalInfo?.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" /> {personalInfo.address}
                </span>
              )}
            </div>

            {/* External Links */}
            {personalInfo?.links && personalInfo.links.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                {personalInfo.links.map((link, idx) => {
                  if (!link.url) return null;
                  const isLinkedin = link.url.includes('linkedin.com');
                  const isGithub = link.url.includes('github.com');
                  return (
                    <a
                      key={idx}
                      href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 hover:text-[#6C2BFF] hover:border-[#6C2BFF]/30 transition-all"
                    >
                      {isLinkedin && <Linkedin className="w-3.5 h-3.5 text-blue-600" />}
                      {isGithub && <Github className="w-3.5 h-3.5 text-gray-900" />}
                      {!isLinkedin && !isGithub && <ExternalLink className="w-3.5 h-3.5 text-gray-500" />}
                      {link.label || 'Portfolio Link'}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Professional Summary */}
          {summary && (
            <div className="mb-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#6C2BFF] mb-3">
                Professional Summary
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed font-medium">
                {summary}
              </p>
            </div>
          )}

          {/* Experience */}
          {experience && experience.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#6C2BFF] mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Work Experience
              </h2>
              <div className="space-y-6">
                {experience.map((exp, idx) => (
                  <div key={idx} className="border-l-2 border-gray-200 pl-4 relative">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <h3 className="text-base font-bold text-gray-900">
                        {exp.role} <span className="font-normal text-gray-500">@ {exp.company}</span>
                      </h3>
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                        {exp.range}
                      </span>
                    </div>
                    {exp.location && (
                      <p className="text-xs font-medium text-gray-400 mb-2">{exp.location}</p>
                    )}
                    {exp.points && (
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line font-medium">
                        {exp.points}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education && education.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#6C2BFF] mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Education
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {education.map((edu, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900">{edu.degree}</h3>
                    <p className="text-xs font-semibold text-gray-600">{edu.institution}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/60 text-xs font-medium text-gray-500">
                      <span>{edu.year}</span>
                      {edu.gpa && <span className="font-bold text-gray-800">GPA: {edu.gpa}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills && (skills.languages?.length || skills.frameworks?.length || skills.tools?.length) ? (
            <div className="mb-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#6C2BFF] mb-4 flex items-center gap-2">
                <Code2 className="w-4 h-4" /> Technical Skills
              </h2>
              <div className="space-y-3">
                {skills.languages && skills.languages.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-gray-500 block mb-1.5">Languages & Core:</span>
                    <div className="flex flex-wrap gap-2">
                      {skills.languages.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-violet-50 text-violet-700 rounded-xl text-xs font-bold border border-violet-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {skills.frameworks && skills.frameworks.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-gray-500 block mb-1.5">Frameworks & Libraries:</span>
                    <div className="flex flex-wrap gap-2">
                      {skills.frameworks.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {skills.tools && skills.tools.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-gray-500 block mb-1.5">Tools & Platforms:</span>
                    <div className="flex flex-wrap gap-2">
                      {skills.tools.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Projects */}
          {projects && projects.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#6C2BFF] mb-4 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4" /> Key Projects
              </h2>
              <div className="space-y-4">
                {projects.map((proj, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-900">{proj.name}</h3>
                      {proj.link && (
                        <a
                          href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-[#6C2BFF] hover:underline inline-flex items-center gap-1"
                        >
                          View Project <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {proj.tech && (
                      <span className="text-xs font-semibold text-gray-500 block mb-2">{proj.tech}</span>
                    )}
                    {proj.desc && (
                      <p className="text-xs text-gray-700 leading-relaxed font-medium">{proj.desc}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certifications && certifications.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#6C2BFF] mb-4 flex items-center gap-2">
                <Award className="w-4 h-4" /> Certifications & Achievements
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {certifications.map((cert, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900">{cert.name}</h3>
                      <p className="text-[11px] font-semibold text-gray-500">{cert.issuer}</p>
                    </div>
                    {cert.year && <span className="text-[11px] font-bold text-gray-400">{cert.year}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Branding */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Verified Public Resume</span>
            <span>Powered by StudLyf Platform</span>
          </div>

        </motion.div>
      </div>

    </div>
  );
};

export default PublicResumeView;
