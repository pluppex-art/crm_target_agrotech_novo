import { useState, useEffect, useCallback } from 'react';
import { Plus, Download, Loader2, ShieldAlert, TrendingUp, TrendingDown, DollarSign, Percent, BarChart2, ShoppingBag, Users, BookOpen, GraduationCap, MapPin, Filter } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useFinanceStore } from '../store/useFinanceStore';
import { useTurmaStore } from '../store/useTurmaStore';
import { useLeadStore } from '../store/useLeadStore';
import { useProfileStore } from '../store/useProfileStore';
import { NewTransactionModal } from '../components/finance/NewTransactionModal';
import { DateFilter } from '../components/finance/DateFilter';
import { TransactionTable } from '../components/finance/TransactionTable';
import { PageFilters } from '../components/ui/PageFilters';
import { MetricCard } from '../components/dashboard/MetricCard';
import { ImprovedCSSBarChart } from '../components/dashboard/ImprovedCSSBarChart';
import { LineTrendChart } from '../components/dashboard/LineTrendChart';
import { fmt, cn } from '../lib/utils';
import { useFinanceMetrics, type SellerCommissionRates } from '../hooks/useFinanceMetrics';
import { commissionService } from '../services/commissionService';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-slate-800 mb-4">{children}</h2>;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm p-6', className)}>
      {children}
    </div>
  );
}

