import React, { useState, useEffect, useCallback } from 'react';
import { Users2, X, Loader2, Save, Pencil, ToggleRight, ToggleLeft, Trash2, UserPlus } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { compensationProfileService } from '../../../services/compensationProfileService';
import { profileService, UserProfile } from '../../../services/profileService';
import { cn } from '../../../lib/utils';

type Squad = { id: string; name: string; manager_id: string | null; active: boolean; color?: string; logo_url?: string };

const EMPTY_FORM = { name: '', color: '#6366f1', logo_url: '', manager_id: null as string | null };

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
  const [members, setMembers] = useState<{ user_id: string; user_name?: string }[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  // Add states for adding custom members/managers in the Members sidebar
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<'membro' | 'gestor'>('membro');

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
      setUsers(u);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setModalForm(EMPTY_FORM); setModalMode('create'); };
  const openEdit = (s: Squad) => { setModalForm({ name: s.name, color: s.color || '#6366f1', logo_url: s.logo_url || '', manager_id: s.manager_id || null }); setModalMode(s.id); };
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
        await compensationProfileService.createSquad(modalForm.name, modalForm.color, modalForm.logo_url, modalForm.manager_id);
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

  const isOpen = modalMode !== null;
  const isEdit = modalMode !== null && modalMode !== 'create';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">Squads</p>
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
        <div className="bg-white rounded-xl border overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></div>
          ) : squads.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Nenhum squad cadastrado.</div>
          ) : (
            <div className="divide-y">
              {squads.map(s => (
                <div
                  key={s.id}
                  onClick={() => loadMembers(s.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all border-l-4"
                  style={{
                    backgroundColor: selectedSquadId === s.id ? `${s.color || '#6366f1'}0a` : 'transparent',
                    borderColor: selectedSquadId === s.id ? (s.color || '#6366f1') : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{ backgroundColor: `${s.color}20`, borderColor: `${s.color}50` }}
                    >
                      {s.logo_url
                        ? <img src={s.logo_url} className="w-full h-full object-cover rounded-xl" />
                        : <Users2 size={18} style={{ color: s.color }} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{s.active ? 'Ativo' : 'Inativo'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleToggle(s.id, s.active)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                      {s.active ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-300" />}
                    </button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members panel */}
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Membros</h3>
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
                          <span className="text-sm font-bold text-slate-900">{managerProfile.full_name || managerProfile.name}</span>
                          <span 
                            className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white shadow-sm transition-all duration-300"
                            style={{ backgroundColor: currentSquad?.color || '#6366f1' }}
                          >
                            Gestor
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm(`Remover gestor do squad "${currentSquad.name}"?`)) {
                              await compensationProfileService.updateSquad(selectedSquadId, { manager_id: null });
                              await load();
                            }
                          }}
                          className="text-slate-405 hover:text-rose-500 transition-colors"
                          title="Remover gestor"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })()}

                  {/* Render other squad members */}
                  {otherMembers.map(m => (
                    <div key={m.user_id} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">{m.user_name}</span>
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.25 rounded-md bg-slate-200 text-slate-550">Membro</span>
                      </div>
                      <button
                        onClick={async () => { await compensationProfileService.removeMemberFromSquad(selectedSquadId, m.user_id); loadMembers(selectedSquadId); }}
                        className="text-slate-350 hover:text-rose-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Combined combobox form to add a user as Membro or Gestor */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Usuário</label>
                        <select
                          value={selectedUserToAdd}
                          onChange={e => setSelectedUserToAdd(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-slate-700"
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
                          onChange={e => setSelectedRoleToAdd(e.target.value as 'membro' | 'gestor')}
                          className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-slate-700"
                        >
                          <option value="membro">Membro</option>
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
                            await compensationProfileService.addMemberToSquad(selectedSquadId, selectedUserToAdd);
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/95 backdrop-blur-sm">
              <div>
                <h2 className="text-xl font-black text-slate-800">{isEdit ? 'Editar Squad' : 'Novo Squad'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{isEdit ? 'Atualize as informações da equipe' : 'Configure uma nova equipe comercial'}</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-7">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Squad</label>
                <input
                  required
                  value={modalForm.name}
                  onChange={e => setModalForm(v => ({ ...v, name: e.target.value }))}
                  placeholder="Ex: Esquadrão Alpha"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cor de Identificação</label>
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
                          : "border-slate-200 border-dashed group-hover:border-slate-400 bg-slate-50 group-hover:bg-slate-100"
                      )}
                      style={{ backgroundColor: !PRESET_COLORS.includes(modalForm.color) ? modalForm.color : 'transparent' }}
                    >
                      {PRESET_COLORS.includes(modalForm.color) && <span className="text-sm font-bold text-slate-400 group-hover:text-slate-600">+</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gestor do Squad</label>
                <select
                  value={modalForm.manager_id || ''}
                  onChange={e => setModalForm(v => ({ ...v, manager_id: e.target.value || null }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium"
                >
                  <option value="">Sem gestor definido</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emblema / Logo <span className="font-normal normal-case">(opcional)</span></label>
                <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-all group">
                  <div 
                    className="w-14 h-14 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors"
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
                  className="w-full sm:w-1/3 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors order-2 sm:order-1"
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
