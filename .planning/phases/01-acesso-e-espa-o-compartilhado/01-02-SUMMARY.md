---
phase: 01-acesso-e-espa-o-compartilhado
plan: 02
subsystem: auth
tags: [firebase, firestore, security-rules, invite-link, optimistic-concurrency, crypto-randomuuid, rules-unit-testing]

# Dependency graph
requires:
  - phase: 01-01
    provides: "firestore.rules real com isMember(wsId), /users/{uid} e /workspaces/{workspaceId} (memberIds: string[]); tests/rules-harness.ts; padrão de mock de src/shared/firebase/client.ts para testar contra uids específicos no emulador"
provides:
  - "/invites/{token} — coleção de nível raiz, token = ID do documento; get aberto a qualquer autenticado, list sempre negado, create validado (isMember, createdBy, status, expiresAt em faixa), update restrito à transição pending->used com affectedKeys().hasOnly(['status','usedBy','usedAt']), delete sempre negado"
  - "Segunda ramificação de allow update em /workspaces/{workspaceId}: entrada por convite prova posse do joinToken via get() contra o convite submetido pelo chamador — nunca apenas 'existe um convite pendente' (T-01-02, a falha mais perigosa da fase)"
  - "Regra genérica isMember()-gated de leitura para qualquer subcoleção direta do workspace (categories chega no 01-04); toda escrita fica fechada até cada subcoleção abrir sua própria regra"
  - "src/features/invite/data/invites.ts: createInvite/inviteRef/inviteUrl — token de 122 bits via crypto.randomUUID(), TTL de 7 dias"
  - "src/features/invite/join.ts: joinWorkspace/JoinInviteError — resgate transacional com tx.get() obrigatório, 4 códigos de erro (invite-not-found, invite-already-used, invite-expired, already-in-workspace)"
  - "Suíte de isolamento entre dois workspaces reais no emulador, incluindo a prova de que um usuário autenticado que nunca viu o link é negado em 3 variantes"
affects: ["01-04 (categorias — herda a regra de isolamento genérica de subcoleção)", "01-05 (telas do convite — consome createInvite/inviteUrl/joinWorkspace/JoinInviteError)", "01-06"]

# Actuals (#2632)
actuals:
  tokens: 9100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Convite como coleção raiz /invites/{token} com o token como ID do documento — nunca subcoleção do workspace, para que a URL do convite carregue um único identificador (D-01) e a regra possa provar posse do token via get() sem dependência circular"
    - "Prova de posse do token: a regra de update do workspace usa get() sobre /invites/$(request.resource.data.joinToken) — o token vem do PAYLOAD que o chamador está enviando agora, nunca de uma busca por 'existe algum convite pendente'"
    - "Isolamento genérico de subcoleção: match /{subcollection}/{docId} aninhado em /workspaces/{workspaceId} com allow read: if isMember(workspaceId) e allow write: if false — Firestore faz OR entre match blocks que casam o mesmo path, então regras de escrita mais específicas adicionadas depois (01-04+) só abrem permissão, nunca precisam tocar este bloco"
    - "Captura de `db` em uma const local, sincronamente, ANTES de qualquer await, no topo de funções que fazem múltiplas operações Firestore (joinWorkspace) — necessário porque o singleton db é trocado por contexto autenticado nos testes; sem essa captura, dois resgates concorrentes com uids diferentes se contaminariam através do getter compartilhado"
    - "runTransaction com tx.get() explícito, nunca writeBatch, para qualquer operação que precise da garantia de controle de concorrência otimista do Firestore"

key-files:
  created:
    - src/features/invite/data/invites.ts
    - src/features/invite/join.ts
    - tests/invite.test.ts
  modified:
    - firestore.rules
    - tests/firestore.rules.test.ts

