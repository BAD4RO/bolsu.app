import { createClient } from '@supabase/supabase-js';
import { billingConfig } from '../src/lib/billing/config';
import { stripeClient } from '../src/lib/billing/provider';
import { validatePrice } from '../src/lib/billing/domain';

// Read-only preflight. Never print credentials, SDK errors or customer data.
async function main() {
  const required = ['BOLSU_BILLING_MODE', 'BOLSU_APP_URL', 
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PREMIUM_MONTHLY_PRICE_ID', 'STRIPE_PREMIUM_YEARLY_PRICE_ID',
    'SUPABASE_SERVICE_ROLE_KEY', 'BOLSU_BILLING_RECONCILE_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length) throw new Error('Campos ausentes: ' + missing.join(', '));
  const config = billingConfig();
  if (!config) throw new Error('Configuração inválida: confira modo, chaves, IDs, UUIDs e URL do mesmo ambiente.');
  if (process.env.BOLSU_BILLING_RECONCILE_SECRET!.length < 32) {
    throw new Error('O segredo da reconciliação precisa ter pelo menos 32 caracteres.');
  }
  const stripe = stripeClient(config);
  for (const cycle of ['monthly', 'yearly'] as const) {
    try {
      validatePrice(await stripe.prices.retrieve(config[cycle]), cycle, true, config.livemode);
    } catch {
      throw new Error(`Stripe: não foi possível validar o preço ${cycle}. Confira acesso, ambiente, BRL, valor e recorrência.`);
    }
    console.log(`OK: preço ${cycle} validado pela API da Stripe.`);
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, config.serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const {error:modeError}=await supabase.rpc('bolsu_billing_assert_mode',{p_live:config.livemode});
  if(modeError)throw new Error('Supabase: aplique a migration de billing e confira o ambiente do banco.');
  for (const id of config.users) {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(id);
      if (error || !data.user?.email_confirmed_at) throw new Error();
    } catch {
      throw new Error('Supabase: confira service_role e os UUIDs das contas de teste com e-mail confirmado.');
    }
  }
  console.log('OK: contas autorizadas existem e têm e-mail confirmado.');
  console.log('Pré-verificação concluída. Checkout, entrega de webhook, renovação e cancelamento ainda exigem homologação ponta a ponta.');
}

main().catch(error => {
  // Only our deliberately sanitized messages reach the terminal.
  console.error(error instanceof Error ? error.message : 'Falha na pré-verificação.');
  process.exitCode = 1;
});
