# Architecture Research

**Domain:** App web de planner de tarefas + controle financeiro pessoal compartilhado, com IA conversacional, sobre Firebase (Auth + Firestore + Cloud Functions + FCM)
**Researched:** 2026-08-27
**Confidence:** MEDIUM-HIGH (padrões de modelagem Firestore e regras de segurança confirmados na documentação oficial; recomendações de negócio — como materializar parcelas — são raciocínio aplicado ao caso, não um "padrão canônico" único documentado por terceiros)

## System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Web Responsivo)                        │
│  ┌───────────────┐   ┌───────────────┐   ┌──────────────────────────┐  │
│  │ Shell / Nav    │   │ Módulo         │   │ Módulo                   │  │
│  │ (Auth,         │   │ Financeiro     │   │ Tarefas                  │  │
│  │  Workspace,    │   │ (transações,   │   │ (tasks, recorrência,     │  │
│  │  layout)       │   │ contas, cartão)│   │  lembretes)               │  │
│  └───────┬────────┘   └───────┬────────┘   └────────────┬─────────────┘  │
│          │  Firestore SDK (onSnapshot / query)           │              │
├──────────┴────────────────────┴─────────────────────────┴──────────────┤
│                    Firebase Authentication (Google)                     │
├───────────────────────────────────────────────────────────────────────┤
│                     Cloud Firestore + Security Rules                    │
│  /workspaces/{id}/{transactions|recurringBills|billOccurrences|         │
│    creditCards|cardInvoices|purchases|installments|categories|         │
│    monthlyBudgets|tasks|taskOccurrences|reminders}                      │
├───────────────────────────────────────────────────────────────────────┤
│                          Cloud Functions (server-side)                  │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────────┐  │
│  │ aiProposeEntry │  │ aiAnswerQuery │  │ scheduled: materializeBills │  │
│  │ (LLM → JSON,   │  │ (LLM + tool-  │  │ scheduled: processReminders │  │
│  │  NUNCA grava)  │  │  calling read) │  │ (cron via Cloud Scheduler)  │  │
│  └───────┬────────┘  └───────┬───────┘  └──────────────┬─────────────┘  │
│          │                   │                          │              │
├──────────┴───────────────────┴──────────────────────────┴──────────────┤
│              LLM Provider (chamado só a partir do servidor)             │
│                    Firebase Cloud Messaging (Web Push)                  │
└───────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Componente | Responsabilidade | Implementação típica |
|-----------|----------------|------------------------|
| Auth | Login Google, sessão, uid | Firebase Authentication SDK no cliente |
| Workspace | Resolver o `workspaceId` do usuário logado, expor via contexto | Doc `/users/{uid}` + `/workspaces/{id}`, React Context (ou equivalente) |
| Módulo Financeiro | CRUD de transações, contas fixas, cartão/parcelas, categorias, orçamento; tela de visão mensal | Componentes + hooks que só leem/escrevem as coleções financeiras |
| Módulo Tarefas | CRUD de tarefas, recorrência, visões dia/semana/mês | Componentes + hooks que só leem/escrevem `tasks`/`taskOccurrences` |
| Security Rules | Isolar dados por `workspaceId`, checar membership | `firestore.rules`, função `isMember()` |
| Cloud Functions (AI) | Intermediar LLM ↔ Firestore sem expor chave de API no cliente; nunca gravar sem confirmação | `aiProposeEntry` (proposta), `aiAnswerQuery` (consulta com tool-calling) |
| Cloud Functions (scheduled) | Materializar ocorrências futuras de contas fixas; varrer lembretes vencidos e disparar push | `pubsub.schedule(...)` / Cloud Scheduler |
| FCM | Entregar push web quando o app está fechado | Service worker + token por usuário |

## O modelo de dados no Firestore (a parte mais importante)

### Princípio geral

