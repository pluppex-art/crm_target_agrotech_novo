import React, { useState } from 'react';
import { Filter, Search, X, GraduationCap, User, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PipelineFiltersProps {
  searchTerm: string;
  selectedStatus: string | 'all';
  selectedProduct: string;
  selectedResponsible: string;
  selectedStars: number[];
  responsibles: string[];
  products: any[];
  columns: any[];
  onSearchChange: (term: string) => void;
  onStatusChange: (status: string) => void;
  onProductChange: (product: string) => void;
  onResponsibleChange: (responsible: string) => void;
  onStarsChange: (stars: number[]) => void;
  clearAllFilters: () => void;
  activeFilterCount: number;
  isVendedor?: boolean;
}

export const PipelineFilters: React.FC<PipelineFiltersProps> = ({
  searchTerm,
  selectedStatus,
  selectedProduct,
  selectedResponsible,
  selectedStars,
  responsibles,
  products,
  columns,
  onSearchChange,
  onStatusChange,
  onProductChange,
  onResponsibleChange,
  onStarsChange,
  clearAllFilters,
  activeFilterCount,
  isVendedor = false,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {/* Header — clicável para minimizar */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={16} className={activeFilterCount > 0 ? "text-emerald-600" : "text-gray-400"} />
          Filtros
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-[10px] font-black bg-emerald-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {searchTerm && (
            <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
              "{searchTerm}"
              <span role="button" onClick={e => { e.stopPropagation(); onSearchChange(''); }}><X size={11} /></span>
            </span>
          )}
          {selectedStatus !== 'all' && columns.find((c: any) => c.id === selectedStatus) && (
            <span className="flex items-center gap-1 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
              {columns.find((c: any) => c.id === selectedStatus)?.title}
              <span role="button" onClick={e => { e.stopPropagation(); onStatusChange('all'); }}><X size={11} /></span>
            </span>
          )}
          {selectedProduct !== 'all' && (
            <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
              {selectedProduct}
              <span role="button" onClick={e => { e.stopPropagation(); onProductChange('all'); }}><X size={11} /></span>
            </span>
          )}
          {selectedResponsible !== 'all' && (
            <span className="flex items-center gap-1 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full">
              {selectedResponsible}
              <span role="button" onClick={e => { e.stopPropagation(); onResponsibleChange('all'); }}><X size={11} /></span>
            </span>
          )}
          {selectedStars.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full">
              {selectedStars.sort().join(', ')} 🔥
              <span role="button" onClick={e => { e.stopPropagation(); onStarsChange([]); }}><X size={11} /></span>
            </span>
          )}
          {activeFilterCount > 0 && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); clearAllFilters(); }}
              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
            >
              Limpar todos
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
        </div>
      </button>

      {/* Filter inputs — colapsável */}
      {open && <div
        className="flex flex-nowrap items-center gap-3 p-4 overflow-x-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome, produto ou responsável..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
          />
          {searchTerm && (
            <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Stage filter */}
        <div className="relative w-[180px] shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className={cn(
              "w-full pl-9 pr-8 py-2 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer text-sm font-medium transition-all text-ellipsis whitespace-nowrap overflow-hidden",
              selectedStatus !== 'all' ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-700"
            )}
          >
            <option value="all">Todos os estágios</option>
            {columns.map((col: any) => (
              <option key={col.id} value={col.id}>{col.title}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
        </div>

        {/* Product filter */}
        <div className="relative w-[180px] shrink-0">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
          <select
            value={selectedProduct}
            onChange={(e) => onProductChange(e.target.value)}
            className={cn(
              "w-full pl-9 pr-8 py-2 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer text-sm font-medium transition-all text-ellipsis whitespace-nowrap overflow-hidden",
              selectedProduct !== 'all' ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-700"
            )}
          >
            <option value="all">Todos os produtos</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
        </div>

        {/* Responsible filter — hidden for vendedores (they only see their own leads) */}
        {!isVendedor && (
          <div className="relative w-[180px] shrink-0">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
            <select
              value={selectedResponsible}
              onChange={(e) => onResponsibleChange(e.target.value)}
              className={cn(
                "w-full pl-9 pr-8 py-2 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer text-sm font-medium transition-all text-ellipsis whitespace-nowrap overflow-hidden",
                selectedResponsible !== 'all' ? "border-teal-300 bg-teal-50 text-teal-700" : "border-gray-200 text-gray-700"
              )}
            >
              <option value="all">Todos responsáveis</option>
              {responsibles.map((name: string) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>
        )}

        {/* Fire level filter (Flame) */}
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 shrink-0">
          <Flame size={16} className={cn("mr-1 transition-colors", selectedStars.length > 0 ? "text-orange-500" : "text-gray-400")} />
          {(['all', 1, 2, 3, 4, 5] as const).map((s) => {
            const isActive = s === 'all' ? selectedStars.length === 0 : selectedStars.includes(s);
            return (
              <button
                key={s}
                onClick={() => {
                  if (s === 'all') {
                    onStarsChange([]);
                  } else {
                    const newStars = selectedStars.includes(s)
                      ? selectedStars.filter(v => v !== s)
                      : [...selectedStars, s];
                    onStarsChange(newStars);
                  }
                }}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-0.5",
                  isActive
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-gray-400 hover:text-orange-500 hover:bg-orange-50"
                )}
              >
                {s === 'all' ? 'Todos' : s}
                {s !== 'all' && <Flame size={12} className={cn(isActive ? "text-white" : "text-gray-300")} />}
              </button>
            );
          })}
        </div>
      </div>}
    </div>
  );
};
