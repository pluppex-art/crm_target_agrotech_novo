import React, { useState, useRef, useEffect } from 'react';
import { User, GraduationCap, Briefcase, ChevronDown, Pencil, X, Save, Loader2, Trash2 } from 'lucide-react';
import { useProfileStore } from '../../../store/useProfileStore';
import { useSquadStore } from '../../../store/useSquadStore';
import { parseBRNumber, formatCPFCNPJ } from '../../../lib/utils';
import type { LeadInfoTabProps } from '../types';
import { uploadLeadFile, deleteLeadFile } from '../../../services/leadFilesService';
import { NewActivityModal } from '../../tasks/NewActivityModal';
import { financialCalculator } from '../../../services/financialCalculator';
import { transactionService } from '../../../services/transactionService';
import { CentroCusto } from '../../../types/finance_v2';

import { ProfileHeader } from './lead-info-tab/ProfileHeader';
import { ContractConfirmations } from './lead-info-tab/ContractConfirmations';
import { LeadBasicFields } from './lead-info-tab/LeadBasicFields';
import { LeadDocumentationFields } from './lead-info-tab/LeadDocumentationFields';
import { DiscountSection } from './lead-info-tab/DiscountSection';

const SectionBlock = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
      <Icon size={13} className="text-emerald-500" />
      <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">{title}</h3>
    </div>
    <div className="p-4 space-y-4">{children}</div>
  </div>
);

const ReadField = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</span>
    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 break-words leading-snug">
      {value || <span className="text-slate-300 dark:text-slate-600">—</span>}
    </p>
  </div>
);

