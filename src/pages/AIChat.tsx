import { useState, useRef, useEffect } from 'react';
import { Search, MoreVertical, MessageCircle, Send, Phone, Video, Paperclip, Smile, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

// Tipos simulados
type Platform = 'whatsapp' | 'instagram' | 'email';
interface Message {
  id: string;
  sender: 'me' | 'contact';
  content: string;
  timestamp: string;
}
interface Chat {
  id: number;
  initials: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  platform: Platform;
  color: string;
}

const INITIAL_CHATS: Chat[] = [
  { id: 1, initials: 'JS', name: 'João Silva', lastMessage: 'Obrigado! Aguardo o retorno.', time: '10:30', unread: 2, platform: 'whatsapp', color: 'bg-emerald-500' },
  { id: 2, initials: 'MO', name: 'Maria Oliveira', lastMessage: 'Qual o valor do frete?', time: '09:15', unread: 1, platform: 'whatsapp', color: 'bg-emerald-500' },
  { id: 3, initials: 'CE', name: 'Carlos Empresa', lastMessage: 'Segue em anexo a nota fiscal.', time: 'Ontem', unread: 0, platform: 'whatsapp', color: 'bg-emerald-500' },
  { id: 4, initials: 'AS', name: 'Ana Souza', lastMessage: 'Sim, concordo.', time: 'Ontem', unread: 0, platform: 'whatsapp', color: 'bg-emerald-500' },
  { id: 5, initials: 'MP', name: 'Marcos Pereira', lastMessage: 'Pode me enviar o catálogo?', time: 'Segunda', unread: 0, platform: 'whatsapp', color: 'bg-emerald-500' },
];

const INITIAL_MESSAGES: Record<number, Message[]> = {
  1: [
    { id: '1', sender: 'contact', content: 'Bom dia! Gostaria de saber mais sobre os cursos.', timestamp: '10:20' },
    { id: '2', sender: 'me', content: 'Olá João! Bom dia. Claro, temos opções para Drone, Pulverização e Gestão.', timestamp: '10:25' },
    { id: '3', sender: 'contact', content: 'Obrigado! Aguardo o retorno.', timestamp: '10:30' },
  ],
  2: [
    { id: '4', sender: 'contact', content: 'Qual o valor do frete?', timestamp: '09:15' },
  ],
};

export function AIChat() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeMessages = activeChatId ? (messages[activeChatId] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSelectChat = (chatId: number) => {
    setActiveChatId(chatId);
    // Limpar unread quando abre a conversa
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread: 0 } : c));
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || !activeChatId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'me',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMessage]
    }));

    setChats(prev => prev.map(c => 
      c.id === activeChatId 
        ? { ...c, lastMessage: inputValue, time: newMessage.timestamp } 
        : c
    ));

    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f3f6f9] dark:bg-transparent text-slate-800 dark:text-slate-200 font-sans overflow-hidden border-t border-slate-200 dark:border-slate-800">
      
      {/* Sidebar - Contatos */}
      <div className={cn(
        "w-full md:w-[340px] lg:w-[380px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800/60 flex-col bg-white dark:bg-slate-900",
        activeChatId ? "hidden md:flex" : "flex"
      )}>
        
        {/* Header da Sidebar */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Mensagens</h1>
          <div className="flex items-center gap-4 text-slate-400">
            <button className="hover:text-emerald-600 transition-colors"><Search size={18} /></button>
            <button className="hover:text-emerald-600 transition-colors"><MoreVertical size={18} /></button>
          </div>
        </div>

        {/* Filtros em Pílulas */}
        <div className="px-4 py-4 flex items-center gap-2 overflow-x-auto custom-scrollbar border-b border-slate-100 dark:border-slate-800/50">
          {['Todas', 'Não lidas', 'WhatsApp', 'Instagram'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors border",
                activeFilter === filter 
                  ? "bg-emerald-600 text-white border-emerald-500" 
                  : "bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800/50 hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-300"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Campo de Busca */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou tag..." 
              className="w-full bg-slate-50 dark:bg-slate-800/50 text-[13px] font-medium text-slate-800 dark:text-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => handleSelectChat(chat.id)}
              className={cn(
                "flex items-center gap-3.5 px-5 py-4 cursor-pointer border-b border-slate-100 dark:border-slate-800/40 transition-colors",
                activeChatId === chat.id 
                  ? "bg-emerald-50 dark:bg-emerald-900/10" 
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
              )}
            >
              <div className="relative shrink-0">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm", chat.color)}>
                  {chat.initials}
                </div>
                {chat.platform === 'whatsapp' && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                      <MessageCircle className="w-[10px] h-[10px] text-white" fill="currentColor" strokeWidth={0} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200 truncate">{chat.name}</h3>
                  <span className={cn("text-[11px] whitespace-nowrap", chat.unread > 0 ? "text-emerald-600 dark:text-emerald-500 font-bold" : "text-slate-400 font-medium")}>
                    {chat.time}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className={cn("text-[13px] truncate", chat.unread > 0 ? "text-slate-700 dark:text-slate-300 font-bold" : "text-slate-500 dark:text-slate-400")}>
                    {chat.lastMessage}
                  </p>
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm">
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Panel - Area de Chat ou Estado Vazio */}
      {activeChatId && activeChat ? (
        <div className={cn(
          "flex-1 flex-col bg-[#e5ddd5] dark:bg-[#0B1120] relative",
          activeChatId ? "flex" : "hidden md:flex"
        )}>
          
          {/* Fundo estilo WhatsApp / textura */}
          <div className="absolute inset-0 opacity-40 dark:opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />

          {/* Chat Header */}
          <div className="h-[76px] px-4 sm:px-6 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 shrink-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={() => setActiveChatId(null)}
                className="md:hidden p-2 -ml-2 text-slate-500 hover:text-emerald-600 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm", activeChat.color)}>
                {activeChat.initials}
              </div>
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100">{activeChat.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Origem: {activeChat.platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <button className="hover:text-emerald-600 transition-colors"><Search size={20} /></button>
              <button className="hover:text-emerald-600 transition-colors"><Phone size={20} /></button>
              <button className="hover:text-emerald-600 transition-colors"><Video size={20} /></button>
              <button className="hover:text-emerald-600 transition-colors"><MoreVertical size={20} /></button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10 custom-scrollbar">
            {activeMessages.length === 0 ? (
              <div className="text-center mt-10">
                <span className="bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-lg text-xs font-medium text-slate-500 shadow-sm">
                  Início da conversa
                </span>
              </div>
            ) : (
              activeMessages.map(msg => (
                <div key={msg.id} className={cn("flex", msg.sender === 'me' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm relative group",
                    msg.sender === 'me' 
                      ? "bg-emerald-600 text-white rounded-tr-sm" 
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-100 dark:border-slate-700"
                  )}>
                    <p className="text-[14px] leading-relaxed">{msg.content}</p>
                    <div className="flex justify-end items-center gap-1 mt-1 opacity-70">
                      <span className={cn("text-[10px]", msg.sender === 'me' ? "text-emerald-100" : "text-slate-400")}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10 shrink-0 flex items-end gap-2">
            <button className="p-3 text-slate-400 hover:text-emerald-600 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0">
              <Smile size={24} />
            </button>
            <button className="p-3 text-slate-400 hover:text-emerald-600 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0">
              <Paperclip size={24} />
            </button>
            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-end shadow-inner">
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem..."
                className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 px-4 py-3.5 outline-none resize-none max-h-32 min-h-[50px] custom-scrollbar"
                rows={1}
              />
            </div>
            {inputValue.trim() ? (
              <button 
                onClick={handleSendMessage}
                className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors shadow-md shrink-0 mb-1"
              >
                <Send size={20} />
              </button>
            ) : (
              <button className="p-3 text-slate-400 hover:text-emerald-600 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 mb-1">
                <MessageCircle size={24} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-50 dark:bg-[#0B1120] relative overflow-hidden">
          {/* Glow suave ao fundo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col items-center text-center max-w-[420px] relative z-10">
            <div className="w-28 h-28 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] transform rotate-12 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-900/20">
              <div className="transform -rotate-12">
                <MessageCircle className="w-12 h-12 text-white" fill="transparent" strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4 tracking-tight">Central de Mensagens</h2>
            <p className="text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Omnichannel inteligente. Gerencie WhatsApp, Instagram e E-mail em um só lugar. Selecione uma conversa ao lado para começar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
