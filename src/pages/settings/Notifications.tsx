import { useState, useEffect } from 'react';
import {
  Bell, Save, CheckCircle2, Zap, Shield, UserPlus,
  ArrowRightLeft, TrendingUp, AlertTriangle, Clock, XCircle
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

type AlertLevel = { key: string; label: string; description: string; locked?: boolean };

const ALERT_LEVELS: AlertLevel[] = [
  { key: 'm3',  label: '3 min',    description: 'Muito frequente — recomendado desativar' },
  { key: 'm15', label: '15 min',   description: 'Muito frequente — recomendado desativar' },
  { key: 'm30', label: '30 min',   description: 'Frequente' },
  { key: 'h1',  label: '1 hora',   description: 'Primeira lembrança' },
  { key: 'h6',  label: '6 horas',  description: 'Seguimento do dia' },
  { key: 'h12', label: '12 horas', description: 'Alerta moderado' },
  { key: 'h24', label: '24 horas', description: 'Urgente' },
  { key: 'h36', label: '36 horas', description: 'Muito urgente' },
  { key: 'h48', label: '48 horas', description: 'Transferência automática', locked: true },
];

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export function Notifications() {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { autoTransferHours, notificationPrefs, fetchSettings, updateSetting, updateNotificationPrefs } = useSettingsStore();
  const { hasPermission, loading: permLoading } = usePermissions();

  const [localHours, setLocalHours] = useState(autoTransferHours);
  const [localPrefs, setLocalPrefs] = useState(notificationPrefs);

  const isAdmin = hasPermission('admin.all');

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { setLocalHours(autoTransferHours); }, [autoTransferHours]);
  useEffect(() => { setLocalPrefs(notificationPrefs); }, [notificationPrefs]);

  const togglePref = (key: keyof Omit<typeof localPrefs, 'inactivityLevels'>) => {
    setLocalPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleLevel = (key: string) => {
    setLocalPrefs(prev => {
      const current = prev.inactivityLevels ?? [];
      const next = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];
      return { ...prev, inactivityLevels: next };
    });
  };

  const handleSave = async () => {
    setSaveState('saving');
    setErrorMsg('');
    try {
      const tasks: Promise<void>[] = [];
      if (isAdmin) {
        tasks.push(updateSetting('lead_transfer_timeout_hours', localHours));
        tasks.push(updateNotificationPrefs(localPrefs));
      }
      await Promise.all(tasks);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err: any) {
      setSaveState('error');
      setErrorMsg(err?.message || 'Erro desconhecido ao salvar.');
    }
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
      description: 'Alertas escalonados de inatividade. Configure os thresholds abaixo.',
    },
    {
      key: 'leadAssigned' as const,
      icon: ArrowRightLeft,
      label: 'Lead atribuído / transferido',
      description: 'Notifica o novo responsável e admins quando um lead muda de dono.',
    },
    {
      key: 'stageChange' as const,
      icon: TrendingUp,
      label: 'Contrato / Ganho / Perdido',
      description: 'Notifica Coordenador e Admins quando um lead entra nessas etapas.',
    },
    {
      key: 'newTask' as const,
      icon: CheckCircle2,
      label: 'Nova Tarefa',
      description: 'Notifica o responsável quando uma nova atividade é atribuída a ele.',
    },
    {
      key: 'taskDue' as const,
      icon: AlertTriangle,
      label: 'Lembrete de Atividade',
      description: 'Alertas e lembretes para tarefas que estão para vencer ou atrasadas.',
    },
  ];

  if (permLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Bell size={22} className="text-emerald-600" />
          Notificações
        </h1>
        <p className="text-sm text-slate-500 mt-1">Configure os alertas e notificações do sistema.</p>
      </div>

      {!isAdmin ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-700 font-medium flex items-start gap-3">
          <Shield size={16} className="mt-0.5 shrink-0" />
          <span>As configurações de notificação são gerenciadas pelo Administrador do sistema.</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tipos de notificação */}
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

          {/* Thresholds de inatividade */}
          <div className={cn(
            "bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity",
            !localPrefs.leadInactive && "opacity-50 pointer-events-none"
          )}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">Thresholds de Alerta de Inatividade</h3>
              {!localPrefs.leadInactive && (
                <span className="ml-auto text-[10px] text-slate-400 font-semibold">Desativado</span>
              )}
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-4">
                Selecione em quais marcos de inatividade o sistema deve enviar alertas ao responsável do lead. Menos é mais — evite os thresholds muito curtos para não gerar spam.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALERT_LEVELS.map(({ key, label, description, locked }) => {
                  const enabled = locked || (localPrefs.inactivityLevels ?? []).includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={locked}
                      onClick={() => !locked && toggleLevel(key)}
                      className={cn(
                        'flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all',
                        locked
                          ? 'bg-red-50 border-red-200 text-red-700 cursor-default'
                          : enabled
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                      )}
                    >
                      <span className="text-sm font-bold leading-tight">{label}</span>
                      <span className="text-[10px] leading-snug mt-0.5 opacity-70">{description}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
                <Bell size={10} />
                O alerta de 48h é fixo — marca a transferência automática do lead.
              </p>
            </div>
          </div>

          {/* Automação de transferência */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">Transferência Automática</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">Horas até transferência</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Tempo de inatividade para sinalizar o lead para transferência e notificar coordenadores.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={localHours}
                      onChange={(e) => setLocalHours(Number(e.target.value))}
                      className="w-16 text-center text-sm font-bold bg-transparent border-none focus:ring-0"
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase pr-2">Horas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end items-center gap-4">
            {saveState === 'success' && (
              <span className="text-emerald-600 text-sm font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4">
                <CheckCircle2 size={16} />
                Preferências salvas!
              </span>
            )}
            {saveState === 'error' && (
              <span className="text-red-600 text-sm font-bold flex items-center gap-1.5 animate-in fade-in">
                <XCircle size={16} />
                {errorMsg || 'Erro ao salvar. Tente novamente.'}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className={cn(
                "px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2",
                saveState === 'saving'
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700"
              )}
            >
              <Save size={18} />
              {saveState === 'saving' ? 'Salvando...' : 'Salvar Preferências'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
