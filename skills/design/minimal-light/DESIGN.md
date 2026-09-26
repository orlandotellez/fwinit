# Design Guidelines — Minimal Light

## Visual Style
- **Aesthetic**: Minimal light SaaS — off-white backgrounds, generous whitespace, one restrained accent, hairline borders, editorial typography
- **Mood**: Calm, precise, confident — luxury through restraint, not decoration
- **Inspiration**: Linear, Stripe, Vercel (light), Apple product pages

---

## Color Palette
- **Background**: `#fafafa` — off-white, default
- **Elevated (cards)**: `#ffffff` — pure white
- **Inset / Muted**: `#f2f2f2` / `#ececec` — icon containers, code blocks
- **Border (hairline)**: `rgba(17,17,17,0.08)` — dividers, card borders
- **Border Strong**: `rgba(17,17,17,0.16)` — interactive borders at rest
- **Accent (default)**: `#4f46e5` — indigo; primary button bg, links, focus
- **Accent Strong**: `#4338ca` — hover states
- **Accent Soft**: `rgba(79,70,229,0.08)` — selected backgrounds, feature tint
- **Text Primary**: `#111111` — headings, body
- **Text Muted**: `#555555` — secondary copy, nav links (AA-safe at body size)
- **Text Faint**: `#6b6b6b` — large captions & decorative metadata ONLY (does not pass AA at body size; never body copy or inputs)
- **Success**: `#16a34a` · **Error**: `#dc2626`

---

## Typography
- **Primary Font**: Inter (or equivalent geometric sans), weights 400–700
- **Mono Font**: JetBrains Mono / Fira Code — only for code snippets and metadata
- **Display**: `clamp(44px, 6vw, 72px)`, weight 650, letter-spacing -0.03em, line-height 1.15
- **Signature move**: Keep the headline almost entirely near-black. ONE word (max two) in the accent color. No gradient, no dual-color split — restraint is the move
- **h2**: `clamp(26px, 3vw, 40px)`, weight 650, -0.03em
- **h3**: `clamp(17px, 1.5vw, 20px)`, weight 600, -0.02em
- **Body**: 16px, weight 400, line-height 1.7
- **Labels**: 12px, weight 600, uppercase, letter-spacing 0.12em, `text-faint`
- **Stats**: 56–88px, weight 700, tight tracking

---

## Spacing & Layout
- **Section padding**: 120–160px vertical — whitespace is the primary aesthetic device
- **Card padding**: 24–40px internal
- **Grid**: max-width 1120px, centered, 32px horizontal page padding
- **Narrow text**: max-width 640px, centered
- **Spacing unit**: 4px base — all values multiples of 4
- **Rule of thumb**: if a section feels crowded, REMOVE content, never compress spacing

---

## Borders & Radius
- **Cards**: 14px (md) — soft but never bubbly
- **Buttons**: 10px
- **Pills / badges / avatars**: 999px
- **Code blocks**: 10px, `bg-inset`
- **Borders**: 1px hairline everywhere; the border IS the elevation system

---

## Shadows & Elevation
- Default state: **no shadows**. Différence via background contrast (white card on off-white page)
- Modal / dropdown / popover only: `0 8px 30px rgba(0,0,0,0.08)`
- Featured pricing card: ring instead of shadow — `box-shadow: 0 0 0 1px var(--accent)`

---

## Buttons
- **Primary**: filled accent `#4f46e5`, white text. Hover darkens. No glow, no gradient
- **Secondary**: transparent, near-black hairline border. Hover: border becomes `text-primary`
- **Ghost**: transparent, no border, `text-muted` → `text-primary` on hover
- **Radius**: 10px. **SM**: `8px 16px`, 13px · **Default**: `12px 24px`, 14px
- Icon buttons (e.g. nav CTA arrow): 20px lucide icon, stroke 1.5

---

## Section Labels
- Tiny uppercase text: 12px, weight 600, letter-spacing 0.12em, `text-faint`
- Examples: `FEATURES` `PRICING` `WHY US`
- Never bracketed `[Label]`, never monospace-amber, never colored chips — quiet uppercase text is this system's signature

---

## Icons
- SVG only (lucide, stroke 1.5, 20–24px)
- Feature rows: 24px accent icon inside 40×40px rounded square (`bg-muted`, `border-radius: 10px`)
- Nav: 16px, `text-muted`
- No emojis, no icon fonts, no filled-color icon packs

---

## Components

- **Navbar**: Fixed, `rgba(250,250,250,0.90)` + `backdrop-filter: blur(12px)`, hairline bottom border. Wordmark left, links center, CTA right
- **Hero**: Section label → tight headline (one accent word) → 1–2 lines body → CTA pair → product visual or soft-gradient panel. Massive whitespace above and below
- **Logo Marquee**: Infinite scroll, logos at natural color (NOT grayscale), 40s, edge fade mask
- **Feature Cards**: Quiet rows — icon container, title, one-line description. Optional `+` accordion rows
- **Stats**: Huge numbers (`text-primary`, weight 700) over divider rows; no cards, no backgrounds
- **Testimonials**: 2-column hairline cards — quote, author row (avatar + name), 5-star row in accent
- **Pricing**: 3-column, 1px `--border` column dividers. Featured middle = accent ring + soft tint — never glow
- **FAQ**: Border-rows accordion (1px dividers), `+` rotates to `×`, chevron not required
- **CTA Banner**: Centered, headline + subline + primary CTA. Optional soft accent gradient backplate at 8% opacity
- **Footer**: Hairline top border, 4 link columns + logo + status line. No panel, no rounded box — pure white continuation

---

## Imagery & Illustration
- Product screenshots at natural exposure on white/muted backgrounds — never dark-treated, never grayscaled
- Abstract visuals: soft neutral gradients, light geometry, `bg-muted` panels
- No grain textures, no orbs, no neon, no heavy photo treatments
- Avatar photos: small, circular, natural color

---

## Micro-Animations (subtle by design)
- **Scroll reveal**: `translateY(12px)` → 0, 550ms easeOut, 80ms stagger
- **Card hover**: `translateY(-1px)` + border darken, 220ms
- **Accordion**: max-height expand, 300ms easeOut — no bounce
- **Logo marquee**: 40s linear infinite, edge fade
- **Button**: color/border transitions 150ms. No pulse, no glow, no continual animation
- **Number countup**: 1.2s easeOut when scrolled into view
- **Reduced motion**: reveals shown, marquee swapped for a static wrapped logo row — the page must look finished with animations off

---

## Replication Notes

- Whitespace is the aesthetic — never trade spacing for decoration
- ONE accent color, used like seasoning, not sauce
- Hairline borders replace shadows; shadows belong only on overlays
- Uppercase micro-labels, NOT `[brackets]` — each library style keeps its own signature
- Headline contrast = one accent word; the rest stays near-black
- `#fafafa` is off-white on purpose — pure `#fff` is for cards on top of it
- Screenshots and logos stay natural color and natural exposure
- No grain, no glow, no pulse, no gradient text — restraint is the brand