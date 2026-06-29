import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../apiConfig';

// ─── Types ───────────────────────────────────────────────────────
interface Task {
  _id: string;
  project_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  assigned_name?: string;
  status: string;
  priority: string;
  created_by: string;
}

interface Comment {
  _id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface Member {
  _id: string;
  user_id: string;
  user_name: string;
  role: string;
}

interface JoinRequest {
  _id: string;
  user_id: string;
  user_name: string;
  role_requested: string;
  message?: string;
  status: string;
}

interface Project {
  _id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  project_type: string;
  problem_statement: string;
  architecture_focus: string;
  skills_required: string[];
  team_size: number;
  timeline: string;
  roles_needed: string[];
  tags: string[];
  github_link?: string;
  overview?: string;
  architecture_breakdown?: string;
  feature_checklist: { name: string; completed: boolean }[];
  progress: number;
  status: string;
  views: number;
  created_at: string;
  members: Member[];
  tasks: Task[];
  comments: Comment[];
  join_requests: JoinRequest[];
}

// ─── Constants ───────────────────────────────────────────────────
const DETAIL_TABS = ['Overview', 'Architecture', 'Task Board', 'Team', 'Discussion'];
const KANBAN_COLS = [
  { id: 'todo', label: 'To Do', color: 'border-white/10', dot: 'bg-white/30' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-500/30', dot: 'bg-amber-500' },
  { id: 'review', label: 'Review', color: 'border-blue-500/30', dot: 'bg-blue-500' },
  { id: 'done', label: 'Done', color: 'border-emerald-500/30', dot: 'bg-emerald-500' },
];
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-400',
  medium: 'bg-amber-500/15 text-amber-400',
  high: 'bg-orange-500/15 text-orange-400',
  critical: 'bg-red-500/15 text-red-400',
};
const ROLE_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  devops: 'DevOps',
  ai: 'AI / ML',
  ui_ux: 'UI/UX',
  lead: 'Lead',
};

