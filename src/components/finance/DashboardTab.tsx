import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { transactionService } from '../../services/transactionService';
import { FinanceKPIs } from '../../types/finance_v2';
import { MetricCard } from '../dashboard/MetricCard';
import { fmt } from '../../lib/utils';

export function DashboardTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [kpis, setKpis] = useState<FinanceKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await transactionService.getKPIs({ startDate, endDate });
        setKpis(data);
      } catch (err) {
        console.error('Error loading KPIs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [startDate, endDate]);

  if (isLoading && !kpis) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Visão Geral (Realizado)</h2>
      </div>

      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MetricCard label="Receita Total" value={`R$ ${fmt(kpis.receita_total)}`} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
          <MetricCard label="Despesas" value={`R$ ${fmt(kpis.despesa_total)}`} icon={TrendingDown} color="bg-rose-50 text-rose-600" />
          <MetricCard
            label="Lucro Líquido"
            value={`R$ ${fmt(Math.abs(kpis.lucro_liquido))}`}
            sub={kpis.lucro_liquido >= 0 ? 'Positivo' : 'Negativo'}
            icon={DollarSign}
            color={kpis.lucro_liquido >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}
          />
          <MetricCard label="Margem Líquida" value={`${kpis.margem_liquida.toFixed(1)}%`} icon={Percent} color="bg-blue-50 text-blue-600" />
          <MetricCard label="Contas a Receber" value={`R$ ${fmt(kpis.contas_receber)}`} icon={TrendingUp} color="bg-amber-50 text-amber-600" />
          <MetricCard label="Contas a Pagar" value={`R$ ${fmt(kpis.contas_pagar)}`} icon={TrendingDown} color="bg-orange-50 text-orange-600" />
        </div>
      )}
    </div>
  );
}
