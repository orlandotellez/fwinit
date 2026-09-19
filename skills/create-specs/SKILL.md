---
name: create-specs
description: "Trigger: create-specs, specs, crear specs, especificaciones, spec folder. Create the specs/ folder at the project root: docs, modules split by backend/db/frontend, and mandatory per-module task checklists."
license: Apache-2.0
metadata:
  author: "orlandotellez"
  version: "1.0"
---

## Activation Contract

Run when invoked via `/create-specs <project description>` or when the user asks to create the `specs/` folder for the current project. The supplied description is the seed; the skill turns it into a structured specification tree at the project root.

## Hard Rules

- Create `specs/` only at the project root. Never overwrite an existing `specs/` tree without explicit user approval.
- `tasks/` is MANDATORY: never finish without per-module task files.
- Detect the stack before writing: `*.csproj` → ASP.NET Core; `package.json` → fastify, express, node, or react-native/expo; `prisma/` → DB stack. Generate module content for the detected stack, never generic filler.
- Number files inside each module (`01-`, `02-`, ...) so the reading order is explicit.
- Each module folder gets a `README.md` linking its files.
- Write artifacts in the project's language with a neutral, professional register. English repos get English docs; Spanish repos get neutral Spanish — never slang.
- Tasks use actionable checklists per feature area: a current-state section plus a checkbox list (`- [ ]`).

## Decision Gates

| Situation | Action |
|-----------|--------|
| Description too vague to derive features/modules | Ask one focused clarifying question before generating |
| `specs/` already exists | Confirm overwrite or merge scope with the user |
| Project clearly needs a module beyond backend/db/frontend (e.g., `api`) | Add it only when the detected stack/architecture requires it |

## Execution Steps

1. Inspect the project root: stack markers (`.csproj`, `package.json`, `app.json`, `prisma/`), README, and existing structure.
2. Create the base tree: `specs/`, `specs/docs/`, `specs/modules/{backend,db,frontend}/`, `specs/tasks/{backend,db,frontend}/`.
3. Write `specs/descripcion-proyecto.md` (what the project is, actors, feature modules) and `specs/global-instruction.md` (overview, module index, stack quick reference) from the description plus the detected stack.
4. Write `specs/docs/`: `01-descripcion-proyecto.md`, `02-global-instruction.md`, `03-ejecucion-local.md`, `04-buenas-practicas.md`.
5. Write per-module files (README + numbered docs): backend (stack, architecture, api/security/testing), db (schema, setup, use-cases), frontend (stack, design, architecture, screens, quality). Adapt the file set to the detected stack.
6. Write `specs/tasks/<module>/` — one file per feature area (`01-<feature>.md`, ...) with current state and an actionable checkbox checklist derived from the module docs.
7. Report the created tree and the feature areas covered.

## Output Contract

Return the list of created paths and the module/task coverage. `specs/tasks/` must never be empty. The tasks folder is the single tracked source of work: implementation progress is recorded by ticking the checkboxes in place.