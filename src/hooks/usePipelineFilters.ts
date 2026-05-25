import { useState, useMemo, useEffect } from 'react';
import type { Lead } from '../types/leads';
import { useProfileStore } from '../store/useProfileStore';
import { useProductStore } from '../store/useProductStore';
import { getSupabaseClient } from '../lib/supabase';
import { financialCalculator } from '../services/financialCalculator';
import { useSquadStore } from '../store/useSquadStore';

export const usePipelineFilters = (
  leads: Lead[], 
  authUserId?: string, 
  isComercial?: boolean,
  leadToTurmaDate?: Record<string, string>
) => {
  const { profiles, fetchProfiles } = useProfileStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedSquad, setSelectedSquad] = useState<string>('all');
  const { members } = useSquadStore();

  // Nome do usuário atual no perfil
  const myProfileName = useMemo(() => {
    if (!authUserId || profiles.length === 0) return null;
    return profiles.find((p: any) => p.id === authUserId)?.name ?? null;
  }, [authUserId, profiles]);

  // Product options: string[] (names)
  const { products } = useProductStore();
  const productOptions = useMemo(() => {
    const seen = new Set<string>();
    return leads
      .map(l => {
        const prodObj = financialCalculator.findProduct(l.product || '', products);
        return prodObj?.name || l.product;
      })
      .filter((p): p is string => !!p)
      .filter(p => {
        const key = p.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [leads, products]);

  // Lista de responsáveis: {id, name}[]
  const responsibles = useMemo(() => {
    const fromProfiles = profiles
      .filter(p => {
        if (!p.status || p.status !== 'active' || !p.id || !p.name) return false;
        const isComercialDept = p.department?.toLowerCase() === 'comercial';
        const isVendedorCargo = p.cargos?.name?.toLowerCase().includes('vendedor');
        return isComercialDept || isVendedorCargo;
      })
      .map(p => ({ id: p.id, name: p.name as string }));

    // Add responsible from leads that might not be in active profiles
    const seen = new Set<string>(fromProfiles.map(r => r.id));
    leads.forEach(l => {
      if (l.responsavel_usuario_id && !seen.has(l.responsavel_usuario_id) && l.responsible) {
        fromProfiles.push({ id: l.responsavel_usuario_id, name: l.responsible });
        seen.add(l.responsavel_usuario_id);
      }
    });

    return fromProfiles;
  }, [profiles, leads]);

  // Comercial users see all leads but filter defaults to their own ID
  useEffect(() => {
    if (isComercial && authUserId && selectedResponsible === 'all') {
      setSelectedResponsible(authUserId);
    }
  }, [isComercial, authUserId]);

  const filteredLeads = useMemo(() => leads.filter(lead => {
    const prodObj = financialCalculator.findProduct(lead.product || '', products);
    const prodName = prodObj?.name || lead.product || '';
    const respProfile = profiles.find(p => p.id === lead.responsavel_usuario_id || p.name === lead.responsible);
    const respName = respProfile?.name || lead.responsible || '';

    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      respName.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesResponsible = true;
    if (isComercial && authUserId) {
      const myName = myProfileName?.trim().toLowerCase();
      matchesResponsible = lead.responsavel_usuario_id === authUserId || 
                           (respName.trim().toLowerCase() === myName && !!myName);
    } else {
      const search = selectedResponsible.trim().toLowerCase();
      matchesResponsible = selectedResponsible === 'all' ||
        lead.responsavel_usuario_id === selectedResponsible ||
        respName.trim().toLowerCase() === search;
    }
    
    const leadProductLower = prodName.trim().toLowerCase();
    
    const matchesProduct = selectedProducts.length === 0 ||
      selectedProducts.some(productId => {
        const pObj = products.find(p => p.id === productId);
        const pNameLower = pObj?.name.trim().toLowerCase() || '';
        if (!pNameLower) return false;
        return leadProductLower === pNameLower ||
               leadProductLower.includes(pNameLower) ||
               pNameLower.includes(leadProductLower);
      });
    
    const matchesStars = selectedStars.length === 0 || selectedStars.includes(lead.stars || 0);

    // O filtro de data foi removido completamente do Kanban a pedido do usuário.
    // Todos os leads (ativos ou não) devem aparecer nas colunas, sem sumir por causa da data.

    const matchesSquad = selectedSquad === 'all' || (() => {
      // Find all user IDs in this squad
      const squadUserIds = members.filter(m => m.squad_id === selectedSquad).map(m => m.user_id);
      
      // The lead must be assigned to one of these user IDs
      if (lead.responsavel_usuario_id) {
        return squadUserIds.includes(lead.responsavel_usuario_id);
      }
      
      // Fallback: check by responsible name
      const squadUsers = profiles.filter(p => squadUserIds.includes(p.id));
      const respNameLower = (lead.responsible || '').trim().toLowerCase();
      if (!respNameLower) return false;
      return squadUsers.some(p => p.name?.toLowerCase() === respNameLower);
    })();

    return matchesSearch && matchesResponsible && matchesProduct && matchesStars && matchesSquad;
  }), [leads, searchTerm, selectedResponsible, selectedProducts, selectedStars, selectedSquad, profiles, products, members]);


  const activeFilterCount = useMemo(() => [
    selectedResponsible !== 'all',
    selectedProducts.length > 0,
    selectedStatus !== 'all',
    selectedStars.length > 0,
    selectedSquad !== 'all',
    searchTerm !== '',
  ].filter(Boolean).length, [selectedResponsible, selectedProducts, selectedStatus, selectedStars, selectedSquad, searchTerm]);


  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedResponsible('all');
    setSelectedProducts([]);
    setSelectedStatus('all');
    setSelectedStars([]);
    setSelectedSquad('all');
  };


  return {
    searchTerm,
    selectedStatus,
    selectedProducts,
    selectedResponsible,
    selectedStars,
    selectedSquad,
    responsibles,
    productOptions,
    filteredLeads,
    activeFilterCount,
    clearAllFilters,
    setSearchTerm,
    setSelectedStatus,
    setSelectedProducts,
    setSelectedResponsible,
    setSelectedStars,
    setSelectedSquad,
  };

};
