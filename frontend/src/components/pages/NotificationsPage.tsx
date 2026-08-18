import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { NotificationItem } from '../../types';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { Bell, CheckCheck, Trash2, Clock, AlertTriangle, ShieldCheck, DollarSign, Users } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
    } catch (err) {
      addToast('error', 'REST API Error', 'Failed to fetch notification alerts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast('success', 'Alerts Updated', 'All notifications marked as read.');
  };

  const handleClearAll = () => {
    setNotifications([]);
    addToast('info', 'Alerts Cleared', 'Notification drawer cleared.');
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-4xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Bell className="w-6 h-6 text-emerald-400" /> Executive Notification Feed
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time notifications regarding high-value lead shifts, past-due invoices, and board meetings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Mark All Read
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-rose-900 text-rose-400 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-bold">Loading notification feed...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-bold border border-slate-800 rounded-2xl bg-slate-900/50">
            No active alerts. You are completely caught up!
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                n.read
                  ? 'bg-slate-900/50 border-slate-800/60 text-slate-400'
                  : 'bg-slate-900 border-slate-800 text-white shadow-lg border-l-4 border-l-emerald-500'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold tracking-tight text-white">{n.title}</h4>
                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {n.timestamp || 'Recent'}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
