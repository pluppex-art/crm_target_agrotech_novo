import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Percent, Users, Calendar, PieChart as PieIcon, BarChart3, GraduationCap } from 'lucide-react';
import { transactionService } from '../../services/transactionService';
import { partnerRevenueService } from '../../services/partnerRevenueService';
import { getSupabaseClient } from '../../lib/supabase';
import { FinanceKPIs } from '../../types/finance_v2';
import { MetricCard } from '../dashboard/MetricCard';
import { fmt } from '../../lib/utils';
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

        // 1. Daily Trend Data
        const daily: Record<string, { date: string; income: number; expense: number }> = {};
        txs.forEach(t => {
          const date = (t.payment_date || t.created_at || '').split('T')[0];
          if (!date || date < startDate || date > endDate) return;
          if (!daily[date]) daily[date] = { date, income: 0, expense: 0 };

          if (t.status === 'PAID' || t.origin_type === 'PIPELINE') {
            if (t.type === 'INCOME') daily[date].income += Number(t.amount) || 0;
            else daily[date].expense += Number(t.amount) || 0;
          }
        });
        setChartData(Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)));

        // 2. Origin Data
        setOriginData([
          { name: 'Target', value: partnerData.target_sales },
          { name: 'Pluppex', value: partnerData.pluppex_sales }
        ].filter(d => d.value > 0));

        // 3. Category Data
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

        // 4. Turma Trend Data (Performance by Class)
        const turmaDaily: Record<string, Record<string, number>> = {};
        const turmaTotals: Record<string, number> = {};
        
        txs.forEach(t => {
          if (t.type === 'INCOME' && (t.status === 'PAID' || t.origin_type === 'PIPELINE')) {
            const date = (t.payment_date || t.created_at || '').split('T')[0];
            const turmaName = t.turmas?.name || (t as any).turma_name || 'Sem Turma';
            if (!date || date < startDate || date > endDate) return;

            if (!turmaDaily[date]) turmaDaily[date] = {};
            turmaDaily[date][turmaName] = (turmaDaily[date][turmaName] || 0) + (Number(t.amount) || 0);
            turmaTotals[turmaName] = (turmaTotals[turmaName] || 0) + (Number(t.amount) || 0);
          }
        });

        // Get Top 5 Turmas by Revenue
        const sortedTurmas = Object.entries(turmaTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(t => t[0]);
        
        setTopTurmas(sortedTurmas);

        const trend = Object.entries(turmaDaily).map(([date, values]) => {
          const entry: any = { date };
          sortedTurmas.forEach(name => {
            entry[name] = values[name] || 0;
          });
          // Also track "Others"
          const otherTotal = Object.entries(values)
            .filter(([name]) => !sortedTurmas.includes(name))
            .reduce((sum, [_, val]) => sum + val, 0);
          if (otherTotal > 0) entry['Outras'] = otherTotal;
          
          return entry;
        }).sort((a, b) => a.date.localeCompare(b.date));

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
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* KPI Grid */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            label="Receita Realizada" 
            value={`R$ ${fmt(kpis.receita_total)}`} 
            icon={TrendingUp} 
            color="bg-emerald-50 text-emerald-600 border-emerald-100" 
          />
          <MetricCard 
            label="Despesas Totais" 
            value={`R$ ${fmt(kpis.despesa_total)}`} 
            icon={TrendingDown} 
            color="bg-rose-50 text-rose-600 border-rose-100" 
          />
          <MetricCard
            label="Lucro Líquido"
            value={`R$ ${fmt(Math.abs(kpis.lucro_liquido))}`}
            sub={kpis.lucro_liquido >= 0 ? 'Resultado Positivo' : 'Resultado Negativo'}
            icon={DollarSign}
            color={kpis.lucro_liquido >= 0 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-rose-50 text-rose-600 border-rose-100'}
          />
          <MetricCard 
            label="Margem Líquida" 
            value={`${kpis.margem_liquida.toFixed(1)}%`} 
            sub="Sobre faturamento"
            icon={Percent} 
            color="bg-indigo-50 text-indigo-600 border-indigo-100" 
          />
        </div>
      )}

      {/* Main Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fluxo de Caixa */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Fluxo de Caixa</h3>
              <p className="text-sm text-slate-500">Evolução diária de entradas e saídas</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Entradas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span>Saídas</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
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
                    axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => new Date(val + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `R$ ${fmt(val)}`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(val: number) => [`R$ ${fmt(val)}`, '']} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">Sem movimentações</div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Projeção Financeira
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500 font-medium">A Receber</span>
                  <span className="font-bold text-emerald-600">R$ {fmt(kpis?.contas_receber || 0)}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
                </div>
                {(kpis.contas_receber_matriculas > 0 || kpis.contas_receber_manual > 0) && (
                  <div className="mt-1.5 space-y-0.5">
                    {kpis.contas_receber_matriculas > 0 && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Saldo de matrículas</span>
                        <span>R$ {fmt(kpis.contas_receber_matriculas)}</span>
                      </div>
                    )}
                    {kpis.contas_receber_manual > 0 && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Cobranças manuais</span>
                        <span>R$ {fmt(kpis.contas_receber_manual)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">A Pagar</span>
                  <span className="font-bold text-rose-600">R$ {fmt(kpis?.contas_pagar || 0)}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: '40%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-24 h-24 rotate-12" /></div>
            <h3 className="text-sm font-medium text-slate-400 mb-1">Alunos Ganhos</h3>
            <div className="text-3xl font-bold mb-2">{kpis?.alunos_ganhos || 0}</div>
            <p className="text-xs text-slate-400">Novas matrículas no período.</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 w-fit px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>+12% vs anterior</span>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Vendas por Turma (Area Chart) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Desempenho por Turma</h3>
            <p className="text-sm text-slate-500">Evolução das vendas das top turmas no período</p>
          </div>
        </div>
        <div className="h-[350px] w-full">
          {turmaTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={turmaTrendData}>
                <defs>
                  {topTurmas.map((name, i) => (
                    <linearGradient key={`grad-${i}`} id={`colorTurma-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => new Date(val + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `R$ ${fmt(val)}`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(val: number) => [`R$ ${fmt(val)}`, '']} />
                <Legend iconType="circle" />
                {topTurmas.map((name, i) => (
                  <Area 
                    key={name}
                    type="monotone" 
                    dataKey={name} 
                    stackId="1"
                    stroke={COLORS[i % COLORS.length]} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill={`url(#colorTurma-${i})`} 
                  />
                ))}
                {turmaTrendData.some(d => d.Outras > 0) && (
                  <Area 
                    type="monotone" 
                    dataKey="Outras" 
                    stackId="1"
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    fillOpacity={0.1} 
                    fill="#94a3b8" 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 italic">Sem turmas vendidas no período</div>
          )}
        </div>
      </div>

      {/* Origin & Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg"><PieIcon className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Origem da Receita</h3>
              <p className="text-sm text-slate-500">Distribuição entre Target e Pluppex</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            {originData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={originData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {originData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val: number) => `R$ ${fmt(val)}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">Sem dados de origem</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 rounded-lg"><BarChart3 className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Receita por Categoria</h3>
              <p className="text-sm text-slate-500">Maiores entradas por classificação</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => `R$ ${fmt(val)}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">Sem categorias registradas</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
