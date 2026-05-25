import React from 'react';
import { Plus, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface LeadNotesTabProps {
  notes: any[];
  newNote: string;
  loadingNotes: boolean;
  setNewNote: (note: string) => void;
  handleAddNote: () => Promise<void>;
  handleDeleteNote: (noteId: string) => Promise<void>;
}

export const LeadNotesTab: React.FC<LeadNotesTabProps> = ({
  notes,
  newNote,
  loadingNotes,
  setNewNote,
  handleAddNote,
  handleDeleteNote,
}) => {
  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nova Nota</label>
        <div className="relative">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Adicione uma observação sobre este lead..."
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm min-h-[100px] resize-none shadow-sm"
          />
          <button
            onClick={handleAddNote}
            className="absolute bottom-3 right-3 p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loadingNotes ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-emerald-600 w-6 h-6" />
          </div>
        ) : notes.length > 0 ? (
          notes.map((note: any) => {
            const noteDate = new Date(note.created_at);
            const dateStr = noteDate.toLocaleDateString('pt-BR');
            const timeStr = noteDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            const isVendaFechadaOriginal = note.content.includes('🎉 Lead') && note.content.includes('entrou em Ganho na data de');
            const isVendaFechadaNova = note.content.includes('🏆 Venda Fechada!');
            const isVendaFechada = isVendaFechadaOriginal || isVendaFechadaNova;
            
            let displayContent = note.content;
            if (isVendaFechadaOriginal) {
              displayContent = note.content.replace(
                /🎉 Lead (.*?) entrou em Ganho na data de (.*)/,
                '🏆 Venda Fechada! O lead $1 foi movido para Ganho com sucesso no dia $2.'
              );
            }

            return (
              <div key={note.id} className={cn(
                "border rounded-2xl p-4 relative group transition-all",
                isVendaFechada
                  ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-md"
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
              )}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                        isVendaFechada ? "text-emerald-700 bg-emerald-100" : "text-emerald-600 bg-emerald-50"
                      )}>
                        {dateStr} às {timeStr}
                      </span>
                    </div>
                    {note.author_name && (
                      <span className={cn("text-[10px] font-semibold px-1", isVendaFechada ? "text-emerald-600" : "text-slate-500 dark:text-slate-400")}>
                        por {note.author_name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className={cn(
                  "leading-relaxed",
                  isVendaFechada ? "text-sm md:text-base font-bold text-emerald-800" : "text-sm text-slate-700 dark:text-slate-300"
                )}>
                  {displayContent}
                </p>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhuma nota registrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

