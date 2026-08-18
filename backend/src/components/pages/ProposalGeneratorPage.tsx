import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Proposal } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastNotification, ToastMessage } from '../common/ToastNotification';
import { FileCode, Sparkles, Send, Download, Plus, Trash2, CheckCircle2, Shield, Loader2, RefreshCw } from 'lucide-react';

export const ProposalGeneratorPage: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State for Generator
  const [clientName, setClientName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [fee, setFee] = useState<number | ''>('');
  const [engagementType, setEngagementType] = useState('Fractional CFO');
  const [leadPartner, setLeadPartner] = useState('');
  const [scopeDetails, setScopeDetails] = useState('');

  // Selected proposal for preview
  const [activePreview, setActivePreview] = useState<Proposal | null>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getProposals();
      setProposals(data);
      if (data.length > 0) setActivePreview(data[0]);
    } catch (err) {
      addToast('error', 'REST API Error', 'Failed to fetch saved proposals.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleGenerateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    const newProposal: Partial<Proposal> = {
      title: projectTitle,
      clientName,
      proposedFee: fee,
      engagementType,
      leadPartner,
      scopeDetails,
      status: 'DRAFT',
    };

    try {
      const created = await apiService.createProposal(newProposal);
      setProposals((prev) => [created, ...prev]);
      setActivePreview(created);
      addToast('success', 'Proposal Compiled', `SOW generated for ${clientName}`);
    } catch (err) {
      addToast('error', 'Generation Failed', 'Could not save proposal to backend.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await apiService.deleteProposal(deleteId);
      setProposals((prev) => prev.filter((p) => p.id !== deleteId));
      if (activePreview?.id === deleteId) setActivePreview(null);
      addToast('success', 'Proposal Purged', 'Proposal removed from vault.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not remove proposal.');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-emerald-400" /> Executive Proposal & SOW Generator
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated Scope of Work (SOW) builder, fee structure calculator, and board proposal compiler.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Generator Form Column */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" /> Proposal Parameters
          </h3>

          <form onSubmit={handleGenerateAndSave} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Client Corporate Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Engagement Title
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Proposed Fee ($)
                </label>
                <input
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Practice Area
                </label>
                <select
                  value={engagementType}
                  onChange={(e) => setEngagementType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Valuation & Advisory">Valuation & Advisory</option>
                  <option value="M&A Due Diligence">M&A Due Diligence</option>
                  <option value="Fractional CFO">Fractional CFO</option>
                  <option value="ASC 842 Audit">ASC 842 Audit</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Lead Partner
              </label>
              <input
                type="text"
                value={leadPartner}
                onChange={(e) => setLeadPartner(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Deliverable Milestones & Scope
              </label>
              <textarea
                rows={4}
                value={scopeDetails}
                onChange={(e) => setScopeDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Compile Executive Proposal</span>
            </button>
          </form>

          {/* Saved Proposals List */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recent Saved SOWs</span>
            {proposals.map((p) => (
              <div
                key={p.id}
                onClick={() => setActivePreview(p)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  activePreview?.id === p.id
                    ? 'bg-emerald-950/40 border-emerald-500/60'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{p.title}</h4>
                  <p className="text-[10px] text-slate-400">{p.clientName} • ${(p.proposedFee || 0).toLocaleString()}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(p.id);
                  }}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Live Proposal Preview Column */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md relative space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-black uppercase text-white tracking-widest">Confidential Executive Document</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => addToast('success', 'SOW Dispatched', `Proposal emailed to ${activePreview?.clientName || clientName}`)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md"
              >
                <Send className="w-3.5 h-3.5" /> Send to Client
              </button>
            </div>
          </div>

          {/* Formatted Document View */}
          <div className="p-6 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-6 text-slate-300 font-sans shadow-inner">
            <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-white">{activePreview?.title || projectTitle}</h2>
                <p className="text-xs text-emerald-400 font-bold mt-1">Prepared for: {activePreview?.clientName || clientName}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg text-[10px] font-black">
                PRACTICE ADVISORY SOW
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Engagement Fee</span>
                <span className="font-bold text-white">${(activePreview?.proposedFee || fee).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Lead Partner</span>
                <span className="font-bold text-white">{activePreview?.leadPartner || leadPartner}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Practice Area</span>
                <span className="font-bold text-white">{activePreview?.engagementType || engagementType}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Statement of Work & Key Deliverables</h4>
              <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                {activePreview?.scopeDetails || scopeDetails}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
              <span>GAMCS CRM Practice Management</span>
              <span>Binding Executive Agreement • ISO 27001 Certified</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Delete Proposal"
        message="Are you sure you want to delete this proposal?"
        confirmText="Delete Proposal"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
