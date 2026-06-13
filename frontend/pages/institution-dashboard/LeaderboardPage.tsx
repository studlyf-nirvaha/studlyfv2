import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy, Award, Download, CheckCircle, Search, Filter,
  ChevronDown, ChevronRight, ChevronLeft, Medal, Clock, XCircle,
  X, Mail, Users, Users2
} from 'lucide-react';
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
  project_title: string;
  solution_description: string;
  score: number;
  status: string;
  recommendation: string;
  member_count: number;
  members: TeamMember[];
  email: string;
  rank: number;
  submission_id?: string;
  submitted_at?: string | null;
  data?: Record<string, any>;
}

interface LeaderboardResponse {
  status: string;
  event_id: string;
  stage_id: string | null;
  counts: Record<string, number>;
  total_submissions: number;
  submissions: Submission[];
  stage_fields?: { field_id: string; label: string; field_type: string }[];
  evaluation_thresholds?: { shortlist_min?: number; waitlist_min?: number; reject_below?: number };
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

const ITEMS_PER_PAGE = 5;

const getScoreLabel = (score: number): { label: string; color: string } => {
  if (score >= 90) return { label: 'Outstanding', color: 'text-emerald-600' };
  if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600' };
  if (score >= 70) return { label: 'Very Good', color: 'text-blue-600' };
  if (score >= 60) return { label: 'Good', color: 'text-amber-600' };
  return { label: 'Needs Work', color: 'text-red-600' };
};

const getStatusStyle = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'winner':
      return { bg: 'bg-yellow-100 text-yellow-700', icon: <Trophy className="w-3.5 h-3.5 mr-1" /> };
    case 'shortlisted':
      return { bg: 'bg-blue-50 text-blue-600 border border-blue-200', icon: <Award className="w-3.5 h-3.5 mr-1" /> };
    case 'waitlisted':
      return { bg: 'bg-orange-50 text-orange-600 border border-orange-200', icon: <Clock className="w-3.5 h-3.5 mr-1" /> };
    case 'rejected':
      return { bg: 'bg-red-50 text-red-600 border border-red-200', icon: <XCircle className="w-3.5 h-3.5 mr-1" /> };
    case 'approved':
      return { bg: 'bg-emerald-50 text-emerald-600 border border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5 mr-1" /> };
    default:
      return { bg: 'bg-slate-100 text-slate-600 border border-slate-200', icon: <Clock className="w-3.5 h-3.5 mr-1" /> };
  }
};

const renderRank = (rank: number) => {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center border border-yellow-300 shadow-sm"><Medal className="w-5 h-5 text-yellow-600" /></div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-300 shadow-sm"><Medal className="w-5 h-5 text-slate-500" /></div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center border border-orange-300 shadow-sm"><Medal className="w-5 h-5 text-orange-600" /></div>;
  return <span className="font-semibold text-slate-600 ml-3">{rank}</span>;
};

