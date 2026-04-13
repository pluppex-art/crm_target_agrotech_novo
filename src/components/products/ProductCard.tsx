import { Package, Edit3, Trash2, MoreHorizontal, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useProductStore } from '../../store/useProductStore';
import { Product } from '../../services/productService';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
}

export function ProductCard({ product, onEdit }: ProductCardProps) {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { deleteProduct } = useProductStore();

  if (permissionsLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all animate-pulse">
        <div className="h-32 bg-slate-100" />
        <div className="p-5 space-y-3">
          <div className="h-4 bg-slate-100 rounded w-20" />
          <div className="h-6 bg-slate-100 rounded w-3/4" />
          <div className="h-8 bg-slate-100 rounded-full w-1/2" />
          <div className="h-4 bg-slate-100 rounded w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
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
            {hasPermission('products.edit') && (
              <button 
                onClick={() => onEdit(product)}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {hasPermission('products.delete') && (
              <button 
                onClick={() => {
                  deleteProduct(product.id);
                }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
