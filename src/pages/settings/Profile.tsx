import React, { useState, useEffect } from 'react';
import { User, Camera, Save, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { UserProfile } from '../../services/profileService';

export function Profile() {
  const { user } = useAuthStore();
  const { profiles, fetchProfiles, updateProfile } = useProfileStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    cpf: '',
  });

  const myProfile = profiles.find(p => p.id === user?.id);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (myProfile) {
      setFormData({
        name: myProfile.name || '',
        email: myProfile.email || user?.email || '',
        phone: myProfile.phone || '',
        role: myProfile.role || '',
        department: myProfile.department || '',
        cpf: myProfile.cpf || '',
      });
    } else if (user) {
      setFormData(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [myProfile, user]);

  const handleTestConnection = async () => {
    setTestResult(null);
    try {
      const { data, error } = await supabase.from('perfis').select('*').limit(1);
      if (error) throw error;
      setTestResult({ success: true, message: 'Conexão com a tabela "perfis" estabelecida com sucesso!' });
    } catch (err: any) {
      console.error('Test Connection Error:', err);
      setTestResult({ success: false, message: `Erro: ${err.message} (Código: ${err.code})` });
    }
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const success = await updateProfile(user.id, formData);
      if (success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error('Error saving profile:', err);
      
      let msg = 'Erro ao salvar perfil';
      if (err.message) msg = err.message;
      if (err.code === '42P01') msg = 'Tabela "perfis" não encontrada no banco de dados.';
      if (err.code === '42703') msg = 'Coluna não encontrada. Verifique se os campos da tabela "perfis" estão corretos.';
      if (err.code === '23505') msg = 'Este CPF já está em uso por outro perfil.';
      if (err.message?.includes('permission denied')) msg = 'Permissão negada. Verifique as políticas de RLS no Supabase.';
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Meu Perfil</h1>
        <p className="text-sm text-slate-500">Gerencie suas informações pessoais e foto.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col items-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-16 h-16 text-slate-300" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all">
              <Camera size={18} />
            </button>
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-800">{formData.name || 'Usuário Target'}</h2>
          <p className="text-sm text-slate-500">{formData.role || 'Administrador'}</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</label>
              <input 
                type="email" 
                readOnly
                value={formData.email}
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo</label>
              <input 
                type="text" 
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</label>
              <input 
                type="text" 
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</label>
              <input 
                type="text" 
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
              />
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row justify-end items-center gap-4">
            {testResult && (
              <span className={`text-[10px] sm:text-xs font-medium px-3 py-1 rounded-full ${testResult.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} w-full sm:w-auto text-center`}>
                {testResult.message}
              </span>
            )}
            {error && (
              <span className="text-red-500 text-sm font-bold w-full sm:w-auto text-center">
                {error}
              </span>
            )}
            {success && (
              <span className="text-emerald-600 text-sm font-bold flex items-center justify-center gap-1 w-full sm:w-auto text-center">
                <CheckCircle size={16} />
                Perfil atualizado!
              </span>
            )}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={handleTestConnection}
                className="w-full sm:w-auto px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
              >
                Testar Conexão
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Salvar Alterações
              </button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center px-4">
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono uppercase tracking-widest text-center truncate">
              Projeto: {import.meta.env.VITE_SUPABASE_URL?.split('.')[0].replace('https://', '') || 'NÃO CONFIGURADO'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
