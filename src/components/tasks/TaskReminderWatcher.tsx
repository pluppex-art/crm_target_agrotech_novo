import React, { useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Bell } from 'lucide-react';

export const TaskReminderWatcher: React.FC = () => {
  const { tasks } = useTaskStore();
  const { user } = useAuthStore();
  const { profiles } = useProfileStore();
  const { addNotification } = useNotificationStore();
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const currentUserProfile = profiles.find(p => p.id === user.id);
    if (!currentUserProfile) return;

    const checkReminders = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toLocaleDateString('en-CA'); // en-CA format is YYYY-MM-DD local

      tasks.forEach(task => {
        // Only pending tasks for the current user
        if (task.status !== 'pending' || task.responsible !== currentUserProfile.name) return;
        if (!task.due_date || !task.scheduled_time) return;
        if (notifiedIds.current.has(task.id)) return;

        // Check if date is today
        if (task.due_date === todayStr) {
          const [hours, minutes] = task.scheduled_time.split(':').map(Number);
          const taskMinutes = hours * 60 + minutes;

          // If current time matches or is slightly after (max 5 min)
          if (currentMinutes >= taskMinutes && currentMinutes < taskMinutes + 5) {
            // Trigger notification
            addNotification({
              title: `⏰ Lembrete: ${task.title}`,
              message: task.description || 'Você tem uma tarefa agendada para agora.',
              type: 'pending',
              category: 'alerts',
              link: '/tasks'
            });

            // Mark as notified to avoid double alerts
            notifiedIds.current.add(task.id);

            // Play notification sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));
          }
        }
      });
    };

    // Check every 30 seconds
    const interval = setInterval(checkReminders, 30000);
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [tasks, user, profiles, addNotification]);

  return null; // This component doesn't render anything visible
};
