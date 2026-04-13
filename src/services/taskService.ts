import { getSupabaseClient } from '../lib/supabase';

export interface Task {
  id: string;
  created_at: string;
  title: string;
  description?: string;
  due_date?: string;
  scheduled_time?: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  lead_id?: string;
  lead_name?: string;
}

export const taskService = {
  async getTasksByLeadId(leadId: string): Promise<Task[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('lead_id', leadId)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

    return data as Task[];
  },

  async getAllTasks(): Promise<Task[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching all tasks:', error);
      return [];
    }

    return data as Task[];
  },

  async createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return null;
    }

    return data as Task;
  },

  async updateTaskStatus(taskId: string, status: 'pending' | 'completed'): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task status:', error);
      return false;
    }

    return true;
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }

    return true;
  }
};
