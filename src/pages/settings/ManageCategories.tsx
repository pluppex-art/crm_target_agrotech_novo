import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCategoryStore } from '../../store/useCategoryStore';

export function ManageCategories() {
  const navigate = useNavigate();
  const { categories, fetchCategories, addCategory, deleteCategory, loading, subscribe } = useCategoryStore();
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [subscribe]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await addCategory(newCategory.trim());
    setNewCategory('');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button 
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 text-sm font-medium"
      >
        <ArrowLeft size={16} />
        Voltar para Configurações
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
              <Tag size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Categorias de Produto</h1>
              <p className="text-sm text-slate-500">Gerencie as categorias disponíveis para seus produtos.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreate} className="p-6 border-b border-slate-100">
          <div className="flex gap-3">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nome da nova categoria..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!newCategory.trim()}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={18} />
              Adicionar
            </button>
          </div>
        </form>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin text-emerald-600" />
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Tag className="mx-auto mb-3 opacity-20" size={40} />
              <p>Nenhuma categoria cadastrada.</p>
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <span className="font-medium text-slate-700">{cat.name}</span>
                <button
                  onClick={() => {
                    if (confirm(`Excluir a categoria "${cat.name}"?`)) {
                      deleteCategory(cat.id);
                    }
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-xs text-blue-700 leading-relaxed font-medium">
          <strong>💡 Dica:</strong> Produtos marcados com a categoria literal <strong>"Serviço"</strong> não gerarão o convite para criação de turmas ao serem finalizados como "Ganho" no pipeline.
        </p>
      </div>
    </div>
  );
}
