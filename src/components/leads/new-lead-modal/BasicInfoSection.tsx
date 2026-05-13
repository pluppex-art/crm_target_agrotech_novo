import React from 'react';
import { User, Shield, Phone, Mail, MapPin, CheckSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn, formatCPFCNPJ, formatPhone } from '../../../lib/utils';

interface BasicInfoSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  fieldErrors: any;
  setFieldErrors: React.Dispatch<React.SetStateAction<any>>;
  duplicateEmailError?: string | null;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formData,
  setFormData,
  fieldErrors,
  setFieldErrors,
  duplicateEmailError
}) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 pb-1 border-b border-slate-50">
        <User size={14} className="text-emerald-500" />
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dados Básicos</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
                setFieldErrors(p => ({ ...p, name: undefined }));
              }}
              className={cn(
                "w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm",
                fieldErrors.name ? "border-red-400 bg-red-50" : "border-slate-200"
              )}
              placeholder="Nome do cliente"
            />
          </div>
        </div>

        {/* Menor de Idade Checkbox */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.is_minor}
                onChange={(e) => setFormData(prev => ({ ...prev, is_minor: e.target.checked }))}
                className="sr-only peer"
              />
              <div className={cn(
                "w-5 h-5 border-2 rounded transition-all flex items-center justify-center",
                formData.is_minor ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-300"
              )}>
                {formData.is_minor && <CheckSquare size={12} className="text-white" />}
              </div>
            </div>
            <span className="text-sm font-bold text-slate-700">O lead é menor de idade?</span>
          </label>
        </div>

        {/* Seção do Responsável Legal */}
        <div className="md:col-span-2">
          <AnimatePresence>
            {formData.is_minor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={14} className="text-emerald-600" />
                    <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Informações do Responsável Legal</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Nome do Responsável</label>
                      <input
                        type="text"
                        value={formData.guardian_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, guardian_name: e.target.value }))}
                        className="w-full px-4 py-2 bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                        placeholder="Nome completo do pai, mãe ou tutor"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">CPF do Responsável</label>
                      <input
                        type="text"
                        value={formData.guardian_cpf}
                        onChange={(e) => setFormData(prev => ({ ...prev, guardian_cpf: formatCPFCNPJ(e.target.value) }))}
                        className="w-full px-4 py-2 bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">WhatsApp do Responsável</label>
                      <input
                        type="text"
                        value={formData.guardian_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, guardian_phone: formatPhone(e.target.value) }))}
                        className="w-full px-4 py-2 bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Phone + Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            Telefone <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const formatted = formatPhone(e.target.value);
                setFormData(prev => ({ ...prev, phone: formatted }));
                setFieldErrors(p => ({ ...p, phone: undefined }));
              }}
              className={cn(
                "w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium pr-10 shadow-sm",
                fieldErrors.phone ? "border-red-400 bg-red-50" : "border-slate-200"
              )}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
            <Phone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail</label>
          <div className="relative">
            <input
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData(prev => ({ ...prev, email: e.target.value }));
                setFieldErrors(p => ({ ...p, email: undefined }));
              }}
              className={cn(
                "w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm",
                (fieldErrors.email || duplicateEmailError) ? "border-red-400 bg-red-50" : "border-slate-200"
              )}
              placeholder="email@exemplo.com"
            />
            <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cidade</label>
          <div className="relative">
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
              placeholder="Cidade - UF"
            />
            <MapPin size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPF / CNPJ</label>
          <div className="relative">
            <input
              type="text"
              value={formData.cnpj}
              onChange={(e) => setFormData(prev => ({ ...prev, cnpj: formatCPFCNPJ(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
              placeholder="000.000.000-00"
              maxLength={18}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
