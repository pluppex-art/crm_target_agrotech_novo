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
  const lastSoundTime = useRef(0);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!user || !notificationPrefs.taskDue) return;

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
      let shouldPlaySound = false;

      tasks.forEach(task => {
        if (task.status !== 'pending' || task.responsavel_usuario_id !== user.id) return;
        if (!task.due_date) return;
        if (notified.has(task.id)) return;

        const isToday = task.due_date === todayStr;
        const isOverdue = task.due_date < todayStr;

        if (isToday && task.scheduled_time) {
          const [hours, minutes] = task.scheduled_time.split(':').map(Number);
          const taskMinutes = hours * 60 + minutes;

          if (currentMinutes >= taskMinutes - 5 && currentMinutes < taskMinutes) {
            triggerNotification(task, notified);
            shouldPlaySound = true;
            return;
          }
        }

        if (isOverdue || (isToday && !task.scheduled_time)) {
          triggerNotification(task, notified);
          shouldPlaySound = true;
        }
      });

      if (shouldPlaySound && notificationPrefs.enableSound) {
        const nowMs = Date.now();
        // Debounce sound to play at most once every 5 seconds
        if (nowMs - lastSoundTime.current > 5000) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'); // Notification chime
          audio.play().catch(e => console.log('Audio play failed:', e));
          lastSoundTime.current = nowMs;
        }
      }
    };

    const triggerNotification = async (task: any, notified: Set<string>) => {
      await notifyTaskReminder(task);
      notified.add(task.id);
      saveNotified(notified);
    };

    const interval = setInterval(checkReminders, 30000);
    checkReminders(); 

    return () => clearInterval(interval);
  }, [tasks, user, profiles, addNotification, notificationPrefs.taskDue, notificationPrefs.enableSound]);

  return null;
};
