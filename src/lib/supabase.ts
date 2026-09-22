import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

// The same cookie-backed session is shared by browser, middleware and API routes.
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
export type { Database } from './database.types';
