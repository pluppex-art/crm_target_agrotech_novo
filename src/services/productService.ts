import { getSupabaseClient } from '../lib/supabase';

// Products now live in the turmas table (merged in migration 003)
export interface Product {
  id: string;
  created_at: string;
  name: string;
  description?: string;
  price: number;
  enrollment_fee?: number;
  category?: string;
  image_url?: string;
  student_goal?: number;
}

export const productService = {
  async getProducts(): Promise<Product[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('turmas')
      .select('id, created_at, name, description, price, enrollment_fee, category, image_url, student_goal')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      name: row.name,
      description: row.description ?? undefined,
      price: row.price ?? 0,
      enrollment_fee: row.enrollment_fee ?? undefined,
      category: row.category ?? undefined,
      image_url: row.image_url ?? undefined,
      student_goal: row.student_goal ?? undefined,
    })) as Product[];
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { name, description, price, enrollment_fee, category, image_url, student_goal } = product;
    const { data, error } = await supabase
      .from('turmas')
      .insert([{ name, description, price, enrollment_fee, category, image_url, student_goal, status: 'agendada' }])
      .select('id, created_at, name, description, price, enrollment_fee, category, image_url, student_goal')
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

    const { name, description, price, enrollment_fee, category, image_url, student_goal } = product;
    const payload: any = {};
    if (name !== undefined) payload.name = name;
    if (description !== undefined) payload.description = description;
    if (price !== undefined) payload.price = price;
    if (enrollment_fee !== undefined) payload.enrollment_fee = enrollment_fee;
    if (category !== undefined) payload.category = category;
    if (image_url !== undefined) payload.image_url = image_url;
    if (student_goal !== undefined) payload.student_goal = student_goal;

    const { error } = await supabase
      .from('turmas')
      .update(payload)
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
      .from('turmas')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Error deleting product:', error);
      return false;
    }

    return true;
  }
};
