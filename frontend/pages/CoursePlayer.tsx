import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useCourseProgress from '../hooks/useCourseProgress';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../apiConfig';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  ChevronDown, ChevronLeft, ChevronRight, FileText, HelpCircle,
  CheckCircle2, Menu, X, BookOpen, MessageCircle, StickyNote,
  AlignLeft, Code, Award, Trophy, ShieldAlert, Link, AlertTriangle, Link as LinkIcon, FileText as FileTextIcon, PlayCircle as PlayCircleIcon, Code2 as Code2Icon, Download as DownloadIcon, Lock
} from 'lucide-react';
import { ResourcesTab } from '../components/ResourcesTab';
import { getDetailedCurriculum } from '../utils/curriculumUtils';

/* ═══════ Types ═══════ */
interface Lesson {
  type: 'overview' | 'text' | 'theory' | 'practice_quiz' | 'quiz' | 'graded_quiz';
  title: string;
}

interface Module {
  _id: string;
  title: string;
  order_index: number;
  estimated_time: string;
  lessons: Lesson[];
  progress?: {
    status: string;
    completed_lessons?: string[];
    theory_completed: boolean;
    video_completed: boolean;
    quiz_score: number;
    quiz_answers: number[][];
    project_status: string;
    review_status?: string;
  };
}

type LessonType = 'overview' | 'text' | 'theory' | 'practice_quiz' | 'graded_quiz' | 'quiz' | 'capstone' | 'result';

interface FlatLesson {
  moduleIndex: number;
  lessonIndex: number;
  type: LessonType;
  title: string;
}

/* ═══════ Helpers ═══════ */
const extractCourseId = (slug?: string) => {
  if (!slug) return '';
  const parts = slug.split('--');
  return parts.length > 1 ? parts[parts.length - 1] : slug;
};

const getLessonLabel = (type: LessonType): string => {
  if (type === 'overview') return 'Overview';
  if (type === 'text' || type === 'theory') return 'Topic Content';
  if (type === 'practice_quiz') return 'Practice Checkpoint';
  return 'Graded Assignment';
};

const DUMMY_TRANSCRIPT: { time: string; text: string }[] = [
  { time: "0:00", text: "Welcome to this reading module." },
  { time: "0:30", text: "In this lesson, we will focus on core written material." },
  { time: "1:00", text: "Please review the notes and complete the quizzes to unlock the next steps." }
];

const estimateReadingTime = (content: string) => {
  if (!content) return 1;
  const words = content.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 200);
  return minutes || 1;
};

