---
description: Apply the ui-ux-pro-max design catalog — loads the ui-ux-pro-max skill and reads the project's design tokens from specs/frontend/02-design.md
---

Load the `ui-ux-pro-max` design skill first, then READ `specs/frontend/02-design.md` at the project root:

- If `specs/frontend/02-design.md` exists, treat the design tokens defined there (palette, typography, components) as this project's source of truth. They take precedence over whatever the catalog recommends.
- If it does not exist, generate the design system from the catalog with `--design-system` and state clearly that `specs/frontend/02-design.md` is missing (generating specs with `/create-specs` is recommended so the design system is versioned).

Unlike the curated `/design-<style>` commands, this one is not a single fixed style: it searches the catalog for the product type or the style the user named, and answers targeted UX/accessibility/stack queries with the same engine. Fall back to the skill's priority table and say so explicitly when the search returns nothing.

Apply the loaded design system to whatever the user asks for (components, pages, the whole app — the skill's coverage contract applies). $ARGUMENTS
