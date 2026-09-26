# Design Guidelines — Minimal Dashboard

## Visual Style
- **Aesthetic**: Minimal dark dashboard — neutral near-black UI chrome, no brand accent, color used exclusively as a status/data signal
- **Mood**: Functional, dense, calm, trustworthy — built for daily use, not for a first impression
- **Reference**: internal POS / inventory / reporting application (sidebar + tables + slide-over panels + stat cards + charts)

---

## Color Palette

Unlike a marketing/brand system, this palette has **no single brand accent input**. Chrome (nav, buttons, cards, borders, inputs) is entirely neutral grayscale; the only hues in the system are the four **semantic** roles, plus a fixed categorical set reserved for charts.

### Neutral tokens (chrome)

| Role (CSS var) | Value | Used for | Guardrail |
|---|---|---|---|
| `--bg` | `#0a0a0b` | page background, sidebar | luminance < 12%, neutral (no warm/cool cast) |
| `--surface` | `#111113` | inputs, table header row, sidebar active nav item, badge pills | slightly lighter than `--bg` |
| `--surface-elevated` | `#17171a` | cards, stat cards, slide-over/modal panels | one more step lighter than `--surface` |
| `--border` | `rgba(255,255,255,0.08)` | default hairlines (table rows, card outline) | subtle, never a hard gray line |
| `--border-medium` | `rgba(255,255,255,0.14)` | header/footer dividers, secondary button outline, active pagination | still hairline-weight, just more visible |
| `--text` | `#f5f5f4` | primary values, headings, active nav | AA (4.5:1) vs `--bg` and `--surface-elevated` |
| `--text-secondary` | `#9a9a9f` | labels, subtitles, default nav/table text | — |
| `--text-muted` | `#6b6b70` | placeholders, captions, disabled text, empty-state copy | — |

### Semantic tokens (the only color in the system)

| Role (CSS var) | Value | Used for |
|---|---|---|
| `--success` | `#3ecf70` | positive trend arrows, "in stock" states, confirmations |
| `--danger` | `#e5484d` | negative trend arrows, zero-stock numbers, destructive buttons, danger-zone card |
| `--warning` | `#e0a63e` | low-stock numbers, "needs attention" values |
| `--info` | `#4f8ff7` | primary chart line, links, focus rings |

> **Rule**: these four meanings are fixed. Don't reassign green/red/amber/blue to different concepts between screens or projects — the whole point is that a user builds instant intuition ("red = zero, amber = low, green = good") across the entire app.

### Chart categorical palette (fixed order)

| Order | CSS var | Value | Example use |
|---|---|---|---|
| 1 | `--chart-1` | `#4f8ff7` | largest/primary category (e.g. "Abarrotes") |
| 2 | `--chart-2` | `#3ecf70` | second category (e.g. "Carnes") |
| 3 | `--chart-3` | `#b476f0` | third category |
| 4 | `--chart-4` | `#e0a63e` | fourth category |
| 5 | `--chart-5` | `#ec6cad` | fifth category |
| 6 | `--chart-6` | `#6b6b70` | catch-all ("Otros" / "Sin categoría") |

Always assign colors to categories in this fixed order (largest value first) so recurring categories keep a stable color across report periods.

---

## Typography

- **Font**: Inter (or equivalent neutral geometric sans), weights 400–700 only. No 800/900 anywhere — this style never needs an ultra-bold marketing weight.
- **Numerals**: tabular/lining figures wherever numbers stack in a column (tables, stat cards, chart footers) so digits align.

| Element | Size | Weight | Letter-spacing | Color |
|---|---|---|---|---|
| Page title (h1) | 28px | 700 | -0.01em | `--text` |
| Page subtitle | 14px | 400 | normal | `--text-secondary` |
| Sidebar brand name | 15px | 700 | normal | `--text` |
| Sidebar section label | 11px, uppercase | 600 | 0.08em | `--text-muted` |
| Nav item | 14px | 500 | normal | `--text-secondary` / `--text` (active) |
| Table header cell | 12px, uppercase | 600 | 0.04em | `--text-secondary` |
| Table primary cell | 14px | 600 | normal | `--text` |
| Table secondary line | 12.5px | 400 | normal | `--text-secondary` |
| Card / section heading (h3) | 15px | 600 | normal | `--text` |
| Stat card label | 12px, uppercase | 600 | 0.04em | `--text-secondary` |
| Stat card number | 30–32px | 700 | -0.01em | `--text` |
| Checkout total number | 36–40px | 800* | -0.01em | `--text` |
| Form label | 13px | 500 | normal | `--text-secondary` |
| Button label | 14px (13px sm) | 500 | normal | context |
| Caption / meta / axis label | 11–12px | 400 | normal | `--text-muted` |

