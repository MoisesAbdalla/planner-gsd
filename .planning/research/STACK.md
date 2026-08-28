# Stack Research — Cotidiano

**Domain:** App web responsivo (planner de tarefas + controle financeiro compartilhado) com assistente de IA conversacional, mercado brasileiro (pt-BR)
**Researched:** 2026-08-27
**Confidence:** MEDIUM-HIGH (decisões de arquitetura cross-checadas em múltiplas fontes; números de versão verificados ao vivo no npm registry — reconfirmar nas datas de implementação por causa do ritmo de lançamento do ecossistema JS/AI em 2026)

> Restrições já travadas pelo usuário e **não** re-discutidas aqui: Firebase Authentication (Google), Cloud Firestore, web responsiva única (sem app nativo), pt-BR/R$, design conduzido pela skill `frontend-design`. Este documento cobre **como** usar bem essas peças, não se devem ser usadas.

---

## 1. Frontend framework: Vite + React SPA — NÃO Next.js

**Recomendação: Vite 8 + React 19 + TypeScript + TanStack Router 1.x**

| Tecnologia | Versão (npm, ago/2026) | Propósito | Confiança |
|---|---|---|---|
| `vite` | 8.2.2 | Bundler/dev server | HIGH |
| `react` / `react-dom` | 19.2.8 | UI | HIGH |
| `@tanstack/react-router` | 1.170.32 | Roteamento com rotas e search-params tipados | MEDIUM |
| `typescript` | 7.0.2 | Tipagem estática | HIGH |

**Por que NÃO Next.js App Router, apesar de ser o "padrão 2026" para React em geral:**

O ponto central da pergunta é exatamente este trade-off, e ele é real: o SDK cliente do Firestore (`onSnapshot`) é fundamentalmente um mecanismo de **browser** — abre um listener de rede persistente e empurra atualizações para o estado local. Ele só pode viver em Client Components (`'use client'`). Server Components do Next.js executam uma vez no servidor e devolvem HTML/RSC payload; não existe "listener vivo" dentro de um Server Component. Resultado prático: em qualquer tela deste app que precisa ser tempo real — o painel do mês visto pelas duas pessoas ao mesmo tempo, a lista de tarefas do dia, o saldo que reage a um lançamento da IA — a árvore inteira acaba voltando a ser Client Component mesmo dentro do App Router. Você paga a complexidade do RSC (dois runtimes, streaming, cache de rota, ponte de cookies de sessão do Firebase Auth entre cliente e servidor) sem colher o benefício principal dele, que é renderização/streaming no servidor de conteúdo que muda pouco.

Esse benefício do Next.js (SSR/SEO/first-paint de conteúdo público) não se aplica aqui: é um app **atrás de login**, para duas pessoas conhecidas, sem página pública para indexar. Não há motivo de negócio para pagar o custo do SSR.

Uma SPA em Vite casa 1:1 com o modelo do Firestore: login com Firebase Auth no cliente → abre `onSnapshot` → estado reativo local → pronto. Sem servidor de renderização para operar, sem hidratação, sem sincronizar sessão entre dois runtimes.

**Por que TanStack Router e não React Router v7 (framework mode):** o app precisa de navegação entre meses ("mês anterior/próximo") e views de semana/mês para tarefas — casos de uso onde **search params tipados na URL** (ex.: `?month=2026-08`) são o padrão certo. TanStack Router foi desenhado para isso e para SPAs client-heavy; React Router v7 brilha quando você quer SSR/mutations no servidor (loaders/actions), o que não é o caso aqui. React Router v7 em "SPA mode" é uma alternativa válida e mais familiar se o usuário preferir — ver Alternativas.

**Confiança:** MEDIUM. A conclusão arquitetural (SPA > Next.js para este caso) é bem fundamentada e cross-verificada; a escolha específica TanStack Router vs React Router v7 é mais uma questão de gosto/DX do que um fato técnico duro — qualquer um dos dois funciona.

---

## 2. Hosting: Firebase Hosting (clássico) — NÃO Vercel, NÃO Firebase App Hosting

**Recomendação: Firebase Hosting (arquivo estático) via `firebase-tools` 15.28.2**

