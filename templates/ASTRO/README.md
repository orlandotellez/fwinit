# Template ASTRO

Landing estática creada con **Astro 7**, TypeScript y cero JavaScript en
runtime. Generada por **fwinit** — saluda a fwinit en su hero y sirve como
punto de partida completo: secciones listas, design tokens y SEO configurado.

## Requisitos

- Node.js >= 22.12.0

## Arrancar

```bash
npm install
npm run dev        # http://localhost:4321
```

## Estructura

```
src/
├── layouts/Layout.astro     # Head + SEO + design tokens + utilidades CSS
├── sections/
│   ├── Header.astro         # Nav fija con logo y CTA
│   ├── Hero.astro           # Saludo a fwinit + terminal card
│   ├── Features.astro       # Grilla de features (grid-4)
│   ├── DesignSkills.astro   # Las 4 skills de diseño de fwinit (grid-4)
│   ├── HowItWorks.astro     # Pasos (grid-3)
│   ├── CTA.astro            # Panel con llamada final
│   └── Footer.astro         # Pie oscuro con créditos
└── pages/
    └── index.astro          # Compone Layout + secciones
```

## Personalizar

- **Marca**: los colores, espacios y tipografía viven como variables CSS en
  `src/layouts/Layout.astro` (bloque `:root`).
- **Contenido**: cada sección es un componente independiente en
  `src/sections/`. Editá, agregá o eliminá secciones y actualizá
  `pages/index.astro`.
- **SEO**: `title` y `description` del Layout; copiá `.env.example` a `.env`
  para la URL pública del sitio.

## Skills de diseño

Este proyecto trae la biblioteca de skills de diseño de fwinit en
`.opencode/skills/design/`: cuatro estilos listos para aplicar a toda la app —
páginas públicas, landing y panel administrativo incluidos.

- **dark-luxury-design** — oscuro premium: dorado/plata, grano, glow.
- **minimal-light-design** — blanco limpio, tipografía editorial, un solo acento.
- **neo-brutalist-design** — colores saturados, bordes negros, sombras duras.
- **glassmorphism-design** — cristal translúcido, blur, fondos aurora.

Para usar uno, pedíselo a tu agente de IA: _"hacelo con el estilo dark luxury"_
o _"aplicá glassmorphism"_. La skill se aplica a la **aplicación completa** —
landing, vistas públicas y secciones administrativas sin excepción: si alguna
vista queda sin el estilo, es un defecto. Pedíle que cubra toda la app antes de
dar la tarea por terminada.

## Build y deploy

```bash
npm run build      # genera dist/ (estático)
npm run preview    # sirve el build localmente
```

Salida 100% estática: deployá en Vercel, Netlify, Cloudflare Pages o
cualquier hosting de archivos.