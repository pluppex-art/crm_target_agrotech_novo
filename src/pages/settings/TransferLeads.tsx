import { useEffect, useState, useMemo } from 'react';
import { ArrowRight, Search, Loader2, CheckSquare, Square, Users, RefreshCw, CheckCircle2, AlertCircle, Filter, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfileStore } from '../../store/useProfileStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePipelineStore } from '../../store/usePipelineStore';
import { auditService } from '../../services/auditService';
import { cn } from '../../lib/utils';

interface LeadRow {
  id: string;
  name: string;
  phone?: string;
  stage_id?: string;
  pipeline_id?: string;
  responsavel_usuario_id?: string;
  responsible?: string;
}

interface TransferLog {
  summary: string;
  from: string;
  to: string[];
  at: string;
  count: number;
}

interface RecipientSlice {
  id: string;
  name: string;
  count: number;
}

export function TransferLeads() {
  const { profiles, fetchProfiles } = useProfileStore();
  const { pipelines, fetchPipelines } = usePipelineStore();
  const { user } = useAuthStore();

  const [fromId, setFromId] = useState('');
  const [toIds, setToIds] = useState<Set<string>>(new Set());
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [log, setLog] = useState<TransferLog[]>([]);
  const [search, setSearch] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (profiles.length === 0) fetchProfiles();
    if (pipelines.length === 0) fetchPipelines();
  }, [fetchProfiles, fetchPipelines, profiles.length, pipelines.length]);

  useEffect(() => {
    if (!fromId) { setLeads([]); setSelected(new Set()); return; }
    setLoading(true);
    setSelected(new Set());
    supabase
      .from('leads')
      .select('id, name, phone, stage_id, pipeline_id, responsavel_usuario_id, responsible')
      .eq('responsavel_usuario_id', fromId)
      .order('name')
      .then(({ data }) => {
        setLeads((data as LeadRow[]) || []);
        setLoading(false);
      });
  }, [fromId]);

  // When fromId changes, remove it from toIds if present
  useEffect(() => {
    if (fromId && toIds.has(fromId)) {
      setToIds(prev => {
        const next = new Set(prev);
        next.delete(fromId);
        return next;
      });
    }
  }, [fromId]);

  const allProfiles = useMemo(
    () => profiles.filter(p => p.id && p.name).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [profiles],
  );

  const stageMap = useMemo(() => {
    const map: Record<string, string> = {};
    pipelines.forEach(p => p.stages?.forEach(s => { map[s.id] = s.name; }));
    return map;
  }, [pipelines]);

  const pipelineMap = useMemo(() => {
    const map: Record<string, string> = {};
    pipelines.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [pipelines]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.phone ?? '').includes(search);
      const matchPipeline = !pipelineFilter || l.pipeline_id === pipelineFilter;
      return matchSearch && matchPipeline;
    });
  }, [leads, search, pipelineFilter]);

  // Available recipients (excluding fromId), filtered by search
  const availableRecipients = useMemo(() => {
    return allProfiles.filter(p => {
      if (p.id === fromId) return false;
      if (!recipientSearch) return true;
      return (p.name ?? '').toLowerCase().includes(recipientSearch.toLowerCase());
    });
  }, [allProfiles, fromId, recipientSearch]);

  // Proportional distribution preview
  const distribution = useMemo((): RecipientSlice[] => {
    const recipients = Array.from(toIds);
    if (recipients.length === 0 || selected.size === 0) return [];
    const total = selected.size;
    const count = recipients.length;
    const base = Math.floor(total / count);
    const remainder = total % count;
    return recipients.map((id, index) => ({
      id,
      name: allProfiles.find(p => p.id === id)?.name ?? '',
      count: base + (index < remainder ? 1 : 0),
    }));
  }, [toIds, selected.size, allProfiles]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredLeads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const toggleRecipient = (id: string) => {
    setToIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleTransfer = async () => {
    if (!fromId || toIds.size === 0 || selected.size === 0) return;

    const fromPerson = allProfiles.find(p => p.id === fromId);
    if (!fromPerson) return;

    const selectedLeadIds = Array.from(selected);
    const recipients = Array.from(toIds);
    const total = selectedLeadIds.length;
    const count = recipients.length;
    const base = Math.floor(total / count);
    const remainder = total % count;

    // Build batches with proportional slices
    const batches: { recipientId: string; recipientName: string; leadIds: string[] }[] = [];
    let offset = 0;
    recipients.forEach((recipientId, index) => {
      const batchSize = base + (index < remainder ? 1 : 0);
      batches.push({
        recipientId,
        recipientName: allProfiles.find(p => p.id === recipientId)?.name ?? '',
        leadIds: selectedLeadIds.slice(offset, offset + batchSize),
      });
      offset += batchSize;
    });

    setTransferring(true);

    const results = await Promise.all(
      batches
        .filter(b => b.leadIds.length > 0)
        .map(batch =>
          supabase
            .from('leads')
            .update({ responsavel_usuario_id: batch.recipientId, responsible: batch.recipientName })
            .in('id', batch.leadIds),
        ),
    );

    const hasError = results.some(r => r.error);

    if (hasError) {
      showToast('error', 'Erro ao transferir alguns leads. Verifique e tente novamente.');
      setTransferring(false);
      return;
    }

    // Audit log
    if (user?.id) {
      const myProfile = allProfiles.find(p => p.id === user.id);
      auditService.logAction({
        userId: user.id,
        userName: myProfile?.name || user.email || 'Sistema',
        action: 'Transferir Leads',
        entityType: 'lead',
        entityId: selectedLeadIds.join(','),
        details: {
          from: fromPerson.name,
          recipients: batches.map(b => ({ name: b.recipientName, count: b.leadIds.length })),
          totalCount: total,
          leadIds: selectedLeadIds,
        },
      });
    }

    const now = new Date().toLocaleString('pt-BR');
    const transferredNames = leads.filter(l => selectedLeadIds.includes(l.id)).map(l => l.name);
    setLog(prev => [
      {
        summary: `${transferredNames.slice(0, 2).join(', ')}${transferredNames.length > 2 ? ` +${transferredNames.length - 2}` : ''}`,
        from: fromPerson.name ?? '',
        to: batches.map(b => `${b.recipientName} (${b.leadIds.length})`),
        at: now,
        count: total,
      },
      ...prev.slice(0, 19),
    ]);

    setLeads(prev => prev.filter(l => !selected.has(l.id)));
    setSelected(new Set());

    const toNames = batches.map(b => b.recipientName).join(', ');
    showToast('success', `${total} lead(s) distribuído(s) para ${count} responsável(eis): ${toNames}.`);
    setTransferring(false);
  };

  const fromName = allProfiles.find(p => p.id === fromId)?.name ?? '';
  const allSelected = filteredLeads.length > 0 && selected.size === filteredLeads.length;
  const someSelected = selected.size > 0 && selected.size < filteredLeads.length;
  const canTransfer = fromId && toIds.size > 0 && selected.size > 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Transferência de Leads</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Redistribua leads de um responsável para um ou mais closers. A distribuição é proporcional e automática.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold shadow-sm',
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400',
        )}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="flex-1">{toast.msg}</span>
        </div>
      )}

      {/* Step 1 — Select responsible */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">1. Origem</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FROM */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">De (responsável atual)</label>
            <select
              value={fromId}
              onChange={e => setFromId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">— Selecionar responsável —</option>
              {allProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {fromId && (
              <p className="text-xs text-slate-400">
                <span className="font-bold text-slate-600 dark:text-slate-300">{leads.length}</span> lead(s) atribuído(s) a {fromName}
              </p>
            )}
          </div>

          {/* Arrow (decorative) */}
          <div className="hidden md:flex items-center justify-start pt-7">
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <ArrowRight size={16} className="text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 — Select destination closers */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">2. Destinos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Selecione um ou mais closers. Os leads serão divididos proporcionalmente.</p>
          </div>
          {toIds.size > 0 && (
            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-black">
              {toIds.size} selecionado(s)
            </span>
          )}
        </div>

        {/* Recipient search */}
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={recipientSearch}
            onChange={e => setRecipientSearch(e.target.value)}
            placeholder="Buscar closer..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Recipient list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          {availableRecipients.length === 0 ? (
            <p className="col-span-full text-sm text-slate-400 py-4 text-center">
              {fromId ? 'Nenhum outro responsável disponível.' : 'Selecione a origem primeiro.'}
            </p>
          ) : (
            availableRecipients.map(p => {
              const isSelected = toIds.has(p.id);
              const slice = distribution.find(d => d.id === p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleRecipient(p.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none',
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40',
                  )}
                >
                  {isSelected
                    ? <CheckSquare size={15} className="text-emerald-500 shrink-0" />
                    : <Square size={15} className="text-slate-300 dark:text-slate-600 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold truncate', isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300')}>
                      {p.name}
                    </p>
                    {isSelected && slice && selected.size > 0 && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold">
                        Receberá {slice.count} lead{slice.count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected recipients chips */}
        {toIds.size > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Selecionados</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(toIds).map(id => {
                const name = allProfiles.find(p => p.id === id)?.name ?? id;
                return (
                  <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold">
                    {name}
                    <button
                      onClick={e => { e.stopPropagation(); toggleRecipient(id); }}
                      className="hover:text-emerald-900 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Step 3 — Select leads */}
      {fromId && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
              3. Selecionar leads{' '}
              {selected.size > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-[10px] font-black normal-case">
                  {selected.size} selecionado(s)
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar lead..."
                  className="pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 w-40"
                />
              </div>
              {pipelines.length > 1 && (
                <div className="relative">
                  <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={pipelineFilter}
                    onChange={e => setPipelineFilter(e.target.value)}
                    className="pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Todos os pipelines</option>
                    {pipelines.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-emerald-500" size={24} />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-300 dark:text-slate-700">
              <Users size={36} />
              <p className="text-sm text-slate-400 font-semibold">Nenhum lead encontrado</p>
              {search && <p className="text-xs text-slate-400">Tente uma busca diferente</p>}
            </div>
          ) : (
            <>
              <div
                className="flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                onClick={toggleAll}
              >
                {allSelected
                  ? <CheckSquare size={16} className="text-emerald-500 shrink-0" />
                  : someSelected
                    ? <div className="w-4 h-4 rounded border-2 border-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 shrink-0" />
                    : <Square size={16} className="text-slate-400 shrink-0" />
                }
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {allSelected ? 'Desmarcar todos' : `Selecionar todos (${filteredLeads.length})`}
                </span>
              </div>

              <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                {filteredLeads.map(lead => {
                  const isChecked = selected.has(lead.id);
                  const stageName = lead.stage_id ? stageMap[lead.stage_id] : null;
                  const pipelineName = lead.pipeline_id ? pipelineMap[lead.pipeline_id] : null;
                  return (
                    <div
                      key={lead.id}
                      onClick={() => toggleSelect(lead.id)}
                      className={cn(
                        'flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-colors',
                        isChecked
                          ? 'bg-emerald-50/60 dark:bg-emerald-900/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30',
                      )}
                    >
                      {isChecked
                        ? <CheckSquare size={16} className="text-emerald-500 shrink-0" />
                        : <Square size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{lead.name}</p>
                        <p className="text-xs text-slate-400 truncate">{lead.phone || 'Sem telefone'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {pipelineName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">
                            {pipelineName}
                          </span>
                        )}
                        {stageName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                            {stageName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 4 — Confirm */}
      {canTransfer && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">4. Confirmar distribuição</h2>

          {/* Distribution preview */}
          <div className="mb-5 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Como os {selected.size} lead(s) serão distribuídos:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {distribution.map((slice, i) => {
                const pct = selected.size > 0 ? Math.round((slice.count / selected.size) * 100) : 0;
                return (
                  <div key={slice.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-black shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{slice.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                          {slice.count} lead{slice.count !== 1 ? 's' : ''} ({pct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resumo</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-black text-slate-800 dark:text-slate-100">{selected.size}</span> lead(s) de{' '}
                <span className="font-bold text-red-600 dark:text-red-400">{fromName}</span>
                {' '}→{' '}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{toIds.size} closer{toIds.size !== 1 ? 's' : ''}</span>
              </p>
            </div>
            <button
              onClick={handleTransfer}
              disabled={transferring}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-200/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            >
              {transferring
                ? <Loader2 size={16} className="animate-spin" />
                : <RefreshCw size={16} />
              }
              {transferring ? 'Transferindo...' : `Transferir ${selected.size} lead(s) para ${toIds.size} closer${toIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Transfer history */}
      {log.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Histórico desta sessão</h2>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {log.map((entry, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-3.5">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 truncate font-medium">
                    {entry.count} lead(s): {entry.summary}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="text-red-500 font-semibold">{entry.from}</span>
                    {' → '}
                    <span className="text-emerald-600 font-semibold">{entry.to.join(' · ')}</span>
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">{entry.at}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
