import { useState, useEffect, useCallback } from 'react';
import { Settings, Loader2, ToggleLeft, ToggleRight, Plus, X, Save, Percent, DollarSign, Users2, Pencil, Pause, Play, Trash2 } from 'lucide-react';
import { financialRulesService } from '../../services/financialRulesService';
import { commissionRulesService } from '../../services/commissionRulesService';
import { PartnerRule, FinancialFeeRule, FinancialCategory, UserCompensationProfile, RoleType, CommissionRule } from '../../types/finance_v2';
import { compensationProfileService, VALID_LEVELS } from '../../services/compensationProfileService';
import { profileService, UserProfile } from '../../services/profileService';
import { categoryService } from '../../services/categoryService';
import { cn } from '../../lib/utils';

type SettingsSection = 'partner' | 'fees' | 'ote' | 'commission';

export function SettingsTab() {
  const [section, setSection] = useState<SettingsSection>('ote');

  const sectionLabels: Record<SettingsSection, string> = {
    ote: 'Perfis OTE',
    commission: 'Regras de Comissão',
    partner: 'Regras de Parceria',
    fees: 'Taxas e Deduções',
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <Settings size={18} className="text-slate-400" />
        <span className="text-sm font-bold text-slate-600">Configurações Financeiras</span>
        <span className="text-slate-200">|</span>
        {(['ote', 'commission', 'partner', 'fees'] as SettingsSection[]).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              section === s ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-50')}>
            {sectionLabels[s]}
          </button>
        ))}
      </div>

      {section === 'ote' && <OteProfilesSection />}
      {section === 'commission' && <CommissionRulesSection />}
      {section === 'partner' && <PartnerRulesSection />}
      {section === 'fees' && <FeeRulesSection />}
    </div>
  );
}

// ─── Seção: Perfis OTE ────────────────────────────────────────────────────────
type EditingState = {
  id: string;
  role_type: RoleType;
  level: string;
  start_date: string;
  end_date: string | null;
};

