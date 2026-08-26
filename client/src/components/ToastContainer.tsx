import React from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotifications, ToastItem } from '../context/NotificationContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  const getToastStyles = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-slate-900 border-emerald-500/50 shadow-emerald-950/40',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
          title: 'text-emerald-300'
        };
      case 'warning':
        return {
          bg: 'bg-slate-900 border-amber-500/50 shadow-amber-950/40',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
          title: 'text-amber-300'
        };
      case 'error':
        return {
          bg: 'bg-slate-900 border-red-500/60 shadow-red-950/50',
          icon: <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
          title: 'text-red-300'
        };
      default:
        return {
          bg: 'bg-slate-900 border-sky-500/50 shadow-sky-950/40',
          icon: <Info className="w-5 h-5 text-sky-400 flex-shrink-0" />,
          title: 'text-sky-300'
        };
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const style = getToastStyles(toast.type);
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5 duration-200 ${style.bg}`}
          >
            {style.icon}
            <div className="flex-1 min-w-0">
              <h4 className={`text-xs font-bold ${style.title}`}>
                {toast.title}
              </h4>
              <p className="text-xs text-slate-300 leading-snug mt-0.5">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
