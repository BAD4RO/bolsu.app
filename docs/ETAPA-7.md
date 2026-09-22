# Etapa 7 — Stripe em ambiente de teste (07/08)

Implementação preparada em 22/09/2026. **Homologação ponta a ponta na Stripe pendente das credenciais locais.** Provedor escolhido pelo usuário: Stripe; hipóteses aprovadas exclusivamente para teste: R$ 19,90/mês e R$ 199,90/ano, sem trial. Cobrança real não foi habilitada. Não há integração Mercado Pago no código entregue.

Migração local `202609220007_billing.sql`, aplicada no Supabase de desenvolvimento como `20260922073542_stripe_test_billing`. Não reaplicar. Reconciliar o histórico local/remoto antes de usar `supabase db push`, conforme etapas anteriores.

## Implementação

- Stripe Checkout hospedado, modo assinatura, pagamento por cartão, um Price recorrente mensal ou anual. Preço, moeda, ciclo e quantidade são conferidos no servidor. O navegador envia somente o ciclo.
- SDK oficial Stripe 22.6.2, API fixada em `2026-08-26.dahlia`. Somente chave `sk_test_`, objetos `livemode=false` e usuários BOLSU expressamente incluídos na lista de teste são aceitos.
- Checkout e Customer usam chaves de idempotência persistentes por tentativa. Uma lease no banco serializa operações do mesmo usuário. Repetir clique retorna a mesma tentativa; uma resposta de trabalhador com lease expirada não sobrescreve estado recente.
- Cliente, checkout e assinatura são vinculados por IDs persistidos e metadado de uma tentativa aleatória do servidor. O retorno do checkout não concede acesso.
- Webhook valida assinatura Stripe sobre os bytes originais, segredo e tolerância temporal de cinco minutos. Eventos são persistidos antes do HTTP 200 e processados depois da resposta. Eventos duplicados têm uma única entrada; falhas ficam pendentes para reconciliação.
- Reconciliação consulta o checkout, a assinatura e as faturas atuais, sem aplicar o status antigo contido no evento. Eventos de tentativas anteriores conduzem à revisão da tentativa atual do usuário; não substituem a assinatura por um contrato antigo.
- Plus depende de uma fatura integralmente paga, do preço esperado, vinculada ao cliente/assinatura corretos e de um PaymentIntent concluído com cobrança paga sem reembolso/disputa. `active`, retorno de checkout e previsão da próxima renovação não bastam. O fim do acesso é o fim do período da linha da fatura paga.
- Cancelamento usa `cancel_at_period_end`; preserva o período já pago. Checkout aberto pode ser expirado. Nova contratação/troca de ciclo só é liberada após encerrar a tentativa anterior e acabar o período pago; não há prorrata calculada no cliente.
- Portal Stripe para faturas e atualização do meio de pagamento. A configuração é restrita no servidor: não permite troca de plano, alterações cadastrais nem cancelamento pelo portal. Cancelamento fica no app, com confirmação.
- Tabelas de tentativas, eventos e pagamentos com RLS e sem acesso direto por `anon`/`authenticated`. Funções que alteram assinatura são exclusivas de `service_role`. O resumo público autenticado mostra somente o próprio estado, sem identificadores privados do provedor.
- Nova área em `/assinatura`: preços de teste, estado, retomar checkout, consultar pagamento, cancelar renovação e portal. Sem configuração completa, botões permanecem desabilitados com explicação.

## Configurar localmente

