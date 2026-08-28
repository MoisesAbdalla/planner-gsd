import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// tests/** roda em ambiente node (Firestore emulator + Node APIs);
// src/** roda em jsdom (componentes React). Vitest 4 usa `test.projects`
// (sucessor de `test.workspace`/`environmentMatchGlobs`) para isso.
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
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
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
        },
      },
    ],
  },
})
