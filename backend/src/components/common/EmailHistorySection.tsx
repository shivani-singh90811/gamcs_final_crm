import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { EmailRecord } from '../../types';
import { EmailComposerModal } from './EmailComposerModal';
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
  ExternalLink,
  Calendar,
  User,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface EmailHistorySectionProps {
  leadId?: string;
  clientId?: string;
  contactId?: string;
  recipientEmail?: string;
  recipientName?: string;
  leadName?: string;
  clientName?: string;
  contactName?: string;
}

export const EmailHistorySection: React.FC<EmailHistorySectionProps> = ({
  leadId,
  clientId,
  contactId,
  recipientEmail,
  recipientName,
  leadName,
  clientName,
  contactName,
}) => {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SENT' | 'FAILED' | 'PENDING'>('ALL');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [isResending, setIsResending] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchEmailHistory = async () => {
    setLoading(true);
    try {
      let data: EmailRecord[] = [];
      if (leadId) {
        data = await apiService.getLeadEmails(leadId);
      } else if (clientId) {
        data = await apiService.getClientEmails(clientId);
      } else if (contactId) {
        data = await apiService.getContactEmails(contactId);
      } else {
        data = await apiService.getEmails({ leadId, clientId, contactId });
      }
      setEmails(data);
    } catch (err) {
      console.error('Failed to fetch email history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailHistory();
  }, [leadId, clientId, contactId]);

  const handleResend = async (emailId: string) => {
    setIsResending(emailId);
    setFeedbackNotice(null);
    try {
      const updated = await apiService.resendEmail(emailId);
      setEmails((prev) => prev.map((e) => (e.id === emailId ? updated : e)));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(updated);
      }
      if (updated.status === 'SENT') {
        setFeedbackNotice({ type: 'success', message: `Email resent successfully to ${updated.recipient}!` });
      } else {
        setFeedbackNotice({ type: 'error', message: updated.errorMessage || 'Resend failed. Check SMTP configuration.' });
      }
    } catch (err: any) {
      setFeedbackNotice({ type: 'error', message: err.message || 'Resend request failed' });
    } finally {
      setIsResending(null);
    }
  };

  const handleEmailSentSuccess = (newEmail: EmailRecord) => {
    setEmails((prev) => [newEmail, ...prev]);
    setFeedbackNotice({
      type: newEmail.status === 'SENT' ? 'success' : 'error',
      message:
        newEmail.status === 'SENT'
          ? `Email dispatched successfully to ${newEmail.recipient}`
          : `Email logged as FAILED: ${newEmail.errorMessage || 'SMTP delivery issue'}`,
    });
  };

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || email.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="email-history-section" className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">Email Communication History</h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {emails.length} {emails.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Audit log of all dispatched correspondence, delivery receipts, and resend history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-email-history-btn"
            type="button"
            onClick={fetchEmailHistory}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="open-composer-from-history-btn"
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Email</span>
          </button>
        </div>
      </div>

      {/* Feedback Notice Banner */}
      {feedbackNotice && (
        <div
          id="email-feedback-notice"
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="p-1 hover:opacity-75 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="email-history-search"
            type="text"
            placeholder="Search email logs by subject, recipient, body..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          {(['ALL', 'SENT', 'FAILED', 'PENDING'] as const).map((st) => (
            <button
              key={st}
              id={`email-filter-${st.toLowerCase()}`}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Email List */}
      {loading ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading correspondence logs...</p>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-200">No email communications found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No records match your active search filter. Try clearing filters.'
              : 'No emails have been recorded for this profile yet. Click "Send Email" above to dispatch communications.'}
          </p>
          <button
            id="empty-state-send-email-btn"
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose First Email</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredEmails.map((eml) => (
            <div
              key={eml.id}
              id={`email-card-${eml.id}`}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  {eml.status === 'SENT' ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      SENT
                    </span>
                  ) : eml.status === 'FAILED' ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      FAILED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      PENDING
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-200">
                    To: <strong className="text-slate-100">{eml.recipient}</strong>
                  </span>
                  {eml.cc && <span className="text-[10px] text-slate-400">(CC: {eml.cc})</span>}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{new Date(eml.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Subject & snippet */}
              <div className="pt-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{eml.subject}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed whitespace-pre-wrap font-sans">
                    {eml.body}
                  </p>
                  {eml.errorMessage && (
                    <div className="mt-2 p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-[11px] text-rose-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{eml.errorMessage}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {eml.status === 'FAILED' && (
                    <button
                      id={`resend-email-btn-${eml.id}`}
                      type="button"
                      onClick={() => handleResend(eml.id)}
                      disabled={isResending === eml.id}
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                      title="Resend email"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isResending === eml.id ? 'animate-spin' : ''}`} />
                      <span>Resend</span>
                    </button>
                  )}

                  <button
                    id={`view-email-details-btn-${eml.id}`}
                    type="button"
                    onClick={() => setSelectedEmail(eml)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email Details / Preview Modal */}
      {selectedEmail && (
        <div
          id="email-detail-preview-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEmail(null);
          }}
        >
          <div
            id="email-detail-preview-modal"
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Dispatched Communication Details</h3>
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
              {/* Meta Grid */}
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
                  <span className="text-slate-400 font-medium">Sent Timestamp:</span>
                  <p className="mt-1 text-slate-200 font-semibold">
                    {selectedEmail.sentAt ? new Date(selectedEmail.sentAt).toLocaleString() : 'Not sent yet'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">From (Sender):</span>
                  <p className="mt-1 text-slate-200 font-semibold">{selectedEmail.sender}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">To (Recipient):</span>
                  <p className="mt-1 text-slate-200 font-semibold">{selectedEmail.recipient}</p>
                </div>

                {selectedEmail.cc && (
                  <div>
                    <span className="text-slate-400 font-medium">CC:</span>
                    <p className="mt-1 text-slate-200">{selectedEmail.cc}</p>
                  </div>
                )}

                {selectedEmail.bcc && (
                  <div>
                    <span className="text-slate-400 font-medium">BCC:</span>
                    <p className="mt-1 text-slate-200">{selectedEmail.bcc}</p>
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
                <label className="text-xs font-semibold text-slate-400 block mb-1">Message Content:</label>
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">
                  {selectedEmail.body}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <div>
                {selectedEmail.status === 'FAILED' && (
                  <button
                    id="modal-resend-email-btn"
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
        initialRecipient={recipientEmail || ''}
        recipientName={recipientName || contactName || leadName || clientName || ''}
        leadId={leadId}
        clientId={clientId}
        contactId={contactId}
        leadName={leadName}
        clientName={clientName}
        contactName={contactName}
        onEmailSent={handleEmailSentSuccess}
      />
    </div>
  );
};
