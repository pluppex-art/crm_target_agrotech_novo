import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Clock, 
  AlertCircle,
  Info,
  ChevronRight,
  User,
  Settings as SystemIcon,
  Search,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotificationStore } from '../store/useNotificationStore';
import { cn, formatRelativeTime } from '../lib/utils';
import { openWhatsApp } from '../services/alertService';
import { useNavigate } from 'react-router-dom';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAll,
    fetchNotifications,
    subscribe: subscribeNotifs
  } = useNotificationStore();

  const [filter, setFilter] = useState<'all' | 'unread' | 'system' | 'user' | 'alerts'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNotifications();
    const unsub = subscribeNotifs();
    return unsub;
  }, []);

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'unread' ? !n.read :
      filter === 'alerts' ? n.category === 'alerts' :
      filter === 'system' ? n.category === 'system' :
      n.category === 'user';
    
    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesFilter && matchesSearch;
  });

  const getIcon = (type: string, category: string) => {
    if (category === 'system') return <SystemIcon className="w-5 h-5" />;
    if (type === 'urgent') return <AlertCircle className="w-5 h-5" />;
    if (type === 'info') return <Info className="w-5 h-5" />;
    return <User className="w-5 h-5" />;
  };

  const getColors = (type: string, category: string, read: boolean) => {
    if (category === 'system') return 'bg-blue-50 text-blue-600 border-blue-100';
    if (type === 'urgent') return 'bg-red-50 text-red-600 border-red-100';
    if (type === 'pending') return 'bg-amber-50 text-amber-600 border-amber-100';
    if (type === 'success') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                <Bell className="w-6 h-6 text-emerald-600" />
              </div>
              Central de Notificações
            </h1>
            <p className="text-slate-500 mt-1">Gerencie alertas, avisos e configurações operacionais.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Marcar todas como lidas</span>
            </button>
            <button 
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar tudo</span>
            </button>
          </div>
        </div>

        {/* Categories / Tabs */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl flex-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Tudo', icon: <Bell className="w-4 h-4" /> },
              { id: 'unread', label: 'Não Lidas', icon: <Clock className="w-4 h-4" /> },
              { id: 'alerts', label: 'Alertas', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
              { id: 'user', label: 'Usuários', icon: <User className="w-4 h-4" /> },
              { id: 'system', label: 'Sistema', icon: <SystemIcon className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap",
                  filter === tab.id ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="relative flex-[0.5]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar notificações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key="notifications-list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    layout
                    className={cn(
                      "group relative bg-white rounded-2xl p-4 sm:p-5 border transition-all hover:shadow-md",
                      notification.read ? "border-slate-100 opacity-80" : "border-emerald-100 shadow-emerald-50/50"
                    )}
                  >
                    <div className="flex gap-4 sm:gap-6">
                      {!notification.read && (
                        <div className="absolute top-0 right-0 p-2">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm animate-pulse" />
                        </div>
                      )}

                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                        getColors(notification.type, notification.category, notification.read)
                      )}>
                        {getIcon(notification.type, notification.category)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className={cn(
                              "font-bold text-slate-800",
                              !notification.read && "text-lg"
                            )}>
                              {notification.title}
                            </h3>
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                              notification.category === 'system' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                            )}>
                              {notification.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" />
                            {formatRelativeTime(notification.created_at)}
                          </div>
                        </div>
                        
                        <p className="text-slate-600 text-sm leading-relaxed mb-4">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-3">
                          {!notification.read && (
                            <button 
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
                            >
                              Marcar como lida
                            </button>
                          )}
                          <button 
                            onClick={() => removeNotification(notification.id)}
                            className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors"
                          >
                            Remover
                          </button>
                          
                          {notification.link && (
                            <button 
                              onClick={() => navigate(notification.link || '/pipeline')}
                              className="ml-auto flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-4 transition-colors"
                            >
                              {notification.category === 'alerts' ? 'Ver Lead' : 'Ver detalhes'}
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                          {notification.category === 'alerts' && notification.meta && (
                            <>
                              <button 
                                onClick={() => {
                                  try {
                                    const meta = JSON.parse(notification.meta || '{}');
                                    openWhatsApp(meta.phone || '', `Contato urgente: ${notification.title}`);
                                  } catch {}
                                }}
                                className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1"
                                title="WhatsApp"
                              >
                                📱 WhatsApp
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <Bell className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Tudo limpo por aqui!</h3>
                  <p className="text-slate-500 max-w-xs mx-auto mt-2">
                    Sem notificações neste filtro.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

