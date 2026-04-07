import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Bell, 
  HelpCircle,
  Settings,
  User,
  CheckSquare,
  FileText,
  Package,
  Megaphone,
  GraduationCap,
  X,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { useLeadStore } from '../../store/useLeadStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useContractStore } from '../../store/useContractStore';
import { useProductStore } from '../../store/useProductStore';
import { useMarketingStore } from '../../store/useMarketingStore';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';
import { LogOut } from 'lucide-react';

type SearchResult = {
  id: string;
  type: 'Lead' | 'Tarefa' | 'Contrato' | 'Produto' | 'Campanha';
  title: string;
  subtitle?: string;
  link: string;
  icon: any;
};

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const notifications = [
    { id: 1, title: 'Lead Urgente', message: 'João Silva solicitou contato imediato.', time: '5 min atrás', type: 'urgent' },
    { id: 2, title: 'Tarefa Pendente', message: 'Contrato da Fazenda Boa Vista vence hoje.', time: '1 hora atrás', type: 'pending' },
    { id: 3, title: 'Nova Proposta', message: 'Proposta enviada para Maria Oliveira.', time: '2 horas atrás', type: 'info' },
  ];

  const { leads, fetchLeads } = useLeadStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { contracts, fetchContracts } = useContractStore();
  const { products, fetchProducts } = useProductStore();
  const { campaigns, fetchCampaigns } = useMarketingStore();

  useEffect(() => {
    fetchLeads();
    fetchTasks();
    fetchContracts();
    fetchProducts();
    fetchCampaigns();
  }, [fetchLeads, fetchTasks, fetchContracts, fetchProducts, fetchCampaigns]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results: SearchResult[] = [];

  if (query.length >= 2) {
    const q = query.toLowerCase();

    // Leads
    leads.filter(l => 
      l.name.toLowerCase().includes(q) || 
      l.email.toLowerCase().includes(q) || 
      l.product.toLowerCase().includes(q)
    ).slice(0, 5).forEach(l => results.push({
      id: l.id,
      type: 'Lead',
      title: l.name,
      subtitle: l.product,
      link: '/pipeline',
      icon: User
    }));

    // Tasks
    tasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q)
    ).slice(0, 5).forEach(t => results.push({
      id: t.id,
      type: 'Tarefa',
      title: t.title,
      subtitle: t.status === 'completed' ? 'Concluída' : 'Pendente',
      link: '/tasks',
      icon: CheckSquare
    }));

    // Contracts
    contracts.filter(c => 
      c.title.toLowerCase().includes(q)
    ).slice(0, 5).forEach(c => results.push({
      id: c.id,
      type: 'Contrato',
      title: c.title,
      subtitle: `R$ ${c.value.toLocaleString('pt-BR')}`,
      link: '/contracts',
      icon: FileText
    }));

    // Products
    products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q)
    ).slice(0, 5).forEach(p => results.push({
      id: p.id,
      type: 'Produto',
      title: p.name,
      subtitle: p.category,
      link: '/products',
      icon: Package
    }));

    // Campaigns
    campaigns.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.platform.toLowerCase().includes(q)
    ).slice(0, 5).forEach(c => results.push({
      id: c.id,
      type: 'Campanha',
      title: c.name,
      subtitle: c.platform,
      link: '/marketing',
      icon: Megaphone
    }));
  }

  const handleSelect = (link: string) => {
    navigate(link);
    setQuery('');
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <ChevronDown className="w-5 h-5 -rotate-90" />
        </button>
        <div className="relative w-full max-w-[150px] sm:max-w-96" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar leads, tarefas, contratos..." 
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-10 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400"
            >
              <X size={14} />
            </button>
          )}

          {/* Search Dropdown */}
          {isOpen && query.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[400px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              {results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}-${index}`}
                      onClick={() => handleSelect(result.link)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
                    >
                      <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                        <result.icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-800 truncate">{result.title}</p>
                          <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {result.type}
                          </span>
                        </div>
                        {result.subtitle && (
                          <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Nenhum resultado encontrado para "{query}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={cn(
              "p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors relative",
              isNotificationsOpen && "bg-emerald-50 text-emerald-600"
            )}
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {isNotificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 text-sm">Notificações</h3>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase">
                    {notifications.length} Novas
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      className="w-full p-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group"
                    >
                      <div className="flex gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5 shrink-0",
                          notif.type === 'urgent' ? "bg-red-500" : 
                          notif.type === 'pending' ? "bg-amber-500" : "bg-blue-500"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 mb-0.5 group-hover:text-emerald-600 transition-colors">
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-relaxed mb-1.5">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {notif.time}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => {
                    navigate('/settings/notifications');
                    setIsNotificationsOpen(false);
                  }}
                  className="w-full py-3 text-center text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors border-t border-slate-100"
                >
                  Ver todas as notificações
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={() => setIsHelpOpen(true)}
          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
          title="Ajuda"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        <button 
          onClick={() => navigate('/settings')}
          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
          title="Configurações"
        >
          <Settings className="w-5 h-5" />
        </button>
        <div className="h-8 w-px bg-slate-200 mx-2" />
        
        <div className="relative" ref={userMenuRef}>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 hover:bg-slate-50 p-1 rounded-xl transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{user?.email?.split('@')[0] || 'Usuário'}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Administrador</p>
            </div>
            <div className="relative">
              <img 
                src={`https://i.pravatar.cc/150?u=${user?.id}`} 
                alt="User" 
                className="w-9 h-9 rounded-full border-2 border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isUserMenuOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Logado como</p>
                  <p className="text-sm font-bold text-slate-800 truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button 
                    onClick={() => {
                      navigate('/settings/profile');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <User size={16} />
                    Meu Perfil
                  </button>
                  <button 
                    onClick={() => {
                      navigate('/settings');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <Settings size={16} />
                    Configurações
                  </button>
                </div>
                <div className="p-2 border-t border-slate-50">
                  <button 
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut size={16} />
                    Sair do Sistema
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {isHelpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <HelpCircle className="text-emerald-600" />
                  Central de Ajuda
                </h2>
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-sm text-emerald-800 font-medium mb-1">Precisa de suporte técnico?</p>
                  <p className="text-xs text-emerald-600">Nossa equipe está disponível de segunda a sexta, das 08h às 18h.</p>
                </div>

                <div className="space-y-2">
                  <button className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <FileText size={18} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">Documentação do Sistema</span>
                    </div>
                    <ChevronDown size={16} className="text-slate-400 -rotate-90" />
                  </button>

                  <button className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <Megaphone size={18} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">Novidades e Atualizações</span>
                    </div>
                    <ChevronDown size={16} className="text-slate-400 -rotate-90" />
                  </button>

                  <button className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                        <User size={18} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">Falar com um Consultor</span>
                    </div>
                    <ChevronDown size={16} className="text-slate-400 -rotate-90" />
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-widest">
                    Target Agrotech CRM v1.0.4
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
