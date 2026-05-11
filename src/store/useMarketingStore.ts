import { create } from 'zustand';

// The `marketing_campaigns` table no longer exists in the DB. This store is stubbed
// out to prevent runtime errors while UI components that reference it are updated.

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

export const useMarketingStore = create<MarketingState>(() => ({
  campaigns: [],
  loading: false,
  error: null,

  fetchCampaigns: async () => {
    // marketing_campaigns table removed — no-op
  },

  addCampaign: async (_campaign) => {
    console.warn('useMarketingStore.addCampaign: marketing_campaigns table no longer exists.');
  },

  deleteCampaign: async (_id) => {
    console.warn('useMarketingStore.deleteCampaign: marketing_campaigns table no longer exists.');
  },

  subscribe: () => {
    return () => {};
  },
}));
