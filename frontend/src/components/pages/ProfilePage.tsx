import React, { useState } from 'react';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { User, Shield, Key, Mail, Building, Save, Award, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
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
    <div className="p-8 space-y-6 animate-fade-in max-w-4xl">
      <div className="border-b border-slate-800/80 pb-6">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <User className="w-6 h-6 text-emerald-400" /> Managing Partner Executive Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Your credentials, active practice assignments, billable target hours, and security keys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-1 shadow-xl">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-black text-2xl text-white">
              SJ
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Sarah Jenkins</h3>
            <p className="text-xs text-emerald-400 font-semibold mt-0.5">Senior Managing Partner</p>
            <span className="text-[10px] text-slate-400 block mt-1">Valuation & Restructuring Practice</span>
          </div>

          <div className="w-full pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Firm Security Role</span>
              <span className="font-bold text-white">ROLE_MANAGING_PARTNER</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>2FA Status</span>
              <span className="font-bold text-emerald-400">ENABLED</span>
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
                  First Name
                </label>
                <input
                  type="text"
                  defaultValue="Sarah"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  defaultValue="Jenkins"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Corporate Email Address
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
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Update Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
