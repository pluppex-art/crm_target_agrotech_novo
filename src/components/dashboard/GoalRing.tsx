import React from 'react';
import { cn } from '../../lib/utils';
import { Target } from 'lucide-react';

interface GoalRingProps {
  current: number;
  target: number;
  label?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function GoalRing({ 
  current, 
  target, 
  label = 'Meta', 
  color = 'hsl(142, 71%, 45%)',
  size = 'md'
}: GoalRingProps) {
  const progress = Math.min((current / target) * 100, 100);
  const sizeMap = { sm: 80, md: 120, lg: 160 };
  const strokeWidth = size === 'sm' ? 10 : size === 'md' ? 14 : 18;
  const radius = (sizeMap[size as keyof typeof sizeMap] / 2) - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('p-4 rounded-2xl border bg-gradient-to-br', 
      size === 'sm' ? 'shadow-sm' : size === 'md' ? 'shadow-md' : 'shadow-xl',
      {
        'from-emerald-50 to-emerald-100 border-emerald-200': color.includes('emerald'),
        'from-blue-50 to-blue-100 border-blue-200': color.includes('blue'),
        'from-purple-50 to-purple-100 border-purple-200': color.includes('purple')
      }
    )}>
      <div className="relative mx-auto">
        {/* Background */}
        <svg className="w-full h-full -rotate-90 origin-center transform" viewBox={`0 0 ${sizeMap[size as keyof typeof sizeMap] * 2} ${sizeMap[size as keyof typeof sizeMap] * 2}`}>
          <circle
            cx={sizeMap[size as keyof typeof sizeMap]}
            cy={sizeMap[size as keyof typeof sizeMap]}
            r={radius}
            fill="none"
            stroke="hsl(210 20% 95%)"
            strokeWidth={strokeWidth}
          />
        </svg>

        {/* Progress */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 origin-center transform" viewBox={`0 0 ${sizeMap[size as keyof typeof sizeMap] * 2} ${sizeMap[size as keyof typeof sizeMap] * 2}`}>
          <circle
            cx={sizeMap[size as keyof typeof sizeMap]}
            cy={sizeMap[size as keyof typeof sizeMap]}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
            pathLength={1}
          />
        </svg>

        {/* Center */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="w-[70px] h-[70px] md:w-24 md:h-24 lg:w-28 lg:h-28 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white/60 shadow-2xl flex flex-col items-center justify-center">
            <div className="text-2xl lg:text-3xl font-black text-slate-900 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {Math.round(progress)}%
            </div>
            <div className="text-xs uppercase tracking-wider font-bold text-slate-500 mt-0.5">{label}</div>
          </div>
        </div>

        {/* Value overlay */}
        {progress < 100 && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 text-center">
            <div className="text-sm font-bold text-slate-900">
              R$ {current.toLocaleString('pt-BR')}
            </div>
            <div className="text-xs text-slate-500">de R$ {target.toLocaleString('pt-BR')}</div>
          </div>
        )}
      </div>
    </div>
  );
}

