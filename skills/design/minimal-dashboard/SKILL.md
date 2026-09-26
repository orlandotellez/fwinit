---
name: minimal-dashboard
description: Design and build dark, data-dense admin panels, back-offices, POS systems, and internal dashboards in the "Minimal Dashboard" style — neutral near-black UI chrome (sidebar, tables, cards, inputs, buttons) with color used ONLY for meaning (success green, danger red, warning amber, info blue for charts), never for decoration. Compact typography, thin borders instead of shadows, dense data tables with inline badges, slide-over detail panels, stat cards with trend arrows. Use this skill whenever someone asks for a "dashboard", "admin panel", "back office", "panel de administración", "POS", "punto de venta", "inventory system", "internal tool", "SaaS dashboard", "data table UI", or wants to display metrics, reports, products, orders, or any tabular business data in a dark theme. Do NOT use this skill for marketing/landing pages (use dark-luxury or another marketing skill instead) — this skill is for functional, information-dense application UI, not persuasive pages. Always consult this skill before building dashboard UI — do NOT design it from memory alone.
---

# Minimal Dashboard

Design and build **dark, functional, data-dense application interfaces**: admin panels, POS systems, inventory managers, analytics dashboards, back-offices.

The reference implementation is a POS/inventory app ("Cajora POS") with a sidebar, product tables, a checkout screen, a slide-over product detail panel, and a reports page with stat cards and charts. Everything in this skill generalizes from that reference.

This is **not** a marketing skill. There is no hero, no persuasive copy, no scroll animation. The goal is a tool someone uses for eight hours a day: fast to scan, low-glare, predictable, and boring in the right places.

---

## Core Philosophy

> **Color is reserved for meaning. Chrome is monochrome.**

This is the single rule that separates this style from typical "colorful SaaS dashboard" templates:

- Navigation, buttons, cards, borders, inputs — all neutral near-black / off-white grayscale. No brand-colored sidebar, no colored primary buttons, no gradient anything.
- Color appears **only** to communicate status or data: green = success/positive, red = danger/negative/zero, amber = warning/low, blue (or a categorical chart palette) = data series in charts.
- If you're tempted to add a brand accent color to a button, a border, or an icon just to make it "pop" — don't. That signal is spent on things that actually need attention (stock about to run out, a sale that went down, a destructive action).

Secondary principles:

- **Density over whitespace.** Rows are compact, tables carry a lot of information per screen. This is the opposite of a landing page — the user needs to scan 20 rows at once, not admire 3.
- **Borders and surface-contrast over shadows.** Elevation is done with a slightly lighter surface color and a hairline border, not big soft shadows.
- **Numbers align and read fast.** Prices, stock counts, and stats stay right-aligned or in fixed-width contexts, bold where they're the primary value of a row.
- **Every piece of state is legible at a glance**: a stock count, a trend, a payment method, an alert — is instantly readable without hovering or clicking.

---

## 1. Design Tokens — Source of Truth

See `DESIGN.md` for the full token table. Summary:

```css
/* Base surfaces — neutral, cool, near-black. Never warm/amber, never pure #000. */
--bg: #0a0a0b;              /* page + sidebar background */
--surface: #111113;         /* inputs, table header, sidebar active item */
--surface-elevated: #17171a;/* cards, stat cards, slide-over panel, modals */
--border: rgba(255,255,255,0.08);        /* default hairline */
--border-medium: rgba(255,255,255,0.14); /* dividers that need to read more clearly */

/* Text */
--text: #f5f5f4;             /* primary value, headings */
--text-secondary: #9a9a9f;   /* labels, subtitles, muted rows */
--text-muted: #6b6b70;       /* placeholders, disabled, captions */

/* Semantic — the ONLY color in the system */
--success: #3ecf70;  /* positive trend, in-stock, confirmations */
--danger:  #e5484d;  /* negative trend, zero stock, destructive actions */
--warning: #e0a63e;  /* low stock, needs-attention numbers */
--info:    #4f8ff7;  /* primary chart series, links, focus ring */

/* Chart categorical palette (order matters, reuse in this order) */
--chart-1: #4f8ff7; /* blue */
--chart-2: #3ecf70; /* green */
--chart-3: #b476f0; /* purple */
--chart-4: #e0a63e; /* amber */
--chart-5: #ec6cad; /* pink */
--chart-6: #6b6b70; /* gray — "other/uncategorized" bucket */
```

**Guardrails:**
- `--bg` stays neutral and near-black: luminance below 12%, no warm or cool tint strong enough to read as "themed." This is a tool, not a brand moment.
- `--text` keeps AA contrast (4.5:1) against `--bg` and `--surface-elevated`.
- Never introduce a 7th accent hue "for the brand." If a project truly needs brand identity, it goes on the logo and nowhere else — not on buttons, not on the active nav state, not on borders.
- Semantic colors are fixed across projects. Don't reassign green/red/amber roles per project — users transfer intuition about color meaning between tools.

