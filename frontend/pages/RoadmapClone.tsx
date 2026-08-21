import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { rolesData, getFlatNodes, RoadmapNodeData, RoleData } from '../data/roadmapData';
import ProgressHeader from '../components/roadmap/ProgressHeader';
import ChapterAccordion from '../components/roadmap/ChapterAccordion';
import FocusPanel from '../components/roadmap/FocusPanel';
import { VisualRoadmap } from '../components/roadmap/VisualRoadmap';
import { 
  MonitorSmartphone, Database, Layers, BrainCircuit, Target, 
  PenTool, BarChart3, CloudCog, ShieldCheck, Terminal, 
  ArrowLeft, CheckCircle2, ListOrdered, GraduationCap, Clock, Share2, Check, Bookmark, LayoutGrid, List
} from 'lucide-react';

// Icon Map
const iconMap: Record<string, React.ReactNode> = {
  MonitorSmartphone: <MonitorSmartphone className="w-6 h-6" />,
  Database: <Database className="w-6 h-6" />,
  Layers: <Layers className="w-6 h-6" />,
  BrainCircuit: <BrainCircuit className="w-6 h-6" />,
  Target: <Target className="w-6 h-6" />,
  PenTool: <PenTool className="w-6 h-6" />,
  BarChart3: <BarChart3 className="w-6 h-6" />,
  CloudCog: <CloudCog className="w-6 h-6" />,
  ShieldCheck: <ShieldCheck className="w-6 h-6" />,
  Terminal: <Terminal className="w-6 h-6" />
};

const getLocalStorageKey = (roleId: string) => `studlyf_roadmap_progress_${roleId}`;

