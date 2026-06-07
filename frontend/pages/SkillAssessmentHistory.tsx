import React, { useState, useEffect } from "react";
import Navigation from "../components/Navigation";

const PURPLE = "#7C3AED";
const BG = "#F4F4F6";

const STORAGE_KEY = "skillAssessmentHistory";

const getLevel = (score: number) => {
  if (score >= 90) return { label: "Expert",       color: "#10B981", bg: "#ECFDF5" };
  if (score >= 70) return { label: "Advanced",     color: PURPLE,    bg: "#F5F3FF" };
  if (score >= 40) return { label: "Intermediate", color: "#F59E0B", bg: "#FFFBEB" };
  return              { label: "Beginner",        color: "#EF4444", bg: "#FEF2F2" };
};

const getReadinessStatus = (score: number) => {
  if (score >= 80) return { label: "Interview Ready", color: "#10B981" };
  if (score >= 60) return { label: "Nearly Ready",    color: "#F59E0B" };
  return              { label: "Needs Practice",   color: "#EF4444" };
};

const SKILL_META: Record<string, { icon: string; category: string }> = {
  python:    { icon: "🐍", category: "Technical" },
  java:      { icon: "☕", category: "Technical" },
  sql:       { icon: "🗄️", category: "Technical" },
  dsa:       { icon: "🧩", category: "Technical" },
  react:     { icon: "⚛️", category: "Technical" },
  nodejs:    { icon: "🟢", category: "Technical" },
  uiux:      { icon: "🎨", category: "Non-Technical" },
  marketing: { icon: "📣", category: "Non-Technical" },
  pm:        { icon: "📋", category: "Non-Technical" },
};

interface MistakeItem {
  questionId:            number;
  questionNumber:        number;
  topic:                 string;
  score:                 number;
  mistake:               string;
  expectedApproach:      string;
  improvementSuggestion: string;
}

interface AssessmentRecord {
  id:                 string;
  skill:              string;
  skillId:            string;
  icon:               string;
  category:           string;
  date:               string;
  score:              number;
  interviewReadiness: number;
  level:              string;
  strengths:          string[];
  weakAreas:          string[];
  mistakeAnalysis:    MistakeItem[];
  questionsAnswered:  number;
  totalQuestions:     number;
}

const groupBySkill = (records: AssessmentRecord[]) => {
  const map: Record<string, AssessmentRecord[]> = {};
  records.forEach(r => {
    if (!map[r.skillId]) map[r.skillId] = [];
    map[r.skillId].push(r);
  });
  Object.keys(map).forEach(k =>
    map[k].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  );
  return map;
};

function DeltaBadge({ prev, curr }: { prev: number; curr: number }) {
  const delta = curr - prev;
  if (delta === 0) return null;
  const pos = delta > 0;
  return (
    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, borderRadius: 4, padding: "2px 6px", background: pos ? "#ECFDF5" : "#FEF2F2", color: pos ? "#10B981" : "#EF4444" }}>
      {pos ? "▲" : "▼"} {Math.abs(delta)}%
    </span>
  );
}

