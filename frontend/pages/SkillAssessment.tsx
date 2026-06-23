import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../apiConfig";
import Navigation from "../components/Navigation";
const PURPLE = "#7C3AED";
const BG = "#F4F4F6";

// ─── Gemini Integration Constants & Helpers ─────────────────────────────────
// const GEMINI_KEY_STORAGE = "gemini_api_key";


/*
async function validateGeminiKey(apiKey: string): Promise<boolean> {
  let response: any = null;
  let data: any = null;
  let error: any = null;
  try {
    response = await fetch(`${API_BASE_URL}/api/skill-assessment/verify-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    if (response.ok) {
      data = await response.json();
      if (data && data.status === 200) {
        return true;
      }
    } else {
      try { data = await response.json(); } catch {}
    }
  } catch (err) {
    error = err;
  }
  return false;
}
*/
async function generateQuestionsWithGemini(skill: string, apiKey: string): Promise<Question[]> {
  const res = await fetch(`${API_BASE_URL}/api/skill-assessment/generate-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill, apiKey }),
  });
  if (!res.ok) throw new Error("Gemini question generation failed");
  const resData = await res.json();
  if (resData.status !== 200) throw new Error(resData.error || "Gemini question generation failed");
  const data = resData.data;
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return parsed.questions as Question[];
}

async function evaluateAnswerWithGemini(
  skill: string,
  question: Question,
  userAnswer: string,
  apiKey: string
): Promise<{
  score: number;
  verdict: "STRONG PASS" | "PASS" | "BORDERLINE" | "FAIL";
  strengths: string[];
  gaps: string[];
  correctAnswer: string;
  betterApproach: string;
  interviewReadiness: number;
}> {
  const res = await fetch(`${API_BASE_URL}/api/skill-assessment/evaluate-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill, question, userAnswer, apiKey }),
  });
  if (!res.ok) throw new Error("Gemini evaluation failed");
  const resData = await res.json();
  if (resData.status !== 200) throw new Error(resData.error || "Gemini evaluation failed");
  const data = resData.data;
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return parsed;
}

// ─── API Key Screen Component ───────────────────────────────────────────────
function ApiKeyScreen({ onValidate }: { onValidate: (key: string) => void }) {
  const [apiKeyInput, setApiKeyInput] = useState<string>("");

  useEffect(() => {
    setApiKeyInput("");
  }, []);

  const handleValidate = () => {
    onValidate(apiKeyInput.trim());
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: BG, fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-md w-full shadow-[0_20px_60px_rgba(124,58,237,0.12)] border border-gray-100 flex flex-col gap-6">
        {/* Icon + heading */}
        <div className="text-center">
          <div className="text-5xl mb-4">🔑</div>
          <h2 className="text-2xl font-black text-[#1a1a2e] uppercase tracking-wide">
            Enter Gemini API Key
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mt-2">
            We use your API key so assessment generation and evaluation consume your
            credits — not the platform's.
          </p>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-2">
          <input
            type="password"
            placeholder="AIzaSy..."
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleValidate()}
            className="w-full px-4 py-3 rounded-xl border-2 text-xs sm:text-sm outline-none transition-all"
            style={{
              borderColor:  "#e5e7eb",
              fontFamily:   apiKeyInput ? "monospace" : "inherit",
            }}
          />
        </div>

        {/* CTA */}
        <button
          onClick={handleValidate}
          className="text-white border-none rounded-xl py-4 font-black text-[10px] sm:text-[11px] tracking-[1.5px] sm:tracking-[2px] flex items-center justify-center gap-2 transition-all shadow-lg w-full hover:scale-[1.01] active:scale-[0.98]"
          style={{
            background: PURPLE,
            cursor:     "pointer",
          }}
        >
          VALIDATE & CONTINUE →
        </button>

        {/* Disclaimer */}
        <p className="text-center text-[9px] text-gray-400 font-bold tracking-wider leading-relaxed">
          Your key is stored locally in your browser and sent directly to Google's API.
          It is never stored on our servers.
        </p>
      </div>
    </div>
  );
}

// ─── Roadmap and Personalized Plan Components ──────────────────────────────
function RoadmapSection({ skillId }: { skillId: string }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-7 mb-5 sm:mb-6 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-gray-100">
      <div className="text-[11px] font-bold tracking-wide mb-3 uppercase" style={{ color: PURPLE }}>
        🗺️ DEVELOPER ROADMAP
      </div>
      <h3 className="text-lg font-black text-[#1a1a2e] mb-2 uppercase">
        Your {skillId.toUpperCase()} Learning Path
      </h3>
      <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-4">
        Follow a structured, community-driven roadmap to master this skill from fundamentals to advanced topics.
      </p>
      <button
        onClick={() => navigate(`/roadmap/${skillId}`)}
        className="inline-block text-white rounded-xl py-3 px-6 font-black text-xs tracking-wide text-center transition-all hover:scale-[1.01] border-none cursor-pointer"
        style={{ background: PURPLE, boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}
      >
        OPEN ROADMAP →
      </button>
    </div>
  );
}

