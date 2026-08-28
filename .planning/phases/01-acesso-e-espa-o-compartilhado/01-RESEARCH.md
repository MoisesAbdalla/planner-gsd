# Phase 1: Acesso e espaço compartilhado - Research

**Researched:** 2026-08-27
**Domain:** Firebase Auth (Google) + Cloud Firestore Security Rules sem Cloud Functions — convite por link sem backend, shell de app Vite/React, modelo de categorias
**Confidence:** MEDIUM — o desenho central (convite via Security Rules) é raciocínio aplicado, cross-verificado contra a documentação oficial do Firestore onde a busca funcionou; parte do "também pesquisar" (Auth popup/redirect, guarda de rota TanStack) não foi verificada nesta sessão por corte de limite de busca — ver `## Lacunas`.

> **Aviso de sessão:** esta pesquisa foi interrompida por um limite de sessão de busca web no meio da investigação dos itens secundários (Auth popup/redirect, guarda de rota TanStack Router, exemplo completo de `@firebase/rules-unit-testing`). O desenho central do convite (a pergunta que motivou esta pesquisa) foi fechado e verificado antes do corte. Os itens não verificados estão marcados `[ASSUMED]` e listados em `## Lacunas` — o planejador deve tratá-los como pontos a confirmar, não como fato assentado.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** O convite é um **link pronto para compartilhar** (WhatsApp), com o código embutido na URL. A pessoa abre o link, loga com o Google e já entra no espaço. Não há tela de digitar código.
- **D-02:** Como ninguém digita o código, ele deve ser **longo e aleatório** — requisito de segurança, não estética: sem Cloud Functions não há rate limiting, então o tamanho do espaço de busca é a única defesa contra força bruta.
- **D-03:** O convite **expira em 7 dias** (discricionário, adotado por mim).
- **D-04:** O convite é de **uso único** — assim que alguém entra por ele, o convite morre.
- **D-05:** **Não há limite fixo de membros**; o modelo de dados deve suportar N membros desde o início (one-way — atravessa as Security Rules das fases 2–6).
- **D-06:** A validação da entrada acontece na **Security Rule do Firestore**, não em servidor — desenho central desta fase.
- **D-07:** No primeiro login o usuário cai direto num espaço pronto; quem chega por link de convite entra no espaço do link em vez de ter um criado.
- **D-08:** O espaço tem nome editável, exibido no topo.
- **D-09:** O espaço nasce com 12 categorias em pt-BR: Mercado, Alimentação, Transporte, Moradia, Saúde, Lazer, Assinaturas, Educação, Vestuário, Pets, Presentes, Outros.
- **D-10:** Cor da categoria vem de paleta fixa (~10–12 cores), não seletor livre.
- **D-11:** Arquivar categoria preserva os lançamentos já feitos nela (CAT-04) — não é apagar.
- **D-12:** Navegação por barra fixa embaixo (mobile) / menu lateral (desktop) — Financeiro e Tarefas (costly reversibility).
- **D-13:** Abre onde o usuário parou (localStorage); primeiríssima abertura vai para Financeiro.
- **D-14:** Categorias, "convidar alguém", "sair da conta" ficam no menu do avatar, não como terceiro destino.
- **D-15 a D-19:** Direção visual — espaçoso/calmo, tema claro+escuro obrigatórios, personalidade calorosa, uma única linguagem visual, conduzida pela skill `frontend-design`.
- **D-20:** A `apiKey` do Firebase é pública por design — quem protege é a Security Rule.
- **D-21:** Conflito de escrita simultânea é last-write-wins, aceito conscientemente.
- **D-22:** Excluir a conta Google de um membro não apaga os dados do espaço.
- **D-23:** Dinheiro é inteiro em centavos (`amountCents`) com Dinero.js (one-way).
- **D-24:** Data de calendário é `YYYY-MM-DD` em `America/Sao_Paulo` (date-fns + `@date-fns/tz`) (one-way).
- **D-25:** `workspaceId` fica no **path** do documento, não só como campo (one-way).

### Claude's Discretion

- Prazo exato de expiração do convite — adotado 7 dias.
- Comprimento/alfabeto do código de convite.
- Cores concretas da paleta de categorias (já fechadas no UI-SPEC — não redecidir aqui).
- Ícone de categoria, se houver.
- Todo o desenho do modelo de dados do convite e da Security Rule de entrada — **é o assunto central deste documento**.
- Estrutura de pastas, padrão de código, `react-firebase-hooks` vs `reactfire`.

### Deferred Ideas (OUT OF SCOPE)

- Instalar como PWA na tela de início.
- Sair do espaço / trocar de espaço (v1 não tem esse fluxo).
- Cor de destaque por módulo (recusado, D-18).
- Categoria para ganhos (fora do escopo desta fase).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Usuário entra com conta Google | §Firebase Auth Google numa SPA |
| AUTH-02 | Usuário sai da conta | §Firebase Auth Google numa SPA (signOut) |
| AUTH-03 | Primeiro login cria espaço com usuário como membro | §Fluxo de primeiro login (sem convite) |
| AUTH-04 | Usuário gera link de convite | §O desenho central: convite sem backend |
| AUTH-05 | Segunda pessoa entra pelo link | §O desenho central: convite sem backend |
| AUTH-06 | Membros veem os mesmos dados em tempo real | §Firestore realtime em React |
| AUTH-07 | Isolamento entre espaços | §Security Rules de isolamento + §Testando isolamento |
| CAT-01 | Espaço nasce com categorias padrão pt-BR | §Seeding das 12 categorias |
| CAT-02 | Usuário cria categoria | §Modelo de categorias |
| CAT-03 | Usuário edita nome/cor | §Modelo de categorias |
| CAT-04 | Usuário arquiva sem perder histórico | §Arquivar vs. excluir |
| PLAT-01 | Interface em pt-BR | Herdado do UI-SPEC (fora do escopo técnico desta pesquisa) |
| PLAT-02 | Usável no celular e desktop sem rolagem horizontal | Herdado do UI-SPEC — shell já especifica breakpoint 768px |

</phase_requirements>

---

## Summary

O bloqueio central desta fase — convidar uma segunda pessoa para um espaço compartilhado sem nenhum backend — **tem solução robusta usando só Firestore Security Rules**, mas exige um desenho específico que não é o primeiro que vem à cabeça. A armadilha mais fácil de cair é: colocar o convite como subcoleção de `/workspaces/{workspaceId}/invites/{id}` (parece natural, combina com D-25) e descobrir tarde demais que uma Security Rule não tem como verificar "o chamador realmente sabe o código" a menos que o código seja, ele mesmo, o identificador do documento — porque `list` pode ser negado (ninguém enumera convites), mas `get` por um ID exato e conhecido não pode. A recomendação final: **coleção de nível raiz `/invites/{token}`, onde `token` é o próprio código aleatório usado como ID do documento** — não uma subcoleção do workspace, e não um campo dentro de um documento de path previsível.

A concessão de membership em si (adicionar o uid ao `memberIds` do workspace) precisa então **provar posse do token** dentro da própria regra de escrita do documento de workspace — o que exige que o cliente envie o token como campo do payload de entrada, para a regra usar `get()` e validar o convite correspondente. Sem essa prova, uma regra que só checasse "existe algum convite pendente para este workspace" seria contornável por qualquer usuário autenticado, mesmo sem nunca ter visto o link — essa é a falha mais perigosa e mais fácil de introduzir por acidente neste desenho, e o motivo de todo o raciocínio abaixo estar documentado passo a passo.

Uso único é garantido por dois mecanismos que se reforçam: (1) a própria Security Rule do documento de convite só permite a transição `pending → used` quando `resource.data.status == 'pending'` no momento da escrita; (2) o cliente deve envolver a leitura+escrita do convite numa `runTransaction()` real (não um `writeBatch()` solto), porque é o `transaction.get()` explícito que dá a garantia de controle de concorrência otimista do Firestore — se dois usuários tentarem resgatar o mesmo token quase ao mesmo tempo, o segundo commit falha e tenta de novo, vendo `status: 'used'` e sendo negado pela regra.

