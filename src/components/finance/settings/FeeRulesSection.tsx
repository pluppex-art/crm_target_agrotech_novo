import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, Save, Pencil, ToggleRight, ToggleLeft, Trash2, Settings } from 'lucide-react';
import { financialRulesService } from '../../../services/financialRulesService';
import { FinancialFeeRule } from '../../../types/finance_v2';
import { cn } from '../../../lib/utils';

export function FeeRulesSection() {
  const [rules, setRules] = useState<FinancialFeeRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<FinancialFeeRule | null>(null);
  const [form, setForm] = useState({ name: '', amount: 0, is_percentage: true, type: 'TAX' as FinancialFeeRule['type'], application_context: 'GROSS_REVENUE' as FinancialFeeRule['application_context'], valid_from: new Date().toISOString().split('T')[0], valid_until: '' as string | null, active: true });

  const load = useCallback(async () => {
    setIsLoading(true);
    try { setRules(await financialRulesService.getFeeRules()); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (rule: FinancialFeeRule) => {
    await financialRulesService.updateFeeRule(rule.id, { active: !rule.active });
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await financialRulesService.createFeeRule({ ...form, valid_until: form.valid_until || null, updated_at: new Date().toISOString() } as any);
      setShowForm(false);
      load();
    } finally { setIsSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setIsSaving(true);
    try {
      await financialRulesService.updateFeeRule(editing.id, {
        name: editing.name,
        amount: editing.amount,
        is_percentage: editing.is_percentage,
        type: editing.type,
        application_context: editing.application_context,
        valid_from: editing.valid_from,
        valid_until: editing.valid_until
      });
      setEditing(null);
      await load();
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (r: FinancialFeeRule) => {
    if (!confirm(`Excluir taxa "${r.name}"?`)) return;
    await financialRulesService.deleteFeeRule(r.id);
    load();
  };

  const typeLabel: Record<string, string> = { TAX: 'Imposto', GATEWAY: 'Gateway', DISCOUNT: 'Desconto', ADMIN_FEE: 'Taxa Adm.', TECHNOLOGY: 'Tecnologia' };
  const ctxLabel: Record<string, string> = { GROSS_REVENUE: 'Receita Bruta', NET_REVENUE: 'Receita Líquida', SPECIFIC_SALE: 'Venda Específica', CLASS: 'Turma', PARTNER: 'Parceria' };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Taxas, impostos e deduções aplicados nos cálculos do DRE.</p>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Fechar' : 'Nova Taxa'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-indigo-200 p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome" className="px-3 py-2 bg-slate-50 border rounded-lg text-sm" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="px-3 py-2 bg-slate-50 border rounded-lg text-sm">
              {Object.entries(typeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} className="px-3 py-2 bg-slate-50 border rounded-lg text-sm" />
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Salvar Taxa</button>
        </form>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden overflow-x-auto">
        {isLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin inline" /></div> : (
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-5 py-4">Nome / Tipo</th>
                <th className="px-5 py-4 text-right">Valor</th>
                <th className="px-5 py-4">Aplicação</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map(r => {
                const isEd = editing?.id === r.id;
                return (
                  <tr key={r.id}>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-700">{r.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{typeLabel[r.type]}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold">{r.is_percentage ? `${r.amount}%` : `R$ ${r.amount.toFixed(2)}`}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{ctxLabel[r.application_context]}</td>
                    <td className="px-5 py-3.5 text-center"><button onClick={() => handleToggle(r)}>{r.active ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-300" />}</button></td>
                    <td className="px-5 py-3.5 text-center"><button onClick={() => handleDelete(r)} className="text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
