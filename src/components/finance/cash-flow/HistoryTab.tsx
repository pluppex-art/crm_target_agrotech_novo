import React from 'react';
import { DollarSign, Filter, Users, Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { PageFilters } from '../../ui/PageFilters';
import { fmt, cn } from '../../../lib/utils';

export const HistoryTab: React.FC<{
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  selectedSquad: string;
  setSelectedSquad: (v: string) => void;
  selectedCentroCusto: string;
  setSelectedCentroCusto: (v: string) => void;
  centroCustos: any[];
  filteredAll: any[];
  handleMarkAsPaid: (id: string) => void;
  handleCancel: (id: string) => void;
}> = (props) => {
  const {
    searchTerm, setSearchTerm, filterType, setFilterType, filterStatus, setFilterStatus,
    selectedSquad, setSelectedSquad, selectedCentroCusto, setSelectedCentroCusto,
    centroCustos, filteredAll, handleMarkAsPaid, handleCancel
  } = props;

  return (
    <div className="min-h-[400px]">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20">
        <PageFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar na descrição..."
          onClearAll={() => { setSearchTerm(''); setFilterType('all'); setFilterStatus('all'); }}
          filters={[
            { id: 'type', type: 'select', icon: DollarSign, placeholder: 'Tipo', value: filterType, onChange: setFilterType, activeColorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100', options: [{ value: 'INCOME', label: 'Entradas' }, { value: 'EXPENSE', label: 'Saídas' }] },
            { id: 'status', type: 'select', icon: Filter, placeholder: 'Status', value: filterStatus, onChange: setFilterStatus, activeColorClass: 'bg-amber-50 text-amber-700 border-amber-100', options: [{ value: 'PAID', label: 'Confirmado' }, { value: 'PENDING', label: 'Pendente' }, { value: 'OVERDUE', label: 'Atrasado' }] },
            { id: 'squad', type: 'select', icon: Users, placeholder: 'Todos Squads', value: selectedSquad, onChange: setSelectedSquad, activeColorClass: 'bg-violet-50 text-violet-700 border-violet-100', options: [{ value: 'TARGET', label: 'Squad TARGET' }, { value: 'PLUPPEX', label: 'Squad PLUPPEX' }] },
            { id: 'centro_custo', type: 'select', icon: Wallet, placeholder: 'Todos Centros', value: selectedCentroCusto, onChange: setSelectedCentroCusto, activeColorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100', options: centroCustos.map(cc => ({ value: cc.id, label: cc.nome })) },
          ]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 font-black tracking-widest">
            <tr>
              <th className="px-6 py-4">Descrição Detalhada</th>
              <th className="px-6 py-4">Data Ref.</th>
              <th className="px-6 py-4 text-right">Valor Líquido</th>
              <th className="px-6 py-4 text-center">Status Pagto.</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAll.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-black text-slate-800 dark:text-slate-200 tracking-tight">{t.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{(t as any).financial_categories?.name || 'Sem Categoria'} • {t.origin_type}</p>
                    {(t.cost_center === 'cursos' || (t as any).leads?.product) && (
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter border border-indigo-100">{t.turmas?.name || (t as any).leads?.product || 'Curso'}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">{new Date(t.status === 'PAID' ? (t.payment_date || t.created_at) : (t.due_date || t.created_at)).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4 text-right whitespace-nowrap"><span className={cn('font-black text-base tabular-nums', t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600')}>{t.type === 'INCOME' ? '+' : '-'} R$ {fmt(t.amount)}</span></td>
                <td className="px-6 py-4 text-center"><span className={cn('px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider', t.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}>{t.status === 'PAID' ? 'Confirmado' : t.status === 'PENDING' ? 'Pendente' : 'Atrasado'}</span></td>
                <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2">{t.status !== 'PAID' && t.status !== 'CANCELLED' && (<button onClick={() => handleMarkAsPaid(t.id)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all" title="Confirmar Pagamento"><CheckCircle2 size={18} /></button>)}<button onClick={() => handleCancel(t.id)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-all" title="Cancelar"><XCircle size={18} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
