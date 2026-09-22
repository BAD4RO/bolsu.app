# Correções de segurança — 22/09/2026

## Aplicadas e verificadas

- Next.js 15.4.6 → 15.5.25; React/React DOM 19.1.0 → 19.1.9; eslint-config-next alinhado em 15.5.25.
- Sharp 0.35.4 e PostCSS 8.5.28, inclusive dependências transitivas via overrides do pnpm. Auditoria inicial: 3 críticas, 17 altas, 15 moderadas e 2 baixas. Auditoria final: zero ocorrências reportadas. Isso não é garantia de ausência de vulnerabilidades no código.
- Removidos `public/lasy-bridge.js` e seu carregamento global. A URL antiga retorna 404.
- Cabeçalhos em páginas e APIs: CSP limitada a `frame-ancestors 'none'; object-src 'none'; base-uri 'self'`, X-Frame-Options DENY, nosniff, política de referenciador e bloqueio de câmera/microfone/geolocalização. Esta CSP não implementa uma política completa de scripts com nonce.
- Removida identificação X-Powered-By e permissões genéricas de proxy de imagens. Os recursos visuais atuais são locais; imagens remotas e localhost são recusados pelo otimizador. AVIF não é negociado como formato de saída.
- Mantido apenas `pnpm-lock.yaml` como lockfile da aplicação; removido package-lock antigo para evitar reinstalar versões divergentes. Gerenciador declarado em package.json.
- Instalação reconstruída com armazenamento local. A instalação anterior está preservada, sem uso, em `.pnpm-store/previous/node_modules`, ignorada no versionamento. Não distribuir esse diretório nem `.env.local` no deploy.
- Servidor local reiniciado com a versão corrigida, limitado a 127.0.0.1:3000.

## Validação

- 27 testes de domínio/provedor + 70 de banco + 15 HTTP = 112 aprovados.
- Lint, TypeScript e build de produção aprovados; script de pré-verificação também passou no lint.
- Novos testes HTTP verificam os cabeçalhos, ausência do bridge e recusa de imagens remotas/localhost.
- Relatórios: `tools/security-audit-before.json` e `tools/security-audit-after.json`.

## Pendências externas e limites

- Homologação Stripe continua pendente de `.env.local` e do listener de webhook. `pnpm billing:check` informa os campos faltantes sem exibir valores. Não houve compra ou assinatura no sandbox nesta revisão.
- A proteção contra senhas vazadas estava desabilitada no Supabase na análise inicial. Habilitar no painel de Auth quando disponível no plano e verificar o resultado. Nenhuma configuração remota de Auth foi alterada nesta revisão.
- Alertas sobre funções SECURITY DEFINER devem ser avaliados conforme sua autorização interna; não revogar indiscriminadamente RPCs usadas pelo app. Tabelas privadas sem políticas de leitura pública permanecem fechadas por desenho.
- Publicação ainda exige HTTPS, gestão de segredos, monitoramento, backups e encerramento das pendências funcionais da fase 8. Nenhum deploy público foi realizado.

Referências: [aviso RSC do Next.js](https://nextjs.org/blog/CVE-2025-66478), [avisos oficiais atualizados](https://github.com/vercel/next.js/security/advisories), [proteção de senhas Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
