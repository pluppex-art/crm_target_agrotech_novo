import React, { useState, useEffect } from 'react';
import { Tag, Plus, Save, X, Trash2, Edit2, Loader2, ShieldAlert } from 'lucide-react';
import { useCargoStore } from '../../store/useCargoStore';
import { CreateCargoPayload, Cargo } from '../../services/cargosService';
import { PERMISSIONS } from '../../types/permissions';
import { usePermissions } from '../../hooks/usePermissions';

export function ManageCargos() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { cargos, loading, fetchCargos, addCargo, updateCargo, deleteCargo, subscribe } = useCargoStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCargoPayload>({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchCargos();
    const unsubscribe = subscribe();
    return () => unsubscribe();
  }, [fetchCargos, subscribe]);

  if (permissionsLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 text-lg">Carregando permissões...</p>
      </div>
    );
  }

  if (!hasPermission('settings.manage')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="w-24 h-24 bg-orange-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg border-4 border-orange-300">
          <ShieldAlert className="w-12 h-12 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Configurações Restritas</h2>
        <p className="text-slate-500 max-w-md mb-6 leading-relaxed">Você precisa da permissão <code className="bg-orange-100 px-2 py-1 rounded-lg text-sm font-mono text-orange-800 font-bold">settings.manage</code> para gerenciar cargos.</p>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Contate o administrador</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateCargo(editingId, formData);
      } else {
        await addCargo(formData);
      }
      handleCloseModal();
    } catch (err: any) {
      const msg = err?.message || err?.details || 'Erro ao salvar cargo.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cargo: Cargo) => {
    setEditingId(cargo.id);
    setFormData({
      name: cargo.name,
      description: cargo.description || '',
      permissions: cargo.permissions || [],
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gerenciar Cargos</h1>
          <p className="text-sm text-slate-500">Crie e gerencie cargos/perfis de acesso da equipe.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold"
        >
          <Plus size={20} />
          <span className="whitespace-nowrap">Novo Cargo</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Carregando cargos...</p>
                  </td>
                </tr>
              ) : cargos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                    Nenhum cargo cadastrado. Crie o primeiro!
                  </td>
                </tr>
              ) : (
                cargos.map((cargo) => (
                  <tr key={cargo.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                        {cargo.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-md">
                      {cargo.description || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(cargo)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm('Confirmar exclusão do cargo?')) {
                              await deleteCargo(cargo.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Cargo' : 'Novo Cargo'}</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Cargo *</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
                  placeholder="Ex: Consultor"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 resize-vertical"
                  placeholder="Descrição opcional do cargo..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Permissões</label>
                <p className="text-xs text-slate-400 mb-3">Selecione as permissões deste cargo</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {PERMISSIONS.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg cursor-pointer group">
                      <input
                        type="checkbox"
checked={formData.permissions?.includes(permission) || false}
                        onChange={(e) => {
const newPermissions = e.target.checked
                            ? [...(formData.permissions || []), permission]
                            : (formData.permissions || []).filter(p => p !== permission);
                          setFormData({ ...formData, permissions: newPermissions });
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                        <span className="text-xs font-medium text-slate-700 group-hover:text-emerald-600">
                        {permission.replace('dashboard.view', 'Visualizar Dashboard')
                          .replace('leads.view', 'Visualizar Leads')
                          .replace('leads.create', 'Criar Leads')
                          .replace('leads.edit', 'Editar Leads')
                          .replace('leads.delete', 'Excluir Leads')
                          .replace('leads.export', 'Exportar Leads')
                          .replace('pipeline.view', 'Visualizar Pipeline')
                          .replace('pipeline.edit', 'Editar Pipeline')
                          .replace('pipeline.delete', 'Excluir Pipeline')
                          .replace('finance.view', 'Visualizar Financeiro')
                          .replace('finance.create', 'Criar Financeiro')
                          .replace('finance.edit', 'Editar Financeiro')
                          .replace('products.view', 'Visualizar Produtos')
                          .replace('products.create', 'Criar Produtos')
                          .replace('products.edit', 'Editar Produtos')
                          .replace('products.delete', 'Excluir Produtos')
                          .replace('tasks.view', 'Visualizar Tarefas')
                          .replace('tasks.create', 'Criar Tarefas')
                          .replace('tasks.edit', 'Editar Tarefas')
                          .replace('tasks.delete', 'Excluir Tarefas')
                          .replace('notes.create', 'Criar Anotações')
                          .replace('notes.view', 'Visualizar Anotações')
                          .replace('users.view', 'Visualizar Usuários')
                          .replace('users.manage', 'Gerenciar Usuários')
                          .replace('settings.view', 'Visualizar Configurações')
                          .replace('settings.manage', 'Gerenciar Configurações')
                          .replace('marketing.view', 'Visualizar Marketing')
                          .replace('marketing.create', 'Criar Marketing')
                          .replace('marketing.manage', 'Gerenciar Marketing')}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
{(formData.permissions || []).length}
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {editingId ? 'Salvar Alterações' : 'Criar Cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

