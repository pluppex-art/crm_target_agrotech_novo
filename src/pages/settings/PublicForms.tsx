import React, { useState, useEffect } from 'react';
import {
  FileText, Copy, Check, ExternalLink, Save, Loader2,
  ToggleLeft, ToggleRight, Globe, ChevronDown, ChevronUp,
  MessageSquare, Plus, Trash2, Pencil, X,
  Type, Phone, Mail, MapPin, List, DollarSign, AlertCircle,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

type FieldType = 'text' | 'tel' | 'email' | 'city' | 'select';

interface FormStep {
  id: string;
  label: string;
  hint: string;
  type: FieldType;
  placeholder: string;
  options?: string[];
  required: boolean;
}

interface FormConfig {
  form_key: string;
  title: string;
  product: string;
  price: number;
  whatsapp_number: string;
  badge_label: string;
  active: boolean;
  steps: FormStep[];
  updated_at?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FORM_PATHS: Record<string, string> = { drone: '/formulario', ia: '/formulario-ia' };

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'text',   label: 'Texto',    icon: Type,    desc: 'Campo de texto livre' },
  { value: 'tel',    label: 'Telefone', icon: Phone,   desc: 'WhatsApp / celular com formatação' },
  { value: 'email',  label: 'E-mail',   icon: Mail,    desc: 'Campo de e-mail com validação' },
  { value: 'city',   label: 'Cidade',   icon: MapPin,  desc: 'Autocomplete com cidades do IBGE' },
  { value: 'select', label: 'Seleção',  icon: List,    desc: 'Lista de opções pré-definidas' },
];

const FIELD_ICONS: Record<FieldType, React.ElementType> = {
  text: Type, tel: Phone, email: Mail, city: MapPin, select: List,
};

const LOCKED_IDS = ['phone', 'email']; // cannot delete

const DEFAULT_STEPS: Record<string, FormStep[]> = {
  drone: [
    { id: 'name',     label: 'Qual é o seu nome?',                   hint: 'Pode ser apenas o primeiro nome.', type: 'text',   placeholder: 'Ex: João',             required: false },
    { id: 'phone',    label: 'Qual é o seu WhatsApp?',               hint: 'Com DDD. Ex: +5566999999999',      type: 'tel',    placeholder: '+55 (00) 00000-0000',   required: true },
    { id: 'email',    label: 'Qual é o seu melhor e-mail?',          hint: 'Para envio de materiais.',         type: 'email',  placeholder: 'exemplo@email.com',     required: true },
    { id: 'city',     label: 'De qual cidade você é?',               hint: 'Digite para pesquisar.',           type: 'city',   placeholder: 'Pesquise sua cidade...', required: true },
    { id: 'interest', label: 'Quais áreas você tem mais interesse?', hint: 'Selecione uma das opções.',        type: 'select', placeholder: '', required: true,
      options: ['Curso de Inseminação Artificial em Bovinos', 'Curso de Piloto de Drone Agrícola'] },
  ],
  ia: [
    { id: 'name',  label: 'Qual é o seu nome?',          hint: 'Pode ser apenas o primeiro nome.', type: 'text',  placeholder: 'Ex: João',             required: false },
    { id: 'phone', label: 'Qual é o seu WhatsApp?',      hint: 'Com DDD. Ex: +5566999999999',      type: 'tel',   placeholder: '+55 (00) 00000-0000',   required: true },
    { id: 'email', label: 'Qual é o seu melhor e-mail?', hint: 'Para envio de materiais.',         type: 'email', placeholder: 'exemplo@email.com',     required: true },
    { id: 'city',  label: 'De qual cidade você é?',      hint: 'Digite para pesquisar.',           type: 'city',  placeholder: 'Pesquise sua cidade...', required: true },
  ],
};

const DEFAULTS: FormConfig[] = [
  { form_key: 'drone', title: 'Formulário Drone Agrícola',        product: 'Curso de Piloto de Drone Agrícola',          price: 197, whatsapp_number: '', badge_label: 'Drone', active: true, steps: DEFAULT_STEPS.drone },
  { form_key: 'ia',    title: 'Formulário Inseminação Artificial', product: 'Curso de Inseminação Artificial em Bovinos', price: 197, whatsapp_number: '', badge_label: 'IA',    active: true, steps: DEFAULT_STEPS.ia },
];

// ── Step Editor (inline) ──────────────────────────────────────────────────────

