import { useState, useRef, useEffect } from 'react';
import { Search, MoreVertical, Phone, ArrowLeft, User, Activity, CheckSquare, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Chat, LeadModalTab } from './types';
import type { Lead } from '../../types/leads';

interface Props {
  activeChat: Chat;
  matchedRealLead: Lead | null;
  activeChatId: string | null;
  showMsgSearch: boolean;
  onToggleMsgSearch: () => void;
  onOpenLeadModal: (tab: LeadModalTab) => void;
  onBack: () => void;
}

export function ChatHeader({
  activeChat, matchedRealLead, activeChatId,
  showMsgSearch, onToggleMsgSearch, onOpenLeadModal, onBack,
}: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [phoneCopied, setPhoneCopied]   = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setShowDropdown(false); }, [activeChatId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(activeChat.phone).then(() => {
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
    });
  };

  const statusLabel: Record<string, string> = {
    new: 'Novo', qualified: 'Qualificado', proposal: 'Proposta',
    closed: 'Ganho', lost: 'Perdido',
  };

  return (
    <div className="h-[76px] px-4 sm:px-6 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 z-20 shrink-0 shadow-sm">
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={onBack} className="md:hidden p-2 -ml-2 text-slate-500 hover:text-emerald-600 transition-colors">
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
                {statusLabel[matchedRealLead.status] ?? matchedRealLead.status}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">WhatsApp • {activeChat.phone}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 text-slate-400 relative">
        {matchedRealLead && (
          <button
            onClick={() => onOpenLeadModal('info')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition-all border border-emerald-100 dark:border-emerald-900/30"
          >
            <User size={13} className="stroke-[2.5]" />
            Ver Lead
          </button>
        )}
        <button
          onClick={onToggleMsgSearch}
          title="Buscar mensagens"
          className={cn('transition-colors p-2 rounded-lg', showMsgSearch ? 'text-emerald-600 bg-emerald-50 dark:bg-slate-800' : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800')}
        >
          <Search size={18} />
        </button>
        <button
          onClick={handleCopyPhone}
          title={phoneCopied ? 'Copiado!' : 'Copiar telefone'}
          className={cn('transition-colors p-2 rounded-lg', phoneCopied ? 'text-emerald-600 bg-emerald-50 dark:bg-slate-800' : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800')}
        >
          <Phone size={18} />
        </button>
        <button
          onClick={() => setShowDropdown(prev => !prev)}
          className={cn('transition-colors p-2 rounded-lg', showDropdown ? 'text-emerald-600 bg-emerald-50 dark:bg-slate-800' : 'hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800')}
        >
          <MoreVertical size={18} />
        </button>

        {showDropdown && (
          <div ref={dropdownRef} className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 py-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 tracking-wider uppercase border-b border-slate-100 dark:border-slate-800/60 mb-1.5">Ações do Lead</div>
            <button onClick={() => { onOpenLeadModal('info'); setShowDropdown(false); }} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2.5">
              <User size={15} className="text-slate-400" />Abrir Cadastro do Lead
            </button>
            <button onClick={() => { onOpenLeadModal('tasks'); setShowDropdown(false); }} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2.5">
              <CheckSquare size={15} className="text-slate-400" />Ver Tarefas / Agendar
            </button>
            <button onClick={() => { onOpenLeadModal('notes'); setShowDropdown(false); }} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2.5">
              <Activity size={15} className="text-slate-400" />Anotações e Histórico
            </button>
            <button onClick={() => { onOpenLeadModal('turma'); setShowDropdown(false); }} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2.5">
              <Calendar size={15} className="text-slate-400" />Matrícula e Turmas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
