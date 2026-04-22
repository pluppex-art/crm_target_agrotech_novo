import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  MessageCircle,
  Loader2,
  Leaf,
  ArrowUp,
  AlertTriangle
} from 'lucide-react';
import { formatPhone } from '../lib/utils';

interface Step {
  id: string;
  question: string;
  hint?: string;
  type: 'text' | 'tel' | 'email' | 'select';
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

const productPrices: Record<string, number> = {
  'Curso de Inseminação Artificial em Bovinos': 1500,
  'Curso de Piloto de Drone Agrícola': 2500,
  'Outros': 0
};

export function PublicForm() {
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
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Busca cidades do IBGE
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
      } catch (err) {
        console.error('Erro ao carregar cidades:', err);
      }
    }
    loadCities();
  }, []);

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
    {
      id: 'interest',
      question: 'Quais áreas você tem mais interesse?',
      hint: 'Pode selecionar uma opção (Não obrigatório).',
      type: 'select',
      options: ['Curso de Inseminação Artificial em Bovinos', 'Curso de Piloto de Drone Agrícola', 'Outros'],
      required: false,
    },
  ];

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const filteredCities = useMemo(() => {
    const term = inputValue.toLowerCase().trim();
    if (step?.id === 'city' && term.length >= 2) {
      return allCities
        .filter(c => c.toLowerCase().includes(term))
        .slice(0, 10);
    }
    return [];
  }, [allCities, inputValue, step?.id]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 350);
  }, [currentStep]);

  useEffect(() => {
    if (step) {
      const savedValue = answers[step.id];
      if (savedValue !== undefined) {
        setInputValue(savedValue);
      } else {
        setInputValue('');
      }
    }
  }, [currentStep, step?.id]);

  const validateInput = (id: string, value: string): string | null => {
    if (id === 'name') {
      const parts = value.trim().split(/\s+/);
      if (parts.length < 2) return 'Por favor, digite seu nome completo.';
    }
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
      const notes = data.interest ? `Interesse principal: ${data.interest}` : '';

      const resp = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          city: data.city ?? '',
          product: data.interest || 'Interesse Geral',
          value: productValue,
          interest: data.interest,
          notes: notes
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
    const interestStr = answers.interest ? ` sobre ${answers.interest}` : '';
    const text = encodeURIComponent(`Olá! Sou o ${answers.name}, acabei de preencher o formulário no site e gostaria de saber mais${interestStr}.`);
    return `https://api.whatsapp.com/send/?phone=${formattedPhone}&text=${text}`;
  };

  const variants = {
    enter: (direction: number) => ({
      y: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      y: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      y: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  // ── Tela de sucesso ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-emerald-950">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url("/drone-bg.png")',
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-emerald-950/95 via-emerald-900/80 to-teal-950/90" />

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-emerald-400/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Recebemos!</h2>
            <p className="text-emerald-100/80 text-lg mb-8">
              Obrigado, <span className="text-white font-bold">{answers.name?.split(' ')[0]}</span>! 
              {sellerName ? ` O consultor ${sellerName} ` : ' Nossa equipe '} 
              entrará em contato em breve pelo WhatsApp.
            </p>

            <div className="flex flex-col gap-4">
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-emerald-900/20"
              >
                <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                Falar no WhatsApp
              </a>
            </div>

            <p className="text-emerald-400/60 text-sm mt-8">Target Agrotech • CRM</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-emerald-950">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("/drone-bg.png")',
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-emerald-950/95 via-emerald-900/80 to-teal-950/90" />

      {/* Decoração Adicional */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
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
                        onChange={e => {
                          setInputValue(e.target.value);
                          setError(null);
                        }}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent border-0 border-b-2 border-emerald-500/50 focus:border-emerald-400 outline-none text-white text-xl py-3 appearance-none cursor-pointer transition-colors pr-8"
                        style={{ background: 'transparent' }}
                      >
                        <option value="" disabled={step.required} style={{ background: '#064e3b', color: '#fff' }}>
                          Selecione uma opção...
                        </option>
                        {(step.options || []).map(p => (
                          <option key={p} value={p} style={{ background: '#064e3b', color: '#fff' }}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none w-5 h-5" />
                    </div>
                  ) : (
                    <div className="relative space-y-2">
                      <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type={step.type}
                        value={inputValue}
                        list={step.id === 'city' ? 'cities-list' : undefined}
                        onChange={e => {
                          let val = e.target.value;
                          if (step.type === 'tel') {
                            val = formatPhone(val);
                          }
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
                        <datalist id="cities-list">
                          {filteredCities.map(city => (
                            <option key={city} value={city} />
                          ))}
                        </datalist>
                      )}
                    </div>
                  )}

                  {error && (
                    <p className="text-red-300 font-bold text-sm flex items-center gap-2 animate-pulse">
                      <AlertTriangle size={14} /> {error}
                    </p>
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
              className={`h-1 rounded-full transition-all duration-300 ${i === currentStep
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
