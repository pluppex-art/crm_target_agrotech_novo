import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Save, CheckCircle2, Clock, Zap } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

export function Notifications() {
  const [saved, setSaved] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState({
    newLeads: true,
    taskReminders: true,
    weeklyReports: false,
    newOpportunities: true,
  });

  const [pushPrefs, setPushPrefs] = useState({
    browser: false,
    messages: true,
  });

  const { autoTransferHours, fetchSettings, updateSetting } = useSettingsStore();
  const [localHours, setLocalHours] = useState(autoTransferHours);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setLocalHours(autoTransferHours);
  }, [autoTransferHours]);

  const handleSave = async () => {
    await updateSetting('auto_transfer_hours', localHours);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Notificações</h1>
        <p className="text-sm text-slate-500">Configure como você quer ser avisado.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">E-mail</h3>
            <div className="space-y-4">
              {[
                { id: 'newLeads', label: 'Novos leads atribuídos', description: 'Receba um e-mail quando um novo lead for atribuído a você.' },
                { id: 'newOpportunities', label: 'Novas oportunidades criadas', description: 'Receba um e-mail quando uma nova oportunidade for registrada no sistema.' },
                { id: 'taskReminders', label: 'Lembretes de tarefas', description: 'Receba lembretes diários de suas tarefas pendentes.' },
                { id: 'weeklyReports', label: 'Relatórios semanais', description: 'Receba um resumo semanal do desempenho de suas vendas.' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={emailPrefs[item.id as keyof typeof emailPrefs]} 
                      onChange={() => setEmailPrefs({...emailPrefs, [item.id]: !emailPrefs[item.id as keyof typeof emailPrefs]})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Push & App</h3>
            <div className="space-y-4">
              {[
                { id: 'browser', label: 'Notificações no navegador', description: 'Alertas em tempo real enquanto você navega no CRM.' },
                { id: 'messages', label: 'Alertas de mensagens', description: 'Notificações de novas mensagens no chat de vendas.' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pushPrefs[item.id as keyof typeof pushPrefs]} 
                      onChange={() => setPushPrefs({...pushPrefs, [item.id]: !pushPrefs[item.id as keyof typeof pushPrefs]})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} className="text-amber-500" />
              Automação de Leads
            </h3>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">Transferência Automática</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tempo de inatividade (sem contato) necessário para que o lead seja sinalizado para transferência.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                  <input 
                    type="number" 
                    value={localHours}
                    onChange={(e) => setLocalHours(Number(e.target.value))}
                    className="w-16 text-center text-sm font-bold bg-transparent border-none focus:ring-0"
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase pr-2">Horas</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end items-center gap-4">
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
    </div>
  );
}