/* ═══════ Component ═══════ */
const CoursePlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const resolvedCourseId = extractCourseId(courseId);
  const curriculumSource = useMemo(() => getDetailedCurriculum(resolvedCourseId), [resolvedCourseId]);

  const [activeModuleIndex, setActiveModuleIndex] = useState(() => {
    const saved = localStorage.getItem(`studlyf_last_module_${resolvedCourseId}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [activeLessonIndex, setActiveLessonIndex] = useState(() => {
    const saved = localStorage.getItem(`studlyf_last_lesson_${resolvedCourseId}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [activeStage, setActiveStage] = useState<LessonType>(() => {
    const saved = localStorage.getItem(`studlyf_last_stage_${resolvedCourseId}`);
    return (saved as LessonType) || 'overview';
  });
  const [showToast, setShowToast] = useState(false);
  // ── Right-panel tool tab ──
  const [activeToolTab, setActiveToolTab] = useState<'notes' | 'transcript' | 'resources'>('notes');

  const [moduleDetails, setModuleDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [courseData, setCourseData] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);

  // Sidebar and UI state
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  // Persistent localStorage Progress State
  const {
    progressKey,
    completedSteps,
    setCompletedSteps,
    isLessonLocked,
    isModuleComplete,
    getModuleProgressPercent,
    markLessonComplete,
    submitGradedQuiz,
    updateModules,
  } = useCourseProgress({ userId: user?.uid, courseId: resolvedCourseId });

  useEffect(() => {
    if (resolvedCourseId) {
      localStorage.setItem(`studlyf_last_module_${resolvedCourseId}`, activeModuleIndex.toString());
      localStorage.setItem(`studlyf_last_lesson_${resolvedCourseId}`, activeLessonIndex.toString());
      localStorage.setItem(`studlyf_last_stage_${resolvedCourseId}`, activeStage);
    }
  }, [activeModuleIndex, activeLessonIndex, activeStage, resolvedCourseId]);

  // Ensure all modules are expanded whenever modules list changes
  useEffect(() => {
    const all = new Set<number>();
    modules.forEach((_, idx) => all.add(idx));
    setExpandedModules(all);
  }, [modules]);

  // Sync modules with useCourseProgress hook
  useEffect(() => {
    if (updateModules) {
      updateModules(modules);
    }
  }, [modules, updateModules]);

  // Quizzes State
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, number>>({});
  const [quizAnswers, setQuizAnswers] = useState<number[][]>([]);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [currentQuizQ, setCurrentQuizQ] = useState(0);

  // Project state
  const [githubLink, setGithubLink] = useState(() => localStorage.getItem(`${progressKey}_github`) || '');
  const [deployedLink, setDeployedLink] = useState(() => localStorage.getItem(`${progressKey}_deployed`) || '');

  // Completion modal
  const [completionPrompt, setCompletionPrompt] = useState<{
    open: boolean; nextIndex: number | null; moduleName: string; earnedBadge?: any;
  }>({ open: false, nextIndex: null, moduleName: '' });

  const contentRef = useRef<HTMLDivElement>(null);

  /* ── Build flat lesson list (memoized) ── */
  const flatLessons = useMemo<FlatLesson[]>(() => {
    const list: FlatLesson[] = [];
    modules.forEach((mod, i) => {
      if (mod.lessons) {
        mod.lessons.forEach((les, lesIdx) => {
          list.push({
            moduleIndex: i,
            lessonIndex: lesIdx,
            type: les.type as LessonType,
            title: les.title
          });
        });
      }
    });
    // Add Mini Project (Capstone)
    list.push({ moduleIndex: -1, lessonIndex: -1, type: 'capstone', title: 'Mini Project Submission' });
    // Add Result Page
    list.push({ moduleIndex: -3, lessonIndex: -3, type: 'result', title: 'Course Completion' });
    return list;
  }, [modules]);
  const currentFlatIndex = flatLessons.findIndex(
    l => l.moduleIndex === activeModuleIndex && l.lessonIndex === activeLessonIndex
  );

  /* ── Data Fetching ── */
  useEffect(() => {
    if (resolvedCourseId) fetchModules();
  }, [resolvedCourseId, user]);

  const fetchModules = useCallback(async () => {
    try {
      // ✅ PERF FIX: Parallel API calls instead of sequential
      const [modulesRes, courseRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/courses/${resolvedCourseId}/modules?user_id=${user?.uid || ''}`),
        fetch(`${API_BASE_URL}/api/course/${resolvedCourseId}/details?user_id=${user?.uid || ''}`)
      ]);

      const data = await modulesRes.json().catch(() => []);
      let cData: any = { title: 'Course' };
      if (courseRes.ok) {
        try {
          cData = await courseRes.json();
        } catch(e) {}
      }
      setCourseData(cData);

      let fetched = Array.isArray(data) ? data : [];

      // Fallback for courses without backend modules
      if (fetched.length === 0 && curriculumSource && curriculumSource.length > 0) {
        fetched = curriculumSource.map((_, i) => ({
          _id: `dummy-mod-${i}`,
          progress: null
        }));
      }

      // Ensure we have at least as many modules as in our local curriculum
      const totalModules = Math.max(fetched.length, curriculumSource.length);
      const formatted = Array.from({ length: totalModules }).map((_, i) => {
        const mod = fetched[i] || { _id: `dummy-mod-${i}`, progress: null };
        const curChapter = curriculumSource[i] || curriculumSource[i % curriculumSource.length];
        
        return {
          ...mod,
          title: curChapter.title,
          order_index: i + 1,
          lessons: curChapter.topics.map((t: any) => ({
            type: t.type || 'text',
            title: t.title,
          })),
        };
      });

      // Initialize completedSteps from backend progress
      const initialCompleted: Record<string, boolean> = {};
      fetched.forEach((mod: any, modIdx: number) => {
        const p = mod.progress;
        if (p) {
          if (p.status === 'completed') {
            const curChapter = curriculumSource[modIdx] || curriculumSource[modIdx % curriculumSource.length];
            curChapter.topics.forEach((_, tIdx) => {
              initialCompleted[`${modIdx}_${tIdx}`] = true;
            });
          } else {
            p.completed_lessons?.forEach((idxStr: string) => {
              initialCompleted[`${modIdx}_${idxStr}`] = true;
            });
            if (p.theory_completed) {
              initialCompleted[`${modIdx}_0`] = true;
              initialCompleted[`${modIdx}_1`] = true;
              initialCompleted[`${modIdx}_2`] = true;
              initialCompleted[`${modIdx}_3`] = true;
            }
            if (p.quiz_score >= 70) {
              initialCompleted[`${modIdx}_4`] = true;
              initialCompleted[`${modIdx}_5`] = true;
            }
          }
        }
      });

      if (cData?.progress?.project_status === 'submitted') {
        initialCompleted['capstone'] = true;
      }

      setCompletedSteps(prev => ({ ...initialCompleted, ...prev }));
      setModules(formatted);
      setLoading(false);
      return formatted;
    } catch (err) {
      try { console.error('Error fetching modules:', err instanceof Error ? err.message : String(err)); } catch (_) {}
      let fetched: any[] = [];
      if (curriculumSource && curriculumSource.length > 0) {
        fetched = curriculumSource.map((_, i) => ({
          _id: `dummy-mod-${i}`,
          progress: null
        }));
      }
      const formatted = fetched.map((mod: any, i: number) => {
        const curChapter = curriculumSource[i] || curriculumSource[i % curriculumSource.length];
        return {
          ...mod,
          title: curChapter?.title || `Module ${i + 1}`,
          order_index: i + 1,
          lessons: curChapter?.topics?.map((t: any) => ({
            type: t.type,
            title: t.title,
          })) || [],
        };
      });
      setCourseData({ title: 'Course' });
      setModules(formatted);
      setLoading(false);
      return formatted;
    }
  }, [resolvedCourseId, user, curriculumSource]);

  // ✅ PERF FIX: Track last fetched module to avoid redundant detail fetches
  const lastFetchedModuleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeModuleIndex >= 0 && modules.length > 0) {
      const moduleId = modules[activeModuleIndex]._id;
      // Only re-fetch module details when the MODULE changes, not every lesson change
      if (moduleId !== lastFetchedModuleIdRef.current) {
        lastFetchedModuleIdRef.current = moduleId;
        fetchModuleDetails(moduleId);
      }

      const les = modules[activeModuleIndex]?.lessons?.[activeLessonIndex];
      if (les) {
        setActiveStage(les.type as LessonType);
      }
    } else if (activeModuleIndex === -1) {
      setActiveStage('capstone');
    } else if (activeModuleIndex === -3) {
      setActiveStage('result');
    }
  }, [activeModuleIndex, activeLessonIndex, modules]);

  const fetchModuleDetails = async (moduleId: string) => {
    let data: any = {};
    if (!moduleId.startsWith('dummy-mod')) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/modules/${moduleId}`);
        if (res.ok) data = await res.json();
      } catch {}
    }
    setModuleDetails(data);
    
    // Fetch dynamic questions count from the current chapter topic
    const activeChapter = curriculumSource[activeModuleIndex] || curriculumSource[activeModuleIndex % curriculumSource.length];
    const quizTopic = activeChapter?.topics?.find(t => t.type === 'graded_quiz');
    const gradedQs = quizTopic?.graded || [];
    setQuizAnswers(gradedQs.map(() => []));
    setCurrentQuizQ(0);
    
    // Check if previously passed
    const gradedIdx = activeChapter?.topics?.findIndex(t => t.type === 'graded_quiz') ?? 5;
    if (completedSteps[`${activeModuleIndex}_${gradedIdx}`]) {
      setQuizResult({ score: 100, passed: true });
    } else {
      setQuizResult(null);
    }
  };

  /* ── Progress Updates ── */
  const updateProgress = async (updates: any) => {
    if (modules[activeModuleIndex]?._id?.startsWith('dummy-mod')) {
      const updated = [...modules];
      const cur = updated[activeModuleIndex];
      if (!cur.progress) cur.progress = { status: 'unlocked', theory_completed: false, video_completed: false, quiz_score: 0, quiz_answers: [], project_status: 'pending', review_status: 'pending' };
      Object.assign(cur.progress, updates);
      if (updates.status === 'completed' || updates.quiz_score >= 70) {
        cur.progress.status = 'completed';
      }
      setModules(updated);
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/progress/update`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user?.uid, 
          course_id: resolvedCourseId, 
          module_id: modules[activeModuleIndex]?._id, 
          updates 
        })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn("Failed to sync progress with database, persisting locally.", err);
    }
  };

  const activeChapterData = curriculumSource[activeModuleIndex] || curriculumSource[activeModuleIndex % curriculumSource.length];
  const activeTopicData = activeChapterData?.topics?.[activeLessonIndex];

  /* ── Graded Quiz Submission ── */
  const handleQuizSubmit = async () => {
    const questions = activeTopicData?.graded || [];
    let correct = 0;
    questions.forEach((q: any, i: number) => {
      const sel = quizAnswers[i] || [];
      if (sel.includes(q.correct)) correct++;
    });
    const score = Math.round((correct / Math.max(questions.length, 1)) * 100);
    const passed = score >= 70;

    setQuizResult({ score, passed });

    if (passed) {
      await submitGradedQuiz(activeModuleIndex, activeLessonIndex, score, true, quizAnswers);
      // Show completion prompt if module fully completed
      const curMod = modules[activeModuleIndex];
      if (curMod) {
        const numLessons = curMod.lessons?.length || 6;
        const completedCount = Object.keys(completedSteps).filter(k => k.startsWith(`${activeModuleIndex}_`)).length;
        if (completedCount === numLessons) {
          setTimeout(() => {
            setCompletionPrompt({
              open: true,
              nextIndex: activeModuleIndex + 1 < modules.length ? activeModuleIndex + 1 : -1,
              moduleName: curMod.title,
            });
          }, 1200);
        }
      }
    }
  };

  /* ── Navigation ── */
  const goToPrevLesson = () => {
    if (currentFlatIndex <= 0) return;
    const prev = flatLessons[currentFlatIndex - 1];
    setActiveModuleIndex(prev.moduleIndex);
    setActiveLessonIndex(prev.lessonIndex);
    setActiveStage(prev.type);
    scrollContentTop();
  };

  const goToNextLesson = () => {
    if (currentFlatIndex >= flatLessons.length - 1) return;
    const next = flatLessons[currentFlatIndex + 1];
    
    if (isLessonLocked(next.moduleIndex, next.lessonIndex)) {
      alert("This topic is locked. You must complete the current topic first to unlock it!");
      return;
    }

    setActiveModuleIndex(next.moduleIndex);
    setActiveLessonIndex(next.lessonIndex);
    setActiveStage(next.type);
    scrollContentTop();
  };

  const scrollContentTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleModule = (idx: number) => {
    const s = new Set(expandedModules);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setExpandedModules(s);
  };

  const handleMarkComplete = async () => {
    // Mark current lesson as completed via hook
    markLessonComplete(activeModuleIndex, activeLessonIndex);

    // Show completed toast
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);

    // Sync with backend using existing updateProgress helper
    const curMod = modules[activeModuleIndex];
    if (curMod) {
      const numLessons = curMod.lessons?.length || 6;
      // Build list of completed lesson indices, ensuring current lesson is included
      const completedIndices: string[] = [];
      for (let i = 0; i < numLessons; i++) {
        if (i === activeLessonIndex || completedSteps[`${activeModuleIndex}_${i}`]) {
          completedIndices.push(i.toString());
        }
      }
      const isFinishingModule = completedIndices.length === numLessons;
      const updates: any = {
        completed_lessons: completedIndices,
        status: isFinishingModule ? 'completed' : 'unlocked',
      };
      if (activeStage === 'overview') updates.video_completed = true;
      if (activeStage === 'text' || activeStage === 'theory') updates.theory_completed = true;
      await updateProgress(updates);
      if (isFinishingModule) {
        setCompletionPrompt({
          open: true,
          nextIndex: activeModuleIndex + 1 < modules.length ? activeModuleIndex + 1 : -1,
          moduleName: curMod.title,
        });
        return;
      }
    }
    if (currentFlatIndex < flatLessons.length - 1) {
      goToNextLesson();
    }
  };

  const continueLearning = () => {
    if (!flatLessons.length) return;
    
    let target = flatLessons.find(l => {
      if (l.type === 'result') return false;
      return !isLessonComplete(l.moduleIndex, l.type, l.lessonIndex);
    });
    
    if (!target) {
      target = flatLessons.find(l => l.type === 'result') || flatLessons[flatLessons.length - 1];
    }
    
    if (target) {
      setActiveModuleIndex(target.moduleIndex);
      setActiveLessonIndex(target.lessonIndex);
      setActiveStage(target.type);
      scrollContentTop();
    }
  };

  const isLessonComplete = (modIdx: number, type: LessonType, lessonIdx: number): boolean => {
    if (modIdx === -1) return !!completedSteps['capstone'];
    if (modIdx === -3) return false;
    return !!completedSteps[`${modIdx}_${lessonIdx}`];
  };

  const isCurrentLessonComplete = isLessonComplete(activeModuleIndex, activeStage, activeLessonIndex);
  
  // Dynamic Course Completion Progress Bar (memoized)
  const overallProgress = useMemo(() => {
    if (!flatLessons.length) return 0;
    const trackableLessons = flatLessons.filter(l => l.type !== 'result');
    if (!trackableLessons.length) return 0;
    let completedCount = 0;
    trackableLessons.forEach(l => {
      if (isLessonComplete(l.moduleIndex, l.type, l.lessonIndex)) {
        completedCount++;
      }
    });
    return Math.round((completedCount / trackableLessons.length) * 100);
  }, [flatLessons, completedSteps]);

  const currentModule = modules[activeModuleIndex];
  
  const currentLessonTitle = currentModule
    ? currentModule.lessons?.[activeLessonIndex]?.title || `${currentModule?.title || 'Module'} - ${getLessonLabel(activeStage)}`
    : activeStage === 'capstone'
      ? 'Mini Project Submission'
      : activeStage === 'result'
        ? 'Course Certification'
        : 'Loading...';

  const activeContentDb = modules.length > 0 && activeModuleIndex >= 0
    ? (() => {
        const td = activeTopicData as any;
        return {
          overview: td?.overview || td?.content || `### ${td?.title}\n\nNo overview content loaded.`,
          reading: td?.reading || td?.content || `### ${td?.title}\n\nNo reading content loaded.`,
          practice: td?.practice || [],
          graded: td?.graded || [],
          resources: td?.resources || []
        };
      })()
    : null;

  if (loading) return (
    <div className="cp-loading">
      <div className="cp-spinner" />
      <span className="cp-loading-text">Loading course modules...</span>
    </div>
  );

  if (!courseData && !loading && !modules.length) return (
    <div className="cp-empty">
      <h2>Course Not Found</h2>
      <p>The course data could not be loaded. Please check back later.</p>
      <button onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
    </div>
  );

  if (!modules.length) return (
    <div className="cp-empty">
      <h2>No Modules Found</h2>
      <p>This course doesn't have any content yet. Please check back later.</p>
      <button onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
    </div>
  );

  return (
    <div className="cp-shell">
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          background: '#4ade80',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}>
          Lesson completed! 🎉
        </div>
      )}
      {/* Mobile Toggle */}
      <button className="cp-mobile-toggle" onClick={() => setSidebarOpen(true)}>
        <Menu size={20} />
      </button>
      {/* Continue Learning Button - secondary style */}
      <button className="cp-topbar-btn secondary" onClick={continueLearning} style={{ marginLeft: '8px' }}>
        Continue Learning
      </button>
      <div className={`cp-mobile-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ══════ LEFT SIDEBAR ══════ */}
      <aside className={`cp-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="cp-sidebar-header">
          <button className="cp-sidebar-back" onClick={() => navigate('/dashboard/my-courses')}>
            <ChevronLeft size={16} /> Back to courses
          </button>
          <div className="cp-sidebar-title-row">
            <div className="cp-sidebar-title">Course Curriculum</div>
          </div>
          <div className="cp-sidebar-progress-wrap">
            <div className="cp-sidebar-progress-bar">
              <div className="cp-sidebar-progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>
            <span className="cp-sidebar-progress-text">{overallProgress}%</span>
          </div>
        </div>

        <div className="cp-sidebar-modules" style={{ overflowY: 'auto', flex: 1 }}>
          {modules.map((mod, modIdx) => {
            const isExpanded = expandedModules.has(modIdx);
            
            // Enforce Coursera sequential module locking
            const isLocked = modIdx > 0 && !isModuleComplete(modIdx - 1);
            
            const isCompleted = isModuleComplete(modIdx);
            const modProgress = getModuleProgressPercent(modIdx);

            return (
              <div key={mod._id} className="cp-module-group" style={{ opacity: isLocked ? 0.45 : 1 }}>
                  <button className="cp-module-header" onClick={() => {
                    if (!isLocked) {
                      setActiveModuleIndex(modIdx);
                    }
                  }}>

                  <div className="cp-module-header-left">
                    <div className={`cp-module-number ${isCompleted ? 'completed' : modIdx === activeModuleIndex ? 'active' : ''}`}>
                      {isCompleted ? <CheckCircle2 size={14} /> : mod.order_index}
                    </div>
                    {isLocked && <Lock size={16} className="cp-module-lock-icon" />}
                    <div className="cp-module-info">
                      <div className="cp-module-name">{mod?.title}</div>
                      <div className="cp-module-meta">
                        {`${mod.estimated_time || '1 hour'} · ${mod.lessons?.length || 6} steps`}
                      </div>
                    </div>
                  </div>
                  {!isLocked && <ChevronDown size={16} className={`cp-module-chevron ${isExpanded ? 'open' : ''}`} />}
                </button>

                {!isLocked && modProgress > 0 && modProgress < 100 && (
                  <div className="cp-module-progress-mini">
                    <div className="cp-module-progress-mini-fill" style={{ width: `${modProgress}%` }} />
                  </div>
                )}
                {isLocked && <span className="cp-module-locked-text">Locked</span>}

                {mod.lessons && mod.lessons.length > 0 && (
                  <div className="cp-lesson-list">
                    {mod.lessons.map((les, lessonIdx) => {
                      const isActive = modIdx === activeModuleIndex && activeLessonIndex === lessonIdx;
                      const type = les.type as LessonType;
                      const done = !!completedSteps[`${modIdx}_${lessonIdx}`];
                      const locked = isLocked || isLessonLocked(modIdx, lessonIdx);
                      const Icon = (type === 'overview' || type === 'text' || type === 'theory') ? FileText : HelpCircle;
                      
                      return (
                        <button
                          key={lessonIdx}
                          className={`cp-lesson-item ${isActive ? 'active' : ''} ${done ? 'completed' : ''} ${locked ? 'locked' : ''}`}
                          style={{ opacity: locked ? 0.5 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
                          onClick={() => {
                            if (locked) {
                              alert("This topic is locked. You must complete the previous topic first!");
                              return;
                            }
                            setActiveModuleIndex(modIdx);
                            setActiveLessonIndex(lessonIdx);
                            setActiveStage(type);
                            setSidebarOpen(false);
                            scrollContentTop();
                          }}
                        >
                          {locked && <Lock size={16} className="cp-lesson-lock-icon" />}
                          <Icon size={16} className="cp-lesson-icon" />
                          <span className="cp-lesson-name">{les?.title}</span>
                          {done ? (
                            <div className="cp-lesson-check done"><CheckCircle2 size={10} /></div>
                          ) : (
                            <div className="cp-lesson-check" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Final Milestone Section */}
          <div className="cp-module-group" style={{ borderBottom: 'none', paddingBottom: 40 }}>
            <div className="cp-sidebar-divider">Final Milestone</div>
            
            {(() => {
                const allModulesDone = modules.every((_, idx) => isModuleComplete(idx));
                const capstoneLocked = !allModulesDone;
                const resultLocked = !completedSteps['capstone'];
                
                return (
                    <>
                        <button 
                          className={`cp-lesson-item ${activeStage === 'capstone' ? 'active' : ''} ${capstoneLocked ? 'locked' : ''} ${completedSteps['capstone'] ? 'completed' : ''}`} 
                          onClick={() => { 
                            if (!capstoneLocked) { 
                              setActiveModuleIndex(-1); 
                              setActiveStage('capstone'); 
                              setSidebarOpen(false); 
                              scrollContentTop(); 
                            } else {
                              alert("Please complete and pass all course modules first!");
                            }
                          }}
                          style={{ paddingLeft: 20, opacity: capstoneLocked ? 0.4 : 1 }}
                        >
                            <Code size={16} className="cp-lesson-icon" />
                            <span className="cp-lesson-name">Mini Project</span>
                            {completedSteps['capstone'] ? (
                                <div className="cp-lesson-check done" style={{ marginLeft: 'auto' }}><CheckCircle2 size={10} /></div>
                            ) : capstoneLocked ? (
                                <span className="text-[9px] uppercase font-semibold text-white/30 ml-auto">Locked</span>
                            ) : (
                                <div className="cp-lesson-check" style={{ marginLeft: 'auto' }} />
                            )}
                        </button>

                        <button 
                          className={`cp-lesson-item ${activeStage === 'result' ? 'active' : ''} ${resultLocked ? 'locked' : ''}`} 
                          onClick={() => { 
                            if (!resultLocked) { 
                              setActiveModuleIndex(-3); 
                              setActiveStage('result'); 
                              setSidebarOpen(false); 
                              scrollContentTop(); 
                            } else {
                              alert("Submit your Mini Project first to graduate!");
                            }
                          }}
                          style={{ paddingLeft: 20, opacity: resultLocked ? 0.4 : 1 }}
                        >
                            <Award size={16} className="cp-lesson-icon" />
                            <span className="cp-lesson-name">Completion</span>
                            {resultLocked && <span className="text-[9px] uppercase font-semibold text-white/30 ml-auto">Locked</span>}
                        </button>
                    </>
                );
            })()}
          </div>
        </div>
      </aside>

      {/* ══════ MAIN CONTENT ══════ */}
      <div className="cp-main">
        {/* Top Bar */}
        <div className="cp-topbar sticky top-0 bg-white/80 backdrop-blur-sm" style={{ zIndex: 10 }}>
          <div className="cp-topbar-left">
            <button className="cp-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
              <Menu size={18} />
            </button>
            <span className="cp-topbar-lesson-title">{currentLessonTitle}</span>
          </div>
          <div className="cp-topbar-right">
            {(activeStage === 'overview' || activeStage === 'text' || activeStage === 'theory') && (
              <button
                className={`cp-topbar-btn ${isCurrentLessonComplete ? 'completed-btn' : 'primary'}`}
                onClick={handleMarkComplete}
                disabled={isCurrentLessonComplete}
              >
                <CheckCircle2 size={15} />
                {isCurrentLessonComplete ? 'Completed' : 'Mark Complete'}
              </button>
            )}
          </div>
        </div>

        {/* Content + Right Tools Drawer */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Main Stage */}
          <div className="cp-content-area" ref={contentRef} style={{ flex: 1 }}>
            <AnimatePresence mode="wait">
              
              {/* ── 1. MODULE OVERVIEW ── */}
              {activeStage === 'overview' && activeContentDb && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="cp-text-lesson">
                  {activeTopicData?.image && (
                    <div className="cp-lesson-image my-6 text-center">
                      <img src={activeTopicData.image.src} alt={activeTopicData.image.caption || ''} className="mx-auto rounded-lg shadow-md max-w-full h-auto" loading="lazy" />
                      {activeTopicData.image.caption && (
                        <p className="text-sm text-gray-500 mt-2">{activeTopicData.image.caption}</p>
                      )}
                    </div>
                  )}

                  {/* Lesson Metadata */}
                  <div className="flex items-center text-sm text-gray-600 mb-6 space-x-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="font-semibold text-indigo-700 uppercase tracking-wider text-xs">
                      {activeTopicData?.type || 'overview'}
                    </span>
                    <span className="flex items-center text-gray-500">
                      <span className="mx-2">•</span>
                      {estimateReadingTime(activeContentDb.overview)} min read
                    </span>
                  </div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({ children }) => <h1 className="text-3xl font-extrabold text-gray-900 mb-6">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 mt-8">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xl font-bold text-[#7C3AED] mb-4 mt-6">{children}</h3>,
                      p: ({ children }) => <p className="text-base text-gray-600 leading-relaxed mb-4">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-6 mb-6 space-y-2">{children}</ul>,
                      li: ({ children }) => <li className="text-base text-gray-700 font-medium">{children}</li>
                    }}
                  >
                    {activeContentDb.overview}
                  </ReactMarkdown>
                  
                  {!isCurrentLessonComplete && (
                    <div style={{ marginTop: 40, paddingTop: 30, borderTop: '1px solid #e5e7eb' }}>
                      <button className="cp-bottom-nav-btn next" style={{ width: '100%', justifyContent: 'center', padding: '16px', borderRadius: '12px' }} onClick={handleMarkComplete}>
                        <CheckCircle2 size={18} />
                        I'm Ready! Mark Complete & Start Reading
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── 2. READING MATERIAL ── */}
              {(activeStage === 'text' || activeStage === 'theory') && activeContentDb && (
                <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="cp-text-lesson">
                  {activeTopicData?.image && (
                    <div className="cp-lesson-image my-6 text-center">
                      <img src={activeTopicData.image.src} alt={activeTopicData.image.caption || ''} className="mx-auto rounded-lg shadow-md max-w-full h-auto" loading="lazy" />
                      {activeTopicData.image.caption && (
                        <p className="text-sm text-gray-500 mt-2">{activeTopicData.image.caption}</p>
                      )}
                    </div>
                  )}

                  {/* Lesson Metadata */}
                  <div className="flex items-center text-sm text-gray-600 mb-6 space-x-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="font-semibold text-indigo-700 uppercase tracking-wider text-xs">
                      {activeTopicData?.type || 'lesson'}
                    </span>
                    <span className="flex items-center text-gray-500">
                      <span className="mx-2">•</span>
                      {estimateReadingTime(activeContentDb.reading)} min read
                    </span>
                  </div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({ children }) => <h1 className="text-3xl font-extrabold text-gray-900 mb-6">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 mt-8">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xl font-bold text-[#7C3AED] mb-4 mt-6">{children}</h3>,
                      p: ({ children }) => <p className="text-base text-gray-600 leading-relaxed mb-4">{children}</p>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-[#7C3AED] bg-purple-50 p-4 my-6 italic text-gray-700 rounded-r-xl">
                          {children}
                        </blockquote>
                      ),
                      pre: ({ children }) => <div className="my-6 rounded-xl overflow-hidden shadow-lg border border-gray-200">{children}</div>,
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={atomDark}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                            customStyle={{ margin: 0, padding: '20px', fontSize: '14px', borderRadius: '0' }}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-gray-100 text-[#7C3AED] px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        );
                      },
                      ul: ({ children }) => <ul className="list-disc pl-6 mb-6 space-y-2">{children}</ul>,
                      li: ({ children }) => <li className="text-base text-gray-700">{children}</li>
                    }}
                  >
                    {activeContentDb.reading}
                  </ReactMarkdown>

                  {!isCurrentLessonComplete && (
                    <div style={{ marginTop: 40, paddingTop: 30, borderTop: '1px solid #e5e7eb' }}>
                      <button className="cp-bottom-nav-btn next" style={{ width: '100%', justifyContent: 'center', padding: '16px', borderRadius: '12px' }} onClick={handleMarkComplete}>
                        <CheckCircle2 size={18} />
                        Finished Reading. Mark Complete & Move to Practice
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── 3. PRACTICE QUIZ ── */}
              {activeStage === 'practice_quiz' && activeContentDb && (
                <motion.div key="practice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="cp-quiz-container">
                    <div className="cp-quiz-header">
                      <h2>Practice Quiz: Instant Feedback</h2>
                      <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
                        Test your conceptual knowledge. Answers provide real-time explanations to help you learn.
                      </p>
                    </div>

                    {(activeContentDb.practice || []).map((q: any, qIdx: number) => {
                      const selectedIdx = practiceAnswers[`${activeModuleIndex}_${qIdx}`];
                      const hasSelected = selectedIdx !== undefined;

                      return (
                        <div key={qIdx} className="cp-quiz-question" style={{ marginBottom: 40, borderBottom: '1px solid #f3f4f6', paddingBottom: 24 }}>
                          <div className="cp-quiz-question-text" style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
                            {qIdx + 1}. {q.question}
                          </div>
                          
                          <div className="cp-quiz-options" style={{ marginTop: 16 }}>
                            {q.options.map((opt: string, optIdx: number) => {
                              const isSelected = selectedIdx === optIdx;
                              const isCorrect = optIdx === q.correct;

                              let btnClass = "cp-quiz-option";
                              if (hasSelected) {
                                if (isSelected) {
                                  btnClass += isCorrect ? " correct" : " incorrect";
                                } else if (isCorrect) {
                                  btnClass += " show-correct";
                                }
                              } else {
                                btnClass += " hover:bg-slate-50";
                              }

                              return (
                                <button
                                  key={optIdx}
                                  className={btnClass}
                                  disabled={hasSelected}
                                  onClick={() => {
                                    setPracticeAnswers(prev => ({
                                      ...prev,
                                      [`${activeModuleIndex}_${qIdx}`]: optIdx
                                    }));
                                  }}
                                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', marginBottom: '8px' }}
                                >
                                  <div className="cp-quiz-radio">
                                    {isSelected && <div className="cp-quiz-radio-dot" />}
                                  </div>
                                  <span style={{ fontSize: 14, fontWeight: 500 }}>{opt}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Instant Feedback Explanation Box */}
                          {hasSelected && (
                            <div 
                              style={{ 
                                marginTop: 16, 
                                padding: 16, 
                                borderRadius: 12, 
                                background: selectedIdx === q.correct ? '#ecfdf5' : '#fef2f2',
                                border: selectedIdx === q.correct ? '1px solid #a7f3d0' : '1px solid #fecaca',
                                color: selectedIdx === q.correct ? '#065f46' : '#991b1b',
                                fontSize: 14,
                                lineHeight: 1.5
                              }}
                            >
                              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {selectedIdx === q.correct ? '✓ Correct Answer' : '✗ Incorrect'}
                              </div>
                              <p>{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Completion Action */}
                    {(() => {
                      const allAnswered = activeContentDb.practice.every(
                        (_: any, qIdx: number) => practiceAnswers[`${activeModuleIndex}_${qIdx}`] !== undefined
                      );
                      const done = !!completedSteps[`${activeModuleIndex}_2`];

                      return allAnswered ? (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                          <button
                            className="cp-bottom-nav-btn next"
                            style={{ padding: '16px 40px', fontSize: 15, borderRadius: 12 }}
                            onClick={() => {
                              if (!done) {
                                setCompletedSteps(prev => ({ ...prev, [`${activeModuleIndex}_2`]: true }));
                              }
                              goToNextLesson();
                            }}
                          >
                            Practice Complete! Go to Graded Assignment
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </motion.div>
              )}

              {/* ── 4. GRADED QUIZ / ASSIGNMENT ── */}
              {activeStage === 'graded_quiz' && activeContentDb && (
                <motion.div key="graded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="cp-quiz-container">
                    <div className="cp-quiz-header">
                      <div style={{ display: 'inline-flex', padding: 8, background: '#f5f3ff', borderRadius: 12, color: '#7C3AED', marginBottom: 12 }}>
                        <ShieldAlert size={24} />
                      </div>
                      <h2>Graded Assignment: Module Test</h2>
                      <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>
                        This assessment counts towards your final certificate. **You must score at least 70% to pass and unlock the next module.**
                      </p>
                    </div>

                    {!quizResult ? (
                      <>
                        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
                          <HelpCircle size={16} />
                          <span>Question {currentQuizQ + 1} of {activeContentDb.graded.length}</span>
                        </div>

                        {activeContentDb.graded.map((q: any, qIdx: number) => {
                          const isCurrent = qIdx === currentQuizQ;
                          const selected = quizAnswers[qIdx] || [];

                          return isCurrent && (
                            <div key={qIdx} className="cp-quiz-question">
                              <div className="cp-quiz-question-text" style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                                {qIdx + 1}. {q.question}
                              </div>

                              <div className="cp-quiz-options" style={{ marginTop: 20 }}>
                                {q.options.map((opt: string, optIdx: number) => {
                                  const isSelected = selected.includes(optIdx);

                                  return (
                                    <button
                                      key={optIdx}
                                      className={`cp-quiz-option ${isSelected ? 'selected' : ''}`}
                                      onClick={() => {
                                        const newAnswers = [...quizAnswers];
                                        newAnswers[qIdx] = [optIdx];
                                        setQuizAnswers(newAnswers);
                                      }}
                                      style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', marginBottom: '8px' }}
                                    >
                                      <div className="cp-quiz-radio">
                                        {isSelected && <div className="cp-quiz-radio-dot" />}
                                      </div>
                                      <span style={{ fontSize: 14, fontWeight: 500 }}>{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Navigation controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                          <button
                            className="cp-bottom-nav-btn"
                            disabled={currentQuizQ === 0}
                            onClick={() => setCurrentQuizQ(currentQuizQ - 1)}
                          >
                            <ChevronLeft size={16} /> Previous
                          </button>
                          
                          {currentQuizQ < activeContentDb.graded.length - 1 ? (
                            <button
                              className="cp-bottom-nav-btn next"
                              onClick={() => setCurrentQuizQ(currentQuizQ + 1)}
                              disabled={!quizAnswers[currentQuizQ]?.length}
                            >
                              Next <ChevronRight size={16} />
                            </button>
                          ) : (
                            <button
                              className="cp-bottom-nav-btn next"
                              onClick={handleQuizSubmit}
                              disabled={quizAnswers.some(a => !a?.length)}
                              style={{ background: '#7C3AED', borderColor: '#7C3AED', color: '#fff', padding: '12px 30px' }}
                            >
                              Submit Graded Quiz 🚀
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      // Quiz results
                      <div>
                        <div className={`cp-quiz-result ${quizResult.passed ? 'passed' : 'failed'}`} style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 16 }}>
                          <div className="cp-quiz-result-score" style={{ fontSize: 48, fontWeight: 900, marginBottom: 8 }}>
                            {quizResult.score}%
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: quizResult.passed ? '#065f46' : '#991b1b' }}>
                            {quizResult.passed ? '✓ Module Assessment Passed!' : '✗ Requirements Not Met'}
                          </div>
                          <p style={{ fontSize: 14, color: '#4b5563', maxWidth: 480, margin: '0 auto' }}>
                            {quizResult.passed
                              ? 'Excellent! You successfully unlocked progress. You can now advance to the next step.'
                              : 'You need at least 70% to pass. Take some time to review the reading text and try again!'}
                          </p>
                        </div>

                        {/* Show corrections */}
                        <div style={{ marginTop: 36 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Question Breakdown:</h3>
                          {activeContentDb.graded.map((q: any, qIdx: number) => {
                            const selected = quizAnswers[qIdx] || [];
                            const correctIdx = q.correct;
                            const isCorrect = selected.includes(correctIdx);

                            return (
                              <div key={qIdx} style={{ marginBottom: 24, borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                                <div style={{ fontSize: 15, fontWeight: 600, color: '#1f2937', marginBottom: 12 }}>
                                  {qIdx + 1}. {q.question}
                                </div>

                                {q.options.map((opt: string, optIdx: number) => {
                                  const wasSelected = selected.includes(optIdx);
                                  const isRight = optIdx === correctIdx;

                                  let optionClass = "cp-quiz-option";
                                  if (wasSelected) {
                                    optionClass += isRight ? " correct" : " incorrect";
                                  } else if (isRight) {
                                    optionClass += " show-correct";
                                  }

                                  return (
                                    <div key={optIdx} className={optionClass} style={{ cursor: 'default', padding: '12px 18px', marginBottom: '6px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <div className="cp-quiz-radio">
                                        {(wasSelected || isRight) && <div className="cp-quiz-radio-dot" />}
                                      </div>
                                      <span>{opt}</span>
                                    </div>
                                  );
                                })}

                                {quizResult.passed && <div className="cp-quiz-explanation" style={{ marginTop: 10, fontSize: 13, background: '#faf5ff', border: 'none', color: '#6b21a8' }}>{q.explanation}</div>}
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 30 }}>
                          {quizResult.passed ? (
                            <button
                              className="cp-bottom-nav-btn next"
                              style={{ padding: '16px 40px', fontSize: 15, background: '#10b981', borderColor: '#10b981' }}
                              onClick={goToNextLesson}
                            >
                              Proceed to Next Lesson
                              <ChevronRight size={18} />
                            </button>
                          ) : (
                            <button
                              className="cp-bottom-nav-btn next"
                              onClick={() => {
                                setQuizResult(null);
                                setQuizAnswers(activeContentDb.graded.map(() => []));
                                setCurrentQuizQ(0);
                              }}
                              style={{ background: '#7C3AED', borderColor: '#7C3AED', color: '#fff', padding: '14px 32px' }}
                            >
                              Retry Graded Quiz
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── 5. FINAL CAPSTONE PROJECT (MINI PROJECT) ── */}
              {activeStage === 'capstone' && (
                <motion.div key="capstone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="cp-text-lesson">
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Code size={40} style={{ color: '#7C3AED' }} />
                      </div>
                      <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800 }}>Final Mini Project Challenge</h1>
                      <p style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>Apply your accumulated knowledge to a practical codebase challenge</p>
                    </div>

                    <div className="cp-note-block" style={{ background: '#f5f3ff', borderColor: '#7C3AED', padding: '24px', borderRadius: '16px' }}>
                      <h3 style={{ margin: '0 0 12px 0', color: '#7C3AED', fontWeight: 800 }}>The Project Challenge Statement</h3>
                      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#374151' }}>
                        {courseData?.capstone_problem || 
                          "Build and deploy a full-stack AI model pipeline orchestrator. Integrate classical symbolic logic validators to ensure the generated model parameters conform to strict security guidelines. Store output weights and configuration logs inside a secure databases tier, and build a beautiful, premium visual user interface showing validation scores."
                        }
                      </p>
                    </div>

                    <h2 style={{ marginTop: 36, fontSize: '20px', fontWeight: 700 }}>Evaluation Rubric</h2>
                    <ul style={{ background: '#fafafa', padding: '20px 32px', borderRadius: 14, listStyleType: 'decimal', margin: '16px 0' }}>
                      <li style={{ marginBottom: 8, fontWeight: 500, color: '#4b5563' }}>Separation of UI and Application logical layers.</li>
                      <li style={{ marginBottom: 8, fontWeight: 500, color: '#4b5563' }}>Implementation of a connectionist neuron model or self-attention pipeline simulation.</li>
                      <li style={{ marginBottom: 8, fontWeight: 500, color: '#4b5563' }}>Clean repository documentation, including installation and setup commands.</li>
                    </ul>

                    {/* GitHub submission block */}
                    <div style={{ marginTop: 40, padding: 32, background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Mini Project Submission Form</h3>
                      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Submit a working GitHub repository link below. Once you submit, our administrators will evaluate your repository and award your Professional Course Certificate!</p>

                      <div className="cp-form-group" style={{ marginBottom: 18 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>GitHub Repository Link</label>
                        <input 
                          type="url"
                          className="cp-input" 
                          style={{ width: '100%', padding: '14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }} 
                          placeholder="https://github.com/your-username/ai-project" 
                          value={githubLink} 
                          onChange={e => {
                            setGithubLink(e.target.value);
                            localStorage.setItem(`${progressKey}_github`, e.target.value);
                          }} 
                        />
                      </div>

                      <div className="cp-form-group" style={{ marginBottom: 28 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Live Deployed URL (Optional)</label>
                        <input 
                          type="url"
                          className="cp-input" 
                          style={{ width: '100%', padding: '14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }} 
                          placeholder="https://your-project.vercel.app" 
                          value={deployedLink} 
                          onChange={e => {
                            setDeployedLink(e.target.value);
                            localStorage.setItem(`${progressKey}_deployed`, e.target.value);
                          }} 
                        />
                      </div>

                      <button 
                        className="cp-topbar-btn primary" 
                        style={{ width: '100%', padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 700, height: 'auto', justifyContent: 'center' }} 
                        onClick={async () => {
                          if (!githubLink) return alert("Please provide your GitHub repository link.");
                          
                          // Set capstone complete in completedSteps
                          const newCompleted = { ...completedSteps, capstone: true };
                          setCompletedSteps(newCompleted);

                          try {
                            const res = await fetch(`${API_BASE_URL}/api/progress/update`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                user_id: user?.uid,
                                course_id: resolvedCourseId,
                                updates: { 
                                  github_link: githubLink, 
                                  deployed_link: deployedLink,
                                  project_status: 'submitted',
                                  submitted_at: new Date().toISOString()
                                }
                              })
                            });
                            if (res.ok) {
                              alert("Mini Project submitted successfully! Your graduation certificate has been unlocked!");
                            } else {
                              alert("Project submitted locally! Your certificate has been unlocked!");
                            }
                            
                            // Graduate instantly to result screen
                            setActiveModuleIndex(-3);
                            setActiveStage('result');
                            scrollContentTop();
                          } catch (err) {
                            console.warn("Failed to sync project with server, graduated locally.", err);
                            alert("Project submitted locally! Your certificate has been unlocked!");
                            setActiveModuleIndex(-3);
                            setActiveStage('result');
                            scrollContentTop();
                          }
                        }}
                      >
                        Submit Final Mini Project
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── 6. RESULT / GRADUATION ── */}
              {activeStage === 'result' && (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className="cp-text-lesson" style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ marginBottom: 48 }}>
                      <motion.div
                        initial={{ rotate: -15, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: 'spring', damping: 10 }}
                        style={{ display: 'inline-block', marginBottom: 24 }}
                      >
                        <Trophy size={110} style={{ color: '#fbbf24' }} />
                      </motion.div>
                      <h1 style={{ fontSize: '40px', fontWeight: 900, color: '#111827', marginBottom: 12 }}>You Have Graduated! 🎓</h1>
                      <p style={{ fontSize: 18, color: '#4b5563', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
                        Phenomenal accomplishment! You have successfully completed all written lessons, cleared all practice checkpoints, passed the module exams, and submitted your Final Mini Project repository.
                      </p>
                      
                      <div style={{ marginTop: 28, padding: '18px 24px', background: '#f5f3ff', borderRadius: 14, border: '1.5px solid #7C3AED', color: '#7C3AED', fontWeight: 700, display: 'inline-block' }}>
                        🛡️ Your GitHub Repository is under admin review. Once validated, your Official Certificate will be emailed to you!
                      </div>
                    </div>

                    <div style={{ background: '#fafafa', padding: 24, borderRadius: 16, border: '1px solid #f3f4f6', marginBottom: 36, textAlign: 'left' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 800, color: '#111827' }}>Graduation Summary:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: '#4b5563' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Course Progress:</span>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>100% Completed</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Submitted Project:</span>
                          <a href={githubLink} target="_blank" rel="noreferrer" style={{ color: '#7C3AED', fontWeight: 700, textDecoration: 'underline' }}>{githubLink || 'github.com/repository'}</a>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Deployed URL:</span>
                          <a href={deployedLink} target="_blank" rel="noreferrer" style={{ color: '#7C3AED', fontWeight: 700, textDecoration: 'underline' }}>{deployedLink || 'N/A'}</a>
                        </div>
                      </div>
                    </div>

                    <button className="cp-topbar-btn primary" style={{ padding: '16px 48px', height: 'auto', fontSize: 16 }} onClick={() => navigate('/dashboard/my-courses')}>
                      Return to My Courses
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          {activeStage !== 'result' && activeStage !== 'capstone' && (
            <div className="cp-lesson-navigation" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button
                className="cp-bottom-nav-btn"
                disabled={currentFlatIndex <= 0}
                onClick={goToPrevLesson}
              >
                ← Previous Lesson
              </button>
              <button
                className="cp-bottom-nav-btn"
                disabled={currentFlatIndex >= flatLessons.length - 1}
                onClick={goToNextLesson}
              >
                Next Lesson →
              </button>
            </div>
          )}
          </div>

          {/* ══════ RIGHT TOOLS DRAWER ══════ */}
          <div className="cp-tools-sidebar">
            <div className="cp-tools-tabs">
              <button
                className={`cp-tools-tab ${activeToolTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveToolTab('notes')}
              >
                <StickyNote size={13} style={{ display: 'inline', marginRight: 4 }} /> Notes
              </button>
              <button
                className={`cp-tools-tab ${activeToolTab === 'transcript' ? 'active' : ''}`}
                onClick={() => setActiveToolTab('transcript')}
              >
                <AlignLeft size={13} style={{ display: 'inline', marginRight: 4 }} /> Transcript
              </button>
              <button
                className={`cp-tools-tab ${activeToolTab === 'resources' ? 'active' : ''}`}
                onClick={() => setActiveToolTab('resources')}
              >
                <BookOpen size={13} style={{ display: 'inline', marginRight: 4 }} /> Resources
              </button>
            </div>

            <div className="cp-tools-content">
              {activeToolTab === 'notes' && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>
                    Your notes for this lesson
                  </div>
                  <textarea
                    className="cp-notes-area"
                    placeholder="Type your notes here..."
                    value={notes}
                    onChange={e => { setNotes(e.target.value); setNotesSaved(false); }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="cp-notes-save-btn" onClick={() => setNotesSaved(true)}>
                      Save Notes
                    </button>
                    {notesSaved && (
                      <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Saved</span>
                    )}
                  </div>
                </div>
              )}

              {activeToolTab === 'transcript' && (
                <div className="cp-transcript-block">
                  {DUMMY_TRANSCRIPT.map((seg, i) => (
                    <div key={i} style={{ marginBottom: 16, fontSize: '13px', lineHeight: '1.4' }}>
                      <span className="cp-transcript-timestamp" style={{ background: '#f5f3ff', color: '#7C3AED', padding: '2px 6px', borderRadius: '4px', marginRight: '8px', fontWeight: 600 }}>{seg.time}</span>
                      {seg.text}
                    </div>
                  ))}
                </div>
              )}

              {activeToolTab === 'resources' && (
                <div className="cp-transcript-block" style={{ padding: 0 }}>
                  <ResourcesTab resources={(activeContentDb?.resources || []) as any} />
                  
                  <div style={{ padding: '0 16px 16px' }}>
                    <button className="cp-ask-btn" style={{ width: '100%' }}>
                      <MessageCircle size={18} />
                      Ask a question about this lesson
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="cp-bottom-nav">
          <button className="cp-bottom-nav-btn" onClick={goToPrevLesson} disabled={currentFlatIndex <= 0}>
            <ChevronLeft size={16} /> Previous Step
          </button>

          <div className="cp-bottom-progress">
            <div className="cp-bottom-progress-bar">
              <div className="cp-bottom-progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>
            <span className="cp-bottom-progress-text">{overallProgress}% complete</span>
          </div>

          <button
            className="cp-bottom-nav-btn next"
            onClick={goToNextLesson}
            disabled={currentFlatIndex >= flatLessons.length - 1}
          >
            Next Step <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ══════ COMPLETION PROMPT MODAL ══════ */}
      <AnimatePresence>
        {completionPrompt.open && (
          <motion.div
            className="cp-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="cp-modal"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ padding: '48px 32px', textAlign: 'center', borderRadius: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}
            >
              <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, background: '#F5F3FF', borderRadius: '50%', transform: 'scale(1.2)' }} />
                <Award size={64} style={{ color: '#7C3AED', position: 'relative', zIndex: 2, margin: '18px auto' }} />
                <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#10b981', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800 }}>MODULE COMPLETED</div>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
                Module Accomplished! 🎉
              </h3>
              <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 32px' }}>
                Outstanding work! You've successfully finished all reading texts, cleared practice checkpoints, and passed the module assessment for **{completionPrompt.moduleName}**.
              </p>
              {completionPrompt.nextIndex !== null ? (
                <button
                  className="cp-modal-primary"
                  style={{ width: '100%', padding: '16px', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'all .2s' }}
                  onClick={() => {
                    const targetIdx = completionPrompt.nextIndex as number;
                    setCompletionPrompt({ open: false, nextIndex: null, moduleName: '' });
                    
                    if (targetIdx >= 0) {
                      setActiveModuleIndex(targetIdx);
                      setActiveLessonIndex(0);
                      setActiveStage('overview');
                      setQuizResult(null);
                      const s = new Set(expandedModules);
                      s.add(targetIdx);
                      setExpandedModules(s);
                    } else if (targetIdx === -1) {
                      // Redirect to Capstone Project
                      setActiveModuleIndex(-1);
                      setActiveStage('capstone');
                    }
                    scrollContentTop();
                  }}
                >
                  Continue to Next Step →
                </button>
              ) : (
                <button
                  className="cp-modal-secondary"
                  style={{ width: '100%', padding: '16px', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'all .2s' }}
                  onClick={() => setCompletionPrompt({ open: false, nextIndex: null, moduleName: '' })}
                >
                  Close & Keep Reviewing
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoursePlayer;

