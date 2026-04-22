import { getSupabaseClient } from '../lib/supabase';

const BUCKET = 'lead-files';

export type LeadFileType = 'payment_proof' | 'contract';

/**
 * Uploads a file and returns the public URL, or null on failure.
 * Path: lead-files/{leadId}/{fileType}/{filename}
 */
export async function uploadLeadFile(
  leadId: string,
  fileType: LeadFileType,
  file: File
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${leadId}/${fileType}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error('Error uploading lead file:', uploadError);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/**
 * Deletes a file from storage using its public URL.
 */
export async function deleteLeadFile(publicUrl: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // Extract path after the bucket name
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error('Error deleting lead file:', error);
}
