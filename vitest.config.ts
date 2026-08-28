import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// tests/** roda em ambiente node (Firestore emulator + Node APIs);
// src/** roda em jsdom (componentes React). Vitest 4 usa `test.projects`
// (sucessor de `test.workspace`/`environmentMatchGlobs`) para isso.
//
// vitest.config.ts é um arquivo de config SEPARADO de vite.config.ts — o
// alias "@/*" (exigido pelas primitivas shadcn copiadas em src/shared/ui/,
// plano 01-03) não é herdado automaticamente, por isso é repetido aqui.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          // Só .ts — os testes de componente (.tsx, ex.: tests/shell.test.tsx,
          // plano 01-03) precisam de jsdom/React e vão para o projeto abaixo.
          include: ['tests/**/*.{test,spec}.ts'],
          // Todos os arquivos em tests/** compartilham o mesmo projectId do
          // Firestore Emulator ('cotidiano-test', ver rules-harness.ts) — é
          // um único banco de dados mutável. Rodar arquivos de teste em
          // paralelo (padrão do Vitest) causa corrida entre o
          // clearFirestore()/escritas de um arquivo e as leituras de outro,
          // com falhas não-determinísticas ("Property X is undefined" em
          // list, contagens erradas). Serializar só os arquivos deste
          // projeto — o projeto 'jsdom' (sem emulador) continua paralelo.
          fileParallelism: false,
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          // src/**: testes de unidade colocados junto do código.
          // tests/**/*.tsx: testes de componente do shell (plano 01-03+) —
          // só .tsx aqui, os .ts de tests/** (regras/rotas de dados) ficam
          // no projeto 'node' acima, contra o Firestore Emulator.
          include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.tsx'],
          setupFiles: ['./tests/setup.ts'],
        },
      },
    ],
  },
})
