import React, { useState, useEffect } from 'react';
import { RefreshCcw, User, CheckCircle2, XCircle, Loader2, Search } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function LeadRotationSettings() {
  const { profiles, fetchProfiles, loading } = useProfileStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const commercialProfiles = profiles.filter(p => {
    const isComercial = p.department?.toLowerCase() === 'comercial';
    const isVendedor = p.cargos?.name?.toLowerCase().includes('vendedor') || p.cargos?.name?.toLowerCase().includes('consultor');
    return isComercial || isVendedor;
  });

  const filteredProfiles = commercialProfiles.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRotation = async (profileId: string, currentState: boolean) => {
    setUpdatingId(profileId);
    try {
      const { error } = await supabase
        .from('perfis')
        .update({ in_round_robin: !currentState })
        .eq('id', profileId);

      if (error) throw error;
      await fetchProfiles();
    } catch (error) {
      console.error('Error updating rotation status:', error);
      alert('Erro ao atualizar status do rodízio.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <RefreshCcw className="w-6 h-6 text-emerald-600" />
            Rodízio de Leads
          </h1>
          <p className="text-sm text-slate-500">Gerencie quem participa da distribuição automática de novos leads do formulário.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Pesquisar vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          ) : filteredProfiles.length > 0 ? (
            filteredProfiles.map((profile) => (
              <div key={profile.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{profile.name}</h3>
                    <p className="text-xs text-slate-500">{profile.email} • {profile.cargos?.name || 'Vendedor'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-2">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                      profile.in_round_robin !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {profile.in_round_robin !== false ? 'No Rodízio' : 'Bloqueado'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => toggleRotation(profile.id, profile.in_round_robin !== false)}
                    disabled={updatingId === profile.id}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm",
                      profile.in_round_robin !== false
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    )}
                  >
                    {updatingId === profile.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : profile.in_round_robin !== false ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        Bloquear
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Ativar
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-500">
              <RefreshCcw className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p>Nenhum vendedor encontrado.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <RefreshCcw className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-bold text-blue-800 text-sm">Como funciona o rodízio?</h4>
          <p className="text-xs text-blue-600/80 leading-relaxed mt-1">
            Novos leads vindos do formulário do site são distribuídos automaticamente entre os vendedores ativados nesta página, seguindo a ordem alfabética. Se um vendedor estiver "Bloqueado", ele será ignorado na distribuição.
          </p>
        </div>
      </div>
    </div>
  );
}
