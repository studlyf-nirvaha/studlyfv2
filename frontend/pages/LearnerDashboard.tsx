
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';
import { useAuth } from '../AuthContext';
import MyProfile from './MyProfile';
import { downloadCertPDF } from '../utils/downloadCertPDF';
import { generatePdfHtml } from '../utils/resumePdf';
import { Plus, Sparkles, GraduationCap, Briefcase } from 'lucide-react';
// @ts-ignore
import html2pdf from "html2pdf.js";

const CircularProgress = ({ value, size = 180, strokeWidth = 12, color = "#7C3AED", label = "Score" }: { value: number, size?: number, strokeWidth?: number, color?: string, label: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-black tracking-tighter" style={{ color }}>{value}</span>
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">{label}</span>
      </div>
    </div>
  );
};

const LearnerDashboard: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const viewParam = searchParams.get('view') as any;
  const [activeView, setActiveView] = useState<'overview' | 'profile' | 'applications' | 'knowledge' | 'leaderboard' | 'certificates' | 'resume'>(viewParam || 'profile');

  useEffect(() => {
    if (viewParam) {
      setActiveView(viewParam);
    }
  }, [viewParam]);
  const [activeTab, setActiveTab] = useState<'overall' | 'dev' | 'ai'>('overall');
  const [githubData, setGithubData] = useState<any>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [globalRankings, setGlobalRankings] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ 
    full_name: user?.full_name || '', 
    email: user?.email || '',
    college_name: user?.college_name || '',
    graduation_year: user?.graduation_year || ''
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user?.user_id) {
      // 1. Certificates
      fetch(`${API_BASE_URL}/api/certificates/${user.user_id}`)
        .then(res => res.json())
        .then(data => setCertificates(data))
        .catch(console.error);
    }
    
    const savedData = localStorage.getItem(`github_data_${user?.user_id}`);
    if (savedData) {
      setGithubData(JSON.parse(savedData));
    }

    // 2. Aggregated Dashboard Data
    if (user?.user_id) {
      fetch(`${API_BASE_URL}/api/student/dashboard-summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
        .then(res => res.json())
        .then(data => setDashboardStats(data))
        .catch(console.error);
      
      // Keep badges separate if it's a different service
      fetch(`${API_BASE_URL}/api/user/${user.user_id}/badges`)
        .then(res => res.json())
        .then(data => setBadges(data.badges || []))
        .catch(console.error);

      // Fetch global leaderboard
      fetch(`${API_BASE_URL}/api/leaderboard/global`)
        .then(res => res.json())
        .then(data => setGlobalRankings(data.rankings || []))
        .catch(console.error);
    }
  }, [user]);

  const handleAnalyze = async (token: string) => {
    try {
      setAnalyzing(true);
      const res = await fetch(`${API_BASE_URL}/analyze-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: user?.email })
      });
      const data = await res.json();
      if (data.success) {
        setGithubData(data.data);
        localStorage.setItem(`github_data_${user?.user_id}`, JSON.stringify(data.data));
      } else {
        setError(data.error || "Analysis protocol failed.");
      }
    } catch (err: any) {
      setError("Analysis protocol failed. Check uplink.");
    } finally {
      setAnalyzing(false);
    }
  };

  const sidebarItems = [
    { id: 'profile', label: 'My Profile', icon: '👤' }
  ];

  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-[#111827] leading-tight">System Overview</h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">Authenticated Session: {user?.full_name}</p>
              </div>
              <button 
                onClick={() => setActiveView('profile')}
                className="px-8 py-3 bg-[#7C3AED] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20"
              >
                Edit Professional Profile
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Stats Grid */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { label: "Profile Strength", value: `${dashboardStats?.profile_strength || 88}%`, color: "#7C3AED", icon: "✨" },
                  { label: "Course Progress", value: `${dashboardStats?.course_progress || 64}%`, color: "#0052CC", icon: "📚" },
                  { label: "Skill Assessments", value: `${dashboardStats?.skill_assessments || 12}`, color: "#059669", icon: "🎯" },
                  { label: "Global Rank", value: `#${dashboardStats?.global_rank || 42}`, color: "#D97706", icon: "🏆" }
                ].map((stat, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-[2rem] p-8 hover:border-[#7C3AED]/30 transition-all shadow-sm group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-lg">{stat.icon}</div>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Live Sync</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-black text-[#111827] tracking-tighter" style={{ color: stat.color }}>{stat.value}</h3>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-[#111827] rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                   <Sparkles className="w-32 h-32" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-6 relative z-10">Next Protocols</h3>
                <div className="space-y-4 relative z-10">
                  <button onClick={() => navigate('/job-prep/resume-builder')} className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between">
                    Update Resume <Plus className="w-4 h-4" />
                  </button>
                  <button onClick={() => setActiveView('certificates')} className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between">
                    Claim Certificates <GraduationCap className="w-4 h-4" />
                  </button>
                  <button onClick={() => navigate('/opportunities')} className="w-full p-4 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between shadow-xl shadow-[#7C3AED]/20">
                    Explore Jobs <Briefcase className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'knowledge':
        return (
          <div className="space-y-8">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-[#111827]">Knowledge Graph</h2>
            <div className="bg-white border border-gray-100 rounded-[2rem] p-12 flex flex-col items-center text-center space-y-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]" />
              <div className="w-24 h-24 bg-[#F5F3FF] rounded-full flex items-center justify-center text-4xl shadow-inner relative">
                <span className="relative z-10">🕸️</span>
                <div className="absolute inset-0 rounded-full border-4 border-[#7C3AED]/10" />
              </div>
              <div className="max-w-xl space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tight text-[#111827]">Skill Entropy Map</h3>
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold leading-relaxed">
                  Visualizing your architectural reach across the Studlyf Standard.
                  <br />
                  <span className="text-[#7C3AED]">Current Entropy: Low (Highly Organized)</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl mt-8">
                {[
                  { label: "System Design", score: 92, draft: "High" },
                  { label: "Algorithms", score: 85, draft: "Mid" },
                  { label: "Database Arch", score: 88, draft: "High" },
                  { label: "Cloud Native", score: 76, draft: "Mid" },
                  { label: "Security", score: 95, draft: "Elite" },
                  { label: "DevOps", score: 82, draft: "Mid" }
                ].map((skill, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-start gap-3 hover:border-[#7C3AED]/30 transition-all group cursor-default">
                    <div className="w-full flex justify-between items-start">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{skill.draft} Tier</span>
                      <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                    </div>
                    <h4 className="text-lg font-bold text-[#111827] uppercase tracking-tight group-hover:text-[#7C3AED] transition-colors">{skill.label}</h4>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-[#7C3AED]" style={{ width: `${skill.score}%` }} />
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-500 mt-1">{skill.score}% Coverage</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'leaderboard':
        return (
          <div className="space-y-8">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-[#111827]">Global Rankings</h2>
            <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
              {(globalRankings.length > 0 ? globalRankings : [
                { rank: 1, name: "Sarah Q.", score: 98.2, status: "Verified", movement: "▲" },
                { rank: 2, name: "James L.", score: 96.5, status: "Verified", movement: "-" },
                { rank: 3, name: "Alex P.", score: 75.4, status: "Active", highlighted: true, movement: "▲" },
                { rank: 4, name: "Mira K.", score: 74.1, status: "Active", movement: "▼" },
                { rank: 5, name: "Chen W.", score: 72.8, status: "Active", movement: "▲" }
              ]).map((u, i) => (
                <div key={i} className={`flex items-center justify-between p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${u.highlighted ? 'bg-[#F5F3FF] hover:bg-[#F5F3FF]' : ''}`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-8 h-8 flex items-center justify-center font-black ${i < 3 ? 'text-[#7C3AED]' : 'text-gray-400'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#0${u.rank}`}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-xs text-gray-500 border-2 border-white shadow-sm">
                      {u.name[0]}
                    </div>
                    <span className="font-bold text-sm uppercase tracking-tight text-[#111827]">{u.name}</span>
                  </div>
                  <div className="flex items-center gap-8">
                    <span className="hidden sm:inline-block text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest bg-white px-3 py-1 rounded-md border border-[#7C3AED]/10">{u.status}</span>
                    <div className="text-right">
                      <span className="block font-black text-lg tracking-tighter text-[#111827]">{u.score}</span>
                      <span className={`text-[10px] font-bold ${u.movement === '▲' ? 'text-green-500' : u.movement === '▼' ? 'text-red-500' : 'text-gray-400'}`}>{u.movement} This Week</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="p-4 bg-gray-50 text-center">
                <button className="text-[10px] font-black uppercase tracking-widest text-[#7C3AED] hover:underline">View Top 100</button>
              </div>
            </div>
          </div>
        );
      case 'certificates':
        return (
          <div className="space-y-8">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-[#111827]">Certifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {certificates.map((cert) => (
                <div key={cert.certificate_id} className="bg-white border border-gray-100 rounded-[2rem] p-8 flex flex-col justify-between group hover:border-[#7C3AED]/30 transition-all shadow-sm">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[10px] font-black tracking-[0.2em] text-[#7C3AED] uppercase">Official Credential</span>
                      {cert.is_dummy && (
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Starter</span>
                      )}
                    </div>
                    <h3 className="text-2xl font-black text-[#111827] uppercase tracking-tighter mb-2">{cert.course_title}</h3>
                    {(cert.achievement_type || cert.category) && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F3FF] text-[#7C3AED] text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        {cert.achievement_type || cert.category}
                      </div>
                    )}
                    <div className="space-y-2 mb-8">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">ID: <span className="text-[#111827] font-mono">{cert.certificate_id}</span></p>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Issued: <span className="text-[#111827]">{new Date(cert.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const uid = user?.user_id || 'guest';
                        const url = `${API_BASE_URL}/api/certificates/${uid}/${cert.certificate_id}/html`;
                        (window as any).__certPreviewUrl = url;
                        (window as any).__certPreviewOpen = true;
                        const el = document.getElementById('cert-preview-modal');
                        const iframe = document.getElementById('cert-iframe') as HTMLIFrameElement;
                        if (el && iframe) { iframe.src = url; el.style.display = 'flex'; }
                      }}
                      className="flex-1 py-4 bg-[#F5F3FF] text-[#7C3AED] rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#7C3AED] hover:text-white transition-all flex justify-center items-center gap-2"
                    >
                      👁 Preview
                    </button>
                    <button
                      onClick={async () => {
                        setDownloadingCertId(cert.certificate_id);
                        await downloadCertPDF(user?.user_id || 'guest', cert.certificate_id, cert.course_title);
                        setDownloadingCertId(null);
                      }}
                      disabled={downloadingCertId === cert.certificate_id}
                      className="flex-1 py-4 bg-[#111827] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#7C3AED] transition-all flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {downloadingCertId === cert.certificate_id ? (
                        <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full"></span> Generating...</>
                      ) : '⬇ Download PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Certificate Preview Modal */}
            <div
              id="cert-preview-modal"
              style={{ display: 'none' }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-6"
              onClick={(e) => { if ((e.target as HTMLElement).id === 'cert-preview-modal') { (document.getElementById('cert-preview-modal') as HTMLElement).style.display = 'none'; } }}
            >
              <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-5xl flex flex-col">
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                  <span className="text-sm font-black text-[#111827] uppercase tracking-widest">Certificate Preview</span>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        const iframe = document.getElementById('cert-iframe') as HTMLIFrameElement;
                        const certSrc = iframe?.src || '';
                        // Extract cert id from URL: .../{userId}/{certId}/html
                        const parts = certSrc.split('/');
                        const htmlIdx = parts.indexOf('html');
                        const certId = htmlIdx > 0 ? parts[htmlIdx - 1] : '';
                        const userId = htmlIdx > 1 ? parts[htmlIdx - 2] : user?.user_id || 'guest';
                        setDownloadingCertId('modal');
                        await downloadCertPDF(userId, certId, 'Certificate');
                        setDownloadingCertId(null);
                      }}
                      disabled={downloadingCertId === 'modal'}
                      className="px-5 py-2.5 bg-[#7C3AED] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[#6D28D9] transition-all disabled:opacity-60"
                    >
                      {downloadingCertId === 'modal' ? 'Generating...' : '⬇ Download PDF'}
                    </button>
                    <button
                      onClick={() => { (document.getElementById('cert-preview-modal') as HTMLElement).style.display = 'none'; }}
                      className="px-5 py-2.5 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-gray-200 transition-all"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
                <div className="w-full bg-gray-50 flex items-center justify-center p-6" style={{ height: 520 }}>
                  <iframe
                    id="cert-iframe"
                    src=""
                    className="w-full h-full rounded-xl border border-gray-200 shadow-inner"
                    title="Certificate Preview"
                    style={{ minHeight: 460, transform: 'scale(0.88)', transformOrigin: 'center center' }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'resume':
        return (
          <div className="space-y-8">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-[#111827]">My Resume</h2>
            <div className="bg-white border border-gray-100 rounded-[2rem] p-12 flex flex-col items-center text-center space-y-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]" />
              <div className="w-24 h-24 bg-[#F5F3FF] rounded-full flex items-center justify-center text-4xl shadow-inner relative">
                <span className="relative z-10">📄</span>
                <div className="absolute inset-0 rounded-full border-4 border-[#7C3AED]/10" />
              </div>
              <div className="max-w-xl space-y-4">
                <h3 className="text-2xl font-black tracking-tight text-[#111827] uppercase">Stored Resume</h3>
                <p className="text-sm font-medium text-gray-500">
                  Your generated professional resume is automatically synced here. You can download your latest PDF or edit it directly in the Resume Builder.
                </p>
              </div>
              <div className="flex gap-4 flex-col sm:flex-row mt-4">
                <button
                  onClick={async () => {
                    if (!user?.user_id) return alert('Kindly login first');
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/resume/${user.user_id}`);
                      if (!res.ok) {
                        alert("No saved resume found. Please create one first.");
                        return;
                      }
                      const data = await res.json();
                      const config = data.config;
                      const html = generatePdfHtml(config, config.tpl);

                      const fr = document.createElement("iframe");
                      fr.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
                      document.body.appendChild(fr);

                      if (fr.contentWindow) {
                        fr.contentWindow.document.open();
                        fr.contentWindow.document.write(html);
                        fr.contentWindow.document.close();
                        fr.onload = () => {
                          fr.contentWindow?.focus();
                          fr.contentWindow?.print();
                          setTimeout(() => document.body.removeChild(fr), 2000);
                        };
                      }
                    } catch (e) {
                      console.error(e);
                      alert("Error fetching your resume.");
                    }
                  }}
                  className="py-4 px-8 bg-[#F5F3FF] text-[#7C3AED] rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#7C3AED] hover:text-white transition-all flex justify-center items-center gap-2"
                >
                  ⬇ Download PDF
                </button>

                <Link to="/job-prep/resume-builder" className="py-4 px-8 bg-[#111827] text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#7C3AED] transition-all flex justify-center items-center gap-2">
                  Edit / Create Resume
                </Link>
              </div>
            </div>
          </div>
        );
      case 'profile':
        return <MyProfile />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans text-[#111827] selection:bg-[#7C3AED] selection:text-white pt-20">
      <main className="flex-grow p-4 sm:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "circOut" }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default LearnerDashboard;

