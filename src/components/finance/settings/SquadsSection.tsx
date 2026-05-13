import React, { useState, useEffect, useCallback } from 'react';
import { Users2, Plus, X, Upload, Loader2, Save, Pencil, ToggleRight, ToggleLeft, Trash2 } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { compensationProfileService } from '../../../services/compensationProfileService';
import { profileService, UserProfile } from '../../../services/profileService';
import { cn } from '../../../lib/utils';

export function SquadsSection() {
  const [squads, setSquads] = useState<{ id: string; name: string; manager_id: string | null; active: boolean; color?: string; logo_url?: string }[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newSquadName, setNewSquadName] = useState('');
  const [newSquadColor, setNewSquadColor] = useState('#6366f1');
  const [newSquadLogo, setNewSquadLogo] = useState('');
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [editingSquadId, setEditingSquadId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; color: string; logo_url: string }>({ name: '', color: '', logo_url: '' });
  const [members, setMembers] = useState<{ user_id: string; user_name?: string }[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, u] = await Promise.all([
        compensationProfileService.getSquads(),
        profileService.getProfiles(),
      ]);
      setSquads(s);
      setUsers(u);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFileUpload = async (file: File, isEdit = false) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsSaving(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `squads/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('lead-files').upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('lead-files').getPublicUrl(path);
      if (isEdit) setEditForm(v => ({ ...v, logo_url: data.publicUrl }));
      else setNewSquadLogo(data.publicUrl);
    } catch (err: any) {
      alert('Erro ao fazer upload: ' + err.message);
    } finally { setIsSaving(false); }
  };

  const loadMembers = async (squadId: string) => {
    setIsMembersLoading(true);
    try {
      const m = await compensationProfileService.getSquadMembers(squadId);
      setMembers(m);
      setSelectedSquadId(squadId);
    } finally { setIsMembersLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSquadName.trim()) return;
    setIsSaving(true);
    try {
      await compensationProfileService.createSquad(newSquadName, newSquadColor, newSquadLogo);
      setNewSquadName(''); setNewSquadColor('#6366f1'); setNewSquadLogo('');
      setShowForm(false);
      await load();
    } finally { setIsSaving(false); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await compensationProfileService.updateSquad(id, { active: !active });
    await load();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSquadId) return;
    setIsSaving(true);
    try {
      await compensationProfileService.updateSquad(editingSquadId, editForm);
      setEditingSquadId(null);
      await load();
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir squad "${name}"?`)) return;
    await compensationProfileService.deleteSquad(id);
    if (selectedSquadId === id) setSelectedSquadId(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">Gestão de Squads</p>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
          {showForm ? 'Fechar' : '+ Novo Squad'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input required value={newSquadName} onChange={e => setNewSquadName(e.target.value)} placeholder="Nome do Squad" className="px-3 py-2 bg-slate-50 border rounded-lg text-sm" />
            <input type="color" value={newSquadColor} onChange={e => setNewSquadColor(e.target.value)} className="h-10 w-full" />
            <div className="flex items-center gap-2">
              <input type="file" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="text-xs" />
              {newSquadLogo && <img src={newSquadLogo} className="w-8 h-8 rounded" />}
            </div>
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Criar Squad</button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border overflow-hidden">
          {isLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin inline" /></div> : (
            <div className="divide-y">
              {squads.map(s => (
                <div key={s.id} onClick={() => loadMembers(s.id)} className={cn('p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50', selectedSquadId === s.id && 'bg-indigo-50 border-l-4 border-indigo-500')}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border" style={{ backgroundColor: `${s.color}15`, borderColor: s.color }}>
                      {s.logo_url ? <img src={s.logo_url} className="w-full h-full object-cover rounded-lg" /> : <Users2 style={{ color: s.color }} />}
                    </div>
                    <div><p className="text-sm font-bold text-slate-800">{s.name}</p></div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditingSquadId(s.id); setEditForm({ name: s.name, color: s.color || '#6366f1', logo_url: s.logo_url || '' }); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil size={16} /></button>
                    <button onClick={() => handleToggle(s.id, s.active)} className="p-1.5">{s.active ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-300" />}</button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Membros</h3>
          {selectedSquadId ? (
            isMembersLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.user_id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">{m.user_name}</span>
                    <button onClick={async () => { await compensationProfileService.removeMemberFromSquad(selectedSquadId, m.user_id); loadMembers(selectedSquadId); }} className="text-slate-300 hover:text-rose-500"><X size={14} /></button>
                  </div>
                ))}
                <select onChange={async (e) => { if (e.target.value) { await compensationProfileService.addMemberToSquad(selectedSquadId, e.target.value); loadMembers(selectedSquadId); e.target.value = ''; } }} className="w-full p-2 border rounded-lg text-sm mt-4">
                  <option value="">+ Adicionar Membro</option>
                  {users.filter(u => !members.some(m => m.user_id === u.id)).map(u => <option key={u.id} value={u.id}>{u.full_name || u.name}</option>)}
                </select>
              </div>
            )
          ) : <p className="text-xs text-slate-400 text-center py-10">Selecione um squad ao lado.</p>}
        </div>
      </div>
    </div>
  );
}