---

## 2. Typography

Use **Inter** (or a similar neutral geometric sans). Numbers should use tabular/lining figures where possible so columns align.

| Role | Size | Weight | Color |
|---|---|---|---|
| Page title (h1) | 28px | 700 | `--text` |
| Page subtitle | 14px | 400 | `--text-secondary` |
| Sidebar section label | 11px, uppercase, letter-spacing 0.08em | 600 | `--text-muted` |
| Nav item | 14px | 500 | `--text-secondary` (active: `--text`) |
| Table header | 12px, uppercase, letter-spacing 0.04em | 600 | `--text-secondary` |
| Table primary cell (product name) | 14px | 600 | `--text` |
| Table secondary line (category) | 12.5px | 400 | `--text-secondary` |
| Stat card label | 12px, uppercase | 600 | `--text-secondary` |
| Stat card number | 30–32px | 700 | `--text` |
| Checkout / total number | 36–40px | 800 | `--text` |
| Body / form labels | 13–14px | 400–500 | `--text-secondary` |
| Button text | 14px (13px for compact/sm) | 500 | context-dependent |
| Caption / meta | 12px | 400 | `--text-muted` |

No huge display type anywhere in this style — the largest number on screen is a total or a KPI, never a marketing headline. No letter-spacing tricks on body text, only on uppercase micro-labels.

---

## 3. Application Shell

