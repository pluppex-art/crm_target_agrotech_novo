import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { InactivityAlert } from '../../services/alertService';
import { cn } from '../../lib/utils';

interface AlertBannerProps {
  alerts: InactivityAlert[];
  onDismiss: (leadId: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map(({ lead, hoursElapsed, type }) => (
        <motion.div
          key={`alert-${lead.id}-${type}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-sm",
            hoursElapsed >= 18
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          )}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">
            <strong>{lead.name}</strong> está sem contato há <strong>{hoursElapsed}h</strong>.
            Responsável: {lead.responsible || 'Não definido'} · {lead.phone}
          </span>
          <button onClick={() => onDismiss(lead.id)} className="p-1 hover:bg-white/50 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

