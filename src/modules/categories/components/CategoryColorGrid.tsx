// Grade de 12 swatches da paleta fixa de categoria (D-10) — nunca um
// seletor livre de cor. Renderiza sempre na ordem de CATEGORY_COLOR_ORDER,
// cada swatch com o par claro/escuro de CATEGORY_COLOR_TOKENS resolvido por
// tema via [data-category-swatch] (src/index.css) — o mesmo mecanismo do
// ponto de cor da lista (CategoryRow).
//
// A seleção é marcada por ANEL na cor de texto primária MAIS um ícone de
// confirmação dentro do swatch — nunca só uma variação sutil de borda, que
// falha para quem não distingue os tons (must_haves.prohibitions do plano
// 01-06). O ícone usa mix-blend-difference para continuar legível sobre
// qualquer um dos 12 tons, sem precisar calcular contraste tom a tom.
//
// Cada swatch é um <button> nativo — percorrível pelo teclado via Tab, com
// anel de foco visível (UI-SPEC §Accessibility), sem precisar reimplementar
// a semântica de roving-tabindex de um radiogroup.
import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import {
  CATEGORY_COLOR_ORDER,
  CATEGORY_COLOR_TOKENS,
  type CategoryColorId,
} from '@/shared/theme/tokens'

export function CategoryColorGrid({
  value,
  onChange,
}: {
  value: CategoryColorId
  onChange: (color: CategoryColorId) => void
}) {
  return (
    <div role="group" aria-label="Cor da categoria" className="flex flex-wrap gap-2">
      {CATEGORY_COLOR_ORDER.map((colorId, index) => {
        const selected = colorId === value
        const tokens = CATEGORY_COLOR_TOKENS[colorId]
        const label = `Cor ${index + 1} de ${CATEGORY_COLOR_ORDER.length}${
          selected ? ', selecionada' : ''
        }`

        return (
          <button
            key={colorId}
            type="button"
            aria-pressed={selected}
            aria-label={label}
            onClick={() => onChange(colorId)}
            // size-11: alvo de toque mínimo de 44px, mesmo com o swatch
            // visual (size-9) menor por dentro (UI-SPEC §Spacing Scale,
            // Exceptions).
            className={cn(
              'relative flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dominant',
              selected && 'ring-2 ring-fg ring-offset-2 ring-offset-dominant',
            )}
          >
            <span
              aria-hidden
              data-category-swatch
              style={{ '--cc-light': tokens.light, '--cc-dark': tokens.dark } as CSSProperties}
              className="size-9 rounded-full"
            />
            {selected && (
              <Check aria-hidden className="absolute size-5 text-white mix-blend-difference" />
            )}
          </button>
        )
      })}
    </div>
  )
}
