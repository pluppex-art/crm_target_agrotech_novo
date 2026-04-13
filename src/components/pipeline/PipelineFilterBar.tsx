import React from 'react';
import { motion } from 'motion/react';
import { Search, Filter, ChevronDown, User, Star, GraduationCap, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      {/* Active filters chips */}
      <div className="flex flex-wrap gap-2">
        {searchTerm && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            Search: "{searchTerm}"
            <button onClick={onClearSearch} className="ml-1">
              <X size={12} />
            </button>
          </span>
        )}
        {selectedStatus !== 'all' && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
            Status: {COLUMNS.find(c => c.id === selectedStatus)?.title}
            <button onClick={() => onStatusChange('all')} className="ml-1">
              <X size={12} />
            </button>
          </span>
        )}
        {selectedProduct && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
            Produto: {selectedProduct}
            <button onClick={() => onProductChange('')} className="ml-1">
              <X size={12} />
            </button>
          </span>
        )}
        {selectedStars !== 'all' && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
            Estrelas: {selectedStars}
            <button onClick={() => onStarsChange('all')} className="ml-1">
              <X size={12} />
            </button>
          </span>
        )}
        {activeFilterCount > 0 && (
          <button
            onClick={onClearAllFilters}
            className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Filter inputs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Pesquisar leads..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value === 'all' ? 'all' : e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm appearance-none"
          >
            <option value="all">Todos status</option>
            {COLUMNS.map(col => (
              <option key={col.id} value={col.id}>{col.title}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>

        {/* Product filter */}
        <div className="relative">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={selectedProduct}
            onChange={(e) => onProductChange(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm appearance-none"
          >
            <option value="">Todos produtos</option>
            {products.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>

        {/* Stars filter */}
        <div className="relative">
          <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={selectedStars}
            onChange={(e) => onStarsChange(e.target.value === 'all' ? 'all' as any : Number(e.target.value))}
            className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm appearance-none"
          >
            <option value="all">Todas estrelas</option>
            {[1,2,3,4,5].map(s => (
              <option key={s} value={s}>{s}★</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>

        {/* Responsible filter */}
        <div className="relative md:col-span-1">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={selectedResponsible}
            onChange={(e) => onResponsibleChange(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm appearance-none"
          >
            <option value="all">Todos responsáveis</option>
            {filteredResponsibles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
      </div>
    </div>
  );
};

export default PipelineFilterBar;
