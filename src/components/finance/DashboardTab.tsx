import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Percent, Users, Calendar } from 'lucide-react';
import { transactionService } from '../../services/transactionService';
import { getSupabaseClient } from '../../lib/supabase';
import { FinanceKPIs } from '../../types/finance_v2';
import { MetricCard } from '../dashboard/MetricCard';
import { fmt } from '../../lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export function DashboardTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [kpis, setKpis] = useState<FinanceKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const supabase = getSupabaseClient();

        const [kpiData, txs, taxaRes, valorRes] = await Promise.all([
          transactionService.getKPIs({ startDate, endDate }),
          transactionService.getAll({ paymentDateStart: startDate, paymentDateEnd: endDate }),
          supabase
            .from('lead_class_enrollments')
            .select('taxa_matricula_recebido, taxa_matricula_paid_at')
            .neq('status', 'CANCELLED')
            .gt('taxa_matricula_recebido', 0)
            .gte('taxa_matricula_paid_at', startDate + 'T00:00:00')
            .lte('taxa_matricula_paid_at', endDate + 'T23:59:59'),
          supabase
            .from('lead_class_enrollments')
            .select('valor_recebido, valor_recebido_paid_at')
            .neq('status', 'CANCELLED')
            .gt('valor_recebido', 0)
            .gte('valor_recebido_paid_at', startDate + 'T00:00:00')
            .lte('valor_recebido_paid_at', endDate + 'T23:59:59'),
        ]);
        setKpis(kpiData);

        // Build daily chart data from manual V2 transactions + enrollments by payment date
        const daily: Record<string, { date: string; income: number; expense: number }> = {};

        txs.forEach(t => {
          const date = (t.payment_date || t.created_at || '').split('T')[0];
          if (!date) return;
          if (!daily[date]) daily[date] = { date, income: 0, expense: 0 };
          if (t.status === 'PAID') {
            if (t.type === 'INCOME') daily[date].income += Number(t.amount) || 0;
            else daily[date].expense += Number(t.amount) || 0;
          }
        });

        (taxaRes.data || []).forEach((e: any) => {
          const date = (e.taxa_matricula_paid_at || '').split('T')[0];
          if (!date) return;
          const amt = Number(e.taxa_matricula_recebido) || 0;
          if (amt > 0) {
            if (!daily[date]) daily[date] = { date, income: 0, expense: 0 };
            daily[date].income += amt;
          }
        });
        (valorRes.data || []).forEach((e: any) => {
          const date = (e.valor_recebido_paid_at || '').split('T')[0];
          if (!date) return;
          const amt = Number(e.valor_recebido) || 0;
          if (amt > 0) {
            if (!daily[date]) daily[date] = { date, income: 0, expense: 0 };
            daily[date].income += amt;
          }
        });

        const sortedDaily = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
        setChartData(sortedDaily);

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
    <div className="space-y-6 animate-in fade-in duration-500">
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

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Fluxo de Caixa no Período</h3>
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
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => `R$ ${fmt(val)}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(val: number) => [`R$ ${fmt(val)}`, '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expense" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorExpense)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Nenhum dado de movimentação no período
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Projeção Financeira
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">A Receber</span>
                  <span className="font-bold text-emerald-600">R$ {fmt(kpis?.contas_receber || 0)}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '65%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">A Pagar</span>
                  <span className="font-bold text-rose-600">R$ {fmt(kpis?.contas_pagar || 0)}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '40%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Users className="w-24 h-24 rotate-12" />
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-1">Alunos Ganhos</h3>
            <div className="text-3xl font-bold mb-2">{kpis?.alunos_ganhos || 0}</div>
            <p className="text-xs text-slate-400">Novas matrículas realizadas no período selecionado.</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 w-fit px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>Alta de 12% vs mês anterior</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
