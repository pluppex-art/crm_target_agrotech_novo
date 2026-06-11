import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Mic, MicOff, X, RefreshCw, AlertCircle, Lightbulb, Brain,
  Loader2, ClipboardCopy, Monitor, MonitorOff, Save, CheckCircle2,
  ChevronDown, ChevronUp, MessageSquare,
} from 'lucide-react';
import { useRealTimeTranscription } from '../../hooks/useRealTimeTranscription';
import { useSystemAudioCapture, Speaker } from '../../hooks/useSystemAudioCapture';
import { useMicWhisperCapture } from '../../hooks/useMicWhisperCapture';
import { aiCopilotService, CopilotAnalysis, BANTAnalysis } from '../../services/aiCopilotService';
import { supabase } from '../../lib/supabase';
import type { Json } from '../../types/supabase';
import { cn } from '../../lib/utils';

interface AICopilotPanelProps {
  leadId: string;
  leadName: string;
  leadCompany?: string;
  stageName?: string;
  existingNotes?: string;
  onClose: () => void;
}

interface TranscriptLine {
  speaker: Speaker;
  text: string;
  ts: number;
}

const BANT_LABELS = {
  budget:    { sublabel: 'Orçamento',   emoji: '💰' },
  authority: { sublabel: 'Decisor',     emoji: '👤' },
  need:      { sublabel: 'Necessidade', emoji: '🎯' },
  timeline:  { sublabel: 'Prazo',       emoji: '⏰' },
} as const;

