import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Loader2, ShieldAlert, Users, Filter, Search, ChevronDown, ChevronUp, X, Calendar, GitBranch, Package, User } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useLeadStore } from '../store/useLeadStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useProfileStore } from '../store/useProfileStore';
import { useTurmaStore } from '../store/useTurmaStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { goalService } from '../services/goalService';
import { isVendedor } from '../lib/utils';

import { useSalesMetrics } from '../hooks/useSalesMetrics';
import { useFinanceMetrics } from '../hooks/useFinanceMetrics';
import { MetricCard } from '../components/dashboard/MetricCard';
import { HorizontalBar } from '../components/dashboard/HorizontalBar';
import { DoughnutChart } from '../components/dashboard/DoughnutChart';
import { FunnelChart } from '../components/dashboard/FunnelChart';
import { TrendsSection } from '../components/dashboard/TrendsSection';
import { GoalVsIncomeChart } from '../components/dashboard/GoalVsIncomeChart';
import { ImprovedCSSBarChart } from '../components/dashboard/ImprovedCSSBarChart';
import { SellerSemaphore } from '../components/dashboard/SellerSemaphore';

type OccupancyItem = { name: string; pct: number; level: 'red' | 'yellow' | 'green'; alunos: number; capacity: number; color: string; category: string };

const CATEGORY_ICONS: Record<string, string> = {
  'Drone': '🚁',
  'Inseminação Artificial': '🐄',
  'Inseminação': '🐄',
  'Inseminacao': '🐄',
};

