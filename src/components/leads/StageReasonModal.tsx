import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Snowflake, ThumbsDown } from 'lucide-react';
import { STAGE_REASONS, REASON_EMOJIS, StageReason } from '../../services/stageReasonService';
import { cn } from '../../lib/utils';

interface StageReasonModalProps {
  stageName: string;
  leadName: string;
  onConfirm: (reason: StageReason, notes: string) => void;
  onCancel: () => void;
}

export const StageReasonModal: React.FC<StageReasonModalProps> = ({
  stageName,
  leadName,
  onConfirm,
  onCancel,
}) => {
  const [selected, setSelected] = useState<StageReason | null>(null);
  const [notes, setNotes] = useState('');

  const normalized = stageName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const isPerdido = normalized.includes('perdido');

  const accent = isPerdido
    ? { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-500', badge: 'text-red-600 dark:text-red-400', btn: 'bg-red-500 hover:bg-red-600', activeBorder: 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300' }
    : { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-500', badge: 'text-blue-600 dark:text-blue-400', btn: 'bg-blue-500 hover:bg-blue-600', activeBorder: 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300' };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[4px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl w-full max-w-md border border-slate-100 dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between px-6 py-4', accent.bg)}>
          <div className="flex items-center gap-3">
            {isPerdido
              ? <ThumbsDown className={accent.icon} size={20} />
              : <Snowflake className={accent.icon} size={20} />
            }
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Movendo para{' '}
                <span className={accent.badge}>{stageName}</span>
              </p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                {leadName}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Reason grid */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Qual o motivo? <span className="text-red-400">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {STAGE_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelected(reason)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all',
                    selected === reason
                      ? accent.activeBorder
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  )}
                >
                  <span className="text-lg shrink-0 leading-none">{REASON_EMOJIS[reason]}</span>
                  <span className="text-[12px] font-semibold leading-tight">{reason}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Observação <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhe o que aconteceu nesse contato..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <p className="text-[10px] text-slate-400 font-semibold">
            Registro obrigatório para métricas
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => selected && onConfirm(selected, notes)}
              disabled={!selected}
              className={cn(
                'px-5 py-2 text-sm font-bold rounded-xl text-white transition-all shadow-sm',
                accent.btn,
                !selected && 'opacity-40 cursor-not-allowed',
              )}
            >
              Confirmar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
