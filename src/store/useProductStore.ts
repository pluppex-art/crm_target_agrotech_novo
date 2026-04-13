import { create } from 'zustand';
import { productService, Product } from '../services/productService';
import { getSupabaseClient } from '../lib/supabase';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<Product | null>;
  updateProduct: (productId: string, product: Partial<Omit<Product, 'id' | 'created_at'>>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  subscribe: () => () => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const products = await productService.getProducts();
      set({ products, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch products', loading: false });
    }
  },

  addProduct: async (product) => {
    set({ loading: true, error: null });
    try {
      const newProduct = await productService.createProduct(product);
      if (newProduct) {
        set((state) => ({ products: [...state.products, newProduct], loading: false }));
        return newProduct;
      } else {
        set({ error: 'Failed to create product', loading: false });
        return null;
      }
    } catch (error) {
      set({ error: 'Failed to create product', loading: false });
      return null;
    }
  },

  updateProduct: async (productId, product) => {
    try {
      const success = await productService.updateProduct(productId, product);
      if (success) {
        set((state) => ({
          products: state.products.map((p) => (p.id === productId ? { ...p, ...product } : p)),
        }));
      }
    } catch (error) {
      console.error('Error updating product:', error);
    }
  },

  deleteProduct: async (productId) => {
    try {
      const success = await productService.deleteProduct(productId);
      if (success) {
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
        }));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  },

  subscribe: () => {
    const supabase = getSupabaseClient();

    const channelId = `realtime:products-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => {
          let updated = [...state.products];
          if (eventType === 'INSERT') {
            if (!updated.some(p => p.id === (newRecord as Product).id)) {
              updated = [...updated, newRecord as Product];
            }
          } else if (eventType === 'UPDATE') {
            updated = updated.map(p => p.id === (newRecord as Product).id ? { ...p, ...newRecord } : p);
          } else if (eventType === 'DELETE') {
            updated = updated.filter(p => p.id !== (oldRecord as any).id);
          }
          return { products: updated };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
