---
description: Create the specs/ folder for a project that ALREADY EXISTS, deriving every fact from reading its real code (for a NEW project use /create-specs)
---

Load `create-specs-from-code` first, then build the `specs/` folder at the project root by reading the repository's real source code.

The skill must map the codebase before writing anything: entry points, folder layout, dependency manifest, route tables, ORM/schema files, migrations, test suites, env/config files. Every entity, endpoint, screen, table, and env var written into the specs must be traceable to a real file path, and the spec must never invent anything that is not in the code. `tasks/` holds debt and gaps found in the code (missing tests, absent validation, unhandled errors, undocumented endpoints, missing auth), each citing its real file.

Output style references live in `skills/create-specs/examples/` at the project root (they ship with the sibling `create-specs` skill), including the finished `documentacion-cliente.md` mold. Use them as a style mold, never as copyable content.

The Spec Tree Contract and the Document Templates are inherited from `create-specs/SKILL.md` — read them there; the tree shape is identical, only the source of truth changes.

If `specs/` already exists, ask whether to extend/merge the tree or regenerate it. Never overwrite silently.
