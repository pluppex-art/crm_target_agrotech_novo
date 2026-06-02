import { getSupabaseClient } from '../lib/supabase';

const BUCKET = 'turma-files';

export interface TurmaFile {
  id: string;
  turma_id: string;
  name: string;
  url: string;
  file_type: 'image' | 'pdf';
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export async function getTurmaFiles(turmaId: string): Promise<TurmaFile[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('turma_files')
    .select('*')
    .eq('turma_id', turmaId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching turma files:', error); return []; }
  return data ?? [];
}

export async function uploadTurmaFile(
  turmaId: string,
  file: File,
  uploadedBy?: string
): Promise<TurmaFile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${turmaId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) { console.error('Error uploading turma file:', uploadError); return null; }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = urlData?.publicUrl;
  if (!url) return null;

  const fileType: 'image' | 'pdf' = file.type === 'application/pdf' ? 'pdf' : 'image';

  const { data, error: insertError } = await supabase
    .from('turma_files')
    .insert({
      turma_id: turmaId,
      name: file.name,
      url,
      file_type: fileType,
      size_bytes: file.size,
      uploaded_by: uploadedBy ?? null,
    })
    .select()
    .single();

  if (insertError) { console.error('Error saving turma file metadata:', insertError); return null; }
  return data;
}

export async function deleteTurmaFile(fileId: string, url: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const path = url.slice(idx + marker.length);
    await supabase.storage.from(BUCKET).remove([path]);
  }

  await supabase.from('turma_files').delete().eq('id', fileId);
}
