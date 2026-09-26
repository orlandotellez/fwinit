---
description: Choose a design system for this project — lists the available /design-<style> commands (each loads its skill and reads specs/frontend/02-design.md)
---

The user wants to apply a design system to this project. Present the available design systems and ask ONE focused question to pick one (or infer from context if the user already stated a style):

- `/design-dark-luxury` — restrained, sophisticated dark premium (near-black, warm metallic accent, editorial typography)
- `/design-minimal-light` — clean near-white, generous whitespace, editorial typography, one restrained accent
- `/design-neo-brutalist` — bold saturated colors, thick black borders, hard offset shadows, chunky type
- `/design-glassmorphism` — frosted glass panels, backdrop blur, translucent layers, aurora gradient backgrounds

Once the style is chosen, load the corresponding skill and read `specs/frontend/02-design.md` as this project's design system source of truth, exactly like the specific `/design-<style>` command would. Do not invent beyond the skill + the design system file. $ARGUMENTS