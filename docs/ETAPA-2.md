# Etapa 2 — Base nova de desenvolvimento

Data: 22/09/2026. Decisão do fundador: preparar uma base nova, independente do Supabase usado na Lasy.

> Atualização: a base hospedada foi ativada e a etapa 3 implementada. Consulte [ETAPA-3.md](ETAPA-3.md) para o estado atual e os testes reais. O relato abaixo preserva o histórico da etapa 2.

## Situação da entrega

Código e migração implementados; validação local de banco, regras, tipos, lint e compilação executada. A integração real com o serviço Supabase continua pendente: o endereço configurado em `.env.local` é local e recusou a conexão. Não foram encontrados Docker, Supabase CLI ou PostgreSQL CLI disponíveis no PATH da sessão.

A migração foi executada somente em bancos PostgreSQL temporários de teste (PGlite), sem dados reais. Nenhuma migração foi aplicada à Lasy, a um Supabase remoto ou a um Supabase local persistente. Nenhuma conta real foi criada, nenhum e-mail foi enviado e nenhum dado existente foi apagado.

Não considerar esta etapa homologada de ponta a ponta até concluir o checklist de autenticação e serviço abaixo.

## O que mudou

- Cliente do navegador usa cookies via `@supabase/ssr`, compartilhando sessão com middleware e APIs.
- Login e cadastro usam uma única interface e serviço; a criação de perfil/categorias/plano ocorre no banco, em transação, sem inserções concorrentes em `users` e `profiles`.
- Confirmação de e-mail usa callback com verificação de token ou troca de código PKCE. Reenvio chama `resend`, sem repetir cadastro. Recuperação valida sessão antes de atualizar senha.
- Login com confirmação pendente não entra no dashboard. Logout encerra a sessão antes de redirecionar.
- Middleware protege todas as áreas financeiras, usa `getUser` e não aceita mais `BOLSU_LOCAL_PREVIEW` para ignorar autenticação. APIs validam a identidade independentemente dele.
- Perfil edita apenas nome. Nenhum campo de plano/privilégio é aceito. E-mail vem da autenticação; não há CPF nem dados de exemplo.
- Contas manuais podem ser criadas com saldo inicial e data, por uma operação validada no servidor e no banco. Saldos são consultados em view com RLS.
- Dashboard, contas, perfil, menu Mais e assinatura consultam dados reais e mostram carregamento/erro/estado vazio. O dashboard exibe saldo registrado, não uma projeção incompleta.
- Assinatura é somente leitura nesta fase, sem upgrade fictício ou cobranças demonstrativas. Free é o padrão; trial não é concedido automaticamente antes de sua política ser implementada.
- A rota pública, a tela e o script de criação administrativa com credenciais fixas foram desativados. Nenhuma senha real foi alterada; contas antigas associadas a esse mecanismo, se existirem, precisam de revisão separada.
- A tela de segurança não simula mais 2FA/biometria. Recuperação de senha usa o fluxo real.
- As telas de lançamentos, cartões, metas, orçamento e notificações continuam sendo protótipos, agora identificados como exemplos não salvos. Sua implementação funcional pertence às etapas 3 e 4.
- Compilação agora exige checagem de tipos e lint; o comando antigo de lint foi substituído por ESLint. Foram retirados os cabeçalhos globais de acesso cruzado da Lasy.

## Modelo da base

Arquivo: `supabase/migrations/202609220001_foundation.sql`.

| Tabela | Responsabilidade |
| --- | --- |
| profiles | Nome, moeda e fuso do usuário; identificador de `auth.users` |
| subscriptions | Estado comercial; somente leitura para usuários |
| contas | Conta manual, saldo inicial datado e inclusão no disponível |
| categorias | Categorias próprias; 10 categorias iniciais por usuário |
| cartoes | Limite, fechamento e vencimento, sem número de cartão/CVV |
| faturas | Competência, fechamento e vencimento por cartão |
| recorrencias | Definição mensal; ocorrências separadas dos pagamentos |
| transacoes | Receita/despesa, origem, competência, vencimento, realização e parcelas |
| transferencias | Movimentação entre contas próprias |
| pagamentos_fatura | Saída de caixa que liquida obrigação do cartão |
| orcamentos | Valor por categoria e mês |
| metas | Objetivo, valor e prazo opcional |
| aportes_metas | Reservas e retiradas dentro de contas, sem duplicar despesas |

