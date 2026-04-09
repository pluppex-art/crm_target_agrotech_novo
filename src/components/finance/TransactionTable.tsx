import { DollarSign, Filter, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFinanceStore } from '../../store/useFinanceStore';

interface TransactionTableProps {
  filteredTransactions: any[];
}

export function TransactionTable({ filteredTransactions }: TransactionTableProps) {
  const { deleteTransaction } = useFinanceStore();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-bold text-slate-800">Últimas Movimentações</h3>
        <button className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Descrição</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Categoria</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Data</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 text-right">Valor</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100"></th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-slate-800 border-b border-slate-50">{t.description}</td>
                <td className="px-6 py-4 text-sm text-slate-500 border-b border-slate-50">
                  <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold uppercase">{t.category}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 border-b border-slate-50">
                  {new Date(t.date).toLocaleDateString('pt-BR')}
                </td>
                <td className={cn(
                  "px-6 py-4 text-sm font-bold border-b border-slate-50 text-right",
                  t.type === 'income' ? "text-emerald-600" : "text-red-600"
                )}>
                  {t.type === 'income' ? '+' : ''} R$ {Math.abs(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-sm border-b border-slate-50 text-right">
                  <button 
                    onClick={() => {
                      deleteTransaction(t.id);
                    }}
                    className="p-1 text-slate-300 hover:text-red-600 transition-colors"
                    title="Excluir transação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhuma transação encontrada.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
