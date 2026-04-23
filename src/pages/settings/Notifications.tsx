import { useState, useEffect } from 'react';
import {
  Bell, Save, CheckCircle2, Zap, Shield, UserPlus,
  ArrowRightLeft, TrendingUp, AlertTriangle, Clock
} from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { usePermissions } from '../../hooks/usePermissions';
import { cn } from '../../lib/utils';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
    </label>
  );
}

const ALERT_LEVELS = [
  { key: 'm3',  label: '+3 minutos' },
  { key: 'm15', label: '15 minutos' },
  { key: 'm30', label: '30 minutos' },
  { key: 'h1',  label: '1 hora' },
  { key: 'h6',  label: '6 horas' },
  { key: 'h12', label: '12 horas' },
  { key: 'h24', label: '24 horas' },
  { key: 'h36', label: '36 horas' },
  { key: 'h48', label: '48 horas — lead transferido para novo responsável', highlight: true },
];

export function Notifications() {
  const [saved, setSaved] = useState(false);
  const { autoTransferHours, notificationPrefs, fetchSettings, updateSetting, updateNotificationPrefs } = useSettingsStore();
  const { hasPermission, loading: permLoading } = usePermissions();

  const [localHours, setLocalHours] = useState(autoTransferHours);
  const [localPrefs, setLocalPrefs] = useState(notificationPrefs);

  const isAdmin = hasPermission('admin.all');

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setLocalHours(autoTransferHours);
  }, [autoTransferHours]);

  useEffect(() => {
    setLocalPrefs(notificationPrefs);
  }, [notificationPrefs]);

  const togglePref = (key: keyof typeof localPrefs) => {
    setLocalPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    await Promise.all([
      updateSetting('lead_transfer_timeout_hours', localHours),
      isAdmin ? updateNotificationPrefs(localPrefs) : Promise.resolve(),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const NOTIFICATION_ITEMS = [
    {
      key: 'newLead' as const,
      icon: UserPlus,
      label: 'Novo Lead',
      description: 'Notifica o responsável quando um novo lead é criado e atribuído a ele.',
    },
    {
      key: 'leadInactive' as const,
      icon: Clock,
      label: 'Lead inativo',
      description: 'Alertas escalonados quando um lead fica sem contato: +3min, 15min, 30min, 1h, 6h, 12h, 24h, 36h e 48h (transferência).',
    },
    {
      key: 'leadAssigned' as const,
      icon: ArrowRightLeft,
      label: 'Lead atribuído a novo responsável',
      description: 'Notifica o novo responsável e admins quando um lead é transferido para outra pessoa.',
    },
    {
      key: 'stageChange' as const,
      icon: TrendingUp,
      label: 'Contrato / Ganho / Perdido',
      description: 'Notifica Coordenador e Administradores quando um lead entra nas etapas de Contrato, Ganho ou Perdido.',
    },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Notificações</h1>
        <p className="text-sm text-slate-500">Configure os alertas e notificações do sistema.</p>
      </div>

      <div className="space-y-6">
        {/* Admin-only: notification toggles */}
        {!permLoading && isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-white">
              <Shield size={16} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Tipos de Notificação</h3>
              <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Admin
              </span>
            </div>
            <div className="p-6 space-y-5">
              {NOTIFICATION_ITEMS.map(({ key, icon: Icon, label, description }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg mt-0.5">
                      <Icon size={14} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
                    </div>
                  </div>
                  <Toggle checked={localPrefs[key]} onChange={() => togglePref(key)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Escalonamento de alertas (informativo) */}
        {!permLoading && isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">Escalonamento de Alertas de Inatividade</h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-4">
                Quando ativado, o sistema envia alertas progressivos ao responsável do lead nos seguintes intervalos:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {ALERT_LEVELS.map(({ key, label, highlight }) => (
                  <div
                    key={key}
                    className={cn(
                      'px-3 py-2 rounded-xl text-xs font-semibold text-center border',
                      highlight
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Automação de transferência */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">Automação de Leads</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">Transferência Automática</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tempo de inatividade (sem contato) para sinalizar o lead para transferência e notificar coordenadores.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                  <input
                    type="number"
                    min={1}
                    value={localHours}
                    onChange={(e) => setLocalHours(Number(e.target.value))}
                    className="w-16 text-center text-sm font-bold bg-transparent border-none focus:ring-0"
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase pr-2">Horas</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Bell size={11} />
              Ao atingir o limite, o responsável recebe um alerta de "48h" e coordenadores são notificados sobre a transferência.
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end items-center gap-4">
          {saved && (
            <span className="text-emerald-600 text-sm font-bold flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
              <CheckCircle2 size={16} />
              Preferências salvas!
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
          >
            <Save size={18} />
            Salvar Preferências
          </button>
        </div>
      </div>
    </div>
  );
}
