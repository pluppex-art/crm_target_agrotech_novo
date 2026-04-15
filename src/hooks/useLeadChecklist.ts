import { useState, useEffect, useCallback } from 'react';
import { checklistService, type ChecklistItem } from '../services/checklistService';

export interface ChecklistItemWithState extends ChecklistItem {
  completed: boolean;
}

interface UseLeadChecklistProps {
  leadId: string;
  stageId: string;
}

export const useLeadChecklist = ({ leadId, stageId }: UseLeadChecklistProps) => {
  const [items, setItems] = useState<ChecklistItemWithState[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!leadId || !stageId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const [checklistItems, completedIds] = await Promise.all([
      checklistService.getChecklistsForStage(stageId),
      checklistService.getCompletionsForLead(leadId, stageId),
    ]);
    const completedSet = new Set(completedIds);
    setItems(checklistItems.map(item => ({ ...item, completed: completedSet.has(item.id) })));
    setLoading(false);
  }, [leadId, stageId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Optimistic update
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i));

    const success = await checklistService.toggleCompletion(leadId, itemId, item.completed);
    if (!success) {
      // Rollback on failure
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, completed: item.completed } : i));
    }
  };

  const requiredItems = items.filter(i => i.required);
  const completedRequired = requiredItems.filter(i => i.completed).length;
  const allRequiredCompleted = requiredItems.length === 0 || completedRequired === requiredItems.length;

  return {
    items,
    loading,
    toggle,
    allRequiredCompleted,
    completedCount: items.filter(i => i.completed).length,
    totalCount: items.length,
    requiredTotal: requiredItems.length,
    requiredCompleted: completedRequired,
  };
};
