export type Role = 'administrator' | 'director' | 'manager' | 'salesperson' | 'support' | 'viewer';

export interface Permission {
  id: string;
  label: string;
  description: string;
  category: 'leads' | 'finance' | 'marketing' | 'system';
}

export interface RolePermission {
  role: Role;
  permissions: string[]; // Array of permission IDs
}

export const ROLES: { id: Role; label: string; isAdmin: boolean }[] = [
  { id: 'administrator', label: 'Administrador', isAdmin: true },
  { id: 'director', label: 'Diretor', isAdmin: true },
  { id: 'manager', label: 'Gerente', isAdmin: true },
  { id: 'salesperson', label: 'Vendedor', isAdmin: false },
  { id: 'support', label: 'Suporte', isAdmin: false },
  { id: 'viewer', label: 'Visualizador', isAdmin: false },
];

export const PERMISSIONS: Permission[] = [
  { id: 'leads_view', label: 'Visualizar Leads', description: 'Permite ver a lista e detalhes de leads.', category: 'leads' },
  { id: 'leads_create', label: 'Criar Leads', description: 'Permite adicionar novos leads ao sistema.', category: 'leads' },
  { id: 'leads_edit', label: 'Editar Leads', description: 'Permite alterar informações de leads existentes.', category: 'leads' },
  { id: 'leads_delete', label: 'Excluir Leads', description: 'Permite remover leads do sistema.', category: 'leads' },
  { id: 'finance_view', label: 'Visualizar Financeiro', description: 'Permite acessar o módulo financeiro.', category: 'finance' },
  { id: 'contracts_view', label: 'Visualizar Contratos', description: 'Permite ver contratos e documentos.', category: 'finance' },
  { id: 'marketing_manage', label: 'Gerenciar Marketing', description: 'Permite criar e editar campanhas.', category: 'marketing' },
  { id: 'products_manage', label: 'Gerenciar Produtos', description: 'Permite cadastrar e editar produtos.', category: 'system' },
  { id: 'settings_manage', label: 'Gerenciar Configurações', description: 'Acesso total às configurações do sistema.', category: 'system' },
];
