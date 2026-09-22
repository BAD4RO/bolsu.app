# Recuperação de falhas e reconciliação local

Atualização em 22/09/2026. Aplicada a migration 202609220009_billing_reliability.sql no Supabase de teste.

## Comportamento

- Conflitos de aquisição de lease são repetidos até quatro vezes, com espera progressiva e jitter. A operação Stripe não é repetida pelo wrapper. Se o conflito persistir, o webhook retorna 503 e mantém o evento na fila.
- Falhas de eventos entram em espera progressiva de 30 segundos até uma hora para a reconciliação. Uma entrega duplicada da Stripe ainda pode tentar antes disso. Uma falha tardia não reabre um evento que outro processamento concluiu.
- Só um lote de reconciliação roda por vez no banco. A trava expira em dez minutos em caso de interrupção e somente seu dono pode liberá-la.
- Cada lote lê até 20 eventos e 20 assinaturas, interrompendo o início de novos trabalhos após três minutos. Assinaturas são ordenadas pela última tentativa para evitar que erros persistentes monopolizem o lote.
- Estados unpaid, incomplete, incomplete_expired e paused revogam acesso sem depender da consulta de faturas antigas. Past_due preserva somente o período efetivamente pago; sucesso posterior recupera acesso sem somar períodos duplicados.
- Faturas pagas de períodos encerrados não bloqueiam a validação da cobrança atual. Composições não suportadas de períodos vigentes continuam sendo rejeitadas.
- O Portal abre independentemente da reconciliação de faturas, permitindo corrigir o cartão mesmo durante falhas de consulta.
- Novo cancelamento após desfazer o anterior usa uma chave de idempotência por operação, evitando a resposta antiga.
- A interface orienta usuários com pagamento pendente a abrir o Portal.

## Agendamento ativado

Automação local do Codex: **Reconciliar assinaturas BOLSU local**, ID reconciliar-assinaturas-bolsu-local, a cada cinco minutos, ligada a esta tarefa. Executa o script existente com as variáveis de .env.local sem exibir credenciais. A automação só executa contra localhost:3000 no modo test e permanece em silêncio em execuções normais. Avisa falhas relevantes ou pendências persistentes.

A execução depende do Codex e do servidor local disponíveis neste computador. Esse agendamento não é um cron de produção. Após publicar, agende POST /api/billing/reconcile no provedor de hospedagem, passando o segredo de reconciliação no header Authorization: Bearer. Não grave o segredo na URL ou no código. A trava de lote também protege contra chamadas simultâneas de agendadores diferentes.

Execução manual no projeto:

    pnpm billing:reconcile

Saída: status HTTP, processed, failed, pending e skipped. Um lote sobreposto retorna skipped=true, sem executar outro trabalho. Falhas retornam HTTP 503; credencial inválida retorna 401. Não há alteração automática de cartão, cobrança ou cancelamento no agendamento.

## Verificação realizada

- 34 testes unitários, 16 testes de banco; TypeScript e lint aprovados.
- Primeira reconciliação real: processed=5, failed=0, pending=0 (três eventos pendentes recuperados e duas assinaturas consultadas).
- Duas chamadas simultâneas: uma processou duas assinaturas; a outra retornou skipped=true.
- Token inválido: HTTP 401.
- Supabase: mensal e anual em active, Premium, sem cancelamento agendado e zero eventos pendentes.
- Falha e recuperação de pagamento estão cobertas por fixtures e PostgreSQL local. Não foi alterado o cartão de nenhuma conta do usuário para forçar recusa na Stripe.

## Arquivos

Criados: src/lib/billing/retry.ts, supabase/migrations/202609220009_billing_reliability.sql e este guia.
Alterados: src/lib/billing/server.ts, provider.ts, domain.ts; src/lib/database.types.ts; src/app/api/billing/reconcile/route.ts; src/components/finance/billing-panel.tsx; tools/reconcile-billing.mjs; package.json; tests/billing.test.ts; tools/database-tests/billing.test.mjs; docs/STRIPE.md.

Referências: [eventos de assinaturas Stripe](https://docs.stripe.com/billing/subscriptions/webhooks) e [tarefas agendadas do Codex](https://learn.chatgpt.com/docs/automations?surface=app).
