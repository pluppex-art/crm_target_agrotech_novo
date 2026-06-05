export const voiceTranscriptionService = {
  async correctText(rawText: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
    if (!apiKey || !rawText.trim()) return rawText;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content:
                'Você é um revisor de texto especializado em transcrições de áudio em português brasileiro. ' +
                'Corrija pontuação, acentuação e gramática de forma natural, mantendo o significado original. ' +
                'Retorne APENAS o texto corrigido, sem comentários, explicações ou aspas.',
            },
            { role: 'user', content: rawText },
          ],
        }),
      });

      if (!res.ok) return rawText;

      const data = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || rawText;
    } catch {
      return rawText;
    }
  },
};