Firestore cobra por **leitura de documento**, não tem agregação server-side automática (fora as `aggregation queries` dedicadas) e não tem JOINs. Isso empurra o modelo para: (1) coleções organizadas por `workspaceId` como raiz de isolamento, (2) um campo `monthKey` (string `"2026-08"`, ordenável lexicograficamente) denormalizado em todo documento "datado", para permitir range queries baratas por mês, e (3) valores monetários como **inteiros em centavos** (`amountCents`), nunca `float`, para não sofrer com erro de ponto flutuante em somas — um erro comum e caro de corrigir depois em apps financeiros.

### Estrutura proposta

```
/users/{uid}
  displayName, email, photoURL, workspaceId

/workspaces/{workspaceId}
  name, ownerId, memberIds: [uid1, uid2], currency: "BRL",
  timezone: "America/Sao_Paulo", createdAt

  /workspaces/{workspaceId}/categories/{categoryId}
    name, icon, color, isSystemDefault, archivedAt

  /workspaces/{workspaceId}/monthlyBudgets/{monthKey}         # ex: "2026-08"
    ceilings: { [categoryId]: amountCents }                   # 1 doc = teto do mês inteiro

  /workspaces/{workspaceId}/transactions/{transactionId}       # avulsos: gasto e ganho
    type: "expense" | "income"
    amountCents, date (Timestamp), monthKey,
    categoryId (null se income), description,
    paymentMethod: "cash" | "debit" | "pix" | "credit_card" | null,
    createdBy (uid), createdAt, source: "manual" | "ai_chat"

  /workspaces/{workspaceId}/recurringBills/{billId}            # DEFINIÇÃO da conta fixa (indefinida)
    description, amountCents, dueDay (1-31), categoryId,
    active, startMonth (monthKey), createdBy, createdAt

  /workspaces/{workspaceId}/billOccurrences/{occId}            # ocorrência MATERIALIZADA por mês
    recurringBillId, monthKey, dueDate (Timestamp), amountCents,
    categoryId, description, status: "pending" | "paid",
    paidAt, paidBy

  /workspaces/{workspaceId}/creditCards/{cardId}
    name, brand, closingDay, dueDay, limitCents, createdAt

  /workspaces/{workspaceId}/cardInvoices/{invoiceId}           # fatura = 1 doc por cartão por mês
    cardId, monthKey, closingDate, dueDate,
    totalCents (rollup denormalizado, atualizado por transação),
    status: "open" | "closed" | "paid", paidAt

  /workspaces/{workspaceId}/purchases/{purchaseId}             # compra no cartão (pai da parcela)
    cardId, description, categoryId, purchaseDate,
    totalCents, installmentsCount, installmentsPaidCount,
    createdBy, createdAt

  /workspaces/{workspaceId}/installments/{installmentId}       # 1 doc por PARCELA, criado de uma vez
    purchaseId, cardId, installmentNumber, ofTotal,
    amountCents, monthKey, invoiceId, status: "pending" | "invoiced" | "paid"

  /workspaces/{workspaceId}/tasks/{taskId}
    title, notes, dueAt (Timestamp | null), completed, completedAt,
    recurrenceRule ({freq, byDay, ...} | null), reminderOffsetMinutes,
    assignedTo (uid | null), createdBy, createdAt

  /workspaces/{workspaceId}/taskOccurrences/{occId}             # mesmo padrão de billOccurrences
    taskId, dueAt, completed, completedAt

  /workspaces/{workspaceId}/reminders/{reminderId}
    taskOccurrenceId, fireAt (Timestamp), sent (bool),
    userId, channel: "push" | "in_app"

  /workspaces/{workspaceId}/aiConversations/{uid}/messages/{messageId}
    role: "user" | "assistant", text, createdAt, proposedEntry (opcional)
```

### A tensão central: materializar ocorrências futuras ou gerar sob demanda?

Esse é o ponto que mais afeta custo e complexidade em Firestore, e a resposta certa **não é a mesma para contas fixas e para parcelas** — são naturezas diferentes.

