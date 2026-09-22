import 'server-only';
import { createClient } from '@supabase/supabase-js';
// Never use this client for user-facing financial reads or writes: it bypasses RLS.
export function createAdminClient() {
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key) throw new Error('Credencial administrativa não configurada.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
