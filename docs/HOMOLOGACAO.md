# Homologação online do BOLSU

## Estado desta preparação

- 34 testes automatizados aprovados nesta preparação.
- Hospedagem e URL de homologação: aguardando definição.
- Nenhuma publicação executada; ambiente local preservado.
- Build no ambiente de hospedagem e testes ponta a ponta publicados ainda pendentes.

## Configuração do ambiente

Use o arquivo .env.example como lista de variáveis, preenchendo os segredos no gerenciador da hospedagem. Não publique .env.local.

- BOLSU_BILLING_MODE: test.
- BOLSU_APP_URL: origem HTTPS da homologação, sem caminho.
- Supabase: projeto de testes com as migrations existentes aplicadas; não usar banco de produção.
- Stripe: chaves de teste e os Prices mensal/anual já definidos.
- STRIPE_WEBHOOK_SECRET: segredo de um novo endpoint Stripe para a URL HTTPS de homologação seguida de /api/billing/webhook. Não reutilizar o segredo do stripe listen.
- BOLSU_BILLING_RECONCILE_SECRET: segredo privado do ambiente; configurar agendamento remoto autenticado para POST /api/billing/reconcile. O heartbeat local não substitui esse agendamento.
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: opcional no Checkout hospedado atual.

Cadastre os eventos definidos em docs/STRIPE.md. Configure no Supabase as URLs de retorno de autenticação para a origem publicada, preservando os retornos locais necessários. Verifique os caminhos efetivos de callback do app antes de cadastrar.

## Critérios de aceite na URL publicada

1. Build, login, confirmação de e-mail, recuperação de senha e renovação de sessão.
2. Cadastro de conta, lançamento, cartão, orçamento e meta com dados de teste.
3. Responsividade e navegação, inclusive simulador e radar com registros preenchidos.
4. Checkout mensal e anual, confirmação via webhook e isolamento entre usuários.
5. Cancelamento, desfazimento, falha de pagamento e recuperação em sandbox.
6. Reentrega de eventos sem duplicar acesso e reconciliação remota autenticada.
7. Proteção dos segredos, HTTPS e revisão dos logs sem credenciais.

Resultados locais não substituem estes testes na hospedagem. Registrar pendências e evidências sem dados sensíveis.
