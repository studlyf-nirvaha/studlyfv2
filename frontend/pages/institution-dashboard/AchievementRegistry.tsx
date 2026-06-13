import React, { useState, useEffect } from 'react';
import {
  Search, Filter, ChevronDown, CheckCircle, Clock, XCircle,
  Trophy, Medal, Award, Users, FileText, Download, Eye, Mail, MoreVertical, ExternalLink, Loader2
} from 'lucide-react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import { useAuth } from '../../AuthContext';
import CertificateTemplateBuilder from './components/CertificateTemplateBuilder';

interface EventStage {
  id: string;
  name: string;
}

interface EventItem {
  _id: string;
  title: string;
  stages?: EventStage[];
}

interface CertStats {
  total: number;
  achievement: number;
  participation: number;
  verified_today: number;
  pending: number;
  revoked: number;
}

interface EligibilityPreview {
  winner_teams: { count: number; recipients: number };
  runner_up_teams: { count: number; recipients: number };
  finalist_teams: { count: number; recipients: number };
  participation_eligible: { count: number };
}

interface CertificateRecord {
  _id: string;
  certificate_id?: string;
  recipient_name?: string;
  student_name?: string;
  team_name?: string;
  event_title?: string;
  stage_name?: string;
  stage_id?: string;
  type?: string;
  category?: string;
  issued_on?: string;
  issue_date?: string;
  status?: string;
  verification_code?: string;
  email?: string;
  user_id?: string;
}

const formatDate = (d: string | undefined) => {
  if (!d) return { date: '-', time: '' };
  const dt = new Date(d);
  return {
    date: dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
};

const typeIcon = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'winner': return <Trophy className="w-4 h-4 text-yellow-500 mr-2" />;
    case 'runner up': case 'runner_up': case 'runner-up': return <Medal className="w-4 h-4 text-gray-400 mr-2" />;
    case 'finalist': return <Award className="w-4 h-4 text-orange-500 mr-2" />;
    default: return <Users className="w-4 h-4 text-indigo-500 mr-2" />;
  }
};

