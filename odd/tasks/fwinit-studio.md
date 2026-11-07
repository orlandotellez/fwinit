# fwinit studio — local browser UI for installed skills and project specs

Feature: `fwinit studio` starts a loopback HTTP server, opens the browser, and renders
installed agent skills (opencode, pi, gentle-shell) plus the current project's `specs/`
tree, using the landing-page design system (tokens verbatim, square corners, mono labels).

## Specs

S1. `fwinit studio` opens a graphical interface in the browser.
> "si yo ejecuto ese comando me va a abrir en el navegador una interfaz grafica"

S2. The interface lists the skills installed for opencode, pi and gentle-shell.
> "en el que yo pueda ver las skills que tengo instaladas en opencode, pi y gentle-shell"

S3. The interface reads the `specs/` folder of the project the command runs in and renders it.
> "tambien me tiene que permitir ver con una intefaz bonita las specs del proyecto en el que me encuentro, el va a buscar la carpeta specs y eso va a mostrar en la interfaz"

S4. Visual language is the landing page's: same design scheme.
> "asi que hazlo bonito, el mismo diseño que la landing-page, el mismo esquema de diseño"

S5. When the project has no `specs/` folder the specs view reports that explicitly instead of
failing: the rest of the studio stays usable.

S6. The server binds loopback only and refuses any file path that escapes the scanned roots.

S7. Each skill can be read from the interface, not only located: its own text files are listed and
rendered, `SKILL.md` first.
> "quieor poder leer lo que dice cada skill, quiero leer el contenido de cada una"

S8. The top navigation orders Specs before Skills; the default view stays Skills so the studio never
opens on an empty specs tree.
> "primero Specs y luego skills en la navegacion de arriba"

## Tasks

| ID | Spec | Route | Commit |
| --- | --- | --- | --- |
| T1 | S1,S4 | inline: branch, contract `cli/src/studio/types.ts` | `feat(studio): descubrimiento de skills de agente instaladas` |
| T2 | S2 | worker W1: `skills.ts`, `frontmatter.ts` + 22 tests (RED 19 fail → GREEN) | `feat(studio): descubrimiento de skills de agente instaladas` |
| T3 | S3,S5 | worker W2: `specs.ts`, `markdown.ts` + 32 tests (RED 32 fail → GREEN) | `feat(studio): render de las specs del proyecto como markdown` |
| T4 | S4 | inline: `ui/tokens.ts`, `ui/styles.ts`, `ui/document.ts`, `ui/client.ts` | `feat(studio): tokens de diseño de la landing` + `feat(studio): shell y cliente de navegador` |
| T5 | S1,S6 | inline: `server.ts`, `open-browser.ts`, `index.ts` wiring, `server.test.ts`, `links.test.ts` | `feat(studio): servidor loopback y comando fwinit studio` |
| T6 | all | `gentle-ai-verify` + `gentle-ai-worker` fix round: 151 tests, tsc clean, build ok, live loopback probes | `docs(studio): documentación de fwinit studio` |
| T7 | S7 | worker data layer (`skill-files.ts`, routes) + inline UI (file chips, rendered content) + independent verification round | pending |
| T8 | S8 | inline: tab order in `ui/document.ts` | pending |

### Verification evidence

- `cd cli && bun test` → 151 pass, 0 fail, 698 expect() calls, 12 files.
- `cd cli && bunx tsc --noEmit -p tsconfig.json` → no output.
- `cd cli && bun run build` → ESM 150.09 KB + DTS build success; `dist/index.js` contains the UI strings.
- Live smoke on the demo project: `/` 200 with landing tokens, `/api/skills` 3 targets,
  `/api/specs` found:true, `/api/specs/file` 200 with escaped source and specs-root-relative links,
  foreign `Host` → 403, `/%` → 400, `POST` → 405, traversal/symlink escapes → 400/403, LAN address → refused.
- Visual proof: skills list (17 real global skills, `~` shortening), specs tree + markdown article
  with TOC, task checkboxes, table and code fence, dark and light themes, empty-specs state, and
  inter-spec link navigation, all captured in the terminal browser at 1440×900.

### Commit slices

