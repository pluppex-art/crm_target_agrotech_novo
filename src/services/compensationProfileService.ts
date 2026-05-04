import { getSupabaseClient } from '../lib/supabase';
import { UserCompensationProfile, RoleType } from '../types/finance_v2';

export const VALID_LEVELS = [
  'Aprendiz',
  'Junior 1', 'Junior 2', 'Junior 3',
  'Pleno 1', 'Pleno 2', 'Pleno 3',
  'Sênior 1', 'Sênior 2', 'Sênior 3',
];

export const compensationProfileService = {
  /**
   * Retorna o perfil de compensação ATIVO de um usuário para um role_type.
   * Esta é a FONTE OFICIAL do nível usado no recálculo do OTE.
   */
  async getActiveProfile(userId: string, roleType: RoleType): Promise<UserCompensationProfile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('user_compensation_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('role_type', roleType)
      .eq('active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[compensationProfileService] Error fetching active profile:', error);
    }
    return data as UserCompensationProfile | null;
  },

  /**
   * Lista todos os perfis de compensação (para a SettingsTab).
   * Inclui inativos para histórico.
   * Join com perfis feito manualmente em JS (FK aponta para auth.users, não perfis).
   */
  async getAll(): Promise<(UserCompensationProfile & { user_name?: string })[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    // 1. Buscar perfis de compensação
    const { data: profiles, error } = await supabase
      .from('user_compensation_profiles')
      .select('*')
      .order('active', { ascending: false })
      .order('start_date', { ascending: false });

    if (error) {
      console.error('[compensationProfileService] Error fetching all profiles:', error);
      return [];
    }
    if (!profiles || profiles.length === 0) return [];

    // 2. Buscar nomes dos usuários na tabela perfis (IDs são os mesmos de auth.users)
    const userIds = [...new Set(profiles.map((p: any) => p.user_id))];
    const { data: perfisData, error: perfisError } = await supabase
      .from('perfis')
      .select('*')
      .in('id', userIds);

    if (perfisError) {
      console.warn('[compensationProfileService] Could not fetch user names:', perfisError);
    }

    const perfisMap: Record<string, string> = {};
    (perfisData || []).forEach((p: any) => {
      // Tenta todos os campos de nome possíveis na tabela perfis
      const name = p.full_name || p.name || p.nome || p.display_name || p.email || p.id?.substring(0, 8);
      perfisMap[p.id] = name;
    });

    return (profiles as UserCompensationProfile[]).map(p => ({
      ...p,
      user_name: perfisMap[p.user_id] || p.user_id.substring(0, 8),
    }));
  },

  /**
   * Cria um novo perfil de compensação.
   * Se o usuário já tiver um perfil ativo para o mesmo role_type, desativa o anterior.
   */
  async create(profile: Omit<UserCompensationProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserCompensationProfile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Desativar perfil anterior ativo para o mesmo user_id + role_type
    await supabase
      .from('user_compensation_profiles')
      .update({ active: false, end_date: new Date().toISOString().split('T')[0] })
      .eq('user_id', profile.user_id)
      .eq('role_type', profile.role_type)
      .eq('active', true);

    // Inserir novo perfil ativo
    const { data, error } = await supabase
      .from('user_compensation_profiles')
      .insert([{ ...profile, active: true }])
      .select()
      .single();

    if (error) {
      console.error('[compensationProfileService] Error creating profile:', error);
      return null;
    }
    return data as UserCompensationProfile;
  },

  /**
   * Atualiza campos editáveis de um perfil (nível, função, vigência).
   */
  async update(id: string, fields: Partial<Pick<UserCompensationProfile, 'role_type' | 'level' | 'start_date' | 'end_date'>>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('user_compensation_profiles')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[compensationProfileService] Error updating profile:', error);
      return false;
    }
    return true;
  },

  /**
   * Exclui permanentemente um perfil.
   */
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('user_compensation_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[compensationProfileService] Error deleting profile:', error);
      return false;
    }
    return true;
  },

  /**
   * Ativa ou pausa (desativa) um perfil.
   */
  async setActive(id: string, active: boolean): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('user_compensation_profiles')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[compensationProfileService] Error toggling active:', error);
      return false;
    }
    return true;
  },
};
