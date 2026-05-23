import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export function MetricCard({ label, value, sub, icon: Icon, color }: MetricCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative overflow-hidden bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 flex flex-col gap-4 group"
    >
      {/* Decorative gradient blob in the background */}
      <div className={cn("absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all duration-500 group-hover:opacity-20 group-hover:scale-150", color.split(' ')[0].replace('text-', 'bg-').replace('bg-', 'bg-'))} />
      
      <div className="flex items-center justify-between relative z-10">
        <span className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm', color)}>
          <Icon className="w-6 h-6" />
        </span>
      </div>
      <div className="relative z-10">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
        {sub && <p className="text-sm font-medium text-slate-400 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}
