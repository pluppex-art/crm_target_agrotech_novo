import { useEffect } from 'react';
import { Search, X, Loader2, StickyNote, Paperclip } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Message } from './types';
import { MsgTicks } from './MsgTicks';

interface Props {
  visibleMessages: Message[];
  loadingMessages: boolean;
  activeChatId: string;
  typingChats: Record<string, boolean>;
  showMsgSearch: boolean;
  msgSearchQuery: string;
  onMsgSearchChange: (q: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  chatMessagesRef: React.RefObject<HTMLDivElement>;
}

export function ChatMessages({
  visibleMessages, loadingMessages, activeChatId, typingChats,
  showMsgSearch, msgSearchQuery, onMsgSearchChange,
  messagesEndRef, chatMessagesRef,
}: Props) {
  useEffect(() => {
    if (chatMessagesRef.current && (window as any).twemoji)
      (window as any).twemoji.parse(chatMessagesRef.current);
  }, [visibleMessages, activeChatId, chatMessagesRef]);

  return (
    <>
      {showMsgSearch && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 z-10 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar nas mensagens…"
              value={msgSearchQuery}
              onChange={e => onMsgSearchChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 text-[13px] font-semibold text-slate-800 dark:text-slate-200 rounded-xl pl-9 pr-9 py-2 outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400"
            />
            {msgSearchQuery && (
              <button onClick={() => onMsgSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          {msgSearchQuery && (
            <p className="text-[11px] text-slate-400 mt-1 ml-1">
              {visibleMessages.length} resultado{visibleMessages.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-6 space-y-4 z-0 custom-scrollbar">
        {loadingMessages ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="text-center mt-10">
            <span className="bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-lg text-xs font-medium text-slate-500 shadow-sm">
              {msgSearchQuery ? 'Nenhuma mensagem encontrada' : 'Início da conversa'}
            </span>
          </div>
        ) : (
          visibleMessages.map(msg => (
            msg.isNote ? (
              <div key={msg.id} className="flex justify-center my-3">
                <div className="max-w-[85%] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl px-5 py-3 shadow-sm flex items-start gap-3">
                  <StickyNote className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Anotação Interna (Salva)</span>
                      <span className="text-[9px] text-amber-500/80">{msg.timestamp}</span>
                    </div>
                    {msg.file?.type.startsWith('image/') && (
                      <div className="mb-2 rounded-xl overflow-hidden max-w-full shadow-inner border border-amber-200">
                        <img src={msg.file.url} alt={msg.file.name} className="max-h-60 object-cover w-full cursor-pointer hover:opacity-95 transition-opacity" onClick={() => window.open(msg.file?.url, '_blank')} />
                      </div>
                    )}
                    {msg.file && !msg.file.type.startsWith('image/') && (
                      <a href={msg.file.url} target="_blank" rel="noopener noreferrer" className="mb-2 p-3 bg-white/60 dark:bg-slate-850 rounded-xl flex items-center gap-3 border border-amber-200 hover:bg-white transition-all text-amber-900 dark:text-amber-200">
                        <Paperclip className="w-5 h-5 text-amber-600" />
                        <div className="text-left min-w-0 flex-1">
                          <div className="text-xs font-bold truncate max-w-[180px]">{msg.file.name}</div>
                          <div className="text-[10px] text-amber-500 font-medium uppercase">{msg.file.type.split('/')[1] || 'DOC'}</div>
                        </div>
                      </a>
                    )}
                    <p className="text-[13px] font-semibold leading-relaxed text-left">{msg.content}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div key={msg.id} className={cn('flex', msg.sender === 'me' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm relative group transition-all duration-150 hover:shadow',
                  msg.sender === 'me'
                    ? 'bg-emerald-600 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-100 dark:border-slate-800'
                )}>
                  {msg.file?.type.startsWith('image/') && (
                    <div className="mb-2 rounded-xl overflow-hidden max-w-full shadow-inner border border-slate-100 dark:border-slate-800">
                      <img src={msg.file.url} alt={msg.file.name} className="max-h-60 object-cover w-full cursor-pointer hover:opacity-95 transition-opacity" onClick={() => window.open(msg.file?.url, '_blank')} />
                    </div>
                  )}
                  {msg.file && !msg.file.type.startsWith('image/') && (
                    <a href={msg.file.url} target="_blank" rel="noopener noreferrer" className="mb-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl flex items-center gap-3 border border-slate-150 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-200">
                      <Paperclip className="w-5 h-5 text-emerald-500" />
                      <div className="text-left min-w-0 flex-1">
                        <div className="text-xs font-bold truncate max-w-[180px]">{msg.file.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase">{msg.file.type.split('/')[1] || 'DOC'}</div>
                      </div>
                    </a>
                  )}
                  <p className="text-[13.5px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex justify-end items-center gap-1 mt-1 opacity-70">
                    <span className={cn('text-[9px]', msg.sender === 'me' ? 'text-emerald-100' : 'text-slate-400')}>
                      {msg.timestamp}
                    </span>
                    {msg.sender === 'me' && <MsgTicks ack={msg.ack} />}
                  </div>
                </div>
              </div>
            )
          ))
        )}

        {typingChats[activeChatId] && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </>
  );
}