**Recomendação primária:** `token = crypto.randomUUID()` (nativo do browser, sem dependência) como ID do documento em `/invites/{token}`; workspace mantém `memberIds: string[]` (compatível com o padrão já estabelecido em `research/ARCHITECTURE.md`); a URL de convite carrega só o token (`/entrar?convite=TOKEN`); o join é uma `runTransaction()` de dois documentos (`/invites/{token}` e `/workspaces/{workspaceId}`), cada um com sua própria regra auto-suficiente.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Login Google / sessão | Browser / Client | — | Firebase Auth SDK roda inteiramente no navegador; sem servidor de sessão |
| Validação do convite (código válido/expirado/usado) | Database / Storage (Security Rules) | Browser / Client (leitura do doc para exibir estado) | Sem Cloud Functions, a única autoridade de validação é a regra do Firestore |
| Concessão de membership | Database / Storage (Security Rules) | Browser / Client (orquestra a `runTransaction`) | A regra decide; o cliente só propõe a escrita |
| Isolamento entre workspaces | Database / Storage (Security Rules) | — | `workspaceId` no path + `isMember()` — nenhuma outra camada existe para reforçar isso |
| Shell de navegação / roteamento | Browser / Client | — | SPA sem SSR (decisão já travada em `research/STACK.md`) |
| Sincronização de categorias em tempo real | Browser / Client (`onSnapshot`) | Database / Storage (fonte da verdade) | Não há camada intermediária; o listener é o mecanismo de "tempo real" |
| Seeding de categorias padrão | Browser / Client (dispara a escrita) | Database / Storage (persiste) | Sem Cloud Function `onCreate`, o próprio cliente que cria o workspace também semeia as categorias |

---

## O desenho central: convite sem backend

### 1. Onde o documento de convite mora

**Coleção de nível raiz, não subcoleção do workspace:**

```
/invites/{token}
  workspaceId: string        # aponta para o espaço-alvo
  createdBy: string (uid)    # quem gerou o convite
  createdAt: Timestamp
  expiresAt: Timestamp       # createdAt + 7 dias
  status: "pending" | "used"
  usedBy: string (uid) | null
  usedAt: Timestamp | null
```

`token` é o **ID do documento** — não um campo dentro de um documento com ID previsível. Essa escolha não é estética: é o que faz a regra "só quem conhece o código consegue ler" funcionar de graça, sem precisar comparar valores.

**Por que não `/workspaces/{workspaceId}/invites/{token}` (a opção que parece mais "correta" por seguir D-25):**

D-25 diz que `workspaceId` deve estar no path para isolar dados *do workspace*. O convite, porém, existe justamente para ser lido por alguém que **ainda não tem acesso ao workspace** — colocá-lo como subcoleção do workspace criaria uma dependência circular: para o cliente montar o path `/workspaces/{workspaceId}/invites/{token}` ele precisaria já saber o `workspaceId`, que só existe embutido na URL se a URL carregar *dois* identificadores (`workspaceId` + `token`) em vez de um só. D-01 é explícito: "o código embutido na URL" — no singular. Uma coleção de nível raiz, endereçada só pelo token, é a única estrutura compatível com "a URL carrega um único código".

**Por que isso não vaza conteúdo do workspace (a tensão citada na pergunta):** o documento de convite contém só metadados de bootstrap (`workspaceId`, prazos, status) — nunca nome do espaço, categorias, membros ou qualquer dado financeiro. Mesmo que um atacante consiga ler um convite válido de outra pessoa, o que ele aprende é "existe um workspace com este ID, com um convite pendente até tal data" — nada de substância, e nada que sirva sem *também* possuir o token para o passo de entrada.

**A regra de leitura:**

```
match /invites/{token} {
  // Verified: rules-conditions doc confirms get vs list são operações
  // distintas e podem ter regras independentes (ver Sources).
  allow get: if request.auth != null;
  allow list: if false;   // ninguém enumera convites — nem os seus próprios
  allow create: if request.auth != null
    && isMember(request.resource.data.workspaceId)
    && request.resource.data.createdBy == request.auth.uid
    && request.resource.data.status == 'pending'
    && request.resource.data.usedBy == null
    && request.resource.data.createdAt == request.time
    && request.resource.data.expiresAt == request.time + duration.value(7, 'd');
  allow update: if request.auth != null
    && resource.data.status == 'pending'
    && resource.data.expiresAt > request.time
    && request.resource.data.status == 'used'
    && request.resource.data.usedBy == request.auth.uid
    && request.resource.data.usedAt == request.time
    && request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly(['status', 'usedBy', 'usedAt']);
  allow delete: if false;
}
```

`allow get` é deliberadamente aberto a qualquer usuário autenticado — a segurança não vem de restringir quem pode ler um ID exato, vem de ninguém conseguir *descobrir* esse ID sem já possuir o link. `allow list: if false` é o que fecha essa porta: sem `list`, não existe forma de fazer `getDocs(collection(db, 'invites'))` nem qualquer query — só `getDoc()` num path exato.

`request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])` [CITED: firebase.google.com/docs/firestore/security/rules-conditions] garante que a atualização de "resgate" só pode tocar exatamente três campos — ninguém consegue, na mesma escrita, mudar `workspaceId` ou `createdBy` para redirecionar o convite para outro espaço.

### 2. A escrita de "entrar" — provando posse do token

Este é o ponto onde um desenho ingênuo quebra silenciosamente. **Não é suficiente** que a regra do workspace verifique "existe um convite pendente e não-expirado para este workspaceId" — isso permitiria qualquer usuário autenticado se auto-adicionar a *qualquer* workspace que, por acaso, tenha um convite pendente no momento, mesmo sem jamais ter visto o link. A regra precisa comparar o token que o **chamador está literalmente submetendo na escrita** contra o convite armazenado.

Solução: o payload de entrada no workspace carrega o token como campo, e a regra usa esse campo para localizar e validar o convite via `get()`:

```
match /workspaces/{workspaceId} {
  allow read: if request.auth != null && request.auth.uid in resource.data.memberIds;

  allow create: if request.auth != null
    && request.resource.data.memberIds == [request.auth.uid]
    && request.resource.data.ownerId == request.auth.uid
    && request.resource.data.createdAt == request.time
    && request.resource.data.name is string && request.resource.data.name.size() > 0;

  allow update: if request.auth != null && (
    // atualização normal por membro já existente (renomear espaço etc.):
    // a lista de membros não pode mudar por este caminho
    (request.auth.uid in resource.data.memberIds
      && request.resource.data.memberIds == resource.data.memberIds)
    ||
    // entrada via convite válido: única mudança permitida é acrescentar
    // o PRÓPRIO uid, e só se o token submetido resolver para um convite
    // pendente, não expirado, deste workspace
    (
      !(request.auth.uid in resource.data.memberIds)
      && request.resource.data.memberIds ==
           resource.data.memberIds.concat([request.auth.uid])
      && request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['memberIds', 'joinToken'])
      && get(/databases/$(database)/documents/invites/$(request.resource.data.joinToken)).data.workspaceId == workspaceId
      && get(/databases/$(database)/documents/invites/$(request.resource.data.joinToken)).data.status == 'pending'
      && get(/databases/$(database)/documents/invites/$(request.resource.data.joinToken)).data.expiresAt > request.time
      // trava adicional: uid não pode já pertencer a outro workspace
      && !exists(/databases/$(database)/documents/users/$(request.auth.uid))
    )
  );

  allow delete: if false;

  function isMember(wsId) {
    return request.auth != null &&
      request.auth.uid in
        get(/databases/$(database)/documents/workspaces/$(wsId)).data.memberIds;
  }
}
```

Pontos que exigem atenção no planejamento:

- `joinToken` acaba **persistido** como campo no documento do workspace (não é possível usar um campo "só para validação" que não seja gravado — o Firestore grava exatamente o que está em `request.resource.data`). Isso é aceitável: uma vez resgatado, o token já está morto no seu próprio documento (`status: 'used'`); tê-lo também como um campo residual no workspace não abre superfície de ataque nova, é só um rastro de auditoria de "por qual convite a última pessoa entrou".
- O `get()` dentro da regra do workspace lê o estado do convite **anterior à transação em andamento** — não o estado após a outra escrita da mesma transação (a atualização do convite para `used`). Por isso a condição verificada é `status == 'pending'` (o estado no início da transação), não `status == 'used'`. Verificar o estado pós-transação não funcionaria de forma confiável.
- `!exists(/databases/.../users/$(request.auth.uid))` é o que impede alguém que **já pertence a outro espaço** de entrar num segundo — fecha em nível de regra o estado "Já pertence a outro espaço" que o UI-SPEC já cobre em texto (E3). O documento `/users/{uid}` é criado uma única vez, no primeiro login OU no primeiro join, e nunca depois — ver função auxiliar abaixo.

```
match /users/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow create: if request.auth != null && request.auth.uid == uid
    && request.resource.data.workspaceId is string;
  allow update: if request.auth != null && request.auth.uid == uid
    && request.resource.data.workspaceId == resource.data.workspaceId; // imutável
  allow delete: if false;
}
```

