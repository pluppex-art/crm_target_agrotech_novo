import { useState, useEffect, useCallback } from 'react';
import { supabaseService } from '../services/supabaseService';
import { useLeadStore } from '../store/useLeadStore';
import { usePipelineStore } from '../store/usePipelineStore';
import type { Lead } from '../types/leads';
import { parseBRNumber, getLeadEffectiveValue } from '../lib/utils';

interface UseLeadFormProps {
  lead: Lead;
  onClose: () => void;
}

export const useLeadForm = ({ lead, onClose }: UseLeadFormProps) => {
  const [formData, setFormData] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    product: lead.product,
    value: lead.value.toString(),
    city: lead.city || '',
    cnpj: lead.cnpj || '',
    responsible: lead.responsible || '',
    stars: lead.stars || 0,
    photo: lead.photo || '',
    discount_applied: lead.discount_applied ?? !!lead.discount,
    discount: lead.discount || '',
    discount_type: lead.discount_type || 'percent',
    pix_completed: lead.pix_completed || false,
    contract_signed: lead.contract_signed || false,
    valor_recebido: lead.valor_recebido ?? null,
    forma_pagamento: lead.forma_pagamento || '',
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
      product: lead.product,
      value: lead.value.toString(),
      city: lead.city || '',
      cnpj: lead.cnpj || '',
      responsible: lead.responsible || '',
      stars: lead.stars || 0,
      photo: lead.photo || '',
      discount_applied: lead.discount_applied ?? !!lead.discount,
      discount: lead.discount || '',
      discount_type: lead.discount_type || 'percent',
      pix_completed: lead.pix_completed || false,
      contract_signed: lead.contract_signed || false,
      valor_recebido: lead.valor_recebido ?? null,
      forma_pagamento: lead.forma_pagamento || '',
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

      if (
        prev.pix_completed !== incomingPix ||
        prev.contract_signed !== incomingContract ||
        prev.value !== incomingValue ||
        prev.discount_applied !== incomingDiscountApplied
      ) {
        return {
          ...prev,
          pix_completed: incomingPix,
          contract_signed: incomingContract,
          discount_applied: incomingDiscountApplied,
          discount: lead.discount || prev.discount,
          discount_type: lead.discount_type || prev.discount_type,
          value: incomingValue,
        };
      }
      return prev;
    });
  }, [lead]);

  const calculateFinalValue = useCallback(() => {
    return getLeadEffectiveValue(formData);
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
        excludeId: lead.id,
      });
      if (dupes.phone || dupes.email) {
        setFieldErrors({
          phone: dupes.phone ? 'Telefone já cadastrado' : undefined,
          email: dupes.email ? 'E-mail já cadastrado' : undefined,
        });
        return;
      }

      const updateData: Partial<Lead> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        product: formData.product,
        value: parseBRNumber(formData.value),
        city: formData.city,
        cnpj: formData.cnpj,
        responsible: formData.responsible,
        stars: formData.stars,
        discount: formData.discount,
        discount_type: formData.discount_type,
        discount_applied: formData.discount_applied,
        pix_completed: formData.pix_completed,
        contract_signed: formData.contract_signed,
        valor_recebido: formData.valor_recebido ?? undefined,
        forma_pagamento: formData.forma_pagamento || undefined,
      };


      const { updateLead } = useLeadStore.getState();
      const success = await updateLead(lead.id, updateData);
      
      if (success) {
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
  }, [formData, lead.id, onClose]);

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
    }
  };
};
