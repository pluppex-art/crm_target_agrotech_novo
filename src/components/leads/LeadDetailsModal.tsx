import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Edit2, Trash2, Plus, Phone, Mail, MapPin, Tag, User, Calendar, Clock, Save, MessageSquare, CheckSquare, Loader2, ChevronDown } from 'lucide-react';
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
  const [formData, setFormData] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    product: lead.product,
    value: lead.value.toString(),
    city: lead.city || '',
    cnpj: lead.cnpj || '',
    responsible: lead.responsible || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const { setSelectedLead, updateLeadSubStatus, updateLead, deleteLead } = useLeadStore();
  const { fetchTasksByLeadId, addTask, updateTaskStatus } = useTaskStore();
  const { products, fetchProducts } = useProductStore();

  useEffect(() => {
    if (isOpen && lead.id) {
      loadNotes();
      loadTasks();
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
      });
    }
  }, [isOpen, lead.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateLead(lead.id, {
        ...formData,
        value: parseFloat(formData.value) || 0,
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
      <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/20 backdrop-blur-[2px]">
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col h-[95vh] mr-4"
        >
          {/* Top Bar with Actions */}
          <div className="px-8 py-6 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{lead.name}</h2>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={cn(
                      i < lead.stars ? "fill-yellow-400 text-yellow-400" : "text-slate-200"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 hover:bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 transition-colors flex items-center gap-2 text-sm font-bold shadow-sm">
                <Edit2 size={16} />
                Editar
              </button>
              <button 
                onClick={handleDelete}
                className="p-2 hover:bg-red-50 border border-red-100 rounded-xl text-red-400 transition-colors shadow-sm"
              >
                <Trash2 size={18} />
              </button>
              <button className="p-2 hover:bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 transition-colors shadow-sm">
                <Plus size={18} />
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
          <div className="px-8 flex gap-8 border-b border-slate-100">
            {[
              { id: 'info', label: 'Informações' },
              { id: 'history', label: 'Histórico' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "py-4 text-sm font-bold transition-colors relative",
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
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'info' && (
              <div className="p-8 space-y-8">
                {/* Profile Header Section */}
                <div className="flex items-center gap-6 pb-8 border-b border-slate-50">
                  <div className="relative">
                    <img 
                      src={lead.photo} 
                      alt={lead.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-slate-800">{lead.name}</h3>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} className={cn(i < lead.stars ? "fill-yellow-400 text-yellow-400" : "text-slate-200")} />
                      ))}
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <span className="text-sm font-medium text-slate-400">
                        CNPJ.: {lead.cnpj || '111.222.333-44'}
                      </span>
                      <div className="flex items-center gap-2">
                        <Edit2 size={14} className="text-slate-300" />
                        <span className="text-lg font-bold text-emerald-600">
                          R${lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary Tabs (as per image) */}
                <div className="flex gap-8 border-b border-slate-100">
                  <button className="py-2 text-sm font-bold text-emerald-600 border-b-2 border-emerald-600">Informações</button>
                  <button className="py-2 text-sm font-bold text-slate-400">Histórico</button>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">Nome Completo</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-600 font-medium"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-700">Telefone</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-600 font-medium pr-10"
                        />
                        <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-700">E-mail</label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-600 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-700">Produto/Serviço</label>
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
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-600 font-medium appearance-none cursor-pointer"
                        >
                          <option value="">Selecione um produto</option>
                          {products.map(product => (
                            <option key={product.id} value={product.name}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-700">Valor</label>
                      <input 
                        type="text" 
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-600 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-700">Cidade e Leg</label>
                      <input 
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-600 font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-700">CNPJ</label>
                      <input 
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-600 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">Responsável</label>
                    <input 
                      type="text"
                      value={formData.responsible}
                      onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-600 font-medium"
                    />
                  </div>
                </div>

                {/* Notes/History List */}
                <div className="space-y-3 pt-4">
                  {lead.history && lead.history.length > 0 ? (
                    lead.history.slice(0, 3).map((item, index) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "rounded-xl p-4 border flex items-center justify-between",
                          index % 2 === 0 ? "bg-amber-50/50 border-amber-100" : "bg-slate-50/50 border-slate-100"
                        )}
                      >
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                          <span>ID:{item.id}</span>
                          <span>Data: {item.date}</span>
                          <span>Hora: {item.time}</span>
                        </div>
                        <div className="flex items-center gap-4 flex-1 ml-4">
                          <p className="text-sm font-medium text-slate-700 flex-1">{item.description}</p>
                          {index === 0 && (
                            <button className="text-emerald-600 font-bold text-sm hover:underline shrink-0">Salvar</button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhuma nota ou histórico registrado.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="p-8">
                {/* Reusing the same history logic but styled like the image */}
                <div className="space-y-4">
                  {lead.history?.map((item) => (
                    <div key={item.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex gap-4">
                      <div className="flex flex-col items-center gap-1 min-w-[100px]">
                        <span className="text-xs font-bold text-slate-400 uppercase">ID:{item.id}</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          <Calendar size={10} />
                          {item.date}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          <Clock size={10} />
                          {item.time}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-6 border-t border-slate-100 bg-white flex items-center justify-between">
            <button 
              onClick={handleDelete}
              className="p-2 hover:bg-red-50 rounded-xl text-red-400 transition-colors"
            >
              <Trash2 size={20} />
            </button>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-8 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100 shadow-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-10 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