**Contas fixas recorrentes (sem data de fim):** recomendo **materialização em horizonte rolante curto** (1–3 meses à frente), não geração 100% sob demanda nem pré-geração de anos de ocorrências.
- Gerar 100% sob demanda (calcular "virtualmente" a partir da definição toda vez que a tela abre) parece elegante, mas quebra na primeira exigência real do produto: "marcar como paga" precisa persistir estado *por mês*, então você acaba precisando de um documento por mês de qualquer forma para guardar `status`/`paidAt`. Ou seja, a alternativa "pura" sem materialização não existe de verdade aqui — o requisito de estado por mês já força um documento.
- Pré-gerar anos de ocorrências antecipadamente (ex: 24 meses de cada conta fixa no momento do cadastro) desperdiça escritas para meses que talvez ninguém nunca abra, e cria um problema de manutenção: se o usuário edita o valor da conta fixa, é preciso decidir se reescreve todas as ocorrências futuras já geradas (uma migração em lote) ou aceita inconsistência.
- **Recomendação concreta:** uma Cloud Function agendada (`materializeBillOccurrences`, rodando 1x/dia ou 1x/mês) garante que sempre existam ocorrências materializadas para o mês atual + os 2 meses seguintes, a partir das definições ativas em `recurringBills`. Como o número de contas fixas de uma casa é pequeno (tipicamente 5–15), isso são poucas dezenas de escritas por execução — irrelevante em custo. Editar uma `recurringBill` só afeta ocorrências *ainda não geradas*; ocorrências já materializadas ficam como "snapshot histórico" daquele mês, o que é inclusive o comportamento correto (mudar o valor do aluguel em setembro não deve reescrever o que já foi pago em agosto).

**Parcelas de compra no cartão (N finito e conhecido no momento da compra):** recomendo **materializar todas as N parcelas de uma vez, no momento em que a compra é lançada**.
- Aqui a lógica é oposta à das contas fixas porque N é finito, pequeno (praticamente sempre ≤ 24, recomenda-se um teto de segurança como 60) e conhecido no instante da escrita — não há "geração futura incerta" para adiar.
- Cada parcela é um fato mutável independente: pode ser paga, cancelada (compra estornada), ou consultada isoladamente ("quanto falta pagar dessa TV parcelada?" = somar `installments` com `purchaseId == X && status != "paid"`). Modelar isso como um cálculo "sob demanda" a partir de uma única definição forçaria recalcular a cada leitura e não teria onde guardar o status de cada parcela.
- O custo de escrita é um burst único e pequeno (ex: compra em 10x = 10 documentos, uma vez), não um job recorrente — o oposto do caso das contas fixas, que são recorrência indefinida.

**Regra geral que fica para o roadmap:** materialize integralmente quando o número de ocorrências futuras é finito e conhecido no momento da escrita (parcelas); use horizonte rolante + job agendado quando a recorrência é indefinida (contas fixas, e futuramente tarefas recorrentes, via `taskOccurrences` no mesmo padrão). Nunca gere tudo "sob demanda" puro quando existe estado mutável por ocorrência (pago/não pago), porque esse estado precisa de um documento para morar.

## Security Rules — isolamento por workspace

O padrão é: o documento raiz `/workspaces/{workspaceId}` guarda `memberIds: [uid1, uid2]`; toda subcoleção usa uma função `isMember()` que lê esse documento pai via `get()`.

```
match /databases/{database}/documents {

  match /workspaces/{workspaceId} {
    allow read, update: if request.auth != null
      && request.auth.uid in resource.data.memberIds;
    allow create: if request.auth != null
      && request.auth.uid in request.resource.data.memberIds;
    allow delete: if false;

    function isMember() {
      return request.auth != null &&
        request.auth.uid in
          get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.memberIds;
    }

    match /transactions/{id}       { allow read, write: if isMember(); }
    match /recurringBills/{id}     { allow read, write: if isMember(); }
    match /billOccurrences/{id}    { allow read, write: if isMember(); }
    match /creditCards/{id}        { allow read, write: if isMember(); }
    match /cardInvoices/{id}       { allow read, write: if isMember(); }
    match /purchases/{id}          { allow read, write: if isMember(); }
    match /installments/{id}       { allow read, write: if isMember(); }
    match /categories/{id}         { allow read, write: if isMember(); }
    match /monthlyBudgets/{id}     { allow read, write: if isMember(); }
    match /tasks/{id}               { allow read, write: if isMember(); }
    match /taskOccurrences/{id}    { allow read, write: if isMember(); }
    match /reminders/{id} {
      allow read: if isMember();
      allow write: if false;  // só o Admin SDK (Cloud Functions) escreve
    }
    match /aiConversations/{uid}/messages/{id} {
      allow read, write: if isMember() && request.auth.uid == uid;
    }
  }
}
```