// ─── Seed Project for Demo ───────────────────────────────────────
const SEED_PROJECT: Project = {
  _id: 'seed-1',
  owner_id: 'system',
  owner_name: 'Studlyf Lab',
  title: 'Netflix Streaming Engine',
  project_type: 'system_replica',
  problem_statement: 'Deconstruct and rebuild the core video streaming pipeline — adaptive bitrate, CDN routing, and real-time recommendations.',
  architecture_focus: 'Microservices + Event-Driven',
  skills_required: ['Node.js', 'Kafka', 'Redis', 'React', 'FFmpeg'],
  team_size: 4,
  timeline: '6 weeks',
  roles_needed: ['backend', 'frontend', 'devops'],
  tags: ['System Design', 'Full Stack', 'Backend'],
  github_link: 'https://github.com/example/netflix-replica',
  overview: 'This project aims to deconstruct the Netflix streaming pipeline, focusing on adaptive bitrate streaming, content delivery optimization, and the recommendation engine. We will build microservices for video ingestion, transcoding, CDN routing, and user-facing APIs.',
  architecture_breakdown: '**Services:**\n- Video Ingestion Service (FFmpeg + S3)\n- Transcoding Pipeline (multi-bitrate HLS)\n- CDN Router (edge caching logic)\n- Recommendation Engine (collaborative filtering)\n- API Gateway (rate limiting, auth)\n- User Service (profiles, preferences)\n\n**Data Flow:**\nUpload → Ingest → Transcode → CDN → Client\nUser interactions → Event Bus (Kafka) → Recommendation Engine → Personalized Feed',
  feature_checklist: [
    { name: 'User authentication & profiles', completed: true },
    { name: 'Video upload & ingestion', completed: true },
    { name: 'Multi-bitrate transcoding', completed: false },
    { name: 'Adaptive bitrate player', completed: false },
    { name: 'CDN routing logic', completed: false },
    { name: 'Recommendation engine', completed: false },
    { name: 'Admin dashboard', completed: false },
  ],
  progress: 28,
  status: 'open',
  views: 342,
  created_at: new Date().toISOString(),
  members: [
    { _id: 'm1', user_id: 'system', user_name: 'Studlyf Lab', role: 'lead' },
    { _id: 'm2', user_id: 'u1', user_name: 'Rahul S.', role: 'backend' },
  ],
  tasks: [
    { _id: 't1', project_id: 'seed-1', title: 'Setup project monorepo', status: 'done', priority: 'high', created_by: 'system', assigned_name: 'Studlyf Lab' },
    { _id: 't2', project_id: 'seed-1', title: 'Implement auth service', status: 'done', priority: 'high', created_by: 'system', assigned_name: 'Rahul S.' },
    { _id: 't3', project_id: 'seed-1', title: 'Build video ingestion pipeline', status: 'in_progress', priority: 'critical', created_by: 'system', assigned_name: 'Rahul S.' },
    { _id: 't4', project_id: 'seed-1', title: 'Design CDN routing algorithm', status: 'todo', priority: 'medium', created_by: 'system' },
    { _id: 't5', project_id: 'seed-1', title: 'Create recommendation model', status: 'todo', priority: 'medium', created_by: 'system' },
    { _id: 't6', project_id: 'seed-1', title: 'Build adaptive bitrate player', status: 'review', priority: 'high', created_by: 'system', assigned_name: 'Studlyf Lab' },
  ],
  comments: [
    { _id: 'c1', user_id: 'system', user_name: 'Studlyf Lab', content: 'Project kickoff! Let\'s start with the monorepo setup and auth service.', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { _id: 'c2', user_id: 'u1', user_name: 'Rahul S.', content: 'Auth service is live. Moving to video ingestion next. Should we use FFmpeg or a managed transcoding service?', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  ],
  join_requests: [],
};

// ─── Main Component ──────────────────────────────────────────────
const SDLProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Task creation
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  // Comment
  const [newComment, setNewComment] = useState('');

  // Join request
  const [joinRole, setJoinRole] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sdl/projects/${projectId}`);
      if (res.ok) {
        setProject(await res.json());
      } else {
        // Fallback to seed
        if (projectId?.startsWith('seed-')) {
          setProject(SEED_PROJECT);
        }
      }
    } catch {
      if (projectId?.startsWith('seed-')) {
        setProject(SEED_PROJECT);
      }
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user?.uid === project?.owner_id;
  const isMember = project?.members?.some((m) => m.user_id === user?.uid);

  // Detect user's existing join request
  const myJoinRequest = useMemo(() => {
    if (!user || !project?.join_requests) return null;
    return project.join_requests.find((jr) => jr.user_id === user.uid);
  }, [user, project?.join_requests]);

  const pendingRequestCount = useMemo(() => {
    if (!project?.join_requests) return 0;
    return project.join_requests.filter((jr) => jr.status === 'pending').length;
  }, [project?.join_requests]);

  // ─── Feature Checklist Progress ────────────────────────────────
  const featureProgress = useMemo(() => {
    if (!project?.feature_checklist?.length) return 0;
    const done = project.feature_checklist.filter((f) => f.completed).length;
    return Math.round((done / project.feature_checklist.length) * 100);
  }, [project?.feature_checklist]);

  // ─── Task Handlers ─────────────────────────────────────────────
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !project || !user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/sdl/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project._id,
          title: newTaskTitle,
          priority: newTaskPriority,
          created_by: user.uid,
        }),
      });
      if (res.ok) {
        setNewTaskTitle('');
        fetchProject();
      }
    } catch (err) {
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/sdl/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchProject();
    } catch (err) {
    }
  };

  // ─── Comment Handler ───────────────────────────────────────────
  const handlePostComment = async () => {
    if (!newComment.trim() || !project || !user) return;
    try {
      await fetch(`${API_BASE_URL}/api/sdl/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project._id,
          user_id: user.uid,
          user_name: user.full_name || user.email || 'Anonymous',
          content: newComment,
        }),
      });
      setNewComment('');
      fetchProject();
    } catch (err) {
    }
  };

  // ─── Join Request ──────────────────────────────────────────────
  const handleJoinRequest = async () => {
    if (!joinRole || !project || !user) return;
    setJoinSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sdl/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project._id,
          user_id: user.uid,
          user_name: user.full_name || user.email || 'Anonymous',
          role_requested: joinRole,
          message: joinMessage || null,
        }),
      });
      if (res.ok) {
        setJoinSuccess(true);
        setJoinRole('');
        setJoinMessage('');
      }
    } catch (err) {
    } finally {
      setJoinSubmitting(false);
    }
  };

  // ─── Handle Join Request Accept/Reject (owner only) ────────────
  const handleJoinAction = async (requestId: string, status: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/sdl/join-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchProject();
    } catch (err) {
    }
  };

  // ─── Toggle Feature Checklist ──────────────────────────────────
  const handleToggleFeature = async (index: number) => {
    if (!project || !isOwner) return;
    const updated = [...project.feature_checklist];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    try {
      await fetch(`${API_BASE_URL}/api/sdl/projects/${project._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_checklist: updated }),
      });
      setProject({ ...project, feature_checklist: updated });
    } catch (err) {
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080515] flex items-center justify-center">
        <div className="text-white/30 text-xs uppercase tracking-[0.3em] font-bold animate-pulse">
          Loading Lab Data...
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#080515] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/20 text-sm mb-4">Project not found</p>
          <button onClick={() => navigate('/job-prep/projects')} className="text-violet-400 text-xs uppercase tracking-[0.2em] font-bold">
            Back to Lab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080515] pt-32 pb-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <style>{`
            @keyframes tab-shimmer {
                0%   { transform: translateX(-180%) skewX(-20deg); }
                100% { transform: translateX(300%) skewX(-20deg); }
            }
            @keyframes tab-orb1 {
                0%,100% { transform: translate(0px,0px) scale(1);    opacity:0.55; }
                40%     { transform: translate(8px,-6px) scale(1.3);  opacity:0.9; }
                70%     { transform: translate(-4px,4px) scale(0.8);  opacity:0.4; }
            }
            @keyframes tab-orb2 {
                0%,100% { transform: translate(0px,0px) scale(1);     opacity:0.4; }
                35%     { transform: translate(-10px,-8px) scale(1.4); opacity:0.85; }
                65%     { transform: translate(6px,5px) scale(0.75);   opacity:0.35; }
            }
            @keyframes tab-orb3 {
                0%,100% { transform: translate(0px,0px) scale(1);    opacity:0.5; }
                50%     { transform: translate(6px,8px) scale(1.25);  opacity:0.9; }
            }
            .tab-btn {
                position: relative;
                overflow: hidden;
                background: #7C3AED;
                color: #fff;
                box-shadow: 0 4px 20px rgba(124,58,237,0.4), 0 1px 0 rgba(255,255,255,0.12) inset;
            }
            .tab-btn::before {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: inherit;
                background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 55%);
                pointer-events: none;
                z-index: 1;
            }
            .tab-btn::after {
                content: '';
                position: absolute;
                top: 0; left: 0;
                width: 40%; height: 100%;
                background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.24) 50%, transparent 80%);
                animation: tab-shimmer 2.8s ease-in-out infinite;
                pointer-events: none;
                z-index: 2;
            }
            .tab-orb {
                position: absolute;
                border-radius: 50%;
                pointer-events: none;
                filter: blur(7px);
                z-index: 1;
            }
            .tab-orb1 { width:28px; height:28px; background:radial-gradient(circle,rgba(196,168,255,0.95),transparent 70%); top:-4px; left:18px; animation:tab-orb1 3.2s ease-in-out infinite; }
            .tab-orb2 { width:22px; height:22px; background:radial-gradient(circle,rgba(255,255,255,0.8),transparent 70%);  bottom:-2px; right:48px; animation:tab-orb2 4s ease-in-out infinite; }
            .tab-orb3 { width:18px; height:18px; background:radial-gradient(circle,rgba(167,139,250,0.9),transparent 70%); top:4px; right:18px;  animation:tab-orb3 2.6s ease-in-out infinite; }
            .tab-label { position:relative; z-index:5; display:flex; align-items:center; gap:8px; justify-content:center; }
        `}</style>

        {/* ── Back & Status Bar ── */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/job-prep/projects')}
            className="flex items-center gap-2 text-white/30 text-xs uppercase tracking-[0.2em] font-bold hover:text-white/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            Back to Lab
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/25 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              {project.views} views
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border ${project.status === 'open' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
              project.status === 'in_progress' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                'bg-blue-500/15 text-blue-400 border-blue-500/30'
              }`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* ── Project Header ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${project.project_type === 'system_replica' ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' :
              project.project_type === 'original_build' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
              {project.project_type.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-violet-400/70 font-bold uppercase tracking-[0.15em]">⟠ {project.architecture_focus}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-tight mb-4">
            {project.title}
          </h1>
          <p className="text-white/40 text-lg leading-relaxed max-w-3xl mb-6">{project.problem_statement}</p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">{project.owner_name.charAt(0)}</span>
              </div>
              <span className="text-sm text-white/50 font-medium">{project.owner_name}</span>
            </div>
            <span className="text-white/15">|</span>
            <span className="text-[11px] text-white/30 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {project.members?.length || 1} / {project.team_size} members
            </span>
            <span className="text-[11px] text-white/30">{project.timeline}</span>
            {project.github_link && (
              <a href={project.github_link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                Repository
              </a>
            )}
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5 mt-5">
            {project.skills_required.map((s, i) => (
              <span key={i} className="text-[10px] font-semibold bg-white/[0.05] text-white/50 px-2.5 py-1 rounded-lg border border-white/[0.06]">{s}</span>
            ))}
          </div>

          {/* Global Progress */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Overall Progress</span>
              <span className="text-[10px] text-violet-400 font-bold">{featureProgress || project.progress}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${featureProgress || project.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-8 bg-white/[0.02] rounded-xl p-1 border border-white/[0.04] overflow-x-auto">
          {DETAIL_TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`tab-btn px-5 py-3 rounded-lg text-[11px] font-bold uppercase tracking-[0.12em] transition-all whitespace-nowrap relative ${activeTab === i ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
            >
              <span className="tab-orb tab-orb1" />
              <span className="tab-orb tab-orb2" />
              <span className="tab-orb tab-orb3" />
              <span className="tab-label">
                {tab}
                {/* Pending requests badge for owner on Team tab */}
                {tab === 'Team' && isOwner && pendingRequestCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                    {pendingRequestCount}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === 0 && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                  {project.overview && (
                    <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6">
                      <h3 className="text-sm font-bold text-white/80 uppercase tracking-[0.1em] mb-4">Project Overview</h3>
                      <p className="text-white/40 text-sm leading-relaxed whitespace-pre-wrap">{project.overview}</p>
                    </div>
                  )}

                  {/* Feature Checklist */}
                  {project.feature_checklist.length > 0 && (
                    <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white/80 uppercase tracking-[0.1em]">Feature Checklist</h3>
                        <span className="text-[10px] text-violet-400 font-bold">{featureProgress}% complete</span>
                      </div>
                      <div className="space-y-2">
                        {project.feature_checklist.map((feat, i) => (
                          <button
                            key={i}
                            onClick={() => handleToggleFeature(i)}
                            className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${feat.completed ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08]'
                              } ${isOwner ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${feat.completed ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                              }`}>
                              {feat.completed && <span className="text-white text-[10px]">✓</span>}
                            </div>
                            <span className={`text-sm ${feat.completed ? 'text-white/40 line-through' : 'text-white/60'}`}>
                              {feat.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Join Request Card */}
                  {!isOwner && !isMember && project.status === 'open' && (
                    <div className="bg-gradient-to-br from-violet-600/10 to-purple-600/5 rounded-2xl border border-violet-500/15 p-6">
                      <h3 className="text-sm font-bold text-white/80 mb-4">Request to Join</h3>

                      {/* Not logged in */}
                      {!user ? (
                        <div className="text-center py-4">
                          <svg className="w-8 h-8 mx-auto mb-3 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          <p className="text-white/40 text-sm mb-3">Sign in to request a spot on this team</p>
                          <button
                            onClick={() => navigate('/auth')}
                            className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl hover:shadow-lg hover:shadow-violet-500/20 transition-all"
                          >
                            Sign In
                          </button>
                        </div>

                        /* Already has a request */
                      ) : myJoinRequest ? (
                        <div className="text-center py-4">
                          {myJoinRequest.status === 'pending' && (
                            <>
                              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              </div>
                              <p className="text-amber-400 text-sm font-semibold mb-1">Request Pending</p>
                              <p className="text-white/30 text-xs">You've requested to join as <span className="text-violet-400 font-semibold">{ROLE_LABELS[myJoinRequest.role_requested] || myJoinRequest.role_requested}</span>. The project lead will review your request.</p>
                            </>
                          )}
                          {myJoinRequest.status === 'accepted' && (
                            <>
                              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                              </div>
                              <p className="text-emerald-400 text-sm font-semibold mb-1">You're In!</p>
                              <p className="text-white/30 text-xs">Your request was accepted. Check the Task Board and start contributing!</p>
                            </>
                          )}
                          {myJoinRequest.status === 'rejected' && (
                            <>
                              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                              </div>
                              <p className="text-red-400 text-sm font-semibold mb-1">Request Declined</p>
                              <p className="text-white/30 text-xs">The project lead declined your request. You may browse other open projects.</p>
                            </>
                          )}
                        </div>

                        /* Fresh join form — just submitted */
                      ) : joinSuccess ? (
                        <div className="text-center py-4">
                          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <p className="text-emerald-400 text-sm font-semibold mb-1">Request Submitted!</p>
                          <p className="text-white/30 text-xs">The project lead will review your request. You'll be added to the team if accepted.</p>
                        </div>

                        /* Default: show form */
                      ) : (
                        <>
                          <p className="text-white/30 text-xs mb-3">Pick a role and introduce yourself to the team.</p>
                          <select
                            value={joinRole}
                            onChange={(e) => setJoinRole(e.target.value)}
                            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white mb-3 focus:outline-none focus:border-violet-500/40 appearance-none"
                          >
                            <option value="" className="bg-[#1A1030]">Select role...</option>
                            {project.roles_needed.map((r) => (
                              <option key={r} value={r} className="bg-[#1A1030]">{ROLE_LABELS[r] || r}</option>
                            ))}
                          </select>
                          <textarea
                            value={joinMessage}
                            onChange={(e) => setJoinMessage(e.target.value)}
                            placeholder="Why do you want to join? Share relevant skills or experience..."
                            rows={3}
                            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/15 mb-3 focus:outline-none resize-none"
                          />
                          <button
                            disabled={!joinRole || joinSubmitting}
                            onClick={handleJoinRequest}
                            className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/20 transition-all"
                          >
                            {joinSubmitting ? 'Submitting...' : 'Send Join Request'}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Already a member indicator */}
                  {isMember && !isOwner && (
                    <div className="bg-emerald-500/5 rounded-2xl border border-emerald-500/15 p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                          <p className="text-emerald-400 text-sm font-semibold">You're on this team</p>
                          <p className="text-white/25 text-[10px]">{ROLE_LABELS[project.members?.find(m => m.user_id === user?.uid)?.role || ''] || 'Member'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Project Info */}
                  <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6">
                    <h3 className="text-sm font-bold text-white/80 uppercase tracking-[0.1em] mb-4">Details</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Type', value: project.project_type.replace('_', ' ') },
                        { label: 'Team Size', value: `${project.members?.length || 1} / ${project.team_size}` },
                        { label: 'Timeline', value: project.timeline },
                        { label: 'Tags', value: project.tags.join(', ') },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">{item.label}</span>
                          <span className="text-[11px] text-white/50 font-medium capitalize">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Roles Needed */}
                  <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6">
                    <h3 className="text-sm font-bold text-white/80 uppercase tracking-[0.1em] mb-4">Roles Needed</h3>
                    <div className="flex flex-wrap gap-2">
                      {project.roles_needed.map((r) => (
                        <span key={r} className="text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                          {ROLE_LABELS[r] || r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ ARCHITECTURE TAB ═══ */}
          {activeTab === 1 && (
            <motion.div key="arch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-8">
                <h3 className="text-sm font-bold text-white/80 uppercase tracking-[0.1em] mb-2">Architecture Breakdown</h3>
                <p className="text-[10px] text-violet-400/60 uppercase tracking-[0.15em] font-bold mb-6">⟠ {project.architecture_focus}</p>
                {project.architecture_breakdown ? (
                  <div className="text-white/40 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-white/[0.02] rounded-xl p-6 border border-white/[0.04]">
                    {project.architecture_breakdown}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-white/20 text-sm">Architecture documentation not yet added.</p>
                    {isOwner && (
                      <button onClick={() => setActiveTab(0)} className="text-violet-400 text-xs mt-2 hover:text-violet-300">
                        Edit project to add architecture details
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ TASK BOARD TAB (Kanban) ═══ */}
          {activeTab === 2 && (
            <motion.div key="tasks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* New Task Input */}
              {(isOwner || isMember) && (
                <div className="flex gap-3 mb-8">
                  <input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new task..."
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                    className="flex-grow px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-violet-500/40"
                  />
                  <div className="tab-btn rounded-xl cursor-pointer">
                    <span className="tab-orb tab-orb1" />
                    <span className="tab-orb tab-orb2" />
                    <span className="tab-orb tab-orb3" />
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="tab-label w-full h-full bg-transparent border-none text-white focus:outline-none appearance-none px-6 py-3 font-bold text-xs uppercase tracking-[0.2em] cursor-pointer"
                    >
                      <option value="low" className="bg-[#1A1030]">Low</option>
                      <option value="medium" className="bg-[#1A1030]">Medium</option>
                      <option value="high" className="bg-[#1A1030]">High</option>
                      <option value="critical" className="bg-[#1A1030]">Critical</option>
                    </select>
                  </div>
                  <button
                    onClick={handleCreateTask}
                    className="tab-btn px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em]"
                  >
                    <span className="tab-orb tab-orb1" />
                    <span className="tab-orb tab-orb2" />
                    <span className="tab-orb tab-orb3" />
                    <span className="tab-label">Add</span>
                  </button>
                </div>
              )}

              {/* Kanban Board */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {KANBAN_COLS.map((col) => {
                  const colTasks = (project.tasks || []).filter((t) => t.status === col.id);
                  return (
                    <div key={col.id} className={`bg-white/[0.015] rounded-2xl border ${col.color} p-4 min-h-[300px]`}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">{col.label}</span>
                        <span className="text-[10px] text-white/20 ml-auto">{colTasks.length}</span>
                      </div>
                      <div className="space-y-2">
                        {colTasks.map((task) => (
                          <div
                            key={task._id}
                            className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3 hover:border-white/10 transition-all group"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="text-sm text-white/60 font-medium leading-tight">{task.title}</span>
                              <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] || ''}`}>
                                {task.priority}
                              </span>
                            </div>
                            {task.assigned_name && (
                              <span className="text-[10px] text-white/25">{task.assigned_name}</span>
                            )}
                            {/* Quick status change */}
                            {(isOwner || isMember) && (
                              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {KANBAN_COLS.filter((c) => c.id !== col.id).map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => handleUpdateTaskStatus(task._id, c.id)}
                                    className="text-[8px] text-white/20 hover:text-white/50 px-1.5 py-0.5 rounded bg-white/[0.03] hover:bg-white/[0.06] transition-all"
                                  >
                                    → {c.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {colTasks.length === 0 && (
                          <div className="text-center py-8 text-white/10 text-[10px] uppercase tracking-wider">Empty</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ TEAM TAB ═══ */}
          {activeTab === 3 && (
            <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Members */}
                <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6">
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-[0.1em] mb-6">Team Members</h3>
                  <div className="space-y-3">
                    {(project.members || []).map((member) => (
                      <div key={member._id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-white">{member.user_name.charAt(0)}</span>
                        </div>
                        <div className="flex-grow">
                          <span className="text-sm text-white/70 font-medium block">{member.user_name}</span>
                          <span className="text-[10px] text-violet-400/60 uppercase tracking-wider font-bold">{ROLE_LABELS[member.role] || member.role}</span>
                        </div>
                        {member.role === 'lead' && (
                          <span className="text-[8px] bg-violet-500/20 text-violet-300 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Lead</span>
                        )}
                      </div>
                    ))}
                    {(!project.members || project.members.length === 0) && (
                      <p className="text-white/20 text-sm text-center py-6">No team members yet</p>
                    )}
                  </div>
                </div>

                {/* Join Requests (owner only) */}
                {isOwner && (
                  <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-white/80 uppercase tracking-[0.1em]">Join Requests</h3>
                      {pendingRequestCount > 0 && (
                        <span className="text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2.5 py-1 rounded-full">
                          {pendingRequestCount} pending
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {(project.join_requests || []).filter((jr) => jr.status === 'pending').map((jr) => (
                        <div key={jr._id} className="p-4 bg-white/[0.02] rounded-xl border border-amber-500/10 hover:border-amber-500/20 transition-all">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/40 to-orange-600/40 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-white">{jr.user_name.charAt(0)}</span>
                            </div>
                            <div className="flex-grow">
                              <span className="text-sm text-white/70 font-medium block">{jr.user_name}</span>
                              <span className="text-[10px] text-violet-400/60 uppercase tracking-wider font-bold">wants to join as {ROLE_LABELS[jr.role_requested] || jr.role_requested}</span>
                            </div>
                          </div>
                          {jr.message && (
                            <p className="text-white/30 text-xs mb-3 ml-11 bg-white/[0.02] rounded-lg p-2 border border-white/[0.04] italic">"{jr.message}"</p>
                          )}
                          <div className="flex gap-2 ml-11">
                            <button
                              onClick={() => handleJoinAction(jr._id, 'accepted')}
                              className="flex-1 py-2 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-500/25 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                              Accept
                            </button>
                            <button
                              onClick={() => handleJoinAction(jr._id, 'rejected')}
                              className="flex-1 py-2 bg-red-500/15 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-red-500/25 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                      {(project.join_requests || []).filter((jr) => jr.status === 'pending').length === 0 && (
                        <div className="text-center py-6">
                          <svg className="w-8 h-8 mx-auto mb-2 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <p className="text-white/20 text-sm">No pending requests</p>
                          <p className="text-white/10 text-xs mt-1">Share the project link to invite collaborators</p>
                        </div>
                      )}

                      {/* Past resolved requests */}
                      {(project.join_requests || []).filter((jr) => jr.status !== 'pending').length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/[0.04]">
                          <p className="text-[10px] text-white/20 uppercase tracking-wider font-bold mb-3">History</p>
                          {(project.join_requests || []).filter((jr) => jr.status !== 'pending').map((jr) => (
                            <div key={jr._id} className="flex items-center gap-2 py-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${jr.status === 'accepted' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="text-[11px] text-white/30">{jr.user_name}</span>
                              <span className="text-[10px] text-white/15">— {jr.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Non-owner, non-member: show join nudge on Team tab */}
                {!isOwner && !isMember && project.status === 'open' && (
                  <div className="bg-gradient-to-br from-violet-600/[0.06] to-purple-600/[0.03] rounded-2xl border border-violet-500/10 p-6 text-center">
                    <p className="text-white/40 text-sm mb-3">Want to contribute to this project?</p>
                    <button
                      onClick={() => setActiveTab(0)}
                      className="px-5 py-2.5 bg-violet-600 text-white font-bold text-[10px] uppercase tracking-[0.15em] rounded-xl hover:bg-violet-500 transition-colors"
                    >
                      Go to Overview → Join
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ DISCUSSION TAB ═══ */}
          {activeTab === 4 && (
            <motion.div key="discussion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6">
                <h3 className="text-sm font-bold text-white/80 uppercase tracking-[0.1em] mb-6">Discussion Thread</h3>

                {/* Comments */}
                <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto pr-2">
                  {(project.comments || []).map((comment) => (
                    <div key={comment._id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/50 to-purple-600/50 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-white">{comment.user_name.charAt(0)}</span>
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-white/60 font-medium">{comment.user_name}</span>
                          <span className="text-[10px] text-white/15">
                            {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-white/40 text-sm leading-relaxed bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!project.comments || project.comments.length === 0) && (
                    <p className="text-white/20 text-sm text-center py-8">No messages yet. Start the conversation!</p>
                  )}
                </div>

                {/* New Comment Input */}
                {user && (
                  <div className="flex gap-3 pt-4 border-t border-white/[0.04]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-white">{(user.full_name || user.email || 'U').charAt(0)}</span>
                    </div>
                    <div className="flex-grow flex gap-2">
                      <input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a message..."
                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                        className="flex-grow px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-violet-500/40"
                      />
                      <button
                        onClick={handlePostComment}
                        className="tab-btn px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.15em]"
                      >
                        <span className="tab-orb tab-orb1" />
                        <span className="tab-orb tab-orb2" />
                        <span className="tab-orb tab-orb3" />
                        <span className="tab-label">Send</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Proof of Skill Banner (for completed projects) ── */}
        {project.status === 'completed' && isMember && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 bg-gradient-to-r from-emerald-600/10 to-teal-600/5 rounded-2xl border border-emerald-500/15 p-8 text-center"
          >
            <span className="text-2xl mb-3 block">🏆</span>
            <h3 className="text-xl font-bold text-white mb-2">Project Completed!</h3>
            <p className="text-white/40 text-sm mb-4">This project has been added to your Proof-of-Skill portfolio.</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {project.skills_required.map((s, i) => (
                <span key={i} className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-500/20">
                  +{s}
                </span>
              ))}
            </div>
            <button
              onClick={() => navigate('/job-prep/portfolio')}
              className="px-6 py-3 bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-[0.2em] rounded-xl border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
            >
              View Portfolio
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SDLProjectDetail;