function OccupancyCard({ occupancyData }: { occupancyData: OccupancyItem[] }) {
  const categories = useMemo(() => {
    const seen = new Set<string>();
    occupancyData.forEach(d => seen.add(d.category));
    return Array.from(seen).sort();
  }, [occupancyData]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Auto-select the category with the most turmas once data loads
  useEffect(() => {
    if (activeCategory === null && categories.length > 0) {
      const best = categories.reduce((a, b) =>
        occupancyData.filter(d => d.category === b).length > occupancyData.filter(d => d.category === a).length ? b : a
      , categories[0]);
      setActiveCategory(best);
    }
  }, [categories, activeCategory, occupancyData]);

  const filtered = activeCategory
    ? occupancyData.filter(d => d.category === activeCategory)
    : occupancyData;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-800">Taxa de Ocupação por Turma</h3>
        {categories.length > 1 && (
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {categories.map(cat => {
              const icon = CATEGORY_ICONS[cat] ?? cat.charAt(0);
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  title={cat}
                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                    isActive ? 'bg-white shadow-sm' : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  {icon}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <ImprovedCSSBarChart
        data={filtered.map(d => ({
          label: d.name,
          value: d.alunos,
          sublabel: `${d.alunos}/${d.capacity}`,
          color: d.level === 'green' ? '#10b981' : d.level === 'yellow' ? '#f59e0b' : '#ef4444',
        }))}
        emptyLabel="Nenhuma turma cadastrada"
        minBarWidth={72}
        chartHeight={240}
      />
    </div>
  );
}

export function Dashboard() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { fetchTransactions, isLoading: financeLoading, subscribe: subscribeFinance } = useFinanceStore();
  const { fetchLeads, isLoading: leadsLoading, subscribeToLeads } = useLeadStore();
  const { profiles, fetchProfiles } = useProfileStore();
  const { fetchTurmas } = useTurmaStore();
  const { user: currentUser } = useAuthStore();
  const { fetchPipelines } = usePipelineStore();

  const [goals, setGoals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const didFetch = useRef(false);

  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    return {
      value: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
    };
  }), []);

  const handleMonthSelect = useCallback((val: string) => {
    setSelectedMonth(val);
    if (val === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const [y, m] = val.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const handleStartDateChange = useCallback((v: string) => { setStartDate(v); setSelectedMonth('all'); }, []);
  const handleEndDateChange = useCallback((v: string) => { setEndDate(v); setSelectedMonth('all'); }, []);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStage('all');
    setFilterProduct('all');
    setFilterResponsible('all');
    setSelectedMonth('all');
    setStartDate('');
    setEndDate('');
  }, []);

  useEffect(() => {
    // No default date filter; matches 'Todos os meses' default state.
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

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  useEffect(() => {
    const unsubLeads = subscribeToLeads();
    const unsubFinance = subscribeFinance();
    return () => { unsubLeads?.(); unsubFinance?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = leadsLoading || financeLoading;

  const currentSellerName = useMemo(() => {
    if (!currentUser) return null;
    const sellerProfile = profiles.find(p => isVendedor(p) && p.name === currentUser.user_metadata?.name);
    return sellerProfile?.name || null;
  }, [profiles, currentUser]);

  const salesMetrics = useSalesMetrics({
    currentSellerName, startDate, endDate, goals,
    searchTerm, filterStage, filterProduct, filterResponsible,
  });
  const financeMetrics = useFinanceMetrics();
  const companyGoal = goals.find(g => g.type === 'company');
  const totalLeadsGoal = companyGoal?.leads_goal ?? 0;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard de Vendas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Performance comercial e pipeline.</p>
        </div>
        {isLoading && <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />}
      </div>

      {/* Unified Filters */}
      {(() => {
        const activeCount = [
          searchTerm,
          filterStage !== 'all' ? filterStage : '',
          filterProduct !== 'all' ? filterProduct : '',
          filterResponsible !== 'all' ? filterResponsible : '',
          startDate || endDate ? 'date' : '',
        ].filter(Boolean).length;

        const selectCls = (active: boolean) =>
          `w-full pr-8 py-2 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer text-sm font-medium transition-all text-ellipsis whitespace-nowrap overflow-hidden ${
            active ? 'bg-emerald-50/50 border-emerald-300 text-emerald-800' : 'border-gray-200 text-gray-700'
          }`;

        return (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
            {/* Header — clicável para minimizar */}
            <button
              onClick={() => setFiltersOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors rounded-t-2xl"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Filter size={16} className={activeCount > 0 ? 'text-emerald-600' : 'text-gray-400'} />
                <span>Filtros</span>
                {activeCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-black bg-emerald-600 text-white rounded-full">
                    {activeCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
                {activeCount > 0 && (
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); clearAllFilters(); }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    Limpar
                  </span>
                )}
                {filtersOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>

            {/* Inputs — colapsável */}
            {filtersOpen && (
              <div className="flex flex-wrap items-center gap-3 p-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="text"
                    placeholder="Buscar por nome, produto ou responsável..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Month */}
                <div className="relative min-w-[160px] shrink-0">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                  <select
                    value={selectedMonth}
                    onChange={e => handleMonthSelect(e.target.value)}
                    className={`pl-9 ${selectCls(selectedMonth !== 'all')}`}
                  >
                    <option value="all">Todos os meses</option>
                    {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                </div>

                {/* De */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-slate-400 uppercase">De:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Até */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-slate-400 uppercase">Até:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => handleEndDateChange(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Stage */}
                <div className="relative min-w-[160px] shrink-0">
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                  <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className={`pl-9 ${selectCls(filterStage !== 'all')}`}>
                    <option value="all">Todos os estágios</option>
                    {salesMetrics.pipelineStages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                </div>

                {/* Product */}
                <div className="relative min-w-[160px] shrink-0">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                  <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className={`pl-9 ${selectCls(filterProduct !== 'all')}`}>
                    <option value="all">Todos os produtos</option>
                    {salesMetrics.availableProducts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                </div>

                {/* Responsible */}
                <div className="relative min-w-[160px] shrink-0">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                  <select value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)} className={`pl-9 ${selectCls(filterResponsible !== 'all')}`}>
                    <option value="all">Todos responsáveis</option>
                    {salesMetrics.availableResponsibles.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <MetricCard label="Total de Leads" value={String(salesMetrics.leadsCount)} icon={Users} color="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Ganhos" value={String(salesMetrics.closedLeadsCount)} icon={Users} color="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Conversão" value={`${salesMetrics.conversionRate.toFixed(1)}%`} icon={Users} color="bg-purple-50 text-purple-600" />
        <MetricCard label="Em Proposta" value={String(salesMetrics.pipelineStages.find(s => s.label === 'Proposta')?.value || 0)} icon={Users} color="bg-rose-50 text-rose-600" />
        <MetricCard label="Qualificados" value={String(salesMetrics.pipelineStages.find(s => s.label === 'Qualificado')?.value || 0)} icon={Users} color="bg-blue-50 text-blue-600" />
      </div>

      {/* ── Ranking + Semáforo + Taxa de Ocupação ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ranking de Vendedores */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-5">Ranking de Vendedores</h3>
          {salesMetrics.allSellersRanking.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10 text-slate-300">
              <Users className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-medium">Sem vendedores cadastrados</p>
            </div>
          ) : (
            <div className="space-y-5 flex-1">
              {salesMetrics.allSellersRanking.slice(0, 7).map((s, i) => (
                <HorizontalBar
                  key={s.label}
                  label={s.label}
                  value={s.value}
                  received={s.count}
                  max={s.leads_goal}
                  percentage={s.percentage}
                  rank={i}
                  count={s.count}
                  color={i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-amber-400' : i === 3 ? 'bg-rose-400' : 'bg-slate-300'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Semáforo dos Vendedores */}
        <SellerSemaphore
          data={salesMetrics.sellerSemaphoreData}
          currentSellerName={currentSellerName}
          isAdmin={hasPermission('admin.all')}
          companyRevenueGoal={companyGoal?.revenue_goal || 0}
        />
      </div>

      {/* Taxa de Ocupação por Turma */}
      <div className="mb-6">
        <OccupancyCard occupancyData={salesMetrics.occupancyData} />
      </div>

      {/* ── Linha 2: Pipeline + Funil ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col overflow-hidden">
          <h3 className="font-bold text-slate-800 mb-5">Distribuição do Pipeline</h3>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <DoughnutChart
              data={salesMetrics.pipelineStages.map(s => ({ label: s.label, value: s.value, color: s.color }))}
              totalLabel="Leads"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col overflow-hidden">
          <h3 className="font-bold text-slate-800 mb-5">Funil de Conversão</h3>
          <div className="flex-1 overflow-hidden">
            <FunnelChart
              stages={salesMetrics.funnelStagesWithRates.map(s => ({
                label: s.label,
                count: s.value,
                color: s.color,
              }))}
              conversionRate={salesMetrics.totalConversionRate}
            />
          </div>
        </div>
      </div>

      {/* Trends + Meta */}
      <TrendsSection
        sales={salesMetrics}
        totalAchieved={salesMetrics.closedLeadsCount}
        totalGoal={totalLeadsGoal}
      />
    </div>
  );
}