key-decisions:
  - "expiresAt comparado por FAIXA (request.time < expiresAt < request.time + 8 dias) em vez de igualdade estrita com request.time + duration.value(7,'d') — o cliente não tem como prever o instante exato em que o servidor avalia request.time no commit; o plano já previa este relaxamento como fallback aceito, nunca removendo a checagem de prazo por inteiro"
  - "Regra genérica match /{subcollection}/{docId} adicionada dentro de /workspaces/{workspaceId} (leitura isMember()-gated, escrita sempre fechada) — necessária para que o <behavior> da Task 1 (isolamento também sobre workspaces/wsA/categories/mercado, que ainda não tem regra dedicada até o plano 01-04) fosse genuinamente provável no emulador, sem abrir superfície de escrita nenhuma antes da hora"
  - "joinWorkspace() mapeia qualquer erro não-JoinInviteError vindo de dentro da transação para 'invite-already-used' — descoberto empiricamente pelo teste de resgate concorrente: o get() da Security Rule que valida a entrada no workspace é avaliado contra o estado do servidor no momento do commit, não contra o snapshot que o tx.get() da transação perdedora leu; isso pode negar a escrita com um erro genérico do Firestore em vez de disparar o retry automático do SDK. É a forma concreta do risco residual T-01-08."
  - "Teste de 'resgate feliz' em tests/firestore.rules.test.ts escreve a atualização do WORKSPACE antes da atualização do CONVITE (ordem invertida em relação ao exemplo ilustrativo, nunca executado ao vivo, de 01-RESEARCH.md §Testando isolamento) — como as duas chamadas ali são independentes (sem transação, Task 1 só prova a regra em si), a regra do workspace precisa ver o convite ainda 'pending' no momento em que é avaliada; a produção (Task 2) não tem esse problema porque as duas escritas acontecem na mesma runTransaction e ambas avaliam contra o mesmo estado anterior"

patterns-established:
  - "Ver tech-stack.patterns acima — captura de db local + isolamento genérico de subcoleção são os dois padrões novos desta execução"

requirements-completed: [AUTH-04, AUTH-05, AUTH-07]

