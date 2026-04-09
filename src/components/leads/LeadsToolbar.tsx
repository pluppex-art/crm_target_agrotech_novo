import { Plus, Download, Loader2 } from 'lucide-react';

interface LeadsToolbarProps {
  isLoading: boolean;
  onModalOpen: () => void;
}

export function LeadsToolbar({ isLoading, onModalOpen }: LeadsToolbarProps) {
  return (
    <div className="flex items-center gap-3 w-full sm:w-auto">
      {isLoading && <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />}
      <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium hover:bg-slate-50 transition-all">
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Exportar</span>
      </button>
      <button 
        onClick={onModalOpen}
        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap"
      >
        <Plus className="w-4 h-4" />
        Novo Lead
      </button>
    </div>
  );
}
