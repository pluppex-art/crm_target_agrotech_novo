import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useMarketingStore } from '../store/useMarketingStore';
import { NewCampaignModal } from '../components/marketing/NewCampaignModal';
import { MarketingMetrics } from '../components/marketing/MarketingMetrics';
import { CampaignTable } from '../components/marketing/CampaignTable';

export function Marketing() {
  const { campaigns, loading, fetchCampaigns } = useMarketingStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads_count || 0), 0);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Marketing</h1>
          <p className="text-sm text-slate-500">Campanhas, automações e métricas de marketing.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      <MarketingMetrics campaigns={campaigns} />
      <CampaignTable campaigns={campaigns} loading={loading} />

      <NewCampaignModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