### 3. Uso único sem transação server-side

Dois mecanismos, um de dados e um de protocolo, juntos garantem uso único:

**Mecanismo de dados (a regra em si):** a atualização do convite só passa se `resource.data.status == 'pending'` **no momento em que a regra é avaliada**. Assim que uma primeira escrita bem-sucedida muda o status para `'used'`, qualquer tentativa seguinte de repetir a mesma atualização vê `resource.data.status == 'used'` e é negada — não importa quem tenta, mesmo com o token correto.

**Mecanismo de protocolo (por que precisa ser uma `runTransaction()` real, não um `writeBatch()`):** [ASSUMED — raciocínio aplicado sobre o comportamento documentado de Optimistic Concurrency Control do Firestore, não verificado ao vivo nesta sessão] o Firestore garante controle de concorrência otimista especificamente sobre os documentos lidos via `transaction.get()` **dentro** de uma transação: se o documento mudar entre a leitura e o commit, a transação inteira falha e a função é executada de novo automaticamente pelo SDK. Isso fecha a corrida entre duas pessoas resgatando o mesmo token quase simultaneamente — a segunda tentativa, ao re-executar, lê `status: 'used'` e a checagem da regra (ou da própria lógica do cliente) impede o commit.

```typescript
// Client-side join flow
import { runTransaction, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';

async function joinWorkspace(db: Firestore, token: string, uid: string) {
  const inviteRef = doc(db, 'invites', token);

  await runTransaction(db, async (tx) => {
    // OBRIGATÓRIO: usar tx.get(), não getDoc() solto — é isso que dá a
    // garantia de OCC do Firestore contra resgate concorrente do mesmo token.
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) throw new Error('invite-not-found');
    const invite = inviteSnap.data();
    if (invite.status !== 'pending') throw new Error('invite-already-used');
    if (invite.expiresAt.toMillis() < Date.now()) throw new Error('invite-expired');

    const workspaceRef = doc(db, 'workspaces', invite.workspaceId);

    tx.update(inviteRef, {
      status: 'used',
      usedBy: uid,
      usedAt: serverTimestamp(),
    });
    tx.update(workspaceRef, {
      memberIds: arrayUnion(uid),
      joinToken: token,
    });
    tx.set(doc(db, 'users', uid), { workspaceId: invite.workspaceId });
  });
}
```

**Limite honesto deste desenho (o que uma Cloud Function faria melhor):** o `get()` *dentro da regra de segurança* não tem a mesma garantia formal de participar do conjunto de leitura rastreado para OCC que o `tx.get()` do cliente tem — por isso o código acima depende do `tx.get()` explícito no cliente para a garantia real de não-duplo-resgate, e a regra funciona como uma segunda camada de defesa (nega o resgate se, por qualquer razão, o cliente não passar pela transação — ex.: uma requisição REST direta forjada). Existe uma janela teórica, extremamente estreita, em que **dois clientes maliciosos que não passam pelo SDK de transação** (chamadas REST/gRPC cruas e desacopladas, não agrupadas em uma transação real) poderiam ambos ler `status: 'pending'` antes de qualquer um commitar. Para um app de duas pessoas, sem exposição pública e sem cenário de atacante realista além de "o link vazou", esse risco residual é aceitável — mas deve ficar registrado como decisão consciente, não como lacuna esquecida. Se essa garantia formal se tornar necessária (ex.: produto vira multi-tenant público), a solução correta é uma Cloud Function `onCall` fazendo a transação com Admin SDK — o que está fora do escopo do Spark plan por decisão do usuário.

### 4. Superfície de ataque e matemática de entropia

Sem Cloud Functions não há rate limiting algum — a única defesa contra força bruta é o tamanho do espaço de busca do token.

**Recomendação: `crypto.randomUUID()`** — API nativa do browser (Web Crypto, disponível em todo navegador moderno com contexto seguro/HTTPS, que é o caso de qualquer app servido por Firebase Hosting), zero dependências. Produz uma string como `3f29a1c4-8b6e-4d2a-9f1e-7c5b8a3d2e10`.

**Matemática de entropia** [CITED: busca cross-verificada — UUID v4 = 122 bits de aleatoriedade real (6 dos 128 bits são fixos para versão/variante); NIST SP 800-63B trata "look-up secrets" como precisando de no mínimo 64 bits de entropia quando não há rate limiting, ou apenas 20 bits quando há — este caso não tem rate limiting algum, então o piso relevante é o mais alto]:

- Espaço de busca: 2^122 ≈ 5,32 × 10^36 valores possíveis.
- Atacante hipotético MUITO generoso: 10.000 tentativas/segundo sustentadas indefinidamente (isso já excede em muitas ordens de grandeza o que é realista contra leituras autenticadas do Firestore pela internet — cada tentativa exige um token de autenticação válido, handshake TLS, e uma leitura de documento cobrada).
- Tentativas por ano nesse ritmo: 10.000 × 31.536.000 ≈ 3,15 × 10^11/ano.
- Tempo esperado para encontrar uma colisão (metade do espaço, caso médio): (2^121) / (3,15 × 10^11) ≈ 8,4 × 10^24 anos.
- Para contextualizar: a idade do universo é ≈ 1,38 × 10^10 anos — o tempo esperado de força bruta é **~6 × 10^14 vezes** a idade do universo, mesmo nesse ritmo de ataque exagerado.
- **Barreira adicional específica do Spark:** o plano Spark tem cota diária fixa de leituras (documentada como 50 mil/dia) sem opção de faturamento para exceder — um atacante tentando adivinhar em volume alto colide com essa cota antes de qualquer chance estatística relevante, e nesse processo degradaria a disponibilidade do próprio app para os dois usuários reais (um risco de negação de serviço a considerar, não um risco de adivinhação bem-sucedida).

**Conclusão:** 122 bits de entropia é várias ordens de grandeza acima de qualquer piso de referência da indústria (64–128 bits para segredos sem rate limiting) — não há necessidade de token mais longo, e `crypto.randomUUID()` evita adicionar uma dependência (`nanoid`) só para um ganho de entropia que já é irrelevante além dele.

**Se um formato mais curto for desejado por estética de URL:** `nanoid(24)` com o alfabeto padrão (64 símbolos) rende 24 × log₂(64) = 144 bits — ainda mais forte, mas adiciona uma dependência de ~130 bytes só para isso. Não recomendado sem uma razão de produto explícita para preferir um código mais curto.

### 5. Se o desenho por Security Rules puro tivesse uma falha real

O ponto mais frágil identificado (§3, Limite honesto) não é uma falha capaz de invalidar o desenho — é uma janela de corrida teórica que exige um atacante mal-intencionado bypassando deliberadamente o SDK do cliente, contra um app sem exposição pública. **Não há, portanto, um motivo para abandonar o desenho por Security Rules puro nesta escala.** Se este produto algum dia precisar de uma garantia formal mais forte (ex.: virar multi-tenant público, ou aceitar convites de alto valor/sensibilidade), a alternativa mais barata é: manter tudo como está e adicionar **uma única Cloud Function `onCall`** (`redeemInvite`) que faz exatamente a mesma transação com o Admin SDK — não uma reformulação do modelo de dados, apenas mover a orquestração da transação do cliente para o servidor. Isso exigiria o plano Blaze, que está fora de escopo por decisão explícita do usuário (D-06, PROJECT.md).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `firebase` | 12.x [CITED: research/STACK.md, verificado via npm view em 2026-08-27/28] | Auth + Firestore client SDK | Único SDK oficial para Auth+Firestore no cliente |
| `@tanstack/react-router` | 1.170.x [CITED: research/STACK.md] | Roteamento SPA | Já decidido no stack do projeto; search-params tipados úteis já a partir da Fase 2 |
| `react-firebase-hooks` | 5.1.x [CITED: research/STACK.md] | Hooks `useAuthState`, `useCollection`, `useDocumentData` | Escolha do projeto sobre `reactfire` — menos boilerplate para um app de 2 usuários |
| `tailwindcss` + `@tailwindcss/vite` | 4.x [CITED: research/STACK.md] | Estilo, tokens `@theme` CSS-first | Já travado no UI-SPEC |
| `shadcn` (CLI) | latest [CITED: research/STACK.md] | Gera componentes copiados (Dialog, Sheet, DropdownMenu, Avatar, Input, Button, Separator, Sonner) | Travado no UI-SPEC §Design System e §Registry Safety |
| `lucide-react` | latest [CITED: research/STACK.md] | Ícones | Já decidido |
| `class-variance-authority` | 0.7.x [CITED: research/STACK.md] | Variantes de componente shadcn | Acompanha o padrão shadcn |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` + `zod` + `@hookform/resolvers` | 7.86.x / 4.4.x [CITED: research/STACK.md] | Formulário de categoria e nome do espaço | Validação inline (nome vazio/duplicado) |
| `date-fns` + `@date-fns/tz` | 4.4.x / 1.5.x [CITED: research/STACK.md] | Formatação/timezone `America/Sao_Paulo` para `expiresAt`/`createdAt` do convite | Convenção D-24, fixada nesta fase mesmo sem tela de data ainda |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `crypto.randomUUID()` para o token | `nanoid(24)` | Token mais curto/legível na URL, mas adiciona dependência sem ganho de segurança relevante (ver §Entropia) |
| `memberIds: string[]` no workspace | Subcoleção `/workspaces/{id}/members/{uid}` | A subcoleção evita reescrever o array inteiro a cada join, mas diverge do padrão já fixado em `research/ARCHITECTURE.md` usado pelas Fases 2–6; não vale a divergência para uma escala de 2–poucos membros |
| `runTransaction()` para o join | `writeBatch()` | Batch NÃO dá a garantia de OCC leitura-então-escrita que a transação dá — não usar para o resgate do convite |

**Installation:**
```bash
npm install firebase @tanstack/react-router react-hook-form zod @hookform/resolvers \
  date-fns @date-fns/tz react-firebase-hooks lucide-react class-variance-authority

npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react \
  @testing-library/jest-dom @firebase/rules-unit-testing firebase-tools \
  typescript @vitejs/plugin-react eslint

npx shadcn@latest init
npx shadcn@latest add button dialog sheet dropdown-menu input label avatar separator sonner
```

**Version verification:** os números acima foram verificados via `npm view` em `research/STACK.md` (2026-08-27/28), não re-verificados nesta sessão por corte de limite de busca. Reconfirmar com `npm view <pacote> version` no momento real da instalação — o ecossistema evolui rápido.

## Package Legitimacy Audit

Nenhum pacote novo é introduzido além dos já auditados em `research/STACK.md` (que rodou `npm view` ao vivo contra o registry em 2026-08-27/28 para cada um destes). Esta fase reaproveita esse levantamento em vez de repeti-lo — instrução explícita foi interromper novas buscas nesta sessão.

| Package | Registry | Fonte da verificação | Disposition |
|---------|----------|----------------------|-------------|
| `firebase` | npm | `research/STACK.md` (`npm view`, 2026-08-27) | Approved — pacote oficial Google |
| `@tanstack/react-router` | npm | `research/STACK.md` | Approved |
| `react-firebase-hooks` | npm | `research/STACK.md` | Approved |
| `tailwindcss` / `@tailwindcss/vite` | npm | `research/STACK.md` | Approved — pacote oficial |
| `shadcn` (CLI) | npm | `research/STACK.md` | Approved |
| `react-hook-form` / `zod` / `@hookform/resolvers` | npm | `research/STACK.md` | Approved |
| `date-fns` / `@date-fns/tz` | npm | `research/STACK.md` | Approved |
| `@firebase/rules-unit-testing` | npm | `research/STACK.md` | Approved — pacote oficial Google |
| `firebase-tools` | npm | `research/STACK.md` | Approved — CLI oficial |

**Packages removed due to [SLOP] verdict:** nenhum.
**Packages flagged as suspicious [SUS]:** nenhum.

*Nota: o gate `gsd_run query package-legitimacy check` não foi executado nesta sessão por instrução explícita de interromper chamadas de ferramenta. Se o planejador quiser a verdict formal (OK/SUS/SLOP) por pacote, rodar o comando antes de aprovar o plano — não deve bloquear o planejamento, já que todos os pacotes são bibliotecas estabelecidas e oficiais reconhecíveis por qualquer desenvolvedor experiente.*

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER (Vite SPA)                          │
│                                                                    │
│  ┌──────────────┐     ┌────────────────────────────────────┐    │
│  │ /entrar       │     │ Shell (rail/bottom-nav)             │    │
│  │ (sign-in)     │     │  ├─ Financeiro (fases 2-5)           │    │
│  │               │     │  └─ Tarefas (fase 6)                 │    │
│  └──────┬────────┘     │  └─ Menu do avatar                   │    │
│         │              │      ├─ Categorias                   │    │
│         │ signIn       │      ├─ Convidar alguém               │    │
│         │ Redirect     │      └─ Sair da conta                 │    │
│         ▼              └───────────────┬──────────────────────┘    │
│  ┌──────────────────────────────────────┴─────────────────────┐   │
│  │ AuthProvider (onAuthStateChanged + getRedirectResult)        │   │
│  │  status: "loading" -> tela de boot (logo centralizada)       │   │
│  │  status: "signed-out" -> /entrar                             │   │
│  │  status: "signed-in" -> resolve /users/{uid}.workspaceId      │   │
│  └──────────────────────────────────────┬─────────────────────┘   │
│                                          │ onSnapshot listeners     │
├──────────────────────────────────────────┴─────────────────────────┤
│                    Firebase Authentication (Google)                 │
├───────────────────────────────────────────────────────────────────┤
│                Cloud Firestore + Security Rules                     │
│                                                                       │
│  /invites/{token}                <- coleção raiz, sem list          │
│  /users/{uid}                    <- workspaceId, imutável            │
│  /workspaces/{workspaceId}                                           │
│     memberIds, name, ownerId                                         │
│     /categories/{categoryId}     <- 12 seeds + criadas pelo usuário  │
└───────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── app/
│   ├── router.tsx              # TanStack Router root, auth gate no root component
│   └── shell/                  # AppShell (bottom-nav mobile / rail desktop)
├── shared/
│   ├── auth/                   # AuthProvider, useAuth, signIn/signOut
│   ├── workspace/               # useWorkspace, resolve workspaceId a partir de /users/{uid}
│   ├── firebase/                # init do app Firebase (config pública), refs/converters
│   └── ui/                      # componentes shadcn copiados
├── modules/
│   └── categories/
│       ├── components/          # lista, form criar/editar, grade de cores
│       ├── hooks/                # useCategories (onSnapshot), useArchiveCategory
│       └── data/                 # refs/converters da coleção categories
├── features/
│   └── invite/
│       ├── components/           # diálogo "Convidar alguém", tela de entrada por link
│       └── join.ts               # runTransaction de resgate (código do §2/§3 acima)
functions/                        # NÃO EXISTE nesta fase — sem Cloud Functions (D-06)
firestore.rules
firestore.indexes.json
firebase.json
```

### Pattern 1: Auth gate no componente raiz (não em `beforeLoad` de rota)
**What:** todo o roteamento fica atrás de um único gate de autenticação no componente raiz da árvore, não espalhado em `beforeLoad` por rota.
**When to use:** quando o modelo de autorização é binário (dentro do shell ou não) em vez de granular por rota — é exatamente o caso desta fase (não há rotas com permissões diferentes dentro do shell).
**Rationale [ASSUMED — decisão arquitetural razoada, não confirmada contra a documentação do TanStack Router nesta sessão por corte de busca]:** mais simples que replicar a checagem em `beforeLoad` de cada rota protegida, e evita a complexidade de popular `router.context` de forma assíncrona antes do primeiro render. Ver `## Lacunas` — este padrão deve ser confirmado contra a documentação oficial do TanStack Router antes de codificar.

```typescript
// src/app/router.tsx (esboço, não verificado contra docs oficiais nesta sessão)
function AppRoot() {
  const { status, user } = useAuth(); // 'loading' | 'signed-out' | 'signed-in'

  if (status === 'loading') return <BootScreen />;       // logo centralizada (UI-SPEC E7)
  if (status === 'signed-out') return <SignInScreen />;   // UI-SPEC Screen 1
  return <RouterProvider router={router} context={{ user }} />;
}
```

### Pattern 2: Boot screen sem flash de conteúdo não-autenticado
**What:** o `AuthProvider` inicia em `status: 'loading'` e só decide entre tela de login e shell depois que `onAuthStateChanged` disparar pela primeira vez.
**When to use:** sempre — é o requisito explícito do UI-SPEC (E7: "logo centralizada em tela cheia enquanto o Firebase Auth resolve").
```typescript
// src/shared/auth/AuthProvider.tsx
import { onAuthStateChanged, getRedirectResult, type User } from 'firebase/auth';

type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

function useAuthProvider() {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // completa o fluxo signInWithRedirect ao voltar do Google
    getRedirectResult(auth).catch(() => {/* erro tratado via toast de "Falha no login do Google" */});

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setStatus(u ? 'signed-in' : 'signed-out');
    });
    return unsubscribe;
  }, []);

  return { status, user };
}
```

