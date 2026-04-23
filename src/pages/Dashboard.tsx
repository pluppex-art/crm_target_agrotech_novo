import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { DateFilter } from '../components/finance/DateFilter';
import { Loader2, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useLeadStore } from '../store/useLeadStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useProfileStore } from '../store/useProfileStore';
import { useTurmaStore } from '../store/useTurmaStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { goalService } from '../services/goalService';
import { cn, isVendedor } from '../lib/utils';

import { useSalesMetrics } from '../hooks/useSalesMetrics';
import { useFinanceMetrics } from '../hooks/useFinanceMetrics';
import { SalesOverview } from '../components/dashboard/SalesOverview';
import { PipelineFunnel } from '../components/dashboard/PipelineFunnel';
import { TrendsSection } from '../components/dashboard/TrendsSection';
import { FinanceOverview } from '../components/dashboard/FinanceOverview';

type View = 'all' | 'sales' | 'finance';

export function Dashboard() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [view, setView] = useState<View>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { fetchTransactions, isLoading: financeLoading, subscribe: subscribeFinance } = useFinanceStore();
  const { fetchLeads, isLoading: leadsLoading, subscribeToLeads } = useLeadStore();
  const { profiles, fetchProfiles } = useProfileStore();
  const { fetchTurmas } = useTurmaStore();
  const { user: currentUser } = useAuthStore();
  const { fetchPipelines } = usePipelineStore();

  const [goals, setGoals] = useState<any[]>([]);

  const didFetch = useRef(false);

  useEffect(() => {
    if (startDate || endDate) return;
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (didFetch.current) return;
    didFetch.current = true;
    fetchLeads();
    fetchTransactions();
    fetchProfiles();
    fetchTurmas();
    fetchPipelines();
    const goalsData = await goalService.getGoals();
    setGoals(goalsData);
  }, [fetchLeads, fetchTransactions, fetchProfiles, fetchTurmas, fetchPipelines]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const unsubLeads = subscribeToLeads();
    const unsubFinance = subscribeFinance();
    return () => {
      unsubLeads?.();
      unsubFinance?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = leadsLoading || financeLoading;

  const currentSellerName = useMemo(() => {
    if (!currentUser) return null;
    const sellerProfile = profiles.find(p => isVendedor(p) && p.name === currentUser.user_metadata?.name);
    return sellerProfile?.name || null;
  }, [profiles, currentUser]);

  const salesMetrics = useSalesMetrics({ currentSellerName, startDate, endDate, goals });
  const financeMetrics = useFinanceMetrics();
  const netProfit = financeMetrics.totalIncome - financeMetrics.totalExpense;
  const margin = financeMetrics.margin;
  const totalSalesGoal = goals.reduce((sum, g) => sum + (g.revenue_goal || 0), 0);

  if (permissionsLoading) return null;

  if (!hasPermission('dashboard.view') && !hasPermission('admin.all')) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-28 h-28 bg-slate-200 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
          <ShieldAlert className="w-16 h-16 text-slate-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-4">Dashboard Privado</h2>
        <p className="text-xl text-slate-500 max-w-lg mb-8 leading-relaxed">
          Você precisa da permissão <code className="bg-slate-100 px-3 py-1.5 rounded-xl text-lg font-mono text-slate-700 shadow-sm border">dashboard.view</code> para acessar.
        </p>
        <p className="text-sm text-slate-400 uppercase tracking-widest font-bold">Contate o administrador</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#f3f6f9] min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {view === 'all' ? 'Dashboard' : view === 'sales' ? 'Dashboard de Vendas' : 'Dashboard Financeiro'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {view === 'all' ? 'Visão geral do CRM.' : view === 'sales' ? 'Performance comercial e pipeline.' : 'Fluxo de caixa e transações.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex gap-1">
            {(['all', 'sales', 'finance'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-4 py-1.5 text-xs font-bold rounded-lg transition-all',
                  view === v ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {v === 'all' ? 'Tudo' : v === 'sales' ? 'Vendas' : 'Financeiro'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period Filter */}
      {(view === 'sales' || view === 'finance') && (
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          isLoading={isLoading}
        />
      )}

      {/* Sales View */}
      {(view === 'all' || view === 'sales') && (
        <div>
          <SalesOverview sales={salesMetrics} currentSellerName={currentSellerName} isLoading={isLoading} />
          <PipelineFunnel sales={salesMetrics} />
          <TrendsSection 
            sales={salesMetrics} 
            totalIncome={financeMetrics.totalIncome} 
            totalSalesGoal={totalSalesGoal} 
          />
        </div>
      )}

      {/* Finance View */}
      {(view === 'all' || view === 'finance') && (
        <FinanceOverview finance={financeMetrics} netProfit={netProfit} margin={margin} />
      )}
    </div>
  );
}