### Sidebar
- Fixed width ~232px, `--bg` background (same tone as the page — the separation comes from the content area's own surfaces, not from a colored sidebar).
- Top: small square logo mark + product name (bold, `--text`) with a one-line role/tenant label beneath in `--text-secondary` (e.g. "Administrador").
- Sections grouped under uppercase micro-labels (`PUNTO DE VENTA`, `CATÁLOGO`, `OPERACIONES`, `ADMINISTRACIÓN`) — plain gray caps, no icon, no divider line needed if spacing is generous (~24px above each group).
- Nav item: icon (16–18px, stroke) + label, `padding: 10px 12px`, `border-radius: 8px`. Default state transparent with `--text-secondary`/icon-muted. **Active state**: `--surface` background fill (a neutral gray highlight, never a colored one), text and icon promoted to `--text`.
- Bottom of sidebar, pinned: a theme toggle row ("Modo claro" + icon), then a user row: avatar circle (initial letter, `--surface-elevated` bg, `--text`), name (`--text`, 14px 500) + email (`--text-muted`, 12px), trailing chevron for a menu.

### Page header
- Title (h1) left, subtitle directly beneath.
- Action buttons top-right, ordered secondary → secondary → primary (e.g. "Modo edición", "Importar", "Nuevo"). Primary is always the rightmost/most-solid button.

### Filter row
- Search input (leading icon, `Buscar por…` placeholder) grows to fill remaining space; 1–2 select dropdowns beside it, fixed width, trailing chevron. All inputs share the same `--surface` bg + `--border` outline + 8px radius + 40px height.

---

## 4. Buttons

No button ever uses a colored/gradient fill. Hierarchy is expressed through fill vs. outline, not hue.

```css
/* Primary — solid light fill, dark text. Reserved for the single main action. */
.btn-primary {
  background: var(--text);      /* near-white */
  color: var(--bg);
  border: 1px solid var(--text);
  border-radius: 8px;
  padding: 10px 18px;
  font-weight: 500;
}
.btn-primary:disabled {
  background: var(--surface);
  color: var(--text-muted);
  border-color: var(--border);
  cursor: not-allowed;
}

/* Secondary — outline, for everything else (Importar, Modo edición, Exportar) */
.btn-secondary {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-medium);
  border-radius: 8px;
  padding: 10px 18px;
}
.btn-secondary:hover { background: rgba(255,255,255,0.04); }

/* Destructive — used only inside danger zones / delete confirmations */
.btn-danger {
  background: var(--danger);
  color: #1a0a0a;
  border: 1px solid var(--danger);
}
```

- A large full-width primary button (e.g. "Cobrar" in checkout) follows the same disabled logic: it looks solid/light once the form is valid, and drops to a flat muted gray with muted text when disabled (e.g. total is C$ 0.00) — the disabled state must be unmistakably inert, not just slightly dimmed.
- A row-level action button inside a table (e.g. "Agregar") is small, icon + label, same secondary style, and switches to a fully muted/disabled look when the row's stock is 0.
- Radius is 8px everywhere except pills (999px, see Badges).

---

## 5. Tables

The table is the primary content type in this style. Get it right.

```css
.table-header th {
  font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-secondary); font-weight: 600;
  padding: 12px 16px; text-align: left;
  border-bottom: 1px solid var(--border-medium);
}
.table-row td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.table-row:hover { background: rgba(255,255,255,0.02); }
```

- Primary column (name) stacks two lines: bold `--text` name, then a smaller `--text-secondary` line for category/subtype directly beneath with no extra gap (`line-height: 1.3`).
- Numeric columns (price) are plain `--text`, no bold unless it's the row's key metric.
- A "quantity/stock" column combines a **colored number** + a **neutral pill badge** for the unit (see Badges below): the number's color communicates urgency, the pill is purely informational.
- Never zebra-stripe rows. Separation comes from the 1px `--border` only.
- Pagination sits bottom-right of the table container: text buttons "Anterior" / "Siguiente" (`--text-secondary`, disabled when at an edge) flanking numbered page buttons — inactive pages are `--surface` bg + `--text-secondary`, the active page is `--text` bg + `--bg` text (same treatment as a primary button, small size).

---

## 6. Badges & Status Numbers

Two distinct, non-interchangeable patterns:

**Neutral pill badge** — for a unit, type, or category label with no urgency (e.g. "Botella", "Caja ×12", "Paquete x6"):
```css
.badge {
  display: inline-flex; align-items: center;
  background: var(--surface); color: var(--text-secondary);
  border-radius: 999px; padding: 3px 10px; font-size: 12px;
}
```

**Colored status number** — a bare number (no pill, no background), colored by threshold:
- `--text` (default) — healthy stock, no attention needed.
- `--warning` — at or below a low-stock threshold.
- `--danger` — zero / out of stock.

These two patterns are frequently placed side by side in the same cell (`3  Botella`): the number carries the urgency signal, the pill carries the descriptive metadata. Never color the pill itself.

Trend indicators (stat cards) use a small filled triangle + percentage, inline:
- `▲ 12.4% vs anterior` in `--success`
- `▼ 8.1% vs anterior` in `--danger`
- Muted trailing text ("vs anterior") always in `--text-muted`, never colored.

---

## 7. Cards & Stat Cards

```css
.card {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 24px;
}
```

- No shadow by default; if elevation must be stronger (e.g. a dropdown, the slide-over panel), use a soft `0 8px 30px rgba(0,0,0,0.35)` — subtle, never glowing, never colored.
- **Stat card**: label (uppercase, `--text-secondary`) on top, large bold number below, trend line beneath that. Three stat cards typically sit in a row at the top of a reports page.
- **Chart card**: a title (plain text, 14–15px semibold, not a bracket-label), the chart itself, and — for line charts — a small footer strip of secondary stats (e.g. TOTAL / MEJOR DÍA / PERIODOS) each as label-over-value pairs, same treatment as a mini stat card.
- Cards never use a colored border for emphasis. If a card must stand out, use `--border-medium` or a slightly brighter `--surface-elevated`, not an accent-colored outline.

---

## 8. Slide-over / Detail Panels

For "view details" or "edit" interactions, prefer a right-side slide-over panel over a centered modal when the underlying list should stay visible.

- Fixed width (~400–430px), `--surface-elevated` background, sits above a scrim.
- Header: title (bold, `--text`) + close (×) icon button, top-right.
- An intro block: the entity's primary name (bold) + secondary identifier (e.g. barcode) in `--text-secondary`, on a slightly recessed `--surface` card.
- Content organized into labeled sections (`DATOS GENERALES`, `INFORMACIÓN COMERCIAL` — uppercase, `--text-secondary`, 11–12px), each a 2-column grid of `label (small, muted) / value (bold, --text)` pairs, separated from the next section by a `--border` divider.
- A section can carry a small trailing action ("Editar" with a pencil icon) — treat as a tertiary text link, `--text-secondary`, no button chrome.
- A muted one-line note can clarify where a field is actually managed if it's read-only here ("Precio, costo y stock se gestionan desde Inventario").
- Primary actions stack at the bottom: an outline button for navigation ("Ir a Inventario →"), a solid `--text`-filled button for the main action ("Cerrar" / "Guardar").
- **Danger zone**: its own card at the very bottom, with a `--danger`-tinted background (`rgba(229,72,77,0.08)`) and a `--danger` border, a bold `--danger` heading ("ZONA DE PELIGRO"), a muted explanatory line, and a destructive button. This is the *only* place a colored border/background on a card is acceptable — because it is, deliberately, the one thing that should not look calm.

---

## 9. Charts

- **Line chart**: single series in `--info` (blue), 2px stroke, small filled dots at data points, dashed horizontal gridlines in `--border`, axis labels in `--text-muted` (11–12px, can be lightly monospaced for numeric axes).
- **Donut chart**: hollow center, segments in the fixed categorical palette (`--chart-1..6`) in a stable order so the same category always gets the same color. Pair with a legend list, not on-chart labels: colored dot + category name (left, `--text-secondary`) + value (right, `--text`, tabular numerals).
- No 3D, no drop shadows on chart elements, no gradient fills inside chart segments.
- Segmented toggle above a table ("Ingresos" / "Cantidad") uses a pill-shaped track (`--surface`, `border-radius: 999px`) with the active option as a `--surface-elevated` or `--text`-on-`--bg` filled pill sliding inside it — same visual language as the pagination active state.

---

## 10. Forms & Inputs (checkout / settings)

- All inputs: `--surface` background, `1px solid var(--border)`, `8px` radius, `40px` height, `--text` value, `--text-muted` placeholder.
- Label sits above the input, `--text-secondary`, 13px, `margin-bottom: 6px`.
- A running total/summary block (e.g. checkout) is a stack of label/value rows (`Subtotal`, `Descuento %`, `— Descuento`) each `--text-secondary` label / `--text` value, right-aligned values, ending in a visually distinct **TOTAL** row: larger bold label + very large bold number, separated from the rows above by a `--border-medium` divider.
- Custom checkbox: a plain square outline (`--border-medium`, 4px radius) that fills with `--text` (or `--info` if you want a functional-but-still-neutral checked state) and a check glyph when active — never a colored checkbox track.
- Empty states (e.g. "Escanea un producto o busca un servicio"): a large muted line-icon (28–32px, `--text-muted`, low opacity) centered, with a single line of `--text-muted` caption beneath. No illustration, no color.

---

## 11. Icons

- SVG line icons only (Lucide/Phosphor, outline weight, 1.5–1.75px stroke), 16–20px depending on context (18px nav, 16px table/inline, 20–24px empty states).
- Icons inherit text color for their context — muted in secondary buttons/labels, `--text` when active/primary, semantic color only when the icon *is* the status (a warning triangle, a success check, a trash icon in a danger zone).
- Never place icons in a colored/gradient container. If an icon needs a container (rare in this dense style), use a `--surface` square with `--border`, matching the feature-card container idea but flat and small.

---

## 12. Motion

Kept minimal — this is a tool, not an experience:
- Hover states: background/opacity transitions only, ~150ms ease.
- Slide-over panel: translate-in from the right, ~200ms ease-out, with a fading scrim.
- Row hover: instant-feeling background tint, no delay.
- No scroll-reveal, no count-up numbers, no marquees, no pulsing buttons, no skeleton shimmer beyond a simple opacity pulse if used at all.
- Respect `prefers-reduced-motion`.

---

## 13. Spacing

Base unit 4px. Common values: `8 / 12 / 16 / 20 / 24 / 32 / 40`.
- Table cell padding: `14px 16px`.
- Card padding: `20–24px`.
- Section vertical rhythm on a page: `24–32px` between major blocks (header → filters → table), not the 120px+ used on marketing pages — this is a dense, above-the-fold-first layout.

---

## 14. Anti-Slop Checklist

Before considering a dashboard screen done, verify:

- [ ] No brand accent color anywhere except charts/status (buttons, borders, active nav are neutral)
- [ ] No gradients, glow, orbs, or grain texture anywhere
- [ ] Semantic colors used consistently: green=success/positive, red=danger/zero/destructive, amber=warning/low, blue=info/primary chart series
- [ ] Every numeric/status value is colored *only* when its state warrants it — most numbers stay neutral `--text`
- [ ] Table rows are separated by hairlines, not shadows or zebra stripes
- [ ] Primary button is solid light-on-dark, used exactly once per view
- [ ] Disabled buttons/rows are unambiguously inert (flat, muted, no hover)
- [ ] Sidebar active state is a neutral surface highlight, not a colored pill or colored text
- [ ] Danger zone is the only place a colored card border/background appears
- [ ] Pills describe metadata (units, categories); colored bare numbers describe urgency — never mixed up
- [ ] No decorative icons, no icon fonts, no emoji
- [ ] Page still reads fine with all motion disabled
- [ ] Layout stays dense and functional, not padded out like a landing page

---

## 15. Technology

```text
React + Tailwind CSS (or plain CSS variables)
lucide-react for icons
recharts / a lightweight chart lib for line + donut charts
```

Keep the component set small and reused everywhere: one `Table`, one `Card`, one `Badge`, one `Button` (with `variant="primary" | "secondary" | "danger"`), one `SlideOver`. Consistency across screens matters more than any single screen looking clever.

---

## Final Principle

**In a dashboard, color is a signal, not a decoration.** If a designer could point at any colored pixel on screen and you can't say *why* it's that color — what state, what meaning — remove the color. The rest of the interface's quality comes from density, alignment, and restraint, exactly like `dark-luxury`, but applied to a tool people work in all day rather than a page people visit once.

See `DESIGN.md` for the full token reference and component specs.
