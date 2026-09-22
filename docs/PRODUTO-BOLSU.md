# BOLSU — Documento de produto

Versão 0.1 · 22 de setembro de 2026 · Etapa 1 de 8

Status: proposta para revisão do fundador. Autorizar esta análise não equivale a aprovar preços, contratar serviços ou publicar o produto. Nenhuma alteração de código faz parte desta etapa.

## 1. Direção do produto

**Proposta de valor:** ajudar a pessoa a organizar o mês, entender o dinheiro já comprometido e guardar para seus objetivos, com poucos minutos de uso por dia.

**Promessa:** “Saiba quanto pode gastar, mantenha suas contas em dia e avance nos seus planos.” Os números são estimativas baseadas nos registros do usuário, não garantias de disponibilidade bancária.

**Público inicial proposto:** pessoas no Brasil que organizam as próprias finanças, recebem renda com alguma previsibilidade, usam contas e cartões e querem começar a poupar. Precisam de orientação simples e têm dificuldade para manter planilhas atualizadas. Esse recorte é uma hipótese, ainda sem entrevistas ou dados de uso.

Problemas prioritários:

1. Confundir saldo em conta com dinheiro livre para gastar.
2. Perder a visão das contas, parcelas e faturas que ainda vão vencer.
3. Abandonar o controle porque registrar tudo exige esforço.
4. Criar metas sem reservar dinheiro nem acompanhar os aportes.

O primeiro produto será um aplicativo web responsivo, em português e reais, para uso individual. Gestão familiar, empresarial, investimentos e renegociação de dívidas ficam fora deste primeiro recorte.

## 2. Princípios e identidade

- Preservar BOLSU, fundo escuro, laranja, glassmorphism e componentes atuais que forem úteis.
- Priorizar leitura, contraste e rapidez; transparência e animação não podem dificultar valores e ações.
- Manter lançamentos manuais ilimitados: o usuário deve conseguir continuar seu controle no Gratuito.
- Exibir a origem dos números e distinguir realizado, previsto e reservado.
- Preservar histórico, consulta e exportação ao mudar de plano.
- Não apresentar sucesso quando os dados não foram salvos; oferecer recuperação após falhas.
- Coletar somente o necessário. Nome, e-mail e autenticação bastam para o perfil inicial; CPF, telefone e nascimento não serão campos obrigatórios do controle financeiro. Eventuais dados de cobrança serão tratados no fluxo do provedor.
- Não anunciar automação, segurança ou benefício ainda não implementado.

## 3. Diagnóstico do projeto atual

Método: leitura do código local e reaproveitamento das verificações visuais da etapa anterior. Não houve acesso ao painel do Supabase, validação das políticas do banco, envio de e-mails ou transações de pagamento nesta análise. “Integrado” abaixo significa que existem chamadas reais no código, não que o serviço foi validado de ponta a ponta.

| Área | Situação observada | Trabalho necessário |
| --- | --- | --- |
| Tema e navegação | Implementados; telas, menus e componentes glass existem | Preservar e revisar acessibilidade a cada nova funcionalidade |
| Cadastro e login | Chamadas reais ao Supabase; fluxos duplicados na entrada e em páginas próprias | Unificar cadastro, sessão, confirmação e tratamento de erros |
| Perfil do usuário | Um fluxo espera `profiles` criado por trigger; outro insere em `users` | Inspecionar banco real e escolher uma fonte consistente sem perder dados |
| Recuperação de senha | Chamadas reais para recuperação e atualização | Validar links, sessão de recuperação e expiração; reenvio de confirmação na entrada usa cadastro novamente |
| Saída da conta | A tela Mais apenas redireciona para a entrada; há funções de logout separadas | Encerrar efetivamente a sessão e conferir acesso após sair |
| Dashboard | Valores, gráfico e vencimentos fixos; ocultar saldo funciona na interface | Ligar aos registros reais e explicar totais |
| Lançamentos | Busca e filtros funcionam sobre exemplos; salvar escreve no console | Persistência, edição, exclusão, filtros reais e estados de pagamento |
| Contas | Página “Em breve”, voltada a integração bancária | Implementar contas manuais primeiro |
| Cartões | Lista demonstrativa e formulário sem persistência | Cadastro, compras, parcelas, faturas e pagamentos |
| Recorrências | Campos e tipos existem; não há geração real no fluxo analisado | Gerar ocorrências sem duplicação e tratar alterações |
| Orçamentos/Limites | Categorias e valores fixos; formulário escreve no console | Orçamento por mês e consumo calculado |
| Metas | Exemplos e edição visual; salvar escreve no console | Metas reais, aportes, retiradas e projeções |
| Notificações | Criar/editar/excluir altera apenas estado da página | Central derivada de eventos reais e preferências persistentes |
| Perfil | Dados demonstrativos; salvar não tem ação conectada | Leitura e atualização reais |
| Segurança | 2FA e biometria são controles locais; alterar senha nessa tela não está conectado | Remover indicadores fictícios; conectar apenas mecanismos reais |
| Assinatura | Plano Premium e histórico fixos; botões de cobrança sem integração | Estado real, checkout, eventos de pagamento e cancelamento |
| Limites de plano | Hook consulta `users` e prevê 50 transações, 1 cartão e 3 metas no Free | Centralizar matriz e aplicar no servidor; tela comercial não corresponde integralmente ao hook |
| Ajuda e termos | Conteúdo estático; busca/expansão da ajuda funcionam; suporte não está conectado | Revisar promessas e disponibilizar canal real |

