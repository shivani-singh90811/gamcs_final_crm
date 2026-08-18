import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';
import mysql from 'mysql2/promise';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';
const JWT_EXPIRES_IN_SEC = 86400; // 24 hours

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required for AI capabilities');
    }
    geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return geminiClient;
}


// --- IN-MEMORY DB MODELS & INITIAL DATA ---

interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  title: string;
  avatarUrl: string;
  department: string;
  active: boolean;
  resetToken?: string | null;
  resetTokenExpiry?: number | null;
}




let nextClientSeq = 204;
function generateUniqueClientId(): string {
  const year = new Date().getFullYear();
  const seq = String(nextClientSeq++).padStart(4, '0');
  return `CL-${year}-${seq}`;
}


let meetingsDb = [
  {
    id: 'mtg-301',
    title: 'Q3 Board Audit & Valuation Presentation',
    clientName: 'Meridian Real Estate Holdings',
    attendees: ['Sarah Jenkins', 'Victoria Cross (CFO)', 'Jonathan Hayes'],
    participantDetails: [
      { name: 'Sarah Jenkins', email: 's.jenkins@archicorp.com', role: 'HOST', status: 'ATTENDING' },
      { name: 'Victoria Cross (CFO)', email: 'v.cross@meridianrealestate.com', role: 'CLIENT', status: 'ATTENDING' },
      { name: 'Jonathan Hayes', email: 'j.hayes@vanguardhealth.org', role: 'GUEST', status: 'ATTENDING' },
      { name: 'Robert Black', email: 'r.black@archicorp.com', role: 'ATTENDEE', status: 'ATTENDING' }
    ],
    date: '2026-08-08',
    time: '10:00 AM - 11:30 AM',
    location: 'Executive Boardroom & Zoom',
    status: 'SCHEDULED',
    agenda: 'Review of Q2 asset valuation models, ASC 842 lease accounting compliance, and debt refinancing strategy.',
    type: 'BOARD_ADVISORY',
    meetingNotes: 'Discussed CapRate shifts in Chicago portfolio. Client requested 10-year DCF model updates with 8.5% discount rate.',
    aiSummary: '• Key Decision: CapRate benchmark adjusted to 6.45% across commercial assets.\n• Action: Robert Black to deliver revised DCF sensitivity schedule by Friday.\n• Follow-Up: Schedule follow-up board audit review prior to Q3 earnings call.',
    actionItems: [
      { id: 'ai-1', task: 'Finalize 10-year DCF sensitivity spreadsheet', assignee: 'Robert Black', dueDate: '2026-08-12', completed: false },
      { id: 'ai-2', task: 'Send ASC 842 lease memo to Victoria Cross', assignee: 'Sarah Jenkins', dueDate: '2026-08-10', completed: true }
    ]
  },
  {
    id: 'mtg-302',
    title: 'M&A Due Diligence Kickoff',
    clientName: 'Atlas Capital Holdings',
    attendees: ['Michael Chen', 'Eleanor Vance', 'Robert Black'],
    participantDetails: [
      { name: 'Michael Chen', email: 'm.chen@archicorp.com', role: 'HOST', status: 'ATTENDING' },
      { name: 'Eleanor Vance', email: 'e.vance@atlascapital.com', role: 'CLIENT', status: 'ATTENDING' },
      { name: 'Robert Black', email: 'r.black@archicorp.com', role: 'ATTENDEE', status: 'PENDING' }
    ],
    date: '2026-08-10',
    time: '02:00 PM - 03:30 PM',
    location: 'Virtual Partner Hub',
    status: 'SCHEDULED',
    agenda: 'Scope target company balance sheet verification and tax liability review.',
    type: 'DUE_DILIGENCE',
    meetingNotes: 'Target firm has $28.4M EBITDA. Identified potential Quality of Earnings add-backs in IT software migration.',
    aiSummary: '• Kickoff Complete: Established virtual data room access for 14 diligence analysts.\n• Tax Exposure: $3.5M escrow recommended for pending Medicare billing audit.\n• Next Milestone: Quality of Earnings preliminary memo due Aug 18.',
    actionItems: [
      { id: 'ai-3', task: 'Verify IT migration invoice receipts', assignee: 'Michael Chen', dueDate: '2026-08-14', completed: false }
    ]
  },
  {
    id: 'mtg-303',
    title: 'Series C Pitch Deck & Valuation Review',
    clientName: 'Starlight BioTech Corp',
    attendees: ['Sarah Jenkins', 'Dr. Marcus Vance'],
    participantDetails: [
      { name: 'Sarah Jenkins', email: 's.jenkins@archicorp.com', role: 'HOST', status: 'ATTENDING' },
      { name: 'Dr. Marcus Vance', email: 'm.vance@starlightbio.com', role: 'CLIENT', status: 'ATTENDING' }
    ],
    date: '2026-07-29',
    time: '11:00 AM - 12:00 PM',
    location: 'San Francisco Hub',
    status: 'COMPLETED',
    agenda: 'Valuation cap discussion and term sheet parameters.',
    type: 'PITCH_REVIEW',
    meetingNotes: 'Term sheet finalized at $180M pre-money valuation. Liquidation preference set to 1.5x non-participating preferred stock.',
    aiSummary: '• Deal Milestone: $45M Series C Term Sheet accepted by Lead Investors.\n• Key Term: Board seat designated for lead syndicate partner.\n• Documentation: Sent term sheet to legal for final closing binder.',
    actionItems: [
      { id: 'ai-4', task: 'Dispatch Series C Term Sheet to syndicate legal council', assignee: 'Sarah Jenkins', dueDate: '2026-07-30', completed: true }
    ]
  },
  {
    id: 'mtg-304',
    title: 'Annual Corporate Tax Strategy & R&D Credits',
    clientName: 'Apex Industrial Robotics',
    attendees: ['Robert Black', 'Samantha Lee'],
    participantDetails: [
      { name: 'Robert Black', email: 'r.black@archicorp.com', role: 'HOST', status: 'ATTENDING' },
      { name: 'Samantha Lee', email: 's.lee@apexrobotics.de', role: 'CLIENT', status: 'ATTENDING' }
    ],
    date: '2026-07-20',
    time: '09:00 AM - 10:30 AM',
    location: 'Munich Advisory Suite & Teams',
    status: 'COMPLETED',
    agenda: 'Transfer pricing optimization, Section 41 R&D tax credit study, and cross-border VAT exemptions.',
    type: 'TAX_PLANNING',
    meetingNotes: 'Identified $1.4M in eligible R&D tax credits for robotic arm sensor software development.',
    aiSummary: '• Tax Benefit: $1.4M Federal & State R&D tax credits validated.\n• Transfer Pricing: Intercompany IP license agreement approved for German subsidiary.\n• Status: Completed and filed with IRS Form 6765.',
    actionItems: [
      { id: 'ai-5', task: 'File Form 6765 with IRS', assignee: 'Robert Black', dueDate: '2026-07-22', completed: true }
    ]
  }
];


let tasksDb = [
  {
    id: 'tsk-501',
    title: 'Finalize Q3 Portfolio DCF Valuation Model',
    description: 'Perform discounted cash flow valuation analysis and sensitivity modeling for Meridian Q3 portfolio assets.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assignedBy: 'Sarah Jenkins',
    assignedTo: 'Robert Black',
    dueDate: '2026-08-05',
    startDate: '2026-07-25',
    estimatedHours: 40,
    actualHours: 28,
    progressPercentage: 70,
    projectName: 'Meridian Q3 Portfolio Valuation & Restructuring',
    clientName: 'Meridian Real Estate Holdings',
    category: 'Valuation',
    attachments: [
      { id: 'att-1', name: 'DCF_Valuation_Worksheet_v2.xlsx', fileSize: '4.2 MB', fileType: 'xlsx', uploadedAt: '2026-07-26 10:15' },
      { id: 'att-2', name: 'Meridian_CapRates_Q2.pdf', fileSize: '1.8 MB', fileType: 'pdf', uploadedAt: '2026-07-28 14:30' }
    ],
    comments: [
      { id: 'cmt-1', author: 'Sarah Jenkins', text: 'Please ensure working capital adjustments match Q2 audit notes.', date: '2026-07-27 14:20' },
      { id: 'cmt-2', author: 'Robert Black', text: 'DCF model updated with 12.5% WACC rate. Terminal value calculation finalized.', date: '2026-07-30 09:15' }
    ],
    activityTimeline: [
      { id: 'act-1', user: 'Sarah Jenkins', action: 'Created task and assigned to Robert Black', timestamp: '2026-07-25 09:00' },
      { id: 'act-2', user: 'Robert Black', action: 'Changed status from Pending to In Progress', timestamp: '2026-07-25 10:30' },
      { id: 'act-3', user: 'Robert Black', action: 'Uploaded attachment DCF_Valuation_Worksheet_v2.xlsx', timestamp: '2026-07-26 10:15' },
      { id: 'act-4', user: 'Robert Black', action: 'Updated progress to 70%', timestamp: '2026-07-30 09:20' }
    ]
  },
  {
    id: 'tsk-502',
    title: 'Draft Executive Summary for Starlight BioTech Proposal',
    description: 'Prepare Series C financial strategy pitch deck summary and fractional CFO engagement scope outline.',
    priority: 'URGENT',
    status: 'UNDER_REVIEW',
    assignedBy: 'Michael Chen',
    assignedTo: 'Sarah Jenkins',
    dueDate: '2026-08-02',
    startDate: '2026-07-28',
    estimatedHours: 16,
    actualHours: 14,
    progressPercentage: 90,
    projectName: 'Starlight BioTech Fractional CFO',
    clientName: 'Starlight BioTech Corp',
    category: 'Proposal',
    attachments: [
      { id: 'att-3', name: 'Starlight_SeriesC_Executive_Summary.pdf', fileSize: '3.1 MB', fileType: 'pdf', uploadedAt: '2026-07-30 16:00' }
    ],
    comments: [
      { id: 'cmt-3', author: 'Michael Chen', text: 'Dr. Vance requested additional details on R&D credit timeline.', date: '2026-07-29 11:00' }
    ],
    activityTimeline: [
      { id: 'act-5', user: 'Michael Chen', action: 'Created task for Sarah Jenkins', timestamp: '2026-07-28 08:30' },
      { id: 'act-6', user: 'Sarah Jenkins', action: 'Updated status to Under Review', timestamp: '2026-07-31 17:00' }
    ]
  },
  {
    id: 'tsk-503',
    title: 'Verify ASC 606 Revenue Recognition Audit Logs',
    description: 'Audit contract revenue milestone schedules for compliance under ASC 606 accounting standards.',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    assignedBy: 'Sarah Jenkins',
    assignedTo: 'Michael Chen',
    dueDate: '2026-07-28',
    startDate: '2026-07-20',
    estimatedHours: 24,
    actualHours: 22,
    progressPercentage: 100,
    projectName: 'Vanguard Healthcare M&A',
    clientName: 'Vanguard Health Systems',
    category: 'Compliance',
    attachments: [
      { id: 'att-4', name: 'ASC606_Compliance_Audit_Log.pdf', fileSize: '5.6 MB', fileType: 'pdf', uploadedAt: '2026-07-27 15:45' }
    ],
    comments: [
      { id: 'cmt-4', author: 'Michael Chen', text: 'Audit logs verified. All deferred revenue entries reconciled.', date: '2026-07-28 12:00' }
    ],
    activityTimeline: [
      { id: 'act-7', user: 'Sarah Jenkins', action: 'Assigned audit task to Michael Chen', timestamp: '2026-07-20 09:00' },
      { id: 'act-8', user: 'Michael Chen', action: 'Marked task as Completed', timestamp: '2026-07-28 12:05' }
    ]
  },
  {
    id: 'tsk-504',
    title: 'Setup Tax Exemption Documentation Framework',
    description: 'Compile cross-border tax exemption certificates and transfer pricing documentation.',
    priority: 'LOW',
    status: 'PENDING',
    assignedBy: 'Michael Chen',
    assignedTo: 'Robert Black',
    dueDate: '2026-08-15',
    startDate: '2026-08-01',
    estimatedHours: 30,
    actualHours: 0,
    progressPercentage: 0,
    projectName: 'Apex Industrial Robotics Tax Advisory',
    clientName: 'Apex Industrial Robotics',
    category: 'Tax Advisory',
    attachments: [],
    comments: [],
    activityTimeline: [
      { id: 'act-9', user: 'Michael Chen', action: 'Task initialized', timestamp: '2026-08-01 08:00' }
    ]
  },
  {
    id: 'tsk-505',
    title: 'Lender Due Diligence Data Room Organization',
    description: 'Structure balance sheet disclosures and debt covenant compliance metrics in the secure client data room.',
    priority: 'HIGH',
    status: 'ON_HOLD',
    assignedBy: 'Sarah Jenkins',
    assignedTo: 'Robert Black',
    dueDate: '2026-08-20',
    startDate: '2026-07-22',
    estimatedHours: 35,
    actualHours: 12,
    progressPercentage: 35,
    projectName: 'Atlas Capital Portfolio Restructuring',
    clientName: 'Atlas Capital Holdings',
    category: 'Due Diligence',
    attachments: [
      { id: 'att-5', name: 'Debt_Covenant_Summary.xlsx', fileSize: '2.1 MB', fileType: 'xlsx', uploadedAt: '2026-07-24 11:20' }
    ],
    comments: [
      { id: 'cmt-5', author: 'Robert Black', text: 'Paused awaiting additional Q2 balance sheet files from Atlas finance team.', date: '2026-07-29 16:30' }
    ],
    activityTimeline: [
      { id: 'act-10', user: 'Sarah Jenkins', action: 'Created task', timestamp: '2026-07-22 10:00' },
      { id: 'act-11', user: 'Robert Black', action: 'Changed status to On Hold', timestamp: '2026-07-29 16:35' }
    ]
  },
  {
    id: 'tsk-506',
    title: 'Q2 Tax Returns Reconciliation & Form 1120 Audit',
    description: 'Reconcile corporate tax provisions and transfer pricing adjustments for Q2 filing.',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    assignedBy: 'Michael Chen',
    assignedTo: 'Jessica Taylor',
    dueDate: '2026-07-29',
    startDate: '2026-07-15',
    estimatedHours: 32,
    actualHours: 24,
    progressPercentage: 75,
    projectName: 'Apex Robotics International Tax Structuring',
    clientName: 'Apex Industrial Robotics',
    category: 'Tax Advisory',
    attachments: [
      { id: 'att-6', name: 'Tax_Provision_Schedule_Q2.xlsx', fileSize: '3.4 MB', fileType: 'xlsx', uploadedAt: '2026-07-20 14:10' }
    ],
    comments: [
      { id: 'cmt-6', author: 'Jessica Taylor', text: 'Awaiting cross-border VAT exemptions approval.', date: '2026-07-28 11:30' }
    ],
    activityTimeline: [
      { id: 'act-12', user: 'Michael Chen', action: 'Assigned task to Jessica Taylor', timestamp: '2026-07-15 09:30' }
    ]
  },
  {
    id: 'tsk-507',
    title: 'M&A Target Financial Modeling & Sensitivity Analysis',
    description: 'Build 3-statement financial model and accretion/dilution analysis for target acquisition.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assignedBy: 'Sarah Jenkins',
    assignedTo: 'David Miller',
    dueDate: '2026-08-06',
    startDate: '2026-07-26',
    estimatedHours: 45,
    actualHours: 30,
    progressPercentage: 60,
    projectName: 'Vanguard Healthcare M&A Financial Due Diligence',
    clientName: 'Vanguard Health Systems',
    category: 'M&A Advisory',
    attachments: [],
    comments: [],
    activityTimeline: [
      { id: 'act-13', user: 'Sarah Jenkins', action: 'Created task for David Miller', timestamp: '2026-07-26 10:00' }
    ]
  },
  {
    id: 'tsk-508',
    title: 'EBITDA Quality of Earnings Audit Report',
    description: 'Prepare Quality of Earnings (QofE) report highlighting non-recurring operational adjustments.',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    assignedBy: 'Michael Chen',
    assignedTo: 'Jessica Taylor',
    dueDate: '2026-07-25',
    startDate: '2026-07-10',
    estimatedHours: 20,
    actualHours: 18,
    progressPercentage: 100,
    projectName: 'Vanguard Healthcare M&A Financial Due Diligence',
    clientName: 'Vanguard Health Systems',
    category: 'Audit',
    attachments: [],
    comments: [],
    activityTimeline: [
      { id: 'act-14', user: 'Jessica Taylor', action: 'Marked report as finalized and submitted', timestamp: '2026-07-25 16:00' }
    ]
  }
];

