import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { ActivityItem } from '../../types';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { RemarksSection } from '../common/RemarksSection';
import { Activity, RefreshCw, Clock, MessageSquare, ShieldCheck, FileText } from 'lucide-react';

export const ActivityTimelinePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REMARKS' | 'AUDIT'>('REMARKS');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getActivities();
      setActivities(data);
    } catch (err) {
      addToast('error', 'REST API Error', 'Failed to sync activity timeline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filtered = activities.filter((a) => {
    if (filterCategory === 'ALL') return true;
    return a.category === filterCategory;
  });

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="w-6 h-6 text-indigo-400" /> Activity Notes & Audit Timeline
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centralized stage remarks, progress notes, and audit logs across the CRM lifecycle.
          </p>
        </div>

        <button
          onClick={fetchActivities}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} /> Refresh Timeline
        </button>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('REMARKS')}
          className={`px-4 py-2 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'REMARKS'
              ? 'bg-slate-900 text-white border-indigo-500 shadow-lg'
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-indigo-400" /> Stage Remarks & Notes
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'AUDIT'
              ? 'bg-slate-900 text-white border-emerald-500 shadow-lg'
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> System Audit Trail
        </button>
      </div>

      {activeTab === 'REMARKS' ? (
        <RemarksSection
          title="CRM Stage Remarks & Notes Timeline"
          showFilters={true}
        />
      ) : (
        <div className="space-y-6">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {['ALL', 'LEAD', 'DOCUMENT', 'BILLING', 'SECURITY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? 'All Activity' : cat}
              </button>
            ))}
          </div>

          {/* Timeline Feed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md relative space-y-6">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" /> Fetching activity stream...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 font-bold">No activity recorded for this category.</div>
            ) : (
              <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6">
                {filtered.map((act) => (
                  <div key={act.id} className="relative group">
                    <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400">
                      <Activity className="w-3 h-3" />
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 shadow-md space-y-1 hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white tracking-tight">{act.title || act.action}</span>
                        <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {act.timestamp || act.timeAgo || 'Just now'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400">{act.description || act.details}</p>

                      <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span>User: {act.user || 'Sarah Jenkins'}</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 uppercase font-bold">
                          {act.category || act.entityType || 'SYSTEM'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
