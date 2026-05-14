import { useState, useEffect, useCallback } from 'react';
import { supabaseService } from '../services/supabaseService';
import { useLeadStore } from '../store/useLeadStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { useProductStore } from '../store/useProductStore';
import { turmaService } from '../services/turmaService';
import { financialCalculator } from '../services/financialCalculator';
import { notifyLeadAssignment } from '../services/leadNotificationService';
import { useProfileStore } from '../store/useProfileStore';
import { noteService } from '../services/noteService';
import { useAuthStore } from '../store/useAuthStore';
import type { Lead } from '../types/leads';
import { getLeadEffectiveValue, parseBRNumber } from '../lib/utils';

interface UseLeadFormProps {
  lead: Lead;
  onClose: () => void;
}

const VALUE_AFFECTING_FIELDS = new Set(['value', 'discount', 'discount_applied', 'discount_type', 'product']);

export const useLeadForm = ({ lead, onClose }: UseLeadFormProps) => {
  const { products } = useProductStore();

  const [formData, setFormData] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    product: lead.product || '',
    value: lead.value.toString(),
    city: lead.city || '',
    cnpj: lead.cnpj || '',
    responsible: lead.responsible || '',
    responsavel_usuario_id: lead.responsavel_usuario_id || null,
    stars: lead.stars || 0,
    photo: lead.photo || '',
    discount_applied: lead.discount_applied ?? !!lead.discount,
    discount: lead.discount || '',
    discount_type: lead.discount_type || 'percent',
    pix_completed: lead.pix_completed || false,
    contract_signed: lead.contract_signed || false,
    valor_recebido: lead.valor_recebido ?? null,
    forma_pagamento: lead.forma_pagamento || '',
    taxa_matricula_recebido: lead.taxa_matricula_recebido ?? null,
    taxa_matricula_paid_at: lead.taxa_matricula_paid_at || null,
    valor_recebido_paid_at: lead.valor_recebido_paid_at || null,
    motivo_perda: lead.motivo_perda || '',
    // Attachments
    payment_proof_url: lead.payment_proof_url ?? null,
    contract_url: lead.contract_url ?? null,
    professor_proof_url: lead.professor_proof_url ?? null,
    address: lead.address || '',
    instagram: lead.instagram || '',
    emergency_contact: lead.emergency_contact || '',
    rg_photo_url: lead.rg_photo_url || null,
    profile_photo_url: lead.profile_photo_url || null,
    seller_origin: lead.seller_origin || 'target',
    cost_center: lead.cost_center || 'cursos',
    centro_custo_id: lead.centro_custo_id || null,
    is_minor: lead.is_minor || false,
    guardian_name: lead.guardian_name || '',
    guardian_cpf: lead.guardian_cpf || '',
    guardian_phone: lead.guardian_phone || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [hoverStars, setHoverStars] = useState(0);

  // Only reset strings/text when a DIFFERENT lead is opened (compare by id)
  useEffect(() => {
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      product: lead.product || '',
      value: lead.value.toString(),
      city: lead.city || '',
      cnpj: lead.cnpj || '',
      responsible: lead.responsible || '',
      responsavel_usuario_id: lead.responsavel_usuario_id || null,
      stars: lead.stars || 0,
      photo: lead.photo || '',
      discount_applied: lead.discount_applied ?? !!lead.discount,
      discount: lead.discount || '',
      discount_type: lead.discount_type || 'percent',
      pix_completed: lead.pix_completed || false,
      contract_signed: lead.contract_signed || false,
      valor_recebido: lead.valor_recebido ?? null,
      forma_pagamento: lead.forma_pagamento || '',
      taxa_matricula_recebido: lead.taxa_matricula_recebido ?? null,
      taxa_matricula_paid_at: lead.taxa_matricula_paid_at || null,
      valor_recebido_paid_at: lead.valor_recebido_paid_at || null,
      motivo_perda: lead.motivo_perda || '',
      // Attachments
      payment_proof_url: lead.payment_proof_url ?? null,
      contract_url: lead.contract_url ?? null,
      professor_proof_url: lead.professor_proof_url ?? null,
      address: lead.address || '',
      instagram: lead.instagram || '',
      emergency_contact: lead.emergency_contact || '',
      rg_photo_url: lead.rg_photo_url || null,
      profile_photo_url: lead.profile_photo_url || null,
      seller_origin: lead.seller_origin || 'target',
      cost_center: lead.cost_center || 'cursos',
      centro_custo_id: lead.centro_custo_id || null,
      is_minor: lead.is_minor || false,
      guardian_name: lead.guardian_name || '',
      guardian_cpf: lead.guardian_cpf || '',
      guardian_phone: lead.guardian_phone || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);


  // Sync specific real-time changes (toggles, values) from external sources without blowing away local typing
  useEffect(() => {
    setFormData(prev => {
      const incomingPix = lead.pix_completed || false;
      const incomingContract = lead.contract_signed || false;
      const incomingDiscountApplied = lead.discount_applied ?? !!lead.discount;
      const incomingValue = lead.value.toString();
      const incomingProof = lead.payment_proof_url ?? null;
      const incomingContractUrl = lead.contract_url ?? null;
      const incomingProfProof = lead.professor_proof_url ?? null;
      const incomingValorRecebido = lead.valor_recebido ?? null;
      const incomingTaxaMatricula = lead.taxa_matricula_recebido ?? null;

      if (
        prev.pix_completed !== incomingPix ||
        prev.contract_signed !== incomingContract ||
        prev.value !== incomingValue ||
        prev.discount_applied !== incomingDiscountApplied ||
        prev.payment_proof_url !== incomingProof ||
        prev.contract_url !== incomingContractUrl ||
        prev.professor_proof_url !== incomingProfProof ||
        prev.valor_recebido !== incomingValorRecebido ||
        prev.taxa_matricula_recebido !== incomingTaxaMatricula
      ) {
        return {
          ...prev,
          pix_completed: incomingPix,
          contract_signed: incomingContract,
          discount_applied: incomingDiscountApplied,
          discount: lead.discount || prev.discount,
          discount_type: lead.discount_type || prev.discount_type,
          value: incomingValue,
          payment_proof_url: incomingProof,
          contract_url: incomingContractUrl,
          professor_proof_url: incomingProfProof,
          valor_recebido: incomingValorRecebido,
          taxa_matricula_recebido: incomingTaxaMatricula,
        };
      }
      return prev;
    });
  }, [lead]);

  const calculateFinalValue = useCallback(() => {
    return financialCalculator.getEffectiveValue(formData);
  }, [formData.value, formData.discount, formData.discount_type, formData.discount_applied]);

  const handleSave = useCallback(async () => {
    const errors: { name?: string; phone?: string; email?: string } = {};
    if (!formData.name.trim()) errors.name = 'Campo obrigatório';
    if (!formData.phone.trim()) errors.phone = 'Campo obrigatório';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSaving(true);
    try {
      const dupes = await supabaseService.checkDuplicateLead({
        phone: formData.phone,
        email: formData.email,
        cnpj: formData.cnpj,
        excludeId: lead.id,
      });
      if (dupes.phone || dupes.email || dupes.cnpj) {
        setFieldErrors({
          phone: dupes.phone ? 'Telefone já cadastrado' : undefined,
          email: dupes.email ? 'E-mail já cadastrado' : undefined,
        });
        
        if (dupes.cnpj) alert('Já existe um lead cadastrado com este CPF/CNPJ.');
        
        setIsSaving(false);
        return;
      }

      // D03: Validação de valor para estágios qualificados ou além
      const numericValue = parseBRNumber(formData.value);
      if (lead.status !== 'new' && numericValue <= 0) {
        alert('Leads em etapas qualificadas ou além devem ter um valor definido maior que R$ 0.');
        setIsSaving(false);
        return;
      }

      const responsibleChanged =
        formData.responsible &&
        formData.responsible !== lead.responsible;

      const updateData: Partial<Lead> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        product: formData.product,
        value: parseBRNumber(formData.value),
        city: formData.city,
        cnpj: formData.cnpj,
        responsible: formData.responsible,
        responsavel_usuario_id: formData.responsavel_usuario_id,
        stars: formData.stars,
        discount: formData.discount,
        discount_type: formData.discount_type,
        discount_applied: formData.discount_applied,
        pix_completed: formData.pix_completed,
        contract_signed: formData.contract_signed,
        valor_recebido: formData.valor_recebido ?? undefined,
        forma_pagamento: formData.forma_pagamento || undefined,
        taxa_matricula_recebido: formData.taxa_matricula_recebido ?? undefined,
        taxa_matricula_paid_at: formData.taxa_matricula_paid_at || undefined,
        valor_recebido_paid_at: formData.valor_recebido_paid_at || undefined,
        payment_proof_url: formData.payment_proof_url || undefined,
        contract_url: formData.contract_url || undefined,
        professor_proof_url: formData.professor_proof_url ?? undefined,
        address: formData.address || undefined,
        instagram: formData.instagram || undefined,
        emergency_contact: formData.emergency_contact || undefined,
        rg_photo_url: formData.rg_photo_url || undefined,
        profile_photo_url: formData.profile_photo_url || undefined,
        seller_origin: formData.seller_origin as any,
        cost_center: formData.cost_center as any,
        centro_custo_id: formData.centro_custo_id,
        is_minor: formData.is_minor,
        guardian_name: formData.is_minor ? formData.guardian_name : null,
        guardian_cpf: formData.is_minor ? formData.guardian_cpf : null,
        guardian_phone: formData.is_minor ? formData.guardian_phone : null,
      };

      const { updateLead } = useLeadStore.getState();
      const success = await updateLead(lead.id, updateData);

      if (success) {
        if (responsibleChanged) {
          const { profiles } = useProfileStore.getState();
          const { user } = useAuthStore.getState();
          const currentUserProfile = profiles.find(p => p.id === user?.id);
          const currentUserName = currentUserProfile?.name || user?.email || 'Sistema';

          // 1. Criar Nota de Transferência
          await noteService.createNote({
            lead_id: lead.id,
            author_id: user?.id ?? '',
            content: `📢 Transferência: ${currentUserName} transferiu este lead para ${formData.responsible}`,
            author_name: currentUserName,
          });

          // 2. Notificar Novo Responsável
          notifyLeadAssignment(lead, formData.responsible, profiles);
        }
        const enrollmentFee = financialCalculator.getEnrollmentFee(formData.product, products);
        const vendas = getLeadEffectiveValue(formData) + enrollmentFee;
        turmaService.updateAttendeeVendas(lead.id, vendas);
        onClose();
      } else {
        alert('Erro ao salvar alterações no banco de dados.');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Erro inesperado ao salvar.');
    } finally {
      setIsSaving(false);
    }
  }, [formData, lead.id, lead.responsible, products, onClose]);

  const updateFormField = useCallback((updates: any) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const whatsappUrl = lead.phone
    ? `https://wa.me/55${lead.phone.replace(/\D/g, '')}`
    : null;

  return {
    formData,
    isSaving,
    fieldErrors,
    hoverStars,
    whatsappUrl,
    calculateFinalValue,
    setHoverStars,
    updateFormField,
    handleSave,
    toggleField: async (field: string, value: any) => {
      // 1. Prepare updates
      const updates: any = { [field]: value };

      // If we are turning OFF the discount, clear the values
      if (field === 'discount_applied' && value === false) {
        updates.discount = '';
        updates.discount_type = 'percent';
      }

      // 2. Update local state
      updateFormField(updates);

      // 3. Immediate save to DB
      const { updateLead } = useLeadStore.getState();
      await updateLead(lead.id, updates);

      if (VALUE_AFFECTING_FIELDS.has(field)) {
        const merged = { ...formData, ...updates };
        const { products } = useProductStore.getState();
        const vendas = financialCalculator.getTotalContracted(merged, products);
        turmaService.updateAttendeeVendas(lead.id, vendas);
      }
    }
  };
};
