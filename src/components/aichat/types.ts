export type Platform = 'whatsapp' | 'instagram' | 'email';

export type LeadModalTab = 'info' | 'history' | 'notes' | 'tasks' | 'turma' | 'checklist';

export interface AttachedFile {
  name: string;
  type: string;
  url: string;
}

export interface Message {
  id: string;              // waha_msg_id — chave de dedup entre WS e Realtime
  sender: 'me' | 'contact';
  senderType?: 'human' | 'ai' | 'client'; // quem realmente enviou no backend
  content: string;
  timestamp: string;
  ack?: number;            // 0=sending 1=sent 2=delivered 3=read -1=failed
  isNote?: boolean;
  file?: AttachedFile;
  msgType?: string;
  mediaUrl?: string;
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
