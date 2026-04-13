import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Activity, Calendar, Clock, User, Save, Loader2,
  Tag, AlignLeft, AlertCircle
} from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { useActivityCategoryStore } from '../../store/useActivityCategoryStore';
import { cn } from '../../lib/utils';

interface NewActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string;
  leadName?: string;
  onCreated?: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', active: 'text-blue-600 bg-blue-50 border-blue-400' },
  { value: 'medium', label: 'Média', active: 'text-amber-600 bg-amber-50 border-amber-400' },
  { value: 'high', label: 'Alta', active: 'text-red-600 bg-red-50 border-red-400' },
] as const;

export const NewActivityModal: React.FC<NewActivityModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  onCreated,
}) => {
  const { addTask } = useTaskStore();
  const { categories, fetchCategories } = useActivityCategoryStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    scheduled_time: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: '',
  });

  useEffect(() => {
    if (isOpen) fetchCategories();
  }, [isOpen, fetchCategories]);

  useEffect(() => {
    if (categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addTask({
        title: formData.title,
        description: formData.description || undefined,
        due_date: formData.due_date || undefined,
        scheduled_time: formData.scheduled_time || undefined,
        priority: formData.priority,
        category: formData.category || 'Geral',
        status: 'pending',
        lead_id: leadId,
        lead_name: leadName,
      });
      onCreated?.();
      onClose();
      setFormData({
        title: '',
        description: '',
        due_date: '',
        scheduled_time: '',
        priority: 'medium',
        category: categories[0]?.name || '',
      });
    } catch (error) {
      console.error('Error adding activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Activity size={18} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Nova Atividade</h2>
                {leadName && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <User size={11} />
                    {leadName}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
                placeholder="Ex: Ligar para confirmar visita..."
              />
            </div>

            {/* Category chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={12} />
                Categoria
              </label>
              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.name })}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                        formData.category === cat.name
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
                  <AlertCircle size={14} />
                  Nenhuma categoria. Adicione em Configurações → Categorias de Atividade.
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlignLeft size={12} />
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 min-h-[80px] resize-none"
                placeholder="Detalhes, observações..."
              />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} />
                  Data <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={12} />
                  Horário
                </label>
                <input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
                />
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridade</label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: opt.value })}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                      formData.priority === opt.value
                        ? opt.active + " shadow-sm"
                        : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-7 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Criar Atividade
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
