import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FinanceMetricsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export function FinanceMetrics({ totalIncome, totalExpense, balance }: FinanceMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">Receita</span>
        </div>
        <p className="text-sm text-slate-500 mb-1">Total Recebido</p>
        <h2 className="text-2xl font-bold text-slate-800">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase">Despesas</span>
        </div>
        <p className="text-sm text-slate-500 mb-1">Total Gasto</p>
        <h2 className="text-2xl font-bold text-slate-800">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">Saldo</span>
        </div>
        <p className="text-sm text-slate-500 mb-1">Saldo em Caixa</p>
        <h2 className="text-2xl font-bold text-slate-800">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
      </div>
    </div>
  );
}
