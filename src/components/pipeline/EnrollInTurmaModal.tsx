import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, MapPin, Calendar, User, Info, CheckCircle2 } from 'lucide-react';
import { useTurmaStore } from '../../store/useTurmaStore';
import { Lead } from '../../types/leads';
import { cn } from '../../lib/utils';

interface EnrollModalProps {
  lead: Lead;
  onConfirm: (turmaId: string) => void;
  onSkip: () => void;
}

export function EnrollInTurmaModal({ lead, onConfirm, onSkip }: EnrollModalProps) {
  const { turmas, fetchTurmas, subscribe } = useTurmaStore();

  useEffect(() => {
    fetchTurmas();
    const unsubscribe = subscribe();
    return () => unsubscribe();
  }, [fetchTurmas, subscribe]);

  const selectedTurma = useMemo(() => {
    return turmas.find(
      (t) => (t.product_name || '').toLowerCase() === (lead.product || '').toLowerCase() && t.status !== 'concluida' && t.status !== 'cancelada'
    );
  }, [turmas, lead.product]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="bg-emerald-600 p-6 text-white text-center relative overflow-hidden">
            {/* Abstract Background pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <GraduationCap size={150} className="absolute -bottom-10 -right-10 rotate-12" />
            </div>
            
            <div className="relative z-10 space-y-2">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                    <CheckCircle2 size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">Venda Sucesso!</h3>
                <p className="text-emerald-100 text-sm font-medium">Resumo da vinculação de turma</p>
            </div>
        </div>

        <div className="p-8 space-y-6">
          {selectedTurma ? (
            <div className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produto / Curso</label>
                    <p className="text-lg font-bold text-slate-800 leading-tight">{selectedTurma.product_name}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
                            <Calendar size={14} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Data de Início</p>
                            <p className="text-sm font-bold text-slate-700">
                                {selectedTurma.date ? new Date(selectedTurma.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'A definir'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
                            <MapPin size={14} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Localização</p>
                            <p className="text-sm font-bold text-slate-700">{selectedTurma.location || 'Não especificado'}</p>
                        </div>
                    </div>

                    {selectedTurma.professor_name && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
                                <User size={14} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Instrutor</p>
                                <p className="text-sm font-bold text-slate-700">{selectedTurma.professor_name}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                    <Info size={16} className="text-blue-500 shrink-0" />
                    <p className="text-[11px] text-blue-700 font-medium">O cliente {lead.name} será matriculado automaticamente nesta turma.</p>
                </div>

                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => selectedTurma ? onConfirm(selectedTurma.id) : onSkip()}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        OK, Finalizar
                    </button>
                </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <Info size={32} className="text-slate-300" />
                </div>
                <div className="space-y-1">
                    <h4 className="font-bold text-slate-800">Pronto!</h4>
                    <p className="text-xs text-slate-500 leading-relaxed px-4">
                        O lead foi movido para <strong>Ganho</strong> com sucesso.
                    </p>
                </div>
                <button 
                    onClick={onSkip}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all mt-4"
                >
                    OK, Entendido
                </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

