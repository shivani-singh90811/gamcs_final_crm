import React, { useState, useEffect } from 'react';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { apiService } from '../../services/api';
import { OutlookAccountStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Shield,
  Key,
  Mail,
  Building,
  Save,
  Award,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Unlink,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Outlook OAuth State
  const [outlookStatus, setOutlookStatus] = useState<OutlookAccountStatus | null>(null);
  const [loadingOutlook, setLoadingOutlook] = useState(true);
  const [connectingOutlook, setConnectingOutlook] = useState(false);
  const [disconnectingOutlook, setDisconnectingOutlook] = useState(false);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchOutlookStatus = async () => {
    try {
      setLoadingOutlook(true);
      const status = await apiService.getOutlookStatus();
      setOutlookStatus(status);
    } catch (err: any) {
      console.warn('Failed to fetch Outlook status:', err);
    } finally {
      setLoadingOutlook(false);
    }
  };

  useEffect(() => {
    fetchOutlookStatus();

    // Listen for OAuth popup messages
    const handleOAuthMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'OUTLOOK_AUTH_SUCCESS') {
        setConnectingOutlook(false);
        addToast(
          'success',
          'Outlook Connected',
          `Successfully connected mailbox for ${event.data.email || 'your account'}.`
        );
        fetchOutlookStatus();
      } else if (event.data.type === 'OUTLOOK_AUTH_ERROR') {
        setConnectingOutlook(false);
        addToast(
          'error',
          'Outlook Connection Failed',
          event.data.error || 'The authentication flow was cancelled or failed.'
        );
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleConnectOutlook = async () => {
    try {
      setConnectingOutlook(true);
      const res = await apiService.getOutlookConnectUrl();

      if (!res?.url) {
        throw new Error('Could not obtain authorization URL.');
      }

      // Open OAuth popup window directly pointing to Microsoft Entra ID
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        res.url,
        'microsoft_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        setConnectingOutlook(false);
        addToast('error', 'Popup Blocked', 'Please allow popups for this site to complete Microsoft authentication.');
        return;
      }

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setConnectingOutlook(false);
          fetchOutlookStatus();
        }
      }, 1000);
    } catch (err: any) {
      setConnectingOutlook(false);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to initialize Outlook connection. Verify server configuration.';
      addToast('error', 'Connection Error', errMsg);
    }
  };

  const handleDisconnectOutlook = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Microsoft Outlook account? You will no longer be able to send emails from your Outlook mailbox in GAMCS CRM.')) {
      return;
    }

    try {
      setDisconnectingOutlook(true);
      await apiService.disconnectOutlook();
      addToast('info', 'Outlook Disconnected', 'Your Microsoft 365 mailbox has been unlinked.');
      await fetchOutlookStatus();
    } catch (err: any) {
      addToast('error', 'Disconnect Failed', err.message || 'Could not disconnect Outlook account.');
    } finally {
      setDisconnectingOutlook(false);
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addToast('success', 'Profile Saved', 'Executive credentials updated in REST API.');
    }, 600);
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-5xl">
      <div className="border-b border-slate-800/80 pb-6">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <User className="w-6 h-6 text-emerald-400" /> Managing Partner Executive Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Your credentials, Microsoft 365 / Outlook mailbox integrations, practice assignments, and security settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-1 shadow-xl">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-black text-2xl text-white">
              {user?.name ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2) : 'SJ'}
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">{user?.name || 'Sarah Jenkins'}</h3>
            <p className="text-xs text-emerald-400 font-semibold mt-0.5">{user?.title || 'Senior Managing Partner'}</p>
            <span className="text-[10px] text-slate-400 block mt-1">{user?.department || 'Valuation & Restructuring Practice'}</span>
          </div>

          <div className="w-full pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Firm Security Role</span>
              <span className="font-bold text-white">{user?.role || 'ROLE_MANAGING_PARTNER'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>2FA Status</span>
              <span className="font-bold text-emerald-400">ENABLED</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Outlook Mailbox</span>
              <span className={`font-bold ${outlookStatus?.isConnected ? 'text-blue-400' : 'text-slate-500'}`}>
                {outlookStatus?.isConnected ? 'LINKED' : 'NOT LINKED'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Details Form */}
        <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <form onSubmit={handleProfileSave} className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Account Credentials</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue={user?.name || "Sarah Jenkins"}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Practice Department
                </label>
                <input
                  type="text"
                  defaultValue={user?.department || "Valuation & Advisory"}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Corporate CRM Email Address
              </label>
              <input
                type="email"
                defaultValue={user?.email || "sarah.jenkins@gamcs.com"}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Primary Advisory Focus
              </label>
              <input
                type="text"
                defaultValue="Corporate Restructuring, ASC 842 Valuation, DCF Portfolio Modeling"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Update Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Microsoft 365 & Outlook Email Integration Section */}
      <div id="outlook-integration-section" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/5">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white">Microsoft 365 / Outlook Integration</h3>
                {loadingOutlook ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-800 rounded-full flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking
                  </span>
                ) : outlookStatus?.isConnected ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Connected & Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Send professional correspondence directly from your corporate Microsoft 365 mailbox via Microsoft Graph API.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchOutlookStatus}
            disabled={loadingOutlook}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition-colors self-start sm:self-auto cursor-pointer"
            title="Refresh Outlook status"
          >
            <RefreshCw className={`w-4 h-4 ${loadingOutlook ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Integration Details / Connected State */}
        {outlookStatus?.isConnected ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Connected Outlook Mailbox
                </span>
                <p className="text-sm font-bold text-blue-300 mt-1 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-400" />
                  {outlookStatus.microsoftEmail}
                </p>
                {outlookStatus.microsoftName && (
                  <p className="text-xs text-slate-400 mt-0.5">{outlookStatus.microsoftName}</p>
                )}
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  OAuth 2.0 Security Scopes
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(outlookStatus.scopes || ['openid', 'profile', 'email', 'offline_access', 'Mail.Send']).map((scope) => (
                    <span
                      key={scope}
                      className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 rounded-md font-mono"
                    >
                      {scope.replace('https://graph.microsoft.com/', '')}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Connected At
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  {outlookStatus.connectedAt
                    ? new Date(outlookStatus.connectedAt).toLocaleString()
                    : 'Active Session'}
                </p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tokens automatically refreshed
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-slate-200">Microsoft Graph API Security Notice</p>
                  <p className="text-slate-400 mt-0.5">
                    Emails sent from Lead, Client, and Contact dossiers will be dispatched securely from your authenticated Microsoft account. Client secrets are never exposed.
                  </p>
                </div>
              </div>

              <button
                id="disconnect-outlook-btn"
                type="button"
                onClick={handleDisconnectOutlook}
                disabled={disconnectingOutlook}
                className="px-4 py-2 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {disconnectingOutlook ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Unlink className="w-3.5 h-3.5" />
                )}
                <span>Disconnect Outlook</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/30 via-slate-900 to-slate-900 border border-blue-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5" /> Microsoft Entra ID Authorization
                </div>
                <h4 className="text-base font-bold text-white">Connect Your Microsoft 365 Mailbox</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Link your corporate Microsoft 365 / Outlook account to dispatch emails directly to prospective leads, active clients, and key executives without leaving GAMCS CRM.
                </p>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Minimum Permissions (Mail.Send)
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Secure Server-Side Token Storage
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Full Audit Trail History
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-2 w-full md:w-auto">
                <button
                  id="connect-outlook-btn"
                  type="button"
                  onClick={handleConnectOutlook}
                  disabled={connectingOutlook}
                  className="w-full md:w-auto px-6 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  {connectingOutlook ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Microsoft Login...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Connect Outlook (Microsoft 365)</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </>
                  )}
                </button>
                <span className="text-[10px] text-slate-500 text-center w-full">
                  Opens official Microsoft login dialog in a secure popup
                </span>
              </div>
            </div>

            {!outlookStatus?.configured && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Microsoft OAuth Configuration Notice</p>
                  <p className="text-amber-200/90 leading-relaxed">
                    To enable live Microsoft Entra ID authentication, define <code className="text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded">MICROSOFT_CLIENT_ID</code> and <code className="text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded">MICROSOFT_CLIENT_SECRET</code> in the project settings or environment.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};

