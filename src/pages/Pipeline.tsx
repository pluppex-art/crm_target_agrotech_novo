import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MoreHorizontal, 
  Plus, 
  Star, 
  Trash2,
  Eye, 
  Search, 
  Filter, 
  Download,
  ChevronDown,
  User,
  Loader2,
  X,
  Phone,
  Edit2,
  CheckSquare
} from 'lucide-react';
import { useLeadStore } from '../store/useLeadStore';
import { Lead, LeadStatus, LeadSubStatus } from '../types/leads';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { NewLeadModal } from '../components/leads/NewLeadModal';
import { cn } from '../lib/utils';

const COLUMNS: { id: LeadStatus; title: string; color: string }[] = [
  { id: 'new', title: 'Em aberto', color: 'bg-blue-500' },
  { id: 'qualified', title: 'Qualificado', color: 'bg-emerald-500' },
  { id: 'proposal', title: 'Proposta', color: 'bg-amber-500' },
  { id: 'closed', title: 'Fechado', color: 'bg-emerald-600' },
];

export const Pipeline: React.FC = () => {
  const { 
    leads, 
    updateLeadStatus, 
    updateLeadSubStatus, 
    selectedLead, 
    setSelectedLead, 
    fetchLeads, 
    isLoading,
    deleteLead
  } = useLeadStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'all'>('all');
  const [isResponsibleDropdownOpen, setIsResponsibleDropdownOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [initialStatusForNewLead, setInitialStatusForNewLead] = useState<LeadStatus>('new');
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const responsibleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (responsibleDropdownRef.current && !responsibleDropdownRef.current.contains(event.target as Node)) {
        setIsResponsibleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onDragEnd = (result: DropResult) => {
// ... (rest of the component)
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    updateLeadStatus(draggableId, destination.droppableId as LeadStatus);
  };

  const responsibles = Array.from(new Set(leads.map(l => l.responsible).filter(Boolean))) as string[];
  const filteredResponsibles = responsibles.filter(name => 
    name.toLowerCase().includes(responsibleSearch.toLowerCase())
  );

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.responsible && lead.responsible.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesResponsible = selectedResponsible === 'all' || lead.responsible === selectedResponsible;

    return matchesSearch && matchesResponsible;
  });

  const visibleColumns = selectedStatus === 'all' 
    ? COLUMNS 
    : COLUMNS.filter(col => col.id === selectedStatus);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Pipeline de Vendas
            <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
              {leads.length} leads
            </span>
          </h1>
          <p className="text-gray-500 text-sm">Gerencie seu fluxo de vendas e acompanhe o progresso dos leads.</p>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />}
          
          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as LeadStatus | 'all')}
              className={cn(
                "pl-10 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer text-sm font-medium text-gray-700 min-w-[160px]",
                selectedStatus !== 'all' ? "pr-10" : "pr-8"
              )}
            >
              <option value="all">Todos Status</option>
              {COLUMNS.map(col => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            {selectedStatus !== 'all' && (
              <button
                onClick={() => setSelectedStatus('all')}
                className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                title="Limpar filtro"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Responsible Filter */}
          <div className="relative" ref={responsibleDropdownRef}>
            <div className="relative flex items-center">
              <button
                onClick={() => setIsResponsibleDropdownOpen(!isResponsibleDropdownOpen)}
                className={cn(
                  "flex items-center gap-2 pl-10 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-gray-700 min-w-[200px] text-left",
                  selectedResponsible !== 'all' ? "pr-10" : "pr-4"
                )}
              >
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <span className="truncate">
                  {selectedResponsible === 'all' ? 'Todos Responsáveis' : selectedResponsible}
                </span>
                <ChevronDown className={cn("ml-auto text-gray-400 transition-transform", isResponsibleDropdownOpen && "rotate-180")} size={16} />
              </button>
              {selectedResponsible !== 'all' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedResponsible('all');
                  }}
                  className="absolute right-10 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                  title="Limpar filtro"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <AnimatePresence>
              {isResponsibleDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Filtrar nomes..."
                        value={responsibleSearch}
                        onChange={(e) => setResponsibleSearch(e.target.value)}
                        className="w-full pl-8 pr-4 py-1.5 bg-gray-50 border-none rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    <button
                      onClick={() => {
                        setSelectedResponsible('all');
                        setIsResponsibleDropdownOpen(false);
                        setResponsibleSearch('');
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors",
                        selectedResponsible === 'all' ? "text-emerald-600 font-bold bg-emerald-50/50" : "text-gray-700"
                      )}
                    >
                      Todos Responsáveis
                    </button>
                    {filteredResponsibles.map(name => (
                      <button
                        key={name}
                        onClick={() => {
                          setSelectedResponsible(name);
                          setIsResponsibleDropdownOpen(false);
                          setResponsibleSearch('');
                        }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors",
                          selectedResponsible === name ? "text-emerald-600 font-bold bg-emerald-50/50" : "text-gray-700"
                        )}
                      >
                        {name}
                      </button>
                    ))}
                    {filteredResponsibles.length === 0 && responsibleSearch && (
                      <div className="px-4 py-3 text-center text-xs text-gray-500">
                        Nenhum responsável encontrado
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all w-64"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={20} />
          </button>
          <button 
            onClick={() => {
              setInitialStatusForNewLead('new');
              setIsNewLeadModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold"
          >
            <Plus size={20} />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={cn(
          "grid gap-6 overflow-x-auto pb-4",
          visibleColumns.length === 1 ? "grid-cols-1 max-w-md mx-auto" : 
          visibleColumns.length === 2 ? "grid-cols-1 md:grid-cols-2" :
          visibleColumns.length === 3 ? "grid-cols-1 md:grid-cols-3" :
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}>
          {visibleColumns.map((column) => (
            <div key={column.id} className="flex flex-col min-w-[300px] bg-gray-100/50 rounded-2xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", column.color)} />
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    {column.title}
                    <ChevronDown size={16} className="text-gray-400" />
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {filteredLeads.filter(l => l.status === column.id).length}
                  </span>
                  <button 
                    onClick={() => {
                      setInitialStatusForNewLead(column.id);
                      setIsNewLeadModalOpen(true);
                    }}
                    className="p-1.5 bg-white border border-gray-200 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm"
                    title={`Adicionar lead em ${column.title}`}
                  >
                    <Plus size={14} />
                  </button>
                  <button className="p-1 hover:bg-gray-200 rounded-lg text-gray-400">
                    <User size={16} />
                  </button>
                </div>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn(
                      "flex-1 space-y-3 min-h-[500px] transition-colors rounded-xl p-1",
                      snapshot.isDraggingOver ? "bg-emerald-50/50" : ""
                    )}
                  >
                    {filteredLeads
                      .filter((lead) => lead.status === column.id)
                      .map((lead, index) => {
                        const DraggableAny = Draggable as any;
                        return (
                          <DraggableAny key={lead.id} draggableId={lead.id} index={index}>
                            {(provided: any, snapshot: any) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onDoubleClick={() => setSelectedLead(lead)}
                              className={cn(
                                "bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-emerald-200 transition-all group relative",
                                snapshot.isDragging ? "shadow-xl border-emerald-500 rotate-2" : ""
                              )}
                            >
                              {/* Card Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img
                                      src={lead.photo}
                                      alt={lead.name}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-50 shadow-sm"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{lead.name}</h4>
                                    <div className="flex gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          size={10}
                                          className={cn(
                                            i < lead.stars ? "fill-yellow-400 text-yellow-400" : "text-slate-200"
                                          )}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <button className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
                                  <MoreHorizontal size={18} />
                                </button>
                              </div>

                              {/* Card Body */}
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2 text-slate-500">
                                  <Phone size={14} className="text-emerald-500" />
                                  <span className="text-xs font-medium">{lead.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                  <Plus size={14} className="text-slate-300" />
                                  <span className="text-xs font-medium">{lead.product}</span>
                                </div>
                                
                                <div className="flex items-center justify-between pt-2">
                                  <span className="text-sm font-bold text-slate-800">
                                    R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                  </span>
                                  
                                <div className="flex items-center gap-1.5">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteLead(lead.id);
                                    }}
                                    className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-slate-100"
                                    title="Excluir lead"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLead(lead);
                                    }}
                                    className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-slate-100"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-slate-100">
                                    <CheckSquare size={14} />
                                  </button>
                                </div>
                                </div>
                              </div>

                              {lead.status === 'qualified' && (
                                <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap gap-2">
                                  {[
                                    { id: 'qualified', label: 'Qualificado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                                    { id: 'warming', label: 'Aquecimento', color: 'bg-amber-50 text-amber-600 border-amber-100' },
                                    { id: 'disqualified', label: 'Desqualificado', color: 'bg-red-50 text-red-600 border-red-100' }
                                  ].map((sub) => (
                                    <button
                                      key={sub.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateLeadSubStatus(lead.id, sub.id as LeadSubStatus);
                                      }}
                                      className={cn(
                                        "text-[10px] font-bold px-2 py-1 rounded-full border transition-all",
                                        lead.subStatus === sub.id 
                                          ? sub.color 
                                          : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                                      )}
                                    >
                                      {sub.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </DraggableAny>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Lead Details Modal */}
      {selectedLead && (
        <LeadDetailsModal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
        />
      )}

      {/* New Lead Modal */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        initialStatus={initialStatusForNewLead}
      />
    </div>
  );
};
