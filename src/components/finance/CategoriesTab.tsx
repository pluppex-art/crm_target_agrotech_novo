import { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Lock, Trash2, AlertCircle, Loader2, X, Save, Filter } from 'lucide-react';
import { categoryService } from '../../services/categoryService';
import { FinancialCategory } from '../../types/finance_v2';
import { cn } from '../../lib/utils';

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE';

const DRE_GROUPS: Record<string, string> = {
  RECEITA_BRUTA: 'Receita Bruta Operacional',
  DEDUCOES: 'Deduções da Receita',
  CSP: 'Custo dos Serviços Prestados',
  DESPESAS_OP: 'Despesas Operacionais',
  RESULTADO_FIN: 'Resultado Financeiro',
};

export function CategoriesTab() {
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'INCOME' as 'INCOME' | 'EXPENSE', dre_group: 'RECEITA_BRUTA' });

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try { setCategories(await categoryService.getAll()); }
    catch { setError('Erro ao carregar categorias.'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = categories.filter(c => filterType === 'ALL' || c.type === filterType);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await categoryService.create(formData);
      setFormData({ name: '', type: 'INCOME', dre_group: 'RECEITA_BRUTA' });
      setShowForm(false);
      await load();
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          {(['ALL', 'INCOME', 'EXPENSE'] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilterType(f)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all', filterType === f ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-500 hover:bg-slate-50')}>
              {f === 'ALL' ? 'Todas' : f === 'INCOME' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Fechar' : 'Nova Categoria'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Plus size={16} className="text-emerald-600" /> Nova Categoria Operacional</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
              <input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="Ex: Software SaaS" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
              <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value as 'INCOME' | 'EXPENSE' }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                <option value="INCOME">Entrada (Receita)</option>
                <option value="EXPENSE">Saída (Despesa)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Grupo DRE</label>
              <select value={formData.dre_group} onChange={e => setFormData(p => ({ ...p, dre_group: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                {Object.entries(DRE_GROUPS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48"><AlertCircle className="w-10 h-10 text-rose-400 mb-3" /><p className="text-rose-600">{error}</p></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48"><Tag className="w-14 h-14 text-slate-200 mb-3" /><p className="text-slate-500">Nenhuma categoria.</p></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-4 font-bold tracking-wider">Nome</th>
                <th className="px-5 py-4 font-bold tracking-wider">Tipo</th>
                <th className="px-5 py-4 font-bold tracking-wider">Grupo DRE</th>
                <th className="px-5 py-4 font-bold tracking-wider text-center">Sistema</th>
                <th className="px-5 py-4 font-bold tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(cat => (
                <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', cat.type === 'INCOME' ? 'bg-emerald-400' : 'bg-rose-400')} />
                      <span className="font-medium text-slate-800">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-bold', cat.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                      {cat.type === 'INCOME' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{DRE_GROUPS[cat.dre_group] || cat.dre_group}</td>
                  <td className="px-5 py-3.5 text-center">
                    {cat.is_system
                      ? <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold"><Lock size={11} /> Sistema</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button disabled={cat.is_system}
                      className={cn('p-1.5 rounded-lg transition-colors', cat.is_system ? 'text-slate-200 cursor-not-allowed' : 'text-rose-400 hover:bg-rose-50')}
                      title={cat.is_system ? 'Categorias do sistema são protegidas' : 'Excluir'}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
