import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Loader2, Trash2, Mic, MicOff, X, Check } from 'lucide-react';
import { callService } from '../../../../services/callService';
import { noteService } from '../../../../services/noteService';
import { voiceTranscriptionService } from '../../../../services/voiceTranscriptionService';
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

  const [pendingType, setPendingType] = useState<'atendida' | 'nao_atendida' | null>(null);
  const [callNote, setCallNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTranscriptRef = useRef('');

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

  const openCallModal = (type: 'atendida' | 'nao_atendida') => {
    if (loggingType) return;
    setCallNote('');
    setVoiceError(null);
    setPendingType(type);
  };

  const closeCallModal = () => {
    if (isRecording) stopRecording();
    setPendingType(null);
    setCallNote('');
  };

  const startRecording = () => {
    setVoiceError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Reconhecimento de voz não disponível. Use o Chrome.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    finalTranscriptRef.current = '';
    const manualPrefix = callNote.trim();

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscriptRef.current += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      const voicePart = (finalTranscriptRef.current + interim).trim();
      setCallNote([manualPrefix, voicePart].filter(Boolean).join(' '));
    };

    rec.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      setVoiceError(`Erro no microfone: ${event.error}`);
      stopRecording();
    };

    rec.onend = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
      setIsRecording(false);

      const raw = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = '';
      if (!raw) return;

      setIsCorrecting(true);
      const corrected = await voiceTranscriptionService.correctText([manualPrefix, raw].filter(Boolean).join(' '));
      setCallNote(corrected);
      setIsCorrecting(false);
    };

    rec.start();
    recognitionRef.current = rec;
    setIsRecording(true);
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const confirmCallLog = async () => {
    if (!user?.id || !pendingType || loggingType) return;
    const type = pendingType;
    setLoggingType(type);
    try {
      const nextAttempt = total + 1;
      const icon = type === 'atendida' ? '✅' : '❌';
      const label = type === 'atendida' ? 'Atendida' : 'Não Atendida';

      const ok = await callService.logCall(user.id, leadId, type);
      if (!ok) return;

      const base = `${icon} Registro de Chamada: Tentativa nº ${nextAttempt} - ${label}`;
      const note = callNote.trim();

      await noteService.createNote({
        content: note ? `${base}\n\n${note}` : base,
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
      setPendingType(null);
      setCallNote('');
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
            onClick={() => openCallModal('atendida')}
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
            onClick={() => openCallModal('nao_atendida')}
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

      {pendingType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={closeCallModal}>
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cn(
              "flex items-center justify-between px-5 py-4 border-b",
              pendingType === 'atendida'
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900"
                : "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900"
            )}>
              <div className="flex items-center gap-2">
                {pendingType === 'atendida' ? <Phone size={16} className="text-emerald-600" /> : <PhoneOff size={16} className="text-red-500" />}
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Registrar {pendingType === 'atendida' ? 'Chamada Atendida' : 'Chamada Não Atendida'}
                </h3>
              </div>
              <button onClick={closeCallModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nota da ligação (opcional)</label>
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isCorrecting}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    <Mic size={12} />
                    Gravar Voz
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-all text-[10px] font-bold uppercase tracking-wider"
                  >
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    {formatTime(recordingSeconds)}
                    <span className="ml-0.5">· Parar</span>
                  </button>
                )}
              </div>

              {voiceError && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <MicOff size={12} /> {voiceError}
                </p>
              )}

              <textarea
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                placeholder={isRecording ? 'Fale agora... o texto aparece aqui em tempo real' : 'O que foi conversado na ligação?'}
                disabled={isCorrecting}
                className={cn(
                  'w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm min-h-[100px] resize-none shadow-sm',
                  isRecording && 'border-red-300 bg-red-50/20 dark:border-red-900',
                  isCorrecting && 'border-emerald-300 bg-emerald-50/20 opacity-70'
                )}
              />
              {isCorrecting && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  <Loader2 size={12} className="animate-spin" />
                  Corrigindo com IA...
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={closeCallModal}
                disabled={!!loggingType}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCallLog}
                disabled={!!loggingType || isRecording || isCorrecting}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50",
                  pendingType === 'atendida' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                )}
              >
                {loggingType ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Confirmar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