function OteProfilesSection() {
  const [profiles, setProfiles] = useState<(UserCompensationProfile & { user_name?: string })[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [form, setForm] = useState({
    user_id: '',
    role_type: 'CLOSER' as RoleType,
    level: 'Junior 1',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null as string | null,
    active: true,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, u] = await Promise.all([compensationProfileService.getAll(), profileService.getProfiles()]);
      setProfiles(p);
      setUsers(u);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await compensationProfileService.create({ ...form, end_date: form.end_date || null });
      if (!result) {
        setSaveError('Não foi possível salvar o perfil. Verifique o console ou as permissões no banco de dados.');
        return;
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      setSaveError(err?.message || 'Erro inesperado ao salvar o perfil.');
    } finally { setIsSaving(false); }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editing) return;
    setIsSaving(true);
    try {
      await compensationProfileService.update(id, {
        role_type: editing.role_type,
        level: editing.level,
        start_date: editing.start_date,
        end_date: editing.end_date || null,
      });
      setEditing(null);
      await load();
    } finally { setIsSaving(false); }
  };

  const handleToggle = async (p: UserCompensationProfile) => {
    await compensationProfileService.setActive(p.id, !p.active);
    load();
  };

  const handleDelete = async (p: UserCompensationProfile & { user_name?: string }) => {
    if (!confirm(`Excluir permanentemente o perfil OTE de "${p.user_name}" (${p.role_type} — ${p.level})?\n\nEsta ação não pode ser desfeita.`)) return;
    await compensationProfileService.delete(p.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-700 font-semibold">Perfis de Compensação OTE</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Fonte oficial do nível de cada colaborador. Usado no cálculo e auditoria de comissões.
          </p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setSaveError(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Fechar' : 'Novo Perfil'}
        </button>
      </div>

      {saveError && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <span className="text-rose-500 mt-0.5 shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-rose-700">Erro ao salvar perfil</p>
            <p className="text-xs text-rose-600 mt-0.5">{saveError}</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-indigo-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Users2 size={16} className="text-indigo-600" /> Configurar Nível OTE</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Colaborador</label>
              <select required value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="">Selecione...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Função no OTE</label>
              <select value={form.role_type} onChange={e => setForm(p => ({ ...p, role_type: e.target.value as RoleType }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                <option value="CLOSER">CLOSER (Vendedor)</option>
                <option value="SDR">SDR</option>
                <option value="MANAGER">MANAGER (Gestor)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nível</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                {VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Início</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Fim (opcional)</label>
              <input type="date" value={form.end_date || ''} onChange={e => setForm(p => ({ ...p, end_date: e.target.value || null }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-7 h-7 text-indigo-500 animate-spin" /></div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 p-6">
            <Users2 className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-slate-500 text-sm font-medium">Nenhum perfil OTE cadastrado.</p>
            <p className="text-slate-400 text-xs mt-1">Configure o nível de cada vendedor/gestor para habilitar o recálculo de OTE.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-5 py-4">Colaborador</th>
                <th className="px-5 py-4">Função</th>
                <th className="px-5 py-4">Nível</th>
                <th className="px-5 py-4">Vigência</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map(p => {
                const isEditing = editing?.id === p.id;
                return (
                  <tr key={p.id} className={cn('transition-colors', !p.active ? 'bg-slate-50/60 opacity-60' : 'hover:bg-slate-50/40')}>
                    {/* Colaborador */}
                    <td className="px-5 py-3 font-medium text-slate-800">{p.user_name}</td>

                    {/* Função */}
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <select value={editing.role_type} onChange={e => setEditing(ed => ed && ({ ...ed, role_type: e.target.value as RoleType }))}
                          className="px-2 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs outline-none w-36">
                          <option value="CLOSER">CLOSER</option>
                          <option value="SDR">SDR</option>
                          <option value="MANAGER">MANAGER</option>
                        </select>
                      ) : (
                        <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-bold',
                          p.role_type === 'CLOSER' ? 'bg-emerald-100 text-emerald-700' :
                          p.role_type === 'MANAGER' ? 'bg-violet-100 text-violet-700' :
                          'bg-blue-100 text-blue-700')}>
                          {p.role_type}
                        </span>
                      )}
                    </td>

                    {/* Nível */}
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <select value={editing.level} onChange={e => setEditing(ed => ed && ({ ...ed, level: e.target.value }))}
                          className="px-2 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs outline-none w-28">
                          {VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{p.level}</span>
                      )}
                    </td>

                    {/* Vigência */}
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input type="date" value={editing.start_date}
                            onChange={e => setEditing(ed => ed && ({ ...ed, start_date: e.target.value }))}
                            className="px-2 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs outline-none w-32" />
                          <span className="text-slate-400">→</span>
                          <input type="date" value={editing.end_date || ''}
                            onChange={e => setEditing(ed => ed && ({ ...ed, end_date: e.target.value || null }))}
                            className="px-2 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs outline-none w-32" />
                        </div>
                      ) : (
                        <>
                          {new Date(p.start_date + 'T12:00:00').toLocaleDateString('pt-BR')} →{' '}
                          {p.end_date ? new Date(p.end_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Em vigor'}
                        </>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
                        p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', p.active ? 'bg-emerald-500' : 'bg-slate-400')} />
                        {p.active ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveEdit(p.id)} disabled={isSaving} title="Confirmar edição"
                              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            </button>
                            <button onClick={() => setEditing(null)} title="Cancelar"
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Editar */}
                            <button onClick={() => setEditing({ id: p.id, role_type: p.role_type, level: p.level!, start_date: p.start_date, end_date: p.end_date })}
                              title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                              <Pencil size={15} />
                            </button>
                            {/* Pausar / Ativar */}
                            <button onClick={() => handleToggle(p)}
                              title={p.active ? 'Pausar perfil' : 'Reativar perfil'}
                              className={cn('p-1.5 rounded-lg transition-colors',
                                p.active ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600')}>
                              {p.active ? <Pause size={15} /> : <Play size={15} />}
                            </button>
                            {/* Excluir */}
                            <button onClick={() => handleDelete(p)} title="Excluir permanentemente"
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Seção: Regras de Parceria ────────────────────────────────────────────────
function PartnerRulesSection() {
  const [rules, setRules] = useState<PartnerRule[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ origin_type: 'PLUPPEX' as 'TARGET' | 'PLUPPEX', technology_fee_percent: 0, fixed_fee: 0, category_id: '' as string | null, valid_from: new Date().toISOString().split('T')[0], valid_until: '' as string | null, active: true });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [r, c] = await Promise.all([financialRulesService.getPartnerRules(), categoryService.getAll()]);
      setRules(r); setCategories(c);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (rule: PartnerRule) => {
    await financialRulesService.updatePartnerRule(rule.id, { active: !rule.active });
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await financialRulesService.createPartnerRule({ ...form, category_id: form.category_id || null, valid_until: form.valid_until || null, updated_at: new Date().toISOString() } as any);
      setShowForm(false);
      load();
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Percentuais e taxas de repasse para cada origem de venda. Estes valores são usados dinamicamente no relatório de Parceria.</p>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Fechar' : 'Nova Regra'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-indigo-200 p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Origem</label>
              <select value={form.origin_type} onChange={e => setForm(p => ({ ...p, origin_type: e.target.value as any }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                <option value="TARGET">TARGET</option>
                <option value="PLUPPEX">PLUPPEX</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Taxa %</label>
              <input type="number" step="0.01" value={form.technology_fee_percent} onChange={e => setForm(p => ({ ...p, technology_fee_percent: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Taxa Fixa (R$)</label>
              <input type="number" step="0.01" value={form.fixed_fee} onChange={e => setForm(p => ({ ...p, fixed_fee: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Vigência Início</label>
              <input type="date" value={form.valid_from} onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Vigência Fim (opcional)</label>
              <input type="date" value={form.valid_until || ''} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value || null }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-7 h-7 text-indigo-500 animate-spin" /></div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40"><Settings className="w-12 h-12 text-slate-200 mb-3" /><p className="text-slate-500 text-sm">Nenhuma regra de parceria cadastrada.</p></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-5 py-4">Origem</th>
                <th className="px-5 py-4 text-right">Taxa %</th>
                <th className="px-5 py-4 text-right">Taxa Fixa</th>
                <th className="px-5 py-4">Vigência</th>
                <th className="px-5 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-bold', r.origin_type === 'TARGET' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700')}>
                      {r.origin_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-slate-700">{r.technology_fee_percent}%</td>
                  <td className="px-5 py-3.5 text-right text-slate-600">R$ {r.fixed_fee.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(r.valid_from).toLocaleDateString('pt-BR')} → {r.valid_until ? new Date(r.valid_until).toLocaleDateString('pt-BR') : 'Indefinido'}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => handleToggle(r)} className={cn('transition-colors', r.active ? 'text-emerald-500 hover:text-emerald-700' : 'text-slate-300 hover:text-slate-500')}>
                      {r.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FeeRulesSection() {
  const [rules, setRules] = useState<FinancialFeeRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: '', amount: 0, is_percentage: true, type: 'TAX' as FinancialFeeRule['type'], application_context: 'GROSS_REVENUE' as FinancialFeeRule['application_context'], valid_from: new Date().toISOString().split('T')[0], valid_until: '' as string | null, active: true });

  const load = useCallback(async () => {
    setIsLoading(true);
    try { setRules(await financialRulesService.getFeeRules()); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (rule: FinancialFeeRule) => {
    await financialRulesService.updateFeeRule(rule.id, { active: !rule.active });
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await financialRulesService.createFeeRule({ ...form, valid_until: form.valid_until || null, updated_at: new Date().toISOString() } as any);
      setShowForm(false);
      load();
    } finally { setIsSaving(false); }
  };

  const typeLabel: Record<string, string> = { TAX: 'Imposto', GATEWAY: 'Gateway', DISCOUNT: 'Desconto', ADMIN_FEE: 'Taxa Adm.', TECHNOLOGY: 'Tecnologia' };
  const ctxLabel: Record<string, string> = { GROSS_REVENUE: 'Receita Bruta', NET_REVENUE: 'Receita Líquida', SPECIFIC_SALE: 'Venda Específica', CLASS: 'Turma', PARTNER: 'Parceria' };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Taxas, impostos e deduções aplicados nos cálculos do DRE.</p>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Fechar' : 'Nova Taxa'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-indigo-200 p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Simples Nacional, Stripe fee..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                {Object.entries(typeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Valor</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Formato</label>
              <select value={form.is_percentage ? 'pct' : 'fixed'} onChange={e => setForm(p => ({ ...p, is_percentage: e.target.value === 'pct' }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                <option value="pct">Percentual (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Aplicação</label>
              <select value={form.application_context} onChange={e => setForm(p => ({ ...p, application_context: e.target.value as any }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                {Object.entries(ctxLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-7 h-7 text-indigo-500 animate-spin" /></div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40"><Percent className="w-12 h-12 text-slate-200 mb-3" /><p className="text-slate-500 text-sm">Nenhuma taxa cadastrada.</p></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-5 py-4">Nome</th>
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4 text-right">Valor</th>
                <th className="px-5 py-4">Aplicação</th>
                <th className="px-5 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{r.name}</td>
                  <td className="px-5 py-3.5"><span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{typeLabel[r.type]}</span></td>
                  <td className="px-5 py-3.5 text-right font-bold text-slate-700">
                    {r.is_percentage ? <span className="flex items-center justify-end gap-1"><Percent size={13} />{r.amount}%</span> : <span className="flex items-center justify-end gap-1"><DollarSign size={13} />R$ {r.amount.toFixed(2)}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{ctxLabel[r.application_context]}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => handleToggle(r)} className={cn('transition-colors', r.active ? 'text-emerald-500 hover:text-emerald-700' : 'text-slate-300 hover:text-slate-500')}>
                      {r.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Seção: Regras de Comissão OTE ───────────────────────────────────────────
type CREditing = {
  id: string;
  role_type: RoleType;
  level: string;
  target_revenue: number;
  fixed_amount: number;
  variable_amount: number;
  accelerator_amount: number;
};

const EMPTY_CR_FORM = {
  role_type: 'CLOSER' as RoleType,
  level: 'Junior 1',
  target_revenue: 0,
  fixed_amount: 0,
  variable_amount: 0,
  accelerator_amount: 0,
  active: true,
};

function CommissionRulesSection() {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CREditing | null>(null);
  const [form, setForm] = useState({ ...EMPTY_CR_FORM });

  const load = useCallback(async () => {
    setIsLoading(true);
    try { setRules(await commissionRulesService.getAll()); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await commissionRulesService.create(form);
      if (!result) { setSaveError('Não foi possível salvar. Verifique as permissões no banco.'); return; }
      setShowForm(false);
      setForm({ ...EMPTY_CR_FORM });
      await load();
    } catch (err: any) {
      setSaveError(err?.message || 'Erro inesperado ao salvar.');
    } finally { setIsSaving(false); }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editing) return;
    setIsSaving(true);
    try {
      await commissionRulesService.update(id, {
        role_type: editing.role_type,
        level: editing.level,
        target_revenue: editing.target_revenue,
        fixed_amount: editing.fixed_amount,
        variable_amount: editing.variable_amount,
        accelerator_amount: editing.accelerator_amount,
      });
      setEditing(null);
      await load();
    } finally { setIsSaving(false); }
  };

  const handleToggle = async (r: CommissionRule) => {
    await commissionRulesService.setActive(r.id, !r.active);
    load();
  };

  const handleDelete = async (r: CommissionRule) => {
    if (!confirm(`Excluir regra "${r.role_type} — ${r.level}"?\n\nEsta ação não pode ser desfeita.`)) return;
    await commissionRulesService.delete(r.id);
    load();
  };

  const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const grouped = ['CLOSER', 'SDR', 'MANAGER'].reduce<Record<string, CommissionRule[]>>((acc, role) => {
    acc[role] = rules.filter(r => r.role_type === role);
    return acc;
  }, {});

  const roleBadge: Record<string, string> = {
    CLOSER: 'bg-emerald-100 text-emerald-700',
    SDR: 'bg-blue-100 text-blue-700',
    MANAGER: 'bg-violet-100 text-violet-700',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-700 font-semibold">Regras de Comissão OTE</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Define fixo, variável, meta e acelerador por cargo + nível. Usadas no cálculo automático de comissões.
          </p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setSaveError(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Fechar' : 'Nova Regra'}
        </button>
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <span className="text-rose-500 mt-0.5 shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-rose-700">Erro ao salvar regra</p>
            <p className="text-xs text-rose-600 mt-0.5">{saveError}</p>
          </div>
        </div>
      )}

      {/* Formulário de criação */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-indigo-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-700 text-sm">Nova Regra de Comissão</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Cargo</label>
              <select value={form.role_type} onChange={e => setForm(p => ({ ...p, role_type: e.target.value as RoleType }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                <option value="CLOSER">CLOSER</option>
                <option value="SDR">SDR</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nível</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                {VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Meta (R$)</label>
              <input type="number" step="0.01" min="0" value={form.target_revenue}
                onChange={e => setForm(p => ({ ...p, target_revenue: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Fixo (R$)</label>
              <input type="number" step="0.01" min="0" value={form.fixed_amount}
                onChange={e => setForm(p => ({ ...p, fixed_amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Variável 100% (R$)</label>
              <input type="number" step="0.01" min="0" value={form.variable_amount}
                onChange={e => setForm(p => ({ ...p, variable_amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Acelerador / step (R$)</label>
              <input type="number" step="0.01" min="0" value={form.accelerator_amount}
                onChange={e => setForm(p => ({ ...p, accelerator_amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
          </div>
          <p className="text-xs text-slate-400">OTE total = Fixo + Variável 100%. Acelerador = valor ganho a cada 5% acima da meta.</p>
          <div className="flex justify-end">
            <button type="submit" disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
            </button>
          </div>
        </form>
      )}

      {/* Tabelas por cargo */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-7 h-7 text-indigo-500 animate-spin" /></div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-white rounded-2xl border border-slate-200">
          <Settings className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 text-sm font-medium">Nenhuma regra de comissão cadastrada.</p>
          <p className="text-slate-400 text-xs mt-1">Crie ao menos uma regra por cargo/nível para habilitar o cálculo de OTE.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(['CLOSER', 'SDR', 'MANAGER'] as RoleType[]).map(role => {
            const roleRules = grouped[role];
            if (roleRules.length === 0) return null;
            return (
              <div key={role} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b flex items-center gap-2">
                  <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-bold', roleBadge[role])}>{role}</span>
                  <span className="text-xs text-slate-500">{roleRules.length} regra(s)</span>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3">Nível</th>
                      <th className="px-4 py-3 text-right">Meta</th>
                      <th className="px-4 py-3 text-right">Fixo</th>
                      <th className="px-4 py-3 text-right">Variável 100%</th>
                      <th className="px-4 py-3 text-right">Acelerador</th>
                      <th className="px-4 py-3 text-right">OTE Total</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roleRules.map(r => {
                      const isEd = editing?.id === r.id;
                      return (
                        <tr key={r.id} className={cn('transition-colors', !r.active ? 'opacity-50 bg-slate-50/40' : 'hover:bg-slate-50/40')}>
                          {/* Nível */}
                          <td className="px-4 py-3">
                            {isEd ? (
                              <select value={editing.level} onChange={e => setEditing(ed => ed && ({ ...ed, level: e.target.value }))}
                                className="px-2 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs outline-none w-28">
                                {VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            ) : (
                              <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{r.level}</span>
                            )}
                          </td>
                          {/* Meta */}
                          <td className="px-4 py-3 text-right text-slate-600">
                            {isEd ? <input type="number" step="0.01" value={editing.target_revenue}
                              onChange={e => setEditing(ed => ed && ({ ...ed, target_revenue: parseFloat(e.target.value) || 0 }))}
                              className="w-28 px-2 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs outline-none text-right" />
                            : fmt(r.target_revenue)}
                          </td>
                          {/* Fixo */}
                          <td className="px-4 py-3 text-right text-slate-600">
                            {isEd ? <input type="number" step="0.01" value={editing.fixed_amount}
                              onChange={e => setEditing(ed => ed && ({ ...ed, fixed_amount: parseFloat(e.target.value) || 0 }))}
                              className="w-28 px-2 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs outline-none text-right" />
                            : fmt(r.fixed_amount)}
                          </td>
                          {/* Variável */}
                          <td className="px-4 py-3 text-right text-slate-600">
                            {isEd ? <input type="number" step="0.01" value={editing.variable_amount}
                              onChange={e => setEditing(ed => ed && ({ ...ed, variable_amount: parseFloat(e.target.value) || 0 }))}
                              className="w-28 px-2 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs outline-none text-right" />
                            : fmt(r.variable_amount)}
                          </td>
                          {/* Acelerador */}
                          <td className="px-4 py-3 text-right text-slate-600">
                            {isEd ? <input type="number" step="0.01" value={editing.accelerator_amount}
                              onChange={e => setEditing(ed => ed && ({ ...ed, accelerator_amount: parseFloat(e.target.value) || 0 }))}
                              className="w-28 px-2 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg text-xs outline-none text-right" />
                            : <span className="text-emerald-600 font-medium">{fmt(r.accelerator_amount)}</span>}
                          </td>
                          {/* OTE Total */}
                          <td className="px-4 py-3 text-right font-bold text-slate-800">
                            {isEd
                              ? fmt(editing.fixed_amount + editing.variable_amount)
                              : fmt(r.fixed_amount + r.variable_amount)}
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
                              r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', r.active ? 'bg-emerald-500' : 'bg-slate-400')} />
                              {r.active ? 'Ativa' : 'Inativa'}
                            </span>
                          </td>
                          {/* Ações */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {isEd ? (
                                <>
                                  <button onClick={() => handleSaveEdit(r.id)} disabled={isSaving} title="Salvar"
                                    className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                  </button>
                                  <button onClick={() => setEditing(null)} title="Cancelar"
                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                                    <X size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => setEditing({ id: r.id, role_type: r.role_type, level: r.level, target_revenue: r.target_revenue, fixed_amount: r.fixed_amount, variable_amount: r.variable_amount, accelerator_amount: r.accelerator_amount })}
                                    title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                    <Pencil size={14} />
                                  </button>
                                  <button onClick={() => handleToggle(r)} title={r.active ? 'Desativar' : 'Ativar'}
                                    className={cn('p-1.5 rounded-lg transition-colors', r.active ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600')}>
                                    {r.active ? <Pause size={14} /> : <Play size={14} />}
                                  </button>
                                  <button onClick={() => handleDelete(r)} title="Excluir"
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
