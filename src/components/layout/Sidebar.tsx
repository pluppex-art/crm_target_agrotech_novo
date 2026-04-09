import { 
  LayoutDashboard, 
  Kanban,
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  Leaf,
  ChevronRight,
  DollarSign,
  MessageSquare,
  FileText,
  Package,
  Megaphone,
  GraduationCap,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Kanban, label: 'Pipeline', path: '/pipeline' },
  { icon: Users, label: 'Leads', path: '/leads' },
  { icon: DollarSign, label: 'Finance', path: '/finance' },
  { icon: MessageSquare, label: 'AI Sales Chat', path: '/ai-chat' },
  { icon: FileText, label: 'Contracts', path: '/contracts' },
  { icon: Package, label: 'Products', path: '/products' },
  { icon: Megaphone, label: 'Marketing', path: '/marketing' },
  { icon: Calendar, label: 'Tasks', path: '/tasks' },
  { icon: GraduationCap, label: 'Classes', path: '/turmas' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar({ collapsed = false, onToggle, isOpen, onClose }: { collapsed?: boolean, onToggle?: () => void, isOpen?: boolean, onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className={cn("p-4 border-b border-slate-100 flex-shrink-0", collapsed && "p-3 justify-center")}>
        <div className={cn("flex items-center gap-3", collapsed && "gap-0 justify-center")}>
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-all -ml-1 group"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <ChevronRight className={cn("w-5 h-5 transition-transform duration-200", collapsed && "rotate-180")} />
          </button>
          <div className={cn(
            "w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg drop-shadow-sm",
            collapsed && "w-9 h-9"
          )}>
            <Leaf className="w-4.5 h-4.5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex flex-col leading-tight">
              <span className="text-lg font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900/90 to-slate-800/90 bg-clip-text">Target</span>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Agrotech CRM</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "group flex items-center rounded-xl p-3 text-sm font-medium transition-all duration-200 h-12 overflow-hidden relative",
              isActive 
                ? "bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-700 border border-emerald-200 shadow-sm" 
                : "text-slate-600 hover:bg-slate-50/50 hover:text-slate-900 hover:shadow-sm border border-transparent"
            )}
            onClick={() => {
              if (window.innerWidth < 1024 && onClose) onClose();
            }}
          >
            <item.icon className={cn("w-5 h-5 flex-shrink-0 opacity-90", collapsed && "opacity-100")} />
            {!collapsed && (
              <span className="ml-3 truncate font-medium">{item.label}</span>
            )}
            {!collapsed && (
              <button 
                className="ml-auto p-1 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-slate-200"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle?.();
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0">
        <button className={cn(
          "flex items-center gap-3 w-full rounded-xl text-sm font-medium transition-all group px-3 py-2.5",
          collapsed ? "justify-center" : ""
        )}>
          <LogOut className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
          {!collapsed && <span className="font-semibold text-red-600">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

