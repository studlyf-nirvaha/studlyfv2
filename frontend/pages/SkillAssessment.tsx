import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../apiConfig";
import Navigation from "../components/Navigation";

const PURPLE = "#7C3AED";
const BG = "#F4F4F6";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "MCQ" | "CODING" | "SCENARIO" | "REAL_WORLD";

interface Question {
  id: number;
  type: QuestionType;
  topic: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  question: string;
  options?: string[];
  expectedConcepts: string[];
}

interface MistakeAnalysisItem {
  questionId: number;
  questionNumber: number;
  topic: string;
  questionType: string;
  score: number;
  mistake: string;
  expectedApproach: string;
  improvementSuggestion: string;
}

interface AssessmentReport {
  skill: string;
  skillId: string;
  score: number;
  level: string;
  interviewReadiness: number;
  strengths: string[];
  weakAreas: string[];
  mistakeAnalysis: MistakeAnalysisItem[];
  questionResults: any[];
  completedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SKILLS = [
  { id: "python",    label: "Python",                       icon: "🐍", category: "Technical",     color: "#3B82F6" },
  { id: "java",      label: "Java",                         icon: "☕", category: "Technical",     color: "#F59E0B" },
  { id: "sql",       label: "SQL",                          icon: "🗄️", category: "Technical",     color: "#10B981" },
  { id: "dsa",       label: "Data Structures & Algorithms", icon: "🧩", category: "Technical",     color: "#EF4444" },
  { id: "react",     label: "React",                        icon: "⚛️", category: "Technical",     color: "#06B6D4" },
  { id: "nodejs",    label: "Node.js",                      icon: "🟢", category: "Technical",     color: "#84CC16" },
  { id: "uiux",      label: "UI/UX",                        icon: "🎨", category: "Non-Technical", color: "#EC4899" },
  { id: "marketing", label: "Marketing",                    icon: "📣", category: "Non-Technical", color: "#F97316" },
  { id: "pm",        label: "Product Management",           icon: "📋", category: "Non-Technical", color: "#8B5CF6" },
];

const typeColors: Record<QuestionType, { bg: string; text: string; label: string }> = {
  MCQ:        { bg: "#EFF6FF", text: "#2563EB", label: "MCQ" },
  CODING:     { bg: "#F5F3FF", text: PURPLE,    label: "CODING" },
  SCENARIO:   { bg: "#FFFBEB", text: "#92400E", label: "SCENARIO" },
  REAL_WORLD: { bg: "#FFF1F2", text: "#BE123C", label: "REAL-WORLD" },
};

const QUESTION_BANK: Record<string, Question[]> = {
  python: [
    { id: 1,  type: "MCQ",        topic: "Python Basics",              difficulty: "EASY",
      question: "Which of the following is used to handle exceptions in Python?",
      options: ["try/catch", "try/except", "try/error", "handle/except"],
      expectedConcepts: ["exception handling", "try/except syntax"] },
    { id: 2,  type: "MCQ",        topic: "Data Structures",            difficulty: "MEDIUM",
      question: "What is the time complexity of accessing an element in a Python dictionary?",
      options: ["O(n)", "O(log n)", "O(1) average", "O(n²)"],
      expectedConcepts: ["hash table", "O(1) average", "hash collision"] },
    { id: 3,  type: "MCQ",        topic: "OOP",                        difficulty: "MEDIUM",
      question: "Which method is called when a new instance of a class is created?",
      options: ["__start__", "__create__", "__init__", "__new__"],
      expectedConcepts: ["__init__", "constructor", "instance creation"] },
    { id: 4,  type: "CODING",     topic: "Functions & Recursion",      difficulty: "MEDIUM",
      question: "Write a Python function `flatten(lst)` that takes a nested list of arbitrary depth and returns a single flat list.",
      expectedConcepts: ["recursion", "isinstance", "list iteration", "base case"] },
    { id: 5,  type: "CODING",     topic: "File Handling",              difficulty: "MEDIUM",
      question: "Write a Python function `word_count(filepath)` that reads a text file and returns a dictionary of word frequencies. Handle missing file gracefully.",
      expectedConcepts: ["open()", "try/except", "FileNotFoundError", "split()", "dictionary"] },
    { id: 6,  type: "CODING",     topic: "API Integration",            difficulty: "HARD",
      question: "Write a Python function `fetch_user(user_id)` that calls jsonplaceholder, handles HTTP errors and timeouts, and returns a typed dict.",
      expectedConcepts: ["requests library", "error handling", "timeout", "response.json()", "type hints"] },
    { id: 7,  type: "SCENARIO",   topic: "Error Handling",             difficulty: "MEDIUM",
      question: "Your colleague's code catches all exceptions with a bare `except:` clause and silently logs them. Production has silent failures. How do you fix this?",
      expectedConcepts: ["specific exception types", "logging levels", "re-raise", "monitoring", "bare except anti-pattern"] },
    { id: 8,  type: "SCENARIO",   topic: "Performance Optimization",   difficulty: "HARD",
      question: "A Python data pipeline processing 10 million records takes 6 hours. Reduce it to 30 minutes. Walk through your approach.",
      expectedConcepts: ["profiling", "vectorization", "multiprocessing", "generators", "pandas", "numpy"] },
    { id: 9,  type: "REAL_WORLD", topic: "System Design",              difficulty: "HARD",
      question: "Design a Python-based URL shortener. Define the data model, shortening algorithm, and how to handle 10,000 redirect requests per second.",
      expectedConcepts: ["hashing", "base62", "Redis cache", "database design", "scalability"] },
    { id: 10, type: "REAL_WORLD", topic: "Practical Problem Solving",  difficulty: "HARD",
      question: "Build a Python script that monitors a directory for new CSV files, validates schema, transforms data, and loads into PostgreSQL in near real-time.",
      expectedConcepts: ["watchdog", "pandas validation", "psycopg2", "error queuing", "idempotency"] },
  ],
  react: [
    { id: 1,  type: "MCQ",        topic: "Hooks",                      difficulty: "EASY",
      question: "Which hook runs a side effect after every render?",
      options: ["useState", "useCallback", "useEffect", "useMemo"],
      expectedConcepts: ["useEffect", "lifecycle", "side effects"] },
    { id: 2,  type: "MCQ",        topic: "Performance",                difficulty: "MEDIUM",
      question: "What does React.memo do?",
      options: ["Memoizes a function's return value", "Prevents re-renders if props haven't changed", "Creates a memoized selector", "Caches API responses"],
      expectedConcepts: ["memoization", "shallow comparison", "re-render optimization"] },
    { id: 3,  type: "MCQ",        topic: "State Management",           difficulty: "MEDIUM",
      question: "When should you prefer useReducer over useState?",
      options: ["When state is a string", "When state logic involves multiple sub-values or next state depends on previous", "When you need async state", "Always"],
      expectedConcepts: ["complex state", "predictable updates", "action dispatch"] },
    { id: 4,  type: "CODING",     topic: "Custom Hooks",               difficulty: "MEDIUM",
      question: "Write a custom hook `useFetch(url)` that fetches data, returns { data, loading, error }, and cleans up on unmount.",
      expectedConcepts: ["useEffect", "useState", "AbortController", "cleanup", "async/await"] },
    { id: 5,  type: "CODING",     topic: "Component Design",           difficulty: "MEDIUM",
      question: "Build a reusable <Pagination> component accepting total, perPage, currentPage props with onPageChange callback.",
      expectedConcepts: ["Math.ceil", "Array.from", "controlled component", "prop types", "accessibility"] },
    { id: 6,  type: "CODING",     topic: "Context & State",            difficulty: "HARD",
      question: "Implement a ThemeProvider using React Context supporting light/dark themes, persisting to localStorage, exposing useTheme(). Avoid unnecessary re-renders.",
      expectedConcepts: ["createContext", "useContext", "localStorage", "useMemo", "provider pattern"] },
    { id: 7,  type: "SCENARIO",   topic: "Performance Debugging",      difficulty: "HARD",
      question: "A React dashboard re-renders every component on every keystroke in a search box. 50+ items. Debug and fix.",
      expectedConcepts: ["React DevTools", "React.memo", "useCallback", "useMemo", "debouncing", "virtualization"] },
    { id: 8,  type: "SCENARIO",   topic: "Architecture",               difficulty: "HARD",
      question: "Migrate a 3-year-old class-based React codebase (50+ components) to functional components. Describe your strategy.",
      expectedConcepts: ["incremental migration", "testing", "codemods", "backwards compatibility", "lifecycle mapping"] },
    { id: 9,  type: "REAL_WORLD", topic: "System Design",              difficulty: "HARD",
      question: "Design the frontend for a real-time collaborative document editor like Google Docs. Address state sync, conflict resolution, offline support.",
      expectedConcepts: ["OT/CRDT", "WebSockets", "optimistic updates", "IndexedDB", "service worker"] },
    { id: 10, type: "REAL_WORLD", topic: "Micro-frontend",             difficulty: "HARD",
      question: "Your React monolith causes deployment bottlenecks for 8 teams. Propose a micro-frontend architecture.",
      expectedConcepts: ["Module Federation", "Webpack 5", "shared dependencies", "design system", "single-spa"] },
  ],
};

const getQuestions = (skillId: string): Question[] =>
  QUESTION_BANK[skillId] || QUESTION_BANK["python"];

// ─── Score helpers ────────────────────────────────────────────────────────────

const getLevel = (score: number): string => {
  if (score >= 90) return "Expert";
  if (score >= 70) return "Advanced";
  if (score >= 40) return "Intermediate";
  return "Beginner";
};

const getLevelStyle = (score: number) => {
  if (score >= 90) return { color: "#10B981", bg: "#ECFDF5" };
  if (score >= 70) return { color: PURPLE,    bg: "#F5F3FF" };
  if (score >= 40) return { color: "#F59E0B", bg: "#FFFBEB" };
  return              { color: "#EF4444", bg: "#FEF2F2" };
};

const getReadinessStatus = (score: number) => {
  if (score >= 80) return { label: "Interview Ready", color: "#10B981" };
  if (score >= 60) return { label: "Nearly Ready",    color: "#F59E0B" };
  return              { label: "Needs Practice",   color: "#EF4444" };
};

const verdictColor = (v: string) =>
  ({ "STRONG PASS": "#10B981", PASS: "#10B981", BORDERLINE: "#F59E0B", FAIL: "#EF4444" }[v] ?? PURPLE);

// ─── AI response helpers ──────────────────────────────────────────────────────

const fallbackFeedback = () => ({
  score: 0,
  verdict: "FAIL" as const,
  strengths: [] as string[],
  gaps: ["Evaluation could not be parsed. Please retry."],
  ideal_approach: "",
  interviewReadiness: 0,
});

const parseAIResponse = (rawResponse: any): any => {
  try {
    const textBlock = rawResponse?.content?.[0]?.text;
    const source: string | null =
      textBlock ?? (typeof rawResponse === "string" ? rawResponse : null);

    if (source) {
      const stripped = source
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const match = stripped.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed.score === "number") return parsed;
      }
    }

