import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Loader2,
  ArrowUp,
  AlertTriangle,
} from 'lucide-react';
import { formatPhone } from '../lib/utils';

interface Step {
  id: string;
  question: string;
  hint?: string;
  type: 'text' | 'tel' | 'email';
  placeholder?: string;
  required?: boolean;
}

export function PublicFormIA() {
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
  const inputRef = useRef<HTMLInputElement>(null);

  const steps: Step[] = [
    {
      id: 'name',
      question: 'Qual é o seu nome?',
      hint: 'Pode ser apenas o seu primeiro nome.',
      type: 'text',
      placeholder: 'Ex: João',
      required: false,
    },
    {
      id: 'phone',
      question: 'Qual é o seu WhatsApp?',
      hint: 'Com DDD. Ex: +5566999999999',
      type: 'tel',
      placeholder: '+55 (00) 00000-0000',
      required: true,
    },
    {
      id: 'email',
      question: 'Qual é o seu melhor e-mail?',
      hint: 'Para envio de materiais e contato.',
      type: 'email',
      placeholder: 'exemplo@email.com',
      required: true,
    },
    {
      id: 'city',
      question: 'De qual cidade você é?',
      hint: 'Digite para pesquisar sua cidade.',
      type: 'text',
      placeholder: 'Pesquise sua cidade...',
      required: true,
    },
  ];

  // Check duplicate on phone/email
  useEffect(() => {
    const currentStepId = steps[currentStep]?.id;
    if (currentStepId !== 'phone' && currentStepId !== 'email') {
      setDuplicateWarning(false);
      return;
    }
    const val = inputValue.trim();
    if (!val) { setDuplicateWarning(false); return; }
    const timer = setTimeout(async () => {
      try {
        const body = currentStepId === 'phone'
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
      } catch { /* silently ignore */ }
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, currentStep]);

  // Load cities from IBGE
  useEffect(() => {
    async function loadCities() {
      try {
        const resp = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome');
        const data = await resp.json();
        if (data && Array.isArray(data)) {
          const formatted = data.map((c: any) => {
            const cityName = c.nome;
            const ufSigla = c.microrregiao?.mesorregiao?.UF?.sigla || c.regiao?.sigla || '';
            return ufSigla ? `${cityName} - ${ufSigla}` : cityName;
          });
          setAllCities(formatted);
        }
      } catch { /* ignore */ }
    }
    loadCities();
  }, []);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const filteredCities = useMemo(() => {
    const term = inputValue.toLowerCase().trim();
    if (step?.id === 'city' && term.length >= 2) {
      return allCities.filter(c => c.toLowerCase().includes(term)).slice(0, 10);
    }
    return [];
  }, [allCities, inputValue, step?.id]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 350);
  }, [currentStep]);

  useEffect(() => {
    if (step) {
      const savedValue = answers[step.id];
      setInputValue(savedValue !== undefined ? savedValue : '');
    }
  }, [currentStep, step?.id]);

  const validateInput = (id: string, value: string): string | null => {
    if (id === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'E-mail inválido.';
    }
    if (id === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 12) return 'Telefone deve ter código do país + DDD + número.';
    }
    return null;
  };

  const goNext = useCallback(() => {
    if (!step) return;
    const val = inputValue.trim();
    if (step.required && !val) {
      setError('Este campo é obrigatório.');
      return;
    }
    if (val) {
      const validationError = validateInput(step.id, val);
      if (validationError) { setError(validationError); return; }
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
  }, [step, inputValue, currentStep, answers, steps.length]);

  const goPrev = () => {
    if (currentStep <= 0) {
      setAnswers({});
      setInputValue('');
      setError(null);
      setCurrentStep(0);
      return;
    }
    setDirection(-1);
    setCurrentStep(prev => prev - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); goNext(); }
  };

  const handleSubmit = async (data: Record<string, string>) => {
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          city: data.city ?? '',
          product: 'Curso de Inseminação Artificial em Bovinos',
          value: 197,
          interest: 'Curso de Inseminação Artificial em Bovinos',
          notes: 'Interesse principal: Curso de Inseminação Artificial em Bovinos',
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Erro ao enviar.');
      if (result.responsibleName) setSellerName(result.responsibleName);
      if (result.responsiblePhone) setSellerPhone(result.responsiblePhone);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const getWhatsAppLink = () => {
    const phone = sellerPhone ? sellerPhone.replace(/\D/g, '') : '5566999763455';
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const text = encodeURIComponent(`Olá! Sou o ${answers.name}, acabei de preencher o formulário no site e gostaria de saber mais sobre o Curso de Inseminação Artificial em Bovinos.`);
    return `https://api.whatsapp.com/send/?phone=${formattedPhone}&text=${text}`;
  };

  const variants = {
    enter: (dir: number) => ({ y: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (dir: number) => ({ y: dir < 0 ? 50 : -50, opacity: 0 }),
  };

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-emerald-950">
        <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/ia-bg.png")' }} />
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-emerald-950/85 via-green-900/70 to-teal-950/80" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        </div>
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
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-emerald-950">
      {/* Background image */}
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/ia-bg.png")' }} />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-emerald-950/85 via-green-900/70 to-teal-950/80" />
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
            <span className="text-emerald-400 text-xs font-bold">IA</span>
          </div>
          <span className="text-emerald-400 font-semibold text-sm tracking-wide">Target Agrotech</span>
        </div>
        <span className="text-emerald-500/60 text-sm font-medium">
          {currentStep + 1} / {steps.length}
        </span>
      </div>

      {/* Question content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
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
                    {step.question}
                    {step.required && <span className="text-emerald-400 ml-1">*</span>}
                  </h2>
                  {step.hint && <p className="text-emerald-300/60 text-base">{step.hint}</p>}
                </div>

                <div className="space-y-3">
                  <div className="relative space-y-2">
                    <input
                      ref={inputRef}
                      type={step.type}
                      value={inputValue}
                      list={step.id === 'city' ? 'cities-list-ia' : undefined}
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
                    {step.id === 'city' && (
                      <datalist id="cities-list-ia">
                        {filteredCities.map(city => (
                          <option key={city} value={city} />
                        ))}
                      </datalist>
                    )}
                  </div>

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
