import React, { useEffect, useState } from 'react';
import {
  Shield,
  ChevronRight,
  Check,
  AlertCircle,
  ArrowLeft,
  Users,
  Settings,
  Lock,
  DollarSign,
  FileText,
  Package,
  Megaphone,
  LayoutDashboard,
  GitPullRequest,
  GraduationCap,
  CheckSquare,
  StickyNote,
  UserCog,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCargoStore } from '../store/useCargoStore';
import { PERMISSIONS } from '../types/permissions';
import { cn } from '../lib/utils';

// ── Category icons ────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  leads:     Users,
  pipeline:  GitPullRequest,
  finance:   DollarSign,
  contracts: FileText,
  products:  Package,
  turmas:    GraduationCap,
  tasks:     CheckSquare,
  notes:     StickyNote,
  marketing: Megaphone,
  users:     UserCog,
  settings:  Settings,
  admin:     Shield,
};

// ── Category PT-BR labels ─────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  leads:     'Gestão de Leads',
  pipeline:  'Pipeline de Vendas',
  finance:   'Financeiro',
  contracts: 'Contratos',
  products:  'Produtos',
  turmas:    'Turmas',
  tasks:     'Tarefas',
  notes:     'Anotações',
  marketing: 'Marketing',
  users:     'Usuários',
  settings:  'Configurações',
  admin:     'Administrador',
};

// ── Permission PT-BR labels ───────────────────────────────────────────────────
const PERMISSION_LABELS: Record<string, { title: string; description: string }> = {
  'dashboard.view':      { title: 'Visualizar Dashboard',        description: 'Acesso à tela de métricas e gráficos.' },

  'leads.view':          { title: 'Visualizar Leads',            description: 'Ver a lista de leads e seus detalhes.' },
  'leads.create':        { title: 'Criar Leads',                 description: 'Adicionar novos leads ao sistema.' },
  'leads.edit':          { title: 'Editar Leads',                description: 'Alterar informações de leads existentes.' },
  'leads.delete':        { title: 'Excluir Leads',               description: 'Remover leads permanentemente.' },
  'leads.export':        { title: 'Exportar Leads',              description: 'Baixar dados de leads em planilha.' },

  'pipeline.view':       { title: 'Visualizar Pipeline',         description: 'Acessar o quadro de pipeline de vendas.' },
  'pipeline.edit':       { title: 'Mover no Pipeline',           description: 'Mover leads entre etapas do pipeline.' },
  'pipeline.delete':     { title: 'Excluir do Pipeline',         description: 'Remover leads diretamente do pipeline.' },

  'finance.view':        { title: 'Visualizar Financeiro',       description: 'Ver transações, receitas e despesas.' },
  'finance.create':      { title: 'Criar Transações',            description: 'Registrar novas entradas ou saídas.' },
  'finance.edit':        { title: 'Editar Transações',           description: 'Alterar transações já registradas.' },
  'finance.delete':      { title: 'Excluir Transações',          description: 'Remover transações do histórico.' },
  'finance.export':      { title: 'Exportar Relatório',          description: 'Baixar relatórios financeiros.' },

  'contracts.view':      { title: 'Visualizar Contratos',        description: 'Ver a lista de contratos e seus detalhes.' },
  'contracts.create':    { title: 'Criar Contratos',             description: 'Gerar novos contratos comerciais.' },
  'contracts.edit':      { title: 'Editar Contratos',            description: 'Alterar contratos existentes.' },
  'contracts.delete':    { title: 'Excluir Contratos',           description: 'Remover contratos do sistema.' },

  'products.view':       { title: 'Visualizar Produtos',         description: 'Ver catálogo de produtos e serviços.' },
  'products.create':     { title: 'Criar Produtos',              description: 'Adicionar novos produtos ou serviços.' },
  'products.edit':       { title: 'Editar Produtos',             description: 'Alterar produtos existentes.' },
  'products.delete':     { title: 'Excluir Produtos',            description: 'Remover produtos do catálogo.' },

  'turmas.view':         { title: 'Visualizar Turmas',           description: 'Ver as turmas cadastradas e seus participantes.' },
  'turmas.create':       { title: 'Criar Turmas',                description: 'Cadastrar novas turmas.' },
  'turmas.edit':         { title: 'Editar Turmas',               description: 'Alterar dados e status de turmas.' },
  'turmas.delete':       { title: 'Excluir Turmas',              description: 'Remover turmas do sistema.' },

  'tasks.view':          { title: 'Visualizar Tarefas',          description: 'Ver tarefas e atividades pendentes.' },
  'tasks.create':        { title: 'Criar Tarefas',               description: 'Adicionar novas tarefas.' },
  'tasks.edit':          { title: 'Editar Tarefas',              description: 'Alterar tarefas existentes.' },
  'tasks.delete':        { title: 'Excluir Tarefas',             description: 'Remover tarefas do sistema.' },

  'notes.view':          { title: 'Visualizar Anotações',        description: 'Ver anotações vinculadas a leads.' },
  'notes.create':        { title: 'Criar Anotações',             description: 'Adicionar novas anotações.' },
  'notes.edit':          { title: 'Editar Anotações',            description: 'Alterar anotações existentes.' },
  'notes.delete':        { title: 'Excluir Anotações',           description: 'Remover anotações do sistema.' },

  'marketing.view':      { title: 'Visualizar Marketing',        description: 'Ver campanhas e métricas de marketing.' },
  'marketing.create':    { title: 'Criar Campanhas',             description: 'Criar novas campanhas de marketing.' },
  'marketing.manage':    { title: 'Gerenciar Marketing',         description: 'Editar e excluir campanhas existentes.' },

  'users.view':          { title: 'Visualizar Usuários',         description: 'Ver lista de usuários cadastrados.' },
  'users.manage':        { title: 'Gerenciar Usuários',          description: 'Criar, editar e remover usuários.' },
  'settings.view':       { title: 'Visualizar Configurações',    description: 'Acessar o painel de configurações.' },
  'settings.manage':     { title: 'Gerenciar Configurações',     description: 'Alterar configurações do sistema.' },

  'admin.all':           { title: 'Acesso Total (Admin)',        description: 'Permissão irrestrita a todas as funcionalidades.' },
};

