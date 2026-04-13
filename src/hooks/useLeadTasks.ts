import { useState, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { resetLeadAlerts } from '../services/alertService';

interface UseLeadTasksProps {
  leadId: string;
}

export const useLeadTasks = ({ leadId }: UseLeadTasksProps) => {
  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const { fetchTasksByLeadId, updateTaskStatus } = useTaskStore();

  useEffect(() => {
    if (leadId) {
      loadTasks();
    }
  }, [leadId]);

  const loadTasks = async () => {
    setLoadingTasks(true);
    const fetchedTasks = await fetchTasksByLeadId(leadId);
    setLeadTasks(fetchedTasks);
    setLoadingTasks(false);
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    await updateTaskStatus(taskId, newStatus);
    resetLeadAlerts(leadId);
    loadTasks();
  };

  return {
    leadTasks,
    loadingTasks,
    loadTasks,
    handleToggleTask,
  };
};
