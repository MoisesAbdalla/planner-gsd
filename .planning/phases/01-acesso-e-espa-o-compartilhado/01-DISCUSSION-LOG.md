# Phase 1: Acesso e espaço compartilhado - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-27
**Phase:** 1-Acesso e espaço compartilhado
**Areas discussed:** Fluxo do convite, Primeiro dia no espaço, Navegação Financeiro ↔ Tarefas, Direção visual

---

## Fluxo do convite

Contexto apresentado antes das perguntas: sem Cloud Functions, quem valida o código é a Security Rule do Firestore — logo não existe rate limiting, e o código precisa ser difícil de adivinhar por força bruta.

### Formato do convite

| Option | Description | Selected |
|--------|-------------|----------|
| Link pronto | Toca em "convidar" e manda um link no WhatsApp; código longo embutido, ninguém digita nada | ✓ |
| Código pra digitar | Mostra um código, a pessoa digita; funciona lado a lado, mas código digitável é curto e mais fácil de adivinhar | |
| Link + código visível | Gera os dois; mais trabalho pra construir | |

**User's choice:** Link pronto
**Notes:** Alinha com o gesto que o usuário descreveu ("manda no WhatsApp") e permite código longo sem custo de usabilidade.

### Validade

| Option | Description | Selected |
|--------|-------------|----------|
| Expira em alguns dias | Link vazado no histórico deixa de ser porta aberta pra sempre | ✓ |
| Vale pra sempre | Mais simples, mas permanentemente válido onde tiver sido colado | |
| Eu revogo quando quiser | Não expira sozinho, mas tem botão de invalidar | |

**User's choice:** Expira em alguns dias
**Notes:** Prazo exato deixado a critério de Claude — adotado 7 dias.

### Uso único ou reutilizável

| Option | Description | Selected |
|--------|-------------|----------|
| Uso único | Convite morre quando a segunda pessoa entra | ✓ |
| Reutilizável | Mesmo link serve até expirar ou ser revogado | |

**User's choice:** Uso único

### Tamanho do espaço

| Option | Description | Selected |
|--------|-------------|----------|
| Exatamente 2 | Limite duro; impede convite vazado virar terceira pessoa | |
| Sem limite fixo | Começa com 2 mas aceita mais depois sem mexer no modelo de dados | ✓ |

**User's choice:** Sem limite fixo
**Notes:** Combinado com uso único, cada membro novo exige um link novo — o que preserva o controle sobre quem entra.

---

## Primeiro dia no espaço

### Primeiro login

| Option | Description | Selected |
|--------|-------------|----------|
| Cai direto num espaço pronto | Zero fricção; quem vem por link entra no espaço do link | ✓ |
| Escolhe criar ou entrar | Mais explícito, mas um passo a mais antes de usar | |

**User's choice:** Cai direto num espaço pronto

### Nome do espaço

| Option | Description | Selected |
|--------|-------------|----------|
| Não precisa | Menos campo, menos tela | |
| Nome editável | "Casa", "Nós dois"; aparece no topo | ✓ |

**User's choice:** Nome editável

### Categorias padrão

| Option | Description | Selected |
|--------|-------------|----------|
| Enxuta — 8 | Mercado, Alimentação, Transporte, Moradia, Saúde, Lazer, Assinaturas, Outros | |
| Completa — 12 | As 8 acima + Educação, Vestuário, Pets, Presentes | ✓ |
| Mínima — 4 | Mercado, Transporte, Moradia, Outros | |
| Deixa eu listar | Usuário informa a própria lista | |

**User's choice:** Completa — 12 categorias

### Cor da categoria

| Option | Description | Selected |
|--------|-------------|----------|
| Paleta fixa | 10-12 cores pré-escolhidas que combinam; garante legibilidade em claro e escuro | ✓ |
| Cor livre | Seletor completo; liberdade total, risco de cores ilegíveis | |

**User's choice:** Paleta fixa
**Notes:** As cores concretas ficaram a critério de Claude.

---

## Navegação Financeiro ↔ Tarefas

