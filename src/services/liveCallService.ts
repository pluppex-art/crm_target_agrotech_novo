export interface BANTItem {
  detected: boolean;
  value?: string;
}

export interface BANTAnalysis {
  budget: BANTItem;
  authority: BANTItem;
  need: BANTItem;
  timeline: BANTItem;
  score: number;
  summary: string;
}

export const liveCallService = {
  async transcribeAudio(blob: Blob): Promise<string> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
    if (!apiKey) return '';

    const formData = new FormData();
    formData.append('file', blob, 'chunk.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'pt');
    formData.append('response_format', 'text');

    try {
      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });
      if (!res.ok) return '';
      return (await res.text()).trim();
    } catch {
      return '';
    }
  },

  async analyzeBANT(transcript: string, leadName: string): Promise<BANTAnalysis> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
    const fallback: BANTAnalysis = {
      budget: { detected: false },
      authority: { detected: false },
      need: { detected: false },
      timeline: { detected: false },
      score: 0,
      summary: '',
    };
    if (!apiKey || !transcript.trim()) return fallback;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em qualificação BANT para um CRM de cursos agrícolas.
Analise a transcrição de chamada com "${leadName}" e extraia os critérios BANT.

Responda APENAS com JSON válido:
{
  "budget": { "detected": boolean, "value": string | null },
  "authority": { "detected": boolean, "value": string | null },
  "need": { "detected": boolean, "value": string | null },
  "timeline": { "detected": boolean, "value": string | null },
  "score": number,
  "summary": string
}`,
            },
            { role: 'user', content: transcript },
          ],
        }),
      });
      if (!res.ok) return fallback;
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content?.trim() || '';
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return fallback;
      const p = JSON.parse(match[0]);
      return {
        budget: { detected: !!p.budget?.detected, value: p.budget?.value ?? undefined },
        authority: { detected: !!p.authority?.detected, value: p.authority?.value ?? undefined },
        need: { detected: !!p.need?.detected, value: p.need?.value ?? undefined },
        timeline: { detected: !!p.timeline?.detected, value: p.timeline?.value ?? undefined },
        score: p.score ?? 0,
        summary: p.summary ?? '',
      };
    } catch {
      return fallback;
    }
  },
};
