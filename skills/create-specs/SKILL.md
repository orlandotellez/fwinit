---
name: create-specs
description: "Trigger: create-specs, specs, crear specs, especificaciones, proyecto nuevo. Create the specs/ folder for a NEW project: docs, modules by backend/db/frontend, per-module task checklists. For an existing codebase use create-specs-from-code."
license: Apache-2.0
metadata:
  author: "orlandotellez"
  version: "2.0"
---

## Activation Contract

Run when invoked via `/create-specs <project description>` or when the user asks to create the `specs/` folder for the current project. The supplied description is the seed; the skill turns it into a complete specification tree at the project root.

## Hard Rules

- **Group DB files by DOMAIN, never 1:1 with entities.** `schemas/` and `use-cases/` hold 3-6 files each (catalog.md, orders.md, ...), each covering the full tables and flows of its domain. This is a layout rule with a hard requirement behind it: the ENTITY SET is never reduced — every entity and every use case implied by the description must be documented, just grouped. "20 entities = 20 files" is forbidden; "20 entities in 4 domain files" is mandatory.
- **Write independent files in PARALLEL, in batches.** This tree is ~90 files; writing them one at a time is the single largest cost of this skill. Group every file whose content does not depend on another and issue those writes in the same turn. A reasonable batch is 5-10 files. Serialize only what genuinely depends on a previous result (e.g. `docs/08-documentacion-cliente.md`, which is derived from the finished tree). Never let "one file per turn" become the default — it roughly doubles the wall time for no gain.
- **Keep the specs root free of standalone documents.** `docs/` is the single container for every project document; the root holds only the three folders (`docs/`, `modules/`, `tasks/`). Never write `descripcion-proyecto.md`, `global-instruction.md`, or any newer document at the root — a root copy and a `docs/` copy of the same document is how they drift apart.
- Create `specs/` only at the project root. Never overwrite an existing `specs/` tree without explicit user approval.
- `specs/tasks/` is MANDATORY: never finish without per-module task files, one per feature area, each with a current-state section plus an actionable numbered checklist.
- Detect the stack before writing: `*.csproj` → ASP.NET Core; `package.json` → fastify, express, node, or react-native/expo; `prisma/`, `migrations/`, `*.sql` → DB stack. Generate module content for the detected stack, never generic filler.
- Follow the Spec Tree Contract exactly: every file has a fixed numeric prefix and a fixed purpose; do not invent extra root files.
- Every module doc and task file must be concrete and project-specific: name real entities, real endpoints, real screens, real fields. Vague placeholders like "TODO" or "implementar lógica" are forbidden.
- Number files inside each module (`01-`, `02-`, ...) so the reading order is explicit. Each module folder gets a `README.md` linking and briefly describing its files.
- Tasks are the single tracked source of implementation work: progress is recorded by ticking checkboxes in place; task files must never be deleted or renamed after creation.
- Write artifacts in the project's language with a neutral, professional register. English repos get English docs; Spanish repos get neutral Spanish — never slang.
- `docs/08-documentacion-cliente.md` is MANDATORY: a business-level document for the client in plain language. Every module, technology, screen, endpoint count, entity group, integration, and flow it mentions must exist in the generated specs tree — derive, never invent. It is written LAST, when the rest of the tree is final.
- Review the generated tree before reporting: every module referenced in `02-global-instruction.md` must exist, and `tasks/` must have at least one file per module.

## Decision Gates

| Situation | Action |
|-----------|--------|
| Description too vague to derive features/modules | Ask one focused clarifying question before generating |
| `specs/` already exists | Confirm overwrite or merge scope with the user |
| Project has THIRD-PARTY consumers of its API (external integrations, a public developer portal) | Add `modules/api/` with the public contract; the app's own frontend still consumes `backend/03-api.md`. Do NOT add it just because the frontend exists — that API is already covered |
| Project has no persistent storage (pure static site, prototype) | Document that decision in `docs/05-requisitos-no-funcionales.md` and skip `modules/db/` (state it explicitly) |
| A strong architectural decision is made during generation (pattern choice, DB engine, auth provider) | Record it in `docs/07-decisiones.md` with rationale and alternatives |

## Spec Tree Contract

Build exactly this tree (adapt module files to the detected stack — never fewer than the template, more only when a gate above triggers):

