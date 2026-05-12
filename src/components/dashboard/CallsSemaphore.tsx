import { Phone } from 'lucide-react';
import { SemaphoreBarChart } from './SemaphoreBarChart';

interface SellerCallData {
  user_id: string;
  user_name: string;
  count: number;
  goal: number;
}

interface CallsSemaphoreProps {
  sellers: SellerCallData[];
  isAdmin: boolean;
  currentUserId?: string | null;
}

function barColor(count: number, goal: number): string {
  const pct = goal > 0 ? (count / goal) * 100 : 0;
  if (pct >= 100) return '#eab308';
  if (pct >= 80)  return '#10b981';
  if (pct >= 50)  return '#f59e0b';
  return '#ef4444';
}

export function CallsSemaphore({ sellers, isAdmin, currentUserId }: CallsSemaphoreProps) {
  const visible = isAdmin ? sellers : sellers.filter(s => s.user_id === currentUserId);

  const chartData = visible.map(s => ({
    label: s.user_name.split(' ')[0],
    value: s.count,
    sublabel: `${s.count}/${s.goal}`,
    color: barColor(s.count, s.goal),
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-800">Ligações do Dia — Vendedores</h3>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-100">
          <Phone className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px] font-bold text-blue-600">
            Meta: {visible[0]?.goal ?? 30}/dia
          </span>
        </div>
      </div>
      <SemaphoreBarChart
        data={chartData}
        emptyLabel="Nenhum vendedor encontrado"
        minBarWidth={72}
        chartHeight={200}
      />
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
        {[
          { label: 'Abaixo de 50%', color: '#ef4444' },
          { label: '50–80%',        color: '#f59e0b' },
          { label: '80–99%',        color: '#10b981' },
          { label: 'Meta atingida', color: '#eab308' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
