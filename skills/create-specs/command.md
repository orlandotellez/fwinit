---
description: Create the specs/ folder (docs, modules by backend/db/frontend, per-module task checklists) for the current project from a description
---

Load `create-specs` first, then create the `specs/` folder at the project root from the project description the user provides after `/create-specs`.

The description can be short (e.g. "app de finanzas personales") — the skill inspects the project to detect the stack and fills the structure. If the description is missing or ambiguous, ask one focused clarification before creating files.

Example prompts to show users how to write good descriptions live in `examples/` (rich public-landing prompt, full-stack finance app detailed module by module). If the user asks for example prompts, reference that folder before generating.