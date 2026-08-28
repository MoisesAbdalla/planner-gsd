---
phase: 01-acesso-e-espa-o-compartilhado
reviewed: 2026-08-28T18:27:31Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - firestore.rules
  - src/app/routes/categorias.tsx
  - src/app/routes/convidar.tsx
  - src/app/routes/entrar.tsx
  - src/app/router.tsx
  - src/app/shell/AppShell.tsx
  - src/app/shell/AvatarMenu.tsx
  - src/app/shell/BottomNav.tsx
  - src/app/shell/lastModule.ts
  - src/features/invite/components/InviteDialog.tsx
  - src/features/invite/components/InviteErrorScreen.tsx
  - src/features/invite/components/JoinInviteScreen.tsx
  - src/features/invite/data/invites.ts
  - src/features/invite/join.ts
  - src/features/invite/pendingToken.ts
  - src/index.css
  - src/modules/categories/components/ArchiveCategoryDialog.tsx
  - src/modules/categories/components/CategoryColorGrid.tsx
  - src/modules/categories/components/CategoryFormDialog.tsx
  - src/modules/categories/components/CategoryList.tsx
  - src/modules/categories/components/CategoryRow.tsx
  - src/modules/categories/data/defaults.ts
  - src/modules/categories/data/refs.ts
  - src/modules/categories/data/seed.ts
  - src/modules/categories/hooks/useCategories.ts
  - src/modules/categories/hooks/useCategoryMutations.ts
  - src/modules/categories/lib/categoryName.ts
  - src/shared/auth/AuthProvider.tsx
  - src/shared/auth/signIn.ts
  - src/shared/date.ts
  - src/shared/firebase/client.ts
  - src/shared/money.ts
  - src/shared/theme/tokens.ts
  - src/shared/workspace/WorkspaceNameField.tsx
  - src/shared/workspace/WorkspaceProvider.tsx
  - src/shared/workspace/bootstrap.ts
  - tests/categories-ui.test.tsx
  - tests/categories.test.ts
  - tests/date.test.ts
  - tests/firestore.rules.test.ts
  - tests/invite-ui.test.tsx
  - tests/invite.test.ts
  - tests/money.test.ts
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-08-28T18:27:31Z
**Depth:** standard
**Files Reviewed:** 26 alterados no diff `b4b0708..HEAD` (`src`, `firestore.rules`, `tests`) + 4 arquivos fundacionais lidos por instrução explícita do pedido de revisão (`src/shared/money.ts`, `src/shared/date.ts`, `src/features/invite/join.ts`, `src/features/invite/data/invites.ts` — criados no scaffold anterior a `b4b0708`, mas load-bearing para o desenho revisado aqui)
**Status:** issues_found

## Summary

Revisão adversarial da Fase 1 (acesso, convite sem backend, categorias). O desenho central do convite — `firestore.rules` §`/invites/{token}` e §`/workspaces/{workspaceId}` — foi lido linha a linha contra os quatro ataques pedidos (combinação OR entre match blocks, posse de token, forjar `memberIds`, forjar `canArchive`) e resiste a todos eles; a suíte `tests/firestore.rules.test.ts` prova exatamente os cenários de Mallory descritos em `01-RESEARCH.md` §2 e passa (129/129 em `npm run test:all` contra o emulador real, `npm run build` limpo). Não encontrei nenhuma forma de ler ou escrever cross-workspace, nem de entrar num espaço sem o token correto.

O que encontrei foi, por ordem de gravidade: (1) um bug de parsing comprovado em `src/shared/money.ts` — a convenção D-23 de dinheiro que toda fase futura vai herdar tem uma ambiguidade real entre ponto-como-milhar e ponto-como-decimal que produz um valor 10× menor sem erro nem aviso; (2)/(3) duas lacunas de validação de campo nas regras de `update` (workspace e categories) que não bloqueiam ninguém de fora do espaço, mas permitem que um membro legítimo corrompa dados do próprio espaço compartilhado via requisição forjada, contornando a validação que só existe no cliente; (4) um padrão de duplo-disparo de `commit()` em `WorkspaceNameField` plausível em navegador real mas invisível ao jsdom da suíte de testes; e (5) uma classificação de erro genérica em `join.ts` que pode mostrar a cópia errada numa janela de corrida rara. Nenhum destes é uma falha de isolamento entre espaços — a superfície de ataque mais perigosa (auth/isolamento) está bem coberta.

