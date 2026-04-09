import { Target, Mail, TrendingUp } from 'lucide-react';

interface MarketingMetricsProps {
  campaigns: any[];
}

export function MarketingMetrics({ campaigns }: MarketingMetricsProps) {
  const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads_count || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
        <p className="text-3xl font-bold text-slate-800">{activeCampaigns}</p>
        <p className="text-xs text-blue-600 font-bold mt-1">Em execução agora</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-bold text-slate-800">Investimento Total</h3>
        </div>
        <p className="text-3xl font-bold text-slate-800">R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p className="text-xs text-purple-600 font-bold mt-1">Orçamento alocado</p>
      </div>
    </div>
  );
}
