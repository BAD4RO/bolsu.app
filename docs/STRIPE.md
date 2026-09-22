# Stripe do BOLSU

## Estado da implementação

Checkout hospedado em `mode: subscription`, mensal R$ 19,90 e anual R$ 199,90. Os Price IDs de teste fornecidos estão em `.env.local` e `.env.example`. O frontend redireciona para a URL da sessão; não precisa de Stripe.js nem da publishable key. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` está declarada e pode ficar vazia nesse fluxo.

As credenciais completas foram posteriormente preenchidas em `.env.local` e validadas contra Stripe e Supabase. Nenhuma chave real foi incluída em código. `.env.local` já é ignorado pelo Git. O segredo de reconciliação foi gerado localmente.

## Configuração

1. Preencha as três credenciais privadas em `.env.local` ou no gerenciador de secrets do deploy. Use a secret key da mesma conta/sandbox onde os dois Prices foram criados. Caso preencha a publishable key opcional, use o mesmo ambiente.
2. Confira as variáveis públicas do Supabase já existentes e `BOLSU_APP_URL` (localmente `http://localhost:3000`; no deploy, origem HTTPS sem caminho).
3. Aplique as migrations anteriores e `supabase/migrations/202609220008_stripe_subscription_sync.sql`, nessa ordem, ao Supabase de teste. As migrations 008 e 009 foram verificadas em PostgreSQL local via PGlite e aplicadas ao Supabase de teste conectado.
4. Mantenha `BOLSU_BILLING_MODE=test`. `BOLSU_BILLING_TEST_USER_IDS` aceita UUIDs separados por vírgula; vazio permite qualquer usuário autenticado no ambiente de teste.
5. Execute `pnpm billing:check`, depois `pnpm dev`.
6. Use uma conta Supabase autenticada em `/assinatura`.

## Webhook

Cadastre uma destination de eventos no ambiente de teste da mesma conta Stripe:

`https://SEU-DOMINIO/api/billing/webhook`

Use a versão de API `2026-08-26.dahlia`, correspondente ao SDK do projeto. O domínio público não foi fornecido. Não cadastre localhost no Dashboard; para desenvolvimento execute:

```sh
stripe login
stripe listen --all-snapshot --forward-to localhost:3000/api/billing/webhook
```

Copie o signing secret exibido pelo listener para `STRIPE_WEBHOOK_SECRET` e reinicie o servidor. No deploy, use o signing secret do endpoint cadastrado, que é diferente do segredo do listener.

Selecione estes eventos implementados:

```text
checkout.session.completed
checkout.session.expired
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
invoice.payment_action_required
invoice.voided
invoice.marked_uncollectible
charge.refunded
charge.dispute.created
charge.dispute.closed
```

O webhook valida `stripe-signature` sobre o corpo bruto e rejeita eventos de outro ambiente. Eventos são persistidos por ID; falhas retornam erro para nova entrega pela Stripe. A reconciliação consulta o estado atual na API Stripe, evitando regressão por eventos fora de ordem. A lease no banco impede escritas concorrentes obsoletas. O retorno da success URL não concede acesso.

Como recuperação complementar, o botão Atualizar pagamento consulta a Stripe no servidor. Também existe `POST /api/billing/reconcile`, protegido por `Authorization: Bearer <BOLSU_BILLING_RECONCILE_SECRET>`, que reprocessa a fila e os contratos. No ambiente local, a automação do Codex “Reconciliar assinaturas BOLSU local” chama esse endpoint a cada cinco minutos. Veja `docs/STRIPE-RELIABILITY.md`. Ao publicar, configure um agendador no servidor.

## Supabase e estados

Reutilizados `billing_orders`, `billing_events`, `billing_payments`, `subscriptions` e as RPCs existentes. `supabase_user_id` é incluído nas metadata de Customer, Checkout e Subscription; o ID vem da sessão autenticada no backend, nunca do corpo enviado pelo navegador.

