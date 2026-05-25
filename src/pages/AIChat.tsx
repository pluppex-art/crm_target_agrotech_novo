import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Copy, RefreshCw, MessageSquare } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;


interface Message {
  role: 'user' | 'model';
  content: string;
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'Olá! Sou o Assistente de IA de Vendas da Target Agrotech. Como posso ajudar você a vender mais hoje? Posso criar e-mails de prospecção, scripts de fechamento ou mensagens de WhatsApp personalizadas.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!ai) {
      setMessages(prev => [...prev, { role: 'model', content: 'IA não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env e reinicie o servidor.' }]);
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
          systemInstruction: "Você é o Assistente de IA de Vendas da Target Agrotech. Sua especialidade é criar textos persuasivos para o time comercial: e-mails de prospecção, scripts de vendas para cursos agrícolas, quebra de objeções e mensagens de WhatsApp. Seu tom deve ser entusiasmado, profissional e focado em converter leads em alunos.",
        }
      });

      const aiResponse = response.text || "Desculpe, não consegui processar sua solicitação.";
      setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "Ocorreu um erro ao falar com a IA. Verifique sua conexão ou tente novamente mais tarde." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#f3f6f9] dark:bg-transparent">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 truncate">Assistente de IA de Vendas</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Sua ferramenta para criar abordagens comerciais de alta performance.</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex gap-4 max-w-4xl",
            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
          )}>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              msg.role === 'model' ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            )}>
              {msg.role === 'model' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
              msg.role === 'model' ? "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800" : "bg-emerald-600 text-white"
            )}>
              {msg.content}
              {msg.role === 'model' && i > 0 && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                  <button 
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase"
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                  </button>
                  <button className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase">
                    <RefreshCw className="w-3 h-3" />
                    Regerar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-4xl">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ex: Crie um e-mail de prospecção..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 sm:py-4 pl-4 pr-14 text-sm focus:ring-2 focus:ring-emerald-500 transition-all resize-none h-20 sm:h-24"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 bottom-3 p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-4 font-medium">
          A IA pode cometer erros. Verifique as informações importantes antes de enviar.
        </p>
      </div>
    </div>
  );
}
