import { useState, useRef, useCallback } from 'react';

// Web Speech API types — not always in the global scope depending on TS config
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; [j: number]: { transcript: string } };
  };
};

interface TranscriptionState {
  transcript: string;
  interimText: string;
  isListening: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useRealTimeTranscription(): TranscriptionState {
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldRestartRef = useRef(false);

  const start = useCallback(async () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;

    if (!SR) {
      setError('Reconhecimento de voz não suportado neste navegador. Use Chrome ou Edge.');
      return;
    }

    // Request mic permission explicitly so Chrome shows the permission popup
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Permissão de microfone negada. Clique no cadeado na barra de endereço → Microfone → Permitir → recarregue a página.');
      } else {
        setError('Não foi possível acessar o microfone. Verifique se há um microfone conectado.');
      }
      return;
    }

    setError(null);
    shouldRestartRef.current = true;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'pt-BR';

    rec.onresult = (event: SpeechRecognitionResultEvent) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text + ' ';
        } else {
          interim += text;
        }
      }
      if (final) setTranscript((prev) => prev + final);
      setInterimText(interim);
    };

    rec.onerror = (event: { error: string }) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      if (event.error === 'not-allowed') {
        setError('Permissão de microfone negada. Clique no cadeado na barra de endereço → Microfone → Permitir → recarregue a página.');
        shouldRestartRef.current = false;
        return;
      }
      setError(`Erro no microfone: ${event.error}`);
    };

    rec.onend = () => {
      setInterimText('');
      // Auto-restart to survive browser's silence timeout in continuous mode
      if (shouldRestartRef.current && recognitionRef.current === rec) {
        try { rec.start(); } catch { /* ignore if already started */ }
      } else {
        setIsListening(false);
      }
    };

    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript('');
    setInterimText('');
    setError(null);
  }, [stop]);

  return { transcript, interimText, isListening, error, start, stop, reset };
}
