/**
 * Script para criar usuário admin no Supabase
 * 
 * Execute este script uma vez para criar o usuário admin:
 * npx tsx src/scripts/create-admin.ts
 */

import { createClient } from '@supabase/supabase-js';

// Credenciais do admin
const ADMIN_EMAIL = 'gabriellimabadaro@gmail.com';
const ADMIN_PASSWORD = 'admin.bolsuapp';

async function createAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Cliente com permissões de admin (service role)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log('🔄 Criando usuário admin...');

    // Criar usuário admin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Email já confirmado
      user_metadata: {
        is_admin: true,
        name: 'Admin BOLSU',
      },
    });

    if (error) {
      console.error('❌ Erro ao criar usuário:', error.message);
      process.exit(1);
    }

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Senha:', ADMIN_PASSWORD);
    console.log('👤 ID:', data.user?.id);

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    process.exit(1);
  }
}

createAdminUser();
