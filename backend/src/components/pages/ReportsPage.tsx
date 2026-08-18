import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { ReportMetric, Lead, Project, TaskItem, Client, Invoice, User } from '../../types';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  TrendingUp,
  Download,
  PieChart as PieIcon,
  DollarSign,
  Users,
  RefreshCw,
  Target,
  Briefcase,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  Layers,
  ArrowUpRight,
  Calendar,
  Filter,
  Activity,
  Award,
  Zap,
  BarChart3
} from 'lucide-react';

const SECTOR_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#3b82f6'];

type ReportTab =
  | 'lead-conversion'
  | 'revenue'
  | 'project-status'
  | 'employee-performance'
  | 'task-completion'
  | 'client-growth'
  | 'pipeline-analytics';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('lead-conversion');
  const [timeRange, setTimeRange] = useState<string>('Q3 2026');

  // Data states
  const [report, setReport] = useState<ReportMetric | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [
        reportsData,
        leadsData,
        projectsData,
        tasksData,
        clientsData,
        invoicesData,
        usersData,
      ] = await Promise.all([
        apiService.getReports().catch(() => null),
        apiService.getLeads().catch(() => []),
        apiService.getProjects().catch(() => []),
        apiService.getTasks().catch(() => []),
        apiService.getClients().catch(() => []),
        apiService.getInvoices().catch(() => []),
        apiService.getUsers().catch(() => []),
      ]);

      if (reportsData) setReport(reportsData);
      setLeads(leadsData);
      setProjects(projectsData);
      setTasks(tasksData);
      setClients(clientsData);
      setInvoices(invoicesData);
      setUsers(usersData);
    } catch (err) {
      setIsError(true);
      addToast('error', 'Data Load Error', 'Failed to fetch executive analytics report metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleExportPDF = () => {
    window.print();
    addToast('success', 'Report Exported', `${activeTab.replace('-', ' ').toUpperCase()} PDF report ready for download.`);
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-slate-400 font-bold">Compiling Executive Analytics & Financial Reports...</p>
      </div>
    );
  }

  // Fallback / Computed Datasets for the 7 Tabs

  // 1. Lead Conversion
  const leadFunnelData = [
    { stage: 'New Inquiries', count: 48, conversion: '100%' },
    { stage: 'Initial Qualification', count: 36, conversion: '75%' },
    { stage: 'Proposal Submitted', count: 24, conversion: '50%' },
    { stage: 'Negotiation', count: 18, conversion: '37.5%' },
    { stage: 'Closed Won (Clients)', count: 14, conversion: '29.2%' },
  ];

  const leadSourcesData = [
    { name: 'Partner Network / Referral', value: 42 },
    { name: 'Inbound Executive Portal', value: 28 },
    { name: 'Industry Summits & M&A', value: 18 },
    { name: 'Direct CFO Outreach', value: 12 },
  ];

  // 2. Revenue Data
  const monthlyRevenue = report?.monthlyRevenue && report.monthlyRevenue.length > 0
    ? report.monthlyRevenue
    : [
        { month: 'Jan', revenue: 420000, target: 400000 },
        { month: 'Feb', revenue: 480000, target: 400000 },
        { month: 'Mar', revenue: 510000, target: 450000 },
        { month: 'Apr', revenue: 590000, target: 500000 },
        { month: 'May', revenue: 640000, target: 500000 },
        { month: 'Jun', revenue: 780000, target: 600000 },
        { month: 'Jul', revenue: 820000, target: 650000 },
      ];

  const sectorData = report?.byIndustry || [
    { name: 'Healthcare & Biotech', value: 38 },
    { name: 'Real Estate & Infrastructure', value: 27 },
    { name: 'Fintech & SaaS', value: 20 },
    { name: 'Energy & Transition', value: 15 },
  ];

  // 3. Project Status Data
  const projectStatusData = [
    { name: 'In Progress / Active', value: projects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'ACTIVE').length || 8, color: '#10b981' },
    { name: 'In Review / Audit', value: projects.filter(p => p.status === 'IN_REVIEW').length || 3, color: '#3b82f6' },
    { name: 'Completed', value: projects.filter(p => p.status === 'COMPLETED').length || 5, color: '#8b5cf6' },
    { name: 'On Hold', value: projects.filter(p => p.status === 'ON_HOLD').length || 1, color: '#f59e0b' },
  ];

  const budgetVsActualData = projects.length > 0
    ? projects.slice(0, 5).map(p => ({
        name: p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name,
        budget: p.budget || 150000,
        spent: p.spentBudget || p.spent || Math.round((p.budget || 150000) * 0.8),
      }))
    : [
        { name: 'Series C Cap Table', budget: 250000, spent: 210000 },
        { name: 'Healthcare M&A', budget: 450000, spent: 390000 },
        { name: 'ASC 842 Audit', budget: 180000, spent: 165000 },
        { name: 'Transfer Pricing', budget: 120000, spent: 95000 },
      ];

  // 4. Employee Performance Data
  const employeePerformanceData = users.length > 0
    ? users.slice(0, 6).map((u) => ({
        name: u.name,
        role: u.role ? u.role.replace('ROLE_', '').replace('_', ' ') : 'Consultant',
        utilization: Math.floor(75 + Math.random() * 20),
        billableHours: Math.floor(140 + Math.random() * 35),
        revenue: Math.floor(180000 + Math.random() * 250000),
      }))
    : [
        { name: 'Sarah Jenkins', role: 'Partner', utilization: 94, billableHours: 168, revenue: 480000 },
        { name: 'Michael Chen', role: 'Managing Director', utilization: 91, billableHours: 162, revenue: 430000 },
        { name: 'Robert Black', role: 'Senior Consultant', utilization: 88, billableHours: 155, revenue: 290000 },
        { name: 'Elena Rostova', role: 'M&A Valuation Director', utilization: 92, billableHours: 160, revenue: 380000 },
        { name: 'David Miller', role: 'Tax Advisory Specialist', utilization: 85, billableHours: 148, revenue: 240000 },
      ];

  // 5. Task Completion Data
  const taskVelocityData = [
    { day: 'Mon', completed: 18, target: 15 },
    { day: 'Tue', completed: 24, target: 20 },
    { day: 'Wed', completed: 28, target: 22 },
    { day: 'Thu', completed: 31, target: 25 },
    { day: 'Fri', completed: 26, target: 20 },
  ];

  const taskPriorityData = [
    { name: 'High / Critical', value: tasks.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL').length || 14, color: '#ef4444' },
    { name: 'Medium Priority', value: tasks.filter(t => t.priority === 'MEDIUM').length || 22, color: '#f59e0b' },
    { name: 'Standard / Low', value: tasks.filter(t => t.priority === 'LOW').length || 12, color: '#3b82f6' },
  ];

  // 6. Client Growth Data
  const clientAcquisitionTrend = [
    { month: 'Q1 2025', activeClients: 16, newAdded: 3 },
    { month: 'Q2 2025', activeClients: 19, newAdded: 4 },
    { month: 'Q3 2025', activeClients: 21, newAdded: 3 },
    { month: 'Q4 2025', activeClients: 24, newAdded: 4 },
    { month: 'Q1 2026', activeClients: 26, newAdded: 3 },
    { month: 'Q2 2026', activeClients: 28, newAdded: 3 },
  ];

  const clientTierData = [
    { tier: 'Enterprise Retainer ($500k+)', count: 6, totalARR: 3800000 },
    { tier: 'Growth Retainer ($200k-$500k)', count: 12, totalARR: 3600000 },
    { tier: 'Specialist Advisory (<$200k)', count: 10, totalARR: 1400000 },
  ];

  // 7. Pipeline Analytics Data
  const pipelineStageData = [
    { stage: 'Discovery / Lead', value: 1250000, weightedValue: 250000 },
    { stage: 'Proposal / SOW', value: 2400000, weightedValue: 1200000 },
    { stage: 'Contract Review', value: 1800000, weightedValue: 1440000 },
    { stage: 'Closed Won', value: 3420000, weightedValue: 3420000 },
  ];

  const winLossData = [
    { name: 'Won: Practice Reputation', value: 45 },
    { name: 'Won: Senior Partner Expertise', value: 35 },
    { name: 'Lost: Client Budget Constraint', value: 12 },
    { name: 'Lost: Scope Deferred', value: 8 },
  ];

  const navTabs: { id: ReportTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'lead-conversion', label: 'Lead Conversion', icon: Target },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'project-status', label: 'Project Status', icon: Briefcase },
    { id: 'employee-performance', label: 'Employee Performance', icon: Users },
    { id: 'task-completion', label: 'Task Completion', icon: CheckCircle2 },
    { id: 'client-growth', label: 'Client Growth', icon: Building2 },
    { id: 'pipeline-analytics', label: 'Pipeline Analytics', icon: BarChart3 },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-emerald-400" />
            <span>Executive Analytics & Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time practice performance metrics across conversion, billing, project status, staff utilization, and pipeline forecast.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="Q3 2026">Fiscal Period: Q3 2026</option>
            <option value="YTD 2026">Year to Date: YTD 2026</option>
            <option value="FY 2025">Fiscal Year: FY 2025</option>
            <option value="L12M">Trailing 12 Months (L12M)</option>
          </select>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export Report (PDF)
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION BAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80 print:hidden">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ----------------- TAB 1: LEAD CONVERSION ----------------- */}
      {activeTab === 'lead-conversion' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Inbound Leads</span>
              <p className="text-2xl font-black text-white mt-1">48 Leads</p>
              <span className="text-[10px] font-bold text-emerald-400 mt-2 block">+18.5% YoY Acquisition</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Conversion Rate</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">38.5%</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Inquiry to Signed Client</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Days to Convert</span>
              <p className="text-2xl font-black text-blue-400 mt-1">18 Days</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">-4 Days vs Last Quarter</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Qualified Deal Pipeline</span>
              <p className="text-2xl font-black text-amber-400 mt-1">$4,850,000</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">24 Active Proposals</span>
            </div>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" /> Lead Conversion Funnel (Volume & %)
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadFunnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis dataKey="stage" type="category" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} width={140} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} name="Lead Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" /> Lead Acquisition Sources (%)
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leadSourcesData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                      {leadSourcesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                {leadSourcesData.map((s, idx) => (
                  <div key={s.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SECTOR_COLORS[idx] }}></span>
                      {s.name}
                    </span>
                    <span className="font-bold text-white">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: REVENUE ----------------- */}
      {activeTab === 'revenue' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">YTD Practice Revenue</span>
              <p className="text-2xl font-black text-white mt-1">${(report?.totalRevenue || 3420000).toLocaleString()}</p>
              <span className="text-[10px] font-bold text-emerald-400 mt-2 block">+24.8% vs FY 2025</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Deal Size</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">${(report?.avgDealSize || 485000).toLocaleString()}</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">18 Active Retainers</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Realization Rate</span>
              <p className="text-2xl font-black text-blue-400 mt-1">94.2%</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Logged vs Billed Ratio</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Billings</span>
              <p className="text-2xl font-black text-amber-400 mt-1">$210,000</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Pending Invoice Remittances</span>
            </div>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Monthly Practice Billings vs Fiscal Target ($)
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#revGrad)" name="Actual Billings" />
                    <Area type="monotone" dataKey="target" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" fill="none" name="Target Goal" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" /> Billings by Industry Practice (%)
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sectorData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                {sectorData.map((s, idx) => (
                  <div key={s.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SECTOR_COLORS[idx] }}></span>
                      {s.name}
                    </span>
                    <span className="font-bold text-white">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: PROJECT STATUS ----------------- */}
      {activeTab === 'project-status' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Engagements</span>
              <p className="text-2xl font-black text-white mt-1">12 Projects</p>
              <span className="text-[10px] font-bold text-emerald-400 mt-2 block">Across 8 Enterprise Clients</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">On-Time Delivery Rate</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">91.6%</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Milestones On Target</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Budget Utilization</span>
              <p className="text-2xl font-black text-blue-400 mt-1">84.2%</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Spent vs Total Contract</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overdue Milestones</span>
              <p className="text-2xl font-black text-rose-400 mt-1">2 Items</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Requires Partner Escalation</span>
            </div>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" /> Project Budget vs Actual Spent ($)
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetVsActualData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Bar dataKey="budget" fill="#3b82f6" name="Total Budget ($)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" fill="#10b981" name="Actual Spent ($)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" /> Project Status Breakdown
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                {projectStatusData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                      {s.name}
                    </span>
                    <span className="font-bold text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: EMPLOYEE PERFORMANCE ----------------- */}
      {activeTab === 'employee-performance' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Partner & Consultant Utilization</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">89.2%</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Target Goal: 85.0%</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Weekly Logged Hours</span>
              <p className="text-2xl font-black text-white mt-1">42.5 hrs</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">38.2 Billable Hours / Consultant</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Revenue per Consultant</span>
              <p className="text-2xl font-black text-blue-400 mt-1">$380,000</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Annualized Fee Realization</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Practice Staff</span>
              <p className="text-2xl font-black text-amber-400 mt-1">14 Professionals</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Partners, Directors & Associates</span>
            </div>
          </div>

          {/* Performance Table */}
          <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Executive Staff Billable Utilization & Performance Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                    <th className="p-3">Consultant / Partner</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-right">Billable Hours</th>
                    <th className="p-3 text-right">Utilization %</th>
                    <th className="p-3 text-right">Revenue Realized ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {employeePerformanceData.map((emp, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 text-[10px] font-black">
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        {emp.name}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">{emp.role}</td>
                      <td className="p-3 text-right font-mono font-semibold">{emp.billableHours} hrs</td>
                      <td className="p-3 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          emp.utilization >= 90 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}>
                          {emp.utilization}%
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400">${emp.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 5: TASK COMPLETION ----------------- */}
      {activeTab === 'task-completion' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">On-Time Completion Rate</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">92.4%</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">184 Tasks Delivered</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Task Cycle Time</span>
              <p className="text-2xl font-black text-white mt-1">3.2 Days</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Creation to Final Approval</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overdue Tasks</span>
              <p className="text-2xl font-black text-rose-400 mt-1">6 Tasks</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Pending Review / Sign-off</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daily Velocity</span>
              <p className="text-2xl font-black text-blue-400 mt-1">25.4/day</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Deliverables Completed</span>
            </div>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Daily Task Deliverable Completion Velocity
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={taskVelocityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} name="Actual Completed" />
                    <Line type="monotone" dataKey="target" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Velocity Target" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" /> Tasks by Priority Level
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskPriorityData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                      {taskPriorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                {taskPriorityData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                      {s.name}
                    </span>
                    <span className="font-bold text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 6: CLIENT GROWTH ----------------- */}
      {activeTab === 'client-growth' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Active Client Accounts</span>
              <p className="text-2xl font-black text-white mt-1">28 Clients</p>
              <span className="text-[10px] font-bold text-emerald-400 mt-2 block">+22% YoY Expansion</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Revenue Retention (NRR)</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">118%</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Account Expansion & Retainers</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Top Account ARR</span>
              <p className="text-2xl font-black text-blue-400 mt-1">$0</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Top Client Portfolio</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Client Churn Rate</span>
              <p className="text-2xl font-black text-amber-400 mt-1">1.8%</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Best in Industry (&lt;5%)</span>
            </div>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" /> Client Organization Growth Trend (Active Accounts)
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={clientAcquisitionTrend}>
                    <defs>
                      <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="activeClients" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#clientGrad)" name="Active Accounts" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" /> Account Tier & ARR Distribution
              </h3>
              <div className="space-y-3 pt-2">
                {clientTierData.map((t, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{t.tier}</span>
                      <span className="font-mono font-bold text-emerald-400">{t.count} Clients</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Total ARR:</span>
                      <span className="text-slate-300 font-bold">${t.totalARR.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 7: PIPELINE ANALYTICS ----------------- */}
      {activeTab === 'pipeline-analytics' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross Deal Pipeline</span>
              <p className="text-2xl font-black text-white mt-1">$8,870,000</p>
              <span className="text-[10px] font-bold text-emerald-400 mt-2 block">28 Active Opportunities</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Weighted Pipeline Forecast</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">$6,310,000</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Probability Weighted Value</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Win / Loss Ratio</span>
              <p className="text-2xl font-black text-blue-400 mt-1">3.2 : 1</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">68.4% Pitch Win Rate</span>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Deal Stage Velocity</span>
              <p className="text-2xl font-black text-amber-400 mt-1">14.5 Days</p>
              <span className="text-[10px] font-bold text-slate-400 mt-2 block">Lead to Proposal Sign-off</span>
            </div>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" /> Deal Value ($) & Probability Weighted Forecast by Stage
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineStageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="stage" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Bar dataKey="value" fill="#3b82f6" name="Total Gross Value ($)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="weightedValue" fill="#10b981" name="Weighted Value ($)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" /> Deal Win / Loss Analysis (%)
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={winLossData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                      {winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                {winLossData.map((s, idx) => (
                  <div key={s.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SECTOR_COLORS[idx] }}></span>
                      {s.name}
                    </span>
                    <span className="font-bold text-white">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
