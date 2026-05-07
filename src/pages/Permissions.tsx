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
// ── Permission PT-BR labels ───────────────────────────────────────────────────
const PERMISSION_LABELS: Record<string, { title: string; description: string }> = {
  'dashboard.view':      { 
    title: 'Visualizar Dashboard e BI',        
    description: 'Acesso completo ao painel de indicadores, métricas de conversão, gráficos de tendência e Business Intelligence (BI).' 
  },

  'leads.view':          { 
    title: 'Visualizar Base de Leads',            
    description: 'Permite visualizar a listagem completa de leads, histórico de interações, detalhes de contato e informações básicas.' 
  },
  'leads.create':        { 
    title: 'Capturar e Criar Leads',                 
    description: 'Capacidade de inserir novos leads manualmente no CRM e gerenciar a entrada de novos contatos.' 
  },
  'leads.edit':          { 
    title: 'Editar Dados de Leads',                
    description: 'Permite alterar campos cadastrais, atualizar status, trocar responsáveis e modificar informações de perfil.' 
  },
  'leads.delete':        { 
    title: 'Arquivar/Excluir Leads',               
    description: 'Permissão crítica para remover leads permanentemente ou enviar para a lixeira do sistema.' 
  },
  'leads.export':        { 
    title: 'Exportação de Dados (CSV/XLS)',              
    description: 'Capacidade de extrair dados da base de leads para planilhas externas (Excel/Google Sheets).' 
  },

  'pipeline.view':       { 
    title: 'Visualizar Funil de Vendas',         
    description: 'Acesso ao quadro Kanban do Pipeline, permitindo acompanhar o fluxo de negociações em tempo real.' 
  },
  'pipeline.edit':       { 
    title: 'Gestão de Oportunidades',           
    description: 'Permite movimentar leads entre etapas, atualizar valores de negociação e definir motivos de perda/ganho.' 
  },
  'pipeline.delete':     { 
    title: 'Remover do Fluxo Ativo',         
    description: 'Capacidade de retirar uma negociação do pipeline sem necessariamente excluir o lead da base.' 
  },

  'finance.view':        { 
    title: 'Gestão Financeira e Fluxo',       
    description: 'Visualização completa de entradas, saídas, conciliação bancária, DRE e status de pagamentos.' 
  },
  'finance.create':      { 
    title: 'Lançar Transações',            
    description: 'Permite registrar novas receitas, despesas manuais e programar pagamentos futuros no sistema.' 
  },
  'finance.edit':        { 
    title: 'Modificar Lançamentos',           
    description: 'Capacidade de alterar valores, datas de vencimento, categorias e anexos de transações financeiras.' 
  },
  'finance.delete':      { 
    title: 'Estornar/Remover Lançamentos',          
    description: 'Permissão para excluir registros financeiros do histórico. Requer cautela por afetar o saldo consolidado.' 
  },
  'finance.export':      { 
    title: 'Extrair Relatórios Financeiros',          
    description: 'Geração de relatórios detalhados em PDF ou Excel para auditoria e contabilidade.' 
  },

  'contracts.view':      { 
    title: 'Visualizar Repositório de Contratos',        
    description: 'Acesso à lista de documentos contratuais, termos de aceite e histórico de assinaturas.' 
  },
  'contracts.create':    { 
    title: 'Gerar Novos Documentos',             
    description: 'Permite utilizar templates para gerar novos contratos, aditivos e termos personalizados.' 
  },
  'contracts.edit':      { 
    title: 'Revisar Clausulados',            
    description: 'Capacidade de editar o conteúdo de minutas contratuais e ajustar termos específicos antes do envio.' 
  },
  'contracts.delete':    { 
    title: 'Excluir Documentos Selados',           
    description: 'Remoção de registros de contratos do sistema (pode afetar o histórico jurídico do cliente).' 
  },

  'products.view':       { 
    title: 'Consultar Catálogo',         
    description: 'Visualização de produtos, serviços, tabelas de preços, estoque e especificações técnicas.' 
  },
  'products.create':     { 
    title: 'Cadastrar Novos Itens',              
    description: 'Permite adicionar novos produtos ou pacotes de serviços ao catálogo comercial.' 
  },
  'products.edit':       { 
    title: 'Gerenciar Preços e Estoque',             
    description: 'Capacidade de atualizar valores de venda, custos, níveis de estoque e descrições técnicas.' 
  },
  'products.delete':     { 
    title: 'Remover Itens do Portfólio',            
    description: 'Permite desativar ou excluir permanentemente produtos que não serão mais comercializados.' 
  },

  'turmas.view':         { 
    title: 'Visualizar Quadro Acadêmico',           
    description: 'Acesso à agenda de turmas, lista de alunos matriculados, presença e status de execução.' 
  },
  'turmas.create':       { 
    title: 'Abertura de Novas Turmas',                
    description: 'Permite planejar e abrir novos calendários de treinamento, definindo metas e instrutores.' 
  },
  'turmas.edit':         { 
    title: 'Gestão de Alocação e Status',               
    description: 'Capacidade de matricular alunos, realizar check-in, alterar datas e atualizar status de conclusão.' 
  },
  'turmas.delete':       { 
    title: 'Cancelar/Remover Turmas',              
    description: 'Permissão para cancelar turmas abertas ou remover registros do histórico acadêmico.' 
  },

  'tasks.view':          { 
    title: 'Monitorar Atividades e CRM',          
    description: 'Visualização de agendas, compromissos, lembretes de acompanhamento e tarefas pendentes.' 
  },
  'tasks.create':        { 
    title: 'Delegar e Criar Tarefas',               
    description: 'Permite criar novas tarefas para si ou delegar atividades para outros membros da equipe.' 
  },
  'tasks.edit':          { 
    title: 'Gerenciar Prazos e Execução',              
    description: 'Capacidade de alterar datas de entrega, responsáveis, prioridades e descrições de tarefas.' 
  },
  'tasks.delete':        { 
    title: 'Limpar Histórico de Atividades',             
    description: 'Permissão para remover tarefas e registros de atividades do log do sistema.' 
  },

  'notes.view':          { 
    title: 'Consultar Notas de CRM',        
    description: 'Leitura de anotações internas, observações de vendas e feedbacks registrados nos perfis.' 
  },
  'notes.create':        { 
    title: 'Registrar Novas Notas',             
    description: 'Capacidade de adicionar observações e registros importantes sobre leads e negociações.' 
  },
  'notes.edit':          { 
    title: 'Editar Histórico Interno',            
    description: 'Permite retificar ou complementar informações registradas em anotações anteriores.' 
  },
  'notes.delete':        { 
    title: 'Apagar Registros de Nota',           
    description: 'Remoção permanente de anotações internas (afeta a rastreabilidade do histórico de vendas).' 
  },

  'marketing.view':      { 
    title: 'Análise de Campanhas',        
    description: 'Visualização de métricas de marketing, fontes de leads e desempenho de campanhas ativas.' 
  },
  'marketing.create':    { 
    title: 'Lançar Iniciativas',             
    description: 'Permite configurar novas fontes de leads, URLs parametrizadas e automações de entrada.' 
  },
  'marketing.manage':    { 
    title: 'Gestão de Growth',         
    description: 'Capacidade total para gerenciar orçamentos de campanhas, canais de aquisição e ferramentas de marketing.' 
  },

  'users.view':          { 
    title: 'Consultar Diretório de Equipe',         
    description: 'Visualização da lista de colaboradores, cargos, squads e informações de contato interno.' 
  },
  'users.manage':        { 
    title: 'Administração de Usuários',          
    description: 'Gestão completa: criar novos acessos, redefinir senhas, desativar contas e gerenciar cargos.' 
  },
  'settings.view':       { 
    title: 'Acessar Painel de Controle',    
    description: 'Permite visualizar as configurações globais do sistema, integrações e parâmetros operacionais.' 
  },
  'settings.manage':     { 
    title: 'Configuração Estrutural',     
    description: 'Permissão avançada para alterar regras de negócio, integrações de API e preferências globais.' 
  },

  'admin.all':           { 
    title: 'Controle Total do Ecossistema',        
    description: 'Acesso irrestrito e absoluto. Permite ignorar qualquer trava de segurança e gerenciar todas as permissões.' 
  },
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
  const [searchTerm, setSearchTerm] = useState('');

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
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="p-2.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all text-slate-500 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Shield className="w-7 h-7 text-emerald-600" />
              Central de Acessos
            </h1>
            <p className="text-sm text-slate-500 font-medium">Controle de privilégios por cargo e função</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72 group">
          <Settings className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar permissão..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar — Roles */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cargos Definidos</h3>
            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{cargos.length}</span>
          </div>
          
          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
            {cargos.map((cargo) => {
              const isAdmin = cargo.permissions?.includes('admin.all');
              const isSelected = selectedCargoId === cargo.id;
              return (
                <button
                  key={cargo.id}
                  onClick={() => setSelectedCargoId(cargo.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left relative overflow-hidden group',
                    isSelected
                      ? 'bg-white border-emerald-500 shadow-lg shadow-emerald-500/5'
                      : 'bg-white/50 border-slate-200 hover:border-emerald-200 hover:bg-white'
                  )}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                  )}
                  
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300',
                    isSelected
                      ? 'bg-emerald-500 text-white shadow-inner'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'
                  )}>
                    <UserCog className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className={cn(
                      'font-bold text-sm truncate',
                      isSelected ? 'text-slate-900' : 'text-slate-600'
                    )}>
                      {cargo.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isAdmin ? (
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Super Admin</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {cargo.permissions?.length ?? 0} Acessos
                          </span>
                          <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-1 rounded">
                            {Math.round(((cargo.permissions?.length ?? 0) / PERMISSIONS.length) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRight className={cn(
                    'w-4 h-4 transition-transform duration-300',
                    isSelected ? 'text-emerald-500 translate-x-1' : 'text-slate-300 opacity-0 group-hover:opacity-100'
                  )} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content — Permissions */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Active Cargo Info */}
            <div className={cn(
              'p-6 sm:p-8 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative',
              isAdminCargo ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-slate-800 to-slate-900'
            )}>
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Shield size={120} className="text-white" />
              </div>
              
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {currentCargo?.name ?? 'Configurando Perfil'}
                  </h2>
                  <p className="text-sm text-white/70 font-medium mt-1">
                    {isAdminCargo ? 'Este perfil detém controle absoluto sobre o ecossistema.' : 'Ajuste os níveis de acesso granulares abaixo.'}
                  </p>
                </div>
              </div>

              {isAdminCargo && (
                <div className="relative z-10 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-xl text-xs font-black uppercase tracking-widest border border-white/20">
                  <Check className="w-4 h-4" />
                  Blindagem Ativa
                </div>
              )}
            </div>

            {/* Permissions List */}
            <div className="p-8 space-y-10">
              {sortedCategories.map((category) => {
                const rawPerms = groupedPermissions[category];
                // Filter by search
                const perms = rawPerms.filter(p => {
                  const label = getLabel(p);
                  return label.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         label.description.toLowerCase().includes(searchTerm.toLowerCase());
                });

                if (perms.length === 0) return null;

                const Icon = CATEGORY_ICONS[category] ?? Settings;
                const label = CATEGORY_LABELS[category] ?? category;
                const allEnabled = rawPerms.every(p => currentRolePermissions.includes(p));

                return (
                  <div key={category} className="space-y-6">
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-50 transition-colors">
                          <Icon className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{label}</h3>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <span className="text-xs font-bold text-slate-400">{perms.length} opções</span>
                      </div>
                      
                      {!isAdminCargo && category !== 'admin' && (
                        <button
                          onClick={async () => {
                            const toEnable = !allEnabled;
                            let updated = [...currentRolePermissions];
                            if (toEnable) {
                              rawPerms.forEach(p => { if (!updated.includes(p)) updated.push(p); });
                            } else {
                              updated = updated.filter(p => !rawPerms.includes(p));
                            }
                            await updateCargo(selectedCargoId, { permissions: updated });
                          }}
                          className={cn(
                            'text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border shadow-sm active:scale-95',
                            allEnabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          )}
                        >
                          {allEnabled ? 'Revogar Categoria' : 'Liberar Tudo'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {perms.map((permission) => {
                        const isEnabled = currentRolePermissions.includes(permission);
                        const { title, description } = getLabel(permission);
                        return (
                          <div
                            key={permission}
                            className={cn(
                              'p-5 rounded-3xl border transition-all flex items-start gap-4 group/item',
                              isEnabled 
                                ? 'bg-white border-emerald-200 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-50' 
                                : 'bg-slate-50/50 border-slate-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-black text-slate-800">{title}</h4>
                                {permission.includes('delete') && (
                                  <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Crítico</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>
                            </div>
                            <button
                              disabled={isAdminCargo}
                              onClick={() => handleTogglePermission(permission, !isEnabled)}
                              className={cn(
                                'w-12 h-7 rounded-full relative transition-all flex items-center shrink-0 shadow-inner',
                                isEnabled ? 'bg-emerald-500' : 'bg-slate-300',
                                isAdminCargo ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105 active:scale-95'
                              )}
                            >
                              <div className={cn(
                                'w-5 h-5 bg-white rounded-full absolute transition-all duration-300 shadow-md',
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
              
              {/* Empty state for search */}
              {searchTerm && sortedCategories.every(cat => 
                !groupedPermissions[cat].some(p => {
                  const l = getLabel(p);
                  return l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         l.description.toLowerCase().includes(searchTerm.toLowerCase());
                })
              ) && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Nenhuma permissão encontrada</h3>
                  <p className="text-sm text-slate-500 mt-1">Tente buscar por termos diferentes ou navegue pelas categorias.</p>
                </div>
              )}
            </div>

            {/* Admin safety lock */}
            {isAdminCargo && (
              <div className="m-8 p-6 bg-amber-50/50 border border-amber-200 rounded-3xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Proteção de Sistema Ativada</h4>
                  <p className="text-xs text-amber-800/70 font-medium leading-relaxed">
                    Este perfil possui o privilégio <code className="bg-amber-100 px-1.5 py-0.5 rounded font-bold">admin.all</code>. 
                    Por segurança, permissões individuais de administradores não podem ser alteradas para evitar que você perca o acesso ao próprio sistema.
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