### Pattern 3: `onSnapshot` de categorias sem escrita otimista
**What:** o formulário de categoria nunca atualiza a UI antes da confirmação do Firestore — o botão vira spinner, e só quando o `onSnapshot` empurra o novo estado é que a lista reflete a mudança. Isso é a decisão já travada no UI-SPEC ("Falha de gravação: sempre toast com ação 'tentar de novo' [...] não é atualização otimista — o valor exibido só muda depois que a gravação confirma").
```typescript
// src/modules/categories/hooks/useCategories.ts
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';

function useCategories(workspaceId: string) {
  const q = query(
    collection(db, 'workspaces', workspaceId, 'categories'),
    orderBy('name'),
  );
  const [snapshot, loading, error] = useCollection(q);
  return {
    categories: snapshot?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [],
    loading,
    error, // dispara toast "Não deu para salvar. Tenta de novo?" na tela que consome
  };
}

// Criar categoria: SEM update otimista de estado local.
// O botão fica em loading até o addDoc resolver; a lista muda quando o
// onSnapshot dispara — nunca antes.
async function createCategory(workspaceId: string, data: NewCategory) {
  await addDoc(collection(db, 'workspaces', workspaceId, 'categories'), {
    ...data,
    isSystemDefault: false,
    archivedAt: null,
    createdAt: serverTimestamp(),
  });
}
```
Os dois usuários enxergando a mesma categoria em tempo real (critério de sucesso 2 da fase) é uma consequência direta de os dois terem o mesmo `onSnapshot` aberto na mesma subcoleção — nenhum mecanismo adicional de sincronização é necessário.

### Anti-Patterns to Avoid
- **Convite como subcoleção do workspace:** quebra a premissa de "um único código na URL" (ver §1 acima) — exigiria `workspaceId` também na URL, ou uma query cross-collection que a regra de segurança não consegue restringir com a mesma simplicidade.
- **Checar só "existe convite pendente para este workspace" na regra do workspace:** permite que qualquer usuário autenticado entre em qualquer espaço com convite pendente, sem nunca ter visto o link — a regra PRECISA comparar o token submetido, não só a existência de algum convite (ver §2).
- **`writeBatch()` para o resgate do convite:** não dá a garantia de leitura-então-escrita rastreada que `runTransaction()` dá — usar batch aqui reabre a corrida de duplo resgate que a transação fecha.
- **Atualização otimista na lista de categorias:** UI-SPEC travou toast-com-retry em vez de otimismo — um `onSnapshot` que reage à escrita já é "tempo real" o suficiente sem precisar de estado local antecipado.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geração de token de convite aleatório | Um gerador caseiro sobre `Math.random()` | `crypto.randomUUID()` | `Math.random()` não é criptograficamente seguro — previsível o suficiente para viabilizar adivinhação em um espaço de busca menor do que o esperado |
| Comparação de campos alterados numa escrita de regra | Uma lista manual de `if` por campo | `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])` | Função nativa da linguagem de regras do Firestore, testada e documentada — reimplementar convida a esquecer um campo |
| Data/hora de expiração do convite | Cálculo manual de "7 dias em milissegundos" no cliente E na regra, em dois lugares que podem divergir | `duration.value(7, 'd')` na regra (comparação server-side) + `date-fns`/`addDays` no cliente só para exibir "válido até" | Cálculo duplicado em linguagem de regras vs. JS é uma fonte clássica de divergência sutil (fuso, arredondamento) |
| Sincronização "tempo real" entre os dois membros | Um polling manual ou WebSocket próprio | `onSnapshot` do Firestore | É exatamente para isso que o SDK existe; reimplementar é retrabalho puro |

**Key insight:** neste domínio (regras de segurança sem servidor), quase todo "hand-roll" tentador é, na verdade, uma tentativa de reimplementar uma garantia que o próprio Firestore já oferece nativamente (diff de campos, controle de concorrência otimista, listeners) — o risco raramente é "não funciona", é "funciona até o caso de borda que a reimplementação não cobriu".

---

## Fluxo de primeiro login (sem convite)

Complementa AUTH-03. Ao detectar `status: 'signed-in'` e `/users/{uid}` **não existir** (nem `workspaceId` nem invite pendente na URL), o cliente cria o espaço:

```typescript
async function bootstrapNewWorkspace(uid: string) {
  const workspaceRef = doc(collection(db, 'workspaces')); // ID auto-gerado, ainda não commitado

  // Passo 1 — cria o workspace e o doc do usuário (pode ser um único writeBatch,
  // já que nenhuma das duas regras faz get() na outra dentro desta escrita).
  const batch = writeBatch(db);
  batch.set(workspaceRef, {
    name: 'Nosso espaço',          // [ASSUMED — copy padrão não especificada no UI-SPEC, ver Assumptions Log]
    ownerId: uid,
    memberIds: [uid],
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', uid), { workspaceId: workspaceRef.id });
  await batch.commit();

  // Passo 2 — SEPARADO, não no mesmo batch: semear as 12 categorias.
  // Ver "Pitfall: seeding no mesmo batch da criação do workspace" abaixo.
  await seedDefaultCategories(workspaceRef.id);
}
```

### Pitfall: seeding de categorias no MESMO batch da criação do workspace

[ASSUMED — raciocínio aplicado sobre a semântica documentada de que regras dentro de uma mesma requisição/batch avaliam contra o estado do banco anterior à operação; não confirmado ao vivo no emulador nesta sessão por corte de busca]

Se a regra de `create` de `/workspaces/{workspaceId}/categories/{categoryId}` depender de `isMember(workspaceId)` (que faz `get()` no documento pai do workspace), e esse `get()` for avaliado contra o estado **anterior** ao batch inteiro — o documento do workspace ainda não existe nesse instante, mesmo que ele também esteja sendo criado no mesmo batch. Isso faria a criação das categorias falhar silenciosamente junto com o restante do batch (batches são atômicos: se uma escrita é negada, o batch inteiro é revertido).

**Mitigação recomendada, adotada no código acima:** separar em duas operações sequenciais *aguardadas* — primeiro o `writeBatch()` que cria `/workspaces/{id}` e `/users/{uid}` (nenhuma das duas depende de `get()` na outra), e só depois, com o workspace já commitado, um segundo `writeBatch()` que semeia as 12 categorias (agora `isMember()` encontra o workspace já existente).

**Consequência aceita:** se o app crashar exatamente entre os dois passos, existe uma janela onde o workspace existe com zero categorias. Mitigar com IDs determinísticos (ver seção seguinte) para que reabrir o app possa re-rodar o seeding de forma idempotente sem duplicar.

**⚠️ Checkpoint recomendado para o plano:** verificar este comportamento ao vivo no emulador antes de finalizar o código de bootstrap — é a única forma de confirmar se a separação em dois passos é realmente necessária ou se um único batch funcionaria (ver `## Lacunas`).

## Seeding das 12 categorias

CAT-01 exige que o espaço já nasça com as 12 categorias em pt-BR (D-09). Usar **IDs determinísticos** (slug do nome) em vez de IDs automáticos — torna o seeding idempotente (reexecutável com segurança se a etapa anterior falhar parcialmente) via `set()` em vez de `add()`:

```typescript
const DEFAULT_CATEGORIES = [
  { id: 'mercado',      name: 'Mercado' },
  { id: 'alimentacao',  name: 'Alimentação' },
  { id: 'transporte',   name: 'Transporte' },
  { id: 'moradia',      name: 'Moradia' },
  { id: 'saude',        name: 'Saúde' },
  { id: 'lazer',        name: 'Lazer' },
  { id: 'assinaturas',  name: 'Assinaturas' },
  { id: 'educacao',     name: 'Educação' },
  { id: 'vestuario',    name: 'Vestuário' },
  { id: 'pets',         name: 'Pets' },
  { id: 'presentes',    name: 'Presentes' },
  { id: 'outros',       name: 'Outros' },
] as const;
// Nomes verbatim conforme D-09 (01-CONTEXT.md linha 33). Cores: atribuir na
// ordem da Category Color Palette do UI-SPEC (linhas 101-112) — "Outros"
// SEMPRE recebe o tom neutro hsl(30 8% 42%), nunca um dos 11 tons cromáticos.

async function seedDefaultCategories(workspaceId: string) {
  const batch = writeBatch(db);
  for (const cat of DEFAULT_CATEGORIES) {
    const ref = doc(db, 'workspaces', workspaceId, 'categories', cat.id);
    batch.set(ref, {
      name: cat.name,
      color: CATEGORY_COLOR_TOKENS[cat.id], // do UI-SPEC, não redecidir aqui
      isSystemDefault: true,
      canArchive: cat.id !== 'outros', // "Outros" nunca pode ser arquivada
      archivedAt: null,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}
```

