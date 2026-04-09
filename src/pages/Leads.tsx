import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLeadStore } from '../store/useLeadStore';
import { LeadsToolbar } from '../components/leads/LeadsToolbar';
import { LeadsTable } from '../components/leads/LeadsTable';
import { NewLeadModal } from '../components/leads/NewLeadModal';

export function Leads() {
  const { leads, fetchLeads, isLoading, deleteLead } = useLeadStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Leads</h1>
          <p className="text-sm text-slate-500">Visualize e gerencie todos os seus contatos comerciais.</p>
        </div>
        <LeadsToolbar isLoading={isLoading} onModalOpen={() => setIsModalOpen(true)} />
      </div>

      <LeadsTable leads={leads} />

      <NewLeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

