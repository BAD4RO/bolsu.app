# Etapa 3 — Controle diário e Supabase hospedado

Atualizado em 22/09/2026.

## Supabase conectado

Projeto de desenvolvimento: `muggwtdjxaaqojvtmnsn`, região São Paulo. A inspeção inicial confirmou que o schema público estava vazio. As migrações `202609220001_foundation.sql` e `202609220002_daily_control.sql` foram aplicadas com sucesso pelo SQL Editor. O app usa somente a URL do projeto e a chave pública em `.env.local` (ignorado pelo controle de versão).

Site URL: `http://localhost:3000`. Retornos permitidos:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/callback?next=/redefinir-senha`

Cadastro por e-mail e confirmação estão habilitados. O painel exige SMTP próprio para personalizar os templates; os templates locais não foram aplicados. O fluxo padrão usa PKCE: abrir o link no mesmo navegador em que o cadastro/recuperação começou. Cadastro, entrega do e-mail, confirmação e login com senha foram validados com uma conta real; o usuário confirmou o login em 22/09/2026. Recuperação e renovação de sessão ainda dependem de homologação manual. O retorno sem verificador PKCE agora orienta login com senha e permite reenviar a confirmação. Não foi desabilitada a confirmação para contornar isso.

As migrações foram executadas pelo SQL Editor, não pelo CLI. Antes de adotar `supabase db push`, conferir e reconciliar o histórico de migrações no projeto correto com `supabase migration repair --status applied 202609220001 202609220002`. Não reaplicar o SQL de criação nem usar reset em uma base com dados.

## Funcionalidades implementadas

- Contas: criação, edição de nome/tipo/inclusão no disponível, arquivamento e reativação. O saldo inicial datado fica preservado; correções usam ajustes identificados. Arquivar exige saldo zero, ausência de previsões e ausência de vínculos com reservas.
- Lançamentos manuais: receitas e despesas previstas ou realizadas, competência, vencimento, realização, categoria, observações, edição e exclusão com confirmação. Datas futuras continuam consultáveis no mês correspondente.
- Busca e filtros executados no banco por mês, descrição, tipo, categoria e situação. Paginação de 100 registros com totais calculados sobre toda a seleção.
- Transferências: criação, edição e exclusão. Origem e destino distintos, do mesmo usuário. Não entram como receita/despesa.
- Cartões: nome, bandeira, limite e datas, arquivamento/reativação. Não guarda número completo, CVV ou credenciais bancárias. Datas ficam preservadas depois de gerar faturas.
- Compras: à vista ou até 360 parcelas; divisão em centavos inteiros com distribuição do resto. Editar/excluir atua na compra inteira e só é permitido quando as faturas envolvidas não têm pagamentos ativos.
- Faturas: competência pelo mês do vencimento, total, valor pago e pendente. Compra no dia do fechamento inicia o ciclo seguinte. Dias ausentes usam o último dia do mês, sem perder a configuração original.
- Pagamentos: registro integral/parcial e exclusão para corrigir um registro. O valor não pode exceder a obrigação pendente. O pagamento reduz caixa e dívida, sem criar uma segunda despesa.
- Limite comprometido: soma do saldo não pago de todas as faturas, incluindo parcelas futuras. Excesso é mostrado explicitamente; o limite informado não impede registrar um fato já ocorrido.

São registros manuais do controle financeiro; nenhum botão executa uma transação bancária.

## Garantias e limites

`bolsu_daily` é a única entrada das novas mutações. Valida identidade, propriedade de cada recurso, compatibilidade de categoria, precisão monetária e datas. Não aceita `usuario_id` do cliente. Escrita direta continua negada; a leitura continua protegida por RLS.

Todas as mutações têm recibo por usuário e chave de idempotência. Repetir chave/payload retorna o mesmo resultado; mudar os dados com a mesma chave é recusado. Um lock de perfil serializa operações do mesmo proprietário, impedindo que compras, pagamentos e edições calculem obrigações concorrentes desatualizadas. Os testes cobrem repetição e excesso sequenciais; não foi realizado teste de carga com conexões concorrentes.

Exclusões são lógicas e recalculam os totais. Não há botão de restauração nesta etapa. Contas arquivadas precisam ser reativadas para alterar seu histórico. Transferências vinculadas a reservas não podem ser editadas por este fluxo.

A interface preserva os campos em falhas, mantém a chave de repetição quando o resultado é incerto, bloqueia envio duplo e mostra sucesso somente após resposta da API. As três telas deixaram de usar exemplos. A rota `/tema` permanece uma prévia visual separada e identificada.

Planejamento, recorrências, metas, orçamentos e avisos permanecem para a etapa 4. Projeção e dashboard completo ficam para a etapa 5. Cobrança e franquias comerciais ficam para as etapas 6 e 7.

## Validação executada

- 26 testes PostgreSQL/PGlite: 11 da fundação e 15 do controle diário.
- 12 testes de domínio/formulários: 6 anteriores, 4 do controle diário e 2 do retorno de autenticação.
- 7 testes HTTP contra o app conectado (incluindo retorno sem verificador PKCE): autenticação obrigatória, recusa de escrita por origem externa e rotas administrativas desativadas.
- TypeScript, ESLint e compilação de produção passaram.
- `supabase/verify-foundation.sql` executado no projeto hospedado: perfil/categorias, saldo, RLS entre duas identidades, bloqueio de privilégios e de escrita direta.
- `supabase/verify-daily.sql` executado no projeto hospedado: contas, lançamentos, exclusão, transferências, parcelas, pagamentos parciais, limite, idempotência e isolamento. Os dois scripts usam transação revertida; não deixaram usuários ou registros de teste.
- A API Auth respondeu com cadastro por e-mail e confirmação habilitados. A API de contas e saldos recusou acesso anônimo com 401.

## Homologação manual pendente

1. Cadastro, recebimento, confirmação e login: concluídos com conta real.
2. Criação de registros pela interface, recarga e nova sessão para conferir persistência de ponta a ponta.
3. Conferência visual das telas financeiras autenticadas em celular e desktop.
4. Logout, recuperação de senha, link expirado e renovação de sessão.

Os testes SQL usam identidades temporárias no banco; não substituem o serviço de autenticação, o envio de e-mails e o teste de interface com sessão real.