1. Na Stripe, escolher um sandbox/ambiente de teste. Criar produto BOLSU Plus com dois Prices recorrentes: BRL 1990 centavos a cada mês e BRL 19990 centavos a cada ano. Quantidade 1, sem cupom, trial, tributação adicional, prorrata ou preço variável nesta homologação.
2. Preencher os campos privados de `.env.local` conforme `.env.example`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `SUPABASE_SERVICE_ROLE_KEY`, `BOLSU_APP_URL`, `BOLSU_BILLING_TEST_USER_IDS` e `BOLSU_BILLING_RECONCILE_SECRET`. Não colar segredos no chat, não usar prefixo `NEXT_PUBLIC_`, não versionar o arquivo.
3. `BOLSU_BILLING_TEST_USER_IDS` recebe o UUID da conta de teste do BOLSU, disponível em Supabase Authentication → Users. Não é o ID de cliente da Stripe. Separar múltiplos UUIDs com vírgula.
4. Para testar localmente, autenticar a Stripe CLI e executar `stripe listen --forward-to http://localhost:3000/api/billing/webhook`. Copiar o `whsec_` exibido pela CLI para a variável local. O segredo da CLI é diferente do segredo de um endpoint configurado no painel. Para servidor de teste hospedado, configurar a URL HTTPS dessa mesma rota no painel da Stripe.
5. Definir `BOLSU_BILLING_MODE=test`, manter `BOLSU_APP_URL=http://localhost:3000` em desenvolvimento e reiniciar o processo Next.js. Com `pnpm start`, compilar antes se houver alteração de código. Nunca usar token real: ele será recusado.
6. Usar cartões e cenários da [documentação de testes da Stripe](https://docs.stripe.com/testing). Não usar cartão real. Cadastrar duas contas BOLSU de teste ajuda a homologar o isolamento visual.

### Pré-verificação sem expor credenciais

Executar `pnpm billing:check` após preencher `.env.local`. O comando não cria cobranças: consulta os dois Prices na API Stripe, exige os valores/recorrências de teste aprovados e confere a existência e confirmação de e-mail das contas BOLSU autorizadas. A saída não mostra chaves nem dados pessoais. O sucesso deste comando não comprova entrega de webhook ou pagamento.

Se `stripe` não for reconhecido no terminal, seguir a [instalação oficial da Stripe CLI](https://docs.stripe.com/cli/install). Usar o mesmo sandbox para chave, produto, Prices e listener. A chave pública `pk_test_` não substitui `STRIPE_SECRET_KEY`; o checkout hospedado desta implementação não precisa dela.

Para testar na interface: entrar com a conta BOLSU autorizada, abrir `/assinatura`, escolher um ciclo e concluir o checkout com o cartão de teste `4242 4242 4242 4242`, validade futura e CVC de três dígitos. Para recusa, usar `4000 0000 0000 0002`. Conferir os cartões na documentação oficial acima. Testar o ciclo anual com outra conta autorizada ou após encerramento do período anterior: cancelar a renovação não encerra imediatamente o acesso pago.

Registrar a homologação com resultado e horário para cada cenário: aprovação mensal, aprovação anual, recusa sem Plus, entrega repetida/fora de ordem sem duplicar acesso, cancelamento mantendo o período pago, reembolso suspendendo o período, renovação, expiração e recuperação após falha do webhook. Não registrar segredos, URLs privadas de checkout ou dados pessoais. Não marcar esses cenários como aprovados com base em fixtures.

Eventos processados: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `invoice.voided`, `invoice.marked_uncollectible`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. Eventos assinados fora dessa lista são apenas reconhecidos.

## Reconciliação e operação

- `POST /api/billing/reconcile` exige `Authorization: Bearer <BOLSU_BILLING_RECONCILE_SECRET>`, segredo com pelo menos 32 caracteres. Não transportar segredo em query string.
- `node --env-file=.env.local tools/reconcile-billing.mjs` executa uma rodada local. O endpoint retorna contagens; se alguma operação falhar, responde 503 para permitir alerta/repetição.
- No ambiente hospedado de teste, configurar um agendador do servidor para chamar esse endpoint a cada cinco minutos. **Agendamento externo não foi provisionado nesta entrega.** Cada rodada revisa até 20 eventos pendentes e 20 tentativas atuais. Tentativas históricas não ocupam as vagas da seleção de contas atuais. Eventos novos têm prioridade sobre os que já falharam.
- Falhas de processamento ficam em `billing_events` com código sanitizado. Monitorar pendências, contagem de tentativas e idade de `last_synced_at`; não registrar payload com dados de cartão/cliente nem segredos. A Stripe mantém a consulta de eventos por tempo limitado: pendências antigas precisam de revisão operacional; a consulta periódica dos contratos atuais independe da retenção desses eventos.
- Se o POST de criação tiver resultado incerto, o sistema repete a mesma chave enquanto a tentativa é recente e depois apenas procura o checkout vinculado ao Customer. Não cria outra assinatura às cegas. Se não encontrar uma correspondência única, um operador precisa conferir o painel Stripe e os IDs privados antes de corrigir a tentativa. Não apagar recibos nem reiniciar a tentativa para contornar essa trava.
- O processamento consulta no máximo 500 faturas por contrato e exige lease válida de 120 segundos. Limites ou timeouts deixam a operação pendente; não aplicam um snapshot parcial.
- Reembolso, inclusive parcial, ou disputa suspende o período daquela cobrança. Outros períodos pagos válidos permanecem elegíveis. Resoluções de disputa cujo Charge ainda esteja marcado como `disputed` requerem revisão; não foi implementada uma política comercial de crédito/restituição.
- Prices arquivados não podem originar novos checkouts, mas os contratos existentes continuam passíveis de consulta e cancelamento.

## Evidências e pendências

- 70 testes de banco, 27 de domínio/provedor e 13 HTTP: **110 aprovados**. TypeScript, lint e build de produção passaram.
- Novos cenários: configuração só de teste, dono/valor/ciclo divergente, aprovação/recusa, cancelamento/expiração, reembolso/disputa, assinatura adulterada ou expirada, idempotência, lease concorrente/vencida, isolamento, concessão privada e fila persistente.
- `supabase/verify-billing.sql` executado no Supabase hospedado com rollback: pagamento idempotente, manutenção de acesso após cancelamento, trava concorrente e recusa de concessão por usuário autenticado. Não deixou dados ou identidades de teste e não chamou a Stripe.
- Interface autenticada conferida sem credenciais: valores corretos, aviso de configuração e botões bloqueados. Largura CSS de 360 px com conteúdo de 347 px, sem rolagem horizontal. Nenhuma assinatura foi concedida à conta real.
- As dependências locais foram normalizadas porque `node_modules` apontava para outra cópia do projeto. `.npmrc` agora usa armazenamento e diretório virtual dentro do workspace; `pnpm-workspace.yaml` autoriza os scripts necessários de esbuild/sharp/unrs-resolver. Usar `pnpm-lock.yaml` para instalações reproduzíveis.

**Para concluir a fase 7:** configurar as credenciais e o encaminhamento do webhook; homologar checkout mensal e anual aprovado/recusado, retorno antes/depois do webhook, repetição e inversão da entrega de eventos, cancelamento, recuperação de falha e expiração; confirmar o agendamento da reconciliação. Fixtures de API e SQL não substituem esses testes reais no sandbox. Não foram homologados relógios acelerados da Stripe, troca de ciclo com prorrata, tributação, cupons ou cobrança real. Segurança e publicação continuam sujeitas à revisão da fase 8.

Referências oficiais consultadas: [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [eventos de assinaturas](https://docs.stripe.com/billing/subscriptions/webhooks), [validação de webhooks](https://docs.stripe.com/webhooks), [Invoice Payments](https://docs.stripe.com/api/invoice-payment/object) e [idempotência](https://docs.stripe.com/api/idempotent_requests).
