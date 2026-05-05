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
import { useProductStore } from '../../store/useProductStore';
import { financialCalculator } from '../../services/financialCalculator';

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}

// financial_transactions com lead e turma embutidos via join
type TxWithLead = FinancialTransaction & {
  leads?: { id: string; name: string; value: number; valor_recebido: number; taxa_matricula_recebido?: number | null; product: string | null } | null;
  turmas?: { id: string; name: string; date: string; products: { id: string; name: string } | null } | null;
};

type GanhoLead = {
  id: string; name: string; created_at: string;
  value: string | number; product: string | null;
  discount?: string | number; discount_type?: 'percent' | 'money'; discount_applied?: boolean;
  valor_recebido?: number | null; taxa_matricula_recebido?: number | null;
  pix_completed?: boolean; professor_proof_url?: string | null;
};

export function CashFlowTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const products = useProductStore(state => state.products);

  const [transactions, setTransactions] = useState<TxWithLead[]>([]);
  const [allTransactions, setAllTransactions] = useState<FinancialTransaction[]>([]);
  const [ganhoLeads, setGanhoLeads]   = useState<GanhoLead[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

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

  const kpis = useMemo(() => {
    if (transactions.length === 0 && ganhoLeads.length === 0 && isLoading) return null;

    // Pipeline-equivalent totals: uses same financialCalculator as Pipeline page
    const receita_total = ganhoLeads.reduce((s, l) => s + financialCalculator.getPaidAmount(l as any, products), 0);
    const contas_receber = ganhoLeads.reduce((s, l) => s + financialCalculator.getPendingAmount(l as any, products), 0);

    // Expenses come from financial_transactions (no pipeline equivalent)
    let despesa_total = 0, contas_pagar = 0;
    for (const t of transactions) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'EXPENSE') {
        if (t.status === 'PAID') despesa_total += amt;
        else if (t.status === 'PENDING' || t.status === 'OVERDUE') contas_pagar += amt;
      }
    }

    const lucro_liquido = receita_total - despesa_total;
    return {
      receita_total, despesa_total, lucro_liquido,
      margem_liquida: receita_total > 0 ? (lucro_liquido / receita_total) * 100 : 0,
      contas_receber, contas_pagar,
      alunos_ganhos: ganhoLeads.length,
    };
  }, [transactions, ganhoLeads, products, isLoading]);

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

  // Separa pipeline (alunos) das demais transações — exclui comissões OTE
  const pipelineTxs = transactions.filter(t => t.origin_type === 'PIPELINE' && t.type === 'INCOME');
  const otherTxs    = transactions.filter(t => (t.origin_type !== 'PIPELINE' || t.type !== 'INCOME') && t.origin_type !== 'COMMISSION');

  const pipelinePaid    = pipelineTxs.filter(t => t.status === 'PAID');
  const pipelinePending = pipelineTxs.filter(t => t.status === 'PENDING' || t.status === 'OVERDUE');

  // Agrupa as demais por data
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
    if (searchTerm.trim() && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <CashKpiCard icon={Users}      label="Alunos Ganhos"   display={String(kpis.alunos_ganhos)}          hint="Leads fechados no período"              color="violet" />
          <CashKpiCard icon={TrendingUp} label="Entradas Pagas"  display={`R$ ${fmt(kpis.receita_total)}`}     hint="Receita recebida no período"            color="emerald" />
          <CashKpiCard icon={TrendingDown} label="Saídas Pagas"  display={`R$ ${fmt(kpis.despesa_total)}`}     hint="Despesas pagas no período"              color="rose" />
          <CashKpiCard icon={Clock}      label="A Receber"       display={`R$ ${fmt(kpis.contas_receber)}`}    hint="Receitas pendentes (todos os períodos)" color="blue" />
          <CashKpiCard icon={Clock}      label="A Pagar"         display={`R$ ${fmt(kpis.contas_pagar)}`}      hint="Despesas pendentes (todos os períodos)" color="amber" />
          <CashKpiCard icon={Scale}      label="Saldo do Período" display={`R$ ${fmt(Math.abs(kpis.lucro_liquido))}`}
            hint={kpis.lucro_liquido >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
            color={kpis.lucro_liquido >= 0 ? 'emerald' : 'rose'} />
        </div>
      )}

      {/* ── Alunos Ganhos ─────────────────────────────────────────────────── */}
      {(isLoading && pipelineTxs.length === 0) ? null : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <GraduationCap size={16} className="text-violet-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Alunos Ganhos</h2>
                <p className="text-xs text-slate-400">Receitas de pipeline · recebido e a receber</p>
              </div>
            </div>
            {pipelineTxs.length > 0 && (
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  {pipelinePaid.length} recebido{pipelinePaid.length !== 1 ? 's' : ''}
                </span>
                <span className="text-amber-600 flex items-center gap-1">
                  <Hourglass size={13} />
                  {pipelinePending.length} a receber
                </span>
              </div>
            )}
          </div>

          {pipelineTxs.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400">
              <GraduationCap size={28} className="mb-2 opacity-30" />
              <p className="text-sm">Nenhum aluno ganho neste período.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {/* Recebidos */}
              {pipelinePaid.length > 0 && (
                <div>
                  <div className="px-6 py-2 bg-emerald-50/60 flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Recebido</span>
                  </div>
                  {pipelinePaid.map(t => (
                    <StudentRow key={t.id} tx={t} />
                  ))}
                </div>
              )}

              {/* A receber */}
              {pipelinePending.length > 0 && (
                <div>
                  <div className="px-6 py-2 bg-amber-50/60 flex items-center gap-2">
                    <Hourglass size={13} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      A Receber
                    </span>
                  </div>
                  {pipelinePending.map(t => (
                    <StudentRow key={t.id} tx={t} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Taxas de Matrícula ────────────────────────────────────────────── */}
      {(() => {
        const taxaLeads = ganhoLeads.filter(l => (l.taxa_matricula_recebido ?? 0) > 0);
        if (taxaLeads.length === 0) return null;
        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <GraduationCap size={16} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Taxas de Matrícula</h2>
                  <p className="text-xs text-slate-400">Leads ganhos no período · taxa de entrada recebida</p>
                </div>
              </div>
              <span className="text-sm font-bold text-indigo-700">
                R$ {fmt(taxaLeads.reduce((s, t) => s + Number(t.taxa_matricula_recebido), 0))}
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {taxaLeads.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 text-sm font-bold">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{t.name}</p>
                    <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 tabular-nums shrink-0">
                    R$ {fmt(Number(t.taxa_matricula_recebido))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Outras Movimentações ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Outras Movimentações</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comissões, despesas, reembolsos e transações manuais
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin')} />
          </button>
        </div>

        <div className="min-h-[200px]">
          {isLoading && transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-slate-500 text-sm">Carregando...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 p-6">
              <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
              <p className="text-rose-600 font-semibold">{error}</p>
              <button onClick={loadData} className="mt-3 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-100">
                Tentar novamente
              </button>
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400">
              <Wallet size={28} className="mb-2 opacity-30" />
              <p className="text-sm">Nenhuma outra movimentação neste período.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedDates.map(date => {
                const dayTxs    = grouped[date];
                const dayIncome  = dayTxs.filter(t => t.type === 'INCOME'  && t.status === 'PAID').reduce((s, t) => s + Number(t.amount), 0);
                const dayExpense = dayTxs.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((s, t) => s + Number(t.amount), 0);
                const hasPending = dayTxs.some(t => t.status !== 'PAID');

                return (
                  <div key={date}>
                    <div className="flex items-center justify-between px-6 py-3 bg-slate-50/80">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {formatDate(date)}
                        </span>
                        {hasPending && (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                            pendente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold">
                        {dayIncome  > 0 && <span className="text-emerald-600">+ R$ {fmt(dayIncome)}</span>}
                        {dayExpense > 0 && <span className="text-rose-600">− R$ {fmt(dayExpense)}</span>}
                      </div>
                    </div>
                    {dayTxs.map(t => <TransactionRow key={t.id} transaction={t} />)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Todas as Transações ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <ArrowRightLeft size={16} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Todas as Transações</h2>
              <p className="text-xs text-slate-400">Registro completo de movimentações do período</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
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
                ],
              },
            ]}
          />
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading && allTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
              <p className="text-slate-500 text-sm">Carregando transações...</p>
            </div>
          ) : filteredAll.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48">
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
                {filteredAll.map((t) => (
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

// ─── Student Row ──────────────────────────────────────────────────────────────

function StudentRow({ tx }: { tx: TxWithLead }) {
  const isPaid     = tx.status === 'PAID';
  const isOverdue  = tx.status === 'OVERDUE';
  
  // Use lead name from join if available, fallback to description string
  const leadName   = tx.leads?.name ?? tx.description.replace('Receita Automática - Lead: ', '');
  
  // Use product name from join or lead string
  const productName = tx.turmas?.products?.name || tx.leads?.product || 'Produto não identificado';
  
  const totalValue = tx.leads?.value ? Number(tx.leads.value) : Number(tx.amount);
  const paidValue  = tx.leads?.valor_recebido ? Number(tx.leads.valor_recebido) : (isPaid ? Number(tx.amount) : 0);

  return (
    <div className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
      {/* Avatar */}
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600 border border-amber-200'
      )}>
        {leadName.charAt(0).toUpperCase()}
      </div>

      {/* Nome e data */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate">{leadName}</p>
          <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
            {productName}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {isPaid
            ? `Recebido em ${tx.payment_date ? formatDate(tx.payment_date) : '—'}`
            : isOverdue
              ? `Vencido em ${tx.due_date ? formatDate(tx.due_date) : '—'}`
              : tx.due_date
                ? `Vence em ${formatDate(tx.due_date)}`
                : 'Sem data de vencimento'
          }
        </p>
      </div>

      {/* Valores */}
      <div className="text-right shrink-0">
        <p className={cn(
          'text-sm font-bold tabular-nums',
          isPaid ? 'text-emerald-600' : isOverdue ? 'text-rose-500' : 'text-amber-600'
        )}>
          R$ {fmt(Number(tx.amount))}
        </p>
        {!isPaid && totalValue > 0 && (
          <p className="text-[11px] text-slate-400">
            {paidValue > 0 ? `R$ ${fmt(paidValue)} de ` : ''}R$ {fmt(totalValue)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ transaction: t }: { transaction: TxWithLead }) {
  const isPaid    = t.status === 'PAID';
  const isIncome  = t.type === 'INCOME';
  const isOverdue = t.status === 'OVERDUE';

  const statusLabel = isPaid
    ? (isIncome ? 'Recebida' : 'Paga')
    : isOverdue ? 'Vencida'
    : (isIncome ? 'A Receber' : 'A Pagar');

  const ORIGIN_LABEL: Record<string, string> = {
    COMMISSION: 'Comissão', CLASS: 'Turma', PARTNER: 'Parceria',
    REFUND: 'Reembolso', MANUAL: 'Manual',
  };

  // Dynamic description for Turma/Class transactions
  const displayDescription = t.origin_type === 'CLASS' && t.turmas
    ? `Turma: ${t.turmas.name} (${t.turmas.products?.name || 'Sem Produto'})`
    : t.description;

  return (
    <div className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50 transition-colors">
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
        isIncome
          ? isPaid ? 'bg-emerald-100' : 'bg-emerald-50 border border-emerald-200'
          : isPaid ? 'bg-rose-100'    : 'bg-rose-50 border border-rose-200'
      )}>
        {isIncome
          ? <TrendingUp  size={14} className={isPaid ? 'text-emerald-600' : 'text-emerald-400'} />
          : <TrendingDown size={14} className={isPaid ? 'text-rose-600'    : 'text-rose-400'}    />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isPaid ? 'text-slate-800' : 'text-slate-500')}>
          {displayDescription}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn(
            'text-[11px] font-semibold',
            isPaid ? 'text-slate-400' : isOverdue ? 'text-rose-500' : 'text-amber-500'
          )}>
            {statusLabel}
          </span>
          {t.origin_type && ORIGIN_LABEL[t.origin_type] && (
            <>
              <ChevronRight size={10} className="text-slate-300" />
              <span className="text-[11px] text-slate-400">{ORIGIN_LABEL[t.origin_type]}</span>
            </>
          )}
        </div>
      </div>

      <span className={cn(
        'text-sm font-bold shrink-0 tabular-nums',
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
  rose:    'bg-rose-50    text-rose-700    border-rose-100',
  blue:    'bg-blue-50    text-blue-700    border-blue-100',
  amber:   'bg-amber-50   text-amber-700   border-amber-100',
  violet:  'bg-violet-50  text-violet-700  border-violet-100',
};

function CashKpiCard({ icon: Icon, label, display, hint, color }: {
  icon: any; label: string; display: string; hint?: string; color: string;
}) {
  return (
    <div className={cn('rounded-2xl border p-4 flex flex-col gap-1', COLOR_MAP[color] ?? COLOR_MAP.blue)}>
      <div className="flex items-center gap-2">
        <Icon size={15} />
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-xl font-extrabold">{display}</p>
      {hint && <p className="text-[11px] opacity-60 leading-tight">{hint}</p>}
    </div>
  );
}
