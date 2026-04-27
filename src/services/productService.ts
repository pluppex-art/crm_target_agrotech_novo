import { getSupabaseClient } from '../lib/supabase';

export interface Product {
  id: string;
  created_at: string;
  name: string;
  description?: string;
  price: number;
  enrollment_fee?: number;
  category?: string;
  stock: number;
  image_url?: string;
  student_goal?: number;
}


export const productService = {
  async getProducts(): Promise<Product[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    return data as Product[];
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return null;
    }

    return data as Product;
  },

  async updateProduct(productId: string, product: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('products')
      .update(product)
      .eq('id', productId);

    if (error) {
      console.error('Error updating product:', error);
      return false;
    }

    return true;
  },

  async deleteProduct(productId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Error deleting product:', error);
      return false;
    }

    return true;
  }
};
