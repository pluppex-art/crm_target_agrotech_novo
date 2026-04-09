import { Loader2, FileText } from 'lucide-react';
import { ContractCard } from './ContractCard';

interface ContractListProps {
  contracts: any[];
  loading: boolean;
}

export function ContractList({ contracts, loading }: ContractListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {contracts.map((contract) => (
        <ContractCard key={contract.id} contract={contract} />
      ))}
      {contracts.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Nenhum contrato encontrado.</p>
        </div>
      )}
    </div>
  );
}
