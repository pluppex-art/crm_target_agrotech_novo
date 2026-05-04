import { useState } from 'react';
import { Plus, Download, ShieldAlert, LayoutDashboard, HandCoins, Tag, Users, Settings, Handshake, Wallet, CalendarRange } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { NewTransactionModal } from '../components/finance/NewTransactionModal';
import { DashboardTab } from '../components/finance/DashboardTab';
import { CashFlowTab } from '../components/finance/CashFlowTab';
import { DreTab } from '../components/finance/DreTab';
import { OteTab } from '../components/finance/OteTab';
import { CategoriesTab } from '../components/finance/CategoriesTab';
import { PartnerTab } from '../components/finance/PartnerTab';
import { SettingsTab } from '../components/finance/SettingsTab';
import { cn } from '../lib/utils';

type TabId = 'dashboard' | 'cashflow' | 'dre' | 'ote' | 'categories' | 'partner' | 'settings';

const today = new Date();
const defaultPeriod = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

function getLastDay(firstDay: string): string {
  const d = new Date(firstDay + 'T12:00:00');
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
}

function formatPeriodLabel(firstDay: string): string {
  return new Date(firstDay + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function Finance() {
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState(defaultPeriod);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempPeriod, setTempPeriod] = useState(defaultPeriod);

  const startDate = filterPeriod;
  const endDate = getLastDay(filterPeriod);

  const openFilter = () => {
    setTempPeriod(filterPeriod);
    setIsFilterOpen(true);
  };

  const applyFilter = () => {
    setFilterPeriod(tempPeriod);
    setIsFilterOpen(false);
  };

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
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cashflow', label: 'Fluxo de Caixa', icon: Wallet },
    { id: 'dre', label: 'DRE', icon: HandCoins },
    { id: 'ote', label: 'OTE / Comissões', icon: Users },
    { id: 'partner', label: 'Parceria', icon: Handshake },
    { id: 'categories', label: 'Categorias', icon: Tag },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sub-sidebar */}
      <aside className="w-52 flex-shrink-0 bg-white border-r border-slate-100 overflow-y-auto flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Centro Financeiro</p>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabId)}
              className={cn(
                'w-full flex items-center gap-2.5 rounded-xl px-3 h-9 text-sm font-medium transition-all',
                activeTab === id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f3f6f9]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 bg-white border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Centro Financeiro</h1>
            <p className="text-sm text-slate-500">Gestão de resultados e automação financeira do CRM.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={openFilter}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium hover:bg-slate-50 transition-all"
            >
              <CalendarRange className="w-4 h-4 text-slate-500" />
              <span className="capitalize">{formatPeriodLabel(filterPeriod)}</span>
            </button>
            {hasPermission('finance.export') && (
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium hover:bg-slate-50 transition-all">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
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

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && <DashboardTab startDate={startDate} endDate={endDate} />}
          {activeTab === 'cashflow' && <CashFlowTab startDate={startDate} endDate={endDate} />}
          {activeTab === 'dre' && <DreTab startDate={startDate} endDate={endDate} />}
          {activeTab === 'ote' && <OteTab periodMonth={filterPeriod} />}
          {activeTab === 'partner' && <PartnerTab startDate={startDate} endDate={endDate} />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>

      {/* Period filter modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setIsFilterOpen(false)}>
          <div className="bg-white rounded-2xl p-6 shadow-xl w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-800 mb-4">Filtrar Período</h3>
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mês de referência</label>
              <input
                type="month"
                value={tempPeriod.substring(0, 7)}
                onChange={(e) => setTempPeriod(`${e.target.value}-01`)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={applyFilter}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
