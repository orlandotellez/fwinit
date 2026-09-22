---
name: glassmorphism-design
description: Design and build websites and web apps in the "Glassmorphism" style — frosted glass panels with backdrop blur, translucent layers, soft gradient aurora backgrounds, subtle light borders, floating depth, and gentle ambient glow. Dreamy, modern, airy, dimensional. Use this skill whenever someone asks for "glassmorphism", "glass effect", "frosted glass", "glassy", "translucent", "blur backgrounds", "aurora", "gradient gradient background", "crystal ui", "glass ui" or similar — including Spanish: "glassmorphism", "efecto vidrio", "cristal", "vidrio esmerilado", "translúcido", "blur", "fondo aurora", "gradientes suaves", "estilo cristal". Do NOT use this skill for dark luxury, minimal light, or neo-brutalist — those have their own design skills. Always use this skill — do NOT attempt glassmorphism design from memory alone.
---

# Glassmorphism Design Skill

---

## Step 1 — Clarify First

Ask before writing code. Skip to defaults if user says so.

1. **Mode**: Dark aurora *(default)* · Light aurora · Light pastel
2. **Primary Hue**: Violet `#7c5cff` *(default)* · Blue `#3b82f6` · Pink `#f472b6` · Teal `#2dd4bf` · Custom
3. **Blur Strength**: Soft 16px *(default)* · Strong 28px · Subtle 8px
4. **Type**: Landing page *(default)* · Web app dashboard · Portfolio · Other
5. **Sections** (default): Hero, Features, Stats, Pricing, Testimonials, FAQ, CTA, Footer

---

## Step 2 — Tokens

```css
:root {
  /* Aurora background — two or three soft radial gradients, never flat */
  --bg-gradient: radial-gradient(at 20% 0%, rgba(124,92,255,0.35), transparent 55%),
                 radial-gradient(at 80% 10%, rgba(59,130,246,0.30), transparent 50%),
                 radial-gradient(at 50% 100%, rgba(244,114,182,0.22), transparent 60%),
                 linear-gradient(180deg, #0b0b17, #10101f);
  --glass-bg:        rgba(255,255,255,0.06);
  --glass-bg-strong: rgba(255,255,255,0.12);
  --glass-border:    rgba(255,255,255,0.18);
  --glass-border-hi: rgba(255,255,255,0.32);
  --text-primary: #f4f4ff;  --text-muted: rgba(244,244,255,0.65);
  --text-faint:  rgba(244,244,255,0.40);
  --accent: #a78bfa;        --accent-strong: #8b5cf6;
  --accent-glow: rgba(139,92,246,0.35);
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --text-display: clamp(46px,6.5vw,80px); --text-h2: clamp(28px,3vw,42px);
  --text-h3: clamp(17px,1.6vw,21px);
  --text-body: 16px; --text-sm: 14px; --text-label: 12px;
  --blur-soft: 16px; --blur-strong: 28px;
  --r-md: 12px; --r-lg: 20px; --r-xl: 28px; --r-pill: 999px;
  --ease-out: cubic-bezier(0.16,1,0.3,1);
  --dur-fast: 180ms; --dur-base: 300ms; --dur-enter: 700ms;
}
/* Light mode: swap the gradient line for pastel radials and use:
   --glass-bg: rgba(255,255,255,0.55); --glass-border: rgba(255,255,255,0.65);
   --text-primary:#1a1a2e; --text-muted:rgba(26,26,46,0.6); */
```

---

## Step 3 — The Rules (follow exactly)

### ① Glass needs a busy background to exist
- NEVER put a glass panel on a flat background — the blur has nothing to show. Aurora gradients, images, or animated orbs MUST sit behind every glass layer.
- Background layers: `position: fixed` aurora container, `z-index: -1`, plus optional slow-drifting orbs (`filter: blur(80px)`).

### ② The glass recipe — the ONLY way
```css
.glass { background:var(--glass-bg);
  backdrop-filter:blur(var(--blur-soft)) saturate(1.6);
  -webkit-backdrop-filter:blur(var(--blur-soft)) saturate(1.6);
  border:1px solid var(--glass-border);
  border-radius:var(--r-lg);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15),
              0 8px 32px rgba(0,0,0,0.35); }
.glass:hover { border-color:var(--glass-border-hi); background:var(--glass-bg-strong); }
```
- `background: rgba(255,255,255,0.06)` + `backdrop-filter: blur(16px) saturate(1.6)` + 1px `rgba(255,255,255,0.18)` border + inset top highlight. Exactly this stack — it is the entire aesthetic.
- `saturate(1.6)` on the blur is what makes the aurora colors glow through the glass. Do not drop it.
- Active/focused glass (modals, cards in view): stronger `--glass-bg-strong` + brighter border.

### ③ Depth stack — layers, not flat cards
- Page = aurora (far) → glass panels (mid) → floating content (near, `z-index` above glass).
- Floating elements (CTAs, icons, chips) get `translateY(-2px)` hover and a soft ambient glow — they hover ABOVE the glass.
- Overlap panels deliberately: negative margins, partially overlapping cards. Glassmorphism is a depth composition, not a grid of boxes.

