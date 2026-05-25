import React from 'react';
import { Trash2, Loader2, Save } from 'lucide-react';

interface ActionButtonsProps {
  onDelete?: () => void | Promise<void>;
  onCancel: React.MouseEventHandler<HTMLButtonElement>;
  handleSave: React.MouseEventHandler<HTMLButtonElement>;
  isSaving: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onDelete,
  onCancel,
  handleSave,
  isSaving
}) => {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
      <button
        onClick={onDelete}
        className="p-2.5 bg-white dark:bg-slate-900 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 flex items-center justify-center shrink-0"
        title="Excluir Lead"
      >
        <Trash2 size={20} />
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 rounded-2xl transition-all shadow-sm"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 justify-center disabled:opacity-50"
        >
          {isSaving ? (
            <span key="saving" className="flex items-center gap-2">
              <Loader2 size={15} className="animate-spin" />
              Salvando...
            </span>
          ) : (
            <span key="save" className="flex items-center gap-2">
              <Save size={15} />
              Salvar Alterações
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
