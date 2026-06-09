import React, { useState, useRef } from 'react';
import { Plus, Trash2, Loader2, MessageSquare, Mic, MicOff, CalendarPlus, X, Clock, Phone } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { voiceTranscriptionService, DetectedTask } from '../../../services/voiceTranscriptionService';
import { LiveCallTranscriber } from '../LiveCallTranscriber';

interface LeadNotesTabProps {
  notes: any[];
  newNote: string;
  loadingNotes: boolean;
  leadName?: string;
  setNewNote: (note: string) => void;
  handleAddNote: () => Promise<void>;
  handleDeleteNote: (noteId: string) => Promise<void>;
  onVoiceTaskDetected?: (task: DetectedTask) => void;
}

type RecordingState = 'idle' | 'recording' | 'correcting';

export const LeadNotesTab: React.FC<LeadNotesTabProps> = ({
  notes,
  newNote,
  loadingNotes,
  leadName,
  setNewNote,
  handleAddNote,
  handleDeleteNote,
  onVoiceTaskDetected,
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [detectedTask, setDetectedTask] = useState<DetectedTask | null>(null);
  const [showLiveCall, setShowLiveCall] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTranscriptRef = useRef('');
  const lastDisplayedRef = useRef('');
  const manualPrefixRef = useRef('');

  const startRecording = () => {
    setVoiceError(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Reconhecimento de voz não disponível. Use o Chrome.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    manualPrefixRef.current = newNote.trim();
    finalTranscriptRef.current = '';
    lastDisplayedRef.current = '';

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const voicePart = (finalTranscriptRef.current + interim).trim();
      const display = [manualPrefixRef.current, voicePart].filter(Boolean).join(' ');
      lastDisplayedRef.current = display;
      setNewNote(display);
    };

    rec.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      setVoiceError(`Erro no microfone: ${event.error}`);
      stopRecording();
    };

    rec.onend = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);

      const raw = lastDisplayedRef.current || finalTranscriptRef.current.trim() || manualPrefixRef.current;
      if (!raw) {
        setRecordingState('idle');
        return;
      }

      setRecordingState('correcting');
      const [corrected, task] = await Promise.all([
        voiceTranscriptionService.correctText(raw),
        voiceTranscriptionService.detectTaskIntent(raw, leadName),
      ]);
      setNewNote(corrected);
      if (task) setDetectedTask(task);
      lastDisplayedRef.current = '';
      finalTranscriptRef.current = '';
      manualPrefixRef.current = '';
      setRecordingState('idle');
    };

    rec.start();
    recognitionRef.current = rec;
    setRecordingState('recording');
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nova Nota</label>

          {recordingState === 'idle' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowLiveCall((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all',
                  showLiveCall
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600'
                )}
              >
                <Phone size={12} />
                Chamada ao Vivo
              </button>
              <button
                onClick={startRecording}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-all text-[10px] font-bold uppercase tracking-wider"
              >
                <Mic size={12} />
                Gravar Voz
              </button>
            </div>
          )}

          {recordingState === 'recording' && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              {formatTime(recordingSeconds)}
              <span className="ml-0.5">· Parar</span>
            </button>
          )}

          {recordingState === 'correcting' && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              <Loader2 size={12} className="animate-spin" />
              Corrigindo com IA...
            </span>
          )}
        </div>

        {showLiveCall && (
          <LiveCallTranscriber
            leadName={leadName ?? ''}
            onTranscriptComplete={(text) => {
              setNewNote(text);
              setShowLiveCall(false);
            }}
            onClose={() => setShowLiveCall(false)}
          />
        )}

        {voiceError && (
          <p className="text-xs text-red-500 font-medium flex items-center gap-1">
            <MicOff size={12} /> {voiceError}
          </p>
        )}

        <div className="relative">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={
              recordingState === 'recording'
                ? 'Fale agora... o texto aparece aqui em tempo real'
                : recordingState === 'correcting'
                  ? 'Corrigindo texto com IA...'
                  : 'Adicione uma observação sobre este lead...'
            }
            disabled={recordingState === 'correcting'}
            className={cn(
              'w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm min-h-[100px] resize-none shadow-sm',
              recordingState === 'recording' && 'border-red-300 bg-red-50/20 dark:border-red-900',
              recordingState === 'correcting' && 'border-emerald-300 bg-emerald-50/20'
            )}
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim() || recordingState !== 'idle'}
            className="absolute bottom-3 right-3 p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {detectedTask && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
          <CalendarPlus className="text-amber-600 mt-0.5 flex-shrink-0" size={16} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5">Tarefa detectada na nota</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium truncate">{detectedTask.title}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
              <Clock size={11} />
              {new Date(detectedTask.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
              {detectedTask.scheduled_time && ` às ${detectedTask.scheduled_time}`}
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => { onVoiceTaskDetected?.(detectedTask); setDetectedTask(null); }}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Criar
            </button>
            <button
              onClick={() => setDetectedTask(null)}
              className="p-1 text-amber-500 hover:text-amber-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loadingNotes ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-emerald-600 w-6 h-6" />
          </div>
        ) : notes.length > 0 ? (
          notes.map((note: any) => {
            const noteDate = new Date(note.created_at);
            const dateStr = noteDate.toLocaleDateString('pt-BR');
            const timeStr = noteDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const isVendaFechadaOriginal =
              note.content.includes('🎉 Lead') && note.content.includes('entrou em Ganho na data de');
            const isVendaFechadaNova = note.content.includes('🏆 Venda Fechada!');
            const isVendaFechada = isVendaFechadaOriginal || isVendaFechadaNova;

            let displayContent = note.content;
            if (isVendaFechadaOriginal) {
              displayContent = note.content.replace(
                /🎉 Lead (.*?) entrou em Ganho na data de (.*)/,
                '🏆 Venda Fechada! O lead $1 foi movido para Ganho com sucesso no dia $2.'
              );
            }

            return (
              <div
                key={note.id}
                className={cn(
                  'border rounded-2xl p-4 relative group transition-all',
                  isVendaFechada
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                          isVendaFechada
                            ? 'text-emerald-700 bg-emerald-100'
                            : 'text-emerald-600 bg-emerald-50'
                        )}
                      >
                        {dateStr} às {timeStr}
                      </span>
                    </div>
                    {note.author_name && (
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-1',
                          isVendaFechada ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'
                        )}
                      >
                        por {note.author_name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p
                  className={cn(
                    'leading-relaxed',
                    isVendaFechada
                      ? 'text-sm md:text-base font-bold text-emerald-800'
                      : 'text-sm text-slate-700 dark:text-slate-300'
                  )}
                >
                  {displayContent}
                </p>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhuma nota registrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};
