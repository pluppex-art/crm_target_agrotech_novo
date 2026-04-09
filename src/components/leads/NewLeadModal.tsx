import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, Mail, DollarSign, MapPin, Save, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import { useLeadStore } from '../../store/useLeadStore';
import { useProductStore } from '../../store/useProductStore';
import { supabaseService } from '../../services/supabaseService';
import { LeadStatus, LeadSubStatus } from '../../types/leads';
import { cn, parseBRNumber, formatCPFCNPJ } from '../../lib/utils';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStatus?: LeadStatus;
  pipelineId?: string;
  initialStageId?: string;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({ isOpen, onClose, initialStatus = 'new', pipelineId, initialStageId }) => {
  const { addLead } = useLeadStore();
  const { products, fetchProducts } = useProductStore();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    product: '',
    value: '',
    city: '',
    cnpj: '',
    responsible: '',
    subStatus: 'qualified' as LeadSubStatus,
    isDiscountApplied: false,
    discountValue: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen, fetchProducts]);

  const calculateFinalValue = () => {
    const val = parseBRNumber(formData.value);
    const discount = parseBRNumber(formData.discountValue);
    return val * (1 - discount / 100);
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedProduct = products.find(p => p.name === e.target.value);
    setFormData({
      ...formData,
      product: e.target.value,
      value: selectedProduct ? selectedProduct.price.toString() : formData.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      const dupes = await supabaseService.checkDuplicateLead({
        phone: formData.phone,
        email: formData.email,
      });
      if (dupes.phone || dupes.email) {
        setFieldErrors({
          phone: dupes.phone ? 'Já existe um lead com este número de telefone.' : undefined,
          email: dupes.email ? 'Já existe um lead com este e-mail.' : undefined,
        });
        return;
      }
      await addLead({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        product: formData.product,
        value: parseBRNumber(formData.value),
        city: formData.city,
        cnpj: formData.cnpj,
        responsible: formData.responsible,
        status: initialStatus as LeadStatus,
        subStatus: initialStatus === 'qualified' ? formData.subStatus : null,
        stars: 0,
        photo: `https://picsum.photos/seed/${formData.name}/200`,
        history: [],
        discount: formData.isDiscountApplied ? formData.discountValue : '',
        pipeline_id: pipelineId,
        stage_id: initialStageId || undefined,
      });
      onClose();
      setFormData({
        name: '',
        email: '',
        phone: '',
        product: '',
        value: '',
        city: '',
        cnpj: '',
        responsible: '',
        subStatus: 'qualified',
        isDiscountApplied: false,
        discountValue: '',
      });
    } catch (error) {
      console.error('Error adding lead:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
<AnimatePresence mode="wait">
      <div key="overlay-new" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          key="modal-new"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <h2 className="text-xl font-bold text-gray-800">Novo Lead</h2>
              {!pipelineId && (
                <div className="ml-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-800 flex items-center gap-1 mt-1">
                  <AlertCircle size={12} />
                  Pipeline não selecionado - lead será criado sem pipeline
                </div>
              )}
              <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome do Cliente</label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                    placeholder="Ex: João Silva"
                  />
                  <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => { setFormData({...formData, phone: e.target.value}); setFieldErrors(p => ({...p, phone: undefined})); }}
                    className={cn("w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700", fieldErrors.phone ? "border-red-400 bg-red-50" : "border-gray-200")}
                    placeholder="(00) 00000-0000"
                  />
                  <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {fieldErrors.phone && (
                  <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                    <AlertCircle size={12} /> {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail</label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => { setFormData({...formData, email: e.target.value}); setFieldErrors(p => ({...p, email: undefined})); }}
                    className={cn("w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700", fieldErrors.email ? "border-red-400 bg-red-50" : "border-gray-200")}
                    placeholder="email@exemplo.com"
                  />
                  <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {fieldErrors.email && (
                  <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                    <AlertCircle size={12} /> {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Produto de Interesse</label>
                <div className="relative">
                  <select 
                    value={formData.product}
                    onChange={handleProductChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700 appearance-none cursor-pointer"
                  >
                    <option value="">Selecione um produto</option>
                    {products.map(product => (
                      <option key={`prod-${product.id}`} value={product.name}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valor Estimado (R$)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                    placeholder="0,00"
                  />
                  <DollarSign size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cidade</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                    placeholder="Cidade - UF"
                  />
                  <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CPF / CNPJ (Opcional)</label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({...formData, cnpj: formatCPFCNPJ(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Responsável</label>
                <input
                  type="text"
                  value={formData.responsible}
                  onChange={(e) => setFormData({...formData, responsible: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                  placeholder="Nome do consultor"
                />
              </div>

              {initialStatus === 'qualified' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sub-status de Qualificação</label>
                  <select
                    value={formData.subStatus}
                    onChange={(e) => setFormData({...formData, subStatus: e.target.value as LeadSubStatus})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                  >
                    <option value="qualified">Qualificado</option>
                    <option value="warming">Aquecimento</option>
                    <option value="disqualified">Desqualificado</option>
                  </select>
                </div>
              )}
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <div className="relative">
                  <input 
                    type="checkbox"
                    checked={formData.isDiscountApplied}
                    onChange={(e) => setFormData({ ...formData, isDiscountApplied: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-slate-200 rounded-md bg-white peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition-all flex items-center justify-center">
                    <svg className={cn("w-3 h-3 text-white transition-opacity", formData.isDiscountApplied ? "opacity-100" : "opacity-0")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-700">Aplicar desconto?</span>
              </label>

              <AnimatePresence>
                {formData.isDiscountApplied && (
                  <motion.div 
                    key="discount-controls-new"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-3">
                      <div className="flex gap-4">
                        <div className="flex-1 relative">
                          <input 
                            type="text"
                            placeholder="0"
                            value={formData.discountValue}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setFormData({ ...formData, discountValue: val });
                            }}
                            className="w-full px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-emerald-700 font-bold text-sm text-right pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">%</span>
                        </div>
                        <div className="flex-[2] px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 uppercase">Valor Final</span>
                          <span className="text-sm font-bold text-emerald-600">
                            R$ {calculateFinalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-4 flex justify-end gap-3">
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
                Criar Lead
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};


