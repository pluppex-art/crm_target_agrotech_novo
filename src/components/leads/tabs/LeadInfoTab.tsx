import React, { useState } from 'react';
import { Phone, AlertCircle, Star, CheckSquare, Trash2, Loader2, Save, Percent, DollarSign, ClipboardCheck, QrCode, User, GraduationCap, ChevronDown } from 'lucide-react';
import { computeFaixa, getFaixaIcon } from '@/lib/utils';
import { cn, parseBRNumber, formatCPFCNPJ } from '../../../lib/utils';
import type { LeadInfoTabProps } from '../types';

export const LeadInfoTab: React.FC<LeadInfoTabProps> = ({
  lead,
  formData,
  products,
  fieldErrors,
  whatsappUrl,
  calculateFinalValue,
  hoverStars,
  setHoverStars,
  updateFormField,
  toggleField,
  handleSave,
  isSaving,
  onDelete,
  onCancel,
  showConfirmations,
  responsibles,
  pixCompleted,
  contractSigned,
  onPixComplete,
  onContractSign,
}) => {
  const handleStarClick = (stars: number) => {
    updateFormField({ stars });
  };

const [valorRecebidoOpen, setValorRecebidoOpen] = useState(
    formData.valor_recebido != null || !!formData.forma_pagamento
  );

  const baseValue = parseBRNumber(formData.value);
  const finalValue = calculateFinalValue();
  const hasDiscount = formData.discount_applied && Math.abs(finalValue - baseValue) > 0.01;

  const currentProduct = products.find(p => p.name === formData.product);
  const isServiceProduct = (currentProduct?.category || '').toLowerCase().startsWith('serviço') || (currentProduct?.category || '').toLowerCase().startsWith('servico');

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
        <img
          src={formData.photo || '/placeholder-avatar.jpg'}
          alt={formData.name}
          className="w-14 h-14 rounded-full object-cover border-4 border-white shadow-sm shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 truncate">{formData.name}</h3>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-green-50 border border-green-200 rounded-lg text-green-600 hover:bg-green-100 transition-colors shrink-0"
                title="Abrir WhatsApp"
              >
                <Phone size={13} />
              </a>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => handleStarClick(i)}
                onMouseEnter={() => setHoverStars(i)}
                onMouseLeave={() => setHoverStars(0)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  size={14}
                  className={cn(
                    "transition-colors",
                    i <= (hoverStars || formData.stars) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
          <div className="flex flex-col items-end justify-center min-h-[32px]">
            {/* Always reserve space for base value if discount is applied, otherwise hide it but keep DOM stable */}
            <span 
              className={cn(
                "text-xs font-bold text-slate-400 line-through transition-all duration-200",
                hasDiscount ? "opacity-100 h-auto" : "opacity-0 h-0 overflow-hidden"
              )}
            >
              R$ {baseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className={cn(
              "font-bold text-emerald-600 transition-all duration-200",
              hasDiscount ? "text-sm leading-tight" : "text-base leading-normal"
            )}>
              R$ {finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
            <span className="text-xs text-slate-400">· {formData.cnpj ? formatCPFCNPJ(formData.cnpj) : 'Sem CPF/CNPJ'}</span>
          </div>
        </div>
      </div>

      {/* Contract Stage Checkboxes */}
      {showConfirmations && !isServiceProduct && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardCheck size={13} /> Confirmações para avançar para Ganho
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-3 cursor-pointer group shrink-0">
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={pixCompleted ?? false}
                  onChange={(e) => onPixComplete?.(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={cn(
                  "w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center",
                  pixCompleted ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-300"
                )}>
                  {pixCompleted && <CheckSquare size={12} className="text-white" />}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <QrCode size={15} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">PIX realizado</span>
              </div>
            </label>
            <div className="flex-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.taxa_matricula_recebido ?? ''}
                onChange={(e) => updateFormField({ taxa_matricula_recebido: e.target.value ? parseFloat(e.target.value) : null })}
                onBlur={(e) => toggleField?.('taxa_matricula_recebido', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Taxa matrícula R$"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-medium shadow-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative shrink-0">
              <input
                type="checkbox"
                checked={contractSigned ?? false}
                onChange={(e) => onContractSign?.(e.target.checked)}
                className="sr-only peer"
              />
              <div className={cn(
                "w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center",
                contractSigned ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-300"
              )}>
                {contractSigned && <CheckSquare size={12} className="text-white" />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardCheck size={15} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Contrato assinado</span>
            </div>
          </label>
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 gap-5">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormField({ name: e.target.value })}
            className={cn(
              "w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm",
              fieldErrors?.name ? "border-red-400 bg-red-50" : "border-slate-200"
            )}
          />
          {fieldErrors?.name && (
            <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
              <AlertCircle size={12} /> {fieldErrors.name}
            </p>
          )}
        </div>

        {/* Phone + Email */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Telefone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => updateFormField({ phone: e.target.value })}
                className={cn(
                  "w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium pr-10 shadow-sm",
                  fieldErrors?.phone ? "border-red-400 bg-red-50" : "border-slate-200"
                )}
              />
              <Phone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
            </div>
            {fieldErrors?.phone && (
              <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertCircle size={12} /> {fieldErrors.phone}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateFormField({ email: e.target.value })}
              className={cn(
                "w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm",
                fieldErrors?.email ? "border-red-400 bg-red-50" : "border-slate-200"
              )}
            />
            {fieldErrors?.email && (
              <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertCircle size={12} /> {fieldErrors.email}
              </p>
            )}
          </div>
        </div>

        {/* Responsible */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsável</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={formData.responsible}
              onChange={(e) => updateFormField({ responsible: e.target.value })}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
            >
              <option value="">Selecione...</option>
              {/* Always include the lead's current responsible even if not in list yet */}
              {formData.responsible && !(responsibles ?? []).includes(formData.responsible) && (
                <option value={formData.responsible}>{formData.responsible}</option>
              )}
              {responsibles?.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>

        {/* Product + Value */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produto</label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={formData.product}
                onChange={(e) => {
                  const selected = products.find(p => p.name === e.target.value);
                  updateFormField({
                    product: e.target.value,
                    value: selected ? selected.price.toString() : formData.value,
                  });
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
              >
                <option value="">Selecione...</option>
                {products.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
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
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium shadow-sm text-slate-500 cursor-not-allowed"
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

        {/* City + CPF/CNPJ */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cidade</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => updateFormField({ city: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPF/CNPJ</label>
            <input
              type="text"
              value={formData.cnpj}
              onChange={(e) => updateFormField({ cnpj: formatCPFCNPJ(e.target.value) })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
            />
          </div>
        </div>

        {/* Discount */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.discount_applied}
                  onChange={(e) => updateFormField({ discount_applied: e.target.checked })}
                  className="sr-only peer"
                />
              <div className={cn(
                "w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center",
                formData.discount_applied ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-200"
              )}>
                {formData.discount_applied && <CheckSquare size={12} className="text-white" />}
              </div>
            </div>
            <span className="text-sm font-bold text-slate-700">Aplicar desconto?</span>
          </label>

          <div className={cn(
            "flex items-center gap-2 pl-1 transition-all duration-300",
            formData.discount_applied ? "opacity-100 max-h-[100px]" : "opacity-0 max-h-0 overflow-hidden"
          )}>
            <div className="flex rounded-xl overflow-hidden border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => updateFormField({ discount_type: 'percent' })}
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
                onClick={() => updateFormField({ discount_type: 'money' })}
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
              value={formData.discount}
              onChange={(e) => {
                const val = e.target.value;
                updateFormField({ discount: val });
                // If not applied yet, turn it on automatically
                if (!formData.discount_applied && val.trim() !== '') {
                  toggleField?.('discount_applied', true);
                }
              }}
              onBlur={() => {
                 // Save the value when user leaves the field
                 if (formData.discount !== lead.discount) {
                   toggleField?.('discount', formData.discount);
                 }
              }}
              placeholder={formData.discount_type === 'percent' ? "Ex: 10" : "Ex: 500,00"}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
            />
          </div>
        </div>

        {/* Valor Recebido toggle */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <div className="relative">
              <input
                type="checkbox"
                checked={valorRecebidoOpen}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setValorRecebidoOpen(checked);
                  if (!checked) {
                    updateFormField({ valor_recebido: null, forma_pagamento: '' });
                    toggleField?.('valor_recebido', null);
                    toggleField?.('forma_pagamento', '');
                  }
                }}
                className="sr-only"
              />
              <div className={cn(
                "w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center",
                valorRecebidoOpen ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-200"
              )}>
                {valorRecebidoOpen && <CheckSquare size={12} className="text-white" />}
              </div>
            </div>
            <span className="text-sm font-bold text-slate-700">Valor recebido?</span>
          </label>

          <div className={cn(
            "grid grid-cols-2 gap-4 transition-all duration-300",
            valorRecebidoOpen ? "opacity-100 max-h-[200px]" : "opacity-0 max-h-0 overflow-hidden"
          )}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Recebido (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_recebido ?? ''}
                onChange={(e) => updateFormField({ valor_recebido: e.target.value ? parseFloat(e.target.value) : null })}
                onBlur={(e) => toggleField?.('valor_recebido', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0,00"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Forma de Pagamento</label>
              <select
                value={formData.forma_pagamento || ''}
                onChange={(e) => { updateFormField({ forma_pagamento: e.target.value }); toggleField?.('forma_pagamento', e.target.value); }}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="PIX">PIX</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Boleto Bancário">Boleto Bancário</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Transferência Bancária">Transferência Bancária</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
        </div>

        {/* Semáforo Commission - NEW */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.margem_percent != null}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateFormField({ margem_percent: 0 });
                  } else {
                    updateFormField({ margem_percent: null, faixa_comissao: null, motivo_perda: '' });
                  }
                }}
                className="sr-only"
              />
              <div className={cn(
                "w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center",
                formData.margem_percent != null ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-200"
              )}>
                {formData.margem_percent != null && <CheckSquare size={12} className="text-white" />}
              </div>
            </div>
            <span className="text-sm font-bold text-slate-700">Margem de Comissão</span>
          </label>

          <div className={cn(
            "transition-all duration-300",
            formData.margem_percent != null ? "opacity-100 max-h-[100px]" : "opacity-0 max-h-0 overflow-hidden"
          )}>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs block font-bold text-slate-400 uppercase tracking-wider mb-1.5">Margem (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.margem_percent ?? ''}
                  onChange={(e) => updateFormField({ margem_percent: parseFloat(e.target.value) || null })}
                  onBlur={() => {
                    const faixa = computeFaixa(formData.margem_percent ?? null);
                    updateFormField({ faixa_comissao: faixa || null });
                  }}
                  placeholder="Ex: 15.5"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
                />
              </div>
              <div className="flex items-center justify-center w-16 h-16 bg-slate-50 border-2 border-slate-200 rounded-2xl shrink-0">
                <span className="text-2xl">
                  {getFaixaIcon(formData.faixa_comissao ?? computeFaixa(formData.margem_percent ?? null))}
                </span>
              </div>
            </div>
            {formData.isPerdidoStage && (
              <div className="mt-3">
                <label className="text-xs block font-bold text-slate-400 uppercase tracking-wider mb-1.5">Motivo da Perda</label>
                <select
                  value={formData.motivo_perda || ''}
                  onChange={(e) => updateFormField({ motivo_perda: e.target.value || null })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  <option value="Preço alto">Preço alto</option>
                  <option value="Concorrência">Concorrência</option>
                  <option value="Orçamento insuficiente">Orçamento insuficiente</option>
                  <option value="Não atende necessidades">Não atende necessidades</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          onClick={onDelete}
          className="p-2.5 bg-white text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 flex items-center justify-center shrink-0"
          title="Excluir Lead"
        >
          <Trash2 size={20} />
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-2xl transition-all shadow-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 justify-center disabled:opacity-50"
          >
            {isSaving ? (
              <span key="saving" className="flex items-center gap-2">
                <Loader2 size={15} className="animate-spin" />
                Salvando...
              </span>
            ) : (
              <span key="save" className="flex items-center gap-2">
                <Save size={15} />
                Salvar Alterações
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
