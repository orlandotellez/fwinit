---
name: create-specs
description: "Trigger: create-specs, specs, crear specs, especificaciones, spec folder. Create the specs/ folder at the project root: docs, modules split by backend/db/frontend, and mandatory per-module task checklists."
license: Apache-2.0
metadata:
  author: "orlandotellez"
  version: "2.0"
---

## Activation Contract

Run when invoked via `/create-specs <project description>` or when the user asks to create the `specs/` folder for the current project. The supplied description is the seed; the skill turns it into a complete specification tree at the project root.

## Hard Rules

- Create `specs/` only at the project root. Never overwrite an existing `specs/` tree without explicit user approval.
- `specs/tasks/` is MANDATORY: never finish without per-module task files, one per feature area, each with a current-state section plus an actionable numbered checklist.
- Detect the stack before writing: `*.csproj` → ASP.NET Core; `package.json` → fastify, express, node, or react-native/expo; `prisma/`, `migrations/`, `*.sql` → DB stack. Generate module content for the detected stack, never generic filler.
- Follow the Spec Tree Contract exactly: every file has a fixed numeric prefix and a fixed purpose; do not invent extra root files.
- Every module doc and task file must be concrete and project-specific: name real entities, real endpoints, real screens, real fields. Vague placeholders like "TODO" or "implementar lógica" are forbidden.
- Number files inside each module (`01-`, `02-`, ...) so the reading order is explicit. Each module folder gets a `README.md` linking and briefly describing its files.
- Tasks are the single tracked source of implementation work: progress is recorded by ticking checkboxes in place; task files must never be deleted or renamed after creation.
- Write artifacts in the project's language with a neutral, professional register. English repos get English docs; Spanish repos get neutral Spanish — never slang.
- Review the generated tree before reporting: every module referenced in `02-global-instruction.md` must exist, and `tasks/` must have at least one file per module.

## Decision Gates

| Situation | Action |
|-----------|--------|
| Description too vague to derive features/modules | Ask one focused clarifying question before generating |
| `specs/` already exists | Confirm overwrite or merge scope with the user |
| Project clearly needs a public API layer beyond the backend (mobile + web clients, third-party integrations) | Add `modules/api/` and keep the backend focused on domain logic |
| Project has no persistent storage (pure static site, prototype) | Document that decision in `docs/05-requisitos-no-funcionales.md` and skip `modules/db/` (state it explicitly) |
| A strong architectural decision is made during generation (pattern choice, DB engine, auth provider) | Record it in `docs/07-decisiones.md` with rationale and alternatives |

## Spec Tree Contract

Build exactly this tree (adapt module files to the detected stack — never fewer than the template, more only when a gate above triggers):

```
specs/
├── descripcion-proyecto.md              # 1 paragraph: what, who, why
├── global-instruction.md                # index of modules + how to navigate the tree
├── docs/
│   ├── 01-descripcion-proyecto.md       # full project description
│   ├── 02-global-instruction.md         # overview, module index, stack quick reference
│   ├── 03-ejecucion-local.md            # how to run/build/test the project
│   ├── 04-buenas-practicas.md           # coding conventions and quality bar
│   ├── 05-requisitos-no-funcionales.md  # performance, security, scalability, availability
│   ├── 06-glosario.md                   # domain terms with definitions
│   └── 07-decisiones.md                 # ADR log (only when a strong decision was made)
├── modules/
│   ├── backend/                         # server-side application
│   │   ├── README.md
│   │   ├── 01-stack.md                  # language, framework, versions, why
│   │   ├── 02-architecture.md           # layers, folders, request flow
│   │   ├── 03-api.md                    # every endpoint: method, path, auth, request/response, errors
│   │   ├── 04-security.md               # auth, authorization, validation, secrets
│   │   ├── 05-testing.md                # test strategy, frameworks, coverage targets
│   │   ├── 06-configuracion.md          # env vars, config files, secrets management
│   │   └── 07-integracciones.md         # external services (only when the project has them)
│   ├── db/                              # persistence layer (skip only per gate)
│   │   ├── README.md
│   │   ├── setup.md                     # engine, connection, migrations workflow, seeds
│   │   ├── schemas/
│   │   │   ├── README.md
│   │   │   ├── 01-<entidad>.md          # one file per table/collection: fields, types, constraints, relations
│   │   │   └── index.md                 # full data model in one file + relationship summary
│   │   ├── enums/                       # one file per enum/constant set used by the schema
│   │   │   └── README.md
│   │   └── use-cases/                   # one file per user story → data flow
│   │       ├── README.md
│   │       └── 01-<caso-de-uso>.md
│   ├── frontend/                        # client application (web/mobile)
│   │   ├── README.md
│   │   ├── 01-stack.md                  # framework, language, versions, why
│   │   ├── 02-design.md                 # design tokens, palette, typography, components
│   │   ├── 03-architecture.md           # folders, layers, state, data fetching
│   │   ├── 04-screens.md                # one section per screen: purpose, data, actions, navigation
│   │   ├── 05-quality.md                # lint, tests, a11y, performance targets
│   │   └── 06-estado.md                 # state management strategy (only for complex state)
│   └── api/                             # public API contract (only per gate)
│       ├── README.md
│       └── 01-<recurso>.md              # one file per resource: full endpoint contract
└── tasks/
    ├── README.md                        # how to use and update the checklists
    ├── backend/
    │   ├── 01-<feature-area>.md
    │   └── ...
    ├── db/
    │   └── ...
    └── frontend/
        └── ...
```

