import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Edit2, Trash2, Plus, Phone, Mail, MapPin, Tag, User, Calendar, Clock, Save, MessageSquare, CheckSquare, Loader2 } from 'lucide-react';
import { Lead, LeadSubStatus } from '../../types/leads';
import { useLeadStore } from '../../store/useLeadStore';
import { useTaskStore } from '../../store/useTaskStore';
import { noteService, Note } from '../../services/noteService';
import { cn } from '../../lib/utils';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

type TabType = 'info' | 'history' | 'notes' | 'tasks';

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ isOpen, onClose, lead }) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const { setSelectedLead, updateLeadSubStatus } = useLeadStore();
  const { fetchTasksByLeadId, addTask, updateTaskStatus } = useTaskStore();

  useEffect(() => {
    if (isOpen && lead.id) {
      loadNotes();
      loadTasks();
    }
  }, [isOpen, lead.id]);

  const loadNotes = async () => {
    setLoadingNotes(true);
    const fetchedNotes = await noteService.getNotesByLeadId(lead.id);
    setNotes(fetchedNotes);
    setLoadingNotes(false);
  };

  const loadTasks = async () => {
    setLoadingTasks(true);
    const fetchedTasks = await fetchTasksByLeadId(lead.id);
    setLeadTasks(fetchedTasks);
    setLoadingTasks(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const note = await noteService.createNote({
      content: newNote,
      lead_id: lead.id,
      author_name: 'Usuário Atual' // Placeholder
    });
    if (note) {
      setNotes([note, ...notes]);
      setNewNote('');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await addTask({
      title: newTaskTitle,
      lead_id: lead.id,
      status: 'pending',
      priority: 'medium'
    });
    setNewTaskTitle('');
    loadTasks();
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    await updateTaskStatus(taskId, newStatus);
    loadTasks();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800">{lead.name}</h2>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={cn(
                      i < lead.stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors flex items-center gap-2 text-sm font-medium">
                <Edit2 size={18} />
                Editar
              </button>
              <button className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors">
                <Trash2 size={18} />
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="px-6 border-b border-gray-100 flex gap-6 overflow-x-auto">
            {[
              { id: 'info', label: 'Informações', icon: User },
              { id: 'history', label: 'Histórico', icon: Clock },
              { id: 'notes', label: 'Anotações', icon: MessageSquare },
              { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "py-4 text-sm font-semibold transition-colors relative flex items-center gap-2 whitespace-nowrap",
                  activeTab === tab.id ? "text-emerald-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'info' && (
              <div className="space-y-8">
                {/* Profile Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img 
                      src={lead.photo} 
                      alt={lead.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-emerald-50"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white">
                      <User size={14} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{lead.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className={cn(i < lead.stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} />
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Tag size={14} className="text-emerald-500" />
                        CNPJ: {lead.cnpj || 'Não informado'}
                      </span>
                      <span className="font-bold text-emerald-600 text-lg">
                        R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
                    <input 
                      type="text" 
                      defaultValue={lead.name}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        defaultValue={lead.phone}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                      />
                      <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        defaultValue={lead.email}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                      />
                      <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Produto/Serviço</label>
                    <input 
                      type="text" 
                      defaultValue={lead.product}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700"
                    />
                  </div>

                  {lead.status === 'qualified' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sub-status de Qualificação</label>
                      <select
                        defaultValue={lead.subStatus || 'qualified'}
                        onChange={(e) => updateLeadSubStatus(lead.id, e.target.value as LeadSubStatus)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-gray-700 font-medium"
                      >
                        <option value="qualified">Qualificado</option>
                        <option value="warming">Aquecimento</option>
                        <option value="disqualified">Desqualificado</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                {lead.history?.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex gap-4">
                    <div className="flex flex-col items-center gap-1 min-w-[100px]">
                      <span className="text-xs font-bold text-gray-400 uppercase">ID:{item.id}</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Calendar size={10} />
                        {item.date}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Clock size={10} />
                        {item.time}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
                {(!lead.history || lead.history.length === 0) && (
                  <div className="text-center py-12 text-gray-400">
                    <Clock size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhum histórico registrado para este lead.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Adicionar uma anotação..."
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                  <button
                    onClick={handleAddNote}
                    className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {loadingNotes ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-emerald-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div key={note.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-emerald-600">{note.author_name || 'Sistema'}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(note.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{note.content}</p>
                      </div>
                    ))}
                    {notes.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Nenhuma anotação para este lead.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Nova tarefa..."
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                  <button
                    onClick={handleAddTask}
                    className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {loadingTasks ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-emerald-600" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leadTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border transition-all",
                          task.status === 'completed' ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-200 shadow-sm"
                        )}
                      >
                        <button
                          onClick={() => handleToggleTask(task.id, task.status)}
                          className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                            task.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-emerald-500"
                          )}
                        >
                          {task.status === 'completed' && <CheckSquare size={14} />}
                        </button>
                        <span className={cn(
                          "text-sm font-medium flex-1",
                          task.status === 'completed' ? "line-through text-gray-400" : "text-gray-700"
                        )}>
                          {task.title}
                        </span>
                        <div className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          task.priority === 'high' ? "bg-red-50 text-red-600" :
                          task.priority === 'medium' ? "bg-yellow-50 text-yellow-600" :
                          "bg-blue-50 text-blue-600"
                        )}>
                          {task.priority}
                        </div>
                      </div>
                    ))}
                    {leadTasks.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <CheckSquare size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Nenhuma tarefa pendente.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Fechar
              </button>
              <button className="px-8 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2">
                <Save size={18} />
                Salvar Alterações
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
