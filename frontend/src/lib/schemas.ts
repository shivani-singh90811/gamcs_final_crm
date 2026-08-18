import { z } from 'zod';

export const leadSchema = z.object({
  companyName: z.string().min(2, 'Company name is required (min 2 chars)'),
  contactName: z.string().min(2, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().default(''),
  industry: z.string().min(1, 'Industry is required'),
  estimatedValue: z.number().min(1000, 'Minimum value is $1,000'),
  stage: z.enum(['NEW_LEAD', 'CONTACTED', 'DISCOVERY', 'QUALIFIED', 'PITCH_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONTRACT', 'UNDER_REVIEW', 'CLOSED_WON', 'CLOSED_LOST', 'WON', 'LOST']),
  probability: z.number().min(0).max(100),
  assignedPartner: z.string().min(1, 'Assigned partner is required'),
  source: z.string().default('Inbound Partner Referral'),
  notes: z.string().default(''),
});

export type LeadFormData = z.infer<typeof leadSchema>;

export const clientSchema = z.object({
  name: z.string().min(2, 'Client name is required'),
  code: z.string().default('CLI-01'),
  industry: z.string().min(1, 'Industry is required'),
  monthlyRetainer: z.number().min(1000, 'Monthly retainer must be at least $1,000'),
  totalAssetsUnderMgmt: z.number().default(100000000),
  status: z.enum(['ACTIVE', 'ONBOARDING', 'RETAINER', 'PAUSED', 'ARCHIVED']),
  slaLevel: z.enum(['PLATINUM', 'GOLD', 'SILVER']),
  leadPartner: z.string().min(1, 'Lead partner is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(5, 'Valid phone is required'),
  activeEngagementsCount: z.number().default(1),
  healthScore: z.enum(['EXCELLENT', 'GOOD', 'NEEDS_ATTENTION', 'AT_RISK']).default('EXCELLENT'),
});

export type ClientFormData = z.infer<typeof clientSchema>;

export const projectSchema = z.object({
  name: z.string().min(3, 'Engagement name is required'),
  code: z.string().default('ENG-2026-01'),
  clientName: z.string().min(1, 'Client name is required'),
  clientId: z.string().min(1, 'Client selection is required'),
  leadManager: z.string().min(1, 'Lead manager is required'),
  budget: z.number().min(1000, 'Budget must be at least $1,000'),
  spentBudget: z.number().default(0),
  startDate: z.string().min(1, 'Start date is required'),
  targetEndDate: z.string().min(1, 'Target end date is required'),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'UNDER_AUDIT', 'COMPLETED', 'ON_HOLD']),
  completionPercentage: z.number().default(0),
  description: z.string().min(5, 'Description is required'),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export const taskSchema = z.object({
  title: z.string().min(3, 'Task title is required'),
  projectName: z.string().default('General Practice'),
  clientName: z.string().default('Internal'),
  assignee: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  estimatedHours: z.number().min(1, 'Estimated hours required'),
  loggedHours: z.number().default(0),
  description: z.string().min(3, 'Task description is required'),
});

export type TaskFormData = z.infer<typeof taskSchema>;

export const proposalSchema = z.object({
  title: z.string().min(3, 'Proposal title is required'),
  clientName: z.string().min(2, 'Client name is required'),
  contactEmail: z.string().email('Valid contact email is required'),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'REVISED']),
  validUntil: z.string().min(1, 'Valid until date is required'),
  totalAmount: z.number().min(100, 'Total amount must be greater than $100'),
  executiveSummary: z.string().min(10, 'Executive summary required'),
  scopeOfWork: z.string().min(10, 'Scope of work required'),
  preparedBy: z.string().min(1, 'Preparer name required'),
  items: z.array(z.object({
    id: z.string(),
    description: z.string(),
    hoursOrUnits: z.number(),
    rate: z.number(),
    total: z.number()
  })).default([])
});

export type ProposalFormData = z.infer<typeof proposalSchema>;

export const invoiceSchema = z.object({
  clientName: z.string().min(2, 'Client name is required'),
  clientId: z.string().min(1, 'Client selection is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.enum(['PAID', 'PENDING', 'OVERDUE', 'DRAFT', 'CANCELLED']),
  subtotal: z.number().min(100, 'Subtotal required'),
  tax: z.number().default(0),
  totalAmount: z.number().min(100, 'Total amount required'),
  notes: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    serviceDescription: z.string(),
    amount: z.number()
  })).default([])
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

export const documentSchema = z.object({
  title: z.string().min(3, 'Document title is required'),
  category: z.enum(['CONTRACT', 'FINANCIAL_MODEL', 'TAX_FILING', 'AUDIT_REPORT', 'PROPOSAL_DOC']),
  clientName: z.string().min(2, 'Client name is required'),
  uploadedBy: z.string().default('Sarah Jenkins'),
  fileSize: z.string().default('5.2 MB'),
  fileType: z.string().default('Excel Spreadsheet'),
  version: z.string().default('v1.0'),
  aiSummary: z.string().optional(),
});

export type DocumentFormData = z.infer<typeof documentSchema>;

export const meetingSchema = z.object({
  title: z.string().min(3, 'Meeting title is required'),
  clientName: z.string().min(1, 'Client name is required'),
  meetingDate: z.string().min(1, 'Meeting date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  type: z.enum(['STRATEGY_REVIEW', 'BOARD_PRESENTATION', 'AUDIT_PREP', 'DISCOVERY', 'TAX_PLANNING']),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']),
  location: z.string().min(2, 'Location is required'),
  agenda: z.string().min(5, 'Agenda is required'),
  summaryNotes: z.string().optional(),
  attendees: z.array(z.string()).default(['Sarah Jenkins', 'Julia Thorne']),
});

export type MeetingFormData = z.infer<typeof meetingSchema>;
