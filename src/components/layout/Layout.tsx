import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../lib/utils';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
