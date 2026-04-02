import React from 'react';
import { Globe, Link as LinkIcon, ExternalLink, CheckCircle2 } from 'lucide-react';

const integrations = [
  { name: 'WhatsApp', description: 'Envie mensagens diretamente do CRM.', status: 'connected', icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png' },
  { name: 'Google Calendar', description: 'Sincronize suas tarefas e reuniões.', status: 'disconnected', icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991147.png' },
  { name: 'Slack', description: 'Receba alertas de novos leads no Slack.', status: 'disconnected', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111615.png' },
  { name: 'Mailchimp', description: 'Sincronize seus leads com listas de e-mail.', status: 'disconnected', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111497.png' },
];

export function Integrations() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Integrações</h1>
        <p className="text-sm text-slate-500">Conecte o CRM Target Agrotech com suas ferramentas favoritas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div key={integration.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 p-2 flex items-center justify-center">
                <img src={integration.icon} alt={integration.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                integration.status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {integration.status === 'connected' ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 mb-1">{integration.name}</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{integration.description}</p>
            
            <button className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              integration.status === 'connected' 
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
            }`}>
              {integration.status === 'connected' ? (
                <>
                  <CheckCircle2 size={16} />
                  Configurar
                </>
              ) : (
                <>
                  <LinkIcon size={16} />
                  Conectar
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
