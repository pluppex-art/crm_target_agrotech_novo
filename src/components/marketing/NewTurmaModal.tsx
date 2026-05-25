import React, { useEffect, useState, useTransition } from 'react';
import { X, Calendar, Clock, MapPin, User, DollarSign, Save, Loader2 } from 'lucide-react';
import { useTurmaStore } from '../../store/useTurmaStore';
import { Turma } from '../../services/turmaService';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface NewTurmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  turma?: Turma | null;
}

export function NewTurmaModal({ isOpen, onClose, turma }: NewTurmaModalProps) {
  const [isPending, startTransition] = useTransition();
  const { addTurma, updateTurma, fetchTurmas } = useTurmaStore();

  const [formData, setFormData] = useState({
    name: '',
    professor_name: '',
    professor_email: '',
    date: '',
    time: '',
    location: '',
    price: '',
    enrollment_fee: '',
    student_goal: 20,
  });

  useEffect(() => {
    if (turma) {
      setFormData({
        name: turma.name,
        professor_name: turma.professor_name || '',
        professor_email: turma.professor_email || '',
        date: turma.date,
        time: turma.time || '',
        location: turma.location,
        price: turma.price != null ? String(turma.price) : '',
        enrollment_fee: turma.enrollment_fee != null ? String(turma.enrollment_fee) : '',
        student_goal: turma.student_goal || 20,
      });
    } else {
      setFormData({ name: '', professor_name: '', professor_email: '', date: '', time: '', location: '', price: '', enrollment_fee: '', student_goal: 20 });
    }
  }, [turma]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload: any = {
          name: formData.name,
          professor_name: formData.professor_name || null,
          professor_email: formData.professor_email || null,
          date: formData.date || null,
          time: formData.time || null,
          location: formData.location || null,
          price: formData.price ? parseFloat(formData.price) : null,
          enrollment_fee: formData.enrollment_fee ? parseFloat(formData.enrollment_fee) : null,
          student_goal: formData.student_goal,
        };
        if (turma) {
          await updateTurma(turma.id, payload);
        } else {
          await addTurma({ ...payload, status: 'agendada' as const, attendees: [] });
        }
        fetchTurmas();
        onClose();
      } catch (error) {
        console.error('Error saving turma:', error);
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200">
                  {turma ? 'Editar Turma' : 'Nova Turma'}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:bg-slate-800/50 rounded-2xl text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome da Turma *</label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                      placeholder="Ex: 🚁 Drone, Cuiabá-MT, 15/08/2026"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Professor</label>
                    <input
                      value={formData.professor_name}
                      onChange={(e) => setFormData({ ...formData, professor_name: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                      placeholder="Nome do Professor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email do Professor</label>
                    <input
                      type="email"
                      value={formData.professor_email}
                      onChange={(e) => setFormData({ ...formData, professor_email: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                      placeholder="professor@exemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Data
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Horário
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Localização
                    </label>
                    <input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                      placeholder="Sala 101 ou Online"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Preço (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Taxa de Matrícula
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.enrollment_fee}
                    onChange={(e) => setFormData({ ...formData, enrollment_fee: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" /> Capacidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.student_goal}
                    onChange={(e) => setFormData({ ...formData, student_goal: parseInt(e.target.value) || 20 })}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-2xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Save className="w-4 h-4" />
                  {turma ? 'Atualizar' : 'Criar'} Turma
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
