import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useLeadStore } from '../../store/useLeadStore';
import { useProductStore } from '../../store/useProductStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePipelineStore } from '../../store/usePipelineStore';
import { supabaseService } from '../../services/supabaseService';
import { LeadStatus, LeadSubStatus } from '../../types/leads';
import type { Lead } from '../../types/leads';
import { cn, parseBRNumber, formatCPFCNPJ, formatPhone } from '../../lib/utils';
import { AlertCircle, CheckSquare, ChevronDown, DollarSign, Loader2, Mail, MapPin, Percent, Phone, Save, X, User, ClipboardCheck, QrCode, Upload, FileText, Eye, GraduationCap, X as XIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { uploadLeadFile } from '../../services/leadFilesService';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStatus?: LeadStatus;
  pipelineId?: string;
  initialStageId?: string;
  onLeadCreated?: (lead: Lead) => void;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({ isOpen, onClose, initialStatus = 'new', pipelineId, initialStageId, onLeadCreated }) => {
  const { addLead, updateLead } = useLeadStore();
  const { products, fetchProducts } = useProductStore();
  const { profiles, fetchProfiles } = useProfileStore();
  const { user } = useAuthStore();
  const { pipelines } = usePipelineStore();

  const currentPipelineStages = useMemo(() => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    return pipeline?.stages ?? [];
  }, [pipelines, pipelineId]);

  // Usuários do departamento Comercial ativos
  const vendedores = useMemo(() => {
    const comercial = profiles.filter(p =>
      p.department?.toLowerCase() === 'comercial' && (p.status === 'active' || !p.status)
    );
    // Fallback: all active profiles if no comercial members found
    return comercial.length > 0
      ? comercial
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
    pix_completed: boolean;
    contract_signed: boolean;
taxa_matricula_recebido: number | null | undefined;
    motivo_perda: string;
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
    pix_completed: false,
    contract_signed: false,
    taxa_matricula_recebido: null,
    motivo_perda: '',
  });

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  const selectedStage = useMemo(() =>
    currentPipelineStages.find((s: any) => s.id === selectedStageId),
    [currentPipelineStages, selectedStageId]);

  const isGanhoStage = useMemo(() => {
    const name = ((selectedStage as any)?.name || '').toLowerCase();
    return name.includes('ganho') || name.includes('fechado') || name.includes('aprovado');
  }, [selectedStage]);

  const isPerdidoStage = useMemo(() => {
    const name = ((selectedStage as any)?.name || '').toLowerCase();
    return name.includes('perdido') || name.includes('desistiu') || name.includes('perda');
  }, [selectedStage]);

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
  }, [isOpen, initialStageId, fetchProducts, fetchProfiles, user]);

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
      value: selectedProduct ? selectedProduct.price.toString() : prev.value,
