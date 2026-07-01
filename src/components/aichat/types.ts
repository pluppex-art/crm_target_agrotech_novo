export type Platform = 'whatsapp' | 'instagram' | 'email';

export type LeadModalTab = 'info' | 'history' | 'notes' | 'tasks' | 'turma' | 'checklist';

export interface AttachedFile {
  name: string;
  type: string;
  url: string;
}

export interface Message {
  id: string;
  sender: 'me' | 'contact';
  content: string;
  timestamp: string;
  ack?: number;
  isNote?: boolean;
  file?: AttachedFile;
}

export interface Chat {
  id: string;
  initials: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  platform: Platform;
  color: string;
  phone: string;
}