## Critical Issues

### CR-01: `parseBRLToCents` interpreta "1.234" como R$ 1,23 em vez de R$ 1.234,00 — ambiguidade não tratada entre ponto-milhar e ponto-decimal

**File:** `src/shared/money.ts:27-45`
**Issue:** A convenção D-23 (dinheiro é sempre inteiro em centavos, "uma fase futura corrigir isso é migração de dados, não refatoração") depende desta função para toda entrada monetária futura. Quando o texto digitado contém um `.` mas NENHUMA vírgula, a função assume que o ponto é separador decimal — mas em pt-BR um valor sem vírgula e com ponto quase sempre significa milhar (`1.234` = mil duzentos e trinta e quatro), não `1,234`. Comprovado ao vivo:

```
$ node -e "... parseBRLToCents('1.234') ..."
1.234 -> 123        # deveria ser 123400 (R$ 1.234,00)
1234  -> 123400      # sem ponto, correto
R$ 1.234 -> 123      # mesmo bug com prefixo de moeda
```

Isso é uma corrupção silenciosa de valor por um fator de 100–1000×, exatamente o cenário que `01-CONTEXT.md` D-23 descreve como catastrófico ("mudar o tipo depois exige migrar todo documento financeiro já gravado"). `tests/money.test.ts` não cobre nenhuma entrada com ponto sem vírgula, então o bug passa despercebido pela suíte verde.

Esta função ainda não está conectada a nenhuma tela desta fase (dinheiro só vira observável na Fase 2), mas é exatamente por isso que vale corrigir agora — antes que uma tela de lançamento real dependa dela.

**Fix:** tratar qualquer `.` sem `,` acompanhante como separador de milhar (removê-lo, nunca convertê-lo em decimal), e só tratar como decimal um sufixo de exatamente 1–2 dígitos após o último separador quando não houver vírgula alguma — ou, mais simples e mais seguro para um app pt-BR puro, exigir que o separador decimal seja sempre vírgula e tratar QUALQUER `.` como separador de milhar a ser descartado:
```ts
export function parseBRLToCents(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const stripped = trimmed.replace(NOT_DIGIT_COMMA_DOT_MINUS, '')
  if (stripped === '' || stripped === '-') return null

  // pt-BR: '.' é SEMPRE separador de milhar, nunca decimal; ',' é sempre
  // o decimal quando presente. Remover todos os pontos primeiro, depois
  // tratar a vírgula (se houver) como decimal.
  const withoutThousands = stripped.replace(LITERAL_DOT, '')
  const normalized = withoutThousands.includes(',')
    ? withoutThousands.replace(',', '.')
    : withoutThousands

  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}
```
E adicionar um caso de teste explícito: `expect(parseBRLToCents('1.234')).toBe(123400)`.

## Warnings

### WR-01: `firestore.rules` — ramo de "atualização normal" do workspace não valida NENHUM campo além de `memberIds`

**File:** `firestore.rules:58-60`
**Issue:** A regra de `update` de `/workspaces/{workspaceId}` tem duas ramificações (OR). A ramificação de entrada por convite (linhas 62-72) é estrita: `diff().affectedKeys().hasOnly(['memberIds', 'joinToken'])`. Mas a ramificação "membro já existente atualizando" (linhas 58-60) só verifica que `memberIds` não mudou — **não há nenhum `affectedKeys().hasOnly(...)` nem validação de tipo/tamanho de `name`**. Isso significa que qualquer membro autenticado pode, via devtools/SDK direto (bypassando `WorkspaceNameField`, que só chama `updateDoc(ref, { name })`), gravar:
- `name` como string vazia, número, ou removê-lo — quebrando o contrato de UI "o espaço precisa de um nome" (Copywriting Contract) e potencialmente o `truncate`/`title` de `WorkspaceNameField.tsx:133` que assume `name` sempre string;
- `ownerId` para qualquer valor arbitrário;
- `createdAt` ou qualquer campo novo que uma fase futura venha a adicionar a este documento, já que não existe allowlist de campos neste ramo.