Como o frontend é uma SPA compilada pelo Vite (sem SSR), a hospedagem correta é o Firebase Hosting **clássico**: build estático + CDN global + `firebase deploy`, no mesmo projeto/CLI/console que já hospeda Auth, Firestore e Cloud Functions. Rewrite de SPA (`"rewrites": [{"source": "**", "destination": "/index.html"}]`) é suporte de primeira classe e bem documentado.

**Por que não Firebase App Hosting:** App Hosting (GA desde abril/2025) existe para servir frameworks com SSR (Next.js, Angular) rodando em Cloud Run por trás — é a peça certa **se** você tivesse escolhido Next.js com renderização no servidor. Como a Seção 1 descarta SSR, App Hosting adicionaria uma camada (Cloud Run, cold starts, billing por instância) sem necessidade nenhuma.

**Por que não Vercel:** Vercel é excelente para Next.js SSR, mas (a) o usuário não tem a CLI da Vercel instalada, (b) usar Vercel significaria manter dois vendors/dois dashboards/dois `.env` de deploy para um app que já vive inteiramente no ecossistema Firebase (Auth + Firestore + Functions), e (c) o principal diferencial da Vercel — hosting de SSR — não é usado aqui. Ficar 100% Firebase reduz superfície operacional para um app de dois usuários.

**Confiança:** HIGH para a conclusão (não faz sentido pagar a complexidade de SSR hosting sem SSR); MEDIUM para os detalhes de GA/status do App Hosting (confirmado por dois resultados de busca independentes do blog oficial do Firebase, mas vale reconfirmar no console no momento da implementação, pois esse produto mudou de nome/tier algumas vezes).

---

## 3. UI/estilo: Tailwind CSS v4 + shadcn/ui — NÃO uma kit de componentes com identidade própria

**Recomendação: `tailwindcss` 4.3.3 + `shadcn` CLI 4.19.0 + `class-variance-authority` 0.7.1 + `lucide-react` 1.34.0**

O projeto **exige** (ver PROJECT.md) que a interface seja conduzida pela skill `frontend-design`, não por um layout genérico de framework. Isso descarta qualquer kit "batteries-included" com visual próprio forte (Material UI, Ant Design, Chakra, Mantine) — eles impõem uma linguagem visual reconhecível que é exatamente o que o usuário pediu para evitar.

shadcn/ui não é uma dependência de UI-kit: o CLI **copia o código-fonte dos componentes para dentro do repositório** (`components/ui/*.tsx`). Isso significa que cada componente (dialog de confirmação do lançamento da IA, combobox de categoria, dialog de orçamento) é um ponto de partida acessível (Radix por baixo: foco, teclado, ARIA corretos) que a skill `frontend-design` pode reestilizar livremente — tokens de cor, raio, tipografia, espaçamento — sem lutar contra um tema de terceiro. Tailwind v4 trocou a configuração por CSS-first (`@theme` direto no CSS, sem `tailwind.config.js`), o que facilita ainda mais essa customização de tokens de design.

**O que NÃO usar:** Material UI, Ant Design, Chakra UI, Bootstrap — todos trazem uma "cara" própria forte que conflita diretamente com o requisito de design intencional e não-templated do projeto.

**Confiança:** HIGH — combinação hoje padrão de mercado para exatamente este cenário (precisa de acessibilidade e velocidade, mas não pode parecer template).

---

## 4. Camada de IA: Vercel AI SDK, rodando em Firebase Cloud Functions (nunca no cliente)

**Recomendação: `ai` 7.0.83 + `@ai-sdk/google` 4.0.56 (Gemini), invocados de dentro de Cloud Functions v2 `onCall`, com `zod` 4.4.3 para os schemas**

**Onde o LLM roda — e por que nunca no cliente:** a chave de API do provedor de IA (Gemini/OpenAI/Anthropic, o que for escolhido) precisa ficar em uma variável de ambiente de servidor. Se o `fetch` para a API do modelo sair do navegador, a chave vai junto no bundle JS — qualquer pessoa abre o DevTools e a rouba, e a partir daí ela pode gastar a cota/orçamento de IA do usuário livremente. Como não há Next.js/route handler neste stack (Seção 1), o único lugar server-side disponível é **Firebase Cloud Functions v2** (`onCall`), que já é o padrão natural aqui: mesmo projeto Firebase, App Check disponível para bloquear chamadas fora do app, `firebase functions:secrets:set GEMINI_API_KEY` para o segredo.

