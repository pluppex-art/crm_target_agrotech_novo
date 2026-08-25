import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, ChevronDown, ArrowRight, MessageCircle,
  Loader2, ArrowUp, AlertTriangle,
} from 'lucide-react';
import { formatPhone } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { trackMetaLead } from '../lib/metaPixel';

interface FormStep {
  id: string;
  label: string;
  hint: string;
  type: 'text' | 'tel' | 'email' | 'city' | 'select';
  placeholder: string;
  options?: string[];
  required: boolean;
}

interface FormConfig {
  form_key: string;
  title: string;
  product: string;
  price: number;
  active: boolean;
  steps: FormStep[];
}

interface PublicFormBaseProps {
  formKey: string;
  backgroundImage: string;
  gradient: string;
  headerIcon: React.ReactNode;
}

export function PublicFormBase({ formKey, backgroundImage, gradient, headerIcon }: PublicFormBaseProps) {
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Fetch form config from DB
  useEffect(() => {
    supabase
      .from('form_configs')
      .select('*')
      .eq('form_key', formKey)
      .single()
      .then(({ data }) => {
        if (data) {
          const cfg = data as any;
          setFormConfig({ ...cfg, steps: Array.isArray(cfg.steps) ? cfg.steps : [] });
        }
        setLoadingConfig(false);
      });
  }, [formKey]);

  // Load IBGE cities
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
      .then(r => r.json())
      .then((data: any[]) => {
        setAllCities(data.map(c => {
          const uf = c.microrregiao?.mesorregiao?.UF?.sigla || '';
          return uf ? `${c.nome} - ${uf}` : c.nome;
        }));
      })
      .catch(() => {});
  }, []);

  const steps = formConfig?.steps ?? [];
  const step = steps[currentStep];
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  const filteredCities = useMemo(() => {
    const term = inputValue.toLowerCase().trim();
    if (step?.type === 'city' && term.length >= 2) {
      return allCities.filter(c => c.toLowerCase().includes(term)).slice(0, 10);
    }
    return [];
  }, [allCities, inputValue, step]);

  // Duplicate check on phone/email steps
  useEffect(() => {
    if (!step || (step.id !== 'phone' && step.id !== 'email')) {
      setDuplicateWarning(false);
      return;
    }
    const val = inputValue.trim();
    if (!val) { setDuplicateWarning(false); return; }
    const timer = setTimeout(async () => {
      try {
        const body = step.id === 'phone'
          ? { phone: val }
          : { phone: answers.phone, email: val };
        const resp = await fetch('/api/check-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (resp.ok) {
          const { exists } = await resp.json();
          setDuplicateWarning(exists);
        }
      } catch {}
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, currentStep]);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setTimeout(() => (inputRef.current as HTMLInputElement | null)?.focus(), 350);
    }
  }, [currentStep]);

  useEffect(() => {
    if (step) setInputValue(answers[step.id] ?? '');
  }, [currentStep, step?.id]);

  const validateInput = (id: string, value: string): string | null => {
    if (id === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'E-mail inválido.';
    }
    if (id === 'phone') {
      if (value.replace(/\D/g, '').length < 12) return 'Telefone deve ter código do país + DDD + número.';
    }
    return null;
  };

  const handleSubmit = async (data: Record<string, string>) => {
    setSubmitting(true);
    setError(null);
    try {
      const selectStep = steps.find(s => s.type === 'select');
      const interest = selectStep ? (data[selectStep.id] ?? '') : '';
      const product = interest || formConfig?.product || '';
      const value = formConfig?.price ?? 197;

      const resp = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          city: data.city ?? '',
          product,
          value,
          interest,
          notes: interest ? `Interesse principal: ${interest}` : '',
          form_key: formKey,
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Erro ao enviar.');
      if (result.responsibleName) setSellerName(result.responsibleName);
      if (result.responsiblePhone) setSellerPhone(result.responsiblePhone);

      // Meta Pixel — evento Lead
      trackMetaLead({
        value: value,
        currency: 'BRL',
        content_name: product,
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = useCallback(() => {
    if (!step) return;
    const val = inputValue.trim();
    if (step.required && !val) { setError('Este campo é obrigatório.'); return; }
    if (val) {
      const validErr = validateInput(step.id, val);
      if (validErr) { setError(validErr); return; }
    }
    setAnswers(prev => ({ ...prev, [step.id]: val }));
    setError(null);
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
      setInputValue('');
    } else {
      handleSubmit({ ...answers, [step.id]: val });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, inputValue, currentStep, answers, steps.length]);

  const goPrev = () => {
    if (currentStep <= 0) { setAnswers({}); setInputValue(''); setError(null); setCurrentStep(0); return; }
    setDirection(-1);
    setCurrentStep(prev => prev - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); goNext(); }
  };

  const getWhatsAppLink = () => {
    const phone = sellerPhone ? sellerPhone.replace(/\D/g, '') : '5566999763455';
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const selectStep = steps.find(s => s.type === 'select');
    const interest = selectStep ? (answers[selectStep.id] ?? '') : '';
    const interestStr = interest ? ` sobre ${interest}` : '';
    const text = encodeURIComponent(
      `Olá! Sou o ${answers.name ?? ''}, acabei de preencher o formulário no site e gostaria de saber mais${interestStr}.`
    );
    return `https://api.whatsapp.com/send/?phone=${formattedPhone}&text=${text}`;
  };

  const variants = {
    enter: (dir: number) => ({ y: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (dir: number) => ({ y: dir < 0 ? 50 : -50, opacity: 0 }),
  };

  const bgStyle = { backgroundImage: `url("${backgroundImage}")` };

  // Loading config
  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center bg-emerald-950" style={{ minHeight: '100dvh' }}>
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  // Success screen
  if (submitted) {
    return (
      <div className="flex flex-col relative overflow-x-hidden bg-emerald-950" style={{ minHeight: '100dvh' }}>
        <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={bgStyle} />
        <div className={`absolute inset-0 z-0 ${gradient}`} />
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-white/20 p-10 rounded-3xl text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-emerald-400/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Recebemos!</h2>
            <p className="text-emerald-100/80 text-lg mb-8">
              Obrigado, <span className="text-white font-bold">{answers.name?.split(' ')[0]}</span>!{' '}
              {sellerName ? `O consultor ${sellerName} ` : 'Nossa equipe '}
              entrará em contato em breve pelo WhatsApp.
            </p>
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-emerald-900/20"
            >
              <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
              Falar no WhatsApp
            </a>
            <p className="text-emerald-400/60 text-sm mt-8">Target Agrotech • CRM</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="flex flex-col relative overflow-x-hidden bg-emerald-950" style={{ minHeight: '100dvh' }}>
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={bgStyle} />
      <div className={`absolute inset-0 z-0 ${gradient}`} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-full h-1 bg-emerald-950/50">
        <motion.div
          className="h-full bg-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-400/20 border border-emerald-400/40 rounded-lg flex items-center justify-center">
            {headerIcon}
          </div>
          <span className="text-emerald-400 font-semibold text-sm tracking-wide">Target Agrotech</span>
        </div>
        <span className="text-emerald-500/60 text-sm font-medium">
          {currentStep + 1} / {steps.length}
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-8 sm:py-12">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait" custom={direction}>
            {step && (
              <motion.div
                key={step.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 text-emerald-400/70 text-sm font-medium">
                  <span className="w-6 h-6 rounded-full border border-emerald-500/40 flex items-center justify-center text-xs font-bold">
                    {currentStep + 1}
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">
                    {step.label}
                    {step.required && <span className="text-emerald-400 ml-1">*</span>}
                  </h2>
                  {step.hint && <p className="text-emerald-300/60 text-base">{step.hint}</p>}
                </div>

                <div className="space-y-3">
                  {step.type === 'select' ? (
                    <div className="relative">
                      <select
                        ref={inputRef as React.RefObject<HTMLSelectElement>}
                        value={inputValue}
                        onChange={e => { setInputValue(e.target.value); setError(null); }}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent border-0 border-b-2 border-emerald-500/50 focus:border-emerald-400 outline-none text-white text-xl py-3 appearance-none cursor-pointer transition-colors pr-8"
                        style={{ background: 'transparent' }}
                      >
                        <option value="" disabled={step.required} style={{ background: '#064e3b', color: '#fff' }}>
                          Selecione uma opção...
                        </option>
                        {(step.options ?? []).map(opt => (
                          <option key={opt} value={opt} style={{ background: '#064e3b', color: '#fff' }}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none w-5 h-5" />
                    </div>
                  ) : (
                    <div className="relative space-y-2">
                      <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type={step.type === 'city' ? 'text' : step.type}
                        value={inputValue}
                        list={step.type === 'city' ? `cities-${formKey}` : undefined}
                        onChange={e => {
                          let val = e.target.value;
                          if (step.type === 'tel') val = formatPhone(val);
                          setInputValue(val);
                          setError(null);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={step.placeholder}
                        maxLength={step.type === 'tel' ? 16 : undefined}
                        className="w-full bg-transparent border-0 border-b-2 border-emerald-500/50 focus:border-emerald-400 outline-none text-white text-xl py-3 placeholder:text-emerald-600/50 transition-colors"
                        autoComplete={step.id === 'email' ? 'email' : step.id === 'phone' ? 'tel' : 'off'}
                      />
                      {step.type === 'city' && (
                        <datalist id={`cities-${formKey}`}>
                          {filteredCities.map(city => <option key={city} value={city} />)}
                        </datalist>
                      )}
                    </div>
                  )}

                  {duplicateWarning && (
                    <p className="text-emerald-300 text-sm flex items-center gap-2">
                      <AlertTriangle size={14} /> Este contato já está cadastrado em nosso sistema.
                    </p>
                  )}
                  {error && (
                    <p className="text-red-300 font-bold text-sm flex items-center gap-2 animate-pulse">
                      <AlertTriangle size={14} /> {error}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={goNext}
                    disabled={submitting || (step.required && !inputValue.trim())}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {currentStep < steps.length - 1 ? 'Continuar' : 'Enviar'}
                    {!submitting && <ArrowRight className="w-4 h-4" />}
                  </button>
                  <span className="text-emerald-600/60 text-xs hidden sm:block">
                    ou pressione{' '}
                    <kbd className="font-mono bg-emerald-900/60 border border-emerald-700/50 rounded px-1.5 py-0.5 text-emerald-400">
                      Enter
                    </kbd>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="relative z-10 flex justify-between items-center px-6 pb-6">
        <button
          onClick={goPrev}
          className="flex items-center gap-1.5 text-emerald-500/60 hover:text-emerald-400 text-sm font-medium transition-colors"
        >
          <ArrowUp className="w-4 h-4 -rotate-90" />
          {currentStep === 0 ? 'Recomeçar' : 'Voltar'}
        </button>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-6 bg-emerald-400' : i < currentStep ? 'w-3 bg-emerald-600' : 'w-3 bg-emerald-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