**Implicação de custo do padrão `get()`:** cada `get()`/`exists()` dentro de uma regra conta como uma leitura faturada (mesmo quando a requisição acaba sendo negada), e o Firestore permite no máximo 10 chamadas desse tipo por avaliação de regra em requisições de documento único ou query (20 em lote/transação). Chamadas idênticas dentro da *mesma* avaliação são cacheadas e não cobradas de novo — mas cada nova query/listener aberto no cliente dispara sua própria avaliação, ou seja, cada tela nova soma pelo menos +1 leitura extra (o `get()` do workspace) além das leituras dos documentos de fato retornados.

Para uma casa de 2 pessoas com volume de uso pessoal (dezenas de leituras por dia, não milhares), esse custo é irrelevante frente à cota gratuita (50 mil leituras/dia no Spark). **Recomendação: use o padrão `get()` acima em v1** — é simples, correto e barato nessa escala. Só considere a alternativa (duplicar `memberIds` em cada documento para eliminar o `get()`) se o app crescer para muitos workspaces simultâneos — não é o caso aqui, e adicionar essa duplicação agora seria complexidade prematura.

## Query e indexação — "totais do mês por categoria"

Firestore oferece três ferramentas com propósitos diferentes; a tela de visão mensal e o assistente de IA devem usar ferramentas **diferentes** entre si:

1. **Queries normais + índices compostos**, para telas com atualização em tempo real. A tela de visão mensal assina (`onSnapshot`) três queries filtradas por `monthKey == mesAtual` (uma em `transactions`, uma em `billOccurrences`, uma em `installments`) e soma/agrupa por categoria **no cliente**. Isso dá reatividade real (quando a outra pessoa lança um gasto, a tela atualiza sozinha) — algo que as aggregation queries **não oferecem**, pois `count()`/`sum()`/`average()` são consultas pontuais, sem suporte a listener em tempo real. Como o volume mensal de uma casa é baixo (dezenas a poucas centenas de documentos), baixar e somar no cliente é barato e simples — não é o caso de "escala" que justificaria rollups. Índices compostos serão necessários sempre que a query combinar `monthKey` com `orderBy(date)` ou com filtro por `categoryId` ao mesmo tempo; declare-os em `firestore.indexes.json` e faça deploy via CI em vez de depender do link de erro `FAILED_PRECONDITION` em produção.

2. **Aggregation queries (`count()`, `sum()`, `average()`)**, para consultas pontuais que não precisam de tempo real — o caso perfeito é o assistente de IA respondendo "quanto gastei com comida esse mês?": uma `sum(amountCents)` filtrada por `monthKey` e `categoryId` é cobrada por lote de até 1000 entradas de índice lidas (não por documento retornado) e não baixa nenhum documento completo para o cliente/função. É a ferramenta certa para uma pergunta de chat (request/response único), errada para uma tela que precisa reagir a mudanças ao vivo.

3. **Documentos de rollup denormalizado** (agregação em tempo de escrita, atualizados via transação a cada gravação), como o `totalCents` já proposto em `cardInvoices`. **Não é necessário para o overview mensal em v1** — o volume de dados de uso pessoal não justifica essa complexidade extra (mais um lugar para ficar inconsistente). Vale reservar o padrão para: (a) o total da fatura do cartão (poucos writes por fatura, alto valor de ter sempre pronto), e (b) uma futura otimização de v2 se o volume crescer muito (ex: importação de extrato bancário via Open Finance, hoje fora de escopo).

**Recomendação direta para a tela de overview:** listeners em tempo real com agregação client-side (opção 1). **Recomendação direta para o assistente de IA:** aggregation queries (opção 2). Rollups (opção 3) só onde já fazem sentido natural (fatura de cartão) — não generalizar.

