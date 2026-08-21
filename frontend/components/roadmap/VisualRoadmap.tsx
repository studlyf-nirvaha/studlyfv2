import React from 'react';
import { motion } from 'framer-motion';
import { RoadmapChapter, RoadmapNodeData, RoleData } from '../../data/roadmapData';
import { CheckCircle2, Lock, Play, ArrowDown, HelpCircle, ExternalLink } from 'lucide-react';

interface VisualRoadmapProps {
  role: RoleData;
  completedNodes: string[];
  activeChapterIndex: number;
  onNodeClick: (node: RoadmapNodeData) => void;
}

export const VisualRoadmap: React.FC<VisualRoadmapProps> = ({
  role,
  completedNodes,
  activeChapterIndex,
  onNodeClick
}) => {
  return (
    <div className="w-full py-10 flex flex-col items-center select-none relative">
      
      {/* Background Decorative Grid lines to look like roadmap.sh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      {/* Start Node */}
      <div className="relative z-10 flex flex-col items-center mb-16">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="px-6 py-3 bg-[#1A1A1A] text-white font-extrabold uppercase text-xs tracking-widest rounded-2xl border border-gray-800 shadow-md"
        >
          Start here
        </motion.div>
        <div className="w-0.5 h-16 bg-gradient-to-b from-[#1A1A1A] to-[#6C2BFF] relative">
          <ArrowDown className="w-4 h-4 text-[#6C2BFF] absolute bottom-0 -left-[7px]" />
        </div>
      </div>

      {/* Chapters & Nodes List */}
      <div className="w-full flex flex-col items-center gap-16 relative z-10">
        {role.chapters.map((chapter, chapIdx) => {
          const isPast = chapIdx < activeChapterIndex;
          const isActive = chapIdx === activeChapterIndex;
          const isFuture = chapIdx > activeChapterIndex;
          
          const isChapterComplete = chapter.nodes.every(n => completedNodes.includes(n.id));

          return (
            <div key={chapter.id} className="w-full max-w-4xl flex flex-col items-center relative">
              
              {/* Connector from previous chapter (except index 0 which has start here arrow) */}
              {chapIdx > 0 && (
                <div className="absolute -top-16 bottom-full w-0.5 left-1/2 -translate-x-1/2">
                  <div className={`w-full h-16 ${
                    isPast 
                      ? 'bg-emerald-500' 
                      : isActive 
                        ? 'bg-gradient-to-b from-emerald-500 to-[#6C2BFF] dashed' 
                        : 'bg-gray-200'
                  }`} />
                  <ArrowDown className={`w-3.5 h-3.5 absolute -bottom-1 -left-[6px] ${
                    isActive ? 'text-[#6C2BFF]' : isPast ? 'text-emerald-500' : 'text-gray-300'
                  }`} />
                </div>
              )}

              {/* Chapter Main Title Bubble */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                className={`px-8 py-4 rounded-3xl border text-center transition-all duration-300 relative z-20 shadow-md ${
                  isFuture 
                    ? 'bg-gray-50 border-gray-100 text-gray-400' 
                    : isPast 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-extrabold'
                      : 'bg-white border-[#6C2BFF]/30 text-[#1A1A1A] font-black ring-4 ring-[#6C2BFF]/10'
                }`}
              >
                <div className="flex items-center gap-2.5 justify-center">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isFuture 
                      ? 'bg-gray-200/50 text-gray-400' 
                      : isPast 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-[#6C2BFF] text-white'
                  }`}>
                    Phase {chapIdx + 1}
                  </span>
                  <h3 className="text-sm sm:text-base tracking-tight">{chapter.title}</h3>
                </div>
              </motion.div>

              {/* SVG Connectors to Nodes */}
              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 relative px-4">
                {chapter.nodes.map((node, nodeIdx) => {
                  const isCompleted = completedNodes.includes(node.id);
                  const isLocked = isFuture;

                  return (
                    <motion.div
                      key={node.id}
                      initial={{ scale: 0.95, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true, margin: "-50px" }}
                      onClick={() => !isLocked && onNodeClick(node)}
                      className={`relative rounded-2xl border p-5 transition-all duration-300 flex flex-col justify-between ${
                        isLocked 
                          ? 'bg-gray-50/70 border-gray-100/80 cursor-not-allowed opacity-60' 
                          : isCompleted 
                            ? 'bg-white border-emerald-200 hover:border-emerald-400 hover:shadow-[0_10px_30px_rgba(16,185,129,0.08)] cursor-pointer' 
                            : 'bg-white border-gray-200 hover:border-[#6C2BFF]/40 hover:shadow-[0_10px_30px_rgba(108,43,255,0.08)] cursor-pointer'
                      }`}
                    >
                      {/* Top line indicator for locked vs unlocked */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${
                        isLocked 
                          ? 'bg-gray-200' 
                          : isCompleted 
                            ? 'bg-emerald-500' 
                            : 'bg-gradient-to-r from-[#6C2BFF] to-[#EC4899]'
                      }`} />

                      <div className="mb-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isLocked 
                              ? 'bg-gray-100 text-gray-400' 
                              : isCompleted 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {isLocked ? 'Locked' : isCompleted ? 'Completed' : 'Learn Next'}
                          </span>
                          
                          {/* Node Icon Status */}
                          <div>
                            {isLocked ? (
                              <Lock className="w-4 h-4 text-gray-300" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Play className="w-4 h-4 text-[#6C2BFF] animate-pulse" />
                            )}
                          </div>
                        </div>

                        <h4 className={`text-sm font-black tracking-tight ${
                          isLocked ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          {node.title}
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium line-clamp-2 mt-1">
                          {node.simpleExplanation}
                        </p>
                      </div>

                      {/* Micro Footer links inside cards */}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <span>{node.keyConcepts?.length || 0} Key Concepts</span>
                        {!isLocked && (
                          <span className="text-[#6C2BFF] group-hover:underline flex items-center gap-0.5">
                            Details →
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {/* Complete/End Flag */}
      <div className="mt-16 flex flex-col items-center">
        <div className="w-0.5 h-16 bg-gray-200" />
        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black shadow-md border-4 border-white animate-bounce">
          ✓
        </div>
        <span className="text-xs font-black uppercase text-gray-400 tracking-widest mt-2">Mastery Unlocked</span>
      </div>

    </div>
  );
};
