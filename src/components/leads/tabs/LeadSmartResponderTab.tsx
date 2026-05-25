import React, { useState } from 'react';
import { Bot, Send, Loader2, Copy, Check, MessageSquare, Sparkles } from 'lucide-react';
import { smartResponderService } from '../../../services/smartResponderService';
import { cn } from '@/lib/utils';

interface LeadSmartResponderTabProps {
  leadId: string;
  leadName: string;
}

export const LeadSmartResponderTab: React.FC<LeadSmartResponderTabProps> = ({ leadId, leadName }) => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [context, setContext] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await smartResponderService.generateResponse(leadId, context);
      if (res.success) {
        setResponse(res.response);
      } else {
        alert('Erro ao gerar resposta: ' + res.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex items-start gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
          <Bot size={24} />
        </div>
        <div>
          <h3 className="text-emerald-900 font-bold text-lg mb-1 flex items-center gap-2">
            Smart Responder
            <span className="text-[10px] bg-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-md uppercase font-black tracking-widest">Beta AI</span>
          </h3>
          <p className="text-emerald-700 text-sm leading-relaxed">
            Gerencie o contato com <strong>{leadName}</strong> usando inteligência artificial. Forneça contexto adicional abaixo para uma resposta mais precisa.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Sparkles size={12} className="text-amber-500" />
            Contexto Adicional (Opcional)
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Ex: O lead quer saber sobre o curso de drones agrícolas e pediu desconto para pagamento à vista..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all min-h-[100px] shadow-sm resize-none"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className={cn(
            "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg",
            loading 
              ? "bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed" 
              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 active:scale-[0.98]"
          )}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Processando Inteligência...
            </>
          ) : (
            <>
              <Send size={20} />
              Gerar Sugestão de Resposta
            </>
          )}
        </button>
      </div>

      {response && (
        <div className="space-y-3 animate-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={12} className="text-emerald-500" />
              Sugestão Gerada
            </span>
            <button
              onClick={copyToClipboard}
              className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 flex items-center gap-1.5 transition-colors uppercase tracking-widest bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-md"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copiar Texto
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-inner relative group">
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap italic">
              "{response}"
            </p>
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-30 transition-opacity">
              <Sparkles size={40} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center font-medium px-4">
            * Lembre-se de revisar a sugestão antes de enviá-la para garantir que todas as informações estejam corretas.
          </p>
        </div>
      )}
    </div>
  );
};
