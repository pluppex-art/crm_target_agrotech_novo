export interface DetectedTask {
  hasTask: boolean;
  title: string;
  due_date: string;
  scheduled_time: string | null;
  description: string;
}

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

  async detectTaskIntent(text: string, leadName?: string): Promise<DetectedTask | null> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
    if (!apiKey || !text.trim()) return null;

    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayISO = today.toISOString().split('T')[0];

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
              content: `Você é um detector de tarefas para um CRM. Analise a nota de voz e detecte se o vendedor menciona um compromisso futuro, retorno de ligação, follow-up ou tarefa com data específica.

Data de hoje: ${todayStr} (${todayISO})

Exemplos que DEVEM gerar tarefa:
- "fiquei de retornar hoje" → due_date: ${todayISO}
- "vou ligar amanhã às 14h" → due_date: amanhã, scheduled_time: "14:00"
- "retornar dia 15" → due_date: dia 15 do mês atual ou próximo
- "falar na sexta" → due_date: próxima sexta-feira
- "enviar proposta semana que vem" → due_date: próxima segunda-feira
- "ligar às 10 horas" → due_date: hoje, scheduled_time: "10:00"

Exemplos que NÃO devem gerar tarefa:
- "o lead está interessado no produto" → sem tarefa
- "ligamos hoje e ele pediu desconto" → evento passado, sem tarefa
- "ele não atendeu" → sem tarefa

Responda APENAS com JSON válido, sem texto adicional:
{
  "hasTask": boolean,
  "title": string (ação curta, ex: "Retornar ligação${leadName ? ` para ${leadName}` : ''}"),
  "due_date": string (formato YYYY-MM-DD),
  "scheduled_time": string | null (formato HH:MM se horário mencionado, senão null),
  "description": string (contexto breve da tarefa)
}`,
            },
            { role: 'user', content: text },
          ],
        }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content?.trim() || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      const parsed: DetectedTask = JSON.parse(jsonMatch[0]);
      return parsed.hasTask ? parsed : null;
    } catch {
      return null;
    }
  },
};
