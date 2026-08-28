# API Coverage — Firebase (Authentication, Cloud Firestore, plataforma)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
>
> Fase 1 — Acesso e espaço compartilhado. O serviço externo desta fase é o
> Firebase; a matriz abaixo é o registro de subtração: o que foi integrado e,
> principalmente, o que ficou de fora **por decisão** e não por esquecimento.
>
> Restrição de plataforma que atravessa toda a matriz: o projeto permanece no
> **plano Spark** (D-06) — sem cartão cadastrado, portanto sem Cloud Functions,
> sem Cloud Scheduler e sem nada que dependa do Admin SDK no servidor.

## Firebase Authentication

| capability | decision | reason |
|---|---|---|
| Google sign-in provider | INTEGRATE | |
| Sign out | INTEGRATE | |
| Auth state observation (`onAuthStateChanged`) | INTEGRATE | |
| Redirect flow (`signInWithRedirect` / `getRedirectResult`) | INTEGRATE | |
| Session persistence (local, padrão do SDK) | INTEGRATE | |
| Token refresh automático | INTEGRATE | |
| Email/password provider | OPT-OUT | explicitamente fora de escopo no PROJECT.md — evita construir cadastro, recuperação e verificação |
| Email link (passwordless) | OPT-OUT | mesma razão do provider de senha; o login por Google já resolve identidade |
| Phone auth | OPT-OUT | não necessário — app de duas pessoas com conta Google |
| Anonymous auth | OPT-OUT | todo dado pertence a um espaço com dono identificado; sessão anônima não teria onde gravar |
| Outros provedores OAuth (Apple, Facebook, GitHub) | OPT-OUT | não necessário — os dois usuários têm conta Google |
| Multi-factor authentication (MFA) | OPT-OUT | não necessário nesta escala; reavaliar se o app deixar de ser de uso pessoal |
| Account linking | OPT-OUT | só existe um provedor, não há o que vincular |
| Email verification | OPT-OUT | contas Google já chegam verificadas pelo provedor |
| Password reset | OPT-OUT | não existe senha neste app |
| Custom claims | OPT-OUT | exige Admin SDK no servidor, indisponível no plano Spark (D-06); a autorização vive nas Security Rules |
| **Account deletion (`deleteUser`)** | **OPT-OUT** | não construído nesta fase; não existe fluxo de exclusão nem de saída do espaço — pendência real, ver Notas |

## Cloud Firestore

| capability | decision | reason |
|---|---|---|
| Leitura e escrita de documento (`getDoc`, `setDoc`, `updateDoc`) | INTEGRATE | |
| Listeners em tempo real (`onSnapshot`) | INTEGRATE | |
| Transações (`runTransaction`) | INTEGRATE | |
| Escritas em lote (`writeBatch`) | INTEGRATE | |
| Security Rules | INTEGRATE | única camada de autorização que existe neste app |
| Consultas com `where` / `orderBy` | INTEGRATE | |
| Índices compostos (`firestore.indexes.json`) | INTEGRATE | |
| Emulator Suite | INTEGRATE | toda a verificação automatizada da fase roda contra ele |
| Exclusão de documento (`deleteDoc`) | OPT-OUT | decisão de produto travada em D-11: arquivar preserva o histórico; a regra nega `delete` para todo chamador, deliberadamente |
| Aggregation queries (`count` / `sum` / `average`) | OPT-OUT | não necessário nesta fase — não há totais ainda. Provável INTEGRATE na Fase 3 (visão mensal), quando houver o que somar |
| Persistência offline | OPT-OUT | não necessário nesta fase; D-21 já aceita last-write-wins, e habilitar offline mudaria a semântica de conflito sem ganho para dois usuários |
| Collection group queries | OPT-OUT | não necessário — toda consulta é escopada por um único workspace, por desenho (D-25) |
| Bundles | OPT-OUT | otimização de carga inicial sem ganho relevante nesta escala |
| Export / import de dados | OPT-OUT | não necessário — backup e migração não são requisitos da v1 |

## Plataforma Firebase

| capability | decision | reason |
|---|---|---|
| Firebase Hosting | OPT-OUT | não necessário nesta fase — o app ainda não foi publicado; a decisão de hospedagem já está tomada em research/STACK.md e será exercida numa fase de deploy |
| Cloud Functions | OPT-OUT | exige plano Blaze, recusado explicitamente pelo usuário (D-06). Consequência aceita: sem cron, sem push, e o proxy da IA da Fase 5 rodará fora do Firebase |
| Cloud Scheduler | OPT-OUT | depende de Cloud Functions — mesma razão |
| Cloud Messaging (FCM) | OPT-OUT | push depende de função agendada; lembrete da v1 é in-app. Registrado no Out of Scope do PROJECT.md |
| Cloud Storage | OPT-OUT | não necessário na v1 — nenhum upload de arquivo. Reavaliar na v2, se OCR de comprovante entrar |
| **App Check** | **OPT-OUT** | não necessário nesta escala; é a mitigação mais barata da ausência de rate limiting e não exige Blaze — ver Notas |
| Analytics | OPT-OUT | não necessário — app pessoal de dois usuários, sem decisão de produto guiada por métrica |
| Performance Monitoring | OPT-OUT | mesma razão |
| Crashlytics | OPT-OUT | voltado a app nativo; este é web |
| Remote Config | OPT-OUT | não há feature flag nem experimento nesta escala |

## Notas

Dois itens desta matriz não são "capacidade descartada" e merecem virar trabalho
futuro, não ficar enterrados numa tabela:

1. **Exclusão de conta / saída do espaço.** Hoje não existe caminho nenhum. D-22
   descreve o que acontece com os dados, mas ninguém pode exercer a ação. É a
   lacuna mais concreta que esta matriz expôs.
2. **App Check.** É a resposta natural à ausência de rate limiting registrada em
   `01-RESEARCH.md` §4, e não esbarra na restrição do plano Spark.

O gate `api-coverage` disparou nesta fase por sinais fracos (as palavras `sdk` e
`api` no texto dos SUMMARYs), não por detecção de uma superfície realmente não
enumerada. A matriz foi escrita mesmo assim, em vez de uma declaração de "sem API
externa" — que seria falsa, já que o Firebase é serviço externo — e o exercício
se pagou ao expor o item 1 acima.