Duas funções `onCall` cobrem os dois requisitos do PROJECT.md:

1. **`parseExpense`** — recebe o texto livre ("almoço 32 no cartão"), usa `generateObject` do AI SDK com um schema Zod (`valorCentavos`, `data`, `categoria`, `formaPagamento`, `parcelas?`, `confidence`) para extrair dados estruturados. O front-end **sempre** mostra o resultado num diálogo de confirmação antes de gravar no Firestore — isso já é uma decisão travada no PROJECT.md ("a IA nunca grava às cegas") e o AI SDK encaixa perfeitamente nesse padrão porque `generateObject` já devolve um objeto tipado, sem parsing manual de texto.
2. **`askFinance`** — recebe a pergunta ("quanto gastei com comida esse mês?"), usa `generateText` com **tool calling** (não busca vetorial/RAG por embeddings). As "tools" são funções que consultam o Firestore diretamente via Admin SDK dentro da própria Cloud Function (`getTransactions(mes, categoria)`, `getBudgetStatus(categoria)`, `getBalance(mes)`). O modelo decide quais tools chamar, recebe os números exatos de volta, e só então formula a resposta em pt-BR. Isso é deliberadamente **mais simples e mais correto** que RAG com embeddings: os dados financeiros do usuário são pequenos, estruturados e por workspace — uma consulta direta ao Firestore devolve o número certo; uma busca por similaridade semântica arrisca aproximar/errar valores em R$, o que é inaceitável para o core value do produto ("em 10 segundos eu sei quanto sobra").

**Por que Vercel AI SDK e não (só) Genkit:** o Firebase tem seu próprio framework de IA, o **Genkit** (com `onCallGenkit`, exporta Zod nativamente, tracing integrado ao console Firebase). Ele é uma alternativa legítima e "mais nativa" ao ecossistema Firebase. Escolhemos o Vercel AI SDK como padrão primário porque (a) é agnóstico de provedor — trocar de Gemini para Claude/GPT é mudar um import, útil se o custo/qualidade em pt-BR de um modelo específico decepcionar; (b) tem a maior comunidade/documentação do mercado hoje para `generateObject`/tool calling; (c) é só um pacote npm — funciona igual dentro de uma Cloud Function, sem exigir adotar o resto do tooling do Genkit. Se no futuro o usuário quiser tracing/eval mais profundo dentro do próprio console do Firebase, migrar para Genkit é uma troca localizada (só nas Cloud Functions), não uma reescrita de frontend.

**Modelo:** `gemini-3.7-flash` (GA em ago/2026) é o ponto de partida recomendado — rápido, barato, com bom suporte a pt-BR e schemas estruturados. **Nomes de modelo Gemini mudam com frequência** (o ecossistema já passou por 2.5 → 3 → 3.5 → 3.6 → 3.7 Flash em poucos meses); confirme o id atual em `ai.google.dev/gemini-api/docs/models` no momento da implementação em vez de fixar este nome como definitivo.

**Confiança:** MEDIUM — a arquitetura (Cloud Function como única porta para a chave, tool calling em vez de RAG vetorial, confirmação humana antes de gravar) é HIGH confidence; a escolha exata AI SDK vs Genkit é uma decisão de gosto/ecossistema, e nomes/versões de modelo LLM têm confiança LOW por natureza (mudam rápido — trate como "verificar antes de implementar", não como fato fixo).

---

## 5. Dinheiro em JavaScript: centavos inteiros + Dinero.js v2 — NUNCA float

**Recomendação: campo Firestore `valorCentavos: number` (inteiro) + `dinero.js` 2.0.2 para toda aritmética**

**Regra dura, sem exceção:** nunca armazenar nem calcular dinheiro como `number` decimal (`32.50`). `0.1 + 0.2 !== 0.3` em JavaScript é o exemplo clássico, e um app cujo core value é "eu sei exatamente quanto sobra" não pode ter esse tipo de erro de arredondamento se acumulando mês a mês.

