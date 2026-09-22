# Etapa 6 — Planos e restrições reais (06/08)

Implementada em 22/09/2026. Migração local `202609220006_plans.sql`, aplicada no Supabase de desenvolvimento como `20260922070218_plans`. Nenhum reset. Os identificadores locais e remotos precisam ser reconciliados antes de usar `supabase db push`; não reaplicar migrações já executadas.

## Entrega

- Matriz central no banco: Gratuito com 2 contas, 1 cartão e 1 meta ativos; Plus sem limite comercial desses recursos. Lançamentos manuais, transferências, histórico e CSV continuam disponíveis nos dois planos.
- Assinatura efetiva calculada no servidor. Plus depende de status e período válidos. Cancelamento preserva acesso até o fim do período confirmado. Trial expirado volta ao Gratuito, sem iniciar cobrança. Esta etapa não concede trial nem vende planos.
- Limites de criação e reativação nas RPCs, inclusive na entrada legada de contas. Um bloqueio por perfil serializa mutações concorrentes. Implementações internas e helpers não podem ser chamados por usuários autenticados.
- Downgrade não apaga nem arquiva registros automaticamente. Quando um grupo excede a franquia, o usuário escolhe em `/assinatura` quais recursos continuarão recebendo novas operações. Sem escolha, todo o grupo excedente fica sem novas operações. Grupos dentro da franquia continuam utilizáveis.
- Excedentes permanecem consultáveis e exportáveis. É possível realizar previsões existentes, pagar/estornar faturas, retirar reservas, transferir e conciliar saldos. Alteração de valor/descrição de previsões suspensas e novas compras/aportes ficam bloqueadas. Regras financeiras anteriores continuam valendo.
- Criar outro recurso exige liberar uma vaga por arquivamento elegível; somente retirar um recurso da seleção não libera uma nova criação. Seleções só aceitam recursos próprios, ativos e dentro da franquia.
- Geração de recorrências incompatíveis com o plano fica suspensa, com aviso. Previsões e parcelas existentes continuam no histórico. Recuperar acesso ou selecionar a conta permite retomar a geração.
- Categorias personalizadas: criação, edição e arquivamento pelo Plus. Gratuito preserva categorias antigas no histórico e permite manter a categoria numa edição histórica, mas impede novas atribuições. Orçamentos padrão continuam disponíveis.
- Projeção, cenários e estimativa mensal das metas são exclusivos do Plus. Bloqueio nas respostas do servidor e na view de metas; não depende de esconder componentes. Comparativo de 12 meses agrega por competência sem duplicar pagamentos de fatura.
- Avisos Plus permitem antecedência de 1–30 dias e limiar de orçamento de 50–100%. Expiração volta a 7 dias e 80%/100%, preservando preferências para eventual retorno.
- Exportação CSV autenticada para 13 tipos de registro, incluindo exclusões identificadas. Paginação de mil linhas, BOM UTF-8, escape de aspas e neutralização de fórmulas textuais. Arquivos grandes são transmitidos em blocos. Exportação não é um snapshot transacional entre páginas; a tela orienta evitar edições durante o download.
- Tela de assinatura com matriz, uso da franquia, seleção de recursos, categorias, avisos, comparativo e exportação. Mensal/anual compartilham os mesmos recursos; preços e checkout ainda indisponíveis.

## Validação

- 61 testes de banco (13 novos de planos), 19 testes de domínio e 10 HTTP: 90 aprovados. Suítes históricas validam suas respectivas migrações; a suíte de planos aplica todas as migrações até 006.
- Casos cobertos: expiração/trial/cancelamento, downgrade, quitação, reativação dos três tipos de recurso, idempotência após downgrade, isolamento, bloqueio de funções internas, atribuições de categorias, alertas, projeção e CSV com 1.001 registros sem duplicação/omissão.
- TypeScript, ESLint e build de produção aprovados.
- Concorrência no PostgreSQL hospedado: identidade temporária com uma conta; duas chamadas em paralelo para criar a última vaga, mantendo o lock por três segundos. Resultado: duas contas ao final, nunca três; a excedente recebeu `P0002` e foi tratada pelo teste. Identidade e dados de teste removidos, com contagem final zero.
- Validação adicional no serviço real com rollback: plano efetivo, bloqueio da projeção e comparativo no Free, exportação própria, comparativo Plus com 12 meses, categoria e preferências de avisos.
- Navegador autenticado: dashboard Gratuito preserva resumo e mostra acesso à oferta Plus; assinatura lê a matriz real, quotas e estado vazio. Download CSV de categorias confirmado pelo evento de download do navegador.
- Layout da assinatura conferido a 360 px CSS, conteúdo de 347 px, sem rolagem horizontal. Preferências da conta real e registros financeiros não foram alterados durante a conferência.

## Limites e próxima etapa

A conta usada na conferência visual é Gratuito e não tem recursos financeiros cadastrados. Formulários Plus e seleção após downgrade foram validados no banco, mas ainda precisam de homologação visual com uma conta de teste populada. Não foi concedido Plus à conta real para testar a interface.

A etapa 7 conecta checkout, eventos autenticados/idempotentes e reconciliação do provedor. Preços, provedor e política de trial continuam decisões comerciais pendentes. Esta entrega não publica o produto nem habilita cobrança real.
