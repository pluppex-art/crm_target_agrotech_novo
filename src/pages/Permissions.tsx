import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ChevronRight, 
  Check, 
  X, 
  AlertCircle, 
  ArrowLeft,
  Users,
  Settings,
  Lock,
  Eye,
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  FileText,
  Package,
  Megaphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROLES, PERMISSIONS, Role, Permission } from '../types/permissions';
import { usePermissionStore } from '../store/usePermissionStore';
import { cn } from '../lib/utils';

const CATEGORY_ICONS: Record<string, any> = {
  leads: Users,
  finance: DollarSign,
  marketing: Megaphone,
  system: Settings
};

export function Permissions() {
  const navigate = useNavigate();
  const { rolePermissions, updateRolePermission } = usePermissionStore();
  const [selectedRole, setSelectedRole] = useState<Role>(ROLES[0].id);

  const currentRoleInfo = ROLES.find(r => r.id === selectedRole)!;
  const currentRolePermissions = rolePermissions.find(rp => rp.role === selectedRole)?.permissions || [];

  const handleTogglePermission = (permissionId: string, enabled: boolean) => {
    if (currentRoleInfo.isAdmin) return;
    updateRolePermission(selectedRole, permissionId, enabled);
  };

  const groupedPermissions = PERMISSIONS.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-600" />
              Permissões de Acesso
            </h1>
            <p className="text-sm text-slate-500">Defina o que cada perfil de usuário pode visualizar e gerenciar.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar - Roles */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-4">Perfis de Usuário</h3>
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                selectedRole === role.id 
                  ? "bg-emerald-50 border-emerald-200 shadow-sm" 
                  : "bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  selectedRole === role.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                )}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={cn(
                    "font-bold text-sm transition-colors",
                    selectedRole === role.id ? "text-emerald-900" : "text-slate-700"
                  )}>
                    {role.label}
                  </h4>
                  {role.isAdmin && (
                    <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">Admin</span>
                  )}
                </div>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 transition-all",
                selectedRole === role.id ? "text-emerald-600 translate-x-1" : "text-slate-300"
              )} />
            </button>
          ))}
        </div>

        {/* Content - Permissions */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Role Info Banner */}
            <div className={cn(
              "p-6 border-b flex items-center justify-between",
              currentRoleInfo.isAdmin ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50/50 border-slate-100"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                  currentRoleInfo.isAdmin ? "bg-emerald-600 text-white" : "bg-slate-800 text-white"
                )}>
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Configurações para {currentRoleInfo.label}</h2>
                  <p className="text-sm text-slate-500">
                    {currentRoleInfo.isAdmin 
                      ? "Este perfil possui acesso total e irrestrito ao sistema." 
                      : "Personalize as permissões específicas para este perfil abaixo."}
                  </p>
                </div>
              </div>
              {currentRoleInfo.isAdmin && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                  <Check className="w-4 h-4" />
                  ACESSO TOTAL
                </div>
              )}
            </div>

            {/* Permissions Grid */}
            <div className="p-6 space-y-8">
              {Object.entries(groupedPermissions).map(([category, perms]) => {
                const Icon = CATEGORY_ICONS[category] || Settings;
                return (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {category === 'leads' ? 'Gestão de Leads' : 
                         category === 'finance' ? 'Financeiro e Contratos' :
                         category === 'marketing' ? 'Marketing e Vendas' : 'Sistema'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {perms.map((permission) => {
                        const isEnabled = currentRolePermissions.includes(permission.id);
                        return (
                          <div 
                            key={permission.id}
                            className={cn(
                              "p-4 rounded-2xl border transition-all flex items-start gap-4",
                              isEnabled ? "bg-white border-emerald-100 shadow-sm" : "bg-slate-50/50 border-slate-100 opacity-60"
                            )}
                          >
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-slate-800 mb-1">{permission.label}</h4>
                              <p className="text-xs text-slate-500 leading-relaxed">{permission.description}</p>
                            </div>
                            <button
                              disabled={currentRoleInfo.isAdmin}
                              onClick={() => handleTogglePermission(permission.id, !isEnabled)}
                              className={cn(
                                "w-10 h-6 rounded-full relative transition-all flex items-center",
                                isEnabled ? "bg-emerald-600" : "bg-slate-300",
                                currentRoleInfo.isAdmin ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 bg-white rounded-full absolute transition-all shadow-sm",
                                isEnabled ? "right-1" : "left-1"
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

            {/* Admin Warning */}
            {currentRoleInfo.isAdmin && (
              <div className="m-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Perfil Administrativo</h4>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Perfis de Administrador, Diretor e Gerente possuem permissões globais por padrão. 
                    Essas configurações não podem ser alteradas para garantir a integridade do sistema.
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
