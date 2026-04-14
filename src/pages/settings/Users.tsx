import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, Shield, Save, X, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import { useCargoStore } from '../../store/useCargoStore';
import { UserProfile } from '../../services/profileService';

export function Users() {
  const { profiles, loading, fetchProfiles, addProfile: addNewProfile, updateProfile, deleteProfile, subscribe } = useProfileStore();
  const { cargos, fetchCargos } = useCargoStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role_id: '',
    department: 'Comercial',
    cpf: '',
    password: '',
    status: 'active' as const,
  });

  useEffect(() => {
    fetchProfiles();
    fetchCargos();
    const unsubscribe = subscribe();
    return () => unsubscribe();
  }, [fetchProfiles, fetchCargos, subscribe]);

  // When cargos load, default role_id to the first cargo for new users
  useEffect(() => {
    if (cargos.length > 0 && !editingId && !formData.role_id) {
      setFormData(prev => ({ ...prev, role_id: cargos[0].id }));
    }
  }, [cargos, editingId]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingId) {
        const { password, ...updateData } = formData;
        await updateProfile(editingId, updateData);
        fetchProfiles(); // Refresh list realtime
      } else {
        await addNewProfile(formData);
        fetchProfiles(); // Refresh list realtime
      }
      handleCloseModal();
    } catch (err: any) {
      const msg = err?.message || err?.details || 'Erro ao salvar usuário.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (profile: UserProfile) => {
    setEditingId(profile.id);
    setFormData({
      name: profile.name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      role_id: profile.role_id ?? '',
      department: profile.department,
      cpf: profile.cpf ?? '',
      password: '',
      status: profile.status
    } as unknown as typeof formData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role_id: cargos[0]?.id ?? '',
      department: 'Comercial',
      cpf: '',
      password: '',
      status: 'active' as const
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de Usuários</h1>
          <p className="text-sm text-slate-500">Gerencie os membros da sua equipe.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold"
        >
          <UserPlus size={20} />
          <span className="whitespace-nowrap">Novo Usuário</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome / Depto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Carregando usuários...</p>
                  </td>
                </tr>
              ) : profiles.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs">
{(user.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-700">{user.name ?? 'Sem nome'}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">{user.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">{user.email}</div>
                    <div className="text-xs text-slate-400">{user.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200">
                      {user.cargos?.name ?? user.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                      user.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}>
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteProfile(user.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo/Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail Corporativo</label>
                  <div className="relative">
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
                      placeholder="email@targetagrotech.com"
                    />
                    <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</label>
          <input 
            type="text" 
            value={formData.cpf}
            onChange={(e) => setFormData({...formData, cpf: e.target.value})}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
            placeholder="000.000.000-00"
          />
        </div>

        {!editingId && (
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senha</label>
            <input 
              required
              type="password" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
              placeholder="Senha segura"
            />
          </div>
        )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</label>
                  <select 
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
                  >
                    <option value="Comercial">Comercial</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Diretoria">Diretoria</option>
                    <option value="TI">TI</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo / Permissão</label>
                  <div className="relative">
<select
                      required
                      value={formData.role_id}
                      onChange={(e) => setFormData({...formData, role_id: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 appearance-none"
                    >
                      <option value="" disabled>Selecione um cargo</option>
                      {cargos.map((cargo) => (
                        <option key={cargo.id} value={cargo.id}>
                          {cargo.name}
                        </option>
                      ))}
                    </select>
                    <Shield size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors w-full sm:w-auto order-2 sm:order-1 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-2 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {editingId ? 'Salvar Alterações' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