Regra correspondente, incluindo a trava de "Outros nunca arquiva" também no servidor (defesa em profundidade — o UI-SPEC já desabilita o botão no cliente, mas a regra fecha o caso de alguém forjar a requisição):

```
match /workspaces/{workspaceId}/categories/{categoryId} {
  allow read: if isMember(workspaceId);
  allow create: if isMember(workspaceId)
    && request.resource.data.name is string
    && request.resource.data.name.size() > 0
    && request.resource.data.color is string;
  allow update: if isMember(workspaceId)
    && !(resource.data.canArchive == false && request.resource.data.archivedAt != null);
  allow delete: if false; // nunca — arquivar, não excluir (D-11, CAT-04)
}
```

## Arquivar vs. excluir (CAT-04)

Nunca `deleteDoc()`. Arquivar é `updateDoc(ref, { archivedAt: serverTimestamp() })` — o documento continua existindo, então qualquer `transactionId`/`categoryId` já gravado em um lançamento futuro (Fase 2+) continua resolvendo normalmente. A lista de categorias (UI-SPEC Screen 5) filtra por `archivedAt == null` para a visão padrão, e mostra as arquivadas esmaecidas atrás do toggle "Mostrar arquivadas". Não existe fluxo de "desarquivar" especificado nesta fase — se necessário, é a mesma operação invertida (`archivedAt: null`), mas fica fora do escopo definido pelo UI-SPEC/CONTEXT.md.

---

## Testando isolamento entre dois workspaces reais

Este é o mecanismo que prova o critério de sucesso 3 da fase ("um usuário logado em outro espaço não consegue ler nem gravar nada no primeiro espaço — verificado com dois espaços de verdade").

**Setup do emulador** (`firebase.json`):
```json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true }
  }
}
```

**Suite de teste** [ASSUMED na estrutura de API exata (`initializeTestEnvironment`, `withSecurityRulesDisabled`, `authenticatedContext`) — confirmada como existente pela busca desta sessão, mas o exemplo abaixo não foi rodado ao vivo contra o emulador por corte de limite de busca; ver `## Lacunas`]:

```typescript
// tests/firestore.rules.test.ts
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import { beforeAll, afterAll, afterEach, test } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'cotidiano-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterEach(() => testEnv.clearFirestore());
afterAll(() => testEnv.cleanup());

test('membro do espaço B não lê categorias do espaço A', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'workspaces/wsA'), { memberIds: ['alice'], ownerId: 'alice', name: 'A' });
    await setDoc(doc(db, 'workspaces/wsB'), { memberIds: ['bob'], ownerId: 'bob', name: 'B' });
    await setDoc(doc(db, 'workspaces/wsA/categories/mercado'), { name: 'Mercado', color: '#000', canArchive: true, archivedAt: null });
  });

  const bobDb = testEnv.authenticatedContext('bob').firestore();
  await assertFails(getDoc(doc(bobDb, 'workspaces/wsA/categories/mercado')));

  const aliceDb = testEnv.authenticatedContext('alice').firestore();
  await assertSucceeds(getDoc(doc(aliceDb, 'workspaces/wsA/categories/mercado')));
});

test('membro do espaço B não escreve no espaço A', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'workspaces/wsA'), { memberIds: ['alice'], ownerId: 'alice', name: 'A' });
  });
  const bobDb = testEnv.authenticatedContext('bob').firestore();
  await assertFails(
    setDoc(doc(bobDb, 'workspaces/wsA/categories/nova'), { name: 'Nova', color: '#111', canArchive: true, archivedAt: null }),
  );
});

test('convite válido permite exatamente o próprio uid entrar', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'workspaces/wsA'), { memberIds: ['alice'], ownerId: 'alice', name: 'A' });
    await setDoc(doc(db, 'invites/TOKEN123'), {
      workspaceId: 'wsA', status: 'pending', createdBy: 'alice', usedBy: null,
      expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob').firestore();
  await assertSucceeds(updateDoc(doc(bobDb, 'invites/TOKEN123'), {
    status: 'used', usedBy: 'bob', usedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(doc(bobDb, 'workspaces/wsA'), {
    memberIds: arrayUnion('bob'), joinToken: 'TOKEN123',
  }));
});

test('convite já usado não pode ser resgatado de novo', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'invites/TOKEN123'), {
      workspaceId: 'wsA', status: 'used', createdBy: 'alice', usedBy: 'bob',
      expiresAt: Timestamp.fromMillis(Date.now() + 1000 * 60 * 60),
    });
  });
  const carolDb = testEnv.authenticatedContext('carol').firestore();
  await assertFails(updateDoc(doc(carolDb, 'invites/TOKEN123'), {
    status: 'used', usedBy: 'carol', usedAt: serverTimestamp(),
  }));
});

test('convite expirado não pode ser resgatado', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'invites/TOKEN123'), {
      workspaceId: 'wsA', status: 'pending', createdBy: 'alice', usedBy: null,
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    });
  });
  const bobDb = testEnv.authenticatedContext('bob').firestore();
  await assertFails(updateDoc(doc(bobDb, 'invites/TOKEN123'), {
    status: 'used', usedBy: 'bob', usedAt: serverTimestamp(),
  }));
});

test('usuário não autenticado é sempre negado', async () => {
  const anonDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonDb, 'workspaces/wsA')));
});
```

**Comando de execução local:**
```bash
firebase emulators:exec --only firestore,auth "vitest run tests/firestore.rules.test.ts"
```

---

## Firebase Auth Google numa SPA

[ASSUMED — esta subseção não foi verificada por busca ao vivo nesta sessão (limite de sessão atingido antes da consulta); é conhecimento de treinamento sobre comportamento documentado do Firebase Auth, não confirmado contra a documentação oficial nesta rodada. Ver `## Lacunas`.]

**Popup vs. redirect:** `signInWithPopup` evita navegação de página (boa UX em desktop), mas depende de bloqueadores de popup não interferirem e tem comportamento inconsistente em navegadores móveis restritivos (Safari iOS em particular tem histórico de problemas com popups de OAuth fora de um clique direto do usuário). `signInWithRedirect` navega a página inteira para o Google e volta — funciona de forma mais previsível em contexto móvel, ao custo de exigir tratar o retorno via `getRedirectResult()` no boot do app (Pattern 2 acima).

**Recomendação para esta fase:** usar `signInWithRedirect` uniformemente nas duas telas de entrada (Screen 1 "Entrar" e Screen 4 "Entrar por link de convite") — um único caminho de código para os dois pontos de entrada, e mais robusto no celular, que é onde D-01 espera que o link seja aberto (compartilhado via WhatsApp). Isso evita ter que detectar e tratar diferenças de comportamento entre popup e redirect em dois fluxos diferentes.

**Ponto a confirmar no planejamento/execução (não verificado nesta sessão):** se o link de convite for aberto de dentro do navegador embutido de algum app (in-app browser), o Google pode recusar o fluxo OAuth (`disallowed_useragent`) independentemente de popup ou redirect — comportamento documentado historicamente para OAuth do Google em WebViews. Não foi possível confirmar nesta sessão se o navegador embutido do WhatsApp especificamente aciona essa restrição (WhatsApp tende a abrir links no navegador padrão do sistema, não num WebView embutido, mas isso não foi verificado contra fonte primária aqui). Recomenda-se testar manualmente abrindo o link real a partir do WhatsApp em Android e iOS antes de considerar esta fase concluída.

---

## Common Pitfalls

### Pitfall 1: Convite como subcoleção do workspace
**What goes wrong:** a URL do convite (D-01, um único código) não consegue endereçar `/workspaces/{workspaceId}/invites/{token}` sem também carregar `workspaceId`.
**Why it happens:** parece a escolha "correta" por seguir D-25 (`workspaceId` no path) sem perceber que D-25 é sobre isolar *dados do workspace já membro*, não sobre o próprio bootstrap de acesso.
**How to avoid:** coleção raiz `/invites/{token}`, ID do documento = o token (ver §1).
**Warning signs:** o código do link de convite precisa de mais de um parâmetro na URL para funcionar.

