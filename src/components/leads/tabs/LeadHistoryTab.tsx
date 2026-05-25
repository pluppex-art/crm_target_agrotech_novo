import React from 'react';
import { Calendar } from 'lucide-react';

interface LeadHistoryTabProps {
  lead: any;
}

export const LeadHistoryTab: React.FC<LeadHistoryTabProps> = ({ lead: _ }) => {
  return (
    <div className="p-8">
      <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Sem histórico disponível.</p>
      </div>
    </div>
  );
};

