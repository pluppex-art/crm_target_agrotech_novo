import React, { useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Bell } from 'lucide-react';
import { notifyTaskReminder } from '../../services/leadNotificationService';

export const TaskReminderWatcher: React.FC = () => {
  const { tasks } = useTaskStore();
  const { user } = useAuthStore();
  const { profiles } = useProfileStore();
  const { addNotification } = useNotificationStore();
  const { notificationPrefs, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!user || !notificationPrefs.taskDue) return;

    // Use localStorage to keep track of notified tasks across refreshes
    const getStorageKey = () => `crm_notified_tasks_${user.id}_${new Date().toLocaleDateString('en-CA')}`;
    const getNotified = () => {
      try { return new Set<string>(JSON.parse(localStorage.getItem(getStorageKey()) || '[]')); }
      catch { return new Set<string>(); }
    };
    const saveNotified = (ids: Set<string>) => {
      localStorage.setItem(getStorageKey(), JSON.stringify(Array.from(ids)));
    };

    const checkReminders = () => {
      const notified = getNotified();
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toLocaleDateString('en-CA'); 

      tasks.forEach(task => {
        // Only pending tasks for the current user
        if (task.status !== 'pending' || task.responsavel_usuario_id !== user.id) return;
        if (!task.due_date) return;
        if (notified.has(task.id)) return;

        const isToday = task.due_date === todayStr;
        const isOverdue = task.due_date < todayStr;

        // 1. Time-specific reminder (Today only)
        if (isToday && task.scheduled_time) {
          const [hours, minutes] = task.scheduled_time.split(':').map(Number);
          const taskMinutes = hours * 60 + minutes;

          if (currentMinutes >= taskMinutes && currentMinutes < taskMinutes + 5) {
            triggerNotification(task, `⏰ Lembrete: ${task.title}`, 'Você tem uma atividade agendada para agora.', notified);
            return;
          }
        }

        // 2. Overdue or Daily alert (once per session/day)
        if (isOverdue || (isToday && !task.scheduled_time)) {
          const alertTitle = isOverdue ? `⚠️ Tarefa Atrasada: ${task.title}` : `📅 Tarefa para Hoje: ${task.title}`;
          const alertMsg = isOverdue ? 'Esta atividade já passou do prazo.' : 'Esta atividade vence hoje.';
          
          triggerNotification(task, alertTitle, alertMsg, notified);
        }
      });
    };

    const triggerNotification = async (task: any, title: string, message: string, notified: Set<string>) => {
      await notifyTaskReminder(task);
      notified.add(task.id);
      saveNotified(notified);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
    };

    const interval = setInterval(checkReminders, 30000);
    checkReminders(); 

    return () => clearInterval(interval);
  }, [tasks, user, profiles, addNotification, notificationPrefs.taskDue]);

  return null; // This component doesn't render anything visible
};
