import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, TrendingDown, GraduationCap, ArrowRightLeft } from 'lucide-react';
import { transactionService } from '../../services/transactionService';
import { FinancialTransaction } from '../../types/finance_v2';
import { cn } from '../../lib/utils';
import { useProfileStore } from '../../store/useProfileStore';
import { useProductStore } from '@/store/useProductStore';
import { calcCashFlowKPIs } from '../../calculations/cashFlowMetrics';

// Sub-components
import { KPIsGrid } from './cash-flow/KPIsGrid';
import { SummaryTab } from './cash-flow/SummaryTab';
import { StudentsTab } from './cash-flow/StudentsTab';
import { MovementsTab } from './cash-flow/MovementsTab';
import { HistoryTab } from './cash-flow/HistoryTab';

type TxWithLead = FinancialTransaction & {
  leads?: { responsible: any; id: string; name: string; value: number; product: string | null } | null;
  turmas?: { id: string; name: string; date: string } | null;
};

type GanhoLead = {
  id: string; name: string; created_at: string; value: string | number; product: string | null;
  discount?: string | number; discount_type?: 'percent' | 'money'; discount_applied?: boolean;
  valor_recebido?: number | null; taxa_matricula_recebido?: number | null;
  pix_completed?: boolean; professor_proof_url?: string | null; responsible?: string | null;
};

export function CashFlowTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const products = useProductStore(state => state.products);
  const [activeTab, setActiveTab] = useState<'summary' | 'students' | 'movements' | 'history'>('summary');
  const [transactions, setTransactions] = useState<TxWithLead[]>([]);
  const [allTransactions, setAllTransactions] = useState<FinancialTransaction[]>([]);
  const [ganhoLeads, setGanhoLeads] = useState<GanhoLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSquad, setSelectedSquad] = useState('all');
  const [centroCustos, setCentroCustos] = useState<any[]>([]);
  const [selectedCentroCusto, setSelectedCentroCusto] = useState('all');

  const { profiles, fetchProfiles } = useProfileStore();

  useEffect(() => { fetchProfiles(); transactionService.getCentroCustos().then(setCentroCustos); }, [fetchProfiles]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txData, allTxData, ganhoData] = await Promise.all([
        transactionService.getCashFlowTransactions(startDate, endDate, selectedCentroCusto !== 'all' ? selectedCentroCusto : undefined),
        transactionService.getAll({ startDate, endDate, centroCustoId: selectedCentroCusto !== 'all' ? selectedCentroCusto : undefined }),
        transactionService.getGanhoLeads(startDate, endDate),
      ]);
      setTransactions(txData as TxWithLead[]);
      setAllTransactions(allTxData);
      setGanhoLeads(ganhoData);
    } finally { setIsLoading(false); }
  }, [startDate, endDate, selectedCentroCusto]);

  useEffect(() => { loadData(); }, [loadData, selectedCentroCusto]);

  const getSquadForName = useCallback((name?: string | null) => {
    if (!name) return null;
    return profiles.find(p => p.name === name)?.department?.toUpperCase();
  }, [profiles]);

  const kpis = useMemo(() => {
    const filteredGanhoLeads = ganhoLeads.filter(l => selectedSquad === 'all' || getSquadForName(l.responsible) === selectedSquad);
    const filteredTransactions = transactions.filter(t => selectedSquad === 'all' || getSquadForName(t.leads?.responsible || (t as any).responsible) === selectedSquad);
    return calcCashFlowKPIs(filteredGanhoLeads as any, filteredTransactions, products);
  }, [transactions, ganhoLeads, products, selectedSquad, getSquadForName]);

  const pipelineTxs = transactions.filter(t => t.origin_type === 'PIPELINE' && t.type === 'INCOME' && (selectedSquad === 'all' || getSquadForName(t.leads?.responsible) === selectedSquad));
  const otherTxs = transactions.filter(t => !((t.origin_type === 'PIPELINE' && t.type === 'INCOME') || t.origin_type === 'COMMISSION') && (selectedSquad === 'all' || getSquadForName(t.leads?.responsible || (t as any).responsible) === selectedSquad));

  const studentsByProduct = useMemo(() => {
    const groups: Record<string, any> = {};
    pipelineTxs.forEach(t => {
      const label = (t as any).centro_custos?.nome || t.cost_center || 'Cursos';
      if (!groups[label]) groups[label] = { product: label, total: 0, count: 0, items: [] };
      groups[label].total += Number(t.amount); groups[label].count += 1; groups[label].items.push(t);
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [pipelineTxs]);

  const movementsGrouped: Record<string, any[]> = {};
  otherTxs.forEach(t => {
    const d = (t.status === 'PAID' ? t.payment_date : t.due_date) ?? t.created_at.split('T')[0];
    if (!movementsGrouped[d]) movementsGrouped[d] = [];
    movementsGrouped[d].push(t);
  });

  const filteredAll = allTransactions.filter(t => {
    if (t.origin_type === 'COMMISSION') return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (selectedSquad !== 'all' && getSquadForName(t.leads?.responsible || (t as any).responsible) !== selectedSquad) return false;
    if (searchTerm.trim() && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const TabButton = ({ id, label, icon: Icon, count }: { id: typeof activeTab, label: string, icon: any, count?: number }) => (
    <button onClick={() => setActiveTab(id)} className={cn('flex items-center gap-2 px-4 py-3 border-b-2 transition-all text-sm font-bold', activeTab === id ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
      <Icon size={16} />{label}{count !== undefined && count > 0 && <span className={cn('ml-1 px-1.5 py-0.5 rounded-full text-[10px]', activeTab === id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{count}</span>}
    </button>
  );

  return (
    <div className="space-y-6">
      <KPIsGrid kpis={kpis} />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/30">
          <TabButton id="summary" label="Resumo" icon={Wallet} />
          <TabButton id="students" label="Entradas" icon={GraduationCap} count={pipelineTxs.length} />
          <TabButton id="movements" label="Despesas" icon={TrendingDown} count={otherTxs.length} />
          <TabButton id="history" label="Histórico" icon={ArrowRightLeft} />
        </div>
        <div className="p-0 min-h-[400px]">
          {activeTab === 'summary' && <SummaryTab kpis={kpis} pipelinePendingCount={pipelineTxs.filter(t => t.status !== 'PAID').length} pipelinePaidCount={pipelineTxs.filter(t => t.status === 'PAID').length} />}
          {activeTab === 'students' && <StudentsTab studentsByProduct={studentsByProduct} />}
          {activeTab === 'movements' && <MovementsTab sortedDates={Object.keys(movementsGrouped).sort((a, b) => b.localeCompare(a))} grouped={movementsGrouped} />}
          {activeTab === 'history' && (
            <HistoryTab
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              filterType={filterType} setFilterType={setFilterType}
              filterStatus={filterStatus} setFilterStatus={setFilterStatus}
              selectedSquad={selectedSquad} setSelectedSquad={setSelectedSquad}
              selectedCentroCusto={selectedCentroCusto} setSelectedCentroCusto={setSelectedCentroCusto}
              centroCustos={centroCustos} filteredAll={filteredAll}
              handleMarkAsPaid={async (id) => { await transactionService.markAsPaid(id); loadData(); }}
              handleCancel={async (id) => { if (confirm('Cancelar transação?')) { await transactionService.cancel(id); loadData(); } }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
