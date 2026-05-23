import { useState, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
import { useSquadStore } from '../../store/useSquadStore';
import { TaskReminderWatcher } from '../tasks/TaskReminderWatcher';


export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
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
    // Squads - Fetch once on mount
    useSquadStore.getState().fetchSquads();



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
      <TaskReminderWatcher />
      {/* Sidebar - Hidden on mobile/tablet, shown as overlay, always visible on desktop (lg) */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 lg:relative lg:flex h-screen flex-shrink-0 transition-all duration-300 ease-out bg-white/90 backdrop-blur-md border-r border-slate-100/50 shadow-2xl overflow-hidden",
        isMobileSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0",
        !isMobileSidebarOpen && "lg:w-16",
        !sidebarCollapsed && "lg:w-72"
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
        <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 relative">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
