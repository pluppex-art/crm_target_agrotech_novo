import { useState, useEffect } from 'react';
import { Plus, Download, Loader2, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { cn } from '../lib/utils';
import { useFinanceStore } from '../store/useFinanceStore';
import { NewTransactionModal } from '../components/finance/NewTransactionModal';
import { FinanceMetrics } from '../components/finance/FinanceMetrics';
import { DateFilter } from '../components/finance/DateFilter';
import { TransactionTable } from '../components/finance/TransactionTable';

export function Finance() {
  const { hasPermission } = usePermissions();
  const { transactions, fetchTransactions, isLoading, deleteTransaction, subscribe } = useFinanceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, []);

  const filteredTransactions = transactions.filter(t => {
    if (!startDate && !endDate) return true;
    const transactionDate = new Date(t.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && transactionDate < start) return false;
    if (end && transactionDate > end) return false;
    return true;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const balance = totalIncome - totalExpense;

  if (!hasPermission('finance.view')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[600px] text-center bg-gradient-to-br from-emerald-50 to-green-50">
        <div className="w-24 h-24 bg-emerald-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg border-4 border-emerald-300">
          <ShieldAlert className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Acesso ao Financeiro Bloqueado</h2>
        <p className="text-slate-500 max-w-md mb-6 leading-relaxed">Você precisa da permissão <code className="bg-emerald-100 px-2 py-1 rounded-lg text-sm font-mono text-emerald-800 font-bold">finance.view</code> para visualizar dados financeiros.</p>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Contate o financeiro</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
          <p className="text-sm text-slate-500">Gestão de fluxo de caixa e saúde financeira da Target Agrotech.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isLoading && <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />}
          {hasPermission('finance.export') && (
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium hover:bg-slate-50 transition-all">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Relatório</span>
            </button>
          )}
          {hasPermission('finance.create') && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nova Transação
            </button>
          )}
        </div>
      </div>

      <DateFilter 
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        isLoading={isLoading}
      />
      <FinanceMetrics 
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        balance={balance}
      />
      <TransactionTable filteredTransactions={filteredTransactions} />

  {'}'}

      <NewTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
