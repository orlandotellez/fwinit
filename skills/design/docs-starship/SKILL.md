---
name: docs-starship
description: Design and build documentation sites, catalogs and landing pages in the "Docs Starship" style — the fwskills.dev design system — near-black blue-tinted surfaces, one electric blue accent with a measured WCAG scale, hairline borders over shadows, dual light/dark themes, Inter + JetBrains Mono, pill buttons and 12px cards. Use this skill whenever someone asks for "docs starship", "fwskills style", "design sistema docs", "estilo docs", "diseño de documentación", "catalog design", "accessible dark docs" or similar. Do NOT use this skill for dark luxury, minimal light, glassmorphism, neo-brutalist or minimal dashboard — those have their own design skills. Always use this skill — do NOT attempt the docs-starship style from memory alone.
---

# Docs Starship

Design and build **documentation sites, developer catalogs and their landing pages** with the design system of fwskills.dev (this repository's `frontend/`).

The result must feel like a serious developer product: quiet surfaces, one electric blue accent that carries every interactive meaning, hairline borders instead of shadows, and **measured accessibility** — every color decision is backed by a WCAG ratio, not by taste.

Use this style for docs sites, skill/plugin catalogs, CLI product sites, changelogs, technical landing pages, and any project that mixes long-form reading with an interactive index.

---

## Core Philosophy

Quality is communicated through:

* Contrast, measured and recorded
* Typography (Inter for UI, JetBrains Mono for anything code-like)
* Hairline borders and surface elevation, never glow
* One accent that always means the same thing
* Symmetry between light and dark themes (both are first-class)
* Real data (real counts, real dates, real links)

Do **not** communicate quality through effects. No gradients, no glassmorphism, no glowing orbs, no neon. A resting card has a **border, not a shadow**.

---

# 1. Design Tokens — Source of Truth

Every color is a **role**, never an appearance. You consume `--accent-hover`; you never invent `--azul-claro`. Hex literals outside the token block are a review defect.

## Surfaces (dark is the default)

```css
:root {
  color-scheme: dark;

  /* Surfaces */
  --base: #07090f;            /* page background — near-black, blue-tinted */
  --surface: #0b0e16;         /* alternating sections, footer, table headers */
  --surface-elevated: #121623;/* cards, code blocks, modals, dropdowns */
  --code-bg: #121623;         /* same value, separate role: measured independently */

  /* Text — all AA on all three surfaces */
  --text: #eef2f8;            /* 17.72 on base · 16.05 worst case */
  --text-secondary: #a8b2c4;  /* 9.32 · 8.44 — descriptions, support text */
  --text-muted: #77839a;      /* 5.21 · 4.72 — metadata; NEVER below this, never below 13px */

  /* Accent scale (electric blue) */
  --accent: #8aa2ff;          /* 8.24 — links, active icons, focus */
  --accent-hover: #a6b8ff;    /* 10.35 */
  --accent-active: #6f8ae6;   /* 6.12 */
  --accent-soft: #16203a;     /* chip/active backgrounds; accent text on it: 6.68 */
  --accent-soft-hover: #1d2a4d;
  --accent-border: #3d4a7a;   /* decorative only */

  /* Semantic */
  --success: #4ade80;  /* 11.42 */
  --warning: #fbbf24;  /* 11.92 */
  --error: #f87171;    /* 7.20 */
  --on-accent: #07090f;/* 8.24 on --accent — text INSIDE accent fills */

  /* Borders */
  --border: #1e2433;        /* ~1.28 — decorative hairline, deliberately < 3:1 */
  --border-strong: #2c3446; /* ~1.60 — hover borders, separators */
  --border-input: #5f6b8a;  /* 3.40 — WCAG 1.4.11: EVERY interactive control */

  /* Focus */
  --focus-ring: var(--accent);
  --focus-ring-offset: var(--base);

  /* Shadows — only two exist */
  --shadow-pop: 0 8px 24px rgb(0 0 0 / 0.28);   /* modals, mobile panel */
  --shadow-header: 0 1px 0 var(--border);        /* 1px separator, not a blur */

  /* Scrim behind modals and the mobile menu */
  --scrim: rgb(3 6 12 / 0.6);
}
```

## Light theme — same roles, adjusted values

```css
[data-theme='light'] {
  color-scheme: light;

  --base: #ffffff;
  --surface: #f7f8fb;
  --surface-elevated: #eef1f7;
  --code-bg: #eef1f7;

  --text: #0d1220;           /* 18.68 · 16.51 */
  --text-secondary: #454f63; /* 8.23 · 7.27 */
  --text-muted: #5c6678;     /* 5.79 · 5.12 */

  --accent: #3d54d4;         /* 6.15 */
  --accent-hover: #2b3ea8;   /* 8.91 */
  --accent-active: #24337f;  /* 11.32 */
  --accent-soft: #eaeeff;
  --accent-soft-hover: #dde3ff;
  --accent-border: #b9c2ee;

  --success: #166534; --warning: #78350f; --error: #b91c1c;
  --on-accent: #ffffff;      /* 6.15 on --accent */

  --border: #dfe3ec;
  --border-strong: #c3cad8;
  --border-input: #828b9c;   /* 3.03 */

  --shadow-pop: 0 8px 24px rgb(13 18 32 / 0.1);
  --scrim: rgb(13 18 32 / 0.5);
}
```

## The three hard rules of color

1. **No color enters without its ratio.** Compute WCAG 2.1 contrast against every background the role can live on (`base`, `surface`, `surface-elevated`) and record the ratio in a comment. All three surfaces share ONE semantic scale — no component needs per-background colors.
2. **`--border` and `--border-strong` are decorative on purpose** (below 3:1). They are never the only state indicator: text, icon or fill also changes, and every control carries `--border-input` (≥ 3:1) plus a visible focus ring.
3. **Guardrails, non-negotiable:** `--base` dark stays near-black with a blue tint (never pure `#000`, never warm grey). `--text-muted` is the floor of the text scale. Hierarchy comes from size and weight (500/600), never from color alone — an H3 is never distinguished from a paragraph only by being accent-colored.

If an incoming brand color violates a ratio, adjust to the nearest valid value **and say so**. Dark is the default (`:root` carries it so a page with no JS still renders complete); light is a full sibling, resolved by `@media (prefers-color-scheme: light) { :root:not([data-theme]) { … } }`.

---

# 2. Theme Switching

The theme is **the user's decision**, remembered; the system preference is only the initial default.

1. `data-theme` lives on `<html>`. Anti-flash inline script in `<head>`, **before any stylesheet**, before first paint:

```html
<script is:inline>
  (function () {
    try {
      var t = localStorage.getItem('app:theme');
      if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    } catch (e) {}
  })();
</script>
```

2. The toggle module only handles **changes** and never writes the attribute on load — two writers race. It also syncs `aria-pressed` and `aria-label` ("Cambiar a modo claro/oscuro") on every `[data-theme-toggle]`.
3. A user who never chose follows the system **live**: the CSS media query resolves it, and a `matchMedia` change listener re-syncs toggles when there is no stored choice.
4. Transitions apply to `background-color` and `color` only, and die under `prefers-reduced-motion`.

---

# 3. Typography

Two families, two purposes, no exceptions:

| Use | Family |
|---|---|
| UI and text | **Inter** (`'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`) |
| Code, commands, skill/package names, kbd | **JetBrains Mono** (variable, then `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`) |

Self-host the variable fonts (`@fontsource-variable`), no third-party requests, latin subsets preloaded.

Scale (weight 600 headings, 400 body):

| Role | Size / line-height | Use |
|---|---|---|
| Display | 60px / 1.1 | Landing H1, max 1–2 lines |
| H1 | 44px / 1.15 | Page title |
| H2 | 34px / 1.2 | Section heading |
| H3 | 24px / 1.3 | Card title, subsection |
| H4 | 19px / 1.3 | Widget titles, accordion items |
| Body | 17px / 1.6 | Paragraph |
| Body small | 15px / 1.6 | Card descriptions, table content |
| Caption | 13px / 1.4 | Breadcrumbs, metadata, badges — **the floor, never smaller** |
| Code | 14px / 1.6 | Code blocks and inline commands |

Rules:

* Anything that names an entity a user could install (`npx foo add x`, `SKILL.md`, `v1.2.0`) composes in monospace. This is what makes an item recognizable at a glance.
* Inline code: `accent-soft` background, `accent` text, `radius` 6px, padding `0.125em 0.375em`.
* Line width: long-form text capped at **800px** (`--text-column`); general container **1200px**; hero paragraph **560px**.
* Headings get `text-wrap: balance`, paragraphs `text-wrap: pretty`.

---

# 4. Spacing, Radii, Layout

Spacing scale (rem): `0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 / 4 / 6 / 7.5` (3xs → 4xl). Section separation is **96–120px** (`--space-3xl`/`--space-4xl`); nothing outside that range except the final CTA band at 120px.

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 8px | badges (small), inputs, icon buttons |
| `--radius-md` | 12px | **the maximum**: cards, code blocks, panels, modals |
| `--radius-pill` | 999px | chips, filter buttons, primary buttons, version badges |

Layout:

```css
.container    { max-width: 1200px; margin-inline: auto; padding-inline: 48px; } /* 24px on mobile */
.text-column  { max-width: 800px; margin-inline: auto; }
.section      { padding-block: 96px; }  /* 64px on mobile */
.section--alt { background: var(--surface); }
```

Shadows: a resting card carries **`border: 1px solid var(--border)`, never a box-shadow**. `--shadow-pop` exists only for things that float over content (search modal, mobile menu). Forbidden: neumorphism, hard shadows, shadows as card identity.

---

# 5. Buttons

All pill-shaped (`--radius-pill`), weight 600, 15px, padding `14px 32px`, inline-flex with an 8px gap.

```css
.btn-primary   { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.btn-primary:hover  { background: var(--accent-hover); border-color: var(--accent-hover); }
.btn-primary:active { background: var(--accent-active); }
.btn-secondary { background: transparent; color: var(--accent); border-color: var(--accent-border); }
.btn-secondary:hover { background: var(--accent-soft); border-color: var(--accent); }
.btn-ghost     { background: transparent; color: var(--text-secondary); border-color: var(--border-input); }
.btn-ghost:hover { background: var(--surface-elevated); color: var(--text); }
```

* Hover changes **fill/border**, never adds glow, lift or shadow.
* Small variant: 8px/16px padding, caption size.
* Icon-only buttons: 40×40, `--radius-sm`, `aria-label` mandatory, 44px touch target on mobile.
* On screens ≤ 480px buttons go full width.
* Transitions: `150ms ease`, background/border/color only.

---

# 6. Cards and Surfaces

```css
.card {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
  transition: border-color 150ms ease, background-color 150ms ease;
}
.card--interactive:hover       { border-color: var(--accent-border); }
.card--interactive:focus-within{ border-color: var(--accent); }
```

Hierarchy is built with **surface elevation + hairlines**, in this order: `--base` (page) → `--surface` (banded sections, footer) → `--surface-elevated` (cards, code, modals).

Alternate section backgrounds (`section` / `section--alt`) to create rhythm without adding any new color.

Entity cards (catalog items) follow one pattern used everywhere the entity appears — catalog grid, featured row, related items — so the site can never look like three different catalogs:

* Name in **monospace**, weight 600.
* Description clamped to **2 lines** (`-webkit-line-clamp: 2`).
* Category badge (the only badge with hue) + compatibility badges (neutral).
* Tags as neutral pills.
* Footer row: primary "Ver" action + quick "copy install command" button.
* Author as muted caption.

---

# 7. Header

`position: fixed`, height **72px**, full width, `background: var(--base)`, transparent bottom border at rest.

```css
.site-header[data-scrolled] {
  background: color-mix(in srgb, var(--base) 82%, transparent);
  backdrop-filter: blur(12px) saturate(140%);
  border-bottom: 1px solid var(--border); /* via --shadow-header */
}
```

* Left: wordmark (small accent glyph + name, weight 600, links to `/`).
* Center-right: nav links in 15px/500 `--text-secondary`; hover → `--text`; **active item marked with a 2px accent underline** that animates via `transform: scaleX()` (never via color).
* Right: search trigger (`Ctrl/⌘+K`), GitHub link with star count resolved at build (tabular-nums, muted), theme toggle, hamburger on mobile.
* Scroll state flips at **40px** via a passive listener + `requestAnimationFrame` — no scroll library for a boolean.
* Mobile: full-screen panel on `--surface-elevated`, hamburger animates to ✕ (three lines rotate), `aria-expanded` on the trigger, focus trapped, `Esc`/outside-click close, body scroll locked, focus restored to the trigger on close.

---

# 8. Search Modal

Opens from anywhere with `Ctrl/⌘+K`; searches **all content types** (docs + catalog entries). Index fetched once from a build-time JSON endpoint — no runtime backend, no index shipped per page.

* Scrim `--scrim`; panel `--surface-elevated`, `--radius-md`, border, `--shadow-pop`, max-width 640px.
* Input borderless inside a bordered field row; `Esc` kbd hint at the right.
* Results: kind label in accent (weight 600) + title + one-line muted description; hover/active row on `--accent-soft`.
* `aria-live="polite"` result count; keyboard hints (`↑↓ navegar`, `↵ abrir`) in a footer strip.
* `role="dialog"`, `aria-modal`, focus management, results `max-height: 50vh` with internal scroll.

---

# 9. Code Blocks

```css
.code { background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
```

* Top bar: language (or filename) label left in mono caption, **"Copiar" button** right — on click becomes "¡Copiado!" for 2s in `--success` and announces via `aria-live`.
* `overflow-x: auto` **inside the block, never the page**: a long command scrolls in its own box.
* Syntax highlighting with CSS custom properties (Shiki `ThemeRegistrationRaw` whose colors are `var(--syn-*)`), so blocks re-color on theme toggle with no second highlight pass:

| Token | Dark | Light |
|---|---|---|
| comment | `#77839a` (italic) | `#5c6678` |
| keyword | `#a78bfa` | `#7c3aed` |
| string | `#86efac` | `#166534` |
| number / attr-name | `#fbbf24` | `#92400e` |
| function | `#7dd3fc` | `#0e7490` |
| type | `#f0abfc` | `#a21caf` |
| variable | `#e6edf7` | `#0d1220` |
| tag | `#f87171` | `#b91c1c` |
| operator | `#9aa5b8` | `#5c6678` |
| punctuation | `#8b95a8` | `#5c6678` |

All ≥ 4.5 on `code-bg` in both themes — code complies with AA too.

---

# 10. Badges, Chips and Tags

All `--radius-pill`, caption size, 1px border:

* **Badge** (4 variants): category (the only hue: `accent-soft` bg + `accent` text + `accent-border`, weight 600), version (`v1.2.0`, neutral), compatibility (neutral), author (muted).
* **Chip** (filters): `--border-input` border, weight 600; selected state = `accent-soft` + accent text; counts in tabular-nums at 0.9 opacity.
* **Tag**: neutral `surface-elevated` pill; the filterable variant gets `--border-input` and an `aria-pressed` state.
* Color is **metadata**, not decoration: only the category variant carries hue, and always paired with a measured text color.

---

# 11. Tabs (package managers, and similar)

Pill container on `--surface` holding mono 13px tabs; selected tab = `accent-soft` + accent.

* Correct ARIA: `role="tablist"`, `role="tab"`, `aria-selected`, `tabindex` roving, `aria-controls` panels.
* The choice persists across pages (`localStorage`) and **synchronizes between every tab group on the page** through ONE delegated document listener — never one listener per group, or two groups on the same page will disagree.

---

# 12. Accordion

* Trigger: H4 19px question + a `+` icon in accent that **rotates 45° into `×`** when open (transform, not swap).
* Item separators are horizontal hairlines (`border-block`), no card chrome.
* `aria-expanded` + `aria-controls`; panels `hidden` until open.
* Groups support `data-exclusive` (one panel open at a time) for FAQs.
* Content in 15px `--text-secondary`, capped at the text column.

---

# 13. Breadcrumbs

Present on **every page except the home page**. Caption size, muted; separator `/` in `--border-strong`; **the last crumb is never a link** (it is where you already are, marked `aria-current="page"`). Sits one `--space-md` above the page title. No breadcrumbs on 404 — a trail promises a position in a hierarchy that URL does not have.

---

# 14. Navigation Pages (catalog / listing)

The interactive index is server-rendered, then filtered client-side:

* **The URL is the source of truth.** State lives in `?q=&categoria=&tag=&sort=` via `history.replaceState`; shared links land pre-filtered and back/forward re-filters (`popstate`).
* Filter controls: search input (44px tall, icon inside), sort `select`, category chips with counts, tag pills — all with `aria-pressed`.
* Cards carry `data-*` attributes (name, description, category, tags, featured, updated) and filtering hides/shows those nodes — no re-render, no framework.
* Live result count with `aria-live="polite"`; a real empty state ("No hay resultados" + clear button).
* Grid 3/2/1 columns; `content-visibility: auto` on the grid so hiding rows doesn't jank.
* One `<script>` per page, no framework runtime anywhere on the site.

---

# 15. Entity Detail Page

Detail pages (a skill, a package, an article) follow one shape:

1. Breadcrumbs.
2. **Hero header**: name in monospace H1, badges (category/version/compatibility), author + updated date right-aligned muted, one-paragraph description.
3. Install block: bordered panel on `--surface` with an uppercase micro-label, package-manager tabs + copy, and a manual fallback code block.
4. Content in a `1fr / 260px` grid: prose capped at the text column, **sticky TOC** on the right (`top: header + space`), items indented by heading depth, active/hover marked with a 2px accent border-inline-start.
5. Files/links section as bordered inline chips (`code` names inside).
6. Secondary actions row (View source / Edit / Report issue).
7. Related items on the shared card, separated by a top hairline.
8. Prose body: H2/H3 map down one scale step (H2→24px, H3→19px), links underlined with `text-underline-offset: 0.2em`, tables `display: block; overflow-x: auto` with bordered cells and `--surface` headers.

---

# 16. Landing Structure

```text
Header (fixed, 72px)
↓
Hero: two-column grid (1.1fr / 0.9fr), min-height 70vh
      eyebrow pill · display headline with ONE accent phrase ·
      560px lede · primary + secondary CTA · muted micro-facts line ·
      right column = the real product moment (install tabs block)
↓
Categories / value props (section--alt, grid-4 cards with count + arrow)
↓
Featured items (grid-3, shared card) with "Ver todas →" head row
↓
Steps 01/02/03 (mono numbers in accent-soft-hover, arrows shift 4px on hover)
↓
Flow (pills chained with → arrows; vertical chain on mobile)
↓
Community: metrics grid (4 tabular-nums values + uppercase labels) ·
          contributor avatars (40px circles) · CTA
↓
FAQ (accordion, exclusive)
↓
Final CTA band: accent-soft background, accent borders, centered
↓
Footer
```

* The hero shows the **actual product interaction** (a real install command), not an illustration.
* Metrics are real build-time data. Fake statistics (`10M+`, `99.99%`) are forbidden.
* Section headings: centered pattern = eyebrow + H2 + subtitle; started pattern = H2 + "more →" link on the baseline.

---

# 17. Footer

`--surface` background, 1px top border, identical on all pages. Grid `2fr 1fr 1fr 1fr` (2×2 on tablet, 1 col on mobile):

* Brand: wordmark, one-line tagline (≤ 34ch), social icon buttons (40px, bordered, hover → accent).
* Three link columns with uppercase caption headings in `--text-muted`.
* Bottom bar: 1px top border, caption, muted: `© {year} {name}. Proyecto open source bajo licencia {license}. Hecho por la comunidad.`

---

# 18. Icons

* One family only: **lucide** (as static Astro/SVG components — no runtime JS).
* Default `stroke-width: 1.75` inline (bump to 2.25 under 14px if hand-drawn).
* Sizes: 14 inline · 16 with support text · 18 buttons · 20 nav/flow arrows · 24 category cards.
* Every decorative icon: `aria-hidden="true"` + `focusable="false"`. An icon as the only content of a control requires `aria-label` on the control.
* Icons follow the color of the text they sit next to (`currentColor`); arrows in flows/links may shift 4px on hover.

---

# 19. Motion

* Durations: **150ms** fast (hover, fills), **250ms** base (header, panels), 400ms reveal.
* Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for transforms.
* Allowed: color/fill transitions, `scaleX` underline, 45° icon rotation, 4px arrow shifts, fade+12px rise on scroll reveal **once** (IntersectionObserver, `unobserve` after firing — re-animating reads as jitter), burger→✕.
* The reveal is **additive**: `[data-reveal]` base state keeps content visible without JS; with reduced motion or no IntersectionObserver, everything is visible immediately.
* Reduced motion: all durations to 0.01ms, `scroll-behavior: auto` — and `html { scroll-behavior: smooth }` is deliberately part of the design (anchors clear the fixed header via `scroll-padding-top`), so it is neutralized only inside the media query.
* A page must still look good with all animation disabled.

---

# 20. Accessibility Contract

Non-negotiable, verified by tests in the source project:

* `:focus-visible` = `outline: 2px solid var(--focus-ring); outline-offset: 2px` on **every** focusable element. A ring is never removed, only replaced by an equivalent indicator.
* Every interactive control: `--border-input` border (≥ 3:1) **plus** the focus ring, so state never depends on color alone.
* `--text-muted` (5.21 dark / 5.79 light) is the minimum text color, never below 13px.
* Semantic HTML first: `<nav aria-label>`, `<main id="main">`, one `<h1>` per page; skip-link ("Saltar al contenido") in accent that appears on focus.
* Icon-only controls carry `aria-label`; toggles carry `aria-pressed`; live regions announce result counts and copy confirmations.
* Modal patterns (menu, search) trap focus, close on `Esc`, and restore focus to the trigger.
* `color-mix` and `backdrop-filter` are progressive enhancements — the design must not depend on them.
* Print: white background, black text, header/footer dropped.

---

# 21. Behaviour Architecture (no framework)

The site ships **no framework runtime**. One module entry point initializes every client behaviour:

* Single `init()` guarded against re-entry (`if (started) return;`) — Astro re-evaluates scripts after client-side navigation and a twice-registered delegated listener fires twice.
* Listeners are **delegated from `document`** (or a stable container), never bound to leaf nodes, so swapped-in content keeps working without re-registration.
* Each sub-module checks for its own nodes first and exits silently when absent.
* Copy buttons read the value from `data-code-value` (never from DOM text), write to clipboard, confirm in `--success` for 2s.
* Theme, package-manager choice and any cross-page preference live in one `localStorage` key each, read in one place and written in one place.

---

# 22. Starlight / Docs Integration

When the project mounts **Starlight** (or any docs engine) over the same tokens, bridge it — do not restyle it:

* Declare `@layer` order first: engine layers, then `fwskills.tokens`, then `fwskills.bridge`. Importing base CSS unlayered silently overrides every engine component (naked `h1`/`a`/`code` selectors win the cascade) — that mistake already happened once.
* Map every engine color variable (`--sl-color-*`) onto the semantic tokens: bg, sidebar, text grays, accent, hairlines, asides (note/tip → accent, caution → warning, danger → error, success stays success), inline code → `accent-soft`/`accent`, fonts → the same two stacks, type scale → the project's sizes.
* Shadows off: `--sl-shadow-sm: none` — this design prefers borders.
* Override the engine's `<head>` component to re-emit its own head tags **plus** `<meta charset>` first (without it, view-transition swaps decode accents as Latin-1), a client-side router (removes full reloads between pages: CLS 0.48 → 0.0000), and font preloads.
* While a view transition runs, pin the shared chrome (`site-header`, sidebars) with `animation: none` — it must not move at all.
* Docs prose gets links underlined and inline code matching the site's treatment; active sidebar item = `accent-soft` + accent, not a pill.

---

# 23. SEO and Metadata (every page)

* Canonical URL from a required `PUBLIC_SITE_URL`; **a build without it fails loudly** rather than publishing a placeholder domain into `rel=canonical` and `sitemap.xml`.
* OG + Twitter tags with a default social image; `og:locale` set; `noindex` on 404.
* `robots.txt` and sitemap generated at build; search index generated at build from the content collections.
* Titles pattern: `{Page} — {Site}` / `{Entity} — {category} · {Site}`.

---

# 24. Content

* Spanish-first in the source project (`lang="es"`), human and concrete. Explain what the thing does, not how revolutionary it is.
* Empty states are honest and helpful ("Todavía no hay skills destacadas", "Probá con otra búsqueda o limpiá los filtros").
* Numbers in copy are real counts from the build (skills, categories, contributors, releases). No invented metrics.
* 404 copy stays in the product's voice: acknowledge the miss, offer real exits.

---

# 25. Technology

```text
Astro (static, zero JS by default)
Content collections for the catalog
Starlight for docs
lucide-astro for icons
@fontsource-variable/inter + jetbrains-mono
shiki with a token-based custom theme
Vanilla TypeScript modules (one entry, delegated listeners)
CSS: tokens.css → base.css → utilities.css (no Tailwind required)
bun / npm for tooling
```

Keep the implementation dependency-light: if a behaviour is 40 lines of vanilla TS, it does not get a library.

---

# 26. Launch Checklist

* [ ] Every color is a token; every text role has its WCAG ratio recorded
* [ ] All roles ≥ 4.5:1 on all three surfaces (or documented decorative)
* [ ] Dark is complete in `:root` with no JS; light is a full sibling
* [ ] Anti-flash script before first paint; one writer of `data-theme`
* [ ] Focus ring on every focusable element; interactive borders ≥ 3:1
* [ ] No shadows on resting cards; only two shadow tokens exist
* [ ] Code blocks: label + copy + internal overflow + token-based syntax colors
* [ ] Filter state shareable via URL; result counts announced
* [ ] Single guarded script entry; delegated listeners only
* [ ] Breadcrumbs everywhere except home; last crumb not a link
* [ ] Motion dies under `prefers-reduced-motion`; page looks good without JS
* [ ] Build fails without `PUBLIC_SITE_URL`; canonical + sitemap correct
* [ ] Entity name always monospace; captions never below 13px

---

# Final Principle

**Accessibility is the aesthetic.** The near-black blue base, the single electric accent, the hairline borders and the two-font discipline are not constraints on the design — they *are* the design. If a new element needs a new color, first find the role it plays; if it has no role, it doesn't ship. The result should feel:

**precise, calm, measurable and fast — a product an engineer trusts.**
