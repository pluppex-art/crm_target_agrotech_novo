import React from 'react';

interface LossReasonSectionProps {
  isPerdidoStage: boolean;
  motivo_perda: string;
  onChange: (value: string) => void;
}

export const LossReasonSection: React.FC<LossReasonSectionProps> = ({ isPerdidoStage, motivo_perda, onChange }) => {
  if (!isPerdidoStage) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivo da Perda</label>
      <textarea
        value={motivo_perda}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-medium shadow-sm"
        placeholder="Descreva o motivo da perda..."
        rows={2}
      ></textarea>
    </div>
  );
};
