import { MessageCircle } from 'lucide-react';

export function ChatEmptyState() {
  return (
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
  );
}
