import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search, MoreVertical, MessageCircle, Send, Phone, Paperclip, Smile,
  ArrowLeft, User, Activity, CheckSquare, Calendar, StickyNote, X, File,
  Loader2, RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLeadStore } from '../store/useLeadStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { useProfileStore } from '../store/useProfileStore';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { useAuthStore } from '../store/useAuthStore';
import { noteService } from '../services/noteService';
import type { Lead, LeadStatus } from '../types/leads';

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🤫', '🤥', '😶', '😐', '😑', '😬', '🫠', '🫨', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😮‍💨', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💅', '🤳', '💪', '❤️', '💖', '✨', '🔥', '🚀', '🎉', '✅', '❌', '⚠️', '💡',
];

type Platform = 'whatsapp' | 'instagram' | 'email';

interface Message {
  id: string;
  sender: 'me' | 'contact';
  content: string;
  timestamp: string;
  isNote?: boolean;
  file?: { name: string; type: string; url: string };
}

interface Chat {
  id: string;
  initials: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  platform: Platform;
  color: string;
  phone: string;
}

// ── WAHA ─────────────────────────────────────────────────────────────────────
const WAHA_WS  = 'wss://automacao-target-waha.vr4mar.easypanel.host/sx5zl6hg3s6q5ikcofao8nflyhc9q5fw';
const WAHA_API = 'https://automacao-target-waha.vr4mar.easypanel.host';
const WAHA_API_KEY = (import.meta.env.VITE_WAHA_API_KEY as string) ?? '';
const WAHA_SESSION  = (import.meta.env.VITE_WAHA_SESSION  as string) ?? 'default';

const CHAT_COLORS = [
  'from-emerald-500 to-teal-600', 'from-violet-500 to-purple-600',
  'from-pink-500 to-rose-600',    'from-amber-500 to-orange-600',
  'from-teal-500 to-emerald-600', 'from-blue-500 to-indigo-600',
  'from-cyan-500 to-blue-600',    'from-fuchsia-500 to-pink-600',
];

function colorForId(id: string) {
  let h = 0;
  for (const c of id) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return CHAT_COLORS[Math.abs(h) % CHAT_COLORS.length];
}