function StepEditor({
  step,
  onChange,
  onCancel,
}: {
  step: FormStep;
  onChange: (s: FormStep) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<FormStep>({ ...step });
  const [newOption, setNewOption] = useState('');

  const field = (key: keyof FormStep, value: unknown) =>
    setDraft(d => ({ ...d, [key]: value }));

  const addOption = () => {
    const v = newOption.trim();
    if (!v) return;
    field('options', [...(draft.options ?? []), v]);
    setNewOption('');
  };

  const removeOption = (i: number) =>
    field('options', (draft.options ?? []).filter((_, j) => j !== i));

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Label */}
        <label className="sm:col-span-2 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Pergunta</span>
          <input
            value={draft.label}
            onChange={e => field('label', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Ex: Qual é o seu nome?"
          />
        </label>

        {/* Hint */}
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Dica (subtítulo)</span>
          <input
            value={draft.hint}
            onChange={e => field('hint', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Ex: Pode ser apenas o primeiro nome."
          />
        </label>

        {/* Placeholder */}
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Placeholder</span>
          <input
            value={draft.placeholder}
            onChange={e => field('placeholder', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Ex: João"
          />
        </label>

        {/* Type */}
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tipo de campo</span>
          <select
            value={draft.type}
            onChange={e => field('type', e.target.value as FieldType)}
            disabled={LOCKED_IDS.includes(draft.id)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
          >
            {FIELD_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
            ))}
          </select>
        </label>

        {/* Required */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.required}
            disabled={LOCKED_IDS.includes(draft.id)}
            onChange={e => field('required', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400 disabled:opacity-50"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Campo obrigatório</span>
        </label>
      </div>

      {/* Options (for select) */}
      {draft.type === 'select' && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Opções de resposta</span>
          <div className="space-y-1.5">
            {(draft.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  {opt}
                </span>
                <button onClick={() => removeOption(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newOption}
              onChange={e => setNewOption(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
              placeholder="Nova opção..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              onClick={addOption}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onChange(draft)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Aplicar
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PublicForms() {
  const [configs, setConfigs]   = useState<FormConfig[]>(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);
  const [saved, setSaved]       = useState<string | null>(null);
  const [copied, setCopied]     = useState<string | null>(null);
  const [expandedCfg, setExpandedCfg] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<{ formKey: string; idx: number } | null>(null);

  useEffect(() => {
    supabase.from('form_configs').select('*').then(({ data }) => {
      if (data && data.length > 0) {
        const parsed = (data as FormConfig[]).map(c => ({
          ...c,
          steps: Array.isArray(c.steps) ? c.steps : DEFAULT_STEPS[c.form_key] ?? [],
        }));
        setConfigs(parsed);
      }
      setLoading(false);
    });
  }, []);

  // ── Config helpers ──────────────────────────────────────────────────────────

  const updateCfgField = (key: string, field: keyof FormConfig, value: unknown) =>
    setConfigs(prev => prev.map(c => c.form_key === key ? { ...c, [field]: value } : c));

  const getCfg = (key: string) => configs.find(c => c.form_key === key)!;

  // ── Step helpers ────────────────────────────────────────────────────────────

  const setSteps = (formKey: string, steps: FormStep[]) =>
    setConfigs(prev => prev.map(c => c.form_key === formKey ? { ...c, steps } : c));

  const moveStep = (formKey: string, idx: number, dir: -1 | 1) => {
    const steps = [...getCfg(formKey).steps];
    const to = idx + dir;
    if (to < 0 || to >= steps.length) return;
    [steps[idx], steps[to]] = [steps[to], steps[idx]];
    setSteps(formKey, steps);
    if (editingStep?.formKey === formKey && editingStep.idx === idx) setEditingStep({ formKey, idx: to });
  };

  const deleteStep = (formKey: string, idx: number) => {
    const steps = getCfg(formKey).steps;
    if (LOCKED_IDS.includes(steps[idx].id)) return;
    setSteps(formKey, steps.filter((_, i) => i !== idx));
    if (editingStep?.formKey === formKey && editingStep.idx === idx) setEditingStep(null);
  };

  const applyStepEdit = (formKey: string, idx: number, updated: FormStep) => {
    const steps = [...getCfg(formKey).steps];
    steps[idx] = updated;
    setSteps(formKey, steps);
    setEditingStep(null);
  };

  const addStep = (formKey: string) => {
    const newStep: FormStep = {
      id: `custom_${Date.now()}`,
      label: 'Nova pergunta',
      hint: '',
      type: 'text',
      placeholder: '',
      required: false,
    };
    const steps = [...getCfg(formKey).steps, newStep];
    setSteps(formKey, steps);
    setEditingStep({ formKey, idx: steps.length - 1 });
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async (key: string) => {
    const cfg = getCfg(key);
    setSaving(key);
    const { error } = await supabase
      .from('form_configs')
      .upsert({ ...cfg, updated_at: new Date().toISOString() }, { onConflict: 'form_key' });
    setSaving(null);
    if (!error) { setSaved(key); setTimeout(() => setSaved(null), 2500); }
  };

  const copyLink = (key: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${FORM_PATHS[key]}`).catch(() => {});
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Formulários Públicos</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure os formulários de captação. O WhatsApp é atribuído automaticamente pelo rodízio.
        </p>
      </div>

      {configs.map(cfg => {
        const formUrl    = `${window.location.origin}${FORM_PATHS[cfg.form_key]}`;
        const isExpCfg   = expandedCfg === cfg.form_key;
        const isSaving   = saving === cfg.form_key;
        const wasSaved   = saved  === cfg.form_key;

        return (
          <div
            key={cfg.form_key}
            className={cn(
              'rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm',
              cfg.active ? 'border-emerald-200 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700 opacity-75',
            )}
          >
            {/* ── Card header ─────────────────────────────────────── */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{cfg.title}</span>
                  {cfg.badge_label && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                      {cfg.badge_label}
                    </span>
                  )}
                  {!cfg.active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">Inativo</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{cfg.product}</p>
              </div>
              <button onClick={() => updateCfgField(cfg.form_key, 'active', !cfg.active)} className="shrink-0">
                {cfg.active
                  ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                  : <ToggleLeft  className="w-7 h-7 text-slate-400" />}
              </button>
            </div>

            {/* ── URL ─────────────────────────────────────────────── */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="flex-1 text-xs font-mono text-slate-500 truncate">{formUrl}</span>
              <button
                onClick={() => copyLink(cfg.form_key)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 transition-colors shrink-0"
              >
                {copied === cfg.form_key ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied === cfg.form_key ? 'Copiado' : 'Copiar'}
              </button>
              <a href={formUrl} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* ── Steps section ────────────────────────────────────── */}
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Perguntas do formulário</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {cfg.steps.length}
                  </span>
                </div>
                <button
                  onClick={() => addStep(cfg.form_key)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {/* Steps list */}
              <div className="space-y-2">
                {cfg.steps.map((step, idx) => {
                  const Icon = FIELD_ICONS[step.type];
                  const isEditing = editingStep?.formKey === cfg.form_key && editingStep.idx === idx;
                  const locked = LOCKED_IDS.includes(step.id);

                  return (
                    <div key={`${step.id}-${idx}`} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {/* Step row */}
                      <div className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 bg-white dark:bg-slate-900',
                        isEditing && 'bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800',
                      )}>
                        {/* Drag handle / index */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button onClick={() => moveStep(cfg.form_key, idx, -1)} disabled={idx === 0}
                            className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors">
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button onClick={() => moveStep(cfg.form_key, idx, 1)} disabled={idx === cfg.steps.length - 1}
                            className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors">
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Step number */}
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Type icon */}
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{step.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                              {step.type}
                            </span>
                            {step.required && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">obrigatório</span>
                            )}
                            {locked && (
                              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" /> fixo
                              </span>
                            )}
                            {step.options && step.options.length > 0 && (
                              <span className="text-[10px] text-slate-400">{step.options.length} opções</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingStep(isEditing ? null : { formKey: cfg.form_key, idx })}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors text-slate-400',
                              isEditing
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600',
                            )}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteStep(cfg.form_key, idx)}
                            disabled={locked}
                            title={locked ? 'Esse campo não pode ser removido' : 'Remover pergunta'}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline editor */}
                      {isEditing && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40">
                          <StepEditor
                            step={step}
                            onChange={updated => applyStepEdit(cfg.form_key, idx, updated)}
                            onCancel={() => setEditingStep(null)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* WhatsApp note */}
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
                <MessageSquare className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">WhatsApp via rodízio:</span> o lead é redirecionado para o WhatsApp do vendedor atribuído automaticamente.
                </p>
              </div>
            </div>

            {/* ── Config geral (colapsável) ─────────────────────────── */}
            <div className="border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setExpandedCfg(isExpCfg ? null : cfg.form_key)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <span>Configurações gerais</span>
                {isExpCfg ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isExpCfg && (
                <div className="px-5 pb-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="sm:col-span-2 space-y-1.5">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Título do formulário</span>
                      <input value={cfg.title} onChange={e => updateCfgField(cfg.form_key, 'title', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Badge</span>
                      <input value={cfg.badge_label} onChange={e => updateCfgField(cfg.form_key, 'badge_label', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Valor do lead (R$)
                      </span>
                      <input type="number" value={cfg.price} onChange={e => updateCfgField(cfg.form_key, 'price', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </label>
                    <label className="sm:col-span-2 space-y-1.5">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Produto</span>
                      <input value={cfg.product} onChange={e => updateCfgField(cfg.form_key, 'product', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </label>
                  </div>

                  <button
                    onClick={() => handleSave(cfg.form_key)}
                    disabled={isSaving || wasSaved}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                      wasSaved
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50',
                    )}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : wasSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {wasSaved ? 'Salvo!' : 'Salvar tudo'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-slate-400 dark:text-slate-600 pb-4">
        Os links são públicos e podem ser usados em campanhas sem autenticação.
      </p>
    </div>
  );
}
