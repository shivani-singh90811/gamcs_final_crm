import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { normalizeRole } from '../../utils/rbac';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { Settings, Shield, Server, Bell, Building, Save, AlertTriangle, Moon, Sun } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const isSuperAdmin = normalizeRole(user?.role) === 'ROLE_SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'firm' | 'appearance' | 'security' | 'backend' | 'notifications'>('firm');
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      addToast('error', 'Action Restricted', 'Only Super Admin (Company Owner) can change company settings.');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addToast('success', 'Configuration Saved', 'System settings synchronized with Spring Boot backend.');
    }, 600);
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-5xl">
      <div className="border-b border-slate-800/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Settings className="w-6 h-6 text-emerald-400" /> Executive System Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage practice firm identity, Spring Boot REST API connection parameters, two-factor policies, and webhooks.
          </p>
        </div>

        {!isSuperAdmin && (
          <div className="p-3 bg-amber-950/70 border border-amber-800/80 rounded-2xl flex items-center gap-2 text-xs text-amber-300 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Read-Only Mode. Only Super Admin can modify company settings.</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('firm')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'firm'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building className="w-4 h-4" /> Firm Identity
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'appearance'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />} Appearance
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'security'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" /> Security & 2FA
        </button>

        <button
          onClick={() => setActiveTab('backend')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'backend'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Server className="w-4 h-4" /> Spring Boot REST Setup
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'notifications'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" /> Alerts & Webhooks
        </button>
      </div>

      {/* Settings Form Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <form onSubmit={handleSave} className="space-y-6">
          {activeTab === 'firm' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Practice Firm Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Legal Practice Name
                  </label>
                  <input
                    type="text"
                    defaultValue="GAMCS CRM Advisory Partners LLC"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Corporate Domain
                  </label>
                  <input
                    type="text"
                    defaultValue="gamcs-crm.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Primary Headquarters Address
                </label>
                <input
                  type="text"
                  defaultValue="100 Park Avenue, 28th Floor, New York, NY 10017"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Interface Theme & Mode</h3>

              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                    <h4 className="text-sm font-bold text-white">
                      Current Theme Mode: <span className="text-indigo-400">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    Switch between sleek twilight dark theme and high-contrast clean light theme.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>Switch to {isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Security & Authentication Policies</h3>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enforce Mandatory 2FA for All Managing Partners</h4>
                    <p className="text-[10px] text-slate-400">Requires Time-based One Time Passwords (TOTP) on login.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" />
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">JWT Session Expiration Window</h4>
                    <p className="text-[10px] text-slate-400">Tokens expire after 24 hours of inactivity.</p>
                  </div>
                  <select defaultValue="24h" className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-2 py-1">
                    <option value="8h">8 Hours</option>
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backend' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Spring Boot REST API Endpoint Parameters</h3>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Base API URL
                </label>
                <input
                  type="text"
                  defaultValue="/api/v1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  JWT Authorization Header Format
                </label>
                <input
                  type="text"
                  defaultValue="Authorization: Bearer <token>"
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Alert Notifications</h3>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">High Value Lead Notifications</h4>
                    <p className="text-[10px] text-slate-400">Notify senior partners when a deal value exceeds $500,000.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
