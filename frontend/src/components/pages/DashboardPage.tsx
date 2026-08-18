import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Lead, ActivityItem, Task } from '../../types';
import {
  DollarSign, Trophy, FileText, Calendar, Plus, CheckCircle2, Sparkles, ArrowRight, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FollowUpModal } from '../common/FollowUpModal';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leadsData, tasksData, actData] = await Promise.all([
        apiService.getLeads(),
        apiService.getTasks(),
        apiService.getActivities(),
      ]);
      setLeads(leadsData);
      setTasks(tasksData);
      setActivities(actData);
    } catch (err) {
      console.error('Failed loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute metrics dynamically from leads
  const activeLeads = leads.filter((l) => l.stage !== 'CLOSED_WON' && l.stage !== 'CLOSED_LOST' && l.stage !== 'WON' && l.stage !== 'LOST');
  const activePipelineValue = activeLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

  const wonLeads = leads.filter((l) => l.stage === 'CLOSED_WON' || l.stage === 'WON');
  const closedRevenue = wonLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

  const proposalLeads = leads.filter((l) => l.stage === 'PROPOSAL_SENT');
  const proposalValue = proposalLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

  const contractLeads = leads.filter((l) => l.stage === 'CONTRACT');
  const contractValue = contractLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

  const winRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 100;

  // Pipeline stage breakdown map
  const stagesList = [
    { key: 'NEW_LEAD', label: 'New Lead', color: 'border-blue-900/60 bg-blue-950/20' },
    { key: 'CONTACTED', label: 'Contacted', color: 'border-[#1e2d4a] bg-[#121c33]' },
    { key: 'QUALIFIED', label: 'Qualified', color: 'border-cyan-900/60 bg-cyan-950/20' },
    { key: 'PROPOSAL_SENT', label: 'Proposal Sent', color: 'border-purple-900/60 bg-purple-950/20' },
    { key: 'NEGOTIATION', label: 'Negotiation', color: 'border-amber-900/60 bg-amber-950/20' },
    { key: 'CONTRACT', label: 'Contract / Legal', color: 'border-teal-900/60 bg-teal-950/20' },
    { key: 'CLOSED_WON', label: 'Closed Won', color: 'border-emerald-900/60 bg-emerald-950/20' },
    { key: 'CLOSED_LOST', label: 'Closed Lost', color: 'border-rose-900/60 bg-rose-950/20' },
  ];

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-28 bg-slate-900 rounded-3xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-40 bg-slate-900 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#070a12] min-h-screen text-slate-100 animate-fade-in select-none">
      {/* Overview Banner Header Box */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#171d33] via-[#12182b] to-[#0d1220] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block mb-1">
            OVERVIEW
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Sales Pipeline & Lead Performance
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Track leads, manage active proposals, and never miss a client follow-up with real-time dynamic pipeline tracking.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/leads?action=add')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Lead</span>
          </button>
          <button
            onClick={() => navigate('/proposals')}
            className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Create Proposal</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Pipeline */}
        <div className="p-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col justify-between hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ACTIVE PIPELINE</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3 tracking-tight">
            ${activePipelineValue.toLocaleString()}
          </p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
            <span className="text-slate-400 font-medium">{activeLeads.length} active leads</span>
            <button onClick={() => navigate('/leads')} className="text-indigo-400 font-bold hover:underline flex items-center gap-0.5">
              View &gt;
            </button>
          </div>
        </div>

        {/* Closed Revenue */}
        <div className="p-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CLOSED REVENUE</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3 tracking-tight">
            ${closedRevenue.toLocaleString()}
          </p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
            <span className="text-slate-400 font-medium">{wonLeads.length} deals won</span>
            <span className="text-emerald-400 font-bold">{winRate}% win rate</span>
          </div>
        </div>

        {/* Sent Proposals */}
        <div className="p-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col justify-between hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SENT PROPOSALS</span>
            <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3 tracking-tight">
            ${proposalValue.toLocaleString()}
          </p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
            <span className="text-slate-400 font-medium">{proposalLeads.length} awaiting decision</span>
            <span className="text-slate-400 font-bold">{proposalLeads.length} total</span>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="p-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl flex flex-col justify-between hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">PENDING TASKS</span>
            <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3 tracking-tight">
            {tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'DONE').length}
          </p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
            <span className="text-slate-400 font-medium">0 due today</span>
            <button onClick={() => setShowScheduleModal(true)} className="text-amber-400 font-bold hover:underline flex items-center gap-0.5">
              Schedule &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline Stage Breakdown Section */}
      <div className="p-6 bg-[#0e1322] border border-slate-800/90 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Pipeline Stage Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribution of leads and monetary deal value across stages</p>
          </div>
          <button
            onClick={() => navigate('/leads')}
            className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
          >
            Open Pipeline Board &gt;
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {stagesList.map((st) => {
            const stageLeads = leads.filter(
              (l) => l.stage === st.key || (st.key === 'CLOSED_WON' && l.stage === 'WON') || (st.key === 'CLOSED_LOST' && l.stage === 'LOST')
            );
            const totalVal = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

            return (
              <div
                key={st.key}
                onClick={() => navigate('/leads')}
                className={`p-3.5 border rounded-xl cursor-pointer hover:border-indigo-500/60 transition-all ${st.color}`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-2">
                  <span>{st.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{stageLeads.length}</span>
                </div>
                <p className="text-sm font-extrabold text-white">
                  ${totalVal.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column Split: Follow-ups & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Immediate Action Follow-ups */}
        <div className="lg:col-span-7 bg-[#0e1322] border border-slate-800/90 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[280px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Immediate Action Follow-ups ({tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'DONE').length})
            </h3>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
            >
              + Schedule Task
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800/80 rounded-2xl bg-[#090d19]/40">
            {tasks.length === 0 ? (
              <>
                <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-white">All clear for today!</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  No overdue or pending follow-ups scheduled for today.
                </p>
              </>
            ) : (
              <div className="w-full space-y-2 text-left">
                {tasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="p-3 bg-[#0a0e1a] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{t.title}</span>
                      <span className="text-[10px] text-slate-400">{t.clientName} • Due: {t.dueDate}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="lg:col-span-5 bg-[#0e1322] border border-slate-800/90 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Activity Feed
            </h3>
            <button
              onClick={() => navigate('/timeline')}
              className="text-xs font-bold text-indigo-400 hover:underline"
            >
              View Log &gt;
            </button>
          </div>

          <div className="space-y-3.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
            {activities.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-6">No recent activities</div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                  <div>
                    <p className="text-slate-200 leading-snug">
                      <strong className="text-indigo-400 font-bold">[{act.user || 'shivani singh'}]</strong>{' '}
                      {act.details || act.description || 'Updated pipeline record'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {act.entityName ? `${act.entityName} • ` : ''}Jul 31, 2026
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Follow-up Schedule Modal */}
      <FollowUpModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onTaskCreated={fetchData}
      />
    </div>
  );
};
