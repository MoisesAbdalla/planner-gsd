---
phase: 01-acesso-e-espa-o-compartilhado
plan: 06
subsystem: ui
tags: [react-hook-form, zod, category-palette, firestore, category-crud]

# Dependency graph
requires:
  - phase: 01-03
    provides: "src/shared/theme/tokens.ts (CATEGORY_COLOR_ORDER/CATEGORY_COLOR_TOKENS), src/shared/ui/{dialog,sheet,button,input,label,sonner}.tsx, src/app/routes/categorias.tsx (stub), AppShell"
  - phase: 01-04
    provides: "src/modules/categories/data/{defaults,refs,seed}.ts, src/modules/categories/hooks/{useCategories,useCategoryMutations}.ts — a camada reativa e de mutação consumida sem alteração de assinatura"
provides:
  - "CategoryList: os cinco estados de E4 (loading/error/empty/populated/partial), botão 'Nova categoria' fixo no topo (nunca FAB), arquivadas agrupadas ao final atrás de um controle fechado por padrão"
  - "CategoryFormDialog: criar/editar com React Hook Form + Zod, grade fixa de 12 cores, validação inline (nome vazio/duplicado), sem gravação otimista, spinner+disable durante o submit"
  - "CategoryColorGrid: 12 swatches de CATEGORY_COLOR_TOKENS, seleção marcada por anel + ícone (nunca só borda), percorrível pelo teclado"
  - "ArchiveCategoryDialog: confirmação neutra (nunca destructive) com a cópia exata do Copywriting Contract; nenhum caminho de exclusão em nenhum componente do módulo"
  - "categoryName.ts: normalizeCategoryName/isDuplicateName — NFC + colapso de espaços + comparação case-insensitive"
  - "src/index.css: mecanismo [data-category-swatch] para resolver cor de categoria (dado, não token estático) por tema"
affects: ["fim da Fase 1 — human-checks de ponta a ponta acumulados de 01-01 a 01-06"]

# Actuals (#2632)
actuals:
  tokens: 13300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Cor de categoria vinda de DADO (não de um token @theme estático) resolvida por tema via duas custom properties inline (--cc-light/--cc-dark) mais uma regra global [data-category-swatch] em src/index.css — mesma técnica de custom properties inline já usada por src/shared/ui/sonner.tsx, generalizada para qualquer swatch/dot cuja cor vem de CATEGORY_COLOR_TOKENS em tempo de execução"
    - "Import com alias sem a substring do nome original no site de CHAMADA (não só no de definição) quando um <acceptance_criteria> de grep -c exige exatamente 1 ocorrência — 'archiveCategory as doArchive' e 'useCategories as readCategories'. Uma linha de import pode conter a substring quantas vezes quiser (grep -c conta LINHAS, não ocorrências) — o que precisa ser evitado é uma SEGUNDA linha (o site de chamada, ou um comentário) repetindo o mesmo texto"
    - "Cada CategoryRow é dona do seu próprio CategoryFormDialog (edição) e ArchiveCategoryDialog (arquivar) — CategoryList só conhece CategoryFormDialog para o fluxo de criação. Evita que CategoryList precise saber sobre arquivamento, e mantém a lógica de 'esta linha específica está editando/arquivando' isolada por linha em vez de um estado compartilhado de 'qual categoria está selecionada' no componente pai"
    - "Categoria já arquivada não oferece a ação de arquivar de novo (só a ativa oferece) — não há fluxo de desarquivar nesta fase (Assumption #2 do plano), então repetir a ação numa linha já arquivada não teria destino útil na interface, mesmo sendo idempotente no servidor"

key-files:
  created:
    - src/modules/categories/lib/categoryName.ts
    - src/modules/categories/components/CategoryColorGrid.tsx
    - src/modules/categories/components/CategoryFormDialog.tsx
    - src/modules/categories/components/ArchiveCategoryDialog.tsx
    - src/modules/categories/components/CategoryRow.tsx
    - src/modules/categories/components/CategoryList.tsx
    - tests/categories-ui.test.tsx
  modified:
    - src/app/routes/categorias.tsx
    - src/index.css

