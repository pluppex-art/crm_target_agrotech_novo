import { useEffect, useState, useMemo } from 'react';
import { Plus, Loader2, Package, ShieldAlert, LayoutGrid, List, Edit2, Calendar } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useProductStore } from '../store/useProductStore';
import { UnifiedTurmaProductForm } from '../components/forms/UnifiedTurmaProductForm';
import { Product } from '../services/productService';
import { ProductCard } from '../components/products/ProductCard';
import { PageFilters } from '../components/ui/PageFilters';
import { Filter, GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';

// Products and turmas share the same `turmas` table in the database.
// All product-level calculations use the product's own fields directly.
const getProductStatus = (product: Product): 'ativo' | 'concluida' | 'cancelada' | null => {
  if (product.status === 'agendada' || product.status === 'em_andamento') return 'ativo';
  if (product.status === 'concluida') return 'concluida';
  if (product.status === 'cancelada') return 'cancelada';
  return null;
};

export function Products() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { products, loading, fetchProducts, subscribe } = useProductStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTurmaStatus, setFilterTurmaStatus] = useState('ativo');
  const [filterMonth, setFilterMonth] = useState('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [subscribe]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const modalInitialData = useMemo(() => {
    return editingProduct ?? undefined;
  }, [editingProduct]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    products.forEach(p => {
      if ((p as any).date) months.add((p as any).date.slice(0, 7));
    });
    return Array.from(months).sort();
  }, [products]);

  const turmasInFilteredMonth = useMemo(() => {
    if (filterMonth === 'all') return null;
    return products.filter(p => (p as any).date?.startsWith(filterMonth)).length;
  }, [filterMonth, products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Search text
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.category || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      // 2. Category selection
      if (filterCategory !== 'all' && p.category !== filterCategory) {
        return false;
      }
      // 3. Status filter — product IS the turma, use its own status directly
      if (filterTurmaStatus !== 'all') {
        const s = getProductStatus(p);
        if (s !== filterTurmaStatus) return false;
      }
      // 4. Month filter — check product's own date
      if (filterMonth !== 'all') {
        if (!(p as any).date?.startsWith(filterMonth)) return false;
      }
      return true;
    });
  }, [products, searchTerm, filterCategory, filterTurmaStatus, filterMonth]);

  if (permissionsLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 text-lg">Carregando permissões...</p>
      </div>
    );
  }

  if (!hasPermission('products.view')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[500px] text-center bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="w-24 h-24 bg-orange-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg border-4 border-orange-300">
          <ShieldAlert className="w-12 h-12 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">Catálogo Privado</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">Você precisa da permissão <code className="bg-orange-100 px-2 py-1 rounded-lg text-sm font-mono text-orange-800 font-bold">products.view</code> para visualizar produtos.</p>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Solicite ao administrador</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Produtos & Serviços</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie o catálogo de produtos da Target Agrotech.</p>
        </div>
        {hasPermission('products.create') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-6">
        <PageFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nome ou categoria..."
          onClearAll={() => {
            setSearchTerm('');
            setFilterCategory('all');
            setFilterTurmaStatus('ativo');
            setFilterMonth('all');
          }}
          filters={[
            {
              id: 'category',
              type: 'select',
              icon: Filter,
              placeholder: 'Todas as Categorias',
              value: filterCategory,
              onChange: setFilterCategory,
              activeColorClass: 'bg-indigo-50 text-indigo-700 border-indigo-100',
              options: Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c))).map(c => ({ value: c, label: c }))
            },
            {
              id: 'turmaStatus',
              type: 'select',
              icon: GraduationCap,
              placeholder: 'Status da Turma',
              value: filterTurmaStatus,
              onChange: setFilterTurmaStatus,
              activeColorClass: 'bg-purple-50 text-purple-700 border-purple-100',
              options: [
                { value: 'ativo', label: 'Ativo' },
                { value: 'concluida', label: 'Concluída' },
                { value: 'cancelada', label: 'Cancelada' },
                { value: 'all', label: 'Todos' },
              ]
            },
            {
              id: 'month',
              type: 'select',
              icon: Calendar,
              placeholder: 'Todos os Meses',
              value: filterMonth,
              onChange: setFilterMonth,
              activeColorClass: 'bg-sky-50 text-sky-700 border-sky-100',
              options: availableMonths.map(m => {
                const [year, month] = m.split('-');
                const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                return { value: m, label: label.charAt(0).toUpperCase() + label.slice(1) };
              })
            }
          ]}
        />
        <div className="flex items-center justify-between mt-2">
          {turmasInFilteredMonth !== null ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-xl">
              <Calendar size={13} className="text-sky-500" />
              {turmasInFilteredMonth} turma{turmasInFilteredMonth !== 1 ? 's' : ''} neste mês
            </span>
          ) : <span />}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('card')}
              className={cn('p-2 transition-colors', viewMode === 'card' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600 dark:text-slate-400')}
              title="Visualização em cards"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600 dark:text-slate-400')}
              title="Visualização em lista"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>{searchTerm ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
              turmaStatus={getProductStatus(product)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categoria</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preço</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Taxa Matrícula</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meta Alunos</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data da Turma</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, i) => (
                <tr key={product.id} className={cn('border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-800 transition-colors', i % 2 === 0 ? '' : 'bg-slate-50 dark:bg-slate-800/40')}>
                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{product.name}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{product.category || '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-emerald-700">
                    R$ {Number(product.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right text-amber-600 font-semibold">
                    {(product as any).enrollment_fee > 0
                      ? `R$ ${Number((product as any).enrollment_fee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                    {(product as any).student_goal != null
                      ? (product as any).student_goal
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    {(product as any).date ? (
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                        <Calendar size={12} className="text-emerald-500" />
                        {new Date(((product as any).date as string).replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UnifiedTurmaProductForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode="unified"
        initialData={modalInitialData as any}
      />
    </div>
  );
}