## Document Templates

### docs/ files

- **01-descripcion-proyecto.md** — sections: `Qué es` (pitch), `Para quién` (actors), `Problema que resuelve`, `Funcionalidades principales` (numbered list), `Fuera de alcance`.
- **02-global-instruction.md** — sections: `Visión general`, `Índice de módulos` (table: module → files → purpose), `Referencia rápida del stack`, `Cómo navegar este árbol` (reading order).
- **03-ejecucion-local.md** — sections: `Requisitos previos`, `Instalación`, `Ejecución` (dev), `Pruebas`, `Build/producción`. Real commands from the repo — never invented ones.
- **04-buenas-practicas.md** — sections: `Convenciones de código`, `Estructura de carpetas`, `Errores y logging`, `Commits y ramas`, `Revisión de código`.
- **05-requisitos-no-funcionales.md** — sections: `Rendimiento`, `Seguridad`, `Escalabilidad`, `Disponibilidad`, `Mantenibilidad`. Each with concrete measurable targets when the project defines them.
- **06-glosario.md** — a definition list (term — definition). Only domain terms that appear in the rest of the tree; skip if the domain has no special terms.
- **07-decisiones.md** — one entry per decision: `Contexto` (problem), `Decisión` (what was chosen), `Alternativas` (considered), `Consecuencias` (tradeoffs). Only when a strong decision was made.

### backend/ files

- **01-stack.md** — `Lenguaje y versión`, `Framework`, `Versiones clave`, `Por qué esta elección`, `Comandos de desarrollo` (from the detected package.json).
- **02-architecture.md** — `Capas` (diagram in text), `Responsabilidad por capa`, `Estructura de carpetas` (real tree), `Flujo de una request` (step by step), `Patrones usados` (repositories, services, DTOs...).
- **03-api.md** — one subsection per resource/endpoint group. Per endpoint: `Método y ruta`, `Auth requerida` (role if any), `Request` (body/params/query with types), `Response 200` (shape), `Errores` (status codes + body), `Paginación` (when a list), `Ejemplo` (request/response pair). Include the full real set of endpoints the app needs — do not stop at generic CRUD when the description implies more.
- **04-security.md** — `Autenticación` (mechanism, token strategy), `Autorización` (roles/permissions table), `Validación de entrada`, `Secretos` (env vars list, never values), `Rate limiting`, `CORS`.
- **05-testing.md** — `Framework`, `Unidad` (targets), `Integración`, `E2E`, `Cobertura objetivo`, `Comandos` (real from package.json).
- **06-configuracion.md** — table of environment variables: `Variable`, `Descripción`, `Valor por defecto`, `Obligatoria`, `Entorno` (dev/staging/prod).
- **07-integracciones.md** — per integration: `Servicio`, `Propósito`, `Protocolo` (REST/graphql/SDK...), `Autenticación`, `Fallbacks` (what happens when it fails).

### db/ files

- **setup.md** — `Motor y versión`, `Conexión` (DSN shape, no secrets), `Workflow de migraciones`, `Seeds`, `Scripts` (real commands).
- **schemas/01-<entidad>.md** — sections: `Propósito`, `Tabla` (as a markdown table: column | type | nullable | default | constraints/notes), `Relaciones` (what it references and what references it), `Índices`, `Notas` (invariants, soft deletes, audit fields). One file per real entity — the full set implied by the description, never a subset.
- **schemas/index.md** — `Modelo completo` (all entities with their key fields), `Resumen de relaciones` (list: A belongs to B, A has many C...), `Convenciones` (naming, timestamps, soft delete).
- **enums/README.md + one file per enum** — each enum file: `Valores` (markdown table: value | meaning/effect), `Dónde se usa`.
- **use-cases/01-<caso>.md** — sections: `Actor`, `Disparador`, `Flujo principal` (numbered steps touching the schema), `Datos involucrados` (entities/fields), `Alternativas y errores`, `Salida`.

