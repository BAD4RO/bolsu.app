/**
 * 🌐 CLIENTE SUPABASE PARA FRONTEND
 * 
 * ✅ SEGURO: Este cliente usa apenas ANON_KEY (pode ser exposto no navegador)
 * 
 * Row Level Security (RLS) garante que usuários só acessem seus próprios dados.
 * 
 * Use este cliente em:
 * - Componentes React (cliente e servidor)
 * - Páginas Next.js
 * - Hooks customizados
 * - Qualquer código que rode no navegador
 */

import { createClient } from '@supabase/supabase-js';

// Verificar se as variáveis de ambiente estão configuradas
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

/**
 * Cliente Supabase para uso no frontend
 * 
 * ✅ Usa ANON_KEY (seguro para navegador)
 * ✅ Respeita Row Level Security (RLS)
 * ✅ Usuários só acessam seus próprios dados
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Tipo de banco de dados (opcional - para TypeScript)
 * 
 * Para gerar tipos automáticos do seu schema Supabase:
 * npx supabase gen types typescript --project-id seu-project-id > src/lib/database.types.ts
 */
export type Database = any; // Substitua por tipos gerados se necessário
