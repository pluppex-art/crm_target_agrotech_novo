import { useState, useRef, useCallback } from 'react';

const CHUNK_DURATION_MS = 7000;
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

async function transcribeChunk(blob: Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!apiKey || blob.size < 2000) return '';

  const form = new FormData();
  form.append('file', new File([blob], 'chunk.webm', { type: blob.type || 'audio/webm' }));
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'pt');
  form.append('response_format', 'text');

  const res = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) return '';
  return (await res.text()).trim();
}

export type Speaker = 'Operador' | 'Cliente';

interface UseSystemAudioCaptureOptions {
  onTranscript: (text: string, speaker: Speaker) => void;
}

export function useSystemAudioCapture({ onTranscript }: UseSystemAudioCaptureOptions) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const shouldContinueRef = useRef(false);
  const tabTimerRef = useRef<number | null>(null);
  const micTimerRef = useRef<number | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    if (tabTimerRef.current !== null) { clearTimeout(tabTimerRef.current); tabTimerRef.current = null; }
    if (micTimerRef.current !== null) { clearTimeout(micTimerRef.current); micTimerRef.current = null; }
    if (tabStreamRef.current) { tabStreamRef.current.getTracks().forEach(t => t.stop()); tabStreamRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    setIsCapturing(false);
  }, []);

  // Generic 7s chunk cycle — tab runs as "Cliente", mic runs as "Operador"
  const runChunkCycle = useCallback((
    stream: MediaStream,
    speaker: Speaker,
    timerRef: { current: number | null },
  ) => {
    if (!shouldContinueRef.current) return;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';

    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = async () => {
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        transcribeChunk(blob)
          .then(text => { if (text) onTranscriptRef.current(text, speaker); })
          .catch(() => {});
      }
      runChunkCycle(stream, speaker, timerRef);
    };

    recorder.onerror = () => {};
    recorder.start();

    timerRef.current = window.setTimeout(() => {
      try { recorder.stop(); } catch {}
    }, CHUNK_DURATION_MS);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);

      const tabStream = await (navigator.mediaDevices as unknown as {
        getDisplayMedia: (opts: object) => Promise<MediaStream>;
      }).getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 },
      });

      const audioTracks = tabStream.getAudioTracks();
      if (audioTracks.length === 0) {
        tabStream.getTracks().forEach(t => t.stop());
        setError('Nenhum áudio capturado. Marque "Compartilhar áudio da aba" ao selecionar a aba.');
        return;
      }

      // Audio-only stream from tab = Cliente voice
      const tabAudioStream = new MediaStream(audioTracks);
      tabStreamRef.current = tabStream;

      // Mic stream = Operador voice (optional — continues without it)
      let micAudioStream: MediaStream | null = null;
      try {
        micAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micAudioStream;
      } catch {
        // no mic permission or no device — only tab audio
      }

      shouldContinueRef.current = true;
      setIsCapturing(true);

      tabStream.getTracks().forEach(t => { t.onended = () => stop(); });

      // Two parallel cycles: tab = Cliente, mic = Operador
      runChunkCycle(tabAudioStream, 'Cliente', tabTimerRef);
      if (micAudioStream) {
        runChunkCycle(micAudioStream, 'Operador', micTimerRef);
      }
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      if (name !== 'NotAllowedError' && name !== 'AbortError') {
        setError('Erro ao capturar áudio. Verifique as permissões do navegador.');
      }
    }
  }, [runChunkCycle, stop]);

  return { isCapturing, error, start, stop };
}
