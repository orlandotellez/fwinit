---
description: Apply the Minimal Dashboard design system — loads the minimal-dashboard skill and reads the project's design tokens from specs/frontend/02-design.md
---

Load the `minimal-dashboard` design skill first, then READ `specs/frontend/02-design.md` at the project root:

- If `specs/frontend/02-design.md` exists, treat the design tokens defined there (palette, typography, components, semantic colors) as this project's source of truth. Follow the skill's guardrails — color only for meaning, neutral chrome — with the project tokens taking precedence over the skill defaults.
- If it does not exist, use the skill's default design tokens and state clearly that `specs/frontend/02-design.md` is missing (generating specs with `/create-specs` is recommended so the design system is versioned).

Apply the loaded design system to whatever the user asks for (components, pages, the whole app — the skill's coverage contract applies). $ARGUMENTS