export function Finance() {
  const { hasPermission } = usePermissions();
  const { transactions, fetchTransactions, isLoading, subscribe } = useFinanceStore();
  const { fetchTurmas } = useTurmaStore();
  const { fetchLeads } = useLeadStore();
  const { fetchProfiles } = useProfileStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [commissionRates, setCommissionRates] = useState<Record<string, SellerCommissionRates>>({});

  useEffect(() => {
    fetchTransactions();
    fetchTurmas();
    fetchLeads();
    fetchProfiles();
  }, [fetchTransactions, fetchTurmas, fetchLeads, fetchProfiles]);

  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCommissions = useCallback(async () => {
    const data = await commissionService.getAll();
    const map: Record<string, SellerCommissionRates> = {};
    data.forEach(c => {
      map[c.seller_name] = { pluppex: c.pluppex_rate, target: c.target_rate };
    });
    setCommissionRates(map);
  }, []);

  useEffect(() => { loadCommissions(); }, [loadCommissions]);

  const financeMetrics = useFinanceMetrics(commissionRates);

  // Filtered transactions for the table
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && transactionDate < start) return false;
    if (end && transactionDate > end) return false;
    if (searchTerm.trim() && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const filteredIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const filteredExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);

  const { dre, monthlyIncome, monthlyExpense, incomeByCategory, expenseByCategory, incomeBySource, sellerRevenue, totalIncome, totalExpense, netProfit, margin, avgIncome, incomeTransactions } = financeMetrics;

  const trendDirection = (() => {
    const recent = monthlyIncome.slice(-3).map(m => m.value);
    if (recent.length < 2) return 'up';
    return recent[recent.length - 1] >= recent[0] ? 'up' : 'down';
  })();

  if (!hasPermission('finance.view')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[600px] text-center bg-gradient-to-br from-emerald-50 to-green-50">
        <div className="w-24 h-24 bg-emerald-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg border-4 border-emerald-300">
          <ShieldAlert className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Acesso ao Financeiro Bloqueado</h2>
        <p className="text-slate-500 max-w-md mb-6 leading-relaxed">
          Você precisa da permissão{' '}
          <code className="bg-emerald-100 px-2 py-1 rounded-lg text-sm font-mono text-emerald-800 font-bold">finance.view</code>{' '}
          para visualizar dados financeiros.
        </p>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Contate o financeiro</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f3f6f9] min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Centro Financeiro</h1>
          <p className="text-sm text-slate-500">Gestão completa de resultados, receitas e despesas da Target Agrotech.</p>
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

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
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
        <MetricCard label="Transações" value={String(incomeTransactions.length)} icon={BarChart2} color="bg-purple-50 text-purple-600" />
        <MetricCard label="Ticket Médio" value={`R$ ${fmt(avgIncome)}`} icon={ShoppingBag} color="bg-amber-50 text-amber-600" />
      </div>

      {/* ── DRE ── */}
      <div className="mb-8">
        <SectionTitle>DRE — Demonstrativo de Resultados</SectionTitle>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Receitas */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Receitas</p>
              <div className="space-y-2">
                <DRERow label="Pagamento de Cursos" value={dre.receitaCursos} color="text-emerald-600" icon={GraduationCap} />
                <DRERow label="Taxa de Matrícula" value={dre.receitaTaxaMatricula} color="text-teal-600" icon={BookOpen} />
                <DRERow label="Outras Receitas" value={dre.receitaTransacoes} color="text-blue-600" icon={DollarSign} />
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <DRERow label="Receita Total" value={dre.receitaTotal} color="text-emerald-700" bold />
                </div>
              </div>
            </div>

            {/* Deduções e Resultado */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Deduções & Resultado</p>
              <div className="space-y-2">
                <DRERow label="(-) Despesas Operacionais" value={dre.despesaTotal} color="text-rose-600" icon={TrendingDown} negative />
                <DRERow label="(-) Comissões Pluppex" value={dre.pluppexCommissionsTotal} color="text-indigo-500" icon={Users} negative />
                <DRERow label="(-) Comissões Target" value={dre.targetCommissionsTotal} color="text-orange-500" icon={Users} negative />
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <DRERow label="Resultado Bruto" value={dre.resultadoBruto} color={dre.resultadoBruto >= 0 ? 'text-emerald-700' : 'text-rose-700'} bold />
                </div>
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <DRERow label="Resultado Líquido" value={dre.resultadoLiquido} color={dre.resultadoLiquido >= 0 ? 'text-emerald-700' : 'text-rose-700'} bold />
                </div>
              </div>

              {/* Margens */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Margem Bruta</p>
                  <p className={cn('text-xl font-bold', dre.margemBruta >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {dre.margemBruta.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Margem Líquida</p>
                  <p className={cn('text-xl font-bold', dre.margemLiquida >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {dre.margemLiquida.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Evolução do Faturamento ── */}
      <div className="mb-8">
        <SectionTitle>Evolução do Faturamento (12 meses)</SectionTitle>
        <Card>
          <LineTrendChart
            data={monthlyIncome.map(m => ({ label: m.label, value: m.value }))}
            color="hsl(142, 71%, 45%)"
            trend={trendDirection}
            emptyLabel="Sem receitas registradas ainda"
          />
        </Card>
      </div>

      {/* ── Taxa de Matrícula vs Curso ── */}
      <div className="mb-8">
        <SectionTitle>Taxa de Matrícula vs Pagamento de Curso</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-teal-600" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Taxa de Matrícula Recebida</p>
            <p className="text-3xl font-bold text-teal-600">R$ {fmt(dre.receitaTaxaMatricula)}</p>
            {dre.receitaTotal > 0 && (
              <p className="text-sm text-slate-400 mt-1">{((dre.receitaTaxaMatricula / dre.receitaTotal) * 100).toFixed(1)}% da receita total</p>
            )}
          </Card>
          <Card className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-3">
              <GraduationCap className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pagamento de Curso Recebido</p>
            <p className="text-3xl font-bold text-emerald-600">R$ {fmt(dre.receitaCursos)}</p>
            {dre.receitaTotal > 0 && (
              <p className="text-sm text-slate-400 mt-1">{((dre.receitaCursos / dre.receitaTotal) * 100).toFixed(1)}% da receita total</p>
            )}
          </Card>
        </div>
      </div>

      {/* ── Faturamento por Origem ── */}
      {incomeBySource.length > 0 && (
        <div className="mb-8">
          <SectionTitle>Faturamento por Origem</SectionTitle>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-slate-400" />
              <p className="text-xs text-slate-500">Receita agrupada por origem do lead (campanha / canal)</p>
            </div>
            <ImprovedCSSBarChart
              data={incomeBySource.slice(0, 8)}
              color="hsl(262, 80%, 55%)"
              gradient
              showValues
            />
          </Card>
        </div>
      )}

      {/* ── Receitas e Despesas Mensais ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="font-bold text-slate-800 mb-4">Receitas Mensais</h3>
          <ImprovedCSSBarChart data={monthlyIncome.slice(-6).map(m => ({ label: m.label, value: m.value }))} color="hsl(142, 71%, 45%)" gradient showValues />
        </Card>
        <Card>
          <h3 className="font-bold text-slate-800 mb-4">Despesas Mensais</h3>
          <ImprovedCSSBarChart data={monthlyExpense.slice(-6)} color="hsl(0, 84%, 60%)" gradient showValues />
        </Card>
      </div>

      {/* ── Receita e Despesa por Categoria ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="font-bold text-slate-800 mb-4">Receita por Categoria</h3>
          <ImprovedCSSBarChart data={incomeByCategory.slice(0, 6)} color="hsl(162, 74%, 47%)" gradient showValues />
        </Card>
        <Card>
          <h3 className="font-bold text-slate-800 mb-4">Despesa por Categoria</h3>
          <ImprovedCSSBarChart data={expenseByCategory.slice(0, 6)} color="hsl(25, 90%, 55%)" gradient showValues />
        </Card>
      </div>

      {/* ── Comissões por Vendedor ── */}
      {sellerRevenue.length > 0 && (
        <div className="mb-8">
          <SectionTitle>Comissões por Vendedor</SectionTitle>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 pr-4 text-xs font-bold text-slate-400 uppercase tracking-wide">Vendedor</th>
                    <th className="text-right py-2 pr-4 text-xs font-bold text-slate-400 uppercase tracking-wide">Receita</th>
                    {/* Pluppex */}
                    <th className="text-right py-2 pr-2 text-xs font-bold text-indigo-400 uppercase tracking-wide">% Pluppex</th>
                    <th className="text-right py-2 pr-4 text-xs font-bold text-indigo-400 uppercase tracking-wide">Valor Pluppex</th>
                    {/* Target */}
                    <th className="text-right py-2 pr-2 text-xs font-bold text-orange-400 uppercase tracking-wide">% Target</th>
                    <th className="text-right py-2 pr-4 text-xs font-bold text-orange-400 uppercase tracking-wide">Valor Target</th>
                    {/* Total */}
                    <th className="text-right py-2 text-xs font-bold text-slate-400 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerRevenue.map(sr => (
                    <tr key={sr.seller} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-600 shrink-0">
                            {sr.seller.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-700">{sr.seller}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-700">R$ {fmt(sr.revenue)}</td>
                      {/* Pluppex */}
                      <td className="py-3 pr-2 text-right">
                        {sr.pluppex_rate > 0 ? (
                          <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-0.5 rounded-lg">{sr.pluppex_rate}%</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-indigo-600">
                        {sr.pluppex_commission > 0 ? `R$ ${fmt(sr.pluppex_commission)}` : <span className="text-slate-300">—</span>}
                      </td>
                      {/* Target */}
                      <td className="py-3 pr-2 text-right">
                        {sr.target_rate > 0 ? (
                          <span className="bg-orange-50 text-orange-700 font-bold text-xs px-2 py-0.5 rounded-lg">{sr.target_rate}%</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-orange-500">
                        {sr.target_commission > 0 ? `R$ ${fmt(sr.target_commission)}` : <span className="text-slate-300">—</span>}
                      </td>
                      {/* Total */}
                      <td className="py-3 text-right font-bold text-emerald-600">
                        {sr.total_commission > 0 ? `R$ ${fmt(sr.total_commission)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                    <td className="py-3 pr-4 font-bold text-slate-700" colSpan={2}>Totais</td>
                    <td className="py-3 pr-2" colSpan={2}>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">Pluppex</span>
                        <span className="font-bold text-indigo-600 text-sm">R$ {fmt(dre.pluppexCommissionsTotal)}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4" colSpan={2}>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] font-bold text-orange-400 uppercase">Target</span>
                        <span className="font-bold text-orange-500 text-sm">R$ {fmt(dre.targetCommissionsTotal)}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                        <span className="font-bold text-emerald-700 text-base">R$ {fmt(dre.totalCommissions)}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {sellerRevenue.some(sr => sr.pluppex_rate === 0 && sr.target_rate === 0) && (
              <p className="text-xs text-slate-400 mt-3">
                Configure os percentuais em{' '}
                <a href="/settings/commissions" className="text-emerald-600 font-semibold hover:underline">
                  Configurações → Comissões
                </a>.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── Filtros + Tabela de Transações ── */}
      <div className="mb-4">
        <SectionTitle>Transações</SectionTitle>
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          isLoading={isLoading}
        />
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
                { value: 'income', label: 'Entradas' },
                { value: 'expense', label: 'Saídas' },
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
                { value: 'paid', label: 'Pago' },
                { value: 'pending', label: 'Pendente' },
              ],
            },
          ]}
        />

        <div className="flex gap-3 mb-4">
          <div className="bg-white rounded-xl border border-slate-100 px-4 py-2 flex items-center gap-2 shadow-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-500">Entradas:</span>
            <span className="text-sm font-bold text-emerald-600">R$ {fmt(filteredIncome)}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-4 py-2 flex items-center gap-2 shadow-sm">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <span className="text-xs text-slate-500">Saídas:</span>
            <span className="text-sm font-bold text-rose-600">R$ {fmt(filteredExpense)}</span>
          </div>
        </div>
      </div>

      <TransactionTable filteredTransactions={filteredTransactions} />

      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

function DRERow({
  label,
  value,
  color,
  bold,
  negative,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  bold?: boolean;
  negative?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className={cn('flex items-center justify-between py-1.5', bold && 'font-bold')}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn('w-3.5 h-3.5', color)} />}
        <span className={cn('text-sm', bold ? 'text-slate-800' : 'text-slate-600')}>{label}</span>
      </div>
      <span className={cn('text-sm tabular-nums', color)}>
        {negative ? '- ' : ''}R$ {fmt(value)}
      </span>
    </div>
  );
}
