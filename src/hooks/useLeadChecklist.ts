import { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    if (!leadId || !stageId) {
      setItems([]);
      return;
    }
    setLoading(true);
    Promise.all([
      checklistService.getChecklistsForStage(stageId),
      checklistService.getCompletionsForLead(leadId),
    ]).then(([checklistItems, completedIds]) => {
      const completedSet = new Set(completedIds);
      setItems(checklistItems.map(item => ({ ...item, completed: completedSet.has(item.id) })));
      setLoading(false);
    });
  }, [leadId, stageId]);

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

  const derived = useMemo(() => {
    const requiredItems = items.filter(i => i.required);
    const requiredCompleted = requiredItems.filter(i => i.completed).length;
    return {
      totalCount: items.length,
      completedCount: items.filter(i => i.completed).length,
      requiredTotal: requiredItems.length,
      requiredCompleted,
      allRequiredCompleted: requiredItems.length === 0 || requiredCompleted === requiredItems.length,
    };
  }, [items]);

  return { items, loading, toggle, ...derived };
};
