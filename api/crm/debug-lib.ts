import { setCors } from '../_lib/crm';

export default function handler(req: any, res: any) {
  setCors(res, 'GET, OPTIONS');
  res.json({
    ok: true,
    has_supabase_url: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_target_key: !!process.env.TARGET_API_KEY,
    node_env: process.env.NODE_ENV,
  });
}
