import { Lead, Client, Meeting, Project, Task, DocumentItem, Proposal, Invoice, DashboardStats, AIInsight, User } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-101',
    name: 'Managing Partner',
    email: 'admin@gamcs.com',
    role: 'ROLE_SUPER_ADMIN',
    title: 'Managing Partner',
    department: 'Executive Board',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
  },
];

export const INITIAL_DASHBOARD_STATS: DashboardStats = {
  totalAssetsUnderMgmt: '$0',
  assetsGrowthQuarterly: '0.0%',
  billableRatio: '0.0%',
  billableRatioTarget: '85.0%',
  activePipelineValue: '$0',
  pendingDealsCount: 0,
  activeEngagementsCount: 0,
  totalClientsCount: 0,
  monthlyRecurringRevenue: 0,
  pendingInvoicesAmount: 0,
};

export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_MEETINGS: Meeting[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_DOCUMENTS: DocumentItem[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_PROPOSALS: Proposal[] = [];
export const INITIAL_AI_INSIGHTS: AIInsight[] = [];