### Pitfall 2: Regra do workspace que só checa "existe convite pendente", sem comparar o token
**What goes wrong:** qualquer usuário autenticado consegue se auto-adicionar a qualquer workspace com convite pendente, mesmo sem ter visto o link.
**Why it happens:** parece suficiente checar "existe X" via `get()`/`exists()`, esquecendo que a regra precisa também confirmar que o *chamador* forneceu o segredo que só quem tem o link possui.
**How to avoid:** o payload da escrita de entrada carrega o token, e a regra usa esse valor para localizar e validar o convite específico (§2).
**Warning signs:** a regra de `update` do workspace não referencia nenhum campo vindo de `request.resource.data` além de `memberIds`.

### Pitfall 3: `writeBatch()` no lugar de `runTransaction()` para o resgate
**What goes wrong:** perde a garantia de controle de concorrência otimista sobre a leitura do convite — abre a janela de duplo resgate quase-simultâneo.
**How to avoid:** sempre `runTransaction()` com `tx.get()` explícito do documento de convite antes de qualquer `tx.update()` (§3).

### Pitfall 4: Seeding de categorias no mesmo batch da criação do workspace
**What goes wrong:** se a regra de criação de categoria depende de `get()` no workspace pai, e esse `get()` vê o estado anterior ao batch inteiro, a criação das categorias é negada e o batch inteiro reverte.
**How to avoid:** separar em dois passos sequenciais aguardados — workspace primeiro, categorias depois (ver Pitfall dedicado acima). **Checkpoint: confirmar no emulador antes de finalizar.**

### Pitfall 5 (herdado de `research/PITFALLS.md` #7 e #8, reafirmado aqui): regras permissivas de desenvolvimento nunca travadas
**What goes wrong:** `allow read, write: if true` esquecido em produção expõe todos os dados financeiros dos dois usuários.
**How to avoid:** as regras deste documento (§1, §2, categorias, users) já nascem restritivas — nunca deployar variante aberta fora do emulador local.

---

## Code Examples

Ver blocos de código nas seções §O desenho central, §Fluxo de primeiro login, §Seeding das 12 categorias e §Testando isolamento acima — todos endereçam operações comuns desta fase (validar convite, resgatar convite, criar workspace, semear categorias, arquivar categoria, testar isolamento).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Convite validado por Cloud Function callable | Convite validado inteiramente por Security Rules | Decisão do usuário nesta fase (D-06), não uma mudança de mercado | Sem Cloud Functions, a Security Rule vira a única autoridade — exige o desenho detalhado em §O desenho central |
| `tailwind.config.js` | `@theme` CSS-first (Tailwind v4) | Já documentado em `research/STACK.md` | Tokens de cor/tipografia do UI-SPEC vão direto no bloco `@theme` |

**Deprecated/outdated:** nada específico desta fase além do que `research/STACK.md` já cobre (Moment.js, Redux para este porte de app, RAG com embeddings — nenhum relevante aqui).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Nome padrão do workspace no primeiro login é "Nosso espaço" | §Fluxo de primeiro login | Baixo — campo é editável (D-08); só afeta a primeira impressão. Confirmar copy com o usuário ou tratar como discricionário do executor |
| A2 | `get()` dentro de uma regra de segurança avalia contra o estado do banco anterior ao batch/transação inteira, não o estado intermediário de outras escritas do mesmo batch | §Pitfall: seeding no mesmo batch | Médio — se errado, a separação em dois passos (workspace depois categorias) seria desnecessária, mas não incorreta; o risco real é o inverso: se não separar e a suposição estiver certa, o seeding falha silenciosamente |
| A3 | `get()`/`exists()` dentro de uma regra de segurança não participa do mesmo rastreamento de OCC (optimistic concurrency control) que `transaction.get()` do cliente | §3 Uso único sem transação server-side | Médio — se a garantia formal for na verdade mais forte que o assumido, a recomendação de "sempre usar runTransaction real" continua correta por precaução, só é mais conservadora que o estritamente necessário |
| A4 | `signInWithRedirect` é a escolha mais robusta para o fluxo de convite aberto a partir do WhatsApp, e o WhatsApp não abre links em um WebView que bloquearia OAuth do Google | §Firebase Auth Google numa SPA | Médio — se o WhatsApp de fato usar um WebView restrito em algum SO/versão, o fluxo de convite falharia silenciosamente no ponto de entrada mais crítico da fase; **recomenda-se teste manual explícito** antes do fechamento da fase |
| A5 | Auth gate no componente raiz (não `beforeLoad` por rota) é o padrão recomendado para TanStack Router 1.x neste caso binário | §Pattern 1 | Baixo — é uma escolha de arquitetura razoável independente da confirmação; na pior hipótese, o padrão oficial recomendado teria uma ergonomia levemente diferente, não incompatível |
| A6 | `crypto.randomUUID()` está disponível em todos os navegadores-alvo do produto (celular e desktop, 2026) | §4 Superfície de ataque | Baixo — é uma Web API estável desde 2021 em contextos seguros; risco só existiria em navegadores muito desatualizados, fora do público-alvo do produto |

**Se esta tabela estivesse vazia:** não está — ver também `## Lacunas` para os itens que não foram sequer parcialmente verificados nesta sessão.

---

## Open Questions

1. **A garantia de OCC do Firestore cobre `get()` interno de regra, ou só `transaction.get()` do cliente?**
   - What we know: `transaction.get()` do cliente definitivamente participa do controle de concorrência otimista documentado (fonte oficial confirmada nesta sessão).
   - What's unclear: se um `get()` chamado *de dentro da própria regra de segurança* (não pelo cliente) também é rastreado da mesma forma.
   - Recommendation: o código recomendado (§3) já assume o cenário mais conservador (usa `tx.get()` no cliente explicitamente) — a resposta a esta pergunta não muda a recomendação, só o grau de defesa redundante que a regra sozinha oferece.

2. **O comportamento de `get()` dentro de um `writeBatch()`/`runTransaction()` multi-documento — vê o pré-estado de TODAS as operações do batch, ou só das que ainda não foram processadas na ordem de avaliação?**
   - What we know: a norma geral documentada é "get()/exists() em regras avaliam contra o estado do banco anterior à requisição".
   - What's unclear: se isso vale don mesmo jeito quando a "requisição" é um batch com múltiplos documentos, incluindo o próprio documento que está sendo criado.
   - Recommendation: testar explicitamente no emulador (Pitfall 4) antes de finalizar o código de seeding — é rápido de verificar e resolve a ambiguidade de forma definitiva.

3. **WhatsApp abre o link de convite no navegador do sistema ou num WebView embutido, em Android e iOS?**
   - What we know: é comportamento historicamente documentado (fora desta sessão) que WhatsApp tende a abrir no navegador padrão, ao contrário de Instagram/TikTok.
   - What's unclear: comportamento atual (2026), e se varia por versão do app/SO.
   - Recommendation: teste manual direto — abrir um link real de convite a partir de uma conversa do WhatsApp em um Android e um iPhone reais antes de considerar a fase pronta.

---

## Lacunas

Itens que a pesquisa não conseguiu verificar nesta sessão por ter sido interrompida por um limite de sessão de busca web, listados explicitamente em vez de apresentados como fato:

- **Exemplo completo e testado de `@firebase/rules-unit-testing`** contra o emulador real — o código em §Testando isolamento é estruturalmente correto de acordo com a API pesquisada (`initializeTestEnvironment`, `assertFails`, `assertSucceeds`, `authenticatedContext`, `withSecurityRulesDisabled` todos confirmados como existentes na busca), mas não foi executado ao vivo nesta sessão.
- **Firebase Auth popup vs. redirect** — a recomendação (§Firebase Auth Google numa SPA) é baseada em conhecimento de treinamento sobre comportamento historicamente documentado, não confirmada contra a documentação oficial atual do Firebase nesta sessão.
- **Guarda de rota do TanStack Router 1.x** (`beforeLoad`, `router.context` assíncrono) — não verificado contra a documentação oficial; a recomendação de "gate no componente raiz" é uma escolha de arquitetura razoada, não uma confirmação de padrão oficial.
- **`firebase.json` / `firestore.indexes.json` completos e comando exato `firebase init`** para este projeto específico — `research/STACK.md` já cobre a instalação de pacotes, mas os arquivos de configuração do Firebase CLI em si (rewrites de SPA para Hosting, emulator ports completos, hosting target) não foram detalhados nesta sessão além do bloco mínimo em §Testando isolamento.
- **Semântica exata de `get()` dentro de regras avaliadas em batch/transação multi-documento** (Open Question 1 e 2 acima) — recomendação prática dada (separar em passos sequenciais, testar no emulador), mas sem confirmação documental direta nesta sessão.
- **Comportamento do WhatsApp ao abrir links (WebView vs. navegador do sistema)** — não verificado; recomenda-se teste manual (Open Question 3).

