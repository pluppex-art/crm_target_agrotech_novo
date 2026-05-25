import React from 'react';
import { FileText, QrCode, CheckSquare, Eye, X as XIcon, Loader2, Upload } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface ProfessorDocumentationProps {
  formData: any;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (file: File) => void;
  handleDeleteFile: () => void;
  ALLOWED_EXT: string;
}

export const ProfessorDocumentation: React.FC<ProfessorDocumentationProps> = ({
  formData,
  uploading,
  fileInputRef,
  handleFileUpload,
  handleDeleteFile,
  ALLOWED_EXT
}) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <FileText size={12} /> Documentação do Professor
      </p>

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <QrCode size={13} className="text-slate-400" /> Comprovante de Pagamento
            {formData?.professor_proof_url && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
                <CheckSquare size={9} /> Enviado
              </span>
            )}
          </p>
          {formData?.professor_proof_url && (
            <div className="flex items-center gap-2 mt-1">
              <a
                href={formData.professor_proof_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-bold truncate max-w-[180px]"
              >
                <Eye size={10} /> Ver comprovante
              </a>
              <button
                type="button"
                onClick={handleDeleteFile}
                className="p-0.5 text-red-400 hover:text-red-600 transition-colors"
              >
                <XIcon size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXT}
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm",
              formData?.professor_proof_url
                ? "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            )}
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {uploading ? 'Enviando...' : formData?.professor_proof_url ? 'Substituir' : 'Anexar Comprovante'}
          </button>
        </div>
      </div>
    </div>
  );
};
