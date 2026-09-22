# Etapa 5 — Dashboard e primeira experiência (05/08)

Implementada em 22/09/2026. Migração local `202609220005_dashboard.sql`, aplicada pelo MCP no Supabase de desenvolvimento `muggwtdjxaaqojvtmnsn` como `20260922063643_dashboard_onboarding`. A base foi inspecionada antes da aplicação. Nenhum reset foi executado. Reconciliar os identificadores locais/remotos de todas as etapas antes de usar `supabase db push`; não reaplicar migrações já executadas.

## Entrega

- Início responde quanto há em caixa, quanto está reservado/comprometido, quanto pode sobrar no fim do mês e qual a próxima ação. Todos os números vêm do banco autenticado.
- Saldo e compromissos levam às contas e ao detalhamento do cálculo, com entradas/obrigações paginadas em 50 registros. Totais são agregados sobre toda a seleção, independentemente da página. Links abrem o mês de competência correspondente no controle diário/planejamento.
- Vencidos e próximos vencimentos (primeiros 6 até o fim do mês), orçamento (5 com maior utilização), resumo do mês e meta prioritária. Preferência de meta persiste; se arquivada, usa a próxima meta ativa por prazo/criação.
- Introdução de dois passos: conta com saldo inicial datado e primeiro lançamento manual. Conclusão é derivada dos registros existentes; pular/retomar é uma preferência persistida por usuário, sem bloquear o restante do app.
- Cadastro de conta e lançamento rápido diretamente no início, com campos adicionais recolhidos. Defaults de conta/categoria aparecem selecionados e podem ser alterados. Receitas/despesas previstas ficam nas opções adicionais; cartão aponta ao fluxo próprio. Idempotência, validação, bloqueio de envio duplo e preservação de campos em erro usam a base diária.
- Ocultar valores cobre resumo, equação, listas, cenário, meta, orçamento e detalhes; nome dos recursos e avisos continuam visíveis.
- Layout mantém o tema escuro/dourado e glassmorphism atual. Atalho para pular ao conteúdo, campos rotulados, foco visível, diálogos e suporte CSS a movimento reduzido.

## Regra da projeção

**Saldo realizado das contas incluídas + entradas pendentes dessas contas até o fim do mês − despesas pendentes dessas contas até o fim do mês − saldo pendente das faturas até o fim do mês − reservas nas contas incluídas.**

- Datas usam America/Sao_Paulo e o mês atual; valores são agregados em decimal pelo PostgreSQL em um snapshot de leitura.
- Obrigações vencidas continuam incluídas. Entradas atrasadas também entram, com aviso explícito para revisão e cenário separado sem receber nenhuma entrada prevista.
- Cartões entram pelo saldo da fatura, incluindo pagamento parcial. Compras não entram novamente na projeção. O cálculo supõe pagamento da fatura com contas incluídas, pois não há conta de pagamento planejada para a fatura. Pagamento efetivo com conta excluída altera a fronteira da projeção de forma explícita.
- Contas excluídas, suas entradas/despesas e reservas ficam fora da projeção. Seus registros permanecem identificados nos detalhes. Reservas não movem caixa e não são descontadas duas vezes.
- Resumo mensal por competência considera todas as contas, receitas realizadas e despesas realizadas/parcelas de cartão; não equivale ao fluxo de caixa.
- Resultado negativo permanece negativo. O cenário por data verifica falta de caixa antes das entradas do dia (postura prudente para recebimentos/pagamentos no mesmo dia), além do valor antes da próxima entrada.
- Gastos variáveis não lançados, juros não informados e aportes ainda não realizados não são inventados. A tela explica a dependência da completude dos registros.
- Antes de exibir a projeção, o início solicita a geração das recorrências do mês e dos 11 seguintes. GET continua somente leitura; POST autenticado faz a sincronização. Se falhar, a projeção fica indisponível com opção de repetir.
- Lacunas antigas de recorrências impedem mostrar a projeção como completa e levam ao primeiro mês a revisar. Ocorrências excluídas conscientemente não são tratadas como lacuna.
- Sem conta incluída, a estimativa não é apresentada como dinheiro disponível.

## Segurança e validação

- Preferências têm RLS, escrita direta negada e RPC que aceita somente introdução/meta prioritária. Meta deve pertencer ao usuário e estar ativa. Nenhum campo de plano ou proprietário é aceito.
- 48 testes de banco passaram, incluindo 10 novos de dashboard: exemplo de projeção, invariância após pagamentos/recebimentos, exclusões, insuficiência antes de entrada, paginação, preferências, isolamento e lacunas de recorrência.
- 17 testes de domínio/formulários passaram, incluindo prioridade de próxima ação e campos de preferências.
- 9 testes HTTP passaram, incluindo autenticação e origem das novas mutações.
- Compilação de produção, TypeScript e ESLint passaram.
- `supabase/verify-dashboard.sql` executado no Supabase hospedado com rollback: cálculo, realização, reservas, preferências e isolamento. Não deixou identidades ou registros de teste.
- Teclado: Tab do nome para o valor, Escape fecha o formulário e restaura o foco ao botão de abertura; regra CSS de movimento reduzido presente. Desktop conferido em largura CSS de 1280 px (conteúdo 1267 px).
- Interface autenticada: carregamento real/estado vazio, formulário de conta, precisão inválida com preservação dos campos, pular/recarregar/retomar introdução e ocultação de valores. Ausência de rolagem horizontal verificada em largura CSS de 360 px (conteúdo 347 px, com barra vertical).

## Limites de homologação

A conta usada na conferência visual ainda não tem contas financeiras. Não foram criados lançamentos fictícios nela. A jornada completa com gravação de primeira conta/primeiro lançamento pelo navegador e o teste de uso sem assistência com uma pessoa ainda precisam de homologação. Os cenários financeiros preenchidos foram conferidos pelos testes de banco, inclusive no serviço real, não por imagens de uma conta populada.

Projeção está disponível nesta etapa de desenvolvimento. Restrições comerciais Gratuito/Plus ficam para a etapa 6, sem concessão de assinatura, trial ou cobrança nesta entrega.
