import { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, StickyNote, Send, MessageCircle, X, File } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AttachedFile } from './types';

interface Props {
  inputValue: string;
  onInputChange: (v: string) => void;
  isNotesMode: boolean;
  onToggleNotesMode: () => void;
  agentMode: boolean;
  onDisableAgentMode: () => void;
  attachedFile: AttachedFile | null;
  onClearFile: () => void;
  onFileSelected: (f: AttachedFile) => void;
  emojisList: string[];
  activeChatId: string | null;
  onSend: () => void;
}

export function ChatInput({
  inputValue, onInputChange, isNotesMode, onToggleNotesMode,
  agentMode, onDisableAgentMode, attachedFile, onClearFile, onFileSelected,
  emojisList, activeChatId, onSend,
}: Props) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { setShowEmojiPicker(false); }, [activeChatId]);

  useEffect(() => {
    if (emojiPickerRef.current && (window as any).twemoji)
      (window as any).twemoji.parse(emojiPickerRef.current);
  }, [showEmojiPicker]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node))
        setShowEmojiPicker(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileSelected({ name: file.name, type: file.type, url: URL.createObjectURL(file) });
  };

  const canSend = !!(inputValue.trim() || attachedFile);
  const sendBlocked = agentMode && !isNotesMode;

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 z-20 shrink-0 flex flex-col gap-2 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {agentMode && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
            Agente IA ativo — envio manual desabilitado
          </div>
          <button
            onClick={onDisableAgentMode}
            className="text-[10px] font-bold text-violet-500 hover:text-violet-700 dark:hover:text-violet-200 underline transition-colors"
          >
            Assumir controle
          </button>
        </div>
      )}

      <div className="flex items-end gap-2.5">
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-20 left-4 w-72 h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col p-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emojis</span>
              <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-1"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-6 gap-2 p-1 custom-scrollbar">
              {emojisList.map((emoji, index) => (
                <button key={index} onClick={() => onInputChange(inputValue + emoji)} className="text-2xl hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-xl transition-all active:scale-90">
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {attachedFile && (
          <div className="absolute bottom-20 left-4 right-4 bg-white dark:bg-slate-900 border border-emerald-150 dark:border-emerald-900/40 rounded-2xl shadow-xl z-50 p-4 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-150 border-l-4 border-l-emerald-600">
            <div className="flex items-center gap-3 min-w-0">
              {attachedFile.type.startsWith('image/') ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                  <img src={attachedFile.url} alt={attachedFile.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 text-emerald-600">
                  <File size={20} />
                </div>
              )}
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{attachedFile.name}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-tight">{attachedFile.type.split('/')[1] || 'Arquivo'}</div>
              </div>
            </div>
            <button onClick={onClearFile} className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-full transition-colors border border-slate-100 dark:border-slate-700/60">
              <X size={16} />
            </button>
          </div>
        )}

        <button
          onClick={() => setShowEmojiPicker(prev => !prev)}
          className={cn('p-3 rounded-full transition-colors shrink-0 hover:bg-slate-50 dark:hover:bg-slate-800', showEmojiPicker ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-650')}
          title="Inserir Emojis"
        >
          <Smile size={22} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className={cn('p-3 rounded-full transition-colors shrink-0 hover:bg-slate-50 dark:hover:bg-slate-800', attachedFile ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-650')}
          title="Anexar Arquivo"
        >
          <Paperclip size={22} />
        </button>
        <button
          onClick={onToggleNotesMode}
          className={cn('p-3 rounded-full transition-all shrink-0 active:scale-95 border', isNotesMode ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-400' : 'text-slate-400 border-transparent hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-800')}
          title="Salvar como Anotação Interna"
        >
          <StickyNote size={22} />
        </button>

        <div className={cn('flex-1 border rounded-2xl flex items-end shadow-inner transition-all duration-200', isNotesMode ? 'bg-amber-50/50 border-amber-300 dark:bg-amber-950/10 dark:border-amber-900/70' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80')}>
          <textarea
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isNotesMode ? 'Escreva uma anotação interna para o lead…' : 'Digite sua mensagem…'}
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 px-4 py-3 outline-none resize-none max-h-32 min-h-[46px] custom-scrollbar font-medium"
            rows={1}
          />
        </div>

        {canSend ? (
          <button
            onClick={onSend}
            disabled={sendBlocked}
            className={cn(
              'p-3 text-white rounded-full transition-all shrink-0 mb-1 active:scale-95 shadow-md',
              sendBlocked
                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none opacity-50'
                : isNotesMode
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
            )}
            title={sendBlocked ? 'Agente IA ativo — envio manual bloqueado' : isNotesMode ? 'Salvar Anotação' : 'Enviar Mensagem'}
          >
            <Send size={18} />
          </button>
        ) : (
          <button className={cn('p-3 transition-colors rounded-full shrink-0 mb-1', isNotesMode ? 'text-amber-500' : 'text-slate-400')}>
            <MessageCircle size={22} />
          </button>
        )}
      </div>
    </div>
  );
}
