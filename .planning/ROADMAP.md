# Roadmap: Cotidiano

## Overview

O caminho começa pelo que destrava tudo — duas pessoas entrando com o Google no **mesmo** espaço isolado, com categorias em português — e daí em diante cada fase é uma fatia vertical que o usuário consegue usar de verdade no mesmo dia em que ficar pronta. A Fase 2 entrega o core value inteiro na forma mais simples possível: lançar um gasto e ver, na hora, quanto entrou, quanto saiu e quanto sobra no mês. A Fase 3 ataca cedo o pedaço que, se estiver errado, invalida todo número já digitado: cartão de crédito com fechamento diferente de vencimento e compra parcelada que fecha exatamente no centavo. Só depois disso o mês ganha os compromissos recorrentes e os tetos por categoria (Fase 4), e só com o schema financeiro estável a IA entra (Fase 5) para tirar a fricção de digitar. O módulo de Tarefas (Fase 6) é independente por decisão de produto e pode ser construído em paralelo a partir da Fase 1.

**Modo:** MVP — cada fase é uma fatia vertical de ponta a ponta (dado + regra + tela), nunca uma camada técnica isolada.

## Restrições que moldam este roadmap

Decisões do usuário posteriores à pesquisa. Onde a `research/SUMMARY.md` assume outra coisa, estas vencem.

1. **Firebase permanece no plano Spark. Sem Cloud Functions, sem cron, sem FCM.** A proposta da pesquisa de "ativar Blaze na Fase 1" está **superada** e não aparece em nenhuma fase.
2. **Materialização client-side:** ocorrências de contas fixas e parcelas dos meses futuros são geradas quando o usuário abre/navega para aquele mês, não por rotina agendada.
3. **Lembrete de tarefa é in-app**, verificado na abertura do app — não é push.
4. **O proxy da IA roda fora do Firebase**, em serverless gratuito (Cloudflare Workers ou Vercel Hobby — escolha fechada no planejamento da Fase 5). Ele valida o Firebase ID token do chamador e segura a chave do LLM no servidor.
5. **Gasto do cartão conta no mês da compra** — cada parcela pertence ao mês em que cai, não ao mês em que a fatura é paga.
6. **Segunda pessoa entra por código de convite.**
7. **O design da interface é conduzido pela skill `frontend-design`**, não por layout padrão de template. Vale para toda fase marcada com `UI hint`.

## Convenções transversais (fixadas na Fase 1, cobradas em todas)

| Convenção | Regra | Pitfall evitado |
|---|---|---|
| Dinheiro | Inteiro em centavos (`amountCents`) + Dinero.js; float nunca calcula dinheiro | 1, 2 |
| Data de calendário | `YYYY-MM-DD` explícito em `America/Sao_Paulo` (date-fns + `@date-fns/tz`); `Timestamp` só quando o instante importa | 10 |
| Isolamento | `workspaceId` no **path** do documento + Security Rules testadas com dois espaços no emulador | 7, 8, 17 |
| Escopo de query | Todo listener filtra por workspace + `monthKey`; nunca coleção inteira | 3, 6 |
| Índices | `firestore.indexes.json` versionado e deployado antes de cada novo padrão de query | 4 |
| Schema | Lançamentos como subcoleção, nunca array dentro de um documento "mês" | 5 |
| Escopo de produto | Antes de aceitar qualquer feature "de passagem", checar contra o Out of Scope do PROJECT.md | 20 |

## Paralelização

Com `parallelization: true` no config:

- **Trilha Financeira:** Fase 2 → Fase 3 → Fase 4 → Fase 5 (sequencial entre si).
- **Trilha Tarefas:** Fase 6 depende **apenas** da Fase 1 e pode rodar em paralelo com qualquer uma das fases 2–5. Os dois módulos compartilham só Auth, Workspace e o shell de navegação — nenhum lê a coleção de dados do outro.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Acesso e espaço compartilhado** - Duas pessoas entram com Google no mesmo espaço isolado, com categorias em pt-BR e o app usável no celular
- [ ] **Phase 2: Lançar e ver o mês** - Registrar gasto e ganho e ver na hora entradas, saídas e quanto sobra, navegando entre meses
- [ ] **Phase 3: Cartão, fatura e parcelamento** - Compra no cartão cai na fatura certa e a parcela fecha no centavo (maior risco técnico)
- [ ] **Phase 4: Contas fixas e teto por categoria** - Contas que se repetem sozinhas, o que vence e o que já foi pago, e alerta de teto estourado
- [ ] **Phase 5: Assistente de IA — lançar e consultar por conversa** - Escrever "gastei 80 no mercado" e perguntar "quanto gastei com comida?" com resposta tirada dos dados reais
- [ ] **Phase 6: Módulo Tarefas** - Criar, concluir, agendar e repetir tarefas com visão de dia, semana e mês, e lembrete in-app