## Onde a IA roda

### Caminho de escrita (lançar por conversa)

```
Usuário digita "almoço 32 no cartão"
   → Cloud Function callable `aiProposeEntry`
       (NUNCA chamar o provedor de LLM direto do navegador — expõe a chave de API)
   → monta prompt com: categorias reais do workspace, data/timezone atual,
     instrução de responder em pt-BR e produzir JSON estruturado
   → LLM retorna proposta estruturada:
       { type, amountCents, date, categoryId, description, paymentMethod, confidence }
   → Function devolve a proposta ao cliente — SEM gravar nada no Firestore
   → Cliente mostra card de confirmação editável
       ("Confirma? R$32,00 em Alimentação, hoje, no cartão")
   → Só no tap de confirmar, o CLIENTE grava em /transactions com as
     MESMAS Security Rules do lançamento manual (source: "ai_chat")
```

O ponto não negociável (e já é decisão do projeto): a IA nunca tem autoridade de escrita. Ela produz uma proposta; quem grava é sempre o usuário autenticado, pelo caminho normal, sujeito às mesmas regras de segurança do lançamento manual. Isso significa que uma extração errada da IA nunca corrompe dado financeiro silenciosamente — o pior caso é o usuário rejeitar ou editar a proposta.

### Caminho de consulta (perguntar por conversa)

```
Usuário pergunta "quanto gastei com comida esse mês?"
   → Cloud Function callable `aiAnswerQuery`
   → LLM com tool-calling, ferramentas SOMENTE DE LEITURA:
       getCategoryTotal(categoryId, monthKey)
       getMonthSummary(monthKey)
       listRecentTransactions(categoryId, monthKey, limit)
   → a Function injeta workspaceId a partir do contexto de auth verificado
     (NUNCA aceita workspaceId vindo do LLM/usuário como argumento confiável)
   → cada tool executa a aggregation query correspondente (seção anterior)
   → resultado numérico volta para o LLM, que compõe a resposta em pt-BR
     GROUNDED nesse número real do turno atual
```

**Tool-calling em vez de pré-buscar contexto fixo:** a alternativa mais simples — sempre injetar um "pacote" fixo com o resumo do mês atual no prompt, antes de qualquer pergunta — desperdiça tokens/leituras em perguntas que não precisam disso, e não escobre perguntas sobre outro mês ("e em julho?") ou outra categoria sem regenerar o pacote inteiro. Dar ao LLM um punhado de ferramentas de leitura restritas (3 a 5) deixa ele buscar exatamente a fatia certa dos dados, e mantém a superfície de ataque pequena: as ferramentas expostas à função de consulta são estritamente somente-leitura, garantido pelo *código* da Function, não por instrução de prompt (que pode ser contornada por injeção via mensagem do usuário).

**Duas Functions separadas, não uma:** `aiProposeEntry` (fluxo de escrita/proposta) e `aiAnswerQuery` (fluxo de leitura/tool-calling) devem ser funções distintas, para que o fluxo de consulta jamais tenha acesso a ferramentas de escrita por acidente de composição de código.

## Fronteiras dos módulos (financeiro × tarefas)

Decisão já tomada no PROJECT.md: os dois módulos são independentes na v1. Isso é uma fronteira de **código**, não só de UI — nenhum dos dois módulos deve importar camada de dados do outro.

**Compartilhado:** Auth (`AuthProvider`/`useAuth`), Workspace (`WorkspaceProvider`/`useWorkspace` — resolve `workspaceId` uma vez, expõe para os dois), e o shell/navegação (layout, nav entre "Financeiro" e "Tarefas").

**Isolado:** o módulo Financeiro só referencia as coleções `transactions`, `recurringBills`, `billOccurrences`, `creditCards`, `cardInvoices`, `purchases`, `installments`, `categories`, `monthlyBudgets`. O módulo Tarefas só referencia `tasks`, `taskOccurrences`, `reminders`. Nenhum dos dois lê a coleção do outro diretamente.

