import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ArrowUp, ChevronDown, CheckCircle2, Loader2, Leaf, MessageCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// ── Supabase anon client (só leitura de produtos) ──────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = supabaseUrl && supabaseAnon
  ? createClient(supabaseUrl, supabaseAnon)
  : null;

const WHATSAPP_URL = 'https://api.whatsapp.com/send/?phone=5566999763455&text&type=phone_number&app_absent=0';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Step {
  id: string;
  question: string;
  hint?: string;
  type: 'text' | 'email' | 'tel' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

// ── Animações ──────────────────────────────────────────────────────────────
const variants = {
  enter: (dir: number) => ({
    y: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { y: 0, opacity: 1 },
  exit: (dir: number) => ({
    y: dir > 0 ? -60 : 60,
    opacity: 0,
  }),
};

// ── Componente ─────────────────────────────────────────────────────────────
export function PublicForm() {
  const [products, setProducts] = useState<string[]>([]);
  const [productPrices, setProductPrices] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Bloqueia o botão "voltar" do navegador
  // Usa capture:true para interceptar antes do React Router processar o evento
  const submittedRef = useRef(false);
  submittedRef.current = submitted;
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = (e: PopStateEvent) => {
      if (!submittedRef.current) {
        e.stopImmediatePropagation();
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.addEventListener('popstate', handlePopState, true);
    return () => window.removeEventListener('popstate', handlePopState, true);
  }, []);

  // Busca produtos do banco
  useEffect(() => {
    async function loadProducts() {
      if (!supabase) return;
      const { data } = await supabase
        .from('products')
        .select('name, price')
        .order('name', { ascending: true });
      if (data) {
        setProducts(data.map((p: any) => p.name));
        const priceMap: Record<string, number> = {};
        data.forEach((p: any) => { priceMap[p.name] = Number(p.price) || 0; });
        setProductPrices(priceMap);
      }
    }
    loadProducts();
  }, []);

  const cities = [
    'Sinop - MT',
    'Sorriso - MT',
    'Lucas do Rio Verde - MT',
    'Cuiabá - MT',
    'Rondonópolis - MT',
    'Primavera do Leste - MT',
    'Nova Mutum - MT',
    'Tangará da Serra - MT',
    'Outra cidade'
  ];

  const steps: Step[] = [
    {
      id: 'name',
      question: 'Qual é o seu nome completo?',
      hint: 'Digite seu nome e sobrenome.',
      type: 'text',
      placeholder: 'Ex: João Silva',
      required: true,
    },
    {
      id: 'phone',
      question: 'Qual é o seu WhatsApp?',
      hint: 'Com DDD. Ex: (66) 99999-9999',
      type: 'tel',
      placeholder: '(00) 00000-0000',
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
      hint: 'Selecione sua cidade.',
      type: 'select',
      options: cities,
      required: true,
    },
    {
      id: 'interest',
      question: 'Quais áreas você tem mais interesse?',
      hint: 'Pode selecionar uma opção (Não obrigatório).',
      type: 'select',
      options: ['IA (Inteligência Artificial)', 'Drones', 'IA & Drones', 'Outros'],
      required: false,
    },
    {
      id: 'product',
      question: 'Deseja algum curso específico agora?',
      hint: 'Selecione se já souber qual curso quer.',
      type: 'select',
      options: products,
      required: false,
    },
  ];

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Foca o input ao trocar de etapa
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 350);
  }, [currentStep]);

  // Pré-preenche o input com a resposta já salva (ao voltar)
  useEffect(() => {
    if (step) {
      setInputValue(answers[step.id] ?? (step.type === 'select' && products.length > 0 ? products[0] : ''));
    }
  }, [currentStep, step?.id]);

  const validateInput = (id: string, value: string): string | null => {
    if (id === 'name') {
      const parts = value.trim().split(/\s+/);
      if (parts.length < 2) return 'Por favor, digite seu nome completo.';
      if (value.length < 3) return 'Nome muito curto.';
    }
    if (id === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'E-mail inválido.';
    }
    if (id === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10) return 'Telefone deve ter DDD + número.';
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
      if (validationError) {
        setError(validationError);
        return;
      }
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
      // Reinicia o formulário ao invés de sair para o CRM
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
    if (e.key === 'Enter') {
      e.preventDefault();
      goNext();
    }
  };

  const handleSubmit = async (data: Record<string, string>) => {
    setSubmitting(true);
    setError(null);
    try {
      const productValue = data.product ? (productPrices[data.product] ?? 0) : 0;
      // Combina interesse com curso no histórico ou notas se necessário
      const notes = data.interest ? `Interesse principal: ${data.interest}` : '';
      
      const resp = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          city: data.city ?? '',
          product: data.product || 'Interesse Geral',
          value: productValue,
          notes: notes
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Erro ao enviar.');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Tela de sucesso ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-emerald-400/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Recebemos!</h2>
          <p className="text-emerald-200 text-lg leading-relaxed mb-8">
            Obrigado, <strong className="text-white">{answers.name?.split(' ')[0]}</strong>! Nossa equipe entrará em contato em breve pelo WhatsApp.
          </p>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-400 text-white font-bold text-lg rounded-2xl transition-all duration-200 shadow-xl shadow-green-900/50"
          >
            <MessageCircle className="w-5 h-5" />
            Falar no WhatsApp
          </a>

          <p className="text-emerald-400/60 text-sm mt-8">Target Agrotech • CRM</p>
        </motion.div>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex flex-col relative overflow-hidden">
      {/* Decoração */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Barra de progresso */}
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
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-emerald-400 font-semibold text-sm tracking-wide">Target Agrotech</span>
        </div>
        <span className="text-emerald-500/60 text-sm font-medium">
          {currentStep + 1} / {steps.length}
        </span>
      </div>

      {/* Conteúdo da pergunta */}
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
                {/* Número da pergunta */}
                <div className="flex items-center gap-2 text-emerald-400/70 text-sm font-medium">
                  <span className="w-6 h-6 rounded-full border border-emerald-500/40 flex items-center justify-center text-xs font-bold">
                    {currentStep + 1}
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </div>

                {/* Pergunta */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">
                    {step.question}
                    {step.required && <span className="text-emerald-400 ml-1">*</span>}
                  </h2>
                  {step.hint && (
                    <p className="text-emerald-300/60 text-base">{step.hint}</p>
                  )}
                </div>

                {/* Input */}
                <div className="space-y-3">
                  {step.type === 'select' ? (
                    <div className="relative">
                      <select
                        ref={inputRef as React.RefObject<HTMLSelectElement>}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent border-0 border-b-2 border-emerald-500/50 focus:border-emerald-400 outline-none text-white text-xl py-3 appearance-none cursor-pointer transition-colors pr-8"
                        style={{ background: 'transparent' }}
                      >
                        <option value="" disabled style={{ background: '#064e3b', color: '#fff' }}>
                          Selecione um curso...
                        </option>
                        {products.map(p => (
                          <option key={p} value={p} style={{ background: '#064e3b', color: '#fff' }}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none w-5 h-5" />
                    </div>
                  ) : (
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type={step.type}
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={step.placeholder}
                      className="w-full bg-transparent border-0 border-b-2 border-emerald-500/50 focus:border-emerald-400 outline-none text-white text-xl py-3 placeholder:text-emerald-600/50 transition-colors"
                      autoComplete={step.type === 'email' ? 'email' : step.type === 'tel' ? 'tel' : 'name'}
                    />
                  )}

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}
                </div>

                {/* Botão continuar */}
                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={goNext}
                    disabled={submitting || (step.required && !inputValue.trim())}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/50"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    {currentStep < steps.length - 1 ? 'Continuar' : 'Enviar'}
                    {!submitting && <ArrowRight className="w-4 h-4" />}
                  </button>
                  <span className="text-emerald-600/60 text-xs hidden sm:block">
                    ou pressione <kbd className="font-mono bg-emerald-900/60 border border-emerald-700/50 rounded px-1.5 py-0.5 text-emerald-400">Enter</kbd>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navegação inferior */}
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
                i === currentStep
                  ? 'w-6 bg-emerald-400'
                  : i < currentStep
                  ? 'w-3 bg-emerald-600'
                  : 'w-3 bg-emerald-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
