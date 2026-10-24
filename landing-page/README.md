# Landing de fwinit — sistema docs-starship

Landing oficial de **fwinit**, construida con Astro 7 y el sistema de diseño
**docs-starship** (el de `skills/design/docs-starship/`). Estática, sin runtime de
framework, con tema claro y oscuro completos, tokens medidos por WCAG y contenido que
sólo describe lo que el repo ya implementa.

## Requisitos

- Node.js >= 22.12.0
- `PUBLIC_SITE_URL` definida (el build falla sin ella, a propósito)

## Arrancar

```bash
cp .env.example .env    # ajustá PUBLIC_SITE_URL
npm install
npm run dev             # http://localhost:4321
```

```bash
npm run check           # astro check (tipos + plantillas)
PUBLIC_SITE_URL=https://tu-dominio.example npm run build
npm run preview
```

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `PUBLIC_SITE_URL` | sí | Canonical, tags OG y `sitemap.xml`. Sin ella el build aborta. |
| `PUBLIC_SITE_DESCRIPTION` | no | Respaldo de `<meta name="description">`. |
| `PUBLIC_GITHUB_REPO` | no | Repo del header y del footer. Default: `orlandotellez/fwinit`. |

## Estructura

```
src/
├── styles/
│   ├── tokens.css       # roles de color (dark en :root + light), tipos, spacing
│   ├── base.css         # reset, tipografía, layout, botones, cards, code, tabs, accordion
│   └── utilities.css    # skip-link, reveal, pills, helpers
├── layouts/Layout.astro  # head, anti-flash del tema, SEO/OG, fuentes, skip-link
├── components/
│   ├── Header.astro      # fijo 72px, nav centrada, CTA, scroll-spy, panel móvil
│   ├── Footer.astro      # marca + tres columnas de links + barra legal
│   ├── ThemeToggle.astro # único escritor de data-theme
│   ├── TerminalPanel.astro # momento de producto: demo animada de la CLI + árbol
│   ├── InstallTabs.astro # tabs ARIA de package manager (sincronizadas + persistidas)
│   ├── CodeBlock.astro   # label + copiar + overflow interno
│   ├── TemplateCard.astro# tarjeta de entidad compartida por las 8 plantillas
│   ├── SectionHead.astro # eyebrow + H2 + lede
│   └── Faq.astro         # accordion exclusivo con aria-expanded
├── sections/             # hero · strip de stacks · value props (texto + 2 cards)
│                         # stats (2 tarjetas con número real) · plantillas · comandos
│                         # skills · pasos · flujo · FAQ · CTA final
├── data/                 # datos reales: plantillas, skills, sitio y versión
├── lib/github.ts         # estrellas resueltas en build (con fallback)
├── scripts/main.ts       # un solo entry, listeners delegados
└── pages/
    ├── index.astro       # composición de secciones + JSON-LD
    ├── robots.txt.ts     # generado en build
    └── sitemap.xml.ts    # generado en build
```

## Composición

La estructura sigue la referencia de landing SaaS que pidió el usuario —hero centrado con
píldora de estado, CTA único y panel de producto; franja de stacks; bloque de texto + dos
tarjetas; dos tarjetas grandes con número real; secciones con título centrado— **sin copiar sus
efectos**: el resplandor azul de la referencia se reemplazó por un marco plano en
`--accent-soft` alrededor del panel del hero, porque el sistema docs-starship prohíbe gradientes
y glow como identidad y resuelve la jerarquía con superficies y hairlines medidas.

## De dónde sale el contenido

Nada de lo que se muestra es inventado:

- **Versión**: se lee de `../cli/package.json` en build (`src/data/site.ts`).
- **Plantillas**: `cli/src/templates.ts` + el `template.json` y el `package.json` /
  `pubspec.yaml` de cada `templates/<FOLDER>/`.
- **Comandos y flags**: `cli/src/index.ts` (comandos y opciones reales).
- **Skills**: `cli/src/agent-bundle.ts` y `skills/design/`.
- **Métricas**: se derivan de los datos anteriores (`facts` en `src/data/site.ts`) y el
  conteo de estrellas del header se pide a la API de GitHub en build; si no responde,
  el link se muestra sin número.
- **Iconos de stack**: paths de [Simple Icons](https://simpleicons.org) (licencia CC0 1.0),
  vendorizados como datos en `src/data/tech-icons.ts`. Las marcas siguen siendo de sus dueños y
  acá sólo identifican la tecnología; EF Core usa la marca de .NET porque no tiene propia.

Al agregar una plantilla al CLI, hay que sumarla a `src/data/templates.ts` para que
aparezca en la grilla y en los conteos.

## Sistema de diseño

- Un solo acento (`--accent`) con su escala; el resto son superficies, textos y bordes.
- Jerarquía por tamaño, peso y superficie: las tarjetas en reposo tienen **borde**, no sombra.
- Inter para UI, JetBrains Mono para todo lo que nombre una entidad instalable.
- Esquinas rectas: `--radius-sm`, `--radius-md` y `--radius-pill` valen `0` (roles con nombre para poder volver atrás cambiando tres valores).
- Líneas estructurales punteadas (`--hairline` / `--hairline-strong`): marco lateral fijo de la
  columna de contenido y separadores de sección. Los controles (`--border-input`), las tarjetas y
  las ventanas de código quedan sólidos para no perder legibilidad ni la señal de foco.
- Tema: oscuro por defecto en `:root`, claro como hermano completo. La preferencia vive
  en `localStorage` (`fwinit:theme`); el script inline del `<head>` la aplica antes del
  primer paint y el toggle sólo escribe cambios.

## Demo animada de la CLI

El panel del hero reproduce una sesión real de `fwinit` dentro de la pestaña **sesión**: escribe
`fwinit`, despliega el menú de qué querés crear, responde backend, frontend, package manager y
git, muestra el resumen del scaffold y termina con `cd mi-proyecto && ls -a`.

- El transcript final está **completo en el HTML**: sin JS, con `prefers-reduced-motion` o si
  alguien llega tarde, se lee entero (la animación sólo escribe encima, nunca inventa texto).
- Se reproduce una vez cuando el panel entra en viewport (`IntersectionObserver`), se corta sola
  si la pestaña pasa a background y tiene un botón **Repetir** con `aria-label`.
- Reserva la altura final antes de empezar, así el panel no empuja el hero mientras escribe.
- El contenedor animado es `aria-hidden` y hay un resumen textual para lectores de pantalla.

## Accesibilidad

- Skip-link, `:focus-visible` en todo focusable, `--border-input` (≥ 3:1) en controles.
- Sin JS la página se ve completa: el reveal es aditivo y `html.js` lo habilita.
- Panel móvil con focus trap, `Esc` y bloqueo de scroll; tabs con roles ARIA y
  navegación por flechas; conteos y copias anunciados por `aria-live`.
- `prefers-reduced-motion` anula transiciones y scroll suave.

## Imagen social

`public/og.svg` es un SVG de 1200×630 como default. Algunas plataformas no renderizan
SVG en OG: si vas a difundir la landing, reemplazalo por un PNG de 1200×630 y actualizá
los tags `og:image` / `twitter:image` en `src/layouts/Layout.astro`.

## Deploy

Salida 100% estática (`dist/`): Vercel, Netlify, Cloudflare Pages o cualquier hosting
de archivos. Recordá definir `PUBLIC_SITE_URL` en el entorno del deploy.
