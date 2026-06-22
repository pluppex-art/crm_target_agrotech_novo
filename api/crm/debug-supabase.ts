import { createClient } from '@supabase/supabase-js';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    ok: true,
    supabase_imported: typeof createClient === 'function',
    has_supabase_url: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_target_key: !!process.env.TARGET_API_KEY,
  });
}