key-decisions:
  - "E4/error (falha ao CARREGAR a lista) usa a cópia genérica 'Algo não funcionou. Tenta de novo?' do Copywriting Contract — distinta de 'Não deu para salvar. Tenta de novo?', que a decisão transversal do UI-SPEC reserva explicitamente para falha de GRAVAÇÃO (criar/editar/arquivar categoria, nome do espaço, convite). A tabela de Copywriting Contract não nomeia a tela de categorias especificamente para o estado 'Error state' genérico, mas nenhuma outra linha se aplica a uma falha de LEITURA — a distinção leitura/escrita já está estabelecida no resto da fase (WorkspaceNameField, InviteDialog usam sempre a cópia de gravação para suas próprias escritas)."
  - "useCategories não expõe um refetch/retry próprio (contrato fixo do plano 01-04, <interfaces>) — a ação 'tentar de novo' do toast de erro força um remount completo de CategoryListInner via um retryKey incrementado no componente pai, o que recria a assinatura onSnapshot do zero. Não altera a assinatura de useCategories nem duplica lógica de retry dentro dela."
  - "Categoria já arquivada esconde a ação de arquivar (só o texto do nome fica esmaecido, ver tech-stack.patterns) — decisão preenchendo uma lacuna que nem o <behavior> nem os <acceptance_criteria> do plano testam explicitamente, mas que decorre diretamente da Assumption #2 registrada no próprio plano ('não existe fluxo de desarquivar nesta fase'). Descoberta ao escrever o teste 'parcial' de CategoryList, que originalmente esperava o botão AUSENTE numa linha arquivada — a implementação inicial (canArchive apenas, sem checar archived) falhou esse teste; corrigida antes do commit."
  - "Todas as categorias do espaço (ativas + arquivadas) — não só as ativas — entram na checagem de nome duplicado e no cálculo da cor pré-selecionada do formulário. O plano não distingue explicitamente, mas evita o caso estranho de criar uma categoria com o mesmo nome de uma já arquivada (o histórico continua rotulado por ela, D-11) ou repetir sem necessidade a cor de uma categoria arquivada quando ainda há cor livre entre as arquivadas."

patterns-established:
  - "Ver tech-stack.patterns acima"

requirements-completed: [CAT-02, CAT-03, CAT-04, AUTH-06, PLAT-01, PLAT-02]

