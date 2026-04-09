import { cn } from '../../lib/utils';
import { LayoutList, Calendar as CalendarIcon } from 'lucide-react';

interface ViewToggleProps {
  viewMode: 'list' | 'calendar';
  onViewChange: (mode: 'list' | 'calendar') => void;
}

export function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-1 sm:flex-none">
      <button 
        onClick={() => onViewChange('list')}
        className={cn(
          "flex-1 sm:flex-none p-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all",
          viewMode === 'list' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
        )}
      >
        <LayoutList className="w-4 h-4" />
        <span className="hidden sm:inline">Lista</span>
      </button>
      <button 
        onClick={() => onViewChange('calendar')}
        className={cn(
          "flex-1 sm:flex-none p-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all",
          viewMode === 'calendar' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
        )}
      >
        <CalendarIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Calendário</span>
      </button>
    </div>
  );
}
