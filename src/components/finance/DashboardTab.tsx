import { useState, useEffect } from 'react';
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Users, 
  Calendar, 
  PieChart as PieIcon, 
  BarChart3, 
  GraduationCap,
  Zap,
  ArrowUpRight,
  Target,
  Activity,
  ArrowRight
} from 'lucide-react';
import { transactionService } from '../../services/transactionService';
import { partnerRevenueService } from '../../services/partnerRevenueService';
import { getSupabaseClient } from '../../lib/supabase';
import { FinanceKPIs } from '../../types/finance_v2';
import { fmt, cn } from '../../lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

export function DashboardTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [kpis, setKpis] = useState<FinanceKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [originData, setOriginData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [turmaTrendData, setTurmaTrendData] = useState<any[]>([]);
  const [topTurmas, setTopTurmas] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const [kpiData, txs, partnerData, categoriesRes] = await Promise.all([
          transactionService.getKPIs({ startDate, endDate }),
          transactionService.getCashFlowTransactions(startDate, endDate),
          partnerRevenueService.getPartnerReport(startDate, endDate),
          supabase.from('financial_categories').select('id, name')
        ]);

        setKpis(kpiData);

        // 1. Generate ALL dates in range to fill gaps
        const dateRange: string[] = [];
        let curr = new Date(startDate + 'T12:00:00');
        const last = new Date(endDate + 'T12:00:00');
        while (curr <= last) {
          dateRange.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }

        // 2. Daily Trend Data (Filled)
        const daily: Record<string, { date: string; income: number; expense: number }> = {};
        dateRange.forEach(d => { daily[d] = { date: d, income: 0, expense: 0 }; });
        
        txs.forEach(t => {
          const date = (t.payment_date || t.created_at || '').split('T')[0];
          if (!daily[date]) return;

          if (t.status === 'PAID' || t.origin_type === 'PIPELINE') {
            if (t.type === 'INCOME') daily[date].income += Number(t.amount) || 0;
            else daily[date].expense += Number(t.amount) || 0;
          }
        });
        setChartData(Object.values(daily));

        // 3. Origin Data
        setOriginData([
          { name: 'Target', value: partnerData.target_sales },
          { name: 'Pluppex', value: partnerData.pluppex_sales }
        ].filter(d => d.value > 0));

        // 4. Category Data
        const catMap: Record<string, number> = {};
        const catNames: Record<string, { name: string }> = {};
        (categoriesRes.data || []).forEach((c: { id: string; name: string }) => {
          catNames[c.id] = { name: c.name };
        });

        txs.forEach(t => {
          if (t.type === 'INCOME') {
            const catId = t.category_id || 'unassigned';
            const catName = t.financial_categories?.name || catNames[catId]?.name || (t.origin_type === 'PIPELINE' ? 'Vendas' : 'Outros');
            catMap[catName] = (catMap[catName] || 0) + (Number(t.amount) || 0);
          }
        });

        setCategoryData(Object.entries(catMap).map(([name, value], idx) => ({
          name,
          value,
          color: COLORS[idx % COLORS.length]
        })).sort((a, b) => b.value - a.value));

        // 5. Turma Trend Data (Filled)
        const turmaDaily: Record<string, Record<string, number>> = {};
        const turmaTotals: Record<string, number> = {};
        dateRange.forEach(d => { turmaDaily[d] = {}; });
        
        txs.forEach(t => {
          if (t.type === 'INCOME' && (t.status === 'PAID' || t.origin_type === 'PIPELINE')) {
            const date = (t.payment_date || t.created_at || '').split('T')[0];
            const turmaName = t.turmas?.name || (t as any).turma_name || 'Sem Turma';
            if (!turmaDaily[date]) return;

            turmaDaily[date][turmaName] = (turmaDaily[date][turmaName] || 0) + (Number(t.amount) || 0);
            turmaTotals[turmaName] = (turmaTotals[turmaName] || 0) + (Number(t.amount) || 0);
          }
        });

        const sortedTurmas = Object.entries(turmaTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(t => t[0]);
        
        setTopTurmas(sortedTurmas);

        const trend = dateRange.map(date => {
          const values = turmaDaily[date] || {};
          const entry: any = { date };
          sortedTurmas.forEach(name => {
            entry[name] = values[name] || 0;
          });
          const otherTotal = Object.entries(values)
            .filter(([name]) => !sortedTurmas.includes(name))
            .reduce((sum, [_, val]) => sum + val, 0);
          if (otherTotal > 0) entry['Outras'] = otherTotal;
          
          return entry;
        });

        setTurmaTrendData(trend);

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
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin opacity-20" />
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-4">Processando Dashboard...</p>
      </div>
    );
  }

  // --- Premium UI Components ---
  const MiniCard = ({ title, value, color, icon: Icon, sub }: any) => (
    <div className="flex flex-col p-5 rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md group relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
          color === 'emerald' ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white group-hover:rotate-12' : 
          color === 'rose' ? 'bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white group-hover:rotate-12' : 
          'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white group-hover:rotate-12'
        )}>
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <p className="text-2xl font-black text-slate-800 tracking-tighter mb-1">R$ {fmt(value || 0)}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{sub}</span>
        {color === 'emerald' && <ArrowUpRight size={10} className="text-emerald-500" />}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniCard title="Receita Realizada" value={kpis?.receita_total} color="emerald" icon={TrendingUp} sub="Consolidado Período" />
        <MiniCard title="Despesas Totais" value={kpis?.despesa_total} color="rose" icon={TrendingDown} sub="Operacional + Fixos" />
        
        {/* Profit Highlight Card */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <DollarSign size={16} className="text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Lucro Líquido</span>
              </div>
              <p className="text-3xl font-black tracking-tighter">R$ {fmt(kpis?.lucro_liquido || 0)}</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase",
                (kpis?.lucro_liquido || 0) >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              )}>
                {(kpis?.lucro_liquido || 0) >= 0 ? 'Resultado Positivo' : 'Resultado Negativo'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{kpis?.margem_liquida?.toFixed(1)}% Margem</span>
            </div>
          </div>
          <div className="relative z-10 text-right">
            <Zap size={48} className="text-emerald-500 opacity-20 mb-2 ml-auto" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-tight">Relatório de Performance <br/>Consolidada</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Fluxo Chart */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-emerald-500" />
                  Fluxo de Caixa
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Saldos diários de entradas e saídas</p>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                  <span className="text-[10px] font-black text-slate-500 uppercase">Entradas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200" />
                  <span className="text-[10px] font-black text-slate-500 uppercase">Saídas</span>
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      tickFormatter={(val) => new Date(val + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `R$ ${fmt(val)}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} 
                      labelStyle={{ fontWeight: 900, color: '#1e293b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}
                      formatter={(val: number) => [`R$ ${fmt(val)}`, '']} 
                    />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest">Sem movimentações</div>
              )}
            </div>
          </div>

          {/* Turma Desempenho Section */}
          <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap size={16} className="text-indigo-500" />
                  Performance por Turma
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Evolução de faturamento das turmas core</p>
              </div>
              <div className="flex items-center gap-2">
                 <span className="px-2 py-1 bg-slate-50 text-slate-400 text-[8px] font-black rounded uppercase">Top 5 Turmas Ativas</span>
              </div>
            </div>

            <div className="h-[320px] w-full">
              {turmaTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={turmaTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      {topTurmas.map((name, i) => (
                        <linearGradient key={`grad-${i}`} id={`colorTurma-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      tickFormatter={(val) => new Date(val + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `R$ ${fmt(val)}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} 
                      labelStyle={{ fontWeight: 900, color: '#1e293b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}
                      formatter={(val: number) => [`R$ ${fmt(val)}`, '']} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', paddingTop: '20px' }} />
                    {topTurmas.map((name, i) => (
                      <Area 
                        key={name}
                        type="monotone" 
                        dataKey={name} 
                        stackId="1"
                        stroke={COLORS[i % COLORS.length]} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill={`url(#colorTurma-${i})`} 
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest">Sem turmas processadas</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          
          {/* Projeção Financeira Premium */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Target size={14} className="text-slate-400" />
              Projeção Financeira
            </h3>
            
            <div className="space-y-4">
              <div className="group cursor-default">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">A Receber Total</p>
                    <p className="text-lg font-black text-emerald-600 tracking-tighter">R$ {fmt(kpis?.contas_receber || 0)}</p>
                  </div>
                  <ArrowRight size={12} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </div>
                <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase">
                  <span>Matrículas: R$ {fmt(kpis?.contas_receber_matriculas || 0)}</span>
                  <span>Manual: R$ {fmt(kpis?.contas_receber_manual || 0)}</span>
                </div>
              </div>

              <div className="group cursor-default">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">A Pagar Total</p>
                    <p className="text-lg font-black text-rose-600 tracking-tighter">R$ {fmt(kpis?.contas_pagar || 0)}</p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '30%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Alunos Ganhos Premium */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-45 transition-transform duration-700">
              <Users size={80} />
            </div>
            <div className="relative">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Novas Matrículas</h3>
              <div className="flex items-end gap-2 mb-4">
                <p className="text-4xl font-black tracking-tighter">{kpis?.alunos_ganhos || 0}</p>
                <span className="text-[10px] font-bold text-emerald-400 mb-2 flex items-center">
                  <ArrowUpRight size={12} />
                  +12%
                </span>
              </div>
              <p className="text-[10px] text-white/40 font-bold leading-tight">Alunos convertidos e ativos <br/>dentro do período selecionado.</p>
            </div>
          </div>

          {/* Origem Doughnut */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Origem da Receita</h3>
            <div className="h-[200px] w-full">
              {originData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={originData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                      {originData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => `R$ ${fmt(val)}`} 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-[8px] font-black uppercase">Vazio</div>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4">
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Target</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Pluppex</span></div>
            </div>
          </div>

          {/* Categorias Bar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Ranking Categorias</h3>
            <div className="h-[250px] w-full">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: -10, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => `R$ ${fmt(val)}`} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={12}>
                      {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-[8px] font-black uppercase">Vazio</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
