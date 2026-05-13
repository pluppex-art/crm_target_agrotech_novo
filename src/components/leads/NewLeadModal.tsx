import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useLeadStore } from '../../store/useLeadStore';
import { useProductStore } from '../../store/useProductStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useAuthStore } from '../../store/useAuthStore';
import { turmaService } from '../../services/turmaService';
import { useSquadStore } from '../../store/useSquadStore';

import { usePipelineStore } from '../../store/usePipelineStore';
import { supabaseService } from '../../services/supabaseService';
import { LeadStatus, LeadSubStatus } from '../../types/leads';
import type { Lead } from '../../types/leads';
import { transactionService } from '../../services/transactionService';
import { CentroCusto } from '../../types/finance_v2';
import { cn, parseBRNumber, formatCPFCNPJ, formatPhone } from '../../lib/utils';
import { AlertCircle, CheckSquare, ChevronDown, DollarSign, Loader2, Mail, MapPin, Percent, Phone, Save, X, User, ClipboardCheck, QrCode, Upload, FileText, Eye, GraduationCap, X as XIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { uploadLeadFile } from '../../services/leadFilesService';
import { notifyNewLead } from '../../services/leadNotificationService';

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
  const { getSquadInfoForUser } = useSquadStore();


  const currentPipelineStages = useMemo(() => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    return pipeline?.stages ?? [];
  }, [pipelines, pipelineId]);

  // Usuários ativos (todos os que podem receber leads)
  const vendedores = useMemo(() => {
    return profiles.filter(p => p.status === 'active' || !p.status);
  }, [profiles]);


  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({});
  const [selectedStageId, setSelectedStageId] = useState<string>(initialStageId ?? '');
  const [centroCustos, setCentroCustos] = useState<CentroCusto[]>([]);

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
    responsavel_usuario_id: string;
    subStatus: LeadSubStatus;
    discount_applied: boolean;
    discount: string;
    discount_type: DiscountType;
    pix_completed: boolean;
    contract_signed: boolean;
    taxa_matricula_recebido: number | null | undefined;
    motivo_perda: string;
    address: string;
    instagram: string;
    emergency_contact: string;
    seller_origin: 'target' | 'pluppex';
    cost_center: string;
    centro_custo_id: string;
  }>({
    name: '',
    email: '',
    phone: '',
    product: '',
    value: '',
    city: '',
    cnpj: '',
    responsible: '',
    responsavel_usuario_id: '',
    subStatus: 'qualified',
    discount_applied: false,
    discount: '',
    discount_type: 'percent',
    pix_completed: false,
    contract_signed: false,
    taxa_matricula_recebido: null,
    motivo_perda: '',
    address: '',
    instagram: '',
    emergency_contact: '',
    seller_origin: 'target',
    cost_center: 'cursos',
    centro_custo_id: '',
  });

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [rgFile, setRgFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const rgInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

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

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [duplicateEmailError, setDuplicateEmailError] = useState<string | null>(null);

  useEffect(() => {
    const checkEmail = async () => {
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setDuplicateEmailError(null);
        return;
      }

      setCheckingEmail(true);
      try {
        const dupes = await supabaseService.checkDuplicateLead({ email: formData.email });
        if (dupes.email) {
          setDuplicateEmailError('Este e-mail já está cadastrado em outro lead.');
        } else {
          setDuplicateEmailError(null);
        }
      } catch (err) {
        console.error('Error checking email:', err);
      } finally {
        setCheckingEmail(false);
      }
    };

    const timer = setTimeout(checkEmail, 600);
    return () => clearTimeout(timer);
  }, [formData.email]);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchProfiles();
      transactionService.getCentroCustos().then(setCentroCustos);
      // Auto-seleciona primeira etapa se nenhuma fornecida
      const defaultStage = initialStageId ?? currentPipelineStages[0]?.id ?? '';
      setSelectedStageId(defaultStage);
      const myProfile = profiles.find(p => p.id === user?.id);
      if (!formData.responsible && myProfile) {
        setFormData(prev => ({ ...prev, responsible: myProfile.name || '', responsavel_usuario_id: myProfile.id }));
      }
    }
  }, [isOpen, initialStageId, fetchProducts, fetchProfiles, user]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const selectedId = e.target.value;
    const selectedProduct = products.find((product: any) => product.id === selectedId);
    setFormData(prev => ({
      ...prev,
      product: selectedId,
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

    // Stage obrigatória quando pipeline está disponível
    if (pipelineId && !selectedStageId) {
      alert('Selecione a etapa do pipeline antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      const dupes = await supabaseService.checkDuplicateLead({
        phone: formData.phone,
        email: formData.email,
        cnpj: formData.cnpj,
      });
      if (dupes.phone || dupes.email || dupes.cnpj) {
        setFieldErrors({
          phone: dupes.phone ? 'Já existe um lead com este número de telefone.' : undefined,
          email: dupes.email ? 'Já existe um lead com este e-mail.' : undefined,
        });

        if (dupes.cnpj) alert('Já existe um lead cadastrado com este CPF/CNPJ.');

        setLoading(false);
        return;
      }
      // Validação para Ganho (Curso)
      const selectedProduct = products.find(p => p.id === formData.product || p.name === formData.product);
      const isService = (selectedProduct?.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').startsWith('servico');

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
        responsavel_usuario_id: formData.responsavel_usuario_id || undefined,
        status: initialStatus as LeadStatus,
        subStatus: initialStatus === 'qualified' ? formData.subStatus : null,
        stars: 0,
        photo: `https://tfwclxxcgnmndcnbklkx.supabase.co/storage/v1/object/public/icones/5.png`,
        discount_applied: formData.discount_applied,
        discount: formData.discount || '',
        discount_type: formData.discount_type || 'percent',
        pix_completed: formData.pix_completed,
        contract_signed: formData.contract_signed,
        valor_recebido: isGanhoStage ? calculateFinalValue() : undefined,
        valor_recebido_paid_at: isGanhoStage ? new Date().toISOString() : undefined,
        forma_pagamento: isGanhoStage ? 'PIX' : undefined,
        taxa_matricula_recebido: formData.taxa_matricula_recebido ?? undefined,
        motivo_perda: isPerdidoStage ? formData.motivo_perda : undefined,
        pipeline_id: pipelineId,
        stage_id: selectedStageId || undefined,
        origin: 'manual',
        address: formData.address || undefined,
        instagram: formData.instagram || undefined,
        emergency_contact: formData.emergency_contact || undefined,
        seller_origin: formData.seller_origin,
        cost_center: formData.cost_center,
        centro_custo_id: formData.centro_custo_id || undefined,
      };

      const newLead = await addLead(newLeadData);

      // Notify responsible seller about new lead
      if (newLead) {
        notifyNewLead(newLead, profiles);
      }

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
        if (rgFile) {
          const url = await uploadLeadFile(newLead.id, 'rg_photo', rgFile);
          if (url) updates.rg_photo_url = url;
        }
        if (profileFile) {
          const url = await uploadLeadFile(newLead.id, 'profile_photo', profileFile);
          if (url) updates.profile_photo_url = url;
        }
        if (Object.keys(updates).length > 0) {
          await updateLead(newLead.id, updates);
        }

        // Auto-enroll in turma after successful ganho lead
        if (isGanhoStage) {
          await turmaService.enrollLeadInTurma({ ...newLeadData, ...updates, id: newLead.id });
        }

        onLeadCreated?.({ ...newLead, ...updates });

        // Apenas fecha e reseta se foi sucesso
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
          responsavel_usuario_id: '',
          subStatus: 'qualified',
          discount_applied: false,
          discount: '',
          discount_type: 'percent',
          pix_completed: false,
          contract_signed: false,
          taxa_matricula_recebido: undefined,
          motivo_perda: '',
          address: '',
          instagram: '',
          emergency_contact: '',
          seller_origin: 'target',
          cost_center: 'cursos',
          centro_custo_id: '',
        });
        setProofFile(null);
        setContractFile(null);
        setRgFile(null);
        setProfileFile(null);
      } else {
        alert('Erro ao salvar lead no banco de dados. Verifique a conexão e as colunas do banco.');
      }
    } catch (error) {
      console.error('Error adding lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const isServiceProduct = useMemo(() => {
    const product = products.find(p => p.id === formData.product || p.name === formData.product);
    return (product?.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').startsWith('servico');
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
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                        setFormData(prev => ({ ...prev, phone: formatted }));
                        setFieldErrors(p => ({ ...p, phone: undefined }));
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
                        setFormData(prev => ({ ...prev, email: e.target.value })); 
                        setFieldErrors(p => ({ ...p, email: undefined })); 
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm",
                        (fieldErrors.email || duplicateEmailError) ? "border-red-400 bg-red-50" : "border-slate-200"
                      )}
                      placeholder="email@exemplo.com"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {checkingEmail && <Loader2 size={14} className="animate-spin text-slate-400" />}
                      <Mail size={15} className={cn("transition-colors", duplicateEmailError ? "text-red-400" : "text-slate-400")} />
                    </div>
                  </div>
                  {(fieldErrors.email || duplicateEmailError) && (
                    <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle size={12} /> {fieldErrors.email || duplicateEmailError}
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
                    value={formData.responsavel_usuario_id}
                    onChange={(e) => {
                      const p = vendedores.find(v => v.id === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        responsible: p?.name || '',
                        responsavel_usuario_id: e.target.value,
                      }));
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                  >
                    <option value="">Selecione o responsável</option>
                    {vendedores.map(p => (
                      <option key={`resp-${p.id}`} value={p.id}>
                        {p.name} [{getSquadInfoForUser(p.id, p.name || '', profiles).name}]
                      </option>
                    ))}


                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              {/* Product + Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produto</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      value={formData.product}
                      onChange={handleProductChange}
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                    >
                      <option value="">Selecione um produto (opcional)</option>
                      {products.map(product => (
                        <option key={`prod-${product.id}`} value={product.id}>
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
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, cnpj: formatCPFCNPJ(e.target.value) }))}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      maxLength={18}
                    />
                  </div>
                </div>
              </div>
              
              {/* Vendedor Origin + Cost Center */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Origem do Vendedor <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      required
                      value={formData.seller_origin}
                      onChange={(e) => setFormData(prev => ({ ...prev, seller_origin: e.target.value as any }))}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                    >
                      <option value="target">Target</option>
                      <option value="pluppex">Pluppex</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Centro de Custo <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      required
                      value={formData.centro_custo_id || ''}
                      onChange={(e) => {
                        const cc = centroCustos.find(c => c.id === e.target.value);
                        setFormData(prev => ({ 
                          ...prev, 
                          centro_custo_id: e.target.value,
                          cost_center: cc?.nome || prev.cost_center 
                        }));
                      }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                    >
                      <option value="">Selecione um centro de custo</option>
                      {centroCustos.map(cc => (
                        <option key={cc.id} value={cc.id}>{cc.nome}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
              </div>

              {/* Pipeline Stage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPipelineStages.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Etapa do Pipeline <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                        required
                        value={selectedStageId}
                        onChange={(e) => setSelectedStageId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                      >
                        <option value="">Selecione uma etapa</option>
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
                      onChange={(e) => setFormData({ ...formData, subStatus: e.target.value as LeadSubStatus })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
                    >
                      <option value="qualified">Qualificado</option>
                      <option value="warming">Aquecimento</option>
                      <option value="disqualified">Desqualificado</option>
                    </select>
                  </div>
                )}
              </div>

              {/* ── SEÇÃO DE DOCUMENTOS PARA CONTRATO ── */}
              <div className="pt-4 border-t border-slate-100 space-y-5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText size={12} className="text-emerald-500" /> Documentos para contrato
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instagram (@)</label>
                    <input
                      type="text"
                      value={formData.instagram}
                      onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm text-sm"
                      placeholder="@usuario"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contato de Emergência</label>
                    <input
                      type="text"
                      value={formData.emergency_contact}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm text-sm"
                      placeholder="Nome e Número (Ex: Maria - (66) 99999-9999)"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço Completo com CEP</label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm text-sm resize-none"
                      placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                    />
                  </div>

                  {/* Uploads de Fotos de Documentos */}
                  <div className="grid grid-cols-2 gap-3 md:col-span-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Foto RG/CNH</label>
                      <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-xl border border-slate-200 shadow-sm w-full">
                        <input
                          ref={rgInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={e => setRgFile(e.target.files?.[0] || null)}
                        />
                        <button
                          type="button"
                          onClick={() => rgInputRef.current?.click()}
                          className={cn(
                            "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            rgFile ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          <ClipboardCheck size={12} />
                          <span className="truncate">{rgFile ? `RG: ${rgFile.name}` : 'Anexar RG/CNH'}</span>
                        </button>
                        {rgFile && (
                          <button type="button" onClick={() => setRgFile(null)} className="p-1 px-2 text-slate-400 hover:text-red-500 border-l border-slate-100 ml-1">
                            <XIcon size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Foto de Perfil</label>
                      <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-xl border border-slate-200 shadow-sm w-full">
                        <input
                          ref={profileInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={e => setProfileFile(e.target.files?.[0] || null)}
                        />
                        <button
                          type="button"
                          onClick={() => profileInputRef.current?.click()}
                          className={cn(
                            "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            profileFile ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          <User size={12} />
                          <span className="truncate">{profileFile ? `Foto: ${profileFile.name}` : 'Anexar Foto'}</span>
                        </button>
                        {profileFile && (
                          <button type="button" onClick={() => setProfileFile(null)} className="p-1 px-2 text-slate-400 hover:text-red-500 border-l border-slate-100 ml-1">
                            <XIcon size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Motivo da Perda */}
            {isPerdidoStage && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivo da Perda</label>
                <textarea
                  value={formData.motivo_perda}
                  onChange={(e) => setFormData(prev => ({ ...prev, motivo_perda: e.target.value }))}
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
