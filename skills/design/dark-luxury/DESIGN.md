# Design Guidelines

## Visual Style
- **Aesthetic**: Dark luxury SaaS — near-black backgrounds, warm metallic accents, grain texture, single ambient orb
- **Mood**: Premium, powerful, editorial — expensive without being ornate
- **Inspiration**: high-end AI product studios

---

## Color Palette

The color system has **invariants** (protected) and exactly **one brand input**: the `accent`. Every accent-derived value is computed, never hardcoded independently. This file documents the reference instance (warm near-black); `SKILL.md` ("Design Tokens — Source of Truth") owns the canonical token list and guardrails.

### Token roles

| Role (CSS var) | Reference instance | Guardrail |
|---|---|---|
| `--bg` | `#0a0907` — warm near-black | luminance < 15% |
| `--surface` | `#100f0d` — section alternates | near-black |
| `--surface-elevated` | `#161412` — card and panel backgrounds | near-black |
| `--border` | `rgba(255,248,230,0.07)` subtle · `0.13` medium | derived from warm white |
| `--text` | `#f0ebe0` — bright warm white | AA (4.5:1) vs `--bg` |
| `--text-secondary` | `#8a8070` — body copy, nav links at rest | — |
| `--text-muted` | `#5a544a` — supporting headline words | — |
| `--accent` | `#d4a03c` — amber gold | any hue — the only brand input |

> **Naming notes**: this file's `text-primary` ≈ `--text` · `text-body` ≈ `--text-secondary` · `text-muted` == `--text-muted`. Fixed utilities: `text-tertiary` (`#524c42`), Success (`#3d9e5c`), Error (`#b83c38`).

### Accent scale (derived from `--accent`, never hardcoded)

| CSS var (derived) | Default instance | Formula |
|---|---|---|
| `--accent-bright` | `#e8b84e` | accent lightness +12% |
| `--accent-glow` | `rgba(212,160,60,0.18)` | accent @ 18% alpha |
| `--accent-subtle` | `rgba(212,160,60,0.08)` | accent @ 8% alpha |
| `--accent-border` | `rgba(212,160,60,0.55)` | accent @ 55% alpha |
| `--accent-shadow` | `rgba(212,160,60,0.12)` | accent @ 12% alpha |

The amber values above are the default instance (`#d4a03c`). For a project, substitute the project accent and re-derive — never mix values from two instances.

> **Alternate accent instances**: Silver `#b4c0d4` on `#080809` · Emerald `#42b872` on `#070908` · Crimson `#c8385a` on `#09070a` — each keeps the dark base untouched and only swaps the accent input.

---

## Typography
- **Primary Font**: Inter — geometric sans-serif, weights 400–800
- **Mono Font**: JetBrains Mono or Fira Code — used for section labels and metadata lines
- **Display / Hero**: `clamp(52px, 7vw, 96px)`, weight 700–800, letter-spacing -0.03em. Must feel tight
- **Signature move**: Headlines use **color contrast, not weight contrast** — all words are the same bold weight (700–800), but supporting words are `--text-muted` (near-invisible grey) and key words snap to `--text` (bright white). Never use a thin (300) weight line
- **Section Headings (h2)**: `clamp(28px, 3vw, 44px)`, weight 700, letter-spacing -0.03em
- **Card Headings (h3)**: `clamp(17px, 1.6vw, 20px)`, weight 600, letter-spacing -0.02em
- **Body**: 16px, weight 400, line-height 1.65, `text-body` color
- **Stats / Numbers**: 60–100px, weight 800, tight tracking — large and given room to breathe
- **Captions / Meta**: 12px, `text-tertiary`

---

## Spacing & Layout
- **Section padding**: 120–160px vertical
- **Card padding**: 24–32px internal
- **Grid**: max-width 1200px, centered, 40px horizontal page padding
- **Narrow text sections**: max-width 720px, centered
- **Spacing unit**: 4px base — all values are multiples of 4

---

## Borders & Radius
- **Cards**: 10px — more rounded than typical SaaS, not bubbly
- **Large panels / footer**: 20px
- **Buttons**: 10px — never pill-shaped on CTAs
- **Pill / badge / status**: `border-radius: 999px`
- Cards have **no border** — elevation is achieved through background contrast and inset shadow (see Shadows)

---

## Shadows & Elevation

Cards look raised off the page with no visible border line. Three things create this:
1. Card background (`--surface-elevated`) is noticeably lighter than page background (`--bg`)
2. `inset 0 1px 0` in `--border` (subtle intensity) — a top-edge inner highlight simulating light hitting a raised surface
3. `0 4px 24px rgba(0,0,0,0.45)` — soft downward shadow that grounds the card

```
Card:          box-shadow: inset 0 1px 0 var(--border), 0 4px 24px rgba(0,0,0,0.45)
Card hover:    box-shadow: inset 0 1px 0 var(--border), 0 12px 40px rgba(0,0,0,0.55)
Card featured: add 0 0 0 1px var(--accent-border), 0 0 30px var(--accent-shadow)
```

- **Grain texture**: `body::before`, SVG fractalNoise, 4% opacity, `mix-blend-mode: overlay` — non-negotiable
- **Hero orb**: One large elliptical radial gradient (900×500px), bottom-center, accent at ~28% → transparent. Not multiple orbs.