function HistoryCard({ record, prev, isLatest }: {
  record: AssessmentRecord;
  prev?: AssessmentRecord;
  isLatest: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const level     = getLevel(record.score);
  const readiness = getReadinessStatus(record.interviewReadiness);
  const fmtDate   = new Date(record.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const fmtTime   = new Date(record.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: isLatest ? `0 0 0 2px ${PURPLE}, 0 8px 30px rgba(124,58,237,0.15)` : "0 4px 16px rgba(0,0,0,0.05)", border: isLatest ? `2px solid ${PURPLE}` : "1px solid #f3f4f6", position: "relative", transition: "all 0.2s" }}>
      {isLatest && (
        <div style={{ position: "absolute", top: -10, right: 16, background: PURPLE, color: "white", fontSize: 9, fontWeight: 800, letterSpacing: 1, borderRadius: 6, padding: "3px 8px" }}>LATEST</div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{record.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>{record.skill}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{fmtDate} · {fmtTime}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {prev && <DeltaBadge prev={prev.score} curr={record.score} />}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: PURPLE }}>{record.score}%</div>
            <div style={{ fontSize: 9, color: "#9CA3AF", letterSpacing: 1 }}>SCORE</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ borderRadius: 8, padding: "5px 12px", background: level.bg, color: level.color, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>{level.label.toUpperCase()}</div>
        <div style={{ borderRadius: 8, padding: "5px 12px", background: readiness.color + "15", color: readiness.color, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>{record.interviewReadiness}% READY</div>
        <div style={{ borderRadius: 8, padding: "5px 12px", background: "#F3F4F6", color: "#6B7280", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>{record.questionsAnswered}/{record.totalQuestions} ANSWERED</div>
      </div>

      <div style={{ height: 6, borderRadius: 3, background: "#F3F4F6", marginBottom: 14, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, width: `${record.score}%`, background: `linear-gradient(90deg, ${PURPLE}, #EC4899)`, transition: "width 0.6s ease" }} />
      </div>

      <button onClick={() => setExpanded(e => !e)}
        style={{ background: "none", border: "none", padding: 0, fontSize: 10, fontWeight: 700, color: PURPLE, cursor: "pointer", letterSpacing: 1 }}>
        {expanded ? "▲ HIDE DETAILS" : "▼ VIEW DETAILS"}
      </button>

      {expanded && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140, background: "#F0FDF4", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: "#10B981", marginBottom: 8 }}>✅ STRENGTHS</div>
              {record.strengths.length > 0
                ? record.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>• {s}</div>)
                : <div style={{ fontSize: 12, color: "#9CA3AF" }}>None recorded</div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 140, background: "#FEF2F2", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: "#EF4444", marginBottom: 8 }}>✗ WEAK AREAS</div>
              {record.weakAreas.length > 0
                ? record.weakAreas.map((w, i) => <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>• {w}</div>)
                : <div style={{ fontSize: 12, color: "#9CA3AF" }}>None recorded</div>
              }
            </div>
          </div>

          {record.mistakeAnalysis.length > 0 && (
            <div style={{ background: "#FFF7ED", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: "#F59E0B", marginBottom: 12 }}>🔍 MISTAKE ANALYSIS</div>
              {record.mistakeAnalysis.map((m, i) => (
                <div key={i} style={{ borderLeft: "2px solid #F59E0B", paddingLeft: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#92400E", marginBottom: 4 }}>
                    Q{m.questionNumber} · {m.topic} · Score: {m.score}/100
                  </div>
                  <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}><strong>Mistake:</strong> {m.mistake}</div>
                  <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}><strong>Expected:</strong> {m.expectedApproach}</div>
                  <div style={{ fontSize: 12, color: PURPLE }}><strong>Improve:</strong> {m.improvementSuggestion}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkillGroup({ records }: { records: AssessmentRecord[] }) {
  const first  = records[0];
  const latest = records[records.length - 1];
  const delta  = latest.score - first.score;
  const improved = delta > 0;

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #f3f4f6" }}>
        <span style={{ fontSize: 28 }}>{first.icon}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>{first.skill}</div>
          <div style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 1, marginTop: 2 }}>
            {records.length} ASSESSMENT{records.length > 1 ? "S" : ""} · {first.category.toUpperCase()}
          </div>
        </div>
        {records.length > 1 && (
          <div style={{ marginLeft: "auto", background: improved ? "#ECFDF5" : "#FEF2F2", color: improved ? "#10B981" : "#EF4444", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{improved ? "▲" : "▼"} {Math.abs(delta)}%</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>{improved ? "IMPROVEMENT" : "DECLINE"}</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {records.map((record, idx) => (
          <div key={record.id} style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
            <HistoryCard record={record} prev={idx > 0 ? records[idx - 1] : undefined} isLatest={idx === records.length - 1} />
            {idx < records.length - 1 && (
              <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", color: "#D1D5DB", fontSize: 18, fontWeight: 900 }}>↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryStats({ records }: { records: AssessmentRecord[] }) {
  const totalAssessments = records.length;
  const skillsTested     = new Set(records.map(r => r.skillId)).size;
  const avgScore         = records.length ? Math.round(records.reduce((a, r) => a + r.score, 0) / records.length) : 0;
  const bestScore        = records.length ? Math.max(...records.map(r => r.score)) : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14, marginBottom: 32 }}>
      {[
        { label: "Total Assessments", value: String(totalAssessments), tone: PURPLE },
        { label: "Skills Tested",     value: String(skillsTested),     tone: "#10B981" },
        { label: "Average Score",     value: `${avgScore}%`,           tone: "#F59E0B" },
        { label: "Best Score",        value: `${bestScore}%`,          tone: "#EF4444" },
      ].map(card => (
        <div key={card.label} style={{ background: "white", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 8 }}>{card.label}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: card.tone }}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}

function FilterBar({ skills, activeSkill, onSkillChange, sortOrder, onSortChange }: {
  skills: string[];
  activeSkill: string;
  onSkillChange: (s: string) => void;
  sortOrder: "asc" | "desc";
  onSortChange: (o: "asc" | "desc") => void;
}) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28, alignItems: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: 2, marginRight: 4 }}>FILTER:</div>
      {["All", ...skills].map(s => (
        <button key={s} onClick={() => onSkillChange(s)}
          style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, borderRadius: 8, cursor: "pointer", padding: "6px 14px", border: `2px solid ${activeSkill === s ? PURPLE : "#e5e7eb"}`, background: activeSkill === s ? "#F5F3FF" : "white", color: activeSkill === s ? PURPLE : "#6B7280" }}>
          {s.toUpperCase()}
        </button>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        {(["desc", "asc"] as const).map(o => (
          <button key={o} onClick={() => onSortChange(o)}
            style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, borderRadius: 8, cursor: "pointer", padding: "6px 12px", border: `2px solid ${sortOrder === o ? PURPLE : "#e5e7eb"}`, background: sortOrder === o ? "#F5F3FF" : "white", color: sortOrder === o ? PURPLE : "#6B7280" }}>
            {o === "desc" ? "NEWEST FIRST" : "OLDEST FIRST"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SkillAssessmentHistory() {
  const [records,     setRecords]     = useState<AssessmentRecord[]>([]);
  const [loadingData, setLoading]     = useState(true);
  const [fetchError,  setError]       = useState<string | null>(null);
  const [activeSkill, setActiveSkill] = useState("All");
  const [sortOrder,   setSortOrder]   = useState<"asc" | "desc">("desc");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: any[] = (() => {
        try {
          return raw ? (JSON.parse(raw) as any[]) : [];
        } catch {
          return [];
        }
      })();

      const mapped: AssessmentRecord[] = parsed.map((a: any, idx: number) => ({
        id:                 a.completedAt ?? String(idx),
        skill:              a.skill       ?? "",
        skillId:            a.skillId     ?? "",
        icon:               SKILL_META[a.skillId]?.icon     ?? "🎯",
        category:           SKILL_META[a.skillId]?.category ?? "Technical",
        date:               a.completedAt ?? new Date().toISOString(),
        score:              typeof a.score === "number" ? a.score : 0,
        level:              a.level ?? "Beginner",
        interviewReadiness: typeof a.interviewReadiness === "number" ? a.interviewReadiness : 0,
        strengths:          Array.isArray(a.strengths)       ? a.strengths       : [],
        weakAreas:          Array.isArray(a.weakAreas)       ? a.weakAreas       : [],
        mistakeAnalysis:    Array.isArray(a.mistakeAnalysis) ? a.mistakeAnalysis : [],
        questionsAnswered:  Array.isArray(a.questionResults) ? a.questionResults.length : 0,
        totalQuestions:     10,
      }));

      setRecords(mapped);
    } catch (e) {
      console.error("[SkillAssessmentHistory] localStorage read error:", e);
      setError("Could not load your assessment history.");
    } finally {
      setLoading(false);
    }
  }, []);

  const uniqueSkills = Array.from(new Set(records.map(r => r.skill)));

  const filtered = records
    .filter(r => activeSkill === "All" || r.skill === activeSkill)
    .sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });

  const grouped = groupBySkill(filtered);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Poppins', sans-serif" }}>
      <Navigation />
      <div style={{ padding: "32px 40px", marginTop: 80, maxWidth: 900, margin: "80px auto 0" }}>
        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 20, padding: "6px 14px", marginBottom: 16 }}>
            <span style={{ color: PURPLE, fontWeight: 800, fontSize: 10, letterSpacing: 2 }}>📊 ASSESSMENT HISTORY</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", margin: 0, textTransform: "uppercase" }}>
                YOUR <span style={{ color: PURPLE }}>PROGRESS.</span>
              </h1>
              <p style={{ color: "#6B7280", fontSize: 14, marginTop: 8, marginBottom: 0 }}>
                Track your skill development over time. Every assessment brings you closer to interview readiness.
              </p>
            </div>
            <button onClick={() => window.location.href = "/skill-assessment"}
              style={{ background: PURPLE, color: "white", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 800, fontSize: 11, cursor: "pointer", letterSpacing: 1, boxShadow: "0 4px 16px rgba(124,58,237,0.3)", flexShrink: 0 }}>
              + NEW ASSESSMENT
            </button>
          </div>
        </div>

        {loadingData ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 600 }}>Loading your assessment history...</div>
          </div>
        ) : fetchError ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "white", borderRadius: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 14, color: "#EF4444", fontWeight: 600, marginBottom: 8 }}>{fetchError}</div>
            <button onClick={() => window.location.reload()}
              style={{ marginTop: 8, background: PURPLE, color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
              RETRY
            </button>
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "white", borderRadius: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>No assessments yet</div>
            <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>Complete your first skill assessment to see your progress here.</div>
            <button onClick={() => window.location.href = "/skill-assessment"}
              style={{ background: PURPLE, color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
              START YOUR FIRST ASSESSMENT →
            </button>
          </div>
        ) : (
          <>
            <SummaryStats records={records} />
            <FilterBar skills={uniqueSkills} activeSkill={activeSkill} onSkillChange={setActiveSkill} sortOrder={sortOrder} onSortChange={setSortOrder} />
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "white", borderRadius: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
                <div style={{ fontSize: 13, color: "#9CA3AF" }}>No assessments match this filter.</div>
              </div>
            ) : (
              Object.entries(grouped).map(([skillId, skillRecords]) => (
                <SkillGroup key={skillId} records={skillRecords} />
              ))
            )}
            <div style={{ textAlign: "center", paddingTop: 16, paddingBottom: 40, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => window.location.href = "/skill-assessment"}
                style={{ background: PURPLE, color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 800, fontSize: 12, cursor: "pointer", letterSpacing: 1, boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}>
                TAKE NEW ASSESSMENT →
              </button>
              <button onClick={() => window.location.href = "/mock-interview"}
                style={{ background: "white", color: PURPLE, border: `2px solid ${PURPLE}`, borderRadius: 12, padding: "14px 36px", fontWeight: 800, fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>
                PRACTICE MOCK INTERVIEW →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}