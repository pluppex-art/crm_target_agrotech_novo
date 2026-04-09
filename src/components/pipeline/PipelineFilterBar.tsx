import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, ChevronDown, User, Star, GraduationCap, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface PipelineFilterBarProps {
  searchTerm: string;
  selectedResponsible: string;
  selectedStatus: string | 'all';
  selectedProduct: string;
  selectedStars: number | 'all';
  responsibleSearch: string;
  isResponsibleDropdownOpen: boolean;
  filteredResponsibles: string[];
  COLUMNS: { id: string; title: string }[];
  products: { id: string; name: string }[];
  activeFilterCount: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string | 'all') => void;
  onProductChange: (value: string) => void;
  onStarsChange: (value: number | 'all') => void;
  onResponsibleSearchChange: (value: string) => void;
  onResponsibleChange: (value: string) => void;
  onResponsibleDropdownToggle: () => void;
  onClearSearch: () => void;
  onClearAllFilters: () => void;
  responsibleDropdownRef: React.RefObject<HTMLDivElement>;
}

const PipelineFilterBar: React.FC<PipelineFilterBarProps> = ({
  searchTerm,
  selectedResponsible,
  selectedStatus,
  selectedProduct,
  selectedStars,
  responsibleSearch,
  isResponsibleDropdownOpen,
  filteredResponsibles,
  COLUMNS,
  products,
  activeFilterCount,
  onSearchChange,
  onStatusChange,
  onProductChange,
  onStarsChange,
  onResponsibleSearchChange,
  onResponsibleChange,
  onResponsibleDropdownToggle,
  onClearSearch,
  onClearAllFilters,
  responsibleDropdownRef
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {/* Header da barra de filtros */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={16} className={cn(activeFilterCount > 0 ? "text-emerald-600" : "text-gray-400")} />
          Filtros
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-emerald-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Active filter pills */}
          {searchTerm && (
            <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
              "{searchTerm}"
              <button onClick={onClearSearch}><X size={11} /></button>
            </span>
          )}
          {selectedStatus !== 'all' && (
            <span className="flex items-center gap-1 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
              {COLUMNS.find(c => c.id === selectedStatus)?.title}
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
              onClick={onClearAllFilters}
              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
            >
              Limpar todos
            </button>
          )}
        </div>
      </div>

      {/* Filter inputs */}
      <div className="flex flex-wrap gap-3 p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute Ascending-descending cursor-pointer text-sm font-medium transition-all",
              selectedStatus !== 'all' ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-700"
            )}
          >
            <option value="all">Todos os estágios</option>
            {COLUMNS.map(col => (
              <option key={col.id} value={col.id}>{col.title}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
        </div>

        {/* Product filter */}
        <div className="relative min-w-[160px]">
          <GraduationCap className="absolute left-3 top-1/2 -translate Ascending-descending cursor-pointer text-sm font-medium transition-all",
              selectedProduct !== 'all' ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-700"
            )}
          >
            <option value="all">Todos os produtos</option>
            {products.map(p => (
              <option key={p.id} value={p Ascending-descending cursor-pointer text-sm font-medium transition-all",
              selectedStars === s
                ? "bg-yellow-400 text-white shadow-sm"
                : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
            )}
          >
            {s === 'all' ? 'Todas' : `${s}★`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PipelineFilterBar;