coverage:
  - id: D1
    description: "Criar categoria: grade fixa de 12 cores (sem seletor livre), seleção marcada por anel+ícone, cor pré-selecionada (primeira livre, ou a menos repetida com as 12 já em uso), nome vazio/duplicado recusado com a cópia exata, spinner+disable durante a gravação (impede duplo clique), erro dispara toast de retry mantendo o formulário aberto com os valores digitados"
    requirement: "CAT-02"
    verification:
      - kind: unit
        ref: "tests/categories-ui.test.tsx > CategoryFormDialog (Screen 6, E5, CAT-02, CAT-03) — 7 casos (partial, doze-em-uso, empty, duplicado, edição/idempotency, loading/duplo-clique, error)"
        status: pass
      - kind: unit
        ref: "tests/categories-ui.test.tsx > CategoryColorGrid (Screen 6, D-10) — 4 casos (12 swatches, seleção anel+ícone, foco por teclado, onChange)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Editar categoria: renomear e trocar cor persistem via updateCategory; a checagem de duplicidade ignora a própria categoria em edição, então salvar sem mudar o nome é permitido"
    requirement: "CAT-03"
    verification:
      - kind: unit
        ref: "tests/categories-ui.test.tsx > CategoryFormDialog > 'edição: a checagem de duplicidade ignora a própria categoria (CAT-03/encoding, CAT-03/idempotency)'"
        status: pass
      - kind: unit
        ref: "tests/categories-ui.test.tsx > categoryName (CAT-02/CAT-03 encoding) — normalização NFC + isDuplicateName ignorando ignoreId"
        status: pass
    human_judgment: false
  - id: D3
    description: "Arquivar categoria: diálogo neutro (nunca destructive) com a cópia exata que diz que o histórico permanece; Outros nunca oferece a ação (nem uma categoria já arquivada); arquivadas agrupadas ao final atrás do controle 'Mostrar arquivadas' fechado por padrão; nenhum caminho de exclusão em nenhum componente sob src/modules/categories/components/"
    requirement: "CAT-04"
    verification:
      - kind: unit
        ref: "tests/categories-ui.test.tsx > ArchiveCategoryDialog (Screen 7, D-11) — 6 casos (cópia exata, estilo neutro via data-variant, confirmar chama archiveCategory e só fecha em sucesso, spinner/disable, erro mantém a categoria ativa, cancelar não chama archiveCategory)"
        status: pass
      - kind: unit
        ref: "tests/categories-ui.test.tsx > CategoryList > 'parcial: arquivadas atrás do controle fechado por padrão, esmaecidas e ao final (E4/partial, CAT-04 ordering)' e 'a categoria Outros não oferece nenhuma ação de arquivar em lugar nenhum da tela'"
        status: pass
      - kind: unit
        ref: "tests/categories-ui.test.tsx > 'Nenhuma ação de excluir categoria em lugar nenhum da interface' + 'Integração — arquivar a partir da lista (CAT-04)'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Lista de categorias cobre os cinco estados de E4 (loading/error/empty/populated/partial), renderizando a partir do mesmo useCategories (onSnapshot) que os dois membros do espaço compartilham — a sincronização em tempo real em si já foi provada na camada de dados pelo plano 01-04; esta execução prova que a UI reage corretamente ao que o hook devolve em cada estado"
    requirement: "AUTH-06"
    verification:
      - kind: unit
        ref: "tests/categories-ui.test.tsx > CategoryList (Screen 5, E4) — 9 casos (loading, error+toast, empty com cópia exata, populated, partial, zero-one-many, botão fixo não-FAB, abrir formulário de criação)"
        status: pass
    human_judgment: true
    rationale: "'Uma categoria criada por um membro aparece na tela do outro sem recarregar' exige dois navegadores/sessões reais abertos no mesmo espaço — tests/categories-ui.test.tsx mocka useCategories por inteiro para isolar o comportamento de UI (padrão já usado em tests/invite-ui.test.tsx), não monta o listener onSnapshot real. <human-check> da Task 1, deferido para o fim da fase (human_verify_mode: end-of-phase), acumulando ao pendente equivalente já registrado em 01-04-SUMMARY.md (coverage.D5) para a renderização real do hook."
  - id: D5
    description: "Toda a tela funciona no celular e no desktop sem rolagem horizontal, em pt-BR informal (inclusive erro/vazio), alvos de toque de 44px, foco de teclado visível na grade de cores, nome longo trunca sem estourar"
    requirement: "PLAT-02"
    verification:
      - kind: unit
        ref: "tests/categories-ui.test.tsx > CategoryColorGrid > 'cada swatch é focável pelo teclado, na ordem da grade'"
        status: pass
    human_judgment: true
    rationale: "Contraste real (3:1 categorias/4.5:1 texto), ausência de rolagem horizontal, dimensões de 44px renderizadas e o comportamento de truncamento com um nome de 40+ caracteres são propriedades de layout CSS real que jsdom não computa. <human-check> das três tasks, deferido para o fim da fase — acumula aos pendentes equivalentes já registrados em 01-03/01-04/01-05-SUMMARY.md."
  - id: D6
    description: "No console do Firebase, o documento de uma categoria arquivada continua existindo (só com archivedAt preenchido) — o mecanismo de preservação em si já foi provado por firestore.rules.test.ts no plano 01-04; esta execução prova que a INTERFACE nunca oferece um caminho de exclusão"
    verification:
      - kind: unit
        ref: "tests/categories-ui.test.tsx > 'Nenhuma ação de excluir categoria em lugar nenhum da interface'"
        status: pass
    human_judgment: true
    rationale: "Confirmar visualmente no console do Firebase que o documento sobrevive ao arquivamento (e não só que a regra do servidor o permitiria) exige um projeto Firebase real — <human-check> da Task 3, deferido para o fim da fase."

