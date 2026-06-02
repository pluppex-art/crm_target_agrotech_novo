import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, Paperclip, Trash2, FileText, Image, Loader2, ExternalLink } from 'lucide-react';
import { TurmaFile, getTurmaFiles, uploadTurmaFile, deleteTurmaFile } from '../../services/turmaFilesService';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';

interface TurmaFilesModalProps {
  turmaId: string;
  turmaName: string;
  onClose: () => void;
}

export function TurmaFilesModal({ turmaId, turmaName, onClose }: TurmaFilesModalProps) {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<TurmaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    load();
  }, [turmaId]);

  async function load() {
    setLoading(true);
    const data = await getTurmaFiles(turmaId);
    setFiles(data);
    setLoading(false);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const result = await uploadTurmaFile(turmaId, file, user?.id);
      if (result) setFiles(prev => [result, ...prev]);
    }
    setUploading(false);
  }

  async function handleDelete(file: TurmaFile) {
    setDeletingId(file.id);
    await deleteTurmaFile(file.id, file.url);
    setFiles(prev => prev.filter(f => f.id !== file.id));
    setDeletingId(null);
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Paperclip size={18} className="text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Arquivos</h2>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">{turmaName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          className={cn(
            'mx-5 mt-4 shrink-0 border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer',
            dragOver
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-medium">Enviando...</span>
            </div>
          ) : (
            <>
              <Upload size={22} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Arraste ou <span className="text-emerald-600 font-bold">clique para selecionar</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Fotos (JPG, PNG, WEBP) ou PDF · Máx. 50 MB por arquivo</p>
            </>
          )}
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-sm">Carregando arquivos...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Paperclip size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Nenhum arquivo anexado</p>
            </div>
          ) : (
            files.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2.5 group"
              >
                {file.file_type === 'pdf' ? (
                  <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-red-500" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {formatSize(file.size_bytes)}
                    {file.size_bytes ? ' · ' : ''}
                    {new Date(file.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                    title="Abrir arquivo"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => handleDelete(file)}
                    disabled={deletingId === file.id}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                    title="Excluir arquivo"
                  >
                    {deletingId === file.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <p className="text-xs text-slate-400 text-center">
            {files.length} arquivo{files.length !== 1 ? 's' : ''} anexado{files.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
