import { getSupabaseClient } from '../lib/supabase';

export interface AuditLogData {
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
}

export const auditService = {
  async logAction(data: AuditLogData): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return false;

      const { error } = await supabase.from('system_audit_logs' as any).insert({
        user_id: data.userId,
        user_name: data.userName,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        details: data.details,
      });

      if (error) {
        console.error('Falha ao registrar log de auditoria:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro fatal no auditService:', err);
      return false;
    }
  },

  async getLogs(limit = 100) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('system_audit_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar logs de auditoria:', err);
      return [];
    }
  }
};
