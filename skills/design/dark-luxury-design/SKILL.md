---
name: dark-luxury-design
description: Design and build websites and web apps in the "Dark Luxury" style — deep near-black backgrounds, warm metallic accents (gold/amber or silver/platinum), premium editorial typography, grain texture overlays, ambient glow lighting, and purposeful micro-animations. Inspired by high-end AI/SaaS products and luxury tech brands. Use this skill whenever someone asks to design or build anything in "dark luxury", "dark premium", "dark gold", "dark mode luxury", "high-end dark theme", or similar — even if phrased casually like "make it look premium and dark", "give it a luxury dark feel", "I want something elegant and dark", or "dark but premium". Also trigger on Spanish requests: "dark luxury", "lujo oscuro", "premium oscuro", "dorado oscuro", "negro premium", "elegante y oscuro", "oscuro pero premium", "estilo lujoso oscuro". For other styles (light minimal, brutalist, glassmorphism) a different design skill must be used instead. Always use this skill — do NOT attempt dark luxury design from memory alone.
---

# Dark Luxury Design Skill

## Coverage Contract — the ENTIRE app

Dark Luxury is a **full-application design system**, not a section style. When
the user asks for it — "hacelo dark luxury", "use the dark luxury skill",
"dark premium", or any of the description triggers — apply it to EVERYTHING:
every route, every page, every component, both **public pages and
private/administrative views** (dashboards, admin panels, auth flows, CRUD
screens, settings). Partial application is a **DEFECT**: if any view does not
follow this system, keep working until the whole app is consistent before
declaring the task done. Never scope the style to the section you are currently
editing — a design skill request always means the entire application.

---

## Step 1 — Clarify First

Ask before writing code. Skip to defaults if user says so.

1. **Accent**: Amber/Gold *(default)* · Silver/Platinum · Emerald/Jade · Crimson/Rose · Custom hex
2. **Background**: Warm black `#0a0907` *(default)* · Pure `#080808` · Cool `#07080a`
3. **Font**: Geometric sans-serif *(default)* · High-contrast serif
4. **Type**: Landing page *(default)* · Web app · Portfolio · Other
5. **Sections** (default): Hero, Features, Stats, Testimonials, Pricing, FAQ, CTA, Footer

---

## Step 2 — Tokens

```css
/* AMBER/GOLD (default) — swap values for other accents below */
:root {
  --bg-base:       #0a0907;  --bg-surface:    #100f0d;
  --bg-card:       #161412;  --bg-footer:     #141210;
  --border-subtle: rgba(255,248,230,0.07);
  --border-medium: rgba(255,248,230,0.13);
  --border-accent: rgba(212,160,60,0.55);
  --text-primary:  #f0ebe0;  --text-muted:    #5a544a;
  --text-body:     #8a8070;  --text-tertiary: #524c42;
  --font-mono:     'JetBrains Mono', monospace;
  --accent:        #d4a03c;  --accent-bright: #e8b84e;
  --accent-glow:   rgba(212,160,60,0.18);
  --accent-subtle: rgba(212,160,60,0.08);
  --success:       #3d9e5c;
  --grain-opacity: 0.04;
  /* Spacing: --sp-N = N*4px. e.g. --sp-6: 24px, --sp-8: 32px, --sp-12: 48px */
  --r-md: 10px; --r-lg: 16px; --r-xl: 20px; --r-pill: 999px;
  --ease-out: cubic-bezier(0.16,1,0.3,1);
  --dur-fast: 150ms; --dur-base: 220ms; --dur-enter: 600ms;
}
/* Silver:  --bg-card:#121316; --accent:#b4c0d4; --border-accent:rgba(180,190,215,0.50); --text-primary:#eceef5; --text-muted:#484d5c; --text-body:#808898 */
/* Emerald: --bg-card:#101410; --accent:#42b872; --border-accent:rgba(60,180,100,0.50);  --text-primary:#e8f2ec; --text-muted:#3a5042; --text-body:#708078 */
/* Crimson: --bg-card:#130f14; --accent:#c8385a; --border-accent:rgba(200,50,80,0.50);   --text-primary:#f2eaf0; --text-muted:#5a3848; --text-body:#907080 */
```

