import { useState, useMemo, useEffect } from 'react';
import type { Lead } from '../types/leads';
import { useProfileStore } from '../store/useProfileStore';
import { getSupabaseClient } from '../lib/supabase';

export const usePipelineFilters = (
  leads: Lead[], 
  authUserId?: string, 
  isComercial?: boolean,
  startDate?: string,
  endDate?: string,
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

  // Nomes de responsáveis
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
      (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
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

    // Filter by Date (Turma Date if available, otherwise Creation Date)
    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;
    
    let leadDateStr = lead.created_at;
    if (leadToTurmaDate && leadToTurmaDate[lead.id]) {
      leadDateStr = leadToTurmaDate[lead.id];
    } else if (lead.product) {
      // Tenta extrair data do campo produto (padrão: "Produto, Local, DD/MM/YYYY")
      const dateMatch = lead.product.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        leadDateStr = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }
    }

    if (leadDateStr) {
      const lDate = new Date(leadDateStr.split('T')[0] + "T12:00:00");
      if (start && lDate < start) return false;
      if (end && lDate > end) return false;
    }

    const matchesSquad = selectedSquad === 'all' || (() => {
      const squadName = selectedSquad.toUpperCase(); // Ex: "TARGET" ou "PLUPPEX"
      const members = squadMapping[squadName] || [];
      if (!leadResponsibleLower) return false;

      // Smart match
      return members.some(mName => {
        if (mName === leadResponsibleLower) return true;
        if (mName.includes(leadResponsibleLower) || leadResponsibleLower.includes(mName)) return true;
        
        const leadWords = leadResponsibleLower.split(/\s+/).filter(w => w.length > 2);
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
