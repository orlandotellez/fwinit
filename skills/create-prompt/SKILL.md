---
name: create-prompt
description: "Trigger: create-prompt, prompt para specs, mejorar prompt, detallar proyecto, nuevo proyecto. Turn a rough new-app idea into specs/prompt.md — a module-by-module, feature-by-feature prompt ready for /create-specs."
license: Apache-2.0
metadata:
  author: "orlandotellez"
  version: "1.0"
---

## Activation Contract

Run when invoked via `/create-prompt <idea>`, or when the user asks to detail, structure, or improve an idea for a NEW project so it can be turned into specs. The idea is the seed. This skill does NOT create specs — it writes the prompt that `/create-specs` will consume. For a project that already has code, use `create-specs-from-code` instead.

## Hard Rules

- Write the result to `specs/prompt.md` at the project root. Create `specs/` if it does not exist. Never overwrite an existing `prompt.md` without explicit user approval — offer to write `specs/prompt-v2.md` instead.
- **Write the whole draft in ONE pass. Do not interview the user before writing.** The complete structure is what helps them think; questions asked without context stall them. Their correction pass comes after they can see the shape of the thing.
- Everything you write is a PROPOSAL until the user confirms it. Never present an invented business decision as settled.
- Every business decision not derivable from the seed MUST appear twice: inline as `[PENDIENTE: <the actual question>]` in the place it affects, and as a row in the final "Decisiones propuestas" table. The inline marker is what stops `/create-specs` from silently inventing it later.
- Full-stack by default: `backend`, `db`, and `frontend` are ALWAYS covered. If the project genuinely has no persistence, say so explicitly in "Alcance fijo" and keep `db` shallow — the structure does not change.
- The stack must be concrete: language, framework, database, ORM, auth approach. `/create-specs` detects the stack from the project, and in a new project there is nothing to detect — the prompt is the only place the stack exists.
- Use concrete numbers, not adjectives: "API p95 < 400ms", not "rápido". "20 productos por página", not "paginación". If you cannot justify a number, mark it `[PENDIENTE: ...]`.
- Forbid placeholders in your own output: "TODO", "implementar lógica", "etc." are the same defects `create-specs` forbids. An empty section is better than a vague one.
- The file MUST end with the "REGLAS IMPORTANTES PARA LAS SPECS" section. It is what tells the spec generator where to stop.
- Present the final prompt as ONE fenced block so it can be copied and pasted into `/create-specs` verbatim.
- Write artifacts in the project's language with a neutral, professional register. English projects get English output; Spanish projects get neutral Spanish — never slang.

## Decision Gates

| Situation | Action |
|-----------|--------|
| Seed is one phrase ("una tienda de floristería") | Write the full draft. Derive a coherent module set from the domain; mark every specific as `[PENDIENTE]`. Do not ask |
| Seed names a domain but no features | Derive the canonical capabilities for that domain (auth, catalog, cart, checkout, admin, reports), then mark each as a proposal |
| Seed already contains detailed features | Preserve them exactly. Only add structure, cross-module consistency, data model, and non-functional requirements |
| User pastes an existing prompt to improve | Audit it against these rules, keep what is solid, rewrite what is vague, and list what is still missing in the decisions table |
| Seed is ambiguous between two readings (B2C vs B2B, local vs online) | Pick the more common reading, state the choice, and add the alternative to the decisions table |
| Project would need a public API beyond the backend (third-party consumers) | Add a `MÓDULO API PÚBLICA` section and note it in the scope |
| A module would be too small to stand alone | Merge it into its parent module rather than emitting a thin module |
| Money, stock, or tenancy is involved | State the invariant explicitly (DECIMAL not float, `store_id` from session not request, immutable sales). These are correctness rules, not style — an unstated money invariant becomes a real bug |

## Output Contract

`specs/prompt.md` contains exactly this structure, inside a single fenced block:

```markdown
# Prompt para /create-specs — <Nombre del proyecto>

## Contexto y stack
## Alcance fijo
## Fuera de alcance
## MÓDULO 1 — <NOMBRE>
### Pantallas
### Reglas de negocio
### Endpoints
... (one block per module)
## MODELO DE DATOS
## Índices
## REQUISITOS NO FUNCIONALES
## Decisiones propuestas — revisá y confirmá
### REGLAS IMPORTANTES PARA LAS SPECS
```

Per module:
- **Pantallas**: one entry per screen, with the exact fields, the actions available, and where it navigates. A field named here must appear in the DB, the API, and the form.
- **Reglas de negocio**: the invariants. Not "validates the data" — "rate-limit 5 attempts then lock 15 min".
- **Endpoints**: method + path + auth requirement, one line per endpoint, grouped by resource.

Aim for 8-12 modules for a full-stack app. Fewer means thin; more means the user will not read it.

## Execution Steps

1. Read the seed from `$ARGUMENTS`. If empty, use what the conversation already established — never invent a domain the user did not mention.
2. Name the app and propose a concrete stack (language, framework, DB, ORM, auth). Mark as `[PENDIENTE]` anything the domain does not force.
3. Derive the module set. Each module is one coherent capability that a user would describe as a feature area.
4. For each module write Pantallas, Reglas de negocio, and Endpoints. Cross-check as you go: a field on a screen must exist in the data model; an endpoint must serve a screen or a background job.
5. Write the data model: entities with field names, types, nullability, and relations. Add the indexes the queries imply.
6. Write non-functional requirements with real numbers across rendimiento, concurrencia, seguridad, testing, and despliegue.
7. Collect every unresolved decision into the table. Each row: the decision, your proposal, and a checkbox to confirm.
8. Write "REGLAS IMPORTANTES PARA LAS SPECS": module boundaries, the rule that every screen/endpoint/entity must trace back to this document, the end-to-end critical flows, and the design-system instruction in natural language (colors described in words, not hex).
9. Assemble the whole thing into one fenced block and write it to `specs/prompt.md`.
10. Report: the path written, the module count, and how many `[PENDIENTE]` decisions the user still has to resolve. Then state that the file is ready to paste into `/create-specs`.

## References

Read **at most one** of these. The four files total ~1400 lines; loading more than one spends a large slice of the context on material that does not apply to the project in front of you.

| Situation | Read this one |
|-----------|--------------|
| A full-stack project from a rough idea (the common case) | `create-specs/examples/02-app-finanzas-fullstack.md` — the depth mold: 11 modules, per-module Pantallas/Reglas/Endpoints, data model, indexes, non-functional requirements, closing rules |
| A public-only landing or static site with no persistence | `create-specs/examples/01-landing-pasteleria-dulce-atelier.md` — how to use the no-storage gate |
| Money, stock, or tenancy in the domain | `create-specs/examples/03-pos-system.md` — the reference for money and tenancy invariants |
| Unsure of the downstream client-doc register | `create-specs/examples/ejemplo-documentacion-cliente-cursinet.md` — a reminder of who ends up reading the decisions you propose |

- `create-specs/SKILL.md` — the target contract. Every Hard Rule there is a requirement on your output. Note its batching rule: the prompt you write will be consumed by a ~90-file tree, so completeness of the module set matters more than prose.
