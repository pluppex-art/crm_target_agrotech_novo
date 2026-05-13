import React from 'react';
import { User, ChevronDown, GraduationCap, DollarSign } from 'lucide-react';
import { formatCPFCNPJ, parseBRNumber } from '../../../../lib/utils';

interface LeadSalesFieldsProps {
  formData: any;
  updateFormField: (fields: any) => void;
  toggleField: (field: string, value: any) => void;
  responsibles: any[];
  getSquadInfoForUser: (id: string, name: string, profiles: any[]) => any;
  profiles: any[];
  products: any[];
  centroCustos: any[];
  currentProduct: any;
}

export const LeadSalesFields: React.FC<LeadSalesFieldsProps> = ({
  formData,
  updateFormField,
  toggleField,
  responsibles,
  getSquadInfoForUser,
  profiles,
  products,
  centroCustos,
  currentProduct
}) => {
  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Closer Responsável</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={formData.responsavel_usuario_id || ''}
            onChange={(e) => {
              const r = (responsibles ?? []).find(r => r.id === e.target.value);
              updateFormField({
                responsible: r?.name ?? e.target.value,
                responsavel_usuario_id: e.target.value || null,
              });
            }}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
          >
            <option value="">Selecione...</option>
            {responsibles?.map(r => {
              const info = getSquadInfoForUser(r.id, r.name, profiles);
              return <option key={r.id} value={r.id}>{r.name} [{info.name}]</option>;
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produto</label>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={formData.product || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                const selectedProduct = products.find(p => p.id === selectedId);
                updateFormField({
                  product: selectedId,
                  value: selectedProduct ? selectedProduct.price.toString() : formData.value,
                });
              }}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
            >
              <option value="">Selecione...</option>
              {formData.product && !products.find(p => p.id === formData.product) && (
                <option value={formData.product}>{formData.product} (Nome antigo)</option>
              )}
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
              <span className="text-[10px] font-bold text-emerald-700">R$ {Number(currentProduct.enrollment_fee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          ) : null}
        </div>
      </div>

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
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPF Principal (para NF)</label>
          <input
            type="text"
            value={formData.cnpj}
            onChange={(e) => updateFormField({ cnpj: formatCPFCNPJ(e.target.value) })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Origem do Vendedor</label>
          <div className="relative">
            <select
              value={formData.seller_origin || 'target'}
              onChange={(e) => updateFormField({ seller_origin: e.target.value as any })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
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
                const cc = centroCustos.find(c => c.id === e.target.value);
                updateFormField({ centro_custo_id: e.target.value, cost_center: cc?.nome || formData.cost_center });
                toggleField?.('centro_custo_id', e.target.value);
                if (cc) toggleField?.('cost_center', cc.nome);
              }}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
            >
              <option value="">Selecione...</option>
              {centroCustos.map(cc => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};
