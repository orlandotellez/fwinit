---
name: neo-brutalist-design
description: Design and build websites and web apps in the "Neo-Brutalist" style — bold saturated colors, thick black borders, hard offset shadows with zero blur, raw exposed grids, chunky display typography, and visible structure. Loud, confident, subversive, playful. Use this skill whenever someone asks for "brutalist", "neo-brutalist", "brutalism", "hard shadows", "raw", "bold borders", "tough design", "ugly-beautiful", "punk web design", or similar — including Spanish: "brutalista", "neo-brutalista", "estilo bruto", "sombras duras", "bordes negros gruesos", "diseño crudo", "atrevido y directo". Do NOT use this skill for dark luxury, minimal light, or glassmorphism — those have their own design skills. Always use this skill — do NOT attempt brutalist design from memory alone.
---

# Neo-Brutalist Design Skill

## Coverage Contract — the ENTIRE app

Neo-Brutalist is a **full-application design system**, not a section style.
When the user asks for it — "hacelo brutalista", "use the neo-brutalist
skill", "brutalist design", or any of the description triggers — apply it to
EVERYTHING: every route, every page, every component, both **public pages and
private/administrative views** (dashboards, admin panels, auth flows, CRUD
screens, settings). Partial application is a **DEFECT**: if any view does not
follow this system, keep working until the whole app is consistent before
declaring the task done. Never scope the style to the section you are currently
editing — a design skill request always means the entire application.

---

## Step 1 — Clarify First

Ask before writing code. Skip to defaults if user says so.

1. **Base Accent**: Electric Yellow `#ffd60a` *(default)* · Hot Pink `#ff2e88` · Acid Green `#b6ff00` · Sky Blue `#00a8ff` · Custom hex
2. **Background**: Off-white `#f5f3ef` *(default)* · Flat white `#ffffff` · Paper `#fdf6e3`
3. **Border**: Black `#000000` *(default)* · Ink `#1a1a1a`
4. **Type**: Landing page *(default)* · Web app · Portfolio · Editorial · Other
5. **Sections** (default): Hero, Marquee, Features, Stats, Pricing, Testimonials, FAQ, CTA, Footer

---

## Step 2 — Tokens

```css
:root {
  --ink:           #000000;
  --bg-base:       #f5f3ef;   --bg-panel: #ffffff;
  --accent:        #ffd60a;   --accent-2:  #ff2e88;
  --accent-3:      #b6ff00;
  --text-primary:  #000000;   --text-muted: #4a4a4a;
  --border-w:      3px;       --border-color: var(--ink);
  --shadow-hard:   6px 6px 0 0 var(--ink);
  --shadow-hard-sm: 4px 4px 0 0 var(--ink);
  --shadow-hard-lg: 8px 8px 0 0 var(--ink);
  --font-display: 'Archivo Black', 'Anton', Impact, sans-serif;
  --font-body: 'Space Grotesk', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
  --text-display: clamp(52px,8vw,110px);
  --text-h2: clamp(34px,4.5vw,56px);
  --text-h3: clamp(20px,2vw,26px);
  --text-body: 16px; --text-sm: 14px; --text-label: 13px;
  --r-none: 0px; --r-sm: 4px; --r-md: 8px;
  --ease-out: cubic-bezier(0.16,1,0.3,1);
  --dur-fast: 120ms; --dur-base: 200ms;
}
```

---

## Step 3 — The Rules (follow exactly)

### ① The hard shadow is sacred — offset solid, ZERO blur
```css
.card, .btn { box-shadow:var(--shadow-hard); }
.card:active, .btn:active { box-shadow:var(--shadow-hard-sm); transform:translate(2px,2px); }
```
- Shadow = solid color (black default), `Npx Npx 0 0`, no blur, no spread, no softness. This is the signature — never soften it.

### ② Thick borders everywhere
- Default border: `3px solid #000`. Cards, buttons, inputs, images, logo boxes.
- On accent panels the border stays black. On the accent-filled button the border stays black. Black border is non-negotiable.

### ③ Raw colors, full saturation, no gradients
- Palette: one dominant accent + black + off-white. Accent fills are FLAT — no gradients, no transparency layers, no glow.
- Rotate accent by section to keep energy: hero yellow, features pink, pricing green. Never more than one accent per section.

### ④ Typography — chunky and loud
```css
.display { font-family:var(--font-display); font-size:var(--text-display);
  text-transform:uppercase; line-height:0.95; letter-spacing:-0.02em; color:var(--ink); }
.display .highlight { background:var(--accent); display:inline-block;
  padding:0 8px; box-shadow:var(--shadow-hard-sm); }
```
- Display font: Archivo Black / Anton / Impact — heavy weights only (900 or the only weight the font ships).
- Uppercase everywhere for headings. Underline words with the accent block (like highlighter) — not borders, not gradients.
- Body: Space Grotesk 400–500. Mono for labels and metadata.

