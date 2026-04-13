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
  deleteCampaign: (id: string) => Promise<void>;
  subscribe: () => () => void;
}

export const useMarketingStore = create<MarketingState>((set, get) => ({
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

  deleteCampaign: async (id) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const previousCampaigns = get().campaigns;
    set((state) => ({
      campaigns: state.campaigns.filter((c) => c.id !== id),
    }));

    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      set({ campaigns: previousCampaigns, error: 'Failed to delete campaign' });
    }
  },

  subscribe: () => {
    const supabase = getSupabaseClient();

    const channelId = `marketing-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_campaigns' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => {
          let updated = [...state.campaigns];
          if (eventType === 'INSERT') {
            if (!updated.some(c => c.id === (newRecord as Campaign).id)) {
              updated = [newRecord as Campaign, ...updated];
            }
          } else if (eventType === 'UPDATE') {
            updated = updated.map(c => c.id === (newRecord as Campaign).id ? { ...c, ...newRecord } : c);
          } else if (eventType === 'DELETE') {
            updated = updated.filter(c => c.id !== (oldRecord as any).id);
          }
          return { campaigns: updated };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
