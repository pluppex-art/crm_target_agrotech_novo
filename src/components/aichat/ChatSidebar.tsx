import { Search, MoreVertical, MessageCircle, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Chat } from './types';
import { CHAT_FILTERS } from './constants';

interface Props {
  filteredChats: Chat[];
  activeChatId: string | null;
  loadingChats: boolean;
  wahaStatus: 'connecting' | 'connected' | 'disconnected';
  activeFilter: string;
  onFilterChange: (f: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typingChats: Record<string, boolean>;
  agentMode: boolean;
  onToggleAgentMode: () => void;
  onSelectChat: (id: string) => void;
  onRefresh: () => void;
}

export function ChatSidebar({
  filteredChats, activeChatId, loadingChats, wahaStatus,
  activeFilter, onFilterChange, searchQuery, onSearchChange,
  typingChats, agentMode, onToggleAgentMode, onSelectChat, onRefresh,
}: Props) {
  return (
    <div className={cn(
      'w-full md:w-[340px] lg:w-[380px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800/60 flex flex-col bg-white dark:bg-slate-900 shadow-sm',
      activeChatId ? 'hidden md:flex' : 'flex'
    )}>

      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Central de Chats
        </h1>
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border',
            wahaStatus === 'connected'
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
              : wahaStatus === 'connecting'
                ? 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400'
                : 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', {
              'bg-emerald-500 animate-pulse': wahaStatus === 'connected',
              'bg-amber-500 animate-pulse':   wahaStatus === 'connecting',
              'bg-red-500':                   wahaStatus === 'disconnected',
            })} />
            {wahaStatus === 'connected' ? 'Online' : wahaStatus === 'connecting' ? 'Conectando' : 'Offline'}
          </div>

          <button
            onClick={onToggleAgentMode}
            title={agentMode ? 'Agente IA ativo — clique para habilitar envio manual' : 'Envio manual ativo — clique para ativar agente IA'}
            className={cn(
              'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-all',
              agentMode
                ? 'text-violet-700 bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300'
                : 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', agentMode ? 'bg-violet-500 animate-pulse' : 'bg-slate-400')} />
            {agentMode ? 'IA' : 'Manual'}
          </button>

          <button
            onClick={onRefresh}
            title="Reconectar / Atualizar"
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto custom-scrollbar border-b border-slate-100 dark:border-slate-800/50">
        {CHAT_FILTERS.map(filter => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all border',
              activeFilter === filter
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-300'
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/50">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar contatos..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 text-[13px] font-semibold text-slate-800 dark:text-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loadingChats ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
            <p className="text-xs font-semibold">Carregando conversas…</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 px-6 text-center">
            <MessageCircle className="w-10 h-10 opacity-20" />
            <p className="text-sm font-semibold">
              {wahaStatus === 'disconnected' ? 'Sem conexão com WAHA' : 'Nenhuma conversa encontrada'}
            </p>
            {wahaStatus === 'disconnected' && (
              <button
                onClick={onRefresh}
                className="mt-2 px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
              >
                Tentar novamente
              </button>
            )}
          </div>
        ) : (
          filteredChats.map(chat => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={cn(
                'flex items-center gap-3.5 px-5 py-4 cursor-pointer border-b border-slate-100 dark:border-slate-800/30 transition-all relative',
                activeChatId === chat.id
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-l-4 border-l-emerald-600'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/30 border-l-4 border-l-transparent'
              )}
            >
              <div className="relative shrink-0">
                <div className={cn('w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-[15px] shadow-sm bg-gradient-to-br', chat.color)}>
                  {chat.initials}
                </div>
                {chat.platform === 'whatsapp' && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                      <MessageCircle className="w-[10px] h-[10px] text-white" fill="currentColor" strokeWidth={0} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-200 truncate">{chat.name}</h3>
                  <span className={cn('text-[10px] whitespace-nowrap', chat.unread > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium')}>
                    {chat.time}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  {typingChats[chat.id] ? (
                    <p className="text-[12px] text-emerald-500 font-semibold italic flex items-center gap-1">
                      <span className="flex gap-0.5 items-end h-3">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      digitando…
                    </p>
                  ) : chat.lastMessage ? (
                    <p className={cn('text-[12px] truncate', chat.unread > 0 ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-500 dark:text-slate-400')}>
                      {chat.lastMessage}
                    </p>
                  ) : (
                    <p className="text-[12px] text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0 opacity-60">
                        <rect x="2" y="5" width="8" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      As mensagens são criptografadas
                    </p>
                  )}
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm shadow-emerald-500/25">
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