### ④ Typography — airy, gradient-able, letterspaced
```css
.display { font-size:var(--text-display); font-weight:700; letter-spacing:-0.02em;
  line-height:1.08; color:var(--text-primary); }
.text-gradient { background:linear-gradient(92deg,#f4f4ff 20%,#a78bfa 60%,#f472b6 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent; }
```
- Headlines: 700, tight line-height. Key words may use a soft gradient text (violet→pink) — the ONE place gradients belong in this system.
- Body: `--text-muted` with `text-faint` for captions. Generous line-height (1.7).

### ⑤ Buttons — one filled glow dot, one glass ghost
```css
.btn { display:inline-flex; align-items:center; gap:8px; padding:12px 26px; border-radius:var(--r-pill);
  font-size:14px; font-weight:600; cursor:pointer; transition:all var(--dur-base) var(--ease-out); }
.btn-primary { background:linear-gradient(135deg,var(--accent),var(--accent-strong));
  color:#fff; border:none; box-shadow:0 0 24px var(--accent-glow); }
.btn-primary:hover { box-shadow:0 0 40px var(--accent-glow); transform:translateY(-1px); }
.btn-ghost { background:var(--glass-bg); color:var(--text-primary);
  border:1px solid var(--glass-border); backdrop-filter:blur(var(--blur-soft)) saturate(1.6); }
.btn-ghost:hover { border-color:var(--glass-border-hi); background:var(--glass-bg-strong); }
```
- Primary: gradient pill + ambient glow (the one glowing element per viewport).
- Ghost: glass pill. Pills (999px) are correct here — rounded is the glass language.

### ⑥ Section labels — small glass chips
```css
.section-label { display:inline-flex; align-items:center; gap:8px; padding:6px 14px;
  font-size:var(--text-label); font-weight:600; letter-spacing:0.08em; text-transform:uppercase;
  color:var(--text-muted); background:var(--glass-bg); border:1px solid var(--glass-border);
  border-radius:var(--r-pill); backdrop-filter:blur(var(--blur-soft)) saturate(1.6); }
```

### ⑦ Cards — glass, always with icon or visual layer
- Glass card + icon in a floating glass square (`48×48`, radius 14, `--glass-bg-strong`, border hi) overlapping the card's top edge.
- No solid backgrounds for cards. If a card MUST be solid (dense table), use `rgba(16,16,31,0.6)` + tiny blur, never opaque.

### ⑧ Stats & numbers — gradient numerals on glass
- Numbers 64–96px, weight 700; `text-gradient` on the number or plain `text-primary` with a small gradient underline chip.
- Stat card = glass panel, optional countup.

### ⑨ Pricing — glass columns, featured = brighter + glow ring
- Columns: glass. Featured middle: `--glass-bg-strong`, border `--glass-border-hi`, plus `box-shadow: 0 0 0 1px rgba(167,139,250,0.4), 0 0 40px var(--accent-glow)`.
- Checkmark: filled accent circle with white `✓` SVG.

### ⑩ Imagery & decoration
- Product screenshots: inside glass frames — a `glass` panel with the image clipped inside, or image with glass frame overlay.
- Orbs: 2–4 large blurred color spheres (violet, blue, pink) drifting slowly behind glass. Pure decoration, `pointer-events:none`, `opacity:0.5–0.7`.
- Noise: a *very* subtle grain (2–3% opacity) can ground the glass — optional, never at dark-luxury's 4%.

---

## Step 4 — Animations (floating, all required)

```css
.reveal { opacity:0; transform:translateY(24px) scale(0.98);
  transition:opacity var(--dur-enter) var(--ease-out), transform var(--dur-enter) var(--ease-out); }
.reveal.visible { opacity:1; transform:translateY(0) scale(1); }
.orb { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none;
  animation:drift 18s ease-in-out infinite alternate; }
@keyframes drift { from{transform:translate(0,0) scale(1)} to{transform:translate(40px,-30px) scale(1.15)} }
.card-float { transition:transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out); }
.card-float:hover { transform:translateY(-4px); box-shadow:0 16px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18); }
```
- Everything floats: -4px hover lifts, 300ms easeOut. Orbs drift 18s. Reveal rises 24px with a touch of scale — entering feels like settling into depth.

---

## Step 5 — Anti-Pattern Checklist

- [ ] Glass on a flat/solid background → **always an aurora or image behind the blur**
- [ ] Missing `saturate(1.6)` on backdrop-filter → **saturation is what makes colors glow through**
- [ ] Opaque solid cards → **translucent `rgba(255,255,255,0.06–0.12)` + blur**
- [ ] Sharp-cornered panels → **radius 20–28px; glass is soft**
- [ ] Square buttons → **pills (999px) are the glass language**
- [ ] Heavy black shadows → **soft ambient shadows + inset top highlight**
- [ ] Flat single-color headlines → **gradient text IS allowed on key words**
- [ ] More than one glowing element per viewport → **one primary glow; ghosts stay quiet**
- [ ] No depth/stacking → **overlap panels, negative margins, floating elements**

---

## Step 6 — Page Structure & Stack

**Structure:** Aurora bg (fixed) → Nav (glass pill bar floating) → Hero (headline + gradient word + CTA pair over glass dashboard mock) → Logo row (glass chips) → Features (3 glass cards, icon floating) → Stats (glass + gradient numerals) → Testimonials (glass quotes) → Pricing (3 glass columns, featured brighter) → FAQ (glass accordion) → CTA (glow gradient panel) → Footer (glass panel, floating)

**React:** `lucide-react` for icons · Tailwind for layout only · tokens as CSS variables
**HTML:** All tokens on `:root` · no framework needed