import { useState, useMemo, useEffect } from 'react';
import type { Lead } from '../types/leads';
import { useProfileStore } from '../store/useProfileStore';

export const usePipelineFilters = (leads: Lead[]) => {
  const { profiles, fetchProfiles } = useProfileStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedStars, setSelectedStars] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Vendedores ativos
  const responsibles = useMemo(() => {
    const isVendedor = (p: any) => p.cargos?.name?.toLowerCase().includes('vend') ?? false;
    return profiles
      .filter(p => p.status === 'active' && p.name && isVendedor(p))
      .map(p => p.name as string);
  }, [profiles]);

  const filteredLeads = useMemo(() => leads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.responsible && lead.responsible.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesResponsible = selectedResponsible === 'all' || lead.responsible === selectedResponsible;
    const matchesProduct = selectedProduct === 'all' || lead.product === selectedProduct;
    const matchesStars = selectedStars === 'all' || (lead.stars || 0) === selectedStars;
    return matchesSearch && matchesResponsible && matchesProduct && matchesStars;
  }), [leads, searchTerm, selectedResponsible, selectedProduct, selectedStars]);

  const activeFilterCount = useMemo(() => [
    selectedResponsible !== 'all',
    selectedProduct !== 'all',
    selectedStatus !== 'all',
    selectedStars !== 'all',
    searchTerm !== '',
  ].filter(Boolean).length, [selectedResponsible, selectedProduct, selectedStatus, selectedStars, searchTerm]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedResponsible('all');
    setSelectedProduct('all');
    setSelectedStatus('all');
    setSelectedStars('all');
  };

  return {
    searchTerm,
    selectedStatus,
    selectedProduct,
    selectedResponsible,
    selectedStars,
    responsibles,
    filteredLeads,
    activeFilterCount,
    clearAllFilters,
    setSearchTerm,
    setSelectedStatus,
    setSelectedProduct,
    setSelectedResponsible,
    setSelectedStars,
  };
};
