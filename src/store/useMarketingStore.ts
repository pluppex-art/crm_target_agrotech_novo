import { create } from 'zustand';
import { getSupabaseClient } from '../lib/supabase';

export interface Campaign {
  id: string;
  created_at: string;
  name: string;
  platform: string;
  status: 'active' | 'paused' | 'ended';
  budget: number;
  leads_count: number;
  conversion_rate: number;
  start_date: string;
  end_date?: string;
}

interface MarketingState {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  fetchCampaigns: () => Promise<void>;
  addCampaign: (campaign: Omit<Campaign, 'id' | 'created_at'>) => Promise<void>;
}

export const useMarketingStore = create<MarketingState>((set) => ({
  campaigns: [],
  loading: false,
  error: null,

  fetchCampaigns: async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ campaigns: data as Campaign[], loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch campaigns', loading: false });
    }
  },

  addCampaign: async (campaign) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert([campaign])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ campaigns: [...state.campaigns, data as Campaign], loading: false }));
    } catch (error) {
      set({ error: 'Failed to create campaign', loading: false });
    }
  },
}));