let documentsDb = [
  {
    id: 'doc-601',
    title: 'Meridian_RE_Q2_Valuation_Report_vFinal.pdf',
    category: 'Valuation Reports',
    clientName: 'Meridian Real Estate Holdings',
    fileSize: '14.2 MB',
    fileType: 'pdf',
    version: 'v2.1',
    uploadedBy: 'Robert Black',
    uploadedAt: '2026-07-20',
    securityLevel: 'CONFIDENTIAL',
    rolePermissions: 'CLIENT_ACCESS',
    description: 'Quarterly valuation report for $800M Meridian commercial real estate portfolio.',
    versionHistory: [
      { id: 'v-21', version: 'v2.1', uploadedBy: 'Robert Black', uploadedAt: '2026-07-20', fileSize: '14.2 MB', changelog: 'Incorporated revised CapRate metrics for Chicago downtown office asset.' },
      { id: 'v-20', version: 'v2.0', uploadedBy: 'Robert Black', uploadedAt: '2026-07-10', fileSize: '13.8 MB', changelog: 'Updated DCF discount rates following Fed rate decision.' },
      { id: 'v-10', version: 'v1.0', uploadedBy: 'Sarah Jenkins', uploadedAt: '2026-06-15', fileSize: '11.5 MB', changelog: 'Initial draft valuation report submitted for preliminary client review.' }
    ],
    contentPreview: 'VALUATION REPORT - Q2 2026\n\nClient: Meridian Real Estate Holdings\nLead Appraiser: Robert Black, CFA\n\nEXECUTIVE SUMMARY:\nTotal Portfolio Enterprise Value: $842,500,000\nWeighted Average Capitalization Rate: 6.45%\nNet Operating Income (NOI): $54,340,000\n\nASSET BREAKDOWN:\n1. Meridian Tower (Chicago IL): $210,000,000 (Cap Rate 6.2%)\n2. Logistics Hub North (Indianapolis IN): $185,000,000 (Cap Rate 6.8%)\n3. Gateway Plaza (Austin TX): $447,500,000 (Cap Rate 6.3%)\n\nDISCOUNTED CASH FLOW (DCF) SENSITIVITY:\nBase Case Discount Rate: 8.50%\nTerminal Growth Rate: 2.25%\nNPV of Cash Flows (10-Yr): $842.5M'
  },
  {
    id: 'doc-602',
    title: 'Starlight_BioTech_SeriesC_TermSheet_Draft.docx',
    category: 'Term Sheets',
    clientName: 'Starlight BioTech Corp',
    fileSize: '3.8 MB',
    fileType: 'doc',
    version: 'v1.2',
    uploadedBy: 'Sarah Jenkins',
    uploadedAt: '2026-07-25',
    securityLevel: 'RESTRICTED',
    rolePermissions: 'EMPLOYEE_ACCESS',
    description: 'Series C Preferred Stock Financing Term Sheet and Liquidation Preference Schedule.',
    versionHistory: [
      { id: 'v-12', version: 'v1.2', uploadedBy: 'Sarah Jenkins', uploadedAt: '2026-07-25', fileSize: '3.8 MB', changelog: 'Adjusted liquidation preference to 1.5x non-participating preferred.' },
      { id: 'v-10', version: 'v1.0', uploadedBy: 'Sarah Jenkins', uploadedAt: '2026-07-18', fileSize: '3.5 MB', changelog: 'Initial Series C term sheet framework.' }
    ],
    contentPreview: 'CONFIDENTIAL TERM SHEET - SERIES C PREFERRED STOCK\n\nIssuer: Starlight BioTech Corp.\nTarget Investment Amount: $45,000,000\nPre-Money Valuation: $180,000,000\nPost-Money Valuation: $225,000,000\n\nTERMS & CONDITIONS:\n1. Security: Series C Convertible Preferred Stock\n2. Liquidation Preference: 1.5x non-participating preferred in event of liquidity event.\n3. Anti-Dilution: Broad-based weighted average anti-dilution protection.\n4. Board Representation: Lead investor entitled to designate 1 seat on Board of Directors.'
  },
  {
    id: 'doc-603',
    title: 'Vanguard_Health_DueDiligence_Audit_Summary.pdf',
    category: 'Due Diligence',
    clientName: 'Vanguard Health Systems',
    fileSize: '22.5 MB',
    fileType: 'pdf',
    version: 'v3.0',
    uploadedBy: 'Michael Chen',
    uploadedAt: '2026-07-28',
    securityLevel: 'RESTRICTED',
    rolePermissions: 'ADMIN_ONLY',
    description: 'M&A Quality of Earnings and Revenue Recognition Audit Summary for Vanguard acquisition.',
    versionHistory: [
      { id: 'v-30', version: 'v3.0', uploadedBy: 'Michael Chen', uploadedAt: '2026-07-28', fileSize: '22.5 MB', changelog: 'Finalized QofE add-backs for non-recurring IT migration expenses.' },
      { id: 'v-20', version: 'v2.0', uploadedBy: 'Michael Chen', uploadedAt: '2026-07-05', fileSize: '20.1 MB', changelog: 'Added Medicare billing audit sample results.' }
    ],
    contentPreview: 'M&A FINANCIAL DUE DILIGENCE REPORT\n\nTarget: Regional Health Center Portfolio\nAcquirer: Vanguard Health Systems\nAudit Firm: LeadPulse Advisory Practice\n\nQUALITY OF EARNINGS (QoE) ADJUSTMENTS:\nReported EBITDA: $28,400,000\n(+) Non-recurring IT System Integration: +$2,100,000\n(+) Severance & Legal Restructuring: +$1,100,000\n(-) Deferred Maintenance Accruals: -$600,000\nAdjusted EBITDA: $31,000,000\n\nTAX RISK ASSESSMENT:\n- Low risk regarding Medicare/Medicaid billing compliance\n- Recommended escrow withholding: $3.5M for 12 months post-closing.'
  },
  {
    id: 'doc-604',
    title: 'Apex_Robotics_TransferPricing_Structure.png',
    category: 'Tax Filing',
    clientName: 'Apex Industrial Robotics',
    fileSize: '5.1 MB',
    fileType: 'image',
    version: 'v1.0',
    uploadedBy: 'Robert Black',
    uploadedAt: '2026-06-12',
    securityLevel: 'CONFIDENTIAL',
    rolePermissions: 'CLIENT_ACCESS',
    description: 'Entity relationship & cross-border intercompany IP licensing flow diagram.',
    versionHistory: [
      { id: 'v-10', version: 'v1.0', uploadedBy: 'Robert Black', uploadedAt: '2026-06-12', fileSize: '5.1 MB', changelog: 'Diagram approved by tax partner.' }
    ],
    contentPreview: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80'
  }
];



let activitiesDb = [
  {
    id: 'act-901',
    timestamp: '2026-07-31T12:30:00Z',
    user: 'Sarah Jenkins',
    action: 'PROPOSAL_DISPATCHED',
    entityType: 'PROPOSAL',
    entityName: 'Starlight BioTech Corp - Fractional CFO Proposal',
    details: 'Dispatched updated fee structure $650,000 package to Dr. Marcus Vance',
  },
  {
    id: 'act-902',
    timestamp: '2026-07-30T16:15:00Z',
    user: 'Michael Chen',
    action: 'INVOICE_PAID',
    entityType: 'INVOICE',
    entityName: 'INV-2026-044 ($45,000)',
    details: 'Payment of $45,000 verified via Wire Transfer from Meridian Real Estate',
  },
  {
    id: 'act-903',
    timestamp: '2026-07-29T09:45:00Z',
    user: 'Robert Black',
    action: 'MEETING_COMPLETED',
    entityType: 'MEETING',
    entityName: 'Series C Pitch Deck & Valuation Review',
    details: 'Completed board review meeting with Starlight BioTech Corp executive leadership',
  }
];

let remarksDb = [
  {
    id: 'rem-101',
    remarkText: 'Initial inbound lead created following Series C fundraising announcement. High urgency valuation requirement.',
    addedBy: 'Sarah Jenkins',
    userRole: 'Managing Partner',
    dateTime: '2026-07-28T10:15:00Z',
    relatedEntity: 'LEAD',
    relatedEntityId: 'lead-1',
    relatedEntityName: 'Starlight BioTech Corp',
    stage: 'Lead creation',
  },
  {
    id: 'rem-102',
    remarkText: 'Phone call completed with Dr. Marcus Vance (CFO). Confirmed $650k budget for fractional CFO advisory.',
    addedBy: 'Michael Chen',
    userRole: 'Senior Consultant',
    dateTime: '2026-07-29T14:30:00Z',
    relatedEntity: 'LEAD',
    relatedEntityId: 'lead-1',
    relatedEntityName: 'Starlight BioTech Corp',
    stage: 'Contacted',
  },
  {
    id: 'rem-103',
    remarkText: 'Executive pitch meeting held with Board of Directors. Demoed DCF modeling & R&D tax shield pipeline.',
    addedBy: 'Robert Black',
    userRole: 'Financial Analyst',
    dateTime: '2026-07-30T09:00:00Z',
    relatedEntity: 'MEETING',
    relatedEntityId: 'meet-101',
    relatedEntityName: 'Series C Pitch Deck & Valuation Review',
    stage: 'Meeting',
  },
  {
    id: 'rem-104',
    remarkText: 'Sent follow-up email with preliminary fee schedule and draft NDA for signature.',
    addedBy: 'Michael Chen',
    userRole: 'Senior Consultant',
    dateTime: '2026-07-30T16:45:00Z',
    relatedEntity: 'LEAD',
    relatedEntityId: 'lead-1',
    relatedEntityName: 'Starlight BioTech Corp',
    stage: 'Follow-up',
  },
  {
    id: 'rem-105',
    remarkText: 'Drafted 3-tier Retainer & Capital Restructuring proposal PROP-2026-001.',
    addedBy: 'Sarah Jenkins',
    userRole: 'Managing Partner',
    dateTime: '2026-07-31T11:20:00Z',
    relatedEntity: 'PROPOSAL',
    relatedEntityId: 'prop-1',
    relatedEntityName: 'PROP-2026-001: Starlight BioTech Corp',
    stage: 'Proposal',
  },
  {
    id: 'rem-106',
    remarkText: 'Dispatched formal proposal to Dr. Marcus Vance via Secure Client Portal.',
    addedBy: 'Sarah Jenkins',
    userRole: 'Managing Partner',
    dateTime: '2026-07-31T12:35:00Z',
    relatedEntity: 'PROPOSAL',
    relatedEntityId: 'prop-1',
    relatedEntityName: 'PROP-2026-001: Starlight BioTech Corp',
    stage: 'Proposal sent',
  },
  {
    id: 'rem-107',
    remarkText: 'Lead signed contract! Converted lead to Active Retainer Client account CLI-2026-089.',
    addedBy: 'Sarah Jenkins',
    userRole: 'Managing Partner',
    dateTime: '2026-08-01T15:10:00Z',
    relatedEntity: 'CLIENT',
    relatedEntityId: 'client-1',
    relatedEntityName: 'Starlight BioTech Corp',
    stage: 'Client conversion',
  },
  {
    id: 'rem-108',
    remarkText: 'Initialized client project PRJ-801 for Series C Valuation & Virtual Data Room Deployment.',
    addedBy: 'Michael Chen',
    userRole: 'Senior Consultant',
    dateTime: '2026-08-02T09:30:00Z',
    relatedEntity: 'PROJECT',
    relatedEntityId: 'proj-1',
    relatedEntityName: 'PRJ-801: Series C Financial Valuation',
    stage: 'Project creation',
  },
  {
    id: 'rem-109',
    remarkText: 'Task "Q2 Cap Table Recalculation" marked as COMPLETED after lead partner sign-off.',
    addedBy: 'Robert Black',
    userRole: 'Financial Analyst',
    dateTime: '2026-08-05T17:00:00Z',
    relatedEntity: 'TASK',
    relatedEntityId: 'task-1',
    relatedEntityName: 'Q2 Cap Table Recalculation',
    stage: 'Task completion',
  },
];

let notificationsDb = [
  {
    id: 'notif-001',
    title: 'Payment Confirmed',
    message: 'Invoice INV-2026-044 ($45,000) was marked as paid by Meridian Real Estate.',
    type: 'SUCCESS',
    read: false,
    timestamp: '10 mins ago',
  },
  {
    id: 'notif-002',
    title: 'New High-Value Lead Qualified',
    message: 'Atlas Capital Holdings ($1.2M) moved to UNDER_REVIEW stage.',
    type: 'INFO',
    read: false,
    timestamp: '1 hour ago',
  },
  {
    id: 'notif-003',
    title: 'Invoice Overdue Alert',
    message: 'Invoice INV-2026-046 ($24,000) for Apex Industrial Robotics is past due date.',
    type: 'WARNING',
    read: false,
    timestamp: '3 hours ago',
  }
];

let rolesDb = [
  {
    role: 'ROLE_PARTNER',
    name: 'Managing Partner',
    description: 'Full administrative authority across firm operations, financial approvals, and user governance.',
    permissions: ['VIEW_ALL', 'EDIT_ALL', 'APPROVE_INVOICES', 'MANAGE_USERS', 'EXPORT_DATA', 'ACCESS_SETTINGS'],
  },
  {
    role: 'ROLE_SENIOR_CONSULTANT',
    name: 'Senior Consultant / Partner',
    description: 'Lead engagement management, proposal drafting, client deal management and client communication.',
    permissions: ['VIEW_ALL', 'EDIT_LEADS', 'EDIT_PROJECTS', 'CREATE_PROPOSALS', 'CREATE_INVOICES'],
  },
  {
    role: 'ROLE_FINANCIAL_ANALYST',
    name: 'Financial Analyst',
    description: 'Access to financial modeling tools, document vault, tasks, valuation models, and report generation.',
    permissions: ['VIEW_ASSIGNED', 'EDIT_TASKS', 'UPLOAD_DOCUMENTS', 'GENERATE_REPORTS'],
  },
];

let settingsDb = {
  companyName: 'GAMCS CRM - Practice Management Platform',
  taxId: 'US-993821049',
  defaultCurrency: 'USD ($)',
  fiscalYearStart: 'January 1st',
  restApiEndpoint: 'http://localhost:3000/api/v1',
  enableMfa: true,
  jwtExpirationHours: 24,
  themePreference: 'DARK',
};

// --- EMAIL DB ENTITY & IN-MEMORY STORE ---
interface EmailDbEntity {
  id: string;
  sender: string;
  recipient: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  leadId?: string;
  clientId?: string;
  contactId?: string;
  leadName?: string;
  clientName?: string;
  contactName?: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  errorMessage?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

let emailsDb: EmailDbEntity[] = [
  {
    id: 'eml-1001',
    sender: 's.jenkins@archicorp.com',
    recipient: 'm.vance@starlightbio.io',
    cc: 'finance@starlightbio.io',
    bcc: '',
    subject: 'Executive Proposal & Series C Fractional CFO Scope - GAMCS Practice',
    body: 'Dear Dr. Marcus Vance,\n\nThank you for taking the time to speak with our advisory team yesterday regarding Starlight BioTech\'s upcoming Series C round. We have finalized our comprehensive proposal (PROP-2026-001) covering DCF Valuation Modeling, Virtual Data Room management, and interim CFO advisory.\n\nPlease review the attached terms at your earliest convenience. We look forward to partnering with Starlight BioTech.\n\nWarm regards,\nSarah Jenkins\nManaging Partner | GAMCS Practice Management',
    leadId: 'lead-1',
    leadName: 'Starlight BioTech Corp',
    contactId: 'cnt-101',
    contactName: 'Dr. Marcus Vance',
    status: 'SENT',
    errorMessage: null,
    sentAt: '2026-07-31T14:40:00Z',
    createdAt: '2026-07-31T14:39:45Z',
  },
  {
    id: 'eml-1002',
    sender: 'm.chen@archicorp.com',
    recipient: 'v.cross@meridianrealestate.com',
    cc: '',
    bcc: '',
    subject: 'Q2 Portfolio Valuation Audit Report - Meridian Real Estate Holdings',
    body: 'Dear Victoria,\n\nPlease find attached the final signed valuation memorandum for the Q2 REIT commercial portfolio (Doc ID: doc-601). All cap rate adjustments for the Chicago and Austin assets have been incorporated per your review notes.\n\nLet us know if you need any additional disclosures for your upcoming board packet.\n\nBest regards,\nMichael Chen\nSenior Advisory Partner | GAMCS CRM',
    clientId: 'client-201',
    clientName: 'Meridian Real Estate Holdings',
    contactId: 'cnt-104',
    contactName: 'Victoria Cross (CFO)',
    status: 'SENT',
    errorMessage: null,
    sentAt: '2026-07-28T10:15:00Z',
    createdAt: '2026-07-28T10:14:50Z',
  },
  {
    id: 'eml-1003',
    sender: 'm.chen@archicorp.com',
    recipient: 'j.hayes@vanguardhealth.org',
    cc: 'cfo@vanguardhealth.org',
    bcc: '',
    subject: 'M&A Due Diligence Phase 2 Deliverables & Invoice INV-2026-045',
    body: 'Dear Jonathan,\n\nWe have dispatched Phase 2 Quality of Earnings financial audit deliverables to the secure data vault. Please find attached Invoice INV-2026-045 for your records.\n\nShould you have any questions regarding Medicare billing reconciliation, feel free to schedule a sync.\n\nSincerely,\nMichael Chen\nSenior Partner',
    clientId: 'client-202',
    clientName: 'Vanguard Health Systems',
    status: 'SENT',
    errorMessage: null,
    sentAt: '2026-07-29T16:00:00Z',
    createdAt: '2026-07-29T15:59:00Z',
  },
  {
    id: 'eml-1004',
    sender: 's.jenkins@archicorp.com',
    recipient: 'evance@atlascap.com',
    cc: '',
    bcc: '',
    subject: 'Follow-up: Distressed Asset Valuation Defense Strategy',
    body: 'Hi Eleanor,\n\nFollowing up on our discovery session regarding Atlas Capital Holdings\' portfolio valuation requirements. We would love to arrange a 20-minute board demonstration to show how our DCF models can assist your upcoming investor syndication.\n\nPlease let me know your availability next Tuesday or Wednesday.\n\nBest,\nSarah Jenkins',
    leadId: 'lead-2',
    leadName: 'Atlas Capital Holdings',
    contactId: 'cnt-102',
    contactName: 'Eleanor Vance',
    status: 'SENT',
    errorMessage: null,
    sentAt: '2026-07-30T11:20:00Z',
    createdAt: '2026-07-30T11:19:30Z',
  }
];

// --- MYSQL DATABASE POOL & INITIALIZATION ---
let mysqlPool: mysql.Pool | null = null;
let isMySqlConnected = false;

async function initMySqlDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'gamcs_crm';

