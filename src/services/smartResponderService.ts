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
  /**
   * Chama a Edge Function smart-responder para gerar uma resposta para o lead.
   */
  async generateResponse(leadId: string, context?: string): Promise<SmartResponderResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('smart-responder', {
        body: { leadId, context }
      });

      if (error) {
        console.error('Erro ao chamar smart-responder:', error);
        return { response: '', success: false, error: error.message };
      }

      return {
        response: data?.response || '',
        success: true
      };
    } catch (err: any) {
      console.error('Falha na requisição ao smart-responder:', err);
      return { response: '', success: false, error: err.message };
    }
  }
};
