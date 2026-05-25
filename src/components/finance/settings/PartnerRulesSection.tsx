import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, Save, Pencil, ToggleRight, ToggleLeft, Trash2, Percent, DollarSign } from 'lucide-react';
import { financialRulesService } from '../../../services/financialRulesService';
import { categoryService } from '../../../services/categoryService';
import { PartnerRule, FinancialCategory } from '../../../types/finance_v2';
import { cn } from '../../../lib/utils';

export function PartnerRulesSection() {
  const [rules, setRules] = useState<PartnerRule[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<PartnerRule | null>(null);
  const [form, setForm] = useState({ origin_type: 'PLUPPEX' as 'TARGET' | 'PLUPPEX', technology_fee_percent: 0, fixed_fee: 0, category_id: '' as string | null, valid_from: new Date().toISOString().split('T')[0], valid_until: '' as string | null, active: true });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [r, c] = await Promise.all([
        financialRulesService.getPartnerRules(),
        categoryService.getAll(),
      ]);
      setRules(r);
      setCategories(c);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await financialRulesService.createPartnerRule({ ...form, category_id: form.category_id || null });
      setShowForm(false);
      await load();
    } finally { setIsSaving(false); }
  };

  const handleToggle = async (rule: PartnerRule) => {
    await financialRulesService.updatePartnerRule(rule.id, { active: !rule.active });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta regra?')) return;
    await financialRulesService.deletePartnerRule(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Regras de Parceria</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Define taxas de tecnologia e custos fixos por origem.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
          {showForm ? 'Fechar' : '+ Nova Regra'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-indigo-100 shadow-sm space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Origem</label>
              <select value={form.origin_type} onChange={e => setForm(p => ({ ...p, origin_type: e.target.value as any }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm">
                <option value="PLUPPEX">PLUPPEX</option>
                <option value="TARGET">TARGET</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Taxa Tec (%)</label>
              <input type="number" step="0.01" value={form.technology_fee_percent} onChange={e => setForm(p => ({ ...p, technology_fee_percent: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Fixo (R$)</label>
              <input type="number" step="0.01" value={form.fixed_fee} onChange={e => setForm(p => ({ ...p, fixed_fee: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Categoria</label>
              <select value={form.category_id || ''} onChange={e => setForm(p => ({ ...p, category_id: e.target.value || null }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm">
                <option value="">Selecione...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Salvar Regra</button>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden overflow-x-auto">
        {isLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin inline" /></div> : (
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 border-b">
              <tr>
                <th className="px-5 py-4">Origem</th>
                <th className="px-5 py-4">Taxa Tec</th>
                <th className="px-5 py-4">Custo Fixo</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map(r => (
                <tr key={r.id} className={cn(!r.active && 'opacity-50 bg-slate-50 dark:bg-slate-800')}>
                  <td className="px-5 py-3 font-bold text-indigo-600">{r.origin_type}</td>
                  <td className="px-5 py-3">{r.technology_fee_percent}%</td>
                  <td className="px-5 py-3">R$ {r.fixed_fee.toFixed(2)}</td>
                  <td className="px-5 py-3"><button onClick={() => handleToggle(r)}>{r.active ? <ToggleRight className="text-emerald-500" /> : <ToggleLeft className="text-slate-300" />}</button></td>
                  <td className="px-5 py-3 text-center"><button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