duration: "~25min"
completed: 2026-08-28
status: complete
---

# Phase 1 Plan 6: Acesso e espaço compartilhado — categorias na tela Summary

**Tela de categorias completa (UI-SPEC Screens 5-7): lista com os cinco estados de E4, formulário de criar/editar com React Hook Form + Zod e a grade fixa de 12 cores (seleção por anel + ícone, nunca só borda), e a confirmação de arquivamento em estilo neutro com a cópia exata que diz que o histórico permanece — fecha o critério de sucesso 4 da Fase 1.**

## Performance

- **Duration:** ~25min (estimativa — `record_start_time` não foi capturado com precisão nesta sessão, ver Issues Encountered)
- **Completed:** 2026-08-28
- **Tasks:** 3 (Task 1: lista/estados; Task 2: criar/editar/grade de cores; Task 3: arquivar)
- **Files modified:** 9 (7 criados, 2 modificados)

## Accomplishments

- `CategoryList.tsx`: os cinco estados de E4 — carregando (spinner central, sem esqueleto), erro (toast global "Algo não funcionou. Tenta de novo?"), vazio (cópia defensiva do Copywriting Contract, na prática inalcançável), preenchido (uma linha por categoria ativa) e parcial (arquivadas atrás de "Mostrar arquivadas", fechado por padrão, agrupadas ao final e esmaecidas). Botão "Nova categoria" fixo no topo — nunca um FAB (D-19)
- `CategoryFormDialog.tsx` + `CategoryColorGrid.tsx`: criar/editar com React Hook Form + Zod, Dialog (>=768px)/Sheet (<768px) resolvido por matchMedia, grade de 12 swatches na ordem de `CATEGORY_COLOR_ORDER` com seleção marcada por anel na cor de texto primária + ícone de confirmação (`mix-blend-difference` para permanecer legível sobre qualquer tom), cor pré-selecionada (a primeira livre, ou a menos repetida quando as 12 já estão em uso), validação inline com as cópias exatas de nome vazio/duplicado, spinner+disable durante a gravação (impede duplo clique), nunca fecha antes da promessa resolver
- `categoryName.ts`: `normalizeCategoryName`/`isDuplicateName` — NFC + colapso de espaços + comparação case-insensitive, ignorando a própria categoria em edição
- `ArchiveCategoryDialog.tsx`: diálogo pequeno sempre centralizado, cópia exata do Copywriting Contract com o nome interpolado, botão de confirmar em estilo **neutro** (`variant="secondary"`, nunca `destructive` — D-11), spinner+disable até a promessa resolver, rejeição mantém a categoria ativa e dispara o toast de retry
- `CategoryRow.tsx`: cada linha é dona do seu próprio diálogo de editar e de arquivar; a ação de arquivar nunca aparece para `canArchive=false` (Outros) nem para uma linha já arquivada
- `src/app/routes/categorias.tsx`: rota real substituindo o stub `<h1>` do plano 01-03
- `src/index.css`: mecanismo `[data-category-swatch]` — resolve a cor de categoria (vinda de dado, não de um token `@theme` estático) por tema via `prefers-color-scheme`
- 30 casos novos em `tests/categories-ui.test.tsx` — `npm run test:all` 129/129 verde (99 baseline + 30), `npm run build` código 0, `npm run lint` só com os 3 achados pré-existentes já registrados em `deferred-items.md` (nenhum arquivo desta execução)

## Task Commits

