import { useState, useEffect } from 'react';
import { Play, Coffee, ArrowRight, Square } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTimeClockStore } from '../../store/useTimeClockStore';

export function TimeClockHeaderWidget() {
  const [time, setTime] = useState(new Date());
  const { status, setStatus } = useTimeClockStore();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePunch = () => {
    if (status === 'off') setStatus('working');
    else if (status === 'working') setStatus('break');
    else if (status === 'break') setStatus('returned');
    else if (status === 'returned') setStatus('off');
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'working': 
        return { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Coffee, label: 'Trabalhando', btnColor: 'bg-amber-500', nextAction: 'Sair p/ Intervalo' };
      case 'break': 
        return { color: 'text-amber-600', bg: 'bg-amber-50', icon: ArrowRight, label: 'Em Intervalo', btnColor: 'bg-indigo-600', nextAction: 'Retornar' };
      case 'returned': 
        return { color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Square, label: 'Pós-Intervalo', btnColor: 'bg-red-500', nextAction: 'Bater Saída' };
      default: 
        return { color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/50', icon: Play, label: 'Fora', btnColor: 'bg-emerald-600', nextAction: 'Bater Entrada' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm group hover:border-emerald-200 transition-all">
      <div className="flex flex-col items-end leading-none pr-2 border-r border-slate-200 dark:border-slate-700">
        <span className="text-[13px] font-black text-slate-800 dark:text-slate-200 tabular-nums">
          {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className={cn("text-[9px] font-bold uppercase tracking-wider mt-0.5", config.color)}>
          {config.label}
        </span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <button 
          onClick={handlePunch}
          className={cn(
            "p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 shadow-md text-white",
            config.btnColor
          )}
          title={config.nextAction}
        >
          <config.icon size={14} />
        </button>
      </div>
    </div>
  );
}
