import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  Plus, 
  ChevronDown, 
  MoreHorizontal, 
  Star, 
  Eye, 
  ArrowRight,
  Download,
  TrendingUp,
  Clock,
  Grid,
  CheckCircle2,
  Share2,
  DollarSign,
  TrendingDown,
  Loader2,
  Plane
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useLeadStore } from '../store/useLeadStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { LeadStatus } from '../types/leads';

export function Dashboard() {
  const [activeView, setActiveView] = useState<'all' | 'sales' | 'finance'>('all');
  const { leads, fetchLeads, isLoading: leadsLoading } = useLeadStore();
  const { transactions, fetchTransactions, isLoading: financeLoading } = useFinanceStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeads();
    fetchTransactions();
  }, [fetchLeads, fetchTransactions]);

  const isLoading = leadsLoading || financeLoading;

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const netProfit = totalIncome - totalExpense;
  const averageTicket = leads.filter(l => l.status === 'closed').length > 0
    ? leads.filter(l => l.status === 'closed').reduce((acc, l) => acc + l.value, 0) / leads.filter(l => l.status === 'closed').length
    : 0;

  const conversionRate = leads.length > 0 
    ? (leads.filter(l => l.status === 'closed').length / leads.length) * 100 
    : 0;

  const totalIncomeTransactions = transactions.filter(t => t.type === 'income');
  const averageIncome = totalIncomeTransactions.length > 0
    ? totalIncome / totalIncomeTransactions.length
    : 0;

  const incomeByCategory = transactions
    .filter(t => t.type === 'income')
    .reduce((acc: any[], t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category, value: t.amount });
      }
      return acc;
    }, []);

  const salesByResponsible = leads.reduce((acc: any[], l) => {
    if (!l.responsible) return acc;
    const existing = acc.find(item => item.name === l.responsible);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: l.responsible, value: 1 });
    }
    return acc;
  }, []);

  const columns: { id: LeadStatus; title: string; color: string; border: string; total: number; count: number }[] = [
    { 
      id: 'new', 
      title: 'Em aberto', 
      color: 'bg-blue-50 text-blue-600', 
      border: 'border-blue-200', 
      count: leads.filter(l => l.status === 'new').length,
      total: leads.filter(l => l.status === 'new').reduce((acc, l) => acc + l.value, 0)
    },
    { 
      id: 'qualified', 
      title: 'Qualificação', 
      color: 'bg-green-50 text-green-600', 
      border: 'border-green-200', 
      count: leads.filter(l => l.status === 'qualified').length,
      total: leads.filter(l => l.status === 'qualified').reduce((acc, l) => acc + l.value, 0)
    },
    { 
      id: 'proposal', 
      title: 'Proposta', 
      color: 'bg-purple-50 text-purple-600', 
      border: 'border-purple-200', 
      count: leads.filter(l => l.status === 'proposal').length,
      total: leads.filter(l => l.status === 'proposal').reduce((acc, l) => acc + l.value, 0)
    },
    { 
      id: 'closed', 
      title: 'Fechado', 
      color: 'bg-red-50 text-red-600', 
      border: 'border-red-200', 
      count: leads.filter(l => l.status === 'closed').length,
      total: leads.filter(l => l.status === 'closed').reduce((acc, l) => acc + l.value, 0)
    },
  ];

  const pieData = [
    { name: 'Aberto', value: leads.filter(l => l.status === 'new').length, color: '#3b82f6' },
    { name: 'Qualificação', value: leads.filter(l => l.status === 'qualified').length, color: '#10b981' },
    { name: 'Proposta', value: leads.filter(l => l.status === 'proposal').length, color: '#a855f7' },
    { name: 'Fechado', value: leads.filter(l => l.status === 'closed').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Group transactions by month for the chart
  const last5Months = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (4 - i));
    return d.toLocaleString('pt-BR', { month: 'short' });
  });

  const chartData = last5Months.map((month, index) => {
    const monthIndex = new Date().getMonth() - (4 - index);
    const year = new Date().getFullYear();
    
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === monthIndex && tDate.getFullYear() === year;
    });

    const monthLeads = leads.filter(l => {
      const lDate = new Date(l.created_at);
      return lDate.getMonth() === monthIndex && lDate.getFullYear() === year;
    });

    return {
      name: month,
      income: monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
      expense: monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Math.abs(t.amount), 0),
      leads: monthLeads.length
    };
  });

  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any[], t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += Math.abs(t.amount);
      } else {
        acc.push({ name: t.category, value: Math.abs(t.amount) });
      }
      return acc;
    }, []);

  const salesByProduct = leads
    .filter(l => l.status === 'closed')
    .reduce((acc: any[], l) => {
      const existing = acc.find(item => item.name === l.product);
      if (existing) {
        existing.value += l.value;
      } else {
        acc.push({ name: l.product, value: l.value });
      }
      return acc;
    }, []);

  const COLORS = ['#3b82f6', '#10b981', '#a855f7', '#ef4444', '#f59e0b', '#6366f1'];

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {activeView === 'all' ? 'Dashboard Geral' : activeView === 'sales' ? 'Dashboard de Vendas' : 'Dashboard Financeiro'}
            </h1>
            <p className="text-sm text-slate-500">
              {activeView === 'all' ? 'Visão consolidada de Vendas e Financeiro.' : 
               activeView === 'sales' ? 'Métricas de performance comercial e pipeline.' : 
               'Acompanhamento de fluxo de caixa e transações.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setActiveView('all')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  activeView === 'all' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Tudo
              </button>
              <button
                onClick={() => setActiveView('sales')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  activeView === 'sales' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Vendas
              </button>
              <button
                onClick={() => setActiveView('finance')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  activeView === 'finance' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Financeiro
              </button>
            </div>
            {isLoading && <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />}
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium hover:bg-slate-50 transition-all">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {activeView === 'sales' ? (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">Leads</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Total de Leads</p>
                <h2 className="text-2xl font-bold text-slate-800">{leads.length}</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">Conversão</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Taxa de Conversão</p>
                <h2 className="text-2xl font-bold text-slate-800">{conversionRate.toFixed(1)}%</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase">Ticket</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Ticket Médio</p>
                <h2 className="text-2xl font-bold text-slate-800">R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase">Vendas</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Valor em Vendas</p>
                <h2 className="text-2xl font-bold text-slate-800">R$ {leads.filter(l => l.status === 'closed').reduce((acc, l) => acc + l.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase">Qualificados</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Leads Qualificados</p>
                <h2 className="text-2xl font-bold text-slate-800">{leads.filter(l => l.status === 'qualified').length}</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase">Propostas</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Leads em Proposta</p>
                <h2 className="text-2xl font-bold text-slate-800">{leads.filter(l => l.status === 'proposal').length}</h2>
              </motion.div>
            </>
          ) : activeView === 'finance' ? (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">Entradas</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Receita Total</p>
                <h2 className="text-2xl font-bold text-slate-800">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase">Saídas</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Despesas Totais</p>
                <h2 className="text-2xl font-bold text-slate-800">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">Lucro</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Resultado Líquido</p>
                <h2 className={cn("text-2xl font-bold", netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                  R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase">Margem</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Margem de Lucro</p>
                <h2 className="text-2xl font-bold text-slate-800">{totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Grid className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase">Transações</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Total de Movimentações</p>
                <h2 className="text-2xl font-bold text-slate-800">{transactions.length}</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase">Média</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Ticket Médio Entradas</p>
                <h2 className="text-2xl font-bold text-slate-800">R$ {averageIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</h2>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">Vendas</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Leads Ativos</p>
                <h2 className="text-2xl font-bold text-slate-800">{leads.length}</h2>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">Receita</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Faturamento</p>
                <h2 className="text-2xl font-bold text-slate-800">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</h2>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase">Despesas</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Custo Operacional</p>
                <h2 className="text-2xl font-bold text-slate-800">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</h2>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase">Meta</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Atingimento</p>
                <h2 className="text-2xl font-bold text-slate-800">85%</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase">Ticket</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Ticket Médio Geral</p>
                <h2 className="text-2xl font-bold text-slate-800">R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</h2>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase">Conversão</span>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Conversão Geral</p>
                <h2 className="text-2xl font-bold text-slate-800">{conversionRate.toFixed(1)}%</h2>
              </motion.div>
            </>
          )}
        </div>

        {/* Charts Section */}
        {activeView === 'sales' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Corrida de Vendedores</h3>
                <p className="text-sm text-slate-500 text-balance">Acompanhe o desempenho em tempo real dos seus consultores.</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                AO VIVO
              </div>
            </div>

            <div className="space-y-8">
              {salesByResponsible.sort((a, b) => b.value - a.value).map((seller, index) => {
                const maxValue = Math.max(...salesByResponsible.map(s => s.value));
                const percentage = (seller.value / maxValue) * 100;
                
                return (
                  <div key={seller.name} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                          index === 0 ? "bg-yellow-400" : index === 1 ? "bg-slate-300" : index === 2 ? "bg-amber-600" : "bg-slate-200 text-slate-500"
                        )}>
                          {index + 1}
                        </span>
                        <span className="text-sm font-bold text-slate-700">{seller.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400">{seller.value} leads</span>
                    </div>
                    
                    <div className="h-4 bg-slate-100 rounded-full overflow-visible relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: index * 0.1 }}
                        className={cn(
                          "h-full rounded-full relative",
                          index === 0 ? "bg-emerald-500" : "bg-blue-500"
                        )}
                      >
                        {/* Drone Icon */}
                        <motion.div 
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10"
                          animate={{ 
                            y: [-12, -8, -12],
                            rotate: [-5, 5, -5]
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                        >
                          <div className="relative">
                            <Plane className="w-8 h-8 text-slate-800 fill-slate-800" />
                            {/* Propellers effect */}
                            <div className="absolute -top-1 -left-1 w-3 h-1 bg-slate-400 rounded-full animate-spin" />
                            <div className="absolute -top-1 -right-1 w-3 h-1 bg-slate-400 rounded-full animate-spin" />
                            <div className="absolute -bottom-1 -left-1 w-3 h-1 bg-slate-400 rounded-full animate-spin" />
                            <div className="absolute -bottom-1 -right-1 w-3 h-1 bg-slate-400 rounded-full animate-spin" />
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {(activeView === 'all' || activeView === 'finance') && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1"
            >
              <h3 className="font-bold text-slate-800 mb-6">Fluxo Financeiro Mensal</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {activeView === 'finance' && (
            <>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
              >
                <h3 className="font-bold text-slate-800 mb-6">Receita por Categoria</h3>
                <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeByCategory.length > 0 ? incomeByCategory : [{ name: 'Sem dados', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {incomeByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        {incomeByCategory.length === 0 && <Cell fill="#f1f5f9" />}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
              >
                <h3 className="font-bold text-slate-800 mb-6">Despesas por Categoria</h3>
                <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategory.length > 0 ? expenseByCategory : [{ name: 'Sem dados', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expenseByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                        {expenseByCategory.length === 0 && <Cell fill="#f1f5f9" />}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </>
          )}

          {(activeView === 'all' || activeView === 'sales') && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
            >
              <h3 className="font-bold text-slate-800 mb-6">Distribuição de Pipeline</h3>
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.length > 0 ? pieData : [{ name: 'Sem dados', value: 1, color: '#f1f5f9' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      {pieData.length === 0 && <Cell fill="#f1f5f9" />}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {activeView === 'all' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
            >
              <h3 className="font-bold text-slate-800 mb-6">Vendas por Produto</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByProduct}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {activeView === 'sales' && (
            <>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
              >
                <h3 className="font-bold text-slate-800 mb-6">Vendas por Produto</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByProduct}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
              >
                <h3 className="font-bold text-slate-800 mb-6">Leads por Responsável</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByResponsible} layout="vertical">
                      <XAxis type="number" hide />
                      <Tooltip />
                      <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* Pipeline Preview */}
        {(activeView === 'all' || activeView === 'sales') && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Resumo do Pipeline</h3>
              <button 
                onClick={() => navigate('/pipeline')}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                Ver Pipeline Completo
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
              {columns.map((col) => (
                <div key={col.id} className="p-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{col.title}</p>
                  <h4 className="text-xl font-bold text-slate-800">{col.count}</h4>
                  <p className="text-xs text-slate-500 mt-1">R$ {col.total.toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