function getInitials(name: string) {
  return (name || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
}

function formatPhone(waId: string) {
  const num = waId.split('@')[0];
  if (/^55\d{11}$/.test(num)) return `+55 ${num.slice(2, 4)} ${num.slice(4, 9)}-${num.slice(9)}`;
  return `+${num}`;
}

function fmtTime(ts: number) {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 86_400_000)
    return d.toLocaleDateString('pt-BR', { weekday: 'short' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

async function wahaFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${WAHA_API}${path}`, {
    ...options,
    headers: { 'X-Api-Key': WAHA_API_KEY, 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`WAHA ${res.status}`);
  return res.json() as Promise<T>;
}

function mapMessage(m: any): Message {
  const msgId = typeof m.id === 'object' ? (m.id._serialized ?? JSON.stringify(m.id)) : String(m.id ?? Date.now());
  return {
    id: msgId,
    sender: m.fromMe ? 'me' : 'contact',
    content: m.body || (m.hasMedia ? `[${m.type ?? 'Mídia'}]` : '(sem conteúdo)'),
    timestamp: m.timestamp ? fmtTime(m.timestamp) : '',
  };
}
// ─────────────────────────────────────────────────────────────────────────────

export function AIChat() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [searchQuery, setSearchQuery]   = useState('');
  const [chats, setChats]               = useState<Chat[]>([]);
  const [messages, setMessages]         = useState<Record<string, Message[]>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputValue, setInputValue]     = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNotesMode, setIsNotesMode]   = useState(false);
  const [loadingChats, setLoadingChats]       = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [wahaStatus, setWahaStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; url: string } | null>(null);
  const [emojisList, setEmojisList]     = useState<string[]>(EMOJIS);

  const [selectedLeadForModal, setSelectedLeadForModal] = useState<Lead | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'info' | 'history' | 'notes' | 'tasks' | 'turma' | 'checklist'>('info');

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const dropdownRef     = useRef<HTMLDivElement>(null);
  const emojiPickerRef  = useRef<HTMLDivElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const wsRef           = useRef<WebSocket | null>(null);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChat     = chats.find(c => c.id === activeChatId) ?? null;
  const activeMessages = activeChatId ? (messages[activeChatId] ?? []) : [];

  const { leads, fetchLeads, updateLeadStage, updateLead } = useLeadStore();
  const { pipelines, fetchPipelines } = usePipelineStore();
  const { profiles, fetchProfiles }   = useProfileStore();
  const { user } = useAuthStore();

  // ── WAHA helpers ─────────────────────────────────────────────────────────
  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const data: any[] = await wahaFetch(
        `/api/${WAHA_SESSION}/chats?sortField=lastMessage.timestamp&sortOrder=desc&limit=100`
      );
      setChats(
        data.map(c => ({
          id:          c.id as string,
          initials:    getInitials(c.name || formatPhone(c.id as string)),
          name:        c.name || formatPhone(c.id as string),
          lastMessage: c.lastMessage?.body ?? '',
          time:        c.timestamp ? fmtTime(c.timestamp as number) : '',
          unread:      (c.unreadCount as number) ?? 0,
          platform:    'whatsapp' as Platform,
          color:       colorForId(c.id as string),
          phone:       formatPhone(c.id as string),
        }))
      );
    } catch (err) {
      console.error('[WAHA] chats fetch failed:', err);
    } finally {
      setLoadingChats(false);
    }
  };

  const connectWS = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    setWahaStatus('connecting');

    const ws = new WebSocket(WAHA_WS);
    wsRef.current = ws;

    ws.onopen  = () => setWahaStatus('connected');
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      setWahaStatus('disconnected');
      reconnectRef.current = setTimeout(connectWS, 5000);
    };

    ws.onmessage = (evt) => {
      try {
        const event  = JSON.parse(evt.data as string);
        const type   = (event.event ?? event.type ?? '') as string;
        const payload = event.payload ?? event.data ?? event;

        if (!['message', 'message.any', 'message.received'].includes(type)) return;

        const msg: any = payload;
        const chatId: string = msg.fromMe ? (msg.to ?? '') : (msg.from ?? '');
        if (!chatId) return;

        const newMsg = mapMessage(msg);

        setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] ?? []), newMsg],
        }));

        setChats(prev => {
          const existing = prev.find(c => c.id === chatId);
          const updated: Chat = existing
            ? { ...existing, lastMessage: newMsg.content, time: newMsg.timestamp, unread: msg.fromMe ? existing.unread : existing.unread + 1 }
            : {
                id:          chatId,
                initials:    getInitials(msg.notifyName || formatPhone(chatId)),
                name:        msg.notifyName || formatPhone(chatId),
                lastMessage: newMsg.content,
                time:        newMsg.timestamp,
                unread:      msg.fromMe ? 0 : 1,
                platform:    'whatsapp' as Platform,
                color:       colorForId(chatId),
                phone:       formatPhone(chatId),
              };
          return [updated, ...prev.filter(c => c.id !== chatId)];
        });
      } catch {}
    };
  };
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (leads.length === 0) fetchLeads();
    if (pipelines.length === 0) fetchPipelines();
    if (profiles.length === 0) fetchProfiles();

    loadChats();
    connectWS();

    fetch('https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json')
      .then(r => r.json())
      .then((data: any[]) => {
        const list = data.map((i: any) => i.emoji).filter(Boolean) as string[];
        if (list.length) setEmojisList(list);
      })
      .catch(() => {});

    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatMessagesRef.current && (window as any).twemoji)
      (window as any).twemoji.parse(chatMessagesRef.current);
  }, [activeMessages, activeChatId]);

  useEffect(() => {
    if (emojiPickerRef.current && (window as any).twemoji)
      (window as any).twemoji.parse(emojiPickerRef.current);
  }, [showEmojiPicker]);

  const matchedRealLead = useMemo(() => {
    if (!activeChat) return null;
    return leads.find(l =>
      l.name.toLowerCase().includes(activeChat.name.toLowerCase()) ||
      activeChat.name.toLowerCase().includes(l.name.toLowerCase())
    ) ?? null;
  }, [activeChat, leads]);

  const currentPipeline = pipelines[0];
  const COLUMNS = useMemo(
    () => currentPipeline?.stages.map(s => ({ id: s.id, title: s.name, color: s.color || 'bg-blue-500' })) ?? [],
    [currentPipeline]
  );
  const responsiblesList = useMemo(
    () => profiles.map(p => ({ id: p.id, name: p.name || p.email || 'Sem nome' })),
    [profiles]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false);
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) setShowEmojiPicker(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectChat = async (chatId: string) => {
    setActiveChatId(chatId);
    setShowDropdown(false);
    setIsNotesMode(false);
    setShowEmojiPicker(false);
    setAttachedFile(null);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread: 0 } : c));

    if (messages[chatId]) return;
    setLoadingMessages(true);
    try {
      const data: any = await wahaFetch(
        `/api/${WAHA_SESSION}/chats/${encodeURIComponent(chatId)}/messages?limit=50&downloadMedia=false`
      );
      const list: any[] = Array.isArray(data) ? data : (data.messages ?? []);
      setMessages(prev => ({ ...prev, [chatId]: list.reverse().map(mapMessage) }));
    } catch (err) {
      console.error('[WAHA] messages fetch failed:', err);
      setMessages(prev => ({ ...prev, [chatId]: [] }));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessageOrSaveNote = async () => {
    if ((!inputValue.trim() && !attachedFile) || !activeChatId) return;

    let finalContent = inputValue;
    if (attachedFile && !finalContent.trim()) finalContent = `Enviou o arquivo: ${attachedFile.name}`;

    if (isNotesMode && matchedRealLead && user) {
      const authorName = profiles.find(p => p.id === user.id)?.name || user.email || 'Vendedor';
      await noteService.createNote({ content: finalContent, lead_id: matchedRealLead.id, author_id: user.id, author_name: authorName });
      window.dispatchEvent(new CustomEvent('refresh-lead-notes', { detail: { leadId: matchedRealLead.id } }));
    } else if (!isNotesMode) {
      try {
        await wahaFetch(`/api/${WAHA_SESSION}/sendText`, {
          method: 'POST',
          body: JSON.stringify({ chatId: activeChatId, text: finalContent }),
        });
      } catch (err) {
        console.error('[WAHA] send failed:', err);
      }
    }

    const newMessage: Message = {
      id: `temp_${Date.now()}`,
      sender: 'me',
      content: finalContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isNote: isNotesMode,
      file: attachedFile || undefined,
    };

    setMessages(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] ?? []), newMessage] }));
    setChats(prev => prev.map(c =>
      c.id === activeChatId
        ? { ...c, lastMessage: isNotesMode ? `[Anotação] ${finalContent}` : finalContent, time: newMessage.timestamp }
        : c
    ));
    setInputValue('');
    setAttachedFile(null);
    setIsNotesMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessageOrSaveNote(); }
  };

  const handleAddEmoji  = (emoji: string) => setInputValue(prev => prev + emoji);
  const handleFileClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile({ name: file.name, type: file.type, url: URL.createObjectURL(file) });
  };

  const handleOpenLeadModal = (tab: typeof modalInitialTab = 'info') => {
    if (matchedRealLead) {
      setModalInitialTab(tab);
      setSelectedLeadForModal(matchedRealLead);
      setShowDropdown(false);
    } else {
      alert('Nenhum Lead correspondente encontrado no sistema para abrir os detalhes.');
    }
  };

  const filteredChats = useMemo(() => {
    let list = chats;
    if (activeFilter === 'Não lidas') list = list.filter(c => c.unread > 0);
    else if (activeFilter === 'WhatsApp') list = list.filter(c => c.platform === 'whatsapp');
    else if (activeFilter === 'Instagram') list = list.filter(c => c.platform === 'instagram');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.lastMessage.toLowerCase().includes(q)
      );
    }
    return list;
  }, [chats, activeFilter, searchQuery]);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-hidden border-t border-slate-200 dark:border-slate-800/80">

      {/* Sidebar */}
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
            {/* WAHA status pill */}
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
              onClick={() => { loadChats(); connectWS(); }}
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
          {['Todas', 'Não lidas', 'WhatsApp', 'Instagram'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
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
              onChange={e => setSearchQuery(e.target.value)}
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
                  onClick={() => { loadChats(); connectWS(); }}
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
                onClick={() => handleSelectChat(chat.id)}
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
                    <p className={cn('text-[12px] truncate', chat.unread > 0 ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-500 dark:text-slate-400')}>
                      {chat.lastMessage || <span className="italic opacity-60">Sem mensagens</span>}
                    </p>
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

      {/* Main Panel */}
      {activeChatId && activeChat ? (
        <div className={cn('flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/40 relative h-full', activeChatId ? 'flex' : 'hidden md:flex')}>

          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, #10b981 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
          />

          {/* Chat Header */}
          <div className="h-[76px] px-4 sm:px-6 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 z-20 shrink-0 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={() => setActiveChatId(null)} className="md:hidden p-2 -ml-2 text-slate-500 hover:text-emerald-600 transition-colors">
                <ArrowLeft size={24} />
              </button>
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br shadow-sm', activeChat.color)}>
                {activeChat.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-[15px] text-slate-800 dark:text-slate-100">{activeChat.name}</h2>
                  {matchedRealLead && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                      {matchedRealLead.status === 'new' ? 'Novo' :
                       matchedRealLead.status === 'qualified' ? 'Qualificado' :
                       matchedRealLead.status === 'proposal' ? 'Proposta' :
                       matchedRealLead.status === 'closed' ? 'Ganho' :
                       matchedRealLead.status === 'lost' ? 'Perdido' : matchedRealLead.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">WhatsApp • {activeChat.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 text-slate-400 relative">
              {matchedRealLead && (
                <button
                  onClick={() => handleOpenLeadModal('info')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition-all border border-emerald-100 dark:border-emerald-900/30"
                >
                  <User size={13} className="stroke-[2.5]" />
                  Ver Lead
                </button>
              )}
              <button className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                <Search size={18} />
              </button>
              <button className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                <Phone size={18} />
              </button>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={cn('transition-colors p-2 rounded-lg', showDropdown ? 'text-emerald-600 bg-emerald-50 dark:bg-slate-800' : 'hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800')}
              >
                <MoreVertical size={18} />
              </button>

              {showDropdown && (
                <div ref={dropdownRef} className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 py-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 tracking-wider uppercase border-b border-slate-100 dark:border-slate-800/60 mb-1.5">Ações do Lead</div>
                  <button onClick={() => handleOpenLeadModal('info')} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2.5">
                    <User size={15} className="text-slate-400" />Abrir Cadastro do Lead
                  </button>
                  <button onClick={() => handleOpenLeadModal('tasks')} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2.5">
                    <CheckSquare size={15} className="text-slate-400" />Ver Tarefas / Agendar
                  </button>
                  <button onClick={() => handleOpenLeadModal('notes')} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2.5">
                    <Activity size={15} className="text-slate-400" />Anotações e Histórico
                  </button>
                  <button onClick={() => handleOpenLeadModal('turma')} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2.5">
                    <Calendar size={15} className="text-slate-400" />Matrícula e Turmas
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-6 space-y-4 z-0 custom-scrollbar">
            {loadingMessages ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="text-center mt-10">
                <span className="bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-lg text-xs font-medium text-slate-500 shadow-sm">
                  Início da conversa
                </span>
              </div>
            ) : (
              activeMessages.map(msg => (
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
                      </div>
                    </div>
                  </div>
                )
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 z-20 shrink-0 flex items-end gap-2.5 relative">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-20 left-4 w-72 h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col p-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emojis</span>
                  <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-1"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto grid grid-cols-6 gap-2 p-1 custom-scrollbar">
                  {emojisList.map((emoji, index) => (
                    <button key={index} onClick={() => handleAddEmoji(emoji)} className="text-2xl hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-xl transition-all active:scale-90">
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
                <button onClick={() => setAttachedFile(null)} className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-full transition-colors border border-slate-100 dark:border-slate-700/60">
                  <X size={16} />
                </button>
              </div>
            )}

            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={cn('p-3 rounded-full transition-colors shrink-0 hover:bg-slate-50 dark:hover:bg-slate-800', showEmojiPicker ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-650')} title="Inserir Emojis">
              <Smile size={22} />
            </button>
            <button onClick={handleFileClick} className={cn('p-3 rounded-full transition-colors shrink-0 hover:bg-slate-50 dark:hover:bg-slate-800', attachedFile ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-650')} title="Anexar Arquivo">
              <Paperclip size={22} />
            </button>
            <button onClick={() => setIsNotesMode(!isNotesMode)} className={cn('p-3 rounded-full transition-all shrink-0 active:scale-95 border', isNotesMode ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-400' : 'text-slate-400 border-transparent hover:text-amber-600 hover:bg-slate-50 dark:hover:bg-slate-800')} title="Salvar como Anotação Interna">
              <StickyNote size={22} />
            </button>

            <div className={cn('flex-1 border rounded-2xl flex items-end shadow-inner transition-all duration-200', isNotesMode ? 'bg-amber-50/50 border-amber-300 dark:bg-amber-950/10 dark:border-amber-900/70' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80')}>
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isNotesMode ? 'Escreva uma anotação interna para o lead…' : 'Digite sua mensagem…'}
                className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 px-4 py-3 outline-none resize-none max-h-32 min-h-[46px] custom-scrollbar font-medium"
                rows={1}
              />
            </div>

            {(inputValue.trim() || attachedFile) ? (
              <button onClick={handleSendMessageOrSaveNote} className={cn('p-3 text-white rounded-full transition-all shrink-0 mb-1 active:scale-95 shadow-md', isNotesMode ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20')} title={isNotesMode ? 'Salvar Anotação' : 'Enviar Mensagem'}>
                <Send size={18} />
              </button>
            ) : (
              <button className={cn('p-3 transition-colors rounded-full shrink-0 mb-1', isNotesMode ? 'text-amber-500' : 'text-slate-400')}>
                <MessageCircle size={22} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col items-center text-center max-w-[420px] relative z-10 px-4">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] transform rotate-12 flex items-center justify-center mb-8 shadow-xl shadow-emerald-900/10">
              <div className="transform -rotate-12">
                <MessageCircle className="w-10 h-10 text-white" fill="transparent" strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight">Selecione uma Conversa</h2>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              Gerencie contatos e mensagens integradas ao CRM. Abra uma conversa na barra lateral para começar a enviar mensagens e visualizar as informações completas do lead.
            </p>
          </div>
        </div>
      )}

      {selectedLeadForModal && (
        <LeadDetailsModal
          key={`lead-modal-${selectedLeadForModal.id}`}
          isOpen={!!selectedLeadForModal}
          onClose={() => setSelectedLeadForModal(null)}
          lead={leads.find(l => l.id === selectedLeadForModal.id) || selectedLeadForModal}
          pipelineStages={COLUMNS}
          currentStageId={selectedLeadForModal.stage_id || COLUMNS[0]?.id}
          responsibles={responsiblesList}
          initialTab={modalInitialTab}
          onStageChange={async (stageId: string) => {
            const targetStage = currentPipeline?.stages.find(s => s.id === stageId);
            await updateLeadStage(selectedLeadForModal.id, stageId);
            await updateLead(selectedLeadForModal.id, { status: (targetStage?.name ?? '') as LeadStatus });
          }}
        />
      )}
    </div>
  );
}
