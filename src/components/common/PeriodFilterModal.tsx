import { CalendarRange, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

interface PeriodFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (startDate: string, endDate: string) => void;
  currentStartDate: string;
  currentEndDate: string;
}

const getISODate = (date: Date) => date.toISOString().split('T')[0];

export function PeriodFilterModal({ 
  isOpen, 
  onClose, 
  onApply, 
  currentStartDate, 
  currentEndDate 
}: PeriodFilterModalProps) {
  const [tempStart, setTempStart] = useState(currentStartDate);
  const [tempEnd, setTempEnd] = useState(currentEndDate);

  if (!isOpen) return null;

  const setShortcut = (type: string) => {
    const now = new Date();
    let s = new Date();
    let e = new Date();

    switch (type) {
      case 'today':
        break;
      case 'yesterday':
        s.setDate(s.getDate() - 1);
        e.setDate(e.getDate() - 1);
        break;
      case '7days':
        s.setDate(s.getDate() - 7);
        break;
      case '30days':
        s.setDate(s.getDate() - 30);
        break;
      case 'thisMonth':
        s = new Date(now.getFullYear(), now.getMonth(), 1);
        e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        e = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        s = new Date(now.getFullYear(), 0, 1);
        e = new Date(now.getFullYear(), 11, 31);
        break;
    }

    setTempStart(getISODate(s));
    setTempEnd(getISODate(e));
  };

  const handleMonthChange = (month: number) => {
    const current = new Date(tempStart + 'T12:00:00');
    const s = new Date(current.getFullYear(), month, 1);
    const e = new Date(current.getFullYear(), month + 1, 0);
    setTempStart(getISODate(s));
    setTempEnd(getISODate(e));
  };

  const handleYearChange = (year: number) => {
    const current = new Date(tempStart + 'T12:00:00');
    const s = new Date(year, current.getMonth(), 1);
    const e = new Date(year, current.getMonth() + 1, 0);
    setTempStart(getISODate(s));
    setTempEnd(getISODate(e));
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-300" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2rem] shadow-2xl w-[480px] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CalendarRange className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Filtrar Período</h3>
          </div>
          <p className="text-xs text-slate-400 font-medium">Selecione o intervalo de datas para os relatórios.</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Shortcuts */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 italic">Selecione um atalho</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'yesterday', label: 'Ontem' },
                { id: '7days', label: 'Últimos 7 dias' },
                { id: '30days', label: 'Últimos 30 dias' },
                { id: 'thisMonth', label: 'Este Mês' },
                { id: 'lastMonth', label: 'Mês Passado' },
                { id: 'thisYear', label: 'Este Ano' },
              ].map((shortcut) => (
                <button
                  key={shortcut.id}
                  onClick={() => setShortcut(shortcut.id)}
                  className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-tighter text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-all"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month/Year Selection */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 italic">Selecionar Mês/Ano</label>
            <div className="flex gap-4">
              <div className="flex-1">
                <select
                  value={new Date(tempStart + 'T12:00:00').getMonth()}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all appearance-none"
                >
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <select
                  value={new Date(tempStart + 'T12:00:00').getFullYear()}
                  onChange={(e) => handleYearChange(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all appearance-none text-center"
                >
                  {[2023, 2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Custom Range */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 italic">Intervalo Personalizado</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-2 text-[8px] font-black text-slate-300 uppercase">De</span>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full px-4 pt-5 pb-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="flex-1 relative">
                <span className="absolute left-4 top-2 text-[8px] font-black text-slate-300 uppercase">Até</span>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full px-4 pt-5 pb-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-all"
          >
            CANCELAR
          </button>
          <button
            onClick={() => onApply(tempStart, tempEnd)}
            className="flex-[1.5] px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Aplicar Filtro
          </button>
        </div>
      </div>
    </div>
  );
}
