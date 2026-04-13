import { Settings as SettingsIcon, User, Bell, Lock, Globe, Shield, UserPlus, Tag, Activity } from 'lucide-react';

const sections = [
  { icon: User, label: 'Perfil', description: 'Gerencie suas informações pessoais e foto.', path: '/settings/profile' },
  { icon: UserPlus, label: 'Cadastro de Usuário', description: 'Adicione novos membros à sua equipe.', path: '/settings/users' },
  { icon: Bell, label: 'Notificações', description: 'Configure como você quer ser avisado.', path: '/settings/notifications' },
  { icon: Lock, label: 'Segurança', description: 'Altere sua senha e autenticação.', path: '/settings/security' },
  { icon: Globe, label: 'Integrações', description: 'Conecte com outras ferramentas.', path: '/settings/integrations' },
  { icon: Shield, label: 'Permissões', description: 'Gerencie o que cada perfil de usuário pode ver.', path: '/settings/permissions' },
  { icon: Tag, label: 'Cargos', description: 'Gerencie cargos e permissões da equipe.', path: '/settings/cargos' },
  { icon: SettingsIcon, label: 'Pipelines', description: 'Gerencie tipos de pipeline, status e seções.', path: '/settings/pipelines' },
  { icon: Tag, label: 'Categorias de Produto', description: 'Gerencie categorias e regras para cursos e serviços.', path: '/settings/categories' },
  { icon: Activity, label: 'Categorias de Atividade', description: 'Gerencie os tipos de atividade (ligação, visita, reunião…).', path: '/settings/activity-categories' },
];

interface SettingsSectionProps {
  navigate: (path: string) => void;
}

export function SettingsSection({ navigate }: SettingsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map((section) => (
        <button 
          key={section.label} 
          onClick={() => navigate(section.path)}
          className="bg-white p-6 rounded-2xl border border-slate-200 text-left hover:shadow-md hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
              <section.icon className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <h3 className="font-bold text-slate-800">{section.label}</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{section.description}</p>
        </button>
      ))}
    </div>
  );
}
