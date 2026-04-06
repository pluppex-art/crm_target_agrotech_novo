import { create } from 'zustand';
import { UserProfile, profileService } from '../services/profileService';

interface ProfileState {
  profiles: UserProfile[];
  loading: boolean;
  fetchProfiles: () => Promise<void>;
  addProfile: (profile: UserProfile) => Promise<void>;
  updateProfile: (id: string, profile: Partial<UserProfile>) => Promise<boolean>;
  deleteProfile: (id: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  loading: false,

  fetchProfiles: async () => {
    set({ loading: true });
    const profiles = await profileService.getProfiles();
    set({ profiles, loading: false });
  },

  addProfile: async (profile) => {
    const newProfile = await profileService.createProfile(profile);
    if (newProfile) {
      set({ profiles: [...get().profiles, newProfile] });
    }
  },

  updateProfile: async (id, profile) => {
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
}));
