import React from 'react';
import { Filter, Search, X, GraduationCap, User, ChevronDown, Star } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PipelineFiltersProps {
  searchTerm: string;
  selectedStatus: string | 'all';
  selectedProduct: string;
  selectedResponsible: string;
  selectedStars: number | 'all';
  responsibles: string[];
  products: any[];
  columns: any[];
  onSearchChange: (term: string) => void;
  onStatusChange: (status: string) => void;
  onProductChange: (product: string) => void;
  onResponsibleChange: (responsible: string) => void;
  onStarsChange: (stars: number | 'all') => void;
  clearAllFilters: () => void;
  activeFilterCount: number;
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
  activeFilterCount
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {/* Header da barra de filtros */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
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
          {/* Active filter pills */}
          {searchTerm && (
            <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
              "{searchTerm}"
              <button onClick={() => onSearchChange('')}><X size={11} /></button>
            </span>
          )}
          {selectedStatus !== 'all' && columns.find((c: any) => c.id === selectedStatus) && (
            <span className="flex items-center gap-1 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
              {columns.find((c: any) => c.id === selectedStatus)?.title}
              <button onClick={() => onStatusChange('all')}><X size={11} /></button>
            </span>
          )}
          {selectedProduct !== 'all' && (
            <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
              {selectedProduct}
              <button onClick={() => onProductChange('all')}><X size={11} /></button>
            </span>
          )}
          {selectedResponsible !== 'all' && (
            <span className="flex items-center gap-1 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full">
              {selectedResponsible}
              <button onClick={() => onResponsibleChange('all')}><X size={11} /></button>
            </span>
          )}
          {selectedStars !== 'all' && (
            <span className="flex items-center gap-1 text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded-full">
              {selectedStars}★
              <button onClick={() => onStarsChange('all')}><X size={11} /></button>
            </span>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
            >
              Limpar todos
            </button>
          )}
        </div>
      </div>

      {/* Filter inputs */}
      <div
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

        {/* Responsible filter */}
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

        {/* Stars filter */}
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 shrink-0">
          <Star size={14} className="text-gray-400 mr-1" />
          {(['all', 1, 2, 3, 4, 5] as const).map((s) => (
            <button
              key={s}
              onClick={() => onStarsChange(s)}
              className={cn(
                "px-2 py-0.5 rounded-lg text-xs font-bold transition-all",
                selectedStars === s
                  ? "bg-yellow-400 text-white shadow-sm"
                  : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
              )}
            >
              {s === 'all' ? 'Todas' : `${s}★`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
