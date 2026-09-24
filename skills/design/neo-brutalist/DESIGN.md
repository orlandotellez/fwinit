# Design Guidelines — Neo-Brutalist

## Visual Style
- **Aesthetic**: Neo-brutalist — saturated flat colors, thick black borders, hard offset shadows (zero blur), chunky uppercase display type, raw exposed grid
- **Mood**: Loud, confident, playful, subversive — web design without manners
- **Inspiration**: classic brutalism.com, post-internet studios, indie SaaS landing pages

---

## Color Palette
- **Ink (border/text)**: `#000000` — non-negotiable
- **Background**: `#f5f3ef` — warm off-white, default
- **Panel**: `#ffffff` — cards on off-white
- **Accents** (choose ONE per section):
  - **Yellow (default)**: `#ffd60a`
  - **Hot Pink**: `#ff2e88`
  - **Acid Green**: `#b6ff00`
  - **Sky Blue**: `#00a8ff`
- **Text Muted**: `#4a4a4a` — body copy on white
- **Success / Error**: use accent saturation (`#16a34a`, `#dc2626`) or black on accent chips

---

## Typography
- **Display**: Archivo Black, Anton, or Impact — single heavy weight, `clamp(52px, 8vw, 110px)`, uppercase, line-height 0.95, `-0.02em`
- **Body**: Space Grotesk (or similar geometric grotesk), 400–500
- **Mono**: IBM Plex Mono / JetBrains Mono — labels, metadata, indexes
- **Signature move**: highlight block behind key headline words — solid accent rectangle, slightly oversized, `box-shadow: 4px 4px 0 0 #000`. No gradient, no underline border
- **h2**: `clamp(34px, 4.5vw, 56px)`, display font, uppercase
- **h3**: `clamp(20px, 2vw, 26px)`, body font weight 700, or display font
- **Stats**: 80–140px display font, black, with rotated accent block behind
- **Labels**: 13px mono, uppercase, `///` prefix, letter-spacing 0.08em

---

## Spacing & Layout
- **Section padding**: 100–140px vertical — generous but not "floaty"
- **Card padding**: 24–28px internal
- **Grid**: max-width 1200px, centered; OR full-bleed raw sections — no half-measures
- **Spacing unit**: 4px base; visible structure means borders and dividers do the organizing
- **Dividers**: 1px dashed black lines are allowed and encouraged inside cards

---

## Borders & Radius
- **Default border**: `3px solid #000` on cards, buttons, inputs, images, marquee strips
- **Radius**: 0–8px only. Cards 8px, buttons 4px, never pills
- **Border collapses on hover** for selected/inline items (e.g. nav active) — invert: white text on black

---

## Shadows & Elevation

THE signature — solid, offset, zero blur:

```
Default: box-shadow: 6px 6px 0 0 #000
Small:   box-shadow: 4px 4px 0 0 #000
Hover:   box-shadow: 8px 8px 0 0 #000; transform: translate(-2px,-2px)
Active:  box-shadow: 3px 3px 0 0 #000; transform: translate(2px,2px)
```

- Never soften, never blur, never use rgba alpha for the shadow
- Interactive elements physically MOVE with the shadow — press feels like paper

---

## Buttons

- **Filled accent** (default): accent bg, black 3px border, black text, hard shadow, uppercase bold 15px
- **Secondary**: off-white bg + black border + hard shadow
- **Black**: ink bg, off-white text — for destructive or high-contrast moments
- **Hover**: lift `translate(-2px,-2px)` + grow shadow; **Active**: squish `translate(2px,2px)` + shrink shadow
- **Radius**: 4px. **SM**: `10px 20px`, 13px · **Default**: `14px 26px`, 15px

---

## Section Labels

- Format: `/// FEATURES` — mono font, 13px, uppercase, letter-spacing 0.08em, black
- Optionally inside a small black chip with white text or on the accent block
- Never `[brackets]`, never amber, never dashes — the triple slash is the brutalist signature

---

## Icons
- SVG only (lucide, stroke 2–2.5, 20–24px)
- Inside 40×40px squares with 3px black border, accent or white background
- Checkmarks in pricing: black `✓` SVG inside a black-bordered square — or a plain black check, bold
- No thin 1px strokes, no emojis, no icon fonts

---

## Components

- **Navbar**: Black bar full-width, off-white text, logo in white box, mono links, accent CTA button. Sticky. No blur, no transparency games
- **Hero**: Huge uppercase display headline with accent highlight blocks, one-liner, CTA pair, floating rotated accent rectangles behind/around content
- **Marquee Strip**: Black bands scrolling uppercase display text (18s), bordered top/bottom, used as section separators
- **Feature Cards**: Numbered (`01` index badge overlapping the top edge), 3px borders, dashed internal dividers, hard shadows
- **Stats**: Massive display numerals with rotated accent blocks; or marquee of NUMBER + LABEL pairs
- **Pricing**: Flat 3-column cards; featured card = accent bg + black text; prices 64px+ display font; square checkboxes
- **Testimonials**: Hard-edge quote cards, big quotation mark in accent, author row with plain avatar box (border + shadow)
- **FAQ**: Bold-border accordion, `+`/`×` in black squares, mono numbering
- **CTA**: Full-width accent section block, black display headline, black button
- **Footer**: Black bar, off-white text, mono links, `© YEAR` in white box — inverted end of page

---

## Imagery & Illustration
- Screenshots inside 3px black border frames with hard shadow over accent panels
- Abstract: flat geometric shapes (circles, rectangles, stripes) in accent colors — no gradients, no photography treatments, no grain
- Yearbook-style stickers/badges optional: rotated accent squares with mono text
- No stock lifestyle photos; if photos are used: grayscale + hard border + hard shadow

---

## Micro-Animations (punchy, all required)
- **Reveal**: slam in from `translateY(24px)`, 400ms with `steps(2)` easing edge or strong easeOut — elements arrive with impact, not elegance
- **Hover**: lift + shadow grow (120ms) · **Active**: squish + shadow shrink (120ms)
- **Marquee**: 18s linear — fast, constant, mechanical
- **Accordion**: 200ms hard easeOut, no bounce
- **Ticker/counter**: mono numerals, black on accent chips, ticks like a machine
- **NO** glows, blurs, gradients, glass, parallax softness, or gentle floats

---

## Replication Notes

- The hard shadow IS the brand — `Npx Npx 0 0`, solid color, zero blur, never softened
- 3px black borders on everything interactive; radius never above 8px
- Flat colors only — one accent per section, full saturation, no gradients
- Display type: single heavy weight, uppercase, highlight blocks instead of styling tricks
- `/// LABEL` mono prefixes, numbered cards, dashed dividers — structure must be visible
- Pressing things feels physical: the element literally moves into its shadow
- Invert at the ends: black nav at top, black footer at bottom — the page is bookended by ink