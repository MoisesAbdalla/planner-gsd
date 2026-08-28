---
phase: 1
slug: acesso-e-espa-o-compartilhado
status: draft
shadcn_initialized: false
preset: none — a inicializar na execução desta fase (ver Design System)
created: 2026-08-27
---

# Phase 1 — UI Design Contract

> Contrato visual e de interação para a Fase 1 (Acesso e espaço compartilhado). Gerado por
> gsd-ui-researcher, verificado por gsd-ui-checker. Como esta é a fase fundação de um projeto
> greenfield, este documento define o **sistema de design inteiro** (tokens, tipografia, cor,
> shell) que as Fases 2–6 herdam — não apenas as telas desta fase.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (decisão travada em `research/STACK.md` §3 — ainda **não inicializado**: não existe `package.json`/projeto Vite neste diretório. O executor roda `npx shadcn init` ao fazer o scaffold do projeto, usando os tokens deste documento como base do `@theme` do Tailwind v4) |
| Preset | Nenhum preset pronto da comunidade — sistema de cor e tipografia customizado, definido abaixo, para evitar a "cara de template" que o usuário pediu explicitamente para evitar (D-19) |
| Component library | Radix UI (via primitivas shadcn — Dialog, DropdownMenu, Avatar, etc. Confirmar no `shadcn info` no momento do init, já que versões recentes do CLI shadcn às vezes migram primitivas específicas) |
| Icon library | `lucide-react` (já decidido em `research/STACK.md` — instalação listada) |
| Font | Plus Jakarta Sans (variável), pesos 400 (regular) e 600 (semibold). Ver justificativa em Typography |

**Nota sobre a escolha de fonte:** cogitei o par clássico "serif de destaque + sans de corpo" que a skill `frontend-design` recomenda para páginas de marketing, mas descartei para este produto. Este é um app utilitário lido em pé, na fila do mercado, dezenas de vezes por semana (PROJECT.md — core value é ler um número em 10 segundos) — uma segunda família tipográfica adiciona uma camada de inconsistência visual em 6 fases sem ganho real de legibilidade. A calidez pedida em D-17 vem da cor, do raio de borda e da voz do texto, não de uma fonte serifada. Plus Jakarta Sans foi escolhida sobre a opção óbvia (Inter) porque tem terminais mais arredondados e humanos, cobertura completa de diacríticos pt-BR, e suporte a `tabular-nums` — sem cair no "olhar de template" que Inter carrega por ubiquidade.

---

## Spacing Scale

