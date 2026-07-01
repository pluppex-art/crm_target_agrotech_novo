import { useState, useRef, useEffect, useMemo } from 'react';
import { useLeadStore } from '../store/useLeadStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { useProfileStore } from '../store/useProfileStore';
import { useAuthStore } from '../store/useAuthStore';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { noteService } from '../services/noteService';
import type { Lead, LeadStatus } from '../types/leads';

import { ChatSidebar }    from '../components/aichat/ChatSidebar';
import { ChatHeader }     from '../components/aichat/ChatHeader';
import { ChatMessages }   from '../components/aichat/ChatMessages';
import { ChatInput }      from '../components/aichat/ChatInput';
import { ChatEmptyState } from '../components/aichat/ChatEmptyState';
import type { Chat, Message, AttachedFile, LeadModalTab } from '../components/aichat/types';
import { EMOJIS, WAHA_SESSION, WAHA_WS } from '../components/aichat/constants';
import {
  normalizeChatId, extractChatId, wahaFetch,
  mapMessage, colorForId, getInitials, formatPhone, fmtTime,
} from '../components/aichat/utils';

export function AIChat() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [searchQuery, setSearchQuery]   = useState('');
  const [chats, setChats]               = useState<Chat[]>([]);
  const [messages, setMessages]         = useState<Record<string, Message[]>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputValue, setInputValue]     = useState('');
  const [isNotesMode, setIsNotesMode]   = useState(false);
  const [loadingChats, setLoadingChats]       = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [wahaStatus, setWahaStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [attachedFile, setAttachedFile]   = useState<AttachedFile | null>(null);
  const [emojisList, setEmojisList]       = useState<string[]>(EMOJIS);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<Lead | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<LeadModalTab>('info');
  const [typingChats, setTypingChats] = useState<Record<string, boolean>>({});
  const [agentMode, setAgentMode]     = useState(true);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const wsRef           = useRef<WebSocket | null>(null);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSessionRef  = useRef<string>(WAHA_SESSION);
  const typingTimers    = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Maps message content → tempId so we can replace temp with real echo from WAHA
  const pendingEchos = useRef<Map<string, string>>(new Map());

  const activeChat     = chats.find(c => c.id === activeChatId) ?? null;
  const activeMessages = activeChatId ? (messages[activeChatId] ?? []) : [];

  const { leads, fetchLeads, updateLeadStage, updateLead } = useLeadStore();
  const { pipelines, fetchPipelines } = usePipelineStore();
  const { profiles, fetchProfiles }   = useProfileStore();
  const { user } = useAuthStore();

  // ── WAHA ─────────────────────────────────────────────────────────────────
  const resolveSession = async (): Promise<string> => {
    try {
      const sessions: any[] = await wahaFetch('/api/sessions');
      if (Array.isArray(sessions)) {
        const working = sessions.find(s => s.status === 'WORKING');
        if (working?.name) {
          activeSessionRef.current = working.name;
          return working.name;
        }
      }
    } catch (e) {
      console.warn('[WAHA] /api/sessions failed:', e);
    }
    return activeSessionRef.current;
  };

  const mapChatsFromContacts = (contacts: any[]): Chat[] =>
    contacts
      .filter(c => {
        const id: string = c.id ?? '';
        if (!id || id === '0@c.us' || id.startsWith('status@') || id.startsWith('0@')) return false;
        return id.endsWith('@c.us') || id.endsWith('@g.us') || id.endsWith('@s.whatsapp.net') || id.endsWith('@lid');
      })
      .map(c => ({
        id:          normalizeChatId(c.id as string),
        initials:    getInitials(c.name || c.pushname || formatPhone(c.id as string)),
        name:        c.name || c.pushname || formatPhone(c.id as string),
        lastMessage: '',
        time:        '',
        unread:      0,
        platform:    'whatsapp' as const,
        color:       colorForId(c.id as string),
        phone:       formatPhone(c.id as string),
      }));

  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const sessionName = await resolveSession();
      try {
        const data: any[] = await wahaFetch(`/api/${sessionName}/chats`);
        setChats(
          data
            .filter(c => {
              const id: string = c.id ?? '';
              return id && id !== '0@c.us' && !id.startsWith('status@') && !id.startsWith('0@');
            })
            .map(c => ({
              id:          normalizeChatId(c.id as string),
              initials:    getInitials(c.name || formatPhone(c.id as string)),
              name:        c.name || formatPhone(c.id as string),
              lastMessage: c.lastMessage?.body ?? c.lastMessage?.text ?? '',
              time:        c.timestamp ? fmtTime(c.timestamp as number) : '',
              unread:      (c.unreadCount as number) ?? 0,
              platform:    'whatsapp' as const,
              color:       colorForId(c.id as string),
              phone:       formatPhone(c.id as string),
            }))
        );
        return;
      } catch {
        // fallback to contacts
      }
      const contacts: any[] = await wahaFetch(`/api/${sessionName}/contacts`);
      if (Array.isArray(contacts) && contacts.length > 0) {
        setChats(mapChatsFromContacts(contacts));
      }
    } catch (err) {
      console.error('[WAHA] loadChats failed:', err);
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
        const event   = JSON.parse(evt.data as string);
        const type    = (event.event ?? event.type ?? '') as string;
        const payload = event.payload ?? event.data ?? event;

        if (type === 'presence.update') {
          const presences: any[] = payload.presences ?? [];
          const chatId: string = payload.id ?? '';
          if (!chatId) return;
          const isTyping = presences.some((p: any) =>
            p.lastKnownPresence === 'typing' || p.lastKnownPresence === 'recording'
          );
          setTypingChats(prev => ({ ...prev, [chatId]: isTyping }));
          if (isTyping) {
            clearTimeout(typingTimers.current[chatId]);
            typingTimers.current[chatId] = setTimeout(() => {
              setTypingChats(prev => ({ ...prev, [chatId]: false }));
            }, 5000);
          }
          return;
        }

        if (type === 'message.ack') {
          const ackMsg = payload;
          const msgId  = typeof ackMsg.id === 'object' ? (ackMsg.id._serialized ?? '') : String(ackMsg.id ?? '');
          const ack    = ackMsg.ack as number;
          const chatId = extractChatId(ackMsg);
          if (msgId && chatId) {
            setMessages(prev => ({
              ...prev,
              [chatId]: (prev[chatId] ?? []).map(m => m.id === msgId ? { ...m, ack } : m),
            }));
          }
          return;
        }

        if (!['message', 'message.any', 'message.received'].includes(type)) return;

        const msg: any = payload;
        const chatId   = extractChatId(msg);
        if (!chatId) return;

        setTypingChats(prev => ({ ...prev, [chatId]: false }));
        const newMsg = mapMessage(msg);

        if (msg.fromMe) {
          // Replace temp message we added optimistically, avoid duplicate
          const tempId = pendingEchos.current.get(newMsg.content);
          if (tempId) {
            pendingEchos.current.delete(newMsg.content);
            setMessages(prev => {
              // Search all keys in case of ID mismatch (find where the temp is stored)
              for (const [key, msgs] of Object.entries(prev)) {
                if (msgs.some(m => m.id === tempId)) {
                  return { ...prev, [key]: msgs.map(m => m.id === tempId ? { ...newMsg } : m) };
                }
              }
              // Temp not found (e.g. sent from another device) — add normally
              return { ...prev, [chatId]: [...(prev[chatId] ?? []), newMsg] };
            });
          }
          // Echo with no pending temp = sent from another device, add it
          else {
            setMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] ?? []), newMsg] }));
          }
        } else {
          setMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] ?? []), newMsg] }));
        }

        // Match by ID first, fall back to phone number to avoid creating duplicate chat entries
        setChats(prev => {
          const chatPhone = formatPhone(chatId);
          const existing  = prev.find(c => c.id === chatId || c.phone === chatPhone);
          const updated: Chat = existing
            ? { ...existing, lastMessage: newMsg.content, time: newMsg.timestamp, unread: msg.fromMe ? existing.unread : existing.unread + 1 }
            : {
                id:          chatId,
                initials:    getInitials(msg.notifyName || formatPhone(chatId)),
                name:        msg.notifyName || formatPhone(chatId),
                lastMessage: newMsg.content,
                time:        newMsg.timestamp,
                unread:      msg.fromMe ? 0 : 1,
                platform:    'whatsapp' as const,
                color:       colorForId(chatId),
                phone:       chatPhone,
              };
          return [updated, ...prev.filter(c => c.id !== (existing?.id ?? chatId))];
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

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

  const visibleMessages = useMemo(() => {
    if (!msgSearchQuery.trim()) return activeMessages;
    const q = msgSearchQuery.toLowerCase();
    return activeMessages.filter(m => m.content.toLowerCase().includes(q));
  }, [activeMessages, msgSearchQuery]);

  const handleSelectChat = async (chatId: string) => {
    setActiveChatId(chatId);
    setIsNotesMode(false);
    setAttachedFile(null);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread: 0 } : c));
    if (messages[chatId]) return;
    setLoadingMessages(true);
    try {
      const data: any = await wahaFetch(
        `/api/${activeSessionRef.current}/chats/${encodeURIComponent(chatId)}/messages?limit=50&downloadMedia=false`
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
        await wahaFetch(`/api/sendText`, {
          method: 'POST',
          body: JSON.stringify({ session: activeSessionRef.current, chatId: activeChatId, text: finalContent }),
        });
      } catch (err) {
        console.error('[WAHA] send failed:', err);
      }
    }

    const tempId = `temp_${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      sender: 'me',
      content: finalContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isNote: isNotesMode,
      file: attachedFile || undefined,
    };

    // Register so the WAHA echo can replace this temp instead of duplicating
    if (!isNotesMode) {
      pendingEchos.current.set(finalContent, tempId);
      // Clear after 10s in case WAHA never echoes (e.g. send failed silently)
      setTimeout(() => pendingEchos.current.delete(finalContent), 10_000);
    }

    setMessages(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] ?? []), newMessage] }));
    setChats(prev => {
      const existing = prev.find(c => c.id === activeChatId);
      if (!existing) return prev;
      return [{ ...existing, lastMessage: isNotesMode ? `[Anotação] ${finalContent}` : finalContent, time: newMessage.timestamp }, ...prev.filter(c => c.id !== activeChatId)];
    });
    setInputValue('');
    setAttachedFile(null);
    setIsNotesMode(false);
  };

  const handleOpenLeadModal = (tab: LeadModalTab = 'info') => {
    if (matchedRealLead) {
      setModalInitialTab(tab);
      setSelectedLeadForModal(matchedRealLead);
    } else {
      alert('Nenhum Lead correspondente encontrado no sistema para abrir os detalhes.');
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-hidden border-t border-slate-200 dark:border-slate-800/80">

      <ChatSidebar
        filteredChats={filteredChats}
        activeChatId={activeChatId}
        loadingChats={loadingChats}
        wahaStatus={wahaStatus}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typingChats={typingChats}
        agentMode={agentMode}
        onToggleAgentMode={() => setAgentMode(prev => !prev)}
        onSelectChat={handleSelectChat}
        onRefresh={() => { loadChats(); connectWS(); }}
      />

      {activeChatId && activeChat ? (
        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/40 relative h-full">
          <div
            className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, #10b981 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
          />
          <ChatHeader
            activeChat={activeChat}
            matchedRealLead={matchedRealLead}
            activeChatId={activeChatId}
            showMsgSearch={showMsgSearch}
            onToggleMsgSearch={() => { setShowMsgSearch(prev => !prev); setMsgSearchQuery(''); }}
            onOpenLeadModal={handleOpenLeadModal}
            onBack={() => setActiveChatId(null)}
          />
          <ChatMessages
            visibleMessages={visibleMessages}
            loadingMessages={loadingMessages}
            activeChatId={activeChatId}
            typingChats={typingChats}
            showMsgSearch={showMsgSearch}
            msgSearchQuery={msgSearchQuery}
            onMsgSearchChange={setMsgSearchQuery}
            messagesEndRef={messagesEndRef}
            chatMessagesRef={chatMessagesRef}
          />
          <ChatInput
            inputValue={inputValue}
            onInputChange={setInputValue}
            isNotesMode={isNotesMode}
            onToggleNotesMode={() => setIsNotesMode(prev => !prev)}
            agentMode={agentMode}
            onDisableAgentMode={() => setAgentMode(false)}
            attachedFile={attachedFile}
            onClearFile={() => setAttachedFile(null)}
            onFileSelected={setAttachedFile}
            emojisList={emojisList}
            activeChatId={activeChatId}
            onSend={handleSendMessageOrSaveNote}
          />
        </div>
      ) : (
        <ChatEmptyState />
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
