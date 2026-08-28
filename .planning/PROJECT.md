# Cotidiano

<!-- Nome provisório — a definir quando o produto tiver identidade visual. -->

## What This Is

Um app web responsivo (celular e desktop) que junta duas coisas do dia a dia num lugar só: um **planner de tarefas** do cotidiano e um **controle financeiro pessoal**. O diferencial é o assistente de IA conversacional no lado financeiro — em vez de preencher formulário, você escreve "almoço 32 no cartão" e o lançamento aparece categorizado; e pergunta "quanto gastei com comida esse mês?" e ele responde olhando seus dados reais.

É para uso pessoal compartilhado: o dono e mais uma pessoa (parceiro(a)/família) lançam no mesmo mês e enxergam o mesmo quadro. Tudo em português brasileiro, com R$, datas e a conversa da IA em pt-BR.

## Core Value

**Em 10 segundos eu sei quanto gastei, com o quê, e quanto sobra no mês.**

Se o planner de tarefas falhar, ainda vale a pena. Se essa clareza financeira falhar, o app não tem motivo pra existir.

## Requirements

### Validated

(Nenhum ainda — só o uso real valida)

### Active

**Fundação e acesso**

- [ ] Login com conta Google via Firebase Authentication
- [ ] Espaço compartilhado: duas pessoas acessam o mesmo conjunto de dados (mesmo mês, mesmos lançamentos)
- [ ] Dados de cada espaço isolados dos demais (regras de segurança no Firestore)
- [ ] Interface, moeda (R$), datas e mensagens da IA em português brasileiro
- [ ] Layout responsivo — usável de verdade no celular e no desktop

**Financeiro — registro**

- [ ] Cadastrar contas fixas mensais (luz, água, aluguel, internet) com valor e dia de vencimento
- [ ] Contas fixas se repetem automaticamente a cada mês
- [ ] Marcar conta como paga
- [ ] Lançar gasto avulso com valor, data e categoria
- [ ] Lançar ganho (salário e entradas extras)
- [ ] Registrar compra no cartão de crédito
- [ ] Compra parcelada distribui as parcelas nos meses seguintes automaticamente
- [ ] Categorias de gasto (mercado, transporte, lazer, saúde…) editáveis
- [ ] Definir teto de orçamento por categoria no mês

**Financeiro — visão**

- [ ] Ver o mês atual: total de entradas, total de saídas e quanto sobra
- [ ] Ver quanto foi gasto por categoria e quanto disso já estourou o teto
- [ ] Ver o que ainda vai vencer no mês e o que já foi pago
- [ ] Navegar entre meses (mês anterior / próximo)

**Assistente de IA (financeiro)**

- [ ] Lançar por conversa em linguagem natural ("gastei 80 no mercado", "almoço 32 no cartão") — a IA extrai valor, data, categoria e forma de pagamento
- [ ] Confirmar o lançamento interpretado antes de gravar (a IA nunca grava às cegas)
- [ ] Perguntar por conversa sobre os próprios dados ("quanto gastei com comida esse mês?", "posso gastar 300?") e receber resposta baseada nos lançamentos reais
- [ ] A IA responde em português brasileiro

**Tarefas**

- [ ] Criar tarefa e marcar como concluída
- [ ] Ver a lista do dia
- [ ] Tarefa com data/hora de prazo
- [ ] Lembrete antes do prazo
- [ ] Tarefas recorrentes (toda segunda, todo dia 5…)
- [ ] Visão de semana e de mês, não só lista solta

<!-- Ajustado após a pesquisa: o lembrete da v1 é dentro do app. Push real (FCM) exige função
     agendada, que exige plano Blaze — descartado na v1 por decisão do usuário. Ver Out of Scope. -->


### Out of Scope

- **Importar extrato bancário (Open Finance)** — exige agregador pago (Pluggy/Belvo) com cadastro e custo recorrente; adiado para v2 por custo e complexidade desproporcionais à v1
- **Ler comprovante de Pix/nota por foto (OCR)** — viável tecnicamente com IA multimodal, mas não é o caminho crítico para a clareza financeira; adiado para v2
- **IA conversacional para tarefas** — decisão explícita: a IA prova valor primeiro no financeiro; tarefas por conversa só depois
- **Integração automática entre tarefas e finanças** — os dois módulos convivem no mesmo app, mas são independentes na v1 (conta a pagar não vira tarefa automaticamente)
- **App nativo (iOS/Android)** — web responsiva atende os dois contextos de uso com uma base de código só
- **Login por e-mail/senha** — Google via Firebase é suficiente e evita construir cadastro, recuperação de senha e verificação
- **Multi-usuário público (SaaS aberto)** — o espaço é para duas pessoas conhecidas; não há onboarding, planos ou cobrança
- **Metas de poupança e investimentos** — fora do foco: o app responde "para onde foi o dinheiro", não "onde aplicar"
- **Cloud Functions do Firebase / plano Blaze** — o usuário optou por não cadastrar cartão no Google Cloud; o Spark não deploya funções, então a v1 vive sem elas
- **Funções agendadas (materialização automática de meses futuros)** — consequência direta de não ter Blaze; ocorrências futuras são geradas quando o app é aberto, não por cron
- **Notificação push (FCM)** — depende de função agendada; na v1 o lembrete é dentro do app. Também exigiria PWA instalado no iOS Safari
- **Divisão de despesas entre as duas pessoas (settle-up)** — categoria de produto separada (Splitwise); conflita com o modelo simples de espaço compartilhado