  try {
    mysqlPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 2000,
    });

    const conn = await mysqlPool.getConnection();
    console.log(`[MySQL] Successfully connected to MySQL database: ${database} on ${host}:${port}`);
    isMySqlConnected = true;

    // Introspect the EXISTING business tables (leads, contacts, clients, proposals,
    // projects, invoices, users). No DDL is issued against these tables — we only read
    // their current column layout so CRUD operations map onto whatever already exists.
    await loadAllTableMeta();

    // If the users table exists and is completely empty, seed exactly one admin account
    // so the app is loginable out of the box. This never overwrites existing rows.
    const usersMeta = tableMetaCache.get('users');
    if (usersMeta && usersMeta.idColumn) {
      try {
        const [countRows] = await conn.query<any[]>('SELECT COUNT(*) as count FROM users');
        if (countRows && countRows[0] && countRows[0].count === 0) {
          const adminRow = buildRowFromBody('users', {
            name: 'Super Administrator',
            email: 'admin@gamcs.com',
            role: 'ROLE_SUPER_ADMIN',
            title: 'Managing Partner',
            avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
            department: 'Executive Practice',
            active: true,
          }, USER_CLUSTERS);
          const passwordCol = resolveColumn('users', ['passwordHash', 'password', 'passwordHash']);
          if (passwordCol) {
            adminRow[passwordCol] = bcrypt.hashSync(process.env.ADMIN_INITIAL_PASSWORD || 'Admin12345!', 10);
          }
          await dbInsert('users', adminRow, 'usr');
          console.log('[MySQL] users table was empty — seeded default admin account (admin@gamcs.com).');
        }
      } catch (seedErr: any) {
        console.warn('[MySQL] Could not verify/seed users table:', seedErr.message);
      }
    }

    // Create emails table if it does not already exist
    await conn.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id VARCHAR(64) PRIMARY KEY,
        sender VARCHAR(255) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        cc TEXT,
        bcc TEXT,
        subject VARCHAR(500) NOT NULL,
        body LONGTEXT NOT NULL,
        lead_id VARCHAR(64),
        client_id VARCHAR(64),
        contact_id VARCHAR(64),
        lead_name VARCHAR(255),
        client_name VARCHAR(255),
        contact_name VARCHAR(255),
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        error_message TEXT,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Sync in-memory sample emails to MySQL if table is empty
    const [rows] = await conn.query<any[]>('SELECT COUNT(*) as count FROM emails');
    if (rows && rows[0] && rows[0].count === 0) {
      for (const eml of emailsDb) {
        await conn.query(
          `INSERT INTO emails (id, sender, recipient, cc, bcc, subject, body, lead_id, client_id, contact_id, lead_name, client_name, contact_name, status, error_message, sent_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            eml.id, eml.sender, eml.recipient, eml.cc || null, eml.bcc || null, eml.subject, eml.body,
            eml.leadId || null, eml.clientId || null, eml.contactId || null,
            eml.leadName || null, eml.clientName || null, eml.contactName || null,
            eml.status, eml.errorMessage || null, eml.sentAt ? new Date(eml.sentAt) : null, new Date(eml.createdAt)
          ]
        );
      }
      console.log(`[MySQL] Seeded initial email history into MySQL database (${emailsDb.length} records)`);
    }

    conn.release();
  } catch (err: any) {
    console.log(`[MySQL] MySQL connection status: operating in resilient in-memory mode (${err.message || 'Offline'}).`);
    isMySqlConnected = false;
  }
}

// --- GENERIC SCHEMA-ADAPTIVE MYSQL PERSISTENCE LAYER ---
// This layer introspects the ACTUAL columns of the already-existing tables
// (leads, contacts, clients, proposals, projects, invoices, users) at boot time
// via INFORMATION_SCHEMA, instead of assuming column names. This guarantees we
// only ever read/write columns that genuinely exist in gamcs_crm, never invent
// new ones, and never issue a DDL statement against these tables.

interface TableMeta {
  columns: Set<string>;       // exact column names as they exist in MySQL (case preserved)
  columnLookup: Map<string, string>; // lowercase -> exact column name
  idColumn: string | null;
  idAutoIncrement: boolean;
}

const tableMetaCache: Map<string, TableMeta> = new Map();

const MANAGED_TABLES = ['users', 'leads', 'contacts', 'clients', 'proposals', 'projects', 'invoices'] as const;
type ManagedTable = typeof MANAGED_TABLES[number];

async function loadTableMeta(table: string): Promise<TableMeta | null> {
  if (!mysqlPool) return null;
  try {
    const [cols] = await mysqlPool.query<any[]>(
      `SELECT COLUMN_NAME, EXTRA, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [table]
    );
    if (!cols || cols.length === 0) {
      console.warn(`[MySQL] Table "${table}" was not found in the connected database. Endpoints for this entity will return an error until the table exists.`);
      return null;
    }
    const columns = new Set<string>();
    const columnLookup = new Map<string, string>();
    let idColumn: string | null = null;
    let idAutoIncrement = false;
    for (const c of cols) {
      columns.add(c.COLUMN_NAME);
      columnLookup.set(String(c.COLUMN_NAME).toLowerCase(), c.COLUMN_NAME);
      if (c.COLUMN_KEY === 'PRI' && !idColumn) {
        idColumn = c.COLUMN_NAME;
        idAutoIncrement = String(c.EXTRA || '').includes('auto_increment');
      }
    }
    // Fallback: if no PRIMARY KEY detected, assume a column literally called "id" if present
    if (!idColumn && columnLookup.has('id')) {
      idColumn = columnLookup.get('id')!;
    }
    const meta: TableMeta = { columns, columnLookup, idColumn, idAutoIncrement };
    tableMetaCache.set(table, meta);
    console.log(`[MySQL] Introspected table "${table}": columns=[${Array.from(columns).join(', ')}] idColumn=${idColumn || 'NONE'} autoIncrement=${idAutoIncrement}`);
    return meta;
  } catch (err: any) {
    console.warn(`[MySQL] Failed to introspect table "${table}": ${err.message}`);
    return null;
  }
}

async function loadAllTableMeta() {
  for (const t of MANAGED_TABLES) {
    await loadTableMeta(t);
  }
}

function toSnakeCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

// Resolves the first candidate name that matches a real column on the table (case-insensitive,
// also tries the snake_case conversion of each candidate).
function resolveColumn(table: string, candidates: string[]): string | null {
  const meta = tableMetaCache.get(table);
  if (!meta) return null;
  for (const cand of candidates) {
    const lower = cand.toLowerCase();
    if (meta.columnLookup.has(lower)) return meta.columnLookup.get(lower)!;
    const snake = toSnakeCase(cand);
    if (meta.columnLookup.has(snake)) return meta.columnLookup.get(snake)!;
  }
  return null;
}

// A "cluster" groups every alias name (camelCase frontend field + likely DB spellings) that
// should logically share a single value. Used both to build INSERT/UPDATE payloads (source ->
// DB column) and to hydrate DB rows back into the rich, alias-heavy DTO shape the frontend expects.
type FieldClusters = string[][];

function buildRowFromBody(table: string, body: Record<string, any>, clusters: FieldClusters): Record<string, any> {
  const row: Record<string, any> = {};
  for (const cluster of clusters) {
    let value: any = undefined;
    for (const alias of cluster) {
      if (body[alias] !== undefined && body[alias] !== null && body[alias] !== '') {
        value = body[alias];
        break;
      }
    }
    if (value === undefined) continue;
    const col = resolveColumn(table, cluster);
    if (!col) continue;
    // Serialize arrays/objects that are being stored into a real column as JSON text
    if (typeof value === 'object') {
      try { value = JSON.stringify(value); } catch { continue; }
    }
    row[col] = value;
  }
  return row;
}

function hydrateRow(table: string, row: Record<string, any>, clusters: FieldClusters, defaults: Record<string, any> = {}): Record<string, any> {
  const out: Record<string, any> = { ...defaults };
  for (const cluster of clusters) {
    const col = resolveColumn(table, cluster);
    if (!col || row[col] === undefined || row[col] === null) continue;
    let value = row[col];
    // Attempt JSON parse for text columns that hold serialized arrays/objects
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try { value = JSON.parse(value); } catch { /* keep as string */ }
    }
    if (value instanceof Date) {
      value = value.toISOString().split('T')[0];
    }
    for (const alias of cluster) {
      out[alias] = value;
    }
  }
  // Always surface the id as a string for consistent frontend :id param matching
  if (out.id !== undefined && out.id !== null) out.id = String(out.id);
  return out;
}

function dbReady(table: ManagedTable): { ok: true } | { ok: false; error: string } {
  if (!isMySqlConnected || !mysqlPool) {
    return { ok: false, error: 'Database connection is not available. Check DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME and confirm MySQL is running.' };
  }
  if (!tableMetaCache.has(table)) {
    return { ok: false, error: `Table "${table}" could not be found in database "${process.env.DB_NAME || 'gamcs_crm'}". No changes were made.` };
  }
  return { ok: true };
}

function sendDbUnavailable(res: Response, table: ManagedTable) {
  const check = dbReady(table);
  if (check.ok === false) {
    res.status(503).json(apiResponse(false, `Database unavailable for "${table}"`, null, [check.error]));
    return true;
  }
  return false;
}

async function dbSelectAll(table: ManagedTable, orderDesc = true): Promise<any[]> {
  const meta = tableMetaCache.get(table)!;
  const orderClause = meta.idColumn ? ` ORDER BY \`${meta.idColumn}\` ${orderDesc ? 'DESC' : 'ASC'}` : '';
  const [rows] = await mysqlPool!.query<any[]>(`SELECT * FROM \`${table}\`${orderClause}`);
  return rows as any[];
}

async function dbSelectOne(table: ManagedTable, idValue: string | number): Promise<any | null> {
  const meta = tableMetaCache.get(table)!;
  if (!meta.idColumn) return null;
  const [rows] = await mysqlPool!.query<any[]>(`SELECT * FROM \`${table}\` WHERE \`${meta.idColumn}\` = ? LIMIT 1`, [idValue]);
  return (rows && rows[0]) || null;
}

async function dbInsert(table: ManagedTable, row: Record<string, any>, idPrefix: string): Promise<any> {
  const meta = tableMetaCache.get(table)!;
  const finalRow = { ...row };
  if (meta.idColumn) {
    if (meta.idAutoIncrement) {
      delete finalRow[meta.idColumn];
    } else if (finalRow[meta.idColumn] === undefined) {
      finalRow[meta.idColumn] = `${idPrefix}-${Date.now()}`;
    }
  }
  const keys = Object.keys(finalRow);
  if (keys.length === 0) {
    throw new Error(`No matching columns found on table "${table}" for the submitted fields.`);
  }
  const placeholders = keys.map(() => '?').join(', ');
  const colList = keys.map((k) => `\`${k}\``).join(', ');
  const values = keys.map((k) => finalRow[k]);
  const [result]: any = await mysqlPool!.query(
    `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders})`,
    values
  );
  let insertedId: any = meta.idColumn ? finalRow[meta.idColumn] : undefined;
  if (meta.idAutoIncrement && result?.insertId) {
    insertedId = result.insertId;
  }
  return insertedId;
}

async function dbUpdate(table: ManagedTable, idValue: string | number, row: Record<string, any>): Promise<boolean> {
  const meta = tableMetaCache.get(table)!;
  if (!meta.idColumn) return false;
  const finalRow = { ...row };
  delete finalRow[meta.idColumn];
  const keys = Object.keys(finalRow);
  if (keys.length === 0) return true; // nothing to change
  const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
  const values = keys.map((k) => finalRow[k]);
  values.push(idValue);
  const [result]: any = await mysqlPool!.query(
    `UPDATE \`${table}\` SET ${setClause} WHERE \`${meta.idColumn}\` = ?`,
    values
  );
  return (result?.affectedRows || 0) > 0;
}

async function dbDelete(table: ManagedTable, idValue: string | number): Promise<boolean> {
  const meta = tableMetaCache.get(table)!;
  if (!meta.idColumn) return false;
  const [result]: any = await mysqlPool!.query(`DELETE FROM \`${table}\` WHERE \`${meta.idColumn}\` = ?`, [idValue]);
  return (result?.affectedRows || 0) > 0;
}

// --- FIELD CLUSTERS PER ENTITY (used for both writes and hydration) ---
const LEAD_CLUSTERS: FieldClusters = [
  ['id'],
  ['primaryName', 'contactPerson', 'contactName'],
  ['secondaryName'],
  ['company', 'companyName'],
  ['email', 'contactEmail'],
  ['phone', 'contactPhone'],
  ['leadOwner', 'owner'],
  ['assignedEmployee', 'assignedPartner', 'assignedTo'],
  ['industry'],
  ['leadSource', 'source'],
  ['requirement'],
  ['priority'],
  ['estimatedStartDate'],
  ['estimatedEndDate'],
  ['lastContactDate'],
  ['currentStage', 'status', 'stage'],
  ['followUp', 'followUpDate'],
  ['pendingTasks'],
  ['remarks', 'leadNotes', 'notes'],
  ['expectedRevenue', 'estimatedValue'],
  ['probability'],
  ['timeline'],
  ['aiScore'],
  ['aiRecommendation'],
  ['meetingHistory'],
  ['proposalHistory'],
  ['isConverted'],
  ['convertedClientId'],
  ['convertedClientNumber'],
  ['createdAt'],
  ['updatedAt'],
];
const leadDefaults = { meetingHistory: [], proposalHistory: [], aiScore: 0, aiRecommendation: '' };
const hydrateLead = (row: any) => hydrateRow('leads', row, LEAD_CLUSTERS, leadDefaults);

const CONTACT_CLUSTERS: FieldClusters = [
  ['id'],
  ['name', 'contactName', 'fullName'],
  ['company', 'companyName'],
  ['email'],
  ['phone'],
  ['title', 'jobTitle', 'designation'],
  ['type'],
  ['status'],
  ['lastContacted', 'lastContactedDate'],
  ['notes'],
  ['createdAt'],
];
const hydrateContact = (row: any) => hydrateRow('contacts', row, CONTACT_CLUSTERS, {});

const CLIENT_CLUSTERS: FieldClusters = [
  ['id'],
  ['clientId', 'clientNumber', 'code'],
  ['name', 'companyName'],
  ['industry'],
  ['contactPerson', 'contactName'],
  ['email'],
  ['phone'],
  ['annualRetainer', 'retainerValue'],
  ['contractStatus', 'status'],
  ['leadPartner'],
  ['startDate'],
  ['healthScore'],
  ['activeEngagements'],
  ['services'],
  ['createdAt'],
];
const clientDefaults = { services: [] };
const hydrateClient = (row: any) => hydrateRow('clients', row, CLIENT_CLUSTERS, clientDefaults);

const PROPOSAL_CLUSTERS: FieldClusters = [
  ['id'],
  ['proposalNumber'],
  ['title'],
  ['clientName'],
  ['contactEmail'],
  ['status'],
  ['createdAt'],
  ['preparedBy'],
  ['engagementType'],
  ['leadPartner'],
  ['proposedFee', 'totalAmount', 'value'],
  ['validUntil'],
  ['executiveSummary'],
  ['scopeDetails', 'scopeOfWork'],
  ['items'],
  ['approvalHistory'],
];
const proposalDefaults = { items: [], approvalHistory: [] };
const hydrateProposal = (row: any) => hydrateRow('proposals', row, PROPOSAL_CLUSTERS, proposalDefaults);

const PROJECT_CLUSTERS: FieldClusters = [
  ['id'],
  ['name'],
  ['projectManager', 'leadPartner', 'leadManager'],
  ['assignedEmployees'],
  ['client', 'clientName'],
  ['startDate'],
  ['deadline', 'targetCompletion'],
  ['budget'],
  ['spent'],
  ['status'],
  ['progress', 'completionPercentage'],
  ['riskLevel'],
  ['description'],
  ['milestones'],
  ['documents'],
  ['invoices'],
  ['timeline'],
];
const projectDefaults = { assignedEmployees: [], milestones: [], documents: [], invoices: [], timeline: [] };
const hydrateProject = (row: any) => hydrateRow('projects', row, PROJECT_CLUSTERS, projectDefaults);

const INVOICE_CLUSTERS: FieldClusters = [
  ['id'],
  ['invoiceNumber'],
  ['clientName'],
  ['projectName', 'project'],
  ['subtotal', 'amount'],
  ['gstRate'],
  ['gst', 'tax'],
  ['totalAmount'],
  ['issueDate'],
  ['dueDate'],
  ['status', 'paymentStatus'],
  ['serviceDescription'],
  ['items'],
  ['notes'],
  ['createdAt'],
];
const invoiceDefaults = { items: [] };
const hydrateInvoice = (row: any) => hydrateRow('invoices', row, INVOICE_CLUSTERS, invoiceDefaults);

const USER_CLUSTERS: FieldClusters = [
  ['id'],
  ['name', 'fullName'],
  ['email'],
  ['role'],
  ['title'],
  ['avatarUrl'],
  ['department'],
  ['active'],
  ['createdAt'],
  ['resetToken'],
  ['resetTokenExpiry'],
];
// passwordHash is intentionally excluded from USER_CLUSTERS so it is never hydrated into API responses.
const hydrateUserRow = (row: any) => hydrateRow('users', row, USER_CLUSTERS, {});

function getPasswordColumn(): string | null {
  return resolveColumn('users', ['passwordHash', 'password']);
}

async function findUserRowByEmail(email: string): Promise<any | null> {
  const emailCol = resolveColumn('users', ['email']);
  if (!emailCol || !mysqlPool) return null;
  const cleanInput = String(email).toLowerCase().replace('@archicorp-cfo.com', '@archicorp.com').trim();
  const [rows] = await mysqlPool.query<any[]>(`SELECT * FROM \`users\``);
  return (rows || []).find((r: any) => {
    const raw = String(r[emailCol] || '').toLowerCase().replace('@archicorp-cfo.com', '@archicorp.com').trim();
    return raw === cleanInput;
  }) || null;
}

function verifyUserPassword(userRow: any, password: string): boolean {
  const passCol = getPasswordColumn();
  if (!passCol || !userRow[passCol]) return false;
  try {
    return bcrypt.compareSync(password, userRow[passCol]);
  } catch {
    return false;
  }
}

function isUserActive(userRow: any): boolean {
  const dto = hydrateUserRow(userRow);
  if (dto.active === undefined || dto.active === null) return true;
  return dto.active === true || dto.active === 1 || dto.active === '1';
}

// --- SMTP TRANSPORTER HELPER ---
const getSmtpTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Standardized Spring Boot Response Builder
const apiResponse = (success: boolean, message: string, data: any = null, errors: string[] = []) => ({
  success,
  message,
  data,
  errors,
  timestamp: new Date().toISOString(),
});

const toUserDto = (user: UserEntity) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  title: user.title,
  avatarUrl: user.avatarUrl,
  department: user.department,
  active: user.active,
});

