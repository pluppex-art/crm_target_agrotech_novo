import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, MessageSquare, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../../lib/utils';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

interface Message {
  role: 'user' | 'model';
  content: string;
}

export function AIAgentHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'Olá! Sou seu Agente de Inteligência. Estou aqui para ajudar com qualquer dúvida sobre o CRM ou processos da Target Agrotech. Como posso ser útil?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!ai) {
      setMessages(prev => [...prev, { role: 'model', content: 'IA não configurada.' }]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [...messages, { role: 'user', content: userMessage }].map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: "Você é o Agente de Inteligência e Operações da Target Agrotech. Sua função é auxiliar os usuários do CRM com dúvidas operacionais, análise de métricas e suporte geral. Diferente do assistente de vendas (que foca em textos comerciais), você foca em eficiência, dados e suporte ao sistema. Seja conciso, inteligente e técnico quando necessário.",
        }
      });

      const aiResponse = response.text || "Não consegui processar isso no momento.";
      setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "Erro na conexão com a inteligência." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-full transition-all relative group",
          isOpen 
            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
        )}
        title="Agente de IA"
      >
        <Sparkles className={cn("w-5 h-5", isOpen && "animate-pulse")} />
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 10, scale: 0.95, x: 20 }}
            className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col h-[500px]"
          >
            {/* Header do Agente */}
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">IA Agente</p>
                  <p className="text-sm font-bold">Inteligência Operacional</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  "flex gap-3",
                  msg.role === 'user' ? "flex-row-reverse" : ""
                )}>
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center shrink-0 mt-1",
                    msg.role === 'model' ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"
                  )}>
                    {msg.role === 'model' ? <Bot size={14} /> : <span className="text-[10px] font-bold">EU</span>}
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl text-xs leading-relaxed shadow-sm",
                    msg.role === 'model' ? "bg-white text-slate-700 border border-slate-100" : "bg-emerald-600 text-white"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center text-white">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold animate-pulse">Pensando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Input */}
            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pergunte algo ao agente..."
                  className="w-full bg-slate-100 border-none rounded-xl py-2.5 pl-3 pr-10 text-xs focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