const STATUS_CONFIG = {
  unknown:   { text: 'Não coletado', badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',    border: 'border-l-slate-300 dark:border-l-slate-600' },
  partial:   { text: 'Parcial',      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', border: 'border-l-amber-400 dark:border-l-amber-500' },
  confirmed: { text: 'Confirmado',   badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', border: 'border-l-emerald-500 dark:border-l-emerald-400' },
  negative:  { text: 'Negativo',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',         border: 'border-l-red-400 dark:border-l-red-500' },
} as const;

const TEMP_CONFIG = {
  cold: { label: '🥶 Frio',   style: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300' },
  warm: { label: '🌤️ Morno',  style: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300' },
  hot:  { label: '🔥 Quente', style: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300' },
} as const;

const AUTO_ANALYZE_CHARS = 160;

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  leadId, leadName, leadCompany, stageName, existingNotes, onClose,
}) => {
  const [audioMode, setAudioMode] = useState<'mic' | 'system'>('mic');
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [analysis, setAnalysis] = useState<CopilotAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const lastAnalyzedLenRef = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const mic = useRealTimeTranscription();

  const sysAudio = useSystemAudioCapture({
    onTranscript: useCallback((text: string, speaker: Speaker) => {
      setTranscriptLines(prev => [...prev, { speaker, text, ts: Date.now() }]);
    }, []),
  });

  // Mic mode: Whisper 7s chunks → LLM diarization → "Operador" or "Cliente" lines
  // Web Speech API (mic) is kept only for real-time interimText display
  const micWhisper = useMicWhisperCapture({
    onTranscript: useCallback((text: string, speaker: Speaker) => {
      setTranscriptLines(prev => [...prev, { speaker, text, ts: Date.now() }]);
    }, []),
  });

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptLines]);

  // Full transcript string for AI (labeled)
  const fullTranscript = transcriptLines
    .map(l => `${l.speaker}: ${l.text}`)
    .join('\n');

  const isListening = audioMode === 'mic' ? mic.isListening : sysAudio.isCapturing;
  const captureError = audioMode === 'mic' ? mic.error : sysAudio.error;
  const interimText = audioMode === 'mic' ? mic.interimText : '';

  const stopAll = useCallback(() => { mic.stop(); micWhisper.stop(); sysAudio.stop(); }, [mic, micWhisper, sysAudio]);

  const handleModeChange = (mode: 'mic' | 'system') => {
    stopAll();
    setAudioMode(mode);
  };

  const handleListen = () => {
    if (isListening) { stopAll(); return; }
    if (audioMode === 'mic') {
      mic.start();          // Web Speech API → interimText only (real-time preview)
      micWhisper.start();   // Whisper 7s cycles → committed "Operador" lines
    } else {
      sysAudio.start();
    }
  };

  const analyze = useCallback(async (forceText?: string) => {
    if (isAnalyzing) return;
    const text = forceText ?? fullTranscript;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await aiCopilotService.analyze(
        text,
        { name: leadName, company: leadCompany, stage: stageName, notes: existingNotes },
        analysis?.bant as BANTAnalysis | undefined,
      );
      setAnalysis(result);
      lastAnalyzedLenRef.current = text.length;
      setSaved(false);
    } catch {
      setAnalyzeError('Erro ao analisar. Verifique a chave da API Groq.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [fullTranscript, leadName, leadCompany, stageName, existingNotes, analysis?.bant, isAnalyzing]);

  // Auto-analyze after AUTO_ANALYZE_CHARS new chars
  useEffect(() => {
    if (fullTranscript.length - lastAnalyzedLenRef.current >= AUTO_ANALYZE_CHARS) {
      analyze(fullTranscript);
    }
  }, [fullTranscript, analyze]);

  const handleReset = () => {
    stopAll();
    mic.reset();
    setTranscriptLines([]);
    setAnalysis(null);
    setAnalyzeError(null);
    setSaved(false);
    lastAnalyzedLenRef.current = 0;
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleSave = async () => {
    if (!analysis || isSaving) return;
    setIsSaving(true);
    try {
      await supabase.from('copilot_sessions').insert({
        lead_id: leadId,
        transcript: transcriptLines as unknown as Json,
        bant: analysis.bant as unknown as Json,
        commercial: analysis.commercial as unknown as Json,
        suggestions: analysis.suggestions as unknown as Json,
        objections: analysis.objections as unknown as Json,
        summary: analysis.summary,
        urgent_alert: analysis.urgentAlert ?? null,
      });
      setSaved(true);
    } catch {
      // silently ignore save errors — data is still visible on screen
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'absolute z-[101] flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xl',
        'bottom-0 left-0 right-0 max-h-[75vh] rounded-t-2xl border-t border-x',
        'sm:top-0 sm:bottom-0 sm:left-0 sm:right-auto sm:w-[360px] sm:max-h-none sm:rounded-none sm:border-t-0 sm:border-r sm:border-l-0',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <Brain size={15} className="text-violet-600 shrink-0" />
          <span className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">IA Copilot</span>
          <span className="text-[11px] text-slate-400 truncate max-w-[110px]">{leadName}</span>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">

        {/* Mode selector */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(['mic', 'system'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                audioMode === mode
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              {mode === 'mic' ? <Mic size={12} /> : <Monitor size={12} />}
              {mode === 'mic' ? 'Microfone' : 'WhatsApp / PC'}
            </button>
          ))}
        </div>

        {/* System mode instructions */}
        {audioMode === 'system' && !sysAudio.isCapturing && !sysAudio.error && (
          <div className="px-3 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
            <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300">Como capturar ambos os lados da chamada:</p>
            <ol className="space-y-1 text-[11px] text-blue-700 dark:text-blue-400 list-decimal list-inside leading-snug">
              <li>Abra o <strong>WhatsApp Web</strong> em outra aba do Chrome</li>
              <li>Clique em <strong>"Ouvir chamada"</strong> abaixo</li>
              <li>Selecione a <strong>aba do WhatsApp</strong> na janela</li>
              <li>Marque <strong>"Compartilhar áudio da aba" ✓</strong></li>
              <li>Clique <strong>Compartilhar</strong> — permita o microfone também</li>
            </ol>
            <p className="text-[10px] text-blue-500">Aba = voz do Cliente · Microfone = voz do Operador</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleListen}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm',
              isListening
                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400',
            )}
          >
            {isListening
              ? (audioMode === 'mic' ? <MicOff size={12} /> : <MonitorOff size={12} />)
              : (audioMode === 'mic' ? <Mic size={12} /> : <Monitor size={12} />)
            }
            {isListening ? 'Parar' : audioMode === 'mic' ? 'Ouvir microfone' : 'Ouvir chamada'}
          </button>

          <button
            onClick={() => analyze()}
            disabled={isAnalyzing || (transcriptLines.length === 0 && !existingNotes)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Analisar
          </button>

          {analysis && (
            <button
              onClick={handleSave}
              disabled={isSaving || saved}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-sm disabled:cursor-not-allowed',
                saved
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
              )}
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : saved ? <CheckCircle2 size={12} /> : <Save size={12} />}
              {saved ? 'Salvo' : 'Salvar no CRM'}
            </button>
          )}

          {transcriptLines.length > 0 && (
            <button
              onClick={handleReset}
              className="ml-auto text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Capturing indicator */}
        {audioMode === 'system' && sysAudio.isCapturing && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Capturando · <span className="font-semibold text-blue-600 dark:text-blue-400">Cliente</span> (aba) + <span className="font-semibold text-violet-600 dark:text-violet-400">Operador</span> (mic) · ~7s por bloco
            </p>
          </div>
        )}

        {/* Errors */}
        {captureError && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl dark:bg-red-900/20 dark:border-red-700">
            <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-red-600 dark:text-red-400">{captureError}</p>
          </div>
        )}
        {analyzeError && (
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-900/20 dark:border-amber-700">
            <AlertCircle size={12} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">{analyzeError}</p>
          </div>
        )}

        {/* Urgent alert */}
        {analysis?.urgentAlert && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl dark:bg-red-900/20 dark:border-red-700 animate-pulse">
            <AlertCircle size={13} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-red-700 dark:text-red-400">{analysis.urgentAlert}</p>
          </div>
        )}

        {/* BANT + Commercial */}
        {analysis ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3.5 rounded-full bg-violet-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Qualificação BANT</span>
              </div>
              <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full border', TEMP_CONFIG[analysis.bant.temperature].style)}>
                {TEMP_CONFIG[analysis.bant.temperature].label}
              </span>
            </div>

            {/* BANT cards */}
            <div className="space-y-1.5">
              {(['budget', 'authority', 'need', 'timeline'] as const).map(key => {
                const item = analysis.bant[key];
                const labelCfg = BANT_LABELS[key];
                const statusCfg = STATUS_CONFIG[item.status];
                return (
                  <div key={key} className={cn('flex items-start gap-2.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-l-[3px]', statusCfg.border)}>
                    <span className="text-sm leading-none mt-0.5">{labelCfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{labelCfg.sublabel}</span>
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0', statusCfg.badge)}>
                          {statusCfg.text}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Score bar */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Score</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    analysis.bant.totalScore <= 2 ? 'bg-blue-400' :
                    analysis.bant.totalScore <= 5 ? 'bg-amber-400' : 'bg-emerald-500',
                  )}
                  style={{ width: `${(analysis.bant.totalScore / 8) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500">{analysis.bant.totalScore}/8</span>
            </div>

            {/* Commercial section */}
            {(analysis.commercial.valorPrincipal || analysis.commercial.taxaMatricula) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Proposta Comercial</span>
                </div>
                {analysis.commercial.valorPrincipal && (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Valor Principal</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                        {analysis.commercial.valorPrincipal}
                      </p>
                    </div>
                    {analysis.commercial.valorPrincipalStatus && (
                      <span className={cn(
                        'text-[10px] font-black px-2 py-1 rounded-full shrink-0',
                        analysis.commercial.valorPrincipalStatus === 'aceito'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
                      )}>
                        {analysis.commercial.valorPrincipalStatus === 'aceito' ? '✓ Aceito' : 'Aguardando'}
                      </span>
                    )}
                  </div>
                )}
                {analysis.commercial.taxaMatricula && (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Taxa de Matrícula</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                        {analysis.commercial.taxaMatricula}
                      </p>
                    </div>
                    {analysis.commercial.taxaMatriculaStatus && (
                      <span className={cn(
                        'text-[10px] font-black px-2 py-1 rounded-full shrink-0',
                        analysis.commercial.taxaMatriculaStatus === 'aceito'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
                      )}>
                        {analysis.commercial.taxaMatriculaStatus === 'aceito' ? '✓ Aceito' : 'Aguardando'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {analysis.summary && (
              <div className="px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">{analysis.summary}</p>
              </div>
            )}

            {/* Objections */}
            {analysis.objections.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="w-1 h-3.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Objeções</span>
                </div>
                {analysis.objections.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                    <AlertCircle size={11} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">{obj}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="w-1 h-3.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Perguntas sugeridas</span>
                </div>
                {analysis.suggestions.map((sug, i) => (
                  <div
                    key={i}
                    onClick={() => handleCopy(sug, i)}
                    className="flex items-start gap-2 px-3 py-2.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors group"
                  >
                    <Lightbulb size={12} className="text-violet-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-violet-700 dark:text-violet-300 leading-snug flex-1">{sug}</p>
                    <ClipboardCopy
                      size={11}
                      className={cn(
                        'shrink-0 mt-0.5 transition-colors',
                        copied === i ? 'text-emerald-500' : 'text-violet-300 group-hover:text-violet-500',
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          !isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <Brain size={36} className="text-slate-200 dark:text-slate-700" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {transcriptLines.length > 0
                    ? 'Clique em "Analisar" para qualificar'
                    : audioMode === 'mic'
                      ? 'Clique em "Ouvir microfone" para capturar'
                      : 'Siga as instruções para capturar a chamada'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Qualificação BANT · Dados comerciais · Histórico</p>
              </div>
              {existingNotes && (
                <button
                  onClick={() => analyze('')}
                  className="text-[11px] text-violet-600 hover:text-violet-700 underline underline-offset-2 transition-colors"
                >
                  Analisar com base nas notas do CRM
                </button>
              )}
            </div>
          )
        )}

        {isAnalyzing && !analysis && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 size={28} className="text-violet-500 animate-spin" />
            <p className="text-xs text-slate-400">Analisando conversa...</p>
          </div>
        )}

        {/* Bidirectional live transcript — collapsible */}
        {(transcriptLines.length > 0 || interimText) && (
          <div className="space-y-1.5">
            <button
              onClick={() => setShowTranscript(v => !v)}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-1.5">
                <MessageSquare size={11} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Transcrição
                </span>
                {transcriptLines.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">
                    {transcriptLines.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isListening && (
                  <span className="flex items-center gap-1 text-[10px] text-red-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                    Ao vivo
                  </span>
                )}
                {showTranscript
                  ? <ChevronUp size={12} className="text-slate-400 group-hover:text-slate-600" />
                  : <ChevronDown size={12} className="text-slate-400 group-hover:text-slate-600" />
                }
              </div>
            </button>

            {showTranscript && (
              <>
                <div
                  ref={transcriptRef}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 min-h-[80px] max-h-52 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
                >
                  {transcriptLines.slice(-30).map((line, i) => (
                    <div key={i} className={cn(
                      'flex gap-2 text-[11px] leading-snug',
                      line.speaker === 'Operador' ? 'justify-end' : 'justify-start',
                    )}>
                      {line.speaker === 'Cliente' && (
                        <span className="shrink-0 text-[10px] font-black text-blue-500 pt-0.5">C</span>
                      )}
                      <span className={cn(
                        'px-2.5 py-1.5 rounded-xl max-w-[85%]',
                        line.speaker === 'Operador'
                          ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
                      )}>
                        {line.text}
                      </span>
                      {line.speaker === 'Operador' && (
                        <span className="shrink-0 text-[10px] font-black text-violet-500 pt-0.5">O</span>
                      )}
                    </div>
                  ))}
                  {interimText && (
                    <div className="flex justify-end gap-2">
                      <span className="px-2.5 py-1.5 rounded-xl bg-violet-50 text-violet-400 dark:bg-violet-900/20 dark:text-violet-400 text-[11px] italic max-w-[85%]">
                        {interimText}
                      </span>
                      <span className="shrink-0 text-[10px] font-black text-violet-400 pt-0.5">O</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  <span className="font-bold text-violet-500">O</span> Operador &nbsp;·&nbsp; <span className="font-bold text-blue-500">C</span> Cliente
                </p>
              </>
            )}
          </div>
        )}

        <div className="h-2" />
      </div>
    </motion.div>
  );
};
