import { useState, useMemo, useEffect } from 'react';
import type { Lead } from '../types/leads';
import { useProfileStore } from '../store/useProfileStore';
import { getSupabaseClient } from '../lib/supabase';

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
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedSquad, setSelectedSquad] = useState<string>('all');
  const [squadMapping, setSquadMapping] = useState<Record<string, string[]>>({});


  useEffect(() => {
    fetchProfiles();
    
    // Fetch squad members mapping
    const fetchSquads = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const [squadsRes, membersRes] = await Promise.all([
        supabase.from('squads').select('id, name'),
        supabase.from('squad_members').select('squad_id, user_id').eq('active', true)
      ]);

      if (squadsRes.data && membersRes.data) {
        const mapping: Record<string, string[]> = {};
        
        membersRes.data.forEach(m => {
          const squad = squadsRes.data.find(s => s.id === m.squad_id);
          if (!squad) return;
          
          const squadKey = squad.name.toUpperCase();
          if (!mapping[squadKey]) mapping[squadKey] = [];
          
          const profile = profiles.find(p => p.id === m.user_id);
          if (profile?.name) {
            mapping[squadKey].push(profile.name.toLowerCase());
          }
        });
        setSquadMapping(mapping);
      }
    };

    if (profiles.length > 0) {
      fetchSquads();
    }
  }, [fetchProfiles, profiles]);

  // Nome do usuário atual no perfil
  const myProfileName = useMemo(() => {
    if (!authUserId || profiles.length === 0) return null;
    return profiles.find((p: any) => p.id === authUserId)?.name ?? null;
  }, [authUserId, profiles]);

  // Nomes base únicos de produto
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
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.responsible && lead.responsible.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesResponsible = selectedResponsible === 'all' ||
      lead.responsavel_usuario_id === selectedResponsible ||
      (lead.responsible ?? '').trim().toLowerCase() === selectedResponsible.trim().toLowerCase();
    
    const selectedProductLower = selectedProduct.trim().toLowerCase();
    const leadProductLower = (lead.product ?? '').trim().toLowerCase();
    
    const matchesProduct = selectedProduct === 'all' ||
      leadProductLower === selectedProductLower ||
      leadProductLower.includes(selectedProductLower) ||
      selectedProductLower.includes(leadProductLower);
    
    const matchesStars = selectedStars.length === 0 || selectedStars.includes(lead.stars || 0);

    // O filtro de data foi removido completamente do Kanban a pedido do usuário.
    // Todos os leads (ativos ou não) devem aparecer nas colunas, sem sumir por causa da data.

    const matchesSquad = selectedSquad === 'all' || (() => {
      const squadName = selectedSquad.toUpperCase();
      const members = squadMapping[squadName] || [];
      const respLower = (lead.responsible ?? '').trim().toLowerCase();
      if (!respLower) return false;

      return members.some(mName => {
        if (mName === respLower) return true;
        if (mName.includes(respLower) || respLower.includes(mName)) return true;
        const leadWords = respLower.split(/\s+/).filter(w => w.length > 2);
        const memberWords = mName.split(/\s+/).filter(w => w.length > 2);
        const common = leadWords.filter(lw => memberWords.some(mw => mw.includes(lw) || lw.includes(mw)));
        return common.length >= 2;
      });
    })();

    return matchesSearch && matchesResponsible && matchesProduct && matchesStars && matchesSquad;
  }), [leads, searchTerm, selectedResponsible, selectedProduct, selectedStars, selectedSquad, profiles, squadMapping]);


  const activeFilterCount = useMemo(() => [
    selectedResponsible !== 'all',
    selectedProduct !== 'all',
    selectedStatus !== 'all',
    selectedStars.length > 0,
    selectedSquad !== 'all',
    searchTerm !== '',
  ].filter(Boolean).length, [selectedResponsible, selectedProduct, selectedStatus, selectedStars, selectedSquad, searchTerm]);


  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedResponsible('all');
    setSelectedProduct('all');
    setSelectedStatus('all');
    setSelectedStars([]);
    setSelectedSquad('all');
  };


  return {
    searchTerm,
    selectedStatus,
    selectedProduct,
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
    setSelectedProduct,
    setSelectedResponsible,
    setSelectedStars,
    setSelectedSquad,
  };

};
