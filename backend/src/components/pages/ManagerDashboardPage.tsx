import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { User, Task, Project, ActivityItem } from '../../types';
import {
  Users,
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Briefcase,
  Calendar,
  Activity,
  TrendingUp,
  UserCheck,
  Search,
  ChevronRight,
  Shield,
  Layers,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ManagerDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters & State
  const [employeeSearch, setEmployeeSearch] = useState<string>('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('ALL');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('ALL');

  const fetchDashboardData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [usersData, tasksData, projectsData, activitiesData] = await Promise.all([
        apiService.getUsers(),
        apiService.getTasks(),
        apiService.getProjects(),
        apiService.getActivities(),
      ]);

      setUsers(usersData);
      setTasks(tasksData);
      setProjects(projectsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load Manager Dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter out client users to get actual firm employees
  const employees = users.filter(
    (u) =>
      u.role !== 'ROLE_CLIENT' &&
      u.role !== 'CLIENT' &&
      !u.email.includes('starlightbio') &&
      !u.title?.toLowerCase().includes('client')
  );

  const todayStr = new Date().toISOString().split('T')[0];

  // Key Managerial Metrics Calculations
  const totalEmployeesCount = employees.length;
  const totalTasksAssignedCount = tasks.length;
  const tasksCompletedCount = tasks.filter(
    (t) => t.status === 'COMPLETED' || (t.status as string) === 'DONE'
  ).length;

  const pendingTasksCount = tasks.filter(
    (t) =>
      t.status === 'PENDING' ||
      t.status === 'IN_PROGRESS' ||
      t.status === 'UNDER_REVIEW' ||
      (t.status as string) === 'REVIEW' ||
      t.status === 'ON_HOLD'
  ).length;

  const overdueTasksList = tasks.filter((t) => {
    const isFinished = t.status === 'COMPLETED' || (t.status as string) === 'DONE' || t.status === 'CANCELLED';
    if (isFinished) return false;
    return t.dueDate < todayStr;
  });
  const overdueTasksCount = overdueTasksList.length;

  // Calculate Employee Workload Statistics
  const employeeWorkloads = employees.map((emp) => {
    const empTasks = tasks.filter((t) => {
      const assigned = (t.assignedTo || t.assignee || '').toLowerCase();
      const name = emp.name.toLowerCase();
      const lastName = emp.name.split(' ').pop()?.toLowerCase() || '';
      return assigned.includes(name) || (lastName && assigned.includes(lastName));
    });

    const completed = empTasks.filter(
      (t) => t.status === 'COMPLETED' || (t.status as string) === 'DONE'
    ).length;

    const inProgress = empTasks.filter(
      (t) => t.status === 'IN_PROGRESS' || t.status === 'UNDER_REVIEW' || (t.status as string) === 'REVIEW'
    ).length;

    const pending = empTasks.filter((t) => t.status === 'PENDING' || t.status === 'ON_HOLD').length;

    const overdue = empTasks.filter((t) => {
      const isFinished = t.status === 'COMPLETED' || (t.status as string) === 'DONE' || t.status === 'CANCELLED';
      if (isFinished) return false;
      return t.dueDate < todayStr;
    }).length;

    const estHours = empTasks.reduce((acc, t) => acc + (t.estimatedHours || 10), 0);
    const actHours = empTasks.reduce((acc, t) => acc + (t.actualHours || t.loggedHours || 0), 0);

    // Calculate capacity workload percentage (based on standard 40h capacity)
    const utilizationPct = estHours > 0 ? Math.min(100, Math.round((actHours / estHours) * 100)) : 0;

    let capacityBadge = { label: 'Optimal', color: 'bg-emerald-950/90 text-emerald-400 border-emerald-800' };
    if (empTasks.length === 0) {
      capacityBadge = { label: 'Available', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    } else if (overdue > 0 || estHours > 40) {
      capacityBadge = { label: 'Overloaded', color: 'bg-rose-950/90 text-rose-400 border-rose-800' };
    } else if (inProgress >= 3) {
      capacityBadge = { label: 'High Load', color: 'bg-amber-950/90 text-amber-400 border-amber-800' };
    }

    return {
      user: emp,
      totalTasks: empTasks.length,
      completed,
      inProgress,
      pending,
      overdue,
      estHours,
      actHours,
      utilizationPct,
      capacityBadge,
      tasks: empTasks,
    };
  });

  const filteredWorkloads = employeeWorkloads.filter(
    (w) =>
      w.user.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      w.user.department?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      w.user.title?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // Filtered Projects for Project Progress
  const filteredProjects = projects.filter((p) => {
    if (projectStatusFilter === 'ALL') return true;
    return p.status === projectStatusFilter;
  });

  // Calculate Upcoming Deadlines (Combined Tasks & Projects)
  const allDeadlines = [
    ...tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: 'TASK' as const,
      dueDate: t.dueDate,
      assigneeOrLead: t.assignedTo || t.assignee || 'Unassigned',
      clientOrProject: t.projectName || t.clientName || 'General Advisory',
      status: t.status,
      priority: t.priority,
      isCompleted: t.status === 'COMPLETED' || (t.status as string) === 'DONE',
    })),
    ...projects.map((p) => ({
      id: p.id,
      title: p.name,
      type: 'PROJECT' as const,
      dueDate: p.targetCompletion,
      assigneeOrLead: p.leadPartner || 'Senior Lead',
      clientOrProject: p.clientName,
      status: p.status,
      priority: (p.riskLevel === 'HIGH' ? 'URGENT' : p.riskLevel === 'MEDIUM' ? 'HIGH' : 'MEDIUM') as any,
      isCompleted: p.status === 'COMPLETED',
    })),
  ]
    .filter((d) => !d.isCompleted)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const filteredDeadlines = allDeadlines.filter((d) => {
    if (deadlineFilter === 'OVERDUE') return d.dueDate < todayStr;
    if (deadlineFilter === 'THIS_WEEK') {
      const dueTime = new Date(d.dueDate).getTime();
      const todayTime = new Date(todayStr).getTime();
      const weekTime = todayTime + 7 * 24 * 60 * 60 * 1000;
      return dueTime >= todayTime && dueTime <= weekTime;
    }
    return true;
  });

  const getDaysDiffLabel = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const today = new Date(todayStr);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`, color: 'bg-rose-950 text-rose-400 border-rose-800' };
    } else if (diffDays === 0) {
      return { text: 'Due Today', color: 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse' };
    } else if (diffDays === 1) {
      return { text: 'Due Tomorrow', color: 'bg-amber-900/80 text-amber-300 border-amber-700' };
    } else {
      return { text: `Due in ${diffDays} days`, color: 'bg-blue-950 text-blue-400 border-blue-800' };
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 bg-[#070a12] min-h-screen text-slate-100 animate-pulse">
        <div className="h-28 bg-slate-900 rounded-3xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-900 rounded-2xl"></div>
          <div className="h-80 bg-slate-900 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#070a12] min-h-screen text-slate-100 animate-fade-in select-none">
      {/* Manager Header Box */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#111827] via-[#0f172a] to-[#0b0f19] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-950/90 text-purple-300 border border-purple-800/80 flex items-center gap-1">
              <Shield className="w-3 h-3 text-purple-400" /> Executive Oversight
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">• Real-time Team Metrics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Manager Control Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Monitor team resources, employee workload distribution, project progress health, upcoming deliverable deadlines, and audit activity logs.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live Data</span>
          </button>

          <button
            onClick={() => navigate('/tasks')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 flex items-center gap-2 transition-all cursor-pointer"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Task Kanban</span>
          </button>
        </div>
      </div>

      {/* 5 KEY KPI METRIC CARDS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Employees */}
        <div className="p-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col justify-between hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Employees</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-3 tracking-tight">{totalEmployeesCount}</p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
            <span className="text-slate-400 font-medium">Active Consultants</span>
            <button onClick={() => navigate('/users')} className="text-indigo-400 font-bold hover:underline flex items-center gap-0.5">
              Directory &gt;
            </button>
          </div>
        </div>

        {/* Tasks Assigned */}
        <div className="p-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col justify-between hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tasks Assigned</span>
            <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-800/80 text-blue-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-3 tracking-tight">{totalTasksAssignedCount}</p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
            <span className="text-slate-400 font-medium">Across all engagements</span>
            <span className="text-blue-400 font-bold">100% tracked</span>
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="p-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Tasks Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-3 tracking-tight">{tasksCompletedCount}</p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
            <span className="text-slate-400 font-medium">
              {totalTasksAssignedCount > 0
                ? Math.round((tasksCompletedCount / totalTasksAssignedCount) * 100)
                : 0}
              % completion rate
            </span>
            <span className="text-emerald-400 font-bold">Verified</span>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="p-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col justify-between hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pending Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400 mt-3 tracking-tight">{pendingTasksCount}</p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
            <span className="text-slate-400 font-medium">Active queue</span>
            <button onClick={() => navigate('/tasks')} className="text-amber-400 font-bold hover:underline flex items-center gap-0.5">
              Board &gt;
            </button>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="p-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col justify-between hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Overdue Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-400 mt-3 tracking-tight">{overdueTasksCount}</p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
            <span className="text-slate-400 font-medium">Requires partner attention</span>
            <span className="text-rose-400 font-bold">{overdueTasksCount > 0 ? 'Action Needed' : 'Clean'}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: EMPLOYEE WORKLOAD OVERVIEW */}
      <div className="p-6 bg-[#0e1322] border border-slate-800/90 rounded-3xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" /> Employee Workload & Capacity Utilization
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual employee task allocations, logged hours against budget, and capacity workload status.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Search employee or department..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 placeholder-slate-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkloads.map((wl) => (
            <div
              key={wl.user.id}
              className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              {/* Employee Card Top */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={wl.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={wl.user.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700/80 shrink-0"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">{wl.user.name}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{wl.user.title}</p>
                    <span className="text-[9px] text-indigo-400 font-semibold">{wl.user.department}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${wl.capacityBadge.color}`}>
                  {wl.capacityBadge.label}
                </span>
              </div>

              {/* Task Breakdown Stats Pills */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] p-2 bg-slate-900/90 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block font-semibold">Total</span>
                  <span className="font-extrabold text-white mt-0.5 block">{wl.totalTasks}</span>
                </div>
                <div>
                  <span className="text-blue-400 block font-semibold">Active</span>
                  <span className="font-extrabold text-blue-400 mt-0.5 block">{wl.inProgress}</span>
                </div>
                <div>
                  <span className="text-emerald-400 block font-semibold">Done</span>
                  <span className="font-extrabold text-emerald-400 mt-0.5 block">{wl.completed}</span>
                </div>
                <div>
                  <span className="text-rose-400 block font-semibold">Overdue</span>
                  <span className="font-extrabold text-rose-400 mt-0.5 block">{wl.overdue}</span>
                </div>
              </div>

              {/* Logged Hours Utilization Progress Bar */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400">Capacity & Hours Logged</span>
                  <span className="text-slate-200">
                    {wl.actHours} / {wl.estHours}h ({wl.utilizationPct}%)
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      wl.utilizationPct > 90 ? 'bg-rose-500' : wl.utilizationPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, wl.utilizationPct))}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2 & 3 SPLIT: PROJECT PROGRESS & UPCOMING DEADLINES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): PROJECT PROGRESS */}
        <div className="lg:col-span-7 bg-[#0e1322] border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" /> Project Progress & Health Tracking
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Active engagement completion percentages and budget utilization</p>
            </div>

            <select
              value={projectStatusFilter}
              onChange={(e) => setProjectStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Projects</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="PLANNING">Planning</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredProjects.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-8">No projects matching criteria</div>
            ) : (
              filteredProjects.map((p) => {
                const isComplete = p.status === 'COMPLETED';
                const completion = p.completionPercentage ?? (isComplete ? 100 : 50);

                return (
                  <div
                    key={p.id}
                    className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 hover:border-blue-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-tight">{p.name}</h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Client: <strong className="text-slate-200">{p.clientName}</strong> • Lead: {p.leadPartner}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                            isComplete
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-blue-950 text-blue-400 border-blue-800'
                          }`}
                        >
                          {p.status}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                            p.riskLevel === 'HIGH'
                              ? 'bg-rose-950 text-rose-400 border-rose-800'
                              : p.riskLevel === 'MEDIUM'
                              ? 'bg-amber-950 text-amber-400 border-amber-800'
                              : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          }`}
                        >
                          {p.riskLevel} Risk
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>Milestone Progress</span>
                        <span className="text-white">{completion}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
                        />
                      </div>
                    </div>

                    {/* Budget & Dates */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>
                        Budget: <strong className="text-white">${p.spent?.toLocaleString() || '0'}</strong> / $
                        {p.budget?.toLocaleString() || '0'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" /> Target: {p.targetCompletion}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (5 cols): UPCOMING DEADLINES */}
        <div className="lg:col-span-5 bg-[#0e1322] border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" /> Upcoming Deadlines
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Chronological due dates for deliverable tasks & milestones</p>
            </div>

            <select
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300 rounded-xl focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Deadlines</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="THIS_WEEK">Due Next 7 Days</option>
            </select>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
            {filteredDeadlines.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-8">No upcoming deadlines found</div>
            ) : (
              filteredDeadlines.map((item) => {
                const diffLabel = getDaysDiffLabel(item.dueDate);

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {item.type}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${diffLabel.color}`}>
                            {diffLabel.text}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white tracking-tight">{item.title}</h4>
                      </div>

                      <button
                        onClick={() => navigate(item.type === 'TASK' ? '/tasks' : '/projects')}
                        title="Inspect item"
                        className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>Assignee: <strong className="text-slate-200">{item.assigneeOrLead}</strong></span>
                      <span className="text-slate-500">{item.clientOrProject}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: RECENT ACTIVITIES AUDIT FEED */}
      <div className="p-6 bg-[#0e1322] border border-slate-800/90 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" /> Recent Activities & Team Audit Log
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Live operational updates, status updates, and task activity logs</p>
          </div>

          <button
            onClick={() => navigate('/timeline')}
            className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
          >
            Full Activity Trail &gt;
          </button>
        </div>

        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-6">No recent activity logs available</div>
          ) : (
            activities.slice(0, 5).map((act) => (
              <div
                key={act.id}
                className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center font-bold text-indigo-300 text-xs shrink-0">
                    {(act.user || 'S').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-slate-200 font-semibold leading-snug">
                      <strong className="text-white font-bold">{act.user || 'System Staff'}</strong>{' '}
                      <span className="text-slate-300">{act.details || act.description || 'Updated system record'}</span>
                    </p>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                      {act.entityName ? `${act.entityName} • ` : ''}Jul 31, 2026
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                  {act.type || 'TASK_UPDATE'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
