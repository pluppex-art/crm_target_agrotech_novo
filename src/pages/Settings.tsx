import { Settings as SettingsIcon, User, Bell, Lock, Globe, Shield, UserPlus, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettingsSection } from '../components/settings/SettingsSection';

const sections = [
  { icon: User, label: 'Perfil', description: 'Gerencie suas informações pessoais e foto.', path: '/settings/profile' },
  { icon: UserPlus, label: 'Cadastro de Usuário', description: 'Adicione novos membros à sua equipe.', path: '/settings/users' },
  { icon: Bell, label: 'Notificações', description: 'Configure como você quer ser avisado.', path: '/settings/notifications' },
  { icon: Lock, label: 'Segurança', description: 'Altere sua senha e autenticação.', path: '/settings/security' },
  { icon: Globe, label: 'Integrações', description: 'Conecte com outras ferramentas.', path: '/settings/integrations' },
  { icon: Shield, label: 'Permissões', description: 'Gerencie o que cada perfil de usuário pode ver.', path: '/settings/permissions' },
  { icon: Tag, label: 'Cargos', description: 'Gerencie cargos e permissões da equipe.', path: '/settings/cargos' },
  { icon: SettingsIcon, label: 'Pipelines', description: 'Gerencie tipos de pipeline, status e seções.', path: '/settings/pipelines' },
  { icon: Tag, label: 'Categorias de Produto', description: 'Gerencie as categorias de produtos e serviços.', path: '/settings/categories' },
];

export function Settings() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-sm text-slate-500">Personalize sua experiência no CRM Target Agrotech.</p>
      </div>

      <SettingsSection navigate={navigate} />
    </div>
  );
}
