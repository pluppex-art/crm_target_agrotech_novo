import { useState, useCallback, useEffect } from 'react';
import {
  BarChart2, Calendar, Download, Copy, Check, Loader2,
  RefreshCw, MessageCircle, Settings2, X, Plus, Phone,
  Send, Trash2, UserCheck,
} from 'lucide-react';
import { reportDataService, getDateRangeForPeriod, DailyReportData, ReportPeriod } from '../services/reportDataService';
import { DailyReportView } from '../components/reports/DailyReportView';
import { useExportPDF } from '../hooks/useExportPDF';
import { supabase as _supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

const supabase = _supabase as any;

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'day',    label: 'Hoje' },
  { value: 'week',   label: 'Esta Semana' },
  { value: 'month',  label: 'Este Mês' },
  { value: 'year',   label: 'Este Ano' },
  { value: 'custom', label: 'Personalizado' },
];

interface LeaderContact {
  name: string;
  phone: string;
}

const today = new Date().toISOString().slice(0, 10);

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function Reports() {
  const { exportElementToPDF, isExporting } = useExportPDF();

  const [period, setPeriod]               = useState<ReportPeriod>('day');
  const [referenceDate, setReferenceDate] = useState(today);
  const [customStart, setCustomStart]     = useState(today);
  const [customEnd, setCustomEnd]         = useState(today);
  const [data, setData]                   = useState<DailyReportData | null>(null);
  const [loading, setLoading]             = useState(false);
  const [copied, setCopied]               = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [companyName, setCompanyName]     = useState('TARGET AGROTECH');
  const [leaders, setLeaders]             = useState<LeaderContact[]>([]);
  const [newName, setNewName]             = useState('');
  const [newPhone, setNewPhone]           = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [sentTo, setSentTo]               = useState<Set<string>>(new Set());
  const [wabaToken, setWabaToken]         = useState('');
  const [wabaPhoneId, setWabaPhoneId]     = useState('');
  const [wabaConfigured, setWabaConfigured] = useState(false);

  // Load settings from Supabase on mount
  useEffect(() => {
    supabase
      .from('report_settings')
      .select('key, value')
      .in('key', ['company_name', 'leader_contacts', 'waba_access_token', 'waba_phone_number_id'])
      .then(({ data: rows }: any) => {
        if (!rows) return;
        rows.forEach((row: any) => {
          if (row.key === 'company_name' && row.value) setCompanyName(row.value);
          if (row.key === 'leader_contacts' && row.value) {
            try { setLeaders(JSON.parse(row.value)); } catch { /* ignore */ }
          }
          if (row.key === 'waba_access_token') { setWabaToken(row.value ?? ''); if (row.value) setWabaConfigured(true); }
          if (row.key === 'waba_phone_number_id') setWabaPhoneId(row.value ?? '');
        });
      });
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    await Promise.all([
      supabase.from('report_settings').upsert({ key: 'company_name', value: companyName }, { onConflict: 'key' }),
      supabase.from('report_settings').upsert({ key: 'leader_contacts', value: JSON.stringify(leaders) }, { onConflict: 'key' }),
      supabase.from('report_settings').upsert({ key: 'waba_access_token', value: wabaToken }, { onConflict: 'key' }),
      supabase.from('report_settings').upsert({ key: 'waba_phone_number_id', value: wabaPhoneId }, { onConflict: 'key' }),
    ]);
    setWabaConfigured(!!wabaToken && !!wabaPhoneId);
    setSavingSettings(false);
    setShowSettings(false);
  };

  const addLeader = () => {
    const name = newName.trim();
    const phone = cleanPhone(newPhone);
    if (!name || phone.length < 10) return;
    setLeaders(prev => [...prev, { name, phone }]);
    setNewName('');
    setNewPhone('');
  };

  const removeLeader = (idx: number) => {
    setLeaders(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setSentTo(new Set());
    const { start, end, label } = getDateRangeForPeriod(
      period, referenceDate, customStart, customEnd,
    );
    try {
      const result = await reportDataService.getReportData(start, end, label);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [period, referenceDate, customStart, customEnd]);

  const handleCopyText = async () => {
    if (!data) return;
    const text = reportDataService.formatAsText(data, companyName);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendToLeader = (leader: LeaderContact) => {
    if (!data) return;
    const text = reportDataService.formatAsText(data, companyName);
    const encoded = encodeURIComponent(text);
    const phone = leader.phone.startsWith('55') ? leader.phone : `55${leader.phone}`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`, '_blank');
    setSentTo(prev => new Set([...prev, leader.phone]));
  };

  const handleSendToAll = () => {
    if (!data) return;
    leaders.forEach(l => handleSendToLeader(l));
  };

  const handleExportPDF = async () => {
    if (!data) return;
    const dateSlug = data.dateLabel.replace(/\//g, '-');
    await exportElementToPDF('daily-report-content', `relatorio-${dateSlug}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Relatórios
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gere relatórios por período e envie diretamente para os líderes via WhatsApp.
          </p>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all',
            showSettings
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300',
          )}
        >
          <Settings2 size={14} />
          Configurações
          {leaders.length > 0 && (
            <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black">
              {leaders.length}
            </span>
          )}
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Configurações do Relatório</h2>
            <button onClick={() => setShowSettings(false)}>
              <X size={16} className="text-slate-400 hover:text-slate-600" />
            </button>
          </div>

          {/* Company name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Nome da empresa (cabeçalho do relatório)
            </label>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Leader contacts */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <UserCheck size={12} />
              Líderes que recebem o relatório
            </label>

            {leaders.length > 0 && (
              <div className="space-y-2">
                {leaders.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <Phone size={12} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{l.name}</p>
                      <p className="text-xs text-slate-400">+{l.phone}</p>
                    </div>
                    <button
                      onClick={() => removeLeader(i)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new leader */}
            <div className="flex gap-2 flex-wrap">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome do líder"
                className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500"
              />
              <input
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="Telefone (ex: 65999999999)"
                type="tel"
                className="flex-1 min-w-[160px] px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500"
                onKeyDown={e => e.key === 'Enter' && addLeader()}
              />
              <button
                onClick={addLeader}
                disabled={!newName.trim() || cleanPhone(newPhone).length < 10}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Inclua o DDD. Ex: 65999999999 (sem +55, o sistema adiciona automaticamente).
            </p>
          </div>

          {/* WhatsApp Business Cloud API — envio automático às 21h */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageCircle size={12} />
                Envio automático às 21h (WhatsApp Business API)
              </label>
              <span className={cn(
                'text-[10px] font-black px-2 py-0.5 rounded-full',
                wabaConfigured
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
              )}>
                {wabaConfigured ? '✓ Configurado' : 'Não configurado'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Access Token (Meta)</label>
                <input
                  value={wabaToken}
                  onChange={e => setWabaToken(e.target.value)}
                  type="password"
                  placeholder="EAAxxxxx..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phone Number ID (Meta)</label>
                <input
                  value={wabaPhoneId}
                  onChange={e => setWabaPhoneId(e.target.value)}
                  placeholder="123456789012345"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Obtenha em{' '}
              <span className="font-semibold text-slate-500">developers.facebook.com/apps</span>
              {' '}→ WhatsApp → API Setup. Gratuito até 1.000 conversas/mês.
            </p>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all"
            >
              {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {savingSettings ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>
        </div>
      )}

      {/* Period selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Selecionar Período</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold border transition-all',
                period === p.value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200/50'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          {period !== 'custom' ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar size={11} />
                Data de referência
              </label>
              <input
                type="date"
                value={referenceDate}
                onChange={e => setReferenceDate(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">De</label>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={e => setCustomStart(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Até</label>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            </>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm shadow-emerald-200/50 transition-all"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>

        {!loading && (
          <p className="text-xs text-slate-400 mt-3">
            Período:{' '}
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {getDateRangeForPeriod(period, referenceDate, customStart, customEnd).label}
            </span>
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
          <p className="text-sm font-semibold text-slate-400">Coletando dados do período...</p>
        </div>
      )}

      {/* Report display */}
      {data && !loading && (
        <>
          {/* Action bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0">
                Relatório: <span className="text-emerald-600 font-black">{data.dateLabel}</span>
              </p>
              <button
                onClick={handleCopyText}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all',
                  copied
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600',
                )}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar texto'}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {isExporting ? 'Exportando...' : 'Baixar PDF'}
              </button>
            </div>

            {/* WhatsApp send section */}
            {leaders.length > 0 ? (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <MessageCircle size={12} />
                    Enviar para líderes via WhatsApp
                  </p>
                  {leaders.length > 1 && (
                    <button
                      onClick={handleSendToAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      <Send size={11} />
                      Enviar para todos ({leaders.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {leaders.map(l => {
                    const sent = sentTo.has(l.phone);
                    return (
                      <button
                        key={l.phone}
                        onClick={() => handleSendToLeader(l)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all',
                          sent
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-green-400 hover:bg-green-50 hover:text-green-700 dark:hover:border-green-700 dark:hover:text-green-400',
                        )}
                      >
                        {sent ? <Check size={13} /> : <MessageCircle size={13} />}
                        {l.name}
                        <span className="text-[10px] text-slate-400 font-normal">+{l.phone}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <Plus size={13} />
                  Adicionar líderes para envio via WhatsApp (Configurações)
                </button>
              </div>
            )}
          </div>

          {/* The report */}
          <DailyReportView data={data} companyName={companyName} />
        </>
      )}

      {/* Empty state */}
      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300 dark:text-slate-700">
          <BarChart2 size={48} />
          <p className="text-base font-semibold text-slate-400">Selecione um período e clique em "Gerar Relatório"</p>
          <p className="text-sm text-slate-400">Os dados são coletados em tempo real do CRM.</p>
        </div>
      )}
    </div>
  );
}