function getLabel(permission: string) {
  const found = PERMISSION_LABELS[permission];
  if (found) return found;
  // Fallback for unknown permissions
  const readable = permission.replace(/\./g, ' → ').replace(/\b\w/g, l => l.toUpperCase());
  return { title: readable, description: permission };
}

export function Permissions() {
  const navigate = useNavigate();
  const { cargos, fetchCargos, subscribe, updateCargo } = useCargoStore();
  const [selectedCargoId, setSelectedCargoId] = useState<string>('');

  useEffect(() => {
    fetchCargos();
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [fetchCargos, subscribe]);

  useEffect(() => {
    if (cargos.length > 0 && !selectedCargoId) {
      setSelectedCargoId(cargos[0].id);
    }
  }, [cargos]);

  const currentCargo = cargos.find(c => c.id === selectedCargoId);
  const currentRolePermissions = currentCargo?.permissions || [];
  const isAdminCargo = currentRolePermissions.includes('admin.all');

  const handleTogglePermission = async (permissionId: string, enabled: boolean) => {
    const newPermissions = enabled
      ? [...currentRolePermissions, permissionId]
      : currentRolePermissions.filter(p => p !== permissionId);
    await updateCargo(selectedCargoId, { permissions: newPermissions });
  };

  const groupedPermissions = PERMISSIONS.reduce((acc, p) => {
    const category = p.split('.')[0];
    if (!acc[category]) acc[category] = [];
    acc[category].push(p);
    return acc;
  }, {} as Record<string, string[]>);

  // Keep 'admin' category at the end
  const sortedCategories = Object.keys(groupedPermissions).sort((a, b) => {
    if (a === 'admin') return 1;
    if (b === 'admin') return -1;
    return 0;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 truncate">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
              Permissões
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 truncate">Gerencie o acesso de cada perfil.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar — Roles */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-4">Perfis de Usuário</h3>
          {cargos.map((cargo) => {
            const isAdmin = cargo.permissions?.includes('admin.all');
            return (
              <button
                key={cargo.id}
                onClick={() => setSelectedCargoId(cargo.id)}
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group',
                  selectedCargoId === cargo.id
                    ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-gradient-to-br',
                    selectedCargoId === cargo.id
                      ? 'from-emerald-500 to-emerald-600 text-white'
                      : 'from-slate-100 to-slate-200 text-slate-600 group-hover:from-emerald-100 group-hover:to-emerald-200'
                  )}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={cn(
                      'font-bold text-sm transition-colors',
                      selectedCargoId === cargo.id ? 'text-emerald-900' : 'text-slate-700'
                    )}>
                      {cargo.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {isAdmin ? 'Acesso total' : `${cargo.permissions?.length ?? 0} permissões`}
                    </p>
                    {isAdmin && (
                      <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">Admin</span>
                    )}
                  </div>
                </div>
                <ChevronRight className={cn(
                  'w-4 h-4 transition-all',
                  selectedCargoId === cargo.id ? 'text-emerald-600 translate-x-1' : 'text-slate-300'
                )} />
              </button>
            );
          })}
        </div>

        {/* Content — Permissions */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Role banner */}
            <div className={cn(
              'p-4 sm:p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
              isAdminCargo ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/50 border-slate-100'
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0',
                  isAdminCargo ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                )}>
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">
                    {currentCargo?.name ?? 'Selecione um perfil'}
                  </h2>
                  <p className="text-[10px] sm:text-sm text-slate-500">
                    {isAdminCargo ? 'Acesso total ao sistema.' : 'Personalize as permissões abaixo.'}
                  </p>
                </div>
              </div>
              {isAdminCargo && (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold">
                  <Check className="w-3.5 h-3.5" />
                  ACESSO TOTAL
                </div>
              )}
            </div>

            {/* Permissions grid */}
            <div className="p-6 space-y-8">
              {sortedCategories.map((category) => {
                const perms = groupedPermissions[category];
                const Icon = CATEGORY_ICONS[category] ?? Settings;
                const label = CATEGORY_LABELS[category] ?? category;
                const allEnabled = perms.every(p => currentRolePermissions.includes(p));

                return (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</h3>
                      </div>
                      {/* Toggle all in category */}
                      {!isAdminCargo && category !== 'admin' && (
                        <button
                          onClick={async () => {
                            const toEnable = !allEnabled;
                            let updated = [...currentRolePermissions];
                            if (toEnable) {
                              perms.forEach(p => { if (!updated.includes(p)) updated.push(p); });
                            } else {
                              updated = updated.filter(p => !perms.includes(p));
                            }
                            await updateCargo(selectedCargoId, { permissions: updated });
                          }}
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full transition-all',
                            allEnabled
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          )}
                        >
                          {allEnabled ? 'Desmarcar todos' : 'Marcar todos'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((permission) => {
                        const isEnabled = currentRolePermissions.includes(permission);
                        const { title, description } = getLabel(permission);
                        return (
                          <div
                            key={permission}
                            className={cn(
                              'p-4 rounded-2xl border transition-all flex items-start gap-4',
                              isEnabled ? 'bg-white border-emerald-100 shadow-sm' : 'bg-slate-50/50 border-slate-100 opacity-60'
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-800 mb-0.5 truncate">{title}</h4>
                              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{description}</p>
                            </div>
                            <button
                              disabled={isAdminCargo}
                              onClick={() => handleTogglePermission(permission, !isEnabled)}
                              className={cn(
                                'w-10 h-6 rounded-full relative transition-all flex items-center shrink-0',
                                isEnabled ? 'bg-emerald-600' : 'bg-slate-300',
                                isAdminCargo ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-90'
                              )}
                            >
                              <div className={cn(
                                'w-4 h-4 bg-white rounded-full absolute transition-all shadow-sm',
                                isEnabled ? 'right-1' : 'left-1'
                              )} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Admin warning */}
            {isAdminCargo && (
              <div className="m-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Perfil Administrativo</h4>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Este perfil possui acesso total ao sistema. As permissões individuais não podem ser alteradas para garantir a integridade do sistema.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
