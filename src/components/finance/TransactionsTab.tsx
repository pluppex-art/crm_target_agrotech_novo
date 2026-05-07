import { useState, useEffect } from 'react';
import { Loader2, DollarSign, Filter, Search, CheckCircle2, XCircle, Users } from 'lucide-react';
import { transactionService } from '../../services/transactionService';
import { useProfileStore } from '../../store/useProfileStore';
import { FinancialTransaction } from '../../types/finance_v2';
import { PageFilters } from '../ui/PageFilters';
import { fmt, cn } from '../../lib/utils';
import { filterTransactions } from '../../calculations/transactionMetrics';

export function TransactionsTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSquad, setSelectedSquad] = useState('all');

  const { profiles, fetchProfiles } = useProfileStore();

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);


  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await transactionService.getAll({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: filterType !== 'all' ? filterType as any : undefined,
        status: filterStatus !== 'all' ? filterStatus as any : undefined
      });
      setTransactions(data);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, filterType, filterStatus]);

  const handleMarkAsPaid = async (id: string) => {
    await transactionService.markAsPaid(id);
    loadData();
  };

  const handleCancel = async (id: string) => {
    if(confirm('Deseja realmente cancelar esta transação?')) {
      await transactionService.cancel(id);
      loadData();
    }
  };

  const filtered = filterTransactions(transactions as any, profiles, {
    selectedSquad,
    filterType,
    filterStatus,
    searchTerm,
    excludeCommissions: false, // TransactionsTab mostra tudo
  });


  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <PageFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar na descrição..."
          onClearAll={() => { setSearchTerm(''); setFilterType('all'); setFilterStatus('all'); }}
          filters={[
            {
              id: 'type',
              type: 'select',
              icon: DollarSign,
              placeholder: 'Todas Movimentações',
              value: filterType,
              onChange: setFilterType,
              activeColorClass: 'bg-indigo-50 text-indigo-700 border-indigo-100',
              options: [
                { value: 'INCOME', label: 'Entradas' },
                { value: 'EXPENSE', label: 'Saídas' },
              ],
            },
            {
              id: 'status',
              type: 'select',
              icon: Filter,
              placeholder: 'Todos os Status',
              value: filterStatus,
              onChange: setFilterStatus,
              activeColorClass: 'bg-purple-50 text-purple-700 border-purple-100',
              options: [
                { value: 'PAID', label: 'Pago' },
                { value: 'PENDING', label: 'Pendente' },
                { value: 'CANCELLED', label: 'Cancelado' },
                { value: 'OVERDUE', label: 'Atrasada' },
              ],
            },
            {
              id: 'squad',
              type: 'select',
              icon: Users,
              placeholder: 'Todos Squads',
              value: selectedSquad,
              onChange: setSelectedSquad,
              activeColorClass: 'bg-violet-50 text-violet-700 border-violet-100',
              options: [
                { value: 'TARGET', label: 'Squad TARGET' },
                { value: 'PLUPPEX', label: 'Squad PLUPPEX' },
              ],
            },
          ]}

        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          {isLoading && transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
              <p className="text-slate-500 text-sm">Carregando transações...</p>
            </div>
          ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">Nenhuma transação encontrada</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Descrição / Categoria</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Data</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Valor</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{t.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{(t as any).financial_categories?.name || 'Sem Categoria'} • Origem: {t.origin_type}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {new Date(t.status === 'PAID' ? (t.payment_date || t.created_at) : (t.due_date || t.created_at)).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className={cn('font-bold', t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600')}>
                        {t.type === 'INCOME' ? '+' : '-'} R$ {fmt(t.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full',
                        t.status === 'PAID' && 'bg-emerald-100 text-emerald-700',
                        t.status === 'PENDING' && 'bg-amber-100 text-amber-700',
                        t.status === 'CANCELLED' && 'bg-slate-100 text-slate-500',
                        t.status === 'OVERDUE' && 'bg-rose-100 text-rose-700'
                      )}>
                        {t.status === 'PAID' && (t.type === 'INCOME' ? 'Recebida' : 'Paga')}
                        {t.status === 'PENDING' && (t.type === 'INCOME' ? 'A Receber' : 'A Pagar')}
                        {t.status === 'CANCELLED' && 'Cancelada'}
                        {t.status === 'OVERDUE' && 'Atrasada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {t.status === 'PENDING' && (
                          <button
                            onClick={() => handleMarkAsPaid(t.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Marcar como Pago"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        )}
                        {t.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancel(t.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Cancelar Transação"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
