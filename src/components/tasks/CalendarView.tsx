import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Task } from '../../services/taskService';

interface CalendarViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string, currentStatus: string) => void;
}

export function CalendarView({ tasks, onToggleStatus }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const totalDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const days = [];
  // Fill empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-32 border border-slate-100 bg-slate-50/30" />);
  }

  // Fill days of the month
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = tasks.filter(task => task.due_date?.startsWith(dateStr));
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

    days.push(
      <div key={day} className={cn(
        "h-32 border border-slate-100 p-2 overflow-y-auto hover:bg-slate-50 transition-colors",
        isToday && "bg-emerald-50/30"
      )}>
        <div className="flex justify-between items-center mb-1">
          <span className={cn(
            "text-xs font-bold",
            isToday ? "text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full" : "text-slate-400"
          )}>
            {day}
          </span>
          {dayTasks.length > 0 && (
            <span className="text-[10px] font-bold text-slate-400">
              {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
            </span>
          )}
        </div>
        <div className="space-y-1">
          {dayTasks.map(task => (
            <div 
              key={task.id}
              onClick={() => onToggleStatus(task.id, task.status)}
              className={cn(
                "text-[10px] p-1 rounded border cursor-pointer truncate transition-all",
                task.status === 'completed' 
                  ? "bg-slate-100 border-slate-200 text-slate-400 line-through" 
                  : cn(
                      "border-l-4",
                      task.priority === 'high' ? "bg-red-50 border-red-500 text-red-700" :
                      task.priority === 'medium' ? "bg-amber-50 border-amber-500 text-amber-700" :
                      "bg-blue-50 border-blue-500 text-blue-700"
                    )
              )}
              title={task.title}
            >
              {task.title}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
          >
            Hoje
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7">
        {days}
      </div>
    </div>
  );
}
