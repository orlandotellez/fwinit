---
name: minimal-light-design
description: Design and build websites and web apps in the "Minimal Light" style — clean near-white backgrounds, generous whitespace, editorial typography, one restrained accent color, hairline borders, and subtle motion. Calm, precise, confident without decoration. Use this skill whenever someone asks for "minimal", "clean white", "light minimal", "editorial minimal", "all-white", "simple and elegant", "less is more", "white space", "minimalist SaaS" design, or similar — including Spanish: "minimalista", "blanco limpio", "light", "limpio y elegante", "simple", "mucho espacio en blanco", "estilo editorial limpio". Do NOT use this skill for dark, premium/luxury, brutalist, or glassmorphism styles — those have their own design skills. Always use this skill — do NOT attempt minimal light design from memory alone.
---

# Minimal Light Design Skill

---

## Step 1 — Clarify First

Ask before writing code. Skip to defaults if user says so.

1. **Accent**: Indigo `#4f46e5` *(default)* · Black `#111111` · Cobalt `#2563eb` · Forest `#1a7f4e` · Custom hex
2. **Background**: Off-white `#fafafa` *(default)* · Pure white `#ffffff` · Warm paper `#f7f5f0`
3. **Font**: Geometric sans *(default)* · Editorial serif (headings) + sans (body)
4. **Type**: Landing page *(default)* · Web app · Portfolio · Other
5. **Sections** (default): Hero, Logos, Features, Stats, Testimonials, Pricing, FAQ, CTA, Footer

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
  --text-primary: #111111;   --text-muted:   #686868;
  --text-faint:   #9c9c9c;
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

### ④ Headlines — sharp, tight, inverse color contrast
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
- Thin weights (300–400) ARE allowed in minimal light — use 400 for body, 600–700 for headings. Contrast = weight AND one accent word. No gradient text.

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

### ⑥ Section labels — tiny uppercase, not bracketed
```css
.section-label { font-size:var(--text-label); font-weight:600; letter-spacing:0.12em;
  text-transform:uppercase; color:var(--text-faint); display:block; margin-bottom:16px; }
```
- This is the OPPOSITE of dark-luxury's `[Label]` monospace — minimal light uses quiet uppercase text, `text-faint`.

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
- Logo left (wordmark, weight 700), links center `var(--text-muted)`, CTA right.

### ⑩ Imagery
- Product screenshots on white/muted background at natural exposure (`brightness(1) contrast(1)`) — never dark-treated, never grayscale-filtered, no grain. Abstract imagery: soft gradients at low opacity.

---

## Step 4 — Animations (subtle, all required)

```css
.reveal { opacity:0; transform:translateY(12px);
  transition:opacity var(--dur-enter) var(--ease-out), transform var(--dur-enter) var(--ease-out); }
.reveal.visible { opacity:1; transform:translateY(0); }
.logo-marquee .track { display:flex; gap:64px; width:max-content;
  animation:marquee 40s linear infinite; mask-image:linear-gradient(to right,transparent,black 15%,black 85%,transparent); }
@keyframes marquee { to { transform:translateX(-50%); } }
```
- Hover: `translateY(-1px)` + border-darken (220ms). No scale, no glows, no continuous pulses.
- Scroll reveal offset 12px (dark-luxury uses 20px) — minimal light moves LESS.

---

## Step 5 — Anti-Pattern Checklist

- [ ] Shadows everywhere → **hairline borders; shadows only on overlays**
- [ ] Second accent color / rainbow micro-charts → **one accent, surgical use**
- [ ] Dark section blocks → **stay light; contrast via white on off-white**
- [ ] Gradient headline text → **solid near-black text, one accent word**
- [ ] Heavy card illustrations → **quiet icon + text rows**
- [ ] Glow/pulse animations → **150–220ms micro-transitions only**
- [ ] Cluttered hero → **one headline, one subline, one CTA pair, one visual**
- [ ] Grain textures, orbs, neon → **none of that belongs here**

---

## Step 6 — Page Structure & Stack

**Structure:** Nav → Hero (label + headline + sub + CTAs + product visual) → Logo marquee → Features (3-col quiet rows) → Stats (large numbers, huge whitespace) → Testimonials (2-col, hairline cards) → Pricing (3-col, accent ring featured) → FAQ (border-rows accordion) → CTA → Footer (hairline top border, 4 columns)

**React:** `lucide-react` for icons · Tailwind for layout only · tokens as CSS variables
**HTML:** All tokens on `:root` · no framework needed