A view `saldos_contas` soma movimentos realizados a partir da data de abertura, inclui transferências e pagamentos de fatura e ignora previsões. Reservas em metas não alteram o saldo da conta.

Padrões:

- Valores persistidos em `numeric(14,2)`, com restrições de sinal e rejeição de NaN. Valores monetários recebidos pela API são texto decimal com até duas casas; a validação não arredonda silenciosamente. Cálculos intermediários da aplicação usam centavos inteiros.
- Datas financeiras são `date`, no formato `YYYY-MM-DD`; eventos técnicos usam `timestamptz`. Moeda inicial BRL, fuso America/Sao_Paulo.
- Saldo inicial representa o início da data de referência, não uma receita. Movimentos desde esse dia entram no cálculo.
- Identificador do proprietário vem da sessão. Chaves estrangeiras compostas incluem o proprietário, impedindo vínculos entre recursos de usuários diferentes.
- RLS em todas as 13 tabelas e view com `security_invoker`. Anônimo sem acesso. Perfil permite atualizar somente nome. Assinatura não permite escrita por usuário.
- Demais tabelas financeiras são somente leitura para usuários nesta etapa. Futuras mutações exigirão operações transacionais próprias, nas etapas 3 e 4. Não liberar escrita genérica para fazer os protótipos “funcionarem”.
- A criação de conta é a única mutação financeira liberada: `bolsu_create_account`. Não recebe `usuario_id`, valida sessão/dinheiro/data e usa restrições da tabela. Os limites comerciais serão implementados na etapa 6.
- Exclusões de pais com dependências são restringidas, evitando apagar histórico em cascata. Exclusão de conta do usuário precisa de um fluxo específico futuro.

## Estratégia de migração e preservação

A migração é para uma base NOVA. Se encontrar `users`, `profiles` ou qualquer uma das tabelas financeiras esperadas, interrompe a transação inteira antes de criar/alterar tabelas. Ela não renomeia nem mescla o banco antigo automaticamente.

Usuários já presentes em `auth.users` de um projeto novo sem tabelas do produto recebem perfil, categorias e Free por backfill. Novos cadastros recebem o mesmo conjunto por trigger. Metadados enviados no cadastro nunca concedem administração ou Plus.

Para adotar um banco legado no futuro: inventariar tabelas, dados, triggers e políticas; fazer backup; definir mapeamento explícito entre `users`/`profiles`; preparar outra migração de adoção; testar em uma cópia. Não usar reset para contornar o bloqueio.

## Como ativar uma instância Supabase nova

### Opção local

Requer um runtime compatível com Docker e Supabase CLI. O arquivo `supabase/config.toml` já está preparado; não é necessário rodar `init` por cima dele.

1. Disponibilizar Docker e o CLI conforme a documentação oficial.
2. Na raiz do projeto, executar `supabase start` (ou o equivalente pelo gerenciador de pacotes que instalou o CLI). A inicialização de um ambiente novo deve executar as migrações versionadas; verificar o resultado no Studio.
3. Atualizar `.env.local` com URL e chave **pública** exibidas pelo ambiente local. Use `.env.example` como referência sem sobrescrever credenciais existentes automaticamente.
4. Manter `http://localhost:3000` como Site URL; usar sempre o mesmo hostname no navegador para evitar inconsistência de cookies.
5. Reiniciar o app. Na configuração local, o capturador de e-mails fica na porta 54324, para testar confirmação e recuperação sem enviar e-mails reais.
6. Não executar `db reset` em um ambiente com dados que devam ser preservados.

### Opção Supabase hospedado de desenvolvimento

