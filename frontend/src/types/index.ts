export type UserRole =
  | 'ROLE_SUPER_ADMIN'
  | 'ROLE_ADMIN'
  | 'ROLE_EMPLOYEE'
  | 'ROLE_CLIENT'
  | 'ROLE_PARTNER'
  | 'ROLE_SENIOR_CONSULTANT'
  | 'ROLE_FINANCIAL_ANALYST'
  | 'ROLE_CLIENT_PORTAL'
  | 'PARTNER'
  | 'SENIOR_CONSULTANT'
  | 'FINANCIAL_ANALYST'
  | 'SUPER_ADMIN'
  | 'EMPLOYEE'
  | 'CLIENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatarUrl?: string;
  department: string;
  active?: boolean;
}

export interface UserItem extends User {
  fullName?: string;
  status?: string;
  twoFactorEnabled?: boolean;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export type LeadStatus =
  | 'NEW'
  | 'NEW_LEAD'
  | 'QUALIFIED'
  | 'CONTACTED'
  | 'MEETING_SCHEDULED'
  | 'PITCH_SCHEDULED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'CONTRACT'
  | 'WON'
  | 'CLOSED_WON'
  | 'LOST'
  | 'CLOSED_LOST'
  | 'UNDER_REVIEW'
  | 'DISCOVERY';

export interface MeetingHistoryItem {
  id: string;
  date: string;
  title: string;
  summary: string;
  organizer?: string;
}

export interface ProposalHistoryItem {
  id: string;
  date: string;
  title: string;
  amount: number;
  status: string;
}

export interface Lead {
  id: string;
  primaryName?: string;
  contactPerson: string;
  contactName?: string;
  secondaryName?: string;
  company: string;
  companyName?: string;
  email: string;
  contactEmail?: string;
  phone: string;
  contactPhone?: string;
  leadOwner: string;
  assignedEmployee: string;
  assignedPartner?: string;
  industry: string;
  leadSource: string;
  source?: string;
  requirement?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  lastContactDate?: string;
  currentStage?: LeadStatus;
  status: LeadStatus;
  stage?: LeadStatus;
  followUp?: string;
  followUpDate?: string;
  pendingTasks?: string;
  remarks?: string;
  leadNotes?: string;
  notes?: string;
  expectedRevenue: number;
  estimatedValue?: number;
  probability: number;
  timeline?: string;
  aiScore?: number;
  aiRecommendation?: string;
  meetingHistory?: MeetingHistoryItem[];
  proposalHistory?: ProposalHistoryItem[];
  createdAt?: string;
  contractType?: string;
  contractStatus?: 'DRAFT' | 'SENT' | 'UNDER_LEGAL_REVIEW' | 'PENDING_SIGNATURE' | 'EXECUTED';
  convertedClientId?: string;
  convertedClientNumber?: string;
  isConverted?: boolean;
}

export type ClientStatus = 'ACTIVE' | 'ONBOARDING' | 'RETAINER' | 'PAUSED' | 'ARCHIVED' | 'RENEWAL_DUE';
export type SLALevel = 'PLATINUM' | 'GOLD' | 'SILVER';

export type ClientServiceStatus = 'ACTIVE' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';

export interface ClientService {
  id: string;
  serviceName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ClientServiceStatus;
  assignedEmployee: string;
}

export interface Client {
  id: string;
  clientId?: string;
  clientNumber?: string;
  name: string;
  code: string;
  industry: string;
  annualRetainer?: number;
  monthlyRetainer?: number;
  totalAssetsUnderMgmt?: number;
  contractStatus?: string;
  status?: ClientStatus;
  slaLevel?: SLALevel;
  leadPartner: string;
  contactPerson: string;
  email: string;
  phone: string;
  activeEngagementsCount?: number;
  activeEngagements?: number;
  healthScore?: number | string;
  startDate?: string;
  onboardedDate?: string;
  services?: ClientService[];
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastContacted: string;
  type: string;
}

export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type MeetingType = 'STRATEGY_REVIEW' | 'BOARD_PRESENTATION' | 'AUDIT_PREP' | 'DISCOVERY' | 'TAX_PLANNING' | 'BOARD_ADVISORY' | 'DUE_DILIGENCE' | 'PITCH_REVIEW';

export interface ParticipantItem {
  id?: string;
  name: string;
  email: string;
  role: 'HOST' | 'ATTENDEE' | 'CLIENT' | 'GUEST' | string;
  status: 'ATTENDING' | 'PENDING' | 'DECLINED' | string;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee: string;
  dueDate?: string;
  completed: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  clientName: string;
  date?: string;
  meetingDate?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  type: MeetingType;
  status: MeetingStatus;
  location: string;
  attendees: string[];
  participantDetails?: ParticipantItem[];
  agenda: string;
  meetingNotes?: string;
  summaryNotes?: string;
  aiSummary?: string;
  aiActionItems?: string[];
  actionItems?: ActionItem[];
  recordingUrl?: string;
}

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'UNDER_AUDIT' | 'COMPLETED' | 'ON_HOLD';

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  status?: string;
  deliverable?: string;
}