const RoadmapClone: React.FC = () => {
  // Global State (URL Driven)
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const [copiedRoleId, setCopiedRoleId] = useState<string | null>(null);
  const [bookmarkedRoleIds, setBookmarkedRoleIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'bookmarked'>('all');
  const [viewMode, setViewMode] = useState<'visual' | 'list'>('visual');

  useEffect(() => {
    const saved = localStorage.getItem('studlyf_bookmarked_roadmaps');
    if (saved) {
      try {
        setBookmarkedRoleIds(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleToggleBookmark = (id: string) => {
    setBookmarkedRoleIds(prev => {
      const updated = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('studlyf_bookmarked_roadmaps', JSON.stringify(updated));
      return updated;
    });
  };

  const selectedRole = useMemo(() => {
    return rolesData.find(r => r.id === roleId) || null;
  }, [roleId]);

  // Execution State
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [activePanelNode, setActivePanelNode] = useState<RoadmapNodeData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress when a role is selected
  useEffect(() => {
    if (selectedRole) {
      const saved = localStorage.getItem(getLocalStorageKey(selectedRole.id));
      if (saved) {
        try {
          setCompletedNodes(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse roadmap progress', e);
          setCompletedNodes([]);
        }
      } else {
        setCompletedNodes([]);
      }
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
      setCompletedNodes([]);
    }
  }, [selectedRole]);

  // Save progress
  useEffect(() => {
    if (isLoaded && selectedRole) {
      localStorage.setItem(getLocalStorageKey(selectedRole.id), JSON.stringify(completedNodes));
    }
  }, [completedNodes, isLoaded, selectedRole]);

  // Derived state
  const flatNodes = useMemo(() => selectedRole ? getFlatNodes(selectedRole.id) : [], [selectedRole]);
  
  const nextNode = useMemo(() => {
    return flatNodes.find(n => !completedNodes.includes(n.id)) || null;
  }, [flatNodes, completedNodes]);

  const activeChapterIndex = useMemo(() => {
    if (!selectedRole) return 0;
    const index = selectedRole.chapters.findIndex(chapter => 
      !chapter.nodes.every(n => completedNodes.includes(n.id))
    );
    return index === -1 ? selectedRole.chapters.length - 1 : index;
  }, [completedNodes, selectedRole]);

  // Handlers
  const handleRoleSelect = (role: RoleData) => {
    localStorage.setItem('studlyf_last_selected_role', role.id);
    navigate(`/roadmaps/${role.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToRoles = () => {
    navigate('/roadmaps');
    setIsPanelOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNodeClick = (node: RoadmapNodeData) => {
    setActivePanelNode(node);
    setIsPanelOpen(true);
  };

  const handleToggleComplete = (id: string) => {
    setCompletedNodes(prev => {
      if (prev.includes(id)) {
        return prev.filter(n => n !== id);
      }
      return [...prev, id];
    });
  };

  // --- RENDERING ---

  if (!selectedRole) {
    // ----------------------------
    // LANDING MODE
    // ----------------------------
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F9FC] font-sans selection:bg-[#6C2BFF] selection:text-white">
        <div className="flex-grow">
          
        {/* SECTION 1: HERO */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[#6C2BFF]/10 to-transparent rounded-full blur-[100px] pointer-events-none transform translate-x-1/3 -translate-y-1/3 z-0" />
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#EC4899]/5 to-transparent rounded-full blur-[80px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-0" />
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 max-w-4xl mx-auto"
          >
            <span className="inline-block px-4 py-1.5 bg-white border border-[#6C2BFF]/20 text-[#6C2BFF] text-[10px] font-black uppercase tracking-[0.25em] rounded-full mb-6 shadow-sm">
              The Execution Operating System
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-[#1A1A1A] mb-6 tracking-tight leading-[1.05]">
              Master Your Career Roadmap <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BFF] to-[#EC4899]">Without the Noise.</span>
            </h1>
            <p className="text-gray-500 text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto mb-10">
              A focused, execution-first path to becoming industry ready. No overwhelming graphs. No random tutorials. Just structured progress.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => {
                  const savedRole = localStorage.getItem('studlyf_last_selected_role') || 'frontend-developer';
                  navigate(`/roadmaps/${savedRole}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 bg-[#1A1A1A] text-white rounded-xl font-bold text-sm shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(108,43,255,0.3)] hover:bg-[#6C2BFF] transition-all hover:-translate-y-1 cursor-pointer"
              >
                Start Your Roadmap
              </button>
              <button 
                onClick={() => {
                  const el = document.getElementById('roles-section');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full sm:w-auto px-8 py-4 bg-white text-[#1A1A1A] border border-gray-200 rounded-xl font-bold text-sm hover:border-gray-300 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
              >
                Explore Roles
              </button>
            </div>
          </motion.div>
        </section>

        {/* SECTION 5: GAMIFIED PREVIEW (Placed high to motivate) */}
        <section className="max-w-5xl mx-auto px-6 mb-32 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-[2rem] p-6 md:p-8 shadow-2xl overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#6C2BFF]/5 to-transparent pointer-events-none" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress Demo</span>
                  <span className="text-lg font-black text-[#1A1A1A]">35%</span>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[#6C2BFF] to-[#EC4899]"
                    initial={{ width: "0%" }}
                    animate={{ width: "35%" }}
                    transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
                  />
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Current Milestone</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#6C2BFF] animate-pulse" />
                    <span className="font-bold text-[#1A1A1A] text-sm">React Fundamentals</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Next Objective</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="font-bold text-gray-600 text-sm">Client-Side Routing</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* SECTION 2: CHOOSE YOUR PATH (ROLE CARDS) */}
        <section id="roles-section" style={{ scrollMarginTop: '100px' }} className="py-20 bg-white border-y border-gray-100 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-[#1A1A1A] tracking-tight mb-4">Choose Your Track</h2>
              <p className="text-gray-500 text-lg">Select a role to generate your personalized execution roadmap.</p>
            </div>
            {/* Filter Tabs */}
            <div className="flex justify-center gap-3 mb-12">
              <button
                onClick={() => setFilterTab('all')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${
                  filterTab === 'all'
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-md'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:shadow-sm hover:text-gray-800'
                }`}
              >
                All Tracks
              </button>
              <button
                onClick={() => setFilterTab('bookmarked')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${
                  filterTab === 'bookmarked'
                    ? 'bg-[#6C2BFF] text-white border-[#6C2BFF] shadow-md'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:shadow-sm hover:text-gray-800'
                }`}
              >
                ⭐ Bookmarked
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                const displayedRoles = filterTab === 'all' 
                  ? rolesData 
                  : rolesData.filter(role => bookmarkedRoleIds.includes(role.id));
                
                if (displayedRoles.length === 0) {
                  return (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                      <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-700 mb-1">No Bookmarked Tracks</h3>
                      <p className="text-sm text-gray-400">Click the bookmark icon on any track to save it here.</p>
                    </div>
                  );
                }

                return displayedRoles.map((role, idx) => (
                  <motion.div
                    key={role.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleRoleSelect(role)}
                    className="bg-[#F8F9FC] border border-gray-100 rounded-3xl p-6 cursor-pointer group hover:bg-white hover:shadow-[0_20px_50px_rgba(108,43,255,0.1)] hover:border-[#6C2BFF]/20 transition-all duration-300 flex flex-col relative"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBookmark(role.id);
                      }}
                      className="absolute top-6 right-16 w-8 h-8 bg-white hover:bg-gray-50 text-gray-400 hover:text-amber-500 rounded-lg border border-gray-100 hover:border-gray-200 flex items-center justify-center transition-all duration-200 shadow-sm z-10"
                      title={bookmarkedRoleIds.includes(role.id) ? "Remove Bookmark" : "Bookmark Roadmap"}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${bookmarkedRoleIds.includes(role.id) ? "fill-amber-400 text-amber-400" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const absoluteUrl = `${window.location.origin}/roadmaps/${role.id}`;
                        navigator.clipboard.writeText(absoluteUrl).then(() => {
                          setCopiedRoleId(role.id);
                          setTimeout(() => setCopiedRoleId(null), 2000);
                        });
                      }}
                      className="absolute top-6 right-6 w-8 h-8 bg-white hover:bg-gray-50 text-gray-400 hover:text-[#6C2BFF] rounded-lg border border-gray-100 hover:border-gray-200 flex items-center justify-center transition-all duration-200 shadow-sm z-10"
                      title="Share Roadmap"
                    >
                      {copiedRoleId === role.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-[#6C2BFF] group-hover:scale-110 transition-all shadow-sm mb-6">
                    {iconMap[role.iconName] || <Terminal className="w-6 h-6" />}
                  </div>
                  
                  <h3 className="text-xl font-black text-[#1A1A1A] mb-2 group-hover:text-[#6C2BFF] transition-colors">{role.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-grow">{role.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-auto">
                    <span className="text-[10px] font-bold px-3 py-1 bg-white border border-gray-200 rounded-full text-gray-600 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {role.timeline}
                    </span>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                      role.difficulty === 'Beginner Friendly' ? 'bg-green-50 text-green-600 border border-green-100' :
                      role.difficulty === 'Intermediate' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      'bg-purple-50 text-purple-600 border border-purple-100'
                    }`}>
                      <GraduationCap className="w-3 h-3" /> {role.difficulty}
                    </span>
                  </div>
                </motion.div>
                ));
              })()}
            </div>
          </div>
        </section>

        {/* SECTION 3: WHY IT'S DIFFERENT */}
        <section className="py-24 px-6 bg-[#0B0B0F] text-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-[#6C2BFF] text-[10px] font-black uppercase tracking-widest mb-4 block">The Problem & The Solution</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight">Why This Roadmap Is Different</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: 'No Information Overload', desc: 'Massive engineering graphs cause analysis paralysis. We hide future steps until you are ready, using progressive disclosure.', icon: <CheckCircle2 className="w-6 h-6" /> },
                { title: 'Learn in the Right Sequence', desc: 'No jumping randomly between tutorials. Follow a strict linear path optimized for concept retention.', icon: <ListOrdered className="w-6 h-6" /> },
                { title: 'Track Progress Automatically', desc: 'Your progress saves directly on your device using local storage. No accounts, no passwords, zero friction.', icon: <Database className="w-6 h-6" /> },
                { title: 'Curated Resources Only', desc: 'We provide exactly ONE official or highly trusted documentation link per node. No YouTube tutorial chaos.', icon: <Target className="w-6 h-6" /> }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors">
                  <div className="w-12 h-12 bg-[#6C2BFF]/20 rounded-xl flex items-center justify-center text-[#A78BFA] mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-black mb-3">{item.title}</h3>
                  <p className="text-white/60 font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        </div>
      </div>
    );
  }

  // ----------------------------
  // EXECUTION MODE
  // ----------------------------
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] font-sans selection:bg-[#6C2BFF] selection:text-white">
      <div className="flex-grow pb-32">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28">
          
          {/* Track Header & Hero Info */}
        <div className="mb-10">
          <button 
            onClick={handleBackToRoles}
            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#6C2BFF] transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Roles
          </button>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10">
            <div className="w-20 h-20 rounded-[2rem] bg-white border border-gray-200 flex items-center justify-center text-[#6C2BFF] shadow-sm flex-shrink-0">
               {iconMap[selectedRole.iconName] || <Terminal className="w-10 h-10" />}
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-[#1A1A1A] tracking-tight mb-2">
                Become {['a','e','i','o','u'].includes(selectedRole.title.charAt(0).toLowerCase()) ? 'an' : 'a'} {selectedRole.title} <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BFF] to-[#EC4899]">Without the Chaos.</span>
              </h1>
              <p className="text-gray-500 font-medium text-lg max-w-2xl">{selectedRole.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Why This Role Matters Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C2BFF]/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
              <div className="relative z-10">
                <span className="text-[10px] font-black text-[#6C2BFF] uppercase tracking-[0.2em] mb-4 block">Industry Context</span>
                <h3 className="text-2xl font-black text-[#1A1A1A] mb-4">Why This Role Matters</h3>
                <p className="text-gray-600 font-medium text-sm leading-relaxed mb-6">
                  {selectedRole.importanceDescription || "This role is critical for building modern technology systems and driving business growth."}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {(selectedRole.importanceStats || []).map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center text-[#6C2BFF] flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* How This Roadmap Works */}
            <div className="bg-[#1A1A1A] text-white border border-gray-800 rounded-3xl p-8 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#EC4899]/20 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[10px] font-black text-[#EC4899] uppercase tracking-[0.2em] mb-4 block">Usage Guide</span>
                <h3 className="text-2xl font-black mb-4">How This Roadmap Works</h3>
                <p className="text-gray-400 font-medium text-sm leading-relaxed mb-6">
                  This roadmap is designed to remove confusion. You never need to wonder what to learn next. Complete one step at a time, and the next chapter unlocks automatically. Build consistency, not speed.
                </p>
                
                {/* Dynamic Visual Progression UI */}
                {(() => {
                  const currentChapter = selectedRole ? selectedRole.chapters[activeChapterIndex] : null;
                  const nextChapter = selectedRole && activeChapterIndex < selectedRole.chapters.length - 1 
                    ? selectedRole.chapters[activeChapterIndex + 1] 
                    : null;
                  const currentDoneCount = currentChapter ? currentChapter.nodes.filter(n => completedNodes.includes(n.id)).length : 0;
                  const totalInCurrent = currentChapter?.nodes.length || 0;
                  const isCurrentChapterComplete = currentChapter ? currentChapter.nodes.every(n => completedNodes.includes(n.id)) : false;
                  const isEntireRoadmapComplete = selectedRole ? selectedRole.chapters.every(c => c.nodes.every(n => completedNodes.includes(n.id))) : false;

                  return (
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                      {isEntireRoadmapComplete ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider py-1">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>ALL PHASES COMPLETED! INDUSTRY READY 🎉</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 text-xs font-semibold">
                          {/* Phase Header & Progress Pill */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-[#EC4899] animate-pulse flex-shrink-0" />
                              <span className="text-white font-bold tracking-wider truncate">
                                PHASE {activeChapterIndex + 1}: {currentChapter?.title}
                              </span>
                            </div>

                            {isCurrentChapterComplete ? (
                              <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex-shrink-0 uppercase">
                                COMPLETE ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex-shrink-0 uppercase">
                                IN PROGRESS ({currentDoneCount}/{totalInCurrent})
                              </span>
                            )}
                          </div>

                          {/* Next Step Footer */}
                          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-white/10">
                            <span className="font-medium">Up Next:</span>
                            <span className="font-bold text-gray-300 truncate">
                              {nextChapter ? `Phase ${activeChapterIndex + 2}: ${nextChapter.title}` : 'Final Career Mastery'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center md:justify-end items-center gap-3 mb-6 relative z-20 mt-8">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">View Format:</span>
          <div className="flex bg-white border border-gray-200 p-1 rounded-2xl shadow-sm">
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'visual'
                  ? 'bg-[#6C2BFF] text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Interactive Graph</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'list'
                  ? 'bg-[#6C2BFF] text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Accordion List</span>
            </button>
          </div>
        </div>

        {/* Sticky Progress Header */}
        <ProgressHeader 
          completedNodes={completedNodes}
          totalNodes={flatNodes.length}
          nextNode={nextNode}
          activeNode={isPanelOpen ? activePanelNode : null}
        />

        {/* Roadmap Content */}
        {viewMode === 'visual' ? (
          <VisualRoadmap
            role={selectedRole}
            completedNodes={completedNodes}
            activeChapterIndex={activeChapterIndex}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className="space-y-6">
            {selectedRole.chapters.map((chapter, index) => {
              const isPast = index < activeChapterIndex;
              const isActive = index === activeChapterIndex;
              const isFuture = index > activeChapterIndex;

              return (
                <ChapterAccordion 
                  key={chapter.id}
                  chapter={chapter}
                  chapterIndex={index}
                  isActive={isActive}
                  isPast={isPast}
                  isFuture={isFuture}
                  completedNodes={completedNodes}
                  onNodeClick={handleNodeClick}
                />
              );
            })}
          </div>
        )}

      </main>

        {/* Slide-out Execution Workspace */}
        <FocusPanel 
          node={activePanelNode}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          isCompleted={activePanelNode ? completedNodes.includes(activePanelNode.id) : false}
          onToggleComplete={handleToggleComplete}
          allNodes={flatNodes}
          onSelectNode={setActivePanelNode}
        />
      </div>
    </div>
  );
};

export default RoadmapClone;

