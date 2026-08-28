// Setup do projeto jsdom (vitest.config.ts) — matchers do jest-dom,
// cleanup automático do DOM entre testes (test.globals não está ativo,
// então o auto-cleanup do @testing-library/react não dispara sozinho — sem
// isto, um <Dialog>/<DropdownMenu> deixado aberto por um teste vaza
// `pointer-events: none` no body para o próximo teste) e polyfills que o
// jsdom não implementa e que as primitivas Radix (usadas por
// src/shared/ui/) chamam em tempo de execução (menu, diálogo).
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
// TanStack Router chama window.scrollTo() na restauração de scroll — jsdom
// tem a função mas loga "Not implemented" (ruído, não falha); sobrescrita
// incondicional porque o stub do jsdom existe, só não faz nada de útil.
window.scrollTo = () => {}
