export type Permission = string;

export const PERMISSIONS = [
  // Dashboard
  'dashboard.view',

  // Leads
  'leads.view',
  'leads.create',
  'leads.edit',
  'leads.delete',
  'leads.export',

  // Pipeline
  'pipeline.view',
  'pipeline.edit',
  'pipeline.delete',

  // Financeiro
  'finance.view',
  'finance.create',
  'finance.edit',
  'finance.delete',
  'finance.export',

  // Contratos
  'contracts.view',
  'contracts.create',
  'contracts.edit',
  'contracts.delete',

  // Produtos
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',

  // Turmas
  'turmas.view',
  'turmas.create',
  'turmas.edit',
  'turmas.delete',

  // Tarefas
  'tasks.view',
  'tasks.create',
  'tasks.edit',
  'tasks.delete',

  // Anotações
  'notes.view',
  'notes.create',
  'notes.edit',
  'notes.delete',

  // Marketing
  'marketing.view',
  'marketing.create',
  'marketing.manage',

  // Usuários & Configurações
  'users.view',
  'users.manage',
  'settings.view',
  'settings.manage',

  // Admin
  'admin.all',
] as const;

export type PermissionsList = typeof PERMISSIONS;

export const ROLES = [
  { id: 'admin', name: 'Admin', isAdmin: true },
  { id: 'manager', name: 'Gerente', isAdmin: false },
  { id: 'consultor', name: 'Consultor', isAdmin: false },
];

export type Role = typeof ROLES[number];

export type RolePermission = {
  role: string;
  permissions: string[];
};
