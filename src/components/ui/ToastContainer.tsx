import { AnimatePresence, motion } from 'framer-motion';
import { X, Bell, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToastStore, ToastType } from '../../store/useToastStore';
import { cn } from '../../lib/utils';

const typeConfig: Record<ToastType, { icon: React.ElementType; bg: string; border: string; iconColor: string }> = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-700', iconColor: 'text-emerald-600' },
  info:    { icon: Bell,         bg: 'bg-blue-50 dark:bg-blue-900/30',    border: 'border-blue-200 dark:border-blue-700',    iconColor: 'text-blue-600'    },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-700', iconColor: 'text-amber-600'  },
  urgent:  { icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-900/30',     border: 'border-red-200 dark:border-red-700',     iconColor: 'text-red-600'    },
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((toast) => {
          const { icon: Icon, bg, border, iconColor } = typeConfig[toast.type] ?? typeConfig.info;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg',
                bg, border
              )}
            >
              <Icon size={18} className={cn('mt-0.5 flex-shrink-0', iconColor)} />
              <div
                className={cn('flex-1 min-w-0', toast.link && 'cursor-pointer')}
                onClick={() => {
                  if (toast.link) { navigate(toast.link); dismiss(toast.id); }
                }}
              >
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{toast.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{toast.message}</p>
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
