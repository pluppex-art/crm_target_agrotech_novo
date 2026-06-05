import { supabase } from '../lib/supabase';

export interface SmartResponderRequest {
  leadId: string;
  context?: string;
}

export interface SmartResponderResponse {
  response: string;
  success: boolean;
  error?: string;
}

export const smartResponderService = {
  async generateResponse(leadId: string, context?: string): Promise<SmartResponderResponse> {
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
      if (!apiKey) {
        return { response: '', success: false, error: 'Chave do Groq (VITE_GROQ_API_KEY) não configurada.' };
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error || !lead) {
        return { response: '', success: false, error: 'Lead não encontrado.' };
      }

      const prompt = `Você é um consultor de vendas sênior da Target Agrotech, uma empresa focada no agronegócio (cursos de drones, serviços agrícolas, etc.).
Você precisa gerar uma resposta de WhatsApp amigável, persuasiva e profissional para o lead abaixo.

DADOS DO LEAD:
Nome: ${lead.name}
Produto/Interesse: ${lead.product || 'Não especificado'}
Etapa no Funil: ${lead.status}
Valor da Proposta: R$ ${lead.value || 0}
Anotações/Histórico: ${lead.motivo_perda || 'Sem anotações'}

CONTEXTO ADICIONAL DO VENDEDOR:
${context || 'Nenhum contexto adicional fornecido. Seja prestativo e avance a negociação.'}

REGRAS DA RESPOSTA:
1. Seja natural e não muito longo (adequado para WhatsApp).
2. Tente fazer uma pergunta no final para instigar a resposta do cliente.
3. Não invente preços ou prazos que não estejam no contexto.
4. Use emojis moderadamente.`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { response: '', success: false, error: `Groq error ${res.status}: ${errText}` };
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim() || '';

      return { response: text, success: true };
    } catch (err: any) {
      console.error('Falha na geração de resposta pelo Groq:', err);
      return { response: '', success: false, error: err.message };
    }
  },
};
