import React, { useState, useEffect } from 'react';
import {
  Search, Filter, ChevronDown, CheckCircle, Clock, XCircle,
  Trophy, Medal, Award, Users, FileText, Download, Eye, Mail, MoreVertical, ExternalLink, Loader2, AlertCircle,
  Plus, Trash2, Edit3, X, Save
} from 'lucide-react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';
import CertificateTemplateBuilder from './components/CertificateTemplateBuilder';
import ParticipantCardCustomizer from './components/ParticipantCardCustomizer';
import { pdf } from '@react-pdf/renderer';
import { CertificatePDF } from '../../components/pdf/CertificatePDF';

interface EventStage { id: string; name: string }
interface EventItem { _id: string; title: string; stages?: EventStage[] }
interface CertStats { total: number; achievement: number; participation: number; verified_today: number; pending: number; revoked: number }
interface EligibilityPreview { winner_teams: { count: number; recipients: number }; runner_up_teams: { count: number; recipients: number }; finalist_teams: { count: number; recipients: number }; participation_eligible: { count: number }; non_qualifier_participants?: { count: number } }
interface CertificateRecord {
  _id: string; certificate_id?: string; recipient_name?: string; student_name?: string; participant_name?: string;
  team_name?: string; event_title?: string; stage_name?: string; type?: string; category?: string; achievement_type?: string; achievement_key?: string;
  issued_on?: string; issue_date?: string; issued_date?: string; status?: string; verification_code?: string; email?: string;
  rank?: number; score?: number;
  user_id?: string; participant_id?: string;
}

const parseDate = (d?: string) => {
  if (!d) return undefined;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt;
};

const formatDate = (d?: string) => {
  if (!d) return { date: '-', time: '' };
  const dt = parseDate(d);
  if (!dt) return { date: d, time: '' };
  return {
    date: dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
};

const formatRuleConfig = (rule: any): string => {
  const cfg = rule.rule_configuration || rule.rule_config || {};
  switch (rule.rule_type) {
    case 'top_n': return `Top ${cfg.top_n ?? '?'}`;
    case 'rank_range': return `Rank ${cfg.rank_start ?? '?'} - ${cfg.rank_end ?? '?'}`;
    case 'rank': return `Rank ${cfg.rank ?? '?'}`;
    case 'score_threshold': return `Score ≥ ${cfg.minimum_score ?? '?'}`;
    case 'submission_completed': return cfg.required_stage ? `Submit "${cfg.required_stage}"` : 'Submitted';
    case 'stage_completed': return cfg.stage_id ? `Stage "${cfg.stage_id}" done` : 'Stage completed';
    case 'registration_completed': return 'All registered participants';
    case 'attendance_completed': return 'Attended';
    default: return rule.rule_description || '-';
  }
};

const certTypeMeta: Record<string, { icon: React.ReactNode; label: string }> = {
  winner: { icon: <Trophy className="w-4 h-4 text-yellow-500" />, label: 'Winner' },
  runner_up: { icon: <Medal className="w-4 h-4 text-gray-400" />, label: 'Runner Up' },
  finalist: { icon: <Award className="w-4 h-4 text-orange-500" />, label: 'Finalist' },
  participation: { icon: <CheckCircle className="w-4 h-4 text-blue-500" />, label: 'Participation' },
  non_qualifier: { icon: <AlertCircle className="w-4 h-4 text-amber-500" />, label: 'Non-Qualifier' },
  non_qualifier_participation: { icon: <CheckCircle className="w-4 h-4 text-blue-500" />, label: 'Participation' },
};

const typeIcon = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'winner': return <Trophy className="w-4 h-4 text-yellow-500 mr-2" />;
    case 'runner up': case 'runner_up': case 'runner-up': return <Medal className="w-4 h-4 text-gray-400 mr-2" />;
    case 'finalist': return <Award className="w-4 h-4 text-orange-500 mr-2" />;
    case 'participation': case 'non_qualifier_participation': return <CheckCircle className="w-4 h-4 text-blue-500 mr-2" />;
    default: return <Users className="w-4 h-4 text-indigo-500 mr-2" />;
  }
};

