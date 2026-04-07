import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, Loader2, GraduationCap, DollarSign, Calendar, Clock, MapPin, User, Package,
} from 'lucide-react';
import { useTurmaStore } from '../../store/useTurmaStore';
import { useProductStore } from '../../store/useProductStore';
import { Turma } from '../../services/turmaService';

interface UnifiedFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Turma>;
  mode: 'turma' | 'product';
}

const blankForm = {
  name: '',
  price: '',
  description: '',
  category: 'Turmas',
  professor_name: '',
  professor_email: '',
  date: '',
  time: '',
  location: '',
};

export const UnifiedTurmaProductForm: React.FC<UnifiedFormProps> = ({
  isOpen,
  onClose,
  initialData,
  mode,
}) => {
  const { addTurma, updateTurma } = useTurmaStore();
  const { addProduct, updateProduct, products, fetchProducts } = useProductStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState(blankForm);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      if (initialData) {
        // Find the matching product price if available
        const matchingProduct = products.find(p => p.name === initialData.name);
        setFormData({
          name: initialData.name ?? '',
          price: matchingProduct ? matchingProduct.price.toString() : '',
          description: '',
          category: 'Turmas',
          professor_name: initialData.professor_name ?? '',
          professor_email: initialData.professor_email ?? '',
          date: initialData.date ?? '',
          time: initialData.time ?? '',
          location: initialData.location ?? '',
        });
      } else {
        setFormData(blankForm);
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isEditing = !!initialData?.id;

      if (isEditing) {
        // ── Update path ──────────────────────────────────────────
        if (mode === 'turma') {
          await updateTurma(initialData!.id!, {
            name: formData.name,
            professor_name: formData.professor_name || null,
            professor_email: formData.professor_email || null,
            date: formData.date,
            time: formData.time,
            product: formData.name,
            location: formData.location,
          });
        } else {
          // Find the product whose name matches so we can update by id
          const existingProduct = products.find(p => p.name === initialData!.name);
          if (existingProduct) {
            await updateProduct(existingProduct.id, {
              name: formData.name,
              price: parseFloat(formData.price) || 0,
              description: formData.description,
              category: formData.category,
            });
          }
        }
      } else {
        // ── Create path ──────────────────────────────────────────
        const productData = {
          name: formData.name,
          price: parseFloat(formData.price) || 0,
          description: formData.description,
          category: formData.category,
          image_url: `https://picsum.photos/seed/${encodeURIComponent(formData.name)}/400/300`,
          stock: 999,
        };

        await addProduct(productData);

        if (mode === 'turma' || formData.category.toLowerCase() === 'turmas') {
          await addTurma({
            name: formData.name,
            professor_name: formData.professor_name || null,
            professor_email: formData.professor_email || null,
            date: formData.date,
            time: formData.time,
            product: formData.name,
            location: formData.location,
            status: 'agendada',
          });
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setLoading(false);
    }
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
          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <GraduationCap size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                {initialData?.id ? 'Editar' : 'Nova'}{' '}
                {mode === 'turma' ? 'Turma & Produto' : 'Produto/Serviço'}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Scrollable form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            {/* ── Informações Básicas ──────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                Informações Básicas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field('Nome do Curso/Produto', 'name', {
                  required: true,
                  placeholder: 'Ex: Workshop Drone DJI',
                  icon: <Package size={16} />,
                })}
                {field('Preço de Venda (R$)', 'price', {
                  type: 'number',
                  required: true,
                  placeholder: '0.00',
                  icon: <DollarSign size={16} />,
                })}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm min-h-[72px]"
                  placeholder="Detalhes sobre o curso ou produto..."
                />
              </div>
            </div>

            {/* ── Detalhes da Turma ────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                Detalhes da Turma
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field('Professor (Opcional)', 'professor_name', {
                  placeholder: 'Nome do instrutor',
                  icon: <User size={16} />,
                })}
                {field('Localização', 'location', {
                  placeholder: 'Ex: Sala A ou Online',
                  icon: <MapPin size={16} />,
                })}
                {field('Data', 'date', { type: 'date', icon: <Calendar size={16} /> })}
                {field('Horário', 'time', { type: 'time', icon: <Clock size={16} /> })}
              </div>
            </div>

            {/* Footer buttons inside form so submit works */}
            <div className="flex justify-end gap-3 pt-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {initialData?.id
                  ? 'Salvar Alterações'
                  : mode === 'turma'
                  ? 'Criar Turma & Produto'
                  : 'Criar Produto'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
