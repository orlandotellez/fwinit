/**
 * Frontmatter reader used by the skills view.
 *
 * Every installed skill starts with a `---` block, so a throw or a silent
 * truncation here breaks the whole studio list. The cases that matter are the
 * ones already present in the repository: flat keys, quoted values, and the
 * `metadata:` block that carries `author` / `version`. A malformed block is
 * data loss, not a crash: the reader degrades to `{ data: {}, warnings: [one] }`
 * and the caller falls back to the body for the description.
 */
import { describe, expect, test } from "bun:test";
import { readFrontmatter, parseFrontmatter } from "./frontmatter.js";

describe("readFrontmatter", () => {
  test("reads flat keys and the nested metadata block", () => {
    const source = [
      "---",
      "name: create-specs",
      'description: "Trigger: create-specs, specs, crear specs"',
      "license: Apache-2.0",
      "metadata:",
      '  author: "orlandotellez"',
      '  version: "2.0"',
      "---",
      "",
      "## Activation Contract",
      "",
      "Prose goes here.",
      "",
    ].join("\n");

    const result = readFrontmatter(source);

    expect(result.warnings).toEqual([]);
    expect(result.data).toEqual({
      name: "create-specs",
      description: "Trigger: create-specs, specs, crear specs",
      license: "Apache-2.0",
      "metadata.author": "orlandotellez",
      "metadata.version": "2.0",
    });
  });

  test("strips matching single and double quotes only", () => {
    const source = [
      "---",
      "single: 'quoted value'",
      'double: "otro valor"',
      'unbalanced: "half',
      "inner: plain 'text' here",
      "---",
    ].join("\n");

    expect(readFrontmatter(source).data).toEqual({
      single: "quoted value",
      double: "otro valor",
      unbalanced: '"half',
      inner: "plain 'text' here",
    });
  });

  test("ignores comment and blank lines inside the block", () => {
    const source = ["---", "# a comment", "", "name: demo", "  ", "---"].join("\n");

    expect(readFrontmatter(source)).toEqual({
      data: { name: "demo" },
      warnings: [],
    });
  });

  test("tolerates CRLF line endings", () => {
    const source = [
      "---",
      "name: demo",
      "metadata:",
      '  version: "1.2.3"',
      "---",
      "",
      "Body line.",
    ].join("\r\n");

    expect(readFrontmatter(source).data).toEqual({
      name: "demo",
      "metadata.version": "1.2.3",
    });
  });

  test("returns no data and no warning when the file has no block", () => {
    const source = "# Title\n\nFirst prose line.\n";

    expect(readFrontmatter(source)).toEqual({ data: {}, warnings: [] });
  });

  test("does not treat a block that starts on line 2 as frontmatter", () => {
    const source = "# Title\n---\nname: demo\n---\n";

    expect(readFrontmatter(source)).toEqual({ data: {}, warnings: [] });
  });

  test("reports exactly one warning and empty data when the block is unterminated", () => {
    const source = "---\nname: demo\nlicense: MIT\n";

    const result = readFrontmatter(source);

    expect(result.data).toEqual({});
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("unterminated");
  });

  test("reports exactly one warning and empty data when a line is malformed", () => {
    const source = "---\nname: demo\nthis is not a key value pair\nlicense: MIT\n---\n";

    const result = readFrontmatter(source);

    expect(result.data).toEqual({});
    expect(result.warnings).toHaveLength(1);
  });

  test("reports a warning when an indented key has no parent block", () => {
    const source = "---\n  orphan: value\n---\n";

    const result = readFrontmatter(source);

    expect(result.data).toEqual({});
    expect(result.warnings).toHaveLength(1);
  });
});

describe("parseFrontmatter", () => {
  test("returns the body that follows the block", () => {
    const source = "---\nname: demo\n---\n\n# Title\n\nProse.\n";

    const parsed = parseFrontmatter(source);

    expect(parsed.data).toEqual({ name: "demo" });
    expect(parsed.body).toBe("\n# Title\n\nProse.\n");
  });

  test("returns the whole source as body when there is no block", () => {
    const source = "# Title\n\nProse.\n";

    expect(parseFrontmatter(source).body).toBe(source);
  });

  test("returns an empty body when the block never closes", () => {
    expect(parseFrontmatter("---\nname: demo\n").body).toBe("");
  });
});
