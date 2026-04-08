import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Trash2, Plus, Phone, Save, MessageSquare, CheckSquare, Loader2, ChevronDown, GraduationCap, Calendar, Clock, MapPin } from 'lucide-react';
import { Lead } from '../../types/leads';
import { useLeadStore } from '../../store/useLeadStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useProductStore } from '../../store/useProductStore';
import { useAuthStore } from '../../store/useAuthStore';
import { noteService, Note } from '../../services/noteService';
import { turmaService, Turma, TurmaAttendee, AttendanceStatus } from '../../services/turmaService';
import { resetLeadAlerts } from '../../services/alertService';
import { cn, parseBRNumber } from '../../lib/utils';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

type TabType = 'info' | 'history' | 'notes' | 'tasks' | 'turma';

const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, { label: string; color: string }> = {
  matriculado: { label: 'Matriculado', color: 'bg-blue-100 text-blue-700' },
  confirmado: { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-700' },
  indeciso: { label: 'Indeciso', color: 'bg-amber-100 text-amber-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-600' },
};

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ isOpen, onClose, lead }) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [leadTurmas, setLeadTurmas] = useState<{ turma: Turma; attendee: TurmaAttendee }[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [formData, setFormData] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    product: lead.product,
    value: lead.value.toString(),
    city: lead.city || '',
    cnpj: lead.cnpj || '',
    responsible: lead.responsible || '',
    stars: lead.stars || 0,
    isDiscountApplied: !!lead.discount,
    discountValue: lead.discount || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hoverStars, setHoverStars] = useState(0);

  const { updateLead, deleteLead } = useLeadStore();
  const { fetchTasksByLeadId, addTask, updateTaskStatus } = useTaskStore();
  const { products, fetchProducts } = useProductStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (isOpen && lead.id) {
      loadNotes();
      loadTasks();
      loadTurmas();
      fetchProducts();
      setFormData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        product: lead.product,
        value: lead.value.toString(),
        city: lead.city || '',
        cnpj: lead.cnpj || '',
        responsible: lead.responsible || '',
        stars: lead.stars || 0,
        isDiscountApplied: !!lead.discount,
        discountValue: lead.discount || '',
      });
    }
  }, [isOpen, lead.id]);

  const calculateFinalValue = () => {
    const val = parseBRNumber(formData.value);
    const discount = parseBRNumber(formData.discountValue);
    return val * (1 - discount / 100);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateLead(lead.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        product: formData.product,
        value: parseBRNumber(formData.value),
        stars: formData.stars,
        city: formData.city,
        cnpj: formData.cnpj,
        responsible: formData.responsible,
        discount: formData.isDiscountApplied ? formData.discountValue : '',
      });
      onClose();
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLead(lead.id);
      onClose();
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

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

  const loadTurmas = async () => {
    setLoadingTurmas(true);
    const result = await turmaService.getTurmasByLeadId(lead.id);
    setLeadTurmas(result);
    setLoadingTurmas(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const authorName = user?.user_metadata?.full_name || user?.email || 'Usuário';
    const note = await noteService.createNote({
      content: newNote,
      lead_id: lead.id,
      author_name: authorName,
    });
    if (note) {
      setNotes([note, ...notes]);
      setNewNote('');
      // Reset inactivity alert since contact was made
      resetLeadAlerts(lead.id);
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
    // Reset inactivity alert since contact was made
    resetLeadAlerts(lead.id);
  };

  const handleDeleteNote = async (noteId: string) => {
    const success = await noteService.deleteNote(noteId);
    if (success) {
      setNotes(notes.filter(n => n.id !== noteId));
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    await updateTaskStatus(taskId, newStatus);
    loadTasks();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div key="overlay" className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/20 backdrop-blur-[2px]">
        <motion.div
          key="modal"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col h-[95vh] mr-4 border border-white/20"
        >
          {/* Top Bar with Actions */}
          <div className="px-8 py-6 flex items-center justify-between bg-white border-b border-slate-50">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{lead.name}</h2>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={`star-${i}`}
                    onClick={() => setFormData({ ...formData, stars: i })}
                    onMouseEnter={() => setHoverStars(i)}
                    onMouseLeave={() => setHoverStars(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      size={18}
                      className={cn(
                        "transition-colors",
                        i <= (hoverStars || formData.stars)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-200"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 hover:bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 transition-colors flex items-center gap-2 text-sm font-bold shadow-sm disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar
              </button>
              <button
                onClick={handleDelete}
                className="p-2 hover:bg-red-50 border border-red-100 rounded-xl text-red-400 transition-colors shadow-sm"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-400 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Primary Tabs */}
          <div className="px-8 flex gap-6 border-b border-slate-100 bg-white overflow-x-auto">
            {[
              { id: 'info', label: 'Informações' },
              { id: 'notes', label: 'Notas' },
              { id: 'history', label: 'Histórico' },
              { id: 'tasks', label: 'Tarefas' },
              { id: 'turma', label: 'Turma' },
            ].map((tab) => (
              <button
                key={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "py-4 text-sm font-bold transition-colors relative whitespace-nowrap",
                  activeTab === tab.id ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTabTop" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            <AnimatePresence mode="wait">
              {activeTab === 'info' && (
                <motion.div
                  key="tab-info"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 space-y-6"
                >
                  {/* Profile Header Section */}
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                    <div className="relative">
                      <img
                        src={lead.photo}
                        alt={lead.name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-800">{lead.name}</h3>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={`header-star-${i}`}
                            size={16}
                            className={cn(i <= formData.stars ? "fill-yellow-400 text-yellow-400" : "text-slate-200")}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-4 pt-1">
                        <span className="text-xs font-medium text-slate-400">
                          CNPJ: {formData.cnpj || 'Não informado'}
                        </span>
                        <div className="flex flex-col items-end">
                          {formData.isDiscountApplied && (
                            <span className="text-[10px] font-bold text-slate-400 line-through">
                              R$ {parseBRNumber(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                          <span className="text-base font-bold text-emerald-600">
                            R$ {calculateFinalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome Completo</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium pr-10 shadow-sm"
                          />
                          <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produto / Serviço</label>
                        <div className="relative">
                          <select
                            value={formData.product}
                            onChange={(e) => {
                              const selectedProduct = products.find(p => p.name === e.target.value);
                              setFormData({
                                ...formData,
                                product: e.target.value,
                                value: selectedProduct ? selectedProduct.price.toString() : formData.value
                              });
                            }}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium appearance-none cursor-pointer shadow-sm"
                          >
                            <option value="">Selecione um produto</option>
                            {products.map(product => (
                              <option key={product.id} value={product.name}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor (R$)</label>
                        <input
                          type="text"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cidade</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium shadow-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CNPJ</label>
                        <input
                          type="text"
                          value={formData.cnpj}
                          onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsável</label>
                      <input
                        type="text"
                        value={formData.responsible}
                        onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium shadow-sm"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-3 cursor-pointer group w-fit">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={formData.isDiscountApplied}
                            onChange={(e) => setFormData({ ...formData, isDiscountApplied: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-5 h-5 border-2 border-slate-200 rounded-md bg-white peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition-all flex items-center justify-center">
                            <CheckSquare size={12} className={cn("text-white transition-opacity", formData.isDiscountApplied ? "opacity-100" : "opacity-0")} />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-700">Aplicar desconto?</span>
                      </label>

                      <AnimatePresence>
                        {formData.isDiscountApplied && (
                          <motion.div
                            key="discount-controls"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 space-y-3">
                              <div className="flex gap-4">
                                <div className="flex-1 relative">
                                  <input
                                    type="text"
                                    placeholder="0"
                                    value={formData.discountValue}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9.]/g, '');
                                      setFormData({ ...formData, discountValue: val });
                                    }}
                                    className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-emerald-700 font-bold text-sm text-right pr-8"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">%</span>
                                </div>
                                <div className="flex-[2] px-4 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Valor Final</span>
                                  <span className="text-sm font-bold text-emerald-600">
                                    R$ {calculateFinalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium px-1">
                                O desconto será aplicado sobre o valor bruto de R$ {parseBRNumber(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'notes' && (
                <motion.div
                  key="tab-notes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 space-y-6"
                >
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nova Nota</label>
                    <div className="relative">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Adicione uma observação sobre este lead..."
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm min-h-[100px] resize-none shadow-sm"
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
                      <div className="flex justify-center p-8"><Loader2 className="animate-spin text-emerald-600" /></div>
                    ) : notes.length > 0 ? (
                      notes.map((note) => {
                        const noteDate = new Date(note.created_at);
                        const dateStr = noteDate.toLocaleDateString('pt-BR');
                        const timeStr = noteDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={note.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative group">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                                    {dateStr} às {timeStr}
                                  </span>
                                </div>
                                {note.author_name && (
                                  <span className="text-[10px] font-semibold text-slate-500 px-1">
                                    por {note.author_name}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Nenhuma nota registrada.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div
                  key="tab-history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 space-y-4"
                >
                  {lead.history && lead.history.length > 0 ? (
                    lead.history.map((item) => (
                      <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 shadow-sm">
                        <div className="flex flex-col items-center gap-2 min-w-[80px]">
                          <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Calendar size={10} /> {item.date}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock size={10} /> {item.time}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-700 leading-relaxed font-medium">{item.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Sem histórico disponível.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'tasks' && (
                <motion.div
                  key="tab-tasks"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 space-y-6"
                >
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nova Tarefa</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="O que precisa ser feito?"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm shadow-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                      />
                      <button
                        onClick={handleAddTask}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {loadingTasks ? (
                      <div className="flex justify-center p-8"><Loader2 className="animate-spin text-emerald-600" /></div>
                    ) : leadTasks.length > 0 ? (
                      leadTasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                            task.status === 'completed'
                              ? "bg-slate-50 border-slate-100 opacity-60"
                              : "bg-white border-slate-100 hover:border-emerald-200 shadow-sm"
                          )}
                          onClick={() => handleToggleTask(task.id, task.status)}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            task.status === 'completed'
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-slate-200 group-hover:border-emerald-300"
                          )}>
                            {task.status === 'completed' && <CheckSquare size={14} className="text-white" />}
                          </div>
                          <span className={cn(
                            "text-sm font-medium flex-1",
                            task.status === 'completed' ? "line-through text-slate-400" : "text-slate-700"
                          )}>
                            {task.title}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                        <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Nenhuma tarefa pendente.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'turma' && (
                <motion.div
                  key="tab-turma"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 space-y-4"
                >
                  {loadingTurmas ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-emerald-600" /></div>
                  ) : leadTurmas.length > 0 ? (
                    leadTurmas.map(({ turma, attendee }) => {
                      const statusInfo = ATTENDANCE_STATUS_LABELS[attendee.status] ?? { label: attendee.status, color: 'bg-slate-100 text-slate-600' };
                      return (
                        <div key={turma.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-slate-800 text-base">{turma.name}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{turma.professor_name || 'Sem professor'}</p>
                            </div>
                            <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', statusInfo.color)}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className="text-emerald-500 shrink-0" />
                              {turma.date
                                ? new Date(turma.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
                                : 'Data não definida'}
                              <Clock size={12} className="text-emerald-500 ml-1 shrink-0" />
                              {turma.time || '--:--'}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin size={12} className="text-emerald-500 shrink-0" />
                              {turma.location || 'Sem localização'}
                            </div>
                          </div>
                          {attendee.vendas > 0 && (
                            <div className="pt-2 border-t border-slate-50">
                              <span className="text-xs font-bold text-emerald-700">
                                Vendas: R$ {attendee.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Este lead não está matriculado em nenhuma turma.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-6 border-t border-slate-100 bg-white flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
            <button
              onClick={handleDelete}
              className="p-3 hover:bg-red-50 rounded-2xl text-red-400 transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-red-100"
              title="Excluir Lead"
            >
              <Trash2 size={20} />
            </button>
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="px-8 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all border border-slate-100 shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-10 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
