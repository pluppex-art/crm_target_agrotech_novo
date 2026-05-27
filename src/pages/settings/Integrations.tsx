import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Link as LinkIcon, 
  ExternalLink, 
  CheckCircle2, 
  Cpu, 
  Copy, 
  Check, 
  Save, 
  Loader2,
  Terminal,
  Zap
} from 'lucide-react';
import { settingsService } from '../../services/settingsService';

const integrationsList = [
  { name: 'WhatsApp Webhook', description: 'Envia mensagens de WhatsApp através da automação do n8n.', status: 'connected', icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png' },
  { name: 'Google Calendar', description: 'Sincronize suas tarefas e reuniões de Drone.', status: 'disconnected', icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991147.png' },
  { name: 'Slack Alerts', description: 'Receba alertas automáticos de novos leads.', status: 'disconnected', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111615.png' },
];

export function Integrations() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    settingsService.getSetting('n8n_webhook_url', '')
      .then(url => {
        setWebhookUrl(url);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    
    const success = await settingsService.updateSetting('n8n_webhook_url', webhookUrl);
    setSaving(false);
    
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      alert('Erro ao salvar as configurações. Tente novamente.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const codeSnippet = `curl -X POST "http://localhost:3000/api/v1/leads" \\
  -H "Authorization: Bearer target_n8n_integration_key_sec_2026" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João da Silva",
    "email": "joao@email.com",
    "phone": "5511999999999",
    "product": "Curso de Drones"
  }'`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <Cpu className="w-8 h-8 text-emerald-600" />
            </div>
            Central de Integrações (n8n & API Gateway)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Conecte o CRM Target Agrotech aos seus fluxos de automação do n8n e webhooks em tempo real.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Card: Webhook settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Webhook de Saída (WhatsApp ➔ n8n)</h3>
                <p className="text-xs text-slate-400">URL onde o CRM avisa o n8n para enviar o WhatsApp quando o consultor responder.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    URL do Webhook do n8n
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://sua-instancia-n8n.com/webhook-test/seu-id"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    O CRM enviará um `POST` com a nova mensagem assim que enviada.
                  </span>
                  
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/10 cursor-pointer"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : savedSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Salvando...' : savedSuccess ? 'Salvo!' : 'Salvar Webhook'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Standard Mock Integrations */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Outros Serviços</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {integrationsList.map((integration) => (
                <div key={integration.name} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <img src={integration.icon} alt={integration.name} className="w-8 h-8 object-contain" />
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      integration.status === 'connected' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {integration.status === 'connected' ? 'Conectado' : 'Manual'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{integration.name}</h4>
                  <p className="text-slate-400 text-[10px] leading-relaxed mb-4">{integration.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Card: API Guide / Token / cURL */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Terminal className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Guia do n8n / API Gateway</h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/5 dark:bg-emerald-950/10 rounded-2xl border border-emerald-500/10">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mb-1 uppercase tracking-wider">Chave de API (TARGET_API_KEY)</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">Chave de acesso que você configurou no arquivo `.env` para autenticar o n8n:</p>
              
              <div className="flex items-center justify-between bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <code className="text-xs font-mono font-bold text-slate-700 dark:text-slate-350">target_n8n_integration_key_sec_2026</code>
                <button 
                  onClick={() => copyToClipboard('target_n8n_integration_key_sec_2026', 'token')}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {copied === 'token' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">Exemplo de Requisição (cURL)</h4>
              <div className="relative">
                <pre className="p-4 bg-slate-950 text-slate-350 text-[10px] font-mono rounded-2xl overflow-x-auto leading-relaxed border border-slate-850">
                  {codeSnippet}
                </pre>
                <button 
                  onClick={() => copyToClipboard(codeSnippet, 'curl')}
                  className="absolute top-3 right-3 p-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-750"
                  title="Copiar cURL"
                >
                  {copied === 'curl' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
