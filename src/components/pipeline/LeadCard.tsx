import React from 'react';
import { motion } from 'framer-motion';

import { Flame, Phone, Plus, Trash2, Edit2, CheckSquare, Clock } from 'lucide-react';
import { useLeadChecklist } from '../../hooks/useLeadChecklist';

import { Lead, LeadSubStatus } from '../../types/leads';
import { cn, getLeadEffectiveValue } from '../../lib/utils';
import { useLeadStore } from '../../store/useLeadStore';
import { useProductStore } from '../../store/useProductStore';
import { financialCalculator } from '../../services/financialCalculator';
import { useTaskStore } from '../../store/useTaskStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useSquadStore } from '../../store/useSquadStore';
import { usePipelineStore } from '../../store/usePipelineStore';

const SLA_ICON: Record<string, string> = {
  fogo: '🔥', relogio: '⏱️', alerta: '⚠️', info: 'ℹ️',
};

const SLA_THEME_RGB: Record<string, string> = {
  vermelho: '239,68,68',
  laranja:  '245,158,11',
  azul:     '59,130,246',
  roxo:     '168,85,247',
};

const getTemperatureConfig = (stars: number | null | undefined) => {
  const s = stars || 0;
  if (s >= 4) {
    return {
      label: 'Quente',
      icon: '🔥',
      color: 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30',
      glow: 'shadow-[0_0_12px_rgba(239,68,68,0.12)] dark:shadow-[0_0_12px_rgba(239,68,68,0.06)] hover:shadow-[0_0_16px_rgba(239,68,68,0.2)] dark:hover:shadow-[0_0_16px_rgba(239,68,68,0.1)] border-red-200/60 dark:border-red-800/30 hover:border-red-300 dark:hover:border-red-700'
    };
  } else if (s === 3) {
    return {
      label: 'Morno',
      icon: '🌤️',
      color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.12)] dark:shadow-[0_0_12px_rgba(245,158,11,0.06)] hover:shadow-[0_0_16px_rgba(245,158,11,0.2)] dark:hover:shadow-[0_0_16px_rgba(245,158,11,0.1)] border-amber-200/60 dark:border-amber-800/30 hover:border-amber-300 dark:hover:border-amber-700'
    };
  } else {
    return {
      label: 'Frio',
      icon: '🥶',
      color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
      glow: 'shadow-[0_0_12px_rgba(59,130,246,0.12)] dark:shadow-[0_0_12px_rgba(59,130,246,0.06)] hover:shadow-[0_0_16px_rgba(59,130,246,0.2)] dark:hover:shadow-[0_0_16px_rgba(59,130,246,0.1)] border-blue-200/60 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-700'
    };
  }
};

interface LeadCardProps {
  lead: Lead;
  index: number;
  onDoubleClick: () => void;
  columnId: string;
  isDragging?: boolean;
}

