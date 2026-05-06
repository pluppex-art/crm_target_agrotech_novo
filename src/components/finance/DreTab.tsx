import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Loader2, BarChart3, RefreshCw, Wallet, PiggyBank, Target } from 'lucide-react';
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
  const revenueLine = report?.lines.find(l => l.id === '1');
  const netProfitLine = report?.lines.find(l => l.id === '9');

  return (
    <div className="space-y-6">
      {/* ─── FLUXO E RECEITA BRUTA PRIMEIRO ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Revenue Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between shadow-sm border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita Bruta Total</p>
              <p className="text-2xl font-black text-slate-800 tracking-tighter">
                R$ {revenueLine ? fmt(revenueLine.value) : '0,00'}
              </p>
            </div>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm">
              <PiggyBank className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado Líquido</p>
              <p className={cn(
                "text-2xl font-black tracking-tighter",
                netProfitLine && netProfitLine.value >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                R$ {netProfitLine ? fmt(netProfitLine.value) : '0,00'}
              </p>
            </div>
          </div>
        </div>

        {/* Performance (Margem Líquida) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between shadow-sm border-l-4 border-l-violet-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100 shadow-sm">
              <Target className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Eficiência Líquida</p>
              <p className="text-2xl font-black text-slate-800 tracking-tighter">
                {report ? report.margins.liquida.toFixed(1) : '0.0'}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PERFORMANCES E MARGENS DETALHADAS ─── */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm border-l-4 border-l-emerald-500 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Margem Bruta</p>
                <p className="text-3xl font-black tracking-tighter text-emerald-600">{report.margins.bruta.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm border-l-4 border-l-indigo-500 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Margem EBITDA</p>
                <p className="text-3xl font-black tracking-tighter text-indigo-600">{report.margins.ebitda.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TABELA DE RESULTADOS ─── */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">DRE Gerencial</h2>
            <p className="text-sm text-slate-500 mt-1">Fluxo detalhado de transações <span className="font-bold text-emerald-600">PAGAS</span> no período.</p>
          </div>
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="p-3 hover:bg-slate-50 rounded-2xl transition-all border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100"
          >
            <RefreshCw size={20} className={cn(isLoading && 'animate-spin')} />
          </button>
        </div>

        <div className="p-2">
          {isLoading && !report ? (
            <div className="flex flex-col items-center justify-center h-80">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold">Consolidando dados financeiros...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-80 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-rose-500" />
              </div>
              <p className="text-rose-600 font-bold text-lg">{error}</p>
              <button onClick={loadReport} className="mt-6 px-8 py-3 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-100">
                Tentar novamente
              </button>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center h-80 p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <BarChart3 className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-slate-500 font-bold text-lg">Nenhum resultado financeiro no período.</p>
              <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">Confirme se as transações estão marcadas como pagas e se as categorias estão mapeadas corretamente.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <tbody>
                  {report!.lines.map((line, idx) => (
                    <DreRow key={line.id} line={line} isLast={idx === report!.lines.length - 1} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DreRow({ line, isLast }: { line: { id: string; label: string; value: number; isTotal: boolean }; isLast: boolean }) {
  const isPositive = line.value >= 0;
  const isDeduction = !line.isTotal && line.value < 0;
  
  return (
    <tr className={cn(
      'transition-all',
      line.isTotal ? 'bg-slate-50/80 border-y border-slate-100' : 'hover:bg-slate-50/50',
      isLast ? 'bg-emerald-50/50 border-t-2 border-emerald-100' : ''
    )}>
      <td className={cn('px-8 py-4.5', line.isTotal ? 'pl-8' : 'pl-14')}>
        <span className={cn(
          "tracking-tight",
          line.isTotal ? 'font-black text-slate-800 text-base' : 'font-medium text-slate-600',
          isLast ? 'text-emerald-900' : ''
        )}>
          {line.isTotal ? '' : <span className="text-slate-300 mr-3 text-xs">●</span>}
          {line.label}
        </span>
      </td>
      <td className="px-8 py-4.5 text-right">
        <div className="flex items-center justify-end gap-3">
          {isDeduction && (
            <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center">
              <Minus size={10} className="text-rose-500" />
            </div>
          )}
          <span className={cn(
            "font-black tracking-tighter",
            line.isTotal ? 'text-lg' : 'text-sm',
            isPositive ? (line.isTotal ? 'text-emerald-600' : 'text-slate-700') : 'text-rose-500',
            isLast ? 'text-emerald-600 text-xl' : ''
          )}>
            {isPositive ? '' : '- '}R$ {fmt(Math.abs(line.value))}
          </span>
        </div>
      </td>
    </tr>
  );
}
