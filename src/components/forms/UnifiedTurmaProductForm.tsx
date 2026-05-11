import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, Loader2, GraduationCap, DollarSign, Calendar, Clock, MapPin, User, Package, Tag, Users,
} from 'lucide-react';
import { useTurmaStore } from '../../store/useTurmaStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { Turma } from '../../services/turmaService';

interface UnifiedFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Turma>;
  mode: 'turma' | 'product' | 'unified';
}

const blankForm = {
  name: '',
  price: '',
  enrollment_fee: '',
  student_goal: '',
  description: '',
  category: 'Cursos',
  professor_name: '',
  professor_email: '',
  date: '',
  time: '',
  location: '',
  instructor_cost: '',
};

export const UnifiedTurmaProductForm: React.FC<UnifiedFormProps> = ({
  isOpen,
  onClose,
  initialData,
  mode,
}) => {
  const { addTurma, updateTurma } = useTurmaStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(blankForm);

  useEffect(() => {
    if (isOpen) fetchCategories();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        price: initialData.price != null ? String(initialData.price) : '',
        enrollment_fee: initialData.enrollment_fee != null ? String(initialData.enrollment_fee) : '',
        student_goal: initialData.student_goal != null ? String(initialData.student_goal) : (initialData.meta != null ? String(initialData.meta) : ''),
        description: initialData.description || '',
        category: initialData.category || 'Cursos',
        professor_name: initialData.professor_name || '',
        professor_email: initialData.professor_email || '',
        date: initialData.date || '',
        time: initialData.time || '',
        location: initialData.location || '',
        instructor_cost: (initialData as any).instructor_cost != null ? String((initialData as any).instructor_cost) : '',
      });
    } else {
      setFormData(blankForm);
    }
  }, [isOpen, initialData?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        name: formData.name,
        price: parseFloat(formData.price) || 0,
        enrollment_fee: formData.enrollment_fee ? parseFloat(formData.enrollment_fee) : null,
        student_goal: formData.student_goal ? parseInt(formData.student_goal) : null,
        description: formData.description || null,
        category: formData.category || null,
        professor_name: formData.professor_name || null,
        professor_email: formData.professor_email || null,
        date: formData.date || null,
        time: formData.time || null,
        location: formData.location || null,
        instructor_cost: formData.instructor_cost ? parseFloat(formData.instructor_cost) : 0,
      };

      if (initialData?.id) {
        await updateTurma(initialData.id, payload);
      } else {
        await addTurma({ ...payload, status: 'agendada', attendees: [] });
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving:', error);
      alert('Erro ao salvar: ' + (error.message || 'Verifique o console.'));
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (val: string) => {
    const updates: any = { name: val };
    const parts = val.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      if (!formData.location && parts[1].includes('-')) updates.location = parts[1];
      const datePart = parts.find(p => /^\d{2}\/\d{2}\/\d{4}$/.test(p));
      if (datePart && !formData.date) {
        const [d, m, y] = datePart.split('/');
        updates.date = `${y}-${m}-${d}`;
      }
    }
    setFormData({ ...formData, ...updates });
  };

  const field = (label: string, key: keyof typeof formData, opts?: {
    type?: string; placeholder?: string; icon?: React.ReactNode; required?: boolean;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={opts?.type ?? 'text'}
          required={opts?.required}
          value={formData[key]}
          onChange={(e) => {
            const val = e.target.value;
            if (key === 'name') handleNameChange(val);
            else setFormData({ ...formData, [key]: val });
          }}
          placeholder={opts?.placeholder}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
        />
        {opts?.icon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {opts.icon}
          </span>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <GraduationCap size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                {initialData?.id ? 'Editar' : 'Nova'} Turma / Produto
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form id="unified-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                <Package size={14} />
                Dados Gerais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field('Nome', 'name', { required: true, placeholder: 'Ex: 🚁 Drone, Cuiabá-MT, 15/08/2026', icon: <Package size={16} /> })}
                {field('Preço (R$)', 'price', { type: 'number', required: true, placeholder: '0.00', icon: <DollarSign size={16} /> })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field('Taxa de Matrícula (R$)', 'enrollment_fee', { type: 'number', placeholder: '0.00', icon: <DollarSign size={16} /> })}
                {field('Meta de Alunos', 'student_goal', { type: 'number', placeholder: 'Ex: 20', icon: <Users size={16} /> })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Categoria</label>
                  <div className="relative">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm appearance-none"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <Tag size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm min-h-[72px]"
                  placeholder="Detalhes sobre o produto..."
                />
              </div>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                <GraduationCap size={14} />
                Informações da Turma
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field('Instrutor/Professor', 'professor_name', { placeholder: 'Nome do responsável', icon: <User size={16} /> })}
                {field('Local/Link', 'location', { placeholder: 'Ex: Sala 01 ou Google Meet', icon: <MapPin size={16} /> })}
                {field('Data de Início', 'date', { type: 'date', icon: <Calendar size={16} /> })}
                {field('Horário', 'time', { type: 'time', icon: <Clock size={16} /> })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field('Custo do Instrutor (R$)', 'instructor_cost', { type: 'number', placeholder: '0.00', icon: <DollarSign size={16} /> })}
              </div>
              {formData.instructor_cost && parseFloat(formData.instructor_cost) > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Ao concluir a turma, R$ {parseFloat(formData.instructor_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} será lançado como despesa CSP no financeiro.
                </p>
              )}
            </motion.div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-50 shrink-0">
              <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {initialData?.id ? 'Salvar Alterações' : 'Criar'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
