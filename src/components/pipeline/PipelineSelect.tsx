import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { PipelineWithStages } from '../../types/pipelines';
import { cn } from '../../lib/utils';

interface PipelineSelectProps {
  pipelines: PipelineWithStages[];
  currentPipelineId: string | undefined;
  onPipelineChange: (pipelineId: string) => void;
  className?: string;
  buttonClassName?: string;
}

export const PipelineSelect: React.FC<PipelineSelectProps> = ({
  pipelines,
  currentPipelineId,
  onPipelineChange,
  className,
  buttonClassName
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const currentPipeline = pipelines.find(p => p.id === currentPipelineId) || pipelines[0];

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all group hover:border-gray-300 dark:border-slate-600",
          buttonClassName
        )}
      >
        <span className="font-bold text-gray-800 dark:text-slate-200 truncate">
          {currentPipeline?.name || 'Carregando pipelines...'}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {pipelines.length > 0 && (
        <div className={cn("absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50", !isOpen && "hidden")}>
          {pipelines.map(pipeline => (
            <button
              key={pipeline.id}
              onClick={() => {
                onPipelineChange(pipeline.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:bg-slate-800 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <span className="font-bold text-gray-800 dark:text-slate-200">{pipeline.name}</span>
              {pipeline.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{pipeline.description}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

