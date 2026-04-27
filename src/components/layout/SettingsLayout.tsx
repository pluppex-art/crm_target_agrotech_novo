import { NavLink, Outlet } from 'react-router-dom';
import {
  User, Bell, Lock, Globe, Shield, UserPlus, Tag, Activity,
  Target, ClipboardList, Percent, Settings as SettingsIcon, RefreshCcw
} from 'lucide-react';
import { cn } from '../../lib/utils';

const settingsNav = [
  { icon: User,           label: 'Perfil',               path: '/settings/profile' },
  { icon: UserPlus,       label: 'Usuários',             path: '/settings/users' },
  { icon: Target,         label: 'Metas',                path: '/settings/goals' },
  { icon: ClipboardList,  label: 'Checklists',           path: '/settings/checklists' },
  { icon: Bell,           label: 'Notificações',         path: '/settings/notifications' },
  { icon: Lock,           label: 'Segurança',            path: '/settings/security' },
  { icon: Globe,          label: 'Integrações',          path: '/settings/integrations' },
  { icon: Shield,         label: 'Permissões',           path: '/settings/permissions' },
  { icon: Tag,            label: 'Cargos',               path: '/settings/cargos' },
  { icon: SettingsIcon,   label: 'Pipelines',            path: '/settings/pipelines' },
  { icon: Tag,            label: 'Categorias',           path: '/settings/categories' },
  { icon: Activity,       label: 'Atividades',           path: '/settings/activity-categories' },
  { icon: Percent,        label: 'Comissões',            path: '/settings/commissions' },
  { icon: RefreshCcw,    label: 'Rodízio de Leads',     path: '/settings/rotation' },
];

export function SettingsLayout() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sub-sidebar */}
      <aside className="w-52 flex-shrink-0 bg-white border-r border-slate-100 overflow-y-auto flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Configurações</p>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {settingsNav.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 rounded-xl px-3 h-9 text-sm font-medium transition-all',
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto bg-[#f3f6f9]">
        <Outlet />
      </div>
    </div>
  );
}
