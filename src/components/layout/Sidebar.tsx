import {
  LayoutDashboard,
  Kanban,
  Users,
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
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard',      path: '/' },
  { icon: Kanban,          label: 'Pipeline',        path: '/pipeline' },
  { icon: Users,           label: 'Clientes',        path: '/leads' },
  { icon: DollarSign,      label: 'Financeiro',      path: '/finance' },
  { icon: MessageSquare,   label: 'AI Sales Chat',   path: '/ai-chat' },
  { icon: FileText,        label: 'Contratos',       path: '/contracts' },
  { icon: Package,         label: 'Produtos',        path: '/products' },
  { icon: Megaphone,       label: 'Marketing',       path: '/marketing' },
  { icon: Calendar,        label: 'Tarefas',         path: '/tasks' },
  { icon: GraduationCap,   label: 'Turmas',          path: '/turmas' },
  { icon: Bell,            label: 'Notificações',    path: '/notifications' },
  { icon: Settings,        label: 'Configurações',   path: '/settings' },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ collapsed = false, onToggle, onClose }: SidebarProps) {
  const handleNavClick = () => {
    if (window.innerWidth < 1024 && onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full w-full">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className={cn(
        "flex items-center gap-3 border-b border-slate-100 flex-shrink-0 p-4",
        collapsed && "justify-center gap-0 p-3"
      )}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="p-1.5 rounded-lg transition-colors hover:bg-slate-100 -ml-1 flex-shrink-0"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "w-5 h-5 text-slate-500 transition-transform duration-200",
              !collapsed && "rotate-180"
            )}
          />
        </button>

        <div className={cn(
          "rounded-xl overflow-hidden shadow-md flex-shrink-0",
          collapsed ? "w-9 h-9" : "w-10 h-10"
        )}>
          <img
            src="https://tfwclxxcgnmndcnbklkx.supabase.co/storage/v1/object/public/icones/5.png"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex items-center">
            <img
              src="https://tfwclxxcgnmndcnbklkx.supabase.co/storage/v1/object/public/icones/Logotipo%20da%20TARGET%20AGROTECH.png"
              alt="Target Agrotech CRM"
              className="h-32 w-auto object-contain"
            />
          </div>
        )}
      </header>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {menuItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={handleNavClick}
            title={collapsed ? label : undefined}
            className={({ isActive }) => cn(
              "flex items-center rounded-xl px-3 h-12 text-sm font-medium transition-all duration-200 overflow-hidden border",
              collapsed ? "justify-center" : "gap-3",
              isActive
                ? "bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-700 border-emerald-200 shadow-sm"
                : "text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
            )}
          >
            <Icon aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="p-3 border-t border-slate-100 flex-shrink-0">
        <button
          type="button"
          title={collapsed ? "Sair" : undefined}
          className={cn(
            "flex items-center w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            "hover:bg-red-50 text-red-500 hover:text-red-600",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          <LogOut aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </footer>

    </div>
  );
}
