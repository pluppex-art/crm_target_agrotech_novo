import React, { useState, useEffect, useRef } from 'react';
import {
  Video, Plus, Trash2, Pencil, Check, X, Loader2,
  Play, Eye, EyeOff, AlertCircle, Upload, Link, FileVideo,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type TipoCurso = 'drone' | 'iatf' | 'geral';
type Finalidade = 'encantamento' | 'apresentacao' | 'prova_social' | 'instrucional';

interface MediaItem {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string;
  thumbnail_url: string | null;
  tipo_curso: TipoCurso;
  finalidade: Finalidade;
  duracao_seg: number | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

const TIPO_CURSO_LABELS: Record<TipoCurso, string> = {
  drone: 'Drone Agrícola',
  iatf: 'IATF',
  geral: 'Geral',
};

const FINALIDADE_LABELS: Record<Finalidade, string> = {
  encantamento: 'Encantamento',
  apresentacao: 'Apresentação',
  prova_social: 'Prova Social',
  instrucional: 'Instrucional',
};

const TIPO_COLORS: Record<TipoCurso, string> = {
  drone: 'bg-sky-50 text-sky-700 border-sky-200',
  iatf: 'bg-purple-50 text-purple-700 border-purple-200',
  geral: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const FINALIDADE_COLORS: Record<Finalidade, string> = {
  encantamento: 'bg-pink-50 text-pink-700 border-pink-200',
  apresentacao: 'bg-blue-50 text-blue-700 border-blue-200',
  prova_social: 'bg-amber-50 text-amber-700 border-amber-200',
  instrucional: 'bg-teal-50 text-teal-700 border-teal-200',
};

const EMPTY_FORM = {
  titulo: '',
  descricao: '',
  url: '',
  thumbnail_url: '',
  tipo_curso: 'geral' as TipoCurso,
  finalidade: 'encantamento' as Finalidade,
  duracao_seg: '',
  ativo: true,
  ordem: 0,
};

const BUCKET = 'turma-files';

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<TipoCurso | 'all'>('all');

  // upload state
  const [urlMode, setUrlMode] = useState<'upload' | 'url'>('upload');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_library')
      .select('*')
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false });
    if (!error) setItems((data as MediaItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, ordem: items.length });
    setUploadFile(null);
    setUploadProgress(null);
    setUrlMode('upload');
    setError(null);
    setShowForm(true);
  };

  const openEdit = (item: MediaItem) => {
    setEditId(item.id);
    setForm({
      titulo: item.titulo,
      descricao: item.descricao || '',
      url: item.url,
      thumbnail_url: item.thumbnail_url || '',
      tipo_curso: item.tipo_curso,
      finalidade: item.finalidade,
      duracao_seg: item.duracao_seg?.toString() || '',
      ativo: item.ativo,
      ordem: item.ordem,
    });
    setUploadFile(null);
    setUploadProgress(null);
    setUrlMode('url');
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setError(null);
    setUploadFile(null);
    setUploadProgress(null);
  };

  const handleFileDrop = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Apenas arquivos de vídeo são aceitos.');
      return;
    }
    setUploadFile(file);
    setError(null);
    // Auto-fill title if empty
    if (!form.titulo) {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setForm(f => ({ ...f, titulo: name }));
    }
  };

  const uploadToSupabase = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'mp4';
    const path = `videos/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

    setUploadProgress(0);

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });

    if (upErr) throw new Error(upErr.message);

    setUploadProgress(100);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { setError('Título é obrigatório.'); return; }

    setSaving(true);
    setError(null);

    let finalUrl = form.url.trim();

    if (urlMode === 'upload') {
      if (!uploadFile && !finalUrl) {
        setError('Selecione um arquivo de vídeo ou alterne para URL.');
        setSaving(false);
        return;
      }
      if (uploadFile) {
        try {
          finalUrl = await uploadToSupabase(uploadFile);
        } catch (err: any) {
          setError(`Erro no upload: ${err.message}`);
          setSaving(false);
          return;
        }
      }
    } else {
      if (!finalUrl) { setError('URL do vídeo é obrigatória.'); setSaving(false); return; }
      if (!/^https?:\/\//i.test(finalUrl)) {
        setError('URL deve começar com http:// ou https://');
        setSaving(false);
        return;
      }
    }

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      url: finalUrl,
      thumbnail_url: form.thumbnail_url.trim() || null,
      tipo_curso: form.tipo_curso,
      finalidade: form.finalidade,
      duracao_seg: form.duracao_seg ? parseInt(form.duracao_seg) : null,
      ativo: form.ativo,
      ordem: form.ordem,
    };

    const { error: err } = editId
      ? await supabase.from('media_library').update(payload).eq('id', editId)
      : await supabase.from('media_library').insert([payload]);

    if (err) { setError(err.message); setSaving(false); return; }

    await fetchItems();
    closeForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este vídeo da biblioteca?')) return;
    await supabase.from('media_library').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const toggleAtivo = async (item: MediaItem) => {
    await supabase.from('media_library').update({ ativo: !item.ativo }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ativo: !i.ativo } : i));
  };

  const filtered = filterTipo === 'all' ? items : items.filter(i => i.tipo_curso === filterTipo);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Video className="w-5 h-5 text-emerald-600" />
            Biblioteca de Vídeos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie os vídeos de encantamento e apresentação da Target AgroTech.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Vídeo
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'drone', 'iatf', 'geral'] as const).map(tipo => (
          <button
            key={tipo}
            onClick={() => setFilterTipo(tipo)}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg border transition-all',
              filterTipo === tipo
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
            )}
          >
            {tipo === 'all' ? 'Todos' : TIPO_CURSO_LABELS[tipo]}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">
          {filtered.length} vídeo{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-800 dark:text-slate-200">
                {editId ? 'Editar Vídeo' : 'Novo Vídeo'}
              </h2>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Título */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Título *</label>
                <input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Formação Drone Agrícola - Como funciona"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  placeholder="Breve descrição do conteúdo do vídeo"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                />
              </div>

              {/* Modo: upload ou URL */}
              <div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 w-fit">
                  <button
                    onClick={() => setUrlMode('upload')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                      urlMode === 'upload'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Enviar arquivo
                  </button>
                  <button
                    onClick={() => setUrlMode('url')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                      urlMode === 'url'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Link className="w-3.5 h-3.5" />
                    Colar URL
                  </button>
                </div>

                {urlMode === 'upload' ? (
                  <>
                    {/* Drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => {
                        e.preventDefault();
                        setDragOver(false);
                        const file = e.dataTransfer.files[0];
                        if (file) handleFileDrop(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all',
                        dragOver
                          ? 'border-emerald-400 bg-emerald-50'
                          : uploadFile
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-slate-50'
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileDrop(file);
                          e.target.value = '';
                        }}
                      />

                      {uploadFile ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                            <FileVideo className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{uploadFile.name}</p>
                            <p className="text-xs text-slate-400">{formatBytes(uploadFile.size)}</p>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setUploadFile(null); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Upload className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                            Arraste o vídeo aqui ou clique para selecionar
                          </p>
                          <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI — sobe direto para o bucket Supabase</p>
                        </>
                      )}
                    </div>

                    {/* Progress bar */}
                    {uploadProgress !== null && uploadProgress < 100 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Enviando...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <input
                      value={form.url}
                      onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      URL pública do bucket Supabase ou CDN. Deve ser acessível sem autenticação.
                    </p>
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">URL da Thumbnail</label>
                <input
                  value={form.thumbnail_url}
                  onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                  placeholder="https://... (opcional)"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                />
              </div>

              {/* Tipo + Finalidade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tipo de Curso</label>
                  <select
                    value={form.tipo_curso}
                    onChange={e => setForm(f => ({ ...f, tipo_curso: e.target.value as TipoCurso }))}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="drone">Drone Agrícola</option>
                    <option value="iatf">IATF</option>
                    <option value="geral">Geral</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Finalidade</label>
                  <select
                    value={form.finalidade}
                    onChange={e => setForm(f => ({ ...f, finalidade: e.target.value as Finalidade }))}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="encantamento">Encantamento</option>
                    <option value="apresentacao">Apresentação</option>
                    <option value="prova_social">Prova Social</option>
                    <option value="instrucional">Instrucional</option>
                  </select>
                </div>
              </div>

              {/* Duração + Ordem */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Duração (segundos)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.duracao_seg}
                    onChange={e => setForm(f => ({ ...f, duracao_seg: e.target.value }))}
                    placeholder="Ex: 120"
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ordem</label>
                  <input
                    type="number"
                    min="0"
                    value={form.ordem}
                    onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Ativo toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                  className={cn(
                    'w-10 h-5 rounded-full transition-colors relative shrink-0',
                    form.ativo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                >
                  <div className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    form.ativo ? 'translate-x-5' : 'translate-x-0.5'
                  )} />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Ativo (disponível para a Júlia)
                </span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{uploadFile ? 'Enviando...' : 'Salvando...'}</>
                  : <><Check className="w-4 h-4" />{editId ? 'Salvar' : 'Cadastrar'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1 text-sm font-bold"
            >
              <X className="w-4 h-4" /> Fechar
            </button>
            <video
              src={previewUrl}
              controls
              autoPlay
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-slate-300" />
          </div>
          <p className="font-bold text-slate-600 dark:text-slate-400">Nenhum vídeo cadastrado</p>
          <p className="text-sm text-slate-400 mt-1">Clique em "Novo Vídeo" para adicionar o primeiro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className={cn(
                'bg-white dark:bg-slate-900 rounded-2xl border transition-all',
                item.ativo
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-slate-100 dark:border-slate-800 opacity-60'
              )}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Thumbnail / Play */}
                <div
                  className="relative w-20 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer group"
                  onClick={() => setPreviewUrl(item.url)}
                >
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.titulo} className="w-full h-full object-cover" />
                  ) : (
                    <Video className="w-6 h-6 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', TIPO_COLORS[item.tipo_curso])}>
                      {TIPO_CURSO_LABELS[item.tipo_curso]}
                    </span>
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', FINALIDADE_COLORS[item.finalidade])}>
                      {FINALIDADE_LABELS[item.finalidade]}
                    </span>
                    {item.duracao_seg && (
                      <span className="text-[10px] text-slate-400 font-bold">{formatDuration(item.duracao_seg)}</span>
                    )}
                  </div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{item.titulo}</p>
                  {item.descricao && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{item.descricao}</p>
                  )}
                  <p className="text-[10px] text-slate-300 dark:text-slate-600 font-mono truncate mt-1">{item.url}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleAtivo(item)}
                    title={item.ativo ? 'Desativar' : 'Ativar'}
                    className={cn(
                      'p-2 rounded-xl transition-colors',
                      item.ativo
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    {item.ativo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