Isso não vaza dado de outro espaço (a checagem de `memberIds` continua correta) — é uma lacuna de validação de escrita dentro do próprio espaço compartilhado, que o outro membro sofre as consequências de ver (nome do espaço corrompido, por exemplo). `tests/firestore.rules.test.ts` não tem nenhum teste que tente renomear com nome vazio/tipo errado, então a lacuna não é pega pela suíte.

**Fix:** aplicar a mesma disciplina de campo que a ramificação de convite já usa:
```
(request.auth.uid in resource.data.memberIds
  && request.resource.data.memberIds == resource.data.memberIds
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name'])
  && request.resource.data.name is string
  && request.resource.data.name.size() > 0)
```

### WR-02: `firestore.rules` — `create`/`update` de categorias não validam `archivedAt`, `canArchive`, `isSystemDefault`

**File:** `firestore.rules:86-98`
**Issue:** `allow create` só exige `name is string`, `name.size() > 0` e `color is string` — nada obriga `archivedAt`, `canArchive` ou `isSystemDefault` a estarem presentes ou com o tipo certo. `allow update` só nega quando `resource.data.canArchive == false && request.resource.data.archivedAt != null` — qualquer outra combinação de campos passa livremente, sem `affectedKeys().hasOnly(...)`.

Consequência concreta e verificável no código cliente: `useCategories.ts:45-46` classifica como arquivada qualquer categoria em que `archivedAt !== null` — se um documento for criado via requisição forjada **sem** o campo `archivedAt` (o create rule não exige), `category.archivedAt` é `undefined`, e `undefined !== null` é `true`: a categoria nasce já **na lista de arquivadas**, mesmo tendo acabado de ser criada. `createCategory()` (`useCategoryMutations.ts:35-42`) sempre envia `archivedAt: null` pelo caminho normal do app, então isso só é alcançável forjando a escrita — mas como o app é 100% cliente sem backend, forjar é trivial (mesmo raciocínio de "qualquer um que abra devtools" já aplicado ao resto desta revisão).

**Fix:** exigir os campos obrigatórios no `create` e travar quais campos um `update` pode tocar:
```
allow create: if isMember(workspaceId)
  && request.resource.data.name is string
  && request.resource.data.name.size() > 0
  && request.resource.data.color is string
  && request.resource.data.archivedAt == null
  && request.resource.data.canArchive is bool
  && request.resource.data.isSystemDefault is bool;

allow update: if isMember(workspaceId)
  && !(resource.data.canArchive == false && request.resource.data.archivedAt != null)
  && request.resource.data.diff(resource.data).affectedKeys()
       .hasOnly(['name', 'color', 'archivedAt'])
  && request.resource.data.name is string
  && request.resource.data.name.size() > 0
  && request.resource.data.color is string;
```

### WR-03: `WorkspaceNameField` pode disparar `commit()` duas vezes ao confirmar com Enter (blur síncrono na remoção do input focado)

**File:** `src/shared/workspace/WorkspaceNameField.tsx:74-96`
**Issue:** `handleKeyDown` no Enter chama `void commit(draft)`. `commit()` faz `setSaving(true)` de forma síncrona antes do primeiro `await`; como o componente renderiza `if (saving) return <spinner>` ANTES de `if (editing) return <input>` (linhas 86-97), o `<input>` focado é removido do DOM no mesmo ciclo de commit do React que processa o clique/tecla. Em navegadores reais, remover um elemento focado do documento dispara `blur`/`focusout` de forma síncrona (spec do HTML), e o `<input>` tem `onBlur={() => void commit(draft)}` — ou seja, o próprio ato de entrar em "salvando" pode reentrar em `commit()` uma segunda vez com o mesmo valor, antes do primeiro `updateDoc` resolver.

