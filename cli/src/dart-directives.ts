/**
 * Sorts each maximal run of consecutive Dart directive lines.
 *
 * This mirrors the `directives_ordering` lint that the Flutter template
 * enables: `library` first, then `dart:` imports, then `package:` imports,
 * then relative imports / `part` directives. The scaffolding renames the
 * template package (`fwiflu`) to the user's Dart name, which can move a
 * `package:` import past `go_router` and break the lint; re-sorting the run
 * after substitution restores the order.
 *
 * Directives are compared by URI using UTF-16 code-unit ordering rather than
 * `localeCompare`, because `localeCompare` collates `/` and `_` differently
 * than Dart's own rule. The sort is stable (no explicit tiebreaker) so two
 * directives that share a URI (e.g. `show A` / `show B`) keep their relative
 * order.
 */

// A `library` directive with or without a URI: `library;`, `library 'name';`.
const LIBRARY_RE = /^library\s*(?:['"]([^'"]*)['"])?\s*;$/;

// `import`/`export`/`part` followed by a quoted URI. `part of 'x.dart';` does
// NOT match (the token after `part` is `of`, not a quote), so it is a barrier.
const DIRECTIVE_URI_RE = /^(import|export|part)\s+(['"])(.+?)\2/;

interface DirectiveKey {
  group: number;
  uri: string;
}

// Group order: library, dart:, package:, then everything else (relative and
// `part`). This is the order the Dart `directives_ordering` lint enforces.
const GROUP_LIBRARY = 0;
const GROUP_DART = 1;
const GROUP_PACKAGE = 2;
const GROUP_OTHER = 3;

function parseDirective(line: string): DirectiveKey | undefined {
  const trimmed = line.trim();

  const library = trimmed.match(LIBRARY_RE);
  if (library) {
    return { group: GROUP_LIBRARY, uri: library[1] ?? "" };
  }

  const directive = trimmed.match(DIRECTIVE_URI_RE);
  if (!directive) return undefined;

  const uri = directive[3];
  let group = GROUP_OTHER;
  if (uri.startsWith("dart:")) {
    group = GROUP_DART;
  } else if (uri.startsWith("package:")) {
    group = GROUP_PACKAGE;
  }

  return { group, uri };
}

function compareKeys(a: DirectiveKey, b: DirectiveKey): number {
  if (a.group !== b.group) return a.group - b.group;
  // Code-unit comparison, matching Dart instead of locale collation.
  return a.uri < b.uri ? -1 : a.uri > b.uri ? 1 : 0;
}

export function sortDartDirectiveRuns(content: string): string {
  const lines = content.split("\n");
  const result = lines.slice();

  let i = 0;
  while (i < lines.length) {
    const key = parseDirective(lines[i]);
    if (!key) {
      i++;
      continue;
    }

    // Extend the run while every line is a sortable directive.
    let j = i;
    const run: { line: string; key: DirectiveKey }[] = [];
    while (j < lines.length) {
      const runKey = parseDirective(lines[j]);
      if (!runKey) break;
      run.push({ line: lines[j], key: runKey });
      j++;
    }

    // Array.prototype.sort is stable, so equal keys keep their input order.
    run.sort((a, b) => compareKeys(a.key, b.key));
    for (let k = 0; k < run.length; k++) {
      result[i + k] = run[k].line;
    }

    i = j;
  }

  return result.join("\n");
}
