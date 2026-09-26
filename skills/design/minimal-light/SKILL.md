---
name: minimal-light
description: Design and build websites and web apps in the "Minimal Light" style — clean near-white backgrounds, generous whitespace, editorial typography, one restrained accent color, hairline borders, and subtle motion. Calm, precise, confident without decoration. Use this skill whenever someone asks for "minimal", "clean white", "light minimal", "editorial minimal", "all-white", "simple and elegant", "less is more", "white space", "minimalist SaaS" design, or similar — including Spanish: "minimalista", "blanco limpio", "light", "limpio y elegante", "simple", "mucho espacio en blanco", "estilo editorial limpio". Do NOT use this skill for dark, premium/luxury, brutalist, or glassmorphism styles — those have their own design skills. Always use this skill — do NOT attempt minimal light design from memory alone.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.1"
---

# Minimal Light Design Skill

## Coverage Contract — the ENTIRE app

Minimal Light is a **full-application design system**, not a section style.
When the user asks for it — "hacelo minimalista", "use the minimal light
skill", "clean and minimal", or any of the description triggers — apply it to
EVERYTHING: every route, every page, every component, both **public pages and
private/administrative views** (dashboards, admin panels, auth flows, CRUD
screens, settings). Partial application is a **DEFECT**: if any view does not
follow this system, keep working until the whole app is consistent before
declaring the task done. Never scope the style to the section you are currently
editing — a design skill request always means the entire application.

---

## Step 1 — Clarify First

Ask before writing code. Skip to defaults if user says so.

1. **Accent**: Indigo `#4f46e5` *(default)* · Black `#111111` · Cobalt `#2563eb` · Forest `#1a7f4e` · Custom hex
2. **Background**: Off-white `#fafafa` *(default)* · Pure white `#ffffff` · Warm paper `#f7f5f0`
3. **Font**: Geometric sans *(default)* · Editorial serif (headings) + sans (body)
4. **Type**: Landing page *(default)* · Web app · Portfolio · Other
5. **Sections** (default): Hero, Logos, Features, Stats, Testimonials, Pricing, FAQ, CTA, Footer

The accent is the **only brand input**. If the user picks a custom accent,
verify it keeps ≥ 4.5:1 contrast against `--bg-base` for text usage (or ≥ 3:1
when used only on large display text / borders) — adjust lightness until it
passes and SAY SO, never silently ship a failing accent.

---

## Step 2 — Tokens

```css
:root {
  --bg-base:      #fafafa;   --bg-elevated:  #ffffff;
  --bg-inset:     #f2f2f2;   --bg-muted:     #ececec;
  --border:       rgba(17,17,17,0.08);
  --border-strong: rgba(17,17,17,0.16);
  --accent:       #4f46e5;   --accent-strong: #4338ca;
  --accent-soft:  rgba(79,70,229,0.08);
  --text-primary: #111111;   --text-muted:   #555555;
  --text-faint:   #6b6b6b;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --text-display: clamp(44px,6vw,72px);
  --text-h2: clamp(26px,3vw,40px); --text-h3: clamp(17px,1.5vw,20px);
  --text-body: 16px; --text-sm: 14px; --text-label: 12px;
  --tracking-tight: -0.03em; --leading-tight: 1.15; --leading-relaxed: 1.7;
  --r-sm: 6px; --r-md: 10px; --r-lg: 14px;
  --ease-out: cubic-bezier(0.16,1,0.3,1);
  --dur-fast: 150ms; --dur-base: 220ms; --dur-enter: 550ms;
}
```

---

## Step 3 — The Rules (follow exactly)

### ① Whitespace IS the design
- Section padding: 120–160px vertical. Cards: 24–40px internal. Never crowd.
- Grid: max-width 1120px, centered, 32px horizontal page padding.
- If a section feels busy, remove an element — do NOT add decoration.

### ② One accent, used surgically
- Accent appears in: primary button background, links, one key word per headline, focus states, small labels (11–12px uppercase).
- Everything else stays near-black on near-white. Never run a second accent color.

