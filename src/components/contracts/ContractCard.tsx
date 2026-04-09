import { FileText, Eye, Edit3, Download, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useContractStore } from '../../store/useContractStore';

interface ContractCardProps {
  contract: any;
}

export function ContractCard({ contract }: ContractCardProps) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:shadow-md transition-all">
      <div className="flex items-start sm:items-center gap-4">
        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-50 transition-colors shrink-0">
          <FileText className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-slate-800 truncate">{contract.title}</h3>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              {new Date(contract.created_at).toLocaleDateString('pt-BR')}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">•</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              R$ {contract.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
              contract.status === 'signed' ? "bg-emerald-50 text-emerald-600" :
              contract.status === 'sent' ? "bg-blue-50 text-blue-600" :
              contract.status === 'draft' ? "bg-slate-100 text-slate-500" :
              "bg-red-50 text-red-600"
            )}>
              {contract.status === 'signed' ? 'Assinado' : 
               contract.status === 'sent' ? 'Enviado' : 
               contract.status === 'draft' ? 'Rascunho' : 'Cancelado'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 justify-end">
        <button className="flex-1 sm:flex-none flex items-center justify-center p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-slate-100 sm:border-transparent">
          <Eye className="w-4 h-4" />
        </button>
        <button className="flex-1 sm:flex-none flex items-center justify-center p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-slate-100 sm:border-transparent">
          <Edit3 className="w-4 h-4" />
        </button>
        <button className="flex-1 sm:flex-none flex items-center justify-center p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-slate-100 sm:border-transparent">
          <Download className="w-4 h-4" />
        </button>
        <button 
          onClick={() => {
            useContractStore.getState().deleteContract(contract.id);
          }}
          className="flex-1 sm:flex-none flex items-center justify-center p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-100 sm:border-transparent"
          title="Excluir contrato"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
