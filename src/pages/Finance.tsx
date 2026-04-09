import { useState, useEffect } from 'react';
import { Plus, Download, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinanceStore } from '../store/useFinanceStore';
import { NewTransactionModal } from '../components/finance/NewTransactionModal';
import { FinanceMetrics } from '../components/finance/FinanceMetrics';
import { DateFilter } from '../components/finance/DateFilter';
import { TransactionTable } from '../components/finance/TransactionTable';

export function Finance() {
  const { transactions, fetchTransactions, isLoading, deleteTransaction } = useFinanceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
          <p className="text-sm text-slate-500">Gestão de fluxo de caixa e saúde financeira da Target Agrotech.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isLoading && <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />}
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Relatório</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nova Transação
          </button>
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
