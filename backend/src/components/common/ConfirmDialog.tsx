import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      bg: 'bg-rose-950/40 border-rose-800/80',
      icon: 'text-rose-400 bg-rose-900/30 border-rose-800/50',
      button: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50',
    },
    warning: {
      bg: 'bg-amber-950/40 border-amber-800/80',
      icon: 'text-amber-400 bg-amber-900/30 border-amber-800/50',
      button: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50',
    },
    info: {
      bg: 'bg-emerald-950/40 border-emerald-800/80',
      icon: 'text-emerald-400 bg-emerald-900/30 border-emerald-800/50',
      button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50',
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className={`w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative ${variantStyles.bg}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${variantStyles.icon}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all ${variantStyles.button}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
