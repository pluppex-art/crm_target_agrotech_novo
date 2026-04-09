import { Loader2, Megaphone, Mail, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMarketingStore } from '../../store/useMarketingStore';

interface CampaignTableProps {
  campaigns: any[];
  loading: boolean;
}

export function CampaignTable({ campaigns, loading }: CampaignTableProps) {
  const { deleteCampaign } = useMarketingStore();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-bold text-slate-800">Campanhas Recentes</h3>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Nome</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Plataforma</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Leads</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Orçamento</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-800 border-b border-slate-50">{c.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      {c.platform === 'E-mail Marketing' ? <Mail className="w-3 h-3" /> : c.platform === 'WhatsApp' ? <MessageCircle className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                      {c.platform}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm border-b border-slate-50">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                      c.status === 'active' ? "bg-emerald-50 text-emerald-600" :
                      c.status === 'paused' ? "bg-yellow-50 text-yellow-600" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      {c.status === 'active' ? 'Ativa' : c.status === 'paused' ? 'Pausada' : 'Finalizada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 border-b border-slate-50">{c.leads_count}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800 border-b border-slate-50">R$ {c.budget?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-sm border-b border-slate-50 text-right">
                    <button 
                      onClick={() => {
                        deleteCampaign(c.id);
                      }}
                      className="p-1 text-slate-300 hover:text-red-600 transition-colors"
                      title="Excluir campanha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Nenhuma campanha encontrada.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