### ③ Hairline borders, no shadows
```css
.card { background:var(--bg-elevated); border:1px solid var(--border);
  border-radius:var(--r-md); }
.card:hover { border-color:var(--border-strong); }
```
- Elevation = background contrast (`#ffffff` on `#fafafa`) + hairline. Use shadows ONLY on modals/dropdowns, and only `0 8px 30px rgba(0,0,0,0.08)`.

### ④ Headlines — sharp, tight, weight and one accent word
```html
<h1 class="display">
  <span class="dim">Ship software</span><br>
  <span class="dim">that </span><span class="accent-word">focuses.</span>
</h1>
```
```css
.display { font-size:var(--text-display); font-weight:650; letter-spacing:var(--tracking-tight);
  line-height:var(--leading-tight); color:var(--text-primary); }
.accent-word { color:var(--accent); }
```
- Weights: 400 body, 600–700 headings. Contrast comes from weight, size and the single accent word — not from dimming or thinning text to extremes. Do not set headings below 600.
- No gradient text, no dimmed spans inside the headline beyond `--text-muted` on supporting lines (never on the main headline itself).

### ⑤ Buttons — filled primary, silent secondary
```css
.btn { display:inline-flex; align-items:center; gap:8px; padding:12px 24px; border-radius:var(--r-md);
  font-size:14px; font-weight:550; cursor:pointer; transition:all var(--dur-fast) var(--ease-out); }
.btn-primary { background:var(--accent); color:#fff; border:1px solid var(--accent); }
.btn-primary:hover { background:var(--accent-strong); border-color:var(--accent-strong); }
.btn-secondary { background:transparent; color:var(--text-primary); border:1px solid var(--border-strong); }
.btn-secondary:hover { border-color:var(--text-primary); }
.btn-sm { padding:8px 16px; font-size:13px; }
```

### ⑥ Section labels — quiet uppercase
```css
.section-label { font-size:var(--text-label); font-weight:600; letter-spacing:0.12em;
  text-transform:uppercase; color:var(--text-faint); display:block; margin-bottom:16px; }
```
- Quiet uppercase text in `--text-faint` — never monospace-bracketed labels (`[FEATURES]` is not this language), never accent-colored chips.

### ⑦ Feature cards — quiet rows, no illustration panels
- Icon (24px, 1.5px stroke, `var(--accent)`) in a 40×40px rounded square (`background:var(--bg-muted)`) + title + one-line description.
- Optional `+` expandable row instead of cards for very long content. Keep it calm.

### ⑧ Pricing — table-like, border rows, featured = accent ring
- 3-column with 1px `--border` dividers between columns. Featured middle card: `box-shadow:0 0 0 1px var(--accent)` ring + `var(--accent-soft)` background tint. No glow, no gradient.

### ⑨ Navigation — static white bar, hairline bottom border
```css
.nav { position:fixed; top:0; left:0; right:0; background:rgba(250,250,250,0.90);
  backdrop-filter:blur(12px); border-bottom:1px solid var(--border); z-index:200; }
```
- Logo left (wordmark, weight 700), links center `--text-muted`, CTA right. Mobile: collapse links into a simple menu; keep the hairline bar.

### ⑩ Imagery
- Product screenshots on white/muted background at natural exposure (`brightness(1) contrast(1)`) — never dark-treated, never grayscale-filtered, no grain. Abstract imagery: soft gradients at low opacity.

---

## Step 4 — Contrast & Accessibility (guardrails, non-negotiable)

Minimal light lives on low-contrast relationships — verify they stay readable:

- Body text (`--text-muted`) on `--bg-base`/`--bg-elevated`: ≥ 4.5:1. Muted is for supporting copy; it must still pass AA at body sizes.
- `--text-faint` is ONLY for large text (≥ 18.66px bold / 24px) or decorative
  metadata — it does NOT pass AA at body size. Never use it for body copy,
  inputs, or anything a user must read.
- White text on `--accent` (buttons): verify ≥ 4.5:1 for the chosen accent; if
  the accent is too light for white text, flip to dark text on accent.
- Focus states: `outline: 2px solid var(--accent)` + 2px offset on ALL
  interactive elements — hairline borders are not a focus indicator.
