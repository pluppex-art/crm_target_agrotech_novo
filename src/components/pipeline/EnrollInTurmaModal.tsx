import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { GraduationCap } from 'lucide-react';
import { useTurmaStore } from '../../store/useTurmaStore';
import { Lead } from '../../types/leads';
import { cn, getLeadEffectiveValue } from '../../lib/utils';

interface EnrollModalProps {
  lead: Lead;
  onConfirm: (turmaId: string) => void;
  onSkip: () => void;
}

export function EnrollInTurmaModal({ lead, onConfirm, onSkip }: EnrollModalProps) {
  const { turmas, fetchTurmas } = useTurmaStore();

  useEffect(() => { fetchTurmas(); }, [fetchTurmas]);

  const matchingTurmas = turmas.filter(
    (t) => t.product.toLowerCase() === lead.product.toLowerCase() && t.status !== 'concluida' && t.status !== 'cancelada'
  );
  const otherTurmas = turmas.filter(
    (t) => !matchingTurmas.some((m) => m.id === t.id) && t.status !== 'concluida' && t.status !== 'cancelada'
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <GraduationCap size={20} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Matricular em Turma</h3>
            <p className="text-xs text-slate-500">{lead.name} foi fechado — selecione a turma</p>
          </div>
        </div>

        {matchingTurmas.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
              Turmas com o produto "{lead.product}"
            </p>
            <div className="space-y-2">
              {matchingTurmas.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onConfirm(t.id)}
                  className="w-full text-left px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.date ? new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'} · {t.location || 'Sem local'}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {otherTurmas.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Outras turmas</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {otherTurmas.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onConfirm(t.id)}
                  className="w-full text-left px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <p className="font-bold text-slate-700 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.product} · {t.date ? new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {matchingTurmas.length === 0 && otherTurmas.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">Nenhuma turma ativa disponível.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onSkip} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            Pular
          </button>
        </div>
      </motion.div>
    </div>
  );
}