A tabela `subscriptions` contém `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `subscription_status`, `plan`, `current_period_end` e `cancel_at_period_end`. O estado Stripe literal fica em `subscription_status`; o legado `status` mantém o contrato existente. `plan=premium` corresponde ao plano interno `plano=plus`, preservando as regras existentes do BOLSU.

- `active`: exige período de pagamento confirmado, sem reembolso/disputa.
- `trialing`: reconhece trial válido retornado pela Stripe até `trial_end`; o Checkout não cria trials.
- `past_due`: mantém somente o período anteriormente pago, sem prorrogá-lo por uma fatura não paga.
- `unpaid`, `incomplete`, `incomplete_expired`, `paused`: não concedem Premium.
- Cancelamento ao fim do período: mantém o período pago e sincroniza a flag real da Stripe. `canceled` também preserva um período já pago ainda vigente, segundo a política que o projeto já utilizava.

`current_period_end` representa o período contratual na Stripe; `stripe_access_until` controla a validade do acesso confirmado. Isso impede que uma renovação malsucedida estenda o acesso. A verificação de acesso usa o horário do banco e expira mesmo sem outro webhook.

O Customer Portal permite consultar faturas, atualizar cartão e cancelar ao fim do período. Troca de preço no meio da assinatura, cupons, rateios e impostos adicionais não fazem parte desta oferta fixa. Cada conta escolhe mensal ou anual ao iniciar; use duas contas para testar ambos simultaneamente.

## Roteiro de homologação

### Mensal e anual

1. Inicie o listener, autentique-se no BOLSU e selecione Mensal.
2. Confirme R$ 19,90 por mês e o Price ID mensal no Checkout.
3. Pague com `4242 4242 4242 4242`, validade futura e CVC de três dígitos.
4. Aguarde o processamento de `checkout.session.completed`, eventos da assinatura e `invoice.paid`. Recarregue `/assinatura`.
5. Confira metadata, IDs, `subscription_status=active`, `plan=premium`, ciclo mensal e vencimento no Supabase.
6. Repita com outra conta e Anual: R$ 199,90 por ano, Price ID anual e ciclo anual.
7. Visite manualmente `/assinatura?checkout=returned` com uma conta gratuita: isso não pode ativar Premium.

### Cancelamento

1. Na conta assinante, abra Gerenciar assinatura e cancele ao final do período.
2. Após `customer.subscription.updated`, confira `cancel_at_period_end=true` e acesso mantido até o período pago.
3. O cancelamento no app produz a mesma política.
4. Para observar `customer.subscription.deleted` imediatamente, cancele a assinatura de teste pelo Dashboard. O estado deve virar `canceled`; um período pago vigente continua acessível conforme a política acima. A expiração efetiva também está coberta pelos testes locais de banco.

### Falha de pagamento

1. Para recusa inicial, inicie Checkout com `4000 0000 0000 0002`: o pagamento deve falhar e não pode liberar Premium.
2. Para falha em uma assinatura já paga, atualize o cartão no Portal para `4000 0000 0000 0341` (pode ser anexado, mas falha na cobrança). Confirme no Dashboard que esse é o método padrão usado pela assinatura.
3. No ambiente de teste, antecipe uma cobrança integral da assinatura existente, sem rateio:

```sh
stripe subscriptions update sub_SUBSTITUA_PELO_ID_DE_TESTE -d billing_cycle_anchor=now -d proration_behavior=none
```

4. Confira `invoice.payment_failed` e `subscription_status=past_due`. O acesso não se estende além do pagamento anterior. Após a política de tentativas da Stripe resultar em `unpaid`, não há Premium.
5. Atualize para um cartão de sucesso, pague a fatura pendente e confira `invoice.paid` e a recuperação do acesso.
6. Reenvie um evento já processado pelo Dashboard: não pode duplicar nem estender o período. Eventos de exemplo criados por `stripe trigger` sem ligação a um pedido BOLSU não ativam usuários.

Mensal e anual foram pagos em sandbox; o usuário testou cancelamento e desfazimento do cancelamento. A reconciliação real confirmou as duas assinaturas ativas e nenhuma pendência. Falha de pagamento e recuperação foram testadas com fixtures e PostgreSQL local; a simulação de recusa de cartão na sandbox ainda não foi executada.

Referências: [cartões de teste](https://docs.stripe.com/testing), [webhooks](https://docs.stripe.com/webhooks), [atualizar assinatura](https://docs.stripe.com/api/subscriptions/update).

## Produção isolada

Use outro deploy e outro projeto Supabase para produção. Configure `BOLSU_BILLING_MODE=live`, origem HTTPS, secret/publishable keys live, signing secret live e Prices live com os mesmos valores e periodicidades. Os IDs de teste fornecidos não devem ser reutilizados.

A migration inicializa `billing_environment.livemode=false`. Somente em um banco de produção novo, sem pedidos de teste, o administrador deve executar:

```sql
update public.billing_environment set livemode=true where singleton=true;
```

O backend recusa um modo divergente do banco e valida `livemode` dos objetos Stripe. Não transforme o banco de teste em produção trocando apenas as chaves. Produção não foi ativada.

## Arquivos desta alteração

Criados:
- `docs/STRIPE.md`
- `supabase/migrations/202609220008_stripe_subscription_sync.sql`

Alterados:
- `.env.local` e `.env.example`
- `src/lib/billing/config.ts`, `domain.ts`, `provider.ts`, `server.ts`, `types.ts`
- `src/lib/database.types.ts`
- `src/app/api/billing/route.ts` e `src/app/api/billing/webhook/route.ts`
- `src/components/finance/billing-panel.tsx` e `src/components/finance/plan-workspace.tsx`
- `tools/check-billing.ts`
- `tests/billing.test.ts` e `tools/database-tests/billing.test.mjs`

Validação: `pnpm typecheck`, `pnpm lint`, `pnpm test` (30 testes) e `node --test tools/database-tests/billing.test.mjs` (12 testes). A pré-verificação remota passou após o preenchimento das credenciais. As validações adicionais estão em `docs/STRIPE-RELIABILITY.md`.
