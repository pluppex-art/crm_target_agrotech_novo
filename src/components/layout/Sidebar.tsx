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
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Kanban, label: 'Pipeline', path: '/pipeline' },
  { icon: Users, label: 'Leads', path: '/leads' },
  { icon: DollarSign, label: 'Financeiro', path: '/finance' },
  { icon: MessageSquare, label: 'IA Sales Chat', path: '/ai-chat' },
  { icon: FileText, label: 'Contratos', path: '/contracts' },
  { icon: Package, label: 'Produtos', path: '/products' },
  { icon: Megaphone, label: 'Marketing', path: '/marketing' },
  { icon: Calendar, label: 'Tarefas', path: '/tasks' },
  { icon: GraduationCap, label: 'Turmas', path: '/turmas' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col h-screen transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight text-slate-800">Target</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Agrotech</span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => cn(
                "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                isActive 
                  ? "bg-emerald-50 text-emerald-600 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 opacity-0 transition-all group-hover:opacity-100",
                "group-[.active]:opacity-100"
              )} />
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
            <LogOut className="w-5 h-5" />
            Sair do Sistema
          </button>
        </div>
      </aside>
    </>
  );
}
