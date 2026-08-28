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
