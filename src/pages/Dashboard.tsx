import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Users, CheckCircle2,
  BarChart2, ArrowRight, Loader2, ShoppingBag, Percent, ShieldAlert
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useLeadStore } from '../store/useLeadStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useProfileStore } from '../store/useProfileStore';
import { cn, getLeadEffectiveValue, stageNameToStatus } from '../lib/utils';
import { MetricCard } from '../components/dashboard/MetricCard';
import { CSSBarChart } from '../components/dashboard/CSSBarChart';
import { HorizontalBar } from '../components/dashboard/HorizontalBar';

type View = 'all' | 'sales' | 'finance';

export function Dashboard() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [view, setView] = useState<View>('all');
  const navigate = useNavigate();

  const { transactions, fetchTransactions, isLoading: financeLoading, subscribe: subscribeFinance } = useFinanceStore();
  const { leads, fetchLeads, isLoading: leadsLoading, subscribeToLeads } = useLeadStore();
  const { profiles, fetchProfiles } = useProfileStore();

  // Use refs to run fetch only once — avoids infinite loop caused by
  // Zustand functions being recreated on every store update
  const didFetch = useRef(false);
  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    fetchLeads();
    fetchTransactions();
    fetchProfiles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscriptions — run once on mount
  useEffect(() => {
    const unsubLeads = subscribeToLeads();
    const unsubFinance = subscribeFinance();
    return () => {
      unsubLeads?.();
      unsubFinance?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = leadsLoading || financeLoading;

  // ── Finance metrics ──────────────────────────────────────────────
  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions]
  );

  const totalExpense = useMemo(
    () => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions]
  );

  const netProfit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const incomeTransactions = useMemo(() => transactions.filter(t => t.type === 'income'), [transactions]);
  const avgIncome = incomeTransactions.length > 0 ? totalIncome / incomeTransactions.length : 0;

  // ── Sales metrics ────────────────────────────────────────────────
  const closedLeads = useMemo(() => leads.filter(l => stageNameToStatus(l.status) === 'closed'), [leads]);
  const conversionRate = leads.length > 0 ? (closedLeads.length / leads.length) * 100 : 0;
  const avgTicket = useMemo(
    () => closedLeads.length > 0
      ? closedLeads.reduce((s, l) => s + getLeadEffectiveValue(l), 0) / closedLeads.length
      : 0,
    [closedLeads]
  );
  const totalSalesValue = useMemo(
    () => closedLeads.reduce((s, l) => s + getLeadEffectiveValue(l), 0),
    [closedLeads]
  );

  // ── Chart data ───────────────────────────────────────────────────
  const last6Months = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        label: d.toLocaleString('pt-BR', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear(),
      };
    }), []
  );

  const monthlyIncome = useMemo(() =>
    last6Months.map(({ label, month, year }) => ({
      label,
      value: transactions
        .filter(t => t.type === 'income' && new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year)
        .reduce((s, t) => s + t.amount, 0),
    })),
    [last6Months, transactions]
  );

  const monthlyExpense = useMemo(() =>
    last6Months.map(({ label, month, year }) => ({
      label,
      value: transactions
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year)
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    })),
    [last6Months, transactions]
  );

  const salesByProduct = useMemo(() =>
    Object.values(
      closedLeads.filter(l => l.product).reduce((acc: Record<string, { label: string; value: number }>, l) => {
        const key = l.product;
        acc[key] = acc[key] || { label: key, value: 0 };
        acc[key].value += getLeadEffectiveValue(l);
        return acc;
      }, {})
    ),
    [closedLeads]
  );

  const salesByResponsible = useMemo(() =>
    Object.values(
      closedLeads.filter(l => l.responsible).reduce((acc: Record<string, { label: string; value: number; count: number }>, l) => {
        const key = l.responsible!;
        acc[key] = acc[key] || { label: key, value: 0, count: 0 };
        acc[key].value += getLeadEffectiveValue(l);
        acc[key].count += 1;
        return acc;
      }, {})
    ).sort((a, b) => b.value - a.value),
    [closedLeads]
  );

  const allSellersRanking = useMemo(() => {
    const byName: Record<string, { label: string; value: number; count: number }> = {};
    salesByResponsible.forEach(s => { byName[s.label] = s; });
    profiles.filter(p => p.name).forEach(p => {
      if (!byName[p.name!]) byName[p.name!] = { label: p.name!, value: 0, count: 0 };
    });
    return Object.values(byName).sort((a, b) => b.value - a.value);
  }, [salesByResponsible, profiles]);

  const incomeByCategory = useMemo(() =>
    Object.values(
      transactions.filter(t => t.type === 'income' && t.category).reduce((acc: Record<string, { label: string; value: number }>, t) => {
        const key = t.category!;
        acc[key] = acc[key] || { label: key, value: 0 };
        acc[key].value += t.amount;
        return acc;
      }, {})
    ),
    [transactions]
  );

  const expenseByCategory = useMemo(() =>
    Object.values(
      transactions.filter(t => t.type === 'expense' && t.category).reduce((acc: Record<string, { label: string; value: number }>, t) => {
        const key = t.category!;
        acc[key] = acc[key] || { label: key, value: 0 };
        acc[key].value += Math.abs(t.amount);
        return acc;
      }, {})
    ),
    [transactions]
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

  if (permissionsLoading) return null;

  if (!hasPermission('dashboard.view') && !hasPermission('admin.all')) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-28 h-28 bg-slate-200 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
          <ShieldAlert className="w-16 h-16 text-slate-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-4">Dashboard Privado</h2>
        <p className="text-xl text-slate-500 max-w-lg mb-8 leading-relaxed">Você precisa da permissão <code className="bg-slate-100 px-3 py-1.5 rounded-xl text-lg font-mono text-slate-700 shadow-sm border">dashboard.view</code> para acessar.</p>
        <p className="text-sm text-slate-400 uppercase tracking-widest font-bold">Contate o administrador</p>
      </div>
    );
  }

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
        <div>
          {/* Sales metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <MetricCard label="Leads Ativos" value={String(leads.length)} icon={Users} color="bg-emerald-50 text-emerald-600" />
            <MetricCard label="Fechados" value={String(closedLeads.length)} icon={CheckCircle2} color="bg-blue-50 text-blue-600" />
            <MetricCard label="Conversão" value={`${conversionRate.toFixed(1)}%`} icon={Percent} color="bg-purple-50 text-purple-600" />
            <MetricCard label="Total Vendas" value={`R$ ${fmt(totalSalesValue)}`} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
            <MetricCard
              label="Em Proposta"
              value={String(leads.filter(l => stageNameToStatus(l.status) === 'proposal').length)}
              icon={ShoppingBag}
              color="bg-rose-50 text-rose-600"
            />
            <MetricCard label="Ticket Médio" value={`R$ ${fmt(avgTicket)}`} icon={DollarSign} color="bg-amber-50 text-amber-600" />
          </div>

          {/* Ranking + Sales by product */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-6">Ranking de Vendedores</h3>
              {allSellersRanking.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                  <Users className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-medium">Sem dados ainda</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {allSellersRanking.slice(0, 7).map((s, i) => (
                    <HorizontalBar
                      key={`rank-${s.label}-${i}`}
                      label={s.label}
                      value={s.value}
                      max={allSellersRanking[0]?.value || 1}
                      rank={i}
                      isCurrency={true}
                      count={s.count}
                      color={i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-purple-400' : 'bg-slate-300'}
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
                const colLeads = leads.filter(l => stageNameToStatus(l.status) === col.id);
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
        <div>
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