```
specs/
├── docs/
│   ├── 01-descripcion-proyecto.md       # full project description
│   ├── 02-global-instruction.md         # overview, module index, stack quick reference
│   ├── 03-ejecucion-local.md            # how to run/build/test the project
│   ├── 04-buenas-practicas.md           # coding conventions and quality bar
│   ├── 05-requisitos-no-funcionales.md  # performance, security, scalability, availability
│   ├── 06-glosario.md                   # domain terms with definitions
│   ├── 07-decisiones.md                 # ADR log (only when a strong decision was made)
│   └── 08-documentacion-cliente.md      # business-level doc FOR THE CLIENT: modules, technologies, use cases, flows (plain language)
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
│   │   │   ├── <dominio>.md             # one file per DOMAIN (catalog.md, orders.md...): full tables for every entity in that domain
│   │   │   └── index.md                 # full data model in one file + relationship summary
│   │   ├── enums/                       # one file per enum/constant set used by the schema
│   │   │   └── README.md
│   │   └── use-cases/                   # data flows per user story, grouped by domain
│   │       ├── README.md
│   │       └── <dominio>.md             # one file per domain: its user stories → data flows
│   ├── frontend/                        # client application (web/mobile)
│   │   ├── README.md
│   │   ├── 01-stack.md                  # framework, language, versions, why
│   │   ├── 02-design.md                 # design tokens, palette, typography, components
│   │   ├── 03-architecture.md           # folders, layers, state, data fetching
│   │   ├── 04-screens.md                # one section per screen: purpose, data, actions, navigation
│   │   ├── 05-quality.md                # lint, tests, a11y, performance targets
│   │   └── 06-estado.md                 # state management strategy (only for complex state)
│   └── api/                             # EXTERNAL public contract (only per gate, see Decision Gates):
│       │                                # for third-party consumers only; the app's own frontend uses backend/03-api.md
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

### docs/08-documentacion-cliente.md

Business-level documentation written for the client/stakeholder — plain language, no jargon. EVERY fact must come from the generated specs tree (modules, screens, endpoints, entities, integrations): never invent anything. Write it in the project's language. Use this exact section structure:

1. **Introducción** — qué es el sistema (pitch de 2-3 párrafos) y "¿Qué resuelve?" (lista de beneficios concretos en lenguaje simple).
2. **Visión General del Sistema** — las grandes etapas del ciclo de vida del sistema (numeradas, de punta a punta) + tabla de roles: `Rol` | `¿Qué puede hacer?`.
3. **Cómo está organizado el sistema** — arquitectura en términos simples: si hay backend, sus capas y por qué (ej. "la lógica no depende de la base de datos"); cómo está organizado el frontend (módulos funcionales, páginas).
4. **Tecnologías Utilizadas** — tablas separadas por capa (`Backend`, `Frontend`, `Infraestructura`): `Tecnología` | `¿Para qué se usa?` — cada una explicada en una línea simple, tomada de los `01-stack.md` y `07-integracciones.md` reales de las specs.
5. **Base de Datos** — entidades agrupadas por tema (tabla: `Grupo` | `Tablas/entidades que incluye`) + "algunas reglas importantes": identificadores, timestamps, borrado lógico, restricciones de unicidad (tomadas de `db/schemas/`).
6. **Módulos Principales del Sistema** — uno por módulo del árbol de specs, con descripción de negocio del qué hace (no cómo).
7. **Pantallas Principales** — agrupadas por zona (pública, autenticación, panel de cada rol) con el propósito de cada una (tomadas de `frontend/04-screens.md`).
8. **Autenticación y Seguridad** — mecanismo de sesión (tokens/cookies en lenguaje simple), roles y permisos, medidas de seguridad (verificación de email, bloqueos, hash de contraseñas, auditoría).
9. **Servicios Externos** — por integración: servicio y para qué se usa (tomado de `backend/07-integracciones.md`).
10. **Flujos Principales del Sistema** — por flujo clave del negocio (ej. compra, creación de contenido, aprendizaje): lista numerada de pasos en lenguaje simple, fácil de seguir.
11. **Casos de Uso por Tipo de Usuario** — por rol (incluido el visitante sin cuenta si aplica): lista de acciones principales que puede realizar.
12. **Resumen General del Sistema** — tabla resumen: `Aspecto` | `Detalle` (cantidad de módulos, pantallas, endpoints, tablas, roles, permisos; tecnologías clave; método de pago si existe).

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
- **schemas/<dominio>.md** — one file per DOMAIN (3-6 files typically, never one per entity). Group entities by business domain: `catalog.md` (Product, Category, ...), `orders.md` (Order, OrderItem, Payment, ...), `customers.md`, etc. Per entity inside the file: `Propósito`, `Tabla` (as a markdown table: column | type | nullable | default | constraints/notes), `Relaciones` (what it references and what references it), `Índices`, `Notas` (invariants, soft deletes, audit fields). The full set of entities is mandatory — grouping changes file count, never completeness.
- **schemas/index.md** — `Modelo completo` (all entities with their key fields), `Resumen de relaciones` (list: A belongs to B, A has many C...), `Convenciones` (naming, timestamps, soft delete).
- **enums/README.md + one file per enum** — each enum file: `Valores` (markdown table: value | meaning/effect), `Dónde se usa`.
- **use-cases/<dominio>.md** — one file per domain, each holding its user stories. Per use case inside the file: `Actor`, `Disparador`, `Flujo principal` (numbered steps touching the schema), `Datos involucrados` (entities/fields), `Alternativas y errores`, `Salida`. Grouping changes file count, never completeness.

### frontend/ files

- **01-stack.md** — `Framework`, `Lenguaje`, `Versiones clave`, `Por qué`, `Comandos` (real from package.json/app.json).
- **02-design.md** — the project's design system, consumable by the design skills (they read the tokens from here):
  - `Design tokens` — semantic color roles: `base`, `surface`, `surface-elevated`, `border`, `text`, `text-secondary`, `text-muted`, `accent` (the model's ONLY brand-color input; design skills derive their scale from it) + `success`/`error`. Each role as a concrete value + usage note.
  - `Tipografía` (scale + font stack), `Espaciado`, `Radio y sombras`, `Componentes base` (list), `Iconografía`, `Modo oscuro` (when the app has it).
- **Regla de paleta**: if the prompt describes colors in natural language (e.g. "rosa, morado y blanco", "azul marino con acentos dorados"), translate the description into concrete, coherent values for each semantic role — never leave the description unresolved, never copy palettes from other projects, and verify AA contrast on every text role.
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

Steps are grouped into BATCHES. Within a batch, write every file in the same turn — the files in a batch are independent. Only cross-batch dependencies are serialized. Batching is mandatory, not an optimization: this tree is ~90 files and sequential writing is what makes it slow.

1. **Inspect.** Project root: stack markers (`.csproj`, `package.json`, `app.json`, `prisma/`, `migrations/`, `*.sql`), README, existing structure.
2. **Create directories.** `specs/`, `specs/docs/`, `specs/modules/{backend,db,frontend}/`, `specs/tasks/{backend,db,frontend}/`. Apply the gates: add `modules/api/` only when justified; skip `modules/db/` only when the project has no persistence.
3. **Batch A — `docs/` (parallel).** Using the Document Templates: `01-descripcion-proyecto.md`, `02-global-instruction.md`, `03-ejecucion-local.md` (real commands from the repo), `04-buenas-practicas.md`, `05-requisitos-no-funcionales.md`, `06-glosario.md`, and `07-decisiones.md` only when a strong decision was made. Write all of them in this turn.
4. **Batch B — backend module (parallel).** `README.md` + `01-stack.md` through `06-configuracion.md`, plus `07-integraciones.md` when external services exist.
5. **Batch C — db module (parallel).** `README.md`, `setup.md`, one file per DOMAIN in `schemas/` + `index.md`, one file per enum in `enums/` + README, one file per DOMAIN in `use-cases/` + README. All in this turn.
6. **Batch D — frontend module (parallel).** `README.md` + `01-stack.md` through `05-quality.md` (+ `06-estado.md` when state is non-trivial).
7. **Batch E — api module (parallel, when the gate triggered).** `README.md` + one file per resource.
8. **Batch F — tasks (parallel).** `specs/tasks/README.md` and one task file per feature area for each module, following the tasks/ template: current state, objective, scope, numbered actionable checklist, Done criteria. Cross-check that every feature in the module docs has an implementation path here. All in this turn.
9. **Batch G — serialized, one file.** `specs/docs/08-documentacion-cliente.md` LAST, derived from the completed tree, following its template (12 sections): modules, technologies, DB grouping, screens, integrations, flows, use cases per role. This is the only file that must wait for everything else.
10. **Review from memory, not by re-reading.** You wrote every file in this session; verify against the Contract from what you just produced instead of re-reading the tree. Report it (table: module → files → purpose) and the feature areas covered, then state the recommended first task file to start implementation.

Every endpoint, entity, screen, and task in these batches must come from the project description — derive the complete set, not a subset.

## Output Contract

Return the list of created paths (including `specs/docs/08-documentacion-cliente.md`) and the module/task coverage. `specs/tasks/` must never be empty. State the next implementation step (first task file to tick). The tasks folder is the single tracked source of work: implementation progress is recorded by ticking the checkboxes in place.

## Example Prompts

**Read at most ONE example, and only when you need it.** The four files in `examples/` total ~1400 lines; loading all of them spends a large slice of the context window on material that mostly does not apply to the project in front of you, and dilutes the instructions above. Pick by situation:

| Situation | Read this one file | Never read it if |
|-----------|-------------------|------------------|
| A full-stack project from a rich description (the common case) | `examples/02-app-finanzas-fullstack.md` — one seed vs the same app detailed **module by module (11 modules), screen by screen, with business rules, endpoints, DB entities and indexes, and non-functional requirements**. The depth reference. | — |
| A public-only landing or static site with no persistence | `examples/01-landing-pasteleria-dulce-atelier.md` — also demonstrates the "no persistence" gate | the project has a database or an API |
| An existing repo that may already have a `specs/` tree | `examples/03-pos-system.md` — reading and extending instead of overwriting; the reference for **money and tenancy invariants** (`DECIMAL` for every amount with zero float arithmetic in the frontend, `store_id` derived from the session and never from the request, immutable sales with frozen prices, stock that only changes through an inventory movement, soft-delete restricted to the catalog) | the project is greenfield |
| Writing `docs/08-documentacion-cliente.md` and unsure of the target register | `examples/ejemplo-documentacion-cliente-cursinet.md` — plain business language, role tables, technology tables, numbered flows, per-role use cases, summary table | the file's 12-section template above is already clear to you |

Use an example as a style mold, never as copyable content. A short seed always works — the skill inspects the stack and fills the structure — so **no example is required to start**. When the user asks for example prompts to create specs, point them at the `examples/` folder instead of reading them all yourself.