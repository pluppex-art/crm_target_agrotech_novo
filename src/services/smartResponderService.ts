import { supabase } from '../lib/supabase';
import { GoogleGenAI } from '@google/genai';

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
  /**
   * Utiliza a API do Gemini localmente para gerar a sugestão
   */
  async generateResponse(leadId: string, context?: string): Promise<SmartResponderResponse> {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return { response: '', success: false, error: 'Chave do Gemini (VITE_GEMINI_API_KEY) não configurada.' };
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error || !lead) {
        return { response: '', success: false, error: 'Lead não encontrado.' };
      }

      // Inicializa o SDK
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
Você é um consultor de vendas sênior da Target Agrotech, uma empresa focada no agronegócio (cursos de drones, serviços agrícolas, etc.).
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
4. Use emojis moderadamente.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return {
        response: response.text || '',
        success: true
      };
    } catch (err: any) {
      console.error('Falha na geração de resposta pelo Gemini:', err);
      return { response: '', success: false, error: err.message };
    }
  }
};