### Pendências da base antes de usuários reais

- O hook de assinatura tenta atualizar o plano diretamente pelo cliente. A eficácia depende das políticas do banco, que não foram inspecionadas. O novo fluxo deve aceitar concessões de plano somente por processos autorizados no servidor.
- A proteção de navegação cobre apenas parte das rotas. Existe desvio por variável de prévia local. O ambiente comercial deve validar autenticação em todas as operações protegidas, independentemente da interface.
- Há uma rota de criação administrativa com verificação baseada em valores fixos no código. Revisar e retirar esse mecanismo do produto comercial; verificar necessidade de substituir credenciais existentes, sem reproduzi-las na documentação.
- Não foram localizadas migrações SQL ou testes de aplicação próprios no projeto inspecionado. Comentários sobre RLS e triggers não comprovam sua configuração no serviço.
- A configuração atual permite build sem checagem de tipos e lint. As verificações deverão ser etapas obrigatórias de entrega; o build isolado não será evidência suficiente.

Conclusão: a base visual é aproveitável, mas o núcleo financeiro ainda é predominantemente um protótipo. Não está pronto para cobrança comercial.

## 4. Jornada do cadastro ao primeiro mês

| Momento | Experiência proposta | Sinal de conclusão |
| --- | --- | --- |
| Primeiro acesso | Entender a promessa e criar conta; confirmar e-mail conforme configuração | Sessão válida e perfil único |
| Preparação | Cadastrar primeira conta manual e saldo com data de referência | Saldo inicial persistido, sem virar receita do mês |
| Primeiro valor | Registrar uma despesa; mostrar impacto no saldo | Registro permanece após sair e entrar |
| Organizar o mês | Informar próximos recebimentos e contas; adicionar cartão opcionalmente | Vencimentos organizados e dados faltantes sinalizados |
| Primeira semana | Registrar gastos rápidos, marcar pagamentos e escolher orçamento/meta | Usuário consegue repetir o processo sem ajuda |
| Durante o mês | Consultar disponível, compromissos, alertas e meta prioritária | Cada total leva aos registros que o compõem |
| Conhecer o Plus | Encontrar oferta ao precisar de mais recursos ou planejamento avançado | Comparação clara; oferta pode ser dispensada |
| Encerrar o mês | Conferir pendências e resumo, revisar orçamento seguinte | Histórico preservado e próximo mês preparado sem duplicações |

O onboarding será curto, pulável e retomável. Conta, data e categoria poderão ter padrões explícitos; valor será obrigatório e campos avançados ficarão recolhidos. Não exigir cadastro completo de toda a vida financeira antes do primeiro lançamento.

## 5. Primeira versão comercial

### Núcleo comum

- Cadastro, confirmação, login, recuperação e logout confiáveis; perfil mínimo.
- Contas manuais, saldo inicial datado, ajustes identificados e arquivamento.
- Receitas/despesas previstas e realizadas, edição, exclusão com confirmação, busca e filtros básicos.
- Transferências entre contas próprias, sem inflar receitas ou despesas.
- Cartões, compras parceladas, fechamento, vencimento e pagamento integral ou parcial de faturas. Saldo remanescente continua pendente; juros e encargos são informados manualmente, sem simular condições bancárias.
- Recorrências mensais; outras periodicidades atuais podem entrar posteriormente. Alterar uma ocorrência ou futuras ocorrências deve ser uma escolha explícita.
- Orçamento mensal por categoria padrão, uma meta ativa no Gratuito e central de avisos dentro do app.
- Dashboard real, resumo do mês, consulta de todo o histórico e exportação CSV básica.
- Assinatura Plus mensal/anual, gestão do plano e cancelamento integrados.
- Estados vazios, carregamento, erro, acessibilidade, privacidade e canal de suporte coerentes com a entrega real.

