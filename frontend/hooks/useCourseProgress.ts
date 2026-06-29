// frontend/hooks/useCourseProgress.ts
// Hook to centralize LMS progression state, locking logic, and persistence.
// Extracted from pages/CoursePlayer.tsx while preserving UI.

import { useState, useEffect, useCallback } from 'react';
// Removed circular import from ../pages/CoursePlayer
import { API_BASE_URL } from '../apiConfig';

// Define local interface to break circular dependency
interface Lesson {
  type: 'overview' | 'text' | 'theory' | 'practice_quiz' | 'quiz' | 'graded_quiz';
  title: string;
}

interface Module {
  _id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface UseCourseProgressProps {
  userId: string | undefined;
  courseId: string;
}

interface ProgressHook {
  progressKey: string;
  completedSteps: Record<string, boolean>;
  setCompletedSteps: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isLessonLocked: (modIdx: number, lessonIdx: number) => boolean;
  isModuleComplete: (modIdx: number) => boolean;
  getModuleProgressPercent: (modIdx: number) => number;
  markLessonComplete: (modIdx: number, lessonIdx: number) => void;
  submitGradedQuiz: (
    modIdx: number,
    lessonIdx: number,
    score: number,
    passed: boolean,
    quizAnswers: number[][]
  ) => Promise<void>;
  updateModules: (mods: Module[]) => void;
}

/**
 * useCourseProgress
 * Provides progression utilities and persists them to localStorage.
 * Mirrors the original logic in CoursePlayer.tsx.
 */
export default function useCourseProgress({ userId, courseId }: UseCourseProgressProps): ProgressHook {
  const uid = userId || 'guest';
  const progressKey = `studlyf_progress_${uid}_${courseId}`;

  // Initialise from localStorage, handling corrupted JSON safely.
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(progressKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Corrupted progress data, clearing.', e);
      localStorage.removeItem(progressKey);
      return {};
    }
  });

  // Sync to localStorage on every change.
  useEffect(() => {
    localStorage.setItem(progressKey, JSON.stringify(completedSteps));
  }, [completedSteps, progressKey]);

  // Helper to ensure module data is available when needed.
  // The parent component (CoursePlayer) will pass the current modules list via a setter.
  const [modules, setModules] = useState<Module[]>([]);

  // Expose a way for the parent to update the modules reference.
  const updateModules = (mods: Module[]) => setModules(mods);

  // ---------- Locking & Completion Logic ---------- //
  const isLessonLocked = useCallback(
    (modIdx: number, lessonIdx: number): boolean => {
      // Final milestone (result page)
      if (modIdx === -3) {
        return !completedSteps['capstone'];
      }
      // Capstone (mini project) locked until all modules complete
      if (modIdx === -1) {
        return !modules.every((_, i) => isModuleComplete(i));
      }
      // Sequential module locking
      if (modIdx > 0 && !isModuleComplete(modIdx - 1)) {
        return true;
      }
      // Linear lesson unlocking: ensure all prior lessons in this module are completed
      if (lessonIdx > 0) {
        for (let i = 0; i < lessonIdx; i++) {
          if (!completedSteps[`${modIdx}_${i}`]) {
            return true;
          }
        }
        return false;
      }
      return false;
    },
    [completedSteps, modules]
  );

  const isModuleComplete = useCallback(
    (modIdx: number): boolean => {
      if (modIdx < 0 || !modules[modIdx]) return false;
      const lessons = modules[modIdx].lessons || [];
      return lessons.every((_, idx) => !!completedSteps[`${modIdx}_${idx}`]);
    },
    [completedSteps, modules]
  );

  const getModuleProgressPercent = useCallback(
    (modIdx: number): number => {
      if (modIdx < 0 || !modules[modIdx]) return 0;
      const lessons = modules[modIdx].lessons || [];
      const completed = lessons.filter((_, idx) => !!completedSteps[`${modIdx}_${idx}`]).length;
      return Math.round((completed / lessons.length) * 100);
    },
    [completedSteps, modules]
  );

  // Mark lesson as completed (used by the "Mark Complete" UI button).
  const markLessonComplete = useCallback(
    (modIdx: number, lessonIdx: number) => {
      const stepKey = `${modIdx}_${lessonIdx}`;
      setCompletedSteps(prev => ({ ...prev, [stepKey]: true }));
    },
    []
  );

  // Submit graded quiz results, update local state and optionally sync to backend.
  const submitGradedQuiz = useCallback(
    async (
      modIdx: number,
      lessonIdx: number,
      score: number,
      passed: boolean,
      quizAnswers: number[][]
    ) => {
      const stepKey = `${modIdx}_${lessonIdx}`;
      const newCompleted = { ...completedSteps, [stepKey]: true };
      setCompletedSteps(newCompleted);

      // Sync with backend – mirrors original updateProgress logic.
      try {
        await fetch(`${API_BASE_URL}/api/progress/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: uid,
            course_id: courseId,
            module_id: modules[modIdx]?._id,
            updates: {
              quiz_score: score,
              quiz_answers: quizAnswers,
              completed_lessons: [lessonIdx.toString()],
              status: passed ? 'completed' : 'unlocked',
            },
          }),
        });
      } catch (e) {
        console.warn('Backend sync failed – progress saved locally.', e);
      }
    },
    [completedSteps, uid, courseId, modules]
  );

  return {
    progressKey,
    completedSteps,
    setCompletedSteps,
    isLessonLocked,
    isModuleComplete,
    getModuleProgressPercent,
    markLessonComplete,
    submitGradedQuiz,
    updateModules,
  };
}