export const LeadInfoTab: React.FC<LeadInfoTabProps> = (props) => {
  const {
    lead, formData, products, fieldErrors, whatsappUrl, calculateFinalValue,
    hoverStars, setHoverStars, updateFormField, toggleField, handleSave,
    isSaving, onDelete, showConfirmations, responsibles, canDelete,
    pixCompleted, contractSigned, onPixComplete, onContractSign, onPaymentProofUploaded,
    isCallInProgress, setIsCallInProgress,
  } = props;

  const { profiles } = useProfileStore();
  const { getSquadInfoForUser } = useSquadStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
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

  const handleSaveAndExit = async () => {
    await handleSave();
    setIsEditing(false);
  };

  const squadInfo = getSquadInfoForUser(formData.responsavel_usuario_id || '', formData.responsible || '', profiles);
  const baseValue = parseBRNumber(formData.value);
  const finalVal = calculateFinalValue();
  const hasDiscount = formData.discount_applied && Math.abs(finalVal - baseValue) > 0.01;
  const currentProduct = financialCalculator.findProduct(formData.product, products);
  const isServiceProduct = financialCalculator.isServiceProduct(currentProduct || null);
  const enrollmentFee = currentProduct?.enrollment_fee ?? 0;
  const totalWithFee = finalVal + enrollmentFee;

  // Resolved display values for view mode
  const productName = products.find(p => p.id === formData.product)?.name || formData.product;
  const ccName = centroCustos.find(c => c.id === formData.centro_custo_id)?.nome || formData.cost_center;
  const sellerOriginLabel = formData.seller_origin === 'pluppex' ? 'Pluppex' : 'Target';
  const formattedValue = `R$ ${parseBRNumber(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const formattedFee = enrollmentFee
    ? `R$ ${Number(enrollmentFee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : null;

  return (
    <div className="space-y-4">
      <ProfileHeader
        formData={formData}
        whatsappUrl={whatsappUrl}
        squadInfo={squadInfo}
        hoverStars={hoverStars}
        setHoverStars={setHoverStars}
        handleStarClick={(stars) => toggleField?.('stars', stars)}
        hasDiscount={hasDiscount}
        baseValue={baseValue}
        totalWithFee={totalWithFee}
        leadId={lead.id}
        isCallInProgress={isCallInProgress}
        setIsCallInProgress={setIsCallInProgress}
        onNaoAtendida={() => setShowTaskModal(true)}
      />

      {/* Confirmações sempre em primeiro lugar */}
      {showConfirmations && (
        <ContractConfirmations
          showConfirmations={showConfirmations}
          isServiceProduct={isServiceProduct}
          pixCompleted={pixCompleted}
          onPixComplete={onPixComplete}
          formData={formData}
          updateFormField={updateFormField}
          toggleField={toggleField}
          enrollmentFee={enrollmentFee}
          contractSigned={contractSigned}
          onContractSign={onContractSign}
          proofInputRef={proofInputRef}
          contractInputRef={contractInputRef}
          uploadingProof={uploadingProof}
          setUploadingProof={setUploadingProof}
          uploadingContract={uploadingContract}
          setUploadingContract={setUploadingContract}
          handleFileUpload={handleFileUpload}
          handleDeleteFile={handleDeleteFile}
          ALLOWED_EXT={ALLOWED_EXT}
        />
      )}

      {/* Botão de edição global */}
      {!isEditing && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:border-emerald-400 dark:hover:border-emerald-700 transition-all text-[11px] font-bold uppercase tracking-wider"
          >
            <Pencil size={12} />
            Editar informações
          </button>
        </div>
      )}

      {isEditing && (
        <div className="flex items-center justify-between gap-2 px-1 py-1 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 pl-2">
            <Pencil size={11} />
            Modo edição
          </span>
          <div className="flex items-center gap-1.5">
            {canDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all text-[10px] font-bold uppercase tracking-wider"
              >
                <Trash2 size={11} /> Excluir
              </button>
            )}
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              <X size={11} /> Cancelar
            </button>
            <button
              onClick={handleSaveAndExit}
              disabled={isSaving}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Block 1: Dados do Cliente */}
      <SectionBlock title="Dados do Cliente" icon={User}>
        {isEditing ? (
          <>
            <LeadBasicFields
              formData={formData}
              updateFormField={updateFormField}
              fieldErrors={fieldErrors}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cidade</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateFormField({ city: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPF Principal (para NF)</label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => updateFormField({ cnpj: formatCPFCNPJ(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <ReadField label="Nome" value={formData.name} />
            <ReadField label="Telefone" value={formData.phone} />
            <ReadField label="E-mail" value={formData.email} />
            <ReadField label="Cidade" value={formData.city} />
            {formData.cnpj && <ReadField label="CPF / CNPJ" value={formData.cnpj} />}
          </div>
        )}
      </SectionBlock>

      {/* Block 2: Produto / Turma */}
      <SectionBlock title="Produto / Turma" icon={GraduationCap}>
        {isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produto</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={formData.product || ''}
                    onChange={(e) => {
                      const selectedProduct = products.find((p) => p.id === e.target.value);
                      updateFormField({
                        product: e.target.value,
                        value: selectedProduct ? selectedProduct.price.toString() : formData.value,
                      });
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {formData.product && !products.find((p) => p.id === formData.product) && (
                      <option value={formData.product}>{formData.product} (Nome antigo)</option>
                    )}
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor (R$)</label>
                <input
                  type="text"
                  value={parseBRNumber(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium shadow-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
                {currentProduct?.enrollment_fee ? (
                  <div className="flex items-center gap-1.5 mt-0.5 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxa de matrícula:</span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      R$ {Number(currentProduct.enrollment_fee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <LeadDocumentationFields
              formData={formData}
              updateFormField={updateFormField}
              rgInputRef={rgInputRef}
              profileInputRef={profileInputRef}
              uploadingRG={uploadingRG}
              setUploadingRG={setUploadingRG}
              uploadingProfile={uploadingProfile}
              setUploadingProfile={setUploadingProfile}
              handleFileUpload={handleFileUpload}
              handleDeleteFile={handleDeleteFile}
              ALLOWED_EXT={ALLOWED_EXT}
            />

            <DiscountSection
              formData={formData}
              updateFormField={updateFormField}
              toggleField={toggleField}
              lead={lead}
            />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <ReadField label="Produto" value={productName} />
            <ReadField label="Valor" value={formattedValue} />
            {formattedFee && <ReadField label="Taxa de Matrícula" value={formattedFee} />}
            {hasDiscount && (
              <ReadField
                label="Desconto aplicado"
                value={`R$ ${Math.abs(finalVal - baseValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
            )}
          </div>
        )}
      </SectionBlock>

      {/* Block 3: Responsável / Vendedor */}
      <SectionBlock title="Responsável / Vendedor" icon={Briefcase}>
        {isEditing ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Closer Responsável</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={formData.responsavel_usuario_id || ''}
                  onChange={(e) => {
                    const r = (responsibles ?? []).find((r) => r.id === e.target.value);
                    updateFormField({
                      responsible: r?.name ?? e.target.value,
                      responsavel_usuario_id: e.target.value || null,
                    });
                  }}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {responsibles?.map((r) => {
                    const info = getSquadInfoForUser(r.id, r.name, profiles);
                    return <option key={r.id} value={r.id}>{r.name} [{info.name}]</option>;
                  })}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Origem do Vendedor</label>
                <div className="relative">
                  <select
                    value={formData.seller_origin || 'target'}
                    onChange={(e) => updateFormField({ seller_origin: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                  >
                    <option value="target">Target</option>
                    <option value="pluppex">Pluppex</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Centro de Custo</label>
                <div className="relative">
                  <select
                    value={formData.centro_custo_id || ''}
                    onChange={(e) => {
                      const cc = centroCustos.find((c) => c.id === e.target.value);
                      const ccId = e.target.value || null;
                      updateFormField({ centro_custo_id: ccId, cost_center: cc?.nome || formData.cost_center });
                      toggleField?.('centro_custo_id', ccId);
                      if (cc) toggleField?.('cost_center', cc.nome);
                    }}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {centroCustos.map((cc) => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>
            </div>

            {formData.isPerdidoStage && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivo da Perda</label>
                <select
                  value={formData.motivo_perda || ''}
                  onChange={(e) => updateFormField({ motivo_perda: e.target.value || null })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {['Preço alto', 'Concorrência', 'Orçamento insuficiente', 'Não atende necessidades', 'Outros'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <ReadField label="Closer" value={formData.responsible} />
            <ReadField label="Origem" value={sellerOriginLabel} />
            {ccName && <ReadField label="Centro de Custo" value={ccName} />}
            {formData.isPerdidoStage && formData.motivo_perda && (
              <ReadField label="Motivo da Perda" value={formData.motivo_perda} />
            )}
          </div>
        )}
      </SectionBlock>

      <NewActivityModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        leadId={lead.id}
        leadName={formData.name}
      />
    </div>
  );
};