### Entrega específica do Plus

Múltiplas contas/cartões/metas, categorias personalizadas, projeção até o final do mês, comparativos mensais, cálculo de aporte necessário por meta e configuração dos alertas internos. Estes recursos devem funcionar antes de serem oferecidos como benefícios pagos.

### Depois da primeira versão

Conexão bancária/Open Finance, importação OFX/CSV, WhatsApp, leitura de comprovantes, IA, notificações push/e-mail/SMS, compartilhamento familiar, gestão empresarial, aplicativos nativos, uso offline completo e novas periodicidades de recorrência.

2FA e biometria não serão anunciadas enquanto não houver implementação verificável. Consultoria financeira, promessa de economia garantida e recomendações de investimento não fazem parte da oferta inicial.

## 6. Regras essenciais dos números

- Moeda inicial: BRL, armazenada com precisão decimal ou centavos inteiros. Nunca depender de arredondamentos de ponto flutuante para conciliar totais.
- Datas financeiras devem preservar o dia informado. Fuso inicial America/Sao_Paulo; horários de eventos técnicos não devem deslocar vencimentos.
- Saldo atual = saldo inicial datado + movimentações realizadas posteriores à referência. Receitas esperadas não aumentam esse saldo.
- Transferência reduz uma conta e aumenta outra pelo mesmo valor; não é receita nem despesa.
- Categorias do mês consideram despesas pela data de competência. No cartão, cada parcela entra no mês de sua fatura; o pagamento da fatura movimenta caixa e liquida a obrigação, sem gerar novamente a despesa da compra.
- Limite do cartão não é dinheiro disponível. Compras e parcelas comprometem o limite; pagamentos liberam apenas o valor correspondente, conforme a regra registrada.
- Uma meta representa reserva identificada dentro do dinheiro controlado. Aporte não é despesa; se houver transferência real entre contas, vinculá-la sem duplicar o movimento. Valores em contas excluídas do saldo disponível não podem ser subtraídos novamente como reserva.
- Recorrência gera previsão, nunca pagamento automático. Para dia 29–31 ausente, usar o último dia do mês e preservar o dia original nos meses seguintes.
- Datas futuras aparecem em “Previstos”; não podem desaparecer por agrupamentos limitados a hoje, ontem e anteriores.

### Dashboard e diferença entre saldo e projeção

No Gratuito, exibir saldo atual, reservas e compromissos registrados, com suas origens. No Plus, acrescentar a projeção explicada:

**Disponível estimado no fim do mês = saldo atual das contas incluídas + entradas pendentes previstas até o fim do mês − obrigações pendentes vencidas ou com vencimento até o fim do mês − reservas incluídas nesse saldo.**

Obrigações de cartão entram por saldo de fatura, não pelas compras novamente. Aportes planejados ainda não reservados devem aparecer separadamente como cenário, sem dupla subtração. Gastos variáveis não registrados não entram silenciosamente no cálculo; a interface deve informar essa limitação.

Exemplo didático: R$ 2.000 de saldo, R$ 1.000 de entrada prevista, R$ 700 de contas, R$ 500 de fatura e R$ 300 reservados resultam em R$ 1.500 projetados. Sem a entrada prevista, seriam R$ 500. Pagar a fatura reduz saldo e obrigação em R$ 500, mantendo a projeção consistente.

Uma projeção mensal positiva não garante dinheiro antes da data de recebimento. Mostrar também compromissos anteriores à próxima entrada e eventual insuficiência. Resultado negativo deve permanecer negativo e ser explicado, sem sugerir que é zero disponível.

## 7. Proposta de planos

Matriz recomendada, ainda sujeita à revisão do fundador:

