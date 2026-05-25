import { useState, useEffect } from 'react';
import { History, Search, Loader2 } from 'lucide-react';
import { auditService, AuditLogData } from '../../services/auditService';

export function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getLogs(200);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#f3f6f9] dark:bg-transparent">
      <div className="bg-white dark:bg-slate-900 px-6 py-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
            <History className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Histórico de Auditoria</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Veja tudo o que aconteceu no sistema.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por usuário, ação ou entidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              />
            </div>
            <button 
              onClick={fetchLogs}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 transition-colors"
            >
              Atualizar
            </button>
          </div>

          <div className="flex-1 overflow-auto p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Carregando histórico...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-slate-400">
                <p className="font-medium text-sm">Nenhum registro encontrado.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data / Hora</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuário</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ação</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Módulo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-800 dark:text-slate-200 font-bold">
                        {log.user_name || 'Usuário Desconhecido'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 rounded-md text-xs font-bold font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400 capitalize">
                        {log.entity_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