```
src/
  app/                       # shell, roteamento, layout de topo
  modules/
    finance/
      components/
      hooks/                 # useMonthTransactions, useCategoryTotals...
      data/                  # refs/converters Firestore, só coleções financeiras
      ai/                    # chat UI, chamadas a aiProposeEntry/aiAnswerQuery
    tasks/
      components/
      hooks/
      data/                  # refs/converters Firestore, só tasks/taskOccurrences
  shared/
    auth/
    workspace/
    ui/                      # design system
  functions/                 # Cloud Functions (deploy separado)
    aiProposeEntry.ts
    aiAnswerQuery.ts
    scheduled/
      materializeBillOccurrences.ts
      processReminders.ts
```

Se no futuro (fora do escopo da v1, explicitamente) quiser ligar "conta a pagar vira tarefa", isso deve ser construído como uma ponte explícita e opcional (ex: um trigger de Cloud Function ou uma coleção `links` separada) — nunca fazendo um módulo ler a coleção do outro diretamente. Isso preserva a capacidade de versionar, ou até remover, qualquer um dos dois módulos sem tocar no outro.

## Lembretes / notificações

A pergunta real aqui é "como um lembrete de tarefa dispara de fato num app web", e a resposta tem uma limitação de plataforma que precisa entrar no roadmap desde já:

**No iOS Safari, push web só funciona se o usuário instalou o app na tela de início ("Adicionar à Tela de Início")** — sem isso, não há push, ponto. Esse suporte existe desde Safari/iOS 16.4; em navegador comum (aba normal), iOS não entrega push web. Android/Chrome/desktop não têm essa exigência.

Por isso, recomendo três camadas, não uma:

1. **In-app / ao abrir o app (baseline sempre funciona):** ao abrir o app, checar lembretes vencidos/próximos e mostrar banner/badge. Zero infraestrutura de servidor, funciona em qualquer navegador, mas só dispara se o usuário abrir o app.
2. **Web Push via FCM (melhoria progressiva):** service worker + permissão de notificação + token FCM salvo no doc do usuário; uma Cloud Function agendada varre lembretes vencidos e envia via FCM Admin SDK. É essencial comunicar ao usuário de iPhone, na própria UI, que precisa "adicionar à tela de início" para o push funcionar — sem esse aviso, a experiência parece quebrada e ninguém entende por quê.
3. **Mecanismo de disparo:** como o horário de cada lembrete é arbitrário (não é um cron fixo diário), o padrão é uma Cloud Function agendada rodando em intervalo curto (ex: a cada 5 minutos) que consulta `reminders` onde `fireAt <= now && sent == false`, envia o push e marca `sent: true`. Cron fixo do Cloud Scheduler não sabe "às 14:37 de hoje" — é esse polling curto que resolve isso.

**Implicação de custo/plano a levar para o roadmap:** funções agendadas (`pubsub.schedule`) exigem o plano Blaze (pay-as-you-go) do Firebase, porque dependem do Cloud Scheduler — mesmo que o uso real fique dentro da cota gratuita para um app de 2 pessoas. Ou seja, a fase que introduz lembretes por push (ou a materialização automática de ocorrências futuras, que também usa Function agendada) é o ponto em que o projeto precisa estar no plano Blaze — vale fazer esse upgrade cedo (fase de fundação), não como surpresa numa fase tardia.

## Scaling Considerations

| Escala | Ajuste de arquitetura |
|-------|--------------------------|
| Uso real do produto (2 pessoas, uma casa) | Tudo neste documento já é suficiente; nenhum rollup adicional, nenhuma paginação agressiva necessária |
| Múltiplos workspaces hipotéticos (fora de escopo v1, produto não é multi-tenant público) | Reavaliar custo de `get()` nas regras; considerar duplicar `memberIds` nos documentos filhos para eliminar a leitura extra por request |
| Alto volume de lançamentos (ex: importação de extrato bancário, v2) | Introduzir rollups denormalizados por mês (`monthlyRollups/{monthKey}`) atualizados transacionalmente, para não somar centenas de documentos no cliente a cada abertura de tela |

