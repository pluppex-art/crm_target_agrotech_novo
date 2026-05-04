import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Loader2, BarChart3, RefreshCw } from 'lucide-react';
import { dreService } from '../../services/dreService';
import { DreReport } from '../../types/finance_v2';
import { cn, fmt } from '../../lib/utils';

export function DreTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [report, setReport] = useState<DreReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dreService.generateReport({ startDate, endDate });
      setReport(data);
    } catch (err) {
      setError('Erro ao gerar o DRE. Verifique a conexão e tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const hasData = report && report.lines.some(l => l.value !== 0);

  return (
    <div className="space-y-6">
      {/* Margin Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MarginCard label="Margem Bruta" value={report.margins.bruta} icon={TrendingUp} colorClass="emerald" />
          <MarginCard label="Margem EBITDA" value={report.margins.ebitda} icon={BarChart3} colorClass="indigo" />
          <MarginCard label="Margem Líquida" value={report.margins.liquida} icon={TrendingDown} colorClass="violet" />
        </div>
      )}

      {/* DRE Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">DRE Gerencial</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Demonstração de Resultado do Exercício — apenas transações PAGAS.
            </p>
          </div>
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            title="Atualizar"
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin')} />
          </button>
        </div>

        <div className="min-h-[400px]">
          {isLoading && !report ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
              <p className="text-slate-500 text-sm">Gerando DRE...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 p-6">
              <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
              <p className="text-rose-600 font-semibold text-center">{error}</p>
              <button onClick={loadReport} className="mt-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-100 transition-colors">
                Tentar novamente
              </button>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center h-64 p-6">
              <BarChart3 className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma transação PAGA neste período.</p>
              <p className="text-slate-400 text-sm mt-1">Ajuste o filtro de datas ou registre novas transações.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {report!.lines.map((line, idx) => (
                  <DreRow key={line.id} line={line} isLast={idx === report!.lines.length - 1} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function MarginCard({ label, value, icon: Icon, colorClass }: { label: string; value: number; icon: any; colorClass: string }) {
  const isPositive = value >= 0;
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  };
  return (
    <div className={cn('rounded-2xl border p-5 flex items-center gap-4', colorMap[colorClass])}>
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-white/70 shadow-sm')}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-2xl font-extrabold">
          {isPositive ? '+' : ''}{value.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

function DreRow({ line, isLast }: { line: { id: string; label: string; value: number; isTotal: boolean }; isLast: boolean }) {
  const isPositive = line.value >= 0;
  const isDeduction = !line.isTotal && !isPositive;
  return (
    <tr className={cn(
      'transition-colors',
      line.isTotal ? 'bg-slate-50 border-y border-slate-200' : 'hover:bg-slate-50/50',
      isLast ? 'bg-emerald-50 border-y-2 border-emerald-200' : ''
    )}>
      <td className={cn('px-6 py-3.5', line.isTotal ? 'pl-6' : 'pl-10')}>
        <span className={cn(
          line.isTotal ? 'font-bold text-slate-800' : 'text-slate-600',
          isLast ? 'text-emerald-800 font-extrabold' : ''
        )}>
          {line.isTotal ? '' : <span className="text-slate-300 mr-2">└</span>}
          {line.label}
        </span>
      </td>
      <td className="px-6 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          {isDeduction ? (
            <Minus size={14} className="text-rose-400" />
          ) : isPositive ? (
            <TrendingUp size={14} className={cn(line.isTotal ? 'text-emerald-500' : 'text-slate-300')} />
          ) : null}
          <span className={cn(
            line.isTotal ? 'font-bold text-base' : 'font-medium',
            isPositive ? (line.isTotal ? 'text-emerald-700' : 'text-slate-700') : 'text-rose-600',
            isLast ? 'text-emerald-700 font-extrabold text-lg' : ''
          )}>
            {isPositive ? '+' : '-'} R$ {fmt(Math.abs(line.value))}
          </span>
        </div>
      </td>
    </tr>
  );
}
