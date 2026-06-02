import React, { useState, useEffect, useCallback } from 'react';
import { Users2, X, Loader2, Save, Pencil, ToggleRight, ToggleLeft, Trash2, UserPlus, Check, Trophy } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { compensationProfileService } from '../../../services/compensationProfileService';
import { profileService, UserProfile } from '../../../services/profileService';
import { cn } from '../../../lib/utils';

type Squad = { id: string; name: string; manager_id: string | null; active: boolean; color?: string; logo_url?: string; company?: string };

const EMPTY_FORM = { name: '', color: '#6366f1', logo_url: '', manager_id: null as string | null, company: 'target' };

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#0ea5e9', // Sky
  '#64748b', // Slate
];

export function SquadsSection() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [members, setMembers] = useState<{
    role_type: string; user_id: string; user_name?: string
  }[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  // Add states for adding custom members/managers in the Members sidebar
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<'membro' | 'gestor' | 'capitao'>('membro');
  
  // Inline editing state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<'membro' | 'gestor' | 'capitao'>('membro');

  // Modal state: null = closed, 'create' = new, squad id = edit
  const [modalMode, setModalMode] = useState<null | 'create' | string>(null);
  const [modalForm, setModalForm] = useState(EMPTY_FORM);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, u] = await Promise.all([
        compensationProfileService.getSquads(),
        profileService.getProfiles(),
      ]);
      setSquads(s);
      setUsers(u.filter((user: any) => user.status === 'active'));
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setModalForm(EMPTY_FORM); setModalMode('create'); };
  const openEdit = (s: Squad) => { setModalForm({ name: s.name, color: s.color || '#6366f1', logo_url: s.logo_url || '', manager_id: s.manager_id || null, company: s.company || 'target' }); setModalMode(s.id); };
  const closeModal = () => setModalMode(null);

  const handleFileUpload = async (file: File) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `squads/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from('lead-files').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('lead-files').getPublicUrl(path);
      setModalForm(v => ({ ...v, logo_url: data.publicUrl }));
    } catch (err: any) {
      alert('Erro ao fazer upload: ' + err.message);
    } finally { setUploadingLogo(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.name.trim()) return;
    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await compensationProfileService.createSquad(modalForm.name, modalForm.color, modalForm.logo_url, modalForm.manager_id, modalForm.company);
      } else if (modalMode) {
        await compensationProfileService.updateSquad(modalMode, modalForm);
      }
      closeModal();
      await load();
    } finally { setIsSaving(false); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await compensationProfileService.updateSquad(id, { active: !active });
    await load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir squad "${name}"?`)) return;
    await compensationProfileService.deleteSquad(id);
    if (selectedSquadId === id) setSelectedSquadId(null);
    await load();
  };

  const loadMembers = async (squadId: string) => {
    setIsMembersLoading(true);
    try {
      const m = await compensationProfileService.getSquadMembers(squadId);
      setMembers(m);
      setSelectedSquadId(squadId);
    } finally { setIsMembersLoading(false); }
  };

  const saveRoleChange = async (userId: string, currentRole: string) => {
    if (!selectedSquadId) return;
    setIsMembersLoading(true);
    try {
      if (editRoleValue === 'gestor') {
        await compensationProfileService.updateSquad(selectedSquadId, { manager_id: userId });
        await compensationProfileService.removeMemberFromSquad(selectedSquadId, userId);
      } else {
        if (currentRole === 'gestor') {
           await compensationProfileService.updateSquad(selectedSquadId, { manager_id: null });
        }
        await compensationProfileService.addMemberToSquad(selectedSquadId, userId, editRoleValue as 'membro' | 'capitao');
      }
      setEditingMemberId(null);
      await load();
      await loadMembers(selectedSquadId);
    } finally {
      setIsMembersLoading(false);
    }
  };

  const isOpen = modalMode !== null;
  const isEdit = modalMode !== null && modalMode !== 'create';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Squads</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus size={16} />
          Novo Squad
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Squad list */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></div>
          ) : squads.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Nenhum squad cadastrado.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              {squads.map(s => (
                <div
                  key={s.id}
                  onClick={() => loadMembers(s.id)}
                  className={`relative h-48 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 ${selectedSquadId === s.id ? 'ring-4 ring-offset-2 ring-indigo-500' : 'hover:shadow-xl hover:-translate-y-1 border border-slate-200 dark:border-slate-700'}`}
                >
                  {/* Background Uniform Image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-top bg-no-repeat transition-transform duration-700 group-hover:scale-110"
                    style={{ 
                      backgroundImage: `url('${s.company === 'pluppex' ? '/podium_pluppex_man_1.png' : '/podium_target_man_1.png'}')`,
                      backgroundColor: '#f8fafc'
                    }}
                  >
                    {/* Magical CSS Tint Overlay */}
                    {s.color && (
                      <div 
                        className="absolute inset-0 transition-colors duration-500"
                        style={{ 
                          backgroundColor: s.color,
                          mixBlendMode: 'color',
                          opacity: 0.85
                        }}
                      />
                    )}
                  </div>
                  {/* Dark gradient overlay to make text pop */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/10" />

                  {/* Content Overlay */}
                  <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                    <div className="flex items-center justify-between">
                      {/* Left: Podium icon / Logo */}
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-sm" style={{ backgroundColor: s.color ? `${s.color}40` : undefined }}>
                        {s.logo_url 
                          ? <img src={s.logo_url} className="w-full h-full object-cover rounded-xl" />
                          : <Trophy size={18} className="text-amber-300 drop-shadow-md" />}
                      </div>
                      
                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(s)} className="p-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-md text-white rounded-lg transition-all" title="Editar Squad">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleToggle(s.id, s.active)} className="p-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-md text-white rounded-lg transition-all" title={s.active ? 'Desativar' : 'Ativar'}>
                          {s.active ? <ToggleRight size={14} className="text-emerald-400" /> : <ToggleLeft size={14} className="text-slate-400" />}
                        </button>
                        <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 bg-black/30 hover:bg-rose-600/80 backdrop-blur-md text-white rounded-lg transition-all" title="Excluir Squad">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="text-left mt-auto">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border backdrop-blur-md shadow-sm tracking-wider ${
                          s.company === 'pluppex' 
                            ? 'bg-violet-500/30 text-violet-100 border-violet-400/30' 
                            : 'bg-emerald-500/30 text-emerald-100 border-emerald-400/30'
                        }`}>
                          {s.company === 'pluppex' ? 'Pluppex' : 'Target'}
                        </span>
                        <span className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: s.active ? '#34d399' : '#94a3b8' }} title={s.active ? 'Ativo' : 'Inativo'} />
                      </div>
                      
                      <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-lg leading-tight uppercase tracking-wider">
                        {s.name}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members panel */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Membros</h3>
          {selectedSquadId ? (
            (() => {
              const currentSquad = squads.find(s => s.id === selectedSquadId);
              const otherMembers = members.filter(m => m.user_id !== currentSquad?.manager_id);
              const hasNoPeople = !currentSquad?.manager_id && otherMembers.length === 0;

              return isMembersLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" /></div>
              ) : (
                <div className="space-y-3">
                  {hasNoPeople && (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum membro ainda.</p>
                  )}

                  {/* Render Manager (Gestor) at the top of the list */}
                  {currentSquad?.manager_id && (() => {
                    const managerProfile = users.find(u => u.id === currentSquad.manager_id);
                    if (!managerProfile) return null;
                    return (
                      <div
                        className="flex items-center justify-between px-3 py-2 border rounded-lg shadow-sm transition-all duration-300"
                        style={{
                          backgroundColor: `${currentSquad?.color || '#6366f1'}0a`,
                          borderColor: `${currentSquad?.color || '#6366f1'}25`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{managerProfile.full_name || managerProfile.name}</span>
                          {editingMemberId === managerProfile.id ? (
                            <select
                              value={editRoleValue}
                              onChange={(e) => setEditRoleValue(e.target.value as any)}
                              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full outline-none ml-2 border border-slate-300 dark:border-slate-600"
                            >
                              <option value="membro">Membro</option>
                              <option value="capitao">Capitão</option>
                              <option value="gestor">Gestor</option>
                            </select>
                          ) : (
                            <span
                              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white shadow-sm transition-all duration-300"
                              style={{ backgroundColor: currentSquad?.color || '#6366f1' }}
                            >
                              Gestor
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingMemberId === managerProfile.id ? (
                            <>
                              <button onClick={() => saveRoleChange(managerProfile.id, 'gestor')} className="p-1 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"><Check size={14} /></button>
                              <button onClick={() => setEditingMemberId(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/50 rounded-md transition-colors"><X size={14} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingMemberId(managerProfile.id); setEditRoleValue('gestor'); }} className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-md transition-colors" title="Editar Função">
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Remover gestor do squad "${currentSquad.name}"?`)) {
                                    await compensationProfileService.updateSquad(selectedSquadId, { manager_id: null });
                                    await load();
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                title="Remover"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Render other squad members */}
                  {otherMembers.map(m => (
                    <div key={m.user_id} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg group">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{m.user_name}</span>
                        {editingMemberId === m.user_id ? (
                          <select
                            value={editRoleValue}
                            onChange={(e) => setEditRoleValue(e.target.value as any)}
                            className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full outline-none ml-2 border border-slate-300 dark:border-slate-600"
                          >
                            <option value="membro">Membro</option>
                            <option value="capitao">Capitão</option>
                            <option value="gestor">Gestor</option>
                          </select>
                        ) : (
                          m.role_type === 'capitao' ? (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1 shadow-sm">
                              ©️ Capitão
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.25 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-550">Membro</span>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingMemberId === m.user_id ? (
                          <>
                            <button onClick={() => saveRoleChange(m.user_id, m.role_type)} className="p-1 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"><Check size={14} /></button>
                            <button onClick={() => setEditingMemberId(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/50 rounded-md transition-colors"><X size={14} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingMemberId(m.user_id); setEditRoleValue(m.role_type as any); }} className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-md transition-colors" title="Editar Função">
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={async () => { await compensationProfileService.removeMemberFromSquad(selectedSquadId, m.user_id); loadMembers(selectedSquadId); }}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                              title="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Combined combobox form to add a user as Membro or Gestor */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Usuário</label>
                        <select
                          value={selectedUserToAdd}
                          onChange={e => setSelectedUserToAdd(e.target.value)}
                          className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-slate-700 dark:text-slate-300"
                        >
                          <option value="">Adicionar...</option>
                          {users
                            .filter(u => u.id !== currentSquad?.manager_id && !members.some(m => m.user_id === u.id))
                            .map(u => (
                              <option key={u.id} value={u.id}>{u.full_name || u.name}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Função</label>
                        <select
                          value={selectedRoleToAdd}
                          onChange={e => setSelectedRoleToAdd(e.target.value as 'membro' | 'gestor' | 'capitao')}
                          className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-slate-700 dark:text-slate-300"
                        >
                          <option value="membro">Membro</option>
                          <option value="capitao">Capitão</option>
                          <option value="gestor">Gestor</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedUserToAdd) return;
                        setIsMembersLoading(true);
                        try {
                          if (selectedRoleToAdd === 'gestor') {
                            await compensationProfileService.updateSquad(selectedSquadId, { manager_id: selectedUserToAdd });
                          } else {
                            await compensationProfileService.addMemberToSquad(selectedSquadId, selectedUserToAdd, selectedRoleToAdd);
                          }
                          setSelectedUserToAdd('');
                          setSelectedRoleToAdd('membro');
                          await load();
                          await loadMembers(selectedSquadId);
                        } finally {
                          setIsMembersLoading(false);
                        }
                      }}
                      disabled={!selectedUserToAdd || isMembersLoading}
                      className="w-full py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-md duration-300"
                      style={{
                        backgroundColor: currentSquad?.color || '#6366f1',
                        opacity: !selectedUserToAdd ? 0.45 : 1,
                        boxShadow: `0 4px 12px ${(currentSquad?.color || '#6366f1')}20`,
                      }}
                    >
                      Adicionar à Equipe
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">Selecione um squad ao lado.</p>
          )}
        </div>
      </div>

      {/* Modal Novo / Editar Squad */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/95 backdrop-blur-sm">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-200">{isEdit ? 'Editar Squad' : 'Novo Squad'}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{isEdit ? 'Atualize as informações da equipe' : 'Configure uma nova equipe comercial'}</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-7">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Empresa</label>
                  <select
                    value={modalForm.company}
                    onChange={e => setModalForm(v => ({ ...v, company: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-700 dark:text-slate-300 font-bold"
                  >
                    <option value="target">Target</option>
                    <option value="pluppex">Pluppex</option>
                  </select>
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome do Squad</label>
                  <input
                    required
                    value={modalForm.name}
                    onChange={e => setModalForm(v => ({ ...v, name: e.target.value }))}
                    placeholder="Ex: Esquadrão Alpha"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-700 dark:text-slate-300 font-medium placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cor de Identificação</label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setModalForm(v => ({ ...v, color: c }))}
                      className={cn(
                        "w-10 h-10 rounded-xl transition-all border-2",
                        modalForm.color === c ? "border-slate-800 scale-110 shadow-lg" : "border-transparent hover:scale-105 opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="relative group">
                    <input
                      type="color"
                      value={modalForm.color}
                      onChange={e => setModalForm(v => ({ ...v, color: e.target.value }))}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    />
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all",
                        !PRESET_COLORS.includes(modalForm.color)
                          ? "border-slate-800 scale-110 shadow-lg"
                          : "border-slate-200 dark:border-slate-700 border-dashed group-hover:border-slate-400 bg-slate-50 dark:bg-slate-800 group-hover:bg-slate-100 dark:bg-slate-800/50"
                      )}
                      style={{ backgroundColor: !PRESET_COLORS.includes(modalForm.color) ? modalForm.color : 'transparent' }}
                    >
                      {PRESET_COLORS.includes(modalForm.color) && <span className="text-sm font-bold text-slate-400 group-hover:text-slate-600 dark:text-slate-400">+</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gestor do Squad</label>
                <select
                  value={modalForm.manager_id || ''}
                  onChange={e => setModalForm(v => ({ ...v, manager_id: e.target.value || null }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="">Sem gestor definido</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Emblema / Logo <span className="font-normal normal-case">(opcional)</span></label>
                <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800 hover:border-indigo-300 transition-all group">
                  <div
                    className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors"
                    style={{ backgroundColor: modalForm.color ? `${modalForm.color}15` : '#fff' }}
                  >
                    {modalForm.logo_url ? (
                      <img src={modalForm.logo_url} className="w-full h-full object-cover" />
                    ) : (
                      <Users2 size={24} style={{ color: modalForm.color || '#94a3b8' }} className="transition-colors" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <label className={cn(
                      "cursor-pointer block truncate",
                      uploadingLogo && "pointer-events-none opacity-50"
                    )}>
                      <span className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                        {uploadingLogo ? 'Enviando imagem...' : 'Carregar imagem'}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">JPG, PNG ou GIF até 2MB</p>
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} disabled={uploadingLogo} />
                    </label>
                  </div>

                  {modalForm.logo_url && !uploadingLogo && (
                    <button type="button" onClick={() => setModalForm(v => ({ ...v, logo_url: '' }))} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Remover imagem">
                      <Trash2 size={18} />
                    </button>
                  )}
                  {uploadingLogo && <Loader2 size={20} className="animate-spin text-indigo-500" />}
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:w-1/3 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/50 rounded-2xl transition-colors order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || uploadingLogo}
                  className="w-full sm:w-2/3 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60 order-1 sm:order-2 active:scale-[0.98]"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {isEdit ? 'Salvar Alterações' : 'Criar Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

