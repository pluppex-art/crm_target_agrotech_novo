import type { Lead } from '../../types/leads';
import type { TurmaAttendee, AttendanceStatus, Turma } from '../../services/turmaService';
import React, { MouseEventHandler } from 'react';

export interface PipelineStageOption {
  id: string;
  title: string;
  color: string;
  name?: string;
}

export interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  pipelineStages?: PipelineStageOption[];
  currentStageId?: string;
  onStageChange?: (stageId: string) => void;
  turmaAttendee?: { turmaId: string; attendeeId: string; currentStatus: AttendanceStatus };
  onTurmaStatusChange?: (turmaId: string, attendeeId: string, status: AttendanceStatus) => void;
  responsibles?: string[];
}

export type TabType = 'info' | 'history' | 'notes' | 'tasks' | 'turma';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, { label: string; color: string }> = {
  matriculado: { label: 'Matriculado', color: 'bg-blue-100 text-blue-700' },
  confirmado: { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-700' },
  indeciso: { label: 'Indeciso', color: 'bg-amber-100 text-amber-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-600' },
};

export interface LeadInfoTabProps {
  lead: Lead;
  formData: any;
  products: any[];
  fieldErrors: any;
  whatsappUrl: string | null;
  calculateFinalValue: () => number;
  hoverStars: number;
  setHoverStars: (n: number) => void;
  updateFormField: (updates: any) => void;
  toggleField?: (field: string, value: any) => Promise<void>;
  handleSave: () => Promise<void>;
  isSaving: boolean;
  onDelete?: () => Promise<void>;
  onCancel: MouseEventHandler<HTMLButtonElement>;
  currentStageName?: string;
  showConfirmations?: boolean;
  responsibles?: string[];
  pixCompleted?: boolean;
  contractSigned?: boolean;
  onPixComplete?: (v: boolean) => void;
  onContractSign?: (v: boolean) => void;
}

