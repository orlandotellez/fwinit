# Design Guidelines — Glassmorphism

## Visual Style
- **Aesthetic**: Glassmorphism — frosted translucent panels, backdrop blur with saturation, soft gradient aurora backgrounds, light borders, floating depth layers
- **Mood**: Dreamy, modern, airy, dimensional — UI that feels like looking through glass
- **Inspiration**: Apple Big Sur/Ventura, Stripe gradient work, Vercel frameworks UI, Linear (glass moments)

---

## Color Palette (Dark Aurora — default)

- **Background Engine**: layered radial gradients (aurora), e.g.
  `radial-gradient(at 20% 0%, rgba(124,92,255,0.35), transparent 55%)` +
  `radial-gradient(at 80% 10%, rgba(59,130,246,0.30), transparent 50%)` +
  `radial-gradient(at 50% 100%, rgba(244,114,182,0.22), transparent 60%)`
  over base `#0b0b17 → #10101f`
- **Glass Background**: `rgba(255,255,255,0.06)` · strong: `rgba(255,255,255,0.12)`
- **Glass Border**: `rgba(255,255,255,0.18)` · highlight: `rgba(255,255,255,0.32)`
- **Accent**: `#a78bfa` (violet) · strong: `#8b5cf6` · glow: `rgba(139,92,246,0.35)`
- **Text Primary**: `#f4f4ff` · Muted: `rgba(244,244,255,0.65)` · Faint: `rgba(244,244,255,0.40)`
- **Light mode**: pastel radial gradients + `--glass-bg: rgba(255,255,255,0.55)`, borders `rgba(255,255,255,0.65)`, text `#1a1a2e`

---

## Typography
- **Primary Font**: Inter, weights 400–700
- **Mono**: JetBrains Mono / Fira Code — only metadata & code chips
- **Display**: `clamp(46px, 6.5vw, 80px)`, weight 700, line-height 1.08, `-0.02em`
- **Signature move**: gradient text on key headline words — `linear-gradient(92deg, #f4f4ff, #a78bfa 60%, #f472b6)` clipped to text. The ONE gradient-text moment per page
- **h2**: `clamp(28px,3vw,42px)`, weight 700 · **h3**: `clamp(17px,1.6vw,21px)`, weight 600
- **Body**: 16px, weight 400, line-height 1.7, `--text-muted`
- **Labels**: 12px, weight 600, uppercase, 0.08em, inside glass chips
- **Stats**: 64–96px, weight 700, gradient or solid primary

---

## Spacing & Layout
- **Section padding**: 110–150px vertical
- **Card padding**: 28–36px internal
- **Grid**: max-width 1160px, centered, 32px page padding
- **Depth composition**: panels overlap deliberately (negative margins, partial offsets) — this is a layered composition, not a flat grid
- **Spacing unit**: 4px base

---

## Borders & Radius
- **Glass border**: 1px `rgba(255,255,255,0.18)`, hover → `0.32`
- **Radius**: cards/large panels 20–28px, buttons & chips 999px, icon squares 14px
- **Inset highlight**: `inset 0 1px 0 rgba(255,255,255,0.15)` on every glass surface — the top edge catches light

---

## Shadows & Elevation
- Ambient, never harsh: `0 8px 32px rgba(0,0,0,0.35)` + the inset top highlight
- Hover float: `0 16px 48px rgba(0,0,0,0.45)`
- Featured/glow elements: `0 0 24–40px var(--accent-glow)`
- The page has REAL depth: aurora (back) → glass (middle) → floating content (front)

---

## Buttons
- **Primary**: gradient pill `linear-gradient(135deg, #a78bfa, #8b5cf6)`, white text, ambient glow `0 0 24px`, hover → glow 40px + lift. The one glow per viewport
- **Ghost**: glass pill — translucent bg + blur + hairline border; hover brightens
- **Radius**: 999px pills everywhere — rounded is the glass language
- **SM**: `10px 20px`, 13px · **Default**: `12px 26px`, 14px

---

## Section Labels
- Glass chips: 12px uppercase mono/sans-600, `padding: 6px 14px`, glass bg + border, pill radius, `--text-muted`
- No `[brackets]`, no `///`, no amber — glass chips only

---

## Icons
- SVG only (lucide, stroke 1.8, 20–24px)
- Icon containers: floating glass squares 48×48, radius 14, `--glass-bg-strong` + `--glass-border-hi`, overlapping the card top edge
- Nav icons: 16px `--text-muted`
- No emojis, no icon fonts

---

## Components

- **Aurora Background**: Fixed container `z-index:-1` with layered radial gradients; 2–4 blurred orbs drifting (18s alternate) behind everything — glass is invisible without it
- **Navbar**: Floating glass pill bar — transparent until scroll, then glass; logo left, links center, primary CTA right
- **Hero**: Headline (gradient word) + subline + CTA pair, and a glass "app preview" mock floating with the aurora behind it — the hero mock IS the depth showcase
- **Logo Row**: Glass chips with grayscale logos, static or soft marquee
- **Feature Cards**: Glass + floating icon square overlapping the top edge; title + description
- **Stats**: Glass panels with gradient numerals, optional countup
- **Testimonials**: Glass quote cards, avatar in glass circle, accent quote mark
- **Pricing**: 3 glass columns; featured = stronger glass + glow ring `0 0 0 1px rgba(167,139,250,0.4), 0 0 40px glow`
- **FAQ**: Glass accordion, chevron rotates, borders brighten on open
- **CTA**: Full-width gradient panel (accent→blue→pink at low opacity over base) with a glass card floating inside, glow CTA
- **Footer**: Glass panel with logo, links, and a glass status chip

---

## Imagery & Illustration
- Screenshots inside glass frames (panel + clipped image, or image with glass overlay edge)
- Abstract decoration: blurred color orbs and soft gradient meshes — never sharp geometry, never heavy grain
- Optional subtle noise overlay 2–3% to ground the glass
- No stock photos of people unless a portrait is required — then inside a glass rectangle

---

## Micro-Animations (floating, all required)
- **Reveal**: `translateY(24px) scale(0.98)` → settle, 700ms easeOut, 90ms stagger — elements sink INTO place
- **Hover**: `translateY(-4px)` + deeper ambient shadow, 300ms easeOut — everything floats
- **Orbs**: drift 18s alternate — the background is alive behind the glass
- **Countup**: 1.8s easeOut on scroll
- **Accordion**: 300ms easeOut opening
- **Primary button**: glow breathes subtly between 24px and 36px (2.8s alternate) — one gentle glow, never aggressive
- **NO** hard slams, no marquees at brutalist speed, no jumps — movement is smooth and weightless

---

## Replication Notes

- Glass only exists over visual noise — aurora/orbs must always be behind the blur, or it's just grey transparency
- The glass recipe is EXACT: translucent bg + `backdrop-filter: blur(16px) saturate(1.6)` + 1px light border + inset top highlight. `saturate(1.6)` is what lets the aurora glow through — never drop it
- Rounded is the language: 20–28px panels, pill buttons, chip labels — nothing sharp
- Build depth by overlapping layers and floating elements, not by stacking flat cards
- One glowing element per viewport — the primary CTA; everything else is quiet glass
- Gradient text belongs on key headline words only
- Light mode swaps glass opacity and text colors, keeps the same recipe and depth rules