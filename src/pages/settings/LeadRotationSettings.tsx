import React, { useState, useEffect } from 'react';
import { RefreshCcw, User, CheckCircle2, XCircle, Loader2, Search, Filter } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import { useProductStore } from '../../store/useProductStore';
import { settingsService } from '../../services/settingsService';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function LeadRotationSettings() {
  const { profiles, fetchProfiles, loading: profilesLoading } = useProfileStore();
  const { products, fetchProducts } = useProductStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [routingMap, setRoutingMap] = useState<Record<string, string[]>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchProducts();
    settingsService.getSetting('round_robin_products', {}).then(data => {
      setRoutingMap(data || {});
      setSettingsLoading(false);
    });
  }, [fetchProfiles, fetchProducts]);

  const commercialProfiles = profiles.filter(p => {
    const isComercial = p.department?.toLowerCase() === 'comercial';
    const cargoLower = (p.cargos?.name || '').toLowerCase();
    const isCloser = cargoLower.includes('closer');
    const isVendedor = cargoLower.includes('vendedor') || cargoLower.includes('consultor');
    return isComercial || isVendedor || isCloser;
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

  const toggleProduct = (profileId: string, productName: string) => {
    const currentList = routingMap[profileId] || [];
    let newList;
    if (currentList.includes(productName)) {
      newList = currentList.filter(p => p !== productName);
    } else {
      newList = [...currentList, productName];
    }
    
    setRoutingMap({ ...routingMap, [profileId]: newList });
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const success = await settingsService.updateSetting('round_robin_products', routingMap);
      if (success) {
        setHasUnsavedChanges(false);
        // Opcional: mostrar um toast de sucesso (vou deixar sem alert intrusivo por enquanto)
      } else {
        alert('Falha ao salvar. Verifique sua conexão.');
      }
    } catch (error) {
      console.error('Failed to save routing preferences', error);
      alert('Erro ao salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = profilesLoading || settingsLoading;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <RefreshCcw className="w-6 h-6 text-emerald-600" />
            Rodízio de Leads
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie quem participa da distribuição automática de novos leads do formulário.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveSettings}
            disabled={!hasUnsavedChanges || isSaving}
            className={cn(
              "px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm",
              hasUnsavedChanges
                ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Salvar Alterações
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Pesquisar closer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          ) : filteredProfiles.length > 0 ? (
            filteredProfiles.map((profile) => {
              const activeProducts = routingMap[profile.id] || [];
              const isAllProducts = activeProducts.length === 0;

              return (
                <div key={profile.id} className="p-4 flex flex-col gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-400">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{profile.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{profile.email} • {profile.cargos?.name || 'Vendedor'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          profile.in_round_robin !== false ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400"
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
                            ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
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

                  {/* Configuração de Produtos */}
                  {profile.in_round_robin !== false && (
                    <div className="ml-13 pl-4 border-l-2 border-slate-100 dark:border-slate-800 py-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Filtro de Produtos:
                        </span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          isAllProducts 
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" 
                            : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                        )}>
                          {isAllProducts ? 'Recebe Todos' : 'Especialista Exclusivo'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'drone', name: 'Curso de Drone' },
                          { id: 'inseminacao', name: 'Curso de Inseminação Artificial' }
                        ].map(prod => {
                          const isSelected = activeProducts.includes(prod.name);
                          return (
                            <button
                              key={prod.id}
                              onClick={() => toggleProduct(profile.id, prod.name)}
                              className={cn(
                                "text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 select-none flex items-center gap-1.5 font-medium",
                                isSelected 
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:border-emerald-500" 
                                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                              )}
                            >
                              {isSelected ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                              )}
                              {prod.name}
                            </button>
                          );
                        })}
                      </div>
                      {isAllProducts && (
                        <p className="text-[10px] text-slate-400 mt-2">
                          * Nenhuma tag selecionada: este closer está apto a receber leads de <b>qualquer</b> produto. Selecione tags para restringir a distribuição.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <RefreshCcw className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p>Nenhum closer encontrado.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-4 flex gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
          <RefreshCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Como funciona o rodízio por produto?</h4>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed mt-1">
            Novos leads vindos do formulário do site são distribuídos automaticamente entre os closers ativados nesta página.
            Se você selecionar produtos específicos para um vendedor, ele <b>só</b> receberá leads desses produtos.
            Se você não selecionar nenhum produto, o vendedor receberá <b>todos</b> os leads.
          </p>
        </div>
      </div>
    </div>
  );
}
