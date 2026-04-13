import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { usePipelineStore } from '../../store/usePipelineStore';
import { useLeadStore } from '../../store/useLeadStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useTurmaStore } from '../../store/useTurmaStore';
import { useProductStore } from '../../store/useProductStore';
import { useContractStore } from '../../store/useContractStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useMarketingStore } from '../../store/useMarketingStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useCargoStore } from '../../store/useCargoStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useNotificationStore } from '../../store/useNotificationStore';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    // Start all real-time subscriptions globally when user is authenticated
    const unsubPipelines = usePipelineStore.getState().subscribe();
    const unsubLeads = useLeadStore.getState().subscribeToLeads();
    const unsubTasks = useTaskStore.getState().subscribe();
    const unsubTurmas = useTurmaStore.getState().subscribe();
    const unsubProducts = useProductStore.getState().subscribe();
    const unsubContracts = useContractStore.getState().subscribe();
    const unsubFinance = useFinanceStore.getState().subscribe();
    const unsubMarketing = useMarketingStore.getState().subscribe();
    const unsubProfiles = useProfileStore.getState().subscribe();
    const unsubCargos = useCargoStore.getState().subscribe();
    useCargoStore.getState().fetchCargos();
    useProfileStore.getState().fetchProfiles();
    const unsubCategories = useCategoryStore.getState().subscribe();
    const unsubNotifications = useNotificationStore.getState().subscribe();

    // Initial fetch
    useNotificationStore.getState().fetchNotifications();

    return () => {
      unsubPipelines();
      unsubLeads();
      unsubTasks();
      unsubTurmas();
      unsubProducts();
      unsubContracts();
      unsubFinance();
      unsubMarketing();
      unsubProfiles();
      unsubCargos();
      unsubCategories();
      unsubNotifications();
    };
  }, [user]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 overflow-hidden">
      <aside className={cn(
        "w-16 transition-all duration-300 ease-out border-r border-slate-100/50 bg-white/90 backdrop-blur-md shadow-2xl z-40 flex-shrink-0 h-screen flex overflow-hidden",
        sidebarCollapsed ? "w-16" : "w-72"
      )}>
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          isOpen={isMobileSidebarOpen} 
          onClose={() => setIsMobileSidebarOpen(false)} 
        />
      </aside>
      
      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
