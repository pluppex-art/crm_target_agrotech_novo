import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Edit2, Trash2, Plus, Phone, Calendar, Clock, Loader2, ChevronDown, Percent, FileText, History, CheckSquare, Trash } from 'lucide-react';
import { Lead, LeadSubStatus } from '../../types/leads';
import { useLeadStore } from '../../store/useLeadStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useProductStore } from '../../store/useProductStore';
import { noteService, Note } from '../../services/noteService';
import { cn } from '../../lib/utils';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  isPanel?: boolean;
}

type TabType = 'info' | 'notes' | 'history' | 'tasks';

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'info',    label: 'Informações', icon: <FileText size={14} /> },
  { id: 'notes',   label: 'Notas',       icon: <FileText size={14} /> },
  { id: 'history', label: 'Histórico',   icon: <History size={14} /> },
  { id: 'tasks',   label: 'Tarefas',     icon: <CheckSquare size={14} /> },
];

const inputClass = 'flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 text-sm font-medium';

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ isOpen, onClose, lead, isPanel }) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [hoverStar, setHoverStar] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [discountEnabled, setDiscountEnabled] = useState(!!lead.discount);
  const [documentType, setDocumentType] = useState<'cnpj' | 'cpf'>(lead.cpf ? 'cpf' : 'cnpj');
  const [formData, setFormData] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    product: lead.product,
    value: lead.value.toString(),
    city: lead.city || '',
    cnpj: lead.cnpj || lead.cpf || '',
    responsible: lead.responsible || '',
    discount: lead.discount || '',
  });

  // Get live lead from store so stars and other fields update reactively
  const liveLead = useLeadStore(state => state.leads.find(l => l.id === lead.id) ?? lead);
  const { updateLead, deleteLead } = useLeadStore();
  const { fetchTasksByLeadId, addTask, updateTaskStatus } = useTaskStore();
  const { products, fetchProducts } = useProductStore();

  useEffect(() => {
    if (isOpen && lead.id) {
      loadNotes();
      loadTasks();
      fetchProducts();
      setDocumentType(lead.cpf ? 'cpf' : 'cnpj');
      setFormData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        product: lead.product,
        value: lead.value.toString(),
        city: lead.city || '',
        cnpj: lead.cnpj || lead.cpf || '',
        responsible: lead.responsible || '',
        discount: lead.discount || '',
      });
      setDiscountEnabled(!!lead.discount);
      setActiveTab('info');
    }
  }, [isOpen, lead.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateLead(lead.id, {
        ...formData,
        value: parseFloat(formData.value) || 0,
        discount: discountEnabled ? formData.discount : '',
        cnpj: documentType === 'cnpj' ? formData.cnpj : '',
        cpf: documentType === 'cpf' ? formData.cnpj : '',
      });
      onClose();
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      await deleteLead(lead.id);
      onClose();
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const handleStarClick = async (stars: number) => {
    await updateLead(lead.id, { stars });
  };

  const loadNotes = async () => {
    setLoadingNotes(true);
    const fetched = await noteService.getNotesByLeadId(lead.id);
    setNotes(fetched);
    setLoadingNotes(false);
  };

  const loadTasks = async () => {
    setLoadingTasks(true);
    const fetched = await fetchTasksByLeadId(lead.id);
    setLeadTasks(fetched);
    setLoadingTasks(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const note = await noteService.createNote({ content: newNote, lead_id: lead.id, author_name: 'Usuário' });
    if (note) { setNotes([note, ...notes]); setNewNote(''); }
  };

  const handleDeleteNote = async (noteId: string) => {
    const ok = await noteService.deleteNote(noteId);
    if (ok) setNotes(notes.filter(n => n.id !== noteId));
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await addTask({ title: newTaskTitle, lead_id: lead.id, status: 'pending', priority: 'medium' });
    setNewTaskTitle('');
    loadTasks();
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    await updateTaskStatus(taskId, currentStatus === 'pending' ? 'completed' : 'pending');
    loadTasks();
  };

  const currentStars = hoverStar ?? liveLead.stars;

  if (!isOpen) return null;

  const content = (
    <motion.div
      initial={isPanel ? { opacity: 0, x: 20 } : { opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={isPanel ? { opacity: 0, x: 20 } : { opacity: 0, x: 100 }}
      className={cn(
        "bg-white flex flex-col overflow-hidden shadow-2xl transition-all",
        isPanel 
          ? "w-full h-full border-none rounded-none" 
          : "rounded-[32px] w-full max-w-xl h-[95vh] mr-4"
      )}
    >
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <img
            src={liveLead.photo}
            alt={liveLead.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-slate-100"
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">{liveLead.name}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs font-bold text-emerald-600">
                R$ {liveLead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {(liveLead.cnpj || liveLead.cpf) && (
                <span className="text-[10px] font-semibold text-slate-400">
                  {liveLead.cnpj ? `CNPJ: ${liveLead.cnpj}` : `CPF: ${liveLead.cpf}`}
                </span>
              )}
            </div>
            {/* Stars */}
            <div className="flex gap-0.5 mt-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={cn(
                    'cursor-pointer transition-colors',
                    i < currentStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200 hover:text-yellow-300'
                  )}
                  onClick={() => handleStarClick(i + 1)}
                  onMouseEnter={() => setHoverStar(i + 1)}
                  onMouseLeave={() => setHoverStar(null)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isPanel && (
            <button className="px-3 py-1.5 hover:bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm">
              <Edit2 size={13} />
              Editar
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-50 border border-red-100 rounded-xl text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
          <button className="p-2 hover:bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 transition-colors">
            <Plus size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 flex gap-6 border-b border-slate-100 bg-white">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 py-3.5 text-xs font-bold transition-colors relative',
              activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* === INFORMAÇÕES === */}
        {activeTab === 'info' && (
          <div className="p-6 space-y-4">
            {/* Grid 2 colunas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nome Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Telefone</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className={cn(inputClass, 'pr-9 w-full')}
                  />
                  <Phone size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Produto / Serviço</label>
                <div className="relative">
                  <select
                    value={formData.product}
                    onChange={e => {
                      const sel = products.find(p => p.name === e.target.value);
                      setFormData({ ...formData, product: e.target.value, value: sel ? sel.price.toString() : formData.value });
                    }}
                    className={cn(inputClass, 'appearance-none cursor-pointer w-full')}
                  >
                    <option value="">Selecione um produto</option>
                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Valor (R$)</label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={e => setFormData({ ...formData, value: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cidade</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {documentType === 'cnpj' ? 'CNPJ' : 'CPF'}
                  </label>
                  <div className="flex text-[10px] font-bold rounded-lg overflow-hidden border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDocumentType('cpf')}
                      className={cn('px-2 py-0.5 transition-colors', documentType === 'cpf' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-50')}
                    >CPF</button>
                    <button
                      type="button"
                      onClick={() => setDocumentType('cnpj')}
                      className={cn('px-2 py-0.5 transition-colors', documentType === 'cnpj' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-50')}
                    >CNPJ</button>
                  </div>
                </div>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder={documentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Responsável</label>
                <input
                  type="text"
                  value={formData.responsible}
                  onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Desconto */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer w-fit">
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  discountEnabled ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'
                )}
                  onClick={() => { setDiscountEnabled(!discountEnabled); if (discountEnabled) setFormData({ ...formData, discount: '' }); }}
                >
                  {discountEnabled && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-sm font-semibold text-slate-700">Aplicar desconto?</span>
              </label>

              <AnimatePresence>
                {discountEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4">
                      <Percent size={20} className="text-emerald-600 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-emerald-700 mb-2">Percentual de desconto</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={formData.discount}
                            onChange={e => setFormData({ ...formData, discount: e.target.value })}
                            className="w-24 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-center font-bold text-slate-700 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          />
                          <span className="text-sm font-bold text-emerald-700">%</span>
                          {formData.discount && parseFloat(formData.value) > 0 && (
                            <span className="text-xs text-slate-500 ml-2">
                              = <strong className="text-emerald-700">
                                R$ {(parseFloat(formData.value) * (1 - parseFloat(formData.discount) / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </strong> c/ desconto
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* === NOTAS === */}
        {activeTab === 'notes' && (
          <div className="p-8 flex flex-col gap-4 h-full">
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Escreva uma nota..."
                rows={3}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 resize-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors self-end"
              >
                <Plus size={16} />
              </button>
            </div>
            {loadingNotes ? (
              <div className="flex justify-center pt-8"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
            ) : notes.length === 0 ? (
              <p className="text-center text-sm text-slate-400 pt-8">Nenhuma nota ainda.</p>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <div key={note.id} className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 flex gap-3">
                    <p className="flex-1 text-sm text-slate-700 leading-relaxed">{note.content}</p>
                    <button onClick={() => handleDeleteNote(note.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === HISTÓRICO === */}
        {activeTab === 'history' && (
          <div className="p-8">
            {!lead.history || lead.history.length === 0 ? (
              <p className="text-center text-sm text-slate-400 pt-8">Nenhum histórico registrado.</p>
            ) : (
              <div className="space-y-3">
                {lead.history.map(item => (
                  <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-4">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Calendar size={9} /> {item.date}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Clock size={9} /> {item.time}
                      </div>
                    </div>
                    <p className="flex-1 text-sm text-slate-700 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === TAREFAS === */}
        {activeTab === 'tasks' && (
          <div className="p-8 flex flex-col gap-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); }}
                placeholder="Nova tarefa..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            {loadingTasks ? (
              <div className="flex justify-center pt-8"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
            ) : leadTasks.length === 0 ? (
              <p className="text-center text-sm text-slate-400 pt-8">Nenhuma tarefa ainda.</p>
            ) : (
              <div className="space-y-2">
                {leadTasks.map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id, task.status)}
                    className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:border-emerald-200 transition-colors"
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      task.status === 'completed' ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                    )}>
                      {task.status === 'completed' && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={cn('text-sm', task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700')}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
        <button
          onClick={onClose}
          className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving && <Loader2 size={15} className="animate-spin" />}
          Salvar Alterações
        </button>
      </div>
    </motion.div>
  );

  if (isPanel) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/20 backdrop-blur-[2px]">
      {content}
    </div>
  );
};
