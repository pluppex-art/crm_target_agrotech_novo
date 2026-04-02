import { create } from 'zustand';
import { taskService, Task } from '../services/taskService';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  fetchTasksByLeadId: (leadId: string) => Promise<Task[]>;
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
  updateTaskStatus: (taskId: string, status: 'pending' | 'completed') => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
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
}));