- **Armazenamento no Firestore:** todo valor monetário é um inteiro em centavos (`3250` para R$ 32,50). Firestore lida bem com inteiros arbitrariamente grandes sem perda de precisão — bem diferente de tentar guardar `32.50` como `number` e sofrer erro de ponto flutuante em somas.
- **Aritmética (somas de categoria, saldo do mês, teto de orçamento):** use `dinero.js` v2 (`dinero({ amount: 3250, currency: BRL })`). É imutável, tree-shakeable, e mais importante para este projeto: tem `allocate()`, que divide um valor entre N proporções distribuindo o resto (centavo de arredondamento) de forma justa para a maior parte. Isso resolve **diretamente** o requisito de compra parcelada do PROJECT.md — dividir R$ 100,00 em 3x não pode virar R$ 33,33 × 3 = R$ 99,99 "perdendo" um centavo; `allocate(dinero(10000), [1,1,1])` devolve `[3334, 3333, 3333]`, que soma exatamente 10000.
- **Exibição:** `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorCentavos / 100)` — nativo do browser, já formata como "R$ 32,50" com separador de milhar/decimal brasileiro correto, sem biblioteca extra.

**Alternativa mais leve:** `currency.js` (2.0.4, ~1KB) — API mais simples, também usa inteiros por baixo, mas **não** tem uma função de `allocate` com a mesma garantia de distribuição justa de resto. Como o parcelamento é um requisito central e explícito do projeto ("compra parcelada distribui as parcelas... automaticamente"), o `allocate()` do Dinero.js paga a diferença de peso da dependência.

**O que NÃO usar:** `number` decimal para dinheiro (erro de ponto flutuante); bibliotecas de "big decimal" genéricas tipo `decimal.js`/`big.js` sozinhas sem uma camada de domínio monetário por cima — funcionam, mas você reimplementa `allocate`, formatação de moeda e regras de arredondamento na mão, sem ganho real sobre o Dinero.js pronto.

**Confiança:** HIGH.

---

## 6. Data/hora, recorrência e parcelas

**Recomendação: `date-fns` 4.4.0 + `@date-fns/tz` 1.5.0 (locale `pt-BR`) + `rrule` 2.8.1**

- **Formatação e locale:** `date-fns` v4 inclui suporte nativo a fuso horário via `@date-fns/tz` e tem locale `pt-BR` embutido (`import { ptBR } from 'date-fns/locale'`) — datas como "5 de agosto" e "segunda-feira" saem corretas sem trabalho extra. Fixe o fuso em `America/Sao_Paulo` para decidir corretamente "isso vence hoje" e "esse gasto é de qual mês", especialmente perto da virada do dia/mês.
- **Por que não a API nativa `Temporal`:** o `Temporal` chegou nativamente no Chrome 144 (jan/2026) — é o futuro certo do JS para datas — mas **ainda não tem suporte garantido em todos os browsers principais** em meados de 2026. Como o requisito do projeto é funcionar bem no celular real do usuário (não só em um browser específico), depender de `Temporal` nativo sem polyfill é prematuro agora. Reavalie quando a cobertura cross-browser estiver consolidada (uma revisão de stack futura, não v1).
- **Recorrência (contas fixas mensais, tarefas semanais):** `rrule` implementa RFC-5545 (o mesmo padrão do Google Calendar/iCal) — cobre "toda segunda", "todo dia 5" e casos como "toda última sexta do mês" sem lógica caseira de calendário. **Padrão de armazenamento recomendado:** guarde a regra (`RRULE:FREQ=MONTHLY;BYMONTHDAY=5`) e a data da última ocorrência materializada no Firestore, e gere/"materialize" as próximas ocorrências sob demanda (ex.: ao abrir o mês) em vez de pré-criar anos de documentos de tarefa/conta.
- **Parcelas:** combine `addMonths` do date-fns (uma parcela por mês, a partir da data da compra) com `allocate()` do Dinero.js (Seção 5) para o valor de cada parcela — a data vem do date-fns, o valor (com resto justo) vem do Dinero.

