import { useState, useMemo, useEffect } from 'react';
import type { Lead } from '../types/leads';
import { useProfileStore } from '../store/useProfileStore';

export const usePipelineFilters = (leads: Lead[], authUserId?: string, isComercial?: boolean) => {
  const { profiles, fetchProfiles } = useProfileStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedStars, setSelectedStars] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Nome do usuário atual no perfil
  const myProfileName = useMemo(() => {
    if (!authUserId || profiles.length === 0) return null;
    return profiles.find((p: any) => p.id === authUserId)?.name ?? null;
  }, [authUserId, profiles]);

  // Usuários do departamento Comercial OU com cargo Vendedor (ativos)
  const responsibles = useMemo(() => {
    return profiles
      .filter(p => {
        if (!p.status || p.status !== 'active' || !p.name) return false;
        const isComercialDept = p.department?.toLowerCase() === 'comercial';
        const isVendedorCargo = p.cargos?.name?.toLowerCase().includes('vendedor');
        return isComercialDept || isVendedorCargo;
      })
      .map(p => p.name as string);
  }, [profiles]);

  // Comercial users see all leads but filter defaults to their own name
  useEffect(() => {
    if (isComercial && myProfileName && selectedResponsible === 'all') {
      setSelectedResponsible(myProfileName);
    }
  }, [isComercial, myProfileName]);

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
