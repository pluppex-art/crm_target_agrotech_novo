import { create } from 'zustand';
import { UserProfile, CreateProfilePayload, profileService } from '../services/profileService';
import { getSupabaseClient } from '../lib/supabase';

interface ProfileState {
  profiles: UserProfile[];
  loading: boolean;
  fetchProfiles: () => Promise<void>;
  addProfile: (profile: CreateProfilePayload) => Promise<void>;
  updateProfile: (id: string, profile: Partial<UserProfile>) => Promise<boolean>;
  deleteProfile: (id: string) => Promise<void>;
  subscribe: () => () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  loading: false,

  fetchProfiles: async () => {
    set({ loading: true });
    const profiles = await profileService.getProfiles();
    set({ profiles, loading: false });
  },

  addProfile: async (profile: CreateProfilePayload) => {
    const { data: newProfile, error } = await profileService.createProfile(profile);
    if (error) throw error;
    if (newProfile) {
      set({ profiles: [...get().profiles, newProfile] });
    }
  },

  updateProfile: async (id: string, profile: Partial<UserProfile>) => {
    const { data: updatedProfile, error } = await profileService.updateProfile(id, profile);
    
    if (error) {
      console.error('Store: Error updating profile:', error);
      throw error;
    }

    if (updatedProfile) {
      const currentProfiles = get().profiles;
      const exists = currentProfiles.some((p) => p.id === id);
      
      if (exists) {
        set({
          profiles: currentProfiles.map((p) => (p.id === id ? updatedProfile : p)),
        });
      } else {
        set({
          profiles: [...currentProfiles, updatedProfile],
        });
      }
      return true;
    }
    return false;
  },

  deleteProfile: async (id) => {
    const success = await profileService.deleteProfile(id);
    if (success) {
      set({ profiles: get().profiles.filter((p) => p.id !== id) });
    }
  },

  subscribe: () => {
    const supabase = getSupabaseClient();

    const channelId = `profiles-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfis' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => {
          let updated = [...state.profiles];
          if (eventType === 'INSERT') {
            if (!updated.some(p => p.id === (newRecord as UserProfile).id)) {
              updated = [...updated, newRecord as UserProfile];
            }
          } else if (eventType === 'UPDATE') {
            updated = updated.map(p => p.id === (newRecord as UserProfile).id ? { ...p, ...newRecord } : p);
          } else if (eventType === 'DELETE') {
            updated = updated.filter(p => p.id !== (oldRecord as any).id);
          }
          return { profiles: updated };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