const CertificatesPage: React.FC<{ institutionId: string; onNavigate?: (tab: string) => void }> = ({ institutionId, onNavigate }) => {

  
  const handleDownloadPdf = async (cert: any) => {
    try {
      const doc = <CertificatePDF data={{
          studentName: cert.student_name || cert.recipient_name || 'Participant',
          eventName: cert.event_title || 'Hackathon',
          category: cert.category || cert.type || 'Participation',
          issueDate: cert.issue_date || cert.issued_on || new Date().toISOString(),
          certificateId: cert.certificate_id || cert._id
      }} />;
      const asPdf = pdf([]);
      asPdf.updateContainer(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${cert.certificate_id || 'SL'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedStage, setSelectedStage] = useState<EventStage | null>(null);
  const [stats, setStats] = useState<CertStats | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityPreview | null>(null);
  const [registry, setRegistry] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showVerifyCertificates, setShowVerifyCertificates] = useState(false);
  const [showCardCustomizer, setShowCardCustomizer] = useState(false);
  const [showRulesManager, setShowRulesManager] = useState(false);
  const [issueResult, setIssueResult] = useState<string | null>(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('All Certificates');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [fetchedRules, setFetchedRules] = useState<any[]>([]);
  const [eligibleRecipientsList, setEligibleRecipientsList] = useState<any>(null);

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
        `${API_BASE_URL}/api/v1/institution/certificates/eligible-recipients`,
        {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: selectedEvent._id,
            stage_id: selectedStage.id,
            min_score: 0,
          })
        }
      );
      if (res.ok) {
        const data = await res.json();
        // Transform backend data to frontend expected format
        const transformedData = {
          categories: data.categories, // Keep full categories
          winner_teams: {
            count: data.categories?.winner?.recipients?.length || 0,
            recipients: data.categories?.winner?.recipients?.length || 0,
          },
          runner_up_teams: {
            count: data.categories?.runner_up?.recipients?.length || 0,
            recipients: data.categories?.runner_up?.recipients?.length || 0,
          },
          finalist_teams: {
            count: data.categories?.finalist?.recipients?.length || 0,
            recipients: data.categories?.finalist?.recipients?.length || 0,
          },
          participation_eligible: {
            count: data.categories?.participation?.recipients?.length || 0,
          },
          non_qualifier_participants: {
            count: data.categories?.non_qualifier_participation?.recipients?.length || 0,
          },
        };
        setEligibleRecipientsData(transformedData);
      } else {
        const errorData = await res.json();
        console.error('Error fetching eligible recipients:', errorData);
        setEligibleRecipientsData({
          winner_teams: { count: 0, recipients: 0 },
          runner_up_teams: { count: 0, recipients: 0 },
          finalist_teams: { count: 0, recipients: 0 },
          participation_eligible: { count: 0 },
          non_qualifier_participants: { count: 0 },
          error: errorData.detail || 'Failed to fetch eligible recipients'
        });
      }
    } catch (e) {
      console.error('Error fetching eligible recipients:', e);
      setEligibleRecipientsData({
        winner_teams: { count: 0, recipients: 0 },
        runner_up_teams: { count: 0, recipients: 0 },
        finalist_teams: { count: 0, recipients: 0 },
        participation_eligible: { count: 0 },
        non_qualifier_participants: { count: 0 },
        error: e instanceof Error ? e.message : 'Failed to fetch eligible recipients'
      });
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
        `${API_BASE_URL}/api/v1/institution/certificates/eligible-recipients`,
        {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: selectedEvent._id,
            stage_id: selectedStage.id,
            min_score: 0,
          })
        }
      );
      
      if (!eligibleRes.ok) {
        let errMsg = "Failed to retrieve eligible recipients from leaderboard.";
        try {
          const errBody = await eligibleRes.json();
          if (errBody.detail) errMsg = errBody.detail;
        } catch {}
        throw new Error(errMsg);
      }
      
      const eligibleData = await eligibleRes.json();
      const categories = eligibleData.categories || {};
      
      let issuedCount = 0;
      
      // Helper function to issue a specific category
      const issueCategory = async (catKey: string, achievementType: string) => {
        const cat = categories[catKey];
        if (!cat || !cat.recipients || cat.recipients.length === 0) return 0;
        
        // Map recipients to their respective IDs
        const recipientIds = cat.recipients.map((r: any) => r.submission_id || r.user_id || r.participant_id).filter(Boolean);
        if (recipientIds.length === 0) return 0;
        
        setIssuingProgress(`Issuing ${cat.label} certificates (${recipientIds.length})...`);
        
        const params = new URLSearchParams();
        params.append("event_id", selectedEvent._id);
        params.append("achievement_type", achievementType);
        params.append("send_email", "true");
        if (selectedTemplateId) params.append("template_id", selectedTemplateId); // <-- PASSED TEMPLATE ID
        
        const issueRes = await fetch(
          `${API_BASE_URL}/api/v1/institution/certificates/issue?${params.toString()}`,
          {
            method: 'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_ids: recipientIds })
          }
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

  // Template Builder Functions
  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/institution/certificates/templates`, { headers: authHeaders() });
      if (res.ok) {
        const templatesData = await res.json();
        setTemplates(templatesData);
        if (templatesData.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(templatesData[0].id || templatesData[0].template_id);
        }
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
    }
  };

  const selectTemplate = (template: any) => {
    setSelectedTemplate(template);
  };

  const updateTemplate = (updatedTemplate: any) => {
    setTemplates(templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
    setSelectedTemplate(updatedTemplate);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const method = selectedTemplate.id ? 'PUT' : 'POST';
      const url = selectedTemplate.id 
        ? `${API_BASE_URL}/api/v1/certificates/templates/${selectedTemplate.id}`
        : `${API_BASE_URL}/api/v1/certificates/templates`;
      
      const res = await fetch(url, {
        method,
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedTemplate)
      });
      
      if (res.ok) {
        const savedTemplate = await res.json();
        setTemplates(templates.map(t => t.id === savedTemplate.id ? savedTemplate : t));
        setSelectedTemplate(savedTemplate);
        setIssueResult('Template saved successfully!');
      } else {
        const error = await res.json();
        setIssueResult(`Error saving template: ${error.detail || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Error saving template:', e);
      setIssueResult('Error saving template');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/certificates/templates/${templateId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== templateId));
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
        setIssueResult('Template deleted successfully!');
      }
    } catch (e) {
      console.error('Error deleting template:', e);
      setIssueResult('Error deleting template');
    }
  };

  // Fetch templates when event/stage changes
  useEffect(() => {
    if (selectedEvent && selectedStage) {
      fetchTemplates();
    }
  }, [selectedEvent, selectedStage]);

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
        const [statsRes, regRes, rulesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/institution/certificates/stats?institution_id=${institutionId}&event_id=${selectedEvent._id}${selectedStage ? `&stage_id=${selectedStage.id}` : ''}`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/api/v1/institution/certificates/registry?institution_id=${institutionId}&event_id=${selectedEvent._id}${selectedStage ? `&stage_id=${selectedStage.id}` : ''}`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/api/v1/certificates/rules/?event_id=${selectedEvent._id}`, { headers: authHeaders() }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (regRes.ok) setRegistry(await regRes.json());
        if (rulesRes.ok) { const data = await rulesRes.json(); setFetchedRules(Array.isArray(data) ? data : []); }

        if (selectedStage) {
          const [previewRes, eligibleRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/v1/institution/certificates/preview?event_id=${selectedEvent._id}&stage_id=${selectedStage.id}`, {
              method: 'POST', headers: authHeaders(),
            }),
            fetch(`${API_BASE_URL}/api/v1/institution/certificates/eligible-recipients`, {
              method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
              body: JSON.stringify({ event_id: selectedEvent._id, stage_id: selectedStage.id, min_score: 0 }),
            }),
          ]);
          if (previewRes.ok) setEligibility(await previewRes.json());
          if (eligibleRes.ok) setEligibleRecipientsList(await eligibleRes.json());
          else setEligibleRecipientsList(null);
        }
      } catch (e) { console.error('Error:', e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [selectedEvent, selectedStage, institutionId]);

  const registryWithEligible = (() => {
    if (!eligibleRecipientsList?.categories) return registry;
    const issuedMap = new Map<string, boolean>();
    registry.forEach(c => { const uid = c.user_id || c.participant_id || ''; if (uid) issuedMap.set(uid, true); });
    const pending: any[] = [];
    for (const [catKey_, cat] of Object.entries<any>(eligibleRecipientsList.categories)) {
      const catKey = catKey_ === 'non_qualifier_participation' ? 'participation' : catKey_;
      for (const rec of cat.recipients || []) {
        const uid = rec.user_id || '';
        if (uid && !issuedMap.has(uid)) {
          pending.push({
            _id: `pending_${uid}`,
            user_id: uid,
            participant_id: uid,
            recipient_name: rec.user_name || 'Participant',
            team_name: rec.team_name || '',
            type: catKey,
            category: catKey,
            achievement_key: catKey,
            status: 'Pending',
            rank: rec.rank,
            score: rec.score,
          });
        }
      }
    }
    return pending.length > 0 ? [...registry, ...pending] : registry;
  })();

  const filteredRegistry = registryWithEligible.filter((c) => {
    const aKey = (c.achievement_key || c.type || c.category || '').toLowerCase();
    const tabMatch = activeTab === 'All Certificates' ||
      (activeTab === 'Achievement' && aKey !== 'participation' && aKey !== '') ||
      (activeTab === 'Participation' && aKey === 'participation') ||
      (activeTab === 'Issued' && (c.status || '').toLowerCase() === 'issued') ||
      (activeTab === 'Pending' && (c.status || '').toLowerCase() === 'pending') ||
      (activeTab === 'Revoked' && (c.status || '').toLowerCase() === 'revoked');
    const typeMatch = !filterType || aKey === filterType.toLowerCase();
    const statusMatch = !filterStatus || (c.status || '').toLowerCase() === filterStatus.toLowerCase();
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      (c.certificate_id || '').toLowerCase().includes(q) ||
      (c.recipient_name || c.participant_name || c.student_name || '').toLowerCase().includes(q) ||
      (c.team_name || '').toLowerCase().includes(q);
    return tabMatch && typeMatch && statusMatch && matchesSearch;
  });

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRegistry.length / itemsPerPage));
  const currentRegistry = filteredRegistry.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, filterType, filterStatus, selectedEvent, selectedStage]);

  const rules = fetchedRules.length > 0
    ? fetchedRules.map(rule => {
        const meta = certTypeMeta[rule.certificate_type];
        return {
          icon: meta?.icon || <FileText className="w-4 h-4 text-slate-400" />,
          label: meta?.label || rule.certificate_type,
          value: formatRuleConfig(rule),
        };
      })
    : [
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
          <button
            onClick={() => setShowTemplateBuilder(true)}
            className="flex items-center px-4 py-2 border border-indigo-600 text-indigo-600 bg-white rounded-md hover:bg-indigo-50 font-medium text-sm"
          ><FileText className="w-4 h-4 mr-2" /> Template Builder</button>
          <button
            onClick={() => setShowVerifyCertificates(true)}
            className="flex items-center px-4 py-2 border border-indigo-600 text-indigo-600 bg-white rounded-md hover:bg-indigo-50 font-medium text-sm"
          ><CheckCircle className="w-4 h-4 mr-2" /> Verify Certificates</button>
          <button
            onClick={() => setShowIssueModal(true)}
            disabled={!selectedEvent || issuing}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium text-sm disabled:opacity-50"
          >
            {issuing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Award className="w-4 h-4 mr-2" />}
            {issuing ? 'Issuing...' : 'Issue Certificates'}
          </button>
          <button
            onClick={() => setShowCardCustomizer(true)}
            disabled={!selectedEvent}
            className="flex items-center px-4 py-2 border border-emerald-600 text-emerald-600 bg-white rounded-md hover:bg-emerald-50 font-medium text-sm disabled:opacity-50"
          >
            <Eye className="w-4 h-4 mr-2" /> Card Customizer
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
            <select className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}>
              <option>All Certificates</option>
              <option>Achievement</option>
              <option>Participation</option>
              <option>Issued</option>
              <option>Pending</option>
              <option>Revoked</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Certificate Type</label>
          <div className="relative">
            <select className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="winner">Winner</option>
              <option value="runner_up">Runner Up</option>
              <option value="finalist">Finalist</option>
              <option value="participation">Participation</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Status</label>
          <div className="relative">
            <select className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="Issued">Issued</option>
              <option value="Pending">Pending</option>
              <option value="Revoked">Revoked</option>
              <option value="Verified">Verified</option>
            </select>
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
      ) : showRulesManager ? (
        <CertificateRulesManager institutionId={institutionId} onClose={() => setShowRulesManager(false)} />
      ) : showCardCustomizer ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Participant Card Customizer</h2>
            <button onClick={() => setShowCardCustomizer(false)} className="flex items-center px-3 py-1.5 text-sm text-slate-500 hover:text-indigo-600 border border-slate-200 rounded-lg">
              <XCircle className="w-4 h-4 mr-1.5" /> Back
            </button>
          </div>
          {selectedEvent && (
            <ParticipantCardCustomizer eventId={selectedEvent._id} institutionId={institutionId} />
          )}
        </div>
      ) : showTemplateBuilder ? (
        <div className="fixed inset-0 z-50 bg-white p-8 overflow-y-auto">
          <button onClick={() => setShowTemplateBuilder(false)} className="mb-4 flex items-center text-sm text-slate-500 hover:text-indigo-600"><XCircle className="w-4 h-4 mr-2" /> Back to Dashboard</button>
          <CertificateTemplateBuilder institutionId={institutionId} />
        </div>
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
              <button onClick={() => onNavigate?.('analytics')} className="w-full py-2.5 border border-slate-200 text-indigo-600 bg-slate-50 rounded-lg text-sm font-medium hover:bg-slate-100">View All Statistics →</button>
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
              <button onClick={() => setShowRulesManager(true)} className="w-full py-2.5 mt-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Manage Rules</button>
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
                <button onClick={() => alert('Exporting certificates as PDF...')} className="flex items-center text-xs font-medium text-indigo-600 px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 mr-2">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export as PDF
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">#</th>
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
                      <tr><td colSpan={9} className="py-16 text-center text-slate-400 text-sm font-medium">{eligibleRecipientsList?.categories ? 'All eligible recipients have been issued certificates' : 'No certificates found'}</td></tr>
                    ) : (
                      currentRegistry.map((c) => {
                        const ft = formatDate(c.issued_on || c.issued_date || c.issue_date);
                        const name = c.recipient_name || c.participant_name || c.student_name || '-';
                        const certType = (c.type || c.achievement_type || c.category || 'Participation').replace('non_qualifier_participation', 'Participation');
                        const email = c.email || '';
                        const isPending = (c.status || '').toLowerCase() === 'pending';
                        return (
                          <tr key={c._id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-xs text-center font-mono text-slate-600">{c.rank ? `#${c.rank}` : '-'}</td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-800">{c.certificate_id || (isPending ? '---' : c._id.slice(-8))}</td>
                            <td className="py-3 px-4"><div className="text-xs font-semibold">{name}</div>{email && <div className="text-[10px] text-slate-500">{email}</div>}</td>
                            <td className="py-3 px-4 text-xs">{c.team_name || '-'}</td>
                            <td className="py-3 px-4 text-xs">{typeIcon(certType)}{certType}</td>
                            <td className="py-3 px-4 text-xs">{isPending ? <span className="text-slate-400">---</span> : <><div>{ft.date}</div>{ft.time && <div className="text-[10px] text-slate-500">{ft.time}</div>}</>}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-[10px] font-bold rounded ${isPending ? 'bg-amber-100 text-amber-700' : (c.status || '').toLowerCase() === 'issued' || (c.status || '').toLowerCase() === 'verified' ? 'bg-green-100 text-green-700' : (c.status || '').toLowerCase() === 'revoked' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {c.status || 'Pending'}
                              </span>
                            </td>
                            <td className="py-3 px-4"><div className="flex items-center space-x-1">{isPending ? <span className="text-xs text-slate-400">---</span> : <><span className="text-xs font-mono">{c.verification_code || (c.certificate_id || '').slice(-8) || '------'}</span><div className="w-3 h-3 bg-slate-200 rounded-sm" /></>}</div></td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center space-x-2 text-indigo-600">
                                <Eye className="w-4 h-4 cursor-pointer hover:text-indigo-800" onClick={() => setSelectedCertificate(c)} aria-label="Preview Certificate" />
                                {!isPending && <><Download className="w-4 h-4 cursor-pointer hover:text-indigo-800" onClick={() => handleDownloadPdf(c)} aria-label="Download PDF" />
                                <Mail className="w-4 h-4 cursor-pointer hover:text-indigo-800" onClick={() => alert('Send email to: ' + c.email)} aria-label="Email Certificate" /></>}
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

                  const previewTemplate = templates.find((t: any) => (t.id || t.template_id) === selectedTemplateId);

                  const fillTemplate = (html: string) =>
                    html
                      .replace(/\{student_name\}/g, certToPreview.recipient_name || certToPreview.participant_name || certToPreview.student_name || 'Recipient')
                      .replace(/\{course_title\}/g, selectedEvent?.title || certToPreview.team_name || 'the event')
                      .replace(/\{achievement_label\}/g, (certToPreview.type || certToPreview.achievement_type || certToPreview.category || 'Achievement').replace('non_qualifier_participation', 'Participation'))
                      .replace(/\{rank\}/g, certToPreview.rank ? `#${certToPreview.rank}` : '')
                      .replace(/\{cert_type\}/g, certToPreview.type || certToPreview.achievement_type || '');

                  const renderTemplatePreview = () => {
                    if (!previewTemplate?.html_content) return null;
                    const filled = fillTemplate(previewTemplate.html_content);
                    return (
                      <div className="w-full overflow-hidden rounded-lg border border-slate-200 mb-4" style={{ height: 200 }}>
                        <div style={{ transform: 'scale(0.27)', transformOrigin: 'top left', width: '370%' }}>
                          <div dangerouslySetInnerHTML={{ __html: filled }} />
                        </div>
                      </div>
                    );
                  };

                  const rendered = renderTemplatePreview();

                  return (
                    <>
                      {templates.length > 1 && (
                        <div className="mb-3">
                          <select
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-600"
                            value={selectedTemplateId}
                            onChange={e => setSelectedTemplateId(e.target.value)}
                          >
                            {Array.from(new Map(templates.map((t: any) => [t.id || t.template_id, t])).values()).map((t: any) => (
                              <option key={t.id || t.template_id} value={t.id || t.template_id}>{t.name || 'Untitled'}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {rendered ? rendered : (
                        <div className="w-full h-40 bg-[#fdfaf5] border-2 border-[#d4af37] rounded flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-inner mb-4">
                          <div className="absolute top-0 left-0 w-0 h-0 border-t-[40px] border-t-black border-r-[40px] border-r-transparent" />
                          <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[40px] border-b-black border-l-[40px] border-l-transparent" />
                          <h4 className="text-[10px] font-serif uppercase tracking-widest text-slate-800">Certificate</h4>
                          <div className="text-[6px] text-slate-500 uppercase tracking-wider mb-2">Of Achievement</div>
                          <div className="w-full border-b border-slate-300 my-1" />
                          <div className="font-serif text-xl italic font-bold my-1 text-center truncate w-full px-2" title={certToPreview.recipient_name || certToPreview.participant_name || certToPreview.student_name || 'Recipient Name'}>
                            {certToPreview.recipient_name || certToPreview.participant_name || certToPreview.student_name || 'Recipient Name'}
                          </div>
                          <div className="w-full border-b border-slate-300 my-1 mb-2" />
                          <div className="text-[8px] font-semibold">{(certToPreview.type || certToPreview.achievement_type || certToPreview.category || 'Achievement').replace('non_qualifier_participation', 'Participation')}</div>
                          <div className="absolute bottom-2 right-2 flex flex-col items-center">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${certToPreview.verification_code || certToPreview.certificate_id || 'dummy'}`} alt="QR Code" className="w-6 h-6 mb-1" />
                          </div>
                          <div className="absolute bottom-2 mt-2 w-6 h-6 rounded-full bg-yellow-600 border border-yellow-400 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full border border-yellow-300" />
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <h4 className="text-xs font-semibold mb-2">Verification Preview</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between"><span className="text-slate-500">Certificate ID</span><span className="font-mono font-medium">{certToPreview.certificate_id || '---'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Verification Code</span><span className="font-mono font-medium">{certToPreview.verification_code || '---'}</span></div>
                          <div className="flex justify-between items-center"><span className="text-slate-500">Status</span><span className={`px-2 py-0.5 text-[10px] font-bold rounded ${(certToPreview.status || '').toLowerCase() === 'issued' || (certToPreview.status || '').toLowerCase() === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{certToPreview.status || 'Issued'}</span></div>
                        </div>
                      </div>
                      {certToPreview.certificate_id && certToPreview.certificate_id !== '---' ? (
                        <button className="w-full mt-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex justify-center items-center" onClick={() => window.open(`/#/verify/${certToPreview.verification_code || certToPreview.certificate_id}`, '_blank')}>
                          View Verification Page <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                        </button>
                      ) : (
                        <div className="w-full mt-3 py-2 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium text-center">Certificate not issued yet</div>
                      )}
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
                  
                  {/* Template Selector */}
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-slate-500 mb-1">Select Certificate Template</label>
                    <select
                      className="w-full appearance-none bg-white border border-slate-200 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                    >
                      <option value="">Default Template</option>
                      {Array.from(new Map(templates.map((t: any) => [t.id || t.template_id, t])).values()).map((t: any) => (
                        <option key={t.id || t.template_id} value={t.id || t.template_id}>
                          {t.name || 'Untitled Template'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
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
                                    <td className="py-2 px-3 text-center">{rec.rank && rec.rank !== 999 ? `#${rec.rank}` : '-'}</td>
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

const CertificateRulesManager: React.FC<{ institutionId: string; onClose: () => void }> = ({ institutionId, onClose }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    rule_name: string; rule_description: string; certificate_type: string;
    rule_type: string; rule_config: Record<string, any>; status: string;
  }>({
    rule_name: '',
    rule_description: '',
    certificate_type: 'winner',
    rule_type: 'top_n',
    rule_config: { top_n: 1 },
    status: 'active',
  });
  const [ruleIdCounter, setRuleIdCounter] = useState(1);

  useEffect(() => { fetchEvents(); }, []);
  useEffect(() => { if (selectedEventId) fetchRules(); }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/institution/events/${institutionId}`, { headers: { ...authHeaders() } });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.events || data?.data || [];
        setEvents(list);
        if (list.length > 0 && !selectedEventId) setSelectedEventId(list[0]._id || list[0].event_id);
      }
    } catch { } finally { setLoading(false); }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/certificates/rules/?event_id=${selectedEventId}`, { headers: { ...authHeaders() } });
      if (res.ok) { const data = await res.json(); setRules(Array.isArray(data) ? data : []); }
      else setRules([]);
    } catch { setRules([]); }
  };

  const certificateTypes = [
    { value: 'winner', label: 'Winner', icon: <Trophy className="w-4 h-4 text-yellow-500" />, defaultCriteria: 'Top 1 Team', defaultRuleType: 'top_n', defaultConfig: { top_n: 1 } },
    { value: 'runner_up', label: 'Runner Up', icon: <Medal className="w-4 h-4 text-gray-400" />, defaultCriteria: 'Rank 2 - 3', defaultRuleType: 'rank_range', defaultConfig: { rank_start: 2, rank_end: 3 } },
    { value: 'finalist', label: 'Finalist', icon: <Award className="w-4 h-4 text-orange-500" />, defaultCriteria: 'Rank 4 - 20', defaultRuleType: 'rank_range', defaultConfig: { rank_start: 4, rank_end: 20 } },
    { value: 'participation', label: 'Participation', icon: <CheckCircle className="w-4 h-4 text-blue-500" />, defaultCriteria: 'All registered participants', defaultRuleType: 'registration_completed', defaultConfig: {} },
    { value: 'non_qualifier', label: 'Non-Qualifier', icon: <AlertCircle className="w-4 h-4 text-slate-500" />, defaultCriteria: 'Registered, no qualifying score', defaultRuleType: 'submission_completed', defaultConfig: { required_stage: 'final' } },
  ];

  const statusColors: Record<string, string> = { draft: 'bg-slate-100 text-slate-600', active: 'bg-emerald-100 text-emerald-700', archived: 'bg-amber-100 text-amber-700' };

  const getDefaultConfig = (ruleType: string): any => {
    switch (ruleType) {
      case 'top_n': return { top_n: 1 };
      case 'rank_range': return { rank_start: 1, rank_end: 10 };
      case 'rank': return { rank: 1 };
      case 'score_threshold': return { minimum_score: 0 };
      case 'submission_completed': return { required_stage: '' };
      case 'stage_completed': return { stage_id: '' };
      default: return {};
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setFormData({ rule_name: '', rule_description: '', certificate_type: 'winner', rule_type: 'top_n', rule_config: { top_n: 1 }, status: 'active' });
    setShowForm(true);
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    const ct = certificateTypes.find(t => t.value === rule.certificate_type);
    const ruleConfig = rule.rule_configuration || ct?.defaultConfig || {};
    setFormData({
      rule_name: rule.rule_name || '',
      rule_description: rule.rule_description || '',
      certificate_type: rule.certificate_type || 'winner',
      rule_type: rule.rule_type || ct?.defaultRuleType || 'custom',
      rule_config: ruleConfig,
      status: rule.status || 'active',
    });
    setShowForm(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Delete this rule?')) return;
    try { const res = await fetch(`${API_BASE_URL}/api/v1/certificates/rules/${ruleId}`, { method: 'DELETE', headers: { ...authHeaders() } }); if (res.ok) fetchRules(); }
    catch { }
  };

  const handleSaveRule = async () => {
    setSaving(true);
    try {
      const ct = certificateTypes.find(t => t.value === formData.certificate_type) || certificateTypes[0];
      const ruleId = editingRule?.rule_id || `rule_${Date.now()}_${ruleIdCounter}`;
      if (!editingRule) setRuleIdCounter(c => c + 1);
      const payload = {
        rule_id: ruleId,
        rule_name: formData.rule_name || ct.label,
        rule_description: formData.rule_description || '',
        rule_category: ['winner', 'runner_up', 'finalist'].includes(formData.certificate_type) ? 'achievement' : 'participation',
        rule_type: formData.rule_type,
        event_id: selectedEventId,
        certificate_type: formData.certificate_type,
        template_id: `default_${formData.certificate_type}`,
        template_version: 1,
        status: formData.status,
        priority: 0,
        rule_configuration: typeof formData.rule_config === 'object' ? formData.rule_config : {},
        snapshot_required: false,
        created_by: '',
        updated_by: '',
      };
      const url = editingRule ? `${API_BASE_URL}/api/v1/certificates/rules/${ruleId}` : `${API_BASE_URL}/api/v1/certificates/rules/`;
      const res = await fetch(url, { method: editingRule ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(payload) });
      if (res.ok) { setShowForm(false); setEditingRule(null); fetchRules(); }
      else { const err = await res.json(); alert(err.detail || 'Failed to save rule'); }
    } catch { alert('Failed to save rule'); } finally { setSaving(false); }
  };

  const selectedEvent = events.find((e: any) => (e._id || e.event_id) === selectedEventId);

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Certificate Rules Management</h2>
            <p className="text-sm text-slate-400 font-medium">Manage eligibility rules for all events.</p>
          </div>
          <button onClick={onClose} className="flex items-center px-4 py-2 text-sm text-slate-500 hover:text-indigo-600 border border-slate-200 rounded-xl">
            <XCircle className="w-4 h-4 mr-1.5" /> Back to Certificates
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Event</label>
            <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none min-w-[240px]">
              {events.length === 0 && <option value="">No events available</option>}
              {events.map((ev: any) => (
                <option key={ev._id || ev.event_id} value={ev._id || ev.event_id}>{ev.title || ev.name || ev.event_name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleAddRule} className="flex items-center gap-2 px-6 py-3 bg-[#6C3BFF] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#5A2EE5] transition-all shadow-lg shadow-purple-100">
            <Plus size={16} /> Add Rule
          </button>
        </div>

        {selectedEvent && events.length > 0 && (
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-6">
            <div className="flex items-center gap-3">
              <Award className="text-indigo-500" size={20} />
              <span className="font-bold text-sm text-indigo-700">Rules for: {selectedEvent.title || selectedEvent.name || selectedEvent.event_name}</span>
              <span className="text-xs text-indigo-400 ml-auto">{rules.length} rule{rules.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">{editingRule ? 'Edit Rule' : 'New Rule'}</h3>
              <button onClick={() => { setShowForm(false); setEditingRule(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rule Name</label>
                <input type="text" value={formData.rule_name} onChange={(e) => setFormData(f => ({ ...f, rule_name: e.target.value }))}
                  placeholder="e.g., Winner" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificate Type</label>
                <select value={formData.certificate_type} onChange={(e) => {
                  const ct = certificateTypes.find(t => t.value === e.target.value);
                  setFormData(f => ({
                    ...f,
                    certificate_type: e.target.value,
                    rule_type: ct?.defaultRuleType || 'custom',
                    rule_config: ct?.defaultConfig || getDefaultConfig(ct?.defaultRuleType || 'custom'),
                  }));
                }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none">
                  {certificateTypes.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rule Logic</label>
                <select value={formData.rule_type} onChange={(e) => {
                  const newType = e.target.value;
                  setFormData(f => ({
                    ...f,
                    rule_type: newType,
                    rule_config: ['top_n', 'rank_range', 'rank', 'score_threshold', 'submission_completed', 'stage_completed'].includes(newType)
                      ? { ...getDefaultConfig(newType) } : {},
                  }));
                }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none">
                  <option value="top_n">Top N</option>
                  <option value="rank_range">Rank Range</option>
                  <option value="rank">Exact Rank</option>
                  <option value="score_threshold">Score Threshold</option>
                  <option value="submission_completed">Submission Completed</option>
                  <option value="stage_completed">Stage Completed</option>
                  <option value="registration_completed">Registration Completed</option>
                  <option value="attendance_completed">Attendance Completed</option>
                  <option value="custom">Custom (JSON)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                <select value={formData.status} onChange={(e) => setFormData(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none">
                  <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
                </select>
              </div>
            </div>
            {formData.rule_type === 'top_n' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Number of Top Positions</label>
                <input type="number" min={1} defaultValue={formData.rule_config.top_n ?? 1} key={editingRule?.rule_id || 'new-topn'}
                  onBlur={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setFormData(f => ({ ...f, rule_config: { ...f.rule_config, top_n: v } })); }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
              </div>
            )}
            {formData.rule_type === 'rank_range' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rank Start</label>
                  <input type="number" min={1} value={formData.rule_config.rank_start ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, rank_start: parseInt(e.target.value) || 1 } }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rank End</label>
                  <input type="number" min={1} value={formData.rule_config.rank_end ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, rank_end: parseInt(e.target.value) || 1 } }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
                </div>
              </div>
            )}
            {formData.rule_type === 'rank' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exact Rank</label>
                <input type="number" min={1} value={formData.rule_config.rank ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, rank: parseInt(e.target.value) || 1 } }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
              </div>
            )}
            {formData.rule_type === 'score_threshold' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Minimum Score</label>
                <input type="number" min={0} value={formData.rule_config.minimum_score ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, minimum_score: parseInt(e.target.value) || 0 } }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
              </div>
            )}
            {formData.rule_type === 'submission_completed' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Required Stage</label>
                <input type="text" value={formData.rule_config.required_stage ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, required_stage: e.target.value } }))}
                  placeholder="e.g., final" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
              </div>
            )}
            {formData.rule_type === 'stage_completed' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage ID</label>
                <input type="text" value={formData.rule_config.stage_id ?? ''} onChange={(e) => setFormData(f => ({ ...f, rule_config: { ...f.rule_config, stage_id: e.target.value } }))}
                  placeholder="Stage identifier" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
              </div>
            )}
            {formData.rule_type === 'custom' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configuration (JSON)</label>
                <textarea value={typeof formData.rule_config === 'object' ? JSON.stringify(formData.rule_config, null, 2) : formData.rule_config}
                  onChange={(e) => {
                    const val = e.target.value;
                    try { setFormData(f => ({ ...f, rule_config: JSON.parse(val) })); }
                    catch { setFormData(f => ({ ...f, rule_config: val as any })); }
                  }}
                  rows={4} placeholder='{"key": "value"}' className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-mono focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description (optional)</label>
              <textarea value={formData.rule_description} onChange={(e) => setFormData(f => ({ ...f, rule_description: e.target.value }))} rows={2}
                placeholder="Internal notes about this rule..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-[#6C3BFF] outline-none" />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => { setShowForm(false); setEditingRule(null); }}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleSaveRule} disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-[#6C3BFF] text-white text-sm font-semibold rounded-xl hover:bg-[#5A2EE5] transition-all shadow-lg shadow-purple-100 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#6C3BFF]" size={32} /></div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Award size={48} className="mb-4 opacity-30" />
              <p className="font-bold text-sm">No events found</p>
              <p className="text-xs mt-1">Create an event first to manage certificate rules.</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Award size={48} className="mb-4 opacity-30" />
              <p className="font-bold text-sm">No rules defined for this event</p>
              <p className="text-xs mt-1">Click "Add Rule" to create certificate eligibility rules.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rule Name</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificate Type</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Criteria</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule: any) => {
                    const ct = certificateTypes.find(t => t.value === rule.certificate_type);
                    return (
                      <tr key={rule.rule_id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{rule.rule_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {ct?.icon}
                            <span className="text-sm font-medium text-slate-700">{ct?.label || rule.certificate_type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {rule.rule_type === 'top_n' ? `Top ${rule.rule_configuration?.top_n ?? '?'}` :
                           rule.rule_type === 'rank_range' ? `Rank ${rule.rule_configuration?.rank_start ?? '?'} - ${rule.rule_configuration?.rank_end ?? '?'}` :
                           rule.rule_type === 'rank' ? `Rank ${rule.rule_configuration?.rank ?? '?'}` :
                           rule.rule_type === 'score_threshold' ? `Score ≥ ${rule.rule_configuration?.minimum_score ?? '?'}` :
                           rule.rule_type === 'submission_completed' ? `On ${rule.rule_configuration?.required_stage ?? '?'} submit` :
                           rule.rule_type === 'stage_completed' ? `Stage ${rule.rule_configuration?.stage_id ?? '?'} done` :
                           rule.rule_type === 'registration_completed' ? 'Registered' :
                           rule.rule_type === 'attendance_completed' ? 'Attended' :
                           rule.rule_description || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColors[rule.status] || 'bg-slate-100 text-slate-600'}`}>{rule.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEditRule(rule)} className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-indigo-600"><Edit3 size={16} /></button>
                            <button onClick={() => handleDeleteRule(rule.rule_id)} className="p-2 hover:bg-red-50 rounded-lg transition-all text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificatesPage;