### Padrão de navegação

| Option | Description | Selected |
|--------|-------------|----------|
| Barra embaixo / lateral | Barra fixa embaixo no celular, menu lateral no desktop | ✓ |
| Abas no topo | Igual nas duas plataformas; mais simples, mas longe do polegar | |
| Uma tela só, com seções | Sem troca de módulo; os dois competem pela mesma tela | |

**User's choice:** Barra embaixo / lateral

### Tela inicial

| Option | Description | Selected |
|--------|-------------|----------|
| Financeiro | Coerente com o core value — abriu, viu quanto sobra | |
| Tarefas do dia | Abre no que tem pra fazer hoje | |
| Onde eu parei | Lembra o último módulo usado | ✓ |

**User's choice:** Onde eu parei
**Notes:** A primeiríssima abertura não tem "último módulo" — definido por Claude como Financeiro, por ser onde mora o core value.

### Localização de ajustes

| Option | Description | Selected |
|--------|-------------|----------|
| Menu no avatar | Foto do Google abre menu com Categorias, Convidar e Sair | ✓ |
| Terceiro destino fixo | "Ajustes" na barra principal; mais visível, ocupa lugar nobre | |

**User's choice:** Menu no avatar

---

## Direção visual

### Densidade

| Option | Description | Selected |
|--------|-------------|----------|
| Espaçoso e calmo | Bastante respiro, poucos elementos, tipografia maior | ✓ |
| Compacto e denso | Muita informação de uma vez; vê o mês sem rolar, mas cansa | |
| Meio-termo | Respiro nos números, densidade nas listas | |

**User's choice:** Espaçoso e calmo
**Notes:** Justificativa apresentada e aceita — finanças já são assunto ansioso; a interface não deve somar a isso.

### Tema

| Option | Description | Selected |
|--------|-------------|----------|
| Segue o sistema | Claro de dia, escuro de noite; duas paletas a construir | ✓ |
| Só claro | Uma paleta, mais rápido e fácil de manter | |
| Só escuro | Uma paleta, cara moderna, incomoda de dia | |

**User's choice:** Segue o sistema

### Personalidade

| Option | Description | Selected |
|--------|-------------|----------|
| Sóbrio e confiável | Ferramenta séria; cor só pra sinalizar | |
| Caloroso e humano | Cantos arredondados, linguagem informal, um pouco de cor | ✓ |
| Vivo e colorido | Cor como elemento principal, mais gráfico | |

**User's choice:** Caloroso e humano
**Notes:** "É um app de duas pessoas dividindo a vida, não um sistema bancário."

### Unidade entre os módulos

| Option | Description | Selected |
|--------|-------------|----------|
| Mesmo app, sem dúvida | Uma linguagem visual só; muda apenas o conteúdo | ✓ |
| Mesma base, sotaque próprio | Cor de destaque por módulo pra saber onde está de relance | |

**User's choice:** Mesmo app, sem dúvida

---

## Claude's Discretion

- Prazo exato de expiração do convite (adotado: 7 dias)
- Comprimento e alfabeto do código de convite
- As cores concretas da paleta fixa, em versão clara e escura
- Ícone de cada categoria padrão, se houver
- Modelo de dados do convite e desenho da Security Rule que permite a entrada
- Módulo aberto na primeiríssima execução (adotado: Financeiro)
- Estrutura de pastas, padrão de código, e escolha entre `react-firebase-hooks` e `reactfire`

## Deferred Ideas

- **Instalar como PWA na tela de início** — levantado na análise, não pelo usuário; fora dos requisitos da Fase 1. Reconsiderar junto com lembretes na Fase 6
- **Sair do espaço / trocar de espaço** — o modelo suporta N membros, mas a v1 não tem fluxo de saída
- **Cor de destaque por módulo** — considerado e recusado em favor de linguagem visual única
- **Categoria para ganhos** — LANC-02 define ganho sem categoria; se aparecer no uso real, é mudança de escopo da Fase 2

---

*Areas discussed: 4 de 4 selecionadas · 15 perguntas respondidas*
