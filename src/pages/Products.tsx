import { useEffect, useState } from 'react';
import { Package, Plus, Edit3, Trash2, MoreHorizontal, Loader2 } from 'lucide-react';
import { useProductStore } from '../store/useProductStore';
import { UnifiedTurmaProductForm } from '../components/forms/UnifiedTurmaProductForm';
import { Product } from '../services/productService';

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
            <div key={product.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
              <div className="h-32 bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Package className="w-12 h-12 text-slate-200 group-hover:text-emerald-200 transition-colors" />
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[8px] font-bold uppercase">{product.category || 'Geral'}</span>
                  <button className="p-1 text-slate-300 hover:text-slate-600">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-slate-800 mb-1">{product.name}</h3>
                <p className="text-lg font-bold text-emerald-600 mb-4">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Estoque: {product.stock || 0}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(product)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        deleteProduct(product.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
        initialData={editingProduct}
        mode="product"
      />
    </div>
  );
}