## Phase Details

### Phase 1: Acesso e espaço compartilhado

**Goal**: Duas pessoas conseguem entrar com a conta Google e compartilhar um mesmo espaço de dados, isolado de qualquer outro, com o app já em português e usável no celular
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, CAT-01, CAT-02, CAT-03, CAT-04, PLAT-01, PLAT-02
**Success Criteria** (what must be TRUE):

  1. Usuário entra com a conta Google e já cai dentro de um espaço criado para ele, sem preencher cadastro nenhum — e consegue sair da conta de qualquer tela
  2. Usuário gera um código de convite, a segunda pessoa cola esse código e, a partir daí, os dois enxergam exatamente as mesmas categorias em tempo real
  3. Um usuário logado em outro espaço não consegue ler nem gravar nada no primeiro espaço — verificado com dois espaços de verdade, não com um só
  4. No primeiro acesso já existem categorias padrão em português; o usuário cria, renomeia, muda a cor e arquiva categorias sem perder o que já foi lançado nelas
  5. Toda tela do app funciona no celular e no desktop sem rolagem horizontal, com textos em pt-BR e valores em R$

**Plans**: 6/6 plans executed em 4 waves

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Fatia tracer: scaffold, emulador, regras base e o caminho login → espaço → tela (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Convite sem backend: `/invites/{token}`, prova de posse do token e resgate transacional (wave 2)
- [x] 01-03-PLAN.md — Linguagem visual e shell: tokens claro/escuro, navegação, menu do avatar, entrar e sair (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Categorias como dado: regra, seeding idempotente das 12 e camada reativa (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-05-PLAN.md — Convite na tela: diálogo de compartilhar e entrada pelo link com as três falhas (wave 4)
- [x] 01-06-PLAN.md — Categorias na tela: lista, criar/editar com a paleta fixa e arquivar (wave 4)

**Cross-cutting constraints:**

- AUTH-07/idempotency: repetir uma leitura já negada continua negada — a regra de isolamento não guarda estado entre requisições
- AUTH-07/concurrency: durante a transação que adiciona um membro ao espaço A, em nenhum instante esse uid ganha leitura no espaço B

**UI hint**: yes

**Notas de fase:**

- Aqui nasce a linguagem visual do app pela skill `frontend-design` — o shell (navegação Financeiro ↔ Tarefas, layout mobile-first) é a primeira superfície e vira referência para todas as fases seguintes.
- As convenções de centavos inteiros e de data de calendário são **fixadas** nesta fase (schema e helpers), mesmo que só fiquem observáveis na Fase 2. Corrigir depois é retrabalho em todo lançamento já gravado.
- Documentar como decisão explícita: (a) a `apiKey` do Firebase é pública por design e quem protege os dados são as Security Rules; (b) conflito offline é last-write-wins e isso é aceito conscientemente; (c) excluir a conta Google de um membro não apaga os dados do espaço.
- Gap a fechar no planejamento: o código de convite precisa funcionar **sem backend** (não há Cloud Functions) — o desenho do fluxo e da regra de segurança que permite a entrada é a pergunta central desta fase.

### Phase 2: Lançar e ver o mês

**Goal**: O usuário registra um gasto ou um ganho em poucos toques e vê imediatamente quanto entrou, quanto saiu e quanto sobra naquele mês
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: LANC-01, LANC-02, LANC-03, LANC-04, LANC-05, MES-01, MES-02, MES-03, MES-04, PLAT-04
**Success Criteria** (what must be TRUE):

  1. Usuário lança um gasto com valor, data e categoria e vê o saldo do mês mudar na hora, sem recarregar a tela
  2. Ao abrir o app, a tela do mês já mostra total de entradas, total de saídas e quanto sobra — sem clique extra e sem escolher filtro
  3. Usuário vê a lista dos lançamentos do mês e quanto gastou em cada categoria, e navega para o mês anterior e o próximo
  4. Usuário edita e exclui um lançamento e todos os totais acompanham na hora
  5. Um lançamento feito às 23h aparece no dia e no mês corretos, não no dia seguinte

**Plans**: TBD
**UI hint**: yes

**Notas de fase:**

- É a fatia vertical que entrega o core value ("em 10 segundos eu sei quanto sobra") na forma mais simples. Tudo depois disso é acréscimo sobre este padrão.
- Valida o padrão `monthKey` + listener escopado por mês que as fases 3, 4 e 5 reaproveitam integralmente.
- Totais são calculados por agregação de leitura no cliente, **não** por documento contador incrementado a cada escrita — evita contenção quando as duas pessoas lançam ao mesmo tempo.
- Critério de fricção (transversal, começa aqui): lançar um gasto tem que caber em poucos toques no celular — é o número que decide se o app sobrevive às primeiras semanas.

### Phase 3: Cartão, fatura e parcelamento

**Goal**: O usuário registra compras no cartão — inclusive parceladas — e cada parcela aparece no mês certo, com a soma fechando exatamente no valor da compra
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: CART-01, CART-02, CART-03, CART-04, CART-05, CART-06, CART-07, PLAT-03
**Success Criteria** (what must be TRUE):

  1. Usuário cadastra um cartão informando data de fechamento e data de vencimento, e lança uma compra nele
  2. Uma compra feita no dia do fechamento e outra feita no dia seguinte aparecem em faturas diferentes
  3. Uma compra parcelada em N vezes aparece com uma parcela em cada mês seguinte, e a soma das parcelas é exatamente o valor total da compra — para qualquer N de 2x a 24x
  4. O gasto de cada parcela entra no mês em que a parcela cai (mês da compra), e o "quanto sobra" daquele mês reflete isso
  5. Usuário vê o total da fatura de cada mês do cartão

**Plans**: TBD
**UI hint**: yes

**Notas de fase:**

- ⚠️ **Maior risco técnico do projeto, posicionado deliberadamente no meio e não no fim.** Se o modelo de fatura estiver errado, todo número já digitado nas fases 1–2 vira lixo e a correção vira migração de dados.
- Dois pitfalls críticos moram aqui: rateio de parcela que perde centavo (Largest Remainder / `allocate()`, resto nas **primeiras** parcelas) e fatura que ignora a diferença entre fechamento e vencimento.
- Consequência aceita e a comunicar na interface: "quanto sobra" reflete compromisso assumido no mês, não dinheiro que já saiu da conta.
- Sem cron: as parcelas dos meses futuros são materializadas no cliente quando aquele mês é acessado. O planejamento precisa fechar o caso "abri direto novembro sem passar por setembro e outubro".

### Phase 4: Contas fixas e teto por categoria

**Goal**: O usuário cadastra a conta que se repete uma única vez e passa a ver, todo mês, o que ainda vai vencer, o que já foi pago e se algum teto de categoria estourou
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: FIXA-01, FIXA-02, FIXA-03, FIXA-04, FIXA-05, FIXA-06, ORCA-01, ORCA-02, ORCA-03
**Success Criteria** (what must be TRUE):

  1. Usuário cadastra o aluguel uma única vez e ele aparece sozinho em todo mês que for aberto, sem redigitar nem reconfirmar
  2. Usuário marca uma conta como paga naquele mês e vê, numa lista só, o que ainda vai vencer e o que já foi pago
  3. Uma conta com vencimento no dia 31 aparece em fevereiro no último dia do mês — nunca some e nunca escorrega para março
  4. Usuário muda o valor ou encerra uma conta fixa e os meses já passados continuam exatamente como estavam
  5. Usuário define um teto de gasto para uma categoria, vê quanto já usou dele e percebe visualmente na tela do mês quando o teto estoura

**Plans**: TBD
**UI hint**: yes

**Notas de fase:**

- Zero fricção repetida é critério de aceite, não polimento: se a conta fixa exigir confirmação manual todo mês, ela deixa de resolver a dor que justifica existir.
- Materialização client-side com horizonte curto ao abrir o mês; ocorrência já materializada é snapshot daquele mês e não é reescrita por edição posterior da definição.
- O teto por categoria soma gasto avulso **e** parcela de cartão do mês — por isso esta fase vem depois da Fase 3, para não recalcular o consumo do teto duas vezes.

### Phase 5: Assistente de IA — lançar e consultar por conversa

**Goal**: O usuário descreve um gasto em linguagem natural e confirma o lançamento em um ou dois toques, e pergunta sobre os próprios gastos recebendo números tirados dos lançamentos reais do espaço
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: IA-01, IA-02, IA-03, IA-04, IA-05, IA-06, IA-07, IA-08
**Success Criteria** (what must be TRUE):

  1. Usuário escreve "gastei 80 no mercado" e recebe uma proposta de lançamento mostrando valor, data, categoria e forma de pagamento interpretados
  2. Usuário corrige qualquer campo da proposta e confirma — e nada é gravado sem essa confirmação explícita
  3. Usuário pergunta "quanto gastei com comida esse mês?" e o número da resposta bate exatamente com o que a tela do mês mostra
  4. A conversa acontece em português coloquial ("almoço 32 no cartão") e a IA responde em pt-BR
  5. A chave da API do provedor de IA não aparece em nenhuma requisição visível no navegador, e uma mensagem pedindo dados de outro espaço não retorna nada

**Plans**: TBD
**UI hint**: yes

**Notas de fase:**

- **O proxy roda fora do Firebase** (Cloudflare Workers ou Vercel Hobby — decidir no planejamento). Ele verifica o Firebase ID token do chamador antes de qualquer chamada ao LLM e é o único lugar que conhece a chave.
- Dois caminhos separados no código, nunca um só: propor lançamento (nunca grava) e responder pergunta (ferramentas somente-leitura). A escrita real acontece pelo caminho normal do cliente, sujeita às mesmas Security Rules do lançamento manual.
- `workspaceId` sempre vem do token verificado, nunca do texto digitado — é a defesa contra prompt injection.
- Resposta sobre gasto **sempre** parte de uma consulta real ao Firestore, com dados pré-filtrados por mês/categoria antes de montar o prompt. Nunca "de memória" e nunca mandando o histórico inteiro.
- Critério duro de produto: se confirmar pela conversa der mais trabalho que preencher o formulário da Fase 2, a feature perdeu a razão de existir. Latência e número de toques são aceite, não otimização posterior.
- Gap a fechar no planejamento: qualidade real do modelo escolhido em pt-BR coloquial, medida contra um conjunto de frases de verdade.

### Phase 6: Módulo Tarefas

**Goal**: O usuário organiza as tarefas do cotidiano — cria, conclui, agenda prazo, faz repetir — e vê o dia, a semana e o mês, sendo avisado dentro do app antes de um prazo chegar
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: TAR-01, TAR-02, TAR-03, TAR-04, TAR-05, TAR-06, TAR-07, TAR-08
**Success Criteria** (what must be TRUE):

  1. Usuário cria uma tarefa, marca como concluída, edita e exclui — e a outra pessoa do espaço vê a mesma lista
  2. Ao abrir o app, o usuário vê as tarefas do dia sem precisar filtrar nada
  3. Usuário define data e hora de prazo, e cria uma tarefa recorrente ("toda segunda", "todo dia 5") que reaparece sozinha nos períodos seguintes
  4. Usuário alterna entre a visão de semana e a de mês, não só a lista solta
  5. Ao abrir o app, o usuário é avisado dentro da própria interface das tarefas cujo prazo está próximo ou já passou

**Plans**: TBD
**UI hint**: yes
**Paralelo com**: Fases 2, 3, 4 e 5 — módulo independente, depende só da Fase 1

**Notas de fase:**

- Fronteira de código, não só de UI: este módulo só toca `tasks`/`taskOccurrences` e nunca lê coleção do financeiro. Compartilha apenas Auth, Workspace e o shell.
- Lembrete é **in-app** (checagem na abertura do app), não push — consequência direta de não ter Blaze. A interface não deve prometer aviso com o app fechado.
- Recorrência reaproveita o mesmo tratamento de fim de mês da Fase 4 (dia 31 em fevereiro cai no último dia) e a mesma convenção de fuso da Fase 1.

## Progress

**Execution Order:**
Fases 1 → 2 → 3 → 4 → 5 na trilha financeira. A Fase 6 entra em paralelo a qualquer momento depois da Fase 1.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Acesso e espaço compartilhado | 6/6 | In Progress|  |
| 2. Lançar e ver o mês | 0/TBD | Not started | - |
| 3. Cartão, fatura e parcelamento | 0/TBD | Not started | - |
| 4. Contas fixas e teto por categoria | 0/TBD | Not started | - |
| 5. Assistente de IA — lançar e consultar por conversa | 0/TBD | Not started | - |
| 6. Módulo Tarefas | 0/TBD | Not started | - |

## Cobertura de requisitos

| Fase | Requisitos | Qtd |
|------|-----------|-----|
| 1 | AUTH-01..07, CAT-01..04, PLAT-01, PLAT-02 | 13 |
| 2 | LANC-01..05, MES-01..04, PLAT-04 | 10 |
| 3 | CART-01..07, PLAT-03 | 8 |
| 4 | FIXA-01..06, ORCA-01..03 | 9 |
| 5 | IA-01..08 | 8 |
| 6 | TAR-01..08 | 8 |
| **Total** | | **56 / 56** |

Nenhum requisito v1 ficou órfão e nenhum aparece em duas fases.

---
*Roadmap criado: 2026-08-27*
