import { useState, useEffect, useCallback } from 'react';
import { 
  Handshake, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  Rocket,
  ShieldCheck,
  CreditCard,
  Cpu,
  BarChart3,
  CheckCircle2,
  Zap,
  GraduationCap
} from 'lucide-react';
import { partnerRevenueService, PartnerReport } from '../../services/partnerRevenueService';
import { fmt, cn } from '../../lib/utils';
import { safePartnerReport } from '../../calculations/partnerMetrics';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

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
    } catch (err: any) {
      console.error('[PartnerTab] Error:', err);
      setError(err?.message || 'Falha na conexão.');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // --- Metric Item (Compact) ---
  const MetricItem = ({ title, value, color, icon: Icon, sub }: any) => (
    <div className="flex flex-col p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md group">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
          color === 'green' ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : 
          color === 'violet' ? 'bg-violet-50 text-violet-500 group-hover:bg-violet-500 group-hover:text-white' : 
          'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-900 group-hover:text-white'
        )}>
          <Icon size={16} />
        </div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <p className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">R$ {fmt(value || 0)}</p>
      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{sub}</p>
    </div>
  );

  if (isLoading && !report) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px]">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin opacity-20" />
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-4">Sincronizando...</p>
      </div>
    );
  }

  function Loader2({ className }: { className?: string }) {
    return <RefreshCw className={cn("animate-spin", className)} />;
  }

  const safeR = safePartnerReport(report);

  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in duration-500 px-4">
      
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-100">
            <Handshake size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight uppercase leading-none mb-1">Parceria Estratégica</h2>
            <div className="flex items-center gap-2">
              <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest leading-none">Target × Pluppex</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg shadow-sm border border-slate-800">
              <BarChart3 size={12} className="text-indigo-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-wider">
                {safeR._debug?.txCount || 0} <span className="text-slate-400 ml-0.5">Transações</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 rounded-lg shadow-sm border border-emerald-500">
              <CheckCircle2 size={12} className="text-emerald-100" />
              <span className="text-[10px] font-black text-white uppercase tracking-wider">
                {safeR.total_matriculas || 0} <span className="text-emerald-100/60 ml-0.5">Ganhos</span>
              </span>
            </div>
          </div>

          <button
            onClick={loadReport}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg transition-all text-slate-400 group"
          >
            <RefreshCw size={16} className={cn("group-hover:text-emerald-600", isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricItem title="Faturamento Bruto" value={safeR.total_revenue} color="slate" icon={TrendingUp} sub="Volume Consolidado" />
        <MetricItem title="Fee Fixo Total" value={safeR.fixed_fee_total} color="violet" icon={CreditCard} sub="Taxas Fixas de Operação" />
        <MetricItem title="Média / Turma" value={safeR.average_commission_per_turma} color="green" icon={BarChart3} sub="Média Comissão por Turma" />
        <MetricItem title="Performance Pluppex" value={safeR.pluppex_sales} color="violet" icon={Rocket} sub="Pluppex Squad Sales" />
      </div>

      {/* Resultados e Margem */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-6 rounded-2xl bg-emerald-600 text-white flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white dark:bg-slate-900/10 rounded-full blur-3xl -mr-24 -mt-24" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-white dark:bg-slate-900/20 flex items-center justify-center">
                <DollarSign size={14} className="text-white" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Resultado Líquido Target</span>
            </div>
            <Zap size={16} className="text-white opacity-40" />
          </div>
          <div className="relative">
            <p className="text-4xl font-black tracking-tighter leading-none mb-3">R$ {fmt(safeR.target_net_result || 0)}</p>
            <div className="flex items-center gap-2">
              <div className="px-1.5 py-0.5 bg-white dark:bg-slate-900/20 rounded text-white text-[7px] font-black tracking-widest uppercase">Target Revenue</div>
              <span className="text-[9px] text-white/40 font-bold italic">Líquido após taxas tech</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Margem Real</span>
            <ShieldCheck size={14} className="text-emerald-500/30" />
          </div>
          <div className="my-4">
            <p className="text-4xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">{safeR.net_margin?.toFixed(1) || '0.0'}%</p>
            <div className="mt-3 h-1 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000" 
                style={{ width: `${Math.min(safeR.net_margin || 0, 100)}%` }} 
              />
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-none text-right">Eficiência Squad</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Evolução Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evolução Comparativa</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Target</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-violet-500" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Pluppex</span>
                </div>
              </div>
            </div>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={safeR.chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.05} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPluppex" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 900, color: '#1e293b', fontSize: '11px', marginBottom: '4px' }}
                    formatter={(value: number) => [`R$ ${fmt(value)}`, '']}
                  />
                  <Area type="monotone" dataKey="target" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTarget)" />
                  <Area type="monotone" dataKey="pluppex" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPluppex)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Turmas Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance por Turma (BPO)</h3>
              <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[8px] font-black rounded uppercase">
                {safeR.turmas?.length || 0} Turmas Ativas
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Turma</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Matrículas</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Receita Total</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">BPO Target (8%)</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right text-violet-600">BPO Pluppex (18%)</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total BPO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(safeR.turmas || []).map((turma) => (
                    <tr key={turma.class_id} className="hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="w-4 h-4 text-slate-300" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{turma.class_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black">
                          {turma.total_matriculas}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400 tracking-tight">R$ {fmt(turma.receita_total)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-tight">R$ {fmt(turma.bpo_target)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-violet-600 tracking-tight">R$ {fmt(turma.bpo_pluppex)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight">R$ {fmt(turma.total_bpo)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Sidebar Repasses */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 text-violet-500">Repasses Pluppex</h3>
          
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl p-4 shadow-lg shadow-violet-100 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 opacity-10 group-hover:scale-110 transition-transform">
              <Cpu size={64} />
            </div>
            <div className="relative flex items-center gap-2 mb-2">
              <CreditCard size={14} className="text-white/60" />
              <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Tecnologia Total</p>
            </div>
            <p className="text-xl font-black tracking-tighter relative">R$ {fmt(safeR.pluppex_technology_fee || 0)}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-1">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Fee Fixo</span>
                <span className="text-xs font-black text-indigo-500 tracking-tighter">R$ {fmt(safeR.fixed_fee_total || 0)}</span>
              </div>
              <div className="h-0.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full">
                <div className="h-full bg-indigo-500 w-full rounded-full opacity-30" />
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-1">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Target Fee</span>
                <span className="text-xs font-black text-emerald-500 tracking-tighter">R$ {fmt(safeR.target_fee || 0)}</span>
              </div>
              <div className="h-0.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full">
                <div className="h-full bg-emerald-500 w-1/3 rounded-full opacity-30" />
              </div>
            </div>
            
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-1">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Pluppex Fee</span>
                <span className="text-xs font-black text-violet-500 tracking-tighter">R$ {fmt(safeR.pluppex_fee || 0)}</span>
              </div>
              <div className="h-0.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full">
                <div className="h-full bg-violet-500 w-1/2 rounded-full opacity-30" />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 flex flex-col items-center justify-center text-center">
            <p className="text-[7px] text-violet-400 font-black uppercase tracking-widest leading-tight">
              Pluppex Technology Fee Agreement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