### Scaling Priorities

1. **Primeiro ponto de atenção (não é gargalo de escala, é de consistência):** o rollup `totalCents` de `cardInvoices` precisa ser atualizado transacionalmente (ou via Cloud Function trigger em `installments`/`purchases`) para não dessincronizar do somatório real das parcelas.
2. **Segundo ponto de atenção:** se `recurringBills` for editado com frequência, garantir que a Function `materializeBillOccurrences` só regenere ocorrências futuras ainda não tocadas pelo usuário (não sobrescrever uma ocorrência já marcada como paga).

## Anti-Patterns

### Anti-Pattern 1: pré-gerar anos de ocorrências de contas fixas no cadastro

**O que as pessoas fazem:** ao cadastrar uma conta fixa recorrente, criam de uma vez 24-60 documentos de ocorrência futura.
**Por que é errado:** desperdiça escritas para meses que talvez nunca sejam abertos, e cria um problema de migração toda vez que o valor da conta muda (reescrever tudo? deixar inconsistente?).
**Fazer em vez disso:** horizonte rolante curto (1-3 meses) mantido por uma Function agendada, como descrito na seção de modelagem.

### Anti-Pattern 2: dar ao LLM acesso direto a queries Firestore arbitrárias

**O que as pessoas fazem:** expor uma ferramenta genérica tipo `runFirestoreQuery(collection, filters)` para o LLM "resolver sozinho" qualquer pergunta.
**Por que é errado:** reabre a possibilidade de o LLM cruzar dados fora do escopo pretendido, gerar queries caras/sem índice, ou (via injeção de prompt na própria mensagem do usuário) tentar ler/gravar algo fora do previsto.
**Fazer em vez disso:** um conjunto pequeno e nomeado de ferramentas (`getCategoryTotal`, `getMonthSummary`...) implementadas no código da Function, com `workspaceId` sempre injetado a partir do contexto de autenticação verificado — nunca aceito como argumento do LLM.

### Anti-Pattern 3: chamar o provedor de LLM direto do navegador

**O que as pessoas fazem:** colocar a chave de API do provedor de IA num `.env` do frontend para "simplificar" o MVP.
**Por que é errado:** qualquer chave de API embutida em código que roda no navegador é pública — extraível via DevTools — e abre a porta para uso indevido de créditos/custos.
**Fazer em vez disso:** toda chamada ao LLM passa por uma Cloud Function callable autenticada, que segura a chave no ambiente do servidor (Secret Manager / config de Functions).

## Integration Points

### External Services

| Serviço | Padrão de integração | Observações |
|---------|---------------------|-------------|
| Firebase Authentication (Google) | SDK cliente, popup/redirect de login | Único provedor — decisão já tomada, sem cadastro próprio |
| Cloud Firestore | SDK cliente para leitura/escrita direta (sujeita a Security Rules); Admin SDK só em Cloud Functions | Nenhuma escrita do LLM sem passar pelo caminho normal do cliente |
| Cloud Functions | Callable functions (`aiProposeEntry`, `aiAnswerQuery`) + funções agendadas | Exige plano Blaze desde o início do projeto |
| LLM Provider | Chamado só a partir de Cloud Functions, nunca do navegador | Escolha específica de provedor/modelo fica para STACK.md |
| Firebase Cloud Messaging | Service worker + token por usuário, envio via Admin SDK | Limitação real em iOS Safari sem instalação como PWA |

### Internal Boundaries

| Fronteira | Comunicação | Observações |
|----------|---------------|-------------|
| Módulo Financeiro ↔ Módulo Tarefas | Nenhuma direta na v1 | Compartilham só Auth, Workspace e shell |
| Cliente ↔ Cloud Functions (AI) | Callable functions (HTTPS) | Escrita real acontece só depois da confirmação, pelo caminho normal do cliente |
| Cloud Functions agendadas ↔ Firestore | Admin SDK, bypassa Security Rules | Único lugar autorizado a escrever em `reminders` |

## Ordem de construção sugerida (cadeia de dependência)