Valores declarados (múltiplos de 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gaps entre ícone e texto, padding inline de chips |
| sm | 8px | Espaçamento compacto entre elementos (linha de lista, badge) |
| md | 16px | Espaçamento padrão entre elementos, padding interno de inputs/botões |
| lg | 24px | Padding de seções, padding interno de cards e diálogos |
| xl | 32px | Gaps de layout entre blocos (ex.: header e conteúdo) |
| 2xl | 48px | Quebras de seção maiores (ex.: topo da tela até o primeiro bloco de conteúdo) |
| 3xl | 64px | Espaçamento de página no desktop (margens laterais do conteúdo em telas largas) |

**Diretriz "espaçoso e calmo" (D-15):** por padrão, prefira o token *maior* da faixa aplicável em vez do menor — quando em dúvida entre `md` e `lg` para o padding de um card, use `lg`. Poucos elementos por tela é critério de aceite, não polimento posterior.

Exceptions:
- Alvos de toque (bottom nav, botões de ícone, swatches de cor da paleta de categoria): **mínimo 44×44px**, mesmo quando o ícone visual é menor — preenchido com padding invisível. Motivo: uso real no celular, muitas vezes andando ou na fila.
- `padding-bottom: env(safe-area-inset-bottom)` somado ao `xl` na barra de navegação inferior, para não colidir com a barra de gestos do iOS.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 14px | 400 | 1.4 |
| Body | 16px | 400 | 1.5 |
| Heading | 22px | 600 | 1.2 |
| Display | 32px | 600 | 1.15 |

**Regra de numerais (vale desde já, mesmo a tela de valores em R$ sendo da Fase 2):** todo contexto numérico — valores monetários, datas, contadores — usa `font-variant-numeric: tabular-nums` (equivalente a `font-feature-settings: "tnum" 1`). É o que faz uma lista de lançamentos alinhar as casas decimais em coluna e o "quanto sobra" não "pular" visualmente quando o dígito muda. `Display` é o tamanho reservado para o número que o usuário lê em 10 segundos (saldo do mês, Fase 2) — nasce aqui como token mesmo sem tela que o use ainda.

**Sem "sm de rodapé"/legal text nesta fase.** Se uma tela desta fase precisar de um texto ainda menor que `Label` (ex.: nota de validade do convite), reaproveite `Label` a 70% de opacidade da cor de texto secundária em vez de criar um quinto tamanho — a regra de 3–4 tamanhos é dura.

---

## Color

Tema **segue o sistema operacional** (D-16) — claro e escuro são obrigatórios desde esta fase, valores abaixo especificados como `hsl(H S% L%)` (CSS Color 4), diretamente utilizáveis no bloco `@theme` do Tailwind v4.

### Superfícies e texto (semânticos)

| Role | Light | Dark | Usage |
|------|-------|------|-------|
| Dominant (60%) | `hsl(38 28% 96%)` — marfim quente | `hsl(30 8% 11%)` — quase-preto quente | Fundo da aplicação atrás de tudo |
| Secondary (30%) | `hsl(0 0% 100%)` — branco | `hsl(30 8% 16%)` | Cards, sidebar/nav, header, diálogos — a "camada elevada" |
| Border | `hsl(35 18% 88%)` | `hsl(30 8% 26%)` | Divisores, borda de input, borda de card |
| Text primary | `hsl(30 15% 15%)` | `hsl(36 15% 94%)` | Texto de corpo, títulos |
| Text secondary | `hsl(30 10% 40%)` | `hsl(32 8% 66%)` | Metadados, labels, texto de apoio |
| Accent (10%) | `hsl(38 65% 42%)` — âmbar/mel | `hsl(38 60% 62%)` | Ver "Accent reserved for" abaixo |
| Positive | `hsl(152 30% 34%)` | `hsl(152 28% 58%)` | Saldo positivo, confirmações de sucesso (observável a partir da Fase 2) |
| Destructive/Warning | `hsl(8 55% 44%)` | `hsl(8 50% 64%)` | Ver "Accent reserved for" abaixo |

**Accent reserved for:** botão primário (CTA de convidar, salvar categoria, entrar com Google — só o container do botão, o botão do Google segue a marca própria do Google), indicador do item ativo na navegação (ícone + label + fundo em pílula por trás do ícone), anel de foco de teclado, links/ações inline de texto (ex.: "editar" no nome do espaço). Nunca usado em: cor de categoria, texto de corpo, bordas, estados desabilitados.

**Destructive/Warning reserved for:** texto e borda de erro de formulário (nome de categoria vazio/duplicado, nome de espaço vazio), banners de erro (convite expirado/usado, falha de login), e o indicador de teto de orçamento estourado (Fase 4 — token nasce aqui). **Não** é usado para arquivar categoria — arquivar preserva dados (D-11) e usa estilo neutro, não o vermelho de destrutivo (ver Copywriting Contract).

**Por que âmbar em vez de azul:** azul é o acento padrão de fintech/banco (Nubank, Inter, Itaú) — exatamente a leitura "sistema bancário" que D-17 pede para evitar. Âmbar/mel lê como caloroso e doméstico sem cair no cluster genérico "creme + terracota" (a paleta aqui usa marfim + cards brancos + âmbar, não creme + terracota + serifa).

### Category Color Palette (fixa, D-10)

Paleta de 12 cores fixas — 11 tons cromáticos + 1 neutro para "Outros". As 12 categorias padrão (D-09) recebem, nesta ordem, os seguintes tokens. **Regra de uso:** a cor da categoria é expressa como **ponto/dot, ícone tintado, ou fatia de gráfico** — nunca como fundo de chip preenchido com texto branco em cima. Essa regra existe para garantir contraste sem precisar validar texto-sobre-cor em 12 tons × 2 temas × N contextos; o nome da categoria sempre acompanha a cor por escrito (nunca cor sozinha carrega significado — ver Accessibility).

Os matizes (H) foram escolhidos por espaçamento sistemático (~24–26° de distância mínima entre vizinhos), reservando faixas de matiz exclusivas para as cores semânticas (destructive ≈8°, accent ≈38°, positive ≈152°) para que nenhuma cor de categoria seja confundida com um sinal de erro/ação/saldo.

| Categoria | Light (HSL) | Dark (HSL) |
|---|---|---|
| Mercado | `hsl(111 32% 36%)` | `hsl(111 30% 62%)` |
| Alimentação | `hsl(331 42% 46%)` | `hsl(331 45% 68%)` |
| Transporte | `hsl(201 40% 42%)` | `hsl(201 42% 66%)` |
| Moradia | `hsl(65 38% 32%)` | `hsl(65 40% 58%)` |
| Saúde | `hsl(134 30% 34%)` | `hsl(134 28% 60%)` |
| Lazer | `hsl(279 32% 46%)` | `hsl(279 35% 70%)` |
| Assinaturas | `hsl(175 35% 32%)` | `hsl(175 32% 58%)` |
| Educação | `hsl(88 30% 30%)` | `hsl(88 28% 56%)` |
| Vestuário | `hsl(305 38% 46%)` | `hsl(305 40% 68%)` |
| Pets | `hsl(227 36% 44%)` | `hsl(227 38% 68%)` |
| Presentes | `hsl(253 34% 46%)` | `hsl(253 36% 70%)` |
| Outros | `hsl(30 8% 42%)` — cinza neutro | `hsl(30 6% 62%)` |

"Outros" recebe deliberadamente um cinza neutro em vez de um matiz — é a categoria "sem categoria real", e um tom saturado ali competiria visualmente com as 11 categorias que carregam sinal de fato. Categorias criadas pelo usuário (CAT-02) escolhem entre estes 12 tons — não há seletor livre (D-10); se as 12 já estiverem em uso, o formulário permite repetir a cor mais próxima disponível (decisão de fallback, documentada em Screens abaixo).

---

## App Shell

Herdado por todas as telas das Fases 2–6 (D-12). Breakpoint de troca: **768px** (padrão Tailwind `md`).

**< 768px (mobile):**
- Barra superior fixa e fina: nome do espaço (editável, ver Screens) à esquerda, avatar do Google à direita abrindo o menu do avatar.
- Barra de navegação fixa embaixo: 2 destinos (Financeiro, Tarefas), ícone + label, altura ~64px + `env(safe-area-inset-bottom)`. Item ativo: ícone preenchido + label em `accent`, com uma pílula de fundo (`radius-full`, tom suave do `accent` a ~12% de opacidade) atrás do ícone — é o único lugar do shell onde o acento aparece de forma decorativa-mas-funcional (sinaliza localização, não decora).
- Conteúdo rola entre a barra superior e a barra inferior.

**≥ 768px (desktop):**
- Rail lateral fixo à esquerda, 240px de largura, fundo `Secondary`. Do topo para baixo: nome do espaço + avatar (mesmo par da barra mobile, agora empilhado), depois os 2 destinos de navegação (ícone + label, mesma pílula de item ativo), depois espaço livre.
- Conteúdo ocupa a largura restante à direita, com margem lateral `3xl` (64px) em telas muito largas para não esticar o texto.

**Persistência (D-13):** o último módulo visitado é salvo localmente (`localStorage`) e reaberto automaticamente. Primeiríssima abertura (sem valor salvo): Financeiro.

**Menu do avatar (D-14):** dropdown ancorado no avatar, itens nesta ordem: "Categorias", "Convidar alguém", separador, "Sair da conta". Não é um terceiro destino de navegação — vive só dentro do menu.

---

## Screens (Phase 1)

Cada tela referencia os tokens acima. Nenhuma tela de lançamento, mês, cartão, orçamento, IA ou tarefa é desenhada aqui — só o shell que as recebe.

**1. Entrar (sign-in)** — Tela cheia, centralizada, fundo `Dominant`. Um card `Secondary` central (raio `lg`, sombra `sm`) com: nome do app, uma frase curta de uma linha reforçando privacidade ("Seus dados ficam só entre vocês dois."), e o botão "Entrar com o Google" (segue a marca própria do Google — não usa `accent`). Sem opção de e-mail/senha (fora do escopo, PROJECT.md). Estado de carregamento: botão com spinner, desabilitado. Estado de erro: banner abaixo do botão com a cópia de erro definida no Copywriting Contract.

**2. Primeiro acesso** — Não existe tela própria: por D-07, o primeiro login cai direto no shell já em Financeiro, sem tela intermediária de "criar ou entrar". Nada a desenhar aqui além de garantir que o roteamento pula essa etapa.

**3. Convidar alguém (geração e compartilhamento)** — Aberto via menu do avatar. Diálogo centralizado no desktop, bottom sheet no mobile (componente shadcn `Dialog`/`Sheet`). Conteúdo: campo somente-leitura com o link gerado, botão primário "Compartilhar no WhatsApp" (abre `wa.me` com o link pré-preenchido — é o gesto descrito em D-01, por isso é o CTA primário, não só "copiar"), botão secundário "Copiar link", e uma linha de nota em `Label`/texto secundário: "Válido por 7 dias, uso único." Estado de carregamento: breve, enquanto o código é gerado antes do link aparecer.

**4. Entrar por link de convite** — Quem abre o link sem sessão passa primeiro pela tela de Entrar (mesma do item 1); após autenticar, o app valida o código contra a Security Rule e injeta o usuário no espaço do link (nunca cria um espaço novo para quem chega por convite — D-07). Sucesso: cai direto no shell em Financeiro, sem tela de confirmação extra. Falha: tela cheia (o usuário ainda não está em nenhum espaço, não há shell para mostrar um diálogo por cima) com a cópia de "convite expirado" ou "convite já usado" (Copywriting Contract) e um único botão de ação para tentar de novo/seguir para o login normal.

**5. Categorias — lista** — Aberta via menu do avatar. Página cheia (mobile) ou painel largo (desktop). Cada linha: ponto de cor (token da paleta fixa) + nome + ação de editar (lápis) + ação de arquivar. Categorias arquivadas aparecem esmaecidas (opacidade reduzida do texto, ponto de cor mantido) e agrupadas ao final, atrás de um toggle "Mostrar arquivadas" (fechado por padrão — a lista do dia a dia mostra só o que está em uso). Botão "Nova categoria" fixo no topo da lista (não FAB flutuante — FAB lê "app Material", contraria D-19).

**6. Categoria — criar/editar** — Diálogo (desktop) / bottom sheet (mobile). Campos: Nome (texto, obrigatório), Cor (grade de 12 swatches da paleta fixa — dot clicável, `radius-full`, seleção marcada com anel em `Text primary` mais um ícone de check, nunca só troca de leve borda que falha em daltonismo). Uma cor vem pré-selecionada ao criar (a primeira ainda não usada na grade). Botão "Criar categoria" / "Salvar alterações". Validação inline conforme Copywriting Contract.

**7. Arquivar categoria** — Diálogo de confirmação pequeno, disparado pela ação de arquivar na lista. Estilo **neutro/informativo** (fundo `Secondary`, texto `Text primary`, botão de confirmação em tom neutro — não em `Destructive`), porque arquivar não é destrutivo (D-11). Cópia reforça isso explicitamente (ver Copywriting Contract).

**8. Nome do espaço** — Exibido no cabeçalho (barra mobile / topo do rail desktop). Edição inline: tocar/clicar no nome transforma o texto em um input no próprio lugar (sem abrir diálogo separado — mantém a interação leve), salva ao perder foco ou Enter, cancela com Escape. Validação: nome não pode ficar vazio (Copywriting Contract).

---

## Copywriting Contract

Voz: informal, calorosa, pt-BR — "é um app de duas pessoas dividindo a vida, não um sistema bancário" (D-17). Nunca usa jargão técnico nem tom de aviso legal.

| Element | Copy |
|---------|------|
| Primary CTA (login) | "Entrar com o Google" |
| Primary CTA (convite) | "Compartilhar no WhatsApp" (CTA secundário: "Copiar link") |
| Primary CTA (categoria) | "Nova categoria" (criar) / "Salvar alterações" (editar) |
| Empty state heading | "Nenhuma categoria por aqui" |
| Empty state body | "Crie uma categoria para organizar seus gastos." + botão "Nova categoria" — cenário defensivo, já que o espaço sempre nasce com 12 categorias (D-09) e "Outros" nunca pode ser arquivada |
| Error state | "Algo não funcionou. Tenta de novo?" + ação de retry visível — sem culpar o usuário, sem jargão de erro técnico |
| Destructive confirmation | Arquivar categoria: "Arquivar '{nome}'? Ela some das opções ao lançar, mas o histórico continua exatamente como está." Botões: "Arquivar" (neutro) / "Cancelar". *Nota: não é um fluxo verdadeiramente destrutivo (D-11) — por isso o diálogo usa estilo neutro, não vermelho.* |

**Estados adicionais desta fase** (não cabem nas 5 linhas do template, mas são copy obrigatória por `<what_this_phase_must_define>`):

| Estado | Copy |
|---|---|
| Convite expirado | Título: "Esse link não é mais válido." Corpo: "Convites duram 7 dias por segurança. Peça para quem te convidou gerar um link novo." |
| Convite já usado | Título: "Esse convite já foi usado." Corpo: "Cada link serve para uma entrada só. Peça um link novo para continuar." |
| Falha no login do Google | "Não deu para entrar com o Google agora. Tenta de novo em instantes." |
| Confirmar saída da conta | "Sair da conta? Você pode entrar de novo quando quiser — nada muda no espaço." Botões: "Sair" / "Cancelar" (estilo neutro — sair não apaga nada, D-22) |
| Nome de categoria vazio | "Dá um nome para a categoria." |
| Nome de categoria duplicado | "Já existe uma categoria com esse nome." |
| Nome do espaço vazio | "O espaço precisa de um nome." |
| Link copiado (toast) | "Link copiado!" |

---

## UI Considerations

> Populada pelo probe de consideração de UI (Step 9.5), taxonomia de 8 categorias sobre estado
> de elemento (empty/loading/error/populated/partial/overflow/zero-one-many/long-text). Cópia de
> empty/error vive na seção Copywriting Contract acima — aqui cobrimos cobertura de estado e
> referenciamos essas linhas em vez de repetir o texto.

Applicable state considerations resolved: 7 covered, 3 backstop, 1 unresolved

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | category-list (list-collection) | ✅ covered | O espaço sempre nasce com 12 categorias (D-09) e "Outros" não pode ser arquivada — a lista nunca fica vazia no uso normal; copy defensiva de fallback definida em Copywriting Contract (Empty state) |
| loading | sign-in (interactive-control) | ✅ covered | Botão "Entrar com o Google" mostra spinner e fica desabilitado durante o popup/redirect |
| error | sign-in (interactive-control) | ✅ covered | Banner inline usa a copy "Falha no login do Google" (Copywriting Contract) |
| error | invite-join-flow (nav) | ✅ covered | Estados de convite expirado e convite já usado com copy dedicada (Copywriting Contract) |
| loading | invite-share (interactive-control) | ✅ covered | Diálogo mostra estado de carregamento breve enquanto o código é gerado, antes do link aparecer |
| overflow | invite-join-flow (nav) | ⚠ unresolved | Comportamento de um usuário que já pertence a um espaço abrindo o link de convite de *outro* espaço não está definido nesta fase — decisão de produto/dado a fechar em `/gsd-plan-phase`, não de UI |
| populated | category-list (list-collection) | ✅ covered | Linha = ponto de cor + nome; arquivadas esmaecidas e agrupadas atrás de um toggle "Mostrar arquivadas" (ver Screens item 5) |
| zero-one-many | category-list (list-collection) | 🧪 backstop | Lista deve rolar verticalmente sem quebrar o layout do shell com volume alto de categorias (12 padrão + criadas pelo usuário) — verificar com teste visual simulando 20+ categorias |
| long-text | category-list (list-collection) | 🧪 backstop | Nome de categoria muito longo trunca com reticências na própria linha, nunca força rolagem horizontal (PLAT-02) — verificar com teste visual usando nome de 40+ caracteres |
| long-text | space-name-header (static-content / interactive-control) | 🧪 backstop | Nome do espaço muito longo trunca com reticências no cabeçalho/rail sem empurrar o avatar para fora da área visível — verificar com teste visual |
| form | category-create-edit-form (form) | ✅ covered | Validação de nome vazio e nome duplicado com copy dedicada (Copywriting Contract) |
| partial | category-create-edit-form (form) | ✅ covered | Cor é campo obrigatório com valor pré-selecionado (primeira cor livre da paleta) — o formulário nunca fica num estado sem cor válida selecionada |

---

## Accessibility

- **Contraste:** texto de corpo/label mira ≥ 4.5:1 contra a superfície onde está (Dominant ou Secondary), em ambos os temas. Os 12 tons da Category Color Palette miram ≥ 3:1 de contraste não-textual (WCAG 1.4.11) contra `Dominant` e `Secondary` em ambos os temas — por isso o valor de luminosidade (L) de cada tom foi escolhido bem afastado do L96%/L11% dos respectivos fundos dominantes. Confirmar com ferramenta de contraste no momento da implementação (este documento define os valores-alvo; o executor verifica o resultado real renderizado).
- **Cor nunca é o único sinal:** categoria sempre mostra nome por escrito junto do ponto de cor — nunca cor sozinha. Item de navegação ativo combina cor + ícone preenchido + label, não só cor.
- **Alvos de toque:** mínimo 44×44px em qualquer elemento tocável (itens da nav, swatches de cor, botões de ícone) — ver Spacing Scale, Exceptions.
- **Foco de teclado:** todo elemento interativo (links do menu do avatar, itens de nav, swatches de cor, botões) tem anel de foco visível usando o token `accent`, 2px, com offset — inclusive navegação por teclado através da grade de 12 cores no formulário de categoria.
- **Movimento reduzido:** transições já são curtas por padrão (150–200ms) por causa do mandato de calma (D-15); ao detectar `prefers-reduced-motion`, remover/qualquer animação de entrada de diálogo ou pílula de nav ativa vira uma troca instantânea de estado.
- **Tema:** claro e escuro são obrigatórios desde esta fase (D-16), não "escuro depois" — nenhuma tela desta fase pode assumir só um tema.
- **Idioma:** todo texto de interface, incluindo mensagens de erro e estados vazios, em português brasileiro informal (PLAT-01).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Button, Dialog, Sheet/Drawer, DropdownMenu, Input, Label, Avatar, Separator, Sonner (toast) — instalados via `npx shadcn add` no momento da execução | not required |
| third-party | nenhum declarado nesta fase | not applicable |

Grade de cor de categoria (Screens item 6) é um componente customizado construído sobre primitivas shadcn (`Button`/`ToggleGroup`), não um bloco de registry — não passa pelo gate de terceiros.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
