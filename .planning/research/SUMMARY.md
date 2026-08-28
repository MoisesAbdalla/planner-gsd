# Project Research Summary

**Project:** Cotidiano (nome provisório)
**Domain:** App web de finanças pessoais compartilhadas + planner de tarefas, com assistente de IA conversacional (mercado brasileiro, pt-BR)
**Researched:** 2026-08-27
**Confidence:** MEDIUM-HIGH

> Nota de processo: o agente sintetizador produziu esta síntese mas falhou ao gravar o arquivo (falso-bloqueio conhecido, issue #222). O orquestrador reconstruiu o documento no formato do template a partir do retorno do agente e dos quatro documentos de pesquisa no disco. O conteúdo é do sintetizador; a formatação é do orquestrador.

## Executive Summary

Cotidiano é um app web (SPA atrás de login, sem superfície pública) que junta dois módulos deliberadamente independentes: controle financeiro pessoal compartilhado entre duas pessoas e um planner de tarefas. O valor central declarado — *"em 10 segundos eu sei quanto gastei, com o quê, e quanto sobra"* — é o que ordena todas as decisões abaixo: qualquer coisa que introduza erro silencioso nos números é risco existencial, não bug cosmético.

A pesquisa converge numa recomendação de stack clara: **Vite + React SPA** (não Next.js — o `onSnapshot` do Firestore só roda no cliente, e sem página pública não há SSR a justificar a complexidade de ponte de cookie de auth), **Firebase Hosting estático**, **Tailwind v4 + shadcn/ui** (componentes copiáveis e restilizáveis, compatíveis com a exigência de design conduzido pela skill `frontend-design`), e a **camada de IA rodando exclusivamente dentro de Cloud Functions** — nunca no navegador, porque a chave do provedor de LLM vazaria no bundle. Dinheiro é armazenado em **centavos inteiros** e manipulado com **Dinero.js `allocate()`**; datas usam **date-fns v4 + `@date-fns/tz`** com o fuso `America/Sao_Paulo` explícito.

Os três riscos que decidem se o produto funciona: (1) **modelagem de fatura de cartão** — distinguir data de fechamento de data de vencimento, porque parcelamento é comportamento normal no Brasil e não caso de borda; errar aqui torna *todos* os números errados; (2) **a IA gravando dado errado em silêncio** — mitigado pela confirmação obrigatória já decidida no PROJECT.md, e pela exigência de que toda resposta sobre gastos venha de consulta real ao Firestore, nunca da memória do modelo; (3) **abandono por fricção de digitação** — como import automático e OCR foram adiados para v2, todo lançamento depende de digitar ou conversar, e é exatamente por isso que a IA conversacional não é enfeite na v1, é a principal defesa contra o app morrer nas primeiras semanas.

## Key Findings

### Recommended Stack

Ver `STACK.md` para o documento completo com alternativas e justificativas. Versões verificadas ao vivo no npm registry em 2026-08-27/28 — reconfirmar no momento real da instalação, especialmente no ecossistema de IA, que se move rápido.

**Core technologies:**

- `vite` 8.2.2 + `react`/`react-dom` 19.2.8 + `typescript` 7.0.2 — SPA atrás de login — HIGH
- `@tanstack/react-router` 1.170.32 — rotas e search-params tipados — MEDIUM
- Firebase Hosting (estático) — hospedagem — HIGH (App Hosting/Cloud Run é peso desnecessário sem SSR)
- Firebase Auth (Google) + Cloud Firestore — identidade e persistência — decidido pelo usuário, não questionado
- Tailwind v4 + shadcn/ui — estilo sem identidade visual imposta, compatível com a skill `frontend-design`
- `ai` 7.x + `@ai-sdk/google` 4.x dentro de Cloud Functions v2 `onCall` — camada de IA — MEDIUM (confirmar pareamento de major version na instalação)
- Dinero.js v2 — aritmética em centavos e `allocate()` para ratear parcelas — HIGH
- `date-fns` v4 + `@date-fns/tz` (locale pt-BR) + `rrule.js` — datas, fuso e recorrência — MEDIUM-HIGH
- Firebase Emulator Suite — testes, inclusive de Security Rules — HIGH

**Não usar:** Next.js App Router para este app; Vercel como host; MUI/Ant/Chakra (conflitam com design intencional); chamada de LLM direto do navegador; RAG com embeddings para consulta financeira (dado financeiro exige exatidão, não similaridade semântica); `number` float para dinheiro; Moment.js; Temporal nativo como base hoje; Redux/MobX.

### Expected Features

Ver `FEATURES.md`. Categorias sugeridas como prefixos de requisito: Autenticação, Espaço, Categorias, Lançamentos, Contas Fixas, Cartão, Orçamento, Assistente IA, Tarefas.

**Must have (table stakes):**
- Lançamento manual rápido de gasto avulso com categoria — sem isso não há produto
- Contas fixas recorrentes com vencimento e estado pago/não pago por mês
- Compra parcelada no cartão distribuída corretamente nas faturas futuras — referência é o Mobills; o Minhas Economias erra exatamente aqui, tratando cartão como conta corrente
- Visão do mês: entradas, saídas, quanto sobra, e gasto por categoria
- Navegação entre meses
- Categorias editáveis

**Should have (competitive):**
- Lançamento por conversa em linguagem natural — já é categoria validada no Brasil fora dos apps tradicionais (assistentes via WhatsApp: Jota, ZapGastos, Focca-Ai, Financinha), então não é aposta especulativa
- Consulta por conversa sobre os próprios dados
- Confirmação editável antes de gravar — padrão de confiança que se repete em Copilot Money e Monarch Money
- Teto de orçamento por categoria com aviso de estouro

**Defer (v2+):**
- Import de extrato via Open Finance e OCR de comprovante — já adiados por decisão do usuário
- Antecipação de parcelas futuras
- Divisão de despesas / settle-up entre as duas pessoas — categoria de produto separada (Splitwise, Fikko) que conflita com o modelo simples de espaço compartilhado

### Architecture Approach

Ver `ARCHITECTURE.md` para o modelo de dados Firestore concreto (paths e campos), Security Rules e estratégia de índices. A decisão estrutural mais importante: **contas fixas e parcelas de cartão têm naturezas diferentes e não devem seguir a mesma regra de materialização** — contas fixas têm recorrência indefinida e pedem horizonte rolante materializado por Cloud Function agendada (1–3 meses à frente); parcelas têm N finito e conhecido no momento da compra e pedem materialização total de uma vez.

**Major components:**
1. **Fundação** — Auth Google, documento de workspace, membership, Security Rules com `workspaceId` no path dos documentos
2. **Núcleo financeiro** — lançamentos como subcoleção (nunca array embutido, por causa do limite de 1 MiB), em centavos inteiros, com `monthKey` para consulta mensal
3. **Cartão e faturas** — conta de cartão com data de fechamento e vencimento como atributos de primeira classe; parcelas materializadas na compra
4. **Camada de leitura** — tela mensal usa listeners em tempo real com soma no cliente (volume pessoal é baixo); aggregation queries do Firestore não suportam `onSnapshot`, então ficam para o caminho request/response
5. **Duas Cloud Functions de IA separadas** — `aiProposeEntry` (propõe, nunca grava) e `aiAnswerQuery` (consulta o Firestore antes de responder); a IA nunca tem autoridade de escrita direta
6. **Módulo Tarefas** — independente do financeiro, compartilhando apenas auth, workspace e shell de navegação
7. **Lembretes** — Cloud Function agendada + FCM web push, com baseline in-app que sempre funciona

### Critical Pitfalls

Ver `PITFALLS.md` para os 20 pitfalls completos com sinais de alerta e mapeamento por fase.

1. **Float para dinheiro e rateio de parcela sem fechar centavos** — R$ 100,00 em 3x não divide exato; usar centavos inteiros e o Largest Remainder Method (`allocate()`), com teste de que a soma das parcelas bate exatamente com o total, de 2x a 24x
2. **Fatura sem distinguir fechamento de vencimento** — compra feita depois do fechamento cai na fatura seguinte; errar isso torna todo número errado. Teste não-negociável: compra no dia do fechamento vs. dia seguinte caem em faturas diferentes
3. **`workspaceId` fora do path do documento** — leva a vazamento cross-workspace; há caso real documentado de 181 mil registros expostos exatamente por esse erro. Security Rules restritivas testadas com dois workspaces desde a fase 1
4. **IA respondendo "de memória" em vez de buscar no Firestore** — exige arquitetura de tool-calling, não só um bom prompt. E `workspaceId` sempre do contexto de auth, nunca do texto livre, para mitigar prompt injection
5. **Fuso horário e fim de mês** — conta fixa no dia 31 em fevereiro, e drift UTC vs. `America/Sao_Paulo` jogando lançamento no mês errado. Convenção única de data de calendário fixada na fundação
6. **Abandono por fricção** — dados de mercado indicam ~67% de abandono em 30 dias em apps de entrada manual (fonte de confiança BAIXA, tratar como indicativo). A fricção do fluxo de confirmação da IA é critério de aceite transversal, não detalhe

## Implications for Roadmap

Sequência conciliada a partir das quatro propostas de ordenação, que divergiam entre si (ver tabela de divergências adiante).

### Phase 1: Fundação e Segurança
**Rationale:** Nada financeiro pode ser construído antes das convenções que, se erradas, corrompem dado silenciosamente — e Security Rules frouxas "para desenvolver" quase nunca são apertadas depois.
**Delivers:** Auth Google, plano Blaze ativado, documento de workspace, entrada do segundo usuário, categorias semente, Security Rules testadas com dois workspaces, convenção de centavos inteiros e de data de calendário fixada.
**Addresses:** Autenticação, Espaço, Categorias
**Avoids:** Pitfalls 3 (vazamento cross-workspace), 5 (fuso), e a armadilha de esquema em array

### Phase 2: Lançamentos avulsos e navegação mensal
**Rationale:** Fatia vertical mínima do core value — dá para registrar um gasto e vê-lo no mês certo. Valida o padrão `monthKey` antes de qualquer complexidade.
**Delivers:** Lançar gasto avulso e ganho, ver no mês, navegar entre meses.
**Uses:** Firestore subcoleções, Dinero.js, date-fns com fuso explícito

### Phase 3: Visão mensal
**Rationale:** Valida a estratégia de query e índice antes de acrescentar mais formas de lançamento.
**Delivers:** Entradas, saídas, quanto sobra, gasto por categoria.
**Implements:** Camada de leitura com listeners em tempo real

### Phase 4: Contas fixas recorrentes
**Rationale:** Introduz a Cloud Function agendada e a materialização por horizonte rolante — a primeira peça de infraestrutura assíncrona.
**Delivers:** Cadastro de conta fixa, repetição mensal automática, marcar como paga.

### Phase 5: Cartão, fatura e parcelamento ⚠️ MAIOR RISCO TÉCNICO
**Rationale:** Todos os pesquisadores concordam que este bloco deve vir **antes** da IA — o assistente precisa de um esquema financeiro estável para propor lançamentos corretos. E é o bloco onde os concorrentes brasileiros erram, então acertar aqui é diferenciação real.
**Delivers:** Conta de cartão com fechamento e vencimento, compra parcelada distribuída nas faturas futuras.
**Avoids:** Pitfalls 1 e 2
**Decisão de produto pendente:** gasto conta no mês da compra ou no mês da fatura? A pesquisa identificou o tradeoff mas não o resolveu — é decisão do usuário, não da pesquisa.

### Phase 6: Orçamento por categoria
**Rationale:** Depende de os lançamentos já agregarem corretamente.
**Delivers:** Teto por categoria e sinal de estouro. Versão mínima — realocação entre categorias fica para v2+.

### Phase 7: Assistente IA — lançar por conversa
**Rationale:** Depende de categorias e do esquema financeiro estável (fase 5).
**Delivers:** `aiProposeEntry` em Cloud Function, com confirmação editável obrigatória antes de gravar.
**Avoids:** Pitfall 4 e exposição de chave de API
**Critério duro:** latência até a confirmação precisa ser competitiva com o formulário manual — se for mais lento que digitar, perde a razão de existir.

### Phase 8: Assistente IA — consultar por conversa
**Rationale:** Pode paralelizar com a fase 7 — ambas dependem da 5, não uma da outra.
**Delivers:** `aiAnswerQuery` com tool-calling que consulta o Firestore de verdade antes de responder.

### Phase 9: Módulo Tarefas
**Rationale:** Independente do financeiro por decisão de produto; paralelizável a partir da fundação. Compartilha a implementação de recorrência (`rrule`) com a fase 4.
**Delivers:** CRUD de tarefa, lista do dia, prazo, recorrência, visão de semana e mês.

### Phase 10: Lembretes
**Rationale:** Depende das tarefas existirem.
**Delivers:** Cloud Function agendada + FCM web push, com baseline in-app.
**Restrição de UX:** push no iOS Safari só funciona com o app instalado na tela de início — isso precisa virar aviso visível na interface, não nota de rodapé.

### Phase Ordering Rationale

- O bloco de maior risco técnico (cartão/parcelamento) vem no meio, não no fim: descobrir tarde que o modelo de fatura está errado invalida todos os números já lançados.
- A IA vem depois do esquema financeiro estabilizar — o assistente não pode propor lançamentos numa estrutura que ainda vai mudar.
- Tarefas é paralelizável a partir da fundação, coerente com a decisão de módulos independentes registrada no PROJECT.md.
- Security Rules são endurecidas na fase 1, quando a primeira escrita (categorias) acontece — não "quando der".
- `firestore.indexes.json` declarado antes de cada novo padrão de query, para não descobrir `FAILED_PRECONDITION` em produção.

### Research Flags

Fases que provavelmente precisam de pesquisa mais funda no planejamento:
- **Fase 1:** fluxo exato de entrada do segundo usuário no workspace (código de convite vs. e-mail pré-associado) — é lacuna de design de produto, não resposta técnica
- **Fase 5:** validar o modelo de fatura contra documentação real de app brasileiro, e fechar a decisão mês-da-compra vs. mês-da-fatura com o usuário
- **Fase 7:** qualidade real do modelo escolhido em pt-BR coloquial (gírias, abreviações, "50 no mercado"), e benchmark de latência ponta a ponta contra a API real

Fases com padrões estabelecidos (dá para pular pesquisa):
- **Fases 2, 3, 6:** padrões de transação e orçamento validados pelo mercado
- **Fase 9:** `rrule` é RFC-5545, bem documentado

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Versões verificadas ao vivo no npm; a tensão Firestore-realtime vs. RSC é logicamente sólida. Ecossistema de IA muda rápido — reconfirmar na instalação |
| Features | MEDIUM-HIGH | MVP alinhado com consenso Mobills/Organizze/YNAB; modelo de parcelamento validado. A hipótese IA+confirmação ainda não foi testada com uso real |
| Architecture | MEDIUM-HIGH | Padrões Firestore confirmados na documentação oficial. A separação de materialização (contas fixas vs. parcelas) é lógica derivada, não padrão canônico documentado por terceiros |
| Pitfalls | MEDIUM | Extraídos de padrões de indústria; nenhum é específico deste projeto, mas todos se aplicam a Firestore + finanças + IA |

**Overall confidence:** MEDIUM-HIGH na ordenação de fases e no stack; MEDIUM em se o uso real valida a hipótese conversacional.

### Gaps to Address

- **Entrada do segundo usuário no workspace** — decidir na fase 1 (código de convite ou e-mail pré-associado), junto com sair do espaço e excluir conta
- **Contabilização mês-da-compra vs. mês-da-fatura** — decisão explícita do usuário na fase 5, não assumida pela pesquisa
- **Qualidade do LLM em pt-BR coloquial** — validar na fase 7 com um conjunto real de descrições de gasto
- **Custo real do Blaze** — dois usuários + chamadas de IA + funções agendadas por um mês; medir cedo em vez de estimar
- **Conflito offline** — aceitar last-write-wins ou implementar merge; irrelevante com dois usuários, mas decidir conscientemente
- **Lista padrão de categorias pt-BR** — definir em requirements/design
- **Tom das mensagens de estouro de orçamento** — achado de UX de confiança baixa; validar com uso real

### Onde os pesquisadores divergiram

| Divergência | Resolução |
|---|---|
| Materialização: contas fixas e parcelas sob a mesma regra (FEATURES) vs. regras separadas (ARCHITECTURE) | Arquitetura está certa — recorrência indefinida e N finito são naturezas diferentes |
| IA junto do MVP (FEATURES) vs. depois do esquema estabilizar (ARCHITECTURE) | Fases 7–8, depois da fase 5; ambas P1, paralelizáveis entre si |
| Security Rules: implícitas na fundação vs. "com a primeira feature que escreve" vs. "dia 1" | Fase 1, quando categorias são escritas — endurecidas e testadas ali |
| Estratégia de índice | Declarar `firestore.indexes.json` antes de cada novo padrão de query |

### Consequências de custo e de interface a comunicar

- **Plano Blaze é obrigatório desde a fase 1** — Cloud Scheduler não roda no Spark, e funções agendadas sustentam tanto lembretes quanto a materialização de meses futuros. Exige cartão cadastrado no Google Cloud.
- **Push no iOS Safari exige PWA instalado** na tela de início (desde iOS 16.4) — requisito de UX explícito, com degradação graciosa para aviso in-app.
- **A chave do provedor de LLM nunca pode ir para o cliente** — e isso é problema *diferente* da `apiKey` pública do Firebase, que é pública por design e não protege dado nenhum (quem protege são as Security Rules). Confundir os dois leva a esforço de segurança mal direcionado.

## Sources

### Primary (HIGH confidence)
- Documentação oficial Firebase/Google Cloud — Security Rules (`rules-structure`, `rules-conditions`, `rules-query`, `insecure-rules`), aggregation queries, write-time aggregations, `understand-reads-writes-scale`, `storage-size`, contadores distribuídos, `manage indexes`, `api-keys`, security checklist, emulator setup e testes de rules
- firebase.google.com/docs/hosting/frameworks/nextjs e firebase.blog (App Hosting GA, "App Hosting vs. Hosting") — status de SSR
- Firebase Blog — FCM para Safari/iOS; firebase.googleblog.com — agendamento de Cloud Functions
- npm registry consultado diretamente (`npm view <pacote> version`) em 2026-08-27/28 — números de versão
- dinerojs.com — comportamento de `allocate()`
- ai.google.dev/gemini-api/docs/models — nomenclatura de modelo (verificar id atual antes de implementar)

### Secondary (MEDIUM confidence)
- Mobills (central de ajuda: transação parcelada no cartão; blog: parcelamento de fatura, finanças compartilhadas), Organizze (blog e central de ajuda sobre fatura), Minhas Economias, Nubank (Tecnoblog, Oficina da Net) — comportamento real de apps brasileiros
- Mercado Pago e Serasa — data de fechamento vs. vencimento da fatura
- YNAB (zero-based budgeting), Monarch Money (AI features), Copilot Money (The College Investor 2026) — padrões globais e de IA
- Todoist (datas recorrentes, lembretes), TickTick, Google Tasks (TasksBoard, Android Authority), Any.do — planner
- ZapGastos, Financinha, Focca-Ai, Jota — validação de mercado de assistente financeiro conversacional em pt-BR
- Robin Wieruch e Honeybadger — erros de arredondamento e cálculo de moeda em JavaScript
- Medium (algoritmo por trás de Tricount/Splitwise) — rateio
- DEV Community — guia completo de datas em JavaScript e o bug de "off by 1 day"
- NerdWallet e SoFi — closing date vs. due date
- explainx.ai — breach real do Firestore (181.874 registros); sashido.io — armadilhas de preço do Blaze 2026; frontendaccelerator.com — controle de custo de leitura; codegenes.net — `FAILED_PRECONDITION`
- ismysitehackable.com — por que a config web do Firebase é pública por design
- Baytech Consulting — alucinação de IA em serviços financeiros; tldrsec/prompt-injection-defenses (GitHub); AWS — proteção contra prompt injection indireto; OpenAI Help Center e Backmesh — segurança de chave de API
- Bill.com e Stripe Docs — semântica de recorrência e ciclo de cobrança

### Tertiary (LOW confidence — validar antes de usar como base de decisão)
- SpendTrak, Strategia-X, Beaverise — estatísticas de abandono de apps de orçamento (~67% em 30 dias); blogs especializados, não fonte primária revisada
- Appthetics — padrões de UX de apps de orçamento
- Koody — orçamento compartilhado para casais
- MagicBell — guia de push em PWAs

---
*Research completed: 2026-08-27*
*Ready for roadmap: yes*
