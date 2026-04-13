import React from 'react';
import { Calendar } from 'lucide-react';

interface LeadHistoryTabProps {
  lead: any;
}

export const LeadHistoryTab: React.FC<LeadHistoryTabProps> = ({ lead }) => {
  return (
    <div className="p-8 space-y-4">
      {lead.history && lead.history.length > 0 ? (
        lead.history.map((item: any) => (
          <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 shadow-sm">
            <div className="flex flex-col items-center gap-2 min-w-[80px]">
              <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Calendar size={10} />
                {item.date}
              </div>
              <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                {item.time}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-700 leading-relaxed font-medium">{item.description}</p>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Sem histórico disponível.</p>
        </div>
      )}
    </div>
  );
};

