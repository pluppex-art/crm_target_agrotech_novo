import { useEffect, useState, useMemo } from 'react';
import { Plus, Loader2, Package, ShieldAlert, Search, LayoutGrid, List, Edit2 } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useProductStore } from '../store/useProductStore';
import { useTurmaStore } from '../store/useTurmaStore';
import { UnifiedTurmaProductForm } from '../components/forms/UnifiedTurmaProductForm';
import { Product } from '../services/productService';
import { ProductCard } from '../components/products/ProductCard';
import { PageFilters } from '../components/ui/PageFilters';
import { Filter, GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';
import { TURMA_STATUS_LABELS } from '../lib/turmas';

export function Products() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { products, loading, fetchProducts, subscribe } = useProductStore();
  const { turmas, fetchTurmas } = useTurmaStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTurmaStatus, setFilterTurmaStatus] = useState('ativo');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  useEffect(() => {
    fetchProducts();
    fetchTurmas();
  }, [fetchProducts, fetchTurmas]);

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
    if (!editingProduct) return undefined;
    return { id: editingProduct.id, name: editingProduct.name, category: editingProduct.category } as any;
  }, [editingProduct]);

  const getProductTurmaStatus = (product: Product) => {
    const productTurmas = turmas.filter(t =>
      t.product_id === product.id || t.product_name === product.name
    );
    if (productTurmas.length === 0) return null;
    const hasActive = productTurmas.some(t => t.status === 'agendada' || t.status === 'em_andamento');
    if (hasActive) return 'ativo';
    const hasConcluida = productTurmas.some(t => t.status === 'concluida');
    if (hasConcluida) return 'concluida';
    const hasCancelada = productTurmas.some(t => t.status === 'cancelada');
    if (hasCancelada) return 'cancelada';
    return null;
  };

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
      // 3. Turma status
      if (filterTurmaStatus !== 'all') {
        const productStatus = getProductTurmaStatus(p);
        if (filterTurmaStatus === 'ativo') {
          if (productStatus !== 'ativo') return false;
        } else if (filterTurmaStatus === 'concluida') {
          if (productStatus !== 'concluida') return false;
        } else if (filterTurmaStatus === 'cancelada') {
          if (productStatus !== 'cancelada') return false;
        }
      }
      return true;
    });
  }, [products, searchTerm, filterCategory, filterTurmaStatus, turmas]);

  if (permissionsLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 text-lg">Carregando permissões...</p>
      </div>
    );
  }

  if (!hasPermission('products.view')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[500px] text-center bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="w-24 h-24 bg-orange-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg border-4 border-orange-300">
          <ShieldAlert className="w-12 h-12 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Catálogo Privado</h2>
        <p className="text-slate-500 max-w-md mb-6 leading-relaxed">Você precisa da permissão <code className="bg-orange-100 px-2 py-1 rounded-lg text-sm font-mono text-orange-800 font-bold">products.view</code> para visualizar produtos.</p>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Solicite ao administrador</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Produtos & Serviços</h1>
          <p className="text-sm text-slate-500">Gerencie o catálogo de produtos da Target Agrotech.</p>
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
            }
          ]}
        />
        <div className="flex items-center justify-end">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('card')}
              className={cn('p-2 transition-colors', viewMode === 'card' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600')}
              title="Visualização em cards"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600')}
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
              turmaStatus={getProductTurmaStatus(product)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Preço</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Taxa Matrícula</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Meta Alunos</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, i) => (
                <tr key={product.id} className={cn('border-b border-slate-50 hover:bg-slate-50 transition-colors', i % 2 === 0 ? '' : 'bg-slate-50/40')}>
                  <td className="px-5 py-3 font-semibold text-slate-800">{product.name}</td>
                  <td className="px-5 py-3 text-slate-500">{product.category || '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-emerald-700">
                    R$ {Number(product.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right text-amber-600 font-semibold">
                    {(product as any).enrollment_fee > 0
                      ? `R$ ${Number((product as any).enrollment_fee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-700">
                    {(product as any).student_goal != null
                      ? (product as any).student_goal
                      : '—'}
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
        initialData={modalInitialData}
      />
    </div>
  );
}

