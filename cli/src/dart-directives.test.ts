import { describe, expect, test } from "bun:test";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { sortDartDirectiveRuns } from "./dart-directives.js";

const TEMPLATE_DIR = join(import.meta.dir, "..", "..", "templates", "FLUTTER");

// The exact defect: after the scaffolding renames `fwiflu` -> `mi_app`, a
// `package:mi_app/...` import sorts AFTER `package:go_router/...`, but the
// template left go_router last.
const GO_ROUTER_VS_MI_APP = [
  "import 'package:go_router/go_router.dart';",
  "import 'package:mi_app/a.dart';",
];

const DART_PACKAGE_RELATIVE = [
  "import 'package:mi_app/z.dart';",
  "import 'dart:async';",
  "import 'relative.dart';",
  "import 'package:mi_app/a.dart';",
];

const LIBRARY_FIRST = [
  "import 'package:mi_app/a.dart';",
  "library;",
];

const PART_AFTER_PACKAGE = [
  "part 'x.freezed.dart';",
  "import 'package:mi_app/a.dart';",
];

// A deliberately unsorted pair straddling `part of`: if `part of` were not a
// barrier the whole thing would become one run and `z` would move after `a`.
const PART_OF_BARRIER = [
  "import 'package:mi_app/z.dart';",
  "part of 'x.dart';",
  "import 'package:mi_app/a.dart';",
  "",
].join("\n");

const SAME_URI_SHOW = [
  "import 'package:a/a.dart' show A;",
  "import 'package:a/a.dart' show B;",
];

const COMMENTS_AND_BLANKS = [
  "import 'package:mi_app/z.dart';",
  "import 'package:mi_app/a.dart';",
  "// keep me",
  "import 'package:mi_app/c.dart';",
  "import 'package:mi_app/b.dart';",
  "",
  "void main() {}",
  "",
].join("\n");

const COMMENTS_AND_BLANKS_EXPECTED = [
  "import 'package:mi_app/a.dart';",
  "import 'package:mi_app/z.dart';",
  "// keep me",
  "import 'package:mi_app/b.dart';",
  "import 'package:mi_app/c.dart';",
  "",
  "void main() {}",
  "",
].join("\n");

const NO_TRAILING_NEWLINE = "import 'package:b/b.dart';\nimport 'package:a/a.dart';";
const WITH_TRAILING_NEWLINE = `${NO_TRAILING_NEWLINE}\n`;

const SNIPPETS = [
  GO_ROUTER_VS_MI_APP,
  DART_PACKAGE_RELATIVE,
  LIBRARY_FIRST,
  PART_AFTER_PACKAGE,
  SAME_URI_SHOW,
];

describe("sortDartDirectiveRuns", () => {
  test("sorts go_router before a package:mi_app import (the exact defect)", () => {
    expect(sortDartDirectiveRuns(GO_ROUTER_VS_MI_APP.join("\n"))).toBe(
      GO_ROUTER_VS_MI_APP.join("\n")
    );
    // The reverse (unsorted) input must be fixed.
    const unsorted = [
      "import 'package:mi_app/a.dart';",
      "import 'package:go_router/go_router.dart';",
    ].join("\n");
    expect(sortDartDirectiveRuns(unsorted)).toBe(
      GO_ROUTER_VS_MI_APP.join("\n")
    );
  });

  test("orders dart: before package: before relative", () => {
    expect(sortDartDirectiveRuns(DART_PACKAGE_RELATIVE.join("\n"))).toBe(
      [
        "import 'dart:async';",
        "import 'package:mi_app/a.dart';",
        "import 'package:mi_app/z.dart';",
        "import 'relative.dart';",
      ].join("\n")
    );
  });

  test("orders library; before every other directive", () => {
    expect(sortDartDirectiveRuns(LIBRARY_FIRST.join("\n"))).toBe(
      ["library;", "import 'package:mi_app/a.dart';"].join("\n")
    );
  });

  test("sorts part 'x.freezed.dart'; after package: imports", () => {
    expect(sortDartDirectiveRuns(PART_AFTER_PACKAGE.join("\n"))).toBe(
      [
        "import 'package:mi_app/a.dart';",
        "part 'x.freezed.dart';",
      ].join("\n")
    );
  });

  test("treats part of 'x.dart'; as a barrier", () => {
    expect(sortDartDirectiveRuns(PART_OF_BARRIER)).toBe(PART_OF_BARRIER);
  });

  test("keeps the relative order of directives sharing a URI", () => {
    expect(sortDartDirectiveRuns(SAME_URI_SHOW.join("\n"))).toBe(
      SAME_URI_SHOW.join("\n")
    );
  });

  test("never moves comments or blank lines", () => {
    expect(sortDartDirectiveRuns(COMMENTS_AND_BLANKS)).toBe(
      COMMENTS_AND_BLANKS_EXPECTED
    );
  });

  test("preserves the trailing newline exactly", () => {
    expect(sortDartDirectiveRuns(WITH_TRAILING_NEWLINE)).toBe(
      "import 'package:a/a.dart';\nimport 'package:b/b.dart';\n"
    );
    expect(sortDartDirectiveRuns(NO_TRAILING_NEWLINE)).toBe(
      "import 'package:a/a.dart';\nimport 'package:b/b.dart';"
    );
  });

  test("is idempotent on every snippet", () => {
    for (const snippet of [
      ...SNIPPETS.map((lines) => lines.join("\n")),
      PART_OF_BARRIER,
      COMMENTS_AND_BLANKS,
      WITH_TRAILING_NEWLINE,
      NO_TRAILING_NEWLINE,
    ]) {
      const once = sortDartDirectiveRuns(snippet);
      expect(sortDartDirectiveRuns(once)).toBe(once);
    }
  });
});

const EXCLUDED_DIRS = new Set(["build", ".dart_tool", ".idea"]);

async function collectDartFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      results.push(...(await collectDartFiles(join(dir, entry.name))));
    } else if (entry.name.endsWith(".dart")) {
      results.push(join(dir, entry.name));
    }
  }

  return results;
}

describe("template invariants", () => {
  test("is a no-op on every .dart file of the template", async () => {
    const files = await collectDartFiles(TEMPLATE_DIR);
    expect(files.length).toBeGreaterThan(70);

    for (const file of files) {
      const content = await readFile(file, "utf-8");
      expect(sortDartDirectiveRuns(content)).toBe(content);
    }
  });

  test("is idempotent after fwiflu -> mi_app across the template", async () => {
    const files = await collectDartFiles(TEMPLATE_DIR);

    for (const file of files) {
      const renamed = (await readFile(file, "utf-8")).split("fwiflu").join("mi_app");
      const once = sortDartDirectiveRuns(renamed);
      expect(sortDartDirectiveRuns(once)).toBe(once);
    }
  });

  test("reorders exactly the affected files after fwiflu -> mi_app", async () => {
    const mustChange = [
      "lib/app/router/app_router.dart",
      "lib/features/home/presentation/home_page.dart",
      "lib/features/posts/presentation/pages/posts_page.dart",
      "lib/features/shell/presentation/scaffold_with_nav_bar.dart",
    ];

    for (const rel of mustChange) {
      const content = await readFile(join(TEMPLATE_DIR, rel), "utf-8");
      // The original name is already sorted by the author.
      expect(sortDartDirectiveRuns(content)).toBe(content);
      // The renamed name must be re-sorted.
      const renamed = content.split("fwiflu").join("mi_app");
      expect(sortDartDirectiveRuns(renamed)).not.toBe(renamed);
    }
  });
});
