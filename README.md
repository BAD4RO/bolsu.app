# BOLSUAPP

Aplicativo de organização financeira pessoal em Next.js, com Supabase e tema escuro/dourado.

O projeto Supabase de desenvolvimento está conectado. As migrações da fundação e do controle diário foram aplicadas e testadas. Contas, lançamentos, transferências, compras parceladas e faturas usam dados reais e exigem autenticação.

- Stripe em teste, configuração e homologação pendente: [docs/ETAPA-7.md](docs/ETAPA-7.md).
- Planos, limites e exportação CSV: [docs/ETAPA-6.md](docs/ETAPA-6.md).
- Dashboard, projeção e primeiros passos: [docs/ETAPA-5.md](docs/ETAPA-5.md).
- Planejamento e recorrências: [docs/ETAPA-4.md](docs/ETAPA-4.md).
- Controle diário e histórico da integração: [docs/ETAPA-3.md](docs/ETAPA-3.md).
- Regras do produto e próximas etapas: [docs/PRODUTO-BOLSU.md](docs/PRODUTO-BOLSU.md).
- Identidade visual: [docs/IDENTIDADE-VISUAL.md](docs/IDENTIDADE-VISUAL.md).
- Histórico da fundação: [docs/ETAPA-2.md](docs/ETAPA-2.md).

## Desenvolvimento

Configure `.env.local` a partir de `.env.example` com URL e chave pública do seu projeto. Nunca coloque chaves administrativas em variáveis `NEXT_PUBLIC_*`.

```text
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm build
pnpm start
# Com o app em execução:
pnpm test:http
```

Acesse `http://localhost:3000`. `/tema` é uma prévia separada com dados ilustrativos. Os testes de banco usam o pacote isolado em `tools/database-tests`; instalar suas dependências antes de executar em uma máquina nova.

Não executar reset nem reaplicar a migração inicial sobre um banco já provisionado. Veja o histórico de aplicação manual e a orientação para reconciliar o CLI em `docs/ETAPA-3.md`.
