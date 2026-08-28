import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Espelha o path alias "@/*" -> "./src/*" de tsconfig.app.json,
      // exigido pelo shadcn CLI (componentes copiados importam via "@/...").
      // import.meta.dirname (não __dirname): Vite 8 sinaliza __dirname como
      // incompatível com o futuro configLoader "native".
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