## Context

- **Ponto de partida:** o usuário hoje não usa nenhuma ferramenta estruturada — controla tarefas e dinheiro "de cabeça e papel". As duas dores concretas: perder prazos e não saber para onde foi o dinheiro.
- **Sem legado:** projeto greenfield, diretório vazio, nenhuma restrição de código existente.
- **Realidade brasileira importa:** cartão de crédito com fatura e compras parceladas em 3x/10x são centrais no orçamento — não são caso de borda, são o comportamento normal e precisam ser modelados desde o início.
- **Uso compartilhado, não multi-tenant:** duas pessoas conhecidas dividindo as contas da casa. Isso exige autenticação e isolamento de dados, mas não exige convites, papéis, permissões ou faturamento.
- **Frontend sem referência pronta:** o usuário não tem ideia formada de tela inicial e pediu explicitamente que o design da interface seja conduzido pela skill `frontend-design`, em vez de sair um layout genérico de template.
- **Dois momentos de IA, igualmente essenciais:** lançar por conversa e consultar por conversa. Nenhum dos dois é opcional na v1 — foi escolha explícita do usuário.

## Constraints

- **Privacidade**: dados financeiros pessoais e compartilhados — isolamento por espaço e regras de acesso restritivas são obrigatórios, não desejáveis
- **Idioma**: tudo em português brasileiro (interface, formatos de data, moeda R$, e as respostas da IA)
- **Plataforma**: web responsiva única — precisa funcionar bem no celular (lançar gasto na fila do mercado) e no desktop (organizar o mês)
- **Autenticação**: Firebase Authentication com provedor Google — decidido pelo usuário
- **Persistência**: Cloud Firestore — decidido pelo usuário
- **Design**: a interface deve ser conduzida pela skill `frontend-design`, não por layout padrão de framework

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Firebase Auth com login Google | Resolve login, sessão e identidade sem construir cadastro/senha/recuperação; o usuário já tinha essa preferência | — Pending |
| Cloud Firestore como banco | Sincronização entre as duas pessoas sai de graça, free tier generoso, menos peças para operar | — Pending |
| Módulos independentes (tarefas e finanças) | O usuário quer os dois num app só, mas não quer acoplamento; permite entregar valor financeiro sem esperar o planner | — Pending |
| IA começa só no financeiro | Prova o valor da conversa onde a dor é maior antes de espalhar para tarefas | — Pending |
| Importação (extrato/comprovante) adiada para v2 | Open Finance exige agregador pago; nenhum dos dois é caminho crítico para a clareza do mês | — Pending |
| Web responsiva em vez de app nativo | Uma base de código cobre o uso no celular e no desktop | — Pending |
| Confirmação obrigatória antes de gravar lançamento da IA | Interpretação de linguagem natural erra; gravar às cegas destrói a confiança nos números, que são o core value | — Pending |
| Frontend conduzido pela skill `frontend-design` | O usuário não tem referência visual e pediu explicitamente design intencional em vez de template | — Pending |
| Firebase permanece no plano Spark (sem cartão) | Decisão do usuário após a pesquisa apontar que funções agendadas exigem Blaze; o custo real seria ~zero, mas o usuário preferiu não cadastrar cartão | — Pending |
| Proxy da IA fora do Firebase, em serverless gratuito | Consequência do Spark: Cloud Functions não deploya sem Blaze, e a chave do LLM não pode ir para o navegador. Candidatos: Cloudflare Workers ou Vercel Hobby — decidir na fase da IA | — Pending |
| Ocorrências futuras geradas na abertura do app | Sem cron, contas fixas e parcelas dos meses seguintes são materializadas no cliente quando o mês é acessado | — Pending |
| Gasto do cartão contabilizado no mês da compra | O usuário pensa o gasto pelo comportamento, não pelo caixa; cada parcela pertence ao mês dela. Consequência aceita: "quanto sobra" reflete compromisso assumido, não dinheiro que saiu da conta | — Pending |
| Entrada no espaço por código de convite | Escolha delegada a mim ("tanto faz"): não depende de e-mail conhecido de antemão e funciona sem backend, ao contrário do e-mail pré-autorizado | — Pending |
| Vite + React SPA, não Next.js | Pesquisa: `onSnapshot` do Firestore só roda no cliente e não há superfície pública que justifique SSR — Next.js cobraria complexidade de ponte de auth sem entregar benefício | — Pending |
| Dinheiro em centavos inteiros com Dinero.js | Float acumula erro; `allocate()` garante que a soma das parcelas feche exatamente com o total | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-27 after initialization*