### frontend/ files

- **01-stack.md** — `Framework`, `Lenguaje`, `Versiones clave`, `Por qué`, `Comandos` (real from package.json/app.json).
- **02-design.md** — `Tokens` (colors, spacing, radius, typography scale), `Estilo visual`, `Componentes base` (list), `Iconografía`, `Modo oscuro` (when the app has it).
- **03-architecture.md** — `Estructura de carpetas` (real), `Capas`, `Estado global` (store/solution when applicable), `Data fetching` (strategy: hooks, tanstack, rtk...), `Navegación` (routes/screens registry).
- **04-screens.md** — one section per screen: `Propósito`, `Datos que muestra`, `Acciones del usuario`, `Navegación desde/hacia`, `Estados` (loading/empty/error). The full set of screens the app needs.
- **05-quality.md** — `Lint`, `Formateo`, `Tests` (framework, targets), `Accesibilidad`, `Rendimiento objetivo`, `Comandos`.
- **06-estado.md** — only when state is non-trivial: `Dominio del estado`, `Solución` (context/zustand/redux...), `Reglas de actualización`, `Persistencia`.

### api/ files

One file per resource. Sections per endpoint: `Método y ruta`, `Auth`, `Request`, `Response 200`, `Errores`, `Paginación`, `Ejemplo`. The api/ module is the public contract; the backend module holds the implementation notes.

### tasks/ files

One file per feature area, following this exact structure:

```
# <Área de funcionalidad>

## Estado Actual
[What exists today — one short paragraph; if greenfield: "Proyecto nuevo, no hay código".]

## Objetivo
[One sentence describing the finished behavior.]

## Alcance
- [in scope bullets]
## Fuera de alcance
- [out of scope bullets]

## Tareas
- [ ] 1. <verbo> <objeto concreto>
  - Detalle de implementación (archivos/funciones reales cuando se conocen)
- [ ] 2. ...
  ...
- [ ] n. 

## Criterios de Done
- [ ] Comportamiento del objetivo verificable
- [ ] Tests que lo cubren
- [ ] Sin regresiones en el área
```

Rules: numbered checkboxes (the number is the execution order), each root task has a short implementation detail line under it, the checklist MUST cover backend/db/frontend implications of the feature (cross-check the module docs), and the Done criteria close the loop.

## Execution Steps

1. Inspect the project root: stack markers (`.csproj`, `package.json`, `app.json`, `prisma/`, `migrations/`, `*.sql`), README, and existing structure.
2. Create the base tree: `specs/`, `specs/docs/`, `specs/modules/{backend,db,frontend}/`, `specs/tasks/{backend,db,frontend}/`. Apply the gates: add `modules/api/` only when justified; skip `modules/db/` only when the project has no persistence.
3. Write `specs/descripcion-proyecto.md` (one paragraph) and `specs/global-instruction.md` (module index + navigation).
4. Write the `docs/` files using the Document Templates: `01-descripcion-proyecto.md`, `02-global-instruction.md`, `03-ejecucion-local.md` (real commands from the repo), `04-buenas-practicas.md`, `05-requisitos-no-funcionales.md`, `06-glosario.md`, and `07-decisiones.md` only when a strong decision was made.
5. Write the module files using the Document Templates:
   - backend: `README.md` + `01-stack.md` through `06-configuracion.md` (+ `07-integracciones.md` when external services exist).
   - db: `README.md`, `setup.md`, one file per entity in `schemas/` + `index.md`, one file per enum in `enums/` + README, one file per use case in `use-cases/` + README.
   - frontend: `README.md` + `01-stack.md` through `05-quality.md` (+ `06-estado.md` when state is non-trivial).
   - api (when the gate triggered): `README.md` + one file per resource.
   Every endpoint, entity, screen, and task in these files must come from the project description — derive the complete set, not a subset.
6. Write `specs/tasks/README.md` (how checklists are used and updated) and one task file per feature area for each module (`backend/`, `db/`, `frontend/`), following the tasks/ template: current state, objective, scope, numbered actionable checklist, Done criteria. Cross-check that every feature in the module docs has an implementation path here.
7. Review: verify the tree matches the Spec Tree Contract, no module is referenced without existing, `tasks/` is not empty for any module, and no placeholder text remains. Report the created tree (table: module → files → purpose) and the feature areas covered; then state the recommended first task file to start implementation.

## Output Contract

Return the list of created paths and the module/task coverage. `specs/tasks/` must never be empty. State the next implementation step (first task file to tick). The tasks folder is the single tracked source of work: implementation progress is recorded by ticking the checkboxes in place.