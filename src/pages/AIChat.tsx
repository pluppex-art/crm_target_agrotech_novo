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
import { supabase } from '../lib/supabase';
import { whatsappMessageService } from '../services/whatsappMessageService';
import type { WaMessage, WaMsgSender } from '../services/whatsappMessageService';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  // Mirror of chats state for synchronous lookup inside WS handler closures
  const chatsRef = useRef<Chat[]>([]);
  // phone digits → saved contact name, built when chats load from API
  const contactNamesRef = useRef<Map<string, string>>(new Map());
  // tracks active chat ID synchronously inside WS handler closures
  const activeChatIdRef = useRef<string | null>(null);
  // Supabase Realtime channel handle (for cleanup)
  const realtimeRef = useRef<RealtimeChannel | null>(null);
  // @lid-derived chatId → canonical chatId (e.g. "17042532587583@c.us" → "556381123932@c.us")
  const lidToCanonical = useRef<Map<string, string>>(new Map());

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
        if (id.endsWith('@lid')) return false; // @lid = ID interno multi-device, não é número de telefone real
        return id.endsWith('@c.us') || id.endsWith('@g.us') || id.endsWith('@s.whatsapp.net');
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

  // Map Supabase row → UI Message (usa waha_msg_id como chave de dedup com o WS)
  const mapDbMessage = (row: WaMessage): Message => ({
    id:         row.waha_msg_id,
    sender:     row.sender === 'client' ? 'contact' : 'me',
    senderType: row.sender,
    content:    row.content ?? '(sem conteúdo)',
    timestamp:  fmtTime(Math.floor(new Date(row.created_at).getTime() / 1000)),
    ack:        row.status === 'read' ? 3 : row.status === 'delivered' ? 2 : row.status === 'sent' ? 1 : 0,
    msgType:    row.msg_type,
    mediaUrl:   row.media_url ?? undefined,
  });

  // Supabase Realtime — fonte primária de mensagens (ativada quando n8n gravar no banco)
  const subscribeRealtime = () => {
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    realtimeRef.current = whatsappMessageService.subscribe(
      // INSERT: mensagem nova (client, ai ou human via n8n)
      (row) => {
        const msg = mapDbMessage(row);
        setMessages(prev => {
          const cur = prev[row.chat_id] ?? [];
          if (cur.some(m => m.id === msg.id)) return prev; // dedup com WS
          return { ...prev, [row.chat_id]: [...cur, msg] };
        });
        const ts = fmtTime(Math.floor(new Date(row.created_at).getTime() / 1000));
        setChats(prev => {
          const existing = prev.find(c => c.id === row.chat_id);
          if (existing) {
            const updated: Chat = {
              ...existing,
              lastMessage: row.content ?? '',
              time: ts,
              unread: row.sender === 'client' && activeChatIdRef.current !== row.chat_id
                ? existing.unread + 1
                : existing.unread,
            };
            return [updated, ...prev.filter(c => c.id !== row.chat_id)];
          }
          const phone = row.phone ?? formatPhone(row.chat_id);
          const name  = contactNamesRef.current.get(phone.replace(/\D/g, '')) || phone || row.chat_id;
          return [{
            id: row.chat_id, initials: getInitials(name), name,
            lastMessage: row.content ?? '', time: ts,
            unread: row.sender === 'client' ? 1 : 0,
            platform: 'whatsapp' as const, color: colorForId(row.chat_id), phone,
          }, ...prev];
        });
      },
      // UPDATE: mudança de status (sent→delivered→read)
      (row) => {
        const ack = row.status === 'read' ? 3 : row.status === 'delivered' ? 2 : row.status === 'sent' ? 1 : 0;
        setMessages(prev => {
          for (const [chatId, msgs] of Object.entries(prev)) {
            const idx = msgs.findIndex(m => m.id === row.waha_msg_id);
            if (idx !== -1) {
              const updated = [...msgs];
              updated[idx] = { ...updated[idx], ack };
              return { ...prev, [chatId]: updated };
            }
          }
          return prev;
        });
      },
    );
  };

  // Apply chats to state and build phone→name lookup for WS name resolution
  const applyChats = (list: Chat[]) => {
    chatsRef.current = list; // sync update — disponível imediatamente para o WS handler
    setChats(list);
    const map = new Map<string, string>();
    list.forEach(c => {
      const digits = c.phone.replace(/\D/g, '');
      if (digits && c.name && c.name !== c.phone) map.set(digits, c.name);
    });
    contactNamesRef.current = map;
  };

  /**
   * Pré-carrega o mapeamento @lid → canonical a partir de um array bruto da API.
   * O WAHA retorna ambos os entries para o mesmo contato:
   *   "17042532587583@lid"   → ID interno multi-device (não é telefone)
   *   "556381123932@s.whatsapp.net" → JID real do telefone
   * Cruzamos pelo nome para montar o cache ANTES de qualquer evento WS.
   */
  const buildLidMapping = (rawList: any[]) => {
    const lidEntries  = rawList.filter(c => (c.id ?? '').endsWith('@lid'));
    const realEntries = rawList.filter(c => !(c.id ?? '').endsWith('@lid'));
    lidEntries.forEach(lid => {
      if (!lid.name) return;
      const lidName = (lid.name as string).toLowerCase();
      // Try exact match first, then partial match (one name contains the other)
      const match = realEntries.find(r => {
        if (!r.name) return false;
        const rName = (r.name as string).toLowerCase();
        return rName === lidName || rName.includes(lidName) || lidName.includes(rName);
      });
      if (match) {
        lidToCanonical.current.set(
          normalizeChatId(lid.id as string),
          normalizeChatId(match.id as string),
        );
      }
    });
  };

  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const sessionName = await resolveSession();
      try {
        const rawData: any[] = await wahaFetch(`/api/${sessionName}/chats`);
        // Build @lid→canonical cache before filtering so outgoing AI messages are routed correctly
        buildLidMapping(rawData);
        // Async: resolve any @lid entries still unmapped via WAHA contacts API
        const unresolvedLids = rawData.filter((c: any) =>
          (c.id ?? '').endsWith('@lid') && !lidToCanonical.current.has(normalizeChatId(c.id as string))
        );
        if (unresolvedLids.length > 0) {
          Promise.allSettled(
            unresolvedLids.slice(0, 10).map(async (lid: any) => {
              try {
                const contact: any = await wahaFetch(`/api/${sessionName}/contacts/${encodeURIComponent(lid.id as string)}`);
                const realJid: string = contact?.id ?? '';
                if (realJid && !realJid.endsWith('@lid')) {
                  lidToCanonical.current.set(normalizeChatId(lid.id as string), normalizeChatId(realJid));
                }
              } catch {}
            })
          ).catch(() => {});
        }
        applyChats(
          rawData
            .filter(c => {
              const id: string = c.id ?? '';
              if (!id || id === '0@c.us' || id.startsWith('status@') || id.startsWith('0@')) return false;
              if (id.endsWith('@lid')) return false; // fantasma multi-device — contato real já vem com JID de telefone
              return true;
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
      const rawContacts: any[] = await wahaFetch(`/api/${sessionName}/contacts`);
      if (Array.isArray(rawContacts) && rawContacts.length > 0) {
        buildLidMapping(rawContacts);
        applyChats(mapChatsFromContacts(rawContacts));
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

        // Resolve canonical ID: match by ID, phone digits, or sender name (handles @lid JID mismatches)
        const digitsOnly      = (s: string) => s.replace(/\D/g, '');
        const chatPhone       = formatPhone(chatId);
        const chatPhoneDigits = chatPhone.replace(/\D/g, '');
        const senderName      = (msg.notifyName || msg.pushName || msg.pushname || '').trim();

        // Detect @lid — digits do NOT correspond to a phone number
        const rawJid  = (msg.key?.remoteJid ?? msg.from ?? '') as string;
        const isLidJid = rawJid.endsWith('@lid');

        // Check @lid→canonical cache first (populated after first successful match)
        const cachedCanonical = isLidJid ? lidToCanonical.current.get(chatId) : undefined;

        let knownChat = cachedCanonical
          ? chatsRef.current.find(c => c.id === cachedCanonical)
          : chatsRef.current.find(c => {
              if (c.id === chatId) return true;
              // For @lid JIDs, skip phone comparison — LID digits ≠ real phone
              if (!isLidJid && chatPhoneDigits && digitsOnly(c.phone) === chatPhoneDigits) return true;
              // Name match (works for non-phone-only names)
              if (senderName && c.name && !/^\+[\d\s\-()+]+$/.test(c.name) &&
                  c.name.toLowerCase() === senderName.toLowerCase()) return true;
              return false;
            });

        // Last resort: currently active chat — covers @lid with empty notifyName
        if (!knownChat && activeChatIdRef.current) {
          const ac = chatsRef.current.find(c => c.id === activeChatIdRef.current);
          if (ac && (
            (senderName && ac.name && ac.name.toLowerCase() === senderName.toLowerCase()) ||
            (!isLidJid && chatPhoneDigits && digitsOnly(ac.phone) === chatPhoneDigits)
          )) knownChat = ac;
        }

        const canonicalId = knownChat?.id ?? chatId;

        // Cache @lid → canonical so subsequent messages skip the lookup
        if (isLidJid && knownChat && !cachedCanonical) {
          lidToCanonical.current.set(chatId, knownChat.id);
        }

        // Persist best known name for future incoming messages from same contact
        if (senderName && chatPhoneDigits) contactNamesRef.current.set(chatPhoneDigits, senderName);

        setTypingChats(prev => ({ ...prev, [canonicalId]: false }));
        const newMsg = mapMessage(msg);

        if (msg.fromMe) {
          // Replace temp message we added optimistically, avoid duplicate
          const tempId = pendingEchos.current.get(newMsg.content);
          if (tempId) {
            pendingEchos.current.delete(newMsg.content);
            setMessages(prev => {
              for (const [key, msgs] of Object.entries(prev)) {
                if (msgs.some(m => m.id === tempId)) {
                  return { ...prev, [key]: msgs.map(m => m.id === tempId ? { ...newMsg } : m) };
                }
              }
              const cur = prev[canonicalId] ?? [];
              if (cur.some(m => m.id === newMsg.id)) return prev;
              return { ...prev, [canonicalId]: [...cur, newMsg] };
            });
          } else {
            setMessages(prev => {
              const cur = prev[canonicalId] ?? [];
              if (cur.some(m => m.id === newMsg.id)) return prev;
              return { ...prev, [canonicalId]: [...cur, newMsg] };
            });
          }
        } else {
          // WAHA fires both "message" and "message.received" — deduplicate by ID
          setMessages(prev => {
            const cur = prev[canonicalId] ?? [];
            if (cur.some(m => m.id === newMsg.id)) return prev;
            return { ...prev, [canonicalId]: [...cur, newMsg] };
          });
        }

        // Best display name: contactNamesRef (from API or prior WS) → senderName → phone fallback
        const resolvedName =
          contactNamesRef.current.get(chatPhoneDigits) || senderName || chatPhone;

        // True when @lid JID arrived but no canonical mapping was found — would create a phantom
        const isUnresolvedLid = isLidJid && !knownChat;

        // Update sidebar — upgrade phone-only name to real name when WS provides it
        setChats(prev => {
          const existing = prev.find(c => c.id === canonicalId);
          // Never create a phantom sidebar entry for an unresolved @lid JID
          if (!existing && isUnresolvedLid) return prev;
          const isPhoneOnlyName = existing && (
            existing.name === existing.phone || /^\+[\d\s\-()+]+$/.test(existing.name)
          );
          const bestName = isPhoneOnlyName && resolvedName && resolvedName !== chatPhone
            ? resolvedName
            : (existing?.name ?? resolvedName);

          const updated: Chat = existing
            ? {
                ...existing,
                name:        bestName,
                initials:    bestName !== existing.name ? getInitials(bestName) : existing.initials,
                lastMessage: newMsg.content,
                time:        newMsg.timestamp,
                unread:      msg.fromMe ? existing.unread : existing.unread + 1,
              }
            : {
                id:          canonicalId,
                initials:    getInitials(resolvedName),
                name:        resolvedName,
                lastMessage: newMsg.content,
                time:        newMsg.timestamp,
                unread:      msg.fromMe ? 0 : 1,
                platform:    'whatsapp' as const,
                color:       colorForId(canonicalId),
                phone:       chatPhone,
              };
          return [updated, ...prev.filter(c => c.id !== canonicalId)];
        });

        // For unresolved @lid: async-resolve via WAHA contacts API, then reroute to the real chat
        if (isUnresolvedLid) {
          wahaFetch(`/api/${activeSessionRef.current}/contacts/${encodeURIComponent(rawJid)}`)
            .then((contact: any) => {
              const realPhoneJid: string = contact?.id ?? '';
              if (!realPhoneJid || realPhoneJid.endsWith('@lid')) return;
              const realId = normalizeChatId(realPhoneJid);
              lidToCanonical.current.set(chatId, realId);
              // Move any messages buffered under the @lid ID to the real chat
              setMessages(prev => {
                const pending = prev[chatId] ?? [];
                if (!pending.length) return prev;
                const real = prev[realId] ?? [];
                const realIds = new Set(real.map(m => m.id));
                const { [chatId]: _phantom, ...rest } = prev;
                return { ...rest, [realId]: [...real, ...pending.filter(m => !realIds.has(m.id))] };
              });
              // Bump the real chat to the top of the sidebar
              setChats(prev => {
                const realChat = prev.find(c => c.id === realId);
                if (!realChat) return prev;
                return [
                  {
                    ...realChat,
                    lastMessage: newMsg.content,
                    time:        newMsg.timestamp,
                    unread:      msg.fromMe ? realChat.unread : realChat.unread + 1,
                  },
                  ...prev.filter(c => c.id !== realId),
                ];
              });
            })
            .catch(() => {});
        }
      } catch {}
    };
  };
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (leads.length === 0) fetchLeads();
    if (pipelines.length === 0) fetchPipelines();
    if (profiles.length === 0) fetchProfiles();
    // Load chats first so chatsRef and contactNamesRef are populated before WS messages arrive
    loadChats().finally(() => {
      connectWS();
      subscribeRealtime(); // Supabase Realtime — fonte primária de mensagens
    });
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
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep chatsRef in sync so WS handler can do synchronous ID lookups
  useEffect(() => { chatsRef.current = chats; }, [chats]);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

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
      // Supabase primeiro — fonte da verdade quando n8n estiver configurado
      const rows = await whatsappMessageService.fetchMessages(chatId, 50);
      if (rows.length > 0) {
        setMessages(prev => {
          const ws   = prev[chatId] ?? [];
          const db   = rows.map(mapDbMessage);
          const dbIds = new Set(db.map(m => m.id));
          return { ...prev, [chatId]: [...db, ...ws.filter(m => !dbIds.has(m.id))] };
        });
        return;
      }
      // Fallback: WAHA API (chats ainda sem histórico no Supabase)
      const data: any = await wahaFetch(
        `/api/${activeSessionRef.current}/chats/${encodeURIComponent(chatId)}/messages?limit=50&downloadMedia=false`
      );
      const list: any[] = Array.isArray(data) ? data : (data.messages ?? []);
      setMessages(prev => {
        const ws  = prev[chatId] ?? [];
        const api = list.reverse().map(mapMessage);
        const apiIds = new Set(api.map(m => m.id));
        return { ...prev, [chatId]: [...api, ...ws.filter(m => !apiIds.has(m.id))] };
      });
    } catch (err) {
      console.error('[AIChat] messages fetch failed:', err);
      setMessages(prev => ({ ...prev, [chatId]: [] }));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessageOrSaveNote = async () => {
    if ((!inputValue.trim() && !attachedFile) || !activeChatId) return;

    let finalContent = inputValue;
    if (attachedFile && !finalContent.trim()) finalContent = `Enviou o arquivo: ${attachedFile.name}`;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isNotesMode && matchedRealLead && user) {
      // ── Anotação interna ──────────────────────────────────────────────────
      const authorName = profiles.find(p => p.id === user.id)?.name || user.email || 'Vendedor';
      await noteService.createNote({ content: finalContent, lead_id: matchedRealLead.id, author_id: user.id, author_name: authorName });
      window.dispatchEvent(new CustomEvent('refresh-lead-notes', { detail: { leadId: matchedRealLead.id } }));
      setMessages(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] ?? []), {
          id: `note_${Date.now()}`, sender: 'me', senderType: 'human' as const,
          content: finalContent, timestamp: ts, isNote: true, file: attachedFile || undefined,
        }],
      }));
      setChats(prev => {
        const ex = prev.find(c => c.id === activeChatId);
        if (!ex) return prev;
        return [{ ...ex, lastMessage: `[Anotação] ${finalContent}`, time: ts }, ...prev.filter(c => c.id !== activeChatId)];
      });
    } else if (!isNotesMode) {
      // ── Mensagem WhatsApp ─────────────────────────────────────────────────
      const tempId = `temp_${Date.now()}`;

      // 1) Exibe otimisticamente
      setMessages(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] ?? []), {
          id: tempId, sender: 'me', senderType: 'human' as const,
          content: finalContent, timestamp: ts, ack: 0, file: attachedFile || undefined,
        }],
      }));

      try {
        // 2) Envia via WAHA REST
        const wahaResp: any = await wahaFetch(`/api/sendText`, {
          method: 'POST',
          body: JSON.stringify({ session: activeSessionRef.current, chatId: activeChatId, text: finalContent }),
        });

        // 3) Extrai ID real do WAHA
        const wahaMsgId: string =
          (typeof wahaResp?.id === 'object' ? wahaResp.id._serialized : wahaResp?.id) ??
          wahaResp?.key?.id ?? tempId;

        // 4) Substitui temp pelo ID real (dedup com Realtime e WS)
        setMessages(prev => {
          const cur = prev[activeChatId] ?? [];
          if (cur.some(m => m.id === wahaMsgId)) {
            return { ...prev, [activeChatId]: cur.filter(m => m.id !== tempId) };
          }
          return { ...prev, [activeChatId]: cur.map(m => m.id === tempId ? { ...m, id: wahaMsgId, ack: 1 } : m) };
        });

        // 5) Registra no pendingEchos para dedup com WS (retrocompatibilidade)
        pendingEchos.current.set(finalContent, wahaMsgId);
        setTimeout(() => pendingEchos.current.delete(finalContent), 10_000);

        // 6) Persiste no Supabase — Realtime irá deduplicar pelo waha_msg_id
        whatsappMessageService.insert({
          waha_msg_id: wahaMsgId,
          chat_id:     activeChatId,
          phone:       activeChat?.phone ?? null,
          sender:      'human' as WaMsgSender,
          content:     finalContent,
          msg_type:    attachedFile ? (attachedFile.type.split('/')[0] || 'document') : 'text',
          media_url:   attachedFile?.url ?? null,
          status:      'sent',
          raw_payload: wahaResp ?? null,
        }).catch(e => console.warn('[Supabase] insert failed:', e));

      } catch (err) {
        console.error('[WAHA] send failed:', err);
        setMessages(prev => ({
          ...prev,
          [activeChatId]: (prev[activeChatId] ?? []).map(m => m.id === tempId ? { ...m, ack: -1 } : m),
        }));
      }

      setChats(prev => {
        const ex = prev.find(c => c.id === activeChatId);
        if (!ex) return prev;
        return [{ ...ex, lastMessage: finalContent, time: ts }, ...prev.filter(c => c.id !== activeChatId)];
      });
    }

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
