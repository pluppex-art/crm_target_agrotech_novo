import { useEffect, useState } from 'react';
import { Plus, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useContractStore } from '../store/useContractStore';
import { NewContractModal } from '../components/contracts/NewContractModal';
import { ContractList } from '../components/contracts/ContractList';

export function Contracts() {
  const { hasPermission } = usePermissions();
  const { contracts, loading, fetchContracts, subscribe } = useContractStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchContracts();
    const unsubscribe = subscribe();
    return () => unsubscribe();
  }, [fetchContracts, subscribe]);

  if (!hasPermission('contracts.view')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[600px] text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Acesso Bloqueado</h2>
        <p className="text-slate-500 max-w-md mb-4 leading-relaxed">
          Você precisa da permissão <code className="bg-slate-100 px-2 py-1 rounded-lg text-sm font-mono text-slate-700">contracts.view</code> para acessar os contratos.
        </p>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Contate o administrador</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contratos</h1>
          <p className="text-sm text-slate-500">Criação, edição e gestão de contratos comerciais.</p>
        </div>
        {hasPermission('contracts.create') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Novo Contrato
          </button>
        )}
      </div>

      <ContractList contracts={contracts} loading={loading} />

      <NewContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
