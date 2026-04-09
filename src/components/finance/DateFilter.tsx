import { Filter, Loader2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useState } from 'react';

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  isLoading: boolean;
}

export function DateFilter({ startDate, endDate, onStartDateChange, onEndDateChange, isLoading }: DateFilterProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Filtrar Período:</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-slate-400 uppercase">De:</label>
        <input 
          type="date" 
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-slate-400 uppercase">Até:</label>
        <input 
          type="date" 
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
      </div>
      {(startDate || endDate) && (
        <button 
          onClick={() => { onStartDateChange(''); onEndDateChange(''); }}
          className="text-xs font-bold text-red-500 hover:text-red-600 uppercase underline decoration-2 underline-offset-4"
        >
          Limpar Filtros
        </button>
      )}
      {isLoading && <Loader2 className="w-5 h-5 text-emerald-600 animate-spin ml-auto" />}
    </div>
  );
}
