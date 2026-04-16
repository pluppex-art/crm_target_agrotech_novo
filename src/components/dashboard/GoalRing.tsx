import React from 'react';

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
  size = 'md',
}: GoalRingProps) {
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  // SVG parameters — use a fixed viewBox so we don't need pathLength tricks
  const sizeMap = { sm: 120, md: 160, lg: 200 } as const;
  const svgSize = sizeMap[size];
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const sw = size === 'sm' ? 12 : size === 'md' ? 16 : 20;
  const r = cx - sw - 4;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (progress / 100) * circumference;

  const containerSize = { sm: 'w-24 h-24', md: 'w-36 h-36', lg: 'w-48 h-48' }[size];
  const centerBoxSize = { sm: 'w-12 h-12', md: 'w-16 h-16', lg: 'w-20 h-20' }[size];
  const percentFontSize = { sm: 'text-sm', md: 'text-xl', lg: 'text-2xl' }[size];

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className={`relative ${containerSize}`}>
        <svg
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="w-full h-full -rotate-90"
        >
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="hsl(210 20% 94%)"
            strokeWidth={sw}
          />
          {/* Progress arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`${centerBoxSize} bg-white rounded-xl border border-slate-100 shadow-lg flex flex-col items-center justify-center`}
          >
            <span className={`${percentFontSize} font-black text-slate-900 leading-none`}>
              {Math.round(progress)}%
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">
              {label}
            </span>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="text-center">
        <p className="text-sm font-bold text-slate-800">
          R$ {current.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
        <p className="text-xs text-slate-400">
          de R$ {target.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
      </div>
    </div>
  );
}
