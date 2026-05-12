import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, Clock, AlertCircle,
  Loader2, RefreshCw, Scale, Users, ChevronRight, GraduationCap,
  CheckCircle2, Hourglass, DollarSign, Filter, Search, XCircle, ArrowRightLeft,
} from 'lucide-react';
import { transactionService } from '../../services/transactionService';
import { FinancialTransaction } from '../../types/finance_v2';
import { PageFilters } from '../ui/PageFilters';
import { fmt, cn } from '../../lib/utils';
import { useProfileStore } from '../../store/useProfileStore';
import { useProductStore } from '@/store/useProductStore';
import { calcCashFlowKPIs } from '../../calculations/cashFlowMetrics';


function formatDate(iso: string) {
  if (!iso) return '—';
  // Handle full ISO strings or date-only strings
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const date = new Date(datePart + 'T12:00:00');
  
  if (isNaN(date.getTime())) return 'Data Inválida';
  
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}

type TxWithLead = FinancialTransaction & {
  leads?: {
    responsible: any; id: string; name: string; value: number; product: string | null
  } | null;
  turmas?: { id: string; name: string; date: string } | null;
};

type GanhoLead = {
  id: string; name: string; created_at: string;
  value: string | number; product: string | null;
  discount?: string | number; discount_type?: 'percent' | 'money'; discount_applied?: boolean;
  valor_recebido?: number | null; taxa_matricula_recebido?: number | null;
  pix_completed?: boolean; professor_proof_url?: string | null;
  responsible?: string | null;
};


