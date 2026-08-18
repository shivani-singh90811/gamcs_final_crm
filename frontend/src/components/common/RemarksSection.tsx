import React, { useState, useEffect } from 'react';
import { Remark, RelatedEntityType, RemarkStage } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/rbac';
import { MessageSquare, Plus, Trash2, Calendar, User, Tag, Clock, ShieldCheck, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RemarksSectionProps {
  relatedEntity?: RelatedEntityType;
  relatedEntityId?: string;
  relatedEntityName?: string;
  defaultStage?: RemarkStage | string;
  title?: string;
  showFilters?: boolean;
  compact?: boolean;
  onRemarkAdded?: (newRemark: Remark) => void;
}

export const STAGE_OPTIONS: { stage: RemarkStage; label: string; color: string; bg: string; border: string }[] = [
  { stage: 'Lead creation', label: 'Lead Creation', color: 'text-indigo-400', bg: 'bg-indigo-950/80', border: 'border-indigo-800/80' },
  { stage: 'Contacted', label: 'Contacted', color: 'text-blue-400', bg: 'bg-blue-950/80', border: 'border-blue-800/80' },
  { stage: 'Meeting', label: 'Meeting', color: 'text-purple-400', bg: 'bg-purple-950/80', border: 'border-purple-800/80' },
  { stage: 'Follow-up', label: 'Follow-up', color: 'text-amber-400', bg: 'bg-amber-950/80', border: 'border-amber-800/80' },
  { stage: 'Proposal', label: 'Proposal', color: 'text-cyan-400', bg: 'bg-cyan-950/80', border: 'border-cyan-800/80' },
  { stage: 'Proposal sent', label: 'Proposal Sent', color: 'text-sky-400', bg: 'bg-sky-950/80', border: 'border-sky-800/80' },
  { stage: 'Client conversion', label: 'Client Conversion', color: 'text-teal-400', bg: 'bg-teal-950/80', border: 'border-teal-800/80' },
  { stage: 'Project creation', label: 'Project Creation', color: 'text-rose-400', bg: 'bg-rose-950/80', border: 'border-rose-800/80' },
  { stage: 'Task completion', label: 'Task Completion', color: 'text-emerald-400', bg: 'bg-emerald-950/80', border: 'border-emerald-800/80' },
  { stage: 'General Note', label: 'General Note', color: 'text-slate-400', bg: 'bg-slate-900', border: 'border-slate-800' },
];

export const getStageStyle = (stageStr?: string) => {
  const matched = STAGE_OPTIONS.find((s) => s.stage.toLowerCase() === (stageStr || '').toLowerCase());
  if (matched) return matched;
  return { stage: 'General Note', label: stageStr || 'General Note', color: 'text-slate-300', bg: 'bg-slate-900', border: 'border-slate-800' };
};

export const RemarksSection: React.FC<RemarksSectionProps> = ({
  relatedEntity = 'GENERAL',
  relatedEntityId = '',
  relatedEntityName = '',
  defaultStage = 'General Note',
  title = 'Remarks & Stage Activity Notes',
  showFilters = false,
  compact = false,
  onRemarkAdded,
}) => {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [remarkText, setRemarkText] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>(defaultStage);
  const [selectedEntity, setSelectedEntity] = useState<RelatedEntityType>(relatedEntity);
  const [entityIdInput, setEntityIdInput] = useState(relatedEntityId);
  const [entityNameInput, setEntityNameInput] = useState(relatedEntityName);
  
  // Filter state for global timeline mode
  const [filterStage, setFilterStage] = useState<string>('ALL');
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const canAdd = hasPermission(user?.role, 'ADD_REMARKS') || !!user;

  const fetchRemarks = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getRemarks(
        showFilters ? (filterEntity === 'ALL' ? undefined : filterEntity) : relatedEntity,
        showFilters ? undefined : relatedEntityId,
        showFilters ? (filterStage === 'ALL' ? undefined : filterStage) : undefined
      );
      setRemarks(data);
    } catch (err) {
      console.error('Failed to load remarks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRemarks();
  }, [relatedEntity, relatedEntityId, filterStage, filterEntity]);

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkText.trim()) return;

    setIsSubmitting(true);
    try {
      const newRemarkData: Partial<Remark> = {
        remarkText: remarkText.trim(),
        addedBy: user?.name || 'Managing Partner',
        userRole: user?.title || user?.role || 'ROLE_PARTNER',
        dateTime: new Date().toISOString(),
        relatedEntity: showFilters ? selectedEntity : relatedEntity,
        relatedEntityId: showFilters ? entityIdInput || 'gen-0' : relatedEntityId || 'gen-0',
        relatedEntityName: showFilters ? entityNameInput || 'General Entity' : relatedEntityName || 'Entity',
        stage: selectedStage,
      };

      const created = await apiService.createRemark(newRemarkData);
      setRemarks((prev) => [created, ...prev]);
      setRemarkText('');
      if (onRemarkAdded) onRemarkAdded(created);
    } catch (err) {
      console.error('Error saving remark:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRemark = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this remark?')) return;
    try {
      await apiService.deleteRemark(id);
      setRemarks((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete remark:', err);
    }
  };

  const filteredRemarks = remarks.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = r.remarkText.toLowerCase().includes(q);
      const matchBy = r.addedBy.toLowerCase().includes(q);
      const matchEntity = (r.relatedEntityName || '').toLowerCase().includes(q);
      const matchStage = (r.stage || '').toLowerCase().includes(q);
      if (!matchText && !matchBy && !matchEntity && !matchStage) return false;
    }
    return true;
  });

  const formatDateTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className={`space-y-6 ${compact ? '' : 'p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Record and view activity remarks across key CRM workflow stages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 text-[11px] font-bold">
            {filteredRemarks.length} Remarks Logged
          </span>
        </div>
      </div>

      {/* Global Filters (if enabled) */}
      {showFilters && (
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-emerald-400" /> Filter Remarks Timeline
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">STAGE</label>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Stages</option>
                {STAGE_OPTIONS.map((s) => (
                  <option key={s.stage} value={s.stage}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">ENTITY TYPE</label>
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Entities</option>
                <option value="LEAD">Leads</option>
                <option value="MEETING">Meetings</option>
                <option value="PROPOSAL">Proposals</option>
                <option value="CLIENT">Clients</option>
                <option value="PROJECT">Projects</option>
                <option value="TASK">Tasks</option>
                <option value="INVOICE">Invoices</option>
                <option value="DOCUMENT">Documents</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">SEARCH</label>
              <input
                type="text"
                placeholder="Search remark text or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Remark Form */}
      {canAdd ? (
        <form onSubmit={handleAddRemark} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" /> Stage:
              </label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.stage} value={opt.stage}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {showFilters && (
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value as RelatedEntityType)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="LEAD">LEAD</option>
                  <option value="MEETING">MEETING</option>
                  <option value="PROPOSAL">PROPOSAL</option>
                  <option value="CLIENT">CLIENT</option>
                  <option value="PROJECT">PROJECT</option>
                  <option value="TASK">TASK</option>
                </select>
                <input
                  type="text"
                  placeholder="Entity Name"
                  value={entityNameInput}
                  onChange={(e) => setEntityNameInput(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white w-32 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Added by <strong className="text-slate-200">{user?.name || 'User'}</strong> ({user?.title || user?.role || 'Partner'})
              </span>
            </div>
          </div>

          <div>
            <textarea
              rows={3}
              required
              placeholder="Type remark or stage activity note here..."
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Timestamp will be recorded automatically
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !remarkText.trim()}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-950/50 flex items-center gap-2 disabled:opacity-50 transition-all"
            >
              <Plus className="w-4 h-4" /> Save Remark
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>You do not have permission to add new remarks under your current role.</span>
        </div>
      )}

      {/* Remarks Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-bold">Loading remarks stream...</div>
        ) : filteredRemarks.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-slate-400">No remarks logged yet</p>
            <p className="text-[11px] text-slate-500 mt-1">Be the first to record an activity note for this stage.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-800/80 ml-3.5 pl-5 space-y-4">
            {filteredRemarks.map((remark) => {
              const style = getStageStyle(remark.stage);
              return (
                <div key={remark.id} className="relative group animate-fade-in">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-slate-950 ${style.border} ${style.color}`} />

                  <div className="bg-slate-950/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 shadow-md transition-all space-y-2">
                    {/* Top Row: Stage Badge & Time */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${style.bg} ${style.color} ${style.border}`}>
                          {style.label}
                        </span>

                        {showFilters && remark.relatedEntityName && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400">
                            {remark.relatedEntity}: {remark.relatedEntityName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDateTime(remark.dateTime)}
                        </span>

                        <button
                          onClick={() => handleDeleteRemark(remark.id)}
                          title="Delete remark"
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Remark Body */}
                    <p className="text-xs text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                      {remark.remarkText}
                    </p>

                    {/* Metadata Footer */}
                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                          {remark.addedBy.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-300">{remark.addedBy}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 italic">{remark.userRole}</span>
                      </div>

                      {remark.relatedEntityId && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: #{remark.relatedEntityId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
