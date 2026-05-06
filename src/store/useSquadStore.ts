import { create } from 'zustand';
import { Squad, SquadMember } from '../types/finance_v2';
import { squadService } from '../services/squadService';

interface SquadState {
  squads: Squad[];
  members: SquadMember[];
  userSquadMap: Record<string, string>; // userId -> squadName
  userSquadColorMap: Record<string, string>; // userId -> squadColor
  loading: boolean;
  fetchSquads: () => Promise<void>;
  getSquadInfoForUser: (userId: string, userName?: string, profiles?: any[]) => { name: string; color: string };
}

export const useSquadStore = create<SquadState>((set, get) => ({
  squads: [],
  members: [],
  userSquadMap: {},
  userSquadColorMap: {},
  loading: false,

  fetchSquads: async () => {
    set({ loading: true });
    try {
      const [squads, members] = await Promise.all([
        squadService.getAllSquads(),
        squadService.getAllSquadMembers()
      ]);

      const squadMap: Record<string, string> = {};
      const squadColorMap: Record<string, string> = {};
      squads.forEach(s => {
        squadMap[s.id] = s.name;
        squadColorMap[s.id] = s.color || (s.name.toUpperCase() === 'PLUPPEX' ? '#8b5cf6' : '#3b82f6');
      });

      const userSquadMap: Record<string, string> = {};
      const userSquadColorMap: Record<string, string> = {};
      members.forEach(m => {
        if (squadMap[m.squad_id]) {
          userSquadMap[m.user_id] = squadMap[m.squad_id];
          userSquadColorMap[m.user_id] = squadColorMap[m.squad_id];
        }
      });

      set({ squads, members, userSquadMap, userSquadColorMap, loading: false });
    } catch (error) {
      console.error('[useSquadStore] Error fetching squads:', error);
      set({ loading: false });
    }
  },

  getSquadInfoForUser: (userId: string, userName?: string, profiles: any[] = []) => {
    const { userSquadMap, userSquadColorMap } = get();
    
    // 1. Try direct map (userId)
    if (userSquadMap[userId]) {
      return { name: userSquadMap[userId], color: userSquadColorMap[userId] };
    }

    // 2. Try by name if userId lookup failed
    if (userName && profiles.length > 0) {
      const profile = profiles.find(p => p.name === userName);
      if (profile && userSquadMap[profile.id]) {
        return { name: userSquadMap[profile.id], color: userSquadColorMap[profile.id] };
      }
    }

    // 3. Fallback to profile department
    if (profiles.length > 0) {
      const profile = profiles.find(p => p.id === userId || (userName && p.name === userName));
      if (profile?.department) {
        const dept = profile.department.toLowerCase();
        if (dept === 'pluppex') return { name: 'PLUPPEX', color: '#8b5cf6' };
        return { name: 'TARGET', color: '#3b82f6' };
      }
    }

    return { name: 'TARGET', color: '#3b82f6' }; // Final fallback
  }

}));