---

## Buttons

All buttons have a **dark background** with a **border**. No button ever has a filled accent background.

- **Primary**: Dark bg + accent border (`--accent-border`) + always-visible multi-layer glow. The glow is a real light-source effect with three layers: tight bright edge (8px, 55% opacity), medium halo (20px, 25%), wide ambient bloom (40px, 10%). Pulses gently at rest between moderate and strong — never fades to invisible.
- **Secondary**: Dark bg + subtle grey border (`--border` medium intensity). No glow.
- **Hover — primary**: Glow intensifies, border brightens to `--accent-bright`, `translateY(-1px)`
- **Hover — secondary**: Border opacity increases slightly, faint white bg tint
- **Radius**: 10px on all buttons
- **Size SM** (nav): `padding: 8px 18px`, 13px text
- **Size default**: `padding: 12px 24px`, 14px text

---

## Section Labels

Every section has a label above its heading. Format is **`[Label]`** bracket notation — not `— Label —` dashes.

- Font: monospace (`JetBrains Mono` or similar)
- Size: 13px
- Color: `var(--accent)` (the project accent — any hue)
- Letter-spacing: 0.06em
- No background, no pill, no border — bare bracketed text only

Examples: `[Features]` `[Pricing]` `[Foundation]` `[Achievements]`

---

## Icons
- SVG only — no icon fonts, no emojis under any circumstances
- Style: thin line icons, 1.5px stroke, 20–24px. Lucide or Phosphor (outline weight)
- In feature cards: inside a 42×42px square rounded container (`border-radius: 10px`), surface bg, medium border
- In navigation: 16px, `text-body` color

---

## Components

- **Navbar**: Fixed, transparent at top → `backdrop-filter: blur(16px)` + bottom border on scroll. Logo left, links centered at `text-body` opacity, primary CTA right
- **Section Labels**: `[Label]` in monospace amber above every section heading — mandatory
- **Hero Badge**: Small pill (`border-radius: 999px`) above the headline — icon + short tagline, dark bg, subtle border
- **Feature Cards**: Large dark illustration/preview panel (~240px) taking the top of the card, title + description below. Not a small icon + text layout
- **Technical Metadata**: Architecture/foundation cards include a monospace line below the title: `3F1C9 // CONTEXT DEPTH: 12.4 // INSIGHT HASH: 7B` — invented but realistic metrics in `text-tertiary`
- **Stats**: Split layout (text + heading left, floating stat cards right) or centered large numbers. Binary/hex code as background texture at low opacity
- **Testimonials**: Two rows, scrolling in opposite directions via CSS marquee
- **Pricing Cards**: 3-column. Icon (square container) + tier name on same line. Featured middle card distinguished by accent border (`--accent-border`) + ambient glow (`--accent-glow`) only — no background color change. Full-width button inside each card
- **Pricing Checklist**: Small square checkbox SVG (not bare checkmarks), accent stroke, grey border
- **Logo Marquee**: Infinite scroll, logos greyscale at ~30% opacity, fade mask on left/right edges
- **Footer**: Sits inside a **rounded elevated panel** (`border-radius: 20px`, `--surface-elevated` surface) on the page background — not flush. Contains logo, tagline, link columns, and a `[ALL SYSTEMS OPERATIONAL]` status badge (Success dot + monospace Success text)
- **CTA Banner**: Centered headline, dual buttons (primary + secondary), single orb glow behind

---

## Imagery & Illustration
- Abstract technical imagery: circuit boards, neural network nodes, particle systems — dark-tinted, used as section backgrounds at low opacity
- Dark-treated product screenshots: `brightness(0.85) contrast(1.1)`
- No stock photography of people, no lifestyle photos, no bright-color illustrations
- Logo strip: grayscale, 30% opacity

---

## Micro-Animations (all required)
- **Scroll reveal**: Every major element enters from `translateY(20px)`, 600ms easeOut, staggered 90ms per sibling
- **Number countup**: Stats count from 0 on scroll-enter, 1.8s easeOut curve
- **Hero word cycling**: Key word in headline cycles every 2.6s — slides out up, slides in from below
- **Hero orb breathe**: Orb scales 1→1.08 on slow 8s alternate loop
- **Card hover**: `translateY(-2px)` + deeper shadow, 220ms
- **Button pulse**: Primary button glow breathes between moderate and strong intensity — never stops, never goes dark
- **Marquee**: CSS infinite scroll, 45s duration, fade mask on edges

---

## Replication Notes

- Near-black is not black — `#0a0907` has warmth. Never `#000000` or flat `#111111`
- Grain texture is non-negotiable — it's the difference between flat dark and tactile dark
- Headline contrast is COLOR not weight — both "dim" and "bright" words are bold. Don't use a thin weight line
- Section labels are `[Label]` in monospace, not dashes, not uppercase pills
- Cards have no border — the inset top highlight IS the edge definition
- Buttons are never filled with the accent — dark bg + accent border + multi-layer glow
- The primary button glow never disappears — it pulses between two visible states
- One orb in the hero, elliptical, bottom-center — not multiple symmetric blobs
- Accent is surgical — labels, borders, numbers. Never a large fill. All accent-derived values come from the accent scale, never hand-written
- SVG icons only. No emoji. No icon fonts.
