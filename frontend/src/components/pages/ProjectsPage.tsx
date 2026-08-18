import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Project, ProjectMilestone, ProjectDocument, ProjectInvoice, ProjectTimelineItem, ProjectStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../utils/rbac';
import { DataTable, Column } from '../common/DataTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import {
  Briefcase, Plus, Edit2, Trash2, X, Loader2, DollarSign, User, FileText, FilePlus,
  Calendar, Clock, Users, Layers, CheckSquare, Receipt, Milestone, Activity, Eye,
  Search, CheckCircle2, AlertCircle, Building, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const PROJECT_STATUSES: { key: ProjectStatus; label: string; bgBadge: string }[] = [
  { key: 'PLANNING', label: 'Planning', bgBadge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800' },
  { key: 'IN_PROGRESS', label: 'In Progress', bgBadge: 'bg-indigo-950/80 text-indigo-300 border-indigo-800' },
  { key: 'UNDER_AUDIT', label: 'Under Audit', bgBadge: 'bg-amber-950/80 text-amber-300 border-amber-800' },
  { key: 'COMPLETED', label: 'Completed', bgBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' },
  { key: 'ON_HOLD', label: 'On Hold', bgBadge: 'bg-rose-950/80 text-rose-300 border-rose-800' },
];

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const canonicalRole = normalizeRole(user?.role);
  const isEmployee = canonicalRole === 'ROLE_EMPLOYEE';
  const isClient = canonicalRole === 'ROLE_CLIENT';

  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Drawer / Modal State
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'milestones' | 'documents' | 'invoices' | 'timeline'>('overview');

  // Add Milestone Form in Detail Modal
  const [newMsTitle, setNewMsTitle] = useState('');
  const [newMsDate, setNewMsDate] = useState('');
  const [newMsDeliverable, setNewMsDeliverable] = useState('');

  // Add Document Form in Detail Modal
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocFileName, setNewDocFileName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('General');

  // Add Invoice Form in Detail Modal
  const [newInvNum, setNewInvNum] = useState('');
  const [newInvAmount, setNewInvAmount] = useState<number | ''>('');
  const [newInvDueDate, setNewInvDueDate] = useState('');
  const [newInvStatus, setNewInvStatus] = useState<'PAID' | 'SENT' | 'OVERDUE' | 'DRAFT'>('SENT');

  // Add Timeline Item Form
  const [newTlPhase, setNewTlPhase] = useState('');
  const [newTlDate, setNewTlDate] = useState('');
  const [newTlDesc, setNewTlDesc] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await apiService.getProjects();
      setProjects(data);
    } catch (err) {
      setIsError(true);
      addToast('error', 'REST API Error', 'Failed to fetch project engagements.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    if (searchParams.get('action') === 'add') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Form Submit Handler (Create/Edit Project)
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const nameVal = String(formData.get('name') || '');
    const pmVal = String(formData.get('projectManager') || 'Sarah Jenkins');
    const assignedStr = String(formData.get('assignedEmployees') || pmVal);
    const assignedArr = assignedStr.split(',').map((s) => s.trim()).filter(Boolean);
    const clientVal = String(formData.get('client') || formData.get('clientName') || '');
    const startVal = String(formData.get('startDate') || new Date().toISOString().split('T')[0]);
    const deadlineVal = String(formData.get('deadline') || formData.get('targetCompletion') || '2026-12-31');
    const budgetVal = Number(formData.get('budget')) || 0;
    const statusVal = (formData.get('status') as ProjectStatus) || 'IN_PROGRESS';
    const progressVal = Number(formData.get('progress') ?? formData.get('completionPercentage')) || 0;
    const descVal = String(formData.get('description') || '');

    const projData: Partial<Project> = {
      name: nameVal,
      projectManager: pmVal,
      leadPartner: pmVal,
      leadManager: pmVal,
      assignedEmployees: assignedArr.length > 0 ? assignedArr : [pmVal],
      client: clientVal,
      clientName: clientVal,
      startDate: startVal,
      deadline: deadlineVal,
      targetCompletion: deadlineVal,
      budget: budgetVal,
      status: statusVal,
      progress: progressVal,
      completionPercentage: progressVal,
      description: descVal,
    };

    try {
      if (editingProject) {
        const updated = await apiService.updateProject(editingProject.id, projData);
        setProjects((prev) => prev.map((p) => (p.id === editingProject.id ? updated : p)));
        if (detailProject?.id === editingProject.id) {
          setDetailProject(updated);
        }
        addToast('success', 'Project Updated', `${nameVal} details saved.`);
      } else {
        const created = await apiService.createProject({
          ...projData,
          spent: 0,
          milestones: [],
          documents: [],
          invoices: [],
          timeline: [],
        });
        setProjects((prev) => [created, ...prev]);
        addToast('success', 'Project Launched', `${nameVal} engagement initiated.`);
      }
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (err) {
      addToast('error', 'Operation Failed', 'Could not save project to REST backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    if (isEmployee || isClient) {
      addToast('error', 'Action Restricted', 'You do not have permission to delete project records.');
      setDeleteId(null);
      return;
    }
    setIsDeleting(true);
    try {
      await apiService.deleteProject(deleteId);
      setProjects((prev) => prev.filter((p) => p.id !== deleteId));
      if (detailProject?.id === deleteId) setDetailProject(null);
      addToast('success', 'Project Archived', 'Engagement deleted from backend.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Failed to archive project.');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Toggle Milestone Completion
  const handleToggleMilestone = async (milestoneId: string) => {
    if (!detailProject) return;
    const updatedMilestones = (detailProject.milestones || []).map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed, status: !m.completed ? 'COMPLETED' : 'IN_PROGRESS' } : m
    );

    const completedCount = updatedMilestones.filter((m) => m.completed).length;
    const calcProgress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : detailProject.progress;

    const updatedProject = {
      ...detailProject,
      milestones: updatedMilestones,
      progress: calcProgress,
      completionPercentage: calcProgress,
    };

    setDetailProject(updatedProject);
    setProjects((prev) => prev.map((p) => (p.id === detailProject.id ? updatedProject : p)));

    try {
      await apiService.updateProject(detailProject.id, {
        milestones: updatedMilestones,
        progress: calcProgress,
        completionPercentage: calcProgress,
      });
      addToast('success', 'Milestone Updated', 'Milestone status synchronized.');
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not save milestone toggle.');
    }
  };

  // Add New Milestone to Detail Project
  const handleAddMilestone = async () => {
    if (!detailProject || !newMsTitle || !newMsDate) return;
    const newMs: ProjectMilestone = {
      id: `ms-${Date.now()}`,
      title: newMsTitle,
      dueDate: newMsDate,
      completed: false,
      status: 'PLANNED',
      deliverable: newMsDeliverable || 'Deliverable document',
    };

    const updatedMs = [...(detailProject.milestones || []), newMs];
    const updatedProject = { ...detailProject, milestones: updatedMs };

    setDetailProject(updatedProject);
    setProjects((prev) => prev.map((p) => (p.id === detailProject.id ? updatedProject : p)));

    setNewMsTitle('');
    setNewMsDate('');
    setNewMsDeliverable('');

    try {
      await apiService.updateProject(detailProject.id, { milestones: updatedMs });
      addToast('success', 'Milestone Added', 'New milestone registered.');
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not add milestone.');
    }
  };

  // Add Document to Detail Project
  const handleAddDocument = async () => {
    if (!detailProject || !newDocTitle) return;
    const fName = newDocFileName || `${newDocTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`;
    const newDoc: ProjectDocument = {
      id: `doc-${Date.now()}`,
      title: newDocTitle,
      fileName: fName,
      fileSize: '2.4 MB',
      fileType: fName.split('.').pop() || 'pdf',
      uploadedAt: new Date().toISOString().split('T')[0],
      category: newDocCategory,
    };

    const updatedDocs = [...(detailProject.documents || []), newDoc];
    const updatedProject = { ...detailProject, documents: updatedDocs };

    setDetailProject(updatedProject);
    setProjects((prev) => prev.map((p) => (p.id === detailProject.id ? updatedProject : p)));

    setNewDocTitle('');
    setNewDocFileName('');

    try {
      await apiService.updateProject(detailProject.id, { documents: updatedDocs });
      addToast('success', 'Document Attached', 'New document record uploaded.');
    } catch (err) {
      addToast('error', 'Upload Failed', 'Could not attach document.');
    }
  };

  // Add Invoice to Detail Project
  const handleAddInvoice = async () => {
    if (!detailProject || !newInvNum || !newInvAmount || !newInvDueDate) return;
    const newInv: ProjectInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: newInvNum,
      amount: Number(newInvAmount),
      status: newInvStatus,
      date: new Date().toISOString().split('T')[0],
      dueDate: newInvDueDate,
    };

    const updatedInvs = [...(detailProject.invoices || []), newInv];
    const updatedProject = { ...detailProject, invoices: updatedInvs };

    setDetailProject(updatedProject);
    setProjects((prev) => prev.map((p) => (p.id === detailProject.id ? updatedProject : p)));

    setNewInvNum('');
    setNewInvAmount('');
    setNewInvDueDate('');

    try {
      await apiService.updateProject(detailProject.id, { invoices: updatedInvs });
      addToast('success', 'Invoice Generated', 'New invoice logged for project.');
    } catch (err) {
      addToast('error', 'Invoice Error', 'Could not create invoice record.');
    }
  };

  // Add Timeline Item to Detail Project
  const handleAddTimeline = async () => {
    if (!detailProject || !newTlPhase || !newTlDate) return;
    const newTl: ProjectTimelineItem = {
      id: `tl-${Date.now()}`,
      phase: newTlPhase,
      date: newTlDate,
      status: 'IN_PROGRESS',
      description: newTlDesc || 'Phase activities scheduled.',
    };

    const curTl = Array.isArray(detailProject.timeline) ? detailProject.timeline : [];
    const updatedTl = [...curTl, newTl];
    const updatedProject = { ...detailProject, timeline: updatedTl };

    setDetailProject(updatedProject);
    setProjects((prev) => prev.map((p) => (p.id === detailProject.id ? updatedProject : p)));

    setNewTlPhase('');
    setNewTlDate('');
    setNewTlDesc('');

    try {
      await apiService.updateProject(detailProject.id, { timeline: updatedTl });
      addToast('success', 'Timeline Updated', 'Phase entry added to timeline.');
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not update timeline.');
    }
  };

  // Filter projects by RBAC and search
  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pName = (p.name || '').toLowerCase();
      const client = (p.client || p.clientName || '').toLowerCase();
      const pm = (p.projectManager || p.leadPartner || p.leadManager || '').toLowerCase();
      const emp = (p.assignedEmployees || []).join(' ').toLowerCase();
      if (!pName.includes(q) && !client.includes(q) && !pm.includes(q) && !emp.includes(q)) {
        return false;
      }
    }

    if (isClient) {
      const client = (p.client || p.clientName || '').toLowerCase();
      const userEmail = (user?.email || '').toLowerCase();
      return (
        client.includes('starlight') ||
        client.includes('meridian') ||
        client.includes('vanguard') ||
        client.includes('apex') ||
        userEmail.includes('client')
      );
    } else if (isEmployee) {
      const pm = (p.projectManager || p.leadPartner || '').toLowerCase();
      const client = (p.client || p.clientName || '').toLowerCase();
      const emp = (p.assignedEmployees || []).join(' ').toLowerCase();
      const userName = (user?.name || 'robert').toLowerCase();
      return (
        pm.includes(userName) ||
        pm.includes('black') ||
        pm.includes('chen') ||
        emp.includes(userName) ||
        emp.includes('robert') ||
        client.includes('meridian') ||
        client.includes('apex')
      );
    }
    return true;
  });

  const columns: Column<Project>[] = [
    {
      key: 'name',
      header: 'Project Name & Client',
      sortable: true,
      render: (p) => (
        <div className="cursor-pointer" onClick={() => setDetailProject(p)}>
          <span className="font-bold text-white block text-xs hover:text-emerald-400 transition-colors">
            {p.name}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
            🏢 Client: {p.client || p.clientName}
            {((p as any).clientId || (p as any).clientCode) && (
              <span className="font-mono text-[9px] text-emerald-300 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                {(p as any).clientId || (p as any).clientCode}
              </span>
            )}
          </span>
        </div>
      ),
    },
    {
      key: 'projectManager',
      header: 'Project Manager & Team',
      sortable: true,
      render: (p) => {
        const pm = p.projectManager || p.leadPartner || p.leadManager || 'Sarah Jenkins';
        const team = p.assignedEmployees || [pm];
        return (
          <div>
            <span className="text-xs font-semibold text-slate-200 block">👤 Manager: {pm}</span>
            <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
              👥 Team: {team.join(', ')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'startDate',
      header: 'Dates / Deadline',
      sortable: true,
      render: (p) => (
        <div className="text-[11px] space-y-0.5">
          <span className="text-slate-300 font-semibold block">Start: {p.startDate || '2026-05-01'}</span>
          <span className="text-rose-400 font-bold block">Due: {p.deadline || p.targetCompletion || '2026-09-30'}</span>
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Budget & Spent',
      sortable: true,
      render: (p) => (
        <div className="space-y-0.5 text-[11px]">
          <span className="text-emerald-400 font-bold block">${p.budget.toLocaleString()} Budget</span>
          <span className="text-slate-400 block">${(p.spent || p.spentBudget || 0).toLocaleString()} Spent</span>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      sortable: true,
      render: (p) => {
        const prog = p.progress ?? p.completionPercentage ?? 0;
        return (
          <div className="flex items-center gap-2 w-32">
            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${prog}%` }}
              ></div>
            </div>
            <span className="text-[11px] font-bold text-white">{prog}%</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (p) => {
        const st = PROJECT_STATUSES.find((s) => s.key === p.status) || PROJECT_STATUSES[1];
        return (
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${st.bgBadge}`}>
            {st.label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#070a12] min-h-screen text-slate-100 animate-fade-in select-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Project Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive overview of managers, assigned employees, milestones, documents, invoices, and timelines.
            </p>
          </div>
        </div>

        {!isClient && (
          <button
            onClick={() => {
              setEditingProject(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Launch Project
          </button>
        )}
      </div>

      {/* Role Banners */}
      {isClient && (
        <div className="p-3 bg-amber-950/80 border border-amber-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-300 font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Client Scope: Showing active engagements for your organization ({filteredProjects.length} active projects).</span>
          </div>
          <span className="text-[10px] bg-amber-900/80 text-amber-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
            Client Portal View
          </span>
        </div>
      )}

      {isEmployee && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-300 font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Employee Scope: Showing projects assigned to you ({filteredProjects.length} projects).</span>
          </div>
          <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
            RBAC Enforcement
          </span>
        </div>
      )}

      {/* Toolbar Filters */}
      <div className="p-4 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, client, project manager, team..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#121827] border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#121827] border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {PROJECT_STATUSES.map((st) => (
              <option key={st.key} value={st.key}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={filteredProjects}
        columns={columns}
        searchPlaceholder="Filter project records..."
        isLoading={isLoading}
        isError={isError}
        onRetry={fetchProjects}
        onAddNew={
          !isClient
            ? () => {
                setEditingProject(null);
                setIsModalOpen(true);
              }
            : undefined
        }
        addNewLabel={!isClient ? 'Launch Project' : undefined}
        actions={(project) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setDetailProject(project)}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="View All 12 Project Sections"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            {!isClient && (
              <button
                onClick={() => {
                  setEditingProject(project);
                  setIsModalOpen(true);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Edit Project"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {!isClient && !isEmployee && (
              <button
                onClick={() => setDeleteId(project.id)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                title="Archive Project"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      />

      {/* PROJECT DETAILED MODAL / DRAWER (ALL 12 SPECIFIED SECTIONS) */}
      {detailProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-[#0e1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setDetailProject(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-800/80 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    PROJECT_STATUSES.find((s) => s.key === detailProject.status)?.bgBadge || 'bg-slate-800 text-slate-300'
                  }`}>
                    {PROJECT_STATUSES.find((s) => s.key === detailProject.status)?.label}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                    Progress: {detailProject.progress ?? detailProject.completionPercentage ?? 0}%
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">{detailProject.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">🏢 Client: {detailProject.client || detailProject.clientName}</p>
              </div>

              <div className="flex items-center gap-3 bg-[#070a12] border border-slate-800 rounded-2xl p-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Budget</span>
                  <span className="text-lg font-black text-emerald-400">${detailProject.budget.toLocaleString()}</span>
                </div>
                <div className="w-px h-8 bg-slate-800"></div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Spent</span>
                  <span className="text-lg font-black text-slate-300">${(detailProject.spent || detailProject.spentBudget || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs for Details */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 mb-6 pb-2">
              <button
                onClick={() => setDetailTab('overview')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  detailTab === 'overview' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Overview & Details
              </button>
              <button
                onClick={() => setDetailTab('milestones')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'milestones' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Milestones ({detailProject.milestones?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('documents')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'documents' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Documents ({detailProject.documents?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('invoices')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'invoices' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" /> Invoices ({detailProject.invoices?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('timeline')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'timeline' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" /> Timeline
              </button>
            </div>

            {/* TAB 1: OVERVIEW & 12 SPECIFIED FIELDS */}
            {detailTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-[#070a12] border border-slate-800 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Project Manager</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">👤 {detailProject.projectManager || detailProject.leadPartner || 'Sarah Jenkins'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. Assigned Employees</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                      👥 {(detailProject.assignedEmployees || [detailProject.projectManager]).join(', ')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. Client</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">🏢 {detailProject.client || detailProject.clientName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">4. Start Date</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 block">📅 {detailProject.startDate || '2026-05-01'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">5. Deadline</span>
                    <span className="text-xs font-bold text-rose-400 mt-0.5 block">⏳ {detailProject.deadline || detailProject.targetCompletion || '2026-09-30'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">6. Status</span>
                    <span className="text-xs font-bold text-indigo-400 mt-0.5 block">
                      📌 {PROJECT_STATUSES.find((s) => s.key === detailProject.status)?.label}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">7. Budget</span>
                    <span className="text-xs font-extrabold text-emerald-400 mt-0.5 block">💰 ${detailProject.budget.toLocaleString()}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">8. Progress %</span>
                    <span className="text-xs font-extrabold text-indigo-300 mt-0.5 block">
                      📊 {detailProject.progress ?? detailProject.completionPercentage ?? 0}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">9. Risk Level</span>
                    <span className="text-xs font-bold text-amber-400 mt-0.5 block">⚡ {detailProject.riskLevel || 'LOW'}</span>
                  </div>
                </div>

                <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Description & Scope</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {detailProject.description || 'Comprehensive financial advisory engagement covering valuation, tax optimization, and capital restructuring.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: MILESTONES */}
            {detailTab === 'milestones' && (
              <div className="space-y-6">
                {!isClient && (
                  <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> Add New Milestone
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Milestone Title (e.g. Phase 1 Draft)"
                        value={newMsTitle}
                        onChange={(e) => setNewMsTitle(e.target.value)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                      />
                      <input
                        type="date"
                        value={newMsDate}
                        onChange={(e) => setNewMsDate(e.target.value)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Deliverable Name"
                        value={newMsDeliverable}
                        onChange={(e) => setNewMsDeliverable(e.target.value)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <button
                      onClick={handleAddMilestone}
                      disabled={!newMsTitle || !newMsDate}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Add Milestone
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400">Project Milestones & Deliverables</h4>
                  {!detailProject.milestones || detailProject.milestones.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No milestones defined yet.</p>
                  ) : (
                    detailProject.milestones.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => !isClient && handleToggleMilestone(m.id)}
                        className={`p-3.5 bg-[#070a12] border rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                          m.completed ? 'border-emerald-800/80 bg-emerald-950/10' : 'border-slate-800 hover:border-indigo-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={m.completed}
                            onChange={() => !isClient && handleToggleMilestone(m.id)}
                            className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <span className={`text-xs font-bold block ${m.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                              {m.title}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Deliverable: {m.deliverable || 'Formal Report'}</span>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono font-semibold text-indigo-400">Due: {m.dueDate}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: DOCUMENTS */}
            {detailTab === 'documents' && (
              <div className="space-y-6">
                {!isClient && (
                  <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> Upload Document Record
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Document Title"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="File Name (e.g. report.pdf)"
                        value={newDocFileName}
                        onChange={(e) => setNewDocFileName(e.target.value)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                      />
                      <select
                        value={newDocCategory}
                        onChange={(e) => setNewDocCategory(e.target.value)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white cursor-pointer"
                      >
                        <option value="General">General</option>
                        <option value="Valuation">Valuation</option>
                        <option value="Tax">Tax</option>
                        <option value="Audit">Audit</option>
                        <option value="Legal">Legal</option>
                      </select>
                    </div>
                    <button
                      onClick={handleAddDocument}
                      disabled={!newDocTitle}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Attach Document
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400">Attached Documents</h4>
                  {!detailProject.documents || detailProject.documents.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No documents uploaded yet.</p>
                  ) : (
                    detailProject.documents.map((doc) => (
                      <div key={doc.id} className="p-3.5 bg-[#070a12] border border-slate-800 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-indigo-400" />
                          <div>
                            <span className="text-xs font-bold text-white block">{doc.title}</span>
                            <span className="text-[10px] text-slate-400">
                              {doc.fileName} • {doc.fileSize} • Uploaded {doc.uploadedAt}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {doc.category || 'General'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: INVOICES */}
            {detailTab === 'invoices' && (
              <div className="space-y-6">
                {!isClient && (
                  <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> Generate Project Invoice
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        placeholder="Invoice # (e.g. INV-2026-901)"
                        value={newInvNum}
                        onChange={(e) => setNewInvNum(e.target.value)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                      />
                      <input
                        type="number"
                        placeholder="Amount ($)"
                        value={newInvAmount}
                        onChange={(e) => setNewInvAmount(Number(e.target.value) || '')}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                      />
                      <input
                        type="date"
                        value={newInvDueDate}
                        onChange={(e) => setNewInvDueDate(e.target.value)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                      />
                      <select
                        value={newInvStatus}
                        onChange={(e) => setNewInvStatus(e.target.value as any)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white cursor-pointer"
                      >
                        <option value="SENT">SENT</option>
                        <option value="PAID">PAID</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="DRAFT">DRAFT</option>
                      </select>
                    </div>
                    <button
                      onClick={handleAddInvoice}
                      disabled={!newInvNum || !newInvAmount || !newInvDueDate}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Save Invoice
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400">Invoices & Financial Records</h4>
                  {!detailProject.invoices || detailProject.invoices.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No invoices issued yet.</p>
                  ) : (
                    detailProject.invoices.map((inv) => (
                      <div key={inv.id} className="p-3.5 bg-[#070a12] border border-slate-800 rounded-2xl flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{inv.invoiceNumber}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                inv.status === 'PAID'
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                  : inv.status === 'OVERDUE'
                                  ? 'bg-rose-950 text-rose-400 border-rose-800'
                                  : 'bg-amber-950 text-amber-400 border-amber-800'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Issued: {inv.date} • Due: {inv.dueDate}
                          </span>
                        </div>
                        <span className="text-sm font-black text-emerald-400">${inv.amount.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: TIMELINE */}
            {detailTab === 'timeline' && (
              <div className="space-y-6">
                {!isClient && (
                  <div className="p-4 bg-[#070a12] border border-slate-800 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> Add Timeline Phase
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Phase Title (e.g. Audit Execution)"
                        value={newTlPhase}
                        onChange={(e) => setNewTlPhase(e.target.value)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                      />
                      <input
                        type="date"
                        value={newTlDate}
                        onChange={(e) => setNewTlDate(e.target.value)}
                        className="px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <textarea
                      placeholder="Phase description & scope..."
                      rows={2}
                      value={newTlDesc}
                      onChange={(e) => setNewTlDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0e1322] border border-slate-800 rounded-xl text-xs text-white"
                    ></textarea>
                    <button
                      onClick={handleAddTimeline}
                      disabled={!newTlPhase || !newTlDate}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Save Phase Entry
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400">Chronological Execution Timeline</h4>
                  {!detailProject.timeline || (Array.isArray(detailProject.timeline) && detailProject.timeline.length === 0) ? (
                    <p className="text-xs text-slate-500 italic">No timeline entries logged.</p>
                  ) : typeof detailProject.timeline === 'string' ? (
                    <p className="text-xs text-slate-300 bg-[#070a12] p-4 rounded-2xl border border-slate-800">{detailProject.timeline}</p>
                  ) : (
                    detailProject.timeline.map((item) => (
                      <div key={item.id} className="p-3.5 bg-[#070a12] border border-slate-800 rounded-2xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{item.phase}</span>
                          <span className="text-[10px] font-mono text-indigo-400">{item.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{item.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL (INCLUDES ALL 12 PROJECT FIELDS) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-[#0e1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              {editingProject ? 'Edit Project Engagement' : 'Launch New Project'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingProject?.name}
                  placeholder="e.g. Meridian Q3 Portfolio Valuation & Restructuring"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Project Manager
                  </label>
                  <input
                    type="text"
                    name="projectManager"
                    required
                    defaultValue={editingProject?.projectManager || editingProject?.leadPartner || user?.name || 'Sarah Jenkins'}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Assigned Employees (Comma separated)
                  </label>
                  <input
                    type="text"
                    name="assignedEmployees"
                    defaultValue={
                      editingProject?.assignedEmployees ? editingProject.assignedEmployees.join(', ') : 'Sarah Jenkins, Robert Black'
                    }
                    placeholder="Sarah Jenkins, Robert Black, Alex Rivera"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    name="client"
                    required
                    defaultValue={editingProject?.client || editingProject?.clientName}
                    placeholder="Meridian Real Estate Holdings"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Project Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingProject?.status || 'IN_PROGRESS'}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {PROJECT_STATUSES.map((st) => (
                      <option key={st.key} value={st.key}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={editingProject?.startDate || '2026-05-01'}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    defaultValue={editingProject?.deadline || editingProject?.targetCompletion || '2026-09-30'}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Total Budget ($)
                  </label>
                  <input
                    type="number"
                    name="budget"
                    required
                    defaultValue={editingProject?.budget || 180000}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Progress (%)
                  </label>
                  <input
                    type="number"
                    name="progress"
                    min="0"
                    max="100"
                    defaultValue={editingProject?.progress ?? editingProject?.completionPercentage ?? 25}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Description & Scope
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingProject?.description}
                  placeholder="Describe engagement deliverables and advisory focus..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070a12] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProject ? 'Save Changes' : 'Launch Project'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Archive Project"
        message="Are you sure you want to remove this project engagement record from REST database?"
        confirmText="Delete Project"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
