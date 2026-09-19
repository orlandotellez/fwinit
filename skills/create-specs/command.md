---
description: Create the specs/ folder (docs, modules by backend/db/frontend, per-module task checklists) for the current project from a description
---

Load `create-specs` first, then create the `specs/` folder at the project root from the project description the user provides after `/create-specs`.

The description can be short (e.g. "app de delivery") — the skill inspects the project to detect the stack and fills the structure. If the description is missing or ambiguous, ask one focused clarification before creating files.