export default function LiveResultsDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedStage, setSelectedStage] = useState<EventStage | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState<Submission | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
          if (eventsArray.length > 0) {
            setSelectedEvent(eventsArray[0]);
          }
        }
      } catch (e) {
        console.error('Error fetching events:', e);
      }
    };
    fetchEvents();
  }, [user?.institution_id]);

  useEffect(() => {
    if (selectedEvent && selectedEvent.stages?.length > 0) {
      setSelectedStage(selectedEvent.stages[0]);
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent || !selectedStage) return;
    const fetchBoard = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/institution/leaderboard/${selectedEvent._id}/integrated?stage_id=${selectedStage.id}&institution_id=${user?.institution_id}`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const json = await res.json();
          setLeaderboardData(json);
          setCurrentPage(1);
        }
      } catch (e) {
        console.error('Error fetching leaderboard:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, [selectedEvent, selectedStage, user?.institution_id]);

  const counts = leaderboardData?.counts || {};
  const submissions = leaderboardData?.submissions || [];

  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter((s) => {
        const matchesTab = activeTab === 'All' || s.status === activeTab;
        const matchesSearch = s.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.project_title?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTab && matchesSearch;
      })
      .sort((a, b) => a.rank - b.rank);
  }, [submissions, activeTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE));
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const thresholds = leaderboardData?.evaluation_thresholds || {};
  const shortlistMin = thresholds.shortlist_min ?? 70;
  const waitlistMin = thresholds.waitlist_min ?? 50;
  const rejectBelow = thresholds.reject_below ?? 50;

  const summaryCards = [
    { title: 'Total Teams', value: String(counts.Total || 0), subtext: 'Registered', icon: <Trophy className="w-5 h-5 text-yellow-600" />, bgColor: 'bg-yellow-50', iconBg: 'bg-yellow-100' },
    { title: 'Shortlisted', value: String(counts.Shortlisted || 0), subtext: `Min. ${shortlistMin}%`, icon: <CheckCircle className="w-5 h-5 text-emerald-600" />, bgColor: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
    { title: 'Waitlisted', value: String(counts.Waitlisted || 0), subtext: `Min. ${waitlistMin}%`, icon: <Clock className="w-5 h-5 text-blue-600" />, bgColor: 'bg-blue-50', iconBg: 'bg-blue-100' },
    { title: 'Rejected', value: String(counts.Rejected || 0), subtext: `Below ${rejectBelow}%`, icon: <XCircle className="w-5 h-5 text-red-600" />, bgColor: 'bg-red-50', iconBg: 'bg-red-100' },
  ];

  const tabs = [
    { id: 'All', label: 'All', count: counts.Total || 0 },
    { id: 'Shortlisted', label: 'Shortlisted', count: counts.Shortlisted || 0 },
    { id: 'Waitlisted', label: 'Waitlisted', count: counts.Waitlisted || 0 },
    { id: 'Rejected', label: 'Rejected', count: counts.Rejected || 0 },
    { id: 'Pending', label: 'Pending', count: counts.Pending || 0 },
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
            <button className="flex items-center px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] font-medium text-sm transition-colors shadow-sm">
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
                <table className="w-full min-w-[1000px] text-left border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-800 bg-white">
                      <th className="py-4 px-6 w-20">Rank</th>
                      <th className="py-4 px-6 w-1/4">Team / Participant</th>
                      <th className="py-4 px-6 w-1/4">Project / Idea</th>
                      <th className="py-4 px-6 w-32">
                        Final Score{' '}
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 text-[10px] ml-1">i</span>
                      </th>
                      <th className="py-4 px-6 w-32">Status</th>
                      <th className="py-4 px-6 w-1/4">Recommendation</th>
                      <th className="py-4 px-6 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginatedSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-24 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <Search className="w-8 h-8 text-slate-300" />
                            <p className="text-sm font-medium text-slate-500">No submissions found</p>
                            <p className="text-xs text-slate-400">Try adjusting your filters or search terms.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedSubmissions.map((row) => {
                        const scoreInfo = getScoreLabel(row.score);
                        const statusStyle = getStatusStyle(row.status);
                        return (
                          <tr key={row.team_id || row.rank} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6 truncate flex items-center justify-center">
                              {renderRank(row.rank)}
                            </td>
                            <td className="py-4 px-6 truncate">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-bold text-slate-900 truncate">{row.display_name}</span>
                                {row.is_verified && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-[#4f46e5]">Verified</span>}
                              </div>
                              <div className="flex items-center text-xs text-slate-500 truncate">
                                <Users2 className="w-3.5 h-3.5 mr-1.5" />
                                {row.member_count > 0 ? `${row.member_count} members` : 'Individual'}
                              </div>
                            </td>
                            <td className="py-4 px-6 truncate">
                              <div className="font-semibold text-slate-800 mb-1 truncate">{row.project_title}</div>
                              <div className="text-xs text-slate-500 truncate">{row.solution_description || row.data?.idea_abstract || 'No description provided'}</div>
                            </td>
                            <td className="py-4 px-6 truncate">
                              <div className="flex flex-col">
                                <span className="font-bold text-lg text-slate-900">{row.score?.toFixed(1) || '0.0'}</span>
                                <span className={`text-xs font-medium ${scoreInfo.color}`}>{scoreInfo.label}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 truncate">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${statusStyle.bg}`}>
                                {statusStyle.icon}
                                {row.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-600 truncate">
                              <span className="truncate">{row.recommendation}</span>
                            </td>
                            <td className="py-4 px-6 text-right truncate">
                              <div className="flex justify-end min-w-[100px]">
                                <button
                                  onClick={() => { console.log('Row Data:', row); setSelectedTeam(row); }}
                                  className="inline-flex items-center justify-center px-6 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 shadow-sm transition-all whitespace-nowrap"
                                >
                                  View Details
                                </button>
                              </div>
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
                <div className="text-sm text-slate-500">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredSubmissions.length)} of {filteredSubmissions.length} entries
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

      {/* View Details Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Team Details</h3>
              <button onClick={() => setSelectedTeam(null)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-200">
                  <Users className="w-6 h-6 text-[#4f46e5]" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-900">{selectedTeam.display_name}</h4>
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <Award className="w-4 h-4" />
                    <span>Rank #{selectedTeam.rank}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</p>
                  <p className="font-semibold text-slate-900">{selectedTeam.project_title}</p>
                </div>
                {selectedTeam.solution_description && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</p>
                    <p className="text-sm text-slate-700">{selectedTeam.solution_description}</p>
                  </div>
                )}
                <div className="flex items-center space-x-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</p>
                    <p className="font-bold text-xl text-slate-900">{selectedTeam.score?.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusStyle(selectedTeam.status).bg}`}>
                      {getStatusStyle(selectedTeam.status).icon}
                      {selectedTeam.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Team Members ({selectedTeam.member_count})</p>
                {selectedTeam.members && selectedTeam.members.length > 0 ? (
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
                ) : (
                  <div className="flex items-center space-x-3 bg-white border border-slate-100 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                      {selectedTeam.display_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{selectedTeam.display_name}</p>
                      {selectedTeam.email && <p className="text-xs text-slate-500 flex items-center"><Mail className="w-3 h-3 mr-1" />{selectedTeam.email}</p>}
                    </div>
                    <span className="text-xs font-medium text-slate-400 ml-auto">Individual</span>
                  </div>
                )}
              </div>

              {selectedTeam.recommendation && selectedTeam.recommendation !== '—' && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Recommendation</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{selectedTeam.recommendation}</p>
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