export default function AchievementRegistry() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedStage, setSelectedStage] = useState<EventStage | null>(null);
  const [stats, setStats] = useState<CertStats | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityPreview | null>(null);
  const [registry, setRegistry] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('All Certificates');
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user?.institution_id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${user.institution_id}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const arr = Array.isArray(data) ? data : [];
          setEvents(arr);
          if (arr.length > 0) {
            setSelectedEvent(arr[0]);
            if (arr[0].stages?.length > 0) {
              setSelectedStage(arr[0].stages[0]);
            }
          }
        }
      } catch (e) { console.error('Error fetching events:', e); }
    };
    fetchEvents();
  }, [user?.institution_id]);

  useEffect(() => {
    if (!selectedEvent || !user?.institution_id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, regRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/institution/certificates/stats?institution_id=${user.institution_id}`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/api/v1/institution/certificates/registry?institution_id=${user.institution_id}&event_id=${selectedEvent._id}${selectedStage ? `&stage_id=${selectedStage.id}` : ''}`, { headers: authHeaders() }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (regRes.ok) setRegistry(await regRes.json());

        if (selectedStage) {
          const previewRes = await fetch(`${API_BASE_URL}/api/v1/institution/certificates/preview?event_id=${selectedEvent._id}&stage_id=${selectedStage.id}`, {
            method: 'POST',
            headers: authHeaders(),
          });
          if (previewRes.ok) setEligibility(await previewRes.json());
        }
      } catch (e) { console.error('Error fetching certificate data:', e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [selectedEvent, selectedStage, user?.institution_id]);

  const filteredRegistry = registry.filter((c) => {
    const matchesTab = activeTab === 'All Certificates' ||
      (activeTab === 'Achievement' && (c.type || c.category || '').toLowerCase().includes('achiev')) ||
      (activeTab === 'Participation' && (c.type || c.category || '').toLowerCase().includes('partic')) ||
      (activeTab === 'Issued' && (c.status || '').toLowerCase() === 'issued') ||
      (activeTab === 'Pending' && (c.status || '').toLowerCase() === 'pending') ||
      (activeTab === 'Revoked' && (c.status || '').toLowerCase() === 'revoked');
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      (c.certificate_id || '').toLowerCase().includes(q) ||
      (c.recipient_name || c.student_name || '').toLowerCase().includes(q) ||
      (c.team_name || '').toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const tabs = ['All Certificates', 'Achievement', 'Participation', 'Pending', 'Issued', 'Revoked'];
  const rules = [
    { icon: <Trophy className="w-4 h-4 text-slate-400" />, label: 'Winner', value: 'Top 1 Team' },
    { icon: <Medal className="w-4 h-4 text-slate-400" />, label: 'Runner Up', value: 'Rank 2 - 3' },
    { icon: <Award className="w-4 h-4 text-slate-400" />, label: 'Finalist', value: 'Rank 4 - 20' },
    { icon: <CheckCircle className="w-4 h-4 text-slate-400" />, label: 'Participation', value: 'All who submitted final stage' },
    { icon: <Award className="w-4 h-4 text-slate-400" />, label: 'Minimum Score', value: 'Not Applicable' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-8 font-sans text-slate-800">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Achievement Registry</h1>
          <p className="text-sm text-slate-500 mt-1">Create, manage and issue certificates for events and participants.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowTemplateBuilder(true)}
            className="flex items-center px-4 py-2 border border-indigo-600 text-indigo-600 bg-white rounded-md hover:bg-indigo-50 font-medium text-sm transition-colors">
            <FileText className="w-4 h-4 mr-2" /> Template Builder
          </button>
          <button className="flex items-center px-4 py-2 border border-indigo-600 text-indigo-600 bg-white rounded-md hover:bg-indigo-50 font-medium text-sm transition-colors">
            <CheckCircle className="w-4 h-4 mr-2" /> Verify Certificates
          </button>
          <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium text-sm transition-colors">
            <Award className="w-4 h-4 mr-2" /> Issue Certificates
          </button>
        </div>
      </div>
      
      {showTemplateBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Certificate Template Builder</h2>
              <button onClick={() => setShowTemplateBuilder(false)} className="text-slate-500 hover:text-slate-700">Close</button>
            </div>
            <div className="p-4">
              <CertificateTemplateBuilder institutionId={user?.institution_id || ''} />
            </div>
          </div>
        </div>
      )}


      {/* Filters Row */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Select Event', value: selectedEvent?.title || 'All Events' },
          { label: 'Select Stage', value: selectedStage?.name || 'All Stages' },
          { label: 'Certificate Category', value: 'All Certificates' },
          { label: 'Certificate Type', value: 'All Types' },
          { label: 'Status', value: 'All Status' },
        ].map((filter, idx) => (
          <div key={idx} className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 mb-1">{filter.label}</label>
            <div className="relative">
              {idx === 0 ? (
                <select
                  className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  value={selectedEvent?._id || ''}
                  onChange={(e) => {
                    const ev = events.find((ev) => ev._id === e.target.value);
                    setSelectedEvent(ev || null);
                    setSelectedStage(ev?.stages?.[0] || null);
                  }}
                >
                  <option value="">All Events</option>
                  {events.map((ev) => (
                    <option key={ev._id} value={ev._id}>{ev.title}</option>
                  ))}
                </select>
              ) : idx === 1 ? (
                <select
                  className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  value={selectedStage?.id || ''}
                  onChange={(e) => setSelectedStage(selectedEvent?.stages?.find((s) => s.id === e.target.value) || null)}
                >
                  <option value="">All Stages</option>
                  {(selectedEvent?.stages || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <select className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600">
                  <option>{filter.value}</option>
                </select>
              )}
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>
        ))}
        <div className="col-span-5 flex justify-end space-x-3 mt-2">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search recipient, team or ID..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50">
            <Filter className="w-4 h-4 mr-2" /> Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* Top 3 Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Certificate Eligibility Preview */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center mb-4">
                <h3 className="text-indigo-600 font-semibold text-sm">Certificate Eligibility Preview</h3>
                <span className="ml-2 w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs">i</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">These are eligible recipients based on the rules and scores.</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="border border-slate-100 rounded-lg p-3 text-center bg-slate-50">
                  <Trophy className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
                  <div className="text-[10px] text-slate-500 font-medium uppercase">Winner Teams</div>
                  <div className="text-xl font-bold">{eligibility?.winner_teams?.count ?? 0}</div>
                  <div className="text-[10px] text-slate-400">Recipients: {eligibility?.winner_teams?.recipients ?? 0}</div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 text-center bg-slate-50">
                  <Medal className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                  <div className="text-[10px] text-slate-500 font-medium uppercase">Runner Up Teams</div>
                  <div className="text-xl font-bold">{eligibility?.runner_up_teams?.count ?? 0}</div>
                  <div className="text-[10px] text-slate-400">Recipients: {eligibility?.runner_up_teams?.recipients ?? 0}</div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 text-center bg-slate-50">
                  <Award className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <div className="text-[10px] text-slate-500 font-medium uppercase">Finalist Teams</div>
                  <div className="text-xl font-bold">{eligibility?.finalist_teams?.count ?? 0}</div>
                  <div className="text-[10px] text-slate-400">Recipients: {eligibility?.finalist_teams?.recipients ?? 0}</div>
                </div>
              </div>
              <div className="flex items-center justify-between border border-slate-100 rounded-lg p-3 mb-4 bg-slate-50">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-indigo-600 bg-indigo-50 p-1.5 rounded-md mr-3" />
                  <div>
                    <div className="text-xs font-semibold">Participation Eligible Recipients</div>
                    <div className="text-[10px] text-slate-500">Participants who completed the required criteria</div>
                  </div>
                </div>
                <div className="text-xl font-bold">{eligibility?.participation_eligible?.count ?? 0}</div>
              </div>
              <button className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                View Eligible Recipients →
              </button>
            </div>

            {/* Certificate Statistics */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center mb-4">
                <h3 className="text-indigo-600 font-semibold text-sm">Certificate Statistics (Issued)</h3>
                <span className="ml-2 w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs">i</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-[11px] font-semibold">Total Issued</span>
                  </div>
                  <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-[11px] font-semibold text-slate-600">Achievement Issued</span>
                  </div>
                  <div className="text-xl font-bold">{stats?.achievement ?? 0}</div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-[11px] font-semibold text-slate-600">Participation Issued</span>
                  </div>
                  <div className="text-xl font-bold">{stats?.participation ?? 0}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-1 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-[11px] font-medium text-slate-600">Verified Today</span>
                  </div>
                  <div className="text-xl font-bold">{stats?.verified_today ?? 0}</div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-1 mb-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span className="text-[11px] font-medium text-slate-600">Pending</span>
                  </div>
                  <div className="text-xl font-bold">{stats?.pending ?? 0}</div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-1 mb-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-[11px] font-medium text-slate-600">Revoked</span>
                  </div>
                  <div className="text-xl font-bold">{stats?.revoked ?? 0}</div>
                </div>
              </div>
              <button className="w-full py-2.5 border border-slate-200 text-indigo-600 bg-slate-50 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
                View All Statistics →
              </button>
            </div>

            {/* Certificate Rules Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
              <div className="flex items-center mb-4">
                <h3 className="text-emerald-600 font-semibold text-sm">Certificate Rules Summary</h3>
                <span className="ml-2 w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs">i</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Rules used to determine certificate eligibility</p>
              <div className="flex-1 space-y-3">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
                    <div className="flex items-center space-x-3 text-slate-700">
                      {rule.icon}
                      <span>{rule.label}</span>
                    </div>
                    <span className="text-slate-500 text-xs">{rule.value}</span>
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 mt-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                Manage Rules
              </button>
            </div>
          </div>

          {/* Main Table & Preview Area */}
          <div className="flex gap-6">
            {/* Left Side: Table Area */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 p-2">
                <div className="flex space-x-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-xs font-medium rounded-md ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <button className="flex items-center text-xs font-medium text-indigo-600 px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 mr-2">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export as PDF
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Certificate ID</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Team / Entry</th>
                      <th className="py-3 px-4">Certificate Type</th>
                      <th className="py-3 px-4">Issued On</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredRegistry.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-16 text-center text-slate-400 text-sm font-medium">
                          No certificates found
                        </td>
                      </tr>
                    ) : (
                      filteredRegistry.map((c) => {
                        const ft = formatDate(c.issued_on || c.issue_date);
                        const name = c.recipient_name || c.student_name || '-';
                        const certType = c.type || c.category || 'Participation';
                        return (
                          <tr key={c._id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-xs font-medium text-slate-800">{c.certificate_id || c._id.slice(-8)}</td>
                            <td className="py-3 px-4">
                              <div className="text-xs font-semibold">{name}</div>
                              <div className="text-[10px] text-slate-500">{c.email || ''}</div>
                            </td>
                            <td className="py-3 px-4 text-xs">{c.team_name || '-'}</td>
                            <td className="py-3 px-4 text-xs flex items-center mt-2">{typeIcon(certType)}{certType}</td>
                            <td className="py-3 px-4 text-xs">
                              <div>{ft.date}</div>
                              {ft.time && <div className="text-[10px] text-slate-500">{ft.time}</div>}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-[10px] font-bold rounded ${
                                (c.status || '').toLowerCase() === 'issued' || (c.status || '').toLowerCase() === 'verified'
                                  ? 'bg-green-100 text-green-700'
                                  : (c.status || '').toLowerCase() === 'revoked'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {c.status || 'Issued'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs font-mono">{c.verification_code || (c.certificate_id || '').slice(-8) || '------'}</span>
                                <div className="w-3 h-3 bg-slate-200 rounded-sm" />
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center space-x-2 text-indigo-600">
                                <Eye className="w-4 h-4 cursor-pointer hover:text-indigo-800" />
                                <Download className="w-4 h-4 cursor-pointer hover:text-indigo-800" />
                                <Mail className="w-4 h-4 cursor-pointer hover:text-indigo-800" />
                                <MoreVertical className="w-4 h-4 cursor-pointer text-slate-400" />
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
              <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-white">
                <div className="text-xs text-slate-500">
                  Showing 1 to {Math.min(filteredRegistry.length, 10)} of {filteredRegistry.length} certificates
                </div>
                <div className="flex space-x-1">
                  <button className="px-2 py-1 border border-slate-200 rounded text-slate-400 text-xs">&lt;</button>
                  <button className="px-2.5 py-1 border border-indigo-600 bg-indigo-50 text-indigo-600 rounded text-xs font-medium">1</button>
                  <button className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-xs">2</button>
                  <button className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-xs">3</button>
                  <span className="px-2 py-1 text-slate-400 text-xs">...</span>
                  <button className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-xs">
                    {Math.max(1, Math.ceil(filteredRegistry.length / 10))}
                  </button>
                  <button className="px-2 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-xs">&gt;</button>
                </div>
              </div>
            </div>

            {/* Right Side: Preview Panel */}
            <div className="w-[300px] flex flex-col space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-indigo-600 mb-3">Certificate Preview</h3>
                {/* Mock Certificate */}
                <div className="w-full h-40 bg-[#fdfaf5] border-2 border-[#d4af37] rounded flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-inner mb-4">
                  <div className="absolute top-0 left-0 w-0 h-0 border-t-[40px] border-t-black border-r-[40px] border-r-transparent" />
                  <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[40px] border-b-black border-l-[40px] border-l-transparent" />
                  <h4 className="text-[10px] font-serif uppercase tracking-widest text-slate-800">Certificate</h4>
                  <div className="text-[6px] text-slate-500 uppercase tracking-wider mb-2">Of Achievement</div>
                  <div className="w-full border-b border-slate-300 my-1" />
                  <div className="font-serif text-xl italic font-bold my-1">John Doe</div>
                  <div className="w-full border-b border-slate-300 my-1 mb-2" />
                  <div className="text-[8px] font-semibold">Winner</div>
                  <div className="absolute bottom-2 right-2 flex flex-col items-center">
                    <div className="w-4 h-4 bg-slate-200 mb-1" />
                  </div>
                  <div className="absolute bottom-2 mt-2 w-6 h-6 rounded-full bg-yellow-600 border border-yellow-400 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border border-yellow-300" />
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <h4 className="text-xs font-semibold mb-2">Verification Preview</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Certificate ID</span>
                      <span className="font-mono font-medium">{filteredRegistry[0]?.certificate_id || '---'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Verification Code</span>
                      <span className="font-mono font-medium">{filteredRegistry[0]?.verification_code || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Status</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                        {filteredRegistry[0]?.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex justify-center items-center">
                  View Verification Page <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Features Row */}
          <div className="mt-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex justify-between">
            {[
              { icon: <CheckCircle className="w-6 h-6 text-indigo-600" />, title: 'QR Verification', desc: 'Every certificate has a unique QR code for instant verification.' },
              { icon: <CheckCircle className="w-6 h-6 text-indigo-600" />, title: 'Secure & Verifiable', desc: 'All certificates are digitally signed and tamper-proof.' },
              { icon: <Mail className="w-6 h-6 text-indigo-600" />, title: 'Bulk Email', desc: 'Certificates are emailed automatically to recipients.' },
              { icon: <FileText className="w-6 h-6 text-indigo-600" />, title: 'Custom Templates', desc: 'Create beautiful certificate templates for your events.' },
              { icon: <Clock className="w-6 h-6 text-indigo-600" />, title: 'Audit Trail', desc: 'Track issuance, verification and revocation history.' },
            ].map((feature, idx) => (
              <div key={idx} className="flex space-x-3 max-w-[200px]">
                <div className="mt-0.5">{feature.icon}</div>
                <div>
                  <h4 className="text-sm font-semibold text-indigo-600 mb-1">{feature.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