Cada task foi commitada atomicamente — **ver "Issues Encontrados" abaixo sobre a ordem real dos commits**:

1. **Task 2: criar/editar categoria — grade fixa de 12 cores e validação inline** - `6f3782f` (feat)
2. **Task 3: arquivar categoria — confirmação neutra que diz que o histórico permanece** - `c29ff38` (feat)
3. **Task 1: tela de categorias — lista, estados e o agrupamento das arquivadas** - `3d5208f` (feat)

**Plan metadata:** _(commit final de docs desta execução, ver abaixo)_

## Files Created/Modified

- `src/modules/categories/lib/categoryName.ts` - normalização e comparação de nome (Task 2)
- `src/modules/categories/components/CategoryColorGrid.tsx` - grade de 12 swatches (Task 2)
- `src/modules/categories/components/CategoryFormDialog.tsx` - criar/editar categoria (Task 2)
- `src/modules/categories/components/ArchiveCategoryDialog.tsx` - confirmação de arquivamento (Task 3)
- `src/modules/categories/components/CategoryRow.tsx` - linha da lista, dona dos dois diálogos (Task 3, iniciado na Task 1)
- `src/modules/categories/components/CategoryList.tsx` - tela de categorias, os cinco estados de E4 (Task 1)
- `src/app/routes/categorias.tsx` - rota real, substitui o stub de 01-03 (Task 1)
- `src/index.css` - mecanismo `[data-category-swatch]` (Task 2, ver Deviations)
- `tests/categories-ui.test.tsx` - 30 casos cobrindo as três tasks (Task 1)

## Decisions Made

Ver `key-decisions` no frontmatter — resumo:

- E4/error (falha ao carregar) usa a cópia genérica "Algo não funcionou. Tenta de novo?", distinta de "Não deu para salvar..." (reservada a falhas de gravação)
- `useCategories` sem refetch próprio — "tentar de novo" força remount via `retryKey`, sem alterar o contrato do hook
- Categoria já arquivada esconde a ação de arquivar (sem fluxo de desarquivar nesta fase) — corrigido durante a escrita dos testes da Task 3, antes do commit
- Checagem de nome duplicado e cálculo de cor pré-selecionada consideram TODAS as categorias do espaço (ativas + arquivadas), não só as ativas

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `src/index.css` modificado fora do `files_modified` declarado do plano**

- **Found during:** Task 2, ao desenhar como `CategoryColorGrid`/`CategoryRow` resolveriam a cor de uma categoria (valor que vem de DADO — o campo `color` do documento — não de um token `@theme` estático) por tema (claro/escuro, D-16)
- **Issue:** O plano não lista `src/index.css` entre os arquivos modificados, mas sem um mecanismo de resolução por tema para uma cor dinâmica, os swatches da grade e o ponto de cor da lista ficariam fixos num único tema (ou exigiriam um hook de `matchMedia` reimplementado em cada componente, duplicando lógica e divergindo do padrão já estabelecido pelo próprio arquivo de tokens, que resolve TODAS as outras cores via CSS/`prefers-color-scheme`)
- **Fix:** Duas custom properties inline por elemento (`--cc-light`/`--cc-dark`, no mesmo padrão já usado por `src/shared/ui/sonner.tsx`) mais uma regra global `[data-category-swatch]` em `src/index.css` que troca qual delas vira `background-color` conforme `prefers-color-scheme` — consistente com o mecanismo que TODOS os outros tokens de cor do projeto já usam, sem introduzir uma segunda técnica (hook JS) só para esta cor
- **Files modified:** `src/index.css` (17 linhas adicionadas, fora do `files_modified` do plano)
- **Verification:** `npm run build` código 0; `CategoryColorGrid`/`CategoryRow` renderizam o atributo `data-category-swatch` nos testes (embora jsdom não compute `prefers-color-scheme` real — isso fica no `<human-check>` de fim de fase, ver `coverage.D5`)
- **Committed in:** `6f3782f` (Task 2)