export function CashFlowTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const products = useProductStore(state => state.products);

  const [activeTab, setActiveTab] = useState<'summary' | 'students' | 'movements' | 'history'>('summary');
  const [transactions, setTransactions] = useState<TxWithLead[]>([]);
  const [allTransactions, setAllTransactions] = useState<FinancialTransaction[]>([]);
  const [ganhoLeads, setGanhoLeads] = useState<GanhoLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSquad, setSelectedSquad] = useState('all');

  const { profiles, fetchProfiles } = useProfileStore();

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);


  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [txData, allTxData, ganhoData] = await Promise.all([
        transactionService.getCashFlowTransactions(startDate, endDate),
        transactionService.getAll({ startDate, endDate }),
        transactionService.getGanhoLeads(startDate, endDate),
      ]);
      setTransactions(txData as TxWithLead[]);
      setAllTransactions(allTxData);
      setGanhoLeads(ganhoData);
    } catch (err) {
      setError('Erro ao carregar o fluxo de caixa.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  const getSquadForName = useCallback((name?: string | null) => {
    if (!name) return null;
    const profile = profiles.find(p => p.name === name);
    return profile?.department?.toUpperCase();
  }, [profiles]);

  const kpis = useMemo(() => {
    if (transactions.length === 0 && ganhoLeads.length === 0 && isLoading) return null;

    const filteredGanhoLeads = ganhoLeads.filter(l => {
      if (selectedSquad === 'all') return true;
      return getSquadForName(l.responsible) === selectedSquad;
    });

    const filteredTransactions = transactions.filter(t => {
      if (selectedSquad === 'all') return true;
      const respName = t.leads?.responsible || (t as any).responsible;
      return getSquadForName(respName) === selectedSquad;
    });

    const result = calcCashFlowKPIs(filteredGanhoLeads as any, filteredTransactions, products);
    return result;
  }, [transactions, ganhoLeads, products, isLoading, selectedSquad, getSquadForName]);


  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkAsPaid = async (id: string) => {
    await transactionService.markAsPaid(id);
    loadData();
  };

  const handleCancel = async (id: string) => {
    if (confirm('Deseja realmente cancelar esta transação?')) {
      await transactionService.cancel(id);
      loadData();
    }
  };

  const pipelineTxs = transactions.filter(t => {
    if (t.origin_type !== 'PIPELINE' || t.type !== 'INCOME') return false;
    if (selectedSquad === 'all') return true;
    return getSquadForName(t.leads?.responsible) === selectedSquad;
  });
  const otherTxs = transactions.filter(t => {
    if ((t.origin_type === 'PIPELINE' && t.type === 'INCOME') || t.origin_type === 'COMMISSION') return false;
    if (selectedSquad === 'all') return true;
    const respName = t.leads?.responsible || (t as any).responsible;
    return getSquadForName(respName) === selectedSquad;
  });


  const pipelinePaid = pipelineTxs.filter(t => t.status === 'PAID');
  const pipelinePending = pipelineTxs.filter(t => t.status === 'PENDING' || t.status === 'OVERDUE');

  const studentsByProduct = useMemo(() => {
    const groups: Record<string, { product: string; total: number; count: number; items: TxWithLead[] }> = {};
    pipelineTxs.forEach(t => {
      const costCenter = (t.cost_center || 'cursos').toLowerCase();
      const groupLabel = costCenter === 'cursos' ? 'Cursos' : 
                         costCenter === 'servico_drone' ? 'Serviço de Drone' : 
                         'Administrativo';
      
      if (!groups[groupLabel]) {
        groups[groupLabel] = { product: groupLabel, total: 0, count: 0, items: [] };
      }
      groups[groupLabel].total += Number(t.amount);
      groups[groupLabel].count += 1;
      groups[groupLabel].items.push(t);
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [pipelineTxs]);

  const grouped: Record<string, TxWithLead[]> = {};
  otherTxs.forEach(t => {
    const dateKey =
      (t.status === 'PAID' ? t.payment_date : t.due_date) ??
      t.created_at.split('T')[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(t);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const filteredAll = allTransactions.filter(t => {
    if (t.origin_type === 'COMMISSION') return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (selectedSquad !== 'all') {
      const respName = t.leads?.responsible || (t as any).responsible;
      if (getSquadForName(respName) !== selectedSquad) return false;
    }
    if (searchTerm.trim() && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });


  const TabButton = ({ id, label, icon: Icon, count }: { id: typeof activeTab, label: string, icon: any, count?: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        'flex items-center gap-2 px-4 py-3 border-b-2 transition-all text-sm font-bold',
        activeTab === id
          ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      )}
    >
      <Icon size={16} />
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn(
          'ml-1 px-1.5 py-0.5 rounded-full text-[10px]',
          activeTab === id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
        )}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <CashKpiCard icon={TrendingUp} label="Entradas Pagas" display={`R$ ${fmt(kpis.receita_total)}`} hint="Receita recebida no período" color="emerald" />
          <CashKpiCard icon={TrendingDown} label="Saídas Pagas" display={`R$ ${fmt(kpis.despesa_total)}`} hint="Despesas pagas no período" color="rose" />
          <CashKpiCard icon={Clock} label="A Receber" display={`R$ ${fmt(kpis.contas_receber)}`} hint="Receitas pendentes (todos os períodos)" color="blue" />
          <CashKpiCard icon={Clock} label="A Pagar" display={`R$ ${fmt(kpis.contas_pagar)}`} hint="Despesas pendentes (todos os períodos)" color="amber" />
          <CashKpiCard icon={Users} label="Alunos Ganhos" display={String(kpis.alunos_ganhos)} hint="Leads fechados no período" color="violet" />
          <CashKpiCard icon={Scale} label="Saldo" display={`R$ ${fmt(Math.abs(kpis.lucro_liquido))}`}
            hint={kpis.lucro_liquido >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
            color={kpis.lucro_liquido >= 0 ? 'emerald' : 'rose'} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/30">
          <TabButton id="summary" label="Resumo" icon={Wallet} />
          <TabButton id="students" label="Entradas" icon={GraduationCap} count={pipelineTxs.length} />
          <TabButton id="movements" label="Despesas" icon={TrendingDown} count={otherTxs.length} />
          <TabButton id="history" label="Histórico" icon={ArrowRightLeft} />
        </div>

        <div className="p-0 min-h-[400px]">
          {activeTab === 'summary' && (
            <div className="divide-y divide-slate-100">
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Saúde Financeira</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">Composição de Receita</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 font-medium">Alunos e Matrículas</span>
                        <span className="text-sm font-bold text-emerald-600">R$ {fmt(kpis?.receita_total || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center opacity-40">
                        <span className="text-sm text-slate-600 font-medium">Outras Entradas</span>
                        <span className="text-sm font-bold text-emerald-600">R$ 0</span>
                      </div>
                      <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Total Geral</span>
                        <span className="text-base font-black text-emerald-700">R$ {fmt(kpis?.receita_total || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">Estatísticas do Período</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-6 h-6 rounded bg-violet-100 flex items-center justify-center text-violet-600"><Users size={12} /></div>
                        <span>{kpis?.alunos_ganhos} novos alunos matriculados</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-amber-600"><Clock size={12} /></div>
                        <span>{pipelinePending.length} pagamentos a receber</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 size={12} /></div>
                        <span>{pipelinePaid.length} pagamentos confirmados</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="divide-y divide-slate-100">
              {studentsByProduct.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <GraduationCap size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma entrada de aluno identificada.</p>
                </div>
              ) : (
                studentsByProduct.map(group => (
                  <div key={group.product} className="group">
                    <div className="px-6 py-3 bg-slate-50/80 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                          <GraduationCap size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 tracking-tight">{group.product}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{group.count} transaç{group.count !== 1 ? 'ões' : 'ão'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Subtotal</p>
                        <p className="text-sm font-black text-emerald-700">R$ {fmt(group.total)}</p>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-50 bg-white">
                      {group.items.map(t => <StudentRow key={t.id} tx={t} />)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'movements' && (
            <div className="min-h-[200px]">
              {sortedDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <TrendingDown size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma despesa registrada.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sortedDates.map(date => (
                    <div key={date}>
                      <div className="flex items-center justify-between px-6 py-2 bg-slate-50/50">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{formatDate(date)}</span>
                        <span className="text-[10px] font-black text-rose-600 uppercase">
                          Saídas: - R$ {fmt(grouped[date].filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((s, t) => s + Number(t.amount), 0))}
                        </span>
                      </div>
                      {grouped[date].map(t => <TransactionRow key={t.id} transaction={t} />)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="min-h-[400px]">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/20">
                <PageFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Buscar na descrição..."
                  onClearAll={() => { setSearchTerm(''); setFilterType('all'); setFilterStatus('all'); }}
                  filters={[
                    {
                      id: 'type', type: 'select', icon: DollarSign, placeholder: 'Tipo',
                      value: filterType, onChange: setFilterType,
                      activeColorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      options: [{ value: 'INCOME', label: 'Entradas' }, { value: 'EXPENSE', label: 'Saídas' }],
                    },
                    {
                      id: 'status', type: 'select', icon: Filter, placeholder: 'Status',
                      value: filterStatus, onChange: setFilterStatus,
                      activeColorClass: 'bg-amber-50 text-amber-700 border-amber-100',
                      options: [{ value: 'PAID', label: 'Confirmado' }, { value: 'PENDING', label: 'Pendente' }, { value: 'OVERDUE', label: 'Atrasado' }],
                    },
                    {
                      id: 'squad', type: 'select', icon: Users, placeholder: 'Todos Squads',
                      value: selectedSquad, onChange: setSelectedSquad,
                      activeColorClass: 'bg-violet-50 text-violet-700 border-violet-100',
                      options: [{ value: 'TARGET', label: 'Squad TARGET' }, { value: 'PLUPPEX', label: 'Squad PLUPPEX' }],
                    },
                  ]}

                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 font-black tracking-widest">
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
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-800 tracking-tight">{t.description}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{(t as any).financial_categories?.name || 'Sem Categoria'} • {t.origin_type}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-medium">
                          {new Date(t.status === 'PAID' ? (t.payment_date || t.created_at) : (t.due_date || t.created_at)).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <span className={cn('font-black text-base tabular-nums', t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600')}>
                            {t.type === 'INCOME' ? '+' : '-'} R$ {fmt(t.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            'px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider',
                            t.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                              t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          )}>
                            {t.status === 'PAID' ? 'Confirmado' : t.status === 'PENDING' ? 'Pendente' : 'Atrasado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {t.status !== 'PAID' && t.status !== 'CANCELLED' && (
                              <button onClick={() => handleMarkAsPaid(t.id)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all" title="Confirmar Pagamento"><CheckCircle2 size={18} /></button>
                            )}
                            <button onClick={() => handleCancel(t.id)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-all" title="Cancelar"><XCircle size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Student Row ──────────────────────────────────────────────────────────────

function StudentRow({ tx }: { tx: TxWithLead }) {
  const isPaid = tx.status === 'PAID';
  const isOverdue = tx.status === 'OVERDUE';
  const leadName = tx.leads?.name ?? tx.description.replace('Receita Automática - Lead: ', '');
  const productName = tx.turmas?.name || tx.leads?.product || 'Produto não identificado';
  const totalValue = tx.leads?.value ? Number(tx.leads.value) : Number(tx.amount);
  const paidValue = isPaid ? Number(tx.amount) : 0;

  return (
    <div className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black',
        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600 border border-amber-200'
      )}>
        {leadName.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black text-slate-800 truncate tracking-tight">{leadName}</p>
          <span className="text-[10px] font-black text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
            {productName}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-bold mt-0.5">
          {isPaid
            ? `Recebido em ${tx.payment_date ? formatDate(tx.payment_date) : '—'}`
            : isOverdue
              ? `Vencido em ${tx.due_date ? formatDate(tx.due_date) : '—'}`
              : tx.due_date
                ? `Vence em ${formatDate(tx.due_date)}`
                : 'Pendente'
          }
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className={cn(
          'text-sm font-black tabular-nums',
          isPaid ? 'text-emerald-600' : isOverdue ? 'text-rose-500' : 'text-amber-600'
        )}>
          R$ {fmt(Number(tx.amount))}
        </p>
        {!isPaid && totalValue > 0 && (
          <p className="text-[10px] text-slate-400 font-bold">
            {paidValue > 0 ? `R$ ${fmt(paidValue)} de ` : ''}R$ {fmt(totalValue)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ transaction: t }: { transaction: TxWithLead }) {
  const isPaid = t.status === 'PAID';
  const isIncome = t.type === 'INCOME';
  const isOverdue = t.status === 'OVERDUE';

  const statusLabel = isPaid
    ? (isIncome ? 'Recebida' : 'Paga')
    : isOverdue ? 'Vencida'
      : (isIncome ? 'A Receber' : 'A Pagar');

  const ORIGIN_LABEL: Record<string, string> = {
    COMMISSION: 'Comissão', CLASS: 'Turma', PARTNER: 'Parceria',
    REFUND: 'Reembolso', MANUAL: 'Manual',
  };

  const displayDescription = t.origin_type === 'CLASS' && t.turmas
    ? `Turma: ${t.turmas.name}`
    : t.description;

  return (
    <div className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50 transition-colors">
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
        isIncome
          ? isPaid ? 'bg-emerald-100' : 'bg-emerald-50 border border-emerald-200'
          : isPaid ? 'bg-rose-100' : 'bg-rose-50 border border-rose-200'
      )}>
        {isIncome
          ? <TrendingUp size={14} className={isPaid ? 'text-emerald-600' : 'text-emerald-400'} />
          : <TrendingDown size={14} className={isPaid ? 'text-rose-600' : 'text-rose-400'} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold truncate tracking-tight', isPaid ? 'text-slate-800' : 'text-slate-500')}>
          {displayDescription}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn(
            'text-[11px] font-black uppercase tracking-tighter',
            isPaid ? 'text-slate-400' : isOverdue ? 'text-rose-500' : 'text-amber-500'
          )}>
            {statusLabel}
          </span>
          {t.origin_type && ORIGIN_LABEL[t.origin_type] && (
            <>
              <ChevronRight size={10} className="text-slate-300" />
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">{ORIGIN_LABEL[t.origin_type]}</span>
            </>
          )}
        </div>
      </div>

      <span className={cn(
        'text-sm font-black shrink-0 tabular-nums',
        isIncome ? 'text-emerald-600' : 'text-rose-600',
        !isPaid && 'opacity-50'
      )}>
        {isIncome ? '+' : '−'} R$ {fmt(Number(t.amount))}
      </span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rose: 'bg-rose-50    text-rose-700    border-rose-100',
  blue: 'bg-blue-50    text-blue-700    border-blue-100',
  amber: 'bg-amber-50   text-amber-700   border-amber-100',
  violet: 'bg-violet-50  text-violet-700  border-violet-100',
};

function CashKpiCard({ icon: Icon, label, display, hint, color }: {
  icon: any; label: string; display: string; hint?: string; color: string;
}) {
  return (
    <div className={cn('rounded-2xl border p-4 flex flex-col gap-1', COLOR_MAP[color] ?? COLOR_MAP.blue)}>
      <div className="flex items-center gap-2">
        <Icon size={15} />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
      </div>
      <p className="text-xl font-black tracking-tight">{display}</p>
      {hint && <p className="text-[10px] font-bold opacity-50 leading-tight uppercase tracking-tighter">{hint}</p>}
    </div>
  );
}