Typography:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --text-display: clamp(52px,7vw,96px); --text-h1: clamp(36px,4.5vw,60px);
  --text-h2: clamp(28px,3vw,44px);      --text-h3: clamp(17px,1.6vw,20px);
  --text-body: 16px; --text-sm: 14px;   --text-label: 11px;
  --tracking-tight: -0.03em; --tracking-widest: 0.10em;
  --leading-tight: 1.1; --leading-relaxed: 1.65;
}
```

Grain texture (required — body::before):
```css
body::before { content:''; position:fixed; inset:0; pointer-events:none; z-index:9999;
  opacity:var(--grain-opacity); mix-blend-mode:overlay; background-size:128px;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); }
```

---

## Step 3 — The 10 Rules (follow exactly)

### ① Section labels — `[Label]` bracket notation only
```css
.section-label { font-family:var(--font-mono); font-size:13px; color:var(--accent);
  letter-spacing:0.06em; display:block; margin-bottom:16px; }
```
Never `— Label —`. Always `[Features]` `[Pricing]` `[Foundation]` style.

### ② Headlines — COLOR contrast, not weight contrast
All headline words use the same bold weight (700–800). Contrast = some words in `--text-muted` (dark grey), key words in `--text-primary` (bright white).
```html
<h1 class="display-headline">
  <span class="hl-muted">Automate smarter.</span><br>
  <span class="hl-muted">Scale </span><span class="hl-bright cycling-word">faster.</span>
</h1>
```
```css
.display-headline { font-size:var(--text-display); font-weight:700;
  letter-spacing:var(--tracking-tight); line-height:var(--leading-tight); }
.hl-muted  { color:var(--text-muted); }
.hl-bright { color:var(--text-primary); }
/* Cycling word highlight box: */
.hl-highlight { background:rgba(212,160,60,0.20); padding:0 4px; border-radius:4px; }
```

### ③ Buttons — dark bg + amber BORDER, multi-layer always-visible glow
```css
.btn { display:inline-flex; align-items:center; gap:8px; padding:12px 24px;
  font-size:14px; font-weight:600; color:var(--text-primary);
  background:var(--bg-card); border-radius:var(--r-md); border:1px solid transparent;
  cursor:pointer; text-decoration:none;
  transition:box-shadow var(--dur-base) ease, border-color var(--dur-base) ease, transform var(--dur-fast) var(--ease-out); }

/* Primary: glow is ALWAYS visible — pulses between moderate and strong, never dark */
.btn-primary { border-color:var(--accent);
  box-shadow: 0 0 8px rgba(212,160,60,0.55), 0 0 20px rgba(212,160,60,0.25), 0 0 40px rgba(212,160,60,0.10);
  animation:btn-pulse 2.8s ease-in-out infinite; }
.btn-primary:hover { animation:none; border-color:var(--accent-bright); transform:translateY(-1px);
  box-shadow: 0 0 10px rgba(212,160,60,0.75), 0 0 28px rgba(212,160,60,0.40), 0 0 55px rgba(212,160,60,0.18); }
@keyframes btn-pulse {
  0%,100% { box-shadow: 0 0 8px rgba(212,160,60,0.55), 0 0 20px rgba(212,160,60,0.25), 0 0 40px rgba(212,160,60,0.10); }
  50%     { box-shadow: 0 0 10px rgba(212,160,60,0.70), 0 0 28px rgba(212,160,60,0.35), 0 0 52px rgba(212,160,60,0.16); } }

