import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Loader2, GraduationCap, DollarSign, Calendar, Clock, MapPin, User, Package, Image as ImageIcon } from 'lucide-react';
import { useTurmaStore } from '../../store/useTurmaStore';
import { useProductStore } from '../../store/useProductStore';

interface UnifiedFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  mode: 'turma' | 'product';
}

export const UnifiedTurmaProductForm: React.FC<UnifiedFormProps> = ({ isOpen, onClose, initialData, mode }) => {
  const { addTurma, updateTurma } = useTurmaStore();
  const { addProduct, updateProduct } = useProductStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Turmas',
    image_url: '',
    professor_name: '',
    professor_email: '',
    date: '',
    time: '',
    location: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...formData,
        ...initialData,
        price: initialData.price?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        price: '',
        description: '',
        category: 'Turmas',
        image_url: '',
        professor_name: '',
        professor_email: '',
        date: '',
        time: '',
        location: '',
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const productData = {
        name: formData.name,
        price: parseFloat(formData.price) || 0,
        description: formData.description,
        category: formData.category,
        image_url: formData.image_url || `https://picsum.photos/seed/${formData.name}/400/300`,
        stock: 999, // Infinite stock for turmas
      };

      if (initialData?.id) {
        // Update Product
        await updateProduct(initialData.id, productData);
        
        // Update Turma (if applicable)
        if (mode === 'turma' || formData.category.toLowerCase() === 'turmas') {
          const turmaData = {
            name: formData.name,
            professor_name: formData.professor_name || null,
            professor_email: formData.professor_email || null,
            date: formData.date,
            time: formData.time,
            product: formData.name,
            location: formData.location,
            status: initialData.status || 'agendada',
          };
          if (mode === 'turma') {
            await updateTurma(initialData.id, turmaData as any);
          }
        }
      } else {
        // 1. Create Product
        await addProduct(productData);
        
        // 2. Create Turma (if in turma mode or if category is Turmas)
        if (mode === 'turma' || formData.category.toLowerCase() === 'turmas') {
          const turmaData = {
            name: formData.name,
            professor_name: formData.professor_name || null,
            professor_email: formData.professor_email || null,
            date: formData.date,
            time: formData.time,
            product: formData.name, // Use the product name as the reference
            location: formData.location,
            status: 'agendada' as const,
          };
          await addTurma(turmaData as any);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <GraduationCap size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                {initialData ? 'Editar' : 'Nova'} {mode === 'turma' ? 'Turma & Produto' : 'Produto/Serviço'}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nome do {mode === 'turma' ? 'Curso/Turma' : 'Produto'}</label>
                  <div className="relative">
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Ex: Workshop Drone DJI"
                    />
                    <Package size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Preço de Venda (R$)</label>
                  <div className="relative">
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                    <DollarSign size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all min-h-[80px]"
                  placeholder="Detalhes sobre o produto ou curso..."
                />
              </div>
            </div>

            {/* Turma Specific Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Detalhes da Turma</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Professor (Opcional)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.professor_name}
                      onChange={(e) => setFormData({...formData, professor_name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Nome do instrutor"
                    />
                    <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Localização</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Ex: Sala A ou Online"
                    />
                    <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Data</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                    <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Horário</label>
                  <div className="relative">
                    <input 
                      type="time" 
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                    <Clock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 shrink-0">
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
                {initialData ? 'Salvar Alterações' : (mode === 'turma' ? 'Criar Turma & Produto' : 'Criar Produto')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
