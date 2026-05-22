import React from 'react';
import { ClipboardCheck, CheckSquare, QrCode, FileText, X as XIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface GanhoConfirmationsProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  proofInputRef: React.RefObject<HTMLInputElement>;
  contractInputRef: React.RefObject<HTMLInputElement>;
  proofFile: File | null;
  setProofFile: (file: File | null) => void;
  contractFile: File | null;
  setContractFile: (file: File | null) => void;
  isServiceProduct?: boolean;
}

export const GanhoConfirmations: React.FC<GanhoConfirmationsProps> = ({
  formData,
  setFormData,
  proofInputRef,
  contractInputRef,
  proofFile,
  setProofFile,
  contractFile,
  setContractFile,
  isServiceProduct
}) => {
  if (isServiceProduct) {
    return (
      <div className="space-y-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 mt-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
            <ClipboardCheck size={13} className="text-emerald-500" /> Confirmações para avançar para Ganho (Serviço)
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-slate-500">
            Para salvar este lead do tipo Serviço na etapa Ganho, é obrigatório anexar o comprovante de pagamento do professor.
          </p>

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
              <span className="truncate">{proofFile ? `Comprovante Professor: ${proofFile.name}` : 'Comprovante do Professor'}</span>
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
        </div>
      </div>
    );
  }

  return (
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
  );
};
