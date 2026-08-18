import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Task, TaskStatus, TaskPriority, TaskAttachment, TaskComment, TaskActivity } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../utils/rbac';
import { DataTable, Column } from '../common/DataTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import {
  CheckSquare,
  LayoutGrid,
  Table,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Calendar,
  User,
  MessageSquare,
  Send,
  Paperclip,
  Clock,
  TrendingUp,
  History,
  FileText,
  AlertCircle,
  PauseCircle,
  XCircle,
  CheckCircle2,
  PlayCircle,
  HelpCircle,
  Upload,
  Download,
  Filter,
  Eye,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badgeColor: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  PENDING: {
    label: 'Pending',
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    icon: HelpCircle,
    description: 'Awaiting initialization or predecessor tasks',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeColor: 'bg-blue-950/90 text-blue-400 border-blue-800',
    icon: PlayCircle,
    description: 'Active execution under active analyst workflow',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    badgeColor: 'bg-purple-950/90 text-purple-400 border-purple-800',
    icon: AlertCircle,
    description: 'Submitted for CFO partner verification or audit review',
  },
  COMPLETED: {
    label: 'Completed',
    badgeColor: 'bg-emerald-950/90 text-emerald-400 border-emerald-800',
    icon: CheckCircle2,
    description: 'Deliverable finalized, approved, and delivered',
  },
  ON_HOLD: {
    label: 'On Hold',
    badgeColor: 'bg-amber-950/90 text-amber-400 border-amber-800',
    icon: PauseCircle,
    description: 'Paused pending client inputs or external data',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeColor: 'bg-rose-950/90 text-rose-400 border-rose-800',
    icon: XCircle,
    description: 'Task scope terminated or voided',
  },
  BACKLOG: {
    label: 'Backlog',
    badgeColor: 'bg-slate-900 text-slate-400 border-slate-800',
    icon: HelpCircle,
    description: 'Queued in project pipeline',
  },
  IN_REVIEW: {
    label: 'In Review',
    badgeColor: 'bg-purple-950/90 text-purple-400 border-purple-800',
    icon: AlertCircle,
    description: 'Pending executive review',
  },
};


