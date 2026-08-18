import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Lead, LeadStatus, MeetingHistoryItem, ProposalHistoryItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../utils/rbac';
import { DataTable, Column } from '../common/DataTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { RemarksSection } from '../common/RemarksSection';
import { EmailHistorySection } from '../common/EmailHistorySection';
import { EmailComposerModal } from '../common/EmailComposerModal';
import {
  Flame, LayoutGrid, Table, Plus, Edit2, Trash2, X, Loader2, User, ChevronDown, Filter,
  FileText, FileCheck, PenTool, CheckCircle2, Download, Send, ShieldCheck, Clock, Sparkles,
  Calendar, DollarSign, TrendingUp, UserCheck, Briefcase, Phone, Mail, Building, Tag, Search,
  Eye, MessageSquare, Award, ArrowUpRight
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const STAGES: { key: LeadStatus; label: string; dotColor: string; bgBadge: string }[] = [
  { key: 'NEW', label: 'New', dotColor: 'bg-blue-500', bgBadge: 'bg-blue-950/80 text-blue-300 border-blue-800' },
  { key: 'QUALIFIED', label: 'Qualified', dotColor: 'bg-cyan-400', bgBadge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800' },
  { key: 'CONTACTED', label: 'Contacted', dotColor: 'bg-indigo-500', bgBadge: 'bg-indigo-950/80 text-indigo-300 border-indigo-800' },
  { key: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', dotColor: 'bg-amber-400', bgBadge: 'bg-amber-950/80 text-amber-300 border-amber-800' },
  { key: 'PROPOSAL_SENT', label: 'Proposal Sent', dotColor: 'bg-purple-500', bgBadge: 'bg-purple-950/80 text-purple-300 border-purple-800' },
  { key: 'NEGOTIATION', label: 'Negotiation', dotColor: 'bg-orange-500', bgBadge: 'bg-orange-950/80 text-orange-300 border-orange-800' },
  { key: 'WON', label: 'Won', dotColor: 'bg-emerald-400', bgBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' },
  { key: 'LOST', label: 'Lost', dotColor: 'bg-rose-500', bgBadge: 'bg-rose-950/80 text-rose-300 border-rose-800' },
];

export const LeadsPage: React.FC = () => {
  const { user } = useAuth();
  const canonicalRole = normalizeRole(user?.role);
  const isEmployee = canonicalRole === 'ROLE_EMPLOYEE';

  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal state
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'meetings' | 'proposals' | 'remarks' | 'ai' | 'emails'>('overview');

  // Email Composer state
  const [emailComposerLead, setEmailComposerLead] = useState<Lead | null>(null);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);

  // New Meeting form in detail modal
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingSummary, setNewMeetingSummary] = useState('');

  // New Proposal form in detail modal
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropDate, setNewPropDate] = useState('');
  const [newPropAmount, setNewPropAmount] = useState<number | ''>('');
  const [newPropStatus, setNewPropStatus] = useState('PROPOSAL_SENT');

  // Delete state
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleConvertLead = async (leadToConvert: Lead) => {
    try {
      setIsSubmitting(true);
      const res = await apiService.convertLeadToClient(leadToConvert.id);
      const convertedClient = res.client;
      const updatedLead = res.lead;
      setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
      if (detailLead && detailLead.id === updatedLead.id) {
        setDetailLead(updatedLead);
      }
      addToast(
        'success',
        'Lead Converted to Client',
        `Unique Client ID ${convertedClient.clientId || convertedClient.clientNumber || convertedClient.code} generated and stored permanently in database!`
      );
    } catch (err) {
      addToast('error', 'Conversion Failed', 'Failed to convert lead into client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await apiService.getLeads();
      setLeads(data);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setIsError(true);
      addToast('error', 'API Error', 'Failed to load leads from backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    if (searchParams.get('action') === 'add') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Map any legacy stage strings to the 8 standard pipeline stages
  const getCanonicalStage = (stageStr?: string): LeadStatus => {
    if (!stageStr) return 'NEW';
    const s = stageStr.toUpperCase();
    if (s === 'NEW' || s === 'NEW_LEAD') return 'NEW';
    if (s === 'QUALIFIED' || s === 'UNDER_REVIEW' || s === 'DISCOVERY') return 'QUALIFIED';
    if (s === 'CONTACTED') return 'CONTACTED';
    if (s === 'MEETING_SCHEDULED' || s === 'PITCH_SCHEDULED') return 'MEETING_SCHEDULED';
    if (s === 'PROPOSAL_SENT') return 'PROPOSAL_SENT';
    if (s === 'NEGOTIATION' || s === 'CONTRACT') return 'NEGOTIATION';
    if (s === 'WON' || s === 'CLOSED_WON') return 'WON';
    if (s === 'LOST' || s === 'CLOSED_LOST') return 'LOST';
    return 'NEW';
  };

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const primaryNameVal = String(formData.get('primaryName') || formData.get('contactPerson') || formData.get('contactName') || '');
    const secondaryNameVal = String(formData.get('secondaryName') || '');
    const companyVal = String(formData.get('company') || formData.get('companyName') || '');
    const emailVal = String(formData.get('email') || formData.get('contactEmail') || '');
    const phoneVal = String(formData.get('phone') || formData.get('contactPhone') || '');
    const sourceVal = String(formData.get('leadSource') || 'Website Inquiry');
    const requirementVal = String(formData.get('requirement') || '');
    const priorityVal = (formData.get('priority') as 'HIGH' | 'MEDIUM' | 'LOW') || 'MEDIUM';
    const estStartVal = String(formData.get('estimatedStartDate') || '');
    const estEndVal = String(formData.get('estimatedEndDate') || '');
    const lastContactVal = String(formData.get('lastContactDate') || '');
    const currentStageVal = (formData.get('status') as LeadStatus) || 'NEW';
    const followUpVal = String(formData.get('followUp') || formData.get('followUpDate') || '');
    const pendingTasksVal = String(formData.get('pendingTasks') || '');
    const remarksVal = String(formData.get('remarks') || formData.get('leadNotes') || '');

    const ownerVal = String(formData.get('leadOwner') || user?.name || 'Sarah Jenkins');
    const assignedVal = String(formData.get('assignedEmployee') || 'Sarah Jenkins');
    const industryVal = String(formData.get('industry') || 'Financial Services');
    const revVal = Number(formData.get('expectedRevenue')) || 0;
    const probVal = Number(formData.get('probability')) || 50;
    const timelineVal = String(formData.get('timeline') || '1 Month');
    const scoreVal = Number(formData.get('aiScore')) || 75;

    const leadData: Partial<Lead> = {
      primaryName: primaryNameVal,
      contactPerson: primaryNameVal,
      contactName: primaryNameVal,
      secondaryName: secondaryNameVal,
      company: companyVal,
      companyName: companyVal,
      email: emailVal,
      contactEmail: emailVal,
      phone: phoneVal,
      contactPhone: phoneVal,
      leadSource: sourceVal,
      source: sourceVal,
      requirement: requirementVal,
      priority: priorityVal,
      estimatedStartDate: estStartVal,
      estimatedEndDate: estEndVal,
      lastContactDate: lastContactVal,
      currentStage: currentStageVal,
      status: currentStageVal,
      stage: currentStageVal,
      followUp: followUpVal,
      followUpDate: followUpVal,
      pendingTasks: pendingTasksVal,
      remarks: remarksVal,
      leadNotes: remarksVal,
      notes: remarksVal,
      leadOwner: ownerVal,
      assignedEmployee: assignedVal,
      assignedPartner: assignedVal,
      industry: industryVal,
      expectedRevenue: revVal,
      estimatedValue: revVal,
      probability: probVal,
      timeline: timelineVal,
      aiScore: scoreVal,
    };

    try {
      if (editingLead) {
        const updated = await apiService.updateLead(editingLead.id, leadData);
        setLeads((prev) => prev.map((l) => (l.id === editingLead.id ? updated : l)));
        if (detailLead?.id === editingLead.id) {
          setDetailLead(updated);
        }
        addToast('success', 'Lead Updated', `${companyVal} lead updated.`);
      } else {
        const created = await apiService.createLead({
          ...leadData,
          meetingHistory: [],
          proposalHistory: [],
        });
        setLeads((prev) => [created, ...prev]);
        addToast('success', 'Lead Created', `New lead ${companyVal} added to pipeline.`);
      }
      setIsModalOpen(false);
      setEditingLead(null);
    } catch (err) {
      addToast('error', 'Operation Failed', 'Could not save lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deleteLeadId) return;
    if (isEmployee) {
      addToast('error', 'Action Restricted', 'Employees do not have permission to delete lead records.');
      setDeleteLeadId(null);
      return;
    }
    setIsDeleting(true);
    try {
      await apiService.deleteLead(deleteLeadId);
      setLeads((prev) => prev.filter((l) => l.id !== deleteLeadId));
      if (detailLead?.id === deleteLeadId) setDetailLead(null);
      addToast('success', 'Lead Removed', 'Lead deleted successfully.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Failed to remove lead.');
    } finally {
      setIsDeleting(false);
      setDeleteLeadId(null);
    }
  };

  // Stage Mover Handler
  const handleStageChange = async (leadId: string, newStage: LeadStatus) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return;

    const updatedLead: Lead = {
      ...targetLead,
      status: newStage,
      stage: newStage,
    };

    setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)));
    if (detailLead?.id === leadId) setDetailLead(updatedLead);

    try {
      await apiService.updateLead(leadId, {
        status: newStage,
        stage: newStage,
      });
      const stageLabel = STAGES.find((s) => s.key === newStage)?.label || newStage;
      addToast('success', 'Stage Moved', `${targetLead.company || targetLead.companyName} moved to ${stageLabel}.`);
    } catch (err) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? targetLead : l)));
      if (detailLead?.id === leadId) setDetailLead(targetLead);
      addToast('error', 'Stage Shift Failed', 'Could not update stage.');
    }
  };

  // Add Meeting to Lead
  const handleAddMeetingToLead = async () => {
    if (!detailLead || !newMeetingTitle || !newMeetingDate) return;
    const newMeeting: MeetingHistoryItem = {
      id: `mh-${Date.now()}`,
      date: newMeetingDate,
      title: newMeetingTitle,
      summary: newMeetingSummary || 'Discussion notes added.',
      organizer: detailLead.assignedEmployee || user?.name || 'Sarah Jenkins',
    };

    const updatedHistory = [...(detailLead.meetingHistory || []), newMeeting];
    const updatedLead = { ...detailLead, meetingHistory: updatedHistory };

    setDetailLead(updatedLead);
    setLeads((prev) => prev.map((l) => (l.id === detailLead.id ? updatedLead : l)));

    setNewMeetingTitle('');
    setNewMeetingDate('');
    setNewMeetingSummary('');

    try {
      await apiService.updateLead(detailLead.id, { meetingHistory: updatedHistory });
      addToast('success', 'Meeting Added', 'New meeting logged into lead history.');
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not update meeting history.');
    }
  };

  // Add Proposal to Lead
  const handleAddProposalToLead = async () => {
    if (!detailLead || !newPropTitle || !newPropDate || !newPropAmount) return;
    const newProp: ProposalHistoryItem = {
      id: `ph-${Date.now()}`,
      date: newPropDate,
      title: newPropTitle,
      amount: Number(newPropAmount),
      status: newPropStatus,
    };

    const updatedHistory = [...(detailLead.proposalHistory || []), newProp];
    const updatedLead = { ...detailLead, proposalHistory: updatedHistory };

    setDetailLead(updatedLead);
    setLeads((prev) => prev.map((l) => (l.id === detailLead.id ? updatedLead : l)));

    setNewPropTitle('');
    setNewPropDate('');
    setNewPropAmount('');

    try {
      await apiService.updateLead(detailLead.id, { proposalHistory: updatedHistory });
      addToast('success', 'Proposal Logged', 'Proposal record added to history.');
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not update proposal history.');
    }
  };

  // Filter leads
  const filteredLeads = leads.filter((l) => {
    const canonicalStage = getCanonicalStage(l.status || l.stage);
    if (stageFilter !== 'ALL' && canonicalStage !== stageFilter) return false;
    
    const prio = (l.priority || 'MEDIUM').toUpperCase();
    if (priorityFilter !== 'ALL' && prio !== priorityFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const comp = (l.company || l.companyName || '').toLowerCase();
      const contact = (l.contactPerson || l.contactName || '').toLowerCase();
      const owner = (l.leadOwner || '').toLowerCase();
      const emp = (l.assignedEmployee || l.assignedPartner || '').toLowerCase();
      const ind = (l.industry || '').toLowerCase();
      if (!comp.includes(q) && !contact.includes(q) && !owner.includes(q) && !emp.includes(q) && !ind.includes(q)) {
        return false;
      }
    }

    if (isEmployee) {
      const owner = (l.leadOwner || '').toLowerCase();
      const emp = (l.assignedEmployee || l.assignedPartner || '').toLowerCase();
      const userName = (user?.name || 'robert').toLowerCase();
      const userEmail = (user?.email || '').toLowerCase().split('@')[0];
      const isMyLead =
        owner.includes(userName) ||
        owner.includes(userEmail) ||
        emp.includes(userName) ||
        emp.includes(userEmail) ||
        emp.includes('robert') ||
        owner.includes('robert');
      if (!isMyLead) return false;
    }
    return true;
  });

  const columns: Column<Lead>[] = [
    {
      key: 'company',
      header: 'Company & Contact',
      sortable: true,
      render: (lead) => (
        <div className="cursor-pointer" onClick={() => setDetailLead(lead)}>
          <span className="font-bold text-white block text-xs hover:text-indigo-400 transition-colors">
            {lead.company || lead.companyName}
          </span>
          <span className="text-[11px] text-slate-400 block">
            {lead.contactPerson || lead.contactName} • {lead.industry}
          </span>
        </div>
      ),
    },
    {
      key: 'leadOwner',
      header: 'Owner / Assigned',
      sortable: true,
      render: (lead) => (
        <div>
          <span className="text-xs font-semibold text-slate-200 block">{lead.leadOwner || 'Unassigned'}</span>
          <span className="text-[10px] text-slate-400 block">Assigned: {lead.assignedEmployee || lead.assignedPartner}</span>
        </div>
      ),
    },
    {
      key: 'expectedRevenue',
      header: 'Expected Revenue',
      sortable: true,
      render: (lead) => (
        <span className="font-black text-emerald-400 text-xs">
          ${(lead.expectedRevenue || lead.estimatedValue || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Pipeline Stage',
      sortable: true,
      render: (lead) => {
        const cStage = getCanonicalStage(lead.status || lead.stage);
        const stageObj = STAGES.find((s) => s.key === cStage) || STAGES[0];
        return (
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${stageObj.bgBadge}`}>
            {stageObj.label}
          </span>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (lead) => {
        const p = (lead.priority || 'MEDIUM').toUpperCase();
        const badgeColor =
          p === 'HIGH'
            ? 'bg-rose-950 text-rose-400 border-rose-800'
            : p === 'MEDIUM'
            ? 'bg-amber-950 text-amber-400 border-amber-800'
            : 'bg-slate-900 text-slate-400 border-slate-800';
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
            {p}
          </span>
        );
      },
    },
    {
      key: 'aiScore',
      header: 'AI Score',
      sortable: true,
      render: (lead) => (
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-xs font-extrabold text-amber-300">{lead.aiScore || 75}/100</span>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#070a12] min-h-screen text-slate-100 animate-fade-in select-none">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Lead Management & Pipeline</h1>
              <p className="text-xs text-slate-400">Track and manage prospective opportunities, meetings, proposals, and deal timelines.</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="flex items-center gap-3 bg-[#0e1322] border border-slate-800 rounded-2xl px-4 py-2.5 shadow-lg">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pipeline Value</span>
            <span className="text-sm font-black text-emerald-400">
              ${leads.reduce((acc, l) => acc + (l.expectedRevenue || l.estimatedValue || 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Deals</span>
            <span className="text-sm font-black text-indigo-400">{leads.length}</span>
          </div>
        </div>
      </div>

      {/* Top Toolbar Control Bar */}
      <div className="p-4 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lead, company, owner..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#121827] border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Filters & Add Lead Button */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#121827] border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Stages</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#121827] border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* + Add Lead Button */}
          <button
            onClick={() => {
              setEditingLead(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-950/50 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Lead
          </button>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        data={filteredLeads}
        columns={columns}
        searchPlaceholder="Search leads by company, contact, or owner..."
        isLoading={isLoading}
        isError={isError}
        onRetry={fetchLeads}
        onAddNew={() => {
          setEditingLead(null);
          setIsModalOpen(true);
        }}
        addNewLabel="New Lead"
        actions={(lead) => (
          <div className="flex items-center justify-end gap-2">
            {!lead.isConverted && lead.status !== 'WON' ? (
              <button
                onClick={() => handleConvertLead(lead)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                title="Convert Lead to Retainer Client"
              >
                <UserCheck className="w-3 h-3" /> Convert
              </button>
            ) : (
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold text-[10px] rounded-md" title="Converted Client ID">
                {lead.convertedClientId || lead.convertedClientNumber || 'CL-CLIENT'}
              </span>
            )}
            <button
              onClick={() => {
                setEmailComposerLead(lead);
                setIsEmailComposerOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Send Email to Lead"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setDetailLead(lead);
                setDetailTab('remarks');
              }}
              className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Stage Remarks & Activity Notes"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDetailLead(lead)}
              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="View Full Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setEditingLead(lead);
                setIsModalOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Edit Lead"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {!isEmployee && (
              <button
                onClick={() => setDeleteLeadId(lead.id)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                title="Delete Lead"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      />

      {/* LEAD DETAILED VIEW MODAL / DRAWER */}
      {detailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl bg-[#0e1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setDetailLead(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Lead Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-800/80 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    STAGES.find((s) => s.key === getCanonicalStage(detailLead.status || detailLead.stage))?.bgBadge || 'bg-slate-800 text-slate-300'
                  }`}>
                    {STAGES.find((s) => s.key === getCanonicalStage(detailLead.status || detailLead.stage))?.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    (detailLead.priority || 'MEDIUM').toUpperCase() === 'HIGH'
                      ? 'bg-rose-950 text-rose-400 border-rose-800'
                      : 'bg-amber-950 text-amber-400 border-amber-800'
                  }`}>
                    {(detailLead.priority || 'MEDIUM').toUpperCase()} Priority
                  </span>
                  {detailLead.isConverted || detailLead.convertedClientId ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Client ID: {detailLead.convertedClientId || detailLead.convertedClientNumber}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConvertLead(detailLead)}
                      disabled={isSubmitting}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Convert to Client
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEmailComposerLead(detailLead);
                      setIsEmailComposerOpen(true);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" /> Send Email
                  </button>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">{detailLead.company || detailLead.companyName}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Contact: {detailLead.contactPerson || detailLead.contactName} • {detailLead.industry}</p>
              </div>

              <div className="flex items-center gap-3 bg-[#070a12] border border-slate-800 rounded-2xl p-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Expected Revenue</span>
                  <span className="text-lg font-black text-emerald-400">
                    ${(detailLead.expectedRevenue || detailLead.estimatedValue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-800"></div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Win Probability</span>
                  <span className="text-lg font-black text-indigo-400">{detailLead.probability || 50}%</span>
                </div>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 mb-6 pb-2">
              <button
                onClick={() => setDetailTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  detailTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                18 Field Overview
              </button>
              <button
                onClick={() => setDetailTab('meetings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'meetings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Meeting History ({detailLead.meetingHistory?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('proposals')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'proposals' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Proposal History ({detailLead.proposalHistory?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('remarks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'remarks' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-300" /> Remarks & Stage Notes
              </button>
              <button
                onClick={() => setDetailTab('emails')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'emails' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-blue-300" /> Email History
              </button>
              <button
                onClick={() => setDetailTab('ai')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Insights ({detailLead.aiScore || 75})
              </button>
            </div>

            {/* TAB CONTENT: EMAIL COMMUNICATIONS */}
            {detailTab === 'emails' && (
              <EmailHistorySection
                leadId={detailLead.id}
                recipientEmail={detailLead.email || detailLead.contactEmail}
                recipientName={detailLead.primaryName || detailLead.contactPerson || detailLead.contactName || detailLead.company}
                leadName={detailLead.company || detailLead.companyName}
              />
            )}

            {/* TAB CONTENT: REMARKS & STAGE NOTES */}
            {detailTab === 'remarks' && (
              <RemarksSection
                relatedEntity="LEAD"
                relatedEntityId={detailLead.id}
                relatedEntityName={detailLead.company || detailLead.companyName || detailLead.primaryName}
                defaultStage="Lead creation"
                compact={true}
              />
            )}

            {/* TAB CONTENT: OVERVIEW (15 CORE LEAD FIELDS) */}
            {detailTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-[#070a12] border border-slate-800 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Primary Name</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">👤 {detailLead.primaryName || detailLead.contactPerson || detailLead.contactName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. Secondary Name</span>
                    <span className="text-xs font-bold text-slate-300 mt-0.5 block">👥 {detailLead.secondaryName || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. Company</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">🏢 {detailLead.company || detailLead.companyName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">4. Email</span>
                    <span className="text-xs font-bold text-indigo-300 mt-0.5 block truncate">✉️ {detailLead.email || detailLead.contactEmail}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">5. Phone</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 block">📞 {detailLead.phone || detailLead.contactPhone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">6. Lead Source</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 block">🎯 {detailLead.leadSource || detailLead.source}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">7. Priority</span>
                    <span className="text-xs font-bold text-amber-400 mt-0.5 block">⚡ {(detailLead.priority || 'MEDIUM').toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">8. Current Stage</span>
                    <span className="text-xs font-bold text-indigo-400 mt-0.5 block">
                      📌 {STAGES.find((s) => s.key === getCanonicalStage(detailLead.currentStage || detailLead.status || detailLead.stage))?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">9. Last Contact Date</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 block">📆 {detailLead.lastContactDate || '2026-08-01'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">10. Estimated Start Date</span>
                    <span className="text-xs font-bold text-emerald-400 mt-0.5 block">🚀 {detailLead.estimatedStartDate || '2026-09-01'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">11. Estimated End Date</span>
                    <span className="text-xs font-bold text-slate-300 mt-0.5 block">🏁 {detailLead.estimatedEndDate || '2026-12-31'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">12. Follow-up Date</span>
                    <span className="text-xs font-bold text-indigo-300 mt-0.5 block">📅 {detailLead.followUp || detailLead.followUpDate || '2026-08-20'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">13. Expected Revenue</span>
                    <span className="text-xs font-extrabold text-emerald-400 mt-0.5 block">
                      💰 ${(detailLead.expectedRevenue || detailLead.estimatedValue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">14. Lead Owner</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">👤 {detailLead.leadOwner || 'Sarah Jenkins'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">15. AI Score</span>
                    <span className="text-xs font-bold text-amber-300 mt-0.5 block">✨ {detailLead.aiScore || 75}/100</span>
                  </div>
                </div>

                {/* Requirement & Pending Tasks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Requirement</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {detailLead.requirement || 'Series C financial modeling, R&D tax credit optimization, and interim CFO advisory.'}
                    </p>
                  </div>
                  <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pending Tasks</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {detailLead.pendingTasks || 'Prepare secondary proposal scope & schedule follow-up board presentation.'}
                    </p>
                  </div>
                </div>

                {/* Notes & Remarks */}
                <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Notes / Remarks</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {detailLead.remarks || detailLead.leadNotes || detailLead.notes || 'No notes added yet for this lead.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: MEETING HISTORY */}
            {detailTab === 'meetings' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-indigo-400" /> Log New Meeting for this Lead
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Meeting Title (e.g. Discovery Call)"
                      value={newMeetingTitle}
                      onChange={(e) => setNewMeetingTitle(e.target.value)}
                      className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                    />
                    <input
                      type="date"
                      value={newMeetingDate}
                      onChange={(e) => setNewMeetingDate(e.target.value)}
                      className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                  <textarea
                    placeholder="Meeting Summary & Key Takeaways..."
                    rows={2}
                    value={newMeetingSummary}
                    onChange={(e) => setNewMeetingSummary(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                  ></textarea>
                  <button
                    onClick={handleAddMeetingToLead}
                    disabled={!newMeetingTitle || !newMeetingDate}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Save Meeting Record
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400">Past & Scheduled Meetings</h4>
                  {!detailLead.meetingHistory || detailLead.meetingHistory.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No meetings logged yet for this lead.</p>
                  ) : (
                    detailLead.meetingHistory.map((m) => (
                      <div key={m.id} className="p-3 bg-[#070a12] border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{m.title}</span>
                          <span className="text-[10px] font-mono text-indigo-400">{m.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{m.summary}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: PROPOSAL HISTORY */}
            {detailTab === 'proposals' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-indigo-400" /> Log Proposal Record
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Proposal Title"
                      value={newPropTitle}
                      onChange={(e) => setNewPropTitle(e.target.value)}
                      className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                    />
                    <input
                      type="date"
                      value={newPropDate}
                      onChange={(e) => setNewPropDate(e.target.value)}
                      className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                    />
                    <input
                      type="number"
                      placeholder="Amount ($)"
                      value={newPropAmount}
                      onChange={(e) => setNewPropAmount(Number(e.target.value) || '')}
                      className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                  <button
                    onClick={handleAddProposalToLead}
                    disabled={!newPropTitle || !newPropDate || !newPropAmount}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Save Proposal Record
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400">Proposal Submissions</h4>
                  {!detailLead.proposalHistory || detailLead.proposalHistory.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No proposals logged yet for this lead.</p>
                  ) : (
                    detailLead.proposalHistory.map((p) => (
                      <div key={p.id} className="p-3 bg-[#070a12] border border-slate-800 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">{p.title}</span>
                          <span className="text-[10px] text-slate-400">Logged on {p.date} • Status: {p.status}</span>
                        </div>
                        <span className="text-xs font-black text-emerald-400">${p.amount.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: AI INSIGHTS */}
            {detailTab === 'ai' && (
              <div className="p-5 bg-[#070a12] border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">AI Deal Health Analysis</h4>
                    <span className="text-xs text-amber-300 font-extrabold">Conversion Score: {detailLead.aiScore || 75}/100</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-mono bg-[#0e1322] p-3 rounded-xl border border-slate-800">
                  {detailLead.aiRecommendation || 'AI suggests setting up a follow-up consultation with lead decision maker.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL (ALL 18 FIELDS) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-[#0e1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar select-none">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              {editingLead ? 'Edit Lead' : 'Add New Lead'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Row 1: Primary Name, Secondary Name & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    1. Primary Name
                  </label>
                  <input
                    type="text"
                    name="primaryName"
                    required
                    defaultValue={editingLead?.primaryName || editingLead?.contactPerson || editingLead?.contactName}
                    placeholder="e.g. Dr. Marcus Vance"
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    2. Secondary Name
                  </label>
                  <input
                    type="text"
                    name="secondaryName"
                    defaultValue={editingLead?.secondaryName || ''}
                    placeholder="e.g. Dr. Helen Zhou"
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    3. Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    required
                    defaultValue={editingLead?.company || editingLead?.companyName}
                    placeholder="e.g. Starlight BioTech Corp"
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 2: Email, Phone & Lead Source */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    4. Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={editingLead?.email || editingLead?.contactEmail || 'm.vance@company.com'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    5. Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingLead?.phone || editingLead?.contactPhone || '+1 (555) 389-2210'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    6. Lead Source
                  </label>
                  <input
                    type="text"
                    name="leadSource"
                    defaultValue={editingLead?.leadSource || editingLead?.source || 'Inbound Partner Referral'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 3: Current Stage, Priority & Expected Revenue */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    7. Current Stage
                  </label>
                  <select
                    name="status"
                    defaultValue={getCanonicalStage(editingLead?.currentStage || editingLead?.status || editingLead?.stage)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    8. Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue={editingLead?.priority || 'HIGH'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    9. Expected Revenue ($)
                  </label>
                  <input
                    type="number"
                    name="expectedRevenue"
                    required
                    defaultValue={editingLead?.expectedRevenue || editingLead?.estimatedValue || 650000}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 4: Dates (Est. Start, Est. End, Last Contact, Follow-up) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    10. Est. Start Date
                  </label>
                  <input
                    type="date"
                    name="estimatedStartDate"
                    defaultValue={editingLead?.estimatedStartDate || '2026-09-01'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    11. Est. End Date
                  </label>
                  <input
                    type="date"
                    name="estimatedEndDate"
                    defaultValue={editingLead?.estimatedEndDate || '2026-12-31'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    12. Last Contact Date
                  </label>
                  <input
                    type="date"
                    name="lastContactDate"
                    defaultValue={editingLead?.lastContactDate || '2026-08-01'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    13. Follow-up Date
                  </label>
                  <input
                    type="date"
                    name="followUp"
                    defaultValue={editingLead?.followUp || editingLead?.followUpDate || '2026-08-20'}
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 5: Requirement & Pending Tasks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    14. Requirement
                  </label>
                  <textarea
                    name="requirement"
                    rows={2}
                    defaultValue={editingLead?.requirement || ''}
                    placeholder="Client requirements and project scope..."
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    15. Pending Tasks
                  </label>
                  <textarea
                    name="pendingTasks"
                    rows={2}
                    defaultValue={editingLead?.pendingTasks || ''}
                    placeholder="Pending action items for this lead..."
                    className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  ></textarea>
                </div>
              </div>

              {/* Row 6: Notes / Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Notes / Remarks
                </label>
                <textarea
                  name="remarks"
                  rows={2}
                  defaultValue={editingLead?.remarks || editingLead?.leadNotes || editingLead?.notes}
                  placeholder="General notes and remarks..."
                  className="w-full px-3 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingLead ? 'Save Lead' : 'Add Lead'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteLeadId)}
        title="Delete Lead"
        message="Are you sure you want to delete this lead record?"
        confirmText="Delete"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteLeadId(null)}
      />

      {emailComposerLead && (
        <EmailComposerModal
          isOpen={isEmailComposerOpen}
          onClose={() => {
            setIsEmailComposerOpen(false);
            setEmailComposerLead(null);
          }}
          initialRecipient={emailComposerLead.email || emailComposerLead.contactEmail || ''}
          recipientName={emailComposerLead.primaryName || emailComposerLead.contactPerson || emailComposerLead.company}
          leadId={emailComposerLead.id}
          leadName={emailComposerLead.company || emailComposerLead.companyName}
          onEmailSent={(sentEmail) => {
            addToast(
              sentEmail.status === 'SENT' ? 'success' : 'info',
              sentEmail.status === 'SENT' ? 'Email Dispatched' : 'Email Logged',
              `Email "${sentEmail.subject}" recorded in Lead communications log.`
            );
          }}
        />
      )}

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
