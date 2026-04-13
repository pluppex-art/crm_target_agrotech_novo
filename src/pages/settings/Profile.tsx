import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Save, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useCargoStore } from '../../store/useCargoStore';
import { useProfileStore } from '../../store/useProfileStore';
import { profileService, UserProfile } from '../../services/profileService';
import { notificationService } from '../../services/notificationService';

export function Profile() {
  const { user } = useAuthStore();
  const { profiles, fetchProfiles, subscribe } = useProfileStore();
  const { cargos, fetchCargos } = useCargoStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    phone: '',
    role_id: '',
    department: '',
    cpf: '',
    avatar_url: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didInit = useRef(false);

  // fetchMyProfile has no dependency on cargos — cargo name is handled by a separate effect
  const fetchMyProfile = useCallback(async () => {
    if (!user?.id) return;
    const profile = await profileService.getProfile(user.id);
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || '',
        role_id: profile.role_id || '',
        department: profile.department || '',
        cpf: profile.cpf || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Run once on mount — avoids re-running every time cargos or fetchMyProfile changes
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetchProfiles();
    fetchCargos();
    fetchMyProfile();
    const unsubscribe = subscribe();
    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync formData when the profile in the store updates (realtime)
  useEffect(() => {
    if (!user?.id || profiles.length === 0) return;
    const myProfile = profiles.find(p => p.id === user.id);
    if (myProfile) {
      setFormData(prev => ({
        name: myProfile.name || prev.name || '',
        email: myProfile.email || user?.email || '',
        phone: myProfile.phone || prev.phone || '',
        role_id: myProfile.role_id || prev.role_id || '',
        department: myProfile.department || prev.department || '',
        cpf: myProfile.cpf || prev.cpf || '',
        avatar_url: myProfile.avatar_url || prev.avatar_url || '',
      }));
    }
  }, [profiles, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive cargo name reactively when role_id or cargos change
  const selectedCargoName = cargos.find(c => c.id === formData.role_id)?.name || '';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setImageLoading(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.onload = async () => {
        canvas.width = 400;
        canvas.height = 400;
        ctx.drawImage(img, 0, 0, 400, 400);

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const resizedFile = new File([blob], file.name, { type: 'image/jpeg' });
          const fileName = `${user.id}-${Date.now()}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, resizedFile, { upsert: true, contentType: 'image/jpeg' });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

          // Use functional update to avoid stale closure
          setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
          await profileService.updateProfile(user.id, { avatar_url: publicUrl });
          setSuccess(true);
          setTimeout(() => setSuccess(false), 2000);
        }, 'image/jpeg', 0.8);
      };
      img.src = URL.createObjectURL(file);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(`Erro no upload: ${err.message}`);
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const { error: saveError } = await profileService.updateProfile(user.id, formData);
      if (saveError) throw saveError;
      setSuccess(true);
      fetchMyProfile();
      const cargo = cargos.find(c => c.id === formData.role_id);
      if (cargo) {
        notificationService.sendProfileCargoUpdate(cargo.name, formData.name || user?.email || '');
      }
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      let msg = 'Erro ao salvar perfil';
      if (err.message) msg = err.message;
      if (err.code === '42P01') msg = 'Tabela "perfis" não encontrada no banco de dados.';
      if (err.code === '42703') msg = 'Coluna não encontrada.';
      if (err.code === '23505') msg = 'Este CPF já está em uso por outro perfil.';
      if (err.message?.includes('permission denied')) msg = 'Permissão negada. Verifique as políticas de RLS no Supabase.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = formData.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || user?.email || 'User')}&size=400&background=6b7280&color=ffffff`;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Meu Perfil</h1>
        <p className="text-sm text-slate-500">Gerencie suas informações pessoais e foto do perfil.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col items-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-4 border-white shadow-lg overflow-hidden">
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || user?.email || 'User')}&size=400&background=6b7280&color=ffffff`;
                }}
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-3 p-2 bg-white border-4 border-emerald-600 rounded-full shadow-lg hover:shadow-xl transition-all"
              title="Adicionar foto"
            >
              <Camera className="w-6 h-6 text-emerald-600" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <h2 className="mt-6 text-xl font-bold text-slate-800">{formData.name || 'Usuário Target'}</h2>
          <p className="text-sm text-slate-500">{selectedCargoName || 'Administrador'}</p>
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
              <select
                value={formData.role_id || ''}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 appearance-none"
              >
                {cargos.map((cargo) => (
                  <option key={cargo.id} value={cargo.id}>{cargo.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</label>
              <input
                type="text"
                value={formData.department}
                disabled
                readOnly
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 cursor-not-allowed"
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
            {error && (
              <span className="text-red-500 text-sm font-bold w-full sm:w-auto text-center">{error}</span>
            )}
            {success && (
              <span className="text-emerald-600 text-sm font-bold flex items-center justify-center gap-1 w-full sm:w-auto text-center">
                <CheckCircle size={16} />
                Perfil atualizado!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Salvar Alterações
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center px-4">
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono uppercase tracking-widest text-center truncate">
              Projeto: {import.meta.env.VITE_SUPABASE_URL?.split('.')[0].replace('https://', '') || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
