import { NavLink, Outlet } from 'react-router-dom';
import {
  User, Bell, Lock, Globe, Shield, UserPlus, Tag, Activity,
  Target, ClipboardList, Settings as SettingsIcon, RefreshCcw, Users2, History, Loader2
} from 'lucide-react';
import { cn, isVendedor } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useEffect, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const settingsNav = [
  { icon: User,           label: 'Perfil',               path: '/settings/profile' },
  { icon: UserPlus,       label: 'Usuários',             path: '/settings/users' },
  { icon: ClipboardList,  label: 'Checklists',           path: '/settings/checklists' },
  { icon: Bell,           label: 'Notificações',         path: '/settings/notifications' },
  { icon: Lock,           label: 'Segurança',            path: '/settings/security' },
  { icon: Globe,          label: 'Integrações',          path: '/settings/integrations' },
  { icon: Shield,         label: 'Permissões',           path: '/settings/permissions' },
  { icon: Tag,            label: 'Cargos',               path: '/settings/cargos' },
  { icon: SettingsIcon,   label: 'Pipelines',            path: '/settings/pipelines' },
  { icon: Tag,            label: 'Categorias',           path: '/settings/categories' },
  { icon: Activity,       label: 'Atividades',           path: '/settings/activity-categories' },
  { icon: RefreshCcw,    label: 'Rodízio de Leads',     path: '/settings/rotation' },
  { icon: Users2,        label: 'Squads',               path: '/settings/squads' },
  { icon: History,       label: 'Auditoria (Logs)',     path: '/settings/audit' },
];

export function SettingsLayout() {
  const { user } = useAuthStore();
  const { profiles, fetchProfiles } = useProfileStore();

  useEffect(() => {
    if (profiles.length === 0) {
      fetchProfiles();
    }
  }, [fetchProfiles, profiles.length]);

  const currentProfile = profiles.find(p => p.id === user?.id);
  const isSeller = currentProfile ? isVendedor(currentProfile) : false;

  // Se for vendedor, mostra apenas Perfil e Usuários (conforme solicitado)
  const filteredNav = isSeller 
    ? settingsNav.filter(item => item.label === 'Perfil' || item.label === 'Usuários')
    : settingsNav;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Sub-sidebar container */}
      <div className="relative flex flex-shrink-0 z-20">
        <motion.aside
          initial={false}
          animate={{ 
            width: isSidebarOpen ? '13rem' : '0rem',
            opacity: isSidebarOpen ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full"
        >
          <div className="w-52 flex flex-col h-full">
            <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Configurações</p>
            </div>
            <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
              {filteredNav.map(({ icon: Icon, label, path }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2.5 rounded-xl px-3 h-9 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm border-emerald-100'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 border-transparent'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </motion.aside>

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={cn(
            "absolute top-4 -right-3 z-30 w-6 h-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-md hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all group",
            !isSidebarOpen && "right-[-1.5rem] bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600"
          )}
          title={isSidebarOpen ? "Recolher menu" : "Expandir menu"}
        >
          {isSidebarOpen ? (
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          ) : (
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          )}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto bg-[#f3f6f9] dark:bg-transparent relative">
        {!isSidebarOpen && (
          <div className="absolute top-4 left-4 z-10 lg:hidden">
            {/* Optional indicator for mobile if needed, but we keep the same toggle */}
          </div>
        )}
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[#f3f6f9]/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        }>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
