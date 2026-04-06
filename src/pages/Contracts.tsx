import { useEffect, useState } from 'react';
import { FileText, Plus, Edit3, Eye, Download, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useContractStore } from '../store/useContractStore';
import { NewContractModal } from '../components/contracts/NewContractModal';

export function Contracts() {
  const { contracts, loading, fetchContracts } = useContractStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contratos</h1>
          <p className="text-sm text-slate-500">Criação, edição e gestão de contratos comerciais.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Contrato
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {contracts.map((contract) => (
            <div key={contract.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                  <FileText className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{contract.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      {new Date(contract.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">•</span>
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
              
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    useContractStore.getState().deleteContract(contract.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                  title="Excluir contrato"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {contracts.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum contrato encontrado.</p>
            </div>
          )}
        </div>
      )}

      <NewContractModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
