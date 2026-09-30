---
name: create-specs-from-code
description: "Trigger: create-specs-from-code, specs from code, documentar proyecto existente, código existente, especificar desde el código. Build the specs/ tree for a project that ALREADY EXISTS by reading its real code. For a NEW project use create-specs."
license: Apache-2.0
metadata:
  author: "orlandotellez"
  version: "1.0"
---

## Activation Contract

Run when invoked via `/create-specs-from-code`, or when the user asks to document/specify a codebase that already has source code. The code is the seed. Do NOT activate for a new/greenfield project — that is `create-specs`.

## Contract Inheritance

The **Spec Tree Contract** and the **Document Templates** are defined in `create-specs/SKILL.md`. READ those two sections before generating anything.

The tree shape, file naming, and per-file structure are IDENTICAL to `create-specs`. What changes is the source of truth. Inherit the contract; never restate it, never contradict it, never drift from it.

## Hard Rules

- **Write independent files in PARALLEL, in batches** — the same batching rule as `create-specs`. This tree is ~90 files; writing them one at a time is the single largest cost of this skill. A reasonable batch is 5-10 files. Serialize only what depends on a previous result.
- The two root index files (`descripcion-proyecto.md`, `global-instruction.md`) are **pointers, not summaries**: one line plus the link to the `docs/` version. Never restate their content inline — restating is what lets the two copies drift.
- The CODE is the source of truth. Every entity, endpoint, screen, table, enum, env var, and integration documented MUST be found in a real file, and the file path MUST be cited inline. Never invent a single fact.
- When something is unknown, READ THE FILE. Never guess, never infer from naming conventions, never fill gaps with what a project of this shape "usually" has.
- `Estado Actual` in every task file describes real existing code with paths. It never says "Proyecto nuevo, no hay código" — there is always real code here.
- A module or file that cannot be evidenced is OMITTED, and the omission is reported with the reason. Do not pad the tree to match the contract.
- `tasks/` is DEBT AND GAPS derived from reading the code: missing tests, absent validation, unhandled errors, undocumented endpoints, missing auth, security holes, stale dependencies, TODOs. Every task cites the real file it came from.
- A product feature backlog is NOT derivable from code. Do not invent one. After the debt tasks exist, ask ONE question whether a feature backlog is also wanted.
- `documentacion-cliente.md` is MANDATORY, written LAST, and derived only from the generated tree — same template and same rules as `create-specs`.
- Write artifacts in the project's language with a neutral, professional register. English repos get English docs; Spanish repos get neutral Spanish — never slang.
- `specs/` only at the project root. Never overwrite an existing `specs/` tree without explicit user approval.

## Decision Gates

| Situation | Action |
|-----------|--------|
| `specs/` already exists | Ask: extend/merge the existing tree, or regenerate. Never overwrite silently |
| Code exists but is tiny (a few files, no clear layers) | Ask whether to document what exists or define what should exist — the honest answer may be the second |
| Entity exists in code but is undocumented anywhere | Document it as IS (including the missing docs) and add a task to document it |
| Legacy code with two competing implementations | Document both, mark one as legacy in `Estado Actual`, and add a task to converge them |
| Project has no persistent storage | Same gate as `create-specs`: record the decision in `docs/05-requisitos-no-funcionales.md` and skip `modules/db/` |
| A strong architectural decision already made in the code | Record it in `docs/07-decisiones.md` with the evidence that forced it |

## Execution Steps

Steps are grouped into BATCHES. Within a batch, write every file in the same turn. Only cross-batch dependencies are serialized. Batching is mandatory, not an optimization.

1. **Map.** Repository before writing anything: entry points, directory layout, framework and dependency manifest, routing tables, ORM/schema files, migration history, test suites, env/config files, CI config. Build the mental model first — the spec is a report of the model, not a guess.
2. **Collect evidence.** Read the modules in dependency order (config → db → backend → frontend) and record per file: path + what it does + the concrete entities, endpoints, and screens it defines.
3. **Detect the stack** exactly as `create-specs` does (`*.csproj`, `package.json`, `prisma/`, `migrations/`, `*.sql`, `app.json`) so the module content matches the real stack, and create the directories per the inherited Spec Tree Contract. Apply the gates: `modules/api/` only when external third-party consumers exist in code (the app's own frontend uses `backend/03-api.md`); skip `modules/db/` only when there is genuinely no persistence. Group `schemas/` and `use-cases/` by DOMAIN, never 1:1 with entities.
4. **Batch A — `docs/` (parallel).** Inherited Document Templates. `03-ejecucion-local.md` MUST use real commands from the real `package.json`/scripts.
5. **Batch B — backend module (parallel).** For `03-api.md`, enumerate the endpoints that EXIST — read the actual route definitions, do not extrapolate a REST pattern to invent missing CRUD.
6. **Batch C — db module (parallel).**
7. **Batch D — frontend module (parallel).**
8. **Batch E — api module (parallel, when the gate triggered).**
9. **Batch F — tasks (parallel).** `specs/tasks/README.md` plus one task file per feature area per module, following the inherited tasks template: real `Estado Actual` with paths, objective, scope, numbered actionable checklist of debt/gaps, Done criteria.
10. **Batch G — root index pointers (parallel).** `specs/descripcion-proyecto.md` and `specs/global-instruction.md`, one line each plus a link, written after `docs/` so the links are real.
11. **Batch H — serialized, one file.** `specs/documentacion-cliente.md` LAST, derived from the completed tree, following the inherited 12-section template.
12. **Review from memory, not by re-reading.** You wrote every file in this session. Verify that every endpoint/entity/screen cited resolves to a real file, that no module is referenced without existing, and that `tasks/` is non-empty for every module. Report the tree and the debt areas found, then state the recommended first task file.

## Output Contract

Return the list of created paths (including `specs/documentacion-cliente.md`) and the module/task coverage. `specs/tasks/` must never be empty. State the next implementation step (first task file to tick). Every fact in the specs must be traceable to a file path in the repository. The tasks folder is the single tracked source of work: implementation progress is recorded by ticking the checkboxes in place.

## References

- `create-specs/SKILL.md` — normative source for the Spec Tree Contract and the Document Templates. Required reading before generating.
- `create-specs/examples/` — output style references (including the finished `documentacion-cliente.md` mold). Use as a style mold, never as copyable content.
