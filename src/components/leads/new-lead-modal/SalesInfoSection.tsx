import React from 'react';
import { DollarSign, GraduationCap, ChevronDown, Percent, User as UserIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { LeadSubStatus } from '../../../types/leads';

interface SalesInfoSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  products: any[];
  responsibles: any[];
  profiles: any[];
  getSquadInfoForUser: (id: string, name: string, profiles: any[]) => any;
  centroCustos: any[];
  currentPipelineStages: any[];
  selectedStageId: string;
  setSelectedStageId: (id: string) => void;
  initialStatus?: string;
  handleProductChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const SalesInfoSection: React.FC<SalesInfoSectionProps> = ({
  formData,
  setFormData,
  products,
  responsibles,
  profiles,
  getSquadInfoForUser,
  centroCustos,
  currentPipelineStages,
  selectedStageId,
  setSelectedStageId,
  initialStatus,
  handleProductChange
}) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 pb-1 border-b border-slate-50">
        <DollarSign size={14} className="text-emerald-500" />
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Atendimento e Venda</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Responsible */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsável <span className="text-red-500">*</span></label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              required
              value={formData.responsavel_usuario_id}
              onChange={(e) => {
                const p = responsibles.find(v => v.id === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  responsible: p?.name || '',
                  responsavel_usuario_id: e.target.value,
                }));
              }}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
            >
              <option value="">Selecione o responsável</option>
              {responsibles.map(p => (
                <option key={`resp-${p.id}`} value={p.id}>
                  {p.name} [{getSquadInfoForUser(p.id, p.name || '', profiles).name}]
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>

        {/* Product */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produto</label>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={formData.product}
              onChange={handleProductChange}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
            >
              <option value="">Selecione um produto</option>
              {products.map(product => (
                <option key={`prod-${product.id}`} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>

        {/* Value */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor (R$)</label>
          <div className="relative">
            <input
              type="text"
              value={formData.value ? Number(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
              readOnly
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium shadow-sm text-slate-500 cursor-not-allowed"
              placeholder="0,00"
            />
            <DollarSign size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Vendedor Origin */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Origem do Vendedor <span className="text-red-500">*</span></label>
          <div className="relative">
            <select
              required
              value={formData.seller_origin}
              onChange={(e) => setFormData(prev => ({ ...prev, seller_origin: e.target.value as any }))}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
            >
              <option value="target">Target</option>
              <option value="pluppex">Pluppex</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>

        {/* Centro de Custo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Centro de Custo <span className="text-red-500">*</span></label>
          <div className="relative">
            <select
              required
              value={formData.centro_custo_id || ''}
              onChange={(e) => {
                const cc = centroCustos.find(c => c.id === e.target.value);
                setFormData(prev => ({ 
                  ...prev, 
                  centro_custo_id: e.target.value,
                  cost_center: cc?.nome || prev.cost_center 
                }));
              }}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
            >
              <option value="">Selecione um centro</option>
              {centroCustos.map(cc => (
                <option key={cc.id} value={cc.id}>{cc.nome}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>

        {/* Pipeline Stage */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Etapa do Pipeline <span className="text-red-500">*</span></label>
          <div className="relative">
            <select
              required
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none transition-all font-medium shadow-sm cursor-pointer"
            >
              <option value="">Selecione uma etapa</option>
              {currentPipelineStages.map((stage: any) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* SubStatus */}
        {initialStatus === 'qualified' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qualificação</label>
            <select
              value={formData.subStatus}
              onChange={(e) => setFormData(prev => ({ ...prev, subStatus: e.target.value as LeadSubStatus }))}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium shadow-sm"
            >
              <option value="qualified">Qualificado</option>
              <option value="warming">Aquecimento</option>
              <option value="disqualified">Desqualificado</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
