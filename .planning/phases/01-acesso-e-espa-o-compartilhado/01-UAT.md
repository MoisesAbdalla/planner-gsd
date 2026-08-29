---
status: testing
phase: 01-acesso-e-espa-o-compartilhado
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md
started: 2026-08-28T19:40:00Z
updated: 2026-08-28T23:30:00Z
---

## Current Test

number: 5
name: Criar, renomear e trocar cor de categoria
expected: |
  "Nova categoria" abre o formulário com a grade fixa de 12 cores (sem seletor
  livre). A cor escolhida é marcada por anel MAIS ícone de check, nunca só por
  mudança sutil de borda. Criar, renomear e trocar a cor persistem depois de
  recarregar a página.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test — subir o app contra o Firebase real
expected: `npm run dev` sobe sem erro; a tela de entrar aparece com o botão "Entrar com o Google"; nenhum erro de config do Firebase no console do navegador
result: pass
nota: exigiu deploy das regras (firestore.rules nunca publicado) e corrigir o .firebaserc, que apontava para um projeto inexistente

### 2. Login real com Google
expected: Clicar em "Entrar com o Google" leva ao Google, autentica, e volta ao app já logado — sem tela branca no retorno do redirect. O nome do espaço aparece na tela, lido do Firestore
result: pass
nota: exigiu trocar signInWithRedirect por signInWithPopup — o redirect nao completa com cookies de terceiros bloqueados

### 3. Espaço criado no console do Firebase
expected: No console do Firebase, existe um documento em `workspaces` com o seu uid dentro de `memberIds`, e um documento em `users` com o `workspaceId` correspondente
result: pass

### 4. As 12 categorias nasceram
expected: A tela de Categorias mostra as 12 categorias em português (Mercado, Alimentação, Transporte, Moradia, Saúde, Lazer, Assinaturas, Educação, Vestuário, Pets, Presentes, Outros), cada uma com seu ponto de cor
result: pass
nota: as 12 categorias em pt-BR com ponto de cor, confirmadas na tela

### 5. Criar, renomear e trocar cor de categoria
expected: "Nova categoria" abre o formulário com a grade de 12 cores (sem seletor livre), a cor selecionada mostra anel + ícone de check. Criar, renomear e trocar cor persistem depois de recarregar a página
result: [pending]

### 6. Arquivar categoria
expected: Arquivar abre um diálogo neutro (não vermelho) dizendo que o histórico continua. Depois de arquivar, a categoria some da lista principal e aparece atrás do toggle "Mostrar arquivadas". A categoria "Outros" não oferece a ação de arquivar
result: [pending]
parcial: "Outros" já confirmado SEM ação de arquivar na lista (D-11 valendo na interface). Falta exercitar o diálogo de arquivar de uma categoria comum e o toggle "Mostrar arquivadas"

### 7. Categoria arquivada continua existindo no banco
expected: No console do Firebase, o documento da categoria que você arquivou continua lá — só com o campo `archivedAt` preenchido. Nada foi deletado
result: [pending]

### 8. Shell — barra embaixo no celular, rail no desktop
expected: No desktop largo, um menu lateral de 240px à esquerda com Financeiro e Tarefas. Estreitando a janela abaixo de 768px, a navegação vira barra fixa embaixo. Nunca as duas ao mesmo tempo. O item ativo é reconhecível mesmo em escala de cinza
result: [pending]
parcial: rail lateral de 240px já confirmado no desktop, com os dois destinos e a pílula no item ativo. Falta estreitar abaixo de 768px e confirmar a barra inferior

### 9. Tema claro e escuro
expected: Trocando o tema do sistema operacional, o app acompanha. Nos dois temas o texto continua legível e as 12 cores de categoria continuam distinguíveis entre si
result: [pending]
parcial: tema escuro já confirmado, com as 12 cores distinguíveis entre si. Falta o tema claro

### 10. Sem rolagem horizontal, em pt-BR
expected: Em 320px de largura e no desktop, nenhuma tela produz rolagem horizontal. Textos, erros e estados vazios todos em português informal. Nome de categoria longo trunca com reticências em vez de esticar a linha
result: [pending]

### 11. Convite — gerar e compartilhar
expected: No menu do avatar, "Convidar alguém" abre um diálogo (bottom sheet no celular, diálogo centralizado no desktop) com o link já gerado, botão "Compartilhar no WhatsApp" como principal e "Copiar link" como secundário, mais a nota "Válido por 7 dias, uso único". Nenhum campo para digitar código
result: [pending]

### 12. Convite — segunda pessoa entra pelo link
expected: Mandando o link por WhatsApp para um segundo aparelho com outra conta Google: abrir o link leva à tela de entrar, e depois de autenticar a pessoa cai dentro do SEU espaço (não num espaço novo). Confirmar que o token sobrevive ao redirect do Google, inclusive quando o WhatsApp abre o link no navegador interno dele
result: [pending]

### 13. Os dois veem a mesma coisa em tempo real
expected: Com os dois aparelhos logados no mesmo espaço, criar uma categoria num deles faz ela aparecer no outro sem recarregar a página
result: [pending]

<!-- Itens abaixo cobertos deterministicamente pelos testes automatizados (162 verdes). Não apresentados ao usuário. -->

### A1–A24. Cobertura automatizada
expected: 24 entregas cobertas por testes automatizados verdes — isolamento por membership, bootstrap idempotente, `workspaceId` imutável, `/invites/{token}` com list negado, prova de posse do joinToken, isolamento entre dois workspaces reais, token de 122 bits com TTL de 7 dias, resgate em `runTransaction`, 9 primitivas shadcn restilizadas, AvatarMenu com as cópias exatas, `lastModule`, `WorkspaceNameField`, 5 rotas registradas, as 12 categorias com IDs determinísticos, criar/renomear/trocar cor, arquivar preservando documento, negação cross-workspace em categorias, `InviteDialog` em um toque, tela de entrar única, as três telas de falha, quem chega por convite não ganha espaço novo, grade fixa de 12 cores com anel+check, edição com checagem de duplicata, diálogo de arquivar neutro
result: pass
source: automated

## Summary

total: 13
passed: 4
issues: 0
pending: 9
skipped: 0
blocked: 0

<!-- 3 dos pendentes (6, 8, 9) já têm confirmação PARCIAL registrada na própria
     entrada. Parcial não vira aprovado: o que falta está nomeado em cada um. -->

## Gaps

<!-- Preenchido quando um teste falhar -->
