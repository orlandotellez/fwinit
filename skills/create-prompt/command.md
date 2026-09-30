---
description: Detail a new-project idea into specs/prompt.md — a module-by-module prompt ready for /create-specs
---

Load `create-prompt` first, then write the structured prompt to `specs/prompt.md` at the project root.

The seed is whatever the user typed after `/create-prompt` (it may be a single phrase). Write the WHOLE draft in one pass — do not interview them first. The complete structure is what lets them see what they have and what is missing; their correction happens on the file, not in a questionnaire.

Everything in the file is a proposal until they confirm it. Mark every business decision the seed does not force with an inline `[PENDIENTE: <question>]` plus a row in the final decisions table, so `/create-specs` cannot later invent it and write it into the client-facing documentation.

Cover full stack always: backend, db, and frontend. The stack must be concrete (language, framework, database, ORM, auth), because in a new project the prompt is the only place the stack exists. Use concrete numbers instead of adjectives, and end the prompt with the "REGLAS IMPORTANTES PARA LAS SPECS" section that tells the spec generator where to stop inventing.

Depth reference: `skills/create-specs/examples/02-app-finanzas-fullstack.md` (11 modules, per-module Pantallas / Reglas de negocio / Endpoints). The skill's `References` section lists the rest.

If `specs/prompt.md` already exists, ask before overwriting and offer `specs/prompt-v2.md` instead. Then tell the user how many `[PENDIENTE]` decisions are left to resolve.