1. **Fundação:** projeto Firebase, plano Blaze (necessário desde já por causa das Functions agendadas), Auth Google, Firestore inicializado.
2. **Workspace + Security Rules base:** doc `/workspaces/{id}` com `memberIds`, função `isMember()`. Bloqueia tudo que vem depois, porque toda regra de subcoleção depende dela.
3. **Categorias:** seed de categorias padrão na criação do workspace. Bloqueia transações e orçamento, que referenciam `categoryId`.
4. **Núcleo financeiro — transações avulsas (gasto/ganho) + navegação por mês:** a fatia vertical mais simples que já entrega o core value ("em 10 segundos sei quanto gastei"). Deve vir antes de contas fixas/cartão porque valida o padrão `monthKey` que todo o resto reaproveita.
5. **Tela de visão mensal (totais por categoria, entradas/saídas/sobra):** depende de (4) ter dados reais; valida a estratégia de query/índice antes de mais coleções existirem.
6. **Contas fixas recorrentes** (definição + `billOccurrences` + marcar paga): depende de (3) categorias; reaproveita o padrão `monthKey` de (4)-(5).
7. **Cartão de crédito, fatura e compras parceladas:** a peça de modelo mais complexa (purchases + installments + rollup de fatura); depende de (3) e se beneficia do padrão `monthKey` já validado em (4)-(6).
8. **Orçamento por categoria** (`monthlyBudgets` + indicador de teto estourado na visão mensal): depende de (3) e (5).
9. **Assistente de IA — caminho de escrita** (`aiProposeEntry` → confirmação → grava pelo caminho normal já construído em 4/6/7): precisa que o modelo financeiro já esteja estável, porque o schema estruturado que o LLM produz espelha o schema do Firestore.
10. **Assistente de IA — caminho de consulta** (`aiAnswerQuery` com tool-calling sobre aggregation queries): depende do padrão de query de (5) e da UI de chat criada em (9).
11. **Módulo Tarefas** (CRUD, recorrência, visões dia/semana/mês): independente do financeiro — só precisa de (1) e (2), então pode ser construído em paralelo ao bloco 3-10, respeitando a decisão de módulos desacoplados.
12. **Lembretes** (baseline in-app → push FCM como melhoria progressiva): depende de (11) existir; a camada de push reaproveita o plano Blaze já ativado em (1).

**Observação de sequenciamento para o roadmap:** os blocos 3-10 (financeiro) e o bloco 11 (tarefas) são paralelizáveis entre si depois da fundação (1-2) — isso é coerente com a decisão explícita de módulos independentes e pode ser usado para estruturar fases que rodam em paralelo, se o processo de execução permitir.

## Sources

- [Structure security rules — Firestore (Google Cloud Docs)](https://cloud.google.com/firestore/docs/security/rules-structure)
- [Writing conditions for Cloud Firestore Security Rules (Firebase)](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Summarize data with aggregation queries — Firestore (Firebase)](https://firebase.google.com/docs/firestore/query-data/aggregation-queries)
- [Write-time aggregations — Firestore (Firebase)](https://firebase.google.com/docs/firestore/solutions/aggregation)
- [Understand reads and writes at scale — Firestore (Firebase)](https://firebase.google.com/docs/firestore/understand-reads-writes-scale)
- [Sending to MacOS, iOS Safari using FCM JS SDK (Firebase Blog)](https://firebase.blog/posts/2023/08/fcm-for-safari/)
- [Using Push Notifications in PWAs: The Complete Guide (MagicBell)](https://www.magicbell.com/blog/using-push-notifications-in-pwas)
- [The Firebase Blog: Scheduling Cloud Functions for Firebase (cron)](https://firebase.googleblog.com/2019/04/schedule-cloud-functions-firebase-cron.html)
- [Tutorial: Dynamic Scheduled Background Jobs in Firebase (Fireship)](https://fireship.io/lessons/cloud-functions-scheduled-time-trigger/)

---
*Architecture research for: personal finance + task planner web app on Firebase (pt-BR, shared 2-person workspace)*
*Researched: 2026-08-27*
