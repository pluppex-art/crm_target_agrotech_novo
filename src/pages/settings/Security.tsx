import React from 'react';
import { Lock, Shield, Key, Save } from 'lucide-react';

export function Security() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Segurança</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Altere sua senha e autenticação.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Alterar Senha</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Senha Atual</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 dark:text-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nova Senha</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 dark:text-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confirmar Nova Senha</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Autenticação de Dois Fatores (2FA)</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 gap-4">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Ativar 2FA</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Adicione uma camada extra de segurança à sua conta.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2">
              <Save size={18} />
              Atualizar Segurança
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
