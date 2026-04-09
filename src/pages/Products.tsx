import { useEffect, useState } from 'react';
import { Plus, Loader2, Package } from 'lucide-react';
import { useProductStore } from '../store/useProductStore';
import { NewProductModal } from '../components/products/NewProductModal';
import { Product } from '../services/productService';
import { ProductCard } from '../components/products/ProductCard';

export function Products() {
  const { products, loading, fetchProducts, deleteProduct } = useProductStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Produtos & Serviços</h1>
          <p className="text-sm text-slate-500">Gerencie o catálogo de produtos da Target Agrotech.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
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

      <NewProductModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        product={editingProduct}
      />
    </div>
  );
}
