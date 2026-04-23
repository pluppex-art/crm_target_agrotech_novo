import { MetricCard } from './MetricCard';
import { ImprovedCSSBarChart } from './ImprovedCSSBarChart';
import { LineTrendChart } from './LineTrendChart';
import { GoalRing } from './GoalRing';
import { DollarSign, Percent, BarChart2, ShoppingBag, TrendingUp, TrendingDown } from 'lucide-react';
import type { FinanceMetrics } from '../../hooks/useFinanceMetrics';
import { fmt } from '../../lib/utils';

interface FinanceOverviewProps {
  finance: FinanceMetrics;
  netProfit: number;
  margin: number;
}

export function FinanceOverview({ finance, netProfit, margin }: FinanceOverviewProps) {
  return (
    <>
      {/* Finance metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricCard label="Receita Total" value={`R$ ${fmt(finance.totalIncome)}`} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Despesas" value={`R$ ${fmt(finance.totalExpense)}`} icon={TrendingDown} color="bg-rose-50 text-rose-600" />
        <MetricCard
          label="Resultado"
          value={`R$ ${fmt(Math.abs(netProfit))}`}
          sub={netProfit >= 0 ? 'Positivo' : 'Negativo'}
          icon={DollarSign}
          color={netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}
        />
        <MetricCard label="Margem" value={`${margin.toFixed(1)}%`} icon={Percent} color="bg-blue-50 text-blue-600" />
        <MetricCard label="Transações" value={String(finance.incomeTransactions.length)} icon={BarChart2} color="bg-purple-50 text-purple-600" />
        <MetricCard label="Ticket Médio" value={`R$ ${fmt(finance.avgIncome)}`} icon={ShoppingBag} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Monthly and category charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">Receitas Mensais</h3>
          <ImprovedCSSBarChart data={finance.monthlyIncome} color="hsl(142, 71%, 45%)" gradient showValues />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">Despesas Mensais</h3>
          <ImprovedCSSBarChart data={finance.monthlyExpense} color="hsl(0, 84%, 60%)" gradient showValues />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">Receita por Categoria</h3>
          <ImprovedCSSBarChart data={finance.incomeByCategory.slice(0, 6)} color="hsl(162, 74%, 47%)" gradient showValues />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">Despesa por Categoria</h3>
          <ImprovedCSSBarChart data={finance.expenseByCategory.slice(0, 6)} color="hsl(25, 90%, 55%)" gradient showValues />
        </div>
      </div>
    </>
  );
}