coverage:
  - id: D1
    description: "/invites/{token} — coleção raiz com token como ID: get aberto a qualquer autenticado, list sempre negado (fecha enumeração), create validado (isMember, createdBy==uid, status pending, expiresAt em faixa), delete sempre negado"
    requirement: "AUTH-04"
    verification:
      - kind: unit
        ref: "tests/firestore.rules.test.ts > convite/enumeração (AUTH-07, T-01-04) > list na coleção invites é negado para qualquer autenticado; get por ID exato é permitido"
        status: pass
      - kind: unit
        ref: "tests/firestore.rules.test.ts > convite/criação (AUTH-04, T-01-01) — 4 casos (sucesso, não-membro negado, createdBy divergente negado, status já used negado)"
        status: pass
      - kind: unit
        ref: "tests/firestore.rules.test.ts > convite/resgate (AUTH-05, T-01-03) > delete em invites/TOKEN123 é negado para qualquer chamador, inclusive quem criou"
        status: pass
    human_judgment: false
  - id: D2
    description: "Entrada por convite no workspace prova posse do joinToken via get() contra o token SUBMETIDO pelo chamador — a falha mais perigosa da fase (usuário autenticado que nunca viu o link) é negada em 3 variantes: sem token, token errado, token válido de outro workspace"
    requirement: "AUTH-05"
    verification:
      - kind: unit
        ref: "tests/firestore.rules.test.ts > convite/a falha mais perigosa — entrada sem posse do token (AUTH-05, T-01-02) > mallory tenta entrar em wsA sem enviar joinToken — DENIED"
        status: pass
      - kind: unit
        ref: "tests/firestore.rules.test.ts > convite/a falha mais perigosa — entrada sem posse do token (AUTH-05, T-01-02) > mallory tenta entrar em wsA com joinToken chutado — DENIED"
        status: pass
      - kind: unit
        ref: "tests/firestore.rules.test.ts > convite/a falha mais perigosa — entrada sem posse do token (AUTH-05, T-01-02) > mallory tenta entrar em wsA com joinToken válido de OUTRO workspace (wsB) — DENIED"
        status: pass
      - kind: unit
        ref: "tests/firestore.rules.test.ts > convite/resgate (AUTH-05, T-01-03) — resgate feliz, replay negado, expirado negado, campos protegidos negados, já pertence a outro espaço negado"
        status: pass
    human_judgment: false
  - id: D3
    description: "Isolamento entre dois workspaces reais, incluindo leitura/escrita em subcoleções diretas do workspace (categories) — um usuário do espaço B não lê nem grava nada do espaço A"
    requirement: "AUTH-07"
    verification:
      - kind: unit
        ref: "tests/firestore.rules.test.ts > isolamento entre dois espaços reais (AUTH-07, T-01-04) > bob (membro só de wsB) é negado ao ler workspaces/wsA e workspaces/wsA/categories/mercado; alice tem sucesso nas duas"
        status: pass
      - kind: unit
        ref: "tests/firestore.rules.test.ts > isolamento entre dois espaços reais (AUTH-07, T-01-04) > bob é negado ao criar workspaces/wsA/categories/nova"
        status: pass
      - kind: unit
        ref: "tests/firestore.rules.test.ts > workspace/membro não mexe na lista (AUTH-07) > alice, já membro de wsA, é negada ao remover bob de memberIds pelo caminho de atualização normal"
        status: pass
    human_judgment: false
  - id: D4
    description: "createInvite gera token de 122 bits (crypto.randomUUID, sem Math.random) com TTL de 7 dias; chamadas sucessivas geram documentos independentes, ambos pending"
    requirement: "AUTH-04"
    verification:
      - kind: unit
        ref: "tests/invite.test.ts > createInvite (AUTH-04) > devolve um token no formato UUID e cria invites/<token> pending com workspaceId/createdBy corretos e expiresAt ~7 dias à frente"
        status: pass
      - kind: unit
        ref: "tests/invite.test.ts > createInvite (AUTH-04) > duas chamadas seguidas geram tokens diferentes, dois documentos, ambos pending (AUTH-04 idempotency/concurrency)"
        status: pass
    human_judgment: false
  - id: D5
    description: "joinWorkspace resgata o convite dentro de runTransaction com tx.get() obrigatório — resgate feliz, replay negado, token inexistente, expirado, já pertence a outro espaço, e resgate concorrente resolve em exatamente um sucesso"
    requirement: "AUTH-05"
    verification:
      - kind: unit
        ref: "tests/invite.test.ts > joinWorkspace (AUTH-05) > convite válido: devolve wsA, marca convite used, acrescenta bob a memberIds e cria users/bob"
        status: pass
      - kind: unit
        ref: "tests/invite.test.ts > joinWorkspace (AUTH-05) > resgatar o mesmo token duas vezes: a segunda lança invite-already-used e não duplica bob em memberIds (AUTH-05 idempotency)"
        status: pass
      - kind: unit
        ref: "tests/invite.test.ts > joinWorkspace (AUTH-05) > token inexistente lança invite-not-found"
        status: pass
      - kind: unit
        ref: "tests/invite.test.ts > joinWorkspace (AUTH-05) > convite cujo expiresAt está no passado lança invite-expired"
        status: pass
      - kind: unit
        ref: "tests/invite.test.ts > joinWorkspace (AUTH-05) > uid que já tem /users/{uid} (já pertence a outro espaço) lança already-in-workspace"
        status: pass
      - kind: unit
        ref: "tests/invite.test.ts > joinWorkspace (AUTH-05) > dois resgates concorrentes do mesmo token: exatamente um sucesso e uma rejeição, memberIds ganha exatamente um membro novo (AUTH-05 concurrency)"
        status: pass
    human_judgment: false

duration: "~25min"
completed: 2026-08-28
status: complete
---

# Phase 1 Plan 2: Acesso e espaço compartilhado — convite sem backend Summary

**`/invites/{token}` como coleção raiz cujo ID é um token `crypto.randomUUID()`, com a Security Rule do workspace provando posse do token via `get()` antes de conceder membership, e o resgate feliz do cliente feito numa `runTransaction()` real com `tx.get()` — a falha mais perigosa da fase (entrar sem nunca ter visto o link) provada negada em três variantes.**