Isto não corrompe dado (o segundo `updateDoc` grava o mesmo valor), mas é uma escrita duplicada evitável, e — mais importante para confiança na suíte — **não é pego pelo teste existente**: `tests/shell.test.tsx:175-189` testa Enter apenas no caminho de rejeição (`updateDocMock.mockRejectedValueOnce`), e afirma `toHaveBeenCalledTimes(1)`; isso só passa porque o jsdom usado pela suíte não implementa o disparo automático de `blur` na remoção de nó focado (limitação conhecida do jsdom) — o teste não reproduz o comportamento de um navegador real o suficiente para provar ausência do duplo-disparo.
**Fix:** guardar contra reentrância explicitamente, em vez de depender de o `<input>` nunca ser removido enquanto focado:
```ts
async function commit(value: string) {
  if (!workspace || saving) return   // guarda de reentrância
  ...
}
```
ou trocar a ordem de checagem de `saving`/`editing` para não desmontar o `<input>` sob foco (manter o próprio input visível com `disabled` durante o salvamento, em vez de trocar de subárvore).

### WR-04: `joinWorkspace` mapeia todo erro não-classificado para `invite-already-used`, mascarando corridas de "já pertence a outro espaço"

**File:** `src/features/invite/join.ts:100-118`
**Issue:** `resolveUserWorkspace(uid)` é checado ANTES de abrir a `runTransaction` (linha 59-62) — não dentro dela. Se, entre essa checagem e o commit da transação, outra aba/fluxo criar `/users/{uid}` concorrentemente (ex.: bootstrap de espaço próprio disparado por `WorkspaceProvider` na mesma sessão), a Security Rule nega a transação (via `!exists(/users/{uid})` na regra do workspace, linha 71 de `firestore.rules`) por um motivo diferente do documentado como aceito em T-01-08 (que é sobre dois resgatadores do MESMO token). O bloco `catch` genérico (linha 100-118) trata QUALQUER erro que não seja `JoinInviteError` como `'invite-already-used'` — nesse cenário de corrida específico, o usuário veria "Esse convite já foi usado" quando a causa real é "você já pertence a um espaço", uma cópia de erro enganosa (UI-SPEC define as duas variantes como textos distintos e intencionalmente diferentes).
**Fix:** não é bloqueante (janela de corrida estreita, mesma classe de risco residual já aceita para T-01-08) — mas vale documentar explicitamente esse caso adicional junto de T-01-08, ou reduzir o escopo do `catch` genérico verificando o código de erro do Firestore (`permission-denied`) antes de assumir "já usado" por padrão.

## Info

### IN-01: `firestore.rules` — nenhuma trava de tamanho máximo em `name` (workspace) ou `name`/`color` (categoria)

**File:** `firestore.rules:43-44`, `firestore.rules:87-89`
**Issue:** `request.resource.data.name.size() > 0` garante não-vazio, mas não há teto (`<= N`). Um payload forjado poderia gravar uma string de megabytes num campo que a UI espera ser curto (`WorkspaceNameField` limita a 60 no cliente via `maxLength`, mas isso é só HTML — não reforçado pela regra). Baixo risco prático para um app de 2 usuários no Spark, mas é o tipo de lacuna que vale fechar junto das WR-01/WR-02 acima, já que o `diff().affectedKeys()` já está sendo tocado nessas regras de qualquer forma.
**Fix:** adicionar `&& request.resource.data.name.size() <= 80` (ou valor equivalente) nas regras de `create`/`update` tocadas em WR-01/WR-02.

---

_Reviewed: 2026-08-28T18:27:31Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
