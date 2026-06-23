import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { skillRoadmaps, SkillRoadmapData } from '../data/skillRoadmaps';
import { RoadmapNodeData } from '../data/roadmapData';
import ProgressHeader from '../components/roadmap/ProgressHeader';
import ChapterAccordion from '../components/roadmap/ChapterAccordion';
import FocusPanel from '../components/roadmap/FocusPanel';
import { 
  MonitorSmartphone, Database, Layers, BrainCircuit, Target, 
  PenTool, BarChart3, CloudCog, ShieldCheck, Terminal, 
  ArrowLeft, CheckCircle2, Clock, GraduationCap
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

const getLocalStorageKey = (skillId: string) => `studlyf_skill_roadmap_progress_${skillId}`;

const RoadmapPage: React.FC = () => {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  
  const selectedRoadmap = useMemo(() => {
    if (!skillId) return null;
    return skillRoadmaps[skillId] || null;
  }, [skillId]);

  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [activePanelNode, setActivePanelNode] = useState<RoadmapNodeData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress when skillId changes
  useEffect(() => {
    if (selectedRoadmap) {
      const saved = localStorage.getItem(getLocalStorageKey(selectedRoadmap.id));
      if (saved) {
        try {
          setCompletedNodes(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse skill roadmap progress', e);
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
  }, [selectedRoadmap]);

  // Save progress
  useEffect(() => {
    if (isLoaded && selectedRoadmap) {
      localStorage.setItem(getLocalStorageKey(selectedRoadmap.id), JSON.stringify(completedNodes));
    }
  }, [completedNodes, isLoaded, selectedRoadmap]);

  // Derived state
  const flatNodes = useMemo(() => {
    if (!selectedRoadmap) return [];
    return selectedRoadmap.chapters.flatMap(chapter => chapter.nodes);
  }, [selectedRoadmap]);
  
  const nextNode = useMemo(() => {
    return flatNodes.find(n => !completedNodes.includes(n.id)) || null;
  }, [flatNodes, completedNodes]);

  const activeChapterIndex = useMemo(() => {
    if (!selectedRoadmap) return 0;
    const index = selectedRoadmap.chapters.findIndex(chapter => 
      !chapter.nodes.every(n => completedNodes.includes(n.id))
    );
    return index === -1 ? selectedRoadmap.chapters.length - 1 : index;
  }, [completedNodes, selectedRoadmap]);

  // Handlers
  const handleBack = () => {
    navigate('/skill-assessment');
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

  if (!selectedRoadmap) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FC] font-sans p-6 text-center">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-lg border border-gray-100">
          <div className="text-5xl mb-4">🗺️</div>
          <h2 className="text-2xl font-black text-[#1a1a2e] mb-4">Roadmap Not Found</h2>
          <p className="text-gray-500 mb-6">
            The requested skill roadmap does not exist or is currently being prepared.
          </p>
          <button 
            onClick={handleBack}
            className="w-full py-4 bg-[#6C2BFF] text-white rounded-xl font-bold shadow-md hover:bg-[#5B21D6] transition-colors cursor-pointer border-none"
          >
            Back to Skill Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] font-sans selection:bg-[#6C2BFF] selection:text-white">
      <ProgressHeader 
        completedNodes={completedNodes}
        totalNodes={flatNodes.length}
        nextNode={nextNode}
        activeNode={isPanelOpen ? activePanelNode : null}
      />

      <div className="flex-grow pb-32">
        <main className="max-w-4xl mx-auto px-6 pt-32">
          
          {/* Back button */}
          <div className="mb-12">
            <button 
              onClick={handleBack}
              className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#6C2BFF] transition-colors mb-6 group border-none bg-transparent cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Assessment
            </button>
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10">
              <div className="w-20 h-20 rounded-[2rem] bg-white border border-gray-200 flex items-center justify-center text-[#6C2BFF] shadow-sm flex-shrink-0">
                 {iconMap[selectedRoadmap.iconName] || <Terminal className="w-10 h-10" />}
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-[#1A1A1A] tracking-tight mb-2">
                  {selectedRoadmap.title} <br className="hidden md:block"/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BFF] to-[#EC4899]">Execution Pathway.</span>
                </h1>
                <p className="text-gray-500 font-medium text-lg max-w-2xl">{selectedRoadmap.description}</p>
              </div>
            </div>

            {/* Grid for why/how */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Why This Skill Matters */}
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C2BFF]/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                <div className="relative z-10">
                  <span className="text-[10px] font-black text-[#6C2BFF] uppercase tracking-[0.2em] mb-4 block">Industry Context</span>
                  <h3 className="text-2xl font-black text-[#1A1A1A] mb-4">Why This Skill Matters</h3>
                  <p className="text-gray-600 font-medium text-sm leading-relaxed mb-6">
                    {selectedRoadmap.importanceDescription || "This skill is critical for building modern technology systems and driving business growth."}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {(selectedRoadmap.importanceStats || []).map((stat, idx) => (
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

              {/* Guide to Using the Roadmap */}
              <div className="bg-[#1A1A1A] text-white border border-gray-800 rounded-3xl p-8 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#EC4899]/20 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <span className="text-[10px] font-black text-[#EC4899] uppercase tracking-[0.2em] mb-4 block">Usage Guide</span>
                  <h3 className="text-2xl font-black mb-4">How This Roadmap Works</h3>
                  <p className="text-gray-400 font-medium text-sm leading-relaxed mb-6">
                    This roadmap is designed to remove confusion. You never need to wonder what to learn next. Complete one step at a time, and the next chapter unlocks automatically. Build consistency, not speed.
                  </p>
                  
                  {/* Visual Progression UI */}
                  <div className="bg-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-bold uppercase tracking-widest text-center">
                    <span className="text-white">STEP 1</span>
                    <ArrowLeft className="w-4 h-4 text-gray-500 hidden sm:block rotate-180" />
                    <span className="text-[#EC4899] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> COMPLETE</span>
                    <ArrowLeft className="w-4 h-4 text-gray-500 hidden sm:block rotate-180" />
                    <span className="text-gray-400">STEP 2 UNLOCKED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chapters */}
          <div className="space-y-6">
            {selectedRoadmap.chapters.map((chapter, index) => {
              const isPast = index < activeChapterIndex;
              const isActive = index === activeChapterIndex;
              const isFuture = index > activeChapterIndex;

              return (
                <ChapterAccordion 
                  key={chapter.id}
                  chapter={chapter}
                  isActive={isActive}
                  isPast={isPast}
                  isFuture={isFuture}
                  completedNodes={completedNodes}
                  onNodeClick={handleNodeClick}
                />
              );
            })}
          </div>

        </main>

        {/* Slide-out execution workspace */}
        <FocusPanel 
          node={activePanelNode}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          isCompleted={activePanelNode ? completedNodes.includes(activePanelNode.id) : false}
          onToggleComplete={handleToggleComplete}
        />
      </div>
    </div>
  );
};

export default RoadmapPage;
