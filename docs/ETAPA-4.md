# Etapa 4 — Planejamento e recorrências (04/08)

Implementada em 22/09/2026. Migração aplicada no Supabase de desenvolvimento `muggwtdjxaaqojvtmnsn` pelo MCP, com versão remota `20260922061415`, nome `planning`. Arquivo local: `supabase/migrations/202609220003_planning.sql`. O ajuste de limite de encerramento está em `202609220004_planning_end_boundary.sql`, aplicado como `20260922061944` (`planning_end_boundary`). As migrações 1 e 2 continuam com aplicação manual pelo SQL Editor; reconciliar os quatro identificadores antes de usar `supabase db push`. Não reaplicar nem executar reset.

## Entrega

- `/recorrencias`: receitas e despesas mensais, início e fim opcional, geração de 12 meses ao criar/editar e ao abrir o planejamento. Selecionar outro mês gera os 12 meses seguintes. Dias 29–31 usam o último dia do mês sem mudar o dia original. Não existe agendador em segundo plano nem pagamento automático.
- Edição individual permite corrigir descrição, valor, vencimento e realização. Exclusão individual não recria a ocorrência na próxima geração. A competência permanece no mês original.
- Edição futura mantém versões por mês. Preserva ocorrências realizadas, vencidas, excluídas e personalizadas. Alterações devem começar a partir do mês atual e da última alteração programada. Encerramento preserva pagamentos e exclui previsões após o dia final, inclusive personalizadas.
- `/limites`: orçamento por categoria/mês com gasto, restante, percentual e previsão separada. Despesas realizadas e parcelas de cartão entram por competência; transferências, reservas e pagamentos de fatura não duplicam gasto. Excesso continua negativo no restante.
- `/metas`: metas com prazo opcional, estimativa mensal necessária, aportes, retiradas, histórico por mês e reserva por conta. Estimativa inclui o mês atual, arredonda para cima em centavos e não presume rendimento; prazo vencido exibe todo o restante.
- Reserva não altera o saldo da conta. O saldo após reservas considera somente contas incluídas no disponível e desconta somente as reservas dessas mesmas contas. Ainda não é a projeção após contas/faturas pendentes da etapa 5.
- Aportes não podem exceder o saldo atual livre de outras reservas. Retiradas não excedem a reserva daquela meta naquela conta. Movimentos anteriores ao último movimento da mesma reserva são recusados. Gastos posteriores podem deixar o caixa inferior à reserva: a tela sinaliza isso sem esconder o valor negativo.
- Aporte pode registrar uma transferência vinculada da origem ao destino na mesma transação. O fluxo diário impede editar/excluir essa transferência. Corrigir uma reserva usa movimento inverso; retirada não desfaz uma transferência bancária registrada. Para registrar uma devolução efetiva de dinheiro, usar uma nova transferência após liberar a reserva.
- Arquivar meta exige reserva zero; reativar preserva histórico.
- `/notificacoes`: avisos derivados de contas/faturas vencidas ou a vencer em até 7 dias e orçamento atual em 80%/100%. Leitura persistida por evento; mudança de valor/atraso ou de limiar gera novo estado de leitura. Avisos resolvidos saem da lista. Não envia e-mail, push, SMS ou WhatsApp.
- Navegação pelo menu Mais e pelas quatro abas do planejamento. Lançamentos recorrentes levam à tela específica para edição.

## Garantias

API autenticada, proteção de origem, validação de dinheiro/datas e campos estritos. Operações transacionais com idempotência e lock do perfil compartilhado com controle diário. Leitura isolada por RLS, views `security_invoker`, escrita direta negada e helpers privados. A unicidade de recorrência/mês impede duplicação inclusive após nova chave de geração.

Ocorrências, movimentos de reservas e avisos têm paginação de 100 registros; totais são calculados sobre todos os registros. Listas de configurações (contas, metas, categorias e recorrências) são completas.

## Validação

- 38 testes PostgreSQL/PGlite (12 novos de planejamento): calendário, repetição, edições, encerramento, orçamento/cartão, reservas, transferência vinculada, estimativa, avisos, isolamento e bloqueios.
- 15 testes de domínio/formulários (3 novos): precisão, reservas excluídas e validação de ocorrência.
- `supabase/verify-planning.sql` executado no serviço hospedado com transação revertida: geração, fevereiro bissexto, orçamento, reserva, idempotência e isolamento. Não deixou usuários ou registros de teste.
- 8 testes HTTP passaram, incluindo autenticação das novas rotas e recusa de escrita por origem externa. Servidor local atualizado na porta 3000.
- Compilação de produção com TypeScript e ESLint.

## Homologação de interface

Carregamento autenticado e estado vazio de recorrências/metas conferidos no navegador em desktop; formulário de recorrência abre e carrega categorias reais. A sessão recuperada ainda não tem contas cadastradas. Falta conferir a jornada completa com registros pela interface: criar recorrência, realizar uma ocorrência, definir orçamento, criar meta, aportar/retirar e recarregar. Conferir também celular e desktop. Os testes de banco não substituem esse teste visual e de ponta a ponta. Planos comerciais, projeção completa e notificações externas não fazem parte desta entrega.
