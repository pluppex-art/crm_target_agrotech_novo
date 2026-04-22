import { useState, useMemo, useEffect } from 'react';
import type { Lead } from '../types/leads';
import { useProfileStore } from '../store/useProfileStore';

export const usePipelineFilters = (leads: Lead[], authUserId?: string, isComercial?: boolean) => {
  const { profiles, fetchProfiles } = useProfileStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedStars, setSelectedStars] = useState<number[]>([]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Nome do usuário atual no perfil
  const myProfileName = useMemo(() => {
    if (!authUserId || profiles.length === 0) return null;
    return profiles.find((p: any) => p.id === authUserId)?.name ?? null;
  }, [authUserId, profiles]);

  // Nomes base únicos de produto (parte antes da primeira vírgula, ex: "Drone, Palmas-TO, 01/05" → "Drone")
  const productOptions = useMemo(() => {
    const seen = new Set<string>();
    return leads
      .map(l => {
        const raw = l.product?.trim();
        if (!raw) return null;
        return raw.split(',')[0].trim();
      })
      .filter((p): p is string => !!p)
      .filter(p => {
        const key = p.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [leads]);

  // Nomes de responsáveis: perfis do Comercial/Vendedor + nomes únicos que aparecem nos leads
  const responsibles = useMemo(() => {
    const fromProfiles = profiles
      .filter(p => {
        if (!p.status || p.status !== 'active' || !p.name) return false;
        const isComercialDept = p.department?.toLowerCase() === 'comercial';
        const isVendedorCargo = p.cargos?.name?.toLowerCase().includes('vendedor');
        return isComercialDept || isVendedorCargo;
      })
      .map(p => p.name as string);

    const fromLeads = leads
      .map(l => l.responsible)
      .filter((name): name is string => !!name?.trim());

    const seen = new Set<string>();
    return [...fromProfiles, ...fromLeads].filter(name => {
      const key = name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [profiles, leads]);

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
    const selectedResponsibleLower = selectedResponsible.trim().toLowerCase();
    const leadResponsibleLower = (lead.responsible ?? '').trim().toLowerCase();
    const matchesResponsible = selectedResponsible === 'all' ||
      leadResponsibleLower === selectedResponsibleLower ||
      leadResponsibleLower.includes(selectedResponsibleLower) ||
      selectedResponsibleLower.includes(leadResponsibleLower);
    const selectedProductLower = selectedProduct.trim().toLowerCase();
    const leadProductLower = (lead.product ?? '').trim().toLowerCase();
    const matchesProduct = selectedProduct === 'all' ||
      leadProductLower === selectedProductLower ||
      leadProductLower.includes(selectedProductLower) ||
      selectedProductLower.includes(leadProductLower);
    const matchesStars = selectedStars.length === 0 || selectedStars.includes(lead.stars || 0);
    return matchesSearch && matchesResponsible && matchesProduct && matchesStars;
  }), [leads, searchTerm, selectedResponsible, selectedProduct, selectedStars]);

  const activeFilterCount = useMemo(() => [
    selectedResponsible !== 'all',
    selectedProduct !== 'all',
    selectedStatus !== 'all',
    selectedStars.length > 0,
    searchTerm !== '',
  ].filter(Boolean).length, [selectedResponsible, selectedProduct, selectedStatus, selectedStars, searchTerm]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedResponsible('all');
    setSelectedProduct('all');
    setSelectedStatus('all');
    setSelectedStars([]);
  };

  return {
    searchTerm,
    selectedStatus,
    selectedProduct,
    selectedResponsible,
    selectedStars,
    responsibles,
    productOptions,
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
