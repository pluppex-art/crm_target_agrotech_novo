import React, { useState, useRef, useEffect } from 'react';
import { useProfileStore } from '../../../store/useProfileStore';
import { useSquadStore } from '../../../store/useSquadStore';
import { useCallCounter } from '../../../hooks/useCallCounter';
import { parseBRNumber } from '../../../lib/utils';
import type { LeadInfoTabProps } from '../types';
import { uploadLeadFile, deleteLeadFile } from '../../../services/leadFilesService';
import { financialCalculator } from '../../../services/financialCalculator';
import { transactionService } from '../../../services/transactionService';
import { CentroCusto } from '../../../types/finance_v2';

// Sub-components
import { ProfileHeader } from './lead-info-tab/ProfileHeader';
import { ContractConfirmations } from './lead-info-tab/ContractConfirmations';
import { LeadBasicFields } from './lead-info-tab/LeadBasicFields';
import { LeadSalesFields } from './lead-info-tab/LeadSalesFields';
import { LeadDocumentationFields } from './lead-info-tab/LeadDocumentationFields';
import { DiscountSection } from './lead-info-tab/DiscountSection';
import { ActionButtons } from './lead-info-tab/ActionButtons';

export const LeadInfoTab: React.FC<LeadInfoTabProps> = (props) => {
  const {
    lead, formData, products, fieldErrors, whatsappUrl, calculateFinalValue,
    hoverStars, setHoverStars, updateFormField, toggleField, handleSave,
    isSaving, onDelete, onCancel, showConfirmations, responsibles,
    pixCompleted, contractSigned, onPixComplete, onContractSign, onPaymentProofUploaded,
  } = props;

  const { profiles } = useProfileStore();
  const { getSquadInfoForUser } = useSquadStore();
  const { todayCount, logCall, removeLastCall, logging } = useCallCounter(lead?.id ?? '');

  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [uploadingRG, setUploadingRG] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const rgInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [centroCustos, setCentroCustos] = useState<CentroCusto[]>([]);

  useEffect(() => { transactionService.getCentroCustos().then(setCentroCustos); }, []);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  const ALLOWED_EXT = '.jpg,.jpeg,.png,.pdf';

  const handleFileUpload = async (file: File, fileType: string, setLoading: (v: boolean) => void) => {
    if (!ALLOWED_TYPES.includes(file.type)) { alert('Formato inválido'); return; }
    setLoading(true);
    try {
      const url = await uploadLeadFile(lead.id, fileType as any, file);
      if (url) {
        const field = fileType === 'payment_proof' ? 'payment_proof_url' : fileType === 'contract' ? 'contract_url' : fileType === 'rg_photo' ? 'rg_photo_url' : 'profile_photo_url';
        updateFormField({ [field]: url });
        await toggleField?.(field, url);
        if (fileType === 'payment_proof') await onPaymentProofUploaded?.();
      }
    } finally { setLoading(false); }
  };

  const handleDeleteFile = async (fileType: string) => {
    const field = fileType === 'payment_proof' ? 'payment_proof_url' : fileType === 'contract' ? 'contract_url' : fileType === 'rg_photo' ? 'rg_photo_url' : 'profile_photo_url';
    const url = formData[field];
    if (!url || !confirm('Remover arquivo?')) return;
    await deleteLeadFile(url);
    updateFormField({ [field]: null });
    await toggleField?.(field, null);
  };

  const squadInfo = getSquadInfoForUser(formData.responsavel_usuario_id || '', formData.responsible || '', profiles);
  const baseValue = parseBRNumber(formData.value);
  const finalVal = calculateFinalValue();
  const hasDiscount = formData.discount_applied && Math.abs(finalVal - baseValue) > 0.01;
  const currentProduct = financialCalculator.findProduct(formData.product, products);
  const isServiceProduct = financialCalculator.isServiceProduct(currentProduct || null);
  const enrollmentFee = currentProduct?.enrollment_fee ?? 0;
  const totalWithFee = finalVal + enrollmentFee;

  return (
    <div className="space-y-6">
      <ProfileHeader formData={formData} whatsappUrl={whatsappUrl} squadInfo={squadInfo} hoverStars={hoverStars} setHoverStars={setHoverStars} handleStarClick={(stars) => updateFormField({ stars })} hasDiscount={hasDiscount} baseValue={baseValue} totalWithFee={totalWithFee} />
      
      <ContractConfirmations showConfirmations={showConfirmations} isServiceProduct={isServiceProduct} pixCompleted={pixCompleted} onPixComplete={onPixComplete} formData={formData} updateFormField={updateFormField} toggleField={toggleField} enrollmentFee={enrollmentFee} contractSigned={contractSigned} onContractSign={onContractSign} logCall={logCall} removeLastCall={removeLastCall} logging={logging} todayCount={todayCount} proofInputRef={proofInputRef} contractInputRef={contractInputRef} uploadingProof={uploadingProof} setUploadingProof={setUploadingProof} uploadingContract={uploadingContract} setUploadingContract={setUploadingContract} handleFileUpload={handleFileUpload} handleDeleteFile={handleDeleteFile} ALLOWED_EXT={ALLOWED_EXT} />

      <LeadBasicFields formData={formData} updateFormField={updateFormField} fieldErrors={fieldErrors} />

      <LeadSalesFields formData={formData} updateFormField={updateFormField} toggleField={toggleField} responsibles={responsibles} getSquadInfoForUser={getSquadInfoForUser} profiles={profiles} products={products} centroCustos={centroCustos} currentProduct={currentProduct} />

      <LeadDocumentationFields formData={formData} updateFormField={updateFormField} rgInputRef={rgInputRef} profileInputRef={profileInputRef} uploadingRG={uploadingRG} setUploadingRG={setUploadingRG} uploadingProfile={uploadingProfile} setUploadingProfile={setUploadingProfile} handleFileUpload={handleFileUpload} handleDeleteFile={handleDeleteFile} ALLOWED_EXT={ALLOWED_EXT} />

      <DiscountSection formData={formData} updateFormField={updateFormField} toggleField={toggleField} lead={lead} />

      {formData.isPerdidoStage && (
        <div className="space-y-1.5 px-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivo da Perda</label>
          <select value={formData.motivo_perda || ''} onChange={(e) => updateFormField({ motivo_perda: e.target.value || null })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm cursor-pointer">
            <option value="">Selecione...</option>
            {['Preço alto', 'Concorrência', 'Orçamento insuficiente', 'Não atende necessidades', 'Outros'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      <ActionButtons onDelete={onDelete} onCancel={onCancel} handleSave={handleSave} isSaving={isSaving} />
    </div>
  );
};
