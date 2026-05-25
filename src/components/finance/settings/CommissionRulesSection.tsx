import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, X, Loader2, Save, Pencil, Pause, Play, Trash2 } from 'lucide-react';
import { commissionRulesService } from '../../../services/commissionRulesService';
import { VALID_LEVELS } from '../../../services/compensationProfileService';
import { CommissionRule, RoleType } from '../../../types/finance_v2';
import { cn } from '../../../lib/utils';

type CREditing = {
  id: string;
  role_type: RoleType;
  level: string;
  target_revenue: number;
  fixed_amount: number;
  variable_amount: number;
  accelerator_amount: number;
};

const EMPTY_CR_FORM = {
  role_type: 'CLOSER' as RoleType,
  level: 'Junior 1',
  target_revenue: 0,
  fixed_amount: 0,
  variable_amount: 0,
  accelerator_amount: 0,
  active: true,
};

export function CommissionRulesSection() {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CREditing | null>(null);
  const [form, setForm] = useState({ ...EMPTY_CR_FORM });

  const load = useCallback(async () => {
    setIsLoading(true);
    try { setRules(await commissionRulesService.getAll()); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await commissionRulesService.create(form);
      if (!result) { setSaveError('Erro ao salvar regra.'); return; }
      setShowForm(false);
      setForm({ ...EMPTY_CR_FORM });
      await load();
    } catch (err: any) {
      setSaveError(err?.message || 'Erro inesperado.');
    } finally { setIsSaving(false); }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editing) return;
    setIsSaving(true);
    try {
      await commissionRulesService.update(id, editing);
      setEditing(null);
      await load();
    } finally { setIsSaving(false); }
  };

  const handleToggle = async (r: CommissionRule) => {
    await commissionRulesService.setActive(r.id, !r.active);
    load();
  };

  const handleDelete = async (r: CommissionRule) => {
    if (!confirm(`Excluir regra "${r.role_type} — ${r.level}"?`)) return;
    await commissionRulesService.delete(r.id);
    load();
  };

  const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const grouped = ['CLOSER', 'SDR', 'MANAGER'].reduce<Record<string, CommissionRule[]>>((acc, role) => {
    acc[role] = rules.filter(r => r.role_type === role);
    return acc;
  }, {});

  const roleBadge: Record<string, string> = {
    CLOSER: 'bg-emerald-100 text-emerald-700',
    SDR: 'bg-blue-100 text-blue-700',
    MANAGER: 'bg-violet-100 text-violet-700',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Regras de Comissão OTE</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Define fixo, variável, meta e acelerador por cargo + nível.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setSaveError(null); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Fechar' : 'Nova Regra'}
        </button>
      </div>

      {saveError && <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">{saveError}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Cargo</label>
              <select value={form.role_type} onChange={e => setForm(p => ({ ...p, role_type: e.target.value as RoleType }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm">
                <option value="CLOSER">CLOSER</option>
                <option value="SDR">SDR</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Nível</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm">
                {VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Meta (R$)</label>
              <input type="number" step="0.01" value={form.target_revenue} onChange={e => setForm(p => ({ ...p, target_revenue: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Fixo (R$)</label>
              <input type="number" step="0.01" value={form.fixed_amount} onChange={e => setForm(p => ({ ...p, fixed_amount: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
            </button>
          </div>
        </form>
      )}

      {isLoading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" /></div> : (
        <div className="space-y-4">
          {(['CLOSER', 'SDR', 'MANAGER'] as RoleType[]).map(role => {
            const roleRules = grouped[role];
            if (!roleRules?.length) return null;
            return (
              <div key={role} className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden overflow-x-auto">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                  <span className={cn('px-2 py-0.5 rounded-full', roleBadge[role])}>{role}</span>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">Nível</th>
                      <th className="px-4 py-3 text-right">Meta</th>
                      <th className="px-4 py-3 text-right">Fixo</th>
                      <th className="px-4 py-3 text-right">Variável 100%</th>
                      <th className="px-4 py-3 text-right">Acelerador</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roleRules.map(r => {
                      const isEd = editing?.id === r.id;
                      return (
                        <tr key={r.id} className={cn('transition-colors', !r.active && 'opacity-50 bg-slate-50 dark:bg-slate-800/40')}>
                          <td className="px-4 py-3">{isEd ? <select value={editing.level} onChange={e => setEditing(ed => ed && ({ ...ed, level: e.target.value }))} className="text-xs border rounded p-1">{VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select> : <span className="font-bold">{r.level}</span>}</td>
                          <td className="px-4 py-3 text-right">{isEd ? <input type="number" step="0.01" value={editing.target_revenue} onChange={e => setEditing(ed => ed && ({ ...ed, target_revenue: parseFloat(e.target.value) || 0 }))} className="text-xs border rounded p-1 text-right w-24" /> : fmt(r.target_revenue)}</td>
                          <td className="px-4 py-3 text-right">{isEd ? <input type="number" step="0.01" value={editing.fixed_amount} onChange={e => setEditing(ed => ed && ({ ...ed, fixed_amount: parseFloat(e.target.value) || 0 }))} className="text-xs border rounded p-1 text-right w-24" /> : fmt(r.fixed_amount)}</td>
                          <td className="px-4 py-3 text-right">{isEd ? <input type="number" step="0.01" value={editing.variable_amount} onChange={e => setEditing(ed => ed && ({ ...ed, variable_amount: parseFloat(e.target.value) || 0 }))} className="text-xs border rounded p-1 text-right w-24" /> : fmt(r.variable_amount)}</td>
                          <td className="px-4 py-3 text-right">{isEd ? <input type="number" step="0.01" value={editing.accelerator_amount} onChange={e => setEditing(ed => ed && ({ ...ed, accelerator_amount: parseFloat(e.target.value) || 0 }))} className="text-xs border rounded p-1 text-right w-24" /> : fmt(r.accelerator_amount)}</td>
                          <td className="px-4 py-3 text-center"><button onClick={() => handleToggle(r)} className={r.active ? 'text-emerald-500' : 'text-slate-300'}>{r.active ? 'Ativa' : 'Inativa'}</button></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {isEd ? <button onClick={() => handleSaveEdit(r.id)} className="p-1.5 bg-indigo-600 text-white rounded"><Save size={14} /></button> : <button onClick={() => setEditing({ ...r })} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil size={14} /></button>}
                              <button onClick={() => handleDelete(r)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
