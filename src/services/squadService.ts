import { getSupabaseClient } from '../lib/supabase';
import { Squad, SquadMember } from '../types/finance_v2';

export const squadService = {
  async getAllSquads(): Promise<Squad[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('squads')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('[squadService] Error fetching squads:', error);
      return [];
    }
    return data || [];
  },

  async getAllSquadMembers(): Promise<SquadMember[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('squad_members')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('[squadService] Error fetching squad members:', error);
      return [];
    }
    return data || [];
  },

  async getUserSquadMap(): Promise<Record<string, string>> {
    const squads = await this.getAllSquads();
    const members = await this.getAllSquadMembers();

    const squadMap: Record<string, string> = {};
    squads.forEach(s => {
      squadMap[s.id] = s.name;
    });

    const userSquadMap: Record<string, string> = {};
    members.forEach(m => {
      if (squadMap[m.squad_id]) {
        userSquadMap[m.user_id] = squadMap[m.squad_id];
      }
    });

    return userSquadMap;
  }
};