export function LeadCard({ lead, index: _index, onDoubleClick, columnId, isDragging }: LeadCardProps) {
  const { updateLeadSubStatus, deleteLead, setSelectedLead } = useLeadStore();
  const { products } = useProductStore();
  const { tasks } = useTaskStore();
  const { profiles } = useProfileStore();
  const { slaConfig } = useSettingsStore();

  const { getSquadInfoForUser } = useSquadStore();
  const responsibleProfile = profiles.find(p => p.id === lead.responsavel_usuario_id || p.name === lead.responsible);
  const squadInfo = getSquadInfoForUser(lead.responsavel_usuario_id || responsibleProfile?.id || '', lead.responsible || responsibleProfile?.name || '', profiles);

  const hasTasks = tasks.some(t => t.lead_id === lead.id);

  const product = financialCalculator.findProduct(lead.product ?? '', products);
  const enrollmentFee = product?.enrollment_fee ?? 0;
  const totalDisplayValue = getLeadEffectiveValue(lead) + enrollmentFee;

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const referenceTime = lead.last_contact_at ?? lead.created_at;
  const elapsedMs = now - new Date(referenceTime).getTime();
  const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));

  const pipelines = usePipelineStore(state => state.pipelines);
  const stages = React.useMemo(() => pipelines.flatMap(p => p.stages), [pipelines]);
  const columnStage = stages.find(s => s.id === columnId);
  const columnStageName = (columnStage?.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const stageName = (lead.status ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const subStatusName = (lead.subStatus ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const isInactiveStage =
    lead.status === 'closed' ||
    stageName.includes('ganho') || stageName.includes('aprovado') || stageName.includes('fechado') ||
    stageName.includes('concluido') || stageName.includes('matriculado') || stageName.includes('confirmado') ||
    stageName.includes('certificado') || stageName.includes('pos-venda') ||
    stageName.includes('perdido') || stageName.includes('desqualificado') ||
    subStatusName.includes('ganho') || subStatusName.includes('concluido') ||
    subStatusName.includes('matriculado') || subStatusName.includes('confirmado') ||
    columnStageName.includes('ganho') || columnStageName.includes('aprovado') ||
    columnStageName.includes('fechado') || columnStageName.includes('concluido') ||
    columnStageName.includes('matriculado') || columnStageName.includes('confirmado') ||
    columnStageName.includes('certificado') || columnStageName.includes('pos-venda');

  // ── SLA config per priority ─────────────────────────────────────────────────
  const leadPriority = (lead.stars || 0) >= 4 ? 'alta' as const : (lead.stars || 0) >= 3 ? 'media' as const : 'baixa' as const;
  const slaRule = slaConfig[leadPriority];

  const exceptions = slaConfig.exceptions;
  const ignoreByTasks  = exceptions.ignoreWithTasks  && hasTasks;
  const ignoreByAquec  = exceptions.ignoreAquecimento && (
    stageName.includes('aquecimento') || stageName.includes('perdido') ||
    subStatusName.includes('aquecimento') || columnStageName.includes('aquecimento')
  );
  const timerDisabled = isInactiveStage || ignoreByTasks || ignoreByAquec;

  const isSlaExpired   = !timerDisabled && slaRule.enabled && elapsedHours >= slaRule.maxHours;
  const isSlaPreAlert  = !timerDisabled && slaRule.enabled && !isSlaExpired &&
    elapsedHours >= (slaRule.maxHours - slaRule.preAlertHours);

  // remaining time for pre-alert badge
  const slaRemainingMs  = Math.max(0, slaRule.maxHours * 60 * 60 * 1000 - elapsedMs);
  const slaRemainingH   = Math.floor(slaRemainingMs / (60 * 60 * 1000));
  const slaRemainingMin = Math.floor((slaRemainingMs % (60 * 60 * 1000)) / 60_000);
  const remainingLabel  = slaRemainingH < 1 ? `${slaRemainingMin}min` : `${slaRemainingH}h`;

  // ── Visual effects ──────────────────────────────────────────────────────────
  const themeRgb = SLA_THEME_RGB[slaRule.theme] ?? '239,68,68';
  const slaAnimClass = isSlaExpired ? ({
    'pulse-red': 'animate-pulse', 'pulse-amber': 'animate-pulse', 'pulse-blue': 'animate-pulse',
    'border-shake': 'sla-shake',
  } as Record<string, string>)[slaRule.effect] ?? '' : '';

  const slaInlineStyle: React.CSSProperties = isSlaExpired
    ? { borderColor: `rgba(${themeRgb},0.7)`, boxShadow: `0 0 20px rgba(${themeRgb},0.4)` }
    : isSlaPreAlert
      ? { borderColor: `rgba(${themeRgb},0.35)`, boxShadow: `0 0 10px rgba(${themeRgb},0.18)` }
      : {};

  const { allRequiredCompleted, requiredCompleted, requiredTotal } = useLeadChecklist({
    leadId: lead.id,
    stageId: lead.stage_id || columnId,
  });

  const tempCfg = getTemperatureConfig(lead.stars);
  const slaIconEmoji = SLA_ICON[slaRule.icon] ?? '🔥';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onDoubleClick={onDoubleClick}
      style={slaInlineStyle}
      className={cn(
        "bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border transition-all group relative",
        slaAnimClass,
        isDragging ? "shadow-xl border-emerald-500 dark:border-emerald-400 rotate-2" : "",
        !isSlaExpired && !isSlaPreAlert ? tempCfg.glow : '',
      )}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <img
            src={lead.photo || 'https://via.placeholder.com/150'}
            alt={lead.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-slate-50 dark:border-slate-700 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{lead.name}</h4>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => {
                const s = lead.stars || 0;
                const isLit = i < s;
                const flameColor = isLit
                  ? s >= 4 ? 'fill-orange-500 text-orange-500'
                    : s === 3 ? 'fill-amber-400 text-amber-400'
                    : 'fill-blue-400 text-blue-400'
                  : 'text-slate-200 dark:text-slate-600';
                return <Flame key={i} size={12} className={cn('transition-colors', flameColor)} />;
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border tracking-tight uppercase shadow-sm", tempCfg.color)}>
            {tempCfg.icon} {tempCfg.label}
          </span>
          {isSlaExpired && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-md border tracking-tight uppercase"
              style={{
                color: `rgb(${themeRgb})`,
                backgroundColor: `rgba(${themeRgb},0.1)`,
                borderColor: `rgba(${themeRgb},0.3)`,
              }}
            >
              {slaIconEmoji} ESFRIANDO ({elapsedHours}h)
            </span>
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); if (confirm(`Tem certeza que deseja excluir o lead ${lead.name}?`)) deleteLead(lead.id); }}
              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
              title="Excluir lead"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
              className="p-1 text-slate-300 hover:text-emerald-500 transition-colors"
              title="Editar lead"
            >
              <Edit2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Phone size={14} className="text-emerald-500" />
          <span className="text-xs font-medium">{lead.phone}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Plus size={14} className="text-slate-300 dark:text-slate-500" />
            <span className="text-xs font-medium truncate max-w-[150px]" title={product?.name || lead.product || ''} spellCheck={false}>
              {product?.name || lead.product}
            </span>
          </div>
          {lead.responsible && (
            <div className="flex items-center gap-2 pl-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <span className="font-medium">{responsibleProfile?.name || lead.responsible}</span>
              </div>
            </div>
          )}

          {lead.subStatus === 'Turma Concluída' && (
            <div className="mt-1.5 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg w-fit border border-emerald-100 dark:border-emerald-500/20 animate-in fade-in slide-in-from-top-1 duration-300">
              <CheckSquare size={10} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Turma Concluída</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1.5">
          <div className="flex flex-col items-start gap-1">
            <span className={cn(
              "text-sm font-bold",
              totalDisplayValue === 0 ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-100"
            )}>
              R$ {totalDisplayValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
            {totalDisplayValue === 0 && (
              <span className="text-[9px] font-black bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-amber-500/20 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                Sem Valor
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* SLA pre-alert badge (only when not yet expired) */}
            {!timerDisabled && slaRule.enabled && isSlaPreAlert && (
              <div
                className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                style={{
                  color: `rgb(${themeRgb})`,
                  backgroundColor: `rgba(${themeRgb},0.08)`,
                  borderColor: `rgba(${themeRgb},0.25)`,
                }}
              >
                <Clock size={9} />
                {remainingLabel} restantes
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
              title="Checklist"
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all",
                allRequiredCompleted
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                  : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
              )}
            >
              <CheckSquare size={11} />
              {requiredCompleted}/{requiredTotal}
            </button>
          </div>
        </div>

        {/* SLA expired bottom row */}
        {isSlaExpired && (
          <div
            className="flex items-center justify-between pt-1.5 mt-0.5 border-t"
            style={{ borderColor: `rgba(${themeRgb},0.15)` }}
          >
            <span className="text-amber-500 dark:text-amber-400 text-[10px] font-bold">⚠ Atendimento Pendente</span>
            <span className="text-[10px] font-bold" style={{ color: `rgb(${themeRgb})` }}>
              Parado: {elapsedHours}h
            </span>
          </div>
        )}
      </div>

      {lead.status === 'qualified' && (
        <div className="mt-3 pt-2.5 border-t border-slate-50 flex flex-wrap gap-2">
          {[
            { id: 'qualified' as LeadSubStatus, label: 'Qualificado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
            { id: 'warming' as LeadSubStatus, label: 'Aquecimento', color: 'bg-amber-50 text-amber-600 border-amber-100' },
            { id: 'disqualified' as LeadSubStatus, label: 'Desqualificado', color: 'bg-red-50 text-red-600 border-red-100' }
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={(e) => { e.stopPropagation(); updateLeadSubStatus(lead.id, sub.id); }}
              className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-full border transition-all",
                lead.subStatus === sub.id
                  ? sub.color
                  : "bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200"
              )}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Footer: Squad + Creation Date */}
      <div className="mt-2 pt-1.5 border-t border-slate-50 flex items-center justify-between">
        {squadInfo && (
          <span
            className="text-[8px] font-black px-2 py-0.5 rounded-md tracking-tighter uppercase border"
            style={{
              backgroundColor: `${squadInfo.color}10`,
              color: squadInfo.color,
              borderColor: `${squadInfo.color}30`,
            }}
          >
            SQUAD {squadInfo.name}
          </span>
        )}
        {lead.created_at && (
          <span className="text-[9px] text-slate-400 font-medium tracking-wide opacity-60">
            Criado em {new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} às {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </motion.div>
  );
}
