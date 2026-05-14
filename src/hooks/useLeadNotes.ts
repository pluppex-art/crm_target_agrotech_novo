import { useState, useEffect } from 'react';
import { noteService, Note } from '../services/noteService';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileStore } from '../store/useProfileStore';
import { resetLeadAlerts } from '../services/alertService';

interface UseLeadNotesProps {
  leadId: string;
}

export const useLeadNotes = ({ leadId }: UseLeadNotesProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const { user } = useAuthStore();
  const { profiles } = useProfileStore();

  useEffect(() => {
    if (leadId) {
      loadNotes();
    }

    const handleRefresh = (e: any) => {
      if (e.detail?.leadId === leadId) {
        loadNotes();
      }
    };

    window.addEventListener('refresh-lead-notes', handleRefresh);
    return () => window.removeEventListener('refresh-lead-notes', handleRefresh);
  }, [leadId]);

  const loadNotes = async () => {
    setLoadingNotes(true);
    const fetchedNotes = await noteService.getNotesByLeadId(leadId);
    setNotes(fetchedNotes);
    setLoadingNotes(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const profileName = profiles.find(p => p.id === user?.id)?.name;
    const authorName = profileName || user?.user_metadata?.full_name || user?.email || 'Usuário';
    const note = await noteService.createNote({
      content: newNote,
      lead_id: leadId,
      author_id: user?.id ?? '',
      author_name: authorName,
    });
    if (note) {
      setNotes([note, ...notes]);
      setNewNote('');
      resetLeadAlerts(leadId);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const success = await noteService.deleteNote(noteId);
    if (success) {
      setNotes(notes.filter(n => n.id !== noteId));
    }
  };

  return {
    notes,
    newNote,
    loadingNotes,
    setNewNote,
    loadNotes,
    handleAddNote,
    handleDeleteNote,
  };
};