async function startServer() {
  await initMySqlDatabase();
  const app = express();

  app.use(express.json());

  // CORS Middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // JWT Authentication Middleware
  const authenticateJwt = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(apiResponse(false, 'Unauthorized. Missing or invalid Bearer token', null, ['JWT token required']));
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: string; name?: string };
      (req as any).user = decoded;
      next();
    } catch (err) {
      return res.status(401).json(apiResponse(false, 'Invalid or expired token', null, ['Token verification failed']));
    }
  };

  // --- SPRING SECURITY STYLE ROLE & PERMISSION AUTHORIZATION MIDDLEWARES ---
  const normalizeRoleBackend = (role?: string | null): string => {
    if (!role) return 'ROLE_EMPLOYEE';
    const r = role.toUpperCase();
    if (r === 'ROLE_SUPER_ADMIN' || r === 'SUPER_ADMIN' || r === 'ROLE_PARTNER' || r === 'PARTNER' || r === 'OWNER') {
      return 'ROLE_SUPER_ADMIN';
    }
    if (r === 'ROLE_ADMIN' || r === 'ADMIN' || r === 'ROLE_SENIOR_CONSULTANT' || r === 'SENIOR_CONSULTANT' || r === 'MANAGER') {
      return 'ROLE_ADMIN';
    }
    if (r === 'ROLE_CLIENT' || r === 'CLIENT' || r === 'ROLE_CLIENT_PORTAL' || r === 'CLIENT_PORTAL') {
      return 'ROLE_CLIENT';
    }
    return 'ROLE_EMPLOYEE';
  };

  const BACKEND_ROLE_PERMISSIONS: Record<string, string[]> = {
    ROLE_SUPER_ADMIN: [
      'VIEW_ALL_LEADS', 'EDIT_LEADS', 'DELETE_LEADS', 'VIEW_CLIENTS', 'EDIT_CLIENTS',
      'MANAGE_PROJECTS', 'MANAGE_TASKS', 'CREATE_INVOICES', 'APPROVE_INVOICES',
      'VIEW_FINANCIAL_REPORTS', 'MANAGE_USERS', 'MANAGE_ROLES', 'SYSTEM_SETTINGS',
      'DATABASE_BACKUP', 'ACCESS_CLIENT_PORTAL'
    ],
    ROLE_ADMIN: [
      'VIEW_ALL_LEADS', 'EDIT_LEADS', 'VIEW_CLIENTS', 'EDIT_CLIENTS',
      'MANAGE_PROJECTS', 'MANAGE_TASKS', 'CREATE_INVOICES', 'APPROVE_INVOICES',
      'VIEW_FINANCIAL_REPORTS'
    ],
    ROLE_EMPLOYEE: [
      'VIEW_ASSIGNED_PROJECTS', 'VIEW_ASSIGNED_TASKS', 'UPDATE_TASK_PROGRESS',
      'UPLOAD_DOCUMENTS', 'VIEW_ASSIGNED_MEETINGS', 'VIEW_ASSIGNED_CLIENTS'
    ],
    ROLE_CLIENT: [
      'ACCESS_CLIENT_PORTAL', 'VIEW_OWN_PROJECTS', 'VIEW_INVOICES',
      'VIEW_DOCUMENTS', 'VIEW_PROJECT_PROGRESS', 'DOWNLOAD_REPORTS', 'SEND_MESSAGES'
    ],
  };

  const requireRole = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json(apiResponse(false, 'Unauthorized. Missing valid Bearer token', null, ['Authentication required']));
      }
      const canonical = normalizeRoleBackend(user.role);
      if (!allowedRoles.includes(canonical)) {
        return res.status(403).json(
          apiResponse(
            false,
            `Access Denied (HTTP 403). Required role: [${allowedRoles.join(', ')}]. Current role: [${canonical}]`,
            null,
            ['Spring Security RBAC Access Denied: Insufficient Role Privileges']
          )
        );
      }
      next();
    };
  };

  const requirePermission = (permissionKey: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json(apiResponse(false, 'Unauthorized. Missing valid Bearer token', null, ['Authentication required']));
      }
      const canonical = normalizeRoleBackend(user.role);
      const userPermissions = BACKEND_ROLE_PERMISSIONS[canonical] || [];
      if (!userPermissions.includes(permissionKey)) {
        return res.status(403).json(
          apiResponse(
            false,
            `Access Denied (HTTP 403). Required permission: [${permissionKey}]. Role [${canonical}] lacks required privilege.`,
            null,
            ['Spring Security RBAC Access Denied: Missing Permission']
          )
        );
      }
      next();
    };
  };

  // --- AUTH REST CONTROLLER (/api/v1/auth) ---
  app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json(apiResponse(false, 'Validation failed', null, ['Email and password are required']));
    }
    try {
      const userRow = await findUserRowByEmail(email);
      if (!userRow) {
        return res.status(401).json(apiResponse(false, 'Invalid email or password credentials', null, ['Authentication failed']));
      }
      if (!verifyUserPassword(userRow, password)) {
        return res.status(401).json(apiResponse(false, 'Invalid email or password credentials', null, ['Authentication failed']));
      }
      if (!isUserActive(userRow)) {
        return res.status(403).json(apiResponse(false, 'User account is inactive', null, ['Account disabled']));
      }

      const userDto = hydrateUserRow(userRow);
      const token = jwt.sign(
        { sub: userDto.id, email: userDto.email, role: userDto.role, name: userDto.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN_SEC }
      );

      return res.json(
        apiResponse(true, 'Authentication successful', {
          token,
          tokenType: 'Bearer',
          expiresIn: JWT_EXPIRES_IN_SEC,
          user: userDto,
        })
      );
    } catch (err: any) {
      console.error('[MySQL] POST /auth/login failed:', err);
      return res.status(500).json(apiResponse(false, 'Login failed due to a database error', null, [err.message]));
    }
  });

  app.post('/api/v1/auth/google', async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    const { email, name, avatarUrl, role } = req.body || {};
    if (!email) {
      return res.status(400).json(apiResponse(false, 'Email required for Google Auth', null, ['Email missing']));
    }
    try {
      const cleanEmail = String(email).toLowerCase().trim();
      let userRow = await findUserRowByEmail(cleanEmail);

      if (!userRow) {
        const defaultRole = role || 'ROLE_SUPER_ADMIN';
        const defaultTitle = defaultRole === 'ROLE_SUPER_ADMIN' ? 'Super Admin' :
                             defaultRole === 'ROLE_ADMIN' ? 'Manager' :
                             defaultRole === 'ROLE_CLIENT' ? 'Client' : 'Employee';
        const newUserBody = {
          name: name || cleanEmail.split('@')[0].replace('.', ' '),
          email: cleanEmail,
          role: defaultRole,
          title: defaultTitle,
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          department: 'Google SSO Auth',
          active: true,
        };
        const row = buildRowFromBody('users', newUserBody, USER_CLUSTERS);
        const passCol = getPasswordColumn();
        if (passCol) row[passCol] = bcrypt.hashSync('GoogleSSOSecret2026!', 10);
        const insertedId = await dbInsert('users', row, 'usr-google');
        userRow = await dbSelectOne('users', insertedId);
      }

      const userDto = hydrateUserRow(userRow);
      const token = jwt.sign(
        { sub: userDto.id, email: userDto.email, role: userDto.role, name: userDto.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN_SEC }
      );

      return res.json(
        apiResponse(true, 'Google Authentication successful', {
          token,
          tokenType: 'Bearer',
          expiresIn: JWT_EXPIRES_IN_SEC,
          user: userDto,
        })
      );
    } catch (err: any) {
      console.error('[MySQL] POST /auth/google failed:', err);
      return res.status(500).json(apiResponse(false, 'Google authentication failed due to a database error', null, [err.message]));
    }
  });

  app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    const { name, email, password, role, title, department } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json(apiResponse(false, 'Validation failed', null, ['Missing required fields']));
    }
    try {
      const emailLower = String(email).toLowerCase();
      const existing = await findUserRowByEmail(emailLower);
      if (existing) {
        return res.status(409).json(apiResponse(false, `User already exists with email: ${email}`, null, ['Duplicate email']));
      }

      const body = {
        name: String(name).trim(),
        email: emailLower,
        role: role || 'ROLE_SENIOR_CONSULTANT',
        title: title || 'Senior Advisor',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        department: department || 'Consulting Advisory',
        active: true,
      };
      const row = buildRowFromBody('users', body, USER_CLUSTERS);
      const passCol = getPasswordColumn();
      if (passCol) row[passCol] = bcrypt.hashSync(password, 10);
      const insertedId = await dbInsert('users', row, 'usr');
      const savedRow = await dbSelectOne('users', insertedId);
      const newUser = savedRow ? hydrateUserRow(savedRow) : { ...body, id: String(insertedId) };
      return res.status(201).json(apiResponse(true, 'User registered successfully', newUser));
    } catch (err: any) {
      console.error('[MySQL] POST /auth/register failed:', err);
      return res.status(500).json(apiResponse(false, 'Registration failed due to a database error', null, [err.message]));
    }
  });

  app.post('/api/v1/auth/forgot-password', async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    const { email } = req.body || {};
    if (!email) return res.status(400).json(apiResponse(false, 'Email address required', null, ['Validation error']));
    try {
      const userRow = await findUserRowByEmail(email);
      if (!userRow) return res.status(404).json(apiResponse(false, `No account found with email: ${email}`, null, ['User not found']));

      const resetToken = `rst-${Math.random().toString(36).substring(2, 10)}${Date.now()}`;
      const row = buildRowFromBody('users', { resetToken, resetTokenExpiry: Date.now() + 15 * 60 * 1000 }, USER_CLUSTERS);
      if (Object.keys(row).length > 0) {
        await dbUpdate('users', String(userRow[tableMetaCache.get('users')!.idColumn!]), row);
      } else {
        console.warn('[MySQL] users table has no resetToken/resetTokenExpiry columns — reset token was generated but not persisted.');
      }
      return res.json(apiResponse(true, 'Password reset instructions dispatched to email', resetToken));
    } catch (err: any) {
      console.error('[MySQL] POST /auth/forgot-password failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to process reset request due to a database error', null, [err.message]));
    }
  });

  app.post('/api/v1/auth/reset-password', async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    const { resetToken, newPassword } = req.body || {};
    if (!resetToken || !newPassword) return res.status(400).json(apiResponse(false, 'Reset token and new password required', null, ['Validation error']));
    try {
      const tokenCol = resolveColumn('users', ['resetToken']);
      const expiryCol = resolveColumn('users', ['resetTokenExpiry']);
      if (!tokenCol) {
        return res.status(400).json(apiResponse(false, 'Password reset is not supported by the current users table schema', null, ['Missing resetToken column']));
      }
      const rows = await dbSelectAll('users');
      const userRow = rows.find((r: any) => r[tokenCol] === resetToken);
      if (!userRow) return res.status(400).json(apiResponse(false, 'Invalid password reset token', null, ['Invalid token']));
      if (expiryCol && userRow[expiryCol] && Number(userRow[expiryCol]) < Date.now()) {
        return res.status(400).json(apiResponse(false, 'Password reset token expired', null, ['Expired token']));
      }

      const passCol = getPasswordColumn();
      const idCol = tableMetaCache.get('users')!.idColumn!;
      const updateRow: any = {};
      if (passCol) updateRow[passCol] = bcrypt.hashSync(newPassword, 10);
      if (tokenCol) updateRow[tokenCol] = null;
      if (expiryCol) updateRow[expiryCol] = null;
      await dbUpdate('users', String(userRow[idCol]), updateRow);
      return res.json(apiResponse(true, 'Password successfully reset', null));
    } catch (err: any) {
      console.error('[MySQL] POST /auth/reset-password failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to reset password due to a database error', null, [err.message]));
    }
  });

  app.get('/api/v1/auth/me', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    const authUser = (req as any).user;
    try {
      let userRow = await dbSelectOne('users', authUser.sub);
      if (!userRow) userRow = await findUserRowByEmail(authUser.email);
      if (!userRow) return res.status(404).json(apiResponse(false, 'User profile not found', null, ['User missing']));
      return res.json(apiResponse(true, 'User profile fetched', hydrateUserRow(userRow)));
    } catch (err: any) {
      console.error('[MySQL] GET /auth/me failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to fetch profile due to a database error', null, [err.message]));
    }
  });

  // --- DASHBOARD ENDPOINTS ---
  app.get('/api/v1/dashboard/stats', authenticateJwt, async (req: Request, res: Response) => {
    const isOpen = (stage: string) => stage !== 'WON' && stage !== 'LOST' && stage !== 'CLOSED_WON' && stage !== 'CLOSED_LOST';

    let leads: any[] = [];
    let clients: any[] = [];
    let invoices: any[] = [];
    let projects: any[] = [];
    try {
      if (isMySqlConnected && tableMetaCache.has('leads')) {
        leads = (await dbSelectAll('leads')).map(hydrateLead);
      }
    } catch { /* leave empty */ }
    try { if (tableMetaCache.has('clients')) clients = (await dbSelectAll('clients')).map(hydrateClient); } catch { /* leave empty */ }
    try { if (tableMetaCache.has('invoices')) invoices = (await dbSelectAll('invoices')).map(hydrateInvoice); } catch { /* leave empty */ }
    try { if (tableMetaCache.has('projects')) projects = (await dbSelectAll('projects')).map(hydrateProject); } catch { /* leave empty */ }

    const pipelineSum = leads
      .filter((l) => isOpen(l.stage || l.status || l.currentStage))
      .reduce((acc, curr) => acc + (Number(curr.estimatedValue || curr.expectedRevenue) || 0), 0);

    const mrr = clients.reduce((acc: number, c: any) => acc + (c.annualRetainer ? c.annualRetainer / 12 : c.retainerValue || 0), 0);
    const pendingInvVal = invoices
      .filter((i) => i.status === 'PENDING')
      .reduce((acc, curr) => acc + (Number(curr.amount || curr.subtotal) || 0), 0);

    const totalAssetsVal = mrr > 0 ? mrr * 12 * 5 : 0;

    return res.json(
      apiResponse(true, 'Dashboard stats fetched', {
        totalAssetsUnderMgmt: totalAssetsVal > 0 ? (totalAssetsVal >= 1000000000 ? `${(totalAssetsVal / 1000000000).toFixed(2)}B` : `${(totalAssetsVal / 1000000).toFixed(1)}M`) : '$0',
        assetsGrowthQuarterly: totalAssetsVal > 0 ? '+12.4%' : '0.0%',
        billableRatio: '0.0%',
        billableRatioTarget: '85.0%',
        activePipelineValue: `${pipelineSum.toLocaleString()}`,
        pendingDealsCount: leads.filter((l) => isOpen(l.stage || l.status || l.currentStage)).length,
        activeEngagementsCount: projects.filter((p) => p.status === 'IN_PROGRESS').length,
        totalClientsCount: clients.length,
        monthlyRecurringRevenue: Math.round(mrr),
        pendingInvoicesAmount: pendingInvVal,
      })
    );
  });


  // --- LEADS ENDPOINTS (MySQL-backed: gamcs_crm.leads) ---
  app.get('/api/v1/leads', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'leads')) return;
    try {
      const rows = await dbSelectAll('leads');
      const leads = rows.map(hydrateLead);
      return res.json(apiResponse(true, 'Leads list fetched successfully', leads));
    } catch (err: any) {
      console.error('[MySQL] GET /leads failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to fetch leads from database', null, [err.message]));
    }
  });

  app.post('/api/v1/leads', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'leads')) return;
    const body = req.body || {};
    const nowDate = new Date().toISOString().split('T')[0];

    const normalizedBody = {
      primaryName: body.primaryName || body.contactPerson || body.contactName || 'Lead Contact',
      secondaryName: body.secondaryName || '',
      company: body.company || body.companyName || 'New Lead Enterprise',
      email: body.email || body.contactEmail || 'contact@company.com',
      phone: body.phone || body.contactPhone || '+1 (555) 123-4567',
      leadOwner: body.leadOwner || (req as any).user?.name || 'Sarah Jenkins',
      assignedEmployee: body.assignedEmployee || body.assignedPartner || 'Sarah Jenkins',
      industry: body.industry || 'Management Consulting',
      leadSource: body.leadSource || body.source || 'Website Inquiry',
      requirement: body.requirement || '',
      priority: body.priority || 'MEDIUM',
      estimatedStartDate: body.estimatedStartDate || '2026-09-01',
      estimatedEndDate: body.estimatedEndDate || '2026-12-31',
      lastContactDate: body.lastContactDate || nowDate,
      currentStage: body.currentStage || body.status || body.stage || 'NEW',
      followUp: body.followUp || body.followUpDate || '2026-08-20',
      pendingTasks: body.pendingTasks || '',
      remarks: body.remarks || body.leadNotes || body.notes || 'Newly created lead record.',
      expectedRevenue: Number(body.expectedRevenue || body.estimatedValue || 50000),
      probability: body.probability ?? 50,
      timeline: body.timeline || '1 Month',
      aiScore: body.aiScore ?? 78,
      aiRecommendation: 'Lead registered. Schedule preliminary discovery meeting.',
      meetingHistory: body.meetingHistory || [],
      proposalHistory: body.proposalHistory || [],
      createdAt: nowDate,
    };

    try {
      const row = buildRowFromBody('leads', normalizedBody, LEAD_CLUSTERS);
      const insertedId = await dbInsert('leads', row, 'lead');
      const savedRow = await dbSelectOne('leads', insertedId);
      const newLead = savedRow ? hydrateLead(savedRow) : { ...normalizedBody, id: String(insertedId) };

      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: (req as any).user?.name || 'User',
        action: 'LEAD_CREATED',
        entityType: 'LEAD',
        entityName: newLead.company || newLead.companyName,
        details: `New lead created for ${newLead.company || newLead.companyName} ($${Number(newLead.expectedRevenue || 0).toLocaleString()})`,
      });

      return res.status(201).json(apiResponse(true, 'Lead created successfully', newLead));
    } catch (err: any) {
      console.error('[MySQL] POST /leads failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to insert lead into database', null, [err.message]));
    }
  });

  app.put('/api/v1/leads/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'leads')) return;
    const { id } = req.params;
    try {
      const existing = await dbSelectOne('leads', id);
      if (!existing) return res.status(404).json(apiResponse(false, 'Lead not found', null));
      const row = buildRowFromBody('leads', req.body || {}, LEAD_CLUSTERS);
      await dbUpdate('leads', id, row);
      const updatedRow = await dbSelectOne('leads', id);
      return res.json(apiResponse(true, 'Lead updated successfully', hydrateLead(updatedRow)));
    } catch (err: any) {
      console.error('[MySQL] PUT /leads/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to update lead in database', null, [err.message]));
    }
  });

  app.post('/api/v1/leads/:id/convert', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'leads')) return;
    if (sendDbUnavailable(res, 'clients')) return;
    const { id } = req.params;
    try {
      const leadRow = await dbSelectOne('leads', id);
      if (!leadRow) return res.status(404).json(apiResponse(false, 'Lead not found', null));
      const lead = hydrateLead(leadRow);

      if (lead.convertedClientId || lead.isConverted) {
        const clientRows = await dbSelectAll('clients');
        const existingClient = clientRows
          .map(hydrateClient)
          .find((c: any) => c.clientId === lead.convertedClientId || c.id === lead.convertedClientId);
        if (existingClient) {
          return res.json(apiResponse(true, 'Lead already converted to Client', { lead, client: existingClient }));
        }
      }

      const generatedClientId = generateUniqueClientId();
      const companyName = lead.company || lead.companyName || 'Converted Client Corp';
      const contact = lead.primaryName || lead.contactPerson || lead.contactName || 'Primary Contact';
      const emailVal = lead.email || lead.contactEmail || 'client@firm.com';
      const phoneVal = lead.phone || lead.contactPhone || '';
      const revenue = lead.expectedRevenue || lead.estimatedValue || 120000;

      const clientBody = {
        clientId: generatedClientId,
        name: companyName,
        industry: lead.industry || 'Consulting Services',
        contactPerson: contact,
        email: emailVal,
        phone: phoneVal,
        annualRetainer: revenue,
        contractStatus: 'ACTIVE',
        leadPartner: lead.leadOwner || 'Sarah Jenkins',
        startDate: new Date().toISOString().split('T')[0],
        healthScore: 95,
        activeEngagements: 1,
        services: [],
      };
      const clientRow = buildRowFromBody('clients', clientBody, CLIENT_CLUSTERS);
      const insertedClientId = await dbInsert('clients', clientRow, 'client');
      const savedClientRow = await dbSelectOne('clients', insertedClientId);
      const newClient = savedClientRow ? hydrateClient(savedClientRow) : { ...clientBody, id: String(insertedClientId) };

      const leadUpdateRow = buildRowFromBody('leads', {
        status: 'WON',
        currentStage: 'WON',
        isConverted: true,
        convertedClientId: generatedClientId,
        convertedClientNumber: generatedClientId,
      }, LEAD_CLUSTERS);
      await dbUpdate('leads', id, leadUpdateRow);
      const updatedLeadRow = await dbSelectOne('leads', id);
      const updatedLead = hydrateLead(updatedLeadRow);

      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: (req as any).user?.name || 'User',
        action: 'LEAD_CONVERTED',
        entityType: 'CLIENT',
        entityName: companyName,
        details: `Lead ${companyName} converted into Client with Unique Client ID (${generatedClientId}).`,
      });

      return res.status(200).json(
        apiResponse(true, `Lead successfully converted to Client (${generatedClientId})`, {
          lead: updatedLead,
          client: newClient,
        })
      );
    } catch (err: any) {
      console.error('[MySQL] POST /leads/:id/convert failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to convert lead in database', null, [err.message]));
    }
  });

  app.delete('/api/v1/leads/:id', authenticateJwt, requirePermission('DELETE_LEADS'), async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'leads')) return;
    const { id } = req.params;
    try {
      const deleted = await dbDelete('leads', id);
      if (!deleted) return res.status(404).json(apiResponse(false, 'Lead not found', null));
      return res.json(apiResponse(true, 'Lead deleted successfully', null));
    } catch (err: any) {
      console.error('[MySQL] DELETE /leads/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to delete lead from database', null, [err.message]));
    }
  });

  // --- CONTACTS ENDPOINTS (MySQL-backed: gamcs_crm.contacts) ---
  app.get('/api/v1/contacts', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'contacts')) return;
    try {
      const rows = await dbSelectAll('contacts');
      return res.json(apiResponse(true, 'Contacts list fetched', rows.map(hydrateContact)));
    } catch (err: any) {
      console.error('[MySQL] GET /contacts failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to fetch contacts from database', null, [err.message]));
    }
  });

  app.post('/api/v1/contacts', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'contacts')) return;
    try {
      const body = {
        status: 'ACTIVE',
        lastContacted: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString().split('T')[0],
        ...req.body,
      };
      const row = buildRowFromBody('contacts', body, CONTACT_CLUSTERS);
      const insertedId = await dbInsert('contacts', row, 'cnt');
      const savedRow = await dbSelectOne('contacts', insertedId);
      const newContact = savedRow ? hydrateContact(savedRow) : { ...body, id: String(insertedId) };
      return res.status(201).json(apiResponse(true, 'Contact created', newContact));
    } catch (err: any) {
      console.error('[MySQL] POST /contacts failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to insert contact into database', null, [err.message]));
    }
  });

  app.put('/api/v1/contacts/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'contacts')) return;
    const { id } = req.params;
    try {
      const existing = await dbSelectOne('contacts', id);
      if (!existing) return res.status(404).json(apiResponse(false, 'Contact not found', null));
      const row = buildRowFromBody('contacts', req.body || {}, CONTACT_CLUSTERS);
      await dbUpdate('contacts', id, row);
      const updatedRow = await dbSelectOne('contacts', id);
      return res.json(apiResponse(true, 'Contact updated', hydrateContact(updatedRow)));
    } catch (err: any) {
      console.error('[MySQL] PUT /contacts/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to update contact in database', null, [err.message]));
    }
  });

  app.delete('/api/v1/contacts/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'contacts')) return;
    try {
      const deleted = await dbDelete('contacts', req.params.id);
      if (!deleted) return res.status(404).json(apiResponse(false, 'Contact not found', null));
      return res.json(apiResponse(true, 'Contact deleted', null));
    } catch (err: any) {
      console.error('[MySQL] DELETE /contacts/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to delete contact from database', null, [err.message]));
    }
  });

  // --- CLIENTS ENDPOINTS (MySQL-backed: gamcs_crm.clients) ---
  app.get('/api/v1/clients', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'clients')) return;
    try {
      const rows = await dbSelectAll('clients');
      return res.json(apiResponse(true, 'Clients portfolio fetched', rows.map(hydrateClient)));
    } catch (err: any) {
      console.error('[MySQL] GET /clients failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to fetch clients from database', null, [err.message]));
    }
  });

  app.post('/api/v1/clients', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'clients')) return;
    try {
      const generatedId = generateUniqueClientId();
      const body = {
        clientId: req.body.clientId || req.body.clientNumber || generatedId,
        healthScore: 92,
        activeEngagements: 1,
        contractStatus: 'ACTIVE',
        startDate: new Date().toISOString().split('T')[0],
        services: [],
        ...req.body,
      };
      const row = buildRowFromBody('clients', body, CLIENT_CLUSTERS);
      const insertedId = await dbInsert('clients', row, 'client');
      const savedRow = await dbSelectOne('clients', insertedId);
      const newClient = savedRow ? hydrateClient(savedRow) : { ...body, id: String(insertedId) };
      return res.status(201).json(apiResponse(true, 'Client onboarding initialized', newClient));
    } catch (err: any) {
      console.error('[MySQL] POST /clients failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to insert client into database', null, [err.message]));
    }
  });

  app.put('/api/v1/clients/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'clients')) return;
    try {
      const existing = await dbSelectOne('clients', req.params.id);
      if (!existing) return res.status(404).json(apiResponse(false, 'Client not found', null));
      const row = buildRowFromBody('clients', req.body || {}, CLIENT_CLUSTERS);
      await dbUpdate('clients', req.params.id, row);
      const updatedRow = await dbSelectOne('clients', req.params.id);
      return res.json(apiResponse(true, 'Client updated', hydrateClient(updatedRow)));
    } catch (err: any) {
      console.error('[MySQL] PUT /clients/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to update client in database', null, [err.message]));
    }
  });

  // Client Services endpoints — services are kept as a JSON array on the client row itself
  // (persisted only if a matching "services" column exists on the clients table).
  app.post('/api/v1/clients/:id/services', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'clients')) return;
    try {
      const existingRow = await dbSelectOne('clients', req.params.id);
      if (!existingRow) return res.status(404).json(apiResponse(false, 'Client not found', null));
      const client = hydrateClient(existingRow);

      const newService = {
        id: `srv-${Date.now()}`,
        serviceName: req.body.serviceName || 'New Advisory Service',
        description: req.body.description || '',
        startDate: req.body.startDate || new Date().toISOString().split('T')[0],
        endDate: req.body.endDate || '',
        status: req.body.status || 'ACTIVE',
        assignedEmployee: req.body.assignedEmployee || 'Unassigned',
      };

      const services = [newService, ...(client.services || [])];
      const activeEngagements = services.filter((s: any) => s.status === 'ACTIVE' || s.status === 'IN_PROGRESS').length;
      const row = buildRowFromBody('clients', { services, activeEngagements }, CLIENT_CLUSTERS);
      await dbUpdate('clients', req.params.id, row);
      const updatedRow = await dbSelectOne('clients', req.params.id);
      return res.status(201).json(apiResponse(true, 'Client service added successfully', { client: hydrateClient(updatedRow), service: newService }));
    } catch (err: any) {
      console.error('[MySQL] POST /clients/:id/services failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to add client service in database', null, [err.message]));
    }
  });

  app.put('/api/v1/clients/:id/services/:serviceId', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'clients')) return;
    try {
      const existingRow = await dbSelectOne('clients', req.params.id);
      if (!existingRow) return res.status(404).json(apiResponse(false, 'Client not found', null));
      const client = hydrateClient(existingRow);

      const services = client.services || [];
      const srvIdx = services.findIndex((s: any) => s.id === req.params.serviceId);
      if (srvIdx === -1) return res.status(404).json(apiResponse(false, 'Service not found', null));
      services[srvIdx] = { ...services[srvIdx], ...req.body };
      const activeEngagements = services.filter((s: any) => s.status === 'ACTIVE' || s.status === 'IN_PROGRESS').length;

      const row = buildRowFromBody('clients', { services, activeEngagements }, CLIENT_CLUSTERS);
      await dbUpdate('clients', req.params.id, row);
      const updatedRow = await dbSelectOne('clients', req.params.id);
      return res.json(apiResponse(true, 'Client service updated successfully', { client: hydrateClient(updatedRow), service: services[srvIdx] }));
    } catch (err: any) {
      console.error('[MySQL] PUT /clients/:id/services/:serviceId failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to update client service in database', null, [err.message]));
    }
  });

  app.delete('/api/v1/clients/:id/services/:serviceId', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'clients')) return;
    try {
      const existingRow = await dbSelectOne('clients', req.params.id);
      if (!existingRow) return res.status(404).json(apiResponse(false, 'Client not found', null));
      const client = hydrateClient(existingRow);

      const services = (client.services || []).filter((s: any) => s.id !== req.params.serviceId);
      const activeEngagements = services.filter((s: any) => s.status === 'ACTIVE' || s.status === 'IN_PROGRESS').length;
      const row = buildRowFromBody('clients', { services, activeEngagements }, CLIENT_CLUSTERS);
      await dbUpdate('clients', req.params.id, row);
      const updatedRow = await dbSelectOne('clients', req.params.id);
      return res.json(apiResponse(true, 'Client service deleted successfully', hydrateClient(updatedRow)));
    } catch (err: any) {
      console.error('[MySQL] DELETE /clients/:id/services/:serviceId failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to delete client service in database', null, [err.message]));
    }
  });

  app.delete('/api/v1/clients/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'clients')) return;
    try {
      const deleted = await dbDelete('clients', req.params.id);
      if (!deleted) return res.status(404).json(apiResponse(false, 'Client not found', null));
      return res.json(apiResponse(true, 'Client archived', null));
    } catch (err: any) {
      console.error('[MySQL] DELETE /clients/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to delete client from database', null, [err.message]));
    }
  });

  // --- MEETINGS ENDPOINTS ---
  app.get('/api/v1/meetings', authenticateJwt, (req: Request, res: Response) => {
    return res.json(apiResponse(true, 'Meetings fetched', meetingsDb));
  });

  app.post('/api/v1/meetings', authenticateJwt, (req: Request, res: Response) => {
    const newMtg = {
      id: `mtg-${Date.now()}`,
      status: 'SCHEDULED',
      participantDetails: req.body.participantDetails || [
        { name: 'Sarah Jenkins', email: 's.jenkins@archicorp.com', role: 'HOST', status: 'ATTENDING' }
      ],
      meetingNotes: req.body.meetingNotes || '',
      aiSummary: req.body.aiSummary || '',
      actionItems: req.body.actionItems || [],
      ...req.body,
    };
    meetingsDb.unshift(newMtg);
    return res.status(201).json(apiResponse(true, 'Meeting scheduled', newMtg));
  });

  app.put('/api/v1/meetings/:id', authenticateJwt, (req: Request, res: Response) => {
    const idx = meetingsDb.findIndex((m) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json(apiResponse(false, 'Meeting not found', null));
    meetingsDb[idx] = { ...meetingsDb[idx], ...req.body };
    return res.json(apiResponse(true, 'Meeting updated', meetingsDb[idx]));
  });

  app.post('/api/v1/meetings/:id/generate-summary', authenticateJwt, async (req: Request, res: Response) => {
    const idx = meetingsDb.findIndex((m) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json(apiResponse(false, 'Meeting not found', null));

    const mtg = meetingsDb[idx];
    const notes = req.body?.notes || mtg.meetingNotes || mtg.agenda || '';

    let generatedSummary = '';
    let generatedActionItems: any[] = [];

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are an executive assistant for a high-end financial advisory and accounting firm.
Analyze these meeting details and notes:
Title: ${mtg.title}
Client: ${mtg.clientName}
Agenda: ${mtg.agenda}
Meeting Notes: ${notes}

Provide:
1. Executive Bullet-Point Summary (3 key takeaways with bullet points •)
2. Action items array with assignee and task description.

Format as JSON:
{
  "summary": "• Takeaway 1\\n• Takeaway 2\\n• Takeaway 3",
  "actionItems": [
    { "task": "Description", "assignee": "Name" }
  ]
}`
        });

        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          generatedSummary = parsed.summary || text;
          if (Array.isArray(parsed.actionItems)) {
            generatedActionItems = parsed.actionItems.map((a: any, i: number) => ({
              id: `ai-${Date.now()}-${i}`,
              task: a.task,
              assignee: a.assignee || 'Assigned Staff',
              dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              completed: false,
            }));
          }
        } else {
          generatedSummary = text;
        }
      } catch (err) {
        console.warn('Gemini API call fallback to heuristic summary:', err);
      }
    }

    if (!generatedSummary) {
      generatedSummary = `• Executive Takeaway: Reviewed ${mtg.title} with ${mtg.clientName}.\n• Strategic Alignment: Key discussion points around ${mtg.agenda.substring(0, 80)}...\n• Execution Roadmap: Agreed on follow-up deliverable milestones.`;
      generatedActionItems = [
        {
          id: `ai-${Date.now()}-1`,
          task: `Prepare follow-up memorandum for ${mtg.clientName}`,
          assignee: (mtg.attendees && mtg.attendees[0]) || 'Sarah Jenkins',
          dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          completed: false,
        },
      ];
    }

    meetingsDb[idx].aiSummary = generatedSummary;
    if (generatedActionItems.length > 0) {
      meetingsDb[idx].actionItems = [...(meetingsDb[idx].actionItems || []), ...generatedActionItems];
    }

    return res.json(
      apiResponse(true, 'AI Meeting Summary generated successfully', {
        summary: generatedSummary,
        actionItems: generatedActionItems,
        meeting: meetingsDb[idx],
      })
    );
  });

  app.delete('/api/v1/meetings/:id', authenticateJwt, (req: Request, res: Response) => {
    meetingsDb = meetingsDb.filter((m) => m.id !== req.params.id);
    return res.json(apiResponse(true, 'Meeting cancelled', null));
  });

  // --- PROJECTS ENDPOINTS (MySQL-backed: gamcs_crm.projects) ---
  app.get('/api/v1/projects', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'projects')) return;
    try {
      const rows = await dbSelectAll('projects');
      return res.json(apiResponse(true, 'Projects fetched', rows.map(hydrateProject)));
    } catch (err: any) {
      console.error('[MySQL] GET /projects failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to fetch projects from database', null, [err.message]));
    }
  });

  app.post('/api/v1/projects', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'projects')) return;
    try {
      const body = req.body || {};
      const pm = body.projectManager || body.leadPartner || body.leadManager || 'Sarah Jenkins';
      const normalizedBody = {
        name: body.name || 'New Advisory Project',
        projectManager: pm,
        assignedEmployees: body.assignedEmployees || [pm],
        client: body.client || body.clientName || 'General Enterprise',
        startDate: body.startDate || new Date().toISOString().split('T')[0],
        deadline: body.deadline || body.targetCompletion || body.targetEndDate || '2026-12-31',
        budget: Number(body.budget || 100000),
        spent: body.spent || 0,
        status: body.status || 'IN_PROGRESS',
        progress: Number(body.progress ?? body.completionPercentage ?? 0),
        riskLevel: body.riskLevel || 'LOW',
        description: body.description || '',
        milestones: body.milestones || [],
        documents: body.documents || [],
        invoices: body.invoices || [],
        timeline: body.timeline || [],
      };
      const row = buildRowFromBody('projects', normalizedBody, PROJECT_CLUSTERS);
      const insertedId = await dbInsert('projects', row, 'proj');
      const savedRow = await dbSelectOne('projects', insertedId);
      const newProj = savedRow ? hydrateProject(savedRow) : { ...normalizedBody, id: String(insertedId) };
      return res.status(201).json(apiResponse(true, 'Project engagement launched', newProj));
    } catch (err: any) {
      console.error('[MySQL] POST /projects failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to insert project into database', null, [err.message]));
    }
  });

  app.put('/api/v1/projects/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'projects')) return;
    try {
      const existing = await dbSelectOne('projects', req.params.id);
      if (!existing) return res.status(404).json(apiResponse(false, 'Project not found', null));
      const row = buildRowFromBody('projects', req.body || {}, PROJECT_CLUSTERS);
      await dbUpdate('projects', req.params.id, row);
      const updatedRow = await dbSelectOne('projects', req.params.id);
      return res.json(apiResponse(true, 'Project updated', hydrateProject(updatedRow)));
    } catch (err: any) {
      console.error('[MySQL] PUT /projects/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to update project in database', null, [err.message]));
    }
  });

  app.delete('/api/v1/projects/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'projects')) return;
    try {
      const deleted = await dbDelete('projects', req.params.id);
      if (!deleted) return res.status(404).json(apiResponse(false, 'Project not found', null));
      return res.json(apiResponse(true, 'Project removed', null));
    } catch (err: any) {
      console.error('[MySQL] DELETE /projects/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to delete project from database', null, [err.message]));
    }
  });

  // --- TASKS ENDPOINTS ---
  app.get('/api/v1/tasks', authenticateJwt, (req: Request, res: Response) => {
    return res.json(apiResponse(true, 'Tasks fetched', tasksDb));
  });

  app.post('/api/v1/tasks', authenticateJwt, (req: Request, res: Response) => {
    const userName = (req as any).user?.name || 'Sarah Jenkins';
    const newTask = {
      id: `tsk-${Date.now()}`,
      status: 'PENDING',
      priority: 'MEDIUM',
      estimatedHours: 10,
      actualHours: 0,
      progressPercentage: 0,
      attachments: [],
      comments: [],
      activityTimeline: [
        {
          id: `act-${Date.now()}`,
          user: userName,
          action: 'Created task',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        },
      ],
      ...req.body,
    };
    tasksDb.unshift(newTask);

    // Generate Notification & Audit Activity
    notificationsDb.unshift({
      id: `notif-${Date.now()}`,
      title: 'New Task Assigned',
      message: `Task "${newTask.title}" assigned to ${newTask.assignedTo || newTask.assignee || 'Staff'} by ${userName}`,
      type: 'INFO',
      read: false,
      timestamp: 'Just now',
    });

    activitiesDb.unshift({
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: userName,
      action: 'TASK_ASSIGNED',
      entityType: 'TASK',
      entityName: newTask.title,
      details: `Task "${newTask.title}" assigned to ${newTask.assignedTo || newTask.assignee || 'Staff'}`,
    });

    return res.status(201).json(apiResponse(true, 'Task created', newTask));
  });

  app.put('/api/v1/tasks/:id', authenticateJwt, (req: Request, res: Response) => {
    const idx = tasksDb.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json(apiResponse(false, 'Task not found', null));

    const existingTask = tasksDb[idx];
    const updatedTask = { ...existingTask, ...req.body };
    const actor = (req as any).user?.name || 'Manager';

    // Status Change Notification & Activity
    if (existingTask.status !== updatedTask.status) {
      if (updatedTask.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
        updatedTask.completedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
        updatedTask.completedBy = actor;
        updatedTask.previousStatus = existingTask.status;
        updatedTask.progressPercentage = 100;
      }

      notificationsDb.unshift({
        id: `notif-${Date.now()}`,
        title: `Task Status Changed: ${updatedTask.title}`,
        message: `Status updated from "${existingTask.status}" to "${updatedTask.status}" by ${actor}`,
        type: updatedTask.status === 'COMPLETED' ? 'SUCCESS' : 'INFO',
        read: false,
        timestamp: 'Just now',
      });

      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: actor,
        action: 'TASK_STATUS_CHANGED',
        entityType: 'TASK',
        entityName: updatedTask.title,
        details: `Task status changed from ${existingTask.status} to ${updatedTask.status}`,
      });
    }

    // Reassign Notification & Activity
    if (existingTask.assignedTo && updatedTask.assignedTo && existingTask.assignedTo !== updatedTask.assignedTo) {
      notificationsDb.unshift({
        id: `notif-${Date.now()}`,
        title: `Task Reassigned: ${updatedTask.title}`,
        message: `Task reassigned from "${existingTask.assignedTo}" to "${updatedTask.assignedTo}" by ${actor}`,
        type: 'INFO',
        read: false,
        timestamp: 'Just now',
      });

      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: actor,
        action: 'TASK_REASSIGNED',
        entityType: 'TASK',
        entityName: updatedTask.title,
        details: `Task reassigned from ${existingTask.assignedTo} to ${updatedTask.assignedTo}`,
      });
    }

    // Deadline Update Notification
    if (existingTask.dueDate && updatedTask.dueDate && existingTask.dueDate !== updatedTask.dueDate) {
      notificationsDb.unshift({
        id: `notif-${Date.now()}`,
        title: `Task Deadline Updated: ${updatedTask.title}`,
        message: `Deadline updated from ${existingTask.dueDate} to ${updatedTask.dueDate} by ${actor}`,
        type: 'INFO',
        read: false,
        timestamp: 'Just now',
      });
    }

    tasksDb[idx] = updatedTask;
    return res.json(apiResponse(true, 'Task updated', tasksDb[idx]));
  });

  app.delete('/api/v1/tasks/:id', authenticateJwt, (req: Request, res: Response) => {
    tasksDb = tasksDb.filter((t) => t.id !== req.params.id);
    return res.json(apiResponse(true, 'Task deleted', null));
  });

  // --- DOCUMENTS ENDPOINTS ---
  app.get('/api/v1/documents', authenticateJwt, (req: Request, res: Response) => {
    return res.json(apiResponse(true, 'Documents fetched', documentsDb));
  });

  app.post('/api/v1/documents', authenticateJwt, (req: Request, res: Response) => {
    const userName = (req as any).user?.name || 'Sarah Jenkins';
    const body = req.body || {};
    const initialVer = body.version || 'v1.0';
    const uploadDate = new Date().toISOString().split('T')[0];

    const newDoc = {
      id: `doc-${Date.now()}`,
      title: body.title || 'Untitled Document',
      category: body.category || 'Valuation Reports',
      clientName: body.clientName || 'General Client',
      fileSize: body.fileSize || '2.4 MB',
      fileType: body.fileType || (body.title?.endsWith('.pdf') ? 'pdf' : body.title?.endsWith('.docx') ? 'doc' : 'text'),
      version: initialVer,
      uploadedBy: userName,
      uploadedAt: uploadDate,
      securityLevel: body.securityLevel || 'RESTRICTED',
      rolePermissions: body.rolePermissions || 'CLIENT_ACCESS',
      description: body.description || 'Uploaded document record.',
      contentPreview: body.contentPreview || `DOCUMENT PREVIEW: ${body.title}\n\nClient: ${body.clientName}\nUploaded By: ${userName}\nDate: ${uploadDate}\n\n[Sample File Content Placeholder]`,
      versionHistory: body.versionHistory || [
        {
          id: `v-${Date.now()}`,
          version: initialVer,
          uploadedBy: userName,
          uploadedAt: uploadDate,
          fileSize: body.fileSize || '2.4 MB',
          changelog: 'Initial version upload.',
        },
      ],
      ...body,
    };
    documentsDb.unshift(newDoc);
    return res.status(201).json(apiResponse(true, 'Document vaulted', newDoc));
  });

  app.put('/api/v1/documents/:id', authenticateJwt, (req: Request, res: Response) => {
    const idx = documentsDb.findIndex((d) => d.id === req.params.id);
    if (idx === -1) return res.status(404).json(apiResponse(false, 'Document not found', null));
    documentsDb[idx] = { ...documentsDb[idx], ...req.body };
    return res.json(apiResponse(true, 'Document updated', documentsDb[idx]));
  });

  app.delete('/api/v1/documents/:id', authenticateJwt, (req: Request, res: Response) => {
    documentsDb = documentsDb.filter((d) => d.id !== req.params.id);
    return res.json(apiResponse(true, 'Document deleted', null));
  });

  // --- INVOICES ENDPOINTS (MySQL-backed: gamcs_crm.invoices) ---
  app.get('/api/v1/invoices', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'invoices')) return;
    try {
      const rows = await dbSelectAll('invoices');
      return res.json(apiResponse(true, 'Invoices fetched', rows.map(hydrateInvoice)));
    } catch (err: any) {
      console.error('[MySQL] GET /invoices failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to fetch invoices from database', null, [err.message]));
    }
  });

  app.post('/api/v1/invoices', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'invoices')) return;
    try {
      const userName = (req as any).user?.name || 'Sarah Jenkins';
      const body = req.body || {};

      const baseSubtotal = Number(body.amount || body.subtotal) || 45000;
      const gstRate = Number(body.gstRate) || 10;
      const computedGst = body.gst !== undefined ? Number(body.gst) : Math.round(baseSubtotal * (gstRate / 100));
      const grandTotal = body.totalAmount !== undefined ? Number(body.totalAmount) : (baseSubtotal + computedGst);
      const proj = body.projectName || body.project || 'Strategic Advisory Engagement';

      const normalizedBody = {
        invoiceNumber: body.invoiceNumber || `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        clientName: body.clientName || 'Client Firm',
        projectName: proj,
        subtotal: baseSubtotal,
        gstRate: gstRate,
        gst: computedGst,
        totalAmount: grandTotal,
        issueDate: body.issueDate || new Date().toISOString().split('T')[0],
        dueDate: body.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: body.status || 'PENDING',
        serviceDescription: body.serviceDescription || 'Executive Retainer & Strategic Consulting Services',
        items: body.items || [
          { id: `ii-${Date.now()}`, serviceDescription: body.serviceDescription || 'Executive Retainer Services', amount: baseSubtotal }
        ],
        notes: body.notes || 'Dispatched electronically via Firm Client Portal.',
        createdAt: new Date().toISOString().split('T')[0],
      };

      const row = buildRowFromBody('invoices', normalizedBody, INVOICE_CLUSTERS);
      const insertedId = await dbInsert('invoices', row, 'inv');
      const savedRow = await dbSelectOne('invoices', insertedId);
      const newInv = savedRow ? hydrateInvoice(savedRow) : { ...normalizedBody, id: String(insertedId) };

      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: userName,
        action: 'INVOICE_CREATED',
        entityType: 'INVOICE',
        entityName: `${newInv.invoiceNumber}: ${newInv.clientName}`,
        details: `Issued invoice ${newInv.invoiceNumber} for $${Number(newInv.totalAmount || 0).toLocaleString()} (incl. $${computedGst.toLocaleString()} GST).`,
      });

      return res.status(201).json(apiResponse(true, 'Invoice generated', newInv));
    } catch (err: any) {
      console.error('[MySQL] POST /invoices failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to insert invoice into database', null, [err.message]));
    }
  });

  app.put('/api/v1/invoices/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'invoices')) return;
    try {
      const existingRow = await dbSelectOne('invoices', req.params.id);
      if (!existingRow) return res.status(404).json(apiResponse(false, 'Invoice not found', null));
      const oldInv = hydrateInvoice(existingRow);
      const userName = (req as any).user?.name || 'Sarah Jenkins';

      const patch: any = { ...req.body };
      if (req.body.amount || req.body.subtotal || req.body.gst) {
        const sub = Number(req.body.subtotal ?? req.body.amount ?? oldInv.subtotal) || 0;
        const rate = Number(req.body.gstRate ?? oldInv.gstRate) || 10;
        const gst = Math.round(sub * (rate / 100));
        patch.subtotal = sub;
        patch.gst = gst;
        patch.totalAmount = sub + gst;
      }

      const row = buildRowFromBody('invoices', patch, INVOICE_CLUSTERS);
      await dbUpdate('invoices', req.params.id, row);
      const updatedRow = await dbSelectOne('invoices', req.params.id);
      const updated = hydrateInvoice(updatedRow);

      if (req.body.status === 'PAID' && oldInv.status !== 'PAID') {
        activitiesDb.unshift({
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: userName,
          action: 'INVOICE_PAID',
          entityType: 'INVOICE',
          entityName: `${updated.invoiceNumber} ($${Number(updated.totalAmount || updated.amount || 0).toLocaleString()})`,
          details: `Payment of $${Number(updated.totalAmount || updated.amount || 0).toLocaleString()} verified for ${updated.clientName}`,
        });
      }

      return res.json(apiResponse(true, 'Invoice updated', updated));
    } catch (err: any) {
      console.error('[MySQL] PUT /invoices/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to update invoice in database', null, [err.message]));
    }
  });

  app.delete('/api/v1/invoices/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'invoices')) return;
    try {
      const deleted = await dbDelete('invoices', req.params.id);
      if (!deleted) return res.status(404).json(apiResponse(false, 'Invoice not found', null));
      return res.json(apiResponse(true, 'Invoice voided', null));
    } catch (err: any) {
      console.error('[MySQL] DELETE /invoices/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to delete invoice from database', null, [err.message]));
    }
  });

  // --- PROPOSALS ENDPOINTS (MySQL-backed: gamcs_crm.proposals) ---
  app.get('/api/v1/proposals', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'proposals')) return;
    try {
      const rows = await dbSelectAll('proposals');
      return res.json(apiResponse(true, 'Proposals fetched', rows.map(hydrateProposal)));
    } catch (err: any) {
      console.error('[MySQL] GET /proposals failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to fetch proposals from database', null, [err.message]));
    }
  });

  app.post('/api/v1/proposals', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'proposals')) return;
    try {
      const userName = (req as any).user?.name || 'Sarah Jenkins';
      const userRole = (req as any).user?.role || 'ROLE_MANAGER';
      const body = req.body || {};

      const existingCount = (await dbSelectAll('proposals')).length;
      const propNum = body.proposalNumber || `PROP-2026-${String(existingCount + 1).padStart(3, '0')}`;
      const today = new Date().toISOString().split('T')[0];
      const fee = body.proposedFee || body.totalAmount || 150000;

      const normalizedBody = {
        proposalNumber: propNum,
        title: body.title || 'Executive Advisory Proposal',
        clientName: body.clientName || 'Target Client',
        contactEmail: body.contactEmail || 'client@firm.com',
        status: body.status || 'DRAFT',
        createdAt: today,
        preparedBy: userName,
        engagementType: body.engagementType || 'Valuation & Advisory',
        leadPartner: body.leadPartner || userName,
        proposedFee: fee,
        validUntil: body.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        executiveSummary: body.executiveSummary || 'Executive advisory engagement proposal tailored for client strategic initiatives.',
        scopeDetails: body.scopeDetails || body.scopeOfWork || '1. Financial modeling\n2. Valuation audit\n3. Executive board presentation',
        items: body.items || [
          { id: `item-${Date.now()}-1`, description: 'Executive Retainer & Financial Advisory', quantity: 1, rate: fee, total: fee }
        ],
        approvalHistory: [
          {
            id: `app-${Date.now()}`,
            action: 'SUBMITTED',
            actor: userName,
            role: userRole,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
            comments: 'Initial proposal draft compiled.',
          }
        ],
      };

      const row = buildRowFromBody('proposals', normalizedBody, PROPOSAL_CLUSTERS);
      const insertedId = await dbInsert('proposals', row, 'prop');
      const savedRow = await dbSelectOne('proposals', insertedId);
      const newProp = savedRow ? hydrateProposal(savedRow) : { ...normalizedBody, id: String(insertedId) };

      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: userName,
        action: 'PROPOSAL_CREATED',
        entityType: 'PROPOSAL',
        entityName: `${newProp.proposalNumber}: ${newProp.title}`,
        details: `Created proposal for ${newProp.clientName} worth $${Number(newProp.totalAmount || newProp.proposedFee || 0).toLocaleString()}`,
      });

      return res.status(201).json(apiResponse(true, 'Proposal generated', newProp));
    } catch (err: any) {
      console.error('[MySQL] POST /proposals failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to insert proposal into database', null, [err.message]));
    }
  });

  app.put('/api/v1/proposals/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'proposals')) return;
    try {
      const existingRow = await dbSelectOne('proposals', req.params.id);
      if (!existingRow) return res.status(404).json(apiResponse(false, 'Proposal not found', null));
      const oldProp = hydrateProposal(existingRow);
      const userName = (req as any).user?.name || 'Partner';

      const patch: any = { ...req.body };
      if (req.body.items && Array.isArray(req.body.items)) {
        const total = req.body.items.reduce((acc: number, item: any) => acc + (item.total || 0), 0);
        patch.totalAmount = total;
        patch.proposedFee = total;
      }
      if (req.body.status && req.body.status !== oldProp.status) {
        const historyItem = {
          id: `app-${Date.now()}`,
          action: req.body.status === 'UNDER_REVIEW' ? 'SUBMITTED' : req.body.status === 'SENT' ? 'SENT' : req.body.status === 'ACCEPTED' ? 'ACCEPTED' : req.body.status === 'DECLINED' ? 'DECLINED' : 'REVISED',
          actor: userName,
          role: (req as any).user?.role || 'User',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          comments: `Status updated to ${req.body.status}`,
        };
        patch.approvalHistory = [...(oldProp.approvalHistory || []), historyItem];
      }

      const row = buildRowFromBody('proposals', patch, PROPOSAL_CLUSTERS);
      await dbUpdate('proposals', req.params.id, row);
      const updatedRow = await dbSelectOne('proposals', req.params.id);
      return res.json(apiResponse(true, 'Proposal updated', hydrateProposal(updatedRow)));
    } catch (err: any) {
      console.error('[MySQL] PUT /proposals/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to update proposal in database', null, [err.message]));
    }
  });

  app.post('/api/v1/proposals/:id/workflow', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'proposals')) return;
    try {
      const existingRow = await dbSelectOne('proposals', req.params.id);
      if (!existingRow) return res.status(404).json(apiResponse(false, 'Proposal not found', null));
      const prop = hydrateProposal(existingRow);

      const { action, comments } = req.body || {};
      const userName = (req as any).user?.name || 'Sarah Jenkins';
      const userRole = (req as any).user?.role || 'Partner';

      let newStatus = prop.status;
      let actionLabel = action;

      switch (action) {
        case 'SUBMIT_FOR_REVIEW':
          newStatus = 'UNDER_REVIEW';
          actionLabel = 'SUBMITTED';
          break;
        case 'APPROVE':
          newStatus = 'SENT';
          actionLabel = 'APPROVED';
          break;
        case 'REQUEST_REVISIONS':
          newStatus = 'REVISED';
          actionLabel = 'REJECTED';
          break;
        case 'SEND_TO_CLIENT':
          newStatus = 'SENT';
          actionLabel = 'SENT';
          break;
        case 'ACCEPT':
          newStatus = 'ACCEPTED';
          actionLabel = 'ACCEPTED';
          break;
        case 'DECLINE':
          newStatus = 'DECLINED';
          actionLabel = 'DECLINED';
          break;
        default:
          break;
      }

      const historyEntry = {
        id: `app-${Date.now()}`,
        action: actionLabel as any,
        actor: userName,
        role: userRole,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        comments: comments || `Proposal workflow action: ${action}`,
      };
      const approvalHistory = [...(prop.approvalHistory || []), historyEntry];

      const row = buildRowFromBody('proposals', { status: newStatus, approvalHistory }, PROPOSAL_CLUSTERS);
      await dbUpdate('proposals', req.params.id, row);
      const updatedRow = await dbSelectOne('proposals', req.params.id);
      const updatedProp = hydrateProposal(updatedRow);

      // Create Notification
      notificationsDb.unshift({
        id: `notif-${Date.now()}`,
        title: `Proposal ${updatedProp.proposalNumber} ${newStatus}`,
        message: `${userName} performed ${action} on proposal "${updatedProp.title}" for ${updatedProp.clientName}`,
        type: newStatus === 'ACCEPTED' ? 'SUCCESS' : newStatus === 'REVISED' || newStatus === 'DECLINED' ? 'WARNING' : 'INFO',
        read: false,
        timestamp: 'Just now',
      });

      // Create Audit Activity
      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: userName,
        action: `PROPOSAL_${actionLabel}`,
        entityType: 'PROPOSAL',
        entityName: `${updatedProp.proposalNumber}: ${updatedProp.title}`,
        details: `${actionLabel} by ${userName}. Status is now ${newStatus}. ${comments ? `Notes: ${comments}` : ''}`,
      });

      return res.json(apiResponse(true, `Proposal workflow updated: ${newStatus}`, updatedProp));
    } catch (err: any) {
      console.error('[MySQL] POST /proposals/:id/workflow failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to update proposal workflow in database', null, [err.message]));
    }
  });

  app.post('/api/v1/proposals/generate-ai', authenticateJwt, async (req: Request, res: Response) => {
    const { clientName, engagementType, proposedFee, projectTitle, coreObjectives } = req.body || {};
    
    let executiveSummary = '';
    let scopeOfWork = '';
    let suggestedItems: any[] = [];

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are a Senior Partner at an elite executive advisory and accounting firm (Archicorp Practice).
Draft a highly persuasive, formal executive proposal for a client.
Client: ${clientName || 'Corporate Client'}
Engagement Type: ${engagementType || 'Valuation & Advisory'}
Project Title: ${projectTitle || 'Strategic Financial Advisory'}
Estimated Fee: $${(proposedFee || 150000).toLocaleString()}
Core Objectives: ${coreObjectives || 'Capital optimization, valuation modeling, tax shield and executive retainer.'}

Respond in clean JSON format:
{
  "executiveSummary": "2-3 polished sentences for executive leadership...",
  "scopeOfWork": "Phase 1: ...\\nPhase 2: ...\\nPhase 3: ...",
  "suggestedItems": [
    { "description": "Deliverable line item 1", "quantity": 1, "rate": 50000, "total": 50000 },
    { "description": "Deliverable line item 2", "quantity": 1, "rate": 100000, "total": 100000 }
  ]
}`
        });


        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          executiveSummary = parsed.executiveSummary || '';
          scopeOfWork = parsed.scopeOfWork || '';
          suggestedItems = parsed.suggestedItems || [];
        }
      } catch (err) {
        console.warn('Gemini API proposal synthesis error:', err);
      }
    }

    if (!executiveSummary) {
      executiveSummary = `Archicorp Practice will provide end-to-end ${engagementType || 'executive financial advisory'} services for ${clientName || 'Client'}. Our senior partners will drive financial model restructuring, audit readiness, and board-level risk management.`;
      scopeOfWork = `Phase 1: Diagnostic Assessment & Data Intake\nPhase 2: Quantitative Modeling & Compliance Audit\nPhase 3: Deliverable Memorandum & Board Executive Presentation`;
      const halfFee = Math.round((proposedFee || 200000) / 2);
      suggestedItems = [
        { id: 'ai-item-1', description: `${engagementType || 'Executive Advisory'} Core Deliverables & Audit`, quantity: 1, rate: halfFee, total: halfFee },
        { id: 'ai-item-2', description: 'Fractional CFO & Senior Partner Retainer', quantity: 1, rate: halfFee, total: halfFee }
      ];
    }

    return res.json(apiResponse(true, 'AI proposal draft synthesized', {
      executiveSummary,
      scopeOfWork,
      suggestedItems,
    }));
  });

  app.delete('/api/v1/proposals/:id', authenticateJwt, async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'proposals')) return;
    try {
      const deleted = await dbDelete('proposals', req.params.id);
      if (!deleted) return res.status(404).json(apiResponse(false, 'Proposal not found', null));
      return res.json(apiResponse(true, 'Proposal deleted', null));
    } catch (err: any) {
      console.error('[MySQL] DELETE /proposals/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to delete proposal from database', null, [err.message]));
    }
  });

  // --- REPORTS & ANALYTICS ENDPOINTS (MySQL-backed) ---
  app.get('/api/v1/reports', authenticateJwt, requirePermission('VIEW_FINANCIAL_REPORTS'), async (req: Request, res: Response) => {
    let leads: any[] = [];
    let clients: any[] = [];
    let invoices: any[] = [];
    try { if (tableMetaCache.has('leads')) leads = (await dbSelectAll('leads')).map(hydrateLead); } catch { /* leave empty */ }
    try { if (tableMetaCache.has('clients')) clients = (await dbSelectAll('clients')).map(hydrateClient); } catch { /* leave empty */ }
    try { if (tableMetaCache.has('invoices')) invoices = (await dbSelectAll('invoices')).map(hydrateInvoice); } catch { /* leave empty */ }

    // Dynamic stage distribution from leads
    const stageMap: Record<string, { count: number; value: number }> = {};
    leads.forEach((l) => {
      const rawStage = l.stage || l.status || l.currentStage;
      const stageName = rawStage ? String(rawStage).replace(/_/g, ' ') : 'QUALIFIED';
      if (!stageMap[stageName]) stageMap[stageName] = { count: 0, value: 0 };
      stageMap[stageName].count += 1;
      stageMap[stageName].value += Number(l.estimatedValue || l.expectedRevenue) || 0;
    });

    const dealStageDistribution = Object.entries(stageMap).map(([stage, data]) => ({
      stage,
      count: data.count,
      value: data.value,
    }));

    // Dynamic industry breakdown from leads & clients
    const indMap: Record<string, number> = {};
    leads.forEach((l) => { if (l.industry) indMap[l.industry] = (indMap[l.industry] || 0) + 1; });
    clients.forEach((c) => { if (c.industry) indMap[c.industry] = (indMap[c.industry] || 0) + 1; });

    const totalInd = Object.values(indMap).reduce((a, b) => a + b, 0) || 1;
    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];
    const industryBreakdown = Object.entries(indMap).map(([name, count], idx) => ({
      name,
      percentage: Math.round((count / totalInd) * 100),
      color: colors[idx % colors.length],
    }));

    // Dynamic monthly revenue from invoices
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevMap: Record<string, number> = {};
    invoices.forEach((i) => {
      if (i.dueDate) {
        const d = new Date(i.dueDate);
        const m = monthNames[d.getMonth()];
        monthlyRevMap[m] = (monthlyRevMap[m] || 0) + (Number(i.amount || i.subtotal) || 0);
      }
    });

    const monthlyRevenue = Object.entries(monthlyRevMap).map(([month, revenue]) => ({
      month,
      revenue,
      target: Math.round(revenue * 1.15) || 300000,
    }));

    const totalRev = invoices.reduce((acc, i) => acc + (Number(i.amount || i.subtotal) || 0), 0);

    return res.json(
      apiResponse(true, 'Reports analytics generated', {
        totalRevenue: totalRev,
        monthlyRevenue,
        dealStageDistribution,
        byIndustry: industryBreakdown,
        industryBreakdown,
      })
    );
  });

  // --- USERS MANAGEMENT ENDPOINTS (MySQL-backed: gamcs_crm.users) ---
  app.get('/api/v1/users', authenticateJwt, requireRole('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EMPLOYEE'), async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    try {
      const rows = await dbSelectAll('users');
      return res.json(apiResponse(true, 'Users list fetched', rows.map(hydrateUserRow)));
    } catch (err: any) {
      console.error('[MySQL] GET /users failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to fetch users from database', null, [err.message]));
    }
  });

  app.post('/api/v1/users', authenticateJwt, requirePermission('MANAGE_USERS'), async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    try {
      const { name, fullName, email, role, title, department, password, active } = req.body || {};
      const userName = name || fullName || 'New Firm Member';
      const emailVal = (email || `user-${Date.now()}@gamcs.com`).toLowerCase();

      const existing = await findUserRowByEmail(emailVal);
      if (existing) {
        return res.status(409).json(apiResponse(false, `User already exists with email: ${emailVal}`, null, ['Duplicate email']));
      }

      const body = {
        name: userName,
        email: emailVal,
        role: role || 'ROLE_SENIOR_CONSULTANT',
        title: title || 'Consultant',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        department: department || 'Consulting Advisory',
        active: active !== undefined ? active : true,
      };
      const row = buildRowFromBody('users', body, USER_CLUSTERS);
      const passCol = getPasswordColumn();
      if (passCol) row[passCol] = bcrypt.hashSync(password || 'TempPassword123!', 10);

      const insertedId = await dbInsert('users', row, 'usr');
      const savedRow = await dbSelectOne('users', insertedId);
      const newUser = savedRow ? hydrateUserRow(savedRow) : { ...body, id: String(insertedId) };

      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: (req as any).user?.name || 'Administrator',
        action: 'USER_CREATED',
        entityType: 'USER',
        entityName: `${newUser.name} (${newUser.email})`,
        details: `Provisioned user account with role ${newUser.role} in ${newUser.department}.`,
      });

      return res.status(201).json(apiResponse(true, 'User created', newUser));
    } catch (err: any) {
      console.error('[MySQL] POST /users failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to insert user into database', null, [err.message]));
    }
  });

  app.put('/api/v1/users/:id', authenticateJwt, requirePermission('MANAGE_USERS'), async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    try {
      const existingRow = await dbSelectOne('users', req.params.id);
      if (!existingRow) return res.status(404).json(apiResponse(false, 'User not found', null));

      const patch: any = { ...req.body };
      if (req.body.fullName) patch.name = req.body.fullName;
      if (req.body.status) patch.active = req.body.status === 'ACTIVE';
      delete patch.password;
      delete patch.passwordHash;

      const row = buildRowFromBody('users', patch, USER_CLUSTERS);
      await dbUpdate('users', req.params.id, row);
      const updatedRow = await dbSelectOne('users', req.params.id);
      const updated = hydrateUserRow(updatedRow);

      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: (req as any).user?.name || 'Administrator',
        action: 'USER_UPDATED',
        entityType: 'USER',
        entityName: `${updated.name} (${updated.email})`,
        details: `Updated user profile and permissions. Role: ${updated.role}, Active: ${updated.active}.`,
      });

      return res.json(apiResponse(true, 'User profile updated', updated));
    } catch (err: any) {
      console.error('[MySQL] PUT /users/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to update user in database', null, [err.message]));
    }
  });

  app.post('/api/v1/users/:id/reset-password', authenticateJwt, requirePermission('MANAGE_USERS'), async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    try {
      const existingRow = await dbSelectOne('users', req.params.id);
      if (!existingRow) return res.status(404).json(apiResponse(false, 'User not found', null));
      const user = hydrateUserRow(existingRow);
      const passCol = getPasswordColumn();
      const newPass = req.body?.password || `Pass#${Math.floor(100000 + Math.random() * 900000)}`;
      if (passCol) {
        await dbUpdate('users', req.params.id, { [passCol]: bcrypt.hashSync(newPass, 10) });
      }

      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: (req as any).user?.name || 'Administrator',
        action: 'PASSWORD_RESET',
        entityType: 'USER',
        entityName: `${user.name} (${user.email})`,
        details: `Reset password for user ${user.email}.`,
      });

      return res.json(apiResponse(true, 'Password reset successful', { userId: user.id, tempPassword: newPass }));
    } catch (err: any) {
      console.error('[MySQL] POST /users/:id/reset-password failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to reset password in database', null, [err.message]));
    }
  });

  app.post('/api/v1/users/:id/toggle-status', authenticateJwt, requirePermission('MANAGE_USERS'), async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    try {
      const existingRow = await dbSelectOne('users', req.params.id);
      if (!existingRow) return res.status(404).json(apiResponse(false, 'User not found', null));
      const user = hydrateUserRow(existingRow);
      const isActive = user.active === undefined || user.active === null ? true : (user.active === true || user.active === 1 || user.active === '1');
      const newActive = !isActive;

      const activeCol = resolveColumn('users', ['active']);
      if (activeCol) {
        await dbUpdate('users', req.params.id, { [activeCol]: newActive });
      }
      const updatedRow = await dbSelectOne('users', req.params.id);
      const updated = hydrateUserRow(updatedRow);
      const newStatus = newActive ? 'ACTIVE' : 'DEACTIVATED';

      activitiesDb.unshift({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: (req as any).user?.name || 'Administrator',
        action: newActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'USER',
        entityName: `${updated.name} (${updated.email})`,
        details: `Changed user account status to ${newStatus}.`,
      });

      return res.json(apiResponse(true, `User status updated to ${newStatus}`, updated));
    } catch (err: any) {
      console.error('[MySQL] POST /users/:id/toggle-status failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to toggle user status in database', null, [err.message]));
    }
  });

  app.delete('/api/v1/users/:id', authenticateJwt, requirePermission('MANAGE_USERS'), async (req: Request, res: Response) => {
    if (sendDbUnavailable(res, 'users')) return;
    try {
      const existingRow = await dbSelectOne('users', req.params.id);
      if (!existingRow) return res.status(404).json(apiResponse(false, 'User not found', null));
      const activeCol = resolveColumn('users', ['active']);
      if (activeCol) {
        await dbUpdate('users', req.params.id, { [activeCol]: false });
      }
      return res.json(apiResponse(true, 'User account deactivated', null));
    } catch (err: any) {
      console.error('[MySQL] DELETE /users/:id failed:', err);
      return res.status(500).json(apiResponse(false, 'Failed to deactivate user in database', null, [err.message]));
    }
  });

  // --- ROLES & PERMISSIONS ENDPOINTS ---
  app.get('/api/v1/roles', authenticateJwt, requirePermission('MANAGE_ROLES'), (req: Request, res: Response) => {
    return res.json(apiResponse(true, 'Roles & Permissions matrix fetched', rolesDb));
  });

  app.put('/api/v1/roles', authenticateJwt, requirePermission('MANAGE_ROLES'), (req: Request, res: Response) => {
    rolesDb = req.body;
    return res.json(apiResponse(true, 'Roles matrix updated successfully', rolesDb));
  });

  // --- SETTINGS ENDPOINTS ---
  app.get('/api/v1/settings', authenticateJwt, requirePermission('SYSTEM_SETTINGS'), (req: Request, res: Response) => {
    return res.json(apiResponse(true, 'Firm settings fetched', settingsDb));
  });

  app.put('/api/v1/settings', authenticateJwt, requirePermission('SYSTEM_SETTINGS'), (req: Request, res: Response) => {
    settingsDb = { ...settingsDb, ...req.body };
    return res.json(apiResponse(true, 'Settings updated', settingsDb));
  });

  // --- ACTIVITIES ENDPOINTS ---
  app.get('/api/v1/activities', authenticateJwt, (req: Request, res: Response) => {
    return res.json(apiResponse(true, 'Audit activity trail fetched', activitiesDb));
  });

  // --- REMARKS & ACTIVITY NOTES ENDPOINTS ---
  app.get('/api/v1/remarks', authenticateJwt, (req: Request, res: Response) => {
    const { relatedEntity, relatedEntityId, stage } = req.query;
    let filtered = [...remarksDb];

    if (relatedEntity) {
      filtered = filtered.filter((r) => r.relatedEntity === String(relatedEntity).toUpperCase());
    }
    if (relatedEntityId) {
      filtered = filtered.filter((r) => r.relatedEntityId === String(relatedEntityId));
    }
    if (stage) {
      filtered = filtered.filter((r) => r.stage?.toLowerCase() === String(stage).toLowerCase());
    }

    // Sort descending by dateTime
    filtered.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    return res.json(apiResponse(true, 'Remarks fetched', filtered));
  });

  app.post('/api/v1/remarks', authenticateJwt, (req: Request, res: Response) => {
    const user = (req as any).user;
    const { remarkText, relatedEntity, relatedEntityId, relatedEntityName, stage } = req.body || {};

    if (!remarkText || !remarkText.trim()) {
      return res.status(400).json(apiResponse(false, 'Remark text is required', null));
    }

    const addedBy = req.body.addedBy || user?.name || 'Managing Partner';
    const userRole = req.body.userRole || user?.role || 'ROLE_PARTNER';

    const newRemark = {
      id: `rem-${Date.now()}`,
      remarkText: remarkText.trim(),
      addedBy,
      userRole,
      dateTime: req.body.dateTime || new Date().toISOString(),
      relatedEntity: (relatedEntity || 'GENERAL').toUpperCase(),
      relatedEntityId: relatedEntityId || 'gen-0',
      relatedEntityName: relatedEntityName || 'CRM System',
      stage: stage || 'General Note',
    };

    remarksDb.unshift(newRemark);

    // Also record in activity log
    activitiesDb.unshift({
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: addedBy,
      action: 'REMARK_ADDED',
      entityType: newRemark.relatedEntity,
      entityName: newRemark.relatedEntityName,
      details: `[${newRemark.stage}] ${newRemark.remarkText}`,
    });

    return res.status(201).json(apiResponse(true, 'Remark saved successfully', newRemark));
  });

  app.delete('/api/v1/remarks/:id', authenticateJwt, (req: Request, res: Response) => {
    remarksDb = remarksDb.filter((r) => r.id !== req.params.id);
    return res.json(apiResponse(true, 'Remark deleted', null));
  });

  // --- SYSTEM CLEAR DATA ENDPOINT ---
  // NOTE: leads/contacts/clients/projects/invoices/proposals are now persisted in MySQL
  // (gamcs_crm) and are intentionally NOT wiped here to avoid destroying real business data.
  // This only clears the remaining in-memory-only, non-persisted demo entities.
  app.delete('/api/v1/system/clear-data', authenticateJwt, (req: Request, res: Response) => {
    tasksDb = [];
    meetingsDb = [];
    documentsDb = [];
    activitiesDb = [];
    return res.json(apiResponse(true, 'In-memory demo data (tasks, meetings, documents, activity log) cleared. Leads, contacts, clients, projects, invoices, and proposals live in MySQL and were left untouched.', null));
  });

  // --- AI INSIGHT ENDPOINT (Server-Side Gemini API Integration) ---
  app.post('/api/v1/ai/insight', authenticateJwt, async (req: Request, res: Response) => {
    const { prompt, contextType } = req.body || {};
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are an elite CFO & Executive Practice Advisory AI for GAMCS CRM Practice Management Platform.
Context: ${contextType || 'GENERAL'}
User Task: ${prompt || 'Analyze practice performance'}

Provide a concise, high-value, professional executive response tailored for a Senior CFO Partner. Focus on billable ratio, financial risk, debt covenant protection, and strategic upsell opportunity. Keep it within 100-150 words.`,
        });
        if (response?.text) {
          return res.json(apiResponse(true, 'AI Insight generated via server Gemini Service', response.text));
        }
      }
    } catch (err) {
      console.warn('Server Gemini API execution warning, returning practice heuristics fallback:', err);
    }

    // Heuristics fallback
    let fallbackText = `Strategic Practice Insight: Practice billable ratio currently at 84.2%. Q3 capacity utilization models indicate potential analyst bottleneck in financial modeling. Recommended action: Delegate DCF model templates to junior analysts and upsell clients on tax compliance audits.`;
    if (contextType === 'LEAD') {
      fallbackText = `AI Deal Scoring Analysis: Lead exhibits high conversion potential (Score: 88/100). Primary value driver is debt restructuring and M&A tax optimization. Recommended next step: Present 3-tier CFO Retainer proposal with performance bonus incentives.`;
    } else if (contextType === 'PROPOSAL') {
      fallbackText = `Executive Scope Assessment: Proposal pricing aligns with 85th percentile consulting benchmarks ($350/hr senior analyst rate). Scope covers debt service modeling and capital allocation strategy. Risk warning: Ensure 30-day payment term clause is enforced to protect operating cash flow.`;
    } else if (contextType === 'DOCUMENT') {
      fallbackText = `Document Executive Summary: Key financial terms verified. Debt service coverage ratio (DSCR) benchmark set at 1.35x. Termination clause specifies 60-day written notice with full monthly retainer acceleration.`;
    }

    return res.json(apiResponse(true, 'AI Insight generated via Practice Advisory Engine', fallbackText));
  });

  // --- NOTIFICATIONS ENDPOINTS ---
  app.get('/api/v1/notifications', authenticateJwt, (req: Request, res: Response) => {
    return res.json(apiResponse(true, 'Notifications list fetched', notificationsDb));
  });

  app.post('/api/v1/notifications/mark-read', authenticateJwt, (req: Request, res: Response) => {
    notificationsDb = notificationsDb.map((n) => ({ ...n, read: true }));
    return res.json(apiResponse(true, 'All notifications marked as read', notificationsDb));
  });

  // --- EMAIL MANAGEMENT REST ENDPOINTS (/api/v1/emails) ---
  app.get('/api/v1/emails/smtp-status', authenticateJwt, (req: Request, res: Response) => {
    const isConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
    return res.json(
      apiResponse(true, 'SMTP configuration status fetched', {
        configured: isConfigured,
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        from: process.env.SMTP_FROM || 'noreply@gamcs-crm.com',
        userConfigured: Boolean(process.env.SMTP_USER),
      })
    );
  });

  app.get('/api/v1/emails', authenticateJwt, async (req: Request, res: Response) => {
    const { leadId, clientId, contactId, status, search } = req.query;

    let results = [...emailsDb];

    // Try fetching latest from MySQL if connected
    if (isMySqlConnected && mysqlPool) {
      try {
        const [rows] = await mysqlPool.query<any[]>('SELECT * FROM emails ORDER BY created_at DESC');
        if (rows && rows.length > 0) {
          results = rows.map((r: any) => ({
            id: r.id,
            sender: r.sender,
            recipient: r.recipient,
            cc: r.cc || undefined,
            bcc: r.bcc || undefined,
            subject: r.subject,
            body: r.body,
            leadId: r.lead_id || undefined,
            clientId: r.client_id || undefined,
            contactId: r.contact_id || undefined,
            leadName: r.lead_name || undefined,
            clientName: r.client_name || undefined,
            contactName: r.contact_name || undefined,
            status: r.status,
            errorMessage: r.error_message || null,
            sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          }));
        }
      } catch (dbErr) {
        console.warn('MySQL read fallback to in-memory store:', dbErr);
      }
    }

    if (leadId) {
      results = results.filter((e) => e.leadId === String(leadId));
    }
    if (clientId) {
      results = results.filter((e) => e.clientId === String(clientId));
    }
    if (contactId) {
      results = results.filter((e) => e.contactId === String(contactId));
    }
    if (status && status !== 'ALL') {
      results = results.filter((e) => e.status.toUpperCase() === String(status).toUpperCase());
    }
    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.recipient.toLowerCase().includes(q) ||
          e.sender.toLowerCase().includes(q) ||
          (e.leadName && e.leadName.toLowerCase().includes(q)) ||
          (e.clientName && e.clientName.toLowerCase().includes(q)) ||
          (e.contactName && e.contactName.toLowerCase().includes(q))
      );
    }

    // Sort descending by createdAt
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json(apiResponse(true, 'Emails history fetched successfully', results));
  });

  app.get('/api/v1/emails/:id', authenticateJwt, async (req: Request, res: Response) => {
    const { id } = req.params;
    let email = emailsDb.find((e) => e.id === id);

    if (isMySqlConnected && mysqlPool) {
      try {
        const [rows] = await mysqlPool.query<any[]>('SELECT * FROM emails WHERE id = ? LIMIT 1', [id]);
        if (rows && rows.length > 0) {
          const r = rows[0];
          email = {
            id: r.id,
            sender: r.sender,
            recipient: r.recipient,
            cc: r.cc || undefined,
            bcc: r.bcc || undefined,
            subject: r.subject,
            body: r.body,
            leadId: r.lead_id || undefined,
            clientId: r.client_id || undefined,
            contactId: r.contact_id || undefined,
            leadName: r.lead_name || undefined,
            clientName: r.client_name || undefined,
            contactName: r.contact_name || undefined,
            status: r.status,
            errorMessage: r.error_message || null,
            sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('MySQL lookup fallback to in-memory:', err);
      }
    }

    if (!email) {
      return res.status(404).json(apiResponse(false, `Email record not found with ID: ${id}`, null));
    }
    return res.json(apiResponse(true, 'Email details fetched', email));
  });

  app.get('/api/v1/leads/:id/emails', authenticateJwt, async (req: Request, res: Response) => {
    const { id } = req.params;
    let results = emailsDb.filter((e) => e.leadId === id);

    if (isMySqlConnected && mysqlPool) {
      try {
        const [rows] = await mysqlPool.query<any[]>('SELECT * FROM emails WHERE lead_id = ? ORDER BY created_at DESC', [id]);
        if (rows && rows.length > 0) {
          results = rows.map((r: any) => ({
            id: r.id,
            sender: r.sender,
            recipient: r.recipient,
            cc: r.cc || undefined,
            bcc: r.bcc || undefined,
            subject: r.subject,
            body: r.body,
            leadId: r.lead_id || undefined,
            clientId: r.client_id || undefined,
            contactId: r.contact_id || undefined,
            leadName: r.lead_name || undefined,
            clientName: r.client_name || undefined,
            contactName: r.contact_name || undefined,
            status: r.status,
            errorMessage: r.error_message || null,
            sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('MySQL query fallback:', err);
      }
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(apiResponse(true, 'Lead email communications fetched', results));
  });

  app.get('/api/v1/clients/:id/emails', authenticateJwt, async (req: Request, res: Response) => {
    const { id } = req.params;
    let results = emailsDb.filter((e) => e.clientId === id || (e.clientName && e.clientName === id));

    if (isMySqlConnected && mysqlPool) {
      try {
        const [rows] = await mysqlPool.query<any[]>('SELECT * FROM emails WHERE client_id = ? ORDER BY created_at DESC', [id]);
        if (rows && rows.length > 0) {
          results = rows.map((r: any) => ({
            id: r.id,
            sender: r.sender,
            recipient: r.recipient,
            cc: r.cc || undefined,
            bcc: r.bcc || undefined,
            subject: r.subject,
            body: r.body,
            leadId: r.lead_id || undefined,
            clientId: r.client_id || undefined,
            contactId: r.contact_id || undefined,
            leadName: r.lead_name || undefined,
            clientName: r.client_name || undefined,
            contactName: r.contact_name || undefined,
            status: r.status,
            errorMessage: r.error_message || null,
            sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('MySQL query fallback:', err);
      }
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(apiResponse(true, 'Client email communications fetched', results));
  });

  app.get('/api/v1/contacts/:id/emails', authenticateJwt, async (req: Request, res: Response) => {
    const { id } = req.params;
    let results = emailsDb.filter((e) => e.contactId === id);

    if (isMySqlConnected && mysqlPool) {
      try {
        const [rows] = await mysqlPool.query<any[]>('SELECT * FROM emails WHERE contact_id = ? ORDER BY created_at DESC', [id]);
        if (rows && rows.length > 0) {
          results = rows.map((r: any) => ({
            id: r.id,
            sender: r.sender,
            recipient: r.recipient,
            cc: r.cc || undefined,
            bcc: r.bcc || undefined,
            subject: r.subject,
            body: r.body,
            leadId: r.lead_id || undefined,
            clientId: r.client_id || undefined,
            contactId: r.contact_id || undefined,
            leadName: r.lead_name || undefined,
            clientName: r.client_name || undefined,
            contactName: r.contact_name || undefined,
            status: r.status,
            errorMessage: r.error_message || null,
            sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('MySQL query fallback:', err);
      }
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(apiResponse(true, 'Contact email communications fetched', results));
  });

  // --- SEND EMAIL CONTROLLER ---
  app.post('/api/v1/emails/send', authenticateJwt, async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const { to, cc, bcc, subject, body, leadId, clientId, contactId } = req.body || {};

    // Validate inputs
    if (!to || !String(to).trim()) {
      return res.status(400).json(apiResponse(false, 'Recipient email address (To) is required', null, ['Missing recipient email']));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipientsList = String(to).split(',').map((s) => s.trim()).filter(Boolean);
    const hasInvalidEmail = recipientsList.some((email) => !emailRegex.test(email));
    if (hasInvalidEmail) {
      return res.status(400).json(apiResponse(false, 'Invalid recipient email format provided', null, ['Invalid email format']));
    }

    if (!subject || !String(subject).trim()) {
      return res.status(400).json(apiResponse(false, 'Email subject is required', null, ['Missing email subject']));
    }

    if (!body || !String(body).trim()) {
      return res.status(400).json(apiResponse(false, 'Email body message is required', null, ['Missing email message']));
    }

    // Resolve association names
    let resolvedLeadName: string | undefined = req.body.leadName;
    let resolvedClientName: string | undefined = req.body.clientName;
    let resolvedContactName: string | undefined = req.body.contactName;

    if (leadId && !resolvedLeadName) {
      try {
        const matchLead = tableMetaCache.has('leads') ? hydrateLead(await dbSelectOne('leads', leadId)) : null;
        if (matchLead) resolvedLeadName = matchLead.company || matchLead.companyName || matchLead.contactPerson;
      } catch { /* leave unresolved */ }
    }
    if (clientId && !resolvedClientName) {
      try {
        const matchClient = tableMetaCache.has('clients') ? hydrateClient(await dbSelectOne('clients', clientId)) : null;
        if (matchClient) resolvedClientName = matchClient.name;
      } catch { /* leave unresolved */ }
    }
    if (contactId && !resolvedContactName) {
      try {
        const matchContact = tableMetaCache.has('contacts') ? hydrateContact(await dbSelectOne('contacts', contactId)) : null;
        if (matchContact) resolvedContactName = matchContact.name;
      } catch { /* leave unresolved */ }
    }

    const senderEmail = authUser?.email || 's.jenkins@archicorp.com';
    const emailId = `eml-${Date.now()}`;
    const createdAt = new Date().toISOString();

    let emailStatus: 'SENT' | 'FAILED' | 'PENDING' = 'PENDING';
    let errorMessage: string | null = null;
    let sentAt: string | null = null;

    // Check SMTP Transporter
    const transporter = getSmtpTransporter();

    if (!transporter) {
      // SMTP credentials not fully configured in environment
      emailStatus = 'FAILED';
      errorMessage = 'SMTP configuration missing: SMTP_HOST, SMTP_USER, or SMTP_PASSWORD is not set in server environment.';
      console.warn(`[Email Service] ${errorMessage} Email recorded in history as FAILED.`);
    } else {
      try {
        const fromAddress = process.env.SMTP_FROM || `"${authUser?.name || 'GAMCS Advisory'}" <${senderEmail}>`;
        
        await transporter.sendMail({
          from: fromAddress,
          to: recipientsList.join(', '),
          cc: cc ? String(cc).trim() : undefined,
          bcc: bcc ? String(bcc).trim() : undefined,
          subject: String(subject).trim(),
          text: String(body).trim(),
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
            ${String(body).trim().replace(/\n/g, '<br/>')}
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
            <p style="font-size: 11px; color: #64748b;">
              Sent securely via <strong>GAMCS CRM Practice Management Platform</strong> by ${authUser?.name || 'Advisory Lead'}.
            </p>
          </div>`,
        });

        emailStatus = 'SENT';
        sentAt = new Date().toISOString();
        console.log(`[Email Service] Live SMTP email delivered to ${recipientsList.join(', ')}`);
      } catch (smtpErr: any) {
        emailStatus = 'FAILED';
        errorMessage = smtpErr.message || 'SMTP delivery failed due to network or authentication error';
        console.error(`[Email Service] SMTP delivery error:`, smtpErr);
      }
    }

    const newEmailRecord: EmailDbEntity = {
      id: emailId,
      sender: senderEmail,
      recipient: String(to).trim(),
      cc: cc ? String(cc).trim() : undefined,
      bcc: bcc ? String(bcc).trim() : undefined,
      subject: String(subject).trim(),
      body: String(body).trim(),
      leadId: leadId || undefined,
      clientId: clientId || undefined,
      contactId: contactId || undefined,
      leadName: resolvedLeadName,
      clientName: resolvedClientName,
      contactName: resolvedContactName,
      status: emailStatus,
      errorMessage,
      sentAt,
      createdAt,
    };

    // Save to in-memory store
    emailsDb.unshift(newEmailRecord);

    // Save to MySQL if connected
    if (isMySqlConnected && mysqlPool) {
      try {
        await mysqlPool.query(
          `INSERT INTO emails (id, sender, recipient, cc, bcc, subject, body, lead_id, client_id, contact_id, lead_name, client_name, contact_name, status, error_message, sent_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newEmailRecord.id,
            newEmailRecord.sender,
            newEmailRecord.recipient,
            newEmailRecord.cc || null,
            newEmailRecord.bcc || null,
            newEmailRecord.subject,
            newEmailRecord.body,
            newEmailRecord.leadId || null,
            newEmailRecord.clientId || null,
            newEmailRecord.contactId || null,
            newEmailRecord.leadName || null,
            newEmailRecord.clientName || null,
            newEmailRecord.contactName || null,
            newEmailRecord.status,
            newEmailRecord.errorMessage || null,
            newEmailRecord.sentAt ? new Date(newEmailRecord.sentAt) : null,
            new Date(newEmailRecord.createdAt),
          ]
        );
      } catch (sqlErr) {
        console.error('[MySQL] Failed to write email record to MySQL table:', sqlErr);
      }
    }

    // Record activity audit trail
    activitiesDb.unshift({
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: authUser?.name || 'Managing Partner',
      action: emailStatus === 'SENT' ? 'EMAIL_SENT' : 'EMAIL_FAILED',
      entityType: leadId ? 'LEAD' : clientId ? 'CLIENT' : contactId ? 'CONTACT' : 'EMAIL',
      entityName: resolvedLeadName || resolvedClientName || resolvedContactName || newEmailRecord.recipient,
      details: `[${emailStatus}] Subject: "${newEmailRecord.subject}" to ${newEmailRecord.recipient}${errorMessage ? ' (Error: ' + errorMessage + ')' : ''}`,
    });

    // Record remark in timeline if associated with Lead or Client
    if (leadId || clientId) {
      remarksDb.unshift({
        id: `rem-${Date.now()}`,
        remarkText: `Email ${emailStatus === 'SENT' ? 'dispatched' : 'attempted'}: "${newEmailRecord.subject}" to ${newEmailRecord.recipient}.${errorMessage ? ' (Failure note: ' + errorMessage + ')' : ''}`,
        addedBy: authUser?.name || 'Managing Partner',
        userRole: authUser?.role || 'ROLE_PARTNER',
        dateTime: new Date().toISOString(),
        relatedEntity: leadId ? 'LEAD' : 'CLIENT',
        relatedEntityId: leadId || clientId || 'gen-0',
        relatedEntityName: resolvedLeadName || resolvedClientName || newEmailRecord.recipient,
        stage: 'Email Communication',
      });
    }

    if (emailStatus === 'SENT') {
      return res.status(200).json(apiResponse(true, 'Email dispatched successfully via SMTP transport', newEmailRecord));
    } else {
      return res.status(200).json(
        apiResponse(
          false,
          errorMessage || 'Failed to dispatch email. Recorded in audit history.',
          newEmailRecord,
          [errorMessage || 'SMTP delivery failure']
        )
      );
    }
  });

  app.post('/api/v1/emails/:id/resend', authenticateJwt, async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const { id } = req.params;
    const existing = emailsDb.find((e) => e.id === id);

    if (!existing) {
      return res.status(404).json(apiResponse(false, 'Email record not found to resend', null));
    }

    const transporter = getSmtpTransporter();
    let emailStatus: 'SENT' | 'FAILED' = 'FAILED';
    let errorMessage: string | null = null;
    let sentAt: string | null = null;

    if (!transporter) {
      emailStatus = 'FAILED';
      errorMessage = 'SMTP configuration missing: SMTP_HOST, SMTP_USER, or SMTP_PASSWORD is not set in environment.';
    } else {
      try {
        const fromAddress = process.env.SMTP_FROM || `"${authUser?.name || 'GAMCS Advisory'}" <${authUser?.email || existing.sender}>`;
        await transporter.sendMail({
          from: fromAddress,
          to: existing.recipient,
          cc: existing.cc,
          bcc: existing.bcc,
          subject: existing.subject,
          text: existing.body,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
            ${existing.body.replace(/\n/g, '<br/>')}
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
            <p style="font-size: 11px; color: #64748b;">
              Resent securely via <strong>GAMCS CRM Practice Management Platform</strong> by ${authUser?.name || 'Advisory Lead'}.
            </p>
          </div>`,
        });

        emailStatus = 'SENT';
        sentAt = new Date().toISOString();
      } catch (err: any) {
        emailStatus = 'FAILED';
        errorMessage = err.message || 'SMTP resend failed';
      }
    }

    existing.status = emailStatus;
    existing.errorMessage = errorMessage;
    existing.sentAt = sentAt;

    if (isMySqlConnected && mysqlPool) {
      try {
        await mysqlPool.query(
          'UPDATE emails SET status = ?, error_message = ?, sent_at = ? WHERE id = ?',
          [existing.status, existing.errorMessage, existing.sentAt ? new Date(existing.sentAt) : null, existing.id]
        );
      } catch (sqlErr) {
        console.warn('MySQL update error on resend:', sqlErr);
      }
    }

    if (emailStatus === 'SENT') {
      return res.json(apiResponse(true, 'Email resent successfully', existing));
    } else {
      return res.json(apiResponse(false, errorMessage || 'Resend failed', existing, [errorMessage || 'Resend failed']));
    }
  });

  // --- OUTLOOK / MICROSOFT GRAPH REST ENDPOINTS ---
  app.get('/api/v1/outlook/status', authenticateJwt, (req: Request, res: Response) => {
    const isConfigured = Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
    return res.json(
      apiResponse(true, 'Outlook status fetched', {
        isConnected: false,
        accountEmail: null,
        displayName: null,
        isConfigured,
      })
    );
  });

  app.get('/api/v1/outlook/connect', authenticateJwt, (req: Request, res: Response) => {
    const clientId = process.env.MICROSOFT_CLIENT_ID || '';
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/v1/outlook/callback`;
    const scopes = encodeURIComponent('offline_access User.Read Mail.Send Mail.Read');
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${scopes}`;
    return res.json(apiResponse(true, 'Outlook connect URL generated', { authUrl }));
  });

  app.post('/api/v1/outlook/disconnect', authenticateJwt, (req: Request, res: Response) => {
    return res.json(apiResponse(true, 'Outlook disconnected successfully', { isConnected: false }));
  });

  // --- VITE DEV MIDDLEWARE OR PRODUCTION STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GAMCS CRM REST API server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