1. Criar um projeto vazio, separado de produção/Lasy. A criação não foi feita nesta etapa.
2. Aplicar a migração versionada ao projeto novo via fluxo de migrações do CLI ou editor SQL. Conferir previamente que é o projeto correto e que está vazio.
3. Configurar Site URL e redirects de desenvolvimento; instalar os conteúdos de `supabase/templates/confirmation.html` e `recovery.html` nos templates de e-mail correspondentes.
4. Definir URL e chave pública em `.env.local`, nunca uma chave `service_role` no navegador. O código desta etapa não precisa de chave administrativa.
5. Manter confirmação de e-mail habilitada e senha mínima de 8 caracteres, compatíveis com o app.
6. Validar os checklists abaixo. Gerar tipos novamente com o CLI quando houver um projeto disponível e comparar com `src/lib/database.types.ts`, que hoje representa o contrato da migração.

Os templates com `token_hash` permitem concluir a confirmação em outro navegador. O callback também aceita `code` para o fluxo PKCE, que depende do navegador que iniciou a solicitação. Redirecionamentos são restritos a destinos internos conhecidos.

## Verificações executadas

21 testes passaram:

- 11 testes em PostgreSQL/PGlite: criação atômica de perfil, categorias e Free; isolamento de duas identidades; bloqueio anônimo; impedir promoção de plano/alteração do dono; validação da criação de conta; vínculos entre usuários; conciliação de saldos; bloqueio de escrita direta; duplicação de recorrência e invariantes; recusa de migração em banco existente preservando registros; backfill de usuários já existentes em Auth.
- 6 testes de domínio: precisão monetária; datas e fuso; rejeição de campos de propriedade/privilégios; cadastro; expiração do Plus; proteção de rotas e destinos de callback.
- 4 testes HTTP contra o app: redirecionamento de áreas privadas; APIs retornando 401 sem dados; escrita de outra origem retornando 403; callback inválido e provisionamento administrativo desativado.

Também executados: TypeScript, ESLint e build de produção com verificação de tipos/lint habilitada. Conferência visual do login e transição para cadastro no navegador.

O PostgreSQL de testes tem uma estrutura mínima de `auth.users`/`auth.uid` para exercitar SQL e permissões. Ele NÃO substitui GoTrue, envio de e-mail, PostgREST nem a validação do Supabase real.

Comandos reproduzíveis na raiz:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm --dir tools/database-tests install --frozen-lockfile
pnpm test:db
pnpm build
pnpm start
# Em outro terminal, com o servidor ativo:
pnpm test:http
```

O pacote de testes de banco é separado para não carregar PostgreSQL no aplicativo. Possui sua própria versão fixada e lockfile. Se os executáveis locais não forem encontrados por um ambiente portátil, os mesmos scripts podem ser invocados diretamente com Node.

## Homologação ainda pendente com serviço ativo

- [ ] Aplicar migração no Supabase novo e confirmar tabelas, view, políticas, grants e trigger reais.
- [ ] Cadastrar dois usuários, confirmar seus e-mails e verificar que cada um recebe um único perfil/categorias/Free.
- [ ] Reabrir navegador e confirmar sessão válida; expirar/renovar sessão.
- [ ] Testar reenvio, link expirado, link já consumido e recuperação no mesmo/outro navegador.
- [ ] Salvar perfil e conta, recarregar e verificar persistência; confirmar erro e preservação do formulário com banco indisponível.
- [ ] Com tokens reais de A e B, tentar ler recursos cruzados e alterar plano por REST; confirmar bloqueios.
- [ ] Sair e confirmar que navegação e API não permitem acesso aos dados.
- [ ] Validar todas as telas conectadas em celular e desktop com dados de teste do serviço real.

Não foram implementados pagamentos, limites comerciais, transferência/lançamento editáveis, geração de recorrências, projeção nem envio externo de alertas nesta etapa.

## Referências

- [Sessões SSR no Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Dados de usuário e triggers](https://supabase.com/docs/guides/auth/managing-user-data)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Ambiente local e pré-requisitos](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Configuração do CLI](https://supabase.com/docs/guides/local-development/cli/config)
