import React, { useState, useEffect } from 'react';
import {
  Clock, Save, Loader2, AlertTriangle, CheckSquare, Eye, Flame,
  Bell, Zap, Shield, ToggleLeft, ToggleRight, Info, Phone, Plus,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { settingsService } from '../../services/settingsService';
import { SLARule, SLAConfig, DEFAULT_SLA_CONFIG } from '../../store/useSettingsStore';

type Priority = 'alta' | 'media' | 'baixa';

const EFFECT_OPTIONS = [
  { value: 'pulse-red',    label: 'Pulsar Vermelho (Alta)' },
  { value: 'pulse-amber',  label: 'Pulsar Âmbar (Média)' },
  { value: 'pulse-blue',   label: 'Pulsar Azul (Baixa)' },
  { value: 'border-shake', label: 'Borda + Vibração' },
  { value: 'glow-red',     label: 'Glow Vermelho' },
  { value: 'none',         label: 'Sem efeito' },
];
const THEME_OPTIONS = [
  { value: 'vermelho', label: 'Tom Vermelho' },
  { value: 'laranja',  label: 'Tom Laranja' },
  { value: 'azul',     label: 'Tom Azul' },
  { value: 'roxo',     label: 'Tom Roxo' },
];
const ICON_OPTIONS = [
  { value: 'fogo',    label: 'Fogo (Esfriando)' },
  { value: 'relogio', label: 'Relógio' },
  { value: 'alerta',  label: 'Alerta ⚠️' },
  { value: 'info',    label: 'Info ℹ️' },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; activeClass: string; badgeClass: string }> = {
  alta:  { label: 'ALTA',  color: 'text-red-500',   activeClass: 'bg-red-500 text-white',   badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30'    },
  media: { label: 'MÉDIA', color: 'text-amber-500', activeClass: 'bg-amber-500 text-white', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  baixa: { label: 'BAIXA', color: 'text-blue-500',  activeClass: 'bg-blue-500 text-white',  badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30'   },
};

const SLA_THEME_RGB: Record<string, string> = {
  vermelho: '239,68,68', laranja: '245,158,11', azul: '59,130,246', roxo: '168,85,247',
};
const SLA_ICON: Record<string, string> = {
  fogo: '🔥', relogio: '⏱️', alerta: '⚠️', info: 'ℹ️',
};

const STARS_FOR_PRIORITY: Record<Priority, number> = { alta: 5, media: 3, baixa: 1 };

// ─── Card Preview — mirrors real LeadCard ─────────────────────────────────────
function CardPreview({ priority, rule }: { priority: Priority; rule: SLARule }) {
  const cfg = PRIORITY_CONFIG[priority];
  const stars = STARS_FOR_PRIORITY[priority];
  const themeRgb = SLA_THEME_RGB[rule.theme] ?? '239,68,68';
  const iconEmoji = SLA_ICON[rule.icon] ?? '🔥';

  const tempLabel = priority === 'alta' ? 'Quente' : priority === 'media' ? 'Morno' : 'Frio';
  const tempIcon  = priority === 'alta' ? '🔥'    : priority === 'media' ? '🌤️'   : '🥶';
  const tempColor = priority === 'alta'
    ? 'bg-red-500/10 text-red-400 border-red-500/30'
    : priority === 'media'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-blue-500/10 text-blue-400 border-blue-500/30';

  const elapsedDemo = rule.maxHours + 3;
  const isExpired   = rule.enabled;

  const cardBorder: React.CSSProperties = isExpired
    ? { borderColor: `rgba(${themeRgb},0.7)`, boxShadow: `0 0 20px rgba(${themeRgb},0.35)` }
    : {};

  return (
    <div
      className="rounded-2xl border bg-white dark:bg-slate-800 p-4 shadow-sm transition-all"
      style={cardBorder}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-200 border-2 border-slate-50 dark:border-slate-700 shadow-sm shrink-0">
            EL
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">Empresa Exemplo LTDA</p>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Flame
                  key={i} size={12}
                  className={i < stars
                    ? stars >= 4 ? 'fill-orange-500 text-orange-500'
                      : stars === 3 ? 'fill-amber-400 text-amber-400'
                      : 'fill-blue-400 text-blue-400'
                    : 'text-slate-200 dark:text-slate-600'}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-md border tracking-tight uppercase shadow-sm', tempColor)}>
            {tempIcon} {tempLabel}
          </span>
          {isExpired && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-md border tracking-tight uppercase"
              style={{ color: `rgb(${themeRgb})`, backgroundColor: `rgba(${themeRgb},0.1)`, borderColor: `rgba(${themeRgb},0.3)` }}
            >
              {iconEmoji} ESFRIANDO ({elapsedDemo}h)
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Phone size={14} className="text-emerald-500" />
          <span className="text-xs font-medium">(11) 99999-9999</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Plus size={14} className="text-slate-300 dark:text-slate-500" />
            <span className="text-xs font-medium">Produto Exemplo</span>
          </div>
          <div className="flex items-center gap-2 pl-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
              <span className="font-medium">Nome do Vendedor</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1.5">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">R$ 15.000</span>
          <div className="flex items-center gap-2">
            {isExpired && (
              <div
                className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                style={{ color: `rgb(${themeRgb})`, backgroundColor: `rgba(${themeRgb},0.08)`, borderColor: `rgba(${themeRgb},0.25)` }}
              >
                <Clock size={9} />
                Parado: {elapsedDemo}h
              </div>
            )}
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
              <CheckSquare size={11} />
              2/3
            </div>
          </div>
        </div>

        {/* SLA expired row */}
        {isExpired && (
          <div
            className="flex items-center justify-between pt-1.5 mt-0.5 border-t"
            style={{ borderColor: `rgba(${themeRgb},0.15)` }}
          >
            <span className="text-amber-500 dark:text-amber-400 text-[10px] font-bold">⚠ Atendimento Pendente</span>
            <span className="text-[10px] font-bold" style={{ color: `rgb(${themeRgb})` }}>
              Parado: {elapsedDemo}h
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-1.5 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
        <span
          className="text-[8px] font-black px-2 py-0.5 rounded-md tracking-tighter uppercase border"
          style={{
            backgroundColor: `${cfg.activeClass.includes('red') ? '#ef4444' : cfg.activeClass.includes('amber') ? '#f59e0b' : '#3b82f6'}10`,
            color: cfg.activeClass.includes('red') ? '#ef4444' : cfg.activeClass.includes('amber') ? '#f59e0b' : '#3b82f6',
            borderColor: `${cfg.activeClass.includes('red') ? '#ef4444' : cfg.activeClass.includes('amber') ? '#f59e0b' : '#3b82f6'}30`,
          }}
        >
          SQUAD ALFA
        </span>
        <span className="text-[9px] text-slate-400 font-medium tracking-wide opacity-60">Criado em 01/01/26 às 09:00</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SLASettings() {
  const [config, setConfig] = useState<SLAConfig>(DEFAULT_SLA_CONFIG);
  const [activePriority, setActivePriority] = useState<Priority>('alta');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsService.getSetting<SLAConfig>('sla_config', DEFAULT_SLA_CONFIG).then(data => {
      if (data) setConfig(data);
      setIsLoading(false);
    });
  }, []);

  const updateRule = (priority: Priority, field: keyof SLARule, value: any) => {
    setConfig(prev => ({ ...prev, [priority]: { ...prev[priority], [field]: value } }));
    setSaved(false);
  };

  const updateException = (field: keyof SLAConfig['exceptions'], value: boolean) => {
    setConfig(prev => ({ ...prev, exceptions: { ...prev.exceptions, [field]: value } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await settingsService.updateSetting('sla_config', config);
    setIsSaving(false);
    if (ok) setSaved(true);
    else alert('Erro ao salvar. Verifique sua conexão.');
  };

  const rule = config[activePriority];
  const cfg  = PRIORITY_CONFIG[activePriority];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-blue-500" />
            Configuração de SLA & Alertas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Garanta conversões rápidas cobrando sua equipe de vendas caso o tempo de primeiro contato estoure.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm',
            saved ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md',
          )}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Salvo ✓' : 'Salvar Configurações'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Left: Config Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Priority Tabs */}
          <div className="px-6 pt-5 pb-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-3">Definir por Complexidade</p>
            <div className="flex gap-2 mb-6">
              {(['alta', 'media', 'baixa'] as Priority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setActivePriority(p)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border',
                    activePriority === p
                      ? PRIORITY_CONFIG[p].activeClass + ' shadow-md border-transparent'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300',
                  )}
                >
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Enable Toggle */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Meta de SLA Ativa</p>
                <p className="text-xs text-slate-400 mt-0.5">Monitorar tempo limite para leads de prioridade {cfg.label}.</p>
              </div>
              <button onClick={() => updateRule(activePriority, 'enabled', !rule.enabled)} className="shrink-0 mt-0.5">
                {rule.enabled
                  ? <ToggleRight className={cn('w-9 h-9', cfg.color)} />
                  : <ToggleLeft className="w-9 h-9 text-slate-300 dark:text-slate-600" />}
              </button>
            </div>

            {/* SLA Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espera Máxima (SLA)</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={1} max={168} value={rule.maxHours}
                    onChange={e => updateRule(activePriority, 'maxHours', Number(e.target.value))}
                    className="w-20 px-3 py-2 text-lg font-black text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  <span className="text-sm font-bold text-slate-500">horas</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">Tempo parado sem atendimento para o lead esfriar.</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pré-Alerta Visual</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={1} max={rule.maxHours - 1} value={rule.preAlertHours}
                    onChange={e => updateRule(activePriority, 'preAlertHours', Number(e.target.value))}
                    className="w-20 px-3 py-2 text-lg font-black text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  <span className="text-sm font-bold text-slate-500">horas antes</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">Disparar micro-alerta antes do estouro total.</p>
              </div>
            </div>

            {/* Visual Customization */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Zap size={14} className={cfg.color} />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Customização de Alerta Visual</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efeito de Destaque</label>
                  <select
                    value={rule.effect}
                    onChange={e => updateRule(activePriority, 'effect', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                  >
                    {EFFECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tema Cromático</label>
                  <select
                    value={rule.theme}
                    onChange={e => updateRule(activePriority, 'theme', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                  >
                    {THEME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ícone do Alerta</label>
                  <select
                    value={rule.icon}
                    onChange={e => updateRule(activePriority, 'icon', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                  >
                    {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efeito de Atenção Ativo</span>
                <span className={cn(
                  'text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest',
                  rule.effect.includes('red')   ? 'text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30' :
                  rule.effect.includes('amber') ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30' :
                  rule.effect.includes('blue')  ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30' :
                  'text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
                )}>
                  {EFFECT_OPTIONS.find(o => o.value === rule.effect)?.label.toUpperCase() || rule.effect.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Última sincronização local: Hoje</span>
              <button
                onClick={handleSave} disabled={isSaving}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold transition-all text-[10px]"
              >
                {isSaving ? 'Salvando...' : 'Aplicar Regra'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Card Preview */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-slate-400" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">Visualizador de Card</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Pré-visualização de como este lead aparecerá no funil de negociações quando o SLA estoure:
            </p>
            <CardPreview priority={activePriority} rule={rule} />

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Efeito de Atenção Ativo</p>
              <p className={cn('text-xs font-black uppercase tracking-widest', cfg.color)}>
                {EFFECT_OPTIONS.find(o => o.value === rule.effect)?.label || rule.effect}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">Resumo Geral</p>
            {(['alta', 'media', 'baixa'] as Priority[]).map(p => (
              <div key={p} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', p === 'alta' ? 'bg-red-500' : p === 'media' ? 'bg-amber-500' : 'bg-blue-500')} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{PRIORITY_CONFIG[p].label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {config[p].enabled
                    ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30">Ativo</span>
                    : <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">Inativo</span>}
                  <span className="text-[10px] text-slate-400 font-mono">{config[p].maxHours}h</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exception Rules */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2">
          <Shield size={14} className="text-slate-400" />
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">Regras de Exceção CRM</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: 'ignoreWithTasks'   as const, label: 'Ignorar leads com tarefas',       desc: 'Leads com tarefas ativas não entram no timer de SLA.',          icon: CheckSquare  },
            { key: 'ignoreGanho'       as const, label: 'Ignorar etapa Ganho',              desc: 'Leads na etapa Ganho/Aprovado/Fechado ficam isentos do SLA.',    icon: Bell         },
            { key: 'ignoreAquecimento' as const, label: 'Ignorar Aquecimento/Perdido',      desc: 'Leads em Aquecimento ou Perdido não geram alertas de SLA.',      icon: AlertTriangle },
          ].map(({ key, label, desc, icon: Icon }) => (
            <div
              key={key}
              onClick={() => updateException(key, !config.exceptions[key])}
              className={cn(
                'p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
                config.exceptions[key]
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700',
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <Icon size={16} className={config.exceptions[key] ? 'text-emerald-600' : 'text-slate-400'} />
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                  config.exceptions[key] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600',
                )}>
                  {config.exceptions[key] && <span className="text-white text-[10px] font-black">✓</span>}
                </div>
              </div>
              <p className={cn('text-xs font-bold mb-1', config.exceptions[key] ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300')}>
                {label}
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          <strong>Como funciona o SLA?</strong> O timer começa quando um lead é criado ou tem o último contato registrado.
          A prioridade é definida pela temperatura: ≥4 chamas = Alta, 3 = Média, ≤2 = Baixa.
          Quando o tempo estoura, o card recebe o efeito visual e os badges de alerta configurados acima.
          As configurações são salvas no banco e aplicadas automaticamente no Pipeline.
        </div>
      </div>
    </div>
  );
}
