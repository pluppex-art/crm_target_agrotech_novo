import { getSupabaseClient } from '../lib/supabase';
import { UserCompensationProfile, RoleType } from '../types/finance_v2';
import { profileService } from './profileService';

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
  async getAll(): Promise<(UserCompensationProfile & { user_name?: string; squad_name?: string })[]> {
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

    const userIds = Array.from(new Set(profiles.map((p: any) => p.user_id)));

    // 2. Buscar nomes e squads em paralelo
    // Usamos profileService.getProfiles() para garantir que pegamos todos os usuários corretamente
    const [allProfiles, membersRes, squadsRes] = await Promise.all([
      profileService.getProfiles(),
      supabase.from('squad_members').select('user_id, squad_id, squads(name, color)').in('user_id', userIds).eq('active', true),
      supabase.from('squads').select('id, name, manager_id, color').in('manager_id', userIds).eq('active', true)
    ]);

    const perfisMap: Record<string, string> = {};
    allProfiles.forEach((p: any) => {
      perfisMap[p.id] = p.full_name || p.name || p.email || p.id.substring(0, 8);
    });

    const userSquadMap: Record<string, { name: string; color?: string }> = {};
    
    // Mapeia squads de membros (Closers/SDRs)
    (membersRes.data || []).forEach((m: any) => {
      if (m.squads?.name) {
        userSquadMap[m.user_id] = { name: m.squads.name, color: m.squads.color };
      }
    });

    // Mapeia squads de gestores
    (squadsRes.data || []).forEach((s: any) => {
      if (s.manager_id) {
        userSquadMap[s.manager_id] = { name: s.name, color: s.color };
      }
    });

    return (profiles as (UserCompensationProfile & { squad_color?: string })[]).map(p => ({
      ...p,
      user_name: perfisMap[p.user_id] || p.user_id.substring(0, 8),
      squad_name: userSquadMap[p.user_id]?.name,
      squad_color: userSquadMap[p.user_id]?.color
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

  async getSquads(): Promise<{ id: string; name: string; manager_id: string | null; active: boolean; color?: string; logo_url?: string }[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    
    // Tenta buscar com os novos campos
    const { data, error } = await supabase
      .from('squads')
      .select('id, name, manager_id, active, color, logo_url')
      .order('active', { ascending: false })
      .order('name');

    if (error) {
      // Se der erro de coluna inexistente, tenta buscar apenas o básico
      console.warn('[compensationProfileService] Could not fetch extended squad fields, falling back to basic:', error.message);
      const { data: basicData, error: basicError } = await supabase
        .from('squads')
        .select('id, name, manager_id, active')
        .order('active', { ascending: false })
        .order('name');
      
      if (basicError) {
        console.error('[compensationProfileService] Error fetching squads:', basicError);
        return [];
      }
      return basicData || [];
    }
    return data || [];
  },

  async createSquad(name: string, color?: string, logo_url?: string, manager_id?: string | null): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };
    
    // Captura o usuário logado para auditoria
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('squads')
      .insert([{ 
        name, 
        active: true,
        color,
        logo_url,
        manager_id: manager_id || null,
        created_by: user?.id,
        updated_by: user?.id
      }]);
      
    if (error) {
      console.error('[compensationProfileService] Error creating squad:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async updateSquad(id: string, fields: { name?: string; active?: boolean; manager_id?: string | null; color?: string; logo_url?: string }): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('squads')
      .update({ 
        ...fields, 
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      })
      .eq('id', id);
    if (error) {
      console.error('[compensationProfileService] Error updating squad:', error);
      return false;
    }
    return true;
  },

  async deleteSquad(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    // Delete members first to avoid FK issues if cascade is not set
    await supabase.from('squad_members').delete().eq('squad_id', id);
    const { error } = await supabase.from('squads').delete().eq('id', id);
    if (error) {
      console.error('[compensationProfileService] Error deleting squad:', error);
      return false;
    }
    return true;
  },

  async getSquadMembers(squadId: string): Promise<{ user_id: string; user_name?: string }[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data: members, error } = await supabase
      .from('squad_members')
      .select('user_id')
      .eq('squad_id', squadId)
      .eq('active', true);
    
    if (error || !members) return [];

    const userIds = members.map(m => m.user_id);
    if (userIds.length === 0) return [];

    const allProfiles = await profileService.getProfiles();

    const perfisMap: Record<string, string> = {};
    allProfiles.forEach((p: any) => {
      perfisMap[p.id] = p.full_name || p.name || p.email || p.id.substring(0, 8);
    });

    return members.map(m => ({
      user_id: m.user_id,
      user_name: perfisMap[m.user_id] || m.user_id.substring(0, 8)
    }));
  },

  async addMemberToSquad(squadId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    
    // First remove from any other squad to ensure unique membership (as per typical squad logic)
    await supabase.from('squad_members').delete().eq('user_id', userId);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('squad_members')
      .insert([{ 
        squad_id: squadId, 
        user_id: userId, 
        active: true,
        created_by: user?.id,
        updated_by: user?.id
      }]);
    
    if (error) {
      console.error('[compensationProfileService] Error adding member to squad:', error);
      return false;
    }
    return true;
  },

  async removeMemberFromSquad(squadId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    const { error } = await supabase
      .from('squad_members')
      .delete()
      .eq('squad_id', squadId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('[compensationProfileService] Error removing member from squad:', error);
      return false;
    }
    return true;
  },

  async assignManagerToSquad(managerId: string, squadId: string | null): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    // Remove este gestor de qualquer squad atual
    await supabase
      .from('squads')
      .update({ manager_id: null, updated_at: new Date().toISOString() })
      .eq('manager_id', managerId);
    if (!squadId) return true;
    const { error } = await supabase
      .from('squads')
      .update({ manager_id: managerId, updated_at: new Date().toISOString() })
      .eq('id', squadId);
    if (error) {
      console.error('[compensationProfileService] Error assigning manager to squad:', error);
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
