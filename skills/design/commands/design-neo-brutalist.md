---
description: Apply the Neo-Brutalist design system — loads the neo-brutalist skill and reads the project's design tokens from specs/frontend/02-design.md
---

Load the `neo-brutalist` design skill first, then READ `specs/frontend/02-design.md` at the project root:

- If `specs/frontend/02-design.md` exists, treat the design tokens defined there (accent, palette, typography, components) as this project's source of truth. Follow the skill's token resolution order: project design system overrides the skill's default accent.
- If it does not exist, use the skill's default design tokens and state clearly that `specs/frontend/02-design.md` is missing (generating specs with `/create-specs` is recommended so the design system is versioned).

Apply the loaded design system to whatever the user asks for (components, pages, the whole app — the skill's coverage contract applies). $ARGUMENTS