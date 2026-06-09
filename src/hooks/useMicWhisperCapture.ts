import { useState, useRef, useCallback } from 'react';
import type { Speaker } from './useSystemAudioCapture';

const CHUNK_DURATION_MS = 7000;
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

// LLM-based speaker diarization: separates Operador vs Cliente from a mono audio transcript
async function diarizeChunk(text: string): Promise<Array<{ speaker: Speaker; text: string }>> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!apiKey) return [{ speaker: 'Operador', text }];

  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Trecho de conversa de vendas transcrito (microfone único, vozes misturadas):\n"${text}"\n\nSepare as falas por falante:\n- Operador: quem vende, apresenta proposta, faz perguntas de qualificação\n- Cliente: quem responde, questiona, aceita ou recusa\n\nSe for claramente uma só pessoa falando, retorne apenas ela.\nRetorne APENAS JSON sem markdown:\n[{"speaker":"Operador","text":"..."},{"speaker":"Cliente","text":"..."}]`,
      }],
    }),
  });

  if (!res.ok) return [{ speaker: 'Operador', text }];

  try {
    const data = await res.json();
    const content = (data?.choices?.[0]?.message?.content ?? '').trim();
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [{ speaker: 'Operador', text }];
    const parsed = JSON.parse(match[0]) as Array<{ speaker: string; text: string }>;
    return parsed
      .filter(item => item.text?.trim())
      .map(item => ({
        speaker: (item.speaker === 'Cliente' ? 'Cliente' : 'Operador') as Speaker,
        text: item.text.trim(),
      }));
  } catch {
    return [{ speaker: 'Operador', text }];
  }
}

interface UseMicWhisperCaptureOptions {
  onTranscript: (text: string, speaker: Speaker) => void;
}

export function useMicWhisperCapture({ onTranscript }: UseMicWhisperCaptureOptions) {
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const shouldContinueRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setIsCapturing(false);
  }, []);

  const runChunkCycle = useCallback((stream: MediaStream) => {
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
          .then(async text => {
            if (!text) return;
            const segments = await diarizeChunk(text);
            segments.forEach(seg => onTranscriptRef.current(seg.text, seg.speaker));
          })
          .catch(() => {});
      }
      runChunkCycle(stream);
    };

    recorder.onerror = () => {};
    recorder.start();

    timerRef.current = window.setTimeout(() => {
      try { recorder.stop(); } catch {}
    }, CHUNK_DURATION_MS);
  }, []);

  // Permission is already granted by useRealTimeTranscription.start() — no extra dialog
  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      shouldContinueRef.current = true;
      setIsCapturing(true);
      runChunkCycle(stream);
    } catch {
      // silently skip — useRealTimeTranscription handles permission errors
    }
  }, [runChunkCycle]);

  return { isCapturing, start, stop };
}