    if (rawResponse && typeof rawResponse.score === "number") return rawResponse;

    console.error("[parseAIResponse] Unrecognised shape:", rawResponse);
    return fallbackFeedback();
  } catch (e) {
    console.error("[parseAIResponse] Parse error:", e);
    return fallbackFeedback();
  }
};

// ─── Interview readiness (weighted) ──────────────────────────────────────────

const computeInterviewReadiness = (
  fb: Record<number, any>,
  questions: Question[]
): number => {
  const weights: Record<QuestionType, number> = {
    MCQ:        0.40,
    CODING:     0.40,
    SCENARIO:   0.30,
    REAL_WORLD: 0.30,
  };
  let weightedSum = 0;
  let totalWeight = 0;
  Object.entries(fb).forEach(([idxStr, f]) => {
    const idx = parseInt(idxStr);
    const q = questions[idx];
    if (!q || typeof f?.score !== "number") return;
    const w = weights[q.type] ?? 0.33;
    weightedSum += f.score * w;
    totalWeight += w;
  });
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
};

// ─── Report builder ───────────────────────────────────────────────────────────

const buildReport = (
  fb: Record<number, any>,
  questions: Question[],
  skill: { id: string; label: string }
): AssessmentReport => {
  const entries = Object.entries(fb)
    .map(([idxStr, f]) => ({ idx: parseInt(idxStr), f }))
    .filter(({ f }) => f && typeof f.score === "number");

  const avgScore =
    entries.length
      ? Math.round(entries.reduce((a, { f }) => a + f.score, 0) / entries.length)
      : 0;

  const irScore = computeInterviewReadiness(fb, questions);

  // Frequency-rank strengths and weakAreas
  const strengthFreq: Record<string, number> = {};
  const gapFreq: Record<string, number> = {};
  entries.forEach(({ f }) => {
    (f.strengths || []).forEach((s: string) => {
      strengthFreq[s] = (strengthFreq[s] ?? 0) + 1;
    });
    (f.gaps || []).forEach((g: string) => {
      gapFreq[g] = (gapFreq[g] ?? 0) + 1;
    });
  });

  const strengths = Object.entries(strengthFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s)
    .slice(0, 5);

  const weakAreas = Object.entries(gapFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g)
    .slice(0, 5);

  // Mistake analysis: questions scoring below 70
  const mistakeAnalysis: MistakeAnalysisItem[] = entries
    .filter(({ f }) => f.score < 70)
    .map(({ idx, f }) => {
      const q = questions[idx];
      return {
        questionId:            q.id,
        questionNumber:        idx + 1,
        topic:                 q.topic,
        questionType:          q.type,
        score:                 f.score,
        mistake:               (f.gaps || []).join(". ") || "Answer was incomplete or incorrect.",
        expectedApproach:      f.ideal_approach || `Review ${q.topic} concepts and practice similar problems.`,
        improvementSuggestion: `Focus on ${q.expectedConcepts.slice(0, 3).join(", ")}.`,
      };
    });

  const questionResults = questions.map((q, idx) => {
    const f = fb[idx] || {};
    return {
      questionId:         q.id,
      questionType:       q.type,
      topic:              q.topic,
      score:              typeof f.score === "number" ? f.score : 0,
      verdict:            f.verdict || "FAIL",
      answer:             f._answer || "",
      strengths:          f.strengths || [],
      gaps:               f.gaps || [],
      idealApproach:      f.ideal_approach || "",
      interviewReadiness: typeof f.interviewReadiness === "number" ? f.interviewReadiness : 0,
    };
  });

  return {
    skill:             skill.label,
    skillId:           skill.id,
    score:             avgScore,
    level:             getLevel(avgScore),
    interviewReadiness: irScore,
    strengths,
    weakAreas,
    mistakeAnalysis,
    questionResults,
    completedAt:       new Date().toISOString(),
  };
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = "skillAssessmentHistory";

const safeLoadHistory = (): AssessmentReport[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveToHistory = (report: AssessmentReport): void => {
  try {
    const existing = safeLoadHistory();
    existing.unshift(report);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 100)));
  } catch (e) {
    console.error("[SkillAssessment] localStorage save error:", e);
  }
};

