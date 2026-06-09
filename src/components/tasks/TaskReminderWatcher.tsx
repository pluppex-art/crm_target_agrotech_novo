import React, { useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToastStore } from '../../store/useToastStore';

// DB notifications and emails are handled server-side by the Supabase Edge Function
// "task-reminders", which runs every minute via pg_cron — even when the app is closed.
// This component plays a sound alert and shows in-app toasts when the user has the app open.
export const TaskReminderWatcher: React.FC = () => {
  const { tasks } = useTaskStore();
  const { user } = useAuthStore();
  const { notificationPrefs, fetchSettings } = useSettingsStore();
  const lastSoundTime = useRef(0);

  // Tracks tasks that already had their sound played this session
  const soundedTasksRef = useRef<Set<string>>(new Set());
  // Tracks tasks that already had their toast shown this session
  const toastedTasksRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!user || !notificationPrefs.taskDue) return;

    const checkTasks = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toLocaleDateString('en-CA');

      const matchingTasks: typeof tasks = [];

      for (const task of tasks) {
        if (task.status !== 'pending' || task.responsavel_usuario_id !== user.id) continue;
        if (!task.due_date) continue;

        const isToday = task.due_date === todayStr;
        const isOverdue = task.due_date < todayStr;

        let matches = false;

        if (isToday && task.scheduled_time) {
          const [h, m] = task.scheduled_time.split(':').map(Number);
          const taskMinutes = h * 60 + m;
          // alert window: from 5 min before up to 30 min after
          if (currentMinutes >= taskMinutes - 5 && currentMinutes < taskMinutes + 30) {
            matches = true;
          }
        } else if (isOverdue || (isToday && !task.scheduled_time)) {
          matches = true;
        }

        if (matches) matchingTasks.push(task);
      }

      // On first load: show toast for due/overdue tasks but skip sound
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        for (const task of matchingTasks) {
          toastedTasksRef.current.add(task.id);
          soundedTasksRef.current.add(task.id);
          const isOverdue = task.due_date! < todayStr;
          useToastStore.getState().show({
            title: isOverdue ? `Tarefa atrasada: ${task.title}` : `Tarefa para hoje: ${task.title}`,
            message: task.lead_name
              ? `Lead: ${task.lead_name}${task.scheduled_time ? ` · ${task.scheduled_time}` : ''}`
              : task.scheduled_time ? `Horário: ${task.scheduled_time}` : 'Sem horário definido',
            type: isOverdue ? 'urgent' : 'warning',
            link: `/tasks?id=${task.id}`,
            duration: 10000,
          });
        }
        return;
      }

      for (const task of matchingTasks) {
        // Show toast for tasks not yet toasted
        if (!toastedTasksRef.current.has(task.id)) {
          toastedTasksRef.current.add(task.id);
          useToastStore.getState().show({
            title: `Tarefa: ${task.title}`,
            message: task.lead_name ? `Lead: ${task.lead_name}` : 'Tarefa pendente',
            type: 'urgent',
            link: `/tasks?id=${task.id}`,
            duration: 10000,
          });
        }

        // Play sound for tasks not yet sounded (respects sound preference)
        if (notificationPrefs.enableSound && !soundedTasksRef.current.has(task.id)) {
          soundedTasksRef.current.add(task.id);
          const nowMs = Date.now();
          if (nowMs - lastSoundTime.current > 5000) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.play().catch(() => {});
            lastSoundTime.current = nowMs;
          }
        }
      }
    };

    const interval = setInterval(checkTasks, 30000);
    checkTasks();
    return () => clearInterval(interval);
  }, [tasks, user, notificationPrefs.taskDue, notificationPrefs.enableSound]);

  return null;
};
