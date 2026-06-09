import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Mic, Radio, Loader2, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { liveCallService, BANTAnalysis } from '../../services/liveCallService';

interface Props {
  leadName: string;
  onTranscriptComplete: (transcript: string) => void;
  onClose: () => void;
}

const BANT_KEYS = ['B', 'A', 'N', 'T'] as const;
const BANT_LABELS = { B: 'Budget', A: 'Authority', N: 'Need', T: 'Timeline' };
const BANT_FIELDS: Record<typeof BANT_KEYS[number], keyof BANTAnalysis> = {
  B: 'budget', A: 'authority', N: 'need', T: 'timeline',
};

const DeviceSelect: React.FC<{
  label: string;
  icon: React.ReactNode;
  devices: MediaDeviceInfo[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
  hint?: string;
}> = ({ label, icon, devices, value, onChange, optional, hint }) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {icon}
      {label}
      {optional && <span className="ml-1 font-normal normal-case tracking-normal text-slate-300 dark:text-slate-600">(opcional)</span>}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-3 py-2 pr-8 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
      >
        {optional && <option value="">— Nenhum —</option>}
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Dispositivo ${d.deviceId.slice(0, 8)}`}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
    {hint && (
      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{hint}</p>
    )}
  </div>
);

export const LiveCallTranscriber: React.FC<Props> = ({ leadName, onTranscriptComplete, onClose }) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [micId, setMicId] = useState('');
  const [sysId, setSysId] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState<string[]>([]);
  const [bant, setBant] = useState<BANTAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);
  const segmentsRef = useRef<string[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadDevices();
    return () => cleanup();
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments]);

  const loadDevices = async () => {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      tmp.getTracks().forEach((t) => t.stop());
    } catch {}
    const all = await navigator.mediaDevices.enumerateDevices();
    const inputs = all.filter((d) => d.kind === 'audioinput');
    setDevices(inputs);
    const defaultDev = inputs.find((d) => d.deviceId === 'default') || inputs[0];
    if (defaultDev) setMicId(defaultDev.deviceId);
    const loopback = inputs.find((d) => {
      const l = d.label.toLowerCase();
      return (
        l.includes('blackhole') ||
        l.includes('loopback') ||
        l.includes('stereo mix') ||
        l.includes('vb-audio') ||
        l.includes('cable output') ||
        l.includes('virtual')
      );
    });
    if (loopback) setSysId(loopback.deviceId);
  };

  const startCall = async () => {
    setError(null);
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: micId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      ctx.createMediaStreamSource(micStream).connect(dest);

      if (sysId) {
        try {
          const sysStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: sysId },
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
          ctx.createMediaStreamSource(sysStream).connect(dest);
        } catch {}
      }

      streamRef.current = dest.stream;
      isActiveRef.current = true;
      setIsActive(true);
      setSegments([]);
      segmentsRef.current = [];
      setElapsed(0);
      setBant(null);

      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      startChunkCycle();
    } catch (e: any) {
      setError('Erro ao acessar microfone: ' + (e?.message || 'Permissão negada'));
    }
  };

  const startChunkCycle = useCallback(() => {
    if (!streamRef.current || !isActiveRef.current) return;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      if (chunks.length === 0) {
        if (isActiveRef.current) startChunkCycle();
        return;
      }
      const blob = new Blob(chunks, { type: mimeType });
      const text = await liveCallService.transcribeAudio(blob);
      if (text.trim()) {
        const newSegs = [...segmentsRef.current, text.trim()];
        segmentsRef.current = newSegs;
        setSegments([...newSegs]);
        if (newSegs.length % 2 === 0 || newSegs.length === 1) {
          setIsAnalyzing(true);
          const analysis = await liveCallService.analyzeBANT(newSegs.join(' '), leadName);
          setBant(analysis);
          setIsAnalyzing(false);
        }
      }
      if (isActiveRef.current) startChunkCycle();
    };

    recorder.start();
    chunkTimerRef.current = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, 8000);
  }, [leadName]);

  const stopCall = () => {
    isActiveRef.current = false;
    cleanup();
    setIsActive(false);
    const full = segmentsRef.current.join(' ').trim();
    if (full) onTranscriptComplete(full);
  };

  const cleanup = () => {
    isActiveRef.current = false;
    if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {isActive && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isActive ? `Chamada ao Vivo · ${fmt(elapsed)}` : 'Captura de Chamada ao Vivo'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-full"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Device selector — only when idle */}
        {!isActive && (
          <>
            <DeviceSelect
              label="Microfone (Operador)"
              icon={<Mic size={11} />}
              devices={devices}
              value={micId}
              onChange={setMicId}
            />
            <DeviceSelect
              label="Áudio do Sistema (Cliente)"
              icon={<Radio size={11} />}
              devices={devices}
              value={sysId}
              onChange={setSysId}
              optional
              hint={
                !sysId
                  ? 'Instale BlackHole (Mac) ou VB-Cable (Win) para capturar a voz do cliente'
                  : undefined
              }
            />
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <button
              onClick={startCall}
              disabled={!micId}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Phone size={14} />
              Iniciar Captura
            </button>
          </>
        )}

        {/* Active call */}
        {isActive && (
          <>
            {/* BANT badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {BANT_KEYS.map((k) => {
                const field = bant?.[BANT_FIELDS[k]] as { detected: boolean; value?: string } | undefined;
                return (
                  <div
                    key={k}
                    title={field?.value || BANT_LABELS[k]}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition-colors',
                      field?.detected
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    )}
                  >
                    {k}
                    <span className="text-[9px]">{field?.detected ? '✓' : '?'}</span>
                  </div>
                );
              })}
              {isAnalyzing && <Loader2 size={11} className="animate-spin text-slate-400 ml-1" />}
              {bant && (
                <span className="ml-auto text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {bant.score}/4
                </span>
              )}
            </div>

            {bant?.summary && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed border-l-2 border-emerald-300 pl-2">
                {bant.summary}
              </p>
            )}

            {/* Rolling transcript */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 h-36 overflow-y-auto space-y-1.5">
              {segments.length === 0 ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs h-full justify-center">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Aguardando fala…</span>
                </div>
              ) : (
                segments.map((seg, i) => (
                  <p key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {seg}
                  </p>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>

            <button
              onClick={stopCall}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors"
            >
              <PhoneOff size={14} />
              Encerrar e Salvar como Nota
            </button>
          </>
        )}
      </div>
    </div>
  );
};
