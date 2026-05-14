import React from 'react';
import { ClipboardCheck, CheckSquare, QrCode, Phone, Minus, Loader2, FileText, Eye, X as XIcon } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface ContractConfirmationsProps {
  showConfirmations: boolean;
  isServiceProduct: boolean;
  pixCompleted: boolean;
  onPixComplete: (v: boolean) => void;
  formData: any;
  updateFormField: (fields: any) => void;
  toggleField: (field: string, value: any) => void;
  enrollmentFee: number;
  contractSigned: boolean;
  onContractSign: (v: boolean) => void;
  logCall: () => void;
  removeLastCall: () => void;
  logging: boolean;
  todayCount: number;
  proofInputRef: React.RefObject<HTMLInputElement>;
  contractInputRef: React.RefObject<HTMLInputElement>;
  uploadingProof: boolean;
  setUploadingProof: (v: boolean) => void;
  uploadingContract: boolean;
  setUploadingContract: (v: boolean) => void;
  handleFileUpload: (file: File, type: any, setLoading: (v: boolean) => void) => void;
  handleDeleteFile: (type: any) => void;
  ALLOWED_EXT: string;
}

export const ContractConfirmations: React.FC<ContractConfirmationsProps> = ({
  showConfirmations,
  isServiceProduct,
  pixCompleted,
  onPixComplete,
  formData,
  updateFormField,
  toggleField,
  enrollmentFee,
  contractSigned,
  onContractSign,
  logCall,
  removeLastCall,
  logging,
  todayCount,
  proofInputRef,
  contractInputRef,
  uploadingProof,
  setUploadingProof,
  uploadingContract,
  setUploadingContract,
  handleFileUpload,
  handleDeleteFile,
  ALLOWED_EXT
}) => {
  if (!showConfirmations || isServiceProduct) return null;

  return (
    <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
          <ClipboardCheck size={13} className="text-emerald-500" /> Confirmações para avançar para Ganho
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer group shrink-0">
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={pixCompleted ?? false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onPixComplete?.(checked);
                    if (checked && !formData.taxa_matricula_recebido && enrollmentFee > 0) {
                      updateFormField({ taxa_matricula_recebido: enrollmentFee });
                      toggleField?.('taxa_matricula_recebido', enrollmentFee);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className={cn(
                  "w-6 h-6 border-2 rounded-lg transition-all flex items-center justify-center",
                  pixCompleted ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-300"
                )}>
                  {pixCompleted && <CheckSquare size={14} className="text-white" />}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <QrCode size={18} className={cn("transition-colors", pixCompleted ? "text-emerald-500" : "text-slate-400")} />
                <span className="text-[14px] font-bold text-slate-700 tracking-tight">Taxa Matrícula</span>
              </div>
            </label>
            <div className="max-w-[100px]">
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={!pixCompleted}
                value={pixCompleted ? (formData.taxa_matricula_recebido ?? enrollmentFee) : enrollmentFee}
                onChange={(e) => updateFormField({ taxa_matricula_recebido: e.target.value ? parseFloat(e.target.value) : null })}
                onBlur={(e) => toggleField?.('taxa_matricula_recebido', e.target.value ? parseFloat(e.target.value) : null)}
                className={cn(
                  "w-full px-3 py-1.5 border rounded-xl outline-none text-xs font-black shadow-sm transition-all text-center",
                  pixCompleted
                    ? "bg-white border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                )}
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
                "w-6 h-6 border-2 rounded-lg transition-all flex items-center justify-center",
                contractSigned ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-300"
              )}>
                {contractSigned && <CheckSquare size={14} className="text-white" />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className={cn("transition-colors", contractSigned ? "text-emerald-500" : "text-slate-400")} />
              <span className="text-[14px] font-bold text-slate-700 tracking-tight">Contrato assinado</span>
            </div>
          </label>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={logCall}
                disabled={logging}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-[13px] font-bold transition-all disabled:opacity-60 shadow-sm"
              >
                {logging ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                Registrar Ligação
              </button>
              {todayCount > 0 && (
                <button
                  onClick={removeLastCall}
                  disabled={logging}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Remover última ligação (Erro)"
                >
                  <Minus size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              <Phone size={12} className="text-slate-400" />
              <span className="text-xs font-black text-slate-700 tabular-nums">{todayCount}</span>
              <span className="text-[10px] text-slate-400 font-medium">/dia</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-2xl border border-slate-200 shadow-sm w-full">
            <input
              ref={proofInputRef}
              type="file"
              accept={ALLOWED_EXT}
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, 'payment_proof', setUploadingProof);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => proofInputRef.current?.click()}
              disabled={uploadingProof}
              className={cn(
                "flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                formData.payment_proof_url ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              )}
            >
              {uploadingProof ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
              <span className="truncate">{formData.payment_proof_url ? 'Comprovante ✅' : 'Comprovante'}</span>
            </button>
            {formData.payment_proof_url && (
              <div className="flex items-center gap-0.5 border-l border-slate-100 ml-1 pl-1">
                <a href={formData.payment_proof_url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors"><Eye size={16} /></a>
                <button onClick={() => handleDeleteFile('payment_proof')} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><XIcon size={16} /></button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-2xl border border-slate-200 shadow-sm w-full">
            <input
              ref={contractInputRef}
              type="file"
              accept={ALLOWED_EXT}
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, 'contract', setUploadingContract);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => contractInputRef.current?.click()}
              disabled={uploadingContract}
              className={cn(
                "flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                formData.contract_url ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              )}
            >
              {uploadingContract ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              <span className="truncate">{formData.contract_url ? 'Contrato ✅' : 'Contrato'}</span>
            </button>
            {formData.contract_url && (
              <div className="flex items-center gap-0.5 border-l border-slate-100 ml-1 pl-1">
                <a href={formData.contract_url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors"><Eye size={16} /></a>
                <button onClick={() => handleDeleteFile('contract')} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><XIcon size={16} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