/* Secondary: dark bg, barely-visible grey border, no glow */
.btn-secondary { border-color:var(--border-medium); }
.btn-secondary:hover { border-color:rgba(255,248,230,0.28); background:rgba(255,255,255,0.03); }
.btn-sm { padding:8px 18px; font-size:13px; }
```

### ④ Cards — NO border, elevation via inset top highlight
```css
.card { background:var(--bg-card); border:none; border-radius:var(--r-lg);
  box-shadow: inset 0 1px 0 rgba(255,248,230,0.08), 0 4px 24px rgba(0,0,0,0.45);
  transition:transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) ease; }
.card:hover { transform:translateY(-2px);
  box-shadow: inset 0 1px 0 rgba(255,248,230,0.10), 0 12px 40px rgba(0,0,0,0.55); }
/* Featured card (e.g. pricing middle): */
.card.featured { box-shadow: inset 0 1px 0 rgba(255,248,230,0.10), 0 4px 24px rgba(0,0,0,0.45),
  0 0 0 1px var(--border-accent), 0 0 30px rgba(212,160,60,0.12); }
```

### ⑤ Feature cards — large illustration panel + text below
Top ~240px = dark media area (`background:#0e0c0a`, `border-bottom:1px solid var(--border-subtle)`). Text (title + desc) sits below with 24px padding. `overflow:hidden` on the card clips the media. No small icon container.

### ⑥ Technical metadata lines — monospace `//` separator pattern
```css
.arch-meta { font-family:var(--font-mono); font-size:11px; color:var(--text-tertiary);
  letter-spacing:0.04em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:4px 0 16px; }
```
Pattern: `3F1C9 // CONTEXT DEPTH: 12.4 // INSIGHT HASH: 7B` — invented but realistic. Use in architecture/foundation cards.

### ⑦ Hero — single elliptical orb, bottom-center + hero badge
```css
.hero-orb { position:absolute; bottom:-80px; left:50%; transform:translateX(-50%);
  width:900px; height:500px; border-radius:50%; filter:blur(40px); pointer-events:none;
  background:radial-gradient(ellipse at center bottom, rgba(180,100,15,0.28) 0%, rgba(150,75,10,0.12) 35%, transparent 70%);
  animation:orb-breathe 8s ease-in-out infinite alternate; }
@keyframes orb-breathe { from{opacity:0.8;transform:translateX(-50%) scale(1)} to{opacity:1;transform:translateX(-50%) scale(1.08)} }
/* Hero badge (pill above headline): */
.hero-badge { display:inline-flex; align-items:center; gap:8px; padding:8px 18px;
  background:rgba(255,255,255,0.05); border:1px solid var(--border-subtle);
  border-radius:var(--r-pill); font-size:14px; color:var(--text-body); margin-bottom:32px; }
```

### ⑧ Pricing cards — icon + tier inline, amber glow = featured (not bg change)
Icon in 42×42px square rounded container (`background:var(--bg-surface); border:1px solid var(--border-medium); border-radius:var(--r-md)`). Tier name beside it at ~26px bold. Checkmarks use small square checkbox SVG with amber stroke.

### ⑨ Footer — inside rounded elevated panel
```css
.footer-wrapper { padding:0 24px 24px; background:var(--bg-base); }
.footer-panel { background:var(--bg-footer); border-radius:var(--r-xl);
  box-shadow:inset 0 1px 0 rgba(255,248,230,0.06); padding:48px 48px 24px; }
/* Status badge: green dot + [ALL SYSTEMS OPERATIONAL] in --font-mono, color:var(--success) */
```

### ⑩ Navigation — transparent → blur on scroll
```css
.nav { position:fixed; top:0; left:0; right:0; z-index:200; }
.nav.scrolled { background:rgba(10,9,7,0.80); backdrop-filter:blur(16px) saturate(1.5);
  border-bottom:1px solid var(--border-subtle); }
/* Nav links: color:var(--text-body), hover:var(--text-primary). CTA = .btn.btn-primary.btn-sm */
```

---

## Step 4 — Animations (all required)

