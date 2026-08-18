import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const style = {
          success: {
            bg: 'bg-emerald-950/90 border-emerald-800 text-emerald-200',
            icon: CheckCircle2,
            iconColor: 'text-emerald-400',
          },
          error: {
            bg: 'bg-rose-950/90 border-rose-800 text-rose-200',
            icon: AlertCircle,
            iconColor: 'text-rose-400',
          },
          info: {
            bg: 'bg-slate-900/90 border-slate-800 text-slate-200',
            icon: Info,
            iconColor: 'text-blue-400',
          },
        }[toast.type];

        const Icon = style.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 animate-slide-up transition-all ${style.bg}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">{toast.title}</h4>
                {toast.message && <p className="text-[11px] opacity-80 mt-0.5">{toast.message}</p>}
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
