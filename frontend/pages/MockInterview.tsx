import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';
import {
    Code2,
    Mic,
    User,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    Loader2,
    Send,
    AlertCircle,
    MicOff,
    Briefcase,
    Clock,
    ChevronRight,
    TrendingUp,
    Brain,
    Award,
    Target,
    ShieldCheck,
    Timer,
    MessageSquare,
    Zap,
    Trophy,
    Building2
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type Step = 'INTRO' | 'API_KEY' | 'SETUP' | 'INTERVIEW' | 'REPORT';
type RoundIndex = 0 | 1 | 2;

interface ChatMessage {
    role: 'interviewer' | 'user';
    content: string;
    timestamp: string;
}

interface UserResponse {
    round: number;
    question: string;
    answer: string;
    suggestion: string;
    wordCount: number;
    score?: number;
    mistakes?: string;
}

interface InterviewReport {
    overall_score: number;
    sections: {
        label: string;
        score: number;
        feedback: string;
    }[];
    detailed_analysis: {
        round_name: string;
        total_words: number;
        responses: UserResponse[];
    }[];
    strengths: string[];
    weaknesses: string[];
    verdict: string;
}

// ── Dummy Data ─────────────────────────────────────────────────────────────
const DUMMY_QUESTIONS = [
    [
        "How does the Java JVM manage memory, and what is the role of the Garbage Collector?",
        "Explain the difference between a SQL JOIN and a subquery in terms of performance.",
        "What are decorators in Python, and how would you implement an authentication decorator?",
        "Describe the 'vanishing gradient problem' in Deep Learning and one way to fix it.",
        "How do you ensure data consistency in a distributed microservices architecture?"
    ],
    [
        "Tell me about a time you had a conflict with a teammate. How did you resolve it?",
        "Describe a project you are most proud of. What was your specific contribution?",
        "How do you handle tight deadlines when multiple tasks are high priority?",
        "Tell me about a time you failed. What did you learn from that experience?",
        "Where do you see yourself professionally in the next three to five years?"
    ],
    [
        "Tell me about yourself and your background.",
        "What are your greatest strengths and weaknesses?",
        "Where do you see yourself in five years?",
        "Why do you want to work at our company?",
        "Describe a challenging situation and how you handled it.",
        "What motivates you to perform your best at work?",
        "How do you handle stress and pressure on the job?",
        "Do you have any questions for me?"
    ]
];

const DUMMY_REPORT: InterviewReport = {
    overall_score: 84,
    sections: [
        { label: 'Technical Depth', score: 88, feedback: 'Strong grasp of core Java fundamentals and system design.' },
        { label: 'Problem Solving', score: 82, feedback: 'Logical approach to DSA. Explained time complexity clearly.' },
        { label: 'Communication', score: 85, feedback: 'Very articulate. Handled behavioral scenarios professionally.' },
        { label: 'HR Final Call', score: 80, feedback: 'Professional attitude. Clearly communicated career goals.' }
    ],
    detailed_analysis: [
        {
            round_name: "Technical Round",
            total_words: 450,
            responses: [
                {
                    round: 0,
                    question: "How does the Java JVM manage memory?",
                    answer: "It uses heap and stack memory with a garbage collector.",
                    suggestion: "You should mention specific regions like Young Generation, Old Generation and the Metaspace for a more senior-level answer.",
                    wordCount: 12,
                    mistakes: "Lacked depth on generational collection."
                }
            ]
        },
        {
            round_name: "Behavioral Round",
            total_words: 320,
            responses: [
                {
                    round: 1,
                    question: "Tell me about a time you had a conflict with a teammate.",
                    answer: "I talked to them and we sorted it out by listening to each other.",
                    suggestion: "Try using the STAR method (Situation, Task, Action, Result). Quantify the impact of the resolution.",
                    wordCount: 15,
                    mistakes: "Missing 'Result' phase of the STAR method."
                }
            ]
        },
        {
            round_name: "HR Round",
            total_words: 280,
            responses: [
                {
                    round: 2,
                    question: "Where do you see yourself in five years?",
                    answer: "Working at a big company like yours in a lead position.",
                    suggestion: "Focus more on specific skill growth and how that growth helps the company specifically.",
                    wordCount: 14
                }
            ]
        }
    ],
    strengths: ['Backend System Design', 'JVM Internals', 'Articulate Communication'],
    weaknesses: ['Deep Learning Edge Cases', 'SQL Query Tuning'],
    verdict: 'Recommended for Hire'
};

const DOMAIN_OPTIONS = [
    'Software Engineer',
    'Data Analyst',
    'Product Manager',
    'DevOps',
    'Data Scientist'
];

const COMPANY_TYPE_OPTIONS = [
    'Startup',
    'MNC',
    'Product-Based',
    'Service-Based'
];

const QUESTION_BANKS = [DUMMY_QUESTIONS[0], DUMMY_QUESTIONS[1], DUMMY_QUESTIONS[2]] as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const tokenize = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) || [];

const isSkipText = (text: string) => {
    const t = text.toLowerCase().trim();
    return t === 'skip' || t === 'idont know' || t === 'next question' || t === "i don't know";
};

const computeAnswerScore = (question: string, answer: string, round: number) => {
    const cleanAnswer = answer.trim();
    if (!cleanAnswer || isSkipText(cleanAnswer) || /no response received/i.test(cleanAnswer)) return 0;

    const answerTokens = tokenize(cleanAnswer);
    const questionTokens = tokenize(question);
    const answerUnique = new Set(answerTokens);
    const answerSet = new Set(answerTokens);
    const overlap = questionTokens.filter(token => answerSet.has(token)).length;

    const lengthScore = clamp((answerTokens.length / 18) * 35, 0, 35);
    const uniquenessScore = clamp((answerUnique.size / Math.max(answerTokens.length, 1)) * 20, 0, 20);
    const relevanceScore = clamp((overlap / Math.max(questionTokens.length, 1)) * 30, 0, 30);
    const structureScore = /[.!?]/.test(cleanAnswer) ? 10 : 0;
    const roundBias = round === 0 ? 5 : round === 1 ? 3 : 0;

    return clamp(Math.round(lengthScore + uniquenessScore + relevanceScore + structureScore + roundBias), 0, 100);
};

const roundVerdict = (score: number, answeredCount: number) => {
    if (answeredCount === 0) return 'No Responses Submitted';
    if (score >= 85) return 'Strong Hire';
    if (score >= 70) return 'Potential Hire';
    if (score >= 50) return 'Needs Practice';
    return 'Not Ready Yet';
};

const feedbackForRound = (score: number, answeredCount: number, skippedCount: number) => {
    if (answeredCount === 0) return 'No answers were provided for this round, so the score remains low.';
    if (score >= 85) return 'Strong answer quality, clear structure, and good relevance to the prompt.';
    if (score >= 70) return 'Solid answers overall, but adding specificity and stronger examples would help.';
    if (score >= 50) return 'Some relevant content is present, but answers are short, incomplete, or too generic.';
    return skippedCount > 0
        ? 'Most answers were skipped or too thin to evaluate meaningfully.'
        : 'Responses were too short or too generic to show enough interview readiness.';
};

const buildHonestReport = (responses: UserResponse[]): InterviewReport => {
    const roundLabels = ['Technical Round', 'Behavioral Round', 'HR Round'];
    const roundExpectedCounts = QUESTION_BANKS.map(bank => bank.length);

    const sections = roundLabels.map((label, roundIndex) => {
        const roundResponses = responses.filter(response => response.round === roundIndex);
        const nonSkipped = roundResponses.filter(response => !isSkipText(response.answer) && response.answer.trim().length > 0);
        const skippedCount = roundResponses.length - nonSkipped.length;

        const qualityScores = roundResponses.map(response =>
            typeof response.score === 'number'
                ? response.score
                : computeAnswerScore(response.question, response.answer, roundIndex)
        );

        const avgQuality = qualityScores.length
            ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
            : 0;

        const completeness = roundExpectedCounts[roundIndex] > 0
            ? nonSkipped.length / roundExpectedCounts[roundIndex]
            : 0;

        const roundScore = Math.round((avgQuality * 0.7) + (completeness * 100 * 0.3));

        return {
            label,
            score: clamp(roundScore, 0, 100),
            feedback: feedbackForRound(clamp(roundScore, 0, 100), nonSkipped.length, skippedCount)
        };
    });

    const weightedOverall = Math.round(
        (sections[0].score * 0.4) +
        (sections[1].score * 0.3) +
        (sections[2].score * 0.3)
    );

    const answeredCount = responses.filter(response => !isSkipText(response.answer) && response.answer.trim().length > 0).length;
    const skippedCount = responses.length - answeredCount;
    const verdict = roundVerdict(weightedOverall, answeredCount);

    const strongRounds = sections
        .filter(section => section.score >= 75)
        .map(section => `${section.label}: solid performance`);

    const weakRounds = sections
        .filter(section => section.score < 75)
        .map(section => `${section.label}: needs stronger, more specific answers`);

    const detailedAnalysis = roundLabels.map((label, roundIndex) => ({
        round_name: label,
        total_words: responses.filter(response => response.round === roundIndex)
            .reduce((total, response) => total + response.wordCount, 0),
        responses: responses.filter(response => response.round === roundIndex)
    }));

    return {
        overall_score: clamp(weightedOverall, 0, 100),
        sections,
        detailed_analysis: detailedAnalysis,
        strengths: strongRounds.length > 0 ? strongRounds : ['No strong signals were captured from the answers provided.'],
        weaknesses: weakRounds.length > 0 ? weakRounds : (skippedCount > 0 ? ['Skipped answers reduced the evaluation quality.'] : ['Answers were too short or too generic to score confidently.']),
        verdict,
    };
};

