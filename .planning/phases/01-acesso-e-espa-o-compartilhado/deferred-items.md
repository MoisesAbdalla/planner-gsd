# Deferred Items — Phase 01

Itens descobertos durante a execução que estão fora do escopo da task/plano
atual (arquivos não tocados por este trabalho) e por isso não foram
corrigidos, conforme a regra de fronteira de escopo do executor.

## Descobertos durante 01-03 (npm run lint, primeira execução na fase)

`npm run lint` não fazia parte do `<verify>` automatizado de 01-01/01-02, então
estes 3 problemas pré-existentes só apareceram ao rodar lint pela primeira vez
nesta fase. Nenhum dos arquivos abaixo foi modificado por 01-03 — mantidos como
estavam:

1. **`src/shared/auth/AuthProvider.tsx:49`** — `react-refresh/only-export-components`:
   o arquivo exporta `AuthProvider` (componente) e `useAuth` (hook) juntos.
   Padrão comum e intencional (provider + hook consumidor no mesmo módulo),
   mas o eslint-plugin-react-refresh sinaliza como perda de fast-refresh.
2. **`src/shared/workspace/WorkspaceProvider.tsx:32`** — `react-hooks/set-state-in-effect`:
   `setStatus`/`setWorkspace` chamados sincronamente dentro do corpo do
   `useEffect` no ramo early-return (usuário não autenticado). Mesmo arquivo
   também dispara `react-refresh/only-export-components` na exportação de
   `useWorkspace` (linha 75), mesma causa do item 1.
3. **`tests/firestore.rules.test.ts:1`** — `@typescript-eslint/no-unused-vars`:
   import de `expect` não utilizado (provavelmente sobrou de um teste editado).

**Ação recomendada:** corrigir no plano/task que precisar tocar novamente
nesses arquivos (ex.: qualquer plano que edite fluxo de auth/workspace), ou
num plano de limpeza dedicado. Nenhum bloqueia build/testes — apenas lint.

## Descobertos durante 01-03 (outros)

Nenhum outro item além dos listados acima.
