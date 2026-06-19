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

  // Product options: string[] (names), excluding generic/placeholder products
  const { products } = useProductStore();
  const GENERIC_TURMA_IDS = new Set([
    'ebebde7b-76d8-4109-b68f-716759cbff4d',
    '6d9b472e-658d-4914-8a38-f424ed07d9fe',
    'cab8c1ee-0578-45a2-b032-441b7ef3209a',
    'd02f2f09-ced0-455a-82cc-4bc3aa31baff',
    '21d94258-fce1-4da4-ad67-9eb33968737d',
    '78a3189d-acc5-4fbc-8567-ff72851a1c94',
  ]);
  const GENERIC_PRODUCT_NAMES_LOWER = new Set([
    'curso de piloto de drone agrícola',
    'curso de inseminação artificial em bovinos',
    'interesse geral',
    'outros',
    'aplicação com drone t-70',
    'drone, palmas-to, 17/04/26',
  ]);
  const productOptions = useMemo(() => {
    const seen = new Set<string>();
    return leads
      .filter(l => !l.product_id || !GENERIC_TURMA_IDS.has(l.product_id))
      .map(l => {
        const prodObj = l.product_id
          ? products.find((p: any) => p.id === l.product_id)
          : financialCalculator.findProduct(l.product || '', products);
        return prodObj?.name || l.product;
      })
      .filter((p): p is string => {
        if (!p) return false;
        if (GENERIC_PRODUCT_NAMES_LOWER.has(p.toLowerCase().trim())) return false;
        return true;
      })
      .filter(p => {
        const key = p.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
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

    // Add responsible from leads for users not in active profiles (excludes known inactive users)
    const seen = new Set<string>(fromProfiles.map(r => r.id));
    const inactiveIds = new Set(profiles.filter(p => p.status === 'inactive').map(p => p.id));
    leads.forEach(l => {
      if (l.responsavel_usuario_id && !seen.has(l.responsavel_usuario_id) && l.responsible && !inactiveIds.has(l.responsavel_usuario_id)) {
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
    const prodObj = lead.product_id
      ? products.find((p: any) => p.id === lead.product_id)
      : financialCalculator.findProduct(lead.product || '', products);
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

    const matchesProduct = selectedProducts.length === 0 || (() => {
      if (lead.product_id) return selectedProducts.includes(lead.product_id);
      return selectedProducts.some(id => {
        const prod = products.find((p: any) => p.id === id);
        return prod ? leadProductLower.includes(prod.name.toLowerCase().trim()) : false;
      });
    })();

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
