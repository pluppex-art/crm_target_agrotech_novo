import {
  LayoutDashboard,
  Kanban,
  Users,
  Clock,
  Calendar,
  Settings,
  LogOut,
  Bell,
  ChevronRight,
  DollarSign,
  MessageSquare,
  FileText,
  Package,
  Megaphone,
  GraduationCap,
  X as XIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', permission: 'dashboard.view' },
  { icon: Kanban, label: 'Pipeline', path: '/pipeline', permission: 'pipeline.view' },
  { icon: Clock, label: 'Horário de Ponto', path: '/ponto' },
  { icon: DollarSign, label: 'Financeiro', path: '/finance', permission: 'finance.view' },
  { icon: MessageSquare, label: 'AI Sales Chat', path: '/ai-chat', permission: 'ai-chat.view' },
  { icon: FileText, label: 'Contratos', path: '/contracts', permission: 'contracts.view' },
  { icon: Package, label: 'Produtos', path: '/products', permission: 'products.view' },
  { icon: Megaphone, label: 'Marketing', path: '/marketing', permission: 'marketing.view' },
  { icon: Calendar, label: 'Tarefas', path: '/tasks', permission: 'tasks.view' },
  { icon: GraduationCap, label: 'Turmas', path: '/turmas', permission: 'turmas.view' },
  { icon: Bell, label: 'Notificações', path: '/notifications' },
  { icon: Settings, label: 'Configurações', path: '/settings', permission: 'settings.view' },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ collapsed = false, onToggle, onClose, isOpen }: SidebarProps) {
  const { user, signOut } = useAuthStore();
  const { profiles, fetchProfiles } = useProfileStore();

  useEffect(() => {
    if (profiles.length === 0) {
      fetchProfiles();
    }
  }, [fetchProfiles, profiles.length]);

  const currentProfile = profiles.find(p => p.id === user?.id);
  const userPermissions = currentProfile?.cargos?.permissions || [];
  const isAdmin = userPermissions.includes('admin.all');

  const handleNavClick = () => {
    if (window.innerWidth < 1024 && onClose) onClose();
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (isAdmin) return true;
    if (!item.permission) return true;
    return userPermissions.includes(item.permission);
  });

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 transition-colors duration-300">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className={cn(
        "flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 p-4 min-h-[64px]",
        collapsed && !isOpen && "justify-center gap-0 p-3"
      )}>
        {/* Toggle Button - Only show on desktop (lg) */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="hidden lg:flex p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 -ml-1 flex-shrink-0"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform duration-200",
              !collapsed && "rotate-180"
            )}
          />
        </button>

        {/* Close Button - Only show on mobile (below lg) */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 -ml-1 flex-shrink-0"
        >
          <XIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>

        <div className={cn(
          "rounded-xl overflow-hidden shadow-md flex-shrink-0",
          (collapsed && !isOpen) ? "w-9 h-9" : "w-10 h-10"
        )}>
          <img
            src="https://tfwclxxcgnmndcnbklkx.supabase.co/storage/v1/object/public/icones/5.png"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
        </div>

        {(!collapsed || isOpen) && (
          <div className="min-w-0 flex items-center">
            <img
              src="https://tfwclxxcgnmndcnbklkx.supabase.co/storage/v1/object/public/icones/Logotipo%20da%20TARGET%20AGROTECH.png"
              alt="Target Agrotech CRM"
              className="h-10 w-auto object-contain dark:brightness-0 dark:invert"
            />
          </div>
        )}
      </header>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {filteredMenuItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={handleNavClick}
            title={collapsed ? label : undefined}
            className={({ isActive }) => cn(
              "flex items-center rounded-xl px-3 h-12 text-sm font-medium transition-all duration-200 overflow-hidden border",
              (collapsed && !isOpen) ? "justify-center" : "gap-3",
              isActive
                ? "bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-700 dark:from-emerald-500/20 dark:to-emerald-600/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 shadow-sm"
                : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-200 hover:border-slate-100 dark:border-slate-800 dark:hover:border-slate-700"
            )}
          >
            <Icon aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || isOpen) && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="p-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
        <button
          type="button"
          onClick={signOut}
          title={(collapsed && !isOpen) ? "Sair" : undefined}
          className={cn(
            "flex items-center w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            "hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
            (collapsed && !isOpen) ? "justify-center" : "gap-3"
          )}
        >
          <LogOut aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isOpen) && <span>Sair</span>}
        </button>
      </footer>

    </div>
  );
}