## Performance

- **Duration:** ~25min
- **Completed:** 2026-08-28
- **Tasks:** 2 (Task 1: Security Rules do convite; Task 2: cliente do convite)
- **Files modified:** 5 (2 modificados, 3 criados)

## Accomplishments
- `firestore.rules`: `match /invites/{token}` completo (get aberto/list negado/create validado/update restrito a `pending -> used`/delete negado) e a segunda ramificação de `allow update` em `match /workspaces/{workspaceId}` que prova posse do `joinToken` via `get()` — nunca apenas "existe algum convite pendente"
- Regra genérica de isolamento (`match /{subcollection}/{docId}`) para qualquer subcoleção direta do workspace, leitura `isMember()`-gated e escrita fechada por padrão, preparando o terreno para `categories` (01-04) sem abrir superfície nova agora
- `src/features/invite/data/invites.ts` — `createInvite`/`inviteRef`/`inviteUrl`, token de 122 bits via `crypto.randomUUID()`, TTL de 7 dias
- `src/features/invite/join.ts` — `joinWorkspace`/`JoinInviteError`, resgate transacional com `tx.get()` obrigatório e 4 códigos de erro mapeados 1:1 para os estados de falha do UI-SPEC (`invite-not-found`, `invite-already-used`, `invite-expired`, `already-in-workspace`)
- 23 casos novos em `tests/firestore.rules.test.ts` (isolamento entre dois workspaces reais, enumeração negada, criação validada, resgate feliz/replay/expirado/campos protegidos/já-em-outro-espaço, e a falha mais perigosa em 3 variantes) + 8 casos novos em `tests/invite.test.ts` (incluindo resgate concorrente) — 43/43 testes verdes em `npm run test:all`, `npm run build` com código 0

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Security Rules do convite e a prova de posse do token** - `f48951a` (feat)
2. **Task 2: Cliente do convite — gerar com token de alta entropia e resgatar em transação** - `5042664` (feat)

**Plan metadata:** _(commit final de docs desta execução, ver abaixo)_

## Files Created/Modified
- `firestore.rules` - `match /invites/{token}`, ramificação de entrada por convite em `match /workspaces/{workspaceId}`, regra genérica de subcoleção
- `tests/firestore.rules.test.ts` - isolamento entre dois workspaces reais, convite (enumeração/criação/resgate/falha mais perigosa), membro não mexe na lista
- `src/features/invite/data/invites.ts` - geração do convite (token, TTL, URL)
- `src/features/invite/join.ts` - resgate transacional
- `tests/invite.test.ts` - prova do ciclo gerar → resgatar → negar segundo resgate, incluindo concorrência

## Decisions Made

Ver `key-decisions` no frontmatter — resumo:
- `expiresAt` comparado por faixa em vez de igualdade estrita (fallback já previsto pelo plano)
- Regra genérica de isolamento de subcoleção adicionada (Rule 2 — funcionalidade crítica faltante para o `<behavior>` da Task 1 ser provável)
- `joinWorkspace()` mapeia erro genérico de permissão da transação perdedora para `invite-already-used` (Rule 1 — bug descoberto pelo teste de concorrência; é a forma concreta do risco residual T-01-08 já previsto em 01-RESEARCH.md)
- Ordem das duas escritas do "resgate feliz" no teste de regras (Task 1) invertida em relação ao exemplo nunca-executado de 01-RESEARCH.md, por necessidade mecânica de chamadas independentes sem transação

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Regra genérica de isolamento para subcoleções diretas do workspace**
- **Found during:** Task 1, ao escrever o caso `isolamento/leitura` do `<behavior>`, que exige que `alice` tenha sucesso lendo `workspaces/wsA/categories/mercado` e `bob` seja negado — nenhuma regra cobria esse path ainda (categorias só chegam no plano 01-04)
- **Issue:** Sem uma regra para o path, Firestore nega TODO MUNDO por ausência de match, inclusive `alice` (membro legítimo) — o `<behavior>` da task exige explicitamente que `alice` tenha sucesso
- **Fix:** Adicionado `match /{subcollection}/{docId}` aninhado dentro de `match /workspaces/{workspaceId}`, com `allow read: if isMember(workspaceId)` e `allow write: if false`. Firestore faz OR entre match blocks que casam o mesmo path — uma regra de escrita mais específica adicionada em 01-04 (com validação de campos) só abre permissão, nunca precisa tocar este bloco
- **Files modified:** `firestore.rules`
- **Verification:** `tests/firestore.rules.test.ts > isolamento entre dois espaços reais (AUTH-07, T-01-04)` — 2 casos verdes
- **Committed in:** `f48951a` (Task 1)

