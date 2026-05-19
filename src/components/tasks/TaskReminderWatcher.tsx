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
  
  // Track task IDs that have already been alerted or were already present on load
  const alertedTasksRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

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
      const currentMatchingTaskIds: string[] = [];

      for (const task of tasks) {
        if (task.status !== 'pending' || task.responsavel_usuario_id !== user.id) continue;
        if (!task.due_date) continue;

        const isToday = task.due_date === todayStr;
        const isOverdue = task.due_date < todayStr;

        let taskAlerts = false;

        if (isToday && task.scheduled_time) {
          const [h, m] = task.scheduled_time.split(':').map(Number);
          const taskMinutes = h * 60 + m;
          if (currentMinutes >= taskMinutes - 5 && currentMinutes < taskMinutes) {
            taskAlerts = true;
          }
        } else if (isOverdue || (isToday && !task.scheduled_time)) {
          taskAlerts = true;
        }

        if (taskAlerts) {
          currentMatchingTaskIds.push(task.id);
        }
      }

      // On first load, we register all pre-existing active reminders to avoid sound pollution
      if (isFirstLoadRef.current) {
        currentMatchingTaskIds.forEach(id => alertedTasksRef.current.add(id));
        isFirstLoadRef.current = false;
        return;
      }

      // Check if any matching task has not been alerted yet
      for (const id of currentMatchingTaskIds) {
        if (!alertedTasksRef.current.has(id)) {
          shouldPlay = true;
          alertedTasksRef.current.add(id);
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