**O que NÃO usar:** `Moment.js` — projeto oficialmente em modo de manutenção há anos, mutável (efeitos colaterais perigosos), bundle grande; `Day.js` é uma opção válida se o peso do bundle for crítico (2KB vs 13KB do date-fns), mas seu ecossistema de plugins para timezone/locale pt-BR é menos completo — não recomendado como padrão aqui.

**Confiança:** MEDIUM-HIGH — date-fns v4 e rrule são escolhas maduras e amplamente verificadas; a recomendação de evitar Temporal nativo em 2026 é uma leitura de timing (LOW confidence no "quando" exato de adoção segura, HIGH confidence em "ainda não agora").

---

## 7. Formulários, validação e busca/estado de dados

**Recomendação: `react-hook-form` 7.86.0 + `zod` 4.4.3 (via `@hookform/resolvers`) + `@tanstack/react-query` 5.102.8 + `react-firebase-hooks` 5.1.1**

- **Formulários:** React Hook Form + Zod é o par padrão de mercado — schema único (`zod`) reaproveitado tanto na validação client-side do formulário quanto (idealmente, o mesmo schema ou um espelho dele) na Cloud Function que grava no Firestore e no `generateObject` da IA (Seção 4), reduzindo divergência entre "o que a IA extrai" e "o que o formulário de confirmação valida".
- **Dados em tempo real (Firestore):** **não** force o Firestore para dentro do TanStack Query. `onSnapshot` já é, ele mesmo, um cache reativo com push de atualizações — replicar isso dentro do cache do React Query exige sincronizar manualmente (`queryClient.setQueryData` a cada evento, `staleTime: Infinity`, contagem de listeners ativos para não vazar). É um padrão conhecido, mas evitável. Prefira hooks dedicados por cima do SDK do Firebase: `react-firebase-hooks` (`useCollection`, `useDocumentData`, `useAuthState`) é leve e cobre os casos deste app (lista de tarefas do mês, lançamentos do mês, estado de auth) sem boilerplate de `useEffect`/`onSnapshot` manual.
- **Dados que NÃO são Firestore (chamadas à IA):** aqui sim o TanStack Query se paga — `parseExpense`/`askFinance` são chamadas HTTP (`httpsCallable`) para as Cloud Functions, e o React Query dá de graça estado de loading/erro/retry/cache para essas chamadas assíncronas pontuais.

**Alternativa a `react-firebase-hooks`:** `reactfire` (mantida pela própria equipe do Firebase/Google), com suporte a Suspense e um `<FirebaseAppProvider>`. Mais "oficial", porém mais setup (providers em cascata) do que o necessário para um app de dois usuários. Use `reactfire` se preferir um padrão Suspense-first em toda a árvore; `react-firebase-hooks` é a opção mais enxuta e é a recomendação padrão aqui.

**O que NÃO usar:** Redux/MobX/Zustand como estado global — Firestore listeners (estado do servidor) + TanStack Query (estado do servidor não-Firestore) + estado de rota do TanStack Router já cobrem as necessidades de um app de duas pessoas; uma store global adicionaria uma camada de sincronização (Firestore → store → UI) sem necessidade real.

**Confiança:** HIGH para RHF+Zod; MEDIUM para a recomendação específica de não misturar `onSnapshot` com TanStack Query (é uma opinião de arquitetura bem fundamentada nas fontes, mas há equipes que fazem diferente com sucesso).

---

## 8. Testes, incluindo Firebase Emulator Suite

**Recomendação: `vitest` 4.1.11 + `@firebase/rules-unit-testing` 5.0.2 + `firebase-tools` 15.28.2 (emuladores) + React Testing Library**