**2. [Rule 1 - Bug] Ordem das escritas no teste de "resgate feliz" (Task 1) invertida**
- **Found during:** Task 1, ao rodar `npm run test:rules` pela primeira vez após escrever a regra — 1 dos 23 casos falhou com `PERMISSION_DENIED` na atualização do workspace
- **Issue:** O teste (seguindo a mesma ordem do exemplo ilustrativo de 01-RESEARCH.md §Testando isolamento, nunca executado ao vivo naquela sessão) atualizava primeiro o convite para `used`, depois o workspace. Como as duas chamadas são independentes (sem transação — Task 1 só prova a regra em si, não o cliente), a regra do workspace avalia `get(invite).status == 'pending'` contra o estado JÁ COMMITADO da primeira chamada — que já era `'used'` — e nega a segunda
- **Fix:** Invertida a ordem no teste: workspace primeiro (enquanto o convite ainda está `pending`), convite depois. Documentado inline no teste
- **Files modified:** `tests/firestore.rules.test.ts`
- **Verification:** `npm run test:rules` — 23/23 verdes
- **Committed in:** `f48951a` (Task 1)

**3. [Rule 1 - Bug] `joinWorkspace()` não tratava o erro genérico de permissão da transação perdedora**
- **Found during:** Task 2, ao escrever e rodar o teste de resgate concorrente (`Promise.allSettled` com dois uids diferentes sobre o mesmo token) — a transação perdedora rejeitava com um `FirebaseError` bruto de `PERMISSION_DENIED`, não com `JoinInviteError('invite-already-used')` esperado
- **Issue:** O controle de concorrência otimista do cliente (que dispara retry automático) cobre o documento do CONVITE, lido via `tx.get()`. Mas a ramificação de entrada da regra do WORKSPACE tem seu próprio `get()` interno, avaliado contra o estado do servidor no momento do commit — não contra o snapshot que a transação perdedora leu. Se a transação vencedora já commitou quando a perdedora tenta commitar, esse `get()` da regra vê o convite `'used'` e nega a escrita do workspace com um erro genérico do Firestore, sem disparar o retry automático do SDK (que só ocorre para conflitos de versão detectados via `tx.get()`, não para negações de regra). Esta é a forma concreta e agora confirmada do risco residual `T-01-08` já documentado como aceito em 01-RESEARCH.md §3/§5
- **Fix:** `joinWorkspace()` agora envolve a `runTransaction()` num `try/catch`: erros que já são `JoinInviteError` (lançados dentro do callback) são relançados como estão; qualquer outro erro (o `PERMISSION_DENIED` genérico descrito acima) é mapeado para `JoinInviteError('invite-already-used')`, já que é a única causa realista depois que todas as validações do lado do cliente já passaram
- **Files modified:** `src/features/invite/join.ts`
- **Verification:** `tests/invite.test.ts > dois resgates concorrentes do mesmo token` — verde de forma consistente em 3 execuções repetidas (sem flakiness observada)
- **Committed in:** `5042664` (Task 2)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 bugs — ambos descobertos empiricamente contra o emulador, exatamente o tipo de verificação que o plano pediu para as Open Questions de 01-RESEARCH.md)
**Impact on plan:** Todas as correções são necessárias para que o `<behavior>` das duas tasks fosse genuinamente provado contra o emulador real, sem afrouxar nenhuma Security Rule e sem abrir superfície de escrita além do estritamente testado. Nenhuma mudou o desenho central do convite descrito em 01-RESEARCH.md — refinaram sua implementação exata.

