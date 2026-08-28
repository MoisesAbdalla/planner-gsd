import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Primitivas shadcn copiadas (src/shared/ui/) seguem a convenção
    // oficial de exportar a variante cva (buttonVariants etc.) junto do
    // componente no mesmo arquivo — react-refresh/only-export-components
    // sinaliza isso como perda de fast-refresh, mas é o padrão aceito para
    // código vendorizado deste tipo (não autoral, não editado a cada save).
    files: ['src/shared/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // src/app/router.tsx exporta `router` (const) e `AppRoot` (componente)
    // lado a lado — contrato fixo do bloco <interfaces> do plano 01-03,
    // consumido pelos planos 01-05/01-06. src/app/routes/*.tsx colocam o
    // schema de search params (ex.: entrarSearchSchema) junto da tela que
    // ele valida, padrão comum em código de rota do TanStack Router.
    files: ['src/app/router.tsx', 'src/app/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
