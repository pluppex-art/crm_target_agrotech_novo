import { supabase } from '../lib/supabase';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type WaMsgSender = 'client' | 'ai' | 'human';
export type WaMsgStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WaMessage {
  id: string;
  waha_msg_id: string;
  chat_id: string;
  phone: string | null;
  sender: WaMsgSender;
  content: string | null;
  msg_type: string;
  media_url: string | null;
  status: WaMsgStatus;
  created_at: string;
  raw_payload: Record<string, unknown> | null;
}

export type WaMessageInsert = Omit<WaMessage, 'id' | 'created_at'>;

// Cast para bypass do tipo gerado — necessário até regenerar types após a migration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as SupabaseClient<any>;

export const whatsappMessageService = {
  async fetchMessages(chatId: string, limit = 50): Promise<WaMessage[]> {
    const { data, error } = await db
      .from('whatsapp_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as WaMessage[];
  },

  async insert(msg: WaMessageInsert): Promise<WaMessage> {
    const { data, error } = await db
      .from('whatsapp_messages')
      .insert(msg)
      .select()
      .single();
    if (error) throw error;
    return data as WaMessage;
  },

  async upsert(msg: WaMessageInsert): Promise<void> {
    await db
      .from('whatsapp_messages')
      .upsert(msg, { onConflict: 'waha_msg_id', ignoreDuplicates: true });
  },

  async updateStatus(wahaMsgId: string, status: WaMsgStatus): Promise<void> {
    await db
      .from('whatsapp_messages')
      .update({ status })
      .eq('waha_msg_id', wahaMsgId);
  },

  subscribe(
    onInsert: (msg: WaMessage) => void,
    onUpdate: (msg: WaMessage) => void,
  ): RealtimeChannel {
    return supabase
      .channel('whatsapp-messages-rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload) => onInsert(payload.new as WaMessage),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' },
        (payload) => onUpdate(payload.new as WaMessage),
      )
      .subscribe();
  },
};