## Risco Residual Aceito (T-01-08)

Transcrito de 01-RESEARCH.md §3/§5 e confirmado empiricamente pela Deviation #3 acima: o `get()` usado pela Security Rule do workspace para validar o convite não tem a mesma garantia formal de participar do controle de concorrência otimista que o `tx.get()` do cliente tem. Existe uma janela teórica, extremamente estreita, em que dois chamadores que burlem deliberadamente o SDK de transação (requisições REST cruas e desacopladas, não agrupadas numa transação real) poderiam ambos ler o convite ainda pendente antes de qualquer commit. Para um app privado de duas pessoas, sem exposição pública, esse risco é aceito conscientemente — `T-01-08`, severidade `low`, disposição `accept` no `<threat_model>` do plano. A correção formal exigiria uma única Cloud Function `redeemInvite` fazendo a mesma transação com o Admin SDK, o que exige o plano Blaze do Firebase — fora de escopo por D-06.

Confirmado também: quando esse risco residual se manifesta na prática (dois SDKs de cliente reais competindo pelo mesmo token, não um bypass malicioso), o resultado observável para o usuário que perde a corrida é `invite-already-used` — o mesmo código de erro do caso comum de replay, tratado pela mesma tela de erro do plano 01-05. Não há degradação de UX perceptível pelo risco residual, só uma diferença de mecanismo interno (retry automático do SDK vs. negação direta de regra).

## Issues Encountered

None além do já documentado em Deviations.

## User Setup Required

None diretamente — a pendência de `.env.local`/projeto Firebase real registrada em 01-01-SUMMARY.md continua valendo para o `<human-check>` de fim de fase, mas nada específico deste plano.

## Next Phase Readiness

- `firestore.rules` está pronto para o plano 01-04 (categorias) construir sua própria regra de `create`/`update` validada em `match /workspaces/{workspaceId}/categories/{categoryId}` — a regra genérica de isolamento adicionada aqui garante que a LEITURA já funciona por `isMember()`, e a nova regra só precisa abrir a escrita com validação de campos (OR, nunca precisa tocar o bloco genérico)
- `src/features/invite/data/invites.ts` e `src/features/invite/join.ts` expõem exatamente o contrato do bloco `<interfaces>` do plano — `createInvite`, `inviteRef`, `inviteUrl`, `INVITE_TTL_DAYS`, `joinWorkspace`, `JoinInviteError`, `JoinInviteErrorCode` — prontos para o plano 01-05 (telas do convite: "Convidar alguém" e "Entrar por link") consumir sem qualquer mudança de assinatura
- Os 4 códigos de `JoinInviteErrorCode` mapeiam 1:1 para os 4 estados de falha descritos no UI-SPEC §Copywriting Contract, confirmado no `<read_first>` da Task 2 — o plano 01-05 só precisa ligar cada código à cópia em pt-BR já especificada, sem inventar novo texto
- Nenhum stub ou dado mockado: este plano não toca UI nenhuma (é rules + client library), então não há superfície de tela para verificar quanto a stubs

---
*Phase: 01-acesso-e-espa-o-compartilhado*
*Completed: 2026-08-28*

## Self-Check: PASSED

Todos os arquivos citados (firestore.rules, tests/firestore.rules.test.ts, tests/invite.test.ts, src/features/invite/data/invites.ts, src/features/invite/join.ts) confirmados presentes no disco (`[ -f ]`), e ambos os commits (`f48951a`, `5042664`) confirmados presentes em `git log --oneline --all`. Acceptance criteria de ambas as tasks re-verificados nesta sessão com os comandos exatos especificados no PLAN.md — todos PASS, incluindo `npm run test:rules` (23/23), `npx vitest run tests/firestore.rules.test.ts -t isolamento` (3/3), `-t convite` (14/14), `npm run test:all` (43/43) e `npm run build` (código 0).
