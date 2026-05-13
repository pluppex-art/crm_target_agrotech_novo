import React from 'react';
import { FileText, ClipboardCheck, User, X as XIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface DocumentationSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  rgInputRef: React.RefObject<HTMLInputElement>;
  profileInputRef: React.RefObject<HTMLInputElement>;
  rgFile: File | null;
  setRgFile: (file: File | null) => void;
  profileFile: File | null;
  setProfileFile: (file: File | null) => void;
}

export const DocumentationSection: React.FC<DocumentationSectionProps> = ({
  formData,
  setFormData,
  rgInputRef,
  profileInputRef,
  rgFile,
  setRgFile,
  profileFile,
  setProfileFile
}) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 pb-1 border-b border-slate-50">
        <FileText size={14} className="text-emerald-500" />
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Documentação e Contrato</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instagram (@)</label>
          <input
            type="text"
            value={formData.instagram}
            onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm text-sm"
            placeholder="@usuario"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contato de Emergência</label>
          <input
            type="text"
            value={formData.emergency_contact}
            onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm text-sm"
            placeholder="Nome e Número"
          />
        </div>

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço Completo com CEP</label>
          <textarea
            rows={2}
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm text-sm resize-none"
            placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
          ></textarea>
        </div>

        {/* Uploads de Fotos de Documentos */}
        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Foto RG/CNH</label>
            <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-xl border border-slate-200 shadow-sm w-full">
              <input
                ref={rgInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={e => setRgFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => rgInputRef.current?.click()}
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  rgFile ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                )}
              >
                <ClipboardCheck size={12} />
                <span className="truncate">{rgFile ? `RG: ${rgFile.name}` : 'Anexar RG/CNH'}</span>
              </button>
              {rgFile && (
                <button type="button" onClick={() => setRgFile(null)} className="p-1 px-2 text-slate-400 hover:text-red-500 border-l border-slate-100 ml-1">
                  <XIcon size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Foto de Perfil</label>
            <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-xl border border-slate-200 shadow-sm w-full">
              <input
                ref={profileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={e => setProfileFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  profileFile ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                )}
              >
                <User size={12} />
                <span className="truncate">{profileFile ? `Foto: ${profileFile.name}` : 'Anexar Foto'}</span>
              </button>
              {profileFile && (
                <button type="button" onClick={() => setProfileFile(null)} className="p-1 px-2 text-slate-400 hover:text-red-500 border-l border-slate-100 ml-1">
                  <XIcon size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
