import React, { useState, useEffect } from 'react';
import {
  Trophy, Award, Download, CheckCircle, Search, Filter,
  ChevronDown, ChevronRight, ChevronLeft, Medal, Clock, XCircle,
  X, Mail, Users, Users2
} from 'lucide-react';
import { DynamicTableCell, SubmissionDetailsRenderer } from '../../components/leaderboard/DynamicComponents';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { useAuth } from '../../AuthContext';

interface TeamMember {
  user_id?: string;
  name?: string;
  email?: string;
  role?: string;
}

interface Submission {
  team_id: string | null;
  display_name: string;
  team_name?: string;
  project_title: string;
  solution_description: string;
  score: number;
  total_score?: number;
  status: string;
  recommendation: string;
  member_count: number;
  members: TeamMember[];
  email: string;
  rank: number;
  is_verified?: boolean;
  submission_id?: string;
  submitted_at?: string | null;
  data?: Record<string, any>;
}

interface StageField {
  field_id: string;
  label: string;
  field_type: string;
}

interface ScoreBand {
  min: number;
  label: string;
  color?: string;
}

interface LeaderboardConfig {
  primary_field_id?: string;
  preview_field_id?: string;
}

interface LeaderboardResponse {
  status: string;
  event_id: string;
  stage_id: string | null;
  counts: Record<string, number>;
  total: number;
  page: number;
  limit: number;
  submissions: Submission[];
  stage_fields?: StageField[];
  evaluation_thresholds?: { shortlist_min?: number; waitlist_min?: number; reject_below?: number };
  leaderboard_config?: LeaderboardConfig;
  score_bands?: ScoreBand[];
  event_title?: string;
}

interface EventStage {
  id: string;
  name: string;
  type?: string;
}