function LearningPlanSection({ weakAreas, skillId }: { weakAreas: string[]; skillId: string }) {
  if (!weakAreas || weakAreas.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-7 mb-5 sm:mb-6 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-gray-100">
      <div className="text-[11px] font-bold tracking-wide mb-3 uppercase" style={{ color: "#F59E0B" }}>
        📚 PERSONALIZED LEARNING PLAN
      </div>
      <h3 className="text-lg font-black text-[#1a1a2e] mb-2 uppercase">Focus Areas for You</h3>
      <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-4">
        Based on the gaps identified in this assessment, prioritise these key topics:
      </p>
      <div className="flex flex-col gap-3">
        {weakAreas.map((area, i) => (
          <div key={i} className="flex items-start gap-3 bg-[#FFF7ED] rounded-xl p-4 border border-[#FFEDD5]">
            <div className="w-6 h-6 rounded-lg bg-[#F59E0B] text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#92400E]">{area}</div>
              <div className="text-[11px] text-gray-400 mt-1">
                Study this topic in your roadmap or search for targeted guides.
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "MCQ";

interface Question {
  id: number;
  type: QuestionType;
  topic: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  question: string;
  options?: string[];
  correctAnswer?: string;
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
};

const QUESTION_BANK: Record<string, Question[]> = {
  python: [
    { id: 1,  type: "MCQ",        topic: "Python Basics",              difficulty: "EASY",
      question: "What is the output of print(type([])) in Python?",
      options: ["<class 'list'>", "<class 'tuple'>", "<class 'dict'>", "<class 'set'>"],
      correctAnswer: "<class 'list'>",
      expectedConcepts: ["list type identification"] },
    { id: 2,  type: "MCQ",        topic: "Error Handling",             difficulty: "EASY",
      question: "Which keyword is used to handle exceptions in Python?",
      options: ["catch", "except", "throw", "try"],
      correctAnswer: "except",
      expectedConcepts: ["try/except structure"] },
    { id: 3,  type: "MCQ",        topic: "Data Structures",            difficulty: "MEDIUM",
      question: "What is the average time complexity of accessing an element in a Python dictionary by key?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
      correctAnswer: "O(1)",
      expectedConcepts: ["dictionary lookup complexity"] },
    { id: 4,  type: "MCQ",        topic: "Data Types",                 difficulty: "EASY",
      question: "Which of the following data types is mutable in Python?",
      options: ["List", "Tuple", "String", "Integer"],
      correctAnswer: "List",
      expectedConcepts: ["mutable vs immutable"] },
    { id: 5,  type: "MCQ",        topic: "Tooling",                    difficulty: "MEDIUM",
      question: "How is a virtual environment created in Python using the built-in module?",
      options: ["python -m venv myenv", "pip install venv myenv", "virtualenv create myenv", "python create venv myenv"],
      correctAnswer: "python -m venv myenv",
      expectedConcepts: ["virtual environment creation"] },
    { id: 6,  type: "MCQ",        topic: "OOP",                        difficulty: "EASY",
      question: "What is the primary purpose of the __init__ method in a Python class?",
      options: ["Destroys an instance", "Initializes a new instance", "Imports modules", "Defines static methods"],
      correctAnswer: "Initializes a new instance",
      expectedConcepts: ["constructor method"] },
    { id: 7,  type: "MCQ",        topic: "Advanced Python",            difficulty: "MEDIUM",
      question: "What is the purpose of the yield keyword in Python?",
      options: ["To terminate a function", "To return a value and pause execution as a generator", "To raise an exception", "To declare a constant"],
      correctAnswer: "To return a value and pause execution as a generator",
      expectedConcepts: ["generators and yield"] },
    { id: 8,  type: "MCQ",        topic: "Libraries",                  difficulty: "MEDIUM",
      question: "Which module is commonly used in Python to perform calculations with arrays and matrices?",
      options: ["math", "numpy", "pandas", "scipy"],
      correctAnswer: "numpy",
      expectedConcepts: ["numerical libraries"] },
    { id: 9,  type: "MCQ",        topic: "File Handling",              difficulty: "MEDIUM",
      question: "What is the correct way to open a file for reading in Python, ensuring it closes automatically?",
      options: ["with open('file.txt', 'r') as f:", "open('file.txt', 'r') as f:", "with open('file.txt', 'w') as f:", "file = open('file.txt')"],
      correctAnswer: "with open('file.txt', 'r') as f:",
      expectedConcepts: ["file context managers"] },
    { id: 10, type: "MCQ",        topic: "List Comprehensions",        difficulty: "MEDIUM",
      question: "What is the output of the expression: [x*2 for x in range(3)]?",
      options: ["[0, 2, 4]", "[2, 4, 6]", "[0, 1, 2]", "[1, 2, 3]"],
      correctAnswer: "[0, 2, 4]",
      expectedConcepts: ["list comprehension execution"] }
  ],
  react: [
    { id: 1,  type: "MCQ",        topic: "Hooks",                      difficulty: "EASY",
      question: "Which React hook runs side effects after a component renders?",
      options: ["useState", "useCallback", "useEffect", "useMemo"],
      correctAnswer: "useEffect",
      expectedConcepts: ["useEffect basic usage"] },
    { id: 2,  type: "MCQ",        topic: "Performance",                difficulty: "MEDIUM",
      question: "What does React.memo do?",
      options: ["Memoizes calculations", "Prevents functional component re-renders if props don't change", "Stores state globally", "Caches HTTP requests"],
      correctAnswer: "Prevents functional component re-renders if props don't change",
      expectedConcepts: ["component memoization"] },
    { id: 3,  type: "MCQ",        topic: "State Management",           difficulty: "MEDIUM",
      question: "When should you prefer useReducer over useState?",
      options: ["When handling complex state objects or multi-action updates", "When tracking a simple string", "When calling async APIs", "Always"],
      correctAnswer: "When handling complex state objects or multi-action updates",
      expectedConcepts: ["useReducer vs useState"] },
    { id: 4,  type: "MCQ",        topic: "Data Flow",                  difficulty: "EASY",
      question: "What is the correct way to pass data deeply down a component tree without prop drilling?",
      options: ["Redux only", "React Context API", "Custom Hooks", "Passing props manually"],
      correctAnswer: "React Context API",
      expectedConcepts: ["context API usage"] },
    { id: 5,  type: "MCQ",        topic: "Performance",                difficulty: "MEDIUM",
      question: "What is the purpose of the useCallback hook in React?",
      options: ["To cache the result of a function", "To return a memoized version of a callback function reference", "To trigger state re-renders", "To perform DOM operations"],
      correctAnswer: "To return a memoized version of a callback function reference",
      expectedConcepts: ["useCallback usage"] },
    { id: 6,  type: "MCQ",        topic: "Hooks Rules",                difficulty: "EASY",
      question: "What rule must you follow when using React Hooks?",
      options: ["Call hooks inside loops", "Only call hooks at the top level of functional components", "Call hooks inside conditional checks", "Call hooks in regular Javascript functions"],
      correctAnswer: "Only call hooks at the top level of functional components",
      expectedConcepts: ["rules of hooks"] },
    { id: 7,  type: "MCQ",        topic: "Routing",                    difficulty: "MEDIUM",
      question: "What does client-side routing using React Router allow you to do?",
      options: ["Fetch backend data", "Navigate between pages without refreshing the browser", "Verify user auth cookies", "Connect to MongoDB"],
      correctAnswer: "Navigate between pages without refreshing the browser",
      expectedConcepts: ["client side routing"] },
    { id: 8,  type: "MCQ",        topic: "DOM Access",                 difficulty: "EASY",
      question: "Which hook exposes a way to access mutable DOM elements directly?",
      options: ["useContext", "useRef", "useMemo", "useState"],
      correctAnswer: "useRef",
      expectedConcepts: ["useRef DOM access"] },
    { id: 9,  type: "MCQ",        topic: "Performance",                difficulty: "HARD",
      question: "What is the purpose of code splitting using React.lazy and Suspense?",
      options: ["To structure database queries", "To bundle all files into one large file", "To load component bundle chunks dynamically as needed", "To compile TSX to JS"],
      correctAnswer: "To load component bundle chunks dynamically as needed",
      expectedConcepts: ["code splitting and lazy loading"] },
    { id: 10, type: "MCQ",        topic: "Advanced React",             difficulty: "HARD",
      question: "In React Server Components (RSC), where are server components rendered?",
      options: ["Only in the user's browser", "On the backend server before sending to the client", "In a Web Worker", "In a database store"],
      correctAnswer: "On the backend server before sending to the client",
      expectedConcepts: ["react server components rendering"] }
  ],
  java: [
    { id: 1,  type: "MCQ",        topic: "Java Basics",                difficulty: "EASY",
      question: "Which keyword prevents a class from being inherited in Java?",
      options: ["static", "final", "private", "abstract"],
      correctAnswer: "final",
      expectedConcepts: ["final class modifier"] },
    { id: 2,  type: "MCQ",        topic: "Variables",                  difficulty: "MEDIUM",
      question: "What is the default value of a local variable in Java?",
      options: ["null", "0", "false", "No default value (must be initialized)"],
      correctAnswer: "No default value (must be initialized)",
      expectedConcepts: ["local variables default"] },
    { id: 3,  type: "MCQ",        topic: "Collections",                difficulty: "MEDIUM",
      question: "Which collection class maintains insertion order and guarantees uniqueness of elements?",
      options: ["HashSet", "LinkedHashSet", "TreeSet", "ArrayList"],
      correctAnswer: "LinkedHashSet",
      expectedConcepts: ["LinkedHashSet uniqueness"] },
    { id: 4,  type: "MCQ",        topic: "OOP Concepts",               difficulty: "MEDIUM",
      question: "What is the main difference between abstract classes and interfaces in Java?",
      options: ["Abstract classes can have constructors, interfaces cannot", "Interfaces can have fields, abstract classes cannot", "Abstract classes cannot have methods", "There is no difference"],
      correctAnswer: "Abstract classes can have constructors, interfaces cannot",
      expectedConcepts: ["abstract class vs interface"] },
    { id: 5,  type: "MCQ",        topic: "Memory Management",          difficulty: "MEDIUM",
      question: "Which area of memory in Java is used to allocate objects dynamically?",
      options: ["Stack", "Heap", "Method Area", "Register"],
      correctAnswer: "Heap",
      expectedConcepts: ["heap allocation"] },
    { id: 6,  type: "MCQ",        topic: "String Operations",          difficulty: "EASY",
      question: "What is the output of the code System.out.println(10 + 20 + \"Java\");?",
      options: ["30Java", "1020Java", "Java30", "Error"],
      correctAnswer: "30Java",
      expectedConcepts: ["string concatenation"] },
    { id: 7,  type: "MCQ",        topic: "Exception Handling",         difficulty: "EASY",
      question: "Which exception is thrown when you try to access a member of a null object reference?",
      options: ["ArithmeticException", "NullPointerException", "ArrayIndexOutOfBoundsException", "ClassCastException"],
      correctAnswer: "NullPointerException",
      expectedConcepts: ["NullPointerException trigger"] },
    { id: 8,  type: "MCQ",        topic: "Multithreading",             difficulty: "HARD",
      question: "What is the purpose of the volatile keyword in Java?",
      options: ["To make a variable immutable", "To ensure changes to a variable are visible across threads immediately", "To serialize an object", "To finalize a block of code"],
      correctAnswer: "To ensure changes to a variable are visible across threads immediately",
      expectedConcepts: ["volatile memory model"] },
    { id: 9,  type: "MCQ",        topic: "Concurrency",                difficulty: "HARD",
      question: "Which interface represents a thread task that can return a value and throw checked exceptions?",
      options: ["Runnable", "Callable", "Thread", "Executor"],
      correctAnswer: "Callable",
      expectedConcepts: ["Callable interface"] },
    { id: 10, type: "MCQ",        topic: "OOP Concepts",               difficulty: "EASY",
      question: "What does the super keyword reference in a Java class constructor?",
      options: ["The current class instance", "The parent class constructor or instance", "The package namespace", "The root Object class"],
      correctAnswer: "The parent class constructor or instance",
      expectedConcepts: ["super keyword constructor call"] }
  ],
  sql: [
    { id: 1,  type: "MCQ",        topic: "SQL Basics",                 difficulty: "EASY",
      question: "Which SQL clause is used to filter groups after aggregation?",
      options: ["WHERE", "GROUP BY", "HAVING", "ORDER BY"],
      correctAnswer: "HAVING",
      expectedConcepts: ["HAVING filter"] },
    { id: 2,  type: "MCQ",        topic: "Joins",                      difficulty: "MEDIUM",
      question: "Which join returns all rows from the left table and matched rows from the right table?",
      options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "CROSS JOIN"],
      correctAnswer: "LEFT JOIN",
      expectedConcepts: ["left join mapping"] },
    { id: 3,  type: "MCQ",        topic: "Indexes",                    difficulty: "MEDIUM",
      question: "What is the primary purpose of adding an index to a database column?",
      options: ["To enforce data uniqueness", "To speed up search lookup queries", "To reduce file storage sizes", "To automatically format data"],
      correctAnswer: "To speed up search lookup queries",
      expectedConcepts: ["database indexing speed"] },
    { id: 4,  type: "MCQ",        topic: "Constraints",                difficulty: "EASY",
      question: "Which constraint ensures that all values in a column are different?",
      options: ["NOT NULL", "FOREIGN KEY", "UNIQUE", "DEFAULT"],
      correctAnswer: "UNIQUE",
      expectedConcepts: ["unique constraint"] },
    { id: 5,  type: "MCQ",        topic: "Normalization",              difficulty: "HARD",
      question: "What is the database normalization level that removes transitive dependencies?",
      options: ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form"],
      correctAnswer: "Third Normal Form (3NF)",
      expectedConcepts: ["3NF definition"] },
    { id: 6,  type: "MCQ",        topic: "Window Functions",           difficulty: "HARD",
      question: "Which window function is used to assign a rank to each row with no gaps in ranking values?",
      options: ["RANK()", "DENSE_RANK()", "ROW_NUMBER()", "LAG()"],
      correctAnswer: "DENSE_RANK()",
      expectedConcepts: ["dense_rank window function"] },
    { id: 7,  type: "MCQ",        topic: "Transactions",               difficulty: "MEDIUM",
      question: "What does ACID stand for in database transaction management?",
      options: ["Accuracy, Consistency, Isolation, Durability", "Atomicity, Consistency, Isolation, Durability", "Authentication, Currency, Integration, Distribution", "Aggregation, Concurrency, Indexing, Deletion"],
      correctAnswer: "Atomicity, Consistency, Isolation, Durability",
      expectedConcepts: ["ACID transaction properties"] },
    { id: 8,  type: "MCQ",        topic: "DDL Commands",               difficulty: "EASY",
      question: "Which command is used to add a new column to an existing database table?",
      options: ["UPDATE TABLE", "ALTER TABLE", "INSERT INTO", "CREATE TABLE"],
      correctAnswer: "ALTER TABLE",
      expectedConcepts: ["ALTER TABLE command"] },
    { id: 9,  type: "MCQ",        topic: "Sorting",                    difficulty: "EASY",
      question: "What is the default sorting order of the ORDER BY clause?",
      options: ["Ascending (ASC)", "Descending (DESC)", "Random", "Alphabetical only"],
      correctAnswer: "Ascending (ASC)",
      expectedConcepts: ["ORDER BY sorting defaults"] },
    { id: 10, type: "MCQ",        topic: "Pattern Matching",           difficulty: "EASY",
      question: "Which SQL operator is used to search for a specified pattern in a column?",
      options: ["IN", "BETWEEN", "LIKE", "EXISTS"],
      correctAnswer: "LIKE",
      expectedConcepts: ["LIKE wildcard query"] }
  ],
  dsa: [
    { id: 1,  type: "MCQ",        topic: "Arrays & Complexity",        difficulty: "EASY",
      question: "What is the time complexity of inserting an element at the beginning of an array of size n?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctAnswer: "O(n)",
      expectedConcepts: ["array insertion shift"] },
    { id: 2,  type: "MCQ",        topic: "Trees",                      difficulty: "MEDIUM",
      question: "In a balanced binary search tree with n nodes, what is the search time complexity?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctAnswer: "O(log n)",
      expectedConcepts: ["balanced tree search"] },
    { id: 3,  type: "MCQ",        topic: "Graphs",                     difficulty: "MEDIUM",
      question: "Which graph traversal algorithm uses a queue data structure to visit nodes level-by-level?",
      options: ["Depth-First Search (DFS)", "Breadth-First Search (BFS)", "Dijkstra's Algorithm", "Kruskal's Algorithm"],
      correctAnswer: "Breadth-First Search (BFS)",
      expectedConcepts: ["BFS traversal queue"] },
    { id: 4,  type: "MCQ",        topic: "Searching",                  difficulty: "EASY",
      question: "What is the time complexity of the binary search algorithm on a sorted array of size n?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctAnswer: "O(log n)",
      expectedConcepts: ["binary search complexity"] },
    { id: 5,  type: "MCQ",        topic: "Basic Data Structures",      difficulty: "EASY",
      question: "Which data structure operates on a Last In First Out (LIFO) basis?",
      options: ["Queue", "Stack", "Linked List", "Tree"],
      correctAnswer: "Stack",
      expectedConcepts: ["stack LIFO structure"] },
    { id: 6,  type: "MCQ",        topic: "Hash Tables",                difficulty: "MEDIUM",
      question: "What is the average time complexity of searching for an element in a Hash Table?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctAnswer: "O(1)",
      expectedConcepts: ["hashtable lookup average case"] },
    { id: 7,  type: "MCQ",        topic: "Algorithm Techniques",       difficulty: "HARD",
      question: "Which algorithm paradigm solves optimization problems by caching results of subproblems (memoization)?",
      options: ["Greedy Algorithm", "Dynamic Programming", "Backtracking", "Divide and Conquer"],
      correctAnswer: "Dynamic Programming",
      expectedConcepts: ["dynamic programming memoization"] },
    { id: 8,  type: "MCQ",        topic: "Sorting",                    difficulty: "MEDIUM",
      question: "What is the worst-case time complexity of Quick Sort?",
      options: ["O(n)", "O(n log n)", "O(n²)", "O(2^n)"],
      correctAnswer: "O(n²)",
      expectedConcepts: ["quicksort worst case"] },
    { id: 9,  type: "MCQ",        topic: "Graphs",                     difficulty: "HARD",
      question: "Which algorithm finds the shortest path from a single source node in a weighted graph with no negative edge weights?",
      options: ["Bellman-Ford", "Dijkstra's Algorithm", "Kruskal's", "Prim's"],
      correctAnswer: "Dijkstra's Algorithm",
      expectedConcepts: ["Dijkstra algorithm shortest path"] },
    { id: 10, type: "MCQ",        topic: "Trees",                      difficulty: "MEDIUM",
      question: "What is the spatial complexity of a recursive depth-first search in the worst case (tree height h)?",
      options: ["O(1)", "O(log h)", "O(h)", "O(n log n)"],
      correctAnswer: "O(h)",
      expectedConcepts: ["DFS recursion stack space"] }
  ],
  nodejs: [
    { id: 1,  type: "MCQ",        topic: "Node.js Core",               difficulty: "EASY",
      question: "What mechanism does Node.js use to execute asynchronous, non-blocking operations?",
      options: ["Multi-threading", "The Event Loop", "Forking processes", "Synchronous compilation"],
      correctAnswer: "The Event Loop",
      expectedConcepts: ["event loop asynchronous non-blocking"] },
    { id: 2,  type: "MCQ",        topic: "Packages",                   difficulty: "EASY",
      question: "Which file defines a Node.js project's dependencies and scripts?",
      options: ["index.js", "package.json", "config.env", "npm.config"],
      correctAnswer: "package.json",
      expectedConcepts: ["package json configuration"] },
    { id: 3,  type: "MCQ",        topic: "Express",                    difficulty: "MEDIUM",
      question: "What is the role of next() in Express.js middleware?",
      options: ["Ends the request cycle", "Passes control to the next middleware function", "Sends the HTTP response", "Crashes the server"],
      correctAnswer: "Passes control to the next middleware function",
      expectedConcepts: ["express middleware next function"] },
    { id: 4,  type: "MCQ",        topic: "Node.js Core",               difficulty: "EASY",
      question: "Which module is built into Node.js to manage files and directories?",
      options: ["path", "fs", "http", "os"],
      correctAnswer: "fs",
      expectedConcepts: ["fs file system module"] },
    { id: 5,  type: "MCQ",        topic: "Streams",                    difficulty: "HARD",
      question: "How can you read a large 10GB file in Node.js without running out of memory?",
      options: ["fs.readFileSync", "Using Node Streams", "JSON.parse", "Spawning a thread"],
      correctAnswer: "Using Node Streams",
      expectedConcepts: ["node streams large files"] },
    { id: 6,  type: "MCQ",        topic: "Security",                   difficulty: "MEDIUM",
      question: "What is the correct way to secure user passwords in a Node database?",
      options: ["Store as plain text", "Hash passwords with a library like bcrypt", "Encrypt with Base64", "Use MD5 hashing without salt"],
      correctAnswer: "Hash passwords with a library like bcrypt",
      expectedConcepts: ["password hashing bcrypt"] },
    { id: 7,  type: "MCQ",        topic: "Packages",                   difficulty: "EASY",
      question: "What is the default package manager installed alongside Node.js?",
      options: ["yarn", "pnpm", "npm", "pip"],
      correctAnswer: "npm",
      expectedConcepts: ["npm package manager"] },
    { id: 8,  type: "MCQ",        topic: "Authentication",             difficulty: "MEDIUM",
      question: "Which HTTP header is commonly parsed to verify a user's JSON Web Token (JWT) in middleware?",
      options: ["Content-Type", "Authorization", "User-Agent", "Accept"],
      correctAnswer: "Authorization",
      expectedConcepts: ["JWT authorization header"] },
    { id: 9,  type: "MCQ",        topic: "Error Handling",             difficulty: "MEDIUM",
      question: "What event is fired when a Node.js process encounters an error that wasn't caught in a try/catch?",
      options: ["unhandledRejection", "uncaughtException", "exit", "error"],
      correctAnswer: "uncaughtException",
      expectedConcepts: ["uncaught exception event"] },
    { id: 10, type: "MCQ",        topic: "Real-time",                  difficulty: "HARD",
      question: "Which protocol allows bidirectional real-time communication between client and Node server?",
      options: ["HTTP/1.1", "WebSockets", "GraphQL", "gRPC"],
      correctAnswer: "WebSockets",
      expectedConcepts: ["websockets real time protocol"] }
  ],
  uiux: [
    { id: 1,  type: "MCQ",        topic: "Design Principles",          difficulty: "EASY",
      question: "What is the primary goal of visual hierarchy in UI design?",
      options: ["To use all available colors", "To guide the user's eye to important actions in order", "To write CSS code fast", "To display data in tables only"],
      correctAnswer: "To guide the user's eye to important actions in order",
      expectedConcepts: ["visual hierarchy design"] },
    { id: 2,  type: "MCQ",        topic: "Accessibility",              difficulty: "MEDIUM",
      question: "What contrast ratio does WCAG 2.1 AA require for normal body text against its background?",
      options: ["2:1", "3:1", "4.5:1", "7:1"],
      correctAnswer: "4.5:1",
      expectedConcepts: ["WCAG contrast ratio compliance"] },
    { id: 3,  type: "MCQ",        topic: "Wireframing",                difficulty: "EASY",
      question: "What is the main purpose of creating wireframes?",
      options: ["To finalize visual color themes", "To establish layout structure and flow without styling details", "To publish component packages", "To host user database tables"],
      correctAnswer: "To establish layout structure and flow without styling details",
      expectedConcepts: ["wireframe layout design"] },
    { id: 4,  type: "MCQ",        topic: "User Research",              difficulty: "EASY",
      question: "Which research method collects detailed qualitative feedback through direct conversation?",
      options: ["A/B Testing", "User Interviews", "Heatmap Analysis", "Page View Analytics"],
      correctAnswer: "User Interviews",
      expectedConcepts: ["user interviews qualitative research"] },
    { id: 5,  type: "MCQ",        topic: "Tooling",                    difficulty: "MEDIUM",
      question: "What does Auto-layout in Figma primarily assist with?",
      options: ["Selecting font families", "Designing responsive cards and layouts that adapt to content size", "Exporting code directly to production", "Drawing vectors"],
      correctAnswer: "Designing responsive cards and layouts that adapt to content size",
      expectedConcepts: ["figma autolayout design"] },
    { id: 6,  type: "MCQ",        topic: "User Flow",                  difficulty: "MEDIUM",
      question: "What is the definition of Information Architecture (IA)?",
      options: ["Coding backend APIs", "Organizing, structuring, and labeling product content and navigation paths", "Creating animations", "Running performance tests"],
      correctAnswer: "Organizing, structuring, and labeling product content and navigation paths",
      expectedConcepts: ["information architecture indexing"] },
    { id: 7,  type: "MCQ",        topic: "Usability Testing",          difficulty: "MEDIUM",
      question: "Which usability testing metric measures the overall usability score of a system?",
      options: ["CAC", "System Usability Scale (SUS)", "NPS", "Churn Rate"],
      correctAnswer: "System Usability Scale (SUS)",
      expectedConcepts: ["SUS usability scale score"] },
    { id: 8,  type: "MCQ",        topic: "Design Systems",             difficulty: "HARD",
      question: "What is the Atomic Design methodology composed of in order?",
      options: ["Atoms, Molecules, Organisms, Templates, Pages", "Pages, Templates, Organisms, Molecules, Atoms", "Components, Layouts, Pages", "Colors, Fonts, Sizes"],
      correctAnswer: "Atoms, Molecules, Organisms, Templates, Pages",
      expectedConcepts: ["atomic design methodology stages"] },
    { id: 9,  type: "MCQ",        topic: "Accessibility",              difficulty: "MEDIUM",
      question: "What does the WCAG standard primarily focus on?",
      options: ["Page load speeds", "Web Accessibility for users with disabilities", "Security protocols", "SEO indexes"],
      correctAnswer: "Web Accessibility for users with disabilities",
      expectedConcepts: ["WCAG web accessibility definition"] },
    { id: 10, type: "MCQ",        topic: "Handoff",                    difficulty: "EASY",
      question: "What tool helps designers inspect layouts, margins, and grab CSS values in Figma?",
      options: ["Design Mode", "Dev Mode", "Play Mode", "Sketch Mode"],
      correctAnswer: "Dev Mode",
      expectedConcepts: ["figma dev mode specs handoff"] }
  ],
  marketing: [
    { id: 1,  type: "MCQ",        topic: "Marketing Metrics",          difficulty: "EASY",
      question: "What does CAC stand for in growth marketing?",
      options: ["Customer Activity Cycle", "Customer Acquisition Cost", "Channel Allocation Capital", "Conversion Average Count"],
      correctAnswer: "Customer Acquisition Cost",
      expectedConcepts: ["customer acquisition cost metric"] },
    { id: 2,  type: "MCQ",        topic: "Email Marketing",            difficulty: "MEDIUM",
      question: "Which KPI best measures email campaign conversion quality?",
      options: ["Open rate", "Click-through rate (CTR)", "Conversion rate", "Bounce rate"],
      correctAnswer: "Conversion rate",
      expectedConcepts: ["email marketing conversion metric"] },
    { id: 3,  type: "MCQ",        topic: "SEO",                        difficulty: "EASY",
      question: "What is the main benefit of organic SEO over Paid Search Ads (PPC)?",
      options: ["Instant results", "No ongoing direct cost per click or impression", "Guaranteed top ranking", "Less content required"],
      correctAnswer: "No ongoing direct cost per click or impression",
      expectedConcepts: ["organic SEO benefits"] },
    { id: 4,  type: "MCQ",        topic: "Audience Profiling",         difficulty: "MEDIUM",
      question: "What is an Ideal Customer Profile (ICP)?",
      options: ["A profile of your highest-performing salesperson", "A detailed description of the company type or customer cohort that gets the most value from your product", "A database model of a user account", "A generic demographic survey"],
      correctAnswer: "A detailed description of the company type or customer cohort that gets the most value from your product",
      expectedConcepts: ["ideal customer profile target"] },
    { id: 5,  type: "MCQ",        topic: "Paid Search",                difficulty: "MEDIUM",
      question: "Which keyword match type in Google Ads gives you the most control over search query triggers?",
      options: ["Broad Match", "Phrase Match", "Exact Match", "Negative Match"],
      correctAnswer: "Exact Match",
      expectedConcepts: ["exact match keywords"] },
    { id: 6,  type: "MCQ",        topic: "Paid Social",                difficulty: "MEDIUM",
      question: "What is the main purpose of the Meta Pixel?",
      options: ["To compress ad image files", "To track user actions on your website to measure and optimize social ad campaigns", "To design vector logos", "To speed up website loading"],
      correctAnswer: "To track user actions on your website to measure and optimize social ad campaigns",
      expectedConcepts: ["meta pixel conversion tracking"] },
    { id: 7,  type: "MCQ",        topic: "Automation",                 difficulty: "MEDIUM",
      question: "In email marketing automation, what is a 'drip campaign'?",
      options: ["A single broadcast email sent to everyone", "A series of automated emails sent on a predefined schedule based on user actions", "A method to clean up spam subscribers", "An A/B subject line test"],
      correctAnswer: "A series of automated emails sent on a predefined schedule based on user actions",
      expectedConcepts: ["email marketing automation flows"] },
    { id: 8,  type: "MCQ",        topic: "Conversions",                difficulty: "EASY",
      question: "What is the principal goal of above-the-fold content on a landing page?",
      options: ["To list all product specifications", "To grab attention and communicate the core value proposition immediately without scrolling", "To display the footer links", "To show cookie policy banners"],
      correctAnswer: "To grab attention and communicate the core value proposition immediately without scrolling",
      expectedConcepts: ["above the fold landing page value"] },
    { id: 9,  type: "MCQ",        topic: "Analytics",                  difficulty: "HARD",
      question: "In Google Analytics 4 (GA4), how is user behavior tracked?",
      options: ["Using pageviews exclusively", "Using event-based data models", "Through cookies only", "Via email subscriptions"],
      correctAnswer: "Using event-based data models",
      expectedConcepts: ["GA4 event based tracking"] },
    { id: 10, type: "MCQ",        topic: "Growth Loops",               difficulty: "HARD",
      question: "What does the 'K-factor' measure in viral marketing?",
      options: ["The percentage of users who churn", "The number of new users acquired via the viral invites of an existing user", "The cost of paid traffic", "Search engine ranking positions"],
      correctAnswer: "The number of new users acquired via the viral invites of an existing user",
      expectedConcepts: ["k factor viral loops"] }
  ],
  pm: [
    { id: 1,  type: "MCQ",        topic: "Specifications",             difficulty: "EASY",
      question: "What is the primary purpose of a Product Requirements Document (PRD)?",
      options: ["To write code for the engineering team", "To align stakeholders on the problem, features, and release criteria", "To estimate the marketing ad budget", "To detail database schemas and API routes"],
      correctAnswer: "To align stakeholders on the problem, features, and release criteria",
      expectedConcepts: ["PRD purpose"] },
    { id: 2,  type: "MCQ",        topic: "Product Definition",         difficulty: "EASY",
      question: "What does MVP stand for in product development?",
      options: ["Most Valued Program", "Minimum Viable Product", "Maximum Value Protocol", "Market Verification Process"],
      correctAnswer: "Minimum Viable Product",
      expectedConcepts: ["MVP concept"] },
    { id: 3,  type: "MCQ",        topic: "Product Metrics",            difficulty: "MEDIUM",
      question: "What is the North Star Metric?",
      options: ["The total revenue of a company in a year", "The key metric that best captures the core value a product delivers to customers", "The customer service response rate", "The number of hours developers spend coding"],
      correctAnswer: "The key metric that best captures the core value a product delivers to customers",
      expectedConcepts: ["North star metric"] },
    { id: 4,  type: "MCQ",        topic: "Prioritization",             difficulty: "MEDIUM",
      question: "Which framework prioritizes features using Reach, Impact, Confidence, and Effort?",
      options: ["Kano Model", "RICE Framework", "MoSCoW Method", "Story Mapping"],
      correctAnswer: "RICE Framework",
      expectedConcepts: ["RICE prioritization"] },
    { id: 5,  type: "MCQ",        topic: "User Research",              difficulty: "EASY",
      question: "What is the purpose of user personas in product design?",
      options: ["To model database user roles", "To represent archetypal target users to guide product decisions", "To write technical test cases", "To track marketing campaign budgets"],
      correctAnswer: "To represent archetypal target users to guide product decisions",
      expectedConcepts: ["user personas"] },
    { id: 6,  type: "MCQ",        topic: "Data Analytics",             difficulty: "MEDIUM",
      question: "What is a cohort analysis?",
      options: ["A group discussion between team leaders", "Analysis of user behavior grouped by common characteristics over time", "A financial audit of marketing campaigns", "A database migration script"],
      correctAnswer: "Analysis of user behavior grouped by common characteristics over time",
      expectedConcepts: ["cohort analysis"] },
    { id: 7,  type: "MCQ",        topic: "Prioritization",             difficulty: "MEDIUM",
      question: "What is the Kano model used for?",
      options: ["Estimating development hours", "Classifying customer preferences and prioritizing features based on satisfaction", "Writing system architecture specifications", "Calculating CAC and LTV"],
      correctAnswer: "Classifying customer preferences and prioritizing features based on satisfaction",
      expectedConcepts: ["Kano model satisfaction"] },
    { id: 8,  type: "MCQ",        topic: "Product Role",               difficulty: "EASY",
      question: "What is the primary difference between a Product Manager and a Project Manager?",
      options: ["PM focuses on the 'Why' and 'What', Project Manager focuses on the 'How' and 'When'", "Product Manager writes code, Project Manager manages people", "There is no difference", "Project Manager defines product strategy, Product Manager executes it"],
      correctAnswer: "PM focuses on the 'Why' and 'What', Project Manager focuses on the 'How' and 'When'",
      expectedConcepts: ["PM vs Project Manager role"] },
    { id: 9,  type: "MCQ",        topic: "Product Economics",          difficulty: "HARD",
      question: "What does LTV/CAC ratio measure?",
      options: ["Product-market fit", "Customer lifetime value compared to the cost to acquire them", "The speed of the engineering team", "The ratio of bugs to features"],
      correctAnswer: "Customer lifetime value compared to the cost to acquire them",
      expectedConcepts: ["LTV/CAC ratio"] },
    { id: 10, type: "MCQ",        topic: "Product Lifecycle",          difficulty: "MEDIUM",
      question: "What is 'feature creep'?",
      options: ["When a feature is deprecated", "The tendency for product requirements to expand over time, causing delays", "A bug that moves between components", "A stealth release of a feature"],
      correctAnswer: "The tendency for product requirements to expand over time, causing delays",
      expectedConcepts: ["feature creep scope"] }
  ]
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
  const entries = Object.values(fb).filter(f => f && typeof f.score === "number");
  if (entries.length === 0) return 0;
  const correctCount = entries.filter(f => f.score === 10).length;
  return Math.round((correctCount / entries.length) * 100);
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
      ? entries.reduce((a, { f }) => a + f.score, 0)
      : 0;

  const irScore = computeInterviewReadiness(fb, questions);

  const strengthFreq: Record<string, number> = {};
  const gapFreq: Record<string, number> = {};
  entries.forEach(({ f }) => {
    (f.strengths || []).forEach((s: string) => { strengthFreq[s] = (strengthFreq[s] ?? 0) + 1; });
    (f.gaps || []).forEach((g: string) => { gapFreq[g] = (gapFreq[g] ?? 0) + 1; });
  });

  const strengths = Object.entries(strengthFreq).sort((a, b) => b[1] - a[1]).map(([s]) => s).slice(0, 5);
  const weakAreas = Object.entries(gapFreq).sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 5);

  const mistakeAnalysis: MistakeAnalysisItem[] = entries
    .filter(({ f }) => f.score < 10)
    .map(({ idx, f }) => {
      const q = questions[idx];
      return {
        questionId:            q.id,
        questionNumber:        idx + 1,
        topic:                 q.topic,
        questionType:          q.type,
        score:                 f.score,
        mistake:               `Selected Option: ${f.selectedAnswer}`,
        expectedApproach:      `Correct Answer: ${f.correctAnswer}`,
        improvementSuggestion: `Review ${q.topic} concepts and practice similar questions.`,
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
    skill:              skill.label,
    skillId:            skill.id,
    score:              avgScore,
    level:              getLevel(avgScore),
    interviewReadiness: irScore,
    strengths,
    weakAreas,
    mistakeAnalysis,
    questionResults,
    completedAt:        new Date().toISOString(),
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

export function SkillSelectScreen({
  onSelect,
  onResetKey,
}: {
  onSelect: (skillId: string) => void;
  onResetKey: () => void;
}) {
  const [selected, setSelected] = useState<string>("");
  const [starting, setStarting] = useState(false);

  const selectedSkill = SKILLS.find(s => s.id === selected) ?? null;

  const handleStart = () => {
    if (!selected) return;
    setStarting(true);
    setTimeout(() => onSelect(selected), 1200);
  };

  const technical    = SKILLS.filter(s => s.category === "Technical");
  const nonTechnical = SKILLS.filter(s => s.category === "Non-Technical");

  return (
    <div className="flex flex-col lg:flex-row bg-[#F4F4F6] px-4 py-6 sm:px-6 sm:py-8 lg:px-16 lg:py-12 gap-8 lg:gap-24 mt-20 items-start justify-center min-h-[calc(100vh-80px)] overflow-x-hidden">

      {/* Left column */}
      <div className="flex flex-col justify-start w-full lg:w-auto">
        <div className="inline-flex items-center gap-2 bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] rounded-2xl px-3.5 py-1.5 mb-7 w-fit">
          <span className="text-[#7C3AED] font-bold text-[10px] sm:text-[11px] tracking-[1.5px] sm:tracking-[2px]">
            🎯 SKILL ASSESSMENT ENGINE V2.0
          </span>
        </div>
        <div className="text-3xl sm:text-4xl font-[900] leading-[1.05] text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] inline-block uppercase">KNOW YOUR</div>
        <div className="text-3xl sm:text-4xl font-[900] leading-[1.05] italic mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] inline-block uppercase">TRUE LEVEL.</div>
        <p className="text-[#666] text-sm leading-relaxed max-w-full lg:max-w-[340px]">
          Select a skill. We will prepare{" "}
          <span className="text-[#7C3AED] font-semibold">10 Multiple Choice Questions designed to assess your knowledge.</span>
        </p>

        {/* Stats grid */}
        <div className="mt-8 lg:mt-10 grid grid-cols-2 gap-3 sm:gap-4 w-full lg:max-w-[340px]">
          {[
            { label: "Questions",      value: "10 MCQs" },
            { label: "Question Types", value: "Multiple Choice" },
            { label: "Scoring",        value: "10 pts / MCQ" },
            { label: "Report",         value: "Instant" },
          ].map(card => (
            <div key={card.label} className="rounded-2xl border border-white bg-white/80 p-4 sm:p-5 shadow-[0_6px_24px_rgba(0,0,0,0.05)]">
              <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[1.5px] sm:tracking-[2px] text-gray-400">{card.label}</div>
              <div className="mt-2 sm:mt-3 text-base sm:text-lg font-black text-[#111827]">{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right card */}
      <div className="w-full max-w-full sm:max-w-[440px] mx-auto lg:mx-0 bg-white rounded-3xl p-4 sm:p-6 lg:p-8 shadow-[0_15px_50px_rgba(0,0,0,0.08)] flex flex-col gap-6">

        {/* ── Dropdown skill selector ── */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold tracking-[2px] text-gray-400 uppercase">
            Select a Skill
          </label>

          {/* Custom select wrapper */}
          <div className="relative">
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="w-full appearance-none bg-white border-2 rounded-xl px-4 py-3.5 pr-10 text-sm font-semibold outline-none transition-all cursor-pointer"
              style={{
                borderColor:  selected ? PURPLE : "#e5e7eb",
                color:        selected ? "#1a1a2e" : "#9CA3AF",
                boxShadow:    selected ? `0 0 0 3px rgba(124,58,237,0.1)` : "none",
              }}
            >
              <option value="" disabled>— Choose a skill to assess —</option>

              <optgroup label="── Technical Skills ──">
                {technical.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.icon}  {s.label}
                  </option>
                ))}
              </optgroup>

              <optgroup label="── Non-Technical Skills ──">
                {nonTechnical.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.icon}  {s.label}
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Custom chevron */}
            <div
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-md"
              style={{ background: selected ? PURPLE : "#f3f4f6" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4L6 8L10 4" stroke={selected ? "white" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Selected skill preview pill */}
          {selectedSkill && (
            <div
              className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl border text-xs font-semibold"
              style={{
                borderColor:     selectedSkill.color + "40",
                backgroundColor: selectedSkill.color + "0D",
                color:           selectedSkill.color,
              }}
            >
              <span>{selectedSkill.icon}</span>
              <span>{selectedSkill.label}</span>
              <span className="ml-auto text-[9px] font-black tracking-wider opacity-70">
                {selectedSkill.category.toUpperCase()} · 10 QUESTIONS
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-4">
          <button
            onClick={handleStart}
            disabled={!selected || starting}
            style={{ background: !selected || starting ? "#e5e7eb" : PURPLE }}
            className={`text-white border-none rounded-xl py-4 font-black text-[10px] sm:text-[11px] tracking-[1.5px] sm:tracking-[2px] flex items-center justify-center gap-2 transition-all shadow-lg w-full ${!selected || starting ? "text-gray-400 shadow-none cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.98] cursor-pointer"}`}
          >
            <span className="break-words text-center">
              {starting
                ? "GENERATING ASSESSMENT…"
                : selected
                  ? `START ${SKILLS.find(s => s.id === selected)?.label.toUpperCase()} ASSESSMENT →`
                  : "SELECT A SKILL TO BEGIN"}
            </span>
          </button>

          {/* Reset API key link */}
          <div className="text-center">
            <button
              onClick={() => {
                onResetKey();
              }}
              className="text-[9px] text-gray-300 font-bold tracking-widest hover:text-gray-400 transition-colors underline underline-offset-2 cursor-pointer"
            >
              RESET API KEY
            </button>
          </div>

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
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center" style={{ background: BG }}>
      <div style={{ width: 80, height: 80, background: PURPLE, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 28, boxShadow: "0 8px 30px rgba(124,58,237,0.4)" }}>
        {skill.icon}
      </div>
      <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#1a1a2e] m-0 uppercase leading-tight">
        ASSESSMENT <span style={{ color: PURPLE }}>READY.</span>
      </h1>
      <p className="text-[#555] text-sm sm:text-base mt-4 mb-10 max-w-sm sm:max-w-md">
        A <strong>10 Multiple Choice Questions</strong> assessment for <strong>{skill.label}</strong> is ready.
        Answer honestly — this measures your real level.
      </p>
      <button
        onClick={() => ready && onStart()}
        style={{ background: ready ? PURPLE : "#aaa", color: "white", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 11, cursor: ready ? "pointer" : "not-allowed", letterSpacing: 1 }}
      >
        {ready ? "BEGIN ASSESSMENT →" : "PREPARING…"}
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
  apiKey,
  onComplete,
}: {
  skill: any;
  questions: Question[];
  apiKey: string;
  onComplete: (feedback: Record<number, any>, answers: Record<number, string>) => void;
}) {
  const [qIdx, setQIdx]           = useState(0);
  const [answers, setAnswers]     = useState<Record<number, string>>({});
  const [answeredIdx, setAnswered] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback]   = useState<Record<number, any>>({});
  const [loading, setLoading]     = useState(false);

  const feedbackRef = useRef<Record<number, any>>({});

  const q          = questions[qIdx];
  const tc         = typeColors[q.type];
  const isMCQ      = q.type === "MCQ";
  const isAnswered = answeredIdx[qIdx] === true;
  const isLast     = qIdx === questions.length - 1;
  const curAnswer  = answers[qIdx] || "";

  const handleSubmit = () => {
    if (!curAnswer.trim()) return;

    const isCorrect = curAnswer === q.correctAnswer;
    const mcqFeedback = {
      score:              isCorrect ? 10 : 0,
      verdict:            isCorrect ? "PASS" : "FAIL",
      strengths:          isCorrect ? ["Correct answer selected"] : [],
      gaps:               !isCorrect ? [`Selected "${curAnswer}" instead of "${q.correctAnswer}"`] : [],
      ideal_approach:     `Correct Answer: ${q.correctAnswer}`,
      interviewReadiness: isCorrect ? 100 : 0,
      selectedAnswer:     curAnswer,
      correctAnswer:      q.correctAnswer,
      betterApproach:     `Correct Answer: ${q.correctAnswer}. Review relevant concepts.`,
      _answer:            curAnswer,
      _questionId:        q.id,
      _questionType:      q.type,
      _topic:             q.topic,
    };
    const updated = { ...feedbackRef.current, [qIdx]: mcqFeedback };
    feedbackRef.current = updated;
    setFeedback(updated);
    setAnswered(p => ({ ...p, [qIdx]: true }));
  };

  const handleNext = () => {
    if (isLast) {
      onComplete(feedbackRef.current, answers);
    } else {
      setQIdx(p => p + 1);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F4F4F6] p-4 sm:p-6 lg:p-8 gap-4 lg:gap-6 mt-16 sm:mt-20 overflow-x-hidden">

      {/* Main content */}
      <div className="flex flex-col gap-4 w-full lg:flex-1 min-w-0">

        {/* Type badge + timer */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ background: tc.bg, color: tc.text }} className="rounded-md px-2 py-0.5 text-[9px] font-black tracking-wide flex-shrink-0">{tc.label}</span>
            <span className="text-[11px] text-[#888] font-semibold tracking-wide">{q.topic}</span>
            <span className="text-[10px] text-[#bbb] font-semibold tracking-wide">{q.difficulty}</span>
          </div>
          {!isAnswered && <Timer start={qIdx} />}
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[2px] text-gray-400">Question {qIdx + 1} of {questions.length}</div>
            <div className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: tc.text }}>{tc.label}</div>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(((qIdx + 1) / questions.length) * 100)}%`, background: PURPLE }} />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-4 sm:p-6 flex-1">
          <p className="text-sm sm:text-base font-black text-[#1a1a2e] leading-relaxed mb-5 break-words">{q.question}</p>

          {!isAnswered ? (
            <>
              <div className="flex flex-col gap-2 sm:gap-3">
                {q.options!.map(opt => (
                  <button key={opt} onClick={() => setAnswers(p => ({ ...p, [qIdx]: opt }))}
                    className="w-full text-left rounded-xl px-3 sm:px-4 py-3 text-xs sm:text-sm transition-all duration-100 break-words flex items-center gap-3"
                    style={{ border: `2px solid ${curAnswer === opt ? PURPLE : "#e5e7eb"}`, background: curAnswer === opt ? "#F5F3FF" : "white", fontWeight: curAnswer === opt ? 700 : 400, color: curAnswer === opt ? PURPLE : "#374151", cursor: "pointer" }}>
                    <input type="radio" checked={curAnswer === opt} readOnly className="accent-[#7C3AED]" />
                    <span>{opt}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
                <span className="text-[9px] text-[#bbb] tracking-wide">
                  SELECT ONE OPTION
                </span>
                <button onClick={handleSubmit} disabled={!curAnswer.trim()}
                  className="w-full sm:w-auto rounded-lg px-5 py-2.5 font-black text-[10px] text-white tracking-wide transition-all flex-shrink-0"
                  style={{ background: !curAnswer.trim() ? "#d1d5db" : PURPLE, cursor: !curAnswer.trim() ? "not-allowed" : "pointer", border: "none" }}>
                  SUBMIT ANSWER →
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              {feedback[qIdx] && (
                <div className="text-center py-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="text-4xl font-black" style={{ color: feedback[qIdx].score >= 7 ? "#10B981" : feedback[qIdx].score >= 4 ? "#F59E0B" : "#EF4444" }}>
                    {feedback[qIdx].score}/10
                  </div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Answer Score</div>
                </div>
              )}

              <div className="bg-[#F9FAFB] rounded-xl p-3 sm:p-4 border border-[#e5e7eb]">
                <div className="text-[9px] font-bold text-[#9CA3AF] tracking-wide mb-1.5 uppercase">Your Answer</div>
                <div className="text-xs sm:text-sm text-[#374151] leading-relaxed overflow-hidden break-words"
                  style={{ fontFamily: q.type === "CODING" ? "monospace" : "inherit", whiteSpace: "pre-wrap", maxHeight: 120 }}>
                  {curAnswer}
                </div>
              </div>

              {feedback[qIdx]?.strengths && feedback[qIdx].strengths.length > 0 && (
                <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4">
                  <div className="text-[10px] font-bold text-[#059669] tracking-wider uppercase mb-2">✅ Strengths</div>
                  <ul className="list-disc pl-4 text-xs sm:text-sm text-gray-700 space-y-1">
                    {feedback[qIdx].strengths.map((str: string, i: number) => <li key={i}>{str}</li>)}
                  </ul>
                </div>
              )}

              {feedback[qIdx]?.gaps && feedback[qIdx].gaps.length > 0 && (
                <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl p-4">
                  <div className="text-[10px] font-bold text-[#DC2626] tracking-wider uppercase mb-2">✗ Weaknesses / Gaps</div>
                  <ul className="list-disc pl-4 text-xs sm:text-sm text-gray-700 space-y-1">
                    {feedback[qIdx].gaps.map((gap: string, i: number) => <li key={i}>{gap}</li>)}
                  </ul>
                </div>
              )}

              {feedback[qIdx]?.correctAnswer && (
                <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl p-4">
                  <div className="text-[10px] font-bold text-[#7C3AED] tracking-wider uppercase mb-1">💡 Correct Answer / Model Solution</div>
                  <p className="text-xs sm:text-sm text-gray-700 break-words leading-relaxed">{feedback[qIdx].correctAnswer}</p>
                </div>
              )}

              {feedback[qIdx]?.betterApproach && (
                <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-4">
                  <div className="text-[10px] font-bold text-[#D97706] tracking-wider uppercase mb-1">🚀 Better Approach / Recommendations</div>
                  <p className="text-xs sm:text-sm text-gray-700 break-words leading-relaxed">{feedback[qIdx].betterApproach}</p>
                </div>
              )}

              <div className="flex justify-end mt-2">
                <button onClick={handleNext}
                  className="rounded-lg px-5 sm:px-6 py-2.5 font-black text-[10px] text-white tracking-wide"
                  style={{ background: PURPLE, border: "none", cursor: "pointer" }}>
                  {isLast ? "FINISH ASSESSMENT →" : "NEXT QUESTION →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex gap-1 sm:gap-1.5">
          {questions.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full flex-1 transition-all duration-300"
              style={{ background: answeredIdx[i] ? "#10B981" : i === qIdx ? PURPLE : "#e5e7eb" }} />
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-3 lg:gap-4 w-full lg:w-56 xl:w-60 flex-shrink-0">
        <div className="rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.3)]" style={{ background: "#0f0a1a" }}>
          <div className="text-[10px] font-bold tracking-[2px] text-[#666] mb-3 lg:mb-4">QUESTION NAVIGATOR</div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {questions.map((_, i) => (
              <div key={i}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-[11px] font-black"
                style={{ background: answeredIdx[i] ? "#10B981" : i === qIdx ? PURPLE : "#1a1a2e", color: i === qIdx || answeredIdx[i] ? "white" : "#555", border: i === qIdx ? `2px solid ${PURPLE}` : "2px solid transparent" }}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <div className="text-[10px] font-bold tracking-[2px] text-[#999] mb-3">SKILL PROFILE</div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl">{skill.icon}</span>
            <div>
              <div className="text-sm font-black text-[#1a1a2e]">{skill.label}</div>
              <div className="text-[10px] text-[#888]">{skill.category}</div>
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
  const navigate   = useNavigate();
  const levelStyle = getLevelStyle(report.score);
  const readiness  = getReadinessStatus(report.interviewReadiness);

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
    <div className="min-h-screen bg-[#F4F4F6] p-4 sm:p-6 lg:p-12 xl:p-20 mt-16 sm:mt-20 overflow-x-hidden">

      {/* Header */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{skill.icon}</div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1a1a2e] m-0 uppercase leading-tight">
          SKILL REPORT <span style={{ color: PURPLE }}>COMPLETE.</span>
        </h1>
        <p className="text-[#666] mt-2 sm:mt-3 text-sm sm:text-base">
          {report.skill} Assessment · {new Date(report.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: "Skill Score",         value: `${report.score}%`,               color: PURPLE },
          { label: "Level",               value: report.level,                     color: levelStyle.color },
          { label: "Interview Readiness", value: `${report.interviewReadiness}%`,  color: readiness.color },
          { label: "Questions Answered",  value: `${report.questionResults.length}/10`, color: "#0EA5E9" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-4 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100">
            <div className="text-[8px] sm:text-[9px] text-[#999] tracking-widest uppercase font-bold leading-tight">{card.label}</div>
            <div className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-black break-words" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Score / Level / Readiness */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-5 justify-center mb-6 sm:mb-8">
        <div className="bg-white rounded-2xl p-4 sm:p-6 text-center min-w-0 sm:min-w-[140px] shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
          style={{ borderTop: `4px solid ${report.score >= 70 ? "#10B981" : report.score >= 40 ? "#F59E0B" : "#EF4444"}` }}>
          <div className="text-2xl sm:text-3xl font-black" style={{ color: PURPLE }}>{report.score}</div>
          <div className="text-[9px] sm:text-[10px] text-[#999] tracking-widest mt-1 uppercase font-bold">OVERALL SCORE</div>
        </div>
        <div className="rounded-2xl p-4 sm:p-6 text-center min-w-0 sm:min-w-[140px] flex flex-col justify-center"
          style={{ backgroundColor: levelStyle.bg, border: `2px solid ${levelStyle.color}` }}>
          <div className="text-lg sm:text-xl font-black uppercase" style={{ color: levelStyle.color }}>{report.level}</div>
          <div className="text-[9px] sm:text-[10px] tracking-widest mt-1.5 uppercase font-bold" style={{ color: levelStyle.color + "99" }}>SKILL LEVEL</div>
        </div>
        <div className="rounded-2xl p-4 sm:p-6 text-center min-w-0 sm:min-w-[140px] flex flex-col justify-center"
          style={{ backgroundColor: readiness.color + "15", border: `2px solid ${readiness.color}` }}>
          <div className="text-xl sm:text-2xl font-black" style={{ color: readiness.color }}>{report.interviewReadiness}%</div>
          <div className="text-[9px] sm:text-[10px] tracking-widest mt-1 uppercase font-bold" style={{ color: readiness.color + "99" }}>INTERVIEW READY</div>
          <div className="text-[9px] mt-1 font-bold uppercase" style={{ color: readiness.color }}>{readiness.label}</div>
        </div>
      </div>

      {/* Strengths / Weak Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
          <div className="text-[11px] font-bold text-[#10B981] tracking-wide mb-3 sm:mb-4">✅ STRENGTH AREAS</div>
          {report.strengths.length > 0
            ? report.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 mb-2.5">
                  <span className="text-[#10B981] font-black text-sm flex-shrink-0">✓</span>
                  <span className="text-xs sm:text-sm text-[#374151] leading-relaxed break-words">{s}</span>
                </div>
              ))
            : <div className="text-xs sm:text-sm text-[#9CA3AF]">Complete more questions to identify strengths.</div>
          }
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
          <div className="text-[11px] font-bold text-[#EF4444] tracking-wide mb-3 sm:mb-4">✗ WEAK AREAS</div>
          {report.weakAreas.length > 0
            ? report.weakAreas.map((g, i) => (
                <div key={i} className="flex items-start gap-2 mb-2.5">
                  <span className="text-[#EF4444] font-black text-sm flex-shrink-0">✗</span>
                  <span className="text-xs sm:text-sm text-[#374151] leading-relaxed break-words">{g}</span>
                </div>
              ))
            : <div className="text-xs sm:text-sm text-[#9CA3AF]">No significant weak areas identified.</div>
          }
        </div>
      </div>

      {/* Mistake Analysis */}
      {report.mistakeAnalysis.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-7 mb-5 sm:mb-6 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
          <div className="text-[11px] font-bold text-[#EF4444] tracking-wide mb-4 sm:mb-5">🔍 MISTAKE ANALYSIS</div>
          {report.mistakeAnalysis.map((m, i) => (
            <div key={i} className="border-l-[3px] border-[#EF4444] pl-3 sm:pl-4 mb-5 sm:mb-6">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <span className="bg-[#FEF2F2] text-[#EF4444] rounded-md px-2 py-0.5 text-[10px] font-black flex-shrink-0">Q{m.questionNumber}</span>
                <span className="text-xs sm:text-sm font-bold text-[#374151] break-words">{m.topic}</span>
                <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">Score: {m.score}/10</span>
                {m.questionType === "MCQ" && (
                  <span className="bg-[#EFF6FF] text-[#2563EB] rounded-md px-2 py-0.5 text-[9px] font-black flex-shrink-0">MCQ</span>
                )}
              </div>
              <div className="mb-2">
                <div className="text-[10px] font-bold text-[#9CA3AF] tracking-wide mb-1 uppercase">MISTAKE</div>
                <div className="text-xs sm:text-sm text-[#374151] leading-relaxed break-words">{m.mistake}</div>
              </div>
              <div className="mb-2">
                <div className="text-[10px] font-bold text-[#10B981] tracking-wide mb-1 uppercase">
                  {m.questionType === "MCQ" ? "CORRECT ANSWER" : "EXPECTED APPROACH"}
                </div>
                <div className="text-xs sm:text-sm leading-relaxed break-words"
                  style={{ color: m.questionType === "MCQ" ? "#10B981" : "#374151", fontStyle: m.questionType === "MCQ" ? "normal" : "italic", fontWeight: m.questionType === "MCQ" ? 700 : 400 }}>
                  {m.expectedApproach}
                </div>
              </div>
              <div className="bg-[#F5F3FF] rounded-lg px-3 sm:px-4 py-2.5">
                <div className="text-[10px] font-bold tracking-wide mb-1 uppercase" style={{ color: PURPLE }}>IMPROVEMENT</div>
                <div className="text-xs sm:text-sm text-[#374151] leading-relaxed break-words">{m.improvementSuggestion}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question-by-question breakdown */}
      <div className="mb-6 sm:mb-8">
        <div className="text-[11px] font-bold text-[#999] tracking-wide mb-3 sm:mb-4">QUESTION-BY-QUESTION BREAKDOWN</div>
        {questions.map((q, idx) => {
          const fb = report.questionResults[idx];
          if (!fb || !fb.verdict) return null;
          const tc = typeColors[q.type as QuestionType];
          return (
            <div key={idx} className="bg-white rounded-2xl p-4 sm:p-6 mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ background: tc.bg, color: tc.text }} className="rounded-md px-2 py-0.5 text-[9px] font-black tracking-wide flex-shrink-0">Q{idx + 1} {tc.label}</span>
                  <span className="text-[11px] text-[#888] break-words">{q.topic}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-black text-lg sm:text-xl" style={{ color: verdictColor(fb.verdict) }}>{fb.score}/10</span>
                  <span className="text-[10px] font-bold" style={{ color: verdictColor(fb.verdict) }}>{fb.verdict}</span>
                </div>
              </div>
              {fb.idealApproach && (
                <div className="text-xs sm:text-sm text-[#555] italic leading-relaxed break-words"
                  style={{ borderLeft: `3px solid ${tc.text}`, paddingLeft: 12 }}>
                  {fb.idealApproach}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <RoadmapSection skillId={report.skillId} />
      <LearningPlanSection weakAreas={report.weakAreas} skillId={report.skillId} />

      {/* Recommended Path */}
      <div className="bg-white rounded-2xl p-4 sm:p-7 mb-5 sm:mb-6 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        <div className="text-[11px] font-bold tracking-wide mb-4 sm:mb-5 uppercase" style={{ color: PURPLE }}>🗺️ RECOMMENDED LEARNING PATH</div>
        {recs.map((rec, i) => (
          <div key={i} className="flex items-center gap-3 sm:gap-4 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0"
              style={{ background: i === 0 ? PURPLE : "#F5F3FF", color: i === 0 ? "white" : PURPLE }}>
              {i + 1}
            </div>
            <span className="text-xs sm:text-sm text-[#374151] break-words flex-1" style={{ fontWeight: i === 0 ? 700 : 400 }}>{rec}</span>
            {i === 0 && (
              <span className="flex-shrink-0 text-white text-[9px] font-black rounded px-1.5 py-0.5 tracking-wide" style={{ background: PURPLE }}>START HERE</span>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center items-stretch sm:items-center pb-10">
        <button onClick={onRestart}
          className="w-full sm:w-auto text-white border-none rounded-xl py-4 px-6 sm:px-10 font-black text-xs sm:text-sm tracking-wide cursor-pointer text-center"
          style={{ background: PURPLE, boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
          TAKE ANOTHER ASSESSMENT →
        </button>
        <button onClick={() => navigate("/skill-assessment/history")}
          className="w-full sm:w-auto rounded-xl py-4 px-6 sm:px-10 font-black text-xs sm:text-sm tracking-wide cursor-pointer text-center"
          style={{ background: "white", color: PURPLE, border: `2px solid ${PURPLE}` }}>
          VIEW HISTORY →
        </button>
        <button onClick={() => navigate("/job-prep/mock-interview")}
          className="w-full sm:w-auto rounded-xl py-4 px-6 sm:px-10 font-black text-xs sm:text-sm tracking-wide cursor-pointer text-center"
          style={{ background: "white", color: "#374151", border: "2px solid #e5e7eb" }}>
          PRACTICE MOCK INTERVIEW →
        </button>
      </div>
    </div>
  );
}

// ─── ROOT EXPORT ──────────────────────────────────────────────────────────────

export default function SkillAssessment() {
  const [apiKey, setApiKey] = useState("");
  const [screen, setScreen] = useState<"apiKey" | "select" | "sync" | "test" | "report">("apiKey");
  const [skill,            setSkill]            = useState<any>(null);
  const [questions,        setQuestions]        = useState<Question[]>([]);
  const [report,           setReport]           = useState<AssessmentReport | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState<boolean>(false);

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

      {!apiKey ? (
        <ApiKeyScreen onValidate={(key) => { setApiKey(key); setScreen("select"); }} />
      ) : (
        <>
          {screen === "select" && (
            <SkillSelectScreen
              onSelect={handleSelect}
              onResetKey={() => { setApiKey(""); setScreen("apiKey"); }}
            />
          )}
          {screen === "sync" && skill && (
            <SyncScreen skill={skill} onStart={() => setScreen("test")} />
          )}
          {screen === "test" && skill && questions.length > 0 && (
            <QuestionScreen skill={skill} questions={questions} apiKey={apiKey} onComplete={handleComplete} />
          )}
          {screen === "report" && report && (
            <ReportScreen report={report} skill={skill} questions={questions} onRestart={handleRestart} />
          )}
        </>
      )}

      {questionsLoading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚡</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: PURPLE }}>Generating your personalised questions…</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>Powered by Gemini AI</div>
          </div>
        </div>
      )}
    </div>
  );
}