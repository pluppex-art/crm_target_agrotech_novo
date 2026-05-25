import React from 'react';
import { Phone, AlertCircle, CheckSquare, Shield } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn, formatCPFCNPJ, formatPhone } from '../../../../lib/utils';

interface LeadBasicFieldsProps {
  formData: any;
  updateFormField: (fields: any) => void;
  fieldErrors: any;
}

export const LeadBasicFields: React.FC<LeadBasicFieldsProps> = ({
  formData,
  updateFormField,
  fieldErrors
}) => {
  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome Completo <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormField({ name: e.target.value })}
          className={cn(
            "w-full px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm",
            fieldErrors?.name ? "border-red-400 bg-red-50" : "border-slate-200 dark:border-slate-700"
          )}
        />
        {fieldErrors?.name && (
          <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
            <AlertCircle size={12} /> {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.is_minor}
              onChange={(e) => updateFormField({ is_minor: e.target.checked })}
              className="sr-only peer"
            />
            <div className={cn(
              "w-5 h-5 border-2 rounded transition-all flex items-center justify-center",
              formData.is_minor ? "bg-emerald-600 border-emerald-600" : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
            )}>
              {formData.is_minor && <CheckSquare size={12} className="text-white" />}
            </div>
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">O lead é menor de idade?</span>
        </label>
      </div>

      <AnimatePresence>
        {formData.is_minor && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} className="text-emerald-600" />
                <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Informações do Responsável Legal</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Nome do Responsável</label>
                  <input
                    type="text"
                    value={formData.guardian_name || ''}
                    onChange={(e) => updateFormField({ guardian_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                    placeholder="Nome completo do pai, mãe ou tutor"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">CPF do Responsável</label>
                  <input
                    type="text"
                    value={formData.guardian_cpf || ''}
                    onChange={(e) => updateFormField({ guardian_cpf: formatCPFCNPJ(e.target.value) })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">WhatsApp do Responsável</label>
                  <input
                    type="text"
                    value={formData.guardian_phone || ''}
                    onChange={(e) => updateFormField({ guardian_phone: formatPhone(e.target.value) })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => updateFormField({ phone: e.target.value })}
              className={cn(
                "w-full px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium pr-10 shadow-sm",
                fieldErrors?.phone ? "border-red-400 bg-red-50" : "border-slate-200 dark:border-slate-700"
              )}
            />
            <Phone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
          </div>
          {fieldErrors?.phone && <p className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertCircle size={12} /> {fieldErrors.phone}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateFormField({ email: e.target.value })}
            className={cn(
              "w-full px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm",
              fieldErrors?.email ? "border-red-400 bg-red-50" : "border-slate-200 dark:border-slate-700"
            )}
          />
          {fieldErrors?.email && <p className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertCircle size={12} /> {fieldErrors.email}</p>}
        </div>
      </div>
    </div>
  );
};