```css
/* Scroll reveal — attach to every major element */
.reveal { opacity:0; transform:translateY(20px);
  transition:opacity var(--dur-enter) var(--ease-out), transform var(--dur-enter) var(--ease-out); }
.reveal.visible { opacity:1; transform:translateY(0); }
/* Marquee */
.marquee { overflow:hidden; mask-image:linear-gradient(to right,transparent,black 12%,black 88%,transparent); }
.marquee-track { display:flex; width:max-content; animation:marquee 45s linear infinite; }
.marquee-group { display:flex; align-items:center; gap:60px; padding:0 30px; }
.marquee-group img,.marquee-group svg { height:24px; opacity:0.3; filter:grayscale(1); }
@keyframes marquee { to{ transform:translateX(-50%); } }
```
```js
// Scroll reveal with staggered siblings
const obs = new IntersectionObserver(e => e.forEach(x => {
  if(!x.isIntersecting) return;
  setTimeout(()=>x.target.classList.add('visible'), x.target.dataset.delay||0);
  obs.unobserve(x.target);
}),{threshold:0.08});
document.querySelectorAll('.reveal').forEach((el,_,all)=>{
  const s=Array.from(el.parentElement.querySelectorAll('.reveal'));
  if(!el.dataset.delay) el.dataset.delay=s.indexOf(el)*90;
  obs.observe(el);
});
// Countup
document.querySelectorAll('[data-countup]').forEach(el=>{
  new IntersectionObserver(([e])=>{ if(!e.isIntersecting)return;
    const t=parseFloat(el.dataset.countup),s=performance.now();
    const tick=n=>{const p=Math.min((n-s)/1800,1),ease=1-Math.pow(1-p,3);
      el.textContent=Math.floor(ease*t); if(p<1)requestAnimationFrame(tick); else el.textContent=t;};
    requestAnimationFrame(tick); },{threshold:0.4}).observe(el);
});
// Headline word cycling
const words=['faster.','smarter.','better.']; let idx=0;
const cw=document.querySelector('.cycling-word');
if(cw) setInterval(()=>{ cw.style.cssText='opacity:0;transform:translateY(-8px);transition:opacity 300ms ease,transform 300ms ease';
  setTimeout(()=>{ idx=(idx+1)%words.length; cw.textContent=words[idx];
    cw.style.cssText='opacity:0;transform:translateY(10px);transition:none';
    requestAnimationFrame(()=>cw.style.cssText='opacity:1;transform:translateY(0);transition:opacity 350ms ease,transform 350ms ease');
  },320);},2600);
```

---

## Step 5 — Anti-Pattern Checklist

- [ ] Buttons with filled amber background → **dark bg + amber border only**
- [ ] Button glow fades to invisible → **always-visible multi-layer glow, pulses moderate↔strong**
- [ ] Thin-weight (300) headlines → **bold 700–800, contrast is COLOR not weight**
- [ ] `— Label —` dashes → **`[Label]` bracket notation, monospace**
- [ ] Small icon-box feature cards → **large ~240px illustration panel at top**
- [ ] Multiple symmetric orbs → **one elliptical orb, bottom-center**
- [ ] Footer flush with page → **inside rounded elevated panel**
- [ ] Solid border on cards → **no border, inset top highlight + outer shadow**
- [ ] Missing monospace metadata in arch cards · missing status badge in footer
- [ ] Missing hero badge pill · emojis (SVG only) · grain texture · scroll reveals

---

## Step 6 — Page Structure & Stack

**Structure:** Nav → Hero (badge + headline + CTAs + orb) → Logo marquee → Features (3-col illustration cards) → Stats (split layout, binary bg) → Testimonials (dual scroll rows) → Architecture (2×2 quadrant + central image, mono metadata) → Pricing (3-col, middle amber glow) → FAQ → CTA banner → Footer panel

**React:** `lucide-react` for icons · Tailwind for layout only · `style={{}}` or `<style>` for all colors  
**HTML:** All tokens on `:root` · `JetBrains Mono` for metadata · no framework needed
