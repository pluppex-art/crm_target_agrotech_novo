import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, Percent, ArrowLeft } from 'lucide-react';
import { commissionService, type SellerCommission } from '../../services/commissionService';
import { useProfileStore } from '../../store/useProfileStore';
import { isVendedor } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface RatePair {
  pluppex: string;
  target: string;
}

export function ManageCommissions() {
  const navigate = useNavigate();
  const { profiles, fetchProfiles } = useProfileStore();
  const sellers = profiles.filter(isVendedor);

  const [rates, setRates] = useState<Record<string, RatePair>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const loadCommissions = useCallback(async () => {
    const data = await commissionService.getAll();
    const map: Record<string, RatePair> = {};
    data.forEach((c: SellerCommission) => {
      map[c.seller_name] = {
        pluppex: String(c.pluppex_rate),
        target: String(c.target_rate),
      };
    });
    setRates(map);
  }, []);

  useEffect(() => { loadCommissions(); }, [loadCommissions]);

  const parse = (v: string) => parseFloat(v.replace(',', '.')) || 0;

  const handleSave = async (sellerName: string) => {
    setSaving(sellerName);
    const pair = rates[sellerName] ?? { pluppex: '0', target: '0' };
    await commissionService.upsert(sellerName, parse(pair.pluppex), parse(pair.target));
    setSaving(null);
    setSaved(sellerName);
    setTimeout(() => setSaved(null), 2000);
  };

  const setRate = (name: string, field: 'pluppex' | 'target', value: string) => {
    setRates(prev => ({
      ...prev,
      [name]: { ...(prev[name] ?? { pluppex: '', target: '' }), [field]: value },
    }));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Voltar para Configurações
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Comissões por Vendedor</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure o percentual de comissão Pluppex e Target para cada vendedor. Usado no cálculo do DRE financeiro.
        </p>
      </div>

      {/* Header labels */}
      {sellers.length > 0 && (
        <div className="flex items-center gap-4 px-4 mb-2">
          <div className="flex-1" />
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-28 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">% Pluppex</span>
            </div>
            <div className="w-28 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">% Target</span>
            </div>
            <div className="w-20" />
          </div>
        </div>
      )}

      {sellers.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">
          Nenhum vendedor cadastrado no sistema.
        </p>
      ) : (
        <div className="space-y-3">
          {sellers.map(profile => {
            const name = profile.name || profile.email || '?';
            const pair = rates[name] ?? { pluppex: '', target: '' };
            const isSaving = saving === name;
            const isSaved = saved === name;

            return (
              <div key={profile.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  {/* Seller info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-600 shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{name}</p>
                      {profile.department && (
                        <p className="text-[10px] uppercase font-bold text-slate-400">{profile.department}</p>
                      )}
                    </div>
                  </div>

                  {/* Rate inputs + save */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Pluppex rate */}
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={pair.pluppex}
                        onChange={e => setRate(name, 'pluppex', e.target.value)}
                        placeholder="0"
                        className="w-28 pl-3 pr-7 py-1.5 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right bg-indigo-50/40"
                      />
                      <Percent size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                    </div>

                    {/* Target rate */}
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={pair.target}
                        onChange={e => setRate(name, 'target', e.target.value)}
                        placeholder="0"
                        className="w-28 pl-3 pr-7 py-1.5 text-sm border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-right bg-emerald-50/40"
                      />
                      <Percent size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                    </div>

                    <button
                      onClick={() => handleSave(name)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-60 whitespace-nowrap w-20 justify-center"
                    >
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {isSaved ? 'Salvo!' : 'Salvar'}
                    </button>
                  </div>
                </div>

                {/* Total preview */}
                {(parse(pair.pluppex) > 0 || parse(pair.target) > 0) && (
                  <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full" />
                      Pluppex: <strong className="text-indigo-600">{parse(pair.pluppex)}%</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      Target: <strong className="text-emerald-600">{parse(pair.target)}%</strong>
                    </span>
                    <span className="ml-auto text-slate-400">
                      Total: <strong className="text-slate-600">{(parse(pair.pluppex) + parse(pair.target)).toFixed(1)}%</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
