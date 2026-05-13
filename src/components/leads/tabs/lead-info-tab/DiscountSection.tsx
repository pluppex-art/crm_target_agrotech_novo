import React from 'react';
import { Percent, DollarSign, CheckSquare } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface DiscountSectionProps {
  formData: any;
  updateFormField: (fields: any) => void;
  toggleField?: (field: string, value: any) => void;
  lead: any;
}

export const DiscountSection: React.FC<DiscountSectionProps> = ({
  formData,
  updateFormField,
  toggleField,
  lead
}) => {
  return (
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
            if (!formData.discount_applied && val.trim() !== '') {
              toggleField?.('discount_applied', true);
            }
          }}
          onBlur={() => {
            if (formData.discount !== lead.discount) {
              toggleField?.('discount', formData.discount);
            }
          }}
          placeholder={formData.discount_type === 'percent' ? "Ex: 10" : "Ex: 500,00"}
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
        />
      </div>
    </div>
  );
};