- Placeholder text: `--text-faint` minimum is fine visually, but the typed
  value must always be `--text-primary`.

---

## Step 5 — Animations (subtle, all required, with an off switch)

```css
.reveal { opacity:0; transform:translateY(12px);
  transition:opacity var(--dur-enter) var(--ease-out), transform var(--dur-enter) var(--ease-out); }
.reveal.visible { opacity:1; transform:translateY(0); }
.logo-marquee .track { display:flex; gap:64px; width:max-content;
  animation:marquee 40s linear infinite; mask-image:linear-gradient(to right,transparent,black 15%,black 85%,transparent); }
@keyframes marquee { to { transform:translateX(-50%); } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation:none !important; transition:none !important; }
  .reveal { opacity:1; transform:none; }
  .logo-marquee .track { animation:none; flex-wrap:wrap; justify-content:center; }
}
```
- Hover: `translateY(-1px)` + border-darken (220ms). No scale, no glows, no continuous pulses — the marquee (logo row) is the single exception.
- Scroll reveal offset 12px — minimal light moves LESS than other styles; reveals are a breath, not a show.
- With reduced motion: reveals shown, marquee replaced by a static wrapped logo row. The page must look finished with animations off.

---

## Step 6 — Responsive & Performance

- Grid collapses 3→1 columns; section padding scales down to 64–80px vertical on mobile (never remove whitespace entirely — it is the style).
- Typography scales via the `clamp()` tokens; check the display line-height holds at mobile sizes.
- Nav: hairline bar persists; links collapse into a simple dropdown without animations beyond a 150ms fade.
- Pricing columns stack with the featured plan first; keep the accent ring.
- Marquee: on small screens either slow it or swap to the static wrapped row — two moving rows on mobile feels chaotic.
- Performance: this style is naturally cheap — keep it that way. System-font fallback first in the stack, no web fonts beyond the one family, images `loading="lazy"` below the fold, no JS animation libraries (CSS transitions cover everything here).
- Touch targets ≥ 44px; keep `--r-md` radius consistent across breakpoints.

---

## Step 7 — Content (same restraint as the visuals)

Minimal design with noisy copy is a contradiction. The text does the work:

- Concrete language: say what the product does in plain words.
- No AI-slop phrases: "Unlock your potential", "Seamless experience", "Built for the modern...", "Next-generation" — unless literally true and necessary.
- No fake stats, no invented testimonials, no fake logo walls (only real customers/logos).
- Fewer words per section is on-style: one headline, one subline, one CTA pair.

---

## Step 8 — Anti-Pattern Checklist

- [ ] Shadows everywhere → **hairline borders; shadows only on overlays**
- [ ] Second accent color / rainbow micro-charts → **one accent, surgical use**
- [ ] Dark section blocks → **stay light; contrast via white on off-white**
- [ ] Gradient headline text → **solid near-black text, one accent word**
- [ ] Heavy card illustrations → **quiet icon + text rows**
- [ ] Glow/pulse animations → **150–220ms micro-transitions only**
- [ ] Cluttered hero → **one headline, one subline, one CTA pair, one visual**
- [ ] Grain textures, orbs, neon → **none of that belongs here**
- [ ] `--text-faint` on body copy → **it fails AA; muted for body, faint for large/decorative only**
- [ ] Missing focus outlines → **2px accent outline on every interactive element**
- [ ] Motion with no reduced-motion fallback → **static logo row, visible reveals**
- [ ] AI-slop copy or fake metrics/logos → **concrete, honest content only**

---

## Step 9 — Page Structure & Stack

**Structure:** Nav → Hero (label + headline + sub + CTAs + product visual) → Logo marquee → Features (3-col quiet rows) → Stats (large numbers, huge whitespace) → Testimonials (2-col, hairline cards) → Pricing (3-col, accent ring featured) → FAQ (border-rows accordion) → CTA → Footer (hairline top border, 4 columns)

Adapt sections to the real product — never pad with empty sections.

**React:** `lucide-react` for icons · Tailwind for layout only · tokens as CSS variables
**HTML:** All tokens on `:root` · no framework needed
