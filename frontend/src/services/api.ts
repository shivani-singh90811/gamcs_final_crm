import axios from 'axios';
import {
  User, AuthResponse, Lead, Client, Contact, Meeting, Project, Task, DocumentItem, Proposal, Invoice,
  DashboardStats, AIInsight, ApiConfig, ActivityItem, NotificationItem, RolePermission, RoleItem, FirmSettings, ReportData,
  Remark
} from '../types';

const CONFIG_KEY = 'gamcs_crm_api_config';
const AUTH_TOKEN_KEY = 'gamcs_crm_jwt_token';

export const getStoredConfig = (): ApiConfig => {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse api config', e);
    }
  }
  return {
    useMock: false,
    baseUrl: '/api/v1',
    jwtToken: localStorage.getItem(AUTH_TOKEN_KEY),
  };
};

export const saveConfig = (config: ApiConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  if (config.jwtToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, config.jwtToken);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

// Configured Axios instance with Spring Boot REST JWT interceptors
export const createApiClient = () => {
  const config = getStoredConfig();
  const client = axios.create({
    baseURL: config.baseUrl || '/api/v1',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 10000,
  });

  client.interceptors.request.use((req) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  });

  return client;
};

export const apiService = {
  // --- AUTH REST ENDPOINTS (/api/v1/auth) ---
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const client = createApiClient();
    const res = await client.post('/auth/login', { email, password });
    const authData = res.data?.data || res.data;
    if (authData?.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, authData.token);
    }
    return authData;
  },

  googleLogin: async (googleData: { email: string; name?: string; avatarUrl?: string; role?: string }): Promise<AuthResponse> => {
    const client = createApiClient();
    const res = await client.post('/auth/google', googleData);
    const authData = res.data?.data || res.data;
    if (authData?.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, authData.token);
    }
    return authData;
  },

  register: async (userData: Partial<User> & { password: string }): Promise<User> => {
    const client = createApiClient();
    const res = await client.post('/auth/register', userData);
    return res.data?.data || res.data;
  },

  forgotPassword: async (email: string): Promise<string> => {
    const client = createApiClient();
    const res = await client.post('/auth/forgot-password', { email });
    return res.data?.data || res.data;
  },

  resetPassword: async (resetToken: string, newPassword: string): Promise<string> => {
    const client = createApiClient();
    const res = await client.post('/auth/reset-password', { resetToken, newPassword });
    return res.data?.message || 'Password successfully reset';
  },

  getCurrentUser: async (): Promise<User> => {
    const client = createApiClient();
    const res = await client.get('/auth/me');
    return res.data?.data || res.data;
  },

  // --- DASHBOARD REST ENDPOINTS ---
  getDashboardStats: async (): Promise<DashboardStats> => {
    const client = createApiClient();
    const res = await client.get('/dashboard/stats');
    return res.data?.data || res.data;
  },

  // --- LEADS REST ENDPOINTS ---
  getLeads: async (): Promise<Lead[]> => {
    const client = createApiClient();
    const res = await client.get('/leads');
    return res.data?.data || res.data;
  },

  createLead: async (lead: Partial<Lead>): Promise<Lead> => {
    const client = createApiClient();
    const res = await client.post('/leads', lead);
    return res.data?.data || res.data;
  },

  updateLead: async (id: string, lead: Partial<Lead>): Promise<Lead> => {
    const client = createApiClient();
    const res = await client.put(`/leads/${id}`, lead);
    return res.data?.data || res.data;
  },

  deleteLead: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/leads/${id}`);
  },

  convertLeadToClient: async (id: string): Promise<{ lead: Lead; client: Client }> => {
    const client = createApiClient();
    const res = await client.post(`/leads/${id}/convert`);
    return res.data?.data || res.data;
  },

  // --- CONTACTS REST ENDPOINTS ---
  getContacts: async (): Promise<Contact[]> => {
    const client = createApiClient();
    const res = await client.get('/contacts');
    return res.data?.data || res.data;
  },

  createContact: async (contact: Partial<Contact>): Promise<Contact> => {
    const client = createApiClient();
    const res = await client.post('/contacts', contact);
    return res.data?.data || res.data;
  },

  updateContact: async (id: string, contact: Partial<Contact>): Promise<Contact> => {
    const client = createApiClient();
    const res = await client.put(`/contacts/${id}`, contact);
    return res.data?.data || res.data;
  },

  deleteContact: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/contacts/${id}`);
  },

  // --- CLIENTS REST ENDPOINTS ---
  getClients: async (): Promise<Client[]> => {
    const client = createApiClient();
    const res = await client.get('/clients');
    return res.data?.data || res.data;
  },

  createClient: async (clientData: Partial<Client>): Promise<Client> => {
    const client = createApiClient();
    const res = await client.post('/clients', clientData);
    return res.data?.data || res.data;
  },

  updateClient: async (id: string, clientData: Partial<Client>): Promise<Client> => {
    const client = createApiClient();
    const res = await client.put(`/clients/${id}`, clientData);
    return res.data?.data || res.data;
  },

  addClientService: async (clientId: string, serviceData: Partial<ClientService>): Promise<{ client: Client; service: ClientService }> => {
    const client = createApiClient();
    const res = await client.post(`/clients/${clientId}/services`, serviceData);
    return res.data?.data || res.data;
  },

  updateClientService: async (clientId: string, serviceId: string, serviceData: Partial<ClientService>): Promise<{ client: Client; service: ClientService }> => {
    const client = createApiClient();
    const res = await client.put(`/clients/${clientId}/services/${serviceId}`, serviceData);
    return res.data?.data || res.data;
  },

  deleteClientService: async (clientId: string, serviceId: string): Promise<Client> => {
    const client = createApiClient();
    const res = await client.delete(`/clients/${clientId}/services/${serviceId}`);
    return res.data?.data || res.data;
  },

  deleteClient: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/clients/${id}`);
  },

  // --- MEETINGS REST ENDPOINTS ---
  getMeetings: async (): Promise<Meeting[]> => {
    const client = createApiClient();
    const res = await client.get('/meetings');
    return res.data?.data || res.data;
  },

  createMeeting: async (meeting: Partial<Meeting>): Promise<Meeting> => {
    const client = createApiClient();
    const res = await client.post('/meetings', meeting);
    return res.data?.data || res.data;
  },

  updateMeeting: async (id: string, meeting: Partial<Meeting>): Promise<Meeting> => {
    const client = createApiClient();
    const res = await client.put(`/meetings/${id}`, meeting);
    return res.data?.data || res.data;
  },

  generateMeetingAiSummary: async (id: string, notes?: string): Promise<{ summary: string; actionItems: any[]; meeting: Meeting }> => {
    const client = createApiClient();
    const res = await client.post(`/meetings/${id}/generate-summary`, { notes });
    return res.data?.data || res.data;
  },

  deleteMeeting: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/meetings/${id}`);
  },

  // --- PROJECTS REST ENDPOINTS ---
  getProjects: async (): Promise<Project[]> => {
    const client = createApiClient();
    const res = await client.get('/projects');
    return res.data?.data || res.data;
  },

  createProject: async (project: Partial<Project>): Promise<Project> => {
    const client = createApiClient();
    const res = await client.post('/projects', project);
    return res.data?.data || res.data;
  },

  updateProject: async (id: string, project: Partial<Project>): Promise<Project> => {
    const client = createApiClient();
    const res = await client.put(`/projects/${id}`, project);
    return res.data?.data || res.data;
  },

  deleteProject: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/projects/${id}`);
  },

  // --- TASKS REST ENDPOINTS ---
  getTasks: async (): Promise<Task[]> => {
    const client = createApiClient();
    const res = await client.get('/tasks');
    return res.data?.data || res.data;
  },

  createTask: async (task: Partial<Task>): Promise<Task> => {
    const client = createApiClient();
    const res = await client.post('/tasks', task);
    return res.data?.data || res.data;
  },

  updateTask: async (id: string, task: Partial<Task>): Promise<Task> => {
    const client = createApiClient();
    const res = await client.put(`/tasks/${id}`, task);
    return res.data?.data || res.data;
  },

  deleteTask: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/tasks/${id}`);
  },

  // --- DOCUMENTS REST ENDPOINTS ---
  getDocuments: async (): Promise<DocumentItem[]> => {
    const client = createApiClient();
    const res = await client.get('/documents');
    return res.data?.data || res.data;
  },

  createDocument: async (doc: Partial<DocumentItem>): Promise<DocumentItem> => {
    const client = createApiClient();
    const res = await client.post('/documents', doc);
    return res.data?.data || res.data;
  },

  updateDocument: async (id: string, doc: Partial<DocumentItem>): Promise<DocumentItem> => {
    const client = createApiClient();
    const res = await client.put(`/documents/${id}`, doc);
    return res.data?.data || res.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/documents/${id}`);
  },

  // --- INVOICES REST ENDPOINTS ---
  getInvoices: async (): Promise<Invoice[]> => {
    const client = createApiClient();
    const res = await client.get('/invoices');
    return res.data?.data || res.data;
  },

  createInvoice: async (invoice: Partial<Invoice>): Promise<Invoice> => {
    const client = createApiClient();
    const res = await client.post('/invoices', invoice);
    return res.data?.data || res.data;
  },

  updateInvoice: async (id: string, invoice: Partial<Invoice>): Promise<Invoice> => {
    const client = createApiClient();
    const res = await client.put(`/invoices/${id}`, invoice);
    return res.data?.data || res.data;
  },

  deleteInvoice: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/invoices/${id}`);
  },

  // --- PROPOSALS REST ENDPOINTS ---
  getProposals: async (): Promise<Proposal[]> => {
    const client = createApiClient();
    const res = await client.get('/proposals');
    return res.data?.data || res.data;
  },

  createProposal: async (proposal: Partial<Proposal>): Promise<Proposal> => {
    const client = createApiClient();
    const res = await client.post('/proposals', proposal);
    return res.data?.data || res.data;
  },

  updateProposal: async (id: string, proposal: Partial<Proposal>): Promise<Proposal> => {
    const client = createApiClient();
    const res = await client.put(`/proposals/${id}`, proposal);
    return res.data?.data || res.data;
  },

  executeProposalWorkflow: async (id: string, action: string, comments?: string): Promise<Proposal> => {
    const client = createApiClient();
    const res = await client.post(`/proposals/${id}/workflow`, { action, comments });
    return res.data?.data || res.data;
  },

  generateAIProposalDraft: async (params: {
    clientName: string;
    engagementType?: string;
    proposedFee?: number;
    projectTitle?: string;
    coreObjectives?: string;
  }): Promise<{ executiveSummary: string; scopeOfWork: string; suggestedItems: any[] }> => {
    const client = createApiClient();
    const res = await client.post('/proposals/generate-ai', params);
    return res.data?.data || res.data;
  },

  deleteProposal: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/proposals/${id}`);
  },

  // --- REPORTS & ANALYTICS REST ENDPOINTS ---
  getReports: async (): Promise<ReportData> => {
    const client = createApiClient();
    const res = await client.get('/reports');
    return res.data?.data || res.data;
  },

  // --- USERS MANAGEMENT REST ENDPOINTS ---
  getUsers: async (): Promise<User[]> => {
    const client = createApiClient();
    const res = await client.get('/users');
    return res.data?.data || res.data;
  },

  createUser: async (user: Partial<User>): Promise<User> => {
    const client = createApiClient();
    const res = await client.post('/users', user);
    return res.data?.data || res.data;
  },

  updateUser: async (id: string, user: Partial<User>): Promise<User> => {
    const client = createApiClient();
    const res = await client.put(`/users/${id}`, user);
    return res.data?.data || res.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/users/${id}`);
  },

  resetUserPassword: async (id: string, password?: string): Promise<{ userId: string; tempPassword?: string }> => {
    const client = createApiClient();
    const res = await client.post(`/users/${id}/reset-password`, { password });
    return res.data?.data || res.data;
  },

  toggleUserStatus: async (id: string): Promise<User> => {
    const client = createApiClient();
    const res = await client.post(`/users/${id}/toggle-status`);
    return res.data?.data || res.data;
  },

  // --- ROLES & PERMISSIONS REST ENDPOINTS ---
  getRoles: async (): Promise<RoleItem[]> => {
    const client = createApiClient();
    const res = await client.get('/roles');
    return res.data?.data || res.data;
  },

  createRole: async (roleData: Partial<RoleItem>): Promise<RoleItem> => {
    const client = createApiClient();
    const res = await client.post('/roles', roleData);
    return res.data?.data || res.data;
  },

  deleteRole: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/roles/${id}`);
  },

  updateRoles: async (roles: RolePermission[]): Promise<RolePermission[]> => {
    const client = createApiClient();
    const res = await client.put('/roles', roles);
    return res.data?.data || res.data;
  },

  // --- SETTINGS REST ENDPOINTS ---
  getSettings: async (): Promise<FirmSettings> => {
    const client = createApiClient();
    const res = await client.get('/settings');
    return res.data?.data || res.data;
  },

  updateSettings: async (settings: Partial<FirmSettings>): Promise<FirmSettings> => {
    const client = createApiClient();
    const res = await client.put('/settings', settings);
    return res.data?.data || res.data;
  },

  // --- ACTIVITIES AUDIT TRAIL REST ENDPOINTS ---
  getActivities: async (): Promise<ActivityItem[]> => {
    const client = createApiClient();
    const res = await client.get('/activities');
    return res.data?.data || res.data;
  },

  // --- NOTIFICATIONS REST ENDPOINTS ---
  getNotifications: async (): Promise<NotificationItem[]> => {
    const client = createApiClient();
    const res = await client.get('/notifications');
    return res.data?.data || res.data;
  },

  markNotificationsRead: async (): Promise<NotificationItem[]> => {
    const client = createApiClient();
    const res = await client.post('/notifications/mark-read', {});
    return res.data?.data || res.data;
  },

  clearAllData: async (): Promise<void> => {
    const client = createApiClient();
    await client.delete('/system/clear-data');
  },

  // --- REMARKS & STAGE NOTES REST ENDPOINTS ---
  getRemarks: async (relatedEntity?: string, relatedEntityId?: string, stage?: string): Promise<Remark[]> => {
    const client = createApiClient();
    const params: Record<string, string> = {};
    if (relatedEntity) params.relatedEntity = relatedEntity;
    if (relatedEntityId) params.relatedEntityId = relatedEntityId;
    if (stage) params.stage = stage;
    const res = await client.get('/remarks', { params });
    return res.data?.data || res.data;
  },

  createRemark: async (remarkData: Partial<Remark>): Promise<Remark> => {
    const client = createApiClient();
    const res = await client.post('/remarks', remarkData);
    return res.data?.data || res.data;
  },

  deleteRemark: async (id: string): Promise<void> => {
    const client = createApiClient();
    await client.delete(`/remarks/${id}`);
  },

  // --- AI INSIGHT REST ENDPOINT (Proxied through Spring Boot REST Server) ---
  generateAIInsight: async (prompt: string, contextType: string = 'GENERAL'): Promise<string> => {
    const client = createApiClient();
    const res = await client.post('/ai/insight', { prompt, contextType });
    return res.data?.data || res.data;
  }
};
