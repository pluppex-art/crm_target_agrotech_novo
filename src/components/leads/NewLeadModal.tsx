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
import { parseBRNumber } from '../../lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { uploadLeadFile } from '../../services/leadFilesService';
import { notifyNewLead } from '../../services/leadNotificationService';

// Sub-components
import { ModalHeader } from './new-lead-modal/ModalHeader';
import { ModalFooter } from './new-lead-modal/ModalFooter';
import { BasicInfoSection } from './new-lead-modal/BasicInfoSection';
import { SalesInfoSection } from './new-lead-modal/SalesInfoSection';
import { DocumentationSection } from './new-lead-modal/DocumentationSection';
import { GanhoConfirmations } from './new-lead-modal/GanhoConfirmations';
import { LossReasonSection } from './new-lead-modal/LossReasonSection';

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

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<any>({});
  const [selectedStageId, setSelectedStageId] = useState<string>(initialStageId ?? '');
  const [centroCustos, setCentroCustos] = useState<CentroCusto[]>([]);
  const [formData, setFormData] = useState<any>({
    name: '', email: '', phone: '', product: '', value: '', city: '', cnpj: '',
    responsible: '', responsavel_usuario_id: '', subStatus: 'qualified',
    discount_applied: false, discount: '', discount_type: 'percent',
    pix_completed: false, contract_signed: false, taxa_matricula_recebido: null,
    taxa_matricula_paid_at: null, valor_recebido_paid_at: null,
    motivo_perda: '', address: '', instagram: '', emergency_contact: '',
    seller_origin: 'target', cost_center: 'cursos', centro_custo_id: '',
    is_minor: false, guardian_name: '', guardian_cpf: '', guardian_phone: '',
  });

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [rgFile, setRgFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const rgInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const currentPipelineStages = useMemo(() => pipelines.find(p => p.id === pipelineId)?.stages ?? [], [pipelines, pipelineId]);
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Always include the currently selected product
      if (p.id === formData.product || p.name === formData.product) return true;
      // Exclude concluded or canceled
      return p.status !== 'concluida' && p.status !== 'cancelada';
    });
  }, [products, formData.product]);
  const vendedores = useMemo(() => profiles.filter(p => p.status === 'active' || !p.status), [profiles]);
  const selectedStage = useMemo(() => currentPipelineStages.find((s: any) => s.id === selectedStageId), [currentPipelineStages, selectedStageId]);
  const isGanhoStage = useMemo(() => {
    const name = ((selectedStage as any)?.name || '').toLowerCase();
    return name.includes('ganho') || name.includes('fechado') || name.includes('aprovado');
  }, [selectedStage]);
  const isPerdidoStage = useMemo(() => {
    const name = ((selectedStage as any)?.name || '').toLowerCase();
    return name.includes('perdido') || name.includes('desistiu') || name.includes('perda');
  }, [selectedStage]);

  const [duplicateEmailError, setDuplicateEmailError] = useState<string | null>(null);

  useEffect(() => {
    const checkEmail = async () => {
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setDuplicateEmailError(null); return; }
      try {
        const dupes = await supabaseService.checkDuplicateLead({ email: formData.email });
        setDuplicateEmailError(dupes.email ? 'Este e-mail já está cadastrado em outro lead.' : null);
      } catch (err) { console.error('Error checking email:', err); }
    };
    const timer = setTimeout(checkEmail, 600);
    return () => clearTimeout(timer);
  }, [formData.email]);

  useEffect(() => {
    if (isOpen) {
      fetchProducts(); fetchProfiles();
      transactionService.getCentroCustos().then((list) => {
        setCentroCustos(list);
        const defaultCc = list.find((c: any) => c.nome.toLowerCase() === 'cursos');
        if (defaultCc) {
          setFormData((prev: any) => ({
            ...prev,
            centro_custo_id: defaultCc.id,
            cost_center: defaultCc.nome,
          }));
        }
      });
      setSelectedStageId(initialStageId ?? currentPipelineStages[0]?.id ?? '');
      const myProfile = profiles.find(p => p.id === user?.id);
      if (!formData.responsible && myProfile) {
        setFormData((prev: any) => ({ ...prev, responsible: myProfile.name || '', responsavel_usuario_id: myProfile.id }));
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setFieldErrors({ email: 'E-mail inválido' }); return; }
      if (pipelineId && !selectedStageId) { alert('Selecione a etapa'); return; }
      if (!formData.name) { alert('Por favor, preencha o nome do cliente.'); return; }
      if (!formData.phone) { alert('Por favor, preencha o telefone do cliente.'); return; }
      if (!formData.responsavel_usuario_id) { alert('Por favor, selecione o responsável.'); return; }
      if (!formData.centro_custo_id) { alert('Por favor, selecione o centro de custo.'); return; }
      
      setLoading(true);
      try {
        const dupes = await supabaseService.checkDuplicateLead({ phone: formData.phone, email: formData.email, cnpj: formData.cnpj });
        if (dupes.phone || dupes.email || dupes.cnpj) {
          setFieldErrors({ phone: dupes.phone ? 'Telefone duplicado' : undefined, email: dupes.email ? 'E-mail duplicado' : undefined });
          if (dupes.cnpj) alert('CPF/CNPJ duplicado');
          setLoading(false); return;
        }
        const selectedProduct = products.find(p => p.id === formData.product || p.name === formData.product);
        const isService = (selectedProduct?.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').startsWith('servico');
        if (isGanhoStage) {
          // Produtos de Serviço (professor): o comprovante é enviado no dia da turma, não agora
          if (!isService) {
            if (!formData.pix_completed || !formData.contract_signed || !proofFile || !contractFile) {
              alert('Dados de ganho incompletos: É necessário marcar Taxa Matrícula e Contrato assinado, e anexar Comprovante e Contrato.');
              setLoading(false);
              return;
            }
          }
        }
        const val = parseBRNumber(formData.value);
        const discVal = parseBRNumber(formData.discount);
        const discount = formData.discount_applied && formData.discount ? (formData.discount_type === 'percent' ? discVal / 100 : discVal / val) : 0;
        const finalValue = val * (1 - Math.min(discount, 1));

        const ganhoTimestamp = isGanhoStage ? new Date().toISOString() : undefined;
        const newLeadData = {
          ...formData,
          value: val,
          status: initialStatus as LeadStatus,
          subStatus: initialStatus === 'qualified' ? formData.subStatus : null,
          photo: `https://tfwclxxcgnmndcnbklkx.supabase.co/storage/v1/object/public/icones/5.png`,
          valor_recebido: isGanhoStage ? finalValue : undefined,
          forma_pagamento: isGanhoStage ? 'PIX' : undefined,
          motivo_perda: isPerdidoStage ? formData.motivo_perda : undefined,
          pipeline_id: pipelineId,
          stage_id: selectedStageId || undefined,
          origin: 'manual',
        };

        const newLead = await addLead(newLeadData);
        if (newLead) {
          // Note: notifyNewLead is already called inside useLeadStore.addLead
          let updates: Partial<Lead> = {};
          if (proofFile) {
            if (isService) {
              updates.professor_proof_url = await uploadLeadFile(newLead.id, 'payment_proof', proofFile) || undefined;
            } else {
              updates.payment_proof_url = await uploadLeadFile(newLead.id, 'payment_proof', proofFile) || undefined;
            }
          }
          if (contractFile) updates.contract_url = await uploadLeadFile(newLead.id, 'contract', contractFile) || undefined;
          if (rgFile) updates.rg_photo_url = await uploadLeadFile(newLead.id, 'rg_photo', rgFile) || undefined;
          if (profileFile) updates.profile_photo_url = await uploadLeadFile(newLead.id, 'profile_photo', profileFile) || undefined;
          if (Object.keys(updates).length > 0) await updateLead(newLead.id, updates);
          if (isGanhoStage) await turmaService.enrollLeadInTurma({ ...newLeadData, ...updates, id: newLead.id, valor_recebido_paid_at: ganhoTimestamp });
          onLeadCreated?.({ ...newLead, ...updates });
          onClose();
          setFormData({ name: '', email: '', phone: '', product: '', value: '', city: '', cnpj: '', responsible: '', responsavel_usuario_id: '', subStatus: 'qualified', discount_applied: false, discount: '', discount_type: 'percent', pix_completed: false, contract_signed: false, taxa_matricula_recebido: null, motivo_perda: '', address: '', instagram: '', emergency_contact: '', seller_origin: 'target', cost_center: 'cursos', centro_custo_id: '', is_minor: false, guardian_name: '', guardian_cpf: '', guardian_phone: '' });
          setProofFile(null); setContractFile(null); setRgFile(null); setProfileFile(null);
        } else { alert('Erro ao salvar lead. Por favor, tente novamente.'); }
    } catch (error: any) { 
      console.error('Error adding lead:', error); 
      alert('Erro ao criar lead: ' + (error.message || 'Erro desconhecido no servidor'));
    } finally { setLoading(false); }
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedProduct = products.find((product: any) => product.id === selectedId);
    setFormData((prev: any) => ({
      ...prev,
      product: selectedId,
      value: selectedProduct ? selectedProduct.price.toString() : prev.value,
      taxa_matricula_recebido: selectedProduct?.enrollment_fee ?? undefined,
    }));
  };

  const isServiceProduct = useMemo(() => {
    const p = products.find(p => p.id === formData.product || p.name === formData.product);
    return (p?.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').startsWith('servico');
  }, [formData.product, products]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <ModalHeader onClose={onClose} />
          <form id="new-lead-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
            <BasicInfoSection formData={formData} setFormData={setFormData} fieldErrors={fieldErrors} setFieldErrors={setFieldErrors} duplicateEmailError={duplicateEmailError} />
            <SalesInfoSection 
              formData={formData} 
              setFormData={setFormData} 
              products={filteredProducts} 
              responsibles={vendedores} 
              profiles={profiles}
              getSquadInfoForUser={getSquadInfoForUser}
              centroCustos={centroCustos}
              currentPipelineStages={currentPipelineStages}
              selectedStageId={selectedStageId}
              setSelectedStageId={setSelectedStageId}
              initialStatus={initialStatus} 
              handleProductChange={handleProductChange}
            />
            <DocumentationSection formData={formData} setFormData={setFormData} rgInputRef={rgInputRef} profileInputRef={profileInputRef} rgFile={rgFile} setRgFile={setRgFile} profileFile={profileFile} setProfileFile={setProfileFile} />
            <LossReasonSection isPerdidoStage={isPerdidoStage} motivo_perda={formData.motivo_perda} onChange={(val) => setFormData((prev: any) => ({ ...prev, motivo_perda: val }))} />
            {isGanhoStage && !isServiceProduct && (
              <GanhoConfirmations formData={formData} setFormData={setFormData} proofInputRef={proofInputRef} contractInputRef={contractInputRef} proofFile={proofFile} setProofFile={setProofFile} contractFile={contractFile} setContractFile={setContractFile} isServiceProduct={isServiceProduct} />
            )}
          </form>
          <ModalFooter onClose={onClose} loading={loading} />
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
