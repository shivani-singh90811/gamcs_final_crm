import React, { useState, useEffect } from 'react';
import { Proposal, ProposalStatus, ProposalLineItem, ContractFormatOption } from '../../types';
import { apiService } from '../../services/api';

import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  FileCheck,
  Plus,
  Sparkles,
  DollarSign,
  Calendar,
  Mail,
  Printer,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Search,
  Filter,
  Download,
  FileText,
  ChevronRight,
  RefreshCw,
  UserCheck,
  MessageSquare,
  Layers,
  Building,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProposalsPageProps {
  onShowToast?: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void;
}

export const ProposalsPage: React.FC<ProposalsPageProps> = ({ onShowToast: externalShowToast }) => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<string>('');
  const [workflowComments, setWorkflowComments] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // AI Generation Loading
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    if (externalShowToast) {
      externalShowToast(title, message, type);
    }
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  // Contract Format Options
  const CONTRACT_FORMAT_OPTIONS = [
    { value: 'STANDARD_PROPOSAL', label: 'Standard Executive Proposal', badge: 'Standard Proposal', color: 'bg-emerald-950 text-emerald-400 border-emerald-800' },
    { value: 'RETAINER_CONTRACT', label: 'Monthly Retainer Agreement', badge: 'Monthly Retainer', color: 'bg-blue-950 text-blue-400 border-blue-800' },
    { value: 'MSA_AGREEMENT', label: 'Master Services Agreement (MSA)', badge: 'MSA Agreement', color: 'bg-purple-950 text-purple-400 border-purple-800' },
    { value: 'SOW_DELIVERABLE', label: 'Statement of Work (SOW)', badge: 'SOW Deliverable', color: 'bg-indigo-950 text-indigo-400 border-indigo-800' },
    { value: 'FIXED_FEE_LOE', label: 'Fixed-Fee Letter of Engagement', badge: 'Fixed-Fee LOE', color: 'bg-amber-950 text-amber-400 border-amber-800' },
  ];

  const DEFAULT_TERMS_BY_FORMAT: Record<string, string> = {
    STANDARD_PROPOSAL: '1. VALIDITY: Proposal quote is binding for 30 days from issuance date.\n2. PAYMENT: Invoices issued upon milestone completion. Net 30 payment terms.\n3. EXPENSES: Out-of-pocket travel and vendor fees billed at cost upon prior written approval.',
    RETAINER_CONTRACT: '1. RETAINER SCHEDULE: Monthly fee due in advance on the 1st of each calendar month.\n2. OVERAGE HOURS: Services beyond included retainer allocation billed at $350/hr.\n3. TERMINATION: Month-to-month commitment with 30-day prior written notice required for cancellation.',
    MSA_AGREEMENT: '1. GOVERNING TERMS: Master agreement governs all associated SOWs and project orders.\n2. INTELLECTUAL PROPERTY: All work product belongs exclusively to Client upon full payment.\n3. LIABILITY LIMIT: Firm liability capped at 2x total fees received under this engagement.',
    SOW_DELIVERABLE: '1. SOW AUDIT: Work performed pursuant to current Firm Master Services Agreement.\n2. SCOPE CHANGES: Material alterations in scope require executed Change Order signed by both parties.\n3. ACCEPTANCE: Client has 10 business days to inspect and accept completed phase deliverables.',
    FIXED_FEE_LOE: '1. FIXED PRICE: Fee is locked for specified scope. 50% deposit due upon signature.\n2. REMAINING BALANCE: 50% balance payable upon final delivery of audit presentation.\n3. EXCLUSIONS: Scope extensions outside agreed LOE will be quoted under separate amendment.',
  };

  // Form State for Generate / Edit Proposal
  const [formData, setFormData] = useState<{
    id?: string;
    proposalNumber?: string;
    title: string;
    clientName: string;
    clientCompany: string;
    contactEmail: string;
    clientPhone: string;
    clientAddress: string;
    engagementType: string;
    serviceCategory: string;
    leadPartner: string;
    contractFormat: string;
    validUntil: string;
    startDate: string;
    endDate: string;
    executiveSummary: string;
    scopeOfWork: string;
    termsAndConditions: string;
    notes: string;
    clientNotes: string;
    items: ProposalLineItem[];
    status: ProposalStatus;
  }>({
    title: '',
    clientName: '',
    clientCompany: '',
    contactEmail: '',
    clientPhone: '',
    clientAddress: '',
    engagementType: 'Fractional CFO',
    serviceCategory: 'Fractional CFO Advisory',
    leadPartner: user?.name || '',
    contractFormat: 'RETAINER_CONTRACT',
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    executiveSummary: '',
    scopeOfWork: '',
    termsAndConditions: DEFAULT_TERMS_BY_FORMAT['RETAINER_CONTRACT'],
    notes: '',
    clientNotes: '',
    status: 'DRAFT',
    items: [
      { id: 'item-1', description: 'Core Advisory Retainer Services', quantity: 1, rate: 0, total: 0 },
    ],
  });

  const loadProposals = async () => {
    setLoading(true);
    try {
      const data = await apiService.getProposals();
      setProposals(data);
      if (data.length > 0) {
        // Keep selected proposal in sync
        if (selectedProposal) {
          const updatedSelected = data.find((p) => p.id === selectedProposal.id) || data[0];
          setSelectedProposal(updatedSelected);
        } else {
          setSelectedProposal(data[0]);
        }
      }
    } catch (err) {
      addToast('error', 'API Connection Error', 'Could not load proposal quotes from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  // Calculate Form Totals
  const calculateFormTotal = () => {
    return formData.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  };

  // Add & Remove Form Line Items
  const handleAddLineItem = () => {
    const newItem: ProposalLineItem = {
      id: `item-${Date.now()}`,
      description: 'Additional Strategic Advisory Deliverable',
      quantity: 1,
      rate: 15000,
      total: 15000,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleUpdateLineItem = (index: number, field: keyof ProposalLineItem, value: any) => {
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      const item = { ...updatedItems[index], [field]: value };

      if (field === 'quantity' || field === 'rate') {
        const q = field === 'quantity' ? Number(value) : Number(item.quantity || 1);
        const r = field === 'rate' ? Number(value) : Number(item.rate || 0);
        item.total = q * r;
      }

      updatedItems[index] = item;
      return { ...prev, items: updatedItems };
    });
  };

  const handleRemoveLineItem = (index: number) => {
    if (formData.items.length <= 1) {
      addToast('info', 'Minimum Line Item Required', 'Proposals must contain at least one line item.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // AI SOW Draft Synthesizer
  const handleSynthesizeAI = async () => {
    setIsSynthesizing(true);
    try {
      const total = calculateFormTotal();
      const res = await apiService.generateAIProposalDraft({
        clientName: formData.clientName,
        engagementType: formData.engagementType,
        proposedFee: total || 150000,
        projectTitle: formData.title || `${formData.engagementType} Engagement`,
        coreObjectives: formData.executiveSummary,
      });

      setFormData((prev) => ({
        ...prev,
        executiveSummary: res.executiveSummary || prev.executiveSummary,
        scopeOfWork: res.scopeOfWork || prev.scopeOfWork,
        items: res.suggestedItems && res.suggestedItems.length > 0 ? res.suggestedItems : prev.items,
      }));

      addToast('success', 'AI Scope Synthesized', 'Proposal summary, scope of work, and pricing schedule updated.');
    } catch (err) {
      addToast('error', 'AI Synthesis Failed', 'Could not synthesize proposal with Gemini model.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      title: '',
      clientName: '',
      clientCompany: '',
      contactEmail: '',
      clientPhone: '',
      clientAddress: '',
      engagementType: 'Fractional CFO',
      serviceCategory: 'Fractional CFO Advisory',
      leadPartner: user?.name || '',
      contractFormat: 'RETAINER_CONTRACT',
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      executiveSummary: '',
      scopeOfWork: '',
      termsAndConditions: DEFAULT_TERMS_BY_FORMAT['RETAINER_CONTRACT'],
      notes: '',
      clientNotes: '',
      status: 'DRAFT',
      items: [
        { id: `item-${Date.now()}`, description: 'Core Advisory Retainer Services', quantity: 1, rate: 0, total: 0 },
      ],
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (prop: Proposal) => {
    setFormData({
      id: prop.id,
      proposalNumber: prop.proposalNumber,
      title: prop.title,
      clientName: prop.clientName,
      clientCompany: prop.clientCompany || prop.clientName,
      contactEmail: prop.contactEmail || '',
      clientPhone: prop.clientPhone || '',
      clientAddress: prop.clientAddress || '',
      engagementType: prop.engagementType || 'Valuation & Advisory',
      serviceCategory: prop.serviceCategory || prop.engagementType || 'Advisory',
      leadPartner: prop.leadPartner || prop.preparedBy || 'Partner',
      contractFormat: prop.contractFormat || 'STANDARD_PROPOSAL',
      validUntil: prop.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      startDate: prop.startDate || '',
      endDate: prop.endDate || '',
      executiveSummary: prop.executiveSummary || '',
      scopeOfWork: prop.scopeOfWork || prop.scopeDetails || '',
      termsAndConditions: prop.termsAndConditions || DEFAULT_TERMS_BY_FORMAT[prop.contractFormat || 'STANDARD_PROPOSAL'],
      notes: prop.notes || '',
      clientNotes: prop.clientNotes || '',
      status: prop.status,
      items: prop.items && prop.items.length > 0 ? prop.items : [
        { id: 'item-1', description: prop.title, quantity: 1, rate: prop.totalAmount || prop.proposedFee || 100000, total: prop.totalAmount || prop.proposedFee || 100000 }
      ],
    });
    setIsEditModalOpen(true);
  };

  // Save Proposal (Create)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const grandTotal = calculateFormTotal();

    try {
      const created = await apiService.createProposal({
        title: formData.title,
        clientName: formData.clientName,
        clientCompany: formData.clientCompany,
        contactEmail: formData.contactEmail,
        clientPhone: formData.clientPhone,
        clientAddress: formData.clientAddress,
        engagementType: formData.engagementType,
        serviceCategory: formData.serviceCategory,
        leadPartner: formData.leadPartner,
        contractFormat: formData.contractFormat,
        validUntil: formData.validUntil,
        startDate: formData.startDate,
        endDate: formData.endDate,
        executiveSummary: formData.executiveSummary,
        scopeOfWork: formData.scopeOfWork,
        scopeDetails: formData.scopeOfWork,
        termsAndConditions: formData.termsAndConditions,
        notes: formData.notes,
        clientNotes: formData.clientNotes,
        items: formData.items,
        status: 'DRAFT',
        proposedFee: grandTotal,
        totalAmount: grandTotal,
        value: grandTotal,
      });

      addToast('success', 'Proposal Generated', `${created.proposalNumber || 'Proposal'} created and saved to REST API.`);
      setIsCreateModalOpen(false);
      loadProposals();
      setSelectedProposal(created);
    } catch (err) {
      addToast('error', 'Creation Error', 'Failed to save proposal record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Proposal (Edit)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) return;
    setIsSubmitting(true);
    const grandTotal = calculateFormTotal();

    try {
      const updated = await apiService.updateProposal(formData.id, {
        title: formData.title,
        clientName: formData.clientName,
        clientCompany: formData.clientCompany,
        contactEmail: formData.contactEmail,
        clientPhone: formData.clientPhone,
        clientAddress: formData.clientAddress,
        engagementType: formData.engagementType,
        serviceCategory: formData.serviceCategory,
        leadPartner: formData.leadPartner,
        contractFormat: formData.contractFormat,
        validUntil: formData.validUntil,
        startDate: formData.startDate,
        endDate: formData.endDate,
        executiveSummary: formData.executiveSummary,
        scopeOfWork: formData.scopeOfWork,
        scopeDetails: formData.scopeOfWork,
        termsAndConditions: formData.termsAndConditions,
        notes: formData.notes,
        clientNotes: formData.clientNotes,
        items: formData.items,
        status: formData.status,
        proposedFee: grandTotal,
        totalAmount: grandTotal,
        value: grandTotal,
      });

      addToast('success', 'Proposal Updated', `${updated.proposalNumber || 'Proposal'} changes saved.`);
      setIsEditModalOpen(false);
      loadProposals();
      setSelectedProposal(updated);
    } catch (err) {
      addToast('error', 'Update Error', 'Could not save proposal changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Workflow Action Execution
  const handleExecuteWorkflow = async () => {
    if (!selectedProposal || !workflowAction) return;
    setIsSubmitting(true);

    try {
      const updated = await apiService.executeProposalWorkflow(selectedProposal.id, workflowAction, workflowComments);
      addToast('success', 'Workflow Status Updated', `Proposal is now ${updated.status}.`);
      setIsWorkflowModalOpen(false);
      setWorkflowComments('');
      loadProposals();
      setSelectedProposal(updated);
    } catch (err) {
      addToast('error', 'Workflow Error', 'Failed to update proposal workflow stage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Workflow Dialog
  const triggerWorkflowDialog = (action: string) => {
    setWorkflowAction(action);
    setWorkflowComments('');
    setIsWorkflowModalOpen(true);
  };

  // Delete Proposal
  const handleDeleteProposal = async () => {
    if (!deleteConfirmId) return;
    try {
      await apiService.deleteProposal(deleteConfirmId);
      addToast('info', 'Proposal Archived', 'Proposal record removed.');
      setDeleteConfirmId(null);
      if (selectedProposal?.id === deleteConfirmId) {
        setSelectedProposal(null);
      }
      loadProposals();
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete proposal.');
    }
  };

  // Print / PDF Export
  const handleExportPDF = () => {
    window.print();
  };

  // Filtered Proposals
  const filteredProposals = proposals.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.proposalNumber && p.proposalNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  // Calculate Metrics
  const totalValue = proposals.reduce((acc, p) => acc + (p.totalAmount || p.proposedFee || p.value || 0), 0);
  const acceptedValue = proposals
    .filter((p) => p.status === 'ACCEPTED')
    .reduce((acc, p) => acc + (p.totalAmount || p.proposedFee || p.value || 0), 0);
  const pendingReviewCount = proposals.filter((p) => p.status === 'UNDER_REVIEW').length;
  const sentCount = proposals.filter((p) => p.status === 'SENT').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto"
    >
      {/* Page Title & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-7 h-7 text-emerald-400" />
            <span>Executive Proposals & SOW Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate CFO retainer quotes, M&A advisory SOWs, line-item pricing tables, and approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={!selectedProposal}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Export PDF / Print</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Proposal</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Pipeline Value</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono mt-2">
            ${totalValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{proposals.length} active proposal quotes</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Accepted Mandates</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono mt-2">
            ${acceptedValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Contract signed & booked</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Partner Review Queue</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400 font-mono mt-2">
            {pendingReviewCount} Proposal{pendingReviewCount !== 1 ? 's' : ''}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting partner sign-off</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Dispatched to Client</span>
            <Send className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-blue-400 font-mono mt-2">
            {sentCount} Active Quote{sentCount !== 1 ? 's' : ''}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sent for client signature</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search proposals, clients, or quote #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
          {['ALL', 'DRAFT', 'UNDER_REVIEW', 'SENT', 'ACCEPTED', 'DECLINED', 'REVISED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === status
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout (List + Detail View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List View (5 Cols) */}
        <div className="lg:col-span-5 space-y-3 print:hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Proposals ({filteredProposals.length})</span>
            <button onClick={loadProposals} className="hover:text-white transition-colors cursor-pointer" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs font-medium space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <span>Loading executive proposals...</span>
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
              No proposal quotes found matching current filter.
            </div>
          ) : (
            filteredProposals.map((prop) => {
              const isSelected = selectedProposal?.id === prop.id;
              const propFee = prop.totalAmount || prop.proposedFee || prop.value || 0;

              return (
                <div
                  key={prop.id}
                  onClick={() => setSelectedProposal(prop)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm relative ${
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/50'
                      : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded">
                          {prop.proposalNumber || 'PROP-2026'}
                        </span>
                        <h3 className="font-bold text-xs text-white line-clamp-1">{prop.title}</h3>
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium mt-1 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{prop.clientName}</span>
                      </p>
                    </div>

                    <Badge
                      variant={
                        prop.status === 'ACCEPTED'
                          ? 'emerald'
                          : prop.status === 'SENT'
                          ? 'blue'
                          : prop.status === 'UNDER_REVIEW'
                          ? 'purple'
                          : prop.status === 'DECLINED'
                          ? 'rose'
                          : 'amber'
                      }
                    >
                      {prop.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/60 text-[11px]">
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      ${propFee.toLocaleString()}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      Valid: {prop.validUntil || '2026-09-30'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail & Preview View (7 Cols) */}
        <div className="lg:col-span-7 print:col-span-12">
          {selectedProposal ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md space-y-6 print:border-none print:p-0 print:bg-white print:text-slate-900">
              
              {/* Proposal Header Controls (Hidden when printing) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 print:hidden">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      {selectedProposal.proposalNumber || 'PROP-2026'}
                    </span>
                    <Badge
                      variant={
                        selectedProposal.status === 'ACCEPTED'
                          ? 'emerald'
                          : selectedProposal.status === 'SENT'
                          ? 'blue'
                          : selectedProposal.status === 'UNDER_REVIEW'
                          ? 'purple'
                          : selectedProposal.status === 'DECLINED'
                          ? 'rose'
                          : 'amber'
                      }
                    >
                      {selectedProposal.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">{selectedProposal.title}</h2>
                  <p className="text-xs text-slate-400">{selectedProposal.clientName}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(selectedProposal)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Edit Proposal"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Export / Print PDF"
                  >
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(selectedProposal.id)}
                    className="p-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="Delete Proposal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Printable Document Format */}
              <div className="space-y-6 text-xs print:text-black">
                {/* Document Header with Ref & Format Badge */}
                <div className="border-b border-slate-800/80 pb-4 print:border-slate-300 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black text-white print:text-black tracking-tight">ARCHICORP PRACTICE</h2>
                    <p className="text-[10px] text-emerald-400 print:text-emerald-800 font-bold uppercase tracking-wider">
                      Executive Financial Advisory & M&A Practice
                    </p>
                    <p className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
                      100 Pine Street, Suite 2400 • San Francisco, CA 94111
                    </p>
                  </div>

                  <div className="text-right">
                    {(() => {
                      const fmt = CONTRACT_FORMAT_OPTIONS.find((f) => f.value === selectedProposal.contractFormat) || CONTRACT_FORMAT_OPTIONS[0];
                      return (
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border print:bg-slate-100 print:text-slate-800 print:border-slate-300 ${fmt.color}`}>
                          {fmt.badge.toUpperCase()}
                        </span>
                      );
                    })()}
                    <p className="text-[10px] text-slate-400 print:text-slate-600 mt-1 font-mono">
                      Ref: {selectedProposal.proposalNumber || 'PROP-2026'}
                    </p>
                    <p className="text-[10px] text-slate-400 print:text-slate-600 font-mono">
                      Date: {selectedProposal.createdAt || '2026-08-01'}
                    </p>
                  </div>
                </div>

                {/* Client & Engagement Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 print:bg-slate-50 print:border-slate-200 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-500 print:text-slate-600 block text-[10px] font-bold uppercase tracking-wider">Client Account Details</span>
                    <p className="font-bold text-white print:text-slate-900 text-sm flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-emerald-400 print:text-emerald-700" />
                      <span>{selectedProposal.clientCompany || selectedProposal.clientName}</span>
                    </p>
                    {selectedProposal.clientName && selectedProposal.clientCompany && (
                      <p className="text-slate-300 print:text-slate-700 font-medium text-[11px] flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>Attn: {selectedProposal.clientName}</span>
                      </p>
                    )}
                    {selectedProposal.contactEmail && (
                      <p className="text-[11px] text-slate-400 print:text-slate-600 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{selectedProposal.contactEmail}</span>
                      </p>
                    )}
                    {selectedProposal.clientPhone && (
                      <p className="text-[11px] text-slate-400 print:text-slate-600 flex items-center gap-1">
                        <span className="text-slate-500 font-mono text-[10px]">TEL:</span>
                        <span>{selectedProposal.clientPhone}</span>
                      </p>
                    )}
                    {selectedProposal.clientAddress && (
                      <p className="text-[10px] text-slate-500 print:text-slate-600 italic mt-0.5">
                        {selectedProposal.clientAddress}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 print:text-slate-600 block text-[10px] font-bold uppercase tracking-wider">Engagement & Timeline</span>
                    <p className="font-bold text-white print:text-slate-900 text-xs">
                      {selectedProposal.serviceCategory || selectedProposal.engagementType || 'Valuation & Advisory'}
                    </p>
                    <p className="text-[11px] text-slate-300 print:text-slate-800">
                      Lead Partner: <span className="font-semibold text-white print:text-slate-900">{selectedProposal.leadPartner || 'Sarah Jenkins'}</span>
                    </p>
                    <div className="pt-1 text-[10px] space-y-0.5 text-slate-400 print:text-slate-600 font-mono">
                      {selectedProposal.startDate && (
                        <p>Engagement Term: <strong className="text-slate-200 print:text-slate-800">{selectedProposal.startDate}</strong> to <strong className="text-slate-200 print:text-slate-800">{selectedProposal.endDate || 'TBD'}</strong></p>
                      )}
                      <p>Valid Until: <strong className="text-amber-400 print:text-amber-800">{selectedProposal.validUntil || '2026-09-30'}</strong></p>
                    </div>
                  </div>
                </div>

                {/* Executive Summary Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white print:text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400 print:text-emerald-700" />
                    <span>1. Executive Summary</span>
                  </h4>
                  <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-300 print:text-slate-800 print:bg-slate-50 print:border-slate-200 text-xs leading-relaxed">
                    {selectedProposal.executiveSummary || 'No executive summary specified.'}
                  </div>
                </div>

                {/* Scope of Work Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white print:text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400 print:text-emerald-700" />
                    <span>2. Scope of Work & Deliverables</span>
                  </h4>
                  <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-300 print:text-slate-800 print:bg-slate-50 print:border-slate-200 text-xs leading-relaxed whitespace-pre-line">
                    {selectedProposal.scopeOfWork || selectedProposal.scopeDetails || 'Phase 1: Valuation & Capital Structure Audit\nPhase 2: Deliverables & Board Presentation'}
                  </div>
                </div>

                {/* Line Item Pricing Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white print:text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400 print:text-emerald-700" />
                    <span>3. Engagement Investment Schedule</span>
                  </h4>

                  <div className="border border-slate-800 print:border-slate-300 rounded-xl overflow-hidden bg-slate-950/60 print:bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 print:bg-slate-100 text-slate-400 print:text-slate-700 font-bold uppercase text-[10px] border-b border-slate-800 print:border-slate-300">
                          <th className="p-3">Deliverable Description</th>
                          <th className="p-3 text-center w-16">Units/Hrs</th>
                          <th className="p-3 text-right w-24">Rate ($)</th>
                          <th className="p-3 text-right w-28">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 text-slate-300 print:text-slate-800">
                        {(selectedProposal.items && selectedProposal.items.length > 0
                          ? selectedProposal.items
                          : [
                              {
                                id: '1',
                                description: selectedProposal.title,
                                quantity: 1,
                                rate: selectedProposal.totalAmount || selectedProposal.proposedFee || 100000,
                                total: selectedProposal.totalAmount || selectedProposal.proposedFee || 100000,
                              },
                            ]
                        ).map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="p-3 font-medium text-white print:text-slate-900">{item.description}</td>
                            <td className="p-3 text-center font-mono">{item.quantity || item.hoursOrUnits || 1}</td>
                            <td className="p-3 text-right font-mono">${(item.rate || 0).toLocaleString()}</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-400 print:text-emerald-800">
                              ${(item.total || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900/80 print:bg-slate-100 font-bold text-white print:text-slate-900 border-t border-slate-800 print:border-slate-300">
                          <td colSpan={3} className="p-3 text-right uppercase text-[10px] tracking-wider text-slate-400 print:text-slate-700">
                            Total Strategic Investment
                          </td>
                          <td className="p-3 text-right font-mono text-base text-emerald-400 print:text-emerald-800">
                            ${(selectedProposal.totalAmount || selectedProposal.proposedFee || selectedProposal.value || 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Terms & Conditions Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white print:text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 print:text-emerald-700" />
                    <span>4. Terms & Conditions</span>
                  </h4>
                  <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-300 print:text-slate-800 print:bg-slate-50 print:border-slate-200 text-xs leading-relaxed whitespace-pre-line font-mono text-[11px]">
                    {selectedProposal.termsAndConditions || DEFAULT_TERMS_BY_FORMAT[selectedProposal.contractFormat || 'STANDARD_PROPOSAL']}
                  </div>
                </div>

                {/* Client & Internal Notes (if present) */}
                {(selectedProposal.notes || selectedProposal.clientNotes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {selectedProposal.clientNotes && (
                      <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Client Instructions & Notes
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{selectedProposal.clientNotes}</p>
                      </div>
                    )}
                    {selectedProposal.notes && (
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 print:hidden">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Firm Internal Practice Notes (Confidential)
                        </span>
                        <p className="text-slate-400 text-[11px] leading-relaxed">{selectedProposal.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Approval Workflow Controls & History (Interactive in UI) */}
                <div className="pt-4 border-t border-slate-800/80 print:border-slate-300 space-y-4 print:hidden">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Approval Workflow & Partner Sign-off</span>
                    </h4>
                  </div>

                  {/* Workflow Action Buttons Bar */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Current Stage: <strong className="text-emerald-400">{selectedProposal.status.replace('_', ' ')}</strong></span>
                      <span className="text-[10px]">Lead Partner: {selectedProposal.leadPartner || 'Sarah Jenkins'}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {(selectedProposal.status === 'DRAFT' || selectedProposal.status === 'REVISED') && (
                        <button
                          onClick={() => triggerWorkflowDialog('SUBMIT_FOR_REVIEW')}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" /> Submit for Partner Review
                        </button>
                      )}

                      {selectedProposal.status === 'UNDER_REVIEW' && (
                        <>
                          <button
                            onClick={() => triggerWorkflowDialog('APPROVE')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Partner Approve Proposal
                          </button>
                          <button
                            onClick={() => triggerWorkflowDialog('REQUEST_REVISIONS')}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Request Revisions
                          </button>
                        </>
                      )}

                      {(selectedProposal.status === 'SENT' || selectedProposal.status === 'UNDER_REVIEW') && (
                        <button
                          onClick={() => triggerWorkflowDialog('SEND_TO_CLIENT')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" /> Dispatch to Client
                        </button>
                      )}

                      {selectedProposal.status === 'SENT' && (
                        <>
                          <button
                            onClick={() => triggerWorkflowDialog('ACCEPT')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Client Signed / Accepted
                          </button>
                          <button
                            onClick={() => triggerWorkflowDialog('DECLINE')}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Client Declined
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Approval Audit Trail History */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approval History Log</span>
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl divide-y divide-slate-800/60 text-xs">
                      {selectedProposal.approvalHistory && selectedProposal.approvalHistory.length > 0 ? (
                        selectedProposal.approvalHistory.map((item) => (
                          <div key={item.id} className="p-3 flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    item.action === 'APPROVED' || item.action === 'ACCEPTED'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : item.action === 'SUBMITTED'
                                      ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                      : item.action === 'REJECTED' || item.action === 'DECLINED'
                                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                      : 'bg-blue-950 text-blue-400 border border-blue-800'
                                  }`}
                                >
                                  {item.action}
                                </span>
                                <span className="font-bold text-white">{item.actor}</span>
                                {item.role && <span className="text-[10px] text-slate-500">({item.role})</span>}
                              </div>
                              {item.comments && <p className="text-[11px] text-slate-300 mt-1">{item.comments}</p>}
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 shrink-0">{item.timestamp}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-slate-500 text-[11px]">Initial proposal compiled. No workflow history logged.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Printable Signature & Terms Footer */}
                <div className="pt-6 border-t border-slate-800 print:border-slate-300 grid grid-cols-2 gap-8 print:grid-cols-2 text-[10px] text-slate-400 print:text-slate-700">
                  <div className="space-y-8">
                    <div>
                      <p className="font-bold text-slate-300 print:text-slate-900 uppercase">Prepared By Firm Partner</p>
                      <div className="border-b border-slate-700 print:border-slate-400 w-48 mt-8"></div>
                      <p className="mt-1 font-semibold text-white print:text-slate-900">{selectedProposal.leadPartner || 'Sarah Jenkins, Managing Partner'}</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <p className="font-bold text-slate-300 print:text-slate-900 uppercase">Accepted By Authorized Client Officer</p>
                      <div className="border-b border-slate-700 print:border-slate-400 w-48 mt-8"></div>
                      <p className="mt-1 font-semibold text-white print:text-slate-900">{selectedProposal.clientName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Select a proposal from the queue to view SOW deliverables, line item fees, and execute approval workflows.
            </div>
          )}
        </div>
      </div>

      {/* CREATE PROPOSAL MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Generate Executive Advisory Proposal & Contract"
        subtitle="Compile contract format, client parameters, SOW, fee schedule, and terms"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {/* Contract Format Option */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Contract / Proposal Format *</label>
            <select
              value={formData.contractFormat}
              onChange={(e) => {
                const newFmt = e.target.value as ContractFormatOption;
                setFormData((prev) => ({
                  ...prev,
                  contractFormat: newFmt,
                  termsAndConditions: DEFAULT_TERMS_BY_FORMAT[newFmt] || prev.termsAndConditions,
                }));
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {CONTRACT_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.badge})
                </option>
              ))}

            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Proposal / Engagement Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Fractional CFO Retainer & Capital Restructuring"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Client Details */}
          <div className="space-y-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Client Details</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Client Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
                  placeholder="e.g. Dr. Marcus Vance"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Client Company / Entity</label>
                <input
                  type="text"
                  value={formData.clientCompany}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clientCompany: e.target.value }))}
                  placeholder="e.g. Starlight BioTech Corp"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="m.vance@starlightbio.io"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clientPhone: e.target.value }))}
                  placeholder="+1 (415) 890-2100"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Billing Address</label>
              <input
                type="text"
                value={formData.clientAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, clientAddress: e.target.value }))}
                placeholder="500 Mission Street, Suite 1400, San Francisco, CA 94105"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Service & Schedule Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Service Category</label>
              <select
                value={formData.engagementType}
                onChange={(e) => setFormData((prev) => ({ ...prev, engagementType: e.target.value, serviceCategory: e.target.value }))}
                className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Fractional CFO">Fractional CFO</option>
                <option value="Valuation & Advisory">Valuation & Advisory</option>
                <option value="M&A Due Diligence">M&A Due Diligence</option>
                <option value="ASC 842 Audit">ASC 842 Audit</option>
                <option value="Tax Strategy & Advisory">Tax Strategy & Advisory</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Lead Partner</label>
              <input
                type="text"
                value={formData.leadPartner}
                onChange={(e) => setFormData((prev) => ({ ...prev, leadPartner: e.target.value }))}
                className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">End Date / Valid</label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData((prev) => ({ ...prev, validUntil: e.target.value, endDate: e.target.value }))}
                className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* AI Synthesizer Action */}
          <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-800/80 p-3 rounded-xl">
            <div>
              <span className="font-bold text-emerald-400 block">Gemini AI SOW Synthesizer</span>
              <span className="text-[10px] text-slate-400">Auto-generate executive summary & pricing structure using Gemini model.</span>
            </div>
            <button
              type="button"
              onClick={handleSynthesizeAI}
              disabled={isSynthesizing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSynthesizing ? 'Synthesizing...' : 'Synthesize AI SOW'}</span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">1. Executive Summary</label>
            <textarea
              rows={2}
              value={formData.executiveSummary}
              onChange={(e) => setFormData((prev) => ({ ...prev, executiveSummary: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">2. Scope of Work & Key Deliverables</label>
            <textarea
              rows={3}
              value={formData.scopeOfWork}
              onChange={(e) => setFormData((prev) => ({ ...prev, scopeOfWork: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          {/* Line Items Builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-300">3. Fee Schedule & Line Items</label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {formData.items.map((item, idx) => (
                <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                      placeholder="Deliverable description"
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || 1}
                      onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                      placeholder="Qty/Hrs"
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white text-center font-mono"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={item.rate || 0}
                      onChange={(e) => handleUpdateLineItem(idx, 'rate', e.target.value)}
                      placeholder="Rate ($)"
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white text-right font-mono"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs font-bold text-white border-t border-slate-800">
              <span>Grand Total Strategic Investment:</span>
              <span className="font-mono text-emerald-400 text-sm">${calculateFormTotal().toLocaleString()}</span>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">4. Contract Terms & Conditions</label>
            <textarea
              rows={3}
              value={formData.termsAndConditions}
              onChange={(e) => setFormData((prev) => ({ ...prev, termsAndConditions: e.target.value }))}
              placeholder="Enter engagement terms and conditions..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          {/* Internal & Client Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Client Notes / Special Instructions</label>
              <textarea
                rows={2}
                value={formData.clientNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, clientNotes: e.target.value }))}
                placeholder="Instructions visible to client..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Internal Firm Practice Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Internal partner notes..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Compile & Save Proposal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT PROPOSAL MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Proposal: ${formData.proposalNumber || 'PROP-2026'}`}
        subtitle="Update SOW, line items, format, terms, or status"
        maxWidth="2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {/* Contract Format Option */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Contract / Proposal Format</label>
              <select
                value={formData.contractFormat}
                onChange={(e) => {
                  const newFmt = e.target.value as ContractFormatOption;
                  setFormData((prev) => ({
                    ...prev,
                    contractFormat: newFmt,
                  }));
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {CONTRACT_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Proposal Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ProposalStatus }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="SENT">SENT</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="DECLINED">DECLINED</option>
                <option value="REVISED">REVISED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Proposal Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Client Details */}
          <div className="space-y-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Client Details</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Client Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Client Company / Entity</label>
                <input
                  type="text"
                  value={formData.clientCompany}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clientCompany: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clientPhone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Billing Address</label>
              <input
                type="text"
                value={formData.clientAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, clientAddress: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Service & Schedule Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Service Category</label>
              <select
                value={formData.engagementType}
                onChange={(e) => setFormData((prev) => ({ ...prev, engagementType: e.target.value, serviceCategory: e.target.value }))}
                className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Fractional CFO">Fractional CFO</option>
                <option value="Valuation & Advisory">Valuation & Advisory</option>
                <option value="M&A Due Diligence">M&A Due Diligence</option>
                <option value="ASC 842 Audit">ASC 842 Audit</option>
                <option value="Tax Strategy & Advisory">Tax Strategy & Advisory</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Lead Partner</label>
              <input
                type="text"
                value={formData.leadPartner}
                onChange={(e) => setFormData((prev) => ({ ...prev, leadPartner: e.target.value }))}
                className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Valid Until</label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData((prev) => ({ ...prev, validUntil: e.target.value, endDate: e.target.value }))}
                className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Executive Summary</label>
            <textarea
              rows={2}
              value={formData.executiveSummary}
              onChange={(e) => setFormData((prev) => ({ ...prev, executiveSummary: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Scope of Work</label>
            <textarea
              rows={3}
              value={formData.scopeOfWork}
              onChange={(e) => setFormData((prev) => ({ ...prev, scopeOfWork: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          {/* Line Items Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-300">Fee Schedule & Line Items</label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {formData.items.map((item, idx) => (
                <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || 1}
                      onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white text-center font-mono"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={item.rate || 0}
                      onChange={(e) => handleUpdateLineItem(idx, 'rate', e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white text-right font-mono"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs font-bold text-white border-t border-slate-800">
              <span>Updated Total Investment:</span>
              <span className="font-mono text-emerald-400 text-sm">${calculateFormTotal().toLocaleString()}</span>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Contract Terms & Conditions</label>
            <textarea
              rows={3}
              value={formData.termsAndConditions}
              onChange={(e) => setFormData((prev) => ({ ...prev, termsAndConditions: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          {/* Internal & Client Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Client Notes / Special Instructions</label>
              <textarea
                rows={2}
                value={formData.clientNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, clientNotes: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Internal Firm Practice Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* WORKFLOW ACTION COMMENTS MODAL */}
      <Modal
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
        title={`Execute Workflow Action: ${workflowAction}`}
        subtitle={`Proposal ${selectedProposal?.proposalNumber || ''} - ${selectedProposal?.title || ''}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Confirm execution of stage change to <strong className="text-emerald-400">{workflowAction}</strong> for client{' '}
            <strong className="text-white">{selectedProposal?.clientName}</strong>.
          </p>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Partner Reviewer Comments / Audit Notes</label>
            <textarea
              rows={3}
              value={workflowComments}
              onChange={(e) => setWorkflowComments(e.target.value)}
              placeholder="e.g. Approved fee schedule and scope after partner review..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsWorkflowModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteWorkflow}
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Stage Change'}
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Delete Proposal Quote"
        message="Are you sure you want to delete this proposal? This action will remove the quote from the active pipeline."
        confirmText="Archive & Delete"
        onConfirm={handleDeleteProposal}
        onClose={() => setDeleteConfirmId(null)}
      />

      {/* TOAST NOTIFICATIONS */}
      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </motion.div>
  );
};

export default ProposalsPage;
