import React from 'react';
import { Filter, Search, X, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterConfig = {
  id: string;
  type: 'select' | 'stars';
  placeholder?: string;
  icon?: React.ElementType;
  options?: FilterOption[];
  value: string | number;
  onChange: (val: any) => void;
  activeColorClass?: string; // used for the active pill background, e.g. "bg-purple-50 text-purple-700 border-purple-100"
};

interface PageFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchPlaceholder?: string;
  filters: FilterConfig[];
  onClearAll: () => void;
}

export function PageFilters({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters,
  onClearAll,
}: PageFiltersProps) {
  
  const activeFilters = filters.filter(f => f.value !== 'all' && f.value !== '');
  const activeFilterCount = (searchTerm ? 1 : 0) + activeFilters.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 min-h-[3rem]">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 shrink-0">
          <Filter size={16} className={activeFilterCount > 0 ? "text-emerald-600" : "text-gray-400"} />
          <span className="hidden sm:inline">Filtros</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-black bg-emerald-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end ml-4">
          {/* Active filter pills */}
          {searchTerm && (
            <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
              "{searchTerm}"
              <button onClick={() => onSearchChange('')} className="hover:text-blue-900"><X size={11} /></button>
            </span>
          )}
          
          {activeFilters.map(f => {
            const label = f.type === 'stars' 
              ? `${f.value}★` 
              : (f.options?.find(o => o.value === String(f.value))?.label || f.value);
              
            // default color if none provided
            const pillColor = f.activeColorClass || "bg-gray-100 text-gray-700 border-gray-200";

            return (
              <span key={f.id} className={cn("flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full whitespace-nowrap", pillColor)}>
                {label}
                <button onClick={() => f.onChange('all')} className="opacity-70 hover:opacity-100"><X size={11} /></button>
              </span>
            );
          })}
          
          {activeFilterCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Inputs flex container */}
      <div 
        className="flex flex-nowrap items-center gap-3 p-4 overflow-x-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder={searchPlaceholder}
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

        {/* Custom Filters */}
        {filters.map(filter => {
          if (filter.type === 'select') {
            const Icon = filter.icon;
            const activeInputClass = filter.value !== 'all' && filter.value !== '' && filter.activeColorClass
                ? filter.activeColorClass.replace('text-', 'bg-').replace('border-', 'border-').split(' ')[0] + " border-emerald-300" 
                : "border-gray-200 text-gray-700";

            return (
              <div key={filter.id} className="relative min-w-[160px] shrink-0">
                {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />}
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className={cn(
                    "w-full pr-8 py-2 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer text-sm font-medium transition-all text-ellipsis whitespace-nowrap overflow-hidden",
                    Icon ? "pl-9" : "pl-3",
                    filter.value !== 'all' && filter.value !== '' ? "bg-emerald-50/50 border-emerald-300 text-emerald-800" : "border-gray-200 text-gray-700"
                  )}
                >
                  <option value="all">{filter.placeholder || 'Todos'}</option>
                  {(filter.options || []).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            );
          }

          if (filter.type === 'stars') {
            const Icon = filter.icon;
            return (
              <div key={filter.id} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 shrink-0">
                {Icon && <Icon size={14} className="text-gray-400 mr-1" />}
                {(['all', 1, 2, 3, 4, 5] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => filter.onChange(s)}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-xs font-bold transition-all",
                      filter.value === s
                        ? "bg-yellow-400 text-white shadow-sm"
                        : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
                    )}
                  >
                    {s === 'all' ? 'Todas' : `${s}★`}
                  </button>
                ))}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
