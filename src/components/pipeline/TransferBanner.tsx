import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { Lead } from '../../types/leads';
import { cn } from '../../lib/utils';

interface TransferBannerProps {
  leads: Lead[];
  allLeads: Lead[];
  onTransfer: (leadId: string, newResponsible: string) => void;
  onDismiss: (leadId: string) => void;
}


export function TransferBanner({ leads, allLeads, onTransfer, onDismiss }: TransferBannerProps) {
  if (leads.length === 0) return null;
  const responsibles = Array.from(new Set(allLeads.map((l) => l.responsible).filter(Boolean))) as string[];

  return (
    <div className="space-y-2">
      {leads.map((lead) => {
        const others = responsibles.filter((r) => r !== lead.responsible);
        return (
          <motion.div
            key={`transfer-${lead.id}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm font-medium shadow-sm"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">
              <strong>{lead.name}</strong> está sem contato há mais de 48h. Transferir para:
            </span>
            <select
              onChange={(e) => { if (e.target.value) onTransfer(lead.id, e.target.value); }}
              className="text-xs border border-red-200 rounded-lg px-2 py-1 bg-white text-red-700 cursor-pointer"
              defaultValue=""
            >
              <option value="">Selecionar...</option>
              {others.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value="__dismiss__">Dispensar aviso</option>
            </select>
            <button onClick={() => onDismiss(lead.id)} className="p-1 hover:bg-white/50 rounded-lg transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