taxa_matricula_recebido: selectedProduct?.enrollment_fee ?? undefined,
    }));
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setFieldErrors({});
    
    // Email Validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFieldErrors({ email: 'Por favor, insira um e-mail válido.' });
      return;
    }

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
      // Validação para Ganho (Curso)
      const selectedProduct = products.find(p => p.name === formData.product);
      const isService = (selectedProduct?.category || '').toLowerCase().startsWith('serviço') || (selectedProduct?.category || '').toLowerCase().startsWith('servico');

      if (isGanhoStage && !isService) {
        if (!formData.pix_completed || !formData.contract_signed || !proofFile || !contractFile) {
          alert('Para cadastrar em Ganho (Curso) é necessário:\n• Marcar Taxa Matrícula e Contrato assinado\n• Anexar Comprovante e Contrato');
          setLoading(false);
          return;
        }
      }
      
      const newLeadData = {
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
        pix_completed: formData.pix_completed,
        contract_signed: formData.contract_signed,
        valor_recebido: isGanhoStage ? calculateFinalValue() : undefined,
        forma_pagamento: isGanhoStage ? 'PIX' : undefined,
taxa_matricula_recebido: formData.taxa_matricula_recebido ?? undefined,
        motivo_perda: isPerdidoStage ? formData.motivo_perda : undefined,
        pipeline_id: pipelineId,
        stage_id: selectedStageId || undefined,
      };

      const newLead = await addLead(newLeadData);

      // Upload files if any
      if (newLead) {
        let updates: Partial<Lead> = {};
        if (proofFile) {
          const url = await uploadLeadFile(newLead.id, 'payment_proof', proofFile);
          if (url) updates.payment_proof_url = url;
        }
        if (contractFile) {
          const url = await uploadLeadFile(newLead.id, 'contract', contractFile);
          if (url) updates.contract_url = url;
        }
        if (Object.keys(updates).length > 0) {
          await updateLead(newLead.id, updates);
        }

        // Auto-enroll in turma after successful ganho lead
        if (isGanhoStage) {
          const turmaService = (window as any).turmaService || { enrollLeadInTurma: async () => { } };
          await turmaService.enrollLeadInTurma({ ...newLeadData, ...updates, id: newLead.id });
        }

        onLeadCreated?.({ ...newLead, ...updates });
      }

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
        discount_applied: false,
        discount: '',
        discount_type: 'percent',
        pix_completed: false,
        contract_signed: false,
        taxa_matricula_recebido: undefined,
        motivo_perda: '',
      });
      setProofFile(null);
      setContractFile(null);
    } catch (error) {
      console.error('Error adding lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const isServiceProduct = useMemo(() => {
    const product = products.find(p => p.name === formData.product);
    return (product?.category || '').toLowerCase().startsWith('serviço') || (product?.category || '').toLowerCase().startsWith('servico');
  }, [formData.product, products]);

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
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Novo Cadastro</h2>
              <p className="text-xs text-slate-400 font-medium">Preencha os dados básicos para iniciar o atendimento.</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 gap-5">
              {/* Nome */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
                    placeholder="Ex: João Silva"
                  />
                  <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    Telefone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
                        const formatted = formatPhone(e.target.value);
                        setFormData(prev => ({...prev, phone: formatted})); 
                        setFieldErrors(p => ({...p, phone: undefined})); 
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium pr-10 shadow-sm",
                        fieldErrors.phone ? "border-red-400 bg-red-50" : "border-slate-200"
                      )}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                    <Phone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  </div>
                  {fieldErrors.phone && (
                    <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle size={12} /> {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormData(prev => ({...prev, email: e.target.value})); setFieldErrors(p => ({...p, email: undefined})); }}
                      className={cn(
                        "w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm",
                        fieldErrors.email ? "border-red-400 bg-red-50" : "border-slate-200"
                      )}
                      placeholder="email@exemplo.com"
                    />
                    <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  {fieldErrors.email && (
                    <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle size={12} /> {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Responsible */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsável <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    required
                    value={formData.responsible}
                    onChange={(e) => setFormData(prev => ({...prev, responsible: e.target.value}))}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                  >
                    <option value="">Selecione o responsável</option>
                    {vendedores.map(p => (
                      <option key={`resp-${p.id}`} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              {/* Product + Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produto <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                      required
                      value={formData.product}
                      onChange={handleProductChange}
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                    >
                      <option value="">Selecione um produto</option>
                      {products.map(product => (
                        <option key={`prod-${product.id}`} value={product.name}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor (R$)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.value ? Number(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium shadow-sm text-slate-500 cursor-not-allowed"
                      placeholder="0,00"
                    />
                    <DollarSign size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* City + CPF/CNPJ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cidade</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({...prev, city: e.target.value}))}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
                      placeholder="Cidade - UF"
                    />
                    <MapPin size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPF / CNPJ</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData(prev => ({...prev, cnpj: formatCPFCNPJ(e.target.value)}))}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      maxLength={18}
                    />
                  </div>
                </div>
              </div>

              {/* Pipeline Stage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{currentPipelineStages.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Etapa do Pipeline</label>
                    <div className="relative">
                      <select
                        value={selectedStageId}
                        onChange={(e) => setSelectedStageId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                      >
                        <option value="">Primeira etapa</option>
                        {currentPipelineStages.map((stage: any) => (
                          <option key={stage.id} value={stage.id}>{stage.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {initialStatus === 'qualified' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qualificação</label>
                    <select
                      value={formData.subStatus}
                      onChange={(e) => setFormData({...formData, subStatus: e.target.value as LeadSubStatus})}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
                    >
                      <option value="qualified">Qualificado</option>
                      <option value="warming">Aquecimento</option>
                      <option value="disqualified">Desqualificado</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Motivo da Perda */}
            {isPerdidoStage && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivo da Perda</label>
                <textarea
                  value={formData.motivo_perda}
                  onChange={(e) => setFormData(prev => ({...prev, motivo_perda: e.target.value}))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-medium shadow-sm"
                  placeholder="Descreva o motivo da perda..."
                  rows={2}
                />
              </div>
            )}

            {/* Ganho Stage Confirmations */}
            {isGanhoStage && !isServiceProduct && (
              <div className="space-y-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 mt-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
                    <ClipboardCheck size={13} className="text-emerald-500" /> Confirmações para avançar para Ganho
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Coluna 1: Checkboxes */}
                  <div className="flex flex-col gap-4">
                    {/* Pix / Taxa */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-3 cursor-pointer group shrink-0">
                        <div className="relative shrink-0">
                          <input
                            type="checkbox"
                            checked={formData.pix_completed}
                            onChange={(e) => setFormData(prev => ({ ...prev, pix_completed: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className={cn(
                            "w-6 h-6 border-2 rounded-lg transition-all flex items-center justify-center",
                            formData.pix_completed ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-300"
                          )}>
                            {formData.pix_completed && <CheckSquare size={14} className="text-white" />}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <QrCode size={18} className={cn("transition-colors", formData.pix_completed ? "text-emerald-500" : "text-slate-400")} />
                          <span className="text-[14px] font-bold text-slate-700 tracking-tight">Taxa Matrícula</span>
                        </div>
                      </label>
                      <div className="max-w-[100px]">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!formData.pix_completed}
                          value={formData.taxa_matricula_recebido ?? ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, taxa_matricula_recebido: e.target.value ? parseFloat(e.target.value) : null }))}
                          placeholder="Valor R$"
                          className={cn(
                            "w-full px-3 py-1.5 border rounded-xl outline-none text-xs font-black shadow-sm transition-all text-center",
                            formData.pix_completed
                              ? "bg-white border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>

                    {/* Contrato Assinado Checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative shrink-0">
                        <input
                          type="checkbox"
                          checked={formData.contract_signed}
                          onChange={(e) => setFormData(prev => ({ ...prev, contract_signed: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className={cn(
                          "w-6 h-6 border-2 rounded-lg transition-all flex items-center justify-center",
                          formData.contract_signed ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-300"
                        )}>
                          {formData.contract_signed && <CheckSquare size={14} className="text-white" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClipboardCheck size={18} className={cn("transition-colors", formData.contract_signed ? "text-emerald-500" : "text-slate-400")} />
                        <span className="text-[14px] font-bold text-slate-700 tracking-tight">Contrato assinado</span>
                      </div>
                    </label>
                  </div>

                  {/* Coluna 2: Uploads */}
                  <div className="flex flex-col gap-3">
                    {/* Comprovante Upload Button */}
                    <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-2xl border border-slate-200 shadow-sm w-full">
                      <input
                        ref={proofInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                        onChange={e => setProofFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        onClick={() => proofInputRef.current?.click()}
                        className={cn(
                          "flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          proofFile
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        <QrCode size={14} />
                        <span className="truncate">{proofFile ? `Comprovante: ${proofFile.name}` : 'Comprovante'}</span>
                      </button>
                      {proofFile && (
                        <button
                          type="button"
                          onClick={() => setProofFile(null)}
                          className="p-1 px-2 text-slate-400 hover:text-red-500 border-l border-slate-100 ml-1"
                        >
                          <XIcon size={14} />
                        </button>
                      )}
                    </div>

                    {/* Contrato Upload Button */}
                    <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-2xl border border-slate-200 shadow-sm w-full">
                      <input
                        ref={contractInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                        onChange={e => setContractFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        onClick={() => contractInputRef.current?.click()}
                        className={cn(
                          "flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          contractFile
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        <FileText size={14} />
                        <span className="truncate">{contractFile ? `Contrato: ${contractFile.name}` : 'Contrato'}</span>
                      </button>
                      {contractFile && (
                        <button
                          type="button"
                          onClick={() => setContractFile(null)}
                          className="p-1 px-2 text-slate-400 hover:text-red-500 border-l border-slate-100 ml-1"
                        >
                          <XIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

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
                className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar Cadastro
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
