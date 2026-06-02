import React, { useState, useEffect, useCallback } from 'react';
import { Users2, Plus, X, Loader2, Save, Pencil, Pause, Play, Trash2 } from 'lucide-react';
import { compensationProfileService, VALID_LEVELS } from '../../../services/compensationProfileService';
import { profileService, UserProfile } from '../../../services/profileService';
import { oteService } from '../../../services/oteService';
import { UserCompensationProfile, RoleType } from '../../../types/finance_v2';
import { cn } from '../../../lib/utils';

type EditingState = {
  id: string;
  role_type: RoleType;
  level: string;
  start_date: string;
  end_date: string | null;
  squad_id: string | null;
};

export function OteProfilesSection() {
  const [profiles, setProfiles] = useState<(UserCompensationProfile & { user_name?: string; squads_info?: { name: string; color?: string }[] })[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [squads, setSquads] = useState<{ id: string; name: string; manager_id: string | null; active: boolean }[]>([]);
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
    squad_id: '',
    active: true,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, u, s] = await Promise.all([
        compensationProfileService.getAll(),
        profileService.getProfiles(),
        compensationProfileService.getSquads(),
      ]);
      const activeUserIds = new Set(u.filter((user: any) => user.status === 'active').map((user: any) => user.id));
      setProfiles(p.filter((profile: any) => activeUserIds.has(profile.user_id)));
      setUsers(u.filter((user: any) => user.status === 'active'));
      setSquads(s);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id) return;
    if (form.role_type === 'MANAGER' && !form.squad_id) {
      setSaveError('Selecione o squad que este gestor gerencia.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const { squad_id: _squad, ...profileData } = form;
      const result = await compensationProfileService.create({ ...profileData, end_date: form.end_date || null });
      if (!result) {
        setSaveError('Não foi possível salvar o perfil.');
        return;
      }
      if (form.role_type === 'MANAGER' && form.squad_id) {
        await compensationProfileService.assignManagerToSquad(form.user_id, form.squad_id);
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      setSaveError(err?.message || 'Erro inesperado ao salvar o perfil.');
    } finally { setIsSaving(false); }
  };

  const handleSaveEdit = async (id: string, userId: string) => {
    if (!editing) return;
    setIsSaving(true);
    try {
      await compensationProfileService.update(id, {
        role_type: editing.role_type,
        level: editing.level,
        start_date: editing.start_date,
        end_date: editing.end_date || null,
      });
      if (editing.role_type === 'MANAGER') {
        await compensationProfileService.assignManagerToSquad(userId, editing.squad_id);
      }
      setEditing(null);
      await load();
    } finally { setIsSaving(false); }
  };

  const handleToggle = async (p: UserCompensationProfile) => {
    await compensationProfileService.setActive(p.id, !p.active);
    load();
  };

  const handleDelete = async (p: UserCompensationProfile & { user_name?: string }) => {
    try {
      const hasSales = await oteService.hasUserSales(p.user_id);
      if (hasSales) {
        alert(`Não é possível excluir totalmente o perfil de "${p.user_name}" pois ele já possui histórico de vendas.\n\nApenas desative o perfil.`);
        return;
      }
      if (!confirm(`Excluir perfil OTE de "${p.user_name}"?`)) return;
      await compensationProfileService.delete(p.id);
      load();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Perfis de Compensação OTE</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Fonte oficial do nível de cada colaborador.</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setSaveError(null); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Fechar' : 'Novo Perfil'}
        </button>
      </div>

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">{saveError}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2"><Users2 size={16} className="text-indigo-600" /> Configurar Nível OTE</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Colaborador</label>
              <select required value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
                <option value="">Selecione...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.name || u.email}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Função</label>
              <select value={form.role_type} onChange={e => setForm(p => ({ ...p, role_type: e.target.value as RoleType, squad_id: '' }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
                <option value="CLOSER">CLOSER</option>
                <option value="SDR">SDR</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
            {form.role_type === 'MANAGER' && (
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Squad Gerenciado</label>
                <select value={form.squad_id} onChange={e => setForm(p => ({ ...p, squad_id: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
                  <option value="">Selecione o squad...</option>
                  {squads.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Nível</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
                {VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Início</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-indigo-500" /></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 border-b">
              <tr>
                <th className="px-5 py-4">Colaborador</th>
                <th className="px-5 py-4">Função</th>
                <th className="px-5 py-4">Squad</th>
                <th className="px-5 py-4">Nível</th>
                <th className="px-5 py-4">Vigência</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map(p => {
                const isEditing = editing?.id === p.id;
                const managerSquad = squads.find(s => s.manager_id === p.user_id);
                return (
                  <tr key={p.id} className={cn('transition-colors', !p.active && 'bg-slate-50 dark:bg-slate-800/60 opacity-60')}>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{p.user_name}</td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <select value={editing.role_type} onChange={e => setEditing(ed => ed && ({ ...ed, role_type: e.target.value as RoleType, squad_id: null }))} className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-indigo-300 rounded text-xs outline-none">
                          <option value="CLOSER">CLOSER</option>
                          <option value="SDR">SDR</option>
                          <option value="MANAGER">MANAGER</option>
                        </select>
                      ) : <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">{p.role_type}</span>}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing && editing.role_type === 'MANAGER' ? (
                        <select value={editing.squad_id || ''} onChange={e => setEditing(ed => ed && ({ ...ed, squad_id: e.target.value || null }))} className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-indigo-300 rounded text-xs outline-none">
                          <option value="">Sem squad</option>
                          {squads.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      ) : p.squads_info && p.squads_info.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.squads_info.map((sq, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${sq.color || '#6366f1'}20`, color: sq.color || '#6366f1' }}>{sq.name}</span>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <select value={editing.level} onChange={e => setEditing(ed => ed && ({ ...ed, level: e.target.value }))} className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-indigo-300 rounded text-xs outline-none">
                          {VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      ) : <span className="font-bold text-slate-600 dark:text-slate-400">{p.level}</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {isEditing ? <input type="date" value={editing.start_date} onChange={e => setEditing(ed => ed && ({ ...ed, start_date: e.target.value }))} className="px-2 py-1 border rounded" /> : p.start_date}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => handleToggle(p)} className={cn('px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest', p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400')}>
                        {p.active ? 'Ativo' : 'Pausado'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <button onClick={() => handleSaveEdit(p.id, p.user_id)} className="p-1.5 bg-indigo-600 text-white rounded"><Save size={14} /></button>
                        ) : (
                          <button onClick={() => setEditing({ id: p.id, role_type: p.role_type, level: p.level!, start_date: p.start_date, end_date: p.end_date, squad_id: managerSquad?.id ?? null })} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil size={15} /></button>
                        )}
                        <button onClick={() => handleDelete(p)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
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