\* The single deliberate exception: the checkout/POS **total** is the one number in the whole system allowed to feel weightier than a stat card number, since it's the answer to the one question that screen exists to answer.

---

## Spacing & Layout
- **Base unit**: 4px — all spacing values are multiples of 4.
- **Sidebar width**: 232px fixed.
- **Page padding**: 32–40px horizontal, 32px top.
- **Section rhythm**: 24–32px between header → filters → content blocks (this is a dense, above-the-fold app, not a scroll-driven marketing page).
- **Card padding**: 20–24px.
- **Table cell padding**: 14px vertical, 16px horizontal.
- **Slide-over width**: 400–430px.
- **Grid**: content area max-width is fluid (fills viewport minus sidebar); internal grids (stat cards, chart cards) use 2–3 equal columns with 24px gutters.

---

## Borders & Radius
- **Inputs, buttons, badges (pill)**: buttons/inputs 8px; badges/status pills `border-radius: 999px`.
- **Cards, stat cards, chart cards**: 12px.
- **Slide-over panel**: 0 (edge-to-edge) or 16px on the inward edge only if it floats off the edge.
- **Nav item active background**: 8px.
- Cards have a **visible but hairline** border (`--border`) — unlike a pure elevation-only system, dashboards benefit from a thin defining edge since many cards sit edge-to-edge in a grid.

---

## Shadows & Elevation
Elevation here comes primarily from **surface contrast + hairline border**, with shadow reserved for genuinely floating elements (dropdowns, the slide-over panel, popovers):

```
Card (default):      border: 1px solid var(--border); no shadow
Slide-over / modal:  border: 1px solid var(--border-medium); box-shadow: 0 8px 30px rgba(0,0,0,0.35)
Dropdown/menu:       box-shadow: 0 4px 16px rgba(0,0,0,0.4)
```

- No glow, no colored shadow, no inset highlight line. This system trades the "raised luxury card" feel of marketing systems for flat legibility — the user is scanning fast, not admiring depth.
- No grain/noise texture. No ambient orb. This is a working tool.

---

## Buttons

No filled/colored button except destructive actions inside a danger zone.

- **Primary**: `--text` fill, `--bg` text, `1px solid var(--text)` border. One per view, reserved for the single main action ("Nuevo", "Cobrar", "Guardar").
- **Secondary**: transparent fill, `--text` label, `1px solid var(--border-medium)`. Used for everything else — "Importar", "Modo edición", "Exportar a Excel", "Ir a Inventario".
- **Destructive**: `--danger` fill, near-black text, used only inside a Danger Zone card ("Eliminar producto").
- **Disabled** (any variant): `--surface` fill, `--text-muted` label, `--border` outline — must look inert at a glance, not just lower-opacity.
- **Radius**: 8px, all variants.
- **Sizes**: default `padding: 10px 18px` / 14px text; small (nav/table-row actions) `padding: 6px 12px` / 13px text.
- **Hover**: secondary gets a faint `rgba(255,255,255,0.04)` tint; primary/destructive get a very slight brightness lift (`filter: brightness(1.05)`), never a glow.

---

## Tables

- Header row: `--surface` background is optional (flat `--bg` also works) with a `--border-medium` bottom rule; label cells uppercase, `--text-secondary`.
- Body rows: `1px solid var(--border)` bottom rule only, no vertical rules, no zebra striping.
- Row hover: `rgba(255,255,255,0.02)` background tint.
- Primary column stacks name (bold, `--text`) + category/subtype (`--text-secondary`, smaller, tight line-height).
- Status/quantity column: colored bare number (severity: `--text` default → `--warning` low → `--danger` zero) followed by a neutral `--surface` pill badge for the unit/type.
- Row action button: small secondary button by default, fully muted/disabled styling when the row's action is unavailable (e.g. zero stock).
- Pagination: bottom-right, text buttons "Anterior"/"Siguiente" (`--text-secondary`, disabled at bounds) + numbered pill buttons (inactive: `--surface` bg/`--text-secondary`; active: `--text` bg/`--bg` text).

---

## Badges

```
Neutral pill:   background: var(--surface); color: var(--text-secondary); border-radius: 999px; padding: 3px 10px; font-size: 12px;
Status number:  no background, no border — just colored text (--text / --warning / --danger) sized like the surrounding cell text.
```

