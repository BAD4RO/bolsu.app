# Teste de falha e recuperação — 22/09/2026

Teste executado em sandbox com cliente, conta Supabase e assinatura mensal exclusivos. Nenhuma assinatura original foi alterada nesta execução. O relógio começou 32 dias no passado e avançou até duas horas após a renovação; assim, o período antigo já estava vencido também no horário real do BOLSU.

- Primeira fatura: R$ 19,90 paga com cartão de sucesso.
- Renovação: cartão pm_card_chargeCustomerFail; fatura aberta, valor pago zero, assinatura past_due.
- Supabase após reconciliação: plan=free, subscription_status=past_due, stripe_access_until=null.
- Recuperação: a mesma fatura foi paga com pm_card_visa, R$ 19,90.
- Supabase após reconciliação: plan=premium, subscription_status=active, acesso até 2026-10-21T16:26:19+00:00.
- Renovação futura da assinatura isolada cancelada ao fim do período para encerrar o cenário.

Script e IDs da execução estão em .local-tools/payment-clock-test.mjs e .local-tools/payment-clock-state.json, ignorados pelo Git. A fixture fica disponível para inspeção; não excluímos o histórico. Este teste usa a reconciliação real do aplicativo e os eventos Stripe, sem editar diretamente o acesso para simular aprovação.
