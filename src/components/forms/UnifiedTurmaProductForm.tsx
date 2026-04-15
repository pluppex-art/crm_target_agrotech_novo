import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, Loader2, GraduationCap, DollarSign, Calendar, Clock, MapPin, User, Package, Tag,
} from 'lucide-react';
import { useTurmaStore } from '../../store/useTurmaStore';
import { useProductStore } from '../../store/useProductStore';
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
  description: '',
  category: 'Cursos',
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
  const { addTurma, updateTurma, turmas, fetchTurmas } = useTurmaStore();
  const { addProduct, updateProduct, products, fetchProducts } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState(blankForm);

  // Initial fetch when opening
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchTurmas();
      fetchCategories();
    }
  }, [isOpen]);

  // Data mapping with stable dependencies to prevent infinite loops
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      // Find matching product data
      const matchingProduct = products.find(p => p.id === initialData.product_id || p.id === initialData.id || p.name === initialData.name);

      // Find associated turma (either this is a turma, or it's a product that has a turma)
      const associatedTurma = turmas.find(t => t.id === initialData.id || t.product_id === matchingProduct?.id);

      setFormData({
        name: associatedTurma?.name || initialData.name || matchingProduct?.name || '',
        price: matchingProduct ? matchingProduct.price.toString() : '',
        enrollment_fee: matchingProduct?.enrollment_fee != null ? matchingProduct.enrollment_fee.toString() : '',
        description: matchingProduct ? matchingProduct.description || '' : '',
        category: associatedTurma?.category || initialData.category || matchingProduct?.category || 'Cursos',
        professor_name: associatedTurma?.professor_name ?? initialData.professor_name ?? '',
        professor_email: associatedTurma?.professor_email ?? initialData.professor_email ?? '',
        date: associatedTurma?.date ?? initialData.date ?? '',
        time: associatedTurma?.time ?? initialData.time ?? '',
        location: associatedTurma?.location ?? initialData.location ?? '',
      });
    } else {
      setFormData(blankForm);
    }
  }, [isOpen, initialData?.id, initialData?.name, products.length, turmas.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Identify if we are editing an existing product or turma
      const matchingProduct = products.find(p => p.id === initialData?.product_id || p.id === initialData?.id || p.name === initialData?.name);
      const associatedTurma = turmas.find(t => t.id === initialData?.id || t.product_id === matchingProduct?.id);

      const isProductEditing = !!matchingProduct;
      const isTurmaEditing = !!associatedTurma;

      let productId = matchingProduct?.id;

      // 1. Handle Product Update/Creation
      const enrollmentFee = formData.enrollment_fee ? parseFloat(formData.enrollment_fee) : null;

      if (isProductEditing) {
        await updateProduct(matchingProduct!.id, {
          name: formData.name,
          price: parseFloat(formData.price) || 0,
          enrollment_fee: enrollmentFee ?? undefined,
          description: formData.description,
          category: formData.category,
        });
      } else {
        const productData = {
          name: formData.name,
          price: parseFloat(formData.price) || 0,
          enrollment_fee: enrollmentFee ?? undefined,
          description: formData.description,
          category: formData.category,
          image_url: `https://picsum.photos/seed/${encodeURIComponent(formData.name)}/400/300`,
          stock: 999,
        };
        const newProduct = await addProduct(productData);
        if (newProduct) productId = newProduct.id;
      }

      // 2. Handle Turma Update/Creation
      const isTurmaCategory = formData.category === 'Cursos' || formData.category.toLowerCase().includes('turma');
      const isService = formData.category.toLowerCase().includes('serviço') || formData.category === 'Serviços';
      const isTurmaContext = (mode === 'turma' || mode === 'unified' || isTurmaCategory) && !isService;

      if (isTurmaContext && productId) {
        if (isTurmaEditing) {
          await updateTurma(associatedTurma!.id, {
            name: formData.name,
            product_id: productId,
            professor_name: formData.professor_name || null,
            professor_email: formData.professor_email || null,
            date: formData.date,
            time: formData.time,
            location: formData.location,
          });
        } else {
          await addTurma({
            name: formData.name,
            product_id: productId,
            professor_name: formData.professor_name || null,
            professor_email: formData.professor_email || null,
            date: formData.date,
            time: formData.time,
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
    <AnimatePresence mode="wait">
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
                {initialData?.id ? 'Editar' : 'Novo'}{' '}
                {mode === 'unified' || formData.category === 'Cursos' ? 'Produto & Turma' : 'Produto/Serviço'}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Scrollable form */}
          <form id="unified-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            {/* ── Informações do Produto ──────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                <Package size={14} />
                Dados do Produto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field('Nome do Produto/Serviço', 'name', {
                  required: true,
                  placeholder: 'Ex: Workshop de Drones',
                  icon: <Package size={16} />,
                })}
                {field('Preço (R$)', 'price', {
                  type: 'number',
                  required: true,
                  placeholder: '0.00',
                  icon: <DollarSign size={16} />,
                })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field('Taxa de Matrícula (R$)', 'enrollment_fee', {
                  type: 'number',
                  placeholder: '0.00',
                  icon: <DollarSign size={16} />,
                })}
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

            {/* ── Detalhes da Turma (Condicional) ────────────────── */}
            {((mode === 'unified' || mode === 'turma' || formData.category === 'Cursos') && !formData.category.toLowerCase().includes('serviço')) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-2"
              >
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <GraduationCap size={14} />
                  Informações da Turma
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {field('Instrutor/Professor', 'professor_name', {
                    placeholder: 'Nome do responsável',
                    icon: <User size={16} />,
                  })}
                  {field('Local/Link', 'location', {
                    placeholder: 'Ex: Sala 01 ou Google Meet',
                    icon: <MapPin size={16} />,
                  })}
                  {field('Data de Início', 'date', { type: 'date', icon: <Calendar size={16} /> })}
                  {field('Horário', 'time', { type: 'time', icon: <Clock size={16} /> })}
                </div>
              </motion.div>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-50 shrink-0">
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
                {initialData?.id ? 'Salvar Alterações' : 'Criar Produto & Turma'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
