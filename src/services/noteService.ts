import { getSupabaseClient } from '../lib/supabase';

export interface Note {
  id: string;
  created_at: string;
  content: string;
  lead_id: string;
  author_name?: string;
}

export const noteService = {
  async getNotesByLeadId(leadId: string): Promise<Note[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }

    return data as Note[];
  },

  async createNote(note: Omit<Note, 'id' | 'created_at'>): Promise<Note | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('notes')
      .insert([note])
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return null;
    }

    return data as Note;
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
  }
};
