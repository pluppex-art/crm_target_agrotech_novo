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
  responsavel_usuario_id?: string | null;
  responsible?: string | null;  // derivado do JOIN com perfis (não é coluna do DB)
}

function mapTaskRow(row: any): Task {
  return {
    ...row,
    responsible: (row.perfis as { name?: string } | null)?.name ?? null,
    lead_name: (row.leads as { name?: string } | null)?.name ?? null,
    perfis: undefined,
    leads: undefined,
  };
}

export const taskService = {
  async getTasksByLeadId(leadId: string): Promise<Task[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('tasks')
      .select('*, perfis!tasks_responsavel_usuario_id_fkey(name), leads(name)')
      .eq('lead_id', leadId)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

    return (data as any[]).map(mapTaskRow);
  },

  async getAllTasks(): Promise<Task[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('tasks')
      .select('*, perfis!tasks_responsavel_usuario_id_fkey(name), leads(name)')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching all tasks:', error);
      return [];
    }

    return (data as any[]).map(mapTaskRow);
  },

  async createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Strip virtual/non-DB fields before inserting
    const { responsible, lead_name, ...dbPayload } = task as any;

    const { data, error } = await supabase
      .from('tasks')
      .insert([dbPayload])
      .select('*, perfis!tasks_responsavel_usuario_id_fkey(name), leads(name)')
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return null;
    }

    return mapTaskRow(data as any);
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

  async updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { responsible, lead_name, ...dbUpdates } = updates as any;

    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', error);
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