- **Regras de segurança do Firestore (o requisito de privacidade do projeto é literalmente isto):** o requisito "dados de cada espaço isolados dos demais" só está verificado se houver teste automatizado provando isso — não é algo para confiar só na leitura manual das regras. `@firebase/rules-unit-testing` roda contra o **Firestore Emulator** local (via `firebase emulators:start`) e permite simular usuários autenticados diferentes (`testEnv.authenticatedContext(uid)`) para escrever casos como: "usuário A não consegue ler o workspace de usuário C", "os dois membros autorizados do mesmo workspace conseguem ler e escrever", "usuário não autenticado é sempre negado". Isso deve rodar em CI a cada mudança nas `firestore.rules`.
- **Cloud Functions de IA:** teste as funções `parseExpense`/`askFinance` contra o **Emulator Suite** (Functions + Firestore + Auth juntos), mas **não** chame a API real do Gemini nos testes automatizados — injete um provider fake do AI SDK (o pacote `ai` expõe utilitários de mock de `LanguageModel` para isso) para testar a lógica de extração/tool-calling sem custo, sem flakiness de rede e sem depender de cota de API em CI.
- **Runner:** `vitest` em vez de Jest — integra nativamente com o Vite já usado no frontend (mesma config de transform/aliases), é mais rápido, e evita manter duas configurações de build paralelas (uma para app, outra para testes).
- **Componentes React:** Vitest + React Testing Library é o padrão de fato para testar formulários (o diálogo de confirmação do lançamento da IA é um candidato óbvio a teste: garantir que ele nunca grava sem clique explícito de confirmação — esse comportamento é uma decisão de produto travada no PROJECT.md).

**O que NÃO usar:** testes que apontam para o projeto Firebase de produção (nunca — sempre emulador, para não gastar cota real nem arriscar dado real); Jest neste stack (duplicaria configuração de transformação que o Vite já resolve).

**Confiança:** HIGH — Emulator Suite + `@firebase/rules-unit-testing` é a via oficial e única forma correta de testar regras do Firestore; Vitest é hoje o padrão de fato em projetos Vite.

---

## Instalação

```bash
# Frontend (SPA)
npm create vite@latest cotidiano -- --template react-ts
cd cotidiano
npm install firebase @tanstack/react-router @tanstack/react-query \
  react-hook-form zod @hookform/resolvers \
  dinero.js date-fns @date-fns/tz rrule \
  react-firebase-hooks lucide-react class-variance-authority

# Tailwind v4 + shadcn/ui
npm install -D tailwindcss @tailwindcss/vite
npx shadcn@latest init

# Cloud Functions (pasta functions/)
cd functions
npm install firebase-admin firebase-functions ai @ai-sdk/google zod

# Dev/test tooling
npm install -D vitest @testing-library/react @testing-library/jest-dom \
  @firebase/rules-unit-testing firebase-tools typescript @vitejs/plugin-react eslint
```

## Alternativas Consideradas

| Recomendado | Alternativa | Quando usar a alternativa |
|---|---|---|
| Vite + React SPA | Next.js App Router | Se o projeto ganhar páginas públicas/SEO (ex.: landing marketing separada) — aí vale um app Next.js **separado** só para essa parte, mantendo o app autenticado como SPA |
| TanStack Router | React Router v7 (SPA mode) | Se preferir uma API mais familiar/menos nova; funciona igualmente bem sem servidor |
| Firebase Hosting (estático) | Firebase App Hosting | Se decidir migrar para Next.js com SSR de fato no futuro |
| Vercel AI SDK | Firebase Genkit | Se quiser tracing/eval nativos no console Firebase e aceitar ficar mais preso ao ecossistema Google |
| Dinero.js v2 | `currency.js` | Se peso de bundle for mais crítico que a garantia de `allocate()` para parcelas |
| `react-firebase-hooks` | `reactfire` | Se preferir um padrão Suspense-first oficial da equipe Firebase |
| Tool calling direto no Firestore | RAG com embeddings (LangChain + vector DB) | Nunca, para este projeto — dados financeiros pequenos e estruturados não devem passar por busca semântica aproximada |

## O Que NÃO Usar

