import React from 'react';
import { BookOpen, XCircle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Turma, TurmaAttendee, AttendanceStatus } from '../store/useTurmaStore';
import { getSupabaseClient } from '../lib/supabase';
import { Lead } from '../types/leads';

export const totalVendasTurma = (turma: Turma): number =>
  (turma.attendees || []).reduce((sum: number, a) => sum + (a.vendas || 0), 0);

export const TURMA_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  em_andamento: { label: 'Em Andamento', color: 'bg-emerald-100 text-emerald-700' },
  concluida: { label: 'Concluída', color: 'bg-slate-100 text-slate-600' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-600' },
};

export const STATUS_COLUMNS: Array<{
  id: AttendanceStatus; 
  label: string; 
  color: string; 
  bg: string;
  icon: React.ReactNode;
}> = [
  { 
    id: 'matriculado', 
    label: 'Matriculado', 
    color: 'text-blue-600', 
    bg: 'bg-blue-50 border-blue-200',
    icon: React.createElement(BookOpen, { size: 14, className: "text-blue-600" })
  },
  { 
    id: 'cancelado', 
    label: 'Cancelado', 
    color: 'text-red-500', 
    bg: 'bg-red-50 border-red-200',
    icon: React.createElement(XCircle, { size: 14, className: "text-red-500" })
  },
  { 
    id: 'indeciso', 
    label: 'Indeciso', 
    color: 'text-amber-600', 
    bg: 'bg-amber-50 border-amber-200',
    icon: React.createElement(HelpCircle, { size: 14, className: "text-amber-600" })
  },
  { 
    id: 'confirmado', 
    label: 'Confirmado', 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50 border-emerald-200',
    icon: React.createElement(CheckCircle2, { size: 14, className: "text-emerald-600" })
  },
];

// ── Fetch a full Lead from Supabase by id ────────────────────────────────────
export async function fetchLeadById(leadId: string): Promise<Lead | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
  if (error) { 
    console.error('Error fetching lead:', error); 
    return null; 
  }
  return data as Lead;
}



