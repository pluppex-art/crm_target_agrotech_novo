import { getSupabaseClient } from '../lib/supabase';

export interface Note {
  id: string;
  created_at: string;
  content: string;
  lead_id: string;
  author_id: string;
  author_name?: string;
}

export const noteService = {
  async getNotesByLeadId(leadId: string): Promise<Note[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('notes')
      .select('*, perfis!notes_author_id_fkey(name)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }

    return (data as any[]).map((row) => ({
      ...row,
      author_name: (row.perfis as { name?: string } | null)?.name ?? row.author_name ?? null,
      perfis: undefined,
    })) as Note[];
  },

  async createNote(note: Omit<Note, 'id' | 'created_at'>): Promise<Note | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('notes')
      .insert(note)
      .select('*, perfis!notes_author_id_fkey(name)')
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return null;
    }

    const row = data as any;
    return {
      ...row,
      author_name: (row.perfis as { name?: string } | null)?.name ?? row.author_name ?? null,
      perfis: undefined,
    } as Note;
  },

  async deleteNote(noteId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      return false;
    }

    return true;
  },

  async deleteLastCallNote(leadId: string, type: 'atendida' | 'nao_atendida'): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const label = type === 'atendida' ? 'Atendida' : 'Não Atendida';
    const pattern = `%Tentativa nº % - ${label}%`;

    const { data, error: fetchErr } = await supabase
      .from('notes')
      .select('id')
      .eq('lead_id', leadId)
      .like('content', pattern)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !data) return false;

    const { error: delErr } = await supabase
      .from('notes')
      .delete()
      .eq('id', (data as any).id);

    if (delErr) { console.error('deleteLastCallNote:', delErr); return false; }
    return true;
  },
};
