import React from 'react';
import { FileText, ClipboardCheck, Loader2, Eye, X as XIcon, User } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface LeadDocumentationFieldsProps {
  formData: any;
  updateFormField: (fields: any) => void;
  rgInputRef: React.RefObject<HTMLInputElement>;
  profileInputRef: React.RefObject<HTMLInputElement>;
  uploadingRG: boolean;
  setUploadingRG: (v: boolean) => void;
  uploadingProfile: boolean;
  setUploadingProfile: (v: boolean) => void;
  handleFileUpload: (file: File, type: any, setLoading: (v: boolean) => void) => void;
  handleDeleteFile: (type: any) => void;
  ALLOWED_EXT: string;
}

export const LeadDocumentationFields: React.FC<LeadDocumentationFieldsProps> = ({
  formData,
  updateFormField,
  rgInputRef,
  profileInputRef,
  uploadingRG,
  setUploadingRG,
  uploadingProfile,
  setUploadingProfile,
  handleFileUpload,
  handleDeleteFile,
  ALLOWED_EXT
}) => {
  return (
    <div className="pt-4 border-t border-slate-100">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <FileText size={12} className="text-emerald-500" /> Documentos para contrato
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instagram (@)</label>
          <input
            type="text"
            value={formData.instagram || ''}
            onChange={(e) => updateFormField({ instagram: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm text-sm"
            placeholder="@usuario"
          />
        </div>

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contato de Emergência (Nome + Número)</label>
          <input
            type="text"
            value={formData.emergency_contact || ''}
            onChange={(e) => updateFormField({ emergency_contact: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm text-sm"
            placeholder="Ex: Maria (Esposa) - (66) 99999-9999"
          />
        </div>

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço Completo com CEP</label>
          <textarea
            rows={2}
            value={formData.address || ''}
            onChange={(e) => updateFormField({ address: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm text-sm resize-none"
            placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-2 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Foto RG ou CNH</label>
            <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-xl border border-slate-200 shadow-sm w-full">
              <input
                ref={rgInputRef}
                type="file"
                accept={ALLOWED_EXT}
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f, 'rg_photo', setUploadingRG);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => rgInputRef.current?.click()}
                disabled={uploadingRG}
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  formData.rg_photo_url ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                )}
              >
                {uploadingRG ? <Loader2 size={12} className="animate-spin" /> : <ClipboardCheck size={12} />}
                <span className="truncate">{formData.rg_photo_url ? 'RG Anexado' : 'Anexar RG/CNH'}</span>
              </button>
              {formData.rg_photo_url && (
                <div className="flex items-center gap-0.5 border-l border-slate-100 ml-1 pl-1">
                  <a href={formData.rg_photo_url} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-emerald-500"><Eye size={14} /></a>
                  <button onClick={() => handleDeleteFile('rg_photo')} className="p-1 text-slate-400 hover:text-red-500"><XIcon size={14} /></button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Foto de Perfil</label>
            <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-xl border border-slate-200 shadow-sm w-full">
              <input
                ref={profileInputRef}
                type="file"
                accept={ALLOWED_EXT}
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f, 'profile_photo', setUploadingProfile);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => profileInputRef.current?.click()}
                disabled={uploadingProfile}
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  formData.profile_photo_url ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                )}
              >
                {uploadingProfile ? <Loader2 size={12} className="animate-spin" /> : <User size={12} />}
                <span className="truncate">{formData.profile_photo_url ? 'Foto Anexada' : 'Anexar Foto'}</span>
              </button>
              {formData.profile_photo_url && (
                <div className="flex items-center gap-0.5 border-l border-slate-100 ml-1 pl-1">
                  <a href={formData.profile_photo_url} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-emerald-500"><Eye size={14} /></a>
                  <button onClick={() => handleDeleteFile('profile_photo')} className="p-1 text-slate-400 hover:text-red-500"><XIcon size={14} /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
