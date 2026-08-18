import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { Project, DocumentItem, Invoice, Client } from '../../types';
import {
  Building2, ShieldCheck, Download, Calendar, DollarSign, FileText,
  Clock, CheckCircle2, MessageSquare, Plus, ExternalLink, ArrowRight,
  TrendingUp, Lock, UserCheck, AlertCircle, Sparkles, Loader2
} from 'lucide-react';

export const ClientPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'engagements' | 'vault' | 'billing' | 'meetings'>('engagements');
  const [inquiryText, setInquiryText] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Dynamic state from API
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [invoicesList, setInvoicesList] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        const [projectsData, documentsData, invoicesData, clientsData] = await Promise.all([
          apiService.getProjects(),
          apiService.getDocuments(),
          apiService.getInvoices(),
          apiService.getClients(),
        ]);
        setProjects(projectsData);
        setDocuments(documentsData);
        setInvoicesList(invoicesData);
        setClients(clientsData);
      } catch (err) {
        console.error('Failed to load client portal data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPortalData();
  }, []);

  const firstClient = clients[0];
  const clientCompany = {
    name: firstClient?.companyName || user?.department || 'Starlight BioTech Corp',
    slaLevel: 'PLATINUM ADVISORY',
    leadPartner: firstClient?.assignedPartner || 'Sarah Jenkins (Managing Partner)',
    contactPerson: firstClient?.contactName || user?.name || 'Dr. Marcus Vance',
    email: firstClient?.contactEmail || user?.email || 'm.vance@starlightbio.io',
    phone: firstClient?.contactPhone || '+1 (555) 389-2210',
    assetsManaged: firstClient?.retainerValue ? `$${(firstClient.retainerValue * 12).toLocaleString()}` : '$14.8M',
    contractRenewal: 'December 2026',
  };

  const engagements = projects.map((p) => ({
    id: p.id,
    title: p.name,
    lead: p.leadPartner || 'Sarah Jenkins',
    progress: p.completionPercentage || (p.status === 'COMPLETED' ? 100 : 75),
    status: p.status,
    targetCompletion: p.targetCompletion,
    milestones: [
      { name: 'DCF Valuation & 5-Year Forecast Model', done: true },
      { name: 'Data Room VDR Setup & Security Encryption', done: true },
      { name: 'Lead Underwriter Term Sheet Negotiations', done: p.completionPercentage > 60 },
      { name: 'Final Closing & Capital Disbursement', done: p.status === 'COMPLETED' },
    ],
  }));

  const vaultDocuments = documents.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category || 'Legal & Term Sheets',
    date: d.uploadDate || '2026-07-25',
    size: d.size || '3.8 MB',
    confidentiality: d.securityLevel || 'RESTRICTED',
  }));

  const invoices = invoicesList.map((i) => ({
    id: i.id,
    number: i.number,
    description: i.description || 'Monthly CFO Advisory Retainer & Series C VDR Prep',
    amount: `$${i.amount.toLocaleString()}`,
    dueDate: i.dueDate,
    status: i.status,
  }));

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryText) return;
    setInquirySubmitted(true);
    setTimeout(() => {
      setInquiryText('');
      setInquirySubmitted(false);
    }, 4000);
  };

  const handlePayInvoice = () => {
    setPaymentSuccess(true);
    setTimeout(() => {
      setIsPayModalOpen(false);
      setPaymentSuccess(false);
    }, 2500);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0d1428] via-[#111936] to-[#0d1428] border border-amber-900/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-950/90 text-amber-300 border border-amber-800/80 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-amber-400" /> Executive CFO Client Portal
              </span>
              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-full text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> {clientCompany.slaLevel}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Welcome back, {clientCompany.contactPerson}
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Real-time oversight for <strong className="text-white">{clientCompany.name}</strong> advisory engagements, capital raising progress, financial vault documents, and CFO strategy schedules.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setSelectedTab('meetings')}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule Advisory Meeting</span>
            </button>
          </div>
        </div>

        {/* Client Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Advisory Partner</span>
            <span className="font-bold text-white mt-1 block">{clientCompany.leadPartner}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Engagements</span>
            <span className="font-bold text-amber-400 mt-1 block">{engagements.length} Strategic Programs</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Capital Under Advisory</span>
            <span className="font-bold text-emerald-400 mt-1 block">{clientCompany.assetsManaged}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vault Security Clearance</span>
            <span className="font-bold text-indigo-400 mt-1 block">Tier-1 Encrypted</span>
          </div>
        </div>
      </div>

      {/* Client Portal Sub-Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs font-bold overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setSelectedTab('engagements')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            selectedTab === 'engagements'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Active Engagements</span>
        </button>

        <button
          onClick={() => setSelectedTab('vault')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            selectedTab === 'vault'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Financial Vault ({vaultDocuments.length})</span>
        </button>

        <button
          onClick={() => setSelectedTab('billing')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            selectedTab === 'billing'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Invoices & Billing</span>
        </button>

        <button
          onClick={() => setSelectedTab('meetings')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            selectedTab === 'meetings'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Request CFO Session</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE ENGAGEMENTS */}
      {selectedTab === 'engagements' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {engagements.map((eng) => (
            <div
              key={eng.id}
              className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">
                    Engagement Lead: {eng.lead}
                  </span>
                  <h3 className="text-base font-extrabold text-white tracking-tight">{eng.title}</h3>
                </div>
                <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800/80 rounded-full text-[10px] font-bold shrink-0">
                  Target: {eng.targetCompletion}
                </span>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>Completion Milestone</span>
                  <span className="text-amber-400 font-extrabold">{eng.progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${eng.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Milestones Checklist */}
              <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Deliverables</span>
                {eng.milestones.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs">
                    {m.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className={m.done ? 'text-slate-200 font-semibold' : 'text-slate-500 font-medium'}>
                      {m.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: FINANCIAL VAULT */}
      {selectedTab === 'vault' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Client Financial Vault</h3>
              <p className="text-xs text-slate-400">Encrypted deliverables, tax defense packages, and term sheets.</p>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full font-bold">
              256-Bit SSL Encrypted
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {vaultDocuments.map((doc) => (
              <div key={doc.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{doc.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {doc.category} • Uploaded {doc.date} • {doc.size}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Downloading ${doc.title}...`)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-900/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INVOICES & BILLING */}
      {selectedTab === 'billing' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Retainer Invoices & Billing Statements</h3>
              <p className="text-xs text-slate-400">View statement history and settle active advisory retainer invoices online.</p>
            </div>
          </div>

          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-xs">{inv.number}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                      inv.status === 'PAID'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{inv.description}</p>
                  <p className="text-[10px] text-slate-500">Due Date: {inv.dueDate}</p>
                </div>

                <div className="text-right space-y-2">
                  <span className="text-sm font-black text-white block">{inv.amount}</span>
                  {inv.status === 'PENDING' ? (
                    <button
                      onClick={() => setIsPayModalOpen(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Pay Retainer Online</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Payment Cleared
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: REQUEST CFO ADVISORY SESSION */}
      {selectedTab === 'meetings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
              <Calendar className="w-4 h-4" />
              <span>Schedule Strategy Review</span>
            </div>
            <h3 className="text-base font-extrabold text-white">Request CFO Advisory Session</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Book a direct 45-minute strategy call with your Lead Managing Partner, Sarah Jenkins, or M&A advisor.
            </p>

            <form onSubmit={handleSendInquiry} className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Session Subject</label>
                <input
                  type="text"
                  required
                  defaultValue="Series C Valuation & Term Sheet Review"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Preferred Date & Time Window</label>
                <input
                  type="text"
                  required
                  defaultValue="Tomorrow, August 1st at 2:00 PM EST"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Agenda Notes & Specific Focus</label>
                <textarea
                  rows={3}
                  value={inquiryText}
                  onChange={(e) => setInquiryText(e.target.value)}
                  placeholder="e.g. Review updated DCF sensitivity matrix before investor board presentation."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500"
                ></textarea>
              </div>

              {inquirySubmitted ? (
                <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Advisory session request dispatched to Sarah Jenkins. You will receive calendar invite shortly!</span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Dispatch Request to Managing Partner</span>
                </button>
              )}
            </form>
          </div>

          {/* Assigned CFO Team Info */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-extrabold text-white">Your Dedicated CFO Advisory Team</h3>
            <p className="text-xs text-slate-400">Direct escalation contacts assigned to Starlight BioTech Corp.</p>

            <div className="space-y-3 pt-1">
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
                  alt="Sarah Jenkins"
                  className="w-10 h-10 rounded-full object-cover border border-amber-500/80"
                />
                <div>
                  <p className="text-xs font-extrabold text-white">Sarah Jenkins</p>
                  <p className="text-[10px] font-bold text-amber-400">Managing Partner • Lead Advisor</p>
                  <p className="text-[10px] text-slate-400">s.jenkins@archicorp-cfo.com</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150"
                  alt="Michael Chen"
                  className="w-10 h-10 rounded-full object-cover border border-purple-500/80"
                />
                <div>
                  <p className="text-xs font-extrabold text-white">Michael Chen</p>
                  <p className="text-[10px] font-bold text-purple-400">Senior Partner • M&A Lead</p>
                  <p className="text-[10px] text-slate-400">m.chen@archicorp-cfo.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Online Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0d1322] border border-amber-900/80 rounded-3xl p-6 shadow-2xl relative text-slate-100">
            <h3 className="text-base font-extrabold text-white mb-2">Secure Online Payment</h3>
            <p className="text-xs text-slate-400 mb-4">
              Invoice INV-2026-048 • Monthly Retainer ($21,500.00)
            </p>

            {paymentSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-extrabold text-white">Payment Successfully Cleared!</h4>
                <p className="text-xs text-slate-300">Transaction ID: TXN-99481029. Receipt sent to {clientCompany.email}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Corporate Card / ACH Account</label>
                  <input
                    type="text"
                    defaultValue="•••• •••• •••• 4921"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Expiry</label>
                    <input type="text" defaultValue="09/29" className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">CVC</label>
                    <input type="text" defaultValue="883" className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePayInvoice}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg"
                  >
                    Authorize $21,500.00
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
