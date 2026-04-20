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
import { PageFilters } from '../components/ui/PageFilters';
import { Filter, User, Package } from 'lucide-react';
import type { Lead } from '../types/leads';

export function Leads() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { leads, fetchLeads, isLoading, subscribeToLeads, updateLeadStage, updateLead } = useLeadStore();
  const { pipelines, fetchPipelines } = usePipelineStore();
  const { profiles, fetchProfiles } = useProfileStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [filterStage, setFilterStage] = useState('all');

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
    return leads.filter(lead => {
      // 1. Search text
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSearch = (
          lead.name.toLowerCase().includes(q) ||
          lead.product.toLowerCase().includes(q) ||
          lead.responsible?.toLowerCase().includes(q) ||
          lead.email?.toLowerCase().includes(q)
        );
        if (!matchesSearch) return false;
      }
      
      // 2. Product
      if (filterProduct !== 'all' && lead.product !== filterProduct) return false;
      
      // 3. Responsible
      if (filterResponsible !== 'all' && lead.responsible !== filterResponsible) return false;
      
      // 4. Stage
      if (filterStage !== 'all' && lead.stage_id !== filterStage) return false;
      
      return true;
    });
  }, [leads, searchTerm, filterProduct, filterResponsible, filterStage]);

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
          <LeadsToolbar 
            isLoading={isLoading} 
            onModalOpen={() => setIsModalOpen(true)}
            hasPermissionExport={hasPermission('leads.export')}
            hasPermissionCreate={hasPermission('leads.create')}
          />
        </div>
      </div>

      <div className="mb-6">
        <PageFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Filtrar por nome, email..."
          onClearAll={() => {
            setSearchTerm('');
            setFilterProduct('all');
            setFilterResponsible('all');
            setFilterStage('all');
          }}
          filters={[
            {
              id: 'stage',
              type: 'select',
              icon: Filter,
              placeholder: 'Todos os Estágios',
              value: filterStage,
              onChange: setFilterStage,
              activeColorClass: 'bg-purple-50 text-purple-700 border-purple-100',
              options: pipelineStages.map(s => ({ value: s.id, label: s.title }))
            },
            {
              id: 'product',
              type: 'select',
              icon: Package,
              placeholder: 'Todos os Produtos',
              value: filterProduct,
              onChange: setFilterProduct,
              activeColorClass: 'bg-amber-50 text-amber-700 border-amber-100',
              options: Array.from(new Set(leads.map(l => l.product).filter(Boolean))).map(p => ({ value: p, label: p }))
            },
            {
              id: 'responsible',
              type: 'select',
              icon: User,
              placeholder: 'Todos Responsáveis',
              value: filterResponsible,
              onChange: setFilterResponsible,
              activeColorClass: 'bg-teal-50 text-teal-700 border-teal-100',
              options: responsibles.map(r => ({ value: r, label: r }))
            }
          ]}
        />
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
