import { useEffect, useState, useMemo } from 'react';
import { Plus, Loader2, Package, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useProductStore } from '../store/useProductStore';
import { UnifiedTurmaProductForm } from '../components/forms/UnifiedTurmaProductForm';
import { Product } from '../services/productService';
import { ProductCard } from '../components/products/ProductCard';

export function Products() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { products, loading, fetchProducts, deleteProduct, subscribe } = useProductStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
    if (!editingProduct) return undefined;
    return {
      id: editingProduct.id,
      name: editingProduct.name,
      category: editingProduct.category
    } as any;
  }, [editingProduct]);

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
      <div className="flex items-center justify-between mb-8">
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

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onEdit={handleEdit} />
          ))}
          {products.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum produto cadastrado.</p>
            </div>
          )}
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

