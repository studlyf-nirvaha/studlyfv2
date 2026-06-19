import React, { useState, useEffect } from 'react';
import {
  Search, Filter, ChevronDown, CheckCircle, Clock, XCircle,
  Trophy, Medal, Award, Users, FileText, Download, Eye, Mail, MoreVertical, ExternalLink, Loader2, AlertCircle
} from 'lucide-react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';

interface EventStage { id: string; name: string }
interface EventItem { _id: string; title: string; stages?: EventStage[] }
interface CertStats { total: number; achievement: number; participation: number; verified_today: number; pending: number; revoked: number }
interface EligibilityPreview { winner_teams: { count: number; recipients: number }; runner_up_teams: { count: number; recipients: number }; finalist_teams: { count: number; recipients: number }; participation_eligible: { count: number }; non_qualifier_participants?: { count: number } }
interface CertificateRecord {
  _id: string; certificate_id?: string; recipient_name?: string; student_name?: string;
  team_name?: string; event_title?: string; stage_name?: string; type?: string; category?: string;
  issued_on?: string; issue_date?: string; status?: string; verification_code?: string; email?: string;
}

const formatDate = (d?: string) => {
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

const CertificatesPage: React.FC<{ institutionId: string }> = ({ institutionId }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedStage, setSelectedStage] = useState<EventStage | null>(null);
  const [stats, setStats] = useState<CertStats | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityPreview | null>(null);
  const [registry, setRegistry] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueResult, setIssueResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All Certificates');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // New States for Eligibility and Wizard Progress
  const [showEligibleModal, setShowEligibleModal] = useState(false);
  const [eligibleRecipientsData, setEligibleRecipientsData] = useState<any>(null);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [issuingProgress, setIssuingProgress] = useState<string | null>(null);

  const handleViewEligibleRecipients = async () => {
    if (!selectedEvent || !selectedStage) return;
    setLoadingEligible(true);
    setShowEligibleModal(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/institution/certificates/eligible-recipients?event_id=${selectedEvent._id}&stage_id=${selectedStage.id}`,
        { method: 'POST', headers: authHeaders() }
      );
      if (res.ok) {
        setEligibleRecipientsData(await res.json());
      }
    } catch (e) {
      console.error('Error fetching eligible recipients:', e);
    } finally {
      setLoadingEligible(false);
    }
  };

  const handleIssueCertificates = async (target: 'all' | 'ranked' | 'participation' | 'non_qualifiers') => {
    if (!selectedEvent || !selectedStage) return;
    setIssuing(true);
    setIssueResult(null);
    setIssuingProgress("Fetching eligible recipients...");
    
    try {
      // 1. Fetch eligible recipients for the selected stage and event
      const eligibleRes = await fetch(
        `${API_BASE_URL}/api/v1/institution/certificates/eligible-recipients?event_id=${selectedEvent._id}&stage_id=${selectedStage.id}`,
        { method: 'POST', headers: authHeaders() }
      );
      
      if (!eligibleRes.ok) {
        throw new Error("Failed to retrieve eligible recipients from leaderboard.");
      }
      
      const eligibleData = await eligibleRes.json();
      const categories = eligibleData.categories || {};
      
      let issuedCount = 0;
      
      // Helper function to issue a specific category
      const issueCategory = async (catKey: string, achievementType: string) => {
        const cat = categories[catKey];
        if (!cat || !cat.recipients || cat.recipients.length === 0) return 0;
        
        // Map recipients to their respective IDs (for qualifiers, use submission_id; for non-qualifiers, user_id)
        const recipientIds = cat.recipients.map((r: any) => r.submission_id || r.user_id || r.participant_id).filter(Boolean);
        if (recipientIds.length === 0) return 0;
        
        setIssuingProgress(`Issuing ${cat.label} certificates (${recipientIds.length})...`);
        
        const params = new URLSearchParams();
        params.append("event_id", selectedEvent._id);
        recipientIds.forEach((id: string) => params.append("recipient_ids", id));
        params.append("achievement_type", achievementType);
        params.append("send_email", "true");
        
        const issueRes = await fetch(
          `${API_BASE_URL}/api/v1/institution/certificates/issue?${params.toString()}`,
          { method: 'POST', headers: authHeaders() }
        );
        
        if (issueRes.ok) {
          const resData = await issueRes.json();
          return resData.issued || 0;
        } else {
          console.error(`Failed to issue ${cat.label} certificates`);
          return 0;
        }
      };

      // 2. Issue certificates based on the user's selection
      if (target === 'all' || target === 'ranked') {
        issuedCount += await issueCategory('winner', 'winner');
        issuedCount += await issueCategory('runner_up', 'runner_up');
        issuedCount += await issueCategory('finalist', 'finalist');
      }
      
      if (target === 'all' || target === 'participation') {
        issuedCount += await issueCategory('participation', 'participation');
      }
      
      if (target === 'all' || target === 'non_qualifiers') {
        issuedCount += await issueCategory('non_qualifier_participation', 'participation');
      }
      
      setIssueResult(`Successfully issued ${issuedCount} certificate(s)!`);
      
      // Refresh registry & stats
      const [statsRes, regRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/institution/certificates/stats?institution_id=${institutionId}`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/api/v1/institution/certificates/registry?institution_id=${institutionId}&event_id=${selectedEvent._id}${selectedStage ? `&stage_id=${selectedStage.id}` : ''}`, { headers: authHeaders() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (regRes.ok) setRegistry(await regRes.json());
      
    } catch (err: any) {
      setIssueResult(err.message || 'Error issuing certificates');
    } finally {
      setIssuing(false);
      setIssuingProgress(null);
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${institutionId}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const arr = Array.isArray(data) ? data : [];
          setEvents(arr);
          if (arr.length > 0) {
            setSelectedEvent(arr[0]);
            if (arr[0].stages?.length > 0) setSelectedStage(arr[0].stages[0]);
          }
        }
      } catch (e) { console.error('Error fetching events:', e); }
    };
    fetchEvents();
  }, [institutionId]);

  useEffect(() => {
    if (!selectedEvent) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, regRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/institution/certificates/stats?institution_id=${institutionId}`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/api/v1/institution/certificates/registry?institution_id=${institutionId}&event_id=${selectedEvent._id}${selectedStage ? `&stage_id=${selectedStage.id}` : ''}`, { headers: authHeaders() }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (regRes.ok) setRegistry(await regRes.json());

        if (selectedStage) {
          const previewRes = await fetch(`${API_BASE_URL}/api/v1/institution/certificates/preview?event_id=${selectedEvent._id}&stage_id=${selectedStage.id}`, {
            method: 'POST', headers: authHeaders(),
          });
          if (previewRes.ok) setEligibility(await previewRes.json());
        }
      } catch (e) { console.error('Error:', e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [selectedEvent, selectedStage, institutionId]);

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

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRegistry.length / itemsPerPage));
  const currentRegistry = filteredRegistry.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, selectedEvent, selectedStage]);

  const rules = [
    { icon: <Trophy className="w-4 h-4 text-slate-400" />, label: 'Winner', value: 'Top 1 Team' },
    { icon: <Medal className="w-4 h-4 text-slate-400" />, label: 'Runner Up', value: 'Rank 2 - 3' },
    { icon: <Award className="w-4 h-4 text-slate-400" />, label: 'Finalist', value: 'Rank 4 - 20' },
    { icon: <CheckCircle className="w-4 h-4 text-slate-400" />, label: 'Participation', value: 'All registered participants' },
    { icon: <AlertCircle className="w-4 h-4 text-amber-500" />, label: 'Non-Qualifier', value: 'Registered, no qualifying score' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-8 font-sans text-slate-800">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Achievement Registry</h1>
          <p className="text-sm text-slate-500 mt-1">Create, manage and issue certificates for events and participants.</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 border border-indigo-600 text-indigo-600 bg-white rounded-md hover:bg-indigo-50 font-medium text-sm"><FileText className="w-4 h-4 mr-2" /> Template Builder</button>
          <button className="flex items-center px-4 py-2 border border-indigo-600 text-indigo-600 bg-white rounded-md hover:bg-indigo-50 font-medium text-sm"><CheckCircle className="w-4 h-4 mr-2" /> Verify Certificates</button>
          <button
            onClick={() => setShowIssueModal(true)}
            disabled={!selectedEvent || issuing}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium text-sm disabled:opacity-50"
          >
            {issuing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Award className="w-4 h-4 mr-2" />}
            {issuing ? 'Issuing...' : 'Issue Certificates'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Select Event</label>
          <div className="relative">
            <select className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={selectedEvent?._id || ''}
              onChange={(e) => {
                const ev = events.find((ev) => ev._id === e.target.value);
                setSelectedEvent(ev || null);
                setSelectedStage(ev?.stages?.[0] || null);
              }}>
              <option value="">All Events</option>
              {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Select Stage</label>
          <div className="relative">
            <select className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={selectedStage?.id || ''}
              onChange={(e) => setSelectedStage(selectedEvent?.stages?.find((s) => s.id === e.target.value) || null)}>
              <option value="">All Stages</option>
              {(selectedEvent?.stages || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Certificate Category</label>
          <div className="relative">
            <select className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"><option>All Certificates</option></select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Certificate Type</label>
          <div className="relative">
            <select className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"><option>All Types</option></select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Status</label>
          <div className="relative">
            <select className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"><option>All Status</option></select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
        <div className="col-span-5 flex justify-end space-x-3 mt-2">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Search recipient, team or ID..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50">
            <Filter className="w-4 h-4 mr-2" /> Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : (
        <>
          {/* 3 Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Eligibility */}
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
                <div className="flex items-center justify-between border border-slate-100 rounded-lg p-3 mb-2 bg-slate-50">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-indigo-600 bg-indigo-50 p-1.5 rounded-md mr-3" />
                    <div>
                      <div className="text-xs font-semibold">Participation Eligible Recipients</div>
                      <div className="text-[10px] text-slate-500">All registered participants (including non-qualifiers)</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold">{eligibility?.participation_eligible?.count ?? 0}</div>
                </div>
                {eligibility?.non_qualifier_participants?.count > 0 && (
                  <div className="flex items-center justify-between border border-amber-100 rounded-lg p-3 bg-amber-50">
                    <div className="flex items-center">
                      <AlertCircle className="w-8 h-8 text-amber-600 bg-amber-50 p-1.5 rounded-md mr-3" />
                      <div>
                        <div className="text-xs font-semibold">Non-Qualifier Participants</div>
                        <div className="text-[10px] text-slate-500">Registered but didn't qualify for final stage</div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-amber-600">{eligibility?.non_qualifier_participants?.count ?? 0}</div>
                  </div>
                )}
              <button
                onClick={handleViewEligibleRecipients}
                disabled={!selectedEvent || !selectedStage}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                View Eligible Recipients &rarr;
              </button>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center mb-4">
                <h3 className="text-indigo-600 font-semibold text-sm">Certificate Statistics (Issued)</h3>
                <span className="ml-2 w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs">i</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-2 mb-2"><Users className="w-4 h-4 text-indigo-600" /><span className="text-[11px] font-semibold">Total Issued</span></div>
                  <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-2 mb-2"><Trophy className="w-4 h-4 text-yellow-500" /><span className="text-[11px] font-semibold text-slate-600">Achievement Issued</span></div>
                  <div className="text-xl font-bold">{stats?.achievement ?? 0}</div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-2 mb-2"><Users className="w-4 h-4 text-indigo-600" /><span className="text-[11px] font-semibold text-slate-600">Participation Issued</span></div>
                  <div className="text-xl font-bold">{stats?.participation ?? 0}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-1 mb-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-[11px] font-medium text-slate-600">Verified Today</span></div>
                  <div className="text-xl font-bold">{stats?.verified_today ?? 0}</div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-1 mb-2"><Clock className="w-4 h-4 text-orange-400" /><span className="text-[11px] font-medium text-slate-600">Pending</span></div>
                  <div className="text-xl font-bold">{stats?.pending ?? 0}</div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center space-x-1 mb-2"><XCircle className="w-4 h-4 text-red-500" /><span className="text-[11px] font-medium text-slate-600">Revoked</span></div>
                  <div className="text-xl font-bold">{stats?.revoked ?? 0}</div>
                </div>
              </div>
              <button className="w-full py-2.5 border border-slate-200 text-indigo-600 bg-slate-50 rounded-lg text-sm font-medium hover:bg-slate-100">View All Statistics →</button>
            </div>

            {/* Rules */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
              <div className="flex items-center mb-4">
                <h3 className="text-emerald-600 font-semibold text-sm">Certificate Rules Summary</h3>
                <span className="ml-2 w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs">i</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Rules used to determine certificate eligibility</p>
              <div className="flex-1 space-y-3">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
                    <div className="flex items-center space-x-3 text-slate-700">{rule.icon}<span>{rule.label}</span></div>
                    <span className="text-slate-500 text-xs">{rule.value}</span>
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 mt-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Manage Rules</button>
            </div>
          </div>

          {/* Table + Preview */}
          <div className="flex gap-6">
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 p-2">
                <div className="flex space-x-1">
                  {['All Certificates', 'Achievement', 'Participation', 'Pending', 'Issued', 'Revoked'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-xs font-medium rounded-md ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{tab}</button>
                  ))}
                </div>
                <button className="flex items-center text-xs font-medium text-indigo-600 px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 mr-2">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export as PDF
                </button>
              </div>
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
                    {currentRegistry.length === 0 ? (
                      <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-sm font-medium">No certificates found</td></tr>
                    ) : (
                      currentRegistry.map((c) => {
                        const ft = formatDate(c.issued_on || c.issue_date);
                        const name = c.recipient_name || c.student_name || '-';
                        const certType = c.type || c.category || 'Participation';
                        const stageName = c.stage_name || selectedStage?.name || '-';
                        return (
                          <tr key={c._id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-xs font-medium text-slate-800">{c.certificate_id || c._id.slice(-8)}</td>
                            <td className="py-3 px-4"><div className="text-xs font-semibold">{name}</div><div className="text-[10px] text-slate-500">{c.email || ''}</div></td>
                            <td className="py-3 px-4 text-xs">{c.team_name || '-'}</td>
                            <td className="py-3 px-4 text-xs flex items-center mt-2">{typeIcon(certType)}{certType}</td>
                            <td className="py-3 px-4 text-xs"><div>{ft.date}</div>{ft.time && <div className="text-[10px] text-slate-500">{ft.time}</div>}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-[10px] font-bold rounded ${(c.status || '').toLowerCase() === 'issued' || (c.status || '').toLowerCase() === 'verified' ? 'bg-green-100 text-green-700' : (c.status || '').toLowerCase() === 'revoked' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {c.status || 'Issued'}
                              </span>
                            </td>
                            <td className="py-3 px-4"><div className="flex items-center space-x-1"><span className="text-xs font-mono">{c.verification_code || (c.certificate_id || '').slice(-8) || '------'}</span><div className="w-3 h-3 bg-slate-200 rounded-sm" /></div></td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center space-x-2 text-indigo-600">
                                <Eye className="w-4 h-4 cursor-pointer hover:text-indigo-800" onClick={() => setSelectedCertificate(c)} title="Preview Certificate" />
                                <Download className="w-4 h-4 cursor-pointer hover:text-indigo-800" onClick={() => alert('Download certificate: ' + (c.certificate_id || c._id))} title="Download PDF" />
                                <Mail className="w-4 h-4 cursor-pointer hover:text-indigo-800" onClick={() => alert('Send email to: ' + c.email)} title="Email Certificate" />
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
              <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-white">
                <div className="text-xs text-slate-500">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredRegistry.length || 0)} to {Math.min(currentPage * itemsPerPage, filteredRegistry.length)} of {filteredRegistry.length} certificates
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 text-xs">&lt;</button>
                  <span className="px-2.5 py-1 border border-indigo-600 bg-indigo-50 text-indigo-600 rounded text-xs font-medium">{currentPage}</span>
                  <span className="px-2 py-1 text-slate-400 text-xs">/</span>
                  <span className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 text-xs">{totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 text-xs">&gt;</button>
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="w-[300px] flex flex-col space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-indigo-600 mb-3">Certificate Preview</h3>
                {(() => {
                  const certToPreview = selectedCertificate || filteredRegistry[0];
                  if (!certToPreview) return <div className="text-sm text-slate-500 text-center py-8">No certificate selected</div>;
                  return (
                    <>
                      <div className="w-full h-40 bg-[#fdfaf5] border-2 border-[#d4af37] rounded flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-inner mb-4">
                        <div className="absolute top-0 left-0 w-0 h-0 border-t-[40px] border-t-black border-r-[40px] border-r-transparent" />
                        <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[40px] border-b-black border-l-[40px] border-l-transparent" />
                        <h4 className="text-[10px] font-serif uppercase tracking-widest text-slate-800">Certificate</h4>
                        <div className="text-[6px] text-slate-500 uppercase tracking-wider mb-2">Of Achievement</div>
                        <div className="w-full border-b border-slate-300 my-1" />
                        <div className="font-serif text-xl italic font-bold my-1 text-center truncate w-full px-2" title={certToPreview.recipient_name || certToPreview.student_name || 'Recipient Name'}>
                          {certToPreview.recipient_name || certToPreview.student_name || 'Recipient Name'}
                        </div>
                        <div className="w-full border-b border-slate-300 my-1 mb-2" />
                        <div className="text-[8px] font-semibold">{certToPreview.type || certToPreview.category || 'Achievement'}</div>
                        <div className="absolute bottom-2 right-2 flex flex-col items-center">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${certToPreview.verification_code || certToPreview.certificate_id || 'dummy'}`} alt="QR Code" className="w-6 h-6 mb-1" />
                        </div>
                        <div className="absolute bottom-2 mt-2 w-6 h-6 rounded-full bg-yellow-600 border border-yellow-400 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full border border-yellow-300" />
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <h4 className="text-xs font-semibold mb-2">Verification Preview</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between"><span className="text-slate-500">Certificate ID</span><span className="font-mono font-medium">{certToPreview.certificate_id || certToPreview._id?.slice(-8) || '---'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Verification Code</span><span className="font-mono font-medium">{certToPreview.verification_code || certToPreview.certificate_id?.slice(-8) || '---'}</span></div>
                          <div className="flex justify-between items-center"><span className="text-slate-500">Status</span><span className={`px-2 py-0.5 text-[10px] font-bold rounded ${(certToPreview.status || '').toLowerCase() === 'issued' || (certToPreview.status || '').toLowerCase() === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{certToPreview.status || 'Pending'}</span></div>
                        </div>
                      </div>
                      <button className="w-full mt-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex justify-center items-center" onClick={() => window.open(`/verify/${certToPreview.verification_code || certToPreview.certificate_id}`, '_blank')}>
                        View Verification Page <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Features */}
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
                <div><h4 className="text-sm font-semibold text-indigo-600 mb-1">{feature.title}</h4><p className="text-[10px] text-slate-500 leading-tight">{feature.desc}</p></div>
              </div>
            ))}
          </div>

          {/* Issue Certificates Modal */}
          {showIssueModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { if (!issuing) setShowIssueModal(false); }}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900">Issue Certificates</h3>
                  <button onClick={() => { if (!issuing) setShowIssueModal(false); }} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                    <XCircle className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  <p className="text-sm text-slate-600 mb-2">Select which certificates to issue for <strong>{selectedEvent?.title}</strong> - stage: <strong>{selectedStage?.name}</strong>:</p>
                  
                  {/* Option 1: Ranked Winners & Finalists */}
                  <button
                    onClick={() => handleIssueCertificates('ranked')}
                    disabled={issuing || !selectedEvent}
                    className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-indigo-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Winners, Runner-Ups & Finalists</div>
                        <div className="text-[10px] text-slate-500">Issue achievement awards to top 20 teams</div>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-indigo-400 -rotate-90" />
                  </button>

                  {/* Option 2: Qualified Participation */}
                  <button
                    onClick={() => handleIssueCertificates('participation')}
                    disabled={issuing || !selectedEvent}
                    className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-emerald-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Qualified Participation</div>
                        <div className="text-[10px] text-slate-500">Issue participation certs to ranked teams (21+)</div>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-emerald-400 -rotate-90" />
                  </button>

                  {/* Option 3: Non-Qualifiers */}
                  <button
                    onClick={() => handleIssueCertificates('non_qualifiers')}
                    disabled={issuing || !selectedEvent}
                    className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Non-Qualifier Participation</div>
                        <div className="text-[10px] text-slate-500">Issue participation certs to registered users with no submissions</div>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-amber-400 -rotate-90" />
                  </button>

                  {/* Option 4: Issue All */}
                  <button
                    onClick={() => handleIssueCertificates('all')}
                    disabled={issuing || !selectedEvent}
                    className="w-full flex items-center justify-between px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-white" />
                      <div>
                        <div className="text-xs font-bold text-white">Issue All Certificates</div>
                        <div className="text-[10px] text-indigo-100">Issue all ranked, qualified participation, and non-qualifiers</div>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-indigo-200 -rotate-90" />
                  </button>

                  {issuingProgress && (
                    <div className="flex items-center justify-center p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-600 gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>{issuingProgress}</span>
                    </div>
                  )}

                  {issueResult && (
                    <div className={`p-3 rounded-lg text-xs font-medium ${issueResult.includes('Successfully') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {issueResult}
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <button
                    onClick={() => { setShowIssueModal(false); setIssueResult(null); }}
                    disabled={issuing}
                    className="px-5 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Eligible Recipients Modal */}
          {showEligibleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowEligibleModal(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900">Eligible Recipients Preview</h3>
                  <button onClick={() => setShowEligibleModal(false)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                    <XCircle className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  {loadingEligible ? (
                    <div className="flex items-center justify-center py-16 flex-col gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      <span className="text-sm font-medium text-slate-500">Retrieving eligible recipients...</span>
                    </div>
                  ) : eligibleRecipientsData?.categories ? (
                    Object.entries(eligibleRecipientsData.categories).map(([key, category]: [string, any]) => (
                      <div key={key} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                            {typeIcon(key)}
                            {category.label}
                            <span className="text-xs font-normal text-slate-500">({category.rank_range})</span>
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                            {category.recipients?.length || 0} Eligible
                          </span>
                        </div>
                        
                        {category.recipients && category.recipients.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto border border-slate-100 bg-white rounded-lg">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                                  <th className="py-2 px-3">Name</th>
                                  {key !== 'non_qualifier_participation' && <th className="py-2 px-3">Team Name</th>}
                                  <th className="py-2 px-3 text-center">Rank</th>
                                  {key !== 'non_qualifier_participation' && <th className="py-2 px-3 text-right">Score</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {category.recipients.map((rec: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="py-2 px-3 font-medium text-slate-900">{rec.user_name || rec.student_name || 'Participant'}</td>
                                    {key !== 'non_qualifier_participation' && <td className="py-2 px-3">{rec.team_name || '-'}</td>}
                                    <td className="py-2 px-3 text-center">#{rec.rank || idx + 1}</td>
                                    {key !== 'non_qualifier_participation' && <td className="py-2 px-3 text-right font-medium">{rec.score}</td>}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No recipients qualified under this category</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-medium">No eligible recipients list returned</p>
                    </div>
                  )}
                </div>
                
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                  <button
                    onClick={() => setShowEligibleModal(false)}
                    className="px-5 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => { setShowEligibleModal(false); setShowIssueModal(true); }}
                    disabled={!selectedEvent || loadingEligible}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Issue Certificates
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CertificatesPage;
