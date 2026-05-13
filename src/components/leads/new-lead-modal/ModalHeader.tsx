import React from 'react';
import { X } from 'lucide-react';

interface ModalHeaderProps {
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ onClose }) => {
  return (
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Novo Cadastro</h2>
        <p className="text-xs text-slate-400 font-medium">Preencha os dados básicos para iniciar o atendimento.</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
      >
        <X size={20} />
      </button>
    </div>
  );
};