interface EventItem {
  _id: string;
  title: string;
  status?: string;
  stages?: EventStage[];
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;

const STORAGE_KEY = 'leaderboard_state';

function loadPersistedState<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}_${key}`);
    if (raw !== null) return JSON.parse(raw);
  } catch {}
  return fallback;
}

function persistState(key: string, value: any) {
  try {
    sessionStorage.setItem(`${STORAGE_KEY}_${key}`, JSON.stringify(value));
  } catch {}
}

// === DYNAMIC RESOLVERS ===

interface ProjectInfo {
  title: string;
  preview: string | null;
  usedFieldIds: string[];
}

function isUrlValue(val: string): boolean {
  return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('www.');
}

function isNonTextValue(val: any): boolean {
  if (val === undefined || val === null || val === '') return true;
  if (typeof val === 'object') return true;
  const s = String(val);
  if (isUrlValue(s)) return true;
  if (s.startsWith('data:')) return true;
  if (s.startsWith('/api/')) return true;
  return false;
}

/** Shorten long dynamic column labels for compact table display */
function shortenColumnLabel(label: string): string {
  const l = label.trim().toLowerCase();
  if (l === 'final github repository' || l === 'github repository' || l === 'github link' || l === 'final github link') return 'Repository';
  if (l === 'demo video link' || l === 'demo video' || l === 'video link' || l === 'video') return 'Demo Video';
  if (l === 'final ppt presentation' || l === 'ppt presentation' || l === 'final ppt' || l === 'ppt') return 'PPT';

  return label
    .replace(/^final\s+/i, '')
    .replace(/\s+link$/i, '')
    .replace(/\s+url$/i, '')
    .replace(/\bgithub\s+repository\b/i, 'Repository')
    .replace(/\brepository\b/i, 'Repository')
    .replace(/\bpresentation\b/i, 'PPT')
    .replace(/\bdemo\s+video\b/i, 'Demo Video')
    .replace(/\bvideo\s+link\b/i, 'Video');
}

function resolveProjectInfo(
  row: Submission,
  fields: StageField[],
  config: LeaderboardConfig | null
): ProjectInfo {
  const data = row.data || {};
  const usedFieldIds: string[] = [];

  const textValue = (val: any): string | null => {
    if (isNonTextValue(val)) return null;
    return String(val);
  };

  // 1. Use configured primary field
  if (config?.primary_field_id) {
    const v = textValue(data[config.primary_field_id]);
    if (v) {
      usedFieldIds.push(config.primary_field_id);
      return { title: v, preview: null, usedFieldIds };
    }
  }

  // 2. Heuristic: find field by label matching common title/key patterns
  const titleKeywords = /title|name|project|idea|startup|research|topic|theme/i;
  for (const f of fields) {
    if (f.field_type === 'file') continue;
    if (!titleKeywords.test(f.label)) continue;
    const v = textValue(data[f.field_id]);
    if (v) {
      usedFieldIds.push(f.field_id);
      return { title: v, preview: null, usedFieldIds };
    }
  }

  // 3. Fallback: first non-file, non-url field with data
  for (const f of fields) {
    if (f.field_type === 'file') continue;
    const v = textValue(data[f.field_id]);
    if (v) {
      usedFieldIds.push(f.field_id);
      return { title: v, preview: null, usedFieldIds };
    }
  }

  // 4. Use project_title from backend (which already merges previous stage data)
  if (row.project_title && !isUrlValue(row.project_title) && !row.project_title.startsWith('data:') && !row.project_title.startsWith('Unnamed')) {
    return { title: row.project_title, preview: null, usedFieldIds };
  }

  // 5. Try solution_description / description from backend
  if (row.solution_description && !isUrlValue(row.solution_description) && !row.solution_description.startsWith('data:')) {
    return { title: row.solution_description, preview: null, usedFieldIds };
  }

  // 6. Try first non-url value from data
  if (row.data) {
    const firstText = Object.values(row.data).find(v => typeof v === 'string' && v.trim() && !isNonTextValue(v));
    if (firstText) {
      return { title: String(firstText), preview: null, usedFieldIds };
    }
  }

  // 7. Last resort: use team/participant name
  const fallbackName = row.display_name || row.team_name || 'Project information unavailable';
  return { title: fallbackName, preview: null, usedFieldIds };
}

interface ScoreDisplay {
  score: number;
  label: string | null;
  color: string;
}

function resolveScoreDisplay(
  score: number | undefined | null,
  scoreBands: ScoreBand[],
  thresholds: { shortlist_min?: number; waitlist_min?: number; reject_below?: number } | null
): ScoreDisplay | null {
  if (score === undefined || score === null || (typeof score === 'number' && isNaN(score))) {
    return null;
  }

  if (scoreBands && scoreBands.length > 0) {
    const sorted = [...scoreBands].sort((a, b) => b.min - a.min);
    const band = sorted.find(b => score >= b.min);
    if (band) return { score, label: band.label, color: band.color || 'text-slate-600' };
  }

  if (thresholds) {
    const shortlistMin = thresholds.shortlist_min ?? 70;
    const waitlistMin = thresholds.waitlist_min ?? 50;
    if (score >= shortlistMin) return { score, label: 'Outstanding', color: 'text-emerald-600' };
    if (score >= (shortlistMin + waitlistMin) / 2) return { score, label: 'Very Good', color: 'text-blue-600' };
    if (score >= waitlistMin) return { score, label: 'Good', color: 'text-amber-600' };
    return { score, label: 'Needs Improvement', color: 'text-red-600' };
  }

  return { score, label: null, color: '' };
}

function resolveStatusBadge(status: string) {
  if (!status || status.trim() === '') return null;
  const s = status.toLowerCase();
  const map: Record<string, { bg: string; icon: React.ReactNode }> = {
    winner: { bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: <Trophy className="w-3.5 h-3.5 mr-1" /> },
    shortlisted: { bg: 'bg-blue-50 text-blue-600 border border-blue-200', icon: <Award className="w-3.5 h-3.5 mr-1" /> },
    waitlisted: { bg: 'bg-orange-50 text-orange-600 border border-orange-200', icon: <Clock className="w-3.5 h-3.5 mr-1" /> },
    rejected: { bg: 'bg-red-50 text-red-600 border border-red-200', icon: <XCircle className="w-3.5 h-3.5 mr-1" /> },
    pending: { bg: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: <Clock className="w-3.5 h-3.5 mr-1" /> },
    qualified: { bg: 'bg-green-50 text-green-700 border border-green-200', icon: <CheckCircle className="w-3.5 h-3.5 mr-1" /> },
    finalist: { bg: 'bg-purple-50 text-purple-700 border border-purple-200', icon: <Award className="w-3.5 h-3.5 mr-1" /> },
    'runner-up': { bg: 'bg-indigo-50 text-indigo-700 border border-indigo-200', icon: <Award className="w-3.5 h-3.5 mr-1" /> },
  };
  return map[s] || { bg: 'bg-slate-100 text-slate-600 border border-slate-200', icon: <Clock className="w-3.5 h-3.5 mr-1" /> };
}

function resolveRecommendation(row: Submission): string | null {
  const data = row.data || {};
  const raw = row.recommendation || '';
  const autoLabels = new Set(['shortlisted','waitlisted','rejected','pending review','pending','shortlist','waitlist','reject','hold']);
  const rec = autoLabels.has(raw.toLowerCase().trim()) ? '' : raw;
  return rec || data.evaluation_summary || data.ai_evaluation || data.ai_evaluation_summary || data.organizer_recommendation || data.judge_feedback || null;
}

interface TeamInfo {
  name: string;
  subtitle: string;
  isVerified: boolean;
}

function resolveTeamInfo(row: Submission): TeamInfo {
  const teamName = row.display_name || row.team_name || 'Unnamed Team';
  const members = row.members || [];
  const memberCount = row.member_count || members.length;
  const leader = members.find(m => m.role === 'Lead' || m.role === 'leader') || members[0] || null;

  let subtitle = '';
  if (leader && memberCount > 1) subtitle = `${leader.name} + ${memberCount - 1} Members`;
  else if (leader) subtitle = leader.name || '1 Member';
  else if (memberCount > 0) subtitle = `${memberCount} Member${memberCount > 1 ? 's' : ''}`;

  return { name: teamName, subtitle, isVerified: !!row.is_verified };
}

const renderRank = (rank: number) => {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center border border-yellow-300 shadow-sm"><Medal className="w-5 h-5 text-yellow-600" /></div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-300 shadow-sm"><Medal className="w-5 h-5 text-slate-500" /></div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center border border-orange-300 shadow-sm"><Medal className="w-5 h-5 text-orange-600" /></div>;
  return <span className="font-semibold text-slate-600 ml-3">{rank}</span>;
};

export default function LiveResultsDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => loadPersistedState('activeTab', 'All'));
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(() => loadPersistedState('selectedEvent', null));
  const [selectedStage, setSelectedStage] = useState<EventStage | null>(() => loadPersistedState('selectedStage', null));
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => loadPersistedState('searchTerm', ''));
  const [currentPage, setCurrentPage] = useState(() => loadPersistedState('currentPage', 1));
  const [pageSize, setPageSize] = useState(() => loadPersistedState('pageSize', DEFAULT_PAGE_SIZE));
  const [selectedTeam, setSelectedTeam] = useState<Submission | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [previewRecommendation, setPreviewRecommendation] = useState<{ title: string; text: string } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user?.institution_id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${user.institution_id}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const eventsArray = Array.isArray(data) ? data : [];
          setEvents(eventsArray);

          // Restore full event/stage objects from persisted IDs
          const savedEvent = loadPersistedState('selectedEvent', null);
          const savedStage = loadPersistedState('selectedStage', null);
          if (savedEvent?._id) {
            const match = eventsArray.find((e: any) => e._id === savedEvent._id);
            if (match) {
              setSelectedEvent(match);
              if (savedStage?.id) {
                const stageMatch = (match.stages || []).find((s: any) => s.id === savedStage.id);
                if (stageMatch) setSelectedStage(stageMatch);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error fetching events:', e);
      }
    };
    fetchEvents();
  }, [user?.institution_id]);

  useEffect(() => {
    // Only set stage if not already set, or if selected event changed
    if (selectedEvent && (!selectedStage || selectedStage.id === '')) {
      setSelectedStage(selectedEvent.stages && selectedEvent.stages.length > 0 ? selectedEvent.stages[0] : null);
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent || !selectedStage) return;
    const fetchBoard = async () => {
      setLoading(true);
      
      const params = new URLSearchParams({
        stage_id: selectedStage.id,
        institution_id: user?.institution_id || '',
        page: String(currentPage),
        limit: String(pageSize),
        status: activeTab,
      });
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      
      const url = `${API_BASE_URL}/api/v1/institution/leaderboard/${selectedEvent._id}/integrated?${params}`;
      
      try {
        const res = await fetch(url, { headers: authHeaders() });
        const json = await res.json();
        
        if (res.ok) {
          setLeaderboardData(json);
        } else {
          console.error("Leaderboard API error:", json);
        }
      } catch (e) {
        console.error('Error fetching leaderboard:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, [selectedEvent, selectedStage, user?.institution_id, currentPage, activeTab, searchTerm, pageSize]);

  // Persist leaderboard state across tab switches
  useEffect(() => {
    persistState('activeTab', activeTab);
    persistState('searchTerm', searchTerm);
    persistState('currentPage', currentPage);
    persistState('pageSize', pageSize);
    persistState('selectedEvent', selectedEvent ? { _id: selectedEvent._id, title: selectedEvent.title, status: selectedEvent.status, stages: selectedEvent.stages } : null);
    persistState('selectedStage', selectedStage ? { id: selectedStage.id, name: selectedStage.name, type: selectedStage.type } : null);
  }, [activeTab, searchTerm, currentPage, pageSize, selectedEvent, selectedStage]);

  const counts = leaderboardData?.counts || {};
  const submissions = leaderboardData?.submissions || [];
  
  // Helper to handle both casing
  const getCount = (key: string) => (counts as any)[key] || (counts as any)[key.toLowerCase()] || 0;

  // Server handles all filtering and pagination
  const paginatedSubmissions = submissions;
  const totalFiltered = leaderboardData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const thresholds = leaderboardData?.evaluation_thresholds || {};
  const shortlistMin = thresholds.shortlist_min ?? 70;
  const waitlistMin = thresholds.waitlist_min ?? 50;
  const rejectBelow = thresholds.reject_below ?? 50;

  const summaryCards = [
    { title: 'Total Teams', value: String(getCount('Total')), subtext: 'Registered', icon: <Trophy className="w-5 h-5 text-yellow-600" />, bgColor: 'bg-yellow-50', iconBg: 'bg-yellow-100' },
    { title: 'Shortlisted', value: String(getCount('Shortlisted')), subtext: `Min. ${shortlistMin}`, icon: <CheckCircle className="w-5 h-5 text-emerald-600" />, bgColor: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
    { title: 'Waitlisted', value: String(getCount('Waitlisted')), subtext: `Min. ${waitlistMin}`, icon: <Clock className="w-5 h-5 text-blue-600" />, bgColor: 'bg-blue-50', iconBg: 'bg-blue-100' },
    { title: 'Rejected', value: String(getCount('Rejected')), subtext: `Below ${rejectBelow}`, icon: <XCircle className="w-5 h-5 text-red-600" />, bgColor: 'bg-red-50', iconBg: 'bg-red-100' },
  ];

  const tabs = [
    { id: 'All', label: 'All', count: getCount('Total') },
    { id: 'Shortlisted', label: 'Shortlisted', count: getCount('Shortlisted') },
    { id: 'Waitlisted', label: 'Waitlisted', count: getCount('Waitlisted') },
    { id: 'Rejected', label: 'Rejected', count: getCount('Rejected') },
    { id: 'Pending', label: 'Pending', count: getCount('Pending') },
  ];

  const handleExportPDF = () => {
    if (!selectedEvent) return;
    window.open(
      `${API_BASE_URL}/api/v1/institution/leaderboard/${selectedEvent._id}/export-pdf?stage_id=${selectedStage?.id}`,
      '_blank'
    );
  };

  const handleVerifyResults = async () => {
    if (!selectedEvent || !selectedStage) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${selectedEvent._id}/leaderboard/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ stage_id: selectedStage.id }),
      });
      if (res.ok) {
        showToast('Results verified successfully!', 'success');
      } else {
        showToast('Failed to verify results', 'error');
      }
    } catch {
      showToast('Failed to verify results', 'error');
    }
  };

  const handleIssueCertificates = async () => {
    if (!selectedEvent) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${selectedEvent._id}/certificates/issue-ranked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          send_email: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Successfully issued ${data.certificates_issued} certificate(s)!`, 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.detail || 'Failed to issue certificates', 'error');
      }
    } catch {
      showToast('Error issuing certificates', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-slate-800 p-8">
        {/* Header Options */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900">Live Results</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">Real-time rankings based on official evaluations and scores.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" /> Export as PDF
            </button>
            <button
              onClick={handleVerifyResults}
              className="flex items-center px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors shadow-sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Verify Results
            </button>
            <button 
              onClick={handleIssueCertificates}
              className="flex items-center px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] font-medium text-sm transition-colors shadow-sm"
            >
              <Award className="w-4 h-4 mr-2" /> Issue Winner Certificates
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <div className="w-64">
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Select Event</label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-white border border-slate-200 text-sm font-medium rounded-lg py-2.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                value={selectedEvent?._id || ''}
                onChange={(e) => {
                  const ev = events.find((ev) => ev._id === e.target.value);
                  setSelectedEvent(ev || null);
                }}
              >
                {events.map((ev) => (
                  <option key={ev._id} value={ev._id}>
                    {ev.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <div className="w-64">
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Select Stage</label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-white border border-slate-200 text-sm font-medium rounded-lg py-2.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                value={selectedStage?.id || ''}
                onChange={(e) => {
                  const stage = selectedEvent?.stages?.find((s) => s.id === e.target.value);
                  setSelectedStage(stage || null);
                }}
              >
                {(selectedEvent?.stages || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 flex items-end">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search teams or participants..."
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="flex items-end">
            <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm">
              <Filter className="w-4 h-4 mr-2 text-slate-500" /> Filters
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {summaryCards.map((card, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center shadow-sm">
              <div className={`w-12 h-12 rounded-full ${card.bgColor} flex items-center justify-center mr-4`}>
                {card.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{card.title}</p>
                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className="text-2xl font-bold text-slate-900">{card.value}</span>
                  <span className="text-xs text-slate-500">{card.subtext}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Data Table Area */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex px-4 border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#4f46e5] text-[#4f46e5]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500 font-medium">Loading leaderboard data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                      <th className="py-2 px-1 text-center w-10">Rank</th>
                      <th className="py-2 px-2 w-32">Team</th>
                      <th className="py-2 px-2 w-40">Project / Idea</th>
                      {/* Dynamic columns — excludes title/preview */}
                      {(leaderboardData?.stage_fields || []).filter(f => {
                        const cfg = leaderboardData?.leaderboard_config || {};
                        if (cfg.primary_field_id && f.field_id === cfg.primary_field_id) return false;
                        if (cfg.preview_field_id && f.field_id === cfg.preview_field_id) return false;
                        if (!cfg.primary_field_id) {
                          const titleKw = /title|name|project|idea|startup|research|topic|theme/i;
                          if (titleKw.test(f.label)) return false;
                          const prevKw = /description|abstract|problem|solution|summary|overview|details/i;
                          if (prevKw.test(f.label)) return false;
                        }
                        return true;
                      }).map((field) => (
                        <th key={field.field_id} className="py-3 px-2 whitespace-nowrap text-[10px]">{shortenColumnLabel(field.label)}</th>
                      ))}
                      <th className="py-2 px-1 w-16">Score</th>
                      <th className="py-2 px-1 w-20">Status</th>
                      <th className="py-2 px-1 w-24">Reco.</th>
                      <th className="py-2 px-1 w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginatedSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={7 + (leaderboardData?.stage_fields?.filter(f => {
                          const cfg = leaderboardData?.leaderboard_config || {};
                          if (cfg.primary_field_id && f.field_id === cfg.primary_field_id) return false;
                          if (cfg.preview_field_id && f.field_id === cfg.preview_field_id) return false;
                          if (!cfg.primary_field_id) {
                            const titleKw = /title|name|project|idea|startup|research|topic|theme/i;
                            if (titleKw.test(f.label)) return false;
                            const prevKw = /description|abstract|problem|solution|summary|overview|details/i;
                            if (prevKw.test(f.label)) return false;
                          }
                          return true;
                        }).length || 0)} className="py-24 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <Search className="w-8 h-8 text-slate-300" />
                            <p className="text-sm font-medium text-slate-500">No submissions found</p>
                            <p className="text-xs text-slate-400">Try adjusting your filters or search terms.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedSubmissions.map((row) => {
                        const stageFields = leaderboardData?.stage_fields || [];
                        const cfg = leaderboardData?.leaderboard_config || {};
                        const scoreBands = leaderboardData?.score_bands || [];
                        const thresholds = leaderboardData?.evaluation_thresholds || null;

                        const projectInfo = resolveProjectInfo(row, stageFields, leaderboardData?.leaderboard_config || null);
                        const scoreDisplay = resolveScoreDisplay(row.score, scoreBands, thresholds);
                        const statusBadge = resolveStatusBadge(row.status);
                        const recommendation = resolveRecommendation(row);
                        const teamInfo = resolveTeamInfo(row);

                        // Dynamic columns = excluding title/preview fields (same for all rows)
                        const dynamicFields = stageFields.filter(f => {
                          if (cfg.primary_field_id && f.field_id === cfg.primary_field_id) return false;
                          if (cfg.preview_field_id && f.field_id === cfg.preview_field_id) return false;
                          if (!cfg.primary_field_id) {
                            const titleKw = /title|name|project|idea|startup|research|topic|theme/i;
                            if (titleKw.test(f.label)) return false;
                            const prevKw = /description|abstract|problem|solution|summary|overview|details/i;
                            if (prevKw.test(f.label)) return false;
                          }
                          return true;
                        });

                        return (
                          <tr key={row.team_id || row.rank} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-1 text-center">
                              {renderRank(row.rank)}
                            </td>
                            <td className="py-2 px-2 align-top">
                              <div className="flex items-center space-x-1 mb-1 flex-wrap">
                                <button
                                  onClick={() => setSelectedTeam(row)}
                                  className="font-bold text-slate-900 hover:text-[#4f46e5] transition-colors text-left text-xs leading-tight"
                                >
                                  {teamInfo.name}
                                </button>
                                {teamInfo.isVerified && (
                                  <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-[#4f46e5]">Verified</span>
                                )}
                              </div>
                              {teamInfo.subtitle && (
                                <div className="text-[10px] text-slate-500 leading-tight">{teamInfo.subtitle}</div>
                              )}
                            </td>
                            <td className="py-2 px-2 align-top">
                              <div className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight" title={projectInfo.title}>{projectInfo.title}</div>
                            </td>
                            {dynamicFields.map((field) => (
                              <td key={field.field_id} className="py-2 px-1 align-top">
                                <div className="max-h-16 overflow-hidden text-xs">
                                  <DynamicTableCell
                                    value={row.data?.[field.field_id]}
                                    fieldType={field.field_type}
                                    eventId={selectedEvent?._id}
                                    submissionId={row.submission_id}
                                    fieldId={field.field_id}
                                  />
                                </div>
                              </td>
                            ))}
                            <td className="py-2 px-1 align-top">
                              {scoreDisplay ? (
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-900 leading-none">{scoreDisplay.score.toFixed(1)}</span>
                                  {scoreDisplay.label && (
                                    <span className={`text-[9px] mt-0.5 font-semibold leading-tight ${scoreDisplay.color}`}>{scoreDisplay.label}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">N/A</span>
                              )}
                            </td>
                            <td className="py-2 px-1 align-top">
                              {statusBadge ? (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold leading-tight ${statusBadge.bg}`}>
                                  {statusBadge.icon}
                                  <span className="truncate max-w-[60px]">{row.status}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">N/A</span>
                              )}
                            </td>
                            <td className="py-2 px-1 align-top">
                              {Array.isArray(row.judges_feedback) && row.judges_feedback.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {row.judges_feedback.slice(0, 1).map((fb: any, fbi: number) => (
                                    <div key={fbi} className="bg-slate-50 rounded p-1 border border-slate-100">
                                      <p className="text-[9px] text-slate-600 line-clamp-2 leading-tight">{fb.feedback || 'Evaluated'}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : recommendation ? (
                                <button
                                  onClick={() => setPreviewRecommendation({ title: row.display_name || row.team_name || 'Team', text: recommendation })}
                                  className="text-[10px] font-bold text-slate-600 hover:text-purple-600 underline decoration-dashed underline-offset-2 text-left line-clamp-2 leading-tight"
                                  title={recommendation}
                                >
                                  View
                                </button>
                              ) : (
                                <span className="text-[9px] text-slate-400 italic">N/A</span>
                              )}
                            </td>
                            <td className="py-2 px-1 align-top text-right">
                              <button
                                onClick={() => setSelectedTeam(row)}
                                className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 shadow-sm transition-all"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-slate-500 font-medium">Per page</label>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="border border-slate-200 rounded-lg text-sm py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-sm text-slate-500">
                    Showing {totalFiltered > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} to {Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered} entries
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'border border-[#4f46e5] bg-indigo-50 text-[#4f46e5]'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2 py-1 text-slate-400">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-sm font-medium"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      {/* View Details Modal — Fully Dynamic */}
      {selectedTeam && (() => {
        const stageFields = leaderboardData?.stage_fields || [];
        const data = selectedTeam.data || {};
        const teamInfo = resolveTeamInfo(selectedTeam);
        const scoreDisplay = resolveScoreDisplay(selectedTeam.score, leaderboardData?.score_bands || [], leaderboardData?.evaluation_thresholds || null);
        const statusBadge = resolveStatusBadge(selectedTeam.status);
        const recommendation = resolveRecommendation(selectedTeam);

        const hasSubmissionData = stageFields.some(f => data[f.field_id] !== undefined && data[f.field_id] !== null && data[f.field_id] !== '');
        const hasScoreData = scoreDisplay !== null;
        const hasStatusData = statusBadge !== null;
        const hasRecData = recommendation !== null;

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">{teamInfo.name}</h3>
              <button onClick={() => setSelectedTeam(null)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">

              {/* Header: Rank + Team Info */}
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-200">
                  <Users className="w-6 h-6 text-[#4f46e5]" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-900">{teamInfo.name}</h4>
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <Award className="w-4 h-4" />
                    <span>Rank #{selectedTeam.rank}</span>
                  </div>
                  {teamInfo.subtitle && <p className="text-xs text-slate-400 mt-0.5">{teamInfo.subtitle}</p>}
                </div>
              </div>

              {/* Submission Data Section — dynamically rendered from stage fields */}
              {hasSubmissionData && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Submission Details</p>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <SubmissionDetailsRenderer
                      data={data}
                      fields={stageFields}
                      eventId={selectedEvent?._id}
                      submissionId={selectedTeam.submission_id}
                    />
                  </div>
                </div>
              )}

              {/* Evaluation Section — only if score or status data exists */}
              {(hasScoreData || hasStatusData) && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Evaluation</p>
                  <div className="grid grid-cols-2 gap-3">
                    {hasScoreData && (
                      <div className="bg-white border border-slate-100 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-400">Final Score</p>
                        <p className="text-xl font-bold text-slate-900">{scoreDisplay!.score.toFixed(1)}</p>
                        {scoreDisplay!.label && <p className={`text-xs font-semibold ${scoreDisplay!.color}`}>{scoreDisplay!.label}</p>}
                      </div>
                    )}
                    {hasStatusData && (
                      <div className="bg-white border border-slate-100 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-400">Status</p>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${statusBadge!.bg}`}>
                            {statusBadge!.icon}
                            {selectedTeam.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Team Members Section */}
              {selectedTeam.members && selectedTeam.members.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Team Members ({selectedTeam.member_count})</p>
                  <div className="space-y-2">
                    {selectedTeam.members.map((m, i) => (
                      <div key={i} className="flex items-center space-x-3 bg-white border border-slate-100 rounded-lg p-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {m.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{m.name || 'Unknown'}</p>
                          {m.email && <p className="text-xs text-slate-500 flex items-center"><Mail className="w-3 h-3 mr-1" />{m.email}</p>}
                        </div>
                        <span className="text-xs font-medium text-slate-400">{m.role || 'Member'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Judge Feedback Section */}
              {Array.isArray(selectedTeam.judges_feedback) && selectedTeam.judges_feedback.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Judge Feedback</p>
                  <div className="space-y-2">
                    {selectedTeam.judges_feedback.map((fb: any, fbi: number) => (
                      <div key={fbi} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-600">{fb.judge_name || fb.judge_email || 'Judge'}</span>
                          <span className="text-xs font-bold text-indigo-600">{typeof fb.score === 'number' ? fb.score.toFixed(1) : fb.score}</span>
                        </div>
                        {fb.feedback ? (
                          <p className="text-sm text-slate-700 leading-relaxed">{fb.feedback}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No feedback provided</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation Section */}
              {hasRecData && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Recommendation</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{recommendation}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedTeam(null)}
                className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Recommendation Preview Modal */}
      {previewRecommendation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">{previewRecommendation.title}</h3>
              <button onClick={() => setPreviewRecommendation(null)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{previewRecommendation.text}</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setPreviewRecommendation(null)}
                className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center space-x-2 transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
