import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';


import { useLeadStore } from '../../store/useLeadStore';
import { useProductStore } from '../../store/useProductStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePipelineStore } from '../../store/usePipelineStore';
import { supabaseService } from '../../services/supabaseService';
import { LeadStatus, LeadSubStatus } from '../../types/leads';
import { cn, parseBRNumber, formatCPFCNPJ } from '../../lib/utils';
import { AlertCircle, CheckSquare, ChevronDown, DollarSign, Loader2, Mail, MapPin, Percent, Phone, Save, X, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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
  const { profiles, fetchProfiles } = useProfileStore();
  const { user } = useAuthStore();
  const { pipelines } = usePipelineStore();

  const currentPipelineStages = useMemo(() => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    return pipeline?.stages ?? [];
  }, [pipelines, pipelineId]);

  // Filter only vendedores (profiles with cargo name containing 'vendedor')
    const vendedores = useMemo(() => {
      const sellers = profiles.filter((p: any) => {
        const cargoName = (p.cargos?.name || p.cargo_name || '').toLowerCase();
        return cargoName.includes('vendedor') || cargoName.includes('vendedor');
      });
    // Fallback: show all active profiles if no vendedores found
    return sellers.length > 0
      ? sellers
      : profiles.filter(p => p.status === 'active' || !p.status);
  }, [profiles]);

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({});
  const [selectedStageId, setSelectedStageId] = useState<string>(initialStageId ?? '');
  type DiscountType = 'percent' | 'money';
  
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    product: string;
    value: string;
    city: string;
    cnpj: string;
    responsible: string;
    subStatus: LeadSubStatus;
    discount_applied: boolean;
    discount: string;
    discount_type: DiscountType;
  }>({
    name: '',
    email: '',
    phone: '',
    product: '',
    value: '',
    city: '',
    cnpj: '',
    responsible: '',
    subStatus: 'qualified',
    discount_applied: false,
    discount: '',
    discount_type: 'percent',
  });


  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchProfiles();
      setSelectedStageId(initialStageId ?? '');
      const consultantName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
      if (!formData.responsible && consultantName) {
        setFormData(prev => ({ ...prev, responsible: consultantName }));
      }
    }
  }, [isOpen, initialStageId, fetchProducts, fetchProfiles, user, formData.responsible]);

  const calculateFinalValue = () => {
    const val = parseBRNumber(formData.value);
    let discount = 0;
    if (formData.discount_applied && formData.discount) {
      const discVal = parseBRNumber(formData.discount);
      discount = formData.discount_type === 'percent' ? discVal / 100 : discVal / val;
    }
    return val * (1 - Math.min(discount, 1));
  };


  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedProduct = products.find((product: any) => product.name === e.target.value);
    setFormData(prev => ({
      ...prev,
      product: e.target.value,
      value: selectedProduct ? selectedProduct.price.toString() : prev.value
    }));
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
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
      const selectedStage = currentPipelineStages.find((s: any) => s.id === selectedStageId);
      const stageName = ((selectedStage as any)?.name || '').toLowerCase();
      const isGanhoStage = stageName.includes('ganho') || stageName.includes('fechado') || stageName.includes('aprovado');
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
        photo: `https://tfwclxxcgnmndcnbklkx.supabase.co/storage/v1/object/public/icones/5.png`,
        history: [],
        discount_applied: formData.discount_applied,
        discount: formData.discount || '',
        discount_type: formData.discount_type || 'percent',

        pipeline_id: pipelineId,
        stage_id: selectedStageId || undefined,
        ...(isGanhoStage ? { pix_completed: true, contract_signed: true } : {}),
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
        subStatus: 'qualified' as LeadSubStatus,
        discount_applied: false,
        discount: '',
        discount_type: 'percent',
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
            <h2 className="text-xl font-bold text-gray-800">Novo Cliente</h2>
              {!pipelineId && (
                <div className="ml-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-800 flex items-center gap-1 mt-1">
                  <AlertCircle size={12} />
                  Pipeline não selecionado - cliente será criado em um estado padrão
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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  Nome do Cliente <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                    placeholder="Ex: João Silva"
                  />
                  <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => { setFormData(prev => ({...prev, phone: e.target.value})); setFieldErrors((p: any) => ({...p, phone: undefined})); }}
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
                    onChange={(e) => { setFormData(prev => ({...prev, email: e.target.value})); setFieldErrors((p: any) => ({...p, email: undefined})); }}
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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  Produto de Interesse <span className="text-red-500">*</span>
                </label>
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
                    value={formData.value ? Number(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                    readOnly
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-slate-500 cursor-not-allowed"
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
                    onChange={(e) => setFormData(prev => ({...prev, city: e.target.value}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, cnpj: formatCPFCNPJ(e.target.value)}))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  Responsável <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.responsible}
                    onChange={(e) => setFormData(prev => ({...prev, responsible: e.target.value}))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700 appearance-none cursor-pointer"
                  >
                    <option value="">Selecione o responsável</option>
                    {vendedores.map(p => (
                      <option key={`resp-${p.id}`} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {currentPipelineStages.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Etapa</label>
                  <div className="relative">
                    <select
                      value={selectedStageId}
                      onChange={(e) => setSelectedStageId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700 appearance-none cursor-pointer"
                    >
                      <option value="">Primeira etapa</option>
                      {currentPipelineStages.map((stage: any) => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

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

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer w-fit">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.discount_applied}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_applied: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className={cn(
                    'w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center',
                    formData.discount_applied ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-200'
                  )}>
                    {formData.discount_applied && <CheckSquare size={12} className="text-white" />}
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-700">Aplicar desconto?</span>
              </label>

              <div className={cn(
                'flex gap-4 transition-all duration-300',
                formData.discount_applied ? 'opacity-100 max-h-[100px]' : 'opacity-0 max-h-0 overflow-hidden'
              )}>
                <div className="flex rounded-xl overflow-hidden border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, discount_type: 'percent' }))}
                    className={cn(
                      "px-3 py-2.5 text-xs font-bold transition-colors flex items-center gap-1",
                      formData.discount_type === 'percent'
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <Percent size={12} /> %
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, discount_type: 'money' }))}
                    className={cn(
                      "px-3 py-2.5 text-xs font-bold transition-colors border-l border-slate-200 flex items-center gap-1",
                      formData.discount_type === 'money'
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <DollarSign size={12} /> R$
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="0"
                  value={formData.discount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9,]/g, '');
                    setFormData({ ...formData, discount: val });
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
                />
                <div className="flex-[2] px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Valor Final</span>
                  <span className="text-sm font-bold text-emerald-600">
                    R$ {calculateFinalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
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
                Criar Cliente
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};


