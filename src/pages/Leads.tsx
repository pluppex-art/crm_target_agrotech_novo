import { useEffect, useState, useMemo } from 'react';
import { Loader2, Search, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useLeadStore } from '../store/useLeadStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { useProfileStore } from '../store/useProfileStore';
import { LeadsToolbar } from '../components/leads/LeadsToolbar';
import { LeadsTable } from '../components/leads/LeadsTable';
import { NewLeadModal } from '../components/leads/NewLeadModal';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import type { Lead } from '../types/leads';

export function Leads() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { leads, fetchLeads, isLoading, subscribeToLeads, updateLeadStage, updateLead } = useLeadStore();
  const { pipelines, fetchPipelines } = usePipelineStore();
  const { profiles, fetchProfiles } = useProfileStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLeads();
    fetchPipelines();
    fetchProfiles();
  }, [fetchLeads, fetchPipelines, fetchProfiles]);

  useEffect(() => {
    const unsubscribe = subscribeToLeads();
    return unsubscribe;
  }, []);

  const selectedLeadPipeline = useMemo(() => {
    if (!selectedLead?.pipeline_id) return pipelines[0] ?? null;
    return pipelines.find(p => p.id === selectedLead.pipeline_id) ?? pipelines[0] ?? null;
  }, [selectedLead, pipelines]);

  const pipelineStages = useMemo(() =>
    (selectedLeadPipeline?.stages ?? []).map(s => ({ id: s.id, title: s.name, color: s.color || 'bg-blue-500' })),
    [selectedLeadPipeline]
  );

  const responsibles = useMemo(() =>
    profiles
      .filter(p => p.status === 'active' && p.name && p.department?.toLowerCase() === 'comercial')
      .map(p => p.name as string),
    [profiles]
  );

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.responsible?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  if (permissionsLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 text-lg">Carregando permissões...</p>
      </div>
    );
  }

  if (!hasPermission('leads.view')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-24 h-24 bg-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <ShieldAlert className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Sem Permissão de Visualização</h2>
        <p className="text-slate-500 max-w-md mb-8 leading-relaxed">Você precisa da permissão <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono text-slate-700">leads.view</code> para acessar esta página.</p>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Entre em contato com o administrador</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestão de Clientes</h1>
            <p className="text-sm text-slate-500">Visualize e gerencie todos os seus contatos comerciais.</p>
          </div>
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold border border-emerald-100">
            {filteredLeads.length} {filteredLeads.length === 1 ? 'Cliente' : 'Clientes'}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por nome, produto, responsável..." 
              className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
            />
          </div>
          <LeadsToolbar 
            isLoading={isLoading} 
            onModalOpen={() => setIsModalOpen(true)}
            hasPermissionExport={hasPermission('leads.export')}
            hasPermissionCreate={hasPermission('leads.create')}
          />

        </div>
      </div>

      <LeadsTable
        leads={filteredLeads}
        totalCount={leads.length}
        onLeadClick={setSelectedLead}
      />

      <NewLeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {selectedLead && (
        <LeadDetailsModal
          key={`lead-details-${selectedLead.id}`}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={leads.find(l => l.id === selectedLead.id) || selectedLead}
          pipelineStages={pipelineStages}
          currentStageId={selectedLead.stage_id || pipelineStages[0]?.id}
          responsibles={responsibles}
          onStageChange={(stageId) => {
            const targetStage = selectedLeadPipeline?.stages.find(s => s.id === stageId);
            updateLeadStage(selectedLead.id, stageId);
            updateLead(selectedLead.id, { status: targetStage?.name ?? '' });
          }}
        />
      )}
    </div>
  );
}
