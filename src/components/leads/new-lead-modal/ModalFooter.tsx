import React from 'react';
import { Loader2, Save } from 'lucide-react';

interface ModalFooterProps {
  onClose: () => void;
  loading: boolean;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ onClose, loading }) => {
  return (
    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900 sticky bottom-0 z-10">
      <button
        type="button"
        onClick={onClose}
        className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/50 rounded-xl transition-colors"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="new-lead-form"
        disabled={loading}
        className="px-8 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        Salvar Cadastro
      </button>
    </div>
  );
};
