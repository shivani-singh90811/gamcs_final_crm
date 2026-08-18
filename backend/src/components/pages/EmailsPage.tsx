import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { EmailRecord, SmtpStatusResponse, OutlookAccountStatus } from '../../types';
import { EmailComposerModal } from '../common/EmailComposerModal';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Eye,
  RotateCw,
  X,
  Server,
  Layers,
  Users,
  Building2,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const EmailsPage: React.FC = () => {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL'); // ALL, LEAD, CLIENT, CONTACT
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusResponse | null>(null);
  const [outlookStatus, setOutlookStatus] = useState<OutlookAccountStatus | null>(null);

  // Composer Modal State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerRecipient, setComposerRecipient] = useState('');
  const [composerRecipientName, setComposerRecipientName] = useState('');
  const [composerLeadId, setComposerLeadId] = useState<string | undefined>(undefined);
  const [composerClientId, setComposerClientId] = useState<string | undefined>(undefined);
  const [composerContactId, setComposerContactId] = useState<string | undefined>(undefined);
  const [composerLeadName, setComposerLeadName] = useState<string | undefined>(undefined);
  const [composerClientName, setComposerClientName] = useState<string | undefined>(undefined);

  // Detail Modal State
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [isResending, setIsResending] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAllEmails = async () => {
    setLoading(true);
    try {
      const [emailData, statusData, outlookData] = await Promise.all([
        apiService.getEmails(),
        apiService.getSmtpStatus().catch(() => null),
        apiService.getOutlookStatus().catch(() => null),
      ]);
      setEmails(emailData);
      if (statusData) setSmtpStatus(statusData);
      if (outlookData) setOutlookStatus(outlookData);
    } catch (err) {
      console.error('Failed to load email communications hub:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEmails();
  }, []);

  const handleResend = async (emailId: string) => {
    setIsResending(emailId);
    setToastMessage(null);
    try {
      const updated = await apiService.resendEmail(emailId);
      setEmails((prev) => prev.map((e) => (e.id === emailId ? updated : e)));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(updated);
      }
      if (updated.status === 'SENT') {
        setToastMessage({ type: 'success', text: `Email delivered successfully to ${updated.recipient}!` });
      } else {
        setToastMessage({
          type: 'error',
          text: updated.errorMessage || 'Resend failed. Check your Outlook/SMTP configuration.',
        });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Resend request failed' });
    } finally {
      setIsResending(null);
    }
  };

  const handleEmailSentSuccess = (newEmail: EmailRecord) => {
    setEmails((prev) => [newEmail, ...prev]);
    setToastMessage({
      type: newEmail.status === 'SENT' ? 'success' : 'error',
      text:
        newEmail.status === 'SENT'
          ? `Dispatched email to ${newEmail.recipient}`
          : `Email recorded as FAILED: ${newEmail.errorMessage || 'Delivery issue'}`,
    });
  };

  const openQuickComposer = () => {
    setComposerRecipient('');
    setComposerRecipientName('');
    setComposerLeadId(undefined);
    setComposerClientId(undefined);
    setComposerContactId(undefined);
    setComposerLeadName(undefined);
    setComposerClientName(undefined);
    setIsComposerOpen(true);
  };

  const totalSent = emails.filter((e) => e.status === 'SENT').length;
  const totalFailed = emails.filter((e) => e.status === 'FAILED').length;
  const totalPending = emails.filter((e) => e.status === 'PENDING').length;

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (email.leadName && email.leadName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (email.clientName && email.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (email.contactName && email.contactName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || email.status === statusFilter;

    let matchesEntity = true;
    if (entityFilter === 'LEAD') {
      matchesEntity = Boolean(email.leadId);
    } else if (entityFilter === 'CLIENT') {
      matchesEntity = Boolean(email.clientId);
    } else if (entityFilter === 'CONTACT') {
      matchesEntity = Boolean(email.contactId);
    }

    return matchesSearch && matchesStatus && matchesEntity;
  });

  return (
    <div id="emails-page-container" className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">Email Communications Hub</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Microsoft 365 & Graph API
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Centrally manage, monitor, and dispatch client correspondence, proposal notifications, and billing notices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-emails-btn"
            type="button"
            onClick={fetchAllEmails}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="compose-email-hub-btn"
            type="button"
            onClick={openQuickComposer}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Compose Email</span>
          </button>
        </div>
      </div>

      {/* Toast Notice */}
      {toastMessage && (
        <div
          id="email-hub-toast"
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outbox */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Logged</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">{emails.length}</span>
            <span className="text-xs text-slate-400">emails</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Audit log across all CRM entities</p>
        </div>

        {/* Delivered / Sent */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Delivered</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{totalSent}</span>
            <span className="text-xs text-slate-400">
              ({emails.length > 0 ? Math.round((totalSent / emails.length) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dispatched via Outlook / SMTP</p>
        </div>

        {/* Failed / Pending */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Failed / Incomplete</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400">{totalFailed}</span>
            <span className="text-xs text-slate-400">pending retry</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Retryable with 1-click resend</p>
        </div>

        {/* Outlook Status */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Outlook 365</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {outlookStatus?.isConnected ? (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 truncate max-w-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="truncate">{outlookStatus.microsoftEmail}</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Link in Profile</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {outlookStatus?.isConnected ? 'Microsoft Graph API Active' : 'SMTP Fallback Available'}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="emails-hub-search-input"
            type="text"
            placeholder="Search email logs by subject, recipient, client name, lead name, sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-100 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            {['ALL', 'SENT', 'FAILED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  statusFilter === st ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Entity Filter */}
          <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            {[
              { id: 'ALL', label: 'All Entities' },
              { id: 'LEAD', label: 'Leads' },
              { id: 'CLIENT', label: 'Clients' },
              { id: 'CONTACT', label: 'Contacts' },
            ].map((ent) => (
              <button
                key={ent.id}
                type="button"
                onClick={() => setEntityFilter(ent.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  entityFilter === ent.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {ent.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Emails Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400">Loading email communications logs...</p>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
              <Mail className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">No email records found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery || statusFilter !== 'ALL' || entityFilter !== 'ALL'
                ? 'Try adjusting your search query or filters to locate specific email records.'
                : 'Your practice email communication history is clean. Click "Compose Email" to send messages.'}
            </p>
            <button
              type="button"
              onClick={openQuickComposer}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose First Email</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Subject & Content Snippet</th>
                  <th className="py-3.5 px-4">Linked CRM Entity</th>
                  <th className="py-3.5 px-4">Sent At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredEmails.map((eml) => (
                  <tr
                    key={eml.id}
                    id={`email-row-${eml.id}`}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {eml.status === 'SENT' ? (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          SENT
                        </span>
                      ) : eml.status === 'FAILED' ? (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          FAILED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                      )}
                    </td>

                    {/* Recipient */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{eml.recipient}</div>
                      {eml.contactName && <div className="text-[11px] text-slate-400">{eml.contactName}</div>}
                    </td>

                    {/* Subject & snippet */}
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-semibold text-slate-200 truncate">{eml.subject}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{eml.body}</div>
                      {eml.errorMessage && (
                        <div className="text-[10px] text-rose-400 truncate mt-0.5">Error: {eml.errorMessage}</div>
                      )}
                    </td>

                    {/* Linked Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {eml.leadName ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-medium">
                          Lead: {eml.leadName}
                        </span>
                      ) : eml.clientName ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-medium">
                          Client: {eml.clientName}
                        </span>
                      ) : eml.contactName ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium">
                          Contact: {eml.contactName}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Direct Communication</span>
                      )}
                    </td>

                    {/* Sent Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                      {eml.sentAt ? new Date(eml.sentAt).toLocaleString() : new Date(eml.createdAt).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {eml.status === 'FAILED' && (
                          <button
                            type="button"
                            onClick={() => handleResend(eml.id)}
                            disabled={isResending === eml.id}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                            title="Resend email"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${isResending === eml.id ? 'animate-spin' : ''}`} />
                            <span>Resend</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedEmail(eml)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Detail / Preview Modal */}
      {selectedEmail && (
        <div
          id="emails-hub-detail-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEmail(null);
          }}
        >
          <div
            id="emails-hub-detail-modal"
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Dispatched Communication Record</h3>
                  <p className="text-xs text-slate-400">ID: {selectedEmail.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Status:</span>
                  <div className="mt-1">
                    {selectedEmail.status === 'SENT' ? (
                      <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        SENT VIA SMTP
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        FAILED DELIVERY
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Timestamp:</span>
                  <p className="mt-1 text-slate-200 font-semibold">
                    {selectedEmail.sentAt ? new Date(selectedEmail.sentAt).toLocaleString() : 'Pending send'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Sender:</span>
                  <p className="mt-1 text-slate-200 font-semibold">{selectedEmail.sender}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Recipient:</span>
                  <p className="mt-1 text-slate-200 font-semibold">{selectedEmail.recipient}</p>
                </div>

                {selectedEmail.leadName && (
                  <div>
                    <span className="text-slate-400 font-medium">Linked Lead:</span>
                    <p className="mt-1 text-purple-300 font-semibold">{selectedEmail.leadName}</p>
                  </div>
                )}

                {selectedEmail.clientName && (
                  <div>
                    <span className="text-slate-400 font-medium">Linked Client:</span>
                    <p className="mt-1 text-blue-300 font-semibold">{selectedEmail.clientName}</p>
                  </div>
                )}
              </div>

              {selectedEmail.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Delivery Failure Diagnosis:</p>
                    <p className="mt-0.5 leading-relaxed">{selectedEmail.errorMessage}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Subject:</label>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-100">
                  {selectedEmail.subject}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Message Body:</label>
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">
                  {selectedEmail.body}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <div>
                {selectedEmail.status === 'FAILED' && (
                  <button
                    type="button"
                    onClick={() => handleResend(selectedEmail.id)}
                    disabled={isResending === selectedEmail.id}
                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isResending === selectedEmail.id ? 'animate-spin' : ''}`} />
                    <span>Retry Dispatch</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Composer Modal */}
      <EmailComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        initialRecipient={composerRecipient}
        recipientName={composerRecipientName}
        leadId={composerLeadId}
        clientId={composerClientId}
        contactId={composerContactId}
        leadName={composerLeadName}
        clientName={composerClientName}
        onEmailSent={handleEmailSentSuccess}
      />
    </div>
  );
};
