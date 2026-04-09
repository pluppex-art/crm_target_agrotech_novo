import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useContractStore } from '../store/useContractStore';
import { NewContractModal } from '../components/contracts/NewContractModal';
import { ContractList } from '../components/contracts/ContractList';

export function Contracts() {
  const { contracts, loading, fetchContracts } = useContractStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contratos</h1>
          <p className="text-sm text-slate-500">Criação, edição e gestão de contratos comerciais.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Novo Contrato
        </button>
      </div>

      <ContractList contracts={contracts} loading={loading} />

      <NewContractModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
