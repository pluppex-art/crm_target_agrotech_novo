import { useEffect, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Users, CheckCircle2,
  BarChart2, ArrowRight, Loader2, ShoppingBag, Percent
} from 'lucide-react';
import { useLeadStore } from '../store/useLeadStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { cn, getLeadEffectiveValue } from '../lib/utils';

type View = 'all' | 'sales' | 'finance';

function MetricCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  key?: string | number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CSSBarChart({
  data,
  color = 'bg-emerald-500',
  emptyLabel = 'Sem dados ainda',
}: {
  data: { label: string; value: number }[];
  color?: string;
  emptyLabel?: string;
  key?: string | number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const hasData = data.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-300">
        <BarChart2 className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-xs font-medium">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 h-40 w-full">
      {data.map((d, i) => {
        const pct = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={`${d.label}-${i}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <span className="text-[9px] font-bold text-slate-500">
              {d.value > 0 ? (d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value) : ''}
            </span>
            <div
              className={cn('w-full rounded-t-md transition-all', color)}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-[9px] text-slate-400 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBar({
  label, value, max, color, rank,
}: {
  label: string; value: number; max: number; color: string; rank: number;
  key?: string | number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}º`;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{medal}</span>
          <span className="text-sm font-semibold text-slate-700">{label}</span>
        </div>
        <span className="text-xs font-bold text-slate-400">{value} leads</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export function Dashboard() {
  const [view, setView] = useState<View>('all');
  const navigate = useNavigate();
  const { leads, fetchLeads, isLoading: leadsLoading } = useLeadStore();
  const { transactions, fetchTransactions, isLoading: financeLoading } = useFinanceStore();

  useEffect(() => {
    fetchLeads();
    fetchTransactions();
  }, [fetchLeads, fetchTransactions]);

  const isLoading = leadsLoading || financeLoading;

  // ── Finance metrics ──────────────────────────────────────────────
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const netProfit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const avgIncome = incomeTransactions.length > 0 ? totalIncome / incomeTransactions.length : 0;

  // ── Sales metrics ────────────────────────────────────────────────
  const closedLeads = leads.filter(l => l.status === 'closed');
  const conversionRate = leads.length > 0 ? (closedLeads.length / leads.length) * 100 : 0;
  const avgTicket = closedLeads.length > 0
    ? closedLeads.reduce((s, l) => s + getLeadEffectiveValue(l), 0) / closedLeads.length
    : 0;
  const totalSalesValue = closedLeads.reduce((s, l) => s + getLeadEffectiveValue(l), 0);

  // ── Chart data ───────────────────────────────────────────────────
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      label: d.toLocaleString('pt-BR', { month: 'short' }),
      month: d.getMonth(),
      year: d.getFullYear(),
    };
  });

  const monthlyIncome = last6Months.map(({ label, month, year }) => ({
    label,
    value: transactions
      .filter(t => t.type === 'income' && new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year)
      .reduce((s, t) => s + t.amount, 0),
  }));

  const monthlyExpense = last6Months.map(({ label, month, year }) => ({
    label,
    value: transactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year)
      .reduce((s, t) => s + Math.abs(t.amount), 0),
  }));

  const salesByProduct = Object.values(
    closedLeads.filter(l => l.product).reduce((acc: Record<string, { label: string; value: number }>, l) => {
      const key = l.product;
      acc[key] = acc[key] || { label: key, value: 0 };
      acc[key].value += getLeadEffectiveValue(l);
      return acc;
    }, {})
  );

  const salesByResponsible = Object.values(
    leads.filter(l => l.responsible).reduce((acc: Record<string, { label: string; value: number }>, l) => {
      const key = l.responsible!;
      acc[key] = acc[key] || { label: key, value: 0 };
      acc[key].value += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  const incomeByCategory = Object.values(
    transactions.filter(t => t.type === 'income' && t.category).reduce((acc: Record<string, { label: string; value: number }>, t) => {
      const key = t.category!;
      acc[key] = acc[key] || { label: key, value: 0 };
      acc[key].value += t.amount;
      return acc;
    }, {})
  );

  const expenseByCategory = Object.values(
    transactions.filter(t => t.type === 'expense' && t.category).reduce((acc: Record<string, { label: string; value: number }>, t) => {
      const key = t.category!;
      acc[key] = acc[key] || { label: key, value: 0 };
      acc[key].value += Math.abs(t.amount);
      return acc;
    }, {})
  );

  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // ── Pipeline columns ─────────────────────────────────────────────
  const pipeline = [
    { id: 'new', label: 'Em Aberto', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600' },
    { id: 'qualified', label: 'Qualificados', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600' },
    { id: 'proposal', label: 'Proposta', color: 'bg-purple-500', light: 'bg-purple-50 text-purple-600' },
    { id: 'closed', label: 'Fechados', color: 'bg-rose-500', light: 'bg-rose-50 text-rose-600' },
  ] as const;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#f3f6f9] min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {view === 'all' ? 'Dashboard' : view === 'sales' ? 'Dashboard de Vendas' : 'Dashboard Financeiro'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {view === 'all' ? 'Visão geral do CRM.' : view === 'sales' ? 'Performance comercial e pipeline.' : 'Fluxo de caixa e transações.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex gap-1">
            {(['all', 'sales', 'finance'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-4 py-1.5 text-xs font-bold rounded-lg transition-all',
                  view === v ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {v === 'all' ? 'Tudo' : v === 'sales' ? 'Vendas' : 'Financeiro'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── VENDAS view ─────────────────────────────────────────── */}
      {(view === 'all' || view === 'sales') && (
        <div key="dashboard-sales-section">
          {/* Sales metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <MetricCard label="Leads Ativos" value={String(leads.length)} icon={Users} color="bg-emerald-50 text-emerald-600" />
            <MetricCard label="Fechados" value={String(closedLeads.length)} icon={CheckCircle2} color="bg-blue-50 text-blue-600" />
            <MetricCard label="Conversão" value={`${conversionRate.toFixed(1)}%`} icon={Percent} color="bg-purple-50 text-purple-600" />
            <MetricCard label="Ticket Médio" value={`R$ ${fmt(avgTicket)}`} icon={DollarSign} color="bg-amber-50 text-amber-600" />
            <MetricCard label="Total Vendas" value={`R$ ${fmt(totalSalesValue)}`} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
            <MetricCard
              label="Em Proposta"
              value={String(leads.filter(l => l.status === 'proposal').length)}
              icon={ShoppingBag}
              color="bg-rose-50 text-rose-600"
            />
          </div>

          {/* Ranking + Sales by product */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-6">Ranking de Vendedores</h3>
              {salesByResponsible.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                  <Users className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-medium">Sem dados ainda</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {salesByResponsible.slice(0, 5).map((s, i) => (
                    <HorizontalBar
                      key={`rank-${s.label}-${i}`}
                      label={s.label}
                      value={s.value}
                      max={salesByResponsible[0]?.value || 1}
                      rank={i}
                      color={i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-400' : 'bg-slate-300'}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Vendas por Produto</h3>
              <CSSBarChart data={salesByProduct} color="bg-blue-500" emptyLabel="Nenhuma venda fechada ainda" />
            </div>
          </div>

          {/* Pipeline summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Pipeline</h3>
              <button
                onClick={() => navigate('/pipeline')}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
              >
                Ver completo <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {pipeline.map(col => {
                  const colLeads = leads.filter(l => l.status === col.id);
                  const total = colLeads.reduce((s, l) => s + getLeadEffectiveValue(l), 0);
                  return (
                   <div key={col.id} className="p-4 sm:p-6">
                    <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold mb-3', col.light)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', col.color)} />
                      {col.label}
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{colLeads.length}</p>
                    <p className="text-xs text-slate-400 mt-1">R$ {fmt(total)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FINANCEIRO view ─────────────────────────────────────── */}
      {(view === 'all' || view === 'finance') && (
        <div key="dashboard-finance-section">
          {/* Finance metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <MetricCard label="Receita Total" value={`R$ ${fmt(totalIncome)}`} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
            <MetricCard label="Despesas" value={`R$ ${fmt(totalExpense)}`} icon={TrendingDown} color="bg-rose-50 text-rose-600" />
            <MetricCard
              label="Resultado"
              value={`R$ ${fmt(Math.abs(netProfit))}`}
              sub={netProfit >= 0 ? 'Positivo' : 'Negativo'}
              icon={DollarSign}
              color={netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}
            />
            <MetricCard label="Margem" value={`${margin.toFixed(1)}%`} icon={Percent} color="bg-blue-50 text-blue-600" />
            <MetricCard label="Transações" value={String(transactions.length)} icon={BarChart2} color="bg-purple-50 text-purple-600" />
            <MetricCard label="Ticket Médio" value={`R$ ${fmt(avgIncome)}`} icon={ShoppingBag} color="bg-amber-50 text-amber-600" />
          </div>

          {/* Monthly charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Receitas Mensais</h3>
              <CSSBarChart data={monthlyIncome} color="bg-emerald-500" emptyLabel="Nenhuma receita registrada" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Despesas Mensais</h3>
              <CSSBarChart data={monthlyExpense} color="bg-rose-400" emptyLabel="Nenhuma despesa registrada" />
            </div>
          </div>

          {/* Category breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Receita por Categoria</h3>
              <CSSBarChart data={incomeByCategory} color="bg-teal-500" emptyLabel="Sem categorias de receita" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Despesa por Categoria</h3>
              <CSSBarChart data={expenseByCategory} color="bg-orange-400" emptyLabel="Sem categorias de despesa" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
