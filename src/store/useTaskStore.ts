import { create } from 'zustand';
import { taskService, Task } from '../services/taskService';
import { getSupabaseClient } from '../lib/supabase';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  fetchTasksByLeadId: (leadId: string) => Promise<Task[]>;
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
  updateTaskStatus: (taskId: string, status: 'pending' | 'completed') => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  subscribe: () => () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await taskService.getAllTasks();
      set({ tasks, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch tasks', loading: false });
    }
  },

  fetchTasksByLeadId: async (leadId: string) => {
    try {
      return await taskService.getTasksByLeadId(leadId);
    } catch (error) {
      console.error('Error fetching tasks for lead:', error);
      return [];
    }
  },

  addTask: async (task) => {
    set({ loading: true, error: null });
    try {
      const newTask = await taskService.createTask(task);
      if (newTask) {
        set((state) => ({ tasks: [...state.tasks, newTask], loading: false }));
      } else {
        set({ error: 'Failed to create task', loading: false });
      }
    } catch (error) {
      set({ error: 'Failed to create task', loading: false });
    }
  },

  updateTaskStatus: async (taskId, status) => {
    try {
      const success = await taskService.updateTaskStatus(taskId, status);
      if (success) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
        }));
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  },

  deleteTask: async (taskId) => {
    try {
      const success = await taskService.deleteTask(taskId);
      if (success) {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        }));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  },

  subscribe: () => {
    const supabase = getSupabaseClient();

    const channelId = `realtime:tasks-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => {
          let updated = [...state.tasks];
          if (eventType === 'INSERT') {
            if (!updated.some(t => t.id === (newRecord as Task).id)) {
              updated = [...updated, newRecord as Task];
            }
          } else if (eventType === 'UPDATE') {
            updated = updated.map(t => t.id === (newRecord as Task).id ? { ...t, ...newRecord } : t);
          } else if (eventType === 'DELETE') {
            updated = updated.filter(t => t.id !== (oldRecord as any).id);
          }
          return { tasks: updated };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