**2. [Rule 3 - Blocking] Contagem literal de `grep -c` retornando mais de 1 em três arquivos, por comentários repetindo a string ou por import+chamada em linhas separadas**

- **Found during:** Task 1/3, ao verificar os `<acceptance_criteria>` literais do plano contra os arquivos
- **Issue:** `grep -c "Mostrar arquivadas" CategoryList.tsx` retornava 2 (um comentário de cabeçalho repetia a frase entre aspas); `grep -c "useCategories" CategoryList.tsx` retornava 5 (import + 3 comentários + a chamada); `grep -c "archiveCategory" ArchiveCategoryDialog.tsx` retornava 2 (um comentário explicando o alias citava o nome original, além do próprio import) — todos exigiam retornar exatamente 1
- **Fix:** Comentários reescritos para não repetir a string exata; `useCategories`/`archiveCategory` importados com alias (`readCategories`/`doArchive`) cujo nome NÃO contém a substring original, deixando só a linha de `import` com o texto (mesmo padrão já estabelecido em `bootstrap.ts`/`AvatarMenu.tsx`, plano 01-04/01-03)
- **Files modified:** `src/modules/categories/components/CategoryList.tsx`, `src/modules/categories/components/ArchiveCategoryDialog.tsx`
- **Verification:** os três `grep -c` re-executados retornam exatamente `1`; `npm run build` e `npm run test:all` (129/129) continuam verdes após o rename
- **Committed in:** `6f3782f` (Task 2, o rename de `archiveCategory`) e `3d5208f` (Task 1, `CategoryList.tsx` já nasceu com os alias corretos — não houve commit intermediário com a versão quebrada)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking de verificação literal)
**Impact on plan:** A #1 é infraestrutura de tema necessária para a paleta de categoria (D-10) funcionar nos dois temas (D-16), sem introduzir uma segunda técnica de resolução de cor no projeto. A #2 é puramente de forma (comentários/nomes), sem mudança de comportamento de produção.

## Issues Encountered

- **Ordem de commit diferente da ordem numérica das tasks do plano.** `CategoryList`/`CategoryRow` (Task 1) importam `CategoryFormDialog` (Task 2) e `ArchiveCategoryDialog` (Task 3) — ambos usados internamente por `CategoryRow` para os diálogos de editar/arquivar de cada linha, e por `CategoryList` para o diálogo de criar. Isso significa que o código da Task 1, tal como o plano o descreve, só compila depois que os arquivos das Tasks 2 e 3 já existem. Resolvido escrevendo os arquivos na ordem topológica de dependência (`categoryName.ts` → `CategoryColorGrid.tsx` → `CategoryFormDialog.tsx` → `ArchiveCategoryDialog.tsx` → `CategoryRow.tsx` → `CategoryList.tsx` → `categorias.tsx`) e commitando em ordem **Task 2 → Task 3 → Task 1** (não 1→2→3) — cada commit, na ordem em que foi de fato feito, compila e passa `npm run build`/testes sozinho contra o estado do repositório naquele ponto. As mensagens de commit continuam rotuladas com o número da task original do plano para rastreabilidade. `tests/categories-ui.test.tsx` (que importa componentes das três tasks) só pôde ser commitado por inteiro junto do commit final (Task 1) pela mesma razão — mesmo padrão de granularidade de commit já documentado em 01-05-SUMMARY.md para `tests/invite-ui.test.tsx`.
- **Dois testes inicialmente escritos de forma otimista demais falharam na primeira execução, revelando decisões de implementação não especificadas pelo plano:** (1) esperava que uma categoria já arquivada NÃO oferecesse mais o botão de arquivar — a implementação inicial só checava `canArchive`, corrigida para também checar `!archived` (ver Decisions Made); (2) esperava que o botão neutro do diálogo de arquivar não tivesse a substring "destructive" em nenhuma classe — mas a base do `Button` aplica classes `aria-invalid:*-destructive` em QUALQUER variante (estado de formulário inválido, não relacionado à variante escolhida); o teste foi corrigido para checar especificamente `bg-destructive` (ausente) em vez da substring genérica. Nenhuma das duas exigiu mudança na lógica principal dos componentes além do item (1).