export default function MockInterview() {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('INTRO');
    const [setup, setSetup] = useState({ company: '', role: '', experience: 'FRESHER', domain: '', companyType: COMPANY_TYPE_OPTIONS[2] });
    const [roundIndex, setRoundIndex] = useState<RoundIndex>(0);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [allResponses, setAllResponses] = useState<UserResponse[]>([]);

    const [userInput, setUserInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const voiceTimeoutRef = useRef<any>(null);
    const recognitionRef = useRef<any>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const [report, setReport] = useState<InterviewReport | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [hrCallOver, setHrCallOver] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    // video/webcam removed per request: no camera state kept
    const roundQuestionIndexRef = useRef<Record<RoundIndex, number>>({ 0: 0, 1: 0, 2: 0 });

    const [isDummyMode, setIsDummyMode] = useState(false);
    const dummyQIdxRef = useRef(0);
    const [blink, setBlink] = useState(false);
    const [mouthOpen, setMouthOpen] = useState(false);
    const mouthIntervalRef = useRef<any>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [showHint, setShowHint] = useState(false);
    const hintTimerRef = useRef<any>(null);

    const [apiKey, setApiKey] = useState(localStorage.getItem('groq_api_key') || '');
    const [showingKey, setShowingKey] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    
    // NEW: Enhanced animation states for commercial UI
    const [danceMove, setDanceMove] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const [answerQuality, setAnswerQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | null>(null);
    const [performanceMetrics, setPerformanceMetrics] = useState({ avgScore: 0, answerCount: 0, timeSpent: 0 });
    const [streakCount, setStreakCount] = useState(0);
    const [showParticles, setShowParticles] = useState(false);
    const [difficulty, setDifficulty] = useState('MEDIUM');
    // camera refs removed

    const checkSkip = (text: string) => isSkipText(text);

    const normalizeInterviewAnswer = (text: string) => {
        return checkSkip(text)
            ? "I don't know the answer to this, next question please."
            : text;
    };

    useEffect(() => { window.scrollTo(0, 0); }, [step]);
    useEffect(() => {
        if (chatEndRef.current?.parentElement) {
            const container = chatEndRef.current.parentElement;
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    // Character Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setBlink(true);
            setTimeout(() => setBlink(false), 150);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // NEW: Dancing animation
    useEffect(() => {
        if (isSpeaking || isThinking) {
            const danceInterval = setInterval(() => {
                setDanceMove(prev => (prev + 1) % 4);
            }, 400);
            return () => clearInterval(danceInterval);
        }
    }, [isSpeaking, isThinking]);

     useEffect(() => {
        if (isSpeaking) {
            mouthIntervalRef.current = setInterval(() => {
                setMouthOpen(m => !m);
            }, 180);
        } else {
            clearInterval(mouthIntervalRef.current);
            setMouthOpen(false);
        }
        return () => clearInterval(mouthIntervalRef.current);
    }, [isSpeaking]);

    // Idle Hint Logic: Triggered if user hasn't typed for 2 seconds after being asked a question.
    useEffect(() => {
        if (step !== 'INTERVIEW' || isSending || isSpeaking || userInput.trim().length > 0 || hrCallOver) {
            setShowHint(false);
            if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
            return;
        }

        if (messages.length > 0 && messages[messages.length - 1].role === 'interviewer') {
            if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
            hintTimerRef.current = setTimeout(() => {
                setShowHint(true);
            }, 2000);
        }

        return () => {
            if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        };
    }, [userInput, step, isSending, isSpeaking, messages, hrCallOver]);

    // Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                if (currentTranscript.trim()) {
                    setVoiceTranscript(currentTranscript);
                    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
                    voiceTimeoutRef.current = setTimeout(() => {
                        handleVoiceAnswer(currentTranscript);
                        recognitionRef.current?.stop();
                    }, 2000);
                }
            };
            recognitionRef.current.onend = () => setIsListening(false);
            recognitionRef.current.onerror = () => setIsListening(false);
        }
    }, [sessionId]);

    const startInterview = async () => {
        if (!setup.company.trim() || !setup.domain.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/interview/setup`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Groq-API-Key': apiKey
                },
                body: JSON.stringify(setup)
            });
            const data = await res.json();
            setSessionId(data._id);
            setStep('INTERVIEW');
            setRoundIndex(0);
            roundQuestionIndexRef.current = { 0: 0, 1: 0, 2: 0 };

            // Always start with the technical round first
            const intro = `Hello! I'm Alex Chen, Senior Technical Lead at ${setup.company}. I'll be conducting your technical interview today.`;
            const firstQ = QUESTION_BANKS[0][0];
            const fullMsg = `${intro} ${firstQ}`;

            setMessages([{ role: 'interviewer', content: fullMsg, timestamp: new Date().toLocaleTimeString() }]);
            speak(fullMsg, 0);
        } catch (err) {
            setIsDummyMode(true);
            setStep('INTERVIEW');
            setRoundIndex(0);
            roundQuestionIndexRef.current = { 0: 0, 1: 0, 2: 0 };
            const intro = `Hello! I'm Alex Chen, Senior Technical Lead at ${setup.company}. I'll be conducting your technical interview today.`;
            const firstQ = QUESTION_BANKS[0][0];
            const fullMsg = `${intro} ${firstQ}`;
            setMessages([{ role: 'interviewer', content: fullMsg, timestamp: new Date().toLocaleTimeString() }]);
            speak(fullMsg, 0);
        } finally { setLoading(false); }
    };

    const loadHistory = () => {
        try {
            const h = JSON.parse(localStorage.getItem('mock_interview_history') || '[]');
            setHistory(Array.isArray(h) ? h : []);
        } catch (e) { setHistory([]); }
    };

    const handleSendChat = async () => {
        if (!userInput.trim() || isSending || isSpeaking) return;
        const turn = userInput;
        const lastQ = messages.filter(m => m.role === 'interviewer').slice(-1)[0]?.content || "";
        setMessages(prev => [...prev, { role: 'user', content: turn, timestamp: new Date().toLocaleTimeString() }]);

        const isSkip = checkSkip(turn);
        const actualResponse = normalizeInterviewAnswer(turn);
        const responseScore = computeAnswerScore(lastQ, actualResponse, roundIndex);

        // NEW: Determine answer quality for celebration
        let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
        if (responseScore >= 80) quality = 'excellent';
        else if (responseScore >= 65) quality = 'good';
        else if (responseScore >= 50) quality = 'fair';

        // NEW: Update streak and show celebration
        if (!isSkip && responseScore >= 65) {
            setStreakCount(prev => prev + 1);
            setShowCelebration(true);
            setShowParticles(true);
            setTimeout(() => setShowCelebration(false), 1500);
            setTimeout(() => setShowParticles(false), 2000);
        } else {
            setStreakCount(0);
        }

        setAnswerQuality(quality);
        setTimeout(() => setAnswerQuality(null), 2000);

        // Track response metadata
        const newResponse: UserResponse = {
            round: roundIndex,
            question: lastQ,
            answer: actualResponse,
            wordCount: turn.split(' ').length,
            score: responseScore,
            suggestion: roundIndex === 0 ? "Be more specific with technical terminology." : "Use the STAR method for better context.",
            mistakes: isSkip ? "Skipped question." : (roundIndex === 1 ? "Incomplete STAR methodology." : undefined)
        };
        setAllResponses(prev => [...prev, newResponse]);

        // NEW: Update performance metrics
        const updatedResponses = [...allResponses, newResponse];
        const avgScore = updatedResponses.length > 0 
            ? updatedResponses.reduce((sum, r) => sum + (r.score || 0), 0) / updatedResponses.length 
            : 0;
        setPerformanceMetrics({
            avgScore: Math.round(avgScore),
            answerCount: updatedResponses.length,
            timeSpent: Math.floor((Date.now() - (sessionId ? parseInt(sessionId.slice(0, 8), 16) : Date.now())) / 1000)
        });

        setUserInput('');
        setIsSending(true);
        setIsThinking(true);
        try {
             if (isDummyMode) {
                setTimeout(() => {
                    dummyQIdxRef.current++;
                    const bank = QUESTION_BANKS[roundIndex];
                    if (dummyQIdxRef.current >= bank.length) advanceRound();
                    else {
                        const nextQ = bank[dummyQIdxRef.current];
                        setMessages(prev => [...prev, { role: 'interviewer', content: nextQ, timestamp: new Date().toLocaleTimeString() }]);
                        speak(nextQ, roundIndex);
                    }
                    setIsThinking(false);
                    setIsSending(false);
                }, 400); 
                return;
            }
             const res = await fetch(`${API_BASE_URL}/api/interview/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Groq-API-Key': apiKey
                },
                body: JSON.stringify({ session_id: sessionId, user_response: actualResponse, round_index: roundIndex })
            });
            await res.json();
            setIsThinking(false);
            const bank = QUESTION_BANKS[roundIndex];
            const currentIndex = roundQuestionIndexRef.current[roundIndex];
            const nextIndex = currentIndex + 1;

            if (nextIndex >= bank.length) {
                advanceRound();
                return;
            }

            roundQuestionIndexRef.current[roundIndex] = nextIndex;
            const nextQuestion = bank[nextIndex];
            setMessages(prev => [...prev, { role: 'interviewer', content: nextQuestion, timestamp: new Date().toLocaleTimeString() }]);
            speak(nextQuestion, roundIndex);
        } catch (err) {
            setIsThinking(false);
            try { console.error("Chat Error:", err instanceof Error ? err.message : String(err)); } catch (_) {}
        } finally { setIsSending(false); }
    };

    // Handle quick action buttons (skip / idont know / next question)
    const handleQuickAction = async (hint: string) => {
        if (isSending || isSpeaking) return;
        const displayText = hint; // show the hint as user's message
        const lastQ = messages.filter(m => m.role === 'interviewer').slice(-1)[0]?.content || "";
        setMessages(prev => [...prev, { role: 'user', content: displayText, timestamp: new Date().toLocaleTimeString() }]);

        // record as a skipped response
        const newResponse: UserResponse = {
            round: roundIndex,
            question: lastQ,
            answer: "",
            wordCount: 0,
            score: 0,
            suggestion: roundIndex === 0 ? "Be more specific with technical terminology." : "Use the STAR method for better context.",
            mistakes: "Skipped question."
        };
        setAllResponses(prev => [...prev, newResponse]);

        setIsSending(true);
        setIsThinking(true);

        try {
            if (isDummyMode) {
                setTimeout(() => {
                    dummyQIdxRef.current++;
                    const bank = QUESTION_BANKS[roundIndex];
                    if (dummyQIdxRef.current >= bank.length) advanceRound();
                    else {
                        const nextQ = bank[dummyQIdxRef.current];
                        setMessages(prev => [...prev, { role: 'interviewer', content: nextQ, timestamp: new Date().toLocaleTimeString() }]);
                        speak(nextQ, roundIndex);
                    }
                    setIsThinking(false);
                    setIsSending(false);
                }, 400);
                return;
            }
            const makeChatCall = async (userResp: string) => {
                const res = await fetch(`${API_BASE_URL}/api/interview/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Groq-API-Key': apiKey
                    },
                    body: JSON.stringify({ session_id: sessionId, user_response: userResp, round_index: roundIndex })
                });
                return res.json();
            };

            await makeChatCall("");
            setIsThinking(false);

            const bank = QUESTION_BANKS[roundIndex];
            const currentIndex = roundQuestionIndexRef.current[roundIndex];
            const nextIndex = currentIndex + 1;

            if (nextIndex >= bank.length) {
                advanceRound();
                return;
            }

            roundQuestionIndexRef.current[roundIndex] = nextIndex;
            const nextQuestion = bank[nextIndex];
            setMessages(prev => [...prev, { role: 'interviewer', content: nextQuestion, timestamp: new Date().toLocaleTimeString() }]);
            speak(nextQuestion, roundIndex);
        } catch (e) {
            setIsThinking(false);
            console.error(e);
        } finally {
            setIsSending(false);
        }
    };

    const advanceRound = async () => {
        setIsSending(true);
        setIsThinking(true);
        const nextRound = (roundIndex + 1) as RoundIndex;

        if (nextRound > 2) {
            setHrCallOver(true);
            setTimeout(() => fetchReport(), 2000);
            setIsSending(false);
            return;
        }

        try {
            // Always move into the next round with its own local bank
            const res = await fetch(`${API_BASE_URL}/api/interview/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Groq-API-Key': apiKey
                },
                body: JSON.stringify({ session_id: sessionId, user_response: "", round_index: nextRound })
            });
            await res.json();
            setIsThinking(false);

            setRoundIndex(nextRound);
            roundQuestionIndexRef.current[nextRound] = 0;
            setMessages([]); // Clear chat for new round

            // Add introduction based on round
            let intro = "";
            if (nextRound === 1) {
                intro = `Hello! I'm Sarah Johnson, Senior Engineering Manager at ${setup.company}. I'll be conducting your behavioral interview now.`;
            } else if (nextRound === 2) {
                intro = `Hello! I'm Michael Rodriguez, HR Director at ${setup.company}. I'll be conducting your final HR interview. Please answer using text only.`;
            }
            const nextQuestion = QUESTION_BANKS[nextRound][0];
            const fullMsg = `${intro} ${nextQuestion}`;

            setMessages([{ role: 'interviewer', content: fullMsg, timestamp: new Date().toLocaleTimeString() }]);
            speak(fullMsg, nextRound);
        } catch (err) {
            try { console.error("Transition Error:", err instanceof Error ? err.message : String(err)); } catch (_) {}
            // Fallback
            setRoundIndex(nextRound);
            roundQuestionIndexRef.current[nextRound] = 0;
            const intro = nextRound === 2
                ? `Hello! I'm Michael Rodriguez, HR Director at ${setup.company}. I'll be conducting your final HR interview. Please answer using text only.`
                : `Hello! I'm Sarah Johnson, Senior Engineering Manager at ${setup.company}. I'll be conducting your behavioral interview now.`;
            const nextQuestion = QUESTION_BANKS[nextRound][0];
            const fullMsg = `${intro} ${nextQuestion}`;
            setMessages([{ role: 'interviewer', content: fullMsg, timestamp: new Date().toLocaleTimeString() }]);
            speak(fullMsg, nextRound);
        } finally {
            setIsSending(false);
        }
    };

    const walkOut = () => {
        // Stop any ongoing speech
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        setIsListening(false);
        
        // Reset all interview state
        setStep('INTRO');
        setRoundIndex(0);
        setMessages([]);
        setSessionId(null);
        setIsDummyMode(false);
        setHrCallOver(false);
        setAllResponses([]);
        setReport(null);
        setUserInput('');
        
        // Redirect to dashboard/learner page
        navigate('/dashboard/learner');
    };

    const toggleMic = () => {
        if (isListening) {
            setIsListening(false);
            recognitionRef.current?.stop();
            if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
            if (voiceTranscript.trim()) handleVoiceAnswer(voiceTranscript);
        } else {
            setVoiceTranscript('');
            setIsListening(true);
            try { recognitionRef.current?.start(); } catch (err) { setIsListening(false); }
        }
    };

    const handleVoiceAnswer = async (text: string) => {
        if (!text.trim()) return;
        const lastQ = messages.filter(m => m.role === 'interviewer').slice(-1)[0]?.content || "";
        setIsSending(true);
        setIsThinking(true);
        setVoiceTranscript('');
        setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toLocaleTimeString() }]);

         const isSkip = checkSkip(text);
        const actualText = normalizeInterviewAnswer(text);

        const newResponse: UserResponse = {
            round: 2,
            question: lastQ,
            answer: actualText,
            wordCount: text.split(' ').length,
            suggestion: "Expand your answers more to show confidence. Aim for 30+ words.",
            mistakes: isSkip ? "Skipped question." : (text.split(' ').length < 10 ? "Answer is too short." : undefined)
        };
        setAllResponses(prev => [...prev, newResponse]);

        try {
            if (isDummyMode) {
                setTimeout(() => {
                    dummyQIdxRef.current++;
                    if (dummyQIdxRef.current >= 5) {
                        setHrCallOver(true);
                        speak("That was a great conversation. I'm finalizing your report now.", 2);
                        setTimeout(() => fetchReport(), 3000);
                    } else {
                        const nextQ = DUMMY_QUESTIONS[2][dummyQIdxRef.current];
                        setMessages(prev => [...prev, { role: 'interviewer', content: nextQ, timestamp: new Date().toLocaleTimeString() }]);
                        speak(nextQ, 2);
                    }
                    setIsThinking(false);
                    setIsSending(false);
                }, 1000);
                return;
            }
             const res = await fetch(`${API_BASE_URL}/api/interview/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Groq-API-Key': apiKey
                },
                body: JSON.stringify({ session_id: sessionId, user_response: actualText, round_index: 2 })
            });
            const data = await res.json();
            setIsThinking(false);
            if (data.is_round_complete) {
                setHrCallOver(true);
                setMessages(prev => [...prev, { role: 'interviewer', content: data.interviewer_text, timestamp: new Date().toLocaleTimeString() }]);
                speak(data.interviewer_text, 2);
                setTimeout(() => fetchReport(), 2500);
            } else {
                setMessages(prev => [...prev, { role: 'interviewer', content: data.interviewer_text, timestamp: new Date().toLocaleTimeString() }]);
                speak(data.interviewer_text, 2);
            }
        } catch (err) { 
            setIsThinking(false);
        } finally { setIsSending(false); }
    };

    const speak = (text: string, currentRound: number) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        // If voices are not loaded yet, retry when they are available
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) {
            const handleVoices = () => {
                try {
                    window.speechSynthesis.onvoiceschanged = null;
                    speak(text, currentRound);
                } catch (e) { /* ignore */ }
            };
            window.speechSynthesis.onvoiceschanged = handleVoices;
            // also trigger a voices fetch
            window.speechSynthesis.getVoices();
            return;
        }

        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utteranceRef.current = utterance; // retain reference

            // Voice Selection based on round (best-effort, fallback to default)
            if (currentRound === 2) {
                const femaleVoice = voices.find((v: any) => /female|samantha|google us english/i.test(v.name));
                if (femaleVoice) utterance.voice = femaleVoice;
                utterance.pitch = 1.2;
                utterance.rate = 1.0;
            } else {
                const maleVoice = voices.find((v: any) => /male|alex|google uk english male/i.test(v.name));
                if (maleVoice) utterance.voice = maleVoice;
                utterance.pitch = 0.9;
                utterance.rate = 1.0;
            }

            utterance.onstart = () => {
                setIsSpeaking(true);
                if (isListening) recognitionRef.current?.stop();
            };
            utterance.onend = () => {
                setIsSpeaking(false);
            };

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error('TTS error', e);
        }
    };

    const fetchReport = async () => {
        // Stop any ongoing speech when transitioning to report
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        setIsListening(false);
        
        setStep('REPORT');
        setLoadingReport(true);
        const reportData = buildHonestReport(allResponses);
        
        // Show report immediately (don't wait for backend)
        setReport(reportData);
        setLoadingReport(false);
        
        // Save to localStorage
        try {
            const entry = { id: sessionId || `local-${Date.now()}`, date: new Date().toISOString(), company: setup.company, role: setup.role, domain: setup.domain, companyType: setup.companyType, experience: setup.experience, score: reportData.overall_score, report: reportData };
            const prev = JSON.parse(localStorage.getItem('mock_interview_history') || '[]');
            const next = [entry].concat(Array.isArray(prev) ? prev : []);
            localStorage.setItem('mock_interview_history', JSON.stringify(next.slice(0,50)));
        } catch (e) { }
        
        // Attempt to save report to backend asynchronously (no wait)
        if (sessionId && !isDummyMode) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            fetch(`${API_BASE_URL}/api/interview/report?session_id=${sessionId}`, { signal: controller.signal })
                .then(() => clearTimeout(timeoutId))
                .catch(err => {
                    clearTimeout(timeoutId);
                });
        }
    };

    // Auto-fetch voices when they are loaded (some browsers load them asynchronously)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
    }, []);

    // camera start/stop effect removed

    const ROUND_META = [
        { label: 'Technical Round', icon: <Code2 className="w-5 h-5" />, color: '#7C3AED', hint: 'DSA, Architecture, and Logic. Type your answers.' },
        { label: 'Behavioral Round', icon: <User className="w-5 h-5" />, color: '#1D74F2', hint: 'Situational scenarios and culture fit. Type your answers.' },
        { label: 'HR Round', icon: <Mic className="w-5 h-5" />, color: '#EC4899', hint: 'Type your HR answers clearly and honestly.' },
    ];

    const SpeakingAvatar = ({ isHR }: { isHR: boolean }) => {
        const eyeScaleY = blink ? 0.05 : 1;
        const getMouthPath = () => isSpeaking && mouthOpen ? "M 95 168 Q 110 180 125 168 Q 110 190 95 168 Z" : "M 92 168 Q 110 185 128 168";
        
        // NEW: Enhanced dancing transformation
        const getDanceTransform = () => {
            const moves = [
                "translate(0px, 0px) rotateZ(0deg) scaleX(1)",
                "translate(8px, -10px) rotateZ(2deg) scaleX(1.02)",
                "translate(-8px, -12px) rotateZ(-2deg) scaleX(0.98)",
                "translate(4px, -8px) rotateZ(1deg) scaleX(1.01)"
            ];
            return moves[danceMove] || moves[0];
        };

        return (
            <div className="flex flex-col items-center">
                <style>{`
                    @keyframes glowPulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.05)} }
                    @keyframes breathing { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.01)} }
                    @keyframes danceBounce { 0%{transform:translateY(0px)} 50%{transform:translateY(-15px)} 100%{transform:translateY(0px)} }
                    @keyframes swing { 0%{transform:rotateZ(-3deg)} 50%{transform:rotateZ(3deg)} 100%{transform:rotateZ(-3deg)} }
                    @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
                `}</style>
                <div className="relative">
                    {/* NEW: Floating particles around avatar */}
                    {(isSpeaking || isThinking) && showParticles && (
                        <>
                            <div className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-[float_2s_infinite]" style={{top: '-30px', left: '20px'}} />
                            <div className="absolute w-2 h-2 bg-purple-300 rounded-full animate-[float_2s_infinite]" style={{top: '-20px', right: '20px', animationDelay: '0.3s'}} />
                            <div className="absolute w-1.5 h-1.5 bg-cyan-300 rounded-full animate-[float_2s_infinite]" style={{bottom: '20px', left: '-15px', animationDelay: '0.6s'}} />
                        </>
                    )}

                    <div className={`absolute inset-0 ${isHR ? 'bg-cyan-400' : 'bg-[#7C3AED]'} rounded-full blur-[80px] opacity-15 animate-[glowPulse_3s_infinite]`} />
                    {isThinking && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`w-40 h-40 border-4 ${isHR ? 'border-cyan-400/20' : 'border-[#7C3AED]/20'} rounded-full animate-ping`} />
                            <div className={`absolute w-44 h-44 border-2 ${isHR ? 'border-cyan-400/10' : 'border-[#7C3AED]/10'} rounded-full animate-pulse`} />
                        </div>
                    )}
                    
                    <svg 
                        width="180" 
                        height="300" 
                        viewBox="0 0 220 380" 
                        className="relative z-10 drop-shadow-xl overflow-visible transition-transform duration-300"
                        style={{
                            transform: (isSpeaking || isThinking) ? getDanceTransform() : "translate(0px, 0px) rotateZ(0deg) scaleX(1)",
                            animation: (isSpeaking || isThinking) ? 'danceBounce 0.8s ease-in-out infinite' : 'none'
                        }}
                    >
                        <defs>
                            <radialGradient id="faceGrad" cx="50%" cy="45%" r="55%"><stop offset="0%" stopColor="#FFE0BB" /><stop offset="60%" stopColor="#F5C28A" /><stop offset="100%" stopColor="#E8A96B" /></radialGradient>
                            <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e3a5f" /><stop offset="100%" stopColor="#0f2340" /></linearGradient>
                            <linearGradient id="maleSuit" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#2c3e50" /><stop offset="100%" stopColor="#1c2833" /></linearGradient>
                        </defs>
                        <g style={{ transformOrigin: "110px 300px", animation: "breathing 3s ease-in-out infinite" }}>
                            <path d="M 20 260 Q 10 310 8 380 L 212 380 Q 210 310 200 260 Q 168 282 110 284 Q 52 282 20 260 Z" fill={isHR ? "url(#suitGrad)" : "url(#maleSuit)"} />
                            <path d="M 78 226 L 110 220 L 142 226 L 126 276 L 110 282 L 94 276 Z" fill="#f0f4ff" />
                            <rect x="95" y="204" width="30" height="28" rx="10" fill="url(#faceGrad)" />
                        </g>
                        <ellipse cx="110" cy="138" rx="63" ry="68" fill="url(#faceGrad)" />
                        <path d="M 48 125 Q 46 70 72 52 Q 92 38 110 37 Q 128 38 148 52 Q 174 70 172 125 Q 158 100 142 93 Q 126 87 110 88 Q 94 87 78 93 Q 62 100 48 125 Z" fill={isHR ? "#1b0a33" : "#2c2c2c"} />
                        <g style={{ transformOrigin: "89px 130px", transform: `scaleY(${eyeScaleY})` }}>
                            <ellipse cx="89" cy="130" rx="14" ry="11" fill="white" /><circle cx="89" cy="131" r="9" fill="#3a1870" /><circle cx="89" cy="131" r="4.5" fill="#0a0416" /><circle cx="93" cy="127" r="2.8" fill="white" />
                        </g>
                        <g style={{ transformOrigin: "131px 130px", transform: `scaleY(${eyeScaleY})` }}>
                            <ellipse cx="131" cy="130" rx="14" ry="11" fill="white" /><circle cx="131" cy="131" r="9" fill="#3a1870" /><circle cx="131" cy="131" r="4.5" fill="#0a0416" /><circle cx="135" cy="127" r="2.8" fill="white" />
                        </g>
                        <path d={getMouthPath()} fill={isSpeaking && mouthOpen ? "#8B2040" : "none"} stroke="#b03050" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </div>
                
                {/* NEW: Celebration confetti effect */}
                {showCelebration && (
                    <>
                        <motion.div initial={{y: 0, opacity: 1}} animate={{y: -100, opacity: 0}} transition={{duration: 1}} className="absolute top-0 text-3xl">🎉</motion.div>
                        <motion.div initial={{y: 0, opacity: 1}} animate={{y: -100, opacity: 0}} transition={{duration: 1}} className="absolute top-5 left-10 text-2xl">⭐</motion.div>
                        <motion.div initial={{y: 0, opacity: 1}} animate={{y: -100, opacity: 0}} transition={{duration: 1}} className="absolute top-5 right-10 text-2xl">✨</motion.div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-white flex flex-col pt-24 pb-0">
            <div className="flex-grow pb-20">
                <style>{`
                @keyframes sp-shimmer {
                    0%   { transform: translateX(-180%) skewX(-20deg); }
                    100% { transform: translateX(300%) skewX(-20deg); }
                }
                @keyframes sp-orb1 {
                    0%,100% { transform: translate(0px,0px) scale(1);    opacity:0.55; }
                    40%     { transform: translate(8px,-6px) scale(1.3);  opacity:0.9; }
                    70%     { transform: translate(-4px,4px) scale(0.8);  opacity:0.4; }
                }
                @keyframes sp-orb2 {
                    0%,100% { transform: translate(0px,0px) scale(1);     opacity:0.4; }
                    35%     { transform: translate(-10px,-8px) scale(1.4); opacity:0.85; }
                    65%     { transform: translate(6px,5px) scale(0.75);   opacity:0.35; }
                }
                @keyframes sp-orb3 {
                    0%,100% { transform: translate(0px,0px) scale(1);    opacity:0.5; }
                    50%     { transform: translate(6px,8px) scale(1.25);  opacity:0.9; }
                }
                .sp-btn {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 20px 48px;
                    background: #7C3AED;
                    color: #fff;
                    font-weight: 900;
                    font-size: 12px;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    border: none;
                    border-radius: 16px;
                    cursor: pointer;
                    overflow: hidden;
                    transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
                    box-shadow: 0 4px 20px rgba(124,58,237,0.4), 0 1px 0 rgba(255,255,255,0.12) inset;
                }
                .sp-btn::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 55%);
                    pointer-events: none;
                    z-index: 1;
                }
                .sp-btn::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0;
                    width: 40%; height: 100%;
                    background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.24) 50%, transparent 80%);
                    animation: sp-shimmer 2.8s ease-in-out infinite;
                    pointer-events: none;
                    z-index: 2;
                }
                .sp-btn:not(:disabled):hover {
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 0 0 0 5px rgba(139,92,246,0.18), 0 0 32px 12px rgba(139,92,246,0.45), 0 16px 40px rgba(109,40,217,0.5);
                }
                .sp-btn:not(:disabled):active { transform: scale(0.97); }
                .sp-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .sp-orb {
                    position: absolute;
                    border-radius: 50%;
                    pointer-events: none;
                    filter: blur(7px);
                    z-index: 1;
                }
                .sp-orb1 { width:28px; height:28px; background:radial-gradient(circle,rgba(196,168,255,0.95),transparent 70%); top:-4px; left:18px; animation:sp-orb1 3.2s ease-in-out infinite; }
                .sp-orb2 { width:22px; height:22px; background:radial-gradient(circle,rgba(255,255,255,0.8),transparent 70%);  bottom:-2px; right:48px; animation:sp-orb2 4s ease-in-out infinite; }
                .sp-orb3 { width:18px; height:18px; background:radial-gradient(circle,rgba(167,139,250,0.9),transparent 70%); top:4px; right:18px;  animation:sp-orb3 2.6s ease-in-out infinite; }
                .sp-label { position:relative; z-index:5; display:flex; align-items:center; gap:8px; justify-content:center; }
            `}</style>
            <AnimatePresence mode="wait">
                {step === 'INTRO' && (
                    <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-7xl mx-auto px-6 pt-12">
                        <div className="grid lg:grid-cols-2 gap-20 items-center">
                            <div>
                                <span className="text-[#7C3AED] font-bold uppercase tracking-[0.5em] text-[10px] mb-6 block">Interview Readiness</span>
                                <h1 className="text-5xl sm:text-7xl font-black text-[#111827] mb-8 leading-[0.9] tracking-tighter uppercase">
                                    Mock <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] inline-block">INTERVIEW.</span>
                                </h1>
                                <p className="text-xl text-[#475569] mb-12 leading-relaxed max-w-lg font-medium">
                                    Simulate realistic interviews with AI, voice, and video practice. Build confidence for technical, behavioral, and HR rounds before the real call.
                                </p>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 max-w-2xl">
                                    {[
                                        { label: 'Rounds', value: '3' },
                                        { label: 'Mode', value: 'Live AI' },
                                        { label: 'Timing', value: 'Adaptive' },
                                        { label: 'Feedback', value: 'Instant' },
                                    ].map(item => (
                                        <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{item.label}</div>
                                            <div className="mt-2 text-base font-black text-gray-900">{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setStep('API_KEY')} className="sp-btn">
                                        <span className="sp-orb sp-orb1" />
                                        <span className="sp-orb sp-orb2" />
                                        <span className="sp-orb sp-orb3" />
                                        <span className="sp-label">Start Practice <ArrowRight className="w-5 h-5" /></span>
                                    </button>
                                    <button onClick={() => { loadHistory(); setHistoryOpen(true); }} className="px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold">History</button>
                                </div>

                                <div className="mt-10 flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-gray-400">
                                    <ChevronRight className="w-4 h-4 text-[#7C3AED]" /> Scroll to explore what you can practice
                                </div>
                                
                            </div>
                            <div className="hidden lg:block relative h-[520px] w-full max-w-[520px] ml-auto">
                                <div className="absolute inset-0 bg-[#7C3AED]/5 rounded-[4rem] border-8 border-gray-50 overflow-hidden shadow-2xl">
                                    <img src="https://www.awdiz.in/newsite/images/mockinterview.webp" className="w-full h-full object-cover grayscale opacity-40 mix-blend-multiply" alt="Mock Interview Visualization" />
                                    <div className="absolute bottom-12 left-12 right-12 bg-white/90 backdrop-blur-md p-8 rounded-3xl border border-white/20">
                                        <div className="flex gap-2 mb-4">
                                            <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                                            <div className="w-2 h-2 rounded-full bg-[#7C3AED]/30" />
                                            <div className="w-2 h-2 rounded-full bg-[#7C3AED]/30" />
                                        </div>
                                        <p className="text-sm font-bold text-[#111827] leading-relaxed">"Practice is the hardest part of learning, and training is the essence of transformation."</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-24 space-y-10">
                            <div className="max-w-3xl">
                                <span className="text-[#7C3AED] font-black uppercase tracking-[0.35em] text-[10px]">Why students use it</span>
                                <h2 className="text-3xl sm:text-5xl font-black text-[#111827] mt-4 leading-tight">A realistic rehearsal before the real interview.</h2>
                                <p className="mt-4 text-lg text-[#475569] leading-relaxed">
                                    The page is designed like a guided experience. Users can see the value first, then start practicing only after curiosity is built through examples, feedback, and a clear interview flow.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
                                {[
                                    { title: 'Company Learning Modules', desc: 'Master placement preparation with company-specific learning paths tailored for Google, Amazon, Microsoft, and more.', img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=900' },
                                    { title: 'AI Mock Interview Simulator', desc: 'Practice realistic company-level mock interviews with adaptive questions designed for Google, Amazon, and Microsoft preparation.', img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=900' },
                                    { title: 'AI Career Dreamer', desc: 'Discover personalized career paths based on your skills, interests, strengths, and technical experience.', img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=900' },
                                    { title: 'Placement Progress Tracker', desc: 'Track preparation progress, revisit interview sessions, and measure improvement throughout your placement journey.', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=900' }
                                ].map((item, index) => (
                                    <motion.div
                                        key={item.title}
                                        initial={{ opacity: 0, y: 18 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.3 }}
                                        transition={{ duration: 0.45, delay: index * 0.05 }}
                                        className="group overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-lg"
                                    >
                                        <div className="h-48 overflow-hidden">
                                            <img src={item.img} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        </div>
                                        <div className="p-6">
                                            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7C3AED] mb-3">Feature {index + 1}</div>
                                            <h3 className="text-xl font-black text-[#111827] mb-3">{item.title}</h3>
                                            <p className="text-sm leading-6 text-[#475569]">{item.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="grid lg:grid-cols-3 gap-5">
                                {[
                                    { title: 'How it helps', bullets: ['Reduce interview anxiety', 'Practice structured answers', 'Get instant feedback', 'Track confidence over time'] },
                                    { title: 'What you can try', bullets: ['Text answers', 'Voice answers', 'Video mode', 'Domain-based scenarios'] },
                                    { title: 'What happens next', bullets: ['Pick your profile', 'Answer questions one by one', 'Review score and strengths', 'Revisit your history later'] },
                                ].map(panel => (
                                    <div key={panel.title} className="rounded-[2rem] border border-gray-100 bg-gradient-to-br from-white to-[#FAF5FF] p-6 shadow-sm">
                                        <h3 className="text-lg font-black text-[#111827] mb-4">{panel.title}</h3>
                                        <ul className="space-y-3 text-sm text-[#475569]">
                                            {panel.bullets.map(item => (
                                                <li key={item} className="flex items-start gap-3">
                                                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#7C3AED]" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'API_KEY' && (
                    <motion.div key="api-key" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto px-6 pt-16 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[250px] bg-gradient-to-b from-[#7C3AED]/10 to-transparent blur-[100px] pointer-events-none -z-10" />
                        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                            <div className="text-center">
                                <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter italic">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] inline-block pb-1">
                                        API AUTH.
                                    </span>
                                </h2>
                                <div className="h-1 w-16 bg-black mx-auto rounded-full" />
                            </div>
                                <div className="space-y-6 text-left">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-black uppercase tracking-widest ml-4">Domain</label>
                                    <select value={setup.domain} onChange={e => setSetup({ ...setup, domain: e.target.value, role: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold">
                                        <option value="">Select domain</option>
                                        {DOMAIN_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-black uppercase tracking-widest ml-4">Company Type</label>
                                    <select value={setup.companyType} onChange={e => setSetup({ ...setup, companyType: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold">
                                        {COMPANY_TYPE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                                    <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                                        <ShieldCheck size={14} /> Protocol Requirement
                                    </div>
                                    <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                                        Our AI engine requires an API Key to process conversations. If you use Groq, you can get a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">console.groq.com</a>
                                    </p>
                                </div>
                                
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-black uppercase tracking-widest ml-4">API Key</label>
                                    <div className="relative">
                                        <Zap className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                        <input 
                                            type={showingKey ? "text" : "password"} 
                                            placeholder="Enter API key" 
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-14 py-4 text-xs font-bold focus:ring-4 focus:ring-violet-500/10 placeholder:text-gray-300" 
                                            value={apiKey} 
                                            onChange={e => setApiKey(e.target.value)} 
                                        />
                                        <button 
                                            onClick={() => setShowingKey(!showingKey)}
                                            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                                        >
                                            <Sparkles size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-3">
                                    <style>{`
                                        @keyframes auth-shimmer {
                                            0%   { transform: translateX(-180%) skewX(-20deg); }
                                            100% { transform: translateX(300%) skewX(-20deg); }
                                        }
                                        @keyframes auth-orb1 {
                                            0%,100% { transform: translate(0px,0px) scale(1);    opacity:0.55; }
                                            40%     { transform: translate(8px,-6px) scale(1.3);  opacity:0.9; }
                                            70%     { transform: translate(-4px,4px) scale(0.8);  opacity:0.4; }
                                        }
                                        @keyframes auth-orb2 {
                                            0%,100% { transform: translate(0px,0px) scale(1);     opacity:0.4; }
                                            35%     { transform: translate(-10px,-8px) scale(1.4); opacity:0.85; }
                                            65%     { transform: translate(6px,5px) scale(0.75);   opacity:0.35; }
                                        }
                                        @keyframes auth-orb3 {
                                            0%,100% { transform: translate(0px,0px) scale(1);    opacity:0.5; }
                                            50%     { transform: translate(6px,8px) scale(1.25);  opacity:0.9; }
                                        }
                                        .auth-btn {
                                            position: relative;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            gap: 16px;
                                            width: 100%;
                                            padding: 20px 0;
                                            background: #7C3AED;
                                            color: #fff;
                                            font-weight: 900;
                                            font-size: 11px;
                                            letter-spacing: 0.4em;
                                            text-transform: uppercase;
                                            border: none;
                                            border-radius: 16px;
                                            cursor: pointer;
                                            overflow: hidden;
                                            transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
                                            box-shadow: 0 4px 20px rgba(124,58,237,0.4), 0 1px 0 rgba(255,255,255,0.12) inset;
                                        }
                                        .auth-btn:disabled {
                                            opacity: 0.5;
                                            cursor: not-allowed;
                                        }
                                        .auth-btn::before {
                                            content: '';
                                            position: absolute;
                                            inset: 0;
                                            border-radius: 16px;
                                            background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 55%);
                                            pointer-events: none;
                                            z-index: 1;
                                        }
                                        .auth-btn::after {
                                            content: '';
                                            position: absolute;
                                            top: 0; left: 0;
                                            width: 40%; height: 100%;
                                            background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.24) 50%, transparent 80%);
                                            animation: auth-shimmer 2.8s ease-in-out infinite;
                                            pointer-events: none;
                                            z-index: 2;
                                        }
                                        .auth-btn:not(:disabled):hover {
                                            transform: translateY(-3px) scale(1.02);
                                            box-shadow: 0 0 0 5px rgba(139,92,246,0.18), 0 0 32px 12px rgba(139,92,246,0.45), 0 16px 40px rgba(109,40,217,0.5);
                                        }
                                        .auth-btn:not(:disabled):active { transform: scale(0.97); }
                                        .auth-orb {
                                            position: absolute;
                                            border-radius: 50%;
                                            pointer-events: none;
                                            filter: blur(7px);
                                            z-index: 1;
                                        }
                                        .auth-orb1 { width:28px; height:28px; background:radial-gradient(circle,rgba(196,168,255,0.95),transparent 70%); top:-4px; left:18px; animation:auth-orb1 3.2s ease-in-out infinite; }
                                        .auth-orb2 { width:22px; height:22px; background:radial-gradient(circle,rgba(255,255,255,0.8),transparent 70%);  bottom:-2px; right:48px; animation:auth-orb2 4s ease-in-out infinite; }
                                        .auth-orb3 { width:18px; height:18px; background:radial-gradient(circle,rgba(167,139,250,0.9),transparent 70%); top:4px; right:18px;  animation:auth-orb3 2.6s ease-in-out infinite; }
                                        .auth-label { position:relative; z-index:5; display:flex; align-items:center; gap:16px; }
                                    `}</style>
                                    <button 
                                        onClick={async () => {
                                                if (!apiKey.trim()) return;
                                                // Reject keys that were used previously by this UI
                                                try {
                                                    const usedRaw = localStorage.getItem('used_api_keys') || '[]';
                                                    const usedKeys = Array.isArray(JSON.parse(usedRaw)) ? JSON.parse(usedRaw) : [];
                                                    if (usedKeys.includes(apiKey)) {
                                                        alert('This API key has already been used here. Please provide a fresh API key.');
                                                        return;
                                                    }
                                                } catch (e) {
                                                    // ignore parse errors and proceed
                                                }

                                                setLoading(true);
                                                setError('');
                                                try {
                                                    // Try a lightweight setup call to validate the provided API key.
                                                    const res = await fetch(`${API_BASE_URL}/api/interview/setup`, {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'X-Groq-API-Key': apiKey
                                                        },
                                                        body: JSON.stringify({ company: 'Validator Inc', role: 'Validator', domain: 'Validator' })
                                                    });

                                                    if (res.status === 401 || res.status === 403) {
                                                        alert('API key rejected (unauthorized). Please provide a valid key.');
                                                        setLoading(false);
                                                        return;
                                                    }

                                                    if (!res.ok) {
                                                        // Non-auth errors — inform the user and do not accept the key.
                                                        alert('Unable to validate API key (server error). Check network or try again later.');
                                                        setLoading(false);
                                                        return;
                                                    }

                                                    // Valid key — persist and proceed to setup
                                                    localStorage.setItem('groq_api_key', apiKey);

                                                    // Mark this key as used so it cannot be reused later
                                                    try {
                                                        const prev = JSON.parse(localStorage.getItem('used_api_keys') || '[]');
                                                        const arr = Array.isArray(prev) ? prev : [];
                                                        arr.push(apiKey);
                                                        localStorage.setItem('used_api_keys', JSON.stringify(arr.slice(-50)));
                                                    } catch (e) { /* ignore */ }

                                                    setStep('SETUP');
                                                } catch (e) {
                                                    console.error('Key validation error', e);
                                                    alert('Network error while validating API key. Ensure backend is reachable.');
                                                } finally { setLoading(false); }
                                        }} 
                                        disabled={!apiKey.trim()} 
                                        className="auth-btn"
                                    >
                                        <span className="auth-orb auth-orb1" />
                                        <span className="auth-orb auth-orb2" />
                                        <span className="auth-orb auth-orb3" />
                                        <span className="auth-label">Authorize & Continue <ArrowRight className="w-4 h-4" /></span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'SETUP' && (
                    <motion.div key="setup" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto px-6 pt-16 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[250px] bg-gradient-to-b from-[#7C3AED]/10 to-transparent blur-[100px] pointer-events-none -z-10" />
                        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                            <div className="text-center">
                                <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter italic">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] inline-block pb-1">
                                        Session Config.
                                    </span>
                                </h2>
                                <div className="h-1 w-16 bg-black mx-auto rounded-full" />
                            </div>
                            <div className="space-y-6 text-left">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-black uppercase tracking-widest ml-4">Target Company</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                        <input type="text" placeholder="e.g. Google" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-14 py-4 text-sm font-bold focus:ring-4 focus:ring-violet-500/10 placeholder:text-gray-300" value={setup.company} onChange={e => setSetup({ ...setup, company: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center ml-4">
                                        <label className="text-[10px] font-black text-black uppercase tracking-widest">Difficulty Level</label>
                                        <span className="text-[11px] font-black text-black uppercase tracking-widest px-4 py-1.5 bg-purple-50 rounded-full border border-purple-200 italic transition-all">{difficulty}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['EASY', 'MEDIUM', 'HARD'].map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setDifficulty(level)}
                                                className={`py-3 px-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                                                    difficulty === level
                                                        ? level === 'HARD' ? 'bg-red-500 text-white' : level === 'MEDIUM' ? 'bg-purple-500 text-white' : 'bg-green-500 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {level === 'EASY' && '🟢'} {level === 'MEDIUM' && '🟡'} {level === 'HARD' && '🔴'} {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center ml-4">
                                        <label className="text-[10px] font-black text-black uppercase tracking-widest">Experience Range</label>
                                        <span className="text-[11px] font-black text-black uppercase tracking-widest px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 italic transition-all">{setup.experience}</span>
                                    </div>
                                    <div className="px-5 py-6 bg-gray-50/50 rounded-3xl border border-gray-100 shadow-inner">
                                        <input
                                            type="range"
                                            min="0"
                                            max="3"
                                            step="1"
                                            value={['FRESHER', '1-2 YRS', '2-3 YRS', '3+ YRS'].indexOf(setup.experience)}
                                            onChange={(e) => {
                                                const lvls = ['FRESHER', '1-2 YRS', '2-3 YRS', '3+ YRS'];
                                                setSetup({ ...setup, experience: lvls[parseInt(e.target.value)] });
                                            }}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#7C3AED] hover:accent-[#6C4DFF] focus:outline-none transition-all"
                                        />
                                        <div className="flex justify-between mt-4 px-1">
                                            {['FRESHER', '1-2 YRS', '2-3 YRS', '3+ YRS'].map((lvl, i) => (
                                                <div key={lvl} className="flex flex-col items-center gap-2">
                                                    <div className={`w-1 h-1 rounded-full ${setup.experience === lvl ? 'bg-black' : 'bg-gray-300'}`} />
                                                    <span className={`text-[8px] font-black uppercase tracking-widest text-black`}>{lvl}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-3">
                                    <button onClick={startInterview} disabled={loading || !setup.company || !setup.domain} className={`sp-btn w-full !py-5 !rounded-2xl ${loading || !setup.company || !setup.domain ? '!bg-gray-300 !text-white cursor-not-allowed' : ''}`}>
                                        <span className="sp-orb sp-orb1" />
                                        <span className="sp-orb sp-orb2" />
                                        <span className="sp-orb sp-orb3" />
                                        <span className="sp-label text-[11px] font-black uppercase tracking-[0.4em]">
                                            {loading ? <Loader2 className="animate-spin" /> : <>Generate Protocol <ArrowRight className="w-4 h-4" /></>}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'INTERVIEW' && (
                    <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto px-6 pt-12">
                        {/* NEW: Performance Metrics Dashboard */}
                        <motion.div 
                            initial={{ y: -20, opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            className="grid grid-cols-4 gap-4 mb-8"
                        >
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-2">Streak 🔥</div>
                                <div className="text-3xl font-black text-purple-900">{streakCount}</div>
                                <div className="text-[9px] text-purple-600 mt-1">Good answers</div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Score ⭐</div>
                                <div className="text-3xl font-black text-blue-900">{performanceMetrics.avgScore}%</div>
                                <div className="text-[9px] text-blue-600 mt-1">Average</div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">Answers ✓</div>
                                <div className="text-3xl font-black text-green-900">{performanceMetrics.answerCount}</div>
                                <div className="text-[9px] text-green-600 mt-1">Submitted</div>
                            </div>
                            <div className={`rounded-2xl p-4 border-2 font-black text-center transition-all ${
                                answerQuality === 'excellent' ? 'bg-yellow-50 border-yellow-300 text-yellow-600' :
                                answerQuality === 'good' ? 'bg-green-50 border-green-300 text-green-600' :
                                answerQuality === 'fair' ? 'bg-orange-50 border-orange-300 text-orange-600' :
                                answerQuality === 'poor' ? 'bg-red-50 border-red-300 text-red-600' :
                                'bg-gray-50 border-gray-200 text-gray-400'
                            }`}>
                                <div className="text-[10px] uppercase tracking-widest mb-1">Last Answer</div>
                                <div className="text-sm">{
                                    answerQuality === 'excellent' ? '🎯 Excellent!' :
                                    answerQuality === 'good' ? '👍 Good!' :
                                    answerQuality === 'fair' ? '📝 Fair' :
                                    answerQuality === 'poor' ? '⚠️ Needs Work' :
                                    'Waiting...'
                                }</div>
                            </div>
                        </motion.div>

                        <div className="flex items-center gap-4 mb-12">
                            {ROUND_META.map((m, i) => (
                                <div key={i} className="flex-1 flex flex-col gap-2">
                                    <div className={`h-1.5 rounded-full transition-all duration-700 ${i <= roundIndex ? 'bg-[#7C3AED]' : 'bg-gray-100'}`} />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${i === roundIndex ? 'text-[#7C3AED]' : 'text-gray-400'}`}>{m.label}</span>
                                </div>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            {roundIndex < 2 ? (
                                <motion.div
                                    key={`round-${roundIndex}`}
                                    initial={{ opacity: 0, scale: 0.98, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 1.02, x: -20 }}
                                    transition={{ duration: 0.5, ease: "anticipate" }}
                                    className="bg-white rounded-[3rem] border border-gray-100 shadow-3xl overflow-hidden h-[550px] flex"
                                >
                                    <div className="w-1/4 bg-gray-50 border-r border-gray-100 flex flex-col items-center justify-center p-6 sticky top-0 self-start h-full">
                                        <div className="mb-4 scale-75 origin-center"><SpeakingAvatar isHR={false} /></div>
                                        <div className="bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{roundIndex === 0 ? 'Alex Chen - Tech Lead' : 'Sarah Johnson - Eng Manager'}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                                        <div className="p-8 border-b border-gray-50 flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-3"><MessageSquare className="w-5 h-5 text-[#7C3AED]" /><h4 className="font-bold text-[#111827] text-sm uppercase tracking-tight">{ROUND_META[roundIndex].label}</h4></div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={walkOut} className="text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full uppercase tracking-widest transition-colors">Walk Out</button>
                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase italic">{ROUND_META[roundIndex].hint}</span>
                                            </div>
                                        </div>
                                        <div className="flex-grow p-8 space-y-6 overflow-y-auto">
                                            {messages.map((m, i) => (
                                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] px-6 py-4 rounded-[1.5rem] text-[13px] font-medium leading-relaxed ${m.role === 'interviewer' ? 'bg-[#F9FAFB] text-[#111827] rounded-tl-none border border-gray-100' : 'bg-[#7C3AED] text-white rounded-tr-none shadow-lg shadow-violet-500/10'}`}>{m.content}</div>
                                                </div>
                                            ))}
                                            {(isSending || isSpeaking) && <div className="flex items-center gap-2 text-gray-400 italic text-[10px] ml-4"><div className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full animate-bounce" /><span>Alex is thinking...</span></div>}
                                            <div ref={chatEndRef} />
                                        </div>
                                         <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex flex-col gap-4">
                                            <AnimatePresence>
                                                {showHint && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                                                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                                                        className="flex flex-wrap gap-2 mb-2 p-3 bg-[#7C3AED]/5 rounded-2xl border border-[#7C3AED]/10 animate-pulse"
                                                    >
                                                        <span className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest mr-2 flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> Quick Actions:
                                                        </span>
                                                        {['skip', 'idont know', 'next question'].map(hint => (
                                                            <button 
                                                                key={hint} 
                                                                onClick={() => handleQuickAction(hint)} 
                                                                className="px-4 py-1.5 bg-white border border-violet-100 rounded-full text-[10px] font-black text-[#7C3AED] uppercase tracking-widest hover:bg-violet-50 transition-all shadow-sm"
                                                            >
                                                                {hint}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        {/* Video/webcam removed */}

                                        {historyOpen && (
                                            <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-8">
                                                <div className="w-full max-w-3xl bg-white rounded-2xl p-6 shadow-2xl">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="text-lg font-black">Interview History</h3>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => { loadHistory(); }} className="px-3 py-1 bg-gray-100 rounded">Refresh</button>
                                                            <button onClick={() => setHistoryOpen(false)} className="px-3 py-1 bg-black text-white rounded">Close</button>
                                                        </div>
                                                    </div>
                                                    {history.length === 0 ? (
                                                        <div className="text-sm text-gray-500">No past sessions found.</div>
                                                    ) : (
                                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                                            {history.map((h, idx) => (
                                                                <div key={h.id || idx} className="p-3 border rounded-lg flex items-center justify-between">
                                                                    <div>
                                                                        <div className="font-bold">{h.role || h.report?.sections?.[0]?.label || 'Session'}</div>
                                                                        <div className="text-xs text-gray-500">{h.company} • {h.domain || h.companyType} • {new Date(h.date).toLocaleString()}</div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="text-sm font-black">{h.score ?? h.report?.overall_score}%</div>
                                                                        <button onClick={() => { setReport(h.report); setStep('REPORT'); setHistoryOpen(false); }} className="px-3 py-1 bg-white border rounded">View</button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                            <div className="flex gap-4 items-center">
                                                <textarea rows={1} className="flex-1 bg-white border border-gray-100 rounded-2xl px-8 py-4 text-sm font-medium focus:ring-0 resize-none shadow-sm" placeholder="Draft your response..." value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendChat())} />
                                                <button onClick={handleSendChat} disabled={!userInput.trim() || isSending || isSpeaking} className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center hover:bg-[#7C3AED] transition-all"><Send className="w-5 h-5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="hr-round"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-[#0f1b2a] rounded-[4rem] border border-white/5 shadow-3xl overflow-hidden relative min-h-[700px] flex"
                                >
                                    <div className="absolute top-6 right-6 z-10">
                                        <button onClick={walkOut} className="text-[10px] font-bold text-red-400 bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-full uppercase tracking-widest transition-colors border border-red-500/30">Walk Out</button>
                                    </div>
                                    <div className="w-full flex">
                                        <div className="w-1/2 flex flex-col items-center justify-center p-12 border-r border-white/5 sticky top-0 self-start h-full min-h-[700px]">
                                            <SpeakingAvatar isHR={true} />
                                            <div className="mt-8 px-6 py-2 bg-white/5 rounded-full border border-white/10">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-cyan-400 animate-pulse' : isListening ? 'bg-red-500' : 'bg-green-500'}`} />
                                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">{isSpeaking ? 'Michael Speaking' : isListening ? 'Listening' : 'Protocol Active'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-1/2 flex flex-col p-16 justify-center">
                                            <div className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] mb-8 shadow-2xl backdrop-blur-3xl">
                                                <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-6 underline decoration-cyan-400/30">Michael Rodriguez (HR Director) says:</p>
                                                {messages.filter(m => m.role === 'interviewer').slice(-1).map((m, i) => (
                                                    <p key={i} className="text-xl text-white font-medium italic leading-relaxed">"{m.content}"</p>
                                                ))}
                                            </div>

                                            <AnimatePresence>
                                                {showHint && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, scale: 0.9 }} 
                                                        animate={{ opacity: 1, scale: 1 }} 
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl text-center backdrop-blur-md"
                                                    >
                                                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-4">Quick Actions</p>
                                                        <div className="flex flex-wrap justify-center gap-3">
                                                            {['skip', 'idont know', 'next question'].map(h => (
                                                                <button key={h} onClick={() => handleQuickAction(h)} className="px-4 py-2 bg-white/10 rounded-full text-[11px] font-bold text-white uppercase tracking-widest border border-white/10 hover:bg-white/15 transition-colors">
                                                                    {h}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="space-y-4">
                                                <textarea
                                                    rows={4}
                                                    value={userInput}
                                                    onChange={e => setUserInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendChat())}
                                                    placeholder="Type your HR response..."
                                                    className="w-full bg-white text-black border border-white/10 rounded-[2rem] px-6 py-5 text-sm font-medium focus:ring-0 resize-none shadow-lg"
                                                />
                                                <div className="flex items-center justify-between gap-4">
                                                    <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Text only mode</p>
                                                    {!hrCallOver ? (
                                                        <button onClick={handleSendChat} disabled={!userInput.trim() || isSending || isSpeaking} className="px-6 py-4 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-[0.25em] hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
                                                            Send Answer
                                                        </button>
                                                    ) : (
                                                        <div className="bg-green-500/20 px-6 py-3 rounded-full border border-green-500/30 font-black text-green-400 text-[10px] uppercase tracking-widest">Protocol finalized</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {step === 'REPORT' && (
                    <motion.div key="report" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-6xl mx-auto px-6 py-12">
                        <div className="bg-white rounded-[4rem] border border-gray-100 p-12 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50" />

                            <div className="relative z-10 text-center mb-16">
                                <h2 className="text-6xl font-black text-[#111827] uppercase tracking-tighter italic leading-none mb-4">Outcome <span className="text-[#7C3AED]">Protocol.</span></h2>
                                <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">Session Analytics & Clinical Verdict</p>
                            </div>

                            <div className="grid lg:grid-cols-3 gap-12 mb-20">
                                <div className="lg:col-span-1 flex flex-col items-center justify-center bg-gray-50 rounded-[3rem] p-12 border border-gray-100 shadow-inner">
                                    <div className="relative">
                                        <svg className="w-48 h-48 transform -rotate-90">
                                            <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-200" />
                                            <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={552} strokeDashoffset={552 - (552 * (report?.overall_score || 0)) / 100} className="text-[#7C3AED] transition-all duration-1000" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-5xl font-black text-[#111827]">{report?.overall_score}%</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score</span>
                                        </div>
                                    </div>
                                    <div className="mt-8 text-center">
                                        <div className="px-6 py-2 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">{report?.verdict}</div>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 space-y-8">
                                    <h3 className="text-xl font-black text-[#111827] uppercase tracking-tighter italic mb-6 flex items-center gap-3"><TrendingUp className="text-[#7C3AED]" /> Section Performance</h3>
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        {report?.sections.map((s, i) => (
                                            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                                <div className="flex justify-between items-end mb-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                                                        <h4 className="font-bold text-gray-900 leading-none">{s.score}%</h4>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${s.score}%` }} className="h-full bg-black rounded-full" />
                                                </div>
                                                <p className="mt-4 text-[11px] text-gray-500 font-medium leading-relaxed italic">"{s.feedback}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-12 mb-20">
                                <h3 className="text-3xl font-black text-[#111827] uppercase tracking-tighter italic mb-10 flex items-center gap-4">
                                    <MessageSquare className="w-8 h-8 text-[#7C3AED]" />
                                    Step-by-Step Analysis
                                </h3>

                                {report?.detailed_analysis.map((round, ri) => (
                                    <div key={ri} className="bg-gray-50 rounded-[3.5rem] p-10 border border-gray-100">
                                        <div className="flex flex-wrap items-center justify-between mb-8 pb-6 border-b border-gray-200">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black">{ri + 1}</div>
                                                <h4 className="text-2xl font-black text-[#111827] uppercase tracking-tighter italic">{round.round_name}</h4>
                                            </div>
                                            <div className="flex gap-6">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vocabulary Load</p>
                                                    <p className="text-lg font-bold text-[#7C3AED] leading-none">{round.total_words} Words</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {round.responses.map((res, idx) => (
                                                <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                                                    <div className="grid md:grid-cols-2 gap-10">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-3">
                                                                <MessageSquare className="w-4 h-4 text-violet-500" />
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question</span>
                                                            </div>
                                                            <p className="text-sm font-bold text-gray-900 leading-relaxed italic">"{res.question}"</p>

                                                            <div className="pt-2 flex items-center gap-3">
                                                                <User className="w-4 h-4 text-cyan-500" />
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Answer</span>
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-600 leading-relaxed">"{res.answer}"</p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <Clock className="w-3 h-3 text-gray-300" />
                                                                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{res.wordCount} words analyzed</span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-6 bg-violet-50/50 p-6 rounded-3xl border border-violet-100">
                                                            <div className="space-y-4">
                                                                <div className="flex items-center gap-3">
                                                                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">How to Improve</span>
                                                                </div>
                                                                <p className="text-[12px] font-bold text-[#7C3AED] leading-relaxed line-clamp-3">"{res.suggestion}"</p>
                                                            </div>

                                                            {res.mistakes && (
                                                                <div className="pt-4 border-t border-violet-100 space-y-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Observed Mistake</span>
                                                                    </div>
                                                                    <p className="text-[11px] font-bold text-red-900/60 leading-relaxed italic">"{res.mistakes}"</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-6 justify-center">
                                <button onClick={() => navigate('/dashboard/learner')} className="px-12 py-5 bg-white border border-gray-200 text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-gray-50 hover:scale-105 transition-all">
                                    Return to Dashboard <ChevronRight className="w-4 h-4" />
                                </button>
                                <button onClick={() => window.location.reload()} className="px-12 py-5 bg-[#7C3AED] text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center gap-4 hover:scale-105 transition-all shadow-xl shadow-violet-900/20">
                                    Restart Protocol <Zap className="w-4 h-4" />
                                </button>
                                <button onClick={() => window.print()} className="px-12 py-5 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center gap-4 hover:scale-105 transition-all">
                                    Export Results <CheckCircle2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
}