// ─── SCREEN 1: Skill Select ───────────────────────────────────────────────────

export function SkillSelectScreen({ onSelect }: { onSelect: (skillId: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const handleStart = () => {
    if (!selected) return;
    setStarting(true);
    setTimeout(() => onSelect(selected), 1200);
  };

  const technical    = SKILLS.filter(s => s.category === "Technical");
  const nonTechnical = SKILLS.filter(s => s.category === "Non-Technical");

  return (
    <div className="flex flex-col lg:flex-row bg-[#F4F4F6] px-6 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-12 gap-12 lg:gap-24 mt-20 items-start justify-center min-h-[calc(100vh-80px)]">
      <div className="flex flex-col justify-start">
        <div className="inline-flex items-center gap-2 bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] rounded-2xl px-3.5 py-1.5 mb-7 w-fit">
          <span className="text-[#7C3AED] font-bold text-[11px] tracking-[2px]">🎯 SKILL ASSESSMENT ENGINE V2.0</span>
        </div>
        <div className="text-4xl font-[900] leading-[1.05] text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] inline-block uppercase">KNOW YOUR</div>
        <div className="text-4xl font-[900] leading-[1.05] italic mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] inline-block uppercase">TRUE LEVEL.</div>
        <p className="text-[#666] text-sm leading-relaxed max-w-[340px]">
          Select a skill. Our AI will generate a <span className="text-[#7C3AED] font-semibold">10-question adaptive assessment</span> — MCQs, coding challenges, scenarios, and real-world problems.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 max-w-[340px]">
          {[
            { label: "Questions",      value: "10" },
            { label: "Question Types", value: "4 formats" },
            { label: "AI Scoring",     value: "5 criteria" },
            { label: "Report",         value: "Instant" },
          ].map(card => (
            <div key={card.label} className="rounded-2xl border border-white bg-white/80 p-5 shadow-[0_6px_24px_rgba(0,0,0,0.05)]">
              <div className="text-[10px] font-black uppercase tracking-[2px] text-gray-400">{card.label}</div>
              <div className="mt-3 text-lg font-black text-[#111827]">{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-[440px] bg-white rounded-3xl p-6 sm:p-8 shadow-[0_15px_50px_rgba(0,0,0,0.08)] flex flex-col gap-6">
        <div>
          <div className="text-[10px] font-bold tracking-[2px] text-gray-400 mb-4 uppercase">Technical Skills</div>
          <div className="grid grid-cols-2 gap-3">
            {technical.map(skill => (
              <button key={skill.id} onClick={() => setSelected(skill.id)}
                className="flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-150"
                style={{ borderColor: selected === skill.id ? skill.color : "#f3f4f6", background: selected === skill.id ? skill.color + "08" : "white", boxShadow: selected === skill.id ? `0 0 0 3px ${skill.color}15` : "none" }}>
                <span className="text-xl">{skill.icon}</span>
                <div>
                  <div className="text-[11px] font-black text-gray-800 leading-tight uppercase tracking-tight">{skill.label}</div>
                  <div className="text-[8px] text-gray-400 font-bold tracking-widest mt-0.5">10 QUESTIONS</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold tracking-[2px] text-gray-400 mb-4 uppercase">Non-Technical Skills</div>
          <div className="grid grid-cols-2 gap-3">
            {nonTechnical.map(skill => (
              <button key={skill.id} onClick={() => setSelected(skill.id)}
                className="flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-150"
                style={{ borderColor: selected === skill.id ? skill.color : "#f3f4f6", background: selected === skill.id ? skill.color + "08" : "white", boxShadow: selected === skill.id ? `0 0 0 3px ${skill.color}15` : "none" }}>
                <span className="text-xl">{skill.icon}</span>
                <div>
                  <div className="text-[11px] font-black text-gray-800 leading-tight uppercase tracking-tight">{skill.label}</div>
                  <div className="text-[8px] text-gray-400 font-bold tracking-widest mt-0.5">10 QUESTIONS</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <button onClick={handleStart} disabled={!selected || starting}
            style={{ background: !selected || starting ? "#e5e7eb" : PURPLE }}
            className={`text-white border-none rounded-xl py-4 font-black text-[11px] tracking-[2px] flex items-center justify-center gap-2 transition-all shadow-lg ${!selected || starting ? "text-gray-400 shadow-none" : "hover:scale-[1.01] active:scale-[0.98]"}`}>
            {starting ? "GENERATING ASSESSMENT..." : selected ? `START ${SKILLS.find(s => s.id === selected)?.label.toUpperCase()} ASSESSMENT →` : "SELECT A SKILL TO BEGIN"}
          </button>
          <div className="text-center text-[9px] text-gray-300 font-bold tracking-widest">
            AI-POWERED · ADAPTIVE DIFFICULTY · INSTANT REPORT
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 2: Sync ───────────────────────────────────────────────────────────

function SyncScreen({ skill, onStart }: { skill: any; onStart: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: BG, padding: 40, textAlign: "center" }}>
      <div style={{ width: 80, height: 80, background: PURPLE, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 28, boxShadow: "0 8px 30px rgba(124,58,237,0.4)" }}>{skill.icon}</div>
      <h1 style={{ fontSize: 44, fontWeight: 900, color: "#1a1a2e", margin: 0, textTransform: "uppercase" }}>
        ASSESSMENT <span style={{ color: PURPLE }}>READY.</span>
      </h1>
      <p style={{ color: "#555", fontSize: 16, marginTop: 16, marginBottom: 40 }}>
        A <strong>10-question adaptive assessment</strong> for <strong>{skill.label}</strong> is ready. Answer honestly — this measures your real level.
      </p>
      <button onClick={() => ready && onStart()}
        style={{ background: ready ? PURPLE : "#aaa", color: "white", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 11, cursor: ready ? "pointer" : "not-allowed", letterSpacing: 1 }}>
        {ready ? "BEGIN ASSESSMENT →" : "PREPARING..."}
      </button>
    </div>
  );
}

// ─── SCREEN 3: Question ───────────────────────────────────────────────────────

function Timer({ start }: { start: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [start]);
  const remaining = Math.max(0, 240 - elapsed);
  const color = remaining < 30 ? "#EF4444" : remaining < 60 ? "#F59E0B" : PURPLE;
  return <span style={{ color, fontWeight: 700, fontSize: 12 }}>⏱ {remaining}s</span>;
}

function QuestionScreen({
  skill,
  questions,
  onComplete,
}: {
  skill: any;
  questions: Question[];
  onComplete: (feedback: Record<number, any>, answers: Record<number, string>) => void;
}) {
  const [qIdx, setQIdx]           = useState(0);
  const [answers, setAnswers]     = useState<Record<number, string>>({});
  const [answeredIdx, setAnswered] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback]   = useState<Record<number, any>>({});
  const [loading, setLoading]     = useState(false);

  // FIX #4: ref always holds latest feedback, avoiding stale closure
  const feedbackRef = useRef<Record<number, any>>({});

  const q          = questions[qIdx];
  const tc         = typeColors[q.type];
  const isMCQ      = q.type === "MCQ";
  const isAnswered = answeredIdx[qIdx] === true;
  const isLast     = qIdx === questions.length - 1;
  const curAnswer  = answers[qIdx] || "";

  const handleSubmit = async () => {
    if (!curAnswer.trim()) return;
    setLoading(true);

    const evalPrompt = isMCQ
      ? `You are evaluating a skill assessment MCQ for ${skill.label}.
Question: "${q.question}"
Options: ${q.options?.join(" | ")}
Expected concepts: ${q.expectedConcepts.join(", ")}
Student selected: "${curAnswer}"

Respond ONLY with a valid JSON object (no markdown, no backticks):
{"score": <0 or 100>, "verdict": "<STRONG PASS|PASS|BORDERLINE|FAIL>", "strengths": ["<specific strength>"], "gaps": ["<specific gap>"], "ideal_approach": "<brief explanation of the correct answer>", "interviewReadiness": <0 or 100>}`
      : `You are a senior ${skill.label} expert evaluating a skill assessment.
Question type: ${q.type}, Difficulty: ${q.difficulty}
Topic: ${q.topic}
Question: "${q.question}"
Expected concepts: ${q.expectedConcepts.join(", ")}
Student answer: "${curAnswer}"

Score across 5 criteria: Accuracy, Concept Clarity, Problem Solving, Practical Knowledge, Communication.
Respond ONLY with a valid JSON object (no markdown, no backticks):
{"score": <0-100>, "verdict": "<STRONG PASS|PASS|BORDERLINE|FAIL>", "strengths": ["<specific strength 1>", "<specific strength 2>"], "gaps": ["<specific gap 1>", "<specific gap 2>"], "ideal_approach": "<2-3 sentence model answer explaining the correct approach>", "interviewReadiness": <0-100>}`;

    let parsedFeedback: any;
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: evalPrompt }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      parsedFeedback = parseAIResponse(raw);
    } catch (e) {
      console.error("[QuestionScreen] Evaluation failed:", e);
      parsedFeedback = fallbackFeedback();
    }

    parsedFeedback._answer       = curAnswer;
    parsedFeedback._questionId   = q.id;
    parsedFeedback._questionType = q.type;
    parsedFeedback._topic        = q.topic;

    const updated = { ...feedbackRef.current, [qIdx]: parsedFeedback };
    feedbackRef.current = updated;   // sync update — always fresh
    setFeedback(updated);            // triggers re-render
    setAnswered(p => ({ ...p, [qIdx]: true }));
    setLoading(false);
  };

  const handleNext = () => {
    if (isLast) {
      // FIX #4: read from ref, not from stale state closure
      onComplete(feedbackRef.current, answers);
    } else {
      setQIdx(p => p + 1);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: BG, padding: "32px 40px", gap: 24, marginTop: 80 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ background: tc.bg, color: tc.text, borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>{tc.label}</span>
            <span style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: 1 }}>{q.topic}</span>
            <span style={{ fontSize: 10, color: "#bbb", fontWeight: 600, letterSpacing: 1 }}>{q.difficulty}</span>
          </div>
          {!isAnswered && <Timer start={qIdx} />}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[2px] text-gray-400">Question {qIdx + 1} of {questions.length}</div>
            <div className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: tc.text }}>{tc.label}</div>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(((qIdx + 1) / questions.length) * 100)}%`, background: PURPLE }} />
          </div>
        </div>

        {/* Question card */}
        <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", flex: 1 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.5, margin: "0 0 20px" }}>{q.question}</p>

          {!isAnswered ? (
            <>
              {isMCQ ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {q.options!.map(opt => (
                    <button key={opt} onClick={() => setAnswers(p => ({ ...p, [qIdx]: opt }))}
                      style={{ border: `2px solid ${curAnswer === opt ? PURPLE : "#e5e7eb"}`, background: curAnswer === opt ? "#F5F3FF" : "white", borderRadius: 10, padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: curAnswer === opt ? 700 : 400, color: curAnswer === opt ? PURPLE : "#374151", cursor: "pointer", transition: "all 0.1s" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea value={curAnswer} onChange={e => setAnswers(p => ({ ...p, [qIdx]: e.target.value }))}
                  placeholder={q.type === "CODING" ? "Write your code solution here..." : "Describe your approach in detail..."}
                  style={{ width: "100%", minHeight: q.type === "CODING" ? 160 : 120, border: "1.5px solid #e0e0e0", borderRadius: 8, padding: 12, fontSize: 12, fontFamily: q.type === "CODING" ? "monospace" : "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", color: "#333", lineHeight: 1.6 }} />
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                <span style={{ fontSize: 9, color: "#bbb", letterSpacing: 1 }}>
                  {isMCQ ? "SELECT ONE OPTION" : q.type === "CODING" ? "CODE OR PSEUDOCODE ACCEPTED" : "BE SPECIFIC AND STRUCTURED"}
                </span>
                <button onClick={handleSubmit} disabled={loading || !curAnswer.trim()}
                  style={{ background: loading || !curAnswer.trim() ? "#d1d5db" : PURPLE, color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 800, fontSize: 10, cursor: loading || !curAnswer.trim() ? "not-allowed" : "pointer", letterSpacing: 1 }}>
                  {loading ? "EVALUATING..." : "SUBMIT ANSWER →"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#F5F3FF", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20, color: PURPLE }}>✓</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: PURPLE }}>Answer submitted</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Your response has been recorded. Full feedback appears in the report.</div>
                </div>
              </div>
              <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 14, border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: 1, marginBottom: 6 }}>YOUR ANSWER</div>
                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, fontFamily: q.type === "CODING" ? "monospace" : "inherit", whiteSpace: "pre-wrap", maxHeight: 120, overflow: "hidden" }}>{curAnswer}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleNext}
                  style={{ background: PURPLE, color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 800, fontSize: 10, cursor: "pointer", letterSpacing: 1 }}>
                  {isLast ? "FINISH ASSESSMENT →" : "NEXT QUESTION →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {questions.map((_, i) => (
            <div key={i}
              style={{ height: 6, flex: 1, borderRadius: 3, background: answeredIdx[i] ? "#10B981" : i === qIdx ? PURPLE : "#e5e7eb", transition: "background 0.3s" }} />
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#0f0a1a", borderRadius: 16, padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#666", marginBottom: 16 }}>QUESTION NAVIGATOR</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {questions.map((_, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: answeredIdx[i] ? "#10B981" : i === qIdx ? PURPLE : "#1a1a2e", color: i === qIdx || answeredIdx[i] ? "white" : "#555", border: i === qIdx ? `2px solid ${PURPLE}` : "2px solid transparent" }}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#999", marginBottom: 12 }}>SKILL PROFILE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>{skill.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>{skill.label}</div>
              <div style={{ fontSize: 10, color: "#888" }}>{skill.category}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 4: Report ─────────────────────────────────────────────────────────

function ReportScreen({
  report,
  skill,
  questions,
  onRestart,
}: {
  report: AssessmentReport;
  skill: any;
  questions: Question[];
  onRestart: () => void;
}) {
  const navigate    = useNavigate();
  const levelStyle  = getLevelStyle(report.score);
  const readiness   = getReadinessStatus(report.interviewReadiness);

  const RECOMMENDATIONS: Record<string, string[]> = {
    python:    ["Complete Python Advanced Module", "Build File Management Project", "Build REST API Project", "Practice Python Mock Interview"],
    react:     ["Complete React Advanced Patterns Module", "Build Full-Stack Project with React", "Practice Frontend Mock Interview", "Study Core Web Vitals"],
    java:      ["Complete Java Collections & Generics Module", "Implement Data Structures in Java", "Practice Backend Mock Interview", "Study Design Patterns"],
    sql:       ["Complete SQL Window Functions Module", "Practice Query Optimization", "Build Data Analysis Project", "Practice Data Analyst Mock Interview"],
    dsa:       ["Complete Graph Algorithms Module", "Solve 30 LeetCode Medium Problems", "Practice DSA Mock Interview", "Review Big-O Complexity"],
    nodejs:    ["Complete Node.js Advanced Module", "Build REST API Project", "Practice Backend Mock Interview", "Study Event Loop & Streams"],
    uiux:      ["Complete UX Research Module", "Build 3 Case Studies", "Practice Product Mock Interview", "Study Figma Advanced"],
    marketing: ["Complete Digital Marketing Module", "Run Campaign Analysis Project", "Practice Marketing Mock Interview", "Study Marketing Analytics"],
    pm:        ["Complete Product Strategy Module", "Write 2 PRDs", "Practice PM Mock Interview", "Study Metrics & OKRs"],
  };
  const recs = RECOMMENDATIONS[report.skillId] || RECOMMENDATIONS["python"];

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 sm:p-10 lg:p-20 mt-20">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">{skill.icon}</div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#1a1a2e] m-0 uppercase">
          SKILL REPORT <span style={{ color: PURPLE }}>COMPLETE.</span>
        </h1>
        <p className="text-[#666] mt-3">
          {report.skill} Assessment · {new Date(report.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Top metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {[
          { label: "Skill Score",          value: `${report.score}%`,              color: PURPLE },
          { label: "Level",                value: report.level,                    color: levelStyle.color },
          { label: "Interview Readiness",  value: `${report.interviewReadiness}%`, color: readiness.color },
          { label: "Questions Answered",   value: `${report.questionResults.length}/10`, color: "#0EA5E9" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100">
            <div className="text-[9px] text-[#999] tracking-widest uppercase font-bold">{card.label}</div>
            <div className="mt-2 text-3xl font-black" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Score / Level / Readiness badges */}
      <div className="flex flex-col sm:flex-row gap-5 justify-center mb-8">
        <div className="bg-white rounded-2xl p-6 text-center min-w-[140px] shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
          style={{ borderTop: `4px solid ${report.score >= 70 ? "#10B981" : report.score >= 40 ? "#F59E0B" : "#EF4444"}` }}>
          <div className="text-3xl font-black" style={{ color: PURPLE }}>{report.score}</div>
          <div className="text-[10px] text-[#999] tracking-widest mt-1 uppercase font-bold">OVERALL SCORE</div>
        </div>
        <div className="rounded-2xl p-6 text-center min-w-[140px] flex flex-col justify-center"
          style={{ backgroundColor: levelStyle.bg, border: `2px solid ${levelStyle.color}` }}>
          <div className="text-xl font-black uppercase" style={{ color: levelStyle.color }}>{report.level}</div>
          <div className="text-[10px] tracking-widest mt-1.5 uppercase font-bold" style={{ color: levelStyle.color + "99" }}>SKILL LEVEL</div>
        </div>
        <div className="rounded-2xl p-6 text-center min-w-[140px] flex flex-col justify-center"
          style={{ backgroundColor: readiness.color + "15", border: `2px solid ${readiness.color}` }}>
          <div className="text-2xl font-black" style={{ color: readiness.color }}>{report.interviewReadiness}%</div>
          <div className="text-[10px] tracking-widest mt-1 uppercase font-bold" style={{ color: readiness.color + "99" }}>INTERVIEW READY</div>
          <div className="text-[9px] mt-1 font-bold uppercase" style={{ color: readiness.color }}>{readiness.label}</div>
        </div>
      </div>

      {/* Strengths / Weak Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#10B981", letterSpacing: 1, marginBottom: 14 }}>✅ STRENGTH AREAS</div>
          {report.strengths.length > 0
            ? report.strengths.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                  <span style={{ color: "#10B981", fontWeight: 900, fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{s}</span>
                </div>
              ))
            : <div style={{ fontSize: 13, color: "#9CA3AF" }}>Complete more questions to identify strengths.</div>
          }
        </div>
        <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", letterSpacing: 1, marginBottom: 14 }}>✗ WEAK AREAS</div>
          {report.weakAreas.length > 0
            ? report.weakAreas.map((g, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                  <span style={{ color: "#EF4444", fontWeight: 900, fontSize: 14 }}>✗</span>
                  <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{g}</span>
                </div>
              ))
            : <div style={{ fontSize: 13, color: "#9CA3AF" }}>No significant weak areas identified.</div>
          }
        </div>
      </div>

      {/* Mistake Analysis */}
      {report.mistakeAnalysis.length > 0 && (
        <div style={{ background: "white", borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", letterSpacing: 1, marginBottom: 18 }}>🔍 MISTAKE ANALYSIS</div>
          {report.mistakeAnalysis.map((m, i) => (
            <div key={i} style={{ borderLeft: "3px solid #EF4444", paddingLeft: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ background: "#FEF2F2", color: "#EF4444", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>Q{m.questionNumber}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{m.topic}</span>
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>Score: {m.score}/100</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: 1, marginBottom: 4 }}>MISTAKE</div>
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{m.mistake}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#10B981", letterSpacing: 1, marginBottom: 4 }}>EXPECTED APPROACH</div>
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, fontStyle: "italic" }}>{m.expectedApproach}</div>
              </div>
              <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: PURPLE, letterSpacing: 1, marginBottom: 4 }}>IMPROVEMENT</div>
                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{m.improvementSuggestion}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question-by-question breakdown */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: 1, marginBottom: 14 }}>QUESTION-BY-QUESTION BREAKDOWN</div>
        {questions.map((q, idx) => {
          const fb = report.questionResults[idx];
          if (!fb || !fb.verdict) return null;
          const tc = typeColors[q.type as QuestionType];
          return (
            <div key={idx} style={{ background: "white", borderRadius: 16, padding: 24, marginBottom: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ background: tc.bg, color: tc.text, borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>Q{idx + 1} {tc.label}</span>
                  <span style={{ fontSize: 11, color: "#888" }}>{q.topic}</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: 18, color: verdictColor(fb.verdict) }}>{fb.score}/100</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: verdictColor(fb.verdict) }}>{fb.verdict}</span>
                </div>
              </div>
              {fb.idealApproach && (
                <div style={{ fontSize: 12, color: "#555", fontStyle: "italic", lineHeight: 1.5, borderLeft: `3px solid ${tc.text}`, paddingLeft: 12 }}>{fb.idealApproach}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommended Path */}
      <div style={{ background: "white", borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, letterSpacing: 1, marginBottom: 18 }}>🗺️ RECOMMENDED LEARNING PATH</div>
        {recs.map((rec, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? PURPLE : "#F5F3FF", color: i === 0 ? "white" : PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: "#374151", fontWeight: i === 0 ? 700 : 400 }}>{rec}</span>
            {i === 0 && <span style={{ marginLeft: "auto", background: PURPLE, color: "white", fontSize: 9, fontWeight: 800, borderRadius: 4, padding: "2px 6px", letterSpacing: 1 }}>START HERE</span>}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ textAlign: "center", display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", paddingBottom: 40 }}>
        <button onClick={onRestart}
          style={{ background: PURPLE, color: "white", border: "none", borderRadius: 12, padding: "16px 40px", fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: 1, boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
          TAKE ANOTHER ASSESSMENT →
        </button>
        <button onClick={() => navigate("/skill-assessment/history")}
          style={{ background: "white", color: PURPLE, border: `2px solid ${PURPLE}`, borderRadius: 12, padding: "16px 40px", fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: 1 }}>
          VIEW HISTORY →
        </button>
        <button onClick={() => navigate("/job-prep/mock-interview")}
          style={{ background: "white", color: "#374151", border: "2px solid #e5e7eb", borderRadius: 12, padding: "16px 40px", fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: 1 }}>
          PRACTICE MOCK INTERVIEW →
        </button>
      </div>
    </div>
  );
}

// ─── ROOT EXPORT ──────────────────────────────────────────────────────────────

export default function SkillAssessment() {
  const [screen,    setScreen]    = useState<"select" | "sync" | "test" | "report">("select");
  const [skill,     setSkill]     = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [report,    setReport]    = useState<AssessmentReport | null>(null);

  const handleSelect = (skillId: string) => {
    const found = SKILLS.find(s => s.id === skillId)!;
    setSkill(found);
    setQuestions(getQuestions(skillId));
    setScreen("sync");
  };

  const handleComplete = (fb: Record<number, any>, rawAnswers: Record<number, string>) => {
    const builtReport = buildReport(fb, questions, skill);
    setReport(builtReport);
    setScreen("report");

    // ── Persist to localStorage ──────────────────────────────────────────────
    saveToHistory(builtReport);
  };

  const handleRestart = () => {
    setSkill(null);
    setQuestions([]);
    setReport(null);
    setScreen("select");
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Poppins', sans-serif" }}>
      <Navigation />
      {screen === "select" && <SkillSelectScreen onSelect={handleSelect} />}
      {screen === "sync"   && <SyncScreen skill={skill} onStart={() => setScreen("test")} />}
      {screen === "test"   && <QuestionScreen skill={skill} questions={questions} onComplete={handleComplete} />}
      {screen === "report" && report && (
        <ReportScreen report={report} skill={skill} questions={questions} onRestart={handleRestart} />
      )}
    </div>
  );
}