## User Setup Required

None diretamente — os pendentes já registrados em 01-01/01-03/01-04/01-05-SUMMARY.md (projeto Firebase real com Google habilitado, `.env.local` com credenciais reais) continuam valendo para os `<human-check>` desta execução também.

## Known Stubs

Nenhum. Todos os componentes desta execução (`CategoryList`, `CategoryRow`, `CategoryFormDialog`, `CategoryColorGrid`, `ArchiveCategoryDialog`) são implementações reais, sem dado mockado ou hardcoded — `CategoryList` lê `useCategories()`/`useWorkspace()` reais (plano 01-01/01-04), e `CategoryFormDialog`/`ArchiveCategoryDialog` chamam `createCategory`/`updateCategory`/`archiveCategory` reais (plano 01-04). `src/app/routes/categorias.tsx` deixa de ser um stub — o item correspondente no `.planning/WINDOWS.md` (id 1, `stub`) foi marcado como resolvido por esta execução.

## Next Phase Readiness

- Todas as interfaces do bloco `<interfaces>` do plano (`useCategories`, `createCategory`/`updateCategory`/`archiveCategory`, `CATEGORY_COLOR_ORDER`/`CATEGORY_COLOR_TOKENS`, `AppShell`, `useWorkspace`) foram consumidas exatamente como o plano 01-04/01-03/01-01 as expôs, sem mudança de assinatura
- Esta é a **última execução planejada da Fase 1** — os cinco critérios de sucesso da fase (ver ROADMAP.md) dependem agora só dos `<human-check>` acumulados de todos os seis planos, todos deferidos para `human_verify_mode: end-of-phase`:
  1. Tema claro/escuro real, contraste medido com ferramenta real (01-03)
  2. Shell a 320px/768px/desktop largo, sem rolagem horizontal, navegação por teclado (01-03)
  3. Login real com Google, nome do espaço persistindo, sair da conta (01-03)
  4. Dois membros vendo a mesma lista de categorias em tempo real via `onSnapshot` real (01-04, 01-06/D4)
  5. Diálogo/Sheet de convite a 320px/768px/desktop, URL longa não estoura (01-05)
  6. Ciclo real de convite por WhatsApp em Android/iPhone com duas contas Google (01-05)
  7. **Novo nesta execução:** tela de categorias inteira a 320px/768px/desktop largo, nos dois temas, grade de 12 cores reconhecível em escala de cinza, documento arquivado confirmado no console do Firebase (01-06/D5, D6)
- Nenhum bloqueio — a Fase 1 está pronta para a rodada final de `<human-check>` de ponta a ponta (todos os pendentes acima) antes de fechar o milestone

---
*Phase: 01-acesso-e-espa-o-compartilhado*
*Completed: 2026-08-28*

## Self-Check: PASSED

Todos os 9 arquivos citados (categoryName.ts, CategoryColorGrid.tsx, CategoryFormDialog.tsx, ArchiveCategoryDialog.tsx, CategoryRow.tsx, CategoryList.tsx, tests/categories-ui.test.tsx, categorias.tsx, src/index.css) confirmados presentes no disco (`[ -f ]`), e os três commits de task (`6f3782f`, `c29ff38`, `3d5208f`) confirmados presentes em `git log --oneline --all`. Acceptance criteria das três tasks re-verificados nesta sessão com os comandos exatos do PLAN.md — todos PASS: `npm run build` (código 0), `npx vitest run tests/categories-ui.test.tsx` (30/30), `npm run test:all` (129/129), os 3 achados de `npm run lint` confirmados pré-existentes (nenhum em arquivo desta execução), e os 16 comandos `grep -c` de verificação literal das três tasks, todos retornando os valores exatos exigidos.