| Recurso | Gratuito | Plus |
| --- | --- | --- |
| Lançamentos manuais, transferências e histórico | Ilimitados | Ilimitados |
| Contas ativas | 2 | Sem limite comercial inicial |
| Cartões ativos | 1 | Sem limite comercial inicial |
| Parcelas e recorrência mensal | Incluídas | Incluídas |
| Metas ativas | 1, com aportes e retiradas | Múltiplas, com estimativa mensal necessária |
| Categorias | Padrão | Padrão e personalizadas |
| Orçamento mensal | Por categoria padrão | Também por categoria personalizada |
| Visão financeira | Saldo, compromissos e resumo do mês | Também projeção e comparativos mensais |
| Avisos dentro do app | Regras padrão de vencimento e orçamento | Antecedência e limiares configuráveis |
| Exportação CSV de dados e consulta do histórico | Incluídas | Incluídas |
| Segurança básica e suporte por canal assíncrono | Incluídos | Incluídos |

Mensal e anual são periodicidades do mesmo Plus. Não prometer prioridade de suporte ou consultoria sem capacidade operacional definida. Segurança não será um benefício exclusivo do pago.

Preço: R$ 19,90/mês é apenas uma hipótese herdada da tela atual. R$ 199,90/ano também está no protótipo e não está aprovado. Esses valores implicam R$ 38,90 de diferença para 12 mensalidades; não equivalem exatamente a “2 meses grátis”. Definir preços após entrevistas e estimativa de custos, tributos, pagamento e suporte.

Teste gratuito: recomendação inicial de 7 dias de Plus, opcional, uma vez por usuário elegível e sem cartão, após a primeira organização. É uma hipótese; não presumir que o trial existente está corretamente aplicado. Expirado o teste, voltar ao Gratuito sem cobrança automática.

### Mudanças de plano

- Upgrade depende de confirmação do pagamento no servidor. Falha no checkout não libera acesso pago.
- Cancelamento encerra a renovação; mantém recursos até o fim do período confirmado pelo provedor.
- No downgrade, não apagar dados. Usuário escolhe contas/cartão/meta ativos dentro da franquia; excedentes ficam para consulta/exportação. Sem escolha, preservar todos e suspender novas operações nos recursos excedentes até a seleção.
- Categorias personalizadas antigas continuam visíveis no histórico; novas atribuições exigem Plus. Não reclassificar registros silenciosamente.
- Recorrências em recursos que serão arquivados devem ser revisadas e pausadas com aviso; parcelas e dívidas existentes permanecem registradas e consultáveis. Deve existir fluxo de quitação das obrigações anteriores mesmo após downgrade.
- Alterações de ciclo não geram desconto ou crédito calculado no navegador; seguir as regras escolhidas para o provedor na etapa 7.

## 8. Organização da experiência

Preservar as telas e rotas atuais como ponto de partida. Usar “Início” em vez de “Home” e “Orçamento” em vez de “Limites” para diferenciar limite de gasto de limite do cartão. Contas manuais devem ser acessíveis diretamente do saldo, além do menu Mais.

O dashboard prioriza: saldo e compromissos → próximos vencimentos → orçamento → meta prioritária. Projeção Plus é um complemento identificável; o Gratuito continua entregando controle útil. Manter ação rápida para lançar sem exigir troca de tela.

Notificações tornam-se uma caixa de avisos gerados pelo sistema, com marcar como lido e preferências. A edição manual de mensagens demonstrativas não faz parte da experiência final do cliente.

## 9. Etapas e critérios de conclusão

| Etapa | Entrega | Critérios verificáveis |
| --- | --- | --- |
| 1 — Produto | Este documento | Inventário com evidências, público, jornada, matriz, limites do escopo e hipóteses registrados; decisões pendentes claramente indicadas |
| 2 — Base | Modelo, migrações e autenticação consistentes | Dois usuários não leem/alteram dados um do outro; perfil único; login/recuperação/logout validados; migrações preservam dados; cliente não altera privilégios |
| 3 — Controle diário | Contas, lançamentos, transferências, cartões e faturas | Dados persistem após nova sessão; totais conciliam; editar/excluir recalcula; transferência não vira renda; parcelas somam a compra; pagamento de fatura não duplica despesa |
| 4 — Planejamento | Recorrências, orçamentos, metas e avisos | Reexecutar geração não duplica; dia 31 e virada de mês funcionam; alterar futuro preserva passado; aportes/retiradas conciliam; avisos usam registros reais |
| 5 — Experiência | Onboarding e dashboard reais | Primeiro lançamento sem assistência em teste de uso; totais rastreáveis; previsão não tratada como recebimento; sem rolagem horizontal a 360 px; teclado, foco e movimento reduzido conferidos |
| 6 — Planos | Matriz central e restrições reais | Contornar interface não contorna limites; requisições concorrentes não excedem franquia; histórico e quitação de obrigações preservados no downgrade; matriz corresponde à oferta |
| 7 — Pagamentos | Checkout e ciclo de assinatura em testes | Pagamento aprovado libera; falho não libera; evento duplicado não duplica efeito; evento inválido é rejeitado; cancelamento/expiração reconciliam com provedor |
| 8 — Lançamento | Produto revisado e pronto para publicação autorizada | Sem dados fictícios no fluxo real; testes críticos e compilação passam; credenciais administrativas revistas; suporte definido; termos/privacidade revisados; restauração e monitoramento preparados |