### ⑤ Buttons — filled accent, black border, hard shadow
```css
.btn { display:inline-flex; align-items:center; gap:8px; padding:14px 26px;
  font-family:var(--font-body); font-weight:700; font-size:15px; text-transform:uppercase;
  background:var(--accent); color:var(--ink);
  border:var(--border-w) solid var(--border-color); border-radius:var(--r-sm);
  box-shadow:var(--shadow-hard); cursor:pointer;
  transition:transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out); }
.btn:hover { transform:translate(-2px,-2px); box-shadow:var(--shadow-hard-lg); }
.btn:active { transform:translate(2px,2px); box-shadow:var(--shadow-hard-sm); }
.btn-secondary { background:var(--bg-base); }
.btn-black { background:var(--ink); color:var(--bg-base); }
```

### ⑥ Section labels — mono uppercase with slash
```css
.section-label { font-family:var(--font-mono); font-size:var(--text-label); font-weight:600;
  text-transform:uppercase; letter-spacing:0.08em; color:var(--ink); margin-bottom:16px; }
```
- Format: `/// FEATURES` (triple slash prefix). Mono, black, uppercase — no brackets, no amber.

### ⑦ Cards — exposed grid, numbered, hard edges
```css
.card { background:var(--bg-panel); border:var(--border-w) solid var(--ink);
  border-radius:var(--r-md); box-shadow:var(--shadow-hard); padding:24px; position:relative; }
.card .index { position:absolute; top:-14px; left:16px; font-family:var(--font-mono);
  background:var(--accent); border:var(--border-w) solid var(--ink); padding:2px 8px; font-weight:700; }
```
- Every card gets structure: index badge `01`, `02`…, divider lines (1px black dashed or solid), explicit borders between elements. Brutalism shows its structure — no hidden elegance.

### ⑧ Stats — huge typographic, rotated accent blocks
- Numbers at 80–140px in display font, black. Behind them a rotated accent rectangle (`rotate(-2deg)`) or inline highlight block.
- Grid with visible 3px borders between cells. Alternative: marquee strip of `NUMBER + LABEL` looping.

### ⑨ Pricing — dead simple, no tiers games
- 3 columns, same flat card. Featured = accent background + black text list. Checkmarks: literal `✓` in a black square, or black check SVG. Prices in display font at 64px+.

### ⑩ Marquee strips — the energy layer
```css
.marquee { overflow:hidden; background:var(--ink); color:var(--bg-base);
  border-top:var(--border-w) solid var(--ink); border-bottom:var(--border-w) solid var(--ink);
  padding:12px 0; }
.marquee .track { display:flex; gap:48px; width:max-content; animation:marquee 18s linear infinite;
  font-family:var(--font-display); text-transform:uppercase; font-size:22px; }
@keyframes marquee { to { transform:translateX(-50%); } }
```
- Black strips with uppercase display text scrolling fast. Used between sections as separators — this is the brutalist rhythm.

---

## Step 4 — Animations (punchy, all required)

- **Hover**: translate(-2px,-2px) + bigger hard shadow → click: squish `translate(2px,2px)` + smaller shadow. 120ms.
- **Reveal**: `translateY(24px)` → 0 with a hard `steps(2)` easing or 400ms easeOut — elements SLAM in, they don't fade elegantly.
- **Marquee**: 18s linear — fast and constant.
- **Ticker**: If a live counter/ticker exists, mono numerals, black on accent chips.
- **No** glows, no blurs, no smooth gradients, no glass, no parallax softness.

---

## Step 5 — Anti-Pattern Checklist

- [ ] Soft/blurred shadows → **offset solid hard shadow `Npx Npx 0 0`, zero blur**
- [ ] Thin hairline borders → **3px black minimum**
- [ ] Gradients or glassmorphism (frosted panels) → **flat filled colors only**
- [ ] Elegant serif or light weights → **chunky display font, uppercase, weight 900**
- [ ] Rounded pill buttons (999px) → **max 8px radius; brutalism keeps the edge**
- [ ] Subtle micro-animations → **slam-in reveals, squish interactions, fast marquees**
- [ ] Hidden/clean structure → **numbered cards, visible dividers, exposed grid**
- [ ] A second color sneaking in per section → **one accent per section**

---

## Step 6 — Page Structure & Stack

**Structure:** Nav (black bar, logo block, mono links, CTA) → Hero (display headline w/ highlight block, halo CTA pair, floating accent shapes) → Marquee strip → Features (3-col numbered cards) → Stats (huge numbers, rotated accent blocks) → Pricing (3-col flat, accent featured) → Testimonials (2-3 col hard-edge quotes) → FAQ (accordion with bold borders) → CTA (full accent block section) → Footer (black bar, white text, mono links)

**React:** `lucide-react` for icons · Tailwind for layout only · tokens as CSS variables
**HTML:** All tokens on `:root` · no framework needed