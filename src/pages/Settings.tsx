import { useNavigate } from 'react-router-dom';
import { SettingsSection } from '../components/settings/SettingsSection';

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