Não estimar datas de entrega antes de inspecionar o banco e concluir a etapa 2. Nenhuma etapa técnica, sozinha, autoriza publicação ou cobrança real.

## 10. Hipóteses e validação

As metas abaixo são critérios iniciais de aprendizado, não resultados observados nem referências de mercado.

| Hipótese | Como avaliar | Decisão resultante |
| --- | --- | --- |
| Público quer organizar e poupar | Entrevistar 5–8 pessoas sobre o último mês e dificuldades reais | Manter ou estreitar o público antes de expandir funções |
| Registro manual é simples o suficiente | Observar 5 pessoas cadastrando conta e primeiro gasto | Buscar 4 de 5 concluindo sem ajuda; corrigir obstáculos recorrentes |
| Disponível estimado é compreensível | Pedir que expliquem saldo, previsão e reserva usando exemplo | Revisar linguagem se confundirem expectativa com dinheiro recebido |
| Plus tem valor suficiente | Mostrar protótipo funcional e testar interesse em preço explícito | Ajustar benefícios/preço; interesse declarado não comprova conversão |
| App vira hábito | Piloto com 10–20 participantes por quatro semanas | Medir retorno semanal, abandono e razões antes de investir em automações |

Métricas propostas:

- Ativação em 7 dias: usuários que cadastraram conta e primeiro lançamento / novos usuários elegíveis da mesma coorte.
- Retenção na quarta semana: ativados que fizeram uma ação financeira significativa nos dias 22–28 após ativação / ativados com janela completa de observação.
- Conversão: primeira assinatura confirmada / usuários elegíveis expostos à oferta, em janela definida e com amostras separadas por coorte.
- Qualidade: operações financeiras com falha, divergências confirmadas e tempo de resolução.

Eventos de análise não devem conter valores, descrições de gastos, dados bancários ou credenciais. Definir consentimento e política antes de conectar ferramenta externa. Amostras pequenas orientarão entrevistas, sem alegar validação estatística.

## 11. Decisões para revisão

Recomendações de partida: uso individual, registro manual, BRL, público que quer organizar e poupar, Gratuito + Plus, núcleo financeiro comum e automações adiadas.

Pendências comerciais: preço mensal/anual, adoção do trial, canal e capacidade de suporte, provedor de pagamento e participantes do piloto. Não são bloqueios para revisar este documento; devem estar resolvidas antes das respectivas implementações comerciais.

Pendências técnicas da etapa 2: inspecionar estrutura real do Supabase e políticas, reconciliar `users`/`profiles`, verificar sessões, inventariar dados existentes e definir migração. Evitar criar um novo esquema apenas com base nas suposições do protótipo.

## 12. Evidências locais

Arquivos inspecionados nesta análise e na revisão anterior:

- Autenticação: `src/lib/auth.ts`, `src/hooks/useAuth.ts`, `src/lib/supabase.ts`, `src/middleware.ts`, páginas de entrada/cadastro/login/recuperação/redefinição.
- Finanças: `src/app/dashboard/page.tsx`, `src/app/lancamentos/page.tsx`, `src/app/contas/page.tsx`, `src/app/cartoes/page.tsx`, `src/app/limites/page.tsx`, `src/app/metas/page.tsx`, `src/lib/types.ts`.
- Conta e suporte: páginas `mais`, `perfil`, `seguranca`, `notificacoes`, `ajuda` e `termos` em `src/app`.
- Monetização: `src/hooks/useSubscription.ts` e `src/app/assinatura/page.tsx`.
- Configuração: `package.json`, `next.config.ts` e rota `src/app/api/create-admin/route.ts`.

Este documento descreve uma proposta e uma inspeção de código; não certifica o serviço remoto, conformidade jurídica ou viabilidade comercial. A etapa 1 termina aqui, sem iniciar a implementação da etapa 2.