| # | Commit | Files | Authored lines |
| --- | --- | --- | --- |
| 1 | `feat(studio): descubrimiento de skills de agente instaladas` | types, frontmatter, skills (+tests) | ~1130 |
| 2 | `feat(studio): render de las specs del proyecto como markdown` | specs, markdown (+tests) | ~1300 |
| 3 | `feat(studio): tokens de diseño de la landing para el studio` | ui/tokens.ts, ui/styles.ts | ~1270 |
| 4 | `feat(studio): shell y cliente de navegador del studio` | ui/document.ts, ui/client.ts | ~980 |
| 5 | `feat(studio): servidor loopback y comando fwinit studio` | server, open-browser, index wiring, server/links tests | ~800 |
| 6 | `docs(studio): documentación de fwinit studio` | README, this feature doc | ~120 |

Review workload: every slice is above the ~400 authored-line guideline because the feature is a new
subsystem whose surgical units are a whole design system (1.2k lines of CSS-in-TS) and a whole
browser client. The boundaries chosen keep each commit independently reviewable by concern
(discovery, rendering, design tokens, shell, transport, docs) rather than by line count. Splitting
further would separate a stylesheet from the components it styles or tests from the module they pin.

## Log

L1 (user request, verbatim):
"ahora vamos a hacer algo muy interesante y muy bonito, vamos a hacer "fwinit studio", si yo ejecuto ese comando me va a abrir en el navegador una interfaz grafica en el que yo pueda ver las skills que tengo instaladas en opencode, pi y gentle-shell, tambien me tiene que permitir ver con una intefaz bonita las specs del proyecto en el que me encuentro, el va a buscar la carpeta specs y eso va a mostrar en la interfaz, asi que hazlo bonito, el mismo diseño que la landing-page, el mismo esquema de diseño"

L2 (decision): reuse the landing-page token contract verbatim (dark + light + `prefers-color-scheme`),
`data-theme` on `<html>`, `fwinit:theme` localStorage key, square radii, hairline separators,
Inter for prose and JetBrains Mono for paths/labels. The studio is served as static HTML/CSS/JS
from the CLI bundle: no Astro build step, no runtime framework.

L3 (decision): no new runtime dependency. Node `http` (the CLI shebang is node), an in-house
markdown renderer, and an in-house YAML frontmatter reader keep `files: ["dist"]` shipping intact.

L4 (decision): skills discovery reuses the target table already published by
`cli/src/global-skills.ts` (`opencode`, `pi`, `gentle-shell`) and adds project-local scanning for
the same three targets, so the studio shows both scopes with the global one first.

L5 (decision): the studio copy is Spanish because the product's copy is Spanish (CLI messages and
landing page); code comments stay English. Generated identifiers, paths and commit messages stay
English per the default artifact rule.

L6 (verification round, `gentle-ai-verify`): one blocker and four defects were confirmed and fixed
before closing.
1. BLOCKER — the server rewrote `data-spec-link` to specs-root paths, and the client resolved them
   again against the document directory, so every link inside a nested spec 404'd.
2. The loopback test asserted a constant, so a wildcard listen would still pass; replaced by a real
   TCP probe of every non-loopback IPv4.
3. `route()` never re-fetched the document, so clicking a link changed the hash and the tree but
   left the previous document in the pane.
4. Malformed percent-encoding answered 500 instead of 400; foreign `Host` headers were accepted.
5. Frontmatter in a spec rendered as visible paragraphs and rules; it is now stripped from the HTML
   while the raw `markdown` field keeps it.

L7 (deferred, not part of this feature): the studio loads Inter and JetBrains Mono from Google
Fonts because the bundle cannot ship the landing page's self-hosted assets under `files: ["dist"]`.
Self-hosting them inside the bundle is the follow-up that removes the only outbound request.
`SpecsRoots.projectRoot` is currently unused by `readSpecFile` and kept for the server's call shape.

L8 (skill content, L7 spec above): reading a skill goes through a second contained root. The skill
directory is resolved from the target registry, never from the URL, and every file is checked with
`fs.realpath` against the skill directory's realpath before it is read; only an allowlist of text
extensions is served, capped at 512 KB, and any NUL byte in the buffer makes it `unsupported`.
The listing filters by extension only; size and binary guards answer 415 when the file is opened.

L9 (verification round on skill content, `gentle-ai-verify`): two defects found before closing.
1. The client's content cache used `target/name` as its key, so the same skill installed globally
   and in the project shared one cache entry and could show the other scope's files. The key now
   includes the scope, and `links.test.ts` pins it.
2. The binary guard sniffed only the first 4096 bytes, so a NUL at the end of a file was served as
   text. The guard now inspects the whole buffer (bounded by the 512 KB cap), pinned by a test that
   writes its own late-NUL fixture so the shared listing stays stable.
