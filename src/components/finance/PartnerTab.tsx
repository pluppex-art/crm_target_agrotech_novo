import { useState, useEffect, useCallback } from 'react';
import { Handshake, AlertCircle, Loader2, TrendingUp, DollarSign, RefreshCw, PieChart } from 'lucide-react';
import { partnerRevenueService, PartnerReport } from '../../services/partnerRevenueService';
import { fmt, cn } from '../../lib/utils';

export function PartnerTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [report, setReport] = useState<PartnerReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await partnerRevenueService.getPartnerReport(startDate, endDate);
      setReport(data);
    } catch (err) {
      setError('Erro ao carregar dados da parceria.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const hasData = report && report.total_revenue > 0;
  const targetPct = hasData ? (report!.target_sales / report!.total_revenue) * 100 : 0;
  const pluppexPct = hasData ? (report!.pluppex_sales / report!.total_revenue) * 100 : 0;
  const margin = hasData ? ((report!.total_revenue - report!.pluppex_technology_fee) / report!.total_revenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Handshake className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Parceria Target × Pluppex</h2>
              <p className="text-sm text-slate-500">Distribuição de receita por origem comercial.</p>
            </div>
          </div>
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            title="Atualizar"
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {isLoading && !report ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Carregando relatório de parceria...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-rose-200 p-6">
          <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
          <p className="text-rose-600 font-semibold text-center">{error}</p>
          <button onClick={loadReport} className="mt-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-100">Tentar novamente</button>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 p-6">
          <PieChart className="w-16 h-16 text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">Nenhuma receita registrada neste período.</p>
          <p className="text-slate-400 text-sm mt-1">Transações com origem TARGET ou PLUPPEX aparecerão aqui.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Receita Total" value={fmt(report!.total_revenue)} unit="R$" color="emerald" icon={DollarSign} />
            <KpiCard label="Vendas Target" value={fmt(report!.target_sales)} unit="R$" color="blue" icon={TrendingUp} />
            <KpiCard label="Vendas Pluppex" value={fmt(report!.pluppex_sales)} unit="R$" color="violet" icon={TrendingUp} />
            <KpiCard label="Repasse Pluppex" value={fmt(report!.pluppex_technology_fee)} unit="R$" color="amber" icon={DollarSign} />
          </div>

          {/* Bar breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-5">Distribuição por Origem</h3>
            
            <div className="space-y-5">
              <OriginBar label="Target Agrotech" percent={targetPct} value={report!.target_sales} colorClass="bg-blue-500" />
              <OriginBar label="Pluppex" percent={pluppexPct} value={report!.pluppex_sales} colorClass="bg-violet-500" />
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Margem Líquida Parceria</p>
                <p className={cn('text-2xl font-extrabold mt-1', margin >= 60 ? 'text-emerald-600' : margin >= 40 ? 'text-amber-600' : 'text-rose-600')}>
                  {margin.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400 mt-1">após repasse de tecnologia</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultado Líquido</p>
                <p className="text-2xl font-extrabold mt-1 text-slate-800">
                  R$ {fmt(report!.total_revenue - report!.pluppex_technology_fee)}
                </p>
                <p className="text-xs text-slate-400 mt-1">receita total − repasse</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, unit, color, icon: Icon }: { label: string; value: string; unit: string; color: string; icon: any }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <div className={cn('rounded-2xl border p-4', colorMap[color])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} />
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-xl font-extrabold">{unit} {value}</p>
    </div>
  );
}

function OriginBar({ label, percent, value, colorClass }: { label: string; percent: number; value: number; colorClass: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <div className="text-right">
          <span className="text-sm font-bold text-slate-800">R$ {fmt(value)}</span>
          <span className="text-xs text-slate-400 ml-2">({percent.toFixed(1)}%)</span>
        </div>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', colorClass)}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