Never combine: a pill is never colored by severity, and a status number never gets a pill background. They are two different signals (what it is vs. how urgent it is) and must stay visually distinct.

---

## Cards & Stat Cards

```
Card:            background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 12px; padding: 20-24px;
Stat card:       same as Card, contents = [label (uppercase, --text-secondary), big number (700, --text), trend line]
Trend line:      "▲ 12.4% vs anterior" → triangle + % in --success or --danger, "vs anterior" in --text-muted
Chart card:      same as Card, header = plain-text title (15px/600, --text), no bracket label, no monospace label
Danger-zone card: background: rgba(229,72,77,0.08); border: 1px solid var(--danger); heading in --danger (700); body copy in --text-secondary
```

---

## Slide-over Panel

- Width 400–430px, anchored right, `--surface-elevated` background, `box-shadow: 0 8px 30px rgba(0,0,0,0.35)`, scrim behind at `rgba(0,0,0,0.5)`.
- Header: title (700, `--text`) + × close icon-button, bottom `--border` rule.
- Intro block: recessed `--surface` card with entity name (700) + secondary id (`--text-secondary`, smaller).
- Section label (uppercase, `--text-secondary`, 11–12px) optionally paired with a tertiary text-link action (e.g. "Editar" + pencil icon, `--text-secondary`, no button chrome) on the same line.
- Field grid: 2 columns, each cell = small muted label above a bold `--text` value; `--border` divider between sections.
- Footer note (optional): 1 line, `--text-muted`, explaining a read-only field's real source.
- Actions: secondary outline button (navigation), then primary solid button (close/save), then — separated by real vertical space — the Danger Zone card if the entity is deletable.

---

## Charts

- **Line**: single `--info` stroke (2px), filled dots at data points, dashed `--border` gridlines, `--text-muted` axis labels (11–12px), footer strip of label/value mini-stats (TOTAL / best period / period count).
- **Donut**: hollow center, segments from the fixed 6-color categorical palette in fixed order, paired with a legend list (colored dot + `--text-secondary` label left, `--text` tabular value right) rather than on-slice labels.
- **Segmented toggle** (e.g. "Ingresos" / "Cantidad" above a table): pill track `--surface`, active segment filled `--surface-elevated` (or `--text`/`--bg` for stronger emphasis), 999px radius, no color.

---

## Forms & Inputs

```
Input/select:   background: var(--surface); border: 1px solid var(--border); border-radius: 8px; height: 40px; color: var(--text);
Label:          13px/500, --text-secondary, margin-bottom 6px
Summary row:    label (--text-secondary) left, value (--text) right, stacked with 8-12px gaps
Total row:      border-top: 1px solid var(--border-medium); label 700 --text; value 36-40px/800 --text
Checkbox:       4px-radius square outline (--border-medium) default; filled --text (or --info) + check glyph when active
Empty state:    28-32px muted line icon, centered, 1 line of --text-muted caption beneath, no color, no illustration
```

---

## Icons
- SVG line icons only (Lucide/Phosphor outline), 1.5–1.75px stroke.
- Sizes: 18px nav, 16px inline/table, 20–24px empty states.
- Color inherits from context (`--text-secondary` default, `--text` active/emphasized, semantic color only when the icon *is* the status, e.g. a trash icon inside the danger zone).
- Never inside a colored or gradient container. No emoji, no icon fonts.

---

## Motion
- Hover/opacity/background transitions: ~150ms ease.
- Slide-over enter: translateX from 100% → 0, ~200ms ease-out, scrim fades in parallel.
- No scroll-reveal, no count-up numbers, no marquee, no pulsing buttons.
- Respect `prefers-reduced-motion: reduce`.

---

## Replication Notes
- The background is neutral near-black, not warm — `#0a0a0b`, never `#000000` and never an amber-tinted near-black (that belongs to marketing/luxury systems, not tools).
- There is no brand accent token in this system by design. If a project insists on brand color, confine it to the logo mark only.
- Color always answers "what state is this?" — never "what section is this?" or "does this look nice?".
- Pills = metadata (neutral). Bare colored numbers = urgency (semantic). Keep them visually distinct.
- Elevation is border + surface-contrast first, shadow only for panels/dropdowns that actually float above content.
- Numbers are tabular and right-aligned wherever they stack in a column.
- Density beats whitespace: this is an 8-hour tool, not a 30-second landing page.
