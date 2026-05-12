import { useState, useMemo } from 'react';
import { 
  Plus, 
  Download, 
  ShieldAlert, 
  LayoutDashboard, 
  HandCoins, 
  Tag, 
  Users, 
  Settings, 
  Handshake, 
  Wallet, 
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar
} from 'lucide-react';
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
import { PeriodFilterModal } from '../components/common/PeriodFilterModal';

type TabId = 'dashboard' | 'cashflow' | 'dre' | 'ote' | 'categories' | 'partner' | 'settings';

// Helper functions for dates
const getISODate = (date: Date) => date.toISOString().split('T')[0];
const getStartOfMonth = (year: number, month: number) => getISODate(new Date(year, month, 1));
const getEndOfMonth = (year: number, month: number) => getISODate(new Date(year, month + 1, 0));

export function Finance() {
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Date States
  const today = new Date();
  const [startDate, setStartDate] = useState(getStartOfMonth(today.getFullYear(), today.getMonth()));
  const [endDate, setEndDate] = useState(getEndOfMonth(today.getFullYear(), today.getMonth()));
  
  // Filter Modal States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  const filterLabel = useMemo(() => {
    const s = new Date(startDate + 'T12:00:00');
    const e = new Date(endDate + 'T12:00:00');
    
    // If it's a full month
    if (s.getDate() === 1 && e.getDate() === new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate() && s.getMonth() === e.getMonth()) {
      return s.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    
    return `${s.toLocaleDateString('pt-BR')} - ${e.toLocaleDateString('pt-BR')}`;
  }, [startDate, endDate]);

  const applyFilter = () => {
    setStartDate(tempStart);
    setEndDate(tempEnd);
    setIsFilterOpen(false);
  };

  const setShortcut = (type: string) => {
    const now = new Date();
    let s = new Date();
    let e = new Date();

    switch (type) {
      case 'today':
        break;
      case 'yesterday':
        s.setDate(s.getDate() - 1);
        e.setDate(e.getDate() - 1);
        break;
      case '7days':
        s.setDate(s.getDate() - 7);
        break;
      case '30days':
        s.setDate(s.getDate() - 30);
        break;
      case 'thisMonth':
        s = new Date(now.getFullYear(), now.getMonth(), 1);
        e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        e = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        s = new Date(now.getFullYear(), 0, 1);
        e = new Date(now.getFullYear(), 11, 31);
        break;
    }

    setTempStart(getISODate(s));
    setTempEnd(getISODate(e));
  };

  const handleMonthChange = (month: number) => {
    const current = new Date(tempStart + 'T12:00:00');
    const s = new Date(current.getFullYear(), month, 1);
    const e = new Date(current.getFullYear(), month + 1, 0);
    setTempStart(getISODate(s));
    setTempEnd(getISODate(e));
  };

  const handleYearChange = (year: number) => {
    const current = new Date(tempStart + 'T12:00:00');
    const s = new Date(year, current.getMonth(), 1);
    const e = new Date(year, current.getMonth() + 1, 0);
    setTempStart(getISODate(s));
    setTempEnd(getISODate(e));
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
    { id: 'ote', label: 'OTE / Comissões', icon: Tag },
    { id: 'partner', label: 'Parceria', icon: Handshake },
    { id: 'categories', label: 'Categorias', icon: Users },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <div className="flex h-full bg-slate-50/50">
      {/* Sidebar - Redesigned to match the more premium feel */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Centro Financeiro</h2>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === tab.id
                    ? "bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50 border border-emerald-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-emerald-600" : "text-slate-400")} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Centro Financeiro</h1>
            <p className="text-xs text-slate-400 font-medium">Gestão de resultados e automação financeira do CRM.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setTempStart(startDate);
                setTempEnd(endDate);
                setIsFilterOpen(true);
              }}
              className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all group"
            >
              <CalendarRange className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              <span className="capitalize">{filterLabel}</span>
            </button>

            {activeTab !== 'categories' && activeTab !== 'settings' && (
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
            
            {hasPermission('finance.create') && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                <Plus className="w-4 h-4" />
                Nova Transação
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && <DashboardTab startDate={startDate} endDate={endDate} />}
          {activeTab === 'cashflow' && <CashFlowTab startDate={startDate} endDate={endDate} />}
          {activeTab === 'dre' && <DreTab startDate={startDate} endDate={endDate} />}
          {activeTab === 'ote' && <OteTab startDate={startDate} endDate={endDate} />}
          {activeTab === 'partner' && <PartnerTab startDate={startDate} endDate={endDate} />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>

      {/* NEW PREMIUM PERIOD FILTER MODAL */}
      <PeriodFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(s, e) => {
          setStartDate(s);
          setEndDate(e);
          setIsFilterOpen(false);
        }}
        currentStartDate={startDate}
        currentEndDate={endDate}
      />

      {/* Modals */}
      <NewTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
