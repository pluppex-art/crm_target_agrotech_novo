import { useEffect, useState } from 'react';
import { Megaphone, Plus, Mail, MessageCircle, Share2, TrendingUp, Target, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useMarketingStore } from '../store/useMarketingStore';
import { NewCampaignModal } from '../components/marketing/NewCampaignModal';

export function Marketing() {
  const { campaigns, loading, fetchCampaigns } = useMarketingStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads_count || 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Marketing</h1>
          <p className="text-sm text-slate-500">Campanhas, automações e métricas de marketing.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-800">Total Leads Gerados</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalLeads.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 font-bold mt-1">Acumulado de campanhas</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800">Campanhas Ativas</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{campaigns.filter(c => c.status === 'active').length}</p>
          <p className="text-xs text-blue-600 font-bold mt-1">Em execução agora</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-bold text-slate-800">Investimento Total</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">R$ {campaigns.reduce((acc, c) => acc + (c.budget || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-purple-600 font-bold mt-1">Orçamento alocado</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Campanhas Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Nome</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Plataforma</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Leads</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Orçamento</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 border-b border-slate-50">{c.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        {c.platform === 'E-mail Marketing' ? <Mail className="w-3 h-3" /> : c.platform === 'WhatsApp' ? <MessageCircle className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                        {c.platform}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm border-b border-slate-50">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                        c.status === 'active' ? "bg-emerald-50 text-emerald-600" :
                        c.status === 'paused' ? "bg-yellow-50 text-yellow-600" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {c.status === 'active' ? 'Ativa' : c.status === 'paused' ? 'Pausada' : 'Finalizada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 border-b border-slate-50">{c.leads_count}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 border-b border-slate-50">R$ {c.budget?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhuma campanha encontrada.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <NewCampaignModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