export interface ProjectDocument {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: string;
  url?: string;
  category?: string;
}

export interface ProjectInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'PAID' | 'SENT' | 'OVERDUE' | 'DRAFT';
  date: string;
  dueDate: string;
  notes?: string;
}

export interface ProjectTimelineItem {
  id: string;
  phase: string;
  date: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED';
  description: string;
}

export interface Project {
  id: string;
  name: string;
  code?: string;
  projectManager: string;
  leadPartner?: string;
  leadManager?: string;
  assignedEmployees: string[];
  client: string;
  clientName: string;
  clientId?: string;
  startDate: string;
  deadline: string;
  targetCompletion?: string;
  targetEndDate?: string;
  milestones: ProjectMilestone[];
  budget: number;
  spent?: number;
  spentBudget?: number;
  status: ProjectStatus;
  progress: number;
  completionPercentage: number;
  documents: ProjectDocument[];
  invoices: ProjectInvoice[];
  timeline: ProjectTimelineItem[] | string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  description?: string;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskAttachment {
  id: string;
  name: string;
  fileSize: string;
  fileType: string;
  url?: string;
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  author: string;
  avatarUrl?: string;
  text: string;
  date: string;
}

export interface TaskActivity {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedBy?: string;
  assignedTo?: string;
  dueDate: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  progressPercentage?: number;
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  activityTimeline?: TaskActivity[];
  projectName?: string;
  clientName?: string;
  category?: string;
  assignee?: string;
  loggedHours?: number;
  completedAt?: string;
  completedBy?: string;
  previousStatus?: TaskStatus;
}

export type DocCategory = 'CONTRACT' | 'TAX_FILING' | 'FINANCIAL_MODEL' | 'AUDIT_REPORT' | 'PROPOSAL_DOC' | 'COMPLIANCE' | 'Valuation Reports' | 'Term Sheets' | 'Due Diligence';

export interface DocumentVersion {
  id: string;
  version: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
  changelog?: string;
  downloadUrl?: string;
  contentPreview?: string;
}

export type RolePermissionLevel = 'ADMIN_ONLY' | 'EMPLOYEE_ACCESS' | 'CLIENT_ACCESS' | 'PUBLIC_READ';

export interface DocumentItem {
  id: string;
  title: string;
  category: DocCategory;
  clientName: string;
  uploadedBy: string;
  uploadedAt?: string;
  uploadDate?: string;
  fileSize: string;
  fileType?: 'pdf' | 'image' | 'doc' | 'excel' | 'text' | string;
  version?: string;
  versionHistory?: DocumentVersion[];
  rolePermissions?: RolePermissionLevel;
  downloadUrl?: string;
  securityLevel?: string;
  aiSummary?: string;
  description?: string;
  contentPreview?: string;
}

export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'REVISED' | 'UNDER_REVIEW';

export interface ProposalLineItem {
  id?: string;
  description: string;
  hoursOrUnits?: number;
  quantity?: number;
  rate: number;
  total: number;
}

export interface ApprovalHistoryItem {
  id: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REVISED' | 'SENT' | 'ACCEPTED' | 'DECLINED';
  actor: string;
  role?: string;
  timestamp: string;
  comments?: string;
}

export interface Proposal {
  id: string;
  proposalNumber?: string;
  title: string;
  clientName: string;
  clientCompany?: string;
  contactEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  status: ProposalStatus;
  validUntil?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  createdDate?: string;
  totalAmount?: number;
  proposedFee?: number;
  engagementType?: string;
  serviceCategory?: string;
  leadPartner?: string;
  scopeDetails?: string;
  value?: number;
  items?: ProposalLineItem[];
  executiveSummary?: string;
  scopeOfWork?: string;
  termsAndConditions?: string;
  notes?: string;
  clientNotes?: string;
  contractFormat?: 'STANDARD_PROPOSAL' | 'RETAINER_CONTRACT' | 'MSA_AGREEMENT' | 'SOW_DELIVERABLE' | 'FIXED_FEE_LOE' | string;
  preparedBy?: string;
  approvalHistory?: ApprovalHistoryItem[];
}

export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'DRAFT' | 'CANCELLED';

export interface InvoiceItem {
  id?: string;
  serviceDescription: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientId?: string;
  projectName?: string;
  project?: string;
  amount?: number;
  subtotal?: number;
  gst?: number;
  gstRate?: number;
  tax?: number;
  totalAmount?: number;
  issueDate?: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentStatus?: InvoiceStatus;
  serviceDescription?: string;
  items?: InvoiceItem[];
  notes?: string;
}

export interface DashboardStats {
  totalAssetsUnderMgmt: string;
  assetsGrowthQuarterly: string;
  billableRatio: string;
  billableRatioTarget: string;
  activePipelineValue: string;
  pendingDealsCount: number;
  activeEngagementsCount: number;
  totalClientsCount: number;
  monthlyRecurringRevenue: number;
  pendingInvoicesAmount: number;
}

export interface AIInsight {
  id: string;
  type: 'ALERT' | 'OPPORTUNITY' | 'FORECAST';
  title: string;
  description: string;
  actionableLabel: string;
  timestamp: string;
}

export interface ApiConfig {
  useMock: boolean;
  baseUrl: string;
  jwtToken: string | null;
}

export type RelatedEntityType = 
  | 'LEAD'
  | 'MEETING'
  | 'PROPOSAL'
  | 'CLIENT'
  | 'PROJECT'
  | 'TASK'
  | 'INVOICE'
  | 'DOCUMENT'
  | 'GENERAL';

export type RemarkStage = 
  | 'Lead creation'
  | 'Contacted'
  | 'Meeting'
  | 'Follow-up'
  | 'Proposal'
  | 'Proposal sent'
  | 'Client conversion'
  | 'Project creation'
  | 'Task completion'
  | 'General Note';

export interface Remark {
  id: string;
  remarkText: string;
  addedBy: string;
  userRole: string;
  dateTime: string;
  relatedEntity: RelatedEntityType;
  relatedEntityId: string;
  relatedEntityName?: string;
  stage?: RemarkStage | string;
}

export interface ActivityItem {
  id: string;
  timestamp?: string;
  timeAgo?: string;
  title?: string;
  description?: string;
  category?: string;
  user?: string;
  action?: string;
  entityType?: string;
  entityName?: string;
  details?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  read: boolean;
  timestamp: string;
}

export interface RolePermission {
  role: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface RoleItem {
  id: string;
  name: string;
  code?: string;
  description: string;
  permissions: string[];
}

export interface FirmSettings {
  companyName: string;
  taxId: string;
  defaultCurrency: string;
  fiscalYearStart: string;
  restApiEndpoint: string;
  enableMfa: boolean;
  jwtExpirationHours: number;
  themePreference: string;
}

export interface ReportData {
  monthlyRevenue: { month: string; revenue: number; target: number }[];
  dealStageDistribution?: { stage: string; count: number; value: number }[];
  industryBreakdown?: { name: string; percentage: number; color: string }[];
}

export interface ReportMetric extends ReportData {
  totalRevenue?: number;
  avgDealSize?: number;
  winRate?: number;
  partnerUtilization?: number;
  byIndustry?: { name: string; value: number }[];
}
