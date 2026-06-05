import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Loader2, Trash2 } from 'lucide-react';
import { callService } from '../../../../services/callService';
import { noteService } from '../../../../services/noteService';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useProfileStore } from '../../../../store/useProfileStore';
import { cn } from '../../../../lib/utils';

interface LeadCallSectionProps {
  leadId: string;
  isCallInProgress?: boolean;
  setIsCallInProgress?: (v: boolean) => void;
  onNaoAtendida?: () => void;
}

export const LeadCallSection: React.FC<LeadCallSectionProps> = ({ leadId, isCallInProgress, setIsCallInProgress, onNaoAtendida }) => {
  const { user } = useAuthStore();
  const { profiles } = useProfileStore();
  const [atendidas, setAtendidas] = useState(0);
  const [naoAtendidas, setNaoAtendidas] = useState(0);
  const [loggingType, setLoggingType] = useState<'atendida' | 'nao_atendida' | 'remove_atendida' | 'remove_nao_atendida' | null>(null);

  useEffect(() => {
    const fetchCounts = () => {
      callService.getLeadCountByType(leadId, 'atendida').then(setAtendidas);
      callService.getLeadCountByType(leadId, 'nao_atendida').then(setNaoAtendidas);
    };
    fetchCounts();
    window.addEventListener('refresh-lead-calls', fetchCounts);
    return () => {
      window.removeEventListener('refresh-lead-calls', fetchCounts);
    };
  }, [leadId]);

  const authorName = profiles.find(p => p.id === user?.id)?.name || user?.email || 'Usuário';
  const total = atendidas + naoAtendidas;

  const refreshNotes = () => {
    window.dispatchEvent(new CustomEvent('refresh-lead-notes', { detail: { leadId } }));
  };

  const handleAdd = async (type: 'atendida' | 'nao_atendida') => {
    if (!user?.id || loggingType) return;
    setLoggingType(type);
    try {
      const nextAttempt = total + 1;
      const icon = type === 'atendida' ? '✅' : '❌';
      const label = type === 'atendida' ? 'Atendida' : 'Não Atendida';
      
      const ok = await callService.logCall(user.id, leadId, type);
      if (!ok) return;

      await noteService.createNote({
        content: `${icon} Registro de Chamada: Tentativa nº ${nextAttempt} - ${label}`,
        lead_id: leadId,
        author_id: user.id,
        author_name: authorName,
      });

      if (type === 'atendida') setAtendidas(v => v + 1);
      else {
        setNaoAtendidas(v => v + 1);
        onNaoAtendida?.();
      }

      setIsCallInProgress?.(false);
      refreshNotes();
    } finally {
      setLoggingType(null);
    }
  };

  const handleRemove = async (type: 'atendida' | 'nao_atendida') => {
    if (loggingType) return;
    const current = type === 'atendida' ? atendidas : naoAtendidas;
    if (current <= 0) return;

    if (!confirm(`Tem certeza que deseja apagar o último registro de ligação "${type === 'atendida' ? 'Atendida' : 'Não Atendida'}"?`)) return;

    // Optimistic update immediately
    if (type === 'atendida') setAtendidas(v => Math.max(0, v - 1));
    else setNaoAtendidas(v => Math.max(0, v - 1));

    setLoggingType(type === 'atendida' ? 'remove_atendida' : 'remove_nao_atendida');
    try {
      const [callOk] = await Promise.all([
        callService.removeLastCallByType(leadId, type),
        noteService.deleteLastCallNote(leadId, type),
      ]);

      if (!callOk) {
        // Revert if call_log deletion failed
        if (type === 'atendida') setAtendidas(v => v + 1);
        else setNaoAtendidas(v => v + 1);
        alert('Não foi possível apagar no banco de dados. Verifique se você aplicou as regras de permissão (SQL) no Supabase.');
      } else {
        refreshNotes();
      }
    } finally {
      setLoggingType(null);
    }
  };

  const isLoading = (key: typeof loggingType) => loggingType === key;

  return (
    <div className="flex flex-row sm:flex-col items-center gap-4 sm:gap-2.5 shrink-0 w-full sm:w-auto justify-center">
      <div className="flex flex-col items-center shrink-0">
        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tentativas</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700">
          <Phone size={10} className="text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-black text-slate-700 dark:text-slate-300 tabular-nums">{total}</span>
        </div>
      </div>

      <div className="flex gap-2.5">
        {/* Atendida */}
        <div className="relative group">
          <button
            onClick={() => handleAdd('atendida')}
            disabled={!!loggingType}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 transition-all shadow-sm",
              "bg-emerald-50/50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 hover:scale-105 active:scale-95",
              loggingType && "opacity-50 cursor-not-allowed",
              isCallInProgress && "animate-pulse border-emerald-400 ring-4 ring-emerald-500/25 shadow-md shadow-emerald-100"
            )}
          >
            {isLoading('atendida') ? (
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            ) : (
              <Phone className="w-5 h-5 sm:w-[26px] sm:h-[26px] stroke-[2.5]" />
            )}
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{atendidas} Atend.</span>
          </button>
          
          {atendidas > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRemove('atendida'); }}
              disabled={!!loggingType}
              className="absolute -top-1.5 -left-1.5 w-6 h-6 bg-white dark:bg-slate-900 border-2 border-red-100 text-red-400 hover:text-red-600 hover:border-red-200 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-90"
              title="Apagar último registro"
            >
              {isLoading('remove_atendida') ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={11} />}
            </button>
          )}
        </div>

        {/* Não Atendida */}
        <div className="relative group">
          <button
            onClick={() => handleAdd('nao_atendida')}
            disabled={!!loggingType}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 transition-all shadow-sm",
              "bg-red-50/50 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300 hover:scale-105 active:scale-95",
              loggingType && "opacity-50 cursor-not-allowed",
              isCallInProgress && "animate-pulse border-red-400 ring-4 ring-red-500/25 shadow-md shadow-red-100"
            )}
          >
            {isLoading('nao_atendida') ? (
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            ) : (
              <PhoneOff className="w-5 h-5 sm:w-[26px] sm:h-[26px] stroke-[2.5]" />
            )}
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{naoAtendidas} N/Atend.</span>
          </button>

          {naoAtendidas > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRemove('nao_atendida'); }}
              disabled={!!loggingType}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-white dark:bg-slate-900 border-2 border-red-100 text-red-400 hover:text-red-600 hover:border-red-200 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-90"
              title="Apagar último registro"
            >
              {isLoading('remove_nao_atendida') ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={11} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