const PRIORITY_CONFIG: Record<TaskPriority, { label: string; badgeColor: string }> = {
  LOW: { label: 'Low', badgeColor: 'bg-slate-800 text-slate-400 border-slate-700' },
  MEDIUM: { label: 'Medium', badgeColor: 'bg-blue-950 text-blue-400 border-blue-800' },
  HIGH: { label: 'High', badgeColor: 'bg-amber-950 text-amber-400 border-amber-800' },
  URGENT: { label: 'URGENT', badgeColor: 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse' },
};

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const canonicalRole = normalizeRole(user?.role);
  const isEmployee = canonicalRole === 'ROLE_EMPLOYEE';
  const isClient = canonicalRole === 'ROLE_CLIENT';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters
  const [viewTab, setViewTab] = useState<'ACTIVE' | 'COMPLETED_HISTORY' | 'ALL'>('ACTIVE');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Task Details Drawer / Modal State
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  // Form Modal State (Create / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comment & Attachment Input State
  const [newComment, setNewComment] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');

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

  const fetchTasks = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await apiService.getTasks();
      setTasks(data);
    } catch (err) {
      setIsError(true);
      addToast('error', 'REST API Error', 'Failed to fetch task items.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter tasks based on Role & Dropdowns
  const displayedTasks = tasks.filter((t) => {
    // Role filter
    if (isEmployee) {
      const assignee = (t.assignedTo || t.assignee || '').toLowerCase();
      const userName = (user?.name || 'robert').toLowerCase();
      const userEmail = (user?.email || '').toLowerCase();
      const isAssigned =
        assignee.includes(userName) ||
        assignee.includes('robert') ||
        assignee.includes('black') ||
        assignee.includes(userEmail.split('@')[0]);
      if (!isAssigned) return false;
    }

    if (isClient) {
      const clientName = (t.clientName || '').toLowerCase();
      const userEmail = (user?.email || '').toLowerCase();
      const matchesClient =
        clientName.includes('starlight') ||
        clientName.includes('bio') ||
        clientName.includes('vance') ||
        userEmail.includes('client') ||
        userEmail.includes('starlight');
      if (!matchesClient) return false;
    }

    // View Tab Filter
    if (viewTab === 'ACTIVE' && t.status === 'COMPLETED') {
      return false;
    }
    if (viewTab === 'COMPLETED_HISTORY' && t.status !== 'COMPLETED') {
      return false;
    }

    // Status Filter
    if (statusFilter !== 'ALL' && t.status !== statusFilter) {
      return false;
    }

    // Priority Filter
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  // Calculate Metrics
  const totalCount = displayedTasks.length;
  const pendingCount = displayedTasks.filter((t) => t.status === 'PENDING').length;
  const inProgressCount = displayedTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const reviewCount = displayedTasks.filter((t) => t.status === 'UNDER_REVIEW').length;
  const completedCount = displayedTasks.filter((t) => t.status === 'COMPLETED').length;
  const holdCount = displayedTasks.filter((t) => t.status === 'ON_HOLD' || t.status === 'CANCELLED').length;

  const totalEstimatedHours = displayedTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  const totalActualHours = displayedTasks.reduce((acc, t) => acc + (t.actualHours || t.loggedHours || 0), 0);

  // Status Change Handler
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const oldStatus = targetTask.status;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const actor = user?.name || 'System User';

    const newActivity: TaskActivity = {
      id: `act-${Date.now()}`,
      user: actor,
      action: `Status updated from ${STATUS_CONFIG[oldStatus]?.label || oldStatus} to ${STATUS_CONFIG[newStatus]?.label}`,
      timestamp: now,
    };

    const updatedTask: Task = {
      ...targetTask,
      status: newStatus,
      progressPercentage: newStatus === 'COMPLETED' ? 100 : targetTask.progressPercentage,
      completedAt: newStatus === 'COMPLETED' ? (targetTask.completedAt || now) : targetTask.completedAt,
      completedBy: newStatus === 'COMPLETED' ? (targetTask.completedBy || actor) : targetTask.completedBy,
      previousStatus: newStatus === 'COMPLETED' ? (targetTask.previousStatus || oldStatus) : targetTask.previousStatus,
      activityTimeline: [newActivity, ...(targetTask.activityTimeline || [])],
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    if (detailTask?.id === taskId) {
      setDetailTask(updatedTask);
    }

    try {
      await apiService.updateTask(taskId, updatedTask);
      addToast('success', 'Status Updated', `Task moved to ${STATUS_CONFIG[newStatus]?.label}`);
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? targetTask : t)));
      addToast('error', 'Update Failed', 'Could not sync status with REST backend.');
    }
  };

  // Quick Reassign Handler
  const handleReassignTask = async (taskId: string, newAssignee: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || !newAssignee) return;

    const oldAssignee = targetTask.assignedTo || targetTask.assignee || 'Unassigned';
    if (oldAssignee === newAssignee) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const actor = user?.name || 'Manager';

    const newActivity: TaskActivity = {
      id: `act-${Date.now()}`,
      user: actor,
      action: `Task reassigned from ${oldAssignee} to ${newAssignee}`,
      timestamp: now,
    };

    const updatedTask: Task = {
      ...targetTask,
      assignedTo: newAssignee,
      activityTimeline: [newActivity, ...(targetTask.activityTimeline || [])],
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    if (detailTask?.id === taskId) {
      setDetailTask(updatedTask);
    }

    try {
      await apiService.updateTask(taskId, updatedTask);
      addToast('success', 'Task Reassigned', `Assigned to ${newAssignee}`);
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? targetTask : t)));
      addToast('error', 'Reassignment Failed', 'Could not sync task reassignment.');
    }
  };

  // Quick Priority Change Handler
  const handlePriorityChange = async (taskId: string, newPriority: TaskPriority) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const actor = user?.name || 'Manager';

    const newActivity: TaskActivity = {
      id: `act-${Date.now()}`,
      user: actor,
      action: `Priority updated to ${PRIORITY_CONFIG[newPriority]?.label}`,
      timestamp: now,
    };

    const updatedTask: Task = {
      ...targetTask,
      priority: newPriority,
      activityTimeline: [newActivity, ...(targetTask.activityTimeline || [])],
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    if (detailTask?.id === taskId) setDetailTask(updatedTask);

    try {
      await apiService.updateTask(taskId, updatedTask);
      addToast('success', 'Priority Updated', `Set to ${PRIORITY_CONFIG[newPriority]?.label}`);
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? targetTask : t)));
      addToast('error', 'Update Failed', 'Could not update task priority.');
    }
  };

  // Quick Deadline Change Handler
  const handleDeadlineChange = async (taskId: string, newDueDate: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || !newDueDate) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const actor = user?.name || 'Manager';

    const newActivity: TaskActivity = {
      id: `act-${Date.now()}`,
      user: actor,
      action: `Deadline changed from ${targetTask.dueDate} to ${newDueDate}`,
      timestamp: now,
    };

    const updatedTask: Task = {
      ...targetTask,
      dueDate: newDueDate,
      activityTimeline: [newActivity, ...(targetTask.activityTimeline || [])],
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    if (detailTask?.id === taskId) setDetailTask(updatedTask);

    try {
      await apiService.updateTask(taskId, updatedTask);
      addToast('success', 'Deadline Set', `Due date updated to ${newDueDate}`);
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? targetTask : t)));
      addToast('error', 'Update Failed', 'Could not update deadline.');
    }
  };

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const actor = user?.name || 'Sarah Jenkins';

    const taskData: Partial<Task> = {
      title: String(formData.get('title')),
      description: String(formData.get('description')),
      priority: (formData.get('priority') as TaskPriority) || 'MEDIUM',
      status: (formData.get('status') as TaskStatus) || 'PENDING',
      assignedBy: String(formData.get('assignedBy') || actor),
      assignedTo: String(formData.get('assignedTo') || 'Robert Black'),
      startDate: String(formData.get('startDate') || '2026-08-01'),
      dueDate: String(formData.get('dueDate') || '2026-08-15'),
      estimatedHours: Number(formData.get('estimatedHours')) || 10,
      actualHours: Number(formData.get('actualHours')) || 0,
      progressPercentage: Number(formData.get('progressPercentage')) || 0,
      projectName: String(formData.get('projectName') || 'General CFO Advisory'),
      clientName: String(formData.get('clientName') || 'Archicorp Portfolio'),
      category: String(formData.get('category') || 'Advisory'),
    };

    try {
      if (editingTask) {
        const newActivity: TaskActivity = {
          id: `act-${Date.now()}`,
          user: actor,
          action: 'Updated task parameters and budget hours',
          timestamp: now,
        };
        const updatedPayload = {
          ...editingTask,
          ...taskData,
          activityTimeline: [newActivity, ...(editingTask.activityTimeline || [])],
        };

        const updated = await apiService.updateTask(editingTask.id, updatedPayload);
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
        if (detailTask?.id === editingTask.id) setDetailTask(updated);
        addToast('success', 'Task Saved', `${taskData.title} updated successfully.`);
      } else {
        const created = await apiService.createTask(taskData);
        setTasks((prev) => [created, ...prev]);
        addToast('success', 'Task Created', `${taskData.title} added to task board.`);
      }
      setIsFormOpen(false);
      setEditingTask(null);
    } catch (err) {
      addToast('error', 'Operation Failed', 'Could not save task record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Comment Add Handler
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTask || !newComment.trim()) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const actor = user?.name || 'Sarah Jenkins';

    const newCmt: TaskComment = {
      id: `cmt-${Date.now()}`,
      author: actor,
      text: newComment.trim(),
      date: now,
    };

    const newAct: TaskActivity = {
      id: `act-${Date.now()}`,
      user: actor,
      action: `Added comment: "${newComment.trim().substring(0, 40)}..."`,
      timestamp: now,
    };

    const updatedTask: Task = {
      ...detailTask,
      comments: [...(detailTask.comments || []), newCmt],
      activityTimeline: [newAct, ...(detailTask.activityTimeline || [])],
    };

    setDetailTask(updatedTask);
    setTasks((prev) => prev.map((t) => (t.id === detailTask.id ? updatedTask : t)));
    setNewComment('');

    try {
      await apiService.updateTask(detailTask.id, updatedTask);
      addToast('success', 'Comment Posted', 'Work note logged on task thread.');
    } catch (err) {
      addToast('error', 'Comment Error', 'Failed to persist comment.');
    }
  };

  // Attachment Add Handler
  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTask || !uploadFileName.trim()) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const actor = user?.name || 'Sarah Jenkins';

    const newAtt: TaskAttachment = {
      id: `att-${Date.now()}`,
      name: uploadFileName.trim(),
      fileSize: '2.4 MB',
      fileType: uploadFileName.split('.').pop() || 'pdf',
      uploadedAt: now,
    };

    const newAct: TaskActivity = {
      id: `act-${Date.now()}`,
      user: actor,
      action: `Uploaded attachment: ${uploadFileName.trim()}`,
      timestamp: now,
    };

    const updatedTask: Task = {
      ...detailTask,
      attachments: [...(detailTask.attachments || []), newAtt],
      activityTimeline: [newAct, ...(detailTask.activityTimeline || [])],
    };

    setDetailTask(updatedTask);
    setTasks((prev) => prev.map((t) => (t.id === detailTask.id ? updatedTask : t)));
    setUploadFileName('');

    try {
      await apiService.updateTask(detailTask.id, updatedTask);
      addToast('success', 'File Uploaded', `${newAtt.name} attached to task.`);
    } catch (err) {
      addToast('error', 'Upload Error', 'Failed to attach file.');
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    if (isEmployee || isClient) {
      addToast('error', 'Action Restricted', 'You do not have permission to delete task records.');
      setDeleteId(null);
      return;
    }
    setIsDeleting(true);
    try {
      await apiService.deleteTask(deleteId);
      setTasks((prev) => prev.filter((t) => t.id !== deleteId));
      if (detailTask?.id === deleteId) setDetailTask(null);
      addToast('success', 'Task Removed', 'Task deleted successfully.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Failed to remove task from server.');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Table Columns
  const columns: Column<Task>[] = [
    {
      key: 'title',
      header: 'Task & Engagement',
      sortable: true,
      render: (t) => (
        <div>
          <button
            onClick={() => setDetailTask(t)}
            className="font-bold text-white hover:text-emerald-400 text-xs text-left block tracking-tight transition-colors"
          >
            {t.title}
          </button>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
            <span>{t.projectName}</span>
            {t.clientName && <span className="text-slate-500">• {t.clientName}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (t) => {
        const conf = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
        const Icon = conf.icon;
        return (
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 w-fit ${conf.badgeColor}`}>
            <Icon className="w-3 h-3" />
            <span>{conf.label}</span>
          </span>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (t) => {
        const pConf = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.MEDIUM;
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${pConf.badgeColor}`}>{pConf.label}</span>;
      },
    },
    {
      key: 'assignedTo',
      header: 'Assigned To / By',
      sortable: true,
      render: (t) => (
        <div className="text-[11px]">
          <span className="text-slate-200 font-semibold block">{t.assignedTo || t.assignee || 'Unassigned'}</span>
          <span className="text-[10px] text-slate-500 block">By: {t.assignedBy || 'Partner'}</span>
        </div>
      ),
    },
    {
      key: 'progressPercentage',
      header: 'Progress',
      sortable: true,
      render: (t) => {
        const prog = t.progressPercentage ?? (t.status === 'COMPLETED' ? 100 : 0);
        return (
          <div className="w-28 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>{prog}%</span>
              <span>
                {t.actualHours || t.loggedHours || 0}/{t.estimatedHours || 0}h
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  prog === 100 ? 'bg-emerald-500' : prog > 50 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, prog))}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Timeline',
      sortable: true,
      render: (t) => (
        <div className="text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>Due: {t.dueDate}</span>
          </div>
          {t.startDate && <div className="text-slate-500 text-[9px]">Start: {t.startDate}</div>}
        </div>
      ),
    },
    {
      key: 'completedAt',
      header: 'Completion Audit',
      sortable: true,
      render: (t) => {
        if (t.status === 'COMPLETED' || t.completedAt) {
          return (
            <div className="text-[10px] space-y-0.5">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                {t.completedAt || 'Completed'}
              </span>
              <span className="text-slate-400 block">
                By: {t.completedBy || t.assignedTo || 'Staff'}
              </span>
              {t.previousStatus && (
                <span className="text-[9px] text-slate-500 block">
                  Was: {STATUS_CONFIG[t.previousStatus]?.label || t.previousStatus}
                </span>
              )}
            </div>
          );
        }
        return <span className="text-[10px] text-slate-500 font-mono">—</span>;
      },
    },
  ];

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <CheckSquare className="w-6 h-6 text-emerald-400" /> Deliverables & Task Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Multi-status task board with progress metrics, actual vs estimated hours tracking, attachment vault, and activity audit timeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isClient && (
            <button
              onClick={() => {
                setEditingTask(null);
                setIsFormOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Task
            </button>
          )}
        </div>
      </div>

      {/* Role Banner */}
      {isEmployee && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-300 font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Employee Scope: Displaying tasks assigned to you ({displayedTasks.length} tasks). Progress & hours tracking active.</span>
          </div>
          <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
            Assigned Tasks Only
          </span>
        </div>
      )}

      {isClient && (
        <div className="p-3 bg-amber-950/80 border border-amber-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-300 font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Client Scope: Showing project milestone deliverables for your account ({displayedTasks.length} tasks).</span>
          </div>
          <span className="text-[10px] bg-amber-900 text-amber-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
            Client View Mode
          </span>
        </div>
      )}

      {/* KPI Overview Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tasks</span>
          <p className="text-xl font-black text-white mt-1">{totalCount}</p>
          <span className="text-[9px] text-slate-500 block mt-0.5">All tracked tasks</span>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
          <p className="text-xl font-black text-slate-300 mt-1">{pendingCount}</p>
          <span className="text-[9px] text-slate-500 block mt-0.5">Queue / backlog</span>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">In Progress</span>
          <p className="text-xl font-black text-blue-400 mt-1">{inProgressCount}</p>
          <span className="text-[9px] text-slate-500 block mt-0.5">Active execution</span>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Under Review</span>
          <p className="text-xl font-black text-purple-400 mt-1">{reviewCount}</p>
          <span className="text-[9px] text-slate-500 block mt-0.5">Audit & quality review</span>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Completed</span>
          <p className="text-xl font-black text-emerald-400 mt-1">{completedCount}</p>
          <span className="text-[9px] text-slate-500 block mt-0.5">Deliverables finalized</span>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Hours Utilization</span>
          <p className="text-xl font-black text-amber-400 mt-1">
            {totalActualHours}/{totalEstimatedHours}h
          </p>
          <span className="text-[9px] text-slate-500 block mt-0.5">
            {totalEstimatedHours > 0 ? Math.round((totalActualHours / totalEstimatedHours) * 100) : 0}% budget used
          </span>
        </div>
      </div>

      {/* View Mode Tabs (Active Tasks vs Completed History vs All) */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setViewTab('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            viewTab === 'ACTIVE'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <PlayCircle className="w-4 h-4 text-emerald-300" />
          <span>Active Tasks ({tasks.filter((t) => t.status !== 'COMPLETED').length})</span>
        </button>

        <button
          onClick={() => setViewTab('COMPLETED_HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            viewTab === 'COMPLETED_HISTORY'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-amber-300" />
          <span>Completed Task History ({tasks.filter((t) => t.status === 'COMPLETED').length})</span>
        </button>

        <button
          onClick={() => setViewTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            viewTab === 'ALL'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Table className="w-4 h-4 text-blue-300" />
          <span>All Tasks Vault ({tasks.length})</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Filter className="w-3.5 h-3.5 text-emerald-400" /> Filter:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Statuses ({tasks.length})</option>
            <option value="PENDING">Pending ({tasks.filter((t) => t.status === 'PENDING').length})</option>
            <option value="IN_PROGRESS">In Progress ({tasks.filter((t) => t.status === 'IN_PROGRESS').length})</option>
            <option value="UNDER_REVIEW">Under Review ({tasks.filter((t) => t.status === 'UNDER_REVIEW').length})</option>
            <option value="COMPLETED">Completed ({tasks.filter((t) => t.status === 'COMPLETED').length})</option>
            <option value="ON_HOLD">On Hold ({tasks.filter((t) => t.status === 'ON_HOLD').length})</option>
            <option value="CANCELLED">Cancelled ({tasks.filter((t) => t.status === 'CANCELLED').length})</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="URGENT">URGENT Priority</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-semibold">
          Showing <strong className="text-white">{displayedTasks.length}</strong> of {tasks.length} tasks
        </span>
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        data={displayedTasks}
        columns={columns}
        searchPlaceholder="Search tasks by title, project, assignee..."
        isLoading={isLoading}
        isError={isError}
        onRetry={fetchTasks}
        onAddNew={
          !isClient
            ? () => {
                setEditingTask(null);
                setIsFormOpen(true);
              }
            : undefined
        }
        addNewLabel={!isClient ? 'Create Task' : undefined}
        actions={(task) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setDetailTask(task)}
              title="View Full Task Workspace"
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition-colors flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            {!isClient && (
              <button
                onClick={() => {
                  setEditingTask(task);
                  setIsFormOpen(true);
                }}
                title="Edit Task Parameters"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {!isEmployee && !isClient && (
              <button
                onClick={() => setDeleteId(task.id)}
                title="Delete Task"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      />

      {/* COMPREHENSIVE TASK DETAIL WORKSPACE DRAWER / MODAL */}
      {detailTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${STATUS_CONFIG[detailTask.status]?.badgeColor}`}>
                    {STATUS_CONFIG[detailTask.status]?.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${PRIORITY_CONFIG[detailTask.priority]?.badgeColor}`}>
                    {PRIORITY_CONFIG[detailTask.priority]?.label} Priority
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">• {detailTask.category || 'Financial Advisory'}</span>
                </div>
                <h2 className="text-lg font-black text-white tracking-tight">{detailTask.title}</h2>
                <p className="text-xs text-slate-400 font-medium">
                  Project: <strong className="text-slate-200">{detailTask.projectName}</strong>
                  {detailTask.clientName && <span> ({detailTask.clientName})</span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isClient && (
                  <button
                    onClick={() => {
                      setEditingTask(detailTask);
                      setIsFormOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Parameters
                  </button>
                )}
                <button
                  onClick={() => setDetailTask(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 custom-scrollbar">
              {/* Left 2 Columns: Description, Progress, Attachments, Comments */}
              <div className="lg:col-span-2 space-y-6">
                {/* Permanent Completion Record Banner */}
                {(detailTask.status === 'COMPLETED' || detailTask.completedAt) && (
                  <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Permanent Database Completion Audit Record
                      </h3>
                      <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        Archived In DB
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-emerald-900/50">
                        <span className="text-[10px] text-slate-400 font-semibold block">Completed At</span>
                        <strong className="text-emerald-300 font-mono mt-0.5 block">{detailTask.completedAt || 'Recorded'}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-emerald-900/50">
                        <span className="text-[10px] text-slate-400 font-semibold block">Completed By</span>
                        <strong className="text-white font-semibold mt-0.5 block">{detailTask.completedBy || detailTask.assignedTo || 'Staff'}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-emerald-900/50">
                        <span className="text-[10px] text-slate-400 font-semibold block">Previous Status</span>
                        <strong className="text-slate-300 font-semibold mt-0.5 block">
                          {detailTask.previousStatus ? (STATUS_CONFIG[detailTask.previousStatus]?.label || detailTask.previousStatus) : 'IN_PROGRESS'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Task Description */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" /> Task Scope & Instructions
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {detailTask.description || 'No detailed scope description provided.'}
                  </p>
                </div>

                {/* Progress & Hours Tracker */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-400" /> Completion Progress & Hours
                    </h3>
                    <span className="text-xs font-bold text-emerald-400">
                      {detailTask.progressPercentage ?? (detailTask.status === 'COMPLETED' ? 100 : 0)}% Completed
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, detailTask.progressPercentage ?? (detailTask.status === 'COMPLETED' ? 100 : 0)))}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block">Estimated Budget</span>
                      <span className="font-bold text-white mt-0.5 block">{detailTask.estimatedHours || 0} Hours</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block">Actual Hours Logged</span>
                      <span className="font-bold text-blue-400 mt-0.5 block">
                        {detailTask.actualHours || detailTask.loggedHours || 0} Hours
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">Budget Variance</span>
                      <span className="font-bold text-amber-400 mt-0.5 block">
                        {(detailTask.estimatedHours || 0) - (detailTask.actualHours || detailTask.loggedHours || 0)} Hours Rem.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-purple-400" /> Deliverable Attachments ({detailTask.attachments?.length || 0})
                    </h3>
                  </div>

                  {(!detailTask.attachments || detailTask.attachments.length === 0) ? (
                    <p className="text-xs text-slate-500 py-2">No file attachments linked to this task.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailTask.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-300 font-bold uppercase text-[10px]">
                              {att.fileType || 'file'}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{att.name}</span>
                              <span className="text-[10px] text-slate-500">
                                {att.fileSize} • Uploaded {att.uploadedAt}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => addToast('info', 'Download Started', `Downloading ${att.name}`)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Attachment Form */}
                  <form onSubmit={handleAddAttachment} className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={uploadFileName}
                      onChange={(e) => setUploadFileName(e.target.value)}
                      placeholder="e.g. DCF_Valuation_Audit_Report_v3.pdf"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={!uploadFileName.trim()}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Upload File
                    </button>
                  </form>
                </div>

                {/* Comments Thread */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-400" /> Collaboration Work Notes ({detailTask.comments?.length || 0})
                  </h3>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {(!detailTask.comments || detailTask.comments.length === 0) ? (
                      <p className="text-xs text-slate-500 py-2">No comments posted on this task yet.</p>
                    ) : (
                      detailTask.comments.map((cmt) => (
                        <div key={cmt.id} className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-indigo-300">{cmt.author}</span>
                            <span className="text-slate-500">{cmt.date}</span>
                          </div>
                          <p className="text-xs text-slate-300 font-normal leading-relaxed">{cmt.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Post a comment or technical update..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" /> Post
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Metadata Sidebar & Activity Timeline */}
              <div className="space-y-6">
                {/* Task Metadata Box */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3.5 text-xs">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
                    Manager Controls & Assignment
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Assigned By</span>
                      <span className="font-bold text-white block">{detailTask.assignedBy || 'Sarah Jenkins'}</span>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Reassign Task (Assigned To)
                      </label>
                      <select
                        value={detailTask.assignedTo || detailTask.assignee || 'Robert Black'}
                        onChange={(e) => handleReassignTask(detailTask.id, e.target.value)}
                        disabled={isClient}
                        className="w-full text-xs font-bold bg-slate-900 border border-slate-800 text-emerald-400 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                      >
                        <option value="Jessica Taylor">Jessica Taylor (Senior Audit Associate)</option>
                        <option value="David Miller">David Miller (M&A Specialist)</option>
                        <option value="Robert Black">Robert Black (Senior Deal Advisor)</option>
                        <option value="Michael Chen">Michael Chen (Audit & Valuation Director)</option>
                        <option value="Sarah Jenkins">Sarah Jenkins (Managing Partner)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1">Set Priority</label>
                        <select
                          value={detailTask.priority}
                          onChange={(e) => handlePriorityChange(detailTask.id, e.target.value as TaskPriority)}
                          disabled={isClient}
                          className="w-full text-xs font-bold bg-slate-900 border border-slate-800 text-white rounded-xl px-2 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">URGENT</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1">Set Deadline</label>
                        <input
                          type="date"
                          value={detailTask.dueDate}
                          onChange={(e) => handleDeadlineChange(detailTask.id, e.target.value)}
                          disabled={isClient}
                          className="w-full text-xs font-bold bg-slate-900 border border-slate-800 text-amber-400 rounded-xl px-2 py-1 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold block">Change Status</span>
                    <select
                      value={detailTask.status}
                      onChange={(e) => handleStatusChange(detailTask.id, e.target.value as TaskStatus)}
                      className="w-full text-xs font-bold bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {(['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] as TaskStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_CONFIG[s].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Activity Timeline Audit Log */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-amber-400" /> Activity Timeline
                  </h3>

                  <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800 pl-5">
                    {(!detailTask.activityTimeline || detailTask.activityTimeline.length === 0) ? (
                      <p className="text-xs text-slate-500">No activity logged.</p>
                    ) : (
                      detailTask.activityTimeline.map((act) => (
                        <div key={act.id} className="relative text-[11px] space-y-0.5">
                          <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-emerald-400 shadow-md" />
                          <div className="flex items-center justify-between text-[9px] text-slate-500">
                            <span className="font-bold text-slate-300">{act.user}</span>
                            <span>{act.timestamp}</span>
                          </div>
                          <p className="text-slate-400 font-medium">{act.action}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TASK FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">
              {editingTask ? 'Edit Task Parameters' : 'Create New Deliverable Task'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingTask?.title}
                  placeholder="e.g. Finalize Q3 Portfolio DCF Valuation Model"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Detailed Task Scope & Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingTask?.description}
                  placeholder="Provide scope, modeling assumptions, or audit guidelines..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Engagement Project Name</label>
                  <input
                    type="text"
                    name="projectName"
                    required
                    defaultValue={editingTask?.projectName || ''}
                    placeholder="e.g. Portfolio Valuation & Restructuring"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client Organization Name</label>
                  <input
                    type="text"
                    name="clientName"
                    defaultValue={editingTask?.clientName || ''}
                    placeholder="e.g. Client Organization Name"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned By</label>
                  <select
                    name="assignedBy"
                    defaultValue={editingTask?.assignedBy || user?.name || 'Sarah Jenkins'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Sarah Jenkins">Sarah Jenkins (Managing Partner)</option>
                    <option value="Michael Chen">Michael Chen (Audit & Valuation Director)</option>
                    <option value="Robert Black">Robert Black (Senior Deal Advisor)</option>
                    <option value="Jessica Taylor">Jessica Taylor (Senior Audit Associate)</option>
                    <option value="David Miller">David Miller (M&A Specialist)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned To (Assign / Reassign) *</label>
                  <select
                    name="assignedTo"
                    required
                    defaultValue={editingTask?.assignedTo || editingTask?.assignee || 'Robert Black'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Jessica Taylor">Jessica Taylor (Senior Audit Associate)</option>
                    <option value="David Miller">David Miller (M&A Specialist)</option>
                    <option value="Robert Black">Robert Black (Senior Deal Advisor)</option>
                    <option value="Michael Chen">Michael Chen (Audit & Valuation Director)</option>
                    <option value="Sarah Jenkins">Sarah Jenkins (Managing Partner)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task Priority</label>
                  <select
                    name="priority"
                    defaultValue={editingTask?.priority || 'MEDIUM'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">URGENT Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task Status</label>
                  <select
                    name="status"
                    defaultValue={editingTask?.status || 'PENDING'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={editingTask?.startDate || '2026-08-01'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date *</label>
                  <input
                    type="date"
                    name="dueDate"
                    required
                    defaultValue={editingTask?.dueDate || '2026-08-15'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Est. Hours</label>
                  <input
                    type="number"
                    name="estimatedHours"
                    min={0}
                    defaultValue={editingTask?.estimatedHours ?? 20}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Actual Hours</label>
                  <input
                    type="number"
                    name="actualHours"
                    min={0}
                    defaultValue={editingTask?.actualHours ?? editingTask?.loggedHours ?? 0}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Progress (%)</label>
                  <input
                    type="number"
                    name="progressPercentage"
                    min={0}
                    max={100}
                    defaultValue={editingTask?.progressPercentage ?? 0}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Delete Task"
        message="Are you sure you want to delete this task record from the database?"
        confirmText="Delete Task"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
