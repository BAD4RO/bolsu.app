/**
 * 🔒 CLIENTE SUPABASE ADMINISTRATIVO
 * 
 * ⚠️ ATENÇÃO: Este cliente usa SERVICE_ROLE_KEY e NUNCA deve ser usado no frontend!
 * 
 * Use APENAS em:
 * - Rotas API do Next.js (src/app/api/*)
 * - Server Actions
 * - Middleware (quando necessário operações admin)
 * 
 * NUNCA importe este arquivo em componentes cliente ou páginas!
 */

import { createClient } from '@supabase/supabase-js';

// Verificar se as variáveis de ambiente estão configuradas
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

/**
 * Cliente Supabase com privilégios administrativos
 * 
 * Este cliente bypassa Row Level Security (RLS) e deve ser usado
 * com extremo cuidado apenas em operações administrativas seguras.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Exemplo de uso seguro em uma rota API:
 * 
 * // src/app/api/admin/users/route.ts
 * import { supabaseAdmin } from '@/lib/supabase-admin';
 * 
 * export async function GET(request: Request) {
 *   // Verificar autenticação e autorização primeiro!
 *   const session = await getServerSession();
 *   if (!session || !session.user.isAdmin) {
 *     return new Response('Unauthorized', { status: 401 });
 *   }
 * 
 *   // Agora sim, usar o cliente admin
 *   const { data, error } = await supabaseAdmin
 *     .from('users')
 *     .select('*');
 * 
 *   return Response.json(data);
 * }
 */
