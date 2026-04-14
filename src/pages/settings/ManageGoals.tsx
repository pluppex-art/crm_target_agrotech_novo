import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, Building2, User } from 'lucide-react';
import { goalService } from '../../services/goalService';
import { useProfileStore } from '../../store/useProfileStore';
import type { UserProfile } from '../../services/profileService';

interface SellerGoalsListProps {
  sellers: UserProfile[];
  sellerGoals: Record<string, { revenue: string; leads: string }>;
  savingSeller: string | null;
  savedSeller: string | null;
  updateSeller: (name: string, field: 'revenue' | 'leads', value: string) => void;
  handleSaveSeller: (name: string) => void;
}

function SellerGoalsList({ sellers, sellerGoals, savingSeller, savedSeller, updateSeller, handleSaveSeller }: SellerGoalsListProps) {
  if (sellers.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        Nenhum usuário com cargo de vendedor cadastrado.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {sellers.map(profile => {
        const name = profile.name || profile.email || '?';
        const g = sellerGoals[name] || { revenue: '', leads: '' };
        const isSaving = savingSeller === name;
        const isSaved = savedSeller === name;
        return (
          <div key={profile.id} className="border border-slate-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-slate-700 text-sm">{name}</span>
              {profile.department && (
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                  {profile.department}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <GoalInput
                label="Receita (R$)"
                prefix="R$"
                value={g.revenue}
                onChange={v => updateSeller(name, 'revenue', v)}
              />
              <GoalInput
                label="Leads fechados"
                value={g.leads}
                onChange={v => updateSeller(name, 'leads', v.replace(/\D/g, ''))}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => handleSaveSeller(name)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {isSaved ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function parseBR(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0;
}

function GoalInput({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-xs font-bold text-slate-400 pointer-events-none">{prefix}</span>
        )}
        <input
          type="text"
          value={value}
          onChange={e => {
            const raw = e.target.value.replace(/\D/g, '');
            onChange(raw ? Number(raw).toLocaleString('pt-BR') : '');
          }}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-700 text-sm"
          style={{ paddingLeft: prefix ? '2.75rem' : undefined }}
          placeholder="0"
        />
      </div>
    </div>
  );
}

export function ManageGoals() {
  const { profiles, fetchProfiles } = useProfileStore();

  // Company goal state
  const [companyRevenue, setCompanyRevenue] = useState('');
  const [companyLeads, setCompanyLeads] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);
  const [savedCompany, setSavedCompany] = useState(false);

  // Per-seller goal state: { [name]: { revenue, leads } }
  const [sellerGoals, setSellerGoals] = useState<Record<string, { revenue: string; leads: string }>>({});
  const [savingSeller, setSavingSeller] = useState<string | null>(null);
  const [savedSeller, setSavedSeller] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    const [goals] = await Promise.all([goalService.getGoals(), fetchProfiles()]);

    const company = goals.find(g => g.type === 'company');
    if (company) {
      setCompanyRevenue(company.revenue_goal ? company.revenue_goal.toLocaleString('pt-BR') : '');
      setCompanyLeads(company.leads_goal ? String(company.leads_goal) : '');
    }

    const sellerMap: Record<string, { revenue: string; leads: string }> = {};
    goals.filter(g => g.type === 'seller' && g.seller_name).forEach(g => {
      sellerMap[g.seller_name!] = {
        revenue: g.revenue_goal ? g.revenue_goal.toLocaleString('pt-BR') : '',
        leads: g.leads_goal ? String(g.leads_goal) : '',
      };
    });
    setSellerGoals(sellerMap);
    setLoading(false);
  }, [fetchProfiles]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    await goalService.upsertCompanyGoal(parseBR(companyRevenue), Number(companyLeads) || 0);
    setSavingCompany(false);
    setSavedCompany(true);
    setTimeout(() => setSavedCompany(false), 2000);
  };

  const handleSaveSeller = async (name: string) => {
    setSavingSeller(name);
    const g = sellerGoals[name] || { revenue: '', leads: '' };
    await goalService.upsertSellerGoal(name, parseBR(g.revenue), Number(g.leads) || 0);
    setSavingSeller(null);
    setSavedSeller(name);
    setTimeout(() => setSavedSeller(null), 2000);
  };

  const updateSeller = (name: string, field: 'revenue' | 'leads', value: string) => {
    setSellerGoals(prev => ({
      ...prev,
      [name]: { ...(prev[name] || { revenue: '', leads: '' }), [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Metas</h1>
        <p className="text-sm text-slate-500">Defina metas de receita e leads fechados para a empresa e para cada vendedor.</p>
      </div>

      {/* Company goals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Meta da Empresa</h2>
            <p className="text-xs text-slate-400">Objetivo geral mensal do time comercial</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <GoalInput
            label="Receita mensal (R$)"
            prefix="R$"
            value={companyRevenue}
            onChange={setCompanyRevenue}
          />
          <GoalInput
            label="Leads fechados"
            value={companyLeads}
            onChange={setCompanyLeads}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveCompany}
            disabled={savingCompany}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-60"
          >
            {savingCompany ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {savedCompany ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Seller goals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Metas por Vendedor</h2>
            <p className="text-xs text-slate-400">Metas individuais mensais por colaborador</p>
          </div>
        </div>

        <SellerGoalsList
          sellers={profiles.filter(p => p.cargos?.name?.toLowerCase().includes('vend'))}
          sellerGoals={sellerGoals}
          savingSeller={savingSeller}
          savedSeller={savedSeller}
          updateSeller={updateSeller}
          handleSaveSeller={handleSaveSeller}
        />
      </div>
    </div>
  );
}
