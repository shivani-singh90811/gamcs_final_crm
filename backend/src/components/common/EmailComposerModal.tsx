import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { EmailRecord, SendEmailPayload, SmtpStatusResponse, OutlookAccountStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Mail,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Building,
  Info,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipient?: string;
  recipientName?: string;
  leadId?: string;
  clientId?: string;
  contactId?: string;
  leadName?: string;
  clientName?: string;
  contactName?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onEmailSent?: (email: EmailRecord) => void;
}

interface TemplateOption {
  id: string;
  title: string;
  subject: string;
  body: string;
}

export const EmailComposerModal: React.FC<EmailComposerModalProps> = ({
  isOpen,
  onClose,
  initialRecipient = '',
  recipientName = '',
  leadId,
  clientId,
  contactId,
  leadName,
  clientName,
  contactName,
  defaultSubject = '',
  defaultBody = '',
  onEmailSent,
}) => {
  const { user } = useAuth();

  const [to, setTo] = useState(initialRecipient);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email status states
  const [outlookStatus, setOutlookStatus] = useState<OutlookAccountStatus | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusResponse | null>(null);
  const [checkingAccounts, setCheckingAccounts] = useState(false);
  const [connectingOutlook, setConnectingOutlook] = useState(false);

  const targetName = recipientName || contactName || leadName || clientName || 'Valued Client';
  const companyTarget = clientName || leadName || 'Company';

  const TEMPLATES: TemplateOption[] = [
    {
      id: 'custom',
      title: 'Blank / Custom Message',
      subject: '',
      body: '',
    },
    {
      id: 'followup',
      title: 'Executive Advisory Follow-up',
      subject: `Follow-up: Executive Advisory Discussion - ${companyTarget}`,
      body: `Dear ${targetName},\n\nThank you for speaking with our practice leadership today regarding ${companyTarget}'s strategic financial initiatives.\n\nAs discussed, our advisory practice specializes in fractional CFO leadership, financial modeling, and audit readiness. We are prepared to assist your team in achieving your next operational milestones.\n\nPlease let us know if you would like to review a customized statement of work.\n\nWarm regards,\n${user?.name || 'Managing Partner'}\nGAMCS Practice Management`,
    },
    {
      id: 'proposal_dispatch',
      title: 'Proposal & Scope of Work Dispatched',
      subject: `Formal Engagement Proposal: ${companyTarget} - GAMCS Practice`,
      body: `Dear ${targetName},\n\nWe are pleased to submit our comprehensive advisory engagement proposal for ${companyTarget}.\n\nThe proposal outlines our milestone deliverables, timeline, fee schedule, and partner oversight commitments.\n\nPlease review the terms and feel free to reach out directly if you have any questions or require scope adjustments.\n\nBest regards,\n${user?.name || 'Managing Partner'}\nGAMCS CRM Advisory Practice`,
    },
    {
      id: 'meeting_notes',
      title: 'Meeting Notes & Next Action Items',
      subject: `Meeting Summary & Action Items - ${companyTarget}`,
      body: `Dear ${targetName},\n\nThank you for the productive discussion during our strategy session today.\n\nKey Takeaways & Next Steps:\n1. Financial modeling assumptions to be updated for Q3.\n2. Virtual data room structure prepared for review.\n3. Follow-up meeting scheduled for next week.\n\nPlease let us know if you have any additions to these action items.\n\nSincerely,\n${user?.name || 'Advisory Lead'}\nGAMCS Practice`,
    },
    {
      id: 'invoice_notice',
      title: 'Retainer & Billing Schedule Notice',
      subject: `Billing Notice: Professional Services Invoice - ${companyTarget}`,
      body: `Dear ${targetName},\n\nPlease find attached the billing statement for our ongoing advisory retainer for ${companyTarget}.\n\nOur team remains at your disposal for any financial reporting or audit inquiries.\n\nThank you for your continued partnership.\n\nWarm regards,\nFinance & Treasury Team\nGAMCS Practice Management`,
    },
  ];

  const checkConnectionStatuses = async () => {
    setCheckingAccounts(true);
    try {
      const [outlook, smtp] = await Promise.all([
        apiService.getOutlookStatus().catch(() => null),
        apiService.getSmtpStatus().catch(() => null),
      ]);
      if (outlook) setOutlookStatus(outlook);
      if (smtp) setSmtpStatus(smtp);
    } catch (err) {
      console.warn('Failed to check connection statuses:', err);
    } finally {
      setCheckingAccounts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTo(initialRecipient);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setErrorMessage(null);
      checkConnectionStatuses();
    }
  }, [isOpen, initialRecipient, defaultSubject, defaultBody]);

  // Listen for OAuth message if user connects Outlook from inside modal
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OUTLOOK_AUTH_SUCCESS') {
        setConnectingOutlook(false);
        checkConnectionStatuses();
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleConnectOutlook = async () => {
    try {
      setConnectingOutlook(true);
      const res = await apiService.getOutlookConnectUrl();
      if (!res?.url) throw new Error('Authorization URL unavailable');

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        res.url,
        'microsoft_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );
    } catch (err: any) {
      setConnectingOutlook(false);
      setErrorMessage(err.message || 'Failed to initialize Microsoft login.');
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (tmpl && templateId !== 'custom') {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
    }
  };

  const insertVariable = (varText: string) => {
    setBody((prev) => prev + varText);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!to.trim()) {
      setErrorMessage('Recipient email address (To) is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsList = to.split(',').map((s) => s.trim()).filter(Boolean);
    const invalidEmail = emailsList.find((eml) => !emailRegex.test(eml));
    if (invalidEmail) {
      setErrorMessage(`Invalid email format: "${invalidEmail}". Please provide valid email address(es).`);
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Email subject is required.');
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Email message body cannot be empty.');
      return;
    }

    setIsSending(true);

    const payload: SendEmailPayload = {
      to: to.trim(),
      cc: cc.trim() || undefined,
      bcc: bcc.trim() || undefined,
      subject: subject.trim(),
      body: body.trim(),
      leadId,
      clientId,
      contactId,
      leadName,
      clientName,
      contactName: recipientName || contactName,
    };

    try {
      let res: EmailRecord;
      if (outlookStatus?.isConnected) {
        // Send directly via Microsoft Graph API
        res = await apiService.sendOutlookEmail(payload);
      } else {
        // Send via default email handler
        res = await apiService.sendEmail(payload);
      }

      if (onEmailSent) {
        onEmailSent(res);
      }
      onClose();
    } catch (err: any) {
      console.error('Email send error:', err);
      const apiErrMsg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0] ||
        err?.message ||
        'Failed to dispatch email. Please check your Outlook connection or SMTP settings.';
      setErrorMessage(apiErrMsg);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const senderDisplayEmail = outlookStatus?.isConnected
    ? outlookStatus.microsoftEmail
    : user?.email || 'sarah.jenkins@gamcs.com';

  return (
    <div
      id="email-composer-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSending) onClose();
      }}
    >
      <div
        id="email-composer-modal"
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Compose Email Communication</h3>
                {outlookStatus?.isConnected ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                    Outlook 365 Connected
                  </span>
                ) : smtpStatus?.configured ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    SMTP Ready
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectOutlook}
                    disabled={connectingOutlook}
                    className="px-2.5 py-0.5 text-[10px] font-bold text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Mail className="w-3 h-3 text-blue-400" />
                    <span>Connect Outlook</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {leadName ? (
                  <span>
                    Linked to Lead: <strong className="text-slate-200">{leadName}</strong>
                  </span>
                ) : clientName ? (
                  <span>
                    Linked to Client: <strong className="text-slate-200">{clientName}</strong>
                  </span>
                ) : contactName ? (
                  <span>
                    Linked to Contact: <strong className="text-slate-200">{contactName}</strong>
                  </span>
                ) : (
                  <span>Direct Advisory Communication</span>
                )}
              </p>
            </div>
          </div>

          <button
            id="email-composer-close-btn"
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-y-auto px-6 py-5 space-y-4">
          {errorMessage && (
            <div
              id="email-composer-error-banner"
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Email Delivery Notice</p>
                <p className="mt-0.5 text-rose-200/90 leading-relaxed">{errorMessage}</p>
                {!outlookStatus?.isConnected && !smtpStatus?.configured && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConnectOutlook}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Link Microsoft Outlook</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Template Selector */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Quick Template:</span>
            </div>
            <select
              id="email-template-selector"
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.title}
                </option>
              ))}
            </select>
          </div>

          {/* To Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>To (Recipient)</span>
                <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                {showCcBcc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{showCcBcc ? 'Hide CC / BCC' : 'Add CC / BCC'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                id="email-to-input"
                type="text"
                required
                placeholder="e.g. client@enterprise.com (comma-separated for multiple)"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* CC & BCC Fields (Collapsible) */}
          {showCcBcc && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 animate-in fade-in duration-150">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">CC (Carbon Copy)</label>
                <input
                  id="email-cc-input"
                  type="text"
                  placeholder="e.g. manager@firm.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">BCC (Blind Carbon Copy)</label>
                <input
                  id="email-bcc-input"
                  type="text"
                  placeholder="e.g. audit-archive@firm.com"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          {/* Subject Field */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Subject <span className="text-rose-400">*</span>
            </label>
            <input
              id="email-subject-input"
              type="text"
              required
              placeholder="e.g. Executive Proposal & Advisory Scope"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Body Field & Quick Variables */}
          <div className="flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Message Body <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span>Insert:</span>
                <button
                  type="button"
                  onClick={() => insertVariable(targetName)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-medium transition-colors cursor-pointer"
                >
                  +{targetName}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable(companyTarget)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-medium transition-colors cursor-pointer"
                >
                  +{companyTarget}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable(user?.name || 'Managing Partner')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-medium transition-colors cursor-pointer"
                >
                  +Sender
                </button>
              </div>
            </div>
            <textarea
              id="email-body-textarea"
              required
              rows={8}
              placeholder="Write your email message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full flex-1 bg-slate-800/80 border border-slate-700 text-slate-100 rounded-xl p-3.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500 font-sans leading-relaxed resize-none"
            />
            <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
              <span>Microsoft Graph / HTML formatted delivery</span>
              <span>{body.length} characters</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Sender Mailbox:</span>
              <strong className="text-slate-200">{senderDisplayEmail}</strong>
              {outlookStatus?.isConnected && (
                <span className="text-[10px] text-blue-400 font-semibold">(Outlook 365)</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                id="email-composer-cancel-btn"
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="email-composer-submit-btn"
                type="submit"
                disabled={isSending}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching via Graph API...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

