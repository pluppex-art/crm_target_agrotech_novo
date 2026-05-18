import React, { useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';

// DB notifications and emails are handled server-side by the Supabase Edge Function
// "task-reminders", which runs every minute via pg_cron — even when the app is closed.
// This component only plays a sound alert when the user has the app open.
export const TaskReminderWatcher: React.FC = () => {
  const { tasks } = useTaskStore();
  const { user } = useAuthStore();
  const { notificationPrefs, fetchSettings } = useSettingsStore();
  const lastSoundTime = useRef(0);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!user || !notificationPrefs.taskDue || !notificationPrefs.enableSound) return;

    const checkAndPlaySound = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toLocaleDateString('en-CA');
      let shouldPlay = false;

      for (const task of tasks) {
        if (task.status !== 'pending' || task.responsavel_usuario_id !== user.id) continue;
        if (!task.due_date) continue;

        const isToday = task.due_date === todayStr;
        const isOverdue = task.due_date < todayStr;

        if (isToday && task.scheduled_time) {
          const [h, m] = task.scheduled_time.split(':').map(Number);
          const taskMinutes = h * 60 + m;
          if (currentMinutes >= taskMinutes - 5 && currentMinutes < taskMinutes) {
            shouldPlay = true;
            break;
          }
        } else if (isOverdue || (isToday && !task.scheduled_time)) {
          shouldPlay = true;
          break;
        }
      }

      if (shouldPlay) {
        const nowMs = Date.now();
        if (nowMs - lastSoundTime.current > 5000) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
          audio.play().catch(() => {});
          lastSoundTime.current = nowMs;
        }
      }
    };

    const interval = setInterval(checkAndPlaySound, 30000);
    checkAndPlaySound();
    return () => clearInterval(interval);
  }, [tasks, user, notificationPrefs.taskDue, notificationPrefs.enableSound]);

  return null;
};
