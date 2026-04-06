import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Loader2, AlertCircle, ArrowLeft, CheckCircle, Info } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const { resetPassword } = useAuthStore();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setDebugLink(null);
    setIsSandbox(false);

    try {
      const result = await resetPassword(email);
      if (result.error) throw result.error;
      if (result.debugLink) setDebugLink(result.debugLink);
      if (result.isSandbox) setIsSandbox(true);
      setSuccess(true);
    } catch (err: any) {
      console.error('Erro ao processar reset:', err);
      if (err.message?.includes('timeout') || err.message?.includes('demorou muito')) {
        setError('A conexão com o servidor de e-mail falhou. Verifique se as credenciais SMTP no Supabase estão corretas.');
      } else {
        setError(err.message || 'Erro ao enviar e-mail de recuperação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="p-8 md:p-12">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 mb-6">
              <Mail className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 text-center">Recuperar Senha</h1>
            <p className="text-slate-500 mt-2 font-medium text-center">Enviaremos um link para redefinir sua senha</p>
          </div>

          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col items-center gap-4">
                <CheckCircle className="text-emerald-600 w-12 h-12" />
                <p className="text-emerald-800 font-bold">Solicitação Processada!</p>
                
                {isSandbox ? (
                  <div className="p-4 bg-amber-100/50 rounded-2xl border border-amber-200 text-amber-800 text-xs leading-relaxed">
                    <p className="font-bold mb-1">Aviso de Sandbox (Resend):</p>
                    O e-mail não pôde ser enviado porque sua conta Resend está em modo de teste e só envia para <b>pluppex@gmail.com</b>.
                  </div>
                ) : (
                  <p className="text-emerald-600 text-sm text-center">Se o e-mail existir e for válido, você receberá as instruções em breve.</p>
                )}

                <div className="mt-4 p-4 bg-white/50 rounded-2xl text-left w-full">
                  <div className="flex gap-2 text-emerald-700 mb-2">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-bold uppercase tracking-wider">Dica Importante</p>
                  </div>
                  <p className="text-[11px] text-emerald-600 leading-relaxed">
                    Se o e-mail não chegar em alguns minutos, verifique sua pasta de <b>Spam</b>. 
                    O Supabase tem um limite de 1 e-mail por hora para o mesmo usuário no plano gratuito.
                  </p>
                </div>

                {debugLink && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left w-full">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-2">Modo Desenvolvedor:</p>
                    <a 
                      href={debugLink} 
                      className="text-[11px] text-amber-700 font-bold underline break-all"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Clique aqui para redefinir agora (caso o e-mail atrase)
                    </a>
                  </div>
                )}
              </div>
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft size={18} />
                Voltar para o Login
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
              {error && (
                <div className="space-y-4">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium"
                  >
                    <AlertCircle size={18} className="shrink-0" />
                    {error}
                  </motion.div>
                  
                  {error.includes('SMTP') && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Info size={14} /> Como resolver:
                      </p>
                      <ul className="text-[11px] text-slate-600 space-y-1 list-disc ml-4">
                        <li>Verifique se o <b>SMTP Host</b> é <code>smtp.resend.com</code></li>
                        <li>A porta deve ser <b>587</b> (TLS)</li>
                        <li>O usuário é sempre <code>resend</code></li>
                        <li>A senha é a sua <b>API Key</b> do Resend</li>
                        <li>O <b>Sender Email</b> deve ser um domínio verificado no Resend</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 font-medium"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                Enviar Link de Recuperação
              </button>

              <div className="text-center">
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-colors text-sm"
                >
                  <ArrowLeft size={18} />
                  Voltar para o Login
                </Link>
              </div>
            </form>
          )}

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              CRM v1.0.4 • Target Agrotech
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
