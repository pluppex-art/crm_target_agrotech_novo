import { create } from 'zustand';
import { productService, Product } from '../services/productService';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<void>;
  updateProduct: (productId: string, product: Partial<Omit<Product, 'id' | 'created_at'>>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
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
      } else {
        set({ error: 'Failed to create product', loading: false });
      }
    } catch (error) {
      set({ error: 'Failed to create product', loading: false });
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
}));
