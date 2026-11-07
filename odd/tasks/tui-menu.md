# fwinit TUI — banner ASCII y menú con la identidad del producto

Feature: the interactive `fwinit` entry gets the product's own look — an ASCII `FWINIT` wordmark
with graceful degradation, one shared inquirer theme across the eleven existing prompts, a context
line, and a real fix for the interactive path hanging when there is no TTY.

## Specs

S1. Running `fwinit` with no arguments in a terminal prints an ASCII `FWINIT` wordmark before the
menu.
> "quiero hacer un mejor menu y poner un ASCII que diga FWINIT"

S2. The banner degrades instead of breaking: no color (`NO_COLOR`, `--no-color`, or a non-TTY)
prints a single plain line; a narrow terminal (`columns < 60`) prints the compact wordmark;
`--no-banner` suppresses it entirely; it is never printed when a command or template argument is
passed, so scripted runs stay clean.

S3. The menu carries the product identity: accent highlight, mono for identifiers (template names,
package managers, paths), label plus description on the same row, hairline separators between
groups, and one context line with version, working directory, how many templates exist and how many
global skills are installed.

S4. All eleven prompts adopt the shared theme and keep their behavior: same question, same return
type, same defaults and validation. No flow changes order.

S5. No new dependency: the CLI stays on inquirer 12, chalk 5 and ora 8.

S6. `fwinit` with no arguments and no TTY prints help and exits instead of waiting forever for input.

S7. The list and checkbox prompts accept `j` and `k` as down and up, in addition to the arrow keys.
> "quiero usar j y k para ir arriba y abajo aparte de las teclas de arriba y abajo"

## Tasks

| ID | Spec | Route | Commit |
| --- | --- | --- | --- |
| T1 | S1,S2 | worker: `cli/src/banner.ts` + tests (render, degradation, width) | pending |
| T2 | S3 | worker: `cli/src/menu.ts` + tests (theme, context line, separators) | pending |
| T3 | S4 | worker: restyle the eleven prompts in `cli/src/prompts.ts` | pending |
| T4 | S1,S2,S6 | worker: wiring in `cli/src/index.ts` (`--no-banner`, `--no-color`, non-TTY help) + README | pending |
| T5 | all | parent: 209 tests, typecheck, build, PTY smoke (banner, j/k, arrows, literal input, no-TTY, NO_COLOR, `--no-banner`, `--no-color`) | pending |
| T6 | S7 | worker + parent: `theme.keybindings: ["vim"]` on list/checkbox only; test pins our input, not inquirer internals | pending |

## Design decisions

The wordmark is 44 columns wide, so it fits an 80-column terminal with room for the tagline:

```
███████╗██╗    ██╗██╗███╗   ██╗██╗████████╗
██╔════╝██║    ██║██║████╗  ██║██║╚══██╔══╝
█████╗  ██║ █╗ ██║██║██╔██╗ ██║██║   ██║
██╔══╝  ██║███╗██║██║██║╚██╗██║██║   ██║
██║     ╚███╔███╔╝██║██║ ╚████║██║   ██║
╚═╝      ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝
```

Compact variant (narrow terminals, 17 columns):

```
█▀▀ █ █ █ █▄ █ █ ▀█▀
█▀  █▄█ █ █ ▀█ █  █
```

Plain variant (no color, non-TTY): `fwinit v<version> — scaffolding full stack`.

The palette follows the landing page: accent `#8aa2ff` for the highlighted row and the wordmark,
muted for descriptions and separators, no new colors. chalk already resolves truecolor/256/16,
so the same calls degrade on their own; `--no-color` forces chalk level 0.

The context line reads from disk through functions that already exist (`TEMPLATES`,
`resolveGlobalTargets`, `discoverSkills` from the studio) and never fails the menu: any read error
just omits that fragment.

## Log

L1 (user request, verbatim):
"ahora me gustaria hacer una cosa pero primero necesito que me recomiendes que hacer, quiero mejorar la TUI, cuando pongo fwinit quiero mejorar esa interfaz, que me recomndas hacer?? quioer hacer un mejor menu y poner un ASCII que diga FWINIT"

L2 (decision): stay on inquirer 12 and build the look with its shared `theme` and per-choice
`description`. A new TUI dependency (`@clack/prompts`) was rejected: it adds a published-package
dependency and a rewrite of all eleven prompts for a look inquirer can already reach.

L3 (correction): the plan said "ten prompts"; the file has eleven. The inventory is
`selectScope`, `selectTemplateFromLayer`, `askProjectName`, `selectPackageManager`, `askLayerLayout`,
`askGitInit`, `askFlutterOrg`, `askGlobalSkillsToo`, `selectSkillsAction`, `selectGlobalTargets`,
`selectGlobalTargetsToRemove`.

L5 (implementation notes): `j`/`k` come from inquirer's own `theme.keybindings: ["vim"]` on the
selection prompts only, so `brandTheme` (input/confirm) keeps them literal characters; the knob is
applied per prompt, not globally. Its documented side effect is that type-to-search is off in those
prompts, which is the trade we want because `j`/`k` must win. The suite pins our input (the theme)
and the documented mapping against a local table instead of importing `@inquirer/core`, a
transitive that no declared dependency of ours guarantees. `--no-banner` also hides the context
line: the whole header block belongs to the interactive moment.

L4 (requirement change, verbatim): "quiero usar j y k para ir arriba y abajo aparte de las teclas de
arriba y abajo". Applies to the list and checkbox prompts only; text inputs must keep receiving `j`
and `k` as literal characters. Arrow keys keep working; no other vim binding is added (`h`/`l`, `q`).