O planejador deve tratar estes pontos como **checkpoints de verificação a incluir no plano** (idealmente cedo, no emulador, antes de investir na UI em cima de um desenho não confirmado), não como bloqueadores de começar a planejar — o desenho central do convite (a razão desta pesquisa) está fechado e é internamente consistente com a documentação que pôde ser verificada.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Todo o projeto (Vite, firebase-tools) | Não verificado nesta sessão | — | `firebase-tools@15.x` exige Node ≥20 (já documentado em `research/STACK.md`) |
| Firebase CLI (`firebase-tools`) | Emulador, deploy de regras/índices/hosting | Não verificado nesta sessão | — | Instalar via `npm install -D firebase-tools` (já na lista de instalação) |
| Conta Google Cloud/Firebase (projeto criado, plano Spark) | Toda a fase | Depende do usuário — fora do escopo desta pesquisa técnica | — | Nenhum — é pré-requisito de execução, não uma dependência de código |

**Missing dependencies with no fallback:** nenhuma identificada como bloqueante além da criação do projeto Firebase em si, que é um passo manual do usuário fora do escopo desta pesquisa.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest [CITED: research/STACK.md] — ainda não instalado (diretório greenfield) |
| Config file | none — Wave 0 |
| Quick run command | `vitest run tests/firestore.rules.test.ts` |
| Full suite command | `firebase emulators:exec --only firestore,auth "vitest run"` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-07 | Isolamento entre workspaces | rules-unit (emulador) | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t isolamento"` | ❌ Wave 0 |
| AUTH-04/05 | Convite gera, resgata, expira, é single-use | rules-unit (emulador) | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t convite"` | ❌ Wave 0 |
| AUTH-03 | Primeiro login cria workspace com o usuário como membro | unit (mock Firestore ou emulador) | `vitest run tests/bootstrap.test.ts` | ❌ Wave 0 |
| CAT-01 | 12 categorias padrão em pt-BR ao criar workspace | unit/integration (emulador) | `vitest run tests/categories.test.ts -t seed` | ❌ Wave 0 |
| CAT-04 | Arquivar preserva histórico (não deleta) | rules-unit (emulador) | `vitest run tests/firestore.rules.test.ts -t archive` | ❌ Wave 0 |
| AUTH-06 | Dois membros veem mesma categoria em tempo real | manual-only (E2E multi-sessão é caro de automatizar aqui) | — | — |

### Sampling Rate
- **Per task commit:** `vitest run tests/firestore.rules.test.ts` (rápido, roda contra emulador local já iniciado)
- **Per wave merge:** `firebase emulators:exec --only firestore,auth "vitest run"`
- **Phase gate:** suite completa verde antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/firestore.rules.test.ts` — cobre AUTH-07, AUTH-04, AUTH-05, CAT-04 (esqueleto já dado em §Testando isolamento)
- [ ] `tests/bootstrap.test.ts` — cobre AUTH-03 (criação de workspace + seed de categorias)
- [ ] `firebase.json` com bloco `emulators` (esboço mínimo dado acima) — sem ele, nenhum teste de regra roda localmente
- [ ] Framework install: `npm install -D vitest @firebase/rules-unit-testing firebase-tools`

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` (config.json). Esta fase é, por natureza, a fase de segurança mais densa do projeto inteiro (autenticação + controle de acesso), então a cobertura abaixo é extensa por necessidade, não por excesso de zelo.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Firebase Authentication (Google OAuth) — nenhuma senha própria, delega inteiramente ao Google |
| V3 Session Management | yes | Firebase Auth SDK gerencia o token de ID/refresh; `onAuthStateChanged` é a única fonte de verdade de sessão no cliente |
| V4 Access Control | yes | Firestore Security Rules — `isMember()` por workspace, convite validado por regra (§O desenho central inteiro) |
| V5 Input Validation | yes | `request.resource.data` validado em toda regra de escrita (tipo, tamanho, campos afetados via `.diff().affectedKeys()`); Zod no cliente para formulários |
| V6 Cryptography | yes (parcial) | `crypto.randomUUID()` para o token de convite — geração de número aleatório criptograficamente seguro nativa do browser, nunca `Math.random()` |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Adivinhação de token de convite (brute force) | Spoofing | Entropia de 122 bits (`crypto.randomUUID()`) — ver §4, matematicamente infeasível mesmo sem rate limiting |
| Auto-associação a workspace sem convite válido | Elevation of Privilege | Regra de `update` do workspace exige token válido resolvido via `get()`, não apenas "existe algum convite" (§2, Pitfall 2) |
| Replay de convite já usado | Tampering / Replay | `resource.data.status == 'pending'` checado no momento da escrita + `runTransaction()` real no cliente (§3) |
| Vazamento cross-workspace via `list`/collection group query | Information Disclosure | `allow list: if false` em `/invites/{token}`; toda subcoleção de dados do workspace gated por `isMember()` |
| Usuário pertencendo a dois workspaces simultaneamente (contorna o modelo "uma pessoa, um espaço") | Elevation of Privilege | `/users/{uid}.workspaceId` imutável após criado + regra de join checa `!exists(/users/{uid})` antes de permitir entrada (§2) |
| `apiKey` do Firebase tratada como segredo (falso alarme que desvia atenção da regra real) | — (não é uma ameaça real) | Documentar explicitamente D-20 — a proteção real é a Security Rule, não a apiKey (herdado de `research/PITFALLS.md` #17) |

---

## Sources

### Primary (HIGH confidence)
- Nenhuma fonte desta sessão atingiu o tier VERIFIED/HIGH por ferramenta de registry — o ambiente não tinha `context7`/`exa`/`brave` habilitados (config.json: todos `false`), e a sessão de `WebSearch` foi interrompida por limite antes de mais cross-verificações.

### Secondary (MEDIUM confidence — websearch cross-verificado contra fonte oficial)
- [Writing conditions for Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions) — `request.resource` vs `resource`, `diff()`/`affectedKeys()`, comparação de campos
- [Write conditions for security rules — Google Cloud Docs](https://cloud.google.com/firestore/native/docs/security/rules-conditions) — mesmo conteúdo, espelho institucional
- [Securely querying data — Firestore](https://firebase.google.com/docs/firestore/security/rules-query) — `get()`/`exists()` contam como leitura faturada mesmo quando negados; limite de 10/20 chamadas por avaliação (já citado em `research/ARCHITECTURE.md`, reconfirmado aqui)
- [Secure data access for users and groups — Firestore](https://firebase.google.com/docs/firestore/solutions/role-based-access) — padrão de `uid in array` para grupos/workspaces
- NIST SP 800-63B (via busca cross-referenciada, não lido na íntegra nesta sessão) — piso de entropia para "look-up secrets" sem rate limiting
- Busca cross-verificada sobre entropia de UUID v4 (122 bits) e `nanoid` — múltiplas fontes independentes convergentes (ver §4)
- [Race Conditions in Firestore — QuintoAndar Tech Blog](https://medium.com/quintoandar-tech-blog/race-conditions-in-firestore-how-to-solve-it-5d6ff9e69ba7) — comportamento de retry de `runTransaction` sob conflito

### Tertiary (LOW confidence — não verificado nesta sessão, treinamento apenas)
- Firebase Auth popup vs. redirect em mobile — ver `## Lacunas`
- TanStack Router `beforeLoad`/guarda de rota — ver `## Lacunas`
- Comportamento do WhatsApp com links (WebView vs. navegador do sistema) — ver `## Lacunas`
- Semântica de `get()` dentro de regra avaliada em batch/transação multi-documento — ver `## Lacunas`, Open Questions 1-2

---

## Metadata

**Confidence breakdown:**
- Desenho central do convite (§O desenho central): MEDIUM-HIGH — mecanismos de regra (`diff()`, `affectedKeys()`, `get()`/`exists()` faturado, `list` vs `get` como operações distintas) confirmados contra documentação oficial nesta sessão; a garantia de OCC para `get()` interno de regra fica como suposição conservadora, não confirmação
- Entropia do token: HIGH — matemática verificável independentemente, magnitude de folga enorme torna qualquer imprecisão de detalhe irrelevante para a conclusão
- Stack/scaffolding: MEDIUM — herdado de `research/STACK.md`, não re-verificado nesta sessão
- Auth popup/redirect, guarda de rota TanStack: LOW — não verificado, ver `## Lacunas`

**Research date:** 2026-08-27 (sessão interrompida por limite de busca)
**Valid until:** 14 dias — mais curto que o padrão de 30 dias por causa das lacunas explícitas que precisam de uma sessão de pesquisa complementar ou verificação direta no emulador antes da execução
