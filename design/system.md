# Studio design system

Capturado de las fuentes del proyecto, sin inventar valores. Cada entrada nombra su archivo.

Fuentes leídas: `cli/src/studio/ui/tokens.ts`, `landing-page/src/styles/tokens.css`,
`templates/TAURI/src/styles.css`. `landing-page/src/styles/base.css` define reset y layout, no tokens.

## Color (tema oscuro, el del studio)

| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--base` | `#07090f` | fondo de la aplicación | `cli/src/studio/ui/tokens.ts` |
| `--surface` | `#0b0e16` | raíles, barras | `cli/src/studio/ui/tokens.ts` |
| `--surface-elevated` | `#121623` | tarjetas, bloques elevados | `cli/src/studio/ui/tokens.ts` |
| `--code-bg` | `#121623` | bloques de código y salida | `cli/src/studio/ui/tokens.ts` |
| `--text` | `#eef2f8` | texto principal | `cli/src/studio/ui/tokens.ts` |
| `--text-secondary` | `#a8b2c4` | prosa secundaria | `cli/src/studio/ui/tokens.ts` |
| `--text-muted` | `#77839a` | metadatos y etiquetas | `cli/src/studio/ui/tokens.ts` |
| `--accent` | `#8aa2ff` | acción principal y foco | `cli/src/studio/ui/tokens.ts` |
| `--accent-hover` | `#a6b8ff` | hover del acento | `cli/src/studio/ui/tokens.ts` |
| `--accent-active` | `#6f8ae6` | activo del acento | `cli/src/studio/ui/tokens.ts` |
| `--accent-soft` | `#16203a` | fondo de bloque acentuado | `cli/src/studio/ui/tokens.ts` |
| `--accent-border` | `#3d4a7a` | borde de bloque acentuado | `cli/src/studio/ui/tokens.ts` |
| `--success` | `#4ade80` | éxito, verificación | `cli/src/studio/ui/tokens.ts` |
| `--warning` | `#fbbf24` | aviso | `cli/src/studio/ui/tokens.ts` |
| `--error` | `#f87171` | fallo | `cli/src/studio/ui/tokens.ts` |
| `--border` | `#1e2433` | separadores | `cli/src/studio/ui/tokens.ts` |
| `--border-strong` | `#2c3446` | separador de grupo | `cli/src/studio/ui/tokens.ts` |
| `--border-input` | `#5f6b8a` | borde de control | `cli/src/studio/ui/tokens.ts` |
| `--on-accent` | `#07090f` | texto sobre acento | `cli/src/studio/ui/tokens.ts` |
| `--scrim` | `rgb(3 6 12 / 0.6)` | velo de superposición | `cli/src/studio/ui/tokens.ts` |

Regla de hairlines: `--hairline: 1px dashed var(--border)` y
`--hairline-strong: 1px dashed var(--border-strong)`. Los separadores son **punteados**; los bordes de
control son sólidos. `--shadow-header: 0 1px 0 var(--border)`, `--shadow-pop: 0 8px 24px rgb(0 0 0 / .28)`.

## Tipografía

| Token | Valor | Uso |
| --- | --- | --- |
| `--text-display` | `3.75rem` | portada |
| `--text-h1` | `2.75rem` | título de vista |
| `--text-h2` | `2.125rem` | sección |
| `--text-h3` | `1.5rem` | subtítulo |
| `--text-h4` | `1.1875rem` | título de panel |
| `--text-body` | `1.0625rem` | prosa |
| `--text-small` | `0.9375rem` | prosa secundaria |
| `--text-caption` | `0.8125rem` | etiquetas y metadatos |
| `--text-code` | `0.875rem` | código y salida |

Interlineado: `--leading-display 1.1`, `--leading-h1 1.15`, `--leading-h2 1.2`, `--leading-h3 1.3`,
`--leading-body 1.6`. Fuente: `cli/src/studio/ui/tokens.ts`.

Familias en producción: Inter (texto) y JetBrains Mono (código), servidas por el documento del studio.
Los artboards usan pilas del sistema por la regla de cero URLs externas: misma métrica aparente,
fuente distinta. No es un cambio de marca.

## Espaciado

`--space-3xs .25rem`, `--space-2xs .5rem`, `--space-xs .75rem`, `--space-sm 1rem`, `--space-md 1.5rem`,
`--space-lg 2rem`, `--space-xl 3rem`, `--space-2xl 4rem`. Fuente: `cli/src/studio/ui/tokens.ts`.

## Radio

`--radius-sm: 0px`, `--radius-md: 0px`, `--radius-pill: 0px`. **Esquinas rectas en todo el producto**;
los roles existen para poder revertir en una línea. Un artboard con esquinas redondeadas está fuera del sistema.

## Movimiento

`--duration-fast 150ms`, `--duration-base 250ms`, `--duration-reveal 400ms`,
`--ease-out cubic-bezier(0.16, 1, 0.3, 1)`. Fuente: `cli/src/studio/ui/tokens.ts`.
Respetar `prefers-reduced-motion`: el estado nunca depende sólo de una animación.

## Reglas de componentes observadas

- **Foco**: `--focus-ring: var(--accent)` con `--focus-ring-offset: var(--base)`; anillo visible en
  `:focus-visible`, distinto de la selección.
- **Selección de fila**: `aria-current` con borde izquierdo de acento, no un fondo de color pleno.
- **Estado**: se muestra con etiqueta escrita además del color (éxito/aviso/error), nunca sólo color.
- **Densidad**: filas de 28–32px con separador hairline en vez de tarjetas anidadas.
- **Acento**: un solo uso fuerte por vista (la acción principal). El resto es tinta neutra.
- **Código y salida**: `--code-bg` con `--text-code`; los tokens de sintaxis están en `tokens.ts`
  (`--syn-*`), todos por encima de 4.5:1 sobre `--code-bg`.

## Pendiente

`design/system.md` es una captura, no una decisión nueva. Si el studio cambia sus tokens, esto queda
obsoleto y hay que volver a sincronizar (`list` lo reporta como `staleSources`).