| Evitar | Por quê | Usar Em Vez Disso |
|---|---|---|
| Next.js App Router para este app | Firestore `onSnapshot` só roda em Client Components; sem página pública para justificar SSR, você paga a complexidade (ponte de cookie de auth, dois runtimes) sem o benefício | Vite + React SPA |
| Vercel como host | Sem CLI instalada; adiciona um segundo vendor para um app 100% Firebase por baixo, sem usar o diferencial de SSR da Vercel | Firebase Hosting |
| Kits de UI com identidade visual própria (MUI, Ant Design, Chakra) | Conflita com o requisito explícito de design conduzido pela skill `frontend-design`, não por template | Tailwind v4 + shadcn/ui (componentes copiados, restilizáveis) |
| Chamar a API do LLM direto do navegador | Expõe a chave de API no bundle JS — qualquer um rouba e gasta a cota | Cloud Function `onCall` com o segredo em `firebase functions:secrets:set` |
| RAG com embeddings/vector DB para "pergunte sobre seus dados" | Dados financeiros exigem exatidão; busca semântica aproxima em vez de responder o número certo — inaceitável para o core value do produto | Tool calling que consulta o Firestore diretamente |
| `number` float para dinheiro | Erro de ponto flutuante acumulado (`0.1+0.2!==0.3`) — inaceitável num app cujo valor central é "eu sei exatamente quanto sobra" | Inteiro em centavos + Dinero.js |
| Moment.js | Projeto em modo de manutenção, mutável, bundle grande | date-fns v4 |
| Temporal API nativo como base do app hoje | Suporte cross-browser ainda não garantido em meados de 2026 | date-fns v4 (+ `@date-fns/tz`) |
| Redux/MobX para estado global | Firestore listeners + TanStack Query + rota já cobrem o estado necessário para um app de 2 usuários; camada extra sem ganho | Hooks dedicados de Firestore + TanStack Query |
| Testar contra o projeto Firebase de produção | Risco de gastar cota real e corromper dado real de um app de uso pessoal | Firebase Emulator Suite sempre |

## Padrões de Stack por Variante

**Se o app crescer para SEO/marketing público no futuro:**
- Crie um segundo app Next.js só para a landing/marketing, separado do app autenticado (SPA)
- Porque: mantém o app principal simples (sem SSR) e isola a única parte que de fato precisa de SSR/SEO

**Se o custo/qualidade do Gemini em pt-BR decepcionar:**
- Troque o provider no Vercel AI SDK (`@ai-sdk/anthropic` ou `@ai-sdk/openai`) mudando só o import na Cloud Function
- Porque: a escolha do AI SDK (Seção 4) foi feita justamente para deixar essa troca barata

## Compatibilidade de Versões

| Pacote A | Compatível com | Observação |
|---|---|---|
| `tailwindcss@4.x` | `shadcn@4.x` | shadcn CLI v4 já assume Tailwind v4 (CSS-first `@theme`, sem `tailwind.config.js`) por padrão |
| `firebase-functions@7.x` | Node `>=18` | `firebase-tools@15.x` exige Node `>=20`; padronize o projeto em Node 20 LTS para CLI e Functions coexistirem sem atrito |
| `@tanstack/react-router@1.x` | `@tanstack/react-query@5.x` | Mesma família TanStack; integração de loaders com Query é documentada e comum |
| `ai@7.x` | `@ai-sdk/google@4.x` | Confirmar compatibilidade de major version no momento da instalação — o AI SDK evolui rápido e providers às vezes ficam uma versão atrás do core |

## Sources

- Busca cross-verificada (WebSearch, múltiplas queries independentes por tópico) — ver detalhes por seção acima
- `npm view <pacote> version` — consulta direta ao npm registry em 2026-08-27/28, fonte primária para os números de versão citados neste documento (reconfirmar em `package.json`/`npm outdated` no momento real da instalação)
- firebase.google.com/docs/hosting/frameworks/nextjs, firebase.blog (posts de App Hosting GA e "App Hosting vs. Hosting") — status de SSR no Firebase
- dinerojs.com (docs de `allocate`) — comportamento de distribuição de resto
- ai.google.dev/gemini-api/docs/models — nomenclatura de modelo Gemini (verificar id atual antes de implementar; muda com frequência)
- firebase.google.com/docs/rules/unit-tests, firebase.google.com/docs/rules/emulator-setup — testes de Security Rules com Emulator Suite

---
*Stack research for: Cotidiano — planner de tarefas + finanças compartilhadas com IA (pt-BR)*
*Researched: 2026-08-27*
