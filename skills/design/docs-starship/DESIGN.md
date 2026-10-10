# Design Guidelines — Docs Starship

## Visual Style
- **Aesthetic**: Documentation systems — near-black blue-tinted surfaces, one electric blue accent, hairline borders instead of shadows, dual light/dark themes, two-font discipline (Inter + JetBrains Mono)
- **Mood**: Precise, calm, measurable and fast — a product an engineer trusts
- **Inspiration**: the fwskills.dev design system (this repo's `frontend/`): serious developer products, Rust/Stripe-style docs, catalog UIs where real data is the decoration

---

## Color Palette

Every color is a **role**, never an appearance. You consume `--accent-hover`; you never invent `--azul-claro`. Hex literals outside the token block are a review defect. `:root` carries the **dark** theme (so a page with no JS still renders complete); light is a full sibling resolved by `@media (prefers-color-scheme: light) { :root:not([data-theme]) { … } }`.

### Dark (default, `:root`)

| Role (CSS var) | Value | Ratio / use |
|---|---|---|
| `--base` | `#07090f` | page background — near-black, blue-tinted |
| `--surface` | `#0b0e16` | alternating sections, footer, table headers |
| `--surface-elevated` | `#121623` | cards, code blocks, modals, dropdowns |
| `--code-bg` | `#121623` | same value, separate role: measured independently |
| `--text` | `#eef2f8` | 17.72 on base · 16.05 worst case |
| `--text-secondary` | `#a8b2c4` | 9.32 · 8.44 — descriptions, support text |
| `--text-muted` | `#77839a` | 5.21 · 4.72 — metadata; NEVER below this, never below 13px |
| `--accent` | `#8aa2ff` | 8.24 — links, active icons, focus |
| `--accent-hover` | `#a6b8ff` | 10.35 |
| `--accent-active` | `#6f8ae6` | 6.12 |
| `--accent-soft` | `#16203a` | chip/active backgrounds; accent text on it: 6.68 |
| `--accent-soft-hover` | `#1d2a4d` | step cards, hover on soft fills |
| `--accent-border` | `#3d4a7a` | decorative only |
| `--success` | `#4ade80` | 11.42 |
| `--warning` | `#fbbf24` | 11.92 |
| `--error` | `#f87171` | 7.20 |
| `--on-accent` | `#07090f` | 8.24 on `--accent` — text INSIDE accent fills |
| `--border` | `#1e2433` | ~1.28 — decorative hairline, deliberately < 3:1 |
| `--border-strong` | `#2c3446` | ~1.60 — hover borders, separators |
| `--border-input` | `#5f6b8a` | 3.40 — WCAG 1.4.11: EVERY interactive control |
| `--focus-ring` | `var(--accent)` | outline color |
| `--focus-ring-offset` | `var(--base)` | outline offset background |
| `--shadow-pop` | `0 8px 24px rgb(0 0 0 / 0.28)` | modals, mobile panel |
| `--shadow-header` | `0 1px 0 var(--border)` | 1px separator, not a blur |
| `--scrim` | `rgb(3 6 12 / 0.6)` | behind modals and the mobile menu |

### Light (`[data-theme='light']`)

| Role (CSS var) | Value | Ratio / use |
|---|---|---|
| `--base` | `#ffffff` | page background |
| `--surface` | `#f7f8fb` | alternating sections, footer, table headers |
| `--surface-elevated` | `#eef1f7` | cards, code blocks, modals, dropdowns |
| `--code-bg` | `#eef1f7` | code surfaces |
| `--text` | `#0d1220` | 18.68 · 16.51 |
| `--text-secondary` | `#454f63` | 8.23 · 7.27 |
| `--text-muted` | `#5c6678` | 5.79 · 5.12 |
| `--accent` | `#3d54d4` | 6.15 |
| `--accent-hover` | `#2b3ea8` | 8.91 |
| `--accent-active` | `#24337f` | 11.32 |
| `--accent-soft` | `#eaeeff` | chip/active backgrounds |
| `--accent-soft-hover` | `#dde3ff` | hover on soft fills |
| `--accent-border` | `#b9c2ee` | decorative only |
| `--success` | `#166534` | semantic |
| `--warning` | `#78350f` | semantic |
| `--error` | `#b91c1c` | semantic |
| `--on-accent` | `#ffffff` | 6.15 on `--accent` |
| `--border` | `#dfe3ec` | decorative hairline |
| `--border-strong` | `#c3cad8` | separators, hover borders |
| `--border-input` | `#828b9c` | 3.03 — interactive controls (1.4.11) |
| `--shadow-pop` | `0 8px 24px rgb(13 18 32 / 0.1)` | modals, mobile panel |
| `--scrim` | `rgb(13 18 32 / 0.5)` | modal/menu scrim |

### Accent scale

The accent is a **role family**, not a single value: `--accent`, `--accent-hover`, `--accent-active`, `--accent-soft`, `--accent-soft-hover`, `--accent-border`, plus `--on-accent` for text inside accent fills. Both theme instances above are the reference values; a project substitutes its own accent across the whole family and every text/background pair must be re-measured (see the three hard rules).

### The three hard rules of color

1. **No color enters without its ratio.** Compute WCAG 2.1 contrast against every background the role can live on (`base`, `surface`, `surface-elevated`) and record the ratio in a comment. All three surfaces share ONE semantic scale — no component needs per-background colors.
2. **`--border` and `--border-strong` are decorative on purpose** (below 3:1). They are never the only state indicator: text, icon or fill also changes, and every control carries `--border-input` (≥ 3:1) plus a visible focus ring.
3. **Guardrails, non-negotiable:** `--base` dark stays near-black with a blue tint (never pure `#000`, never warm grey). `--text-muted` is the floor of the text scale. Hierarchy comes from size and weight (500/600), never from color alone — an H3 is never distinguished from a paragraph only by being accent-colored.

If an incoming brand color violates a ratio, adjust to the nearest valid value **and say so**.

### Syntax highlighting tokens

Code blocks re-color on theme toggle through CSS custom properties (Shiki `ThemeRegistrationRaw` whose colors are `var(--syn-*)`), so no second highlight pass is needed. All tokens are ≥ 4.5 on `--code-bg` in both themes.

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

---

## Typography

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
- Anything that names an entity a user could install (`npx foo add x`, `SKILL.md`, `v1.2.0`) composes in monospace. This is what makes an item recognizable at a glance.
- Inline code: `accent-soft` background, `accent` text, radius 6px, padding `0.125em 0.375em`.
- Line width: long-form text capped at **800px** (`--text-column`); general container **1200px**; hero paragraph **560px**.
- Headings get `text-wrap: balance`, paragraphs `text-wrap: pretty`.

---

## Spacing & Layout

- **Spacing scale (rem)**: `0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 / 4 / 6 / 7.5` (3xs → 4xl)
- **Section separation**: 96–120px (`--space-3xl` / `--space-4xl`) — nothing outside that range except the final CTA band at 120px

```css
.container    { max-width: 1200px; margin-inline: auto; padding-inline: 48px; } /* 24px on mobile */
.text-column  { max-width: 800px; margin-inline: auto; }
.section      { padding-block: 96px; }  /* 64px on mobile */
.section--alt { background: var(--surface); }
```

- **Hero**: two-column grid (`1.1fr / 0.9fr`), min-height 70vh; right column is the real product moment (install tabs block)
- **Entity detail**: `1fr / 260px` grid, sticky TOC right (`top: header + space`)
- **Catalog grid**: 3/2/1 columns, `content-visibility: auto`
- Alternate section backgrounds (`section` / `section--alt`) create rhythm **without adding any new color**

---

## Borders & Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 8px | badges (small), inputs, icon buttons |
| `--radius-md` | 12px | **the maximum**: cards, code blocks, panels, modals |
| `--radius-pill` | 999px | chips, filter buttons, primary buttons, version badges |

Inset detail fills (inline code) use 6px. Nothing exceeds 12px except pills.

**Hairlines are the identity**: a resting card carries `border: 1px solid var(--border)`, never a box-shadow.

---

## Shadows & Elevation

Only two shadow tokens exist, and neither is a card identity:

```
--shadow-pop:    0 8px 24px rgb(0 0 0 / 0.28)   /* modals, mobile panel */
--shadow-header: 0 1px 0 var(--border)           /* 1px separator, not a blur */
```

Hierarchy is built with **surface elevation + hairlines**, in this order: `--base` (page) → `--surface` (banded sections, footer) → `--surface-elevated` (cards, code, modals).

Forbidden: neumorphism, hard shadows, shadows as card identity, glow as an interaction state.

---

## Buttons

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

- Hover changes **fill/border**, never adds glow, lift or shadow
- **Small variant**: 8px/16px padding, caption size
- **Icon-only buttons**: 40×40, `--radius-sm`, `aria-label` mandatory, 44px touch target on mobile
- On screens ≤ 480px buttons go full width
- Transitions: `150ms ease`, background/border/color only

---

## Section Labels

- **Eyebrow pill** above a heading: pill radius, caption size, weight 600, `accent-soft` background, `accent` text, `accent-border` — the same recipe as the category chip (the one pill-with-hue pattern in this system)
- **Uppercase micro-labels**: install block label and footer column headings, caption size, uppercase, `--text-muted` (footer) / `--text-secondary` (content)
- No `[brackets]`, no `— dashes —`, no monospace amber, no glass chips
- Section heading patterns: **centered** = eyebrow + H2 + subtitle · **started** = H2 + "more →" link on the baseline

---

## Icons

- One family only: **lucide** (as static Astro/SVG components — no runtime JS)
- Default `stroke-width: 1.75` inline (bump to 2.25 under 14px if hand-drawn)
- **Sizes**: 14 inline · 16 with support text · 18 buttons · 20 nav/flow arrows · 24 category cards
- Every decorative icon: `aria-hidden="true"` + `focusable="false"`. An icon as the only content of a control requires `aria-label` on the control
- Icons follow the color of the text they sit next to (`currentColor`); arrows in flows/links may shift 4px on hover
- No emojis, no icon fonts, no gradients

---

## Components

- **Header**: `position: fixed`, height **72px**, full width, `background: var(--base)`, transparent bottom border at rest. On scroll: `color-mix(in srgb, var(--base) 82%, transparent)` + `backdrop-filter: blur(12px) saturate(140%)` + bottom hairline. Left: wordmark (small accent glyph + name, weight 600, links to `/`). Center-right: nav links 15px/500 `--text-secondary`, hover → `--text`, **active item = 2px accent underline animated via `transform: scaleX()` (never via color)**. Right: search trigger (`Ctrl/⌘+K`), GitHub link with build-time star count (tabular-nums, muted), theme toggle, mobile hamburger. Scroll state flips at **40px** via a passive listener + `requestAnimationFrame`. Mobile: full-screen `--surface-elevated` panel, burger animates to ✕, `aria-expanded`, focus trapped, `Esc`/outside-click close, body scroll locked, focus restored to the trigger
- **Cards**: `background: var(--surface-elevated)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, `padding: 24px`, `transition: border-color 150ms ease, background-color 150ms ease`. Interactive hover → `border-color: var(--accent-border)`; `:focus-within` → `border-color: var(--accent)`. **Entity cards** (catalog items) use one pattern everywhere the entity appears — catalog grid, featured row, related items — so a site can never look like three different catalogs: name in **monospace** weight 600 · description clamped to **2 lines** (`-webkit-line-clamp: 2`) · category badge (only hue) + neutral compatibility badges · tags as neutral pills · footer row with primary "Ver" action + quick copy-install button · author as muted caption
- **Badges / chips / tags**: all `--radius-pill`, caption size, 1px border. **Badge** (4 variants): category = the only hue (`accent-soft` bg + `accent` text + `accent-border`, weight 600) · version (`v1.2.0`, neutral) · compatibility (neutral) · author (muted). **Chip** (filters): `--border-input` border, weight 600; selected = `accent-soft` + accent text; counts in tabular-nums at 0.9 opacity. **Tag**: neutral `surface-elevated` pill; filterable variant gets `--border-input` and `aria-pressed`. Color is **metadata**, not decoration: only the category variant carries hue, and always paired with a measured text color
- **Tabs** (package managers): pill container on `--surface` holding mono 13px tabs; selected tab = `accent-soft` + accent. Correct ARIA: `role="tablist"`, `role="tab"`, `aria-selected`, roving `tabindex`, `aria-controls` panels. The choice persists across pages (`localStorage`) and **synchronizes between every tab group on the page through ONE delegated document listener** — never one listener per group, or two groups on the same page will disagree
- **Accordion**: trigger = H4 19px question + a `+` icon in accent that **rotates 45° into `×`** when open (transform, not swap). Item separators are horizontal hairlines (`border-block`), no card chrome. `aria-expanded` + `aria-controls`; panels `hidden` until open. Supports `data-exclusive` (one open at a time) for FAQs. Content 15px `--text-secondary`, capped at the text column
- **Breadcrumbs**: present on **every page except the home page**. Caption size, muted; separator `/` in `--border-strong`; **the last crumb is never a link** (it is where you already are, marked `aria-current="page"`). Sits one `--space-md` above the page title. No breadcrumbs on 404 — a trail promises a position in a hierarchy that URL does not have
- **Code blocks**: `background: var(--surface-elevated)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, `overflow: hidden`. Top bar: language (or filename) label left in mono caption, **"Copiar" button** right — on click becomes "¡Copiado!" for 2s in `--success` and announces via `aria-live`. `overflow-x: auto` **inside the block, never the page**. Syntax colors come from the `--syn-*` token table above, so theme toggle re-colors with no second pass
- **Search modal**: opens from anywhere with `Ctrl/⌘+K`; searches **all content types** (docs + catalog). Index fetched once from a build-time JSON endpoint — no runtime backend, no per-page index. Scrim `--scrim`; panel `--surface-elevated`, `--radius-md`, border, `--shadow-pop`, max-width 640px. Input borderless inside a bordered field row; `Esc` kbd hint right. Results: kind label in accent (weight 600) + title + one-line muted description; hover/active row on `--accent-soft`. `aria-live="polite"` result count; keyboard hints (`↑↓ navegar`, `↵ abrir`) in a footer strip. `role="dialog"`, `aria-modal`, focus management, results `max-height: 50vh` with internal scroll
- **Navigation pages (catalog / listing)**: server-rendered then filtered client-side. **The URL is the source of truth** — state in `?q=&categoria=&tag=&sort=` via `history.replaceState`; shared links land pre-filtered and back/forward re-filters (`popstate`). Filter controls: search input (44px tall, icon inside), sort `select`, category chips with counts, tag pills — all `aria-pressed`. Cards carry `data-*` attributes (name, description, category, tags, featured, updated) and filtering hides/shows those nodes — no re-render, no framework. Live count `aria-live="polite"`; a real empty state ("No hay resultados" + clear button). Grid 3/2/1 with `content-visibility: auto`. One `<script>` per page, no framework runtime anywhere
- **Entity detail page**: breadcrumbs → hero header (name in monospace H1, badges, author + updated date right-aligned muted, one-paragraph description) → install block (bordered panel on `--surface`, uppercase micro-label, package-manager tabs + copy, manual fallback code block) → `1fr / 260px` content grid with sticky TOC (items indented by heading depth, active/hover marked with a 2px accent `border-inline-start`) → files/links as bordered inline chips → secondary actions row → related items on the shared card, separated by a top hairline. Prose: H2/H3 map down one scale step (24px / 19px), links underlined with `text-underline-offset: 0.2em`, tables `display: block; overflow-x: auto` with bordered cells and `--surface` headers
- **Footer**: `--surface` background, 1px top border, identical on all pages. Grid `2fr 1fr 1fr 1fr` (2×2 tablet, 1 col mobile). Brand: wordmark, one-line tagline (≤ 34ch), social icon buttons (40px, bordered, hover → accent). Three link columns with uppercase caption headings in `--text-muted`. Bottom bar: 1px top border, caption, muted: `© {year} {name}. Proyecto open source bajo licencia {license}. Hecho por la comunidad.`
- **Landing structure**: fixed header → hero (two-column, display headline with ONE accent phrase, 560px lede, primary + secondary CTA, muted micro-facts, right column = install tabs block) → categories/value props (`section--alt`, grid-4 cards with count + arrow) → featured items (grid-3, shared card) with "Ver todas →" head row → numbered steps 01/02/03 (mono numbers in `accent-soft-hover`, arrows shift 4px on hover) → flow (pills chained with → arrows, vertical chain on mobile) → community (metrics grid of 4 tabular-nums values + uppercase labels, 40px contributor avatars, CTA) → FAQ (exclusive accordion) → final CTA band (`accent-soft` background, accent borders, centered) → footer. The hero shows the **actual product interaction** (a real install command), not an illustration. Metrics are real build-time data; fake statistics (`10M+`, `99.99%`) are forbidden

---

## Imagery & Illustration

- There is **no decorative illustration layer**: no gradients, no glassmorphism, no glowing orbs, no neon, no abstract meshes. The near-black blue base plus hairlines *is* the visual texture
- The hero's "image" is the **real product interaction** — a working install-tabs block with the actual command — never a mock illustration
- Visual interest comes from syntax-highlighted code (the `--syn-*` tokens), lucide icons, monospace entity names and real build-time numbers
- Contributor avatars are 40px circles; brand marks and social buttons follow the icon rules (static SVG, `currentColor`)
- No stock photography and no invented metrics or logos; real counts, real dates, real links only

---

## Micro-Animations

- **Durations**: **150ms** fast (hover, fills) · **250ms** base (header, panels) · 400ms reveal
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` for transforms
- **Allowed**: color/fill transitions · `scaleX` underline · 45° icon rotation · 4px arrow shifts · fade + 12px rise on scroll reveal **once** (IntersectionObserver, `unobserve` after firing — re-animating reads as jitter) · burger → ✕
- The reveal is **additive**: `[data-reveal]` base state keeps content visible without JS; with reduced motion or no IntersectionObserver, everything is visible immediately
- **Reduced motion**: all durations to 0.01ms and `scroll-behavior: auto`. `html { scroll-behavior: smooth }` is deliberately part of the design (anchors clear the fixed header via `scroll-padding-top`), so it is neutralized only inside the media query
- A page must still look good with all animation disabled
- Theme switching transitions apply to `background-color` and `color` only, and die under `prefers-reduced-motion`

---

## Accessibility

Accessibility is the aesthetic — every rule here is a contract, verified by tests in the source project:

- **Focus**: `:focus-visible` = `outline: 2px solid var(--focus-ring); outline-offset: 2px` on **every** focusable element. A ring is never removed, only replaced by an equivalent indicator
- **WCAG 1.4.11 (non-text contrast)**: every interactive control carries `--border-input` (dark `#5f6b8a` = 3.40 · light `#828b9c` = 3.03, both ≥ 3:1) **plus** the focus ring, so state never depends on color alone. `--border` (~1.28) and `--border-strong` (~1.60) stay decorative and are never a sole state indicator
- **Measured ratios** (WCAG 2.1, against every surface the role lives on):
  - `--text` 17.72 / 16.05 (18.68 / 16.51 light)
  - `--text-secondary` 9.32 / 8.44 (8.23 / 7.27 light)
  - `--text-muted` 5.21 / 4.72 (5.79 / 5.12 light) — **the floor of the text scale**, never below 13px
  - `--accent` 8.24 (6.15 light) · `--accent-hover` 10.35 (8.91) · `--accent-active` 6.12 (11.32)
  - accent text on `--accent-soft`: 6.68 · `--on-accent` on `--accent`: 8.24 (6.15 light)
  - `--success` 11.42 · `--warning` 11.92 · `--error` 7.20
  - every syntax token ≥ 4.5 on `--code-bg` in both themes
- **Semantics**: `<nav aria-label>`, `<main id="main">`, one `<h1>` per page; skip-link ("Saltar al contenido") in accent that appears on focus. Icon-only controls carry `aria-label`; toggles carry `aria-pressed`; live regions announce result counts and copy confirmations
- **Modals** (menu, search) trap focus, close on `Esc`, and restore focus to the trigger
- **Theme**: `data-theme` on `<html>` with an anti-flash inline script in `<head>` **before any stylesheet**; the toggle only handles changes (never writes the attribute on load — two writers race), syncs `aria-pressed`/`aria-label`, and a live `matchMedia` listener follows the system when there is no stored choice
- **Progressive enhancement**: `color-mix` and `backdrop-filter` are enhancements; the design must not depend on them
- **Print**: white background, black text, header/footer dropped

---

## Replication Notes

- **Accessibility is the aesthetic.** The near-black blue base, the single electric accent, the hairline borders and the two-font discipline are not constraints on the design — they *are* the design. If a new element needs a new color, first find the role it plays; if it has no role, it doesn't ship
- `--base` is blue-tinted near-black, never pure `#000` and never warm grey
- Every color is a **token role**, never an appearance; hex literals outside the token block are a review defect
- A resting card carries a **border, not a shadow**. Only `--shadow-pop` (floating layers) and `--shadow-header` (1px separator) exist
- Hover changes **fill/border**, never adds glow, lift or shadow
- Dark is complete in `:root` with no JS; light is a full sibling with the same roles and re-measured values
- One accent means one thing everywhere: links, active icons, focus, category hue — never decoration
- Hierarchy comes from surface elevation, size and weight — never from color alone
- Anything a user could install (`npx …`, `SKILL.md`, `v1.2.0`) is monospace; captions never fall below 13px
- Entity cards are one shared pattern; entity detail pages are one shared shape
- One guarded `init()` per page, delegated listeners only, no framework runtime
- Ships with Astro (static, zero JS by default), content collections, Starlight for docs, `lucide-astro`, `@fontsource-variable/inter` + `jetbrains-mono`, Shiki with a token-based custom theme, vanilla TS modules, and `tokens.css → base.css → utilities.css`
- When a docs engine (Starlight) mounts over the same tokens, **bridge it, don't restyle it**: declare `@layer` order first (engine layers, then tokens, then bridge), map every `--sl-color-*` onto the semantic tokens, set `--sl-shadow-sm: none`, and pin shared chrome (`animation: none`) during view transitions
