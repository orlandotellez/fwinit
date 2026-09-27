---
description: Create the specs/ folder (docs, modules by backend/db/frontend, per-module task checklists) — routes to create-specs-from-code when the project already has code
---

Load `create-specs` first, then route the request to the right mode BEFORE creating any file.

Do NOT assume greenfield. Inspect the project root and pick the mode with this table:

| `specs/` exists | Git history | Source code | Action |
|---|---|---|---|
| yes | any | any | Ask ONE question: extend/merge the existing tree, or regenerate it. Never overwrite silently |
| no | >10 commits | yes | Ask ONE question: document the code that exists (`create-specs-from-code`) or specify a NEW project (`create-specs`) |
| no | 0-1 commits | yes | Fresh scaffold: default to `create-specs`. Mention that `/create-specs-from-code` exists if the user actually wants the existing code documented |
| no | any | no | `create-specs` directly, no question needed |

Count commits with `git rev-list --count HEAD` (ignore the failure when there is no git repo). Detect source code with real markers: `package.json`, `*.csproj`, `*.sln`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle`, `composer.json`, `Gemfile`, `src/`, `app/`.

A freshly scaffolded project from `fwinit` already ships `backend/` with a real `package.json`, so "code exists" alone is NOT a reason to ask — that is why the git-history column exists. Only ask when there is meaningful history behind the code.

## When the answer is `create-specs`

Create the `specs/` folder at the project root from the project description the user provides after `/create-specs`.

The description can be short (e.g. "app de finanzas personales") — the skill inspects the project to detect the stack and fills the structure. If the description is missing or ambiguous, ask one focused clarification before creating files.

## When the answer is `create-specs-from-code`

Load the `create-specs-from-code` skill instead and follow it. The project already has real code: every fact in the specs must come from reading an actual file, and `tasks/` holds the debt and gaps found in that code.

## Examples

Example prompts to show users how to write good descriptions live in `skills/create-specs/examples/` (rich public-landing prompt, full-stack finance app detailed module by module). If the user asks for example prompts, reference that folder before generating.
