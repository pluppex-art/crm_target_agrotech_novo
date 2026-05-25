import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTaskStore } from '../store/useTaskStore';
import { notifyTaskReminder } from '../services/leadNotificationService';

export const useTaskAlerts = () => {
  const { user } = useAuthStore();
  const { tasks } = useTaskStore();

  const checkTasks = useCallback(() => {
    if (!user || !tasks || tasks.length === 0) return;
    
    // Get current date string in YYYY-MM-DD local time
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localDate = new Date(today.getTime() - offset);
    const todayStr = localDate.toISOString().split('T')[0];

    tasks.forEach(task => {
      // Ignore if not assigned to this user or if completed
      if (task.responsavel_usuario_id !== user.id) return;
      if (task.status === 'completed') return;
      if (!task.due_date) return;
      
      // If due_date is today or in the past
      if (task.due_date <= todayStr) {
        // notifyTaskReminder has 24h deduplication logic to prevent spam
        // It returns silently if a notification was already sent today for this task.
        notifyTaskReminder(task).catch(err => {
          console.warn('Erro ao notificar lembrete de tarefa:', err);
        });
      }
    });
  }, [tasks, user]);

  useEffect(() => {
    // Run immediately if we have tasks loaded
    if (tasks.length > 0) {
      checkTasks();
    }
    // Re-check periodically (every 15 minutes)
    const interval = setInterval(checkTasks, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkTasks, tasks.length]);